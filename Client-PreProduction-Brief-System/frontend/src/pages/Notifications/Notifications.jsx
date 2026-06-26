import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import Toast from '../../components/Common/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      setToast({ message: 'Failed to retrieve notifications.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await API.post('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setToast({ message: 'All alerts marked as read.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to clear notifications.', type: 'error' });
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await API.patch(`/notifications/${notif.id}/read`);
      }
      if (notif.brief_id) {
        navigate(`/briefs/${notif.brief_id}`);
      } else {
        // Refresh view
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNotifEmoji = (type) => {
    switch (type) {
      case 'submission':
        return '📥';
      case 'status_change':
        return '🔄';
      case 'comment':
        return '💬';
      case 'approval_required':
        return '🔑';
      case 'deadline':
        return '⏰';
      default:
        return '🔔';
    }
  };

  return (
    <div className="page-container">
      <div className="flex-between header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Notification Center</h1>
          <p>Read in-app alerts regarding project approvals, status updates, and comment chains</p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button className="btn btn-secondary" onClick={handleMarkAllRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" message="You have no notifications yet." />
      ) : (
        <div className="notifications-list card-glass">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-row-item ${!notif.is_read ? 'unread-alert' : ''}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className="notif-row-icon">{getNotifEmoji(notif.type)}</div>
              <div className="notif-row-body">
                <p className="notif-row-message">{notif.message}</p>
                {notif.project_name && (
                  <span className="notif-row-project">Project: {notif.project_name}</span>
                )}
                <span className="notif-row-date">
                  {new Date(notif.created_at).toLocaleString()}
                </span>
              </div>
              {!notif.is_read && <div className="unread-dot-indicator" />}
            </div>
          ))}
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

export default Notifications;
