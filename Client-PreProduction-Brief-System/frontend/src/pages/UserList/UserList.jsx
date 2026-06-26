import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { getClients } from '../../services/clientService';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import Modal from '../../components/Common/Modal';
import EmptyState from '../../components/EmptyState/EmptyState';
import './UserList.css';

const UserList = () => {
  const { user: currentUser, updateCurrentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [toast, setToast] = useState(null);

  // Modals Control
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Client',
    client_id: ''
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const usersRes = await API.get('/users');
      setUsers(usersRes.data);
      const clientsRes = await getClients();
      setClients(clientsRes);
    } catch (err) {
      setToast({ message: 'Failed to retrieve user accounts.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim() || (!editMode && !formData.password)) {
      setToast({ message: 'Please complete all required fields.', type: 'warning' });
      return;
    }

    try {
      if (editMode) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // Don't update password if blank
        const res = await API.put(`/users/${selectedUser.id}`, payload);
        
        // Find client name for display
        const matchedClient = clients.find((c) => c.id === parseInt(formData.client_id, 10));
        const updated = {
          ...res.data,
          company_name: matchedClient ? matchedClient.company_name : null
        };
        
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updated : u)));
        if (selectedUser.id === currentUser.id) {
          updateCurrentUser({
            username: updated.username,
            email: updated.email,
            role: updated.role,
            company_name: updated.company_name
          });
        }
        setToast({ message: 'User account details updated successfully!', type: 'success' });
      } else {
        const res = await API.post('/users', formData);
        
        // Find client name for display
        const matchedClient = clients.find((c) => c.id === parseInt(formData.client_id, 10));
        const created = {
          ...res.data,
          company_name: matchedClient ? matchedClient.company_name : null
        };

        setUsers((prev) => [created, ...prev]);
        setToast({ message: 'User account created successfully!', type: 'success' });
      }
      setShowFormModal(false);
      resetForm();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save user details.';
      setToast({ message: errMsg, type: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await API.delete(`/users/${selectedUser.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setToast({ message: 'User account deleted successfully.', type: 'success' });
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to delete user account.';
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (user) => {
    setEditMode(true);
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Kept blank for updates
      role: user.role,
      client_id: user.client_id || ''
    });
    setShowFormModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'Client',
      client_id: ''
    });
    setSelectedUser(null);
  };

  return (
    <div className="page-container">
      <div className="flex-between header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1>User Accounts</h1>
          <p>Configure team member access, client permissions, and login roles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create User Account
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="Add a system account to start managing pre-production briefs." />
      ) : (
        <div className="table-container card-glass">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email Address</th>
                <th>Access Role</th>
                <th>Assigned Client</th>
                <th className="hide-on-mobile">Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>#{user.id}</td>
                  <td style={{ fontWeight: '600' }}>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'Admin' ? 'badge-approved' : user.role === 'Project Manager' ? 'badge-review' : 'badge-draft'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.company_name || '-'}</td>
                  <td className="hide-on-mobile">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-outline btn-sm-padding" onClick={() => openEditModal(user)}>
                        ✏️
                      </button>
                      <button
                        className="btn btn-outline btn-sm-padding"
                        style={{ color: '#f87171' }}
                        onClick={() => openDeleteModal(user)}
                        disabled={currentUser?.id === user.id} // Cannot delete self
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      <Modal
        show={showFormModal}
        title={editMode ? 'Edit User Details' : 'Create User Account'}
        onClose={() => setShowFormModal(false)}
        onConfirm={handleSubmit}
        confirmText={editMode ? 'Save Changes' : 'Create Account'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Full Name *</label>
            <input
              type="text"
              id="username"
              placeholder="e.g. Sarah Jenkins"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              placeholder="e.g. sarah.j@digiqueststudio.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password {editMode ? '(Leave blank to retain current password)' : '*'}</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required={!editMode}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">User Role *</label>
            <select id="role" value={formData.role} onChange={handleInputChange}>
              <option value="Client">Client Partner</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Admin">Administrator</option>
            </select>
          </div>

          {formData.role === 'Client' && (
            <div className="form-group">
              <label htmlFor="client_id">Assign Company *</label>
              <select id="client_id" value={formData.client_id} onChange={handleInputChange} required>
                <option value="">-- Select Client Organization --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        title="Confirm Deletion"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        confirmText="Delete User"
        confirmType="danger"
      >
        <p>
          Are you sure you want to permanently delete user account: <strong>{selectedUser?.username}</strong>?
        </p>
        <p style={{ marginTop: '10px', color: '#f87171' }}>
          Deleting a user removes their login credentials, in-app notifications, and clears authorship references. Comments and briefs submitted by this user will remain for historical logging, but will display as unauthored.
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

export default UserList;
