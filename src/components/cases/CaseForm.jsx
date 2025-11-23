import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { useCrm, useLab } from '../../contexts';
import styles from './CaseForm.module.css';

// Sub-components
import PatientInfoSection from './detail/caseForm/PatientInfoSection';
import TimelineSection from './detail/caseForm/TimelineSection';
import UnitsSection from './detail/caseForm/UnitsSection';

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
    instructions: z.string().optional(),
    workflowId: z.string().optional(),
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
  const { getWorkflowsForCategory } = useLab();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  // --- Helpers ---
  const productCategories = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, prod) => {
      const cat = prod.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(prod);
      return acc;
    }, {});
  }, [products]);

  const requiresArch = (productName) => {
    const product = products.find(p => p.name === productName);
    if (!product) return false;
    const cat = (product.category || '').toLowerCase();
    return cat.includes('removable') || cat.includes('ortho');
  };

  const getProductCategory = (productName) => {
    const p = products.find(prod => prod.name === productName);
    return p ? p.category : 'Other';
  };

  const helpers = { requiresArch, getProductCategory };

  // --- Form Initialization ---
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
      instructions: u.instructions || '',
      workflowId: u.workflowId || ''
    }))
  });

  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [formData, setFormData] = useState(() => 
    initialData ? mapToFormData(initialData) : DEFAULT_FORM_VALUES
  );

  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setFormData(initialData ? mapToFormData(initialData) : DEFAULT_FORM_VALUES);
  }

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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (formError) setFormError(null);
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
          instructions: '',
          workflowId: ''
        }
      ]
    }));
    if (errors.units) setErrors(prev => ({ ...prev, units: null }));
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
      let unit = { ...newUnits[index], [field]: value };
      
      if (field === 'type') {
        // Logic 1: Reset Position (Tooth vs Arch)
        const isArch = requiresArch(value);
        if (isArch) {
           unit.tooth = null;
           unit.arch = unit.arch || 'Upper';
        } else {
           unit.arch = null;
           unit.tooth = unit.tooth || 1;
        }

        // Logic 2: Auto-Select Workflow
        const category = getProductCategory(value);
        const validWorkflows = getWorkflowsForCategory(category);
        const defaultWf = validWorkflows.find(w => w.isDefault) || validWorkflows[0];
        unit.workflowId = defaultWf ? defaultWf.id : '';
      }
      
      newUnits[index] = unit;
      return { ...prev, units: newUnits };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    
    const result = schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      setFormError("Please correct the highlighted errors.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
      
      <PatientInfoSection 
        formData={formData} 
        handleChange={handleChange} 
        errors={errors}
        clinics={clinics}
        availableDoctors={availableDoctors}
      />

      <TimelineSection 
        formData={formData} 
        handleChange={handleChange} 
        errors={errors} 
      />

      <UnitsSection 
        units={formData.units}
        onAddUnit={handleAddUnit}
        onRemoveUnit={handleRemoveUnit}
        onUnitChange={handleUnitChange}
        productCategories={productCategories}
        getWorkflowsForCategory={getWorkflowsForCategory}
        helpers={helpers}
        error={errors.units}
      />

      {/* ACTIONS */}
      <div className={styles.actions}>
        {formError && (
          <span className="error-text" style={{ marginRight: 'auto', alignSelf: 'center' }}>
            {formError}
          </span>
        )}
        
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