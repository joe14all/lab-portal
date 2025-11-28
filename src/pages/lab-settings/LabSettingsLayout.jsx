import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './LabSettingsLayout.module.css';

const LabSettingsLayout = () => {
  return (
    <div className={styles.layoutContainer}>
      {/* Header Section */}
      <header className={styles.header}>
        <h1>Lab Administration</h1>
        <p>Manage organization details, product catalog, workflows, and financial configurations.</p>
      </header>

      {/* Main Content Area */}
      <div className={styles.contentWrapper}>
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LabSettingsLayout;