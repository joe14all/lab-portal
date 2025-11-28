import React, { useState } from 'react';
import { useAuth } from '../../contexts';
import RoutePlanner from '../../components/logistics/RoutePlanner';
import DriverManifest from '../../components/logistics/DriverManifest';
import styles from './LogisticsRoutes.module.css';

const LogisticsRoutes = () => {
  const { user } = useAuth();
  
  // Determine default view based on role
  // Drivers see Manifest by default, Admins/Managers see Planner
  const isDriver = user?.roleId === 'role-driver';
  const [view, setView] = useState(isDriver ? 'manifest' : 'planner');

  return (
    <div className={styles.container}>
      
      {/* Header / Toggle */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Logistics</h1>
          <p>
            {view === 'planner' ? 'Route Management & Dispatch' : 'Driver Daily Manifest'}
          </p>
        </div>

        {/* View Switcher (Only visible to non-drivers) */}
        {!isDriver && (
          <div className={styles.toggleWrapper}>
            <button 
              className={`${styles.toggleBtn} ${view === 'planner' ? styles.toggleBtnActive : ''}`}
              onClick={() => setView('planner')}
            >
              Route Planner
            </button>
            <button 
              className={`${styles.toggleBtn} ${view === 'manifest' ? styles.toggleBtnActive : ''}`}
              onClick={() => setView('manifest')}
            >
              Driver View (Preview)
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={styles.content}>
        {view === 'planner' ? <RoutePlanner /> : <DriverManifest />}
      </main>

    </div>
  );
};

export default LogisticsRoutes;