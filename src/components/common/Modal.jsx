import React, { useEffect } from 'react';
import { IconClose } from '../../layouts/components/LabIcons';
import styles from './Modal.module.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  icon, 
  children, 
  footer,
  variant = 'default', // 'default' | 'danger' | 'warning'
  width = '500px'
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Resolve variant classes
  const headerClass = `${styles.header} ${styles[variant] || ''}`;
  const titleClass = `${styles.title} ${styles[variant + 'Text'] || ''}`;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className={styles.content} 
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={headerClass}>
          <div className={titleClass}>
            {icon && <span className={styles.iconWrapper}>{icon}</span>}
            <h3>{title}</h3>
          </div>
          <button 
            className={styles.closeBtn} 
            onClick={onClose}
            aria-label="Close modal"
          >
            <IconClose width="20" height="20" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {children}
        </div>

        {/* Footer (Optional) */}
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;