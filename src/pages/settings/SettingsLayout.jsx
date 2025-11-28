import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './SettingsLayout.module.css';

const SettingsLayout = () => {
  return (
    <div className={styles.layoutContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Account Settings</h1>
        <p>Manage your personal profile and application preferences.</p>
      </div>

      {/* Main Content Only (Sidebar moved to global nav) */}
      <div className={styles.contentWrapper}>
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;