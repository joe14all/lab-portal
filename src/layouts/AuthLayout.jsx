import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

const AuthLayout = () => {
  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        {/* Branding / Logo Area */}
        <div className={styles.header}>
          <h1 className={styles.brand}>JS Lab Portal</h1>
          <p className={styles.subtitle}>Laboratory Management System</p>
        </div>

        {/* The actual Login form renders here */}
        <div className={styles.content}>
          <Outlet />
        </div>

        {/* Footer / Legal */}
        <footer className={styles.footer}>
          <p>&copy; 2025 JS Dental Laboratory</p>
          <div className={styles.links}>
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Support</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;