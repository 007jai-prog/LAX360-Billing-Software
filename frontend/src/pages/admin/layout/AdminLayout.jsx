import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text-primary)'
      }}
    >
      <div className="flex-1 flex">
        {/* Dedicated Company Admin Sidebar */}
        <AdminSidebar isMobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Dedicated Company Admin Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          <AdminNavbar setMobileOpen={setMobileOpen} />
          <main
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-h-[calc(100vh-4rem)] transition-colors duration-200"
            style={{ backgroundColor: 'var(--theme-bg)' }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
