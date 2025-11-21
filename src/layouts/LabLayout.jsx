import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';     // Desktop
import MobileMenu from './components/MobileMenu'; // Mobile

const LabLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header controls the mobile menu toggle */}
      <Header onToggleSidebar={() => setIsMobileOpen(true)} />

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar (Hidden on mobile via CSS) */}
        <Sidebar />

        {/* Mobile Drawer (Hidden on desktop via CSS) */}
        <MobileMenu 
          isOpen={isMobileOpen} 
          onClose={() => setIsMobileOpen(false)} 
        />

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '2rem', minWidth: 0, backgroundColor: 'var(--bg-body)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LabLayout;