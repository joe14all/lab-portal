import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileMenu from './components/MobileMenu';

const LabLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    // 1. CHANGE: Fix height to 100vh and hide overflow on the parent
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Header stays at the top because it's the first flex item */}
      <Header onToggleSidebar={() => setIsMobileOpen(true)} />

      {/* 2. CHANGE: Wrapper for Sidebar + Content. Overflow hidden prevents double scrollbars */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar sits here. It needs its own CSS update (see below) */}
        <Sidebar />

        <MobileMenu 
          isOpen={isMobileOpen} 
          onClose={() => setIsMobileOpen(false)} 
        />

        {/* 3. CHANGE: Add overflowY: 'auto' to make ONLY this area scroll */}
        <main style={{ 
          flex: 1, 
          padding: '2rem', 
          minWidth: 0, 
          backgroundColor: 'var(--bg-body)', 
          overflowY: 'auto' // This activates the scrollbar for content
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LabLayout;