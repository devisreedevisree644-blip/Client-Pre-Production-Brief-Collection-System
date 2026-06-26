import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBriefs, deleteBrief, patchStatus } from '../../services/briefService';
import { getClients } from '../../services/clientService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import Modal from '../../components/Common/Modal';
import EmptyState from '../../components/EmptyState/EmptyState';
import './BriefList.css';

const BriefList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [briefs, setBriefs] = useState([]);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [toast, setToast] = useState(null);

  // Modal Control
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);

  // Filters State from URL search params
  const searchVal = searchParams.get('search') || '';
  const statusVal = searchParams.get('status') || '';
  const priorityVal = searchParams.get('priority') || '';
  const clientVal = searchParams.get('client_id') || '';
  const pageVal = parseInt(searchParams.get('page') || '1', 10);
  const sortByVal = searchParams.get('sort_by') || 'created_at';
  const orderVal = searchParams.get('order') || 'desc';

  // Fetch briefs
  const fetchBriefs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: searchVal,
        status: statusVal,
        priority: priorityVal,
        client_id: clientVal,
        page: pageVal,
        sort_by: sortByVal,
        order: orderVal,
        limit: 10
      };
      const data = await getBriefs(params);
      setBriefs(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setToast({ message: 'Failed to retrieve project briefs.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [searchVal, statusVal, priorityVal, clientVal, pageVal, sortByVal, orderVal]);

  // Fetch clients for dropdown filter
  useEffect(() => {
    const fetchClientsData = async () => {
      if (['Admin', 'Project Manager'].includes(user?.role)) {
        try {
          const clientData = await getClients();
          setClients(clientData);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchClientsData();
  }, [user]);

  useEffect(() => {
    fetchBriefs();
  }, [fetchBriefs]);

  // URL updating helper
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.set('page', '1'); // Reset pagination
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  const handleSortChange = (field) => {
    const newParams = new URLSearchParams(searchParams);
    const currentOrder = searchParams.get('order') || 'desc';
    const currentSort = searchParams.get('sort_by') || 'created_at';
    
    newParams.set('sort_by', field);
    if (currentSort === field) {
      newParams.set('order', currentOrder === 'desc' ? 'asc' : 'desc');
    } else {
      newParams.set('order', 'desc');
    }
    setSearchParams(newParams);
  };

  // Delete Action triggers
  const promptDelete = (id) => {
    setTargetDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteBrief(targetDeleteId);
      setToast({ message: 'Pre-production brief deleted successfully.', type: 'success' });
      fetchBriefs();
    } catch (err) {
      setToast({ message: 'Failed to delete brief. Access denied.', type: 'error' });
    } finally {
      setShowDeleteModal(false);
      setTargetDeleteId(null);
    }
  };

  // Inline Quick Status changer (Admin & PM only)
  const handleQuickStatusChange = async (id, status) => {
    try {
      await patchStatus(id, status);
      setToast({ message: `Status updated successfully to ${status}!`, type: 'success' });
      fetchBriefs();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Unauthorized status transition.';
      setToast({ message: errMsg, type: 'error' });
    }
  };

  const allowedTransitions = (currentStatus) => {
    const transitions = {
      'Draft': ['Submitted'],
      'Submitted': ['Under Review'],
      'Under Review': ['Approved', 'Revision Requested', 'Rejected'],
      'Revision Requested': ['Submitted'],
      'Approved': ['Archived'],
      'Rejected': [],
      'Archived': []
    };
    return transitions[currentStatus] || [];
  };

  return (
    <div className="page-container">
      {/* Title block */}
      <div className="flex-between header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Pre-Production Briefs</h1>
          <p>View client requirement briefs, track onboarding milestones, and assign crews</p>
        </div>
        {user?.role === 'Client' && (
          <Link to="/briefs/new" className="btn btn-primary">
            + New Project Brief
          </Link>
        )}
      </div>

      {/* Filter panel */}
      <div className="filters-panel card-glass flex-between">
        <div className="search-box-wrapper">
          <input
            type="text"
            placeholder="Search project name..."
            value={searchVal}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        <div className="filters-dropdowns">
          <select value={statusVal} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Revision Requested">Revision Requested</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Archived">Archived</option>
          </select>

          <select value={priorityVal} onChange={(e) => updateFilter('priority', e.target.value)}>
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {['Admin', 'Project Manager'].includes(user?.role) && (
            <select value={clientVal} onChange={(e) => updateFilter('client_id', e.target.value)}>
              <option value="">All Client Companies</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <LoadingSpinner />
      ) : briefs.length === 0 ? (
        <EmptyState
          title="No briefs matching filters"
          message="Adjust search keywords or add a new pre-production brief."
          actionBtn={
            user?.role === 'Client' && (
              <Link to="/briefs/new" className="btn btn-primary">
                Create First Brief
              </Link>
            )
          }
        />
      ) : (
        <div className="table-container card-glass">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSortChange('id')} style={{ cursor: 'pointer' }}>
                  ID {sortByVal === 'id' && (orderVal === 'desc' ? '▼' : '▲')}
                </th>
                <th onClick={() => handleSortChange('project_name')} style={{ cursor: 'pointer' }}>
                  Project Name {sortByVal === 'project_name' && (orderVal === 'desc' ? '▼' : '▲')}
                </th>
                <th>Client</th>
                <th onClick={() => handleSortChange('status')} style={{ cursor: 'pointer' }}>
                  Status {sortByVal === 'status' && (orderVal === 'desc' ? '▼' : '▲')}
                </th>
                <th onClick={() => handleSortChange('priority')} style={{ cursor: 'pointer' }}>
                  Priority {sortByVal === 'priority' && (orderVal === 'desc' ? '▼' : '▲')}
                </th>
                <th onClick={() => handleSortChange('start_date')} style={{ cursor: 'pointer' }} className="hide-on-mobile">
                  Start Date {sortByVal === 'start_date' && (orderVal === 'desc' ? '▼' : '▲')}
                </th>
                <th onClick={() => handleSortChange('delivery_date')} style={{ cursor: 'pointer' }} className="hide-on-mobile">
                  Delivery Date {sortByVal === 'delivery_date' && (orderVal === 'desc' ? '▼' : '▲')}
                </th>
                <th className="hide-on-mobile">Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((brief) => {
                const isDraftOrRev = ['Draft', 'Revision Requested'].includes(brief.status);
                const canClientEdit = user.role === 'Client' && isDraftOrRev;
                const canStaffEdit = ['Admin', 'Project Manager'].includes(user.role);

                return (
                  <tr key={brief.id}>
                    <td>#{brief.id}</td>
                    <td>
                      <Link to={`/briefs/${brief.id}`} target="_blank" rel="noopener noreferrer" className="brief-title-link">
                        {brief.project_name}
                      </Link>
                      <small style={{ display: 'block', marginTop: '2px' }}>{brief.project_type}</small>
                    </td>
                    <td>{brief.company_name}</td>
                    <td>
                      {['Admin', 'Project Manager'].includes(user.role) && allowedTransitions(brief.status).length > 0 ? (
                        <select
                          className={`inline-status-select badge badge-${brief.status.toLowerCase().replace(' ', '')}`}
                          value={brief.status}
                          onChange={(e) => handleQuickStatusChange(brief.id, e.target.value)}
                        >
                          <option value={brief.status}>{brief.status}</option>
                          {allowedTransitions(brief.status).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge badge-${brief.status.toLowerCase().replace(' ', '')}`}>
                          {brief.status}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-priority-${brief.priority.toLowerCase()}`}>
                        {brief.priority}
                      </span>
                    </td>
                    <td className="hide-on-mobile">
                      {brief.start_date ? new Date(brief.start_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="hide-on-mobile">
                      {brief.delivery_date ? new Date(brief.delivery_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="hide-on-mobile">
                      {new Date(brief.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/briefs/${brief.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm-padding">
                          👁
                        </Link>
                        {(canClientEdit || canStaffEdit) && (
                          <Link to={`/briefs/${brief.id}/edit`} className="btn btn-outline btn-sm-padding">
                            ✏️
                          </Link>
                        )}
                        {(user.role === 'Admin' || (user.role === 'Client' && brief.status === 'Draft')) && (
                          <button
                            className="btn btn-outline btn-sm-padding"
                            style={{ color: '#f87171' }}
                            onClick={() => promptDelete(brief.id)}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table pagination metadata */}
          <div className="pagination">
            <span>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total briefs)
            </span>
            <div className="pagination-buttons">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation delete modal */}
      <Modal
        show={showDeleteModal}
        title="Confirm Deletion"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        confirmText="Delete Brief"
        confirmType="danger"
      >
        <p>Are you sure you want to permanently delete Pre-Production Brief #{targetDeleteId}?</p>
        <p style={{ marginTop: '10px', color: '#f87171' }}>
          This will delete all comments, logs, and uploaded files on disk. This action is irreversible.
        </p>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default BriefList;
