import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClients, createClient, updateClient, deleteClient } from '../../services/clientService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import Modal from '../../components/Common/Modal';
import EmptyState from '../../components/EmptyState/EmptyState';
import './ClientList.css';

const ClientList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Modals Control
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: ''
  });

  const fetchClientsList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClients({ search });
      setClients(data);
    } catch (err) {
      setToast({ message: 'Failed to retrieve clients list.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClientsList();
  }, [fetchClientsList]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Create or Update submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      setShowFormModal(false);
      return;
    }
    if (!formData.company_name.trim() || !formData.contact_person.trim() || !formData.email.trim()) {
      setToast({ message: 'Please complete all required fields.', type: 'warning' });
      return;
    }

    try {
      if (editMode) {
        const updated = await updateClient(selectedClient.id, formData);
        setClients((prev) => prev.map((c) => (c.id === selectedClient.id ? updated : c)));
        setToast({ message: 'Client details updated successfully!', type: 'success' });
      } else {
        const created = await createClient(formData);
        setClients((prev) => [...prev, created]);
        setToast({ message: 'Client company profile created successfully!', type: 'success' });
      }
      setShowFormModal(false);
      resetForm();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save client details.';
      setToast({ message: errMsg, type: 'error' });
    }
  };

  // Delete submit
  const handleConfirmDelete = async () => {
    try {
      await deleteClient(selectedClient.id);
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      setToast({ message: 'Client company profile deleted successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to delete client company.', type: 'error' });
    } finally {
      setShowDeleteModal(false);
      setSelectedClient(null);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (client) => {
    setEditMode(true);
    setSelectedClient(client);
    setFormData({
      company_name: client.company_name,
      contact_person: client.contact_person,
      email: client.email,
      phone: client.phone || '',
      address: client.address || '',
      website: client.website || ''
    });
    setShowFormModal(true);
  };

  const openDeleteModal = (client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      website: ''
    });
    setSelectedClient(null);
  };

  return (
    <div className="page-container">
      <div className="flex-between header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Client Companies</h1>
          <p>Manage partner organizations, primary contacts, and directory details</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Add Client Company
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="filters-panel card-glass" style={{ marginBottom: '24px' }}>
        <div className="search-box-wrapper">
          <input
            type="text"
            placeholder="Search by company name, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid records */}
      {loading ? (
        <LoadingSpinner />
      ) : clients.length === 0 ? (
        <EmptyState
          title="No client companies found"
          message="Adjust search query or register a new company partner."
          actionBtn={
            isAdmin && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                Create Client Company
              </button>
            )
          }
        />
      ) : (
        <div className="table-container card-glass">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th className="hide-on-mobile">Website</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>#{client.id}</td>
                  <td>
                    <button
                      type="button"
                      className="company-name-link-btn"
                      onClick={() => openEditModal(client)}
                    >
                      {client.company_name}
                    </button>
                  </td>
                  <td>{client.contact_person}</td>
                  <td>{client.email}</td>
                  <td>{client.phone || '-'}</td>
                  <td className="hide-on-mobile">
                    {client.website ? (
                      <a href={client.website} target="_blank" rel="noreferrer">
                        {client.website.replace(/(^\w+:|^)\/\//, '')}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-outline btn-sm-padding" onClick={() => openEditModal(client)}>
                          ✏️
                        </button>
                        <button
                          className="btn btn-outline btn-sm-padding"
                          style={{ color: '#f87171' }}
                          onClick={() => openDeleteModal(client)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal Form Overlay */}
      <Modal
        show={showFormModal}
        title={!isAdmin ? 'Client Company Details' : (editMode ? 'Edit Client Company' : 'Add Client Company')}
        onClose={() => setShowFormModal(false)}
        onConfirm={isAdmin ? handleSubmit : () => setShowFormModal(false)}
        confirmText={!isAdmin ? 'Close' : (editMode ? 'Save Changes' : 'Create Client')}
      >
        <form onSubmit={isAdmin ? handleSubmit : (e) => { e.preventDefault(); setShowFormModal(false); }}>
          <div className="form-group">
            <label htmlFor="company_name">Company Name *</label>
            <input
              type="text"
              id="company_name"
              placeholder="e.g. Acme Corporation"
              value={formData.company_name}
              onChange={handleInputChange}
              required
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact_person">Contact Person *</label>
            <input
              type="text"
              id="contact_person"
              placeholder="e.g. Jane Doe"
              value={formData.contact_person}
              onChange={handleInputChange}
              required
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              placeholder="e.g. contact@acme.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              placeholder="e.g. +1-555-0100"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website Address</label>
            <input
              type="url"
              id="website"
              placeholder="e.g. https://acme.com"
              value={formData.website}
              onChange={handleInputChange}
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Physical Address</label>
            <textarea
              id="address"
              placeholder="Full mailing address..."
              value={formData.address}
              onChange={handleInputChange}
              disabled={!isAdmin}
            />
          </div>
        </form>
      </Modal>

      {/* Confirmation delete modal */}
      <Modal
        show={showDeleteModal}
        title="Confirm Deletion"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        confirmText="Delete Client"
        confirmType="danger"
      >
        <p>
          Are you sure you want to delete client company: <strong>{selectedClient?.company_name}</strong>?
        </p>
        <p style={{ marginTop: '10px', color: '#f87171' }}>
          Deleting this client will automatically cascade delete all associated briefs, uploads, comments, and project histories. This is irreversible.
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

export default ClientList;
