import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import './Navbar.css';

const Navbar = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications in navbar:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 30 seconds for live feel
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await API.post('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleNotifClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await API.patch(`/notifications/${notif.id}/read`);
        setNotifications(
          notifications.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      }
      setShowNotifDropdown(false);
      if (notif.brief_id) {
        navigate(`/briefs/${notif.brief_id}`);
      } else {
        navigate('/notifications');
      }
    } catch (err) {
      console.error('Error reading notification:', err);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  if (!user) return null;

  return (
    <header className="navbar-header">
      <div className="navbar-brand">
        <span className="navbar-logo-icon">⚡</span>
        <h2>DigiQuest Pre-Prod</h2>
      </div>

      <div className="navbar-actions">
        {/* Notifications Dropdown */}
        <div className="notif-dropdown-wrapper" ref={notifRef}>
          <button
            className="navbar-btn notif-btn"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
          >
            🔔
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {showNotifDropdown && (
            <div className="notif-dropdown card-glass">
              <div className="notif-dropdown-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button className="notif-clear-btn" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-dropdown-body">
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications</div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <p className="notif-item-msg">{notif.message}</p>
                      <span className="notif-item-time">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="notif-dropdown-footer">
                <Link to="/notifications" onClick={() => setShowNotifDropdown(false)}>
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="profile-dropdown-wrapper" ref={profileRef}>
          <button
            className="navbar-btn profile-btn"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <div className="profile-avatar">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <span className="profile-name hide-on-mobile">{user.username}</span>
            <span className="profile-caret">▼</span>
          </button>

          {showProfileDropdown && (
            <ul className="profile-dropdown-menu card-glass">
              <li className="profile-menu-header">
                <strong>{user.username}</strong>
                <span className="profile-menu-role">{user.role}</span>
                {user.company_name && <span className="profile-menu-company">{user.company_name}</span>}
              </li>
              <li>
                <hr className="profile-menu-divider" />
              </li>
              <li>
                <button className="profile-menu-item" onClick={() => navigate('/notifications')}>
                  Notifications center
                </button>
              </li>
              <li>
                <button className="profile-menu-item logout" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
