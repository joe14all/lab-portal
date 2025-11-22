import React, { useEffect } from 'react';
import { IconCheck, IconAlert, IconClose } from '../../layouts/components/LabIcons';
import styles from './Toast.module.css';

const Toast = ({ id, type = 'info', message, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <IconCheck width="18" height="18" />,
    error: <IconAlert width="18" height="18" />,
    info: <IconAlert width="18" height="18" />, // Reusing Alert for info/warning
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.iconWrapper}>
        {icons[type]}
      </div>
      <p className={styles.message}>{message}</p>
      <button onClick={() => onClose(id)} className={styles.closeBtn}>
        <IconClose width="14" height="14" />
      </button>
    </div>
  );
};

export default Toast;