import React from 'react';
import Modal from './Modal';
import { IconAlert } from '../../layouts/components/LabIcons';
import styles from './ConfirmationModal.module.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || "Confirm Action"}
      icon={<IconAlert width="24" height="24" />}
      variant="danger"
      width="400px"
      footer={
        <div className={styles.footer}>
          <button 
            className="button text" 
            onClick={onClose} 
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="button secondary danger" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      }
    >
      <div className={styles.message}>
        <p>{message || "Are you sure you want to proceed? This action cannot be undone."}</p>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;