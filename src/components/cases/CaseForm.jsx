import React, { useState, useEffect, useMemo } from 'react';
import { useCrm } from '../../contexts';
import { TOOTH_NUMBERS, MATERIALS } from '../../constants/catalog';
import { 
  IconClose, 
  IconUser, 
  IconCalendar, 
  IconTooth,
  IconDrill 
} from '../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

const CaseForm = ({ initialData = null, onSubmit, onCancel }) => {
  // Access full catalog from CRM context
  const { clinics, doctors, products } = useCrm();

  // --- Helper: Group Products by Category ---
  const productCategories = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, prod) => {
      const cat = prod.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(prod);
      return acc;
    }, {});
  }, [products]);

  // --- Helper: Map Data to Form Structure ---
  const mapToFormData = (data) => ({
    patientName: data?.patient?.name || '',
    patientAge: data?.patient?.age || '',
    patientGender: data?.patient?.gender || 'Male',
    clinicId: data?.clinicId || '',
    doctorId: data?.doctorId || '',
    receivedDate: data?.dates?.received?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: data?.dates?.due?.split('T')[0] || '',
    // Map units and ensure instructions field exists
    units: (data?.items || data?.units || []).map(u => ({
      ...u,
      instructions: u.instructions || ''
    }))
  });

  // --- Local State ---
  const [formData, setFormData] = useState(() => 
    initialData ? mapToFormData(initialData) : {
      patientName: '',
      patientAge: '',
      patientGender: 'Male',
      clinicId: '',
      doctorId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      units: [] 
    }
  );

  // --- Sync with Prop Updates ---
  useEffect(() => {
    if (initialData) {
      const timer = setTimeout(() => setFormData(mapToFormData(initialData)), 0);
      return () => clearTimeout(timer);
    }
  }, [initialData]);

  // --- Derived State ---
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
        { 
          tooth: 1, 
          type: 'Zirconia Crown (Full Contour)', // Default
          material: 'Zirconia', 
          shade: 'A2',
          instructions: '' 
        }
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
      {/* Removed internal header since this is usually inside a Modal with its own header */}
      
      {/* SECTION 1: PATIENT & CLINIC */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          <IconUser width="18" height="18" /> Patient & Clinic
        </h3>
        <div className={styles.grid}>
          <div className="form-group">
            <label>Patient Name</label>
            <input 
              type="text" name="patientName" required
              value={formData.patientName} onChange={handleChange} 
              placeholder="Last, First"
            />
          </div>
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
              </select>
            </div>
          </div>

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
        <h3 className={styles.sectionTitle}>
          <IconCalendar width="18" height="18" /> Timeline
        </h3>
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

      {/* SECTION 3: UNITS */}
      <div className="card">
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle} style={{marginBottom:0, border:0}}>
            <IconTooth width="18" height="18" /> Prescription Units
          </h3>
          <button type="button" className="button secondary" onClick={handleAddUnit}>
            + Add Unit
          </button>
        </div>

        {formData.units.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No units added to this case.</p>
            <button type="button" className="button text" onClick={handleAddUnit}>Add First Unit</button>
          </div>
        ) : (
          <div className={styles.unitsList}>
            {formData.units.map((unit, index) => (
              <div key={index} className={styles.unitRow}>
                {/* Row Header: Remove Button */}
                <div className={styles.unitHeader}>
                  <span className={styles.unitIndex}>#{index + 1}</span>
                  <button 
                    type="button" 
                    className={styles.removeBtn}
                    onClick={() => handleRemoveUnit(index)}
                    title="Remove Unit"
                  >
                    <IconClose width="14" height="14" />
                  </button>
                </div>

                {/* Main Inputs Grid */}
                <div className={styles.unitMainGrid}>
                  
                  {/* Tooth Number */}
                  <div className="form-group">
                    <label>Tooth</label>
                    <select 
                      value={unit.tooth || ''} 
                      onChange={(e) => handleUnitChange(index, 'tooth', e.target.value)}
                    >
                      <option value="">N/A</option>
                      {TOOTH_NUMBERS.map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  {/* Product Type (Categorized) */}
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Product / Service</label>
                    <select 
                      value={unit.type} 
                      onChange={(e) => handleUnitChange(index, 'type', e.target.value)}
                    >
                      {Object.entries(productCategories).map(([category, items]) => (
                        <optgroup key={category} label={category}>
                          {items.map(prod => (
                            <option key={prod.id} value={prod.name}>{prod.name}</option>
                          ))}
                        </optgroup>
                      ))}
                      {/* Fallback/Legacy Options if catalog fails */}
                      <optgroup label="Legacy">
                        <option value="Crown">Standard Crown</option>
                        <option value="Bridge">Bridge Unit</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Shade */}
                  <div className="form-group">
                    <label>Shade</label>
                    <input 
                      type="text" 
                      value={unit.shade} 
                      onChange={(e) => handleUnitChange(index, 'shade', e.target.value)}
                      placeholder="A2, BL1..."
                    />
                  </div>
                </div>

                {/* Extended Inputs: Instructions */}
                <div className={styles.unitExtras}>
                  <input 
                    type="text"
                    className={styles.instructionInput}
                    value={unit.instructions}
                    onChange={(e) => handleUnitChange(index, 'instructions', e.target.value)}
                    placeholder="Specific instructions for this unit (e.g., 'Light occlusion', 'Metal island')..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
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