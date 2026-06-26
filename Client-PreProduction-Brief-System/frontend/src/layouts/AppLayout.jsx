import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import Navbar from '../components/Navbar/Navbar';
import Breadcrumbs from '../components/Breadcrumbs/Breadcrumbs';
import './AppLayout.css';

const AppLayout = () => {
  return (
    <div className="app-layout-root app-container">
      {/* Navigation Drawer */}
      <Sidebar />

      {/* Main Screen */}
      <div className="main-content">
        <Navbar />
        <Breadcrumbs />
        <main className="page-viewport">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
