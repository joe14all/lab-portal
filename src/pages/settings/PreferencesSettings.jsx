import React from 'react';
import { useAuth, useTheme } from '../../contexts';
import styles from './PreferencesSettings.module.css';

const PreferencesSettings = () => {
  const { user, updateUser, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleNotificationToggle = async (type) => {
    const current = user?.preferences?.notifications || {};
    const updatedNotifs = { ...current, [type]: !current[type] };
    
    await updateUser({
      preferences: {
        ...user.preferences,
        notifications: updatedNotifs
      }
    });
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>App Preferences</h2>

      <div className="card">
        <div className={styles.cardBody}>
          
          {/* Theme Toggle */}
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <strong>Interface Theme</strong>
              <p>Select your preferred interface color scheme.</p>
            </div>
            <div className={styles.controlGroup}>
              <span className={styles.statusLabel}>
                {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              </span>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>

          {/* Email Notifications */}
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <strong>Email Notifications</strong>
              <p>Receive updates about case status changes via email.</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={!!user?.preferences?.notifications?.email}
                onChange={() => handleNotificationToggle('email')}
                disabled={loading}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* SMS Notifications */}
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <strong>SMS Notifications</strong>
              <p>Receive urgent alerts and rush requests via SMS.</p>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={!!user?.preferences?.notifications?.sms}
                onChange={() => handleNotificationToggle('sms')}
                disabled={loading}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;