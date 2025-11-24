import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  IconSettings, 
  IconDrill, 
  IconInvoice, 
  IconLayers 
} from '../../layouts/components/LabIcons';
import styles from './LabSettingsLayout.module.css';

const LabSettingsLayout = () => {
  return (
    <div className={styles.layoutContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Lab Administration</h1>
        <p>Manage organization details, catalog, and financial configurations.</p>
      </div>

      <div className={styles.contentWrapper}>
        {/* Admin Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Configuration</div>
          <nav className={styles.nav}>
            <NavLink 
              to="/lab-settings/general" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <IconSettings width="18" height="18" />
              <span>General Info</span>
            </NavLink>
            
            <NavLink 
              to="/lab-settings/catalog" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <IconDrill width="18" height="18" />
              <span>Product Catalog</span>
            </NavLink>

            <NavLink 
              to="/lab-settings/financials" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <IconInvoice width="18" height="18" />
              <span>Financials</span>
            </NavLink>

            <NavLink 
              to="/lab-settings/workflows" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <IconLayers width="18" height="18" />
              <span>Workflows</span>
            </NavLink>
          </nav>
        </aside>

        {/* Sub-Page Content */}
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LabSettingsLayout;