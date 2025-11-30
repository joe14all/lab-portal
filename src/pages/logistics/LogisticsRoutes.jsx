import React from 'react';
import RoutePlanner from '../../components/logistics/RoutePlanner';
import DriverManifest from '../../components/logistics/DriverManifest';
import styles from './LogisticsRoutes.module.css';

const LogisticsRoutes = ({ view = 'planner' }) => {
  return (
    <div className={styles.container}>
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>{view === 'planner' ? 'Route Planning' : 'Driver View'}</h1>
          <p>
            {view === 'planner' ? 'Route Management & Dispatch' : 'Driver Daily Manifest'}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.content}>
        {view === 'planner' ? <RoutePlanner /> : <DriverManifest />}
      </main>

    </div>
  );
};

export default LogisticsRoutes;