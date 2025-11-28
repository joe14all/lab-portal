import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Modal from '../common/Modal';
import { getCroppedImg } from '../../utils/cropImage';
import { IconUser } from '../../layouts/components/LabIcons';
import styles from './ProfilePictureModal.module.css';

const ProfilePictureModal = ({ imageSrc, onClose, onSave }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setIsLoading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      onSave(croppedImage); 
      onClose();
    } catch (e) {
      console.error('Error cropping image:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Profile Photo"
      icon={<IconUser width="20" />}
      width="500px"
      footer={
        <div className={styles.footer}>
          <div className={styles.sliderGroup}>
            <span className={styles.sliderLabel}>Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className={styles.slider}
            />
          </div>
          <div className={styles.actions}>
            <button className="button text" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button className="button primary" onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Photo'}
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.cropperContainer}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape="round"
          showGrid={false}
        />
      </div>
    </Modal>
  );
};

export default ProfilePictureModal;