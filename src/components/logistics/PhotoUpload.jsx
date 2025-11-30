import React, { useRef, useState } from 'react';
import styles from './PhotoUpload.module.css';

const PhotoUpload = ({ photos = [], onPhotosChange, maxPhotos = 3 }) => {
  const fileInputRef = useRef(null);
  const [previewUrls, setPreviewUrls] = useState(photos);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length + previewUrls.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    // Create preview URLs
    const newPreviews = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: `photo-${Date.now()}-${Math.random()}`,
            url: reader.result,
            name: file.name,
            timestamp: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newPreviews).then(urls => {
      const updated = [...previewUrls, ...urls];
      setPreviewUrls(updated);
      onPhotosChange(updated);
    });

    // Reset input
    event.target.value = '';
  };

  const handleRemovePhoto = (photoId) => {
    const updated = previewUrls.filter(p => p.id !== photoId);
    setPreviewUrls(updated);
    onPhotosChange(updated);
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.photoUploadContainer}>
      <div className={styles.uploadHeader}>
        <h4>Proof of Delivery Photos</h4>
        <span className={styles.photoCount}>
          {previewUrls.length}/{maxPhotos} photos
        </span>
      </div>

      {/* Photo Grid */}
      {previewUrls.length > 0 && (
        <div className={styles.photoGrid}>
          {previewUrls.map((photo) => (
            <div key={photo.id} className={styles.photoItem}>
              <img
                src={photo.url}
                alt={`Delivery proof ${photo.name}`}
                className={styles.photoPreview}
              />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => handleRemovePhoto(photo.id)}
                aria-label={`Remove photo ${photo.name}`}
              >
                ×
              </button>
              <div className={styles.photoInfo}>
                <span className={styles.photoName}>{photo.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {previewUrls.length < maxPhotos && (
        <div className={styles.uploadActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className={styles.fileInput}
            aria-label="Upload delivery photos"
          />
          <button
            type="button"
            className="button secondary"
            onClick={handleCameraClick}
            aria-label="Add photo"
          >
            📸 Add Photo
          </button>
          <p className={styles.uploadHint}>
            Take a photo or select from gallery
          </p>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
