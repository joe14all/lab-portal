import React from 'react';
import { 
  IconCheck, 
  IconAlert, 
  IconClock, 
  IconDrill, 
  IconMicroscope,
  IconBox,     // New import for Received
  IconTooth,   // New import for Model
  IconFire,    // New import for Casting
  IconLayers,  // New import for Processing
  IconTruck    // New import for Shipped
} from '../../layouts/components/LabIcons';
import styles from './StatusBadge.module.css';

const STATUS_CONFIG = {
  // Pre-Production
  'stage-new':        { color: 'blue',   icon: null,            label: 'New' },
  'stage-received':   { color: 'indigo', icon: <IconBox />,     label: 'Received' },
  'stage-model':      { color: 'indigo', icon: <IconTooth />,   label: 'Model Work' },
  
  // Design / Setup
  'stage-design':     { color: 'purple', icon: null,            label: 'Design' },
  'stage-waxup':      { color: 'purple', icon: <IconDrill />,   label: 'Wax-up' },
  
  // Production (Analog & Digital)
  'stage-milling':    { color: 'orange', icon: <IconDrill />,   label: 'Milling' },
  'stage-casting':    { color: 'orange', icon: <IconFire />,    label: 'Casting' },
  'stage-processing': { color: 'pink',   icon: <IconLayers />,  label: 'Processing' },
  'stage-finishing':  { color: 'pink',   icon: <IconMicroscope />, label: 'Finishing' },
  
  // Post-Production
  'stage-qc':         { color: 'teal',   icon: <IconCheck />,   label: 'QC' },
  'stage-shipped':    { color: 'green',  icon: <IconTruck />,   label: 'Shipped' },
  'stage-delivered':  { color: 'green',  icon: <IconCheck />,   label: 'Delivered' },
  
  // Exceptions
  'stage-hold':       { color: 'red',    icon: <IconAlert />,   label: 'On Hold' },
  'stage-cancelled':  { color: 'gray',   icon: null,            label: 'Cancelled' },
};

const StatusBadge = ({ status, className = '' }) => {
  // Fallback if status string is not in config
  const config = STATUS_CONFIG[status] || { color: 'gray', label: status, icon: null };
  
  return (
    <span className={`${styles.badge} ${styles[config.color]} ${className}`}>
      {config.icon && <span className={styles.icon}>{config.icon}</span>}
      {config.label}
    </span>
  );
};

export default StatusBadge;