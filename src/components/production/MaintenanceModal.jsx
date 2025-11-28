import React, { useState } from 'react';
import Modal from '../common/Modal';
import { IconDrill } from '../../layouts/components/LabIcons';
import styles from './MaintenanceModal.module.css';

const MaintenanceModal = ({ machine, isOpen, onClose, onSave }) => {
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(machine.id, { notes, cost: parseFloat(cost) || 0 });
  };

  if (!machine) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Maintenance"
      icon={<IconDrill width="20" />}
      width="500px"
      footer={
        <div className={styles.footer}>
          <button className="button text" onClick={onClose}>Cancel</button>
          <button className="button primary" onClick={handleSubmit}>Complete Service</button>
        </div>
      }
    >
      <form className={styles.form}>
        <div className={styles.machineSummary}>
          <span className={styles.machineName}>{machine.name}</span>
          <span className={styles.machineSerial}>S/N: {machine.serialNumber}</span>
        </div>

        <div className="form-group">
          <label>Service Notes *</label>
          <textarea 
            className="input"
            rows="4"
            placeholder="Describe work performed (e.g., Spindle calibration, Filter change)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Cost (Parts & Labor)</label>
          <input 
            type="number"
            className="input"
            placeholder="0.00"
            value={cost}
            onChange={e => setCost(e.target.value)}
            step="0.01"
          />
        </div>
      </form>
    </Modal>
  );
};

export default MaintenanceModal;