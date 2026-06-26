import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Breadcrumbs.css';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on landing or auth pages
  const hidePaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  if (hidePaths.includes(location.pathname)) {
    return null;
  }

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <nav className="breadcrumbs-nav">
      <ul className="breadcrumbs-list">
        <li className="breadcrumbs-item">
          <Link to="/dashboard">Dashboard</Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          
          // Format specific routes (like ids or actions)
          let label = capitalize(value.replace('-', ' '));
          if (!isNaN(value)) {
            label = `#${value}`; // Display ID number cleanly
          }

          return (
            <li key={to} className="breadcrumbs-item">
              <span className="breadcrumbs-separator">/</span>
              {isLast ? (
                <span className="breadcrumbs-active">{label}</span>
              ) : (
                <Link to={to}>{label}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumbs;
