/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth, useToast } from '../../contexts';
import { IconAlert, IconUser, IconCamera, IconTrash, IconEdit } from '../../layouts/components/LabIcons';
import ProfilePictureModal from '../../components/settings/ProfilePictureModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import styles from './ProfileSettings.module.css';

const ProfileSettings = () => {
  const { user, updateUser, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: ''
  });

  // Track original data to detect changes
  const [originalData, setOriginalData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  
  // --- Avatar State ---
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Initialize Data
  useEffect(() => {
    if (user?.profile) {
      const initialValues = {
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        email: user.email || '',
        phone: user.profile.phone || '',
        jobTitle: user.profile.jobTitle || ''
      };
      setFormData(initialValues);
      setOriginalData(initialValues);
      setImgError(false);
    }
  }, [user]);

  // Check for changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // 1. Handle File Selection (Upload New)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  // 2. Handle Image Click (Edit Existing vs Upload New)
  const handleAvatarClick = () => {
    if (hasAvatar) {
      setSelectedImage(user.profile.avatarUrl);
      setShowCropModal(true);
    } else {
      fileInputRef.current.click();
    }
  };

  // 3. Save Cropped Image
  const handleSaveAvatar = async (croppedImage) => {
    try {
      await updateUser({
        profile: {
          ...user.profile,
          avatarUrl: croppedImage
        }
      });
      setImgError(false);
      addToast("Profile picture updated", "success");
    } catch (err) {
      addToast("Failed to update picture", "error");
    }
  };

  // 4. Remove Avatar (Trigger Modal)
  const initiateRemoveAvatar = () => {
    setShowDeleteConfirm(true);
  };

  // 5. Confirm Remove Avatar
  const confirmRemoveAvatar = async () => {
    try {
      await updateUser({
        profile: {
          ...user.profile,
          avatarUrl: null
        }
      });
      addToast("Profile picture removed", "success");
      setShowDeleteConfirm(false);
    } catch (err) {
      addToast("Failed to remove picture", "error");
    }
  };

  // 6. Save Text Data
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!hasChanges) return;
    
    setIsSaving(true);

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
      // Update baseline after successful save
      setOriginalData(formData);
      addToast("Profile details updated successfully", "success");
    } catch (err) {
      addToast("Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    const first = formData.firstName ? formData.firstName[0] : '';
    const last = formData.lastName ? formData.lastName[0] : '';
    return (first + last).toUpperCase() || '?';
  };

  const hasAvatar = user?.profile?.avatarUrl && !imgError;

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Profile Details</h2>

      <div className="card">
        <form onSubmit={handleSaveProfile} className={styles.profileGrid}>
          {/* Avatar Column */}
          <div className={styles.avatarSection}>
            
            {/* The Image Circle */}
            <div className={styles.avatarLarge}>
              {hasAvatar ? (
                <img 
                  src={user.profile.avatarUrl} 
                  alt="Avatar" 
                  onError={() => setImgError(true)} 
                />
              ) : (
                <span className={styles.initials}>{getInitials()}</span>
              )}
              
              {/* Overlay: Edit if exists, Upload if empty */}
              <button 
                type="button"
                className={styles.avatarOverlay}
                onClick={handleAvatarClick}
                title={hasAvatar ? "Edit Picture" : "Upload Picture"}
              >
                {hasAvatar ? <IconEdit width="28" color="white" /> : <IconCamera width="28" color="white" />}
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handleFileChange}
            />
            
            {/* Action Buttons */}
            <div className={styles.photoActions}>
              <button 
                type="button" 
                className={styles.textBtn}
                onClick={() => fileInputRef.current.click()}
              >
                Change
              </button>
              {hasAvatar && (
                <>
                  <span className={styles.divider}>|</span>
                  <button 
                    type="button" 
                    className={`${styles.textBtn} ${styles.dangerBtn}`}
                    onClick={initiateRemoveAvatar}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
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
              <button 
                type="submit" 
                className="button primary" 
                disabled={!hasChanges || isSaving || authLoading}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* CROPPER MODAL */}
      {showCropModal && (
        <ProfilePictureModal 
          imageSrc={selectedImage}
          onClose={() => setShowCropModal(false)}
          onSave={handleSaveAvatar}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmRemoveAvatar}
        title="Remove Profile Picture"
        message="Are you sure you want to remove your profile picture? This action cannot be undone."
      />
    </div>
  );
};

export default ProfileSettings;