import React from 'react';
import { IconCalendar } from '../../../../layouts/components/LabIcons';
import styles from './TimelineSection.module.css';

const TimelineSection = ({ formData, handleChange, errors }) => {
  return (
    <div className="card">
      <h3 className={styles.sectionTitle}>
        <IconCalendar width="18" height="18" /> Timeline
      </h3>
      <div className={styles.grid}>
        <div className="form-group">
          <label>Received Date *</label>
          <input 
            type="date" name="receivedDate" 
            value={formData.receivedDate} onChange={handleChange} 
          />
        </div>
        <div className="form-group">
          <label>Due Date *</label>
          <input 
            type="date" name="dueDate" 
            value={formData.dueDate} onChange={handleChange}
            className={errors.dueDate ? styles.inputError : ''}
          />
          {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
        </div>
      </div>
    </div>
  );
};

export default TimelineSection;