import React from 'react';
// Adjusted path: up 5 levels to src, then into layouts/components
import { IconUser } from '../../../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

const PatientInfoSection = ({ 
  formData, 
  handleChange, 
  errors, 
  clinics, 
  availableDoctors 
}) => {
  return (
    <div className="card">
      <h3 className={styles.sectionTitle}>
        <IconUser width="18" height="18" /> Patient & Clinic
      </h3>
      <div className={styles.grid}>
        
        {/* Patient Name */}
        <div className="form-group">
          <label>Patient Name *</label>
          <input 
            type="text" name="patientName" 
            value={formData.patientName} onChange={handleChange} 
            className={errors.patientName ? styles.inputError : ''}
            placeholder="Last, First"
          />
          {errors.patientName && <span className="error-text">{errors.patientName}</span>}
        </div>

        {/* Age & Gender */}
        <div className={styles.halfGrid}>
          <div className="form-group">
            <label>Age</label>
            <input 
              type="number" name="patientAge" 
              value={formData.patientAge} onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="patientGender" value={formData.patientGender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className={styles.fullRow}></div>

        {/* Clinic Selection */}
        <div className="form-group">
          <label>Clinic *</label>
          <select 
            name="clinicId" 
            value={formData.clinicId} 
            onChange={handleChange} 
            className={errors.clinicId ? styles.inputError : ''}
          >
            <option value="">Select Clinic...</option>
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.clinicId && <span className="error-text">{errors.clinicId}</span>}
        </div>

        {/* Doctor Selection */}
        <div className="form-group">
          <label>Doctor *</label>
          <select 
            name="doctorId" 
            value={formData.doctorId} 
            onChange={handleChange} 
            disabled={!formData.clinicId}
            className={errors.doctorId ? styles.inputError : ''}
          >
            <option value="">Select Doctor...</option>
            {availableDoctors.map(d => (
              <option key={d.id} value={d.id}>Dr. {d.lastName}</option>
            ))}
          </select>
          {errors.doctorId && <span className="error-text">{errors.doctorId}</span>}
        </div>
      </div>
    </div>
  );
};

export default PatientInfoSection;