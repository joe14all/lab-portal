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
// FIX: Added .nullable() to optional fields to allow 'null' values from form logic
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
    tooth: z.any().optional().nullable(), // Allow null
    arch: z.string().optional().nullable(), // Allow null
    material: z.string().optional().nullable(),
    shade: z.string().optional().nullable(),
    instructions: z.string().optional().nullable(),
    workflowId: z.string().optional().nullable(),
    addonIds: z.array(z.string()).optional(),
    priceOverride: z.any().optional()
  })).min(1, "At least one unit is required")
}).refine((data) => {
  if (!data.dueDate || !data.receivedDate) return true;
  return new Date(data.dueDate) >= new Date(data.receivedDate);
}, {
  message: "Due date cannot be before received date",
  path: ["dueDate"],
});

const CaseForm = ({ initialData = null, onSubmit, onCancel }) => {
  const { clinics, doctors, products, addons } = useCrm();
  const { getWorkflowsForCategory } = useLab();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  // --- Helpers ---
  const getProductDetails = (productName) => {
    return products?.find(p => p.name === productName);
  };

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
    return cat.includes('removable') || cat.includes('ortho') || cat.includes('implant');
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
      workflowId: u.workflowId || '',
      addonIds: u.addonIds || [],
      priceOverride: u.priceOverride || ''
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
          type: '', 
          tooth: null, 
          arch: null, 
          shade: '', 
          instructions: '', 
          workflowId: '',
          addonIds: []
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
      let unit = { ...newUnits[index] };

      if (field === 'type') {
        unit.type = value;
        
        // Get Product Metadata
        const product = getProductDetails(value);
        const category = product?.category || 'Other';

        // RESET FIELDS BASED ON TYPE
        // If it's a Fee/Service, clear tooth/arch/shade
        if (category === 'Fees' || category === 'Services') {
          unit.tooth = null;
          unit.arch = null;
          unit.shade = '';
          unit.material = '';
        } 
        // If it's Ortho/Removable/Implant, default to Arch (mostly) or handle specifically
        else if (category === 'Orthodontics' || category === 'Removables' || category === 'Implants') {
           unit.tooth = null;
           unit.arch = unit.arch || 'Upper';
        } 
        // If it's Crown/Bridge, default to Tooth
        else {
           unit.arch = null;
           unit.tooth = unit.tooth || 1;
        }

        // Reset Add-ons when product changes
        unit.addonIds = [];

        // Auto-Select Workflow
        const validWorkflows = getWorkflowsForCategory(category);
        const defaultWf = validWorkflows.find(w => w.isDefault) || validWorkflows[0];
        unit.workflowId = defaultWf ? defaultWf.id : '';
      } else {
        // Standard field update
        unit[field] = value;
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
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Clean up data before submission
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
        // Ensure clean data on submit based on type logic
        // logic: if Arch is required, Tooth is null, and vice versa.
        tooth: requiresArch(u.type) ? null : (u.type === 'Rush Fee' ? null : Number(u.tooth)),
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
        products={products}
        addons={addons}
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