import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import './AuditLogs.css';

const AuditLogs = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Query audit logs via custom route in backend briefs/activities
        // Wait, where is the endpoint? We have a general database table audit_logs
        // We can create an endpoint in userRoutes.js or briefly check it.
        // Let's verify we have a route for audit logs on backend.
        // Wait, do we have an API route GET /api/users/audit-logs or GET /api/briefs/audit-logs?
        // Let's check where it fits. In backend/src/app.js, we mounted:
        // app.use('/api/briefs', briefRoutes);
        // Let's check if we have an audit logs route in a specific router.
        // Ah, let's look at the database seed: audit logs are queried in Brief Details page.
        // What about a global list of audit logs? Let's check which router could serve it.
        // We can just add an endpoint to reports or user router or create a small router for it.
        // Let's create an endpoint GET /api/reports/audit-logs in reports router or GET /api/users/audit-logs!
        // Wait, did we map GET /api/users/audit-logs or report endpoints?
        // Let's look at reportRoutes or add it! Wait, let's create a quick API endpoint:
        // GET /api/audit-logs inside userRoutes or reports. Or in a custom router?
        // Let's check the database schema: it contains table `audit_logs`.
        // Let's fetch all audit logs from `/api/users/audit-logs` which is already restricted to Admin!
        // That is perfect! Let's check if we defined GET /api/users/audit-logs in our backend userRoutes.
        // Wait! In userRoutes, we had u.role === 'Admin' protection.
        // Let's check if we added an audit logs route there. We didn't yet!
        // Let's look at what endpoints we did define:
        // userController has: getUsers, createUser, updateUser, deleteUser.
        // Let's write a getAuditLogs function in userController and map GET /api/users/audit-logs! Or in a new router.
        // Let's modify userController and userRoutes to add `getAuditLogs`. It takes only a minute!
        const res = await API.get('/users/audit-logs');
        setLogs(res.data);
      } catch (err) {
        console.error(err);
        setToast({ message: 'Failed to retrieve system audit logs.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="page-container">
      <div className="header-row">
        <h1>System Audit Logs</h1>
        <p>Immutable history of brief updates, comment modifications, and security overrides</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs recorded" message="Security logs will capture all user actions automatically." />
      ) : (
        <div className="table-container card-glass">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Access Role</th>
                <th>Logged Action</th>
                <th>Target Entity</th>
                <th>Record ID</th>
                <th>Change Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td style={{ fontWeight: '600' }}>{log.username || 'System'}</td>
                  <td>
                    <span className="badge badge-draft">{log.role || 'Guest'}</span>
                  </td>
                  <td>
                    <span className={`badge ${log.action.includes('Created') ? 'badge-approved' : log.action.includes('Deleted') ? 'badge-rejected' : 'badge-submitted'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.entity.toUpperCase()}</td>
                  <td>#{log.entity_id}</td>
                  <td>
                    <div className="change-details-scroll">
                      {log.old_value || log.new_value ? (
                        <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {JSON.stringify({ from: log.old_value, to: log.new_value }, null, 2)}
                        </pre>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

export default AuditLogs;
