import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isAdmin = user.role === 'Admin';
  const isPM = user.role === 'Project Manager';
  const isClient = user.role === 'Client';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>DigiQuest</h1>
        <span className="sidebar-brand-badge">{user.role}</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="sidebar-icon">📊</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/briefs"
          className={({ isActive }) => `sidebar-link ${isActive || location.pathname.startsWith('/briefs/') ? 'active' : ''}`}
        >
          <span className="sidebar-icon">📂</span>
          <span>Project Briefs</span>
        </NavLink>

        {isClient && (
          <NavLink
            to="/briefs/new"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📝</span>
            <span>Submit Brief</span>
          </NavLink>
        )}

        {(isAdmin || isPM) && (
          <NavLink
            to="/clients"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">🏢</span>
            <span>Client Companies</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">👥</span>
            <span>User Accounts</span>
          </NavLink>
        )}

        {(isAdmin || isPM) && (
          <NavLink
            to="/reports"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📈</span>
            <span>Reports & Analytics</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink
            to="/audit-logs"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📜</span>
            <span>System Audit Logs</span>
          </NavLink>
        )}

        <NavLink
          to="/notifications"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="sidebar-icon">🔔</span>
          <span>Notification Center</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <p className="user-name">{user.username}</p>
          <p className="user-role">{user.role}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
