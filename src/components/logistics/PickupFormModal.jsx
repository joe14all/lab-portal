/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useCrm, useLogistics, useToast } from '../../contexts';
import { IconBox, IconClock } from '../../layouts/components/LabIcons';
import styles from './PickupFormModal.module.css';

const PickupFormModal = ({ isOpen, onClose }) => {
  const { clinics } = useCrm();
  const { createPickupRequest } = useLogistics();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    clinicId: '',
    notes: '',
    packageCount: 1,
    isRush: false,
    readyTime: '' // 'HH:MM'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timeString = now.toTimeString().slice(0, 5); // HH:MM
      setFormData({
        clinicId: '',
        notes: '',
        packageCount: 1,
        isRush: false,
        readyTime: timeString
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Construct ISO timestamp for today + readyTime
      const today = new Date().toISOString().split('T')[0];
      const requestDateTime = new Date(`${today}T${formData.readyTime}:00`).toISOString();

      await createPickupRequest({
        clinicId: formData.clinicId,
        packageCount: parseInt(formData.packageCount),
        notes: formData.notes,
        isRush: formData.isRush,
        requestTime: requestDateTime,
        // Optional: window logic could be added here
        windowStart: requestDateTime, 
        windowEnd: new Date(new Date(requestDateTime).getTime() + 4 * 60 * 60 * 1000).toISOString() // +4 hours
      });

      addToast("Pickup scheduled successfully", "success");
      onClose();
    } catch (err) {
      addToast("Failed to schedule pickup", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request New Pickup"
      icon={<IconBox width="20" />}
      width="500px"
      footer={
        <div className={styles.footer}>
          <button className="button text" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button 
            className="button primary" 
            onClick={handleSubmit}
            disabled={!formData.clinicId || !formData.readyTime || isSubmitting}
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Pickup'}
          </button>
        </div>
      }
    >
      <form className={styles.form}>
        
        {/* Clinic Selection */}
        <div className="form-group">
          <label>Clinic *</label>
          <select 
            className="input"
            value={formData.clinicId}
            onChange={e => setFormData({...formData, clinicId: e.target.value})}
            autoFocus
          >
            <option value="">Select Clinic...</option>
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Time & Count */}
        <div className={styles.row}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Ready Time *</label>
            <input 
              type="time" 
              className="input"
              value={formData.readyTime}
              onChange={e => setFormData({...formData, readyTime: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Package Count</label>
            <input 
              type="number" 
              min="1"
              className="input"
              value={formData.packageCount}
              onChange={e => setFormData({...formData, packageCount: e.target.value})}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label>Instructions / Notes</label>
          <textarea 
            rows="3"
            className="input"
            placeholder="e.g. Leave at front desk, fragile items..."
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        {/* Rush Toggle */}
        <label className={styles.rushGroup}>
          <input 
            type="checkbox" 
            className={styles.checkbox}
            checked={formData.isRush}
            onChange={e => setFormData({...formData, isRush: e.target.checked})}
          />
          <div style={{display:'flex', flexDirection:'column'}}>
            <span className={styles.rushLabel}>Rush Pickup Required</span>
            <span style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>
              May incur additional fees or require immediate dispatch.
            </span>
          </div>
        </label>

      </form>
    </Modal>
  );
};

export default PickupFormModal;