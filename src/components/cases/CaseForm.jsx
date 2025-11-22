import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { useCrm } from '../../contexts';
import { TOOTH_NUMBERS } from '../../constants/catalog';
import { 
  IconClose, 
  IconUser, 
  IconCalendar, 
  IconTooth 
} from '../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

// --- CONSTANTS ---
const ARCH_OPTIONS = ["Upper", "Lower", "Both"];

const DEFAULT_FORM_VALUES = {
  patientName: '',
  patientAge: '',
  patientGender: 'Male',
  clinicId: '',
  doctorId: '',
  receivedDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  units: [] 
};

// --- VALIDATION SCHEMA ---
const schema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  patientAge: z.any().optional(),
  patientGender: z.enum(["Male", "Female", "Other"]),
  clinicId: z.string().min(1, "Clinic is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  receivedDate: z.string().refine(val => !isNaN(Date.parse(val)), "Invalid date"),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), "Invalid date"),
  units: z.array(z.object({
    type: z.string().min(1, "Product type is required"),
    tooth: z.any().optional(),
    arch: z.string().optional(),
    material: z.string().optional(),
    shade: z.string().optional(),
    instructions: z.string().optional()
  })).min(1, "At least one unit is required")
}).refine((data) => {
  if (!data.dueDate || !data.receivedDate) return true;
  return new Date(data.dueDate) >= new Date(data.receivedDate);
}, {
  message: "Due date cannot be before received date",
  path: ["dueDate"],
});

const CaseForm = ({ initialData = null, onSubmit, onCancel }) => {
  const { clinics, doctors, products } = useCrm();
  const [errors, setErrors] = useState({});

  // --- Helper: Group Products ---
  const productCategories = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, prod) => {
      const cat = prod.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(prod);
      return acc;
    }, {});
  }, [products]);

  // --- Helper: Determine if unit needs Arch or Tooth ---
  const requiresArch = (productName) => {
    const product = products.find(p => p.name === productName);
    if (!product) return false;
    const cat = (product.category || '').toLowerCase();
    return cat.includes('removable') || cat.includes('ortho');
  };

  // --- Helper: Map Data to Form ---
  const mapToFormData = (data) => ({
    patientName: data?.patient?.name || '',
    patientAge: data?.patient?.age || '',
    patientGender: data?.patient?.gender || 'Male',
    clinicId: data?.clinicId || '',
    doctorId: data?.doctorId || '',
    receivedDate: data?.dates?.received?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: data?.dates?.due?.split('T')[0] || '',
    units: (data?.units || data?.items || []).map(u => ({
      ...u,
      tooth: u.tooth || '',
      arch: u.arch || '',
      instructions: u.instructions || ''
    }))
  });

  // --- Local State (with Derived State Pattern) ---
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [formData, setFormData] = useState(() => 
    initialData ? mapToFormData(initialData) : DEFAULT_FORM_VALUES
  );

  // FIX: Update state during render if props change (avoids useEffect cascade)
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setFormData(initialData ? mapToFormData(initialData) : DEFAULT_FORM_VALUES);
  }

  // --- Derived State for Dropdowns ---
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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleAddUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [
        ...prev.units,
        { 
          tooth: 1, 
          arch: 'Upper',
          type: 'Zirconia Crown (Full Contour)', 
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
      const unit = { ...newUnits[index], [field]: value };
      
      // Reset position logic when type changes
      if (field === 'type') {
        const isArch = requiresArch(value);
        if (isArch) {
           unit.tooth = null;
           unit.arch = unit.arch || 'Upper';
        } else {
           unit.arch = null;
           unit.tooth = unit.tooth || 1;
        }
      }
      
      newUnits[index] = unit;
      return { ...prev, units: newUnits };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 1. Validate
    const result = schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // 2. Prepare Submission
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
      units: formData.units.map(u => ({
        ...u,
        tooth: requiresArch(u.type) ? null : Number(u.tooth),
        arch: requiresArch(u.type) ? u.arch : null
      }))
    };

    onSubmit(submission);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      
      {/* SECTION 1: PATIENT & CLINIC */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          <IconUser width="18" height="18" /> Patient & Clinic
        </h3>
        <div className={styles.grid}>
          <div className="form-group">
            <label>Patient Name</label>
            <input 
              type="text" name="patientName" 
              value={formData.patientName} onChange={handleChange} 
              className={errors.patientName ? styles.inputError : ''}
              placeholder="Last, First"
            />
            {errors.patientName && <span className="error-text">{errors.patientName}</span>}
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
          <div className="form-group">
            <label>Doctor</label>
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

      {/* SECTION 2: DATES */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          <IconCalendar width="18" height="18" /> Timeline
        </h3>
        <div className={styles.grid}>
          <div className="form-group">
            <label>Received Date</label>
            <input 
              type="date" name="receivedDate" 
              value={formData.receivedDate} onChange={handleChange} 
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input 
              type="date" name="dueDate" 
              value={formData.dueDate} onChange={handleChange}
              className={errors.dueDate ? styles.inputError : ''}
            />
            {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
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
            {formData.units.map((unit, index) => {
              const showArch = requiresArch(unit.type);

              return (
                <div key={index} className={styles.unitRow}>
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

                  <div className={styles.unitMainGrid}>
                    
                    {/* Position Selector */}
                    <div className="form-group">
                      <label>{showArch ? 'Arch' : 'Tooth'}</label>
                      {showArch ? (
                        <select
                          value={unit.arch || ''}
                          onChange={(e) => handleUnitChange(index, 'arch', e.target.value)}
                        >
                          {ARCH_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <select 
                          value={unit.tooth || ''} 
                          onChange={(e) => handleUnitChange(index, 'tooth', e.target.value)}
                        >
                          {TOOTH_NUMBERS.map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Product Type */}
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

                  <div className={styles.unitExtras}>
                    <input 
                      type="text"
                      className={styles.instructionInput}
                      value={unit.instructions}
                      onChange={(e) => handleUnitChange(index, 'instructions', e.target.value)}
                      placeholder="Specific instructions for this unit..."
                    />
                  </div>
                </div>
              );
            })}
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