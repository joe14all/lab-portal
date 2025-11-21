/* cspell:ignore Onlay */
import React, { useState, useEffect, useMemo } from 'react';
import { useCrm } from '../../contexts';
import { TOOTH_NUMBERS, MATERIALS } from '../../constants/catalog';
import { IconClose } from '../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

const CaseForm = ({ initialData = null, onSubmit, onCancel }) => {
  const { clinics, doctors } = useCrm();

  // --- Helper: Map Data to Form Structure ---
  const mapToFormData = (data) => ({
    patientName: data?.patient?.name || '',
    patientAge: data?.patient?.age || '',
    patientGender: data?.patient?.gender || 'Male',
    clinicId: data?.clinicId || '',
    doctorId: data?.doctorId || '',
    receivedDate: data?.dates?.received?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: data?.dates?.due?.split('T')[0] || '',
    units: data?.items || data?.units || []
  });

  // --- Local State (Lazy Initializer) ---
  // Fixes "setState in effect" on mount by initializing correctly the first time
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return mapToFormData(initialData);
    }
    return {
      patientName: '',
      patientAge: '',
      patientGender: 'Male',
      clinicId: '',
      doctorId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      units: [] 
    };
  });

  // --- Sync with Prop Updates ---
  // Only runs if initialData changes AFTER mount (e.g. opening a different case)
  useEffect(() => {
    if (initialData) {
      // Defer the update to avoid calling setState synchronously within the effect
      const timer = setTimeout(() => {
        setFormData(mapToFormData(initialData));
      }, 0);
      return () => clearTimeout(timer);
    }
    // no-op if there's no initialData
    return undefined;
  }, [initialData]);

  // --- Derived State (Fixes setState in Effect) ---
  // Calculates available doctors on-the-fly during render
  const availableDoctors = useMemo(() => {
    if (formData.clinicId) {
      return doctors.filter(d => d.clinicId === formData.clinicId);
    }
    return [];
  }, [formData.clinicId, doctors]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [
        ...prev.units,
        { tooth: 1, type: 'Crown', material: 'Zirconia Full Contour', shade: 'A2' }
      ]
    }));
  };

  const handleRemoveUnit = (index) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.filter((_, i) => i !== index)
    }));
  };

  const handleUnitChange = (index, field, value) => {
    setFormData(prev => {
      const newUnits = [...prev.units];
      newUnits[index] = { ...newUnits[index], [field]: value };
      return { ...prev, units: newUnits };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submission = {
      clinicId: formData.clinicId,
      doctorId: formData.doctorId,
      patient: {
        name: formData.patientName,
        age: formData.patientAge,
        gender: formData.patientGender
      },
      dates: {
        received: formData.receivedDate,
        due: formData.dueDate
      },
      items: formData.units
    };
    onSubmit(submission);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h2>{initialData ? 'Edit Case' : 'New Case Entry'}</h2>
      </div>

      {/* SECTION 1: PATIENT & CLINIC */}
      <div className="card">
        <h3 className={styles.sectionTitle}>Patient & Clinic Information</h3>
        <div className={styles.grid}>
          <div className="form-group">
            <label>Patient Name</label>
            <input 
              type="text" name="patientName" required
              value={formData.patientName} onChange={handleChange} 
              placeholder="Last, First"
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input 
              type="number" name="patientAge" 
              value={formData.patientAge} onChange={handleChange} 
              placeholder="Age"
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="patientGender" value={formData.patientGender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Line Break */}
          <div className={styles.fullRow}></div>

          <div className="form-group">
            <label>Clinic</label>
            <select name="clinicId" value={formData.clinicId} onChange={handleChange} required>
              <option value="">Select Clinic...</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Doctor</label>
            <select 
              name="doctorId" value={formData.doctorId} onChange={handleChange} 
              required 
              disabled={!formData.clinicId}
            >
              <option value="">Select Doctor...</option>
              {availableDoctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.lastName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: DATES */}
      <div className="card">
        <h3 className={styles.sectionTitle}>Timeline</h3>
        <div className={styles.grid}>
          <div className="form-group">
            <label>Received Date</label>
            <input 
              type="date" name="receivedDate" required
              value={formData.receivedDate} onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input 
              type="date" name="dueDate" required
              value={formData.dueDate} onChange={handleChange} 
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: UNITS / PRESCRIPTION */}
      <div className="card">
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Prescription Units</h3>
          <button type="button" className="button secondary" onClick={handleAddUnit}>
            + Add Unit
          </button>
        </div>

        {formData.units.length === 0 && (
          <p className={styles.emptyText}>No units added. Click "+ Add Unit" to begin.</p>
        )}

        <div className={styles.unitsList}>
          {formData.units.map((unit, index) => (
            <div key={index} className={styles.unitRow}>
              <div className={styles.unitFieldSmall}>
                <label>Tooth #</label>
                <select 
                  value={unit.tooth} 
                  onChange={(e) => handleUnitChange(index, 'tooth', e.target.value)}
                >
                  {TOOTH_NUMBERS.map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className={styles.unitField}>
                <label>Product Type</label>
                <select 
                  value={unit.type} 
                  onChange={(e) => handleUnitChange(index, 'type', e.target.value)}
                >
                  <option value="Crown">Crown</option>
                  <option value="Bridge">Bridge Pontic</option>
                  <option value="Veneer">Veneer</option>
                  <option value="Inlay/Onlay">Inlay/Onlay</option>
                  <option value="Implant Crown">Implant Crown</option>
                </select>
              </div>

              <div className={styles.unitField}>
                <label>Material</label>
                <select 
                  value={unit.material} 
                  onChange={(e) => handleUnitChange(index, 'material', e.target.value)}
                >
                  {Object.values(MATERIALS).map(mat => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.unitFieldSmall}>
                <label>Shade</label>
                <input 
                  type="text" 
                  value={unit.shade} 
                  onChange={(e) => handleUnitChange(index, 'shade', e.target.value)}
                  placeholder="e.g. A2"
                />
              </div>

              <button 
                type="button" 
                className={styles.removeBtn}
                onClick={() => handleRemoveUnit(index)}
                title="Remove Unit"
              >
                <IconClose width="16" height="16" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div className={styles.actions}>
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary">
          {initialData ? 'Save Changes' : 'Create Case'}
        </button>
      </div>
    </form>
  );
};

export default CaseForm;