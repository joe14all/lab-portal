import React from 'react';
import { 
  IconCheck, 
  IconAlert, 
  IconClock, 
  IconDrill, 
  IconMicroscope 
} from '../../layouts/components/LabIcons';
import styles from './StatusBadge.module.css';

const STATUS_CONFIG = {
  'stage-new': { color: 'blue', icon: null, label: 'New' },
  'stage-received': { color: 'indigo', icon: <IconClock />, label: 'Received' },
  'stage-design': { color: 'purple', icon: null, label: 'Design' },
  'stage-milling': { color: 'orange', icon: <IconDrill />, label: 'Milling' },
  'stage-finishing': { color: 'pink', icon: <IconMicroscope />, label: 'Finishing' },
  'stage-qc': { color: 'teal', icon: <IconCheck />, label: 'QC' },
  'stage-shipped': { color: 'green', icon: <IconCheck />, label: 'Shipped' },
  'stage-hold': { color: 'red', icon: <IconAlert />, label: 'On Hold' },
  'stage-cancelled': { color: 'gray', icon: null, label: 'Cancelled' },
};

const StatusBadge = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status] || { color: 'gray', label: status };
  
  return (
    <span className={`${styles.badge} ${styles[config.color]} ${className}`}>
      {config.icon && <span className={styles.icon}>{config.icon}</span>}
      {config.label}
    </span>
  );
};

export default StatusBadge;