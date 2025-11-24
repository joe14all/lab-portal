import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { IconUser, IconSettings } from '../../layouts/components/LabIcons';
import styles from './SettingsLayout.module.css';

const SettingsLayout = () => {
  return (
    <div className={styles.layoutContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Account Settings</h1>
        <p>Manage your personal profile and application preferences.</p>
      </div>

      <div className={styles.contentWrapper}>
        {/* Settings Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <NavLink 
              to="/settings/profile" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <IconUser width="18" height="18" />
              <span>My Profile</span>
            </NavLink>
            <NavLink 
              to="/settings/preferences" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <IconSettings width="18" height="18" />
              <span>Preferences</span>
            </NavLink>
          </nav>
        </aside>

        {/* Page Content */}
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;