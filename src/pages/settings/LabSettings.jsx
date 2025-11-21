import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../../contexts';
import { 
  IconUser, 
  IconSettings, 
  IconMoon, 
  IconSun,
  IconAlert
} from '../../layouts/components/LabIcons';
import styles from './LabSettings.module.css';

const LabSettings = () => {
  // --- 1. Consume Contexts ---
  const { user, updateUser, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // --- 2. Local State for Form Inputs ---
  // We initialize state from the user object, but handle updates locally first
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null); // For success/error toasts

  // Hydrate form when user loads
  useEffect(() => {
    if (user?.profile) {
      setFormData({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        email: user.email || '',
        phone: user.profile.phone || '',
        jobTitle: user.profile.jobTitle || ''
      });
    }
  }, [user]);

  // --- 3. Handlers ---

  // Handle Profile Text Inputs
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Construct the update object structure expected by AuthContext
      await updateUser({
        email: formData.email,
        profile: {
          ...user.profile, // Keep avatarUrl etc
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          jobTitle: formData.jobTitle
        }
      });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Notification Toggles
  const handleNotificationToggle = async (type) => {
    // Optimistic update handled by context, but good to show loading state if needed
    const current = user?.preferences?.notifications || {};
    const updatedNotifs = { ...current, [type]: !current[type] };
    
    await updateUser({
      preferences: {
        ...user.preferences,
        notifications: updatedNotifs
      }
    });
  };

  // --- 4. Helpers ---
  const getInitials = () => {
    return `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>Manage your personal profile and application preferences.</p>
      </div>

      {/* SUCCESS/ERROR MESSAGE */}
      {message && (
        <div 
          className="card" 
          style={{ 
            backgroundColor: message.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
            color: message.type === 'error' ? 'var(--error-500)' : 'var(--success-500)',
            borderColor: 'transparent',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {message.type === 'error' && <IconAlert width="18" />}
          {message.text}
        </div>
      )}

      {/* === 1. PROFILE SETTINGS === */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          <IconUser width="20" /> Public Profile
        </h3>
        
        <form onSubmit={handleSaveProfile} className={styles.profileGrid}>
          {/* Avatar Column */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarLarge}>
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt="Profile" />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>
            <button type="button" className={styles.changePhotoBtn}>
              Change Photo
            </button>
          </div>

          {/* Inputs Column */}
          <div className={styles.formGrid}>
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input 
                type="text" 
                id="firstName" 
                value={formData.firstName} 
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input 
                type="text" 
                id="lastName" 
                value={formData.lastName} 
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                value={formData.email} 
                onChange={handleInputChange}
                disabled // Often email change requires separate flow
              />
              <small className="form-helper-text">Contact admin to change email.</small>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input 
                type="tel" 
                id="phone" 
                value={formData.phone} 
                onChange={handleInputChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className={`form-group ${styles.fullWidth}`}>
              <label htmlFor="jobTitle">Job Title</label>
              <input 
                type="text" 
                id="jobTitle" 
                value={formData.jobTitle} 
                onChange={handleInputChange}
              />
            </div>

            <div className={styles.fullWidth} style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="button primary" disabled={isSaving || authLoading}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* === 2. APP PREFERENCES === */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          <IconSettings width="20" /> Appearance & App Settings
        </h3>

        {/* Theme Toggle */}
        <div className={styles.prefRow}>
          <div className={styles.prefInfo}>
            <strong>Interface Theme</strong>
            <p>Select your preferred interface color scheme.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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
              disabled={authLoading}
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
              disabled={authLoading}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

    </div>
  );
};

export default LabSettings;