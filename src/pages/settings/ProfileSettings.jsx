/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { IconAlert } from '../../layouts/components/LabIcons';
import styles from './ProfileSettings.module.css';

const ProfileSettings = () => {
  const { user, updateUser, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

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

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await updateUser({
        email: formData.email,
        profile: {
          ...user.profile,
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

  const getInitials = () => {
    return `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Profile Details</h2>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'error' && <IconAlert width="18" />}
          {message.text}
        </div>
      )}

      <div className="card">
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
            <div className={styles.halfGrid}>
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input 
                  type="text" id="firstName" 
                  value={formData.firstName} onChange={handleInputChange} 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input 
                  type="text" id="lastName" 
                  value={formData.lastName} onChange={handleInputChange} 
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" id="email" 
                value={formData.email} onChange={handleInputChange} disabled 
              />
              <small className="form-helper-text">Contact admin to change email.</small>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input 
                type="tel" id="phone" 
                value={formData.phone} onChange={handleInputChange} 
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="jobTitle">Job Title</label>
              <input 
                type="text" id="jobTitle" 
                value={formData.jobTitle} onChange={handleInputChange} 
              />
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="button primary" disabled={isSaving || authLoading}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;