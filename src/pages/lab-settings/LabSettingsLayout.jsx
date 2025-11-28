import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './LabSettingsLayout.module.css';

const LabSettingsLayout = () => {
  return (
    <div className={styles.layoutContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Lab Administration</h1>
        <p>Manage organization details, catalog, and financial configurations.</p>
      </div>

      {/* Removed the internal <aside className={styles.sidebar}> ... </aside> */}
      
      <div className={styles.contentWrapper}>
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LabSettingsLayout;