import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileMenu from './components/MobileMenu';
import styles from './LabLayout.module.css';

const LabLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className={styles.layout}>
      
      {/* Header stays at the top because it's the first flex item */}
      <Header onToggleSidebar={() => setIsMobileOpen(true)} />

      {/* Wrapper for Sidebar + Content. Overflow hidden prevents double scrollbars */}
      <div className={styles.wrapper}>
        
        {/* Sidebar sits here. It needs its own CSS update (see below) */}
        <Sidebar />

        <MobileMenu 
          isOpen={isMobileOpen} 
          onClose={() => setIsMobileOpen(false)} 
        />

        {/* Main content area with space for fixed sidebar */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LabLayout;