import React, { useState, useMemo, useRef } from 'react';
import { z } from 'zod';
import { useCrm, useLab } from '../../contexts';
import { IconAlert } from '../../layouts/components/LabIcons';
import styles from './CaseForm.module.css';

// Sub-components
import PatientInfoSection from './detail/caseForm/PatientInfoSection';
import TimelineSection from './detail/caseForm/TimelineSection';
import PrescriptionForm from './prescription/PrescriptionForm';

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

// --- VALIDATION SCHEMAS ---
// Minimal schema for draft mode (only requires essential fields)
const draftSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  clinicId: z.string().min(1, "Clinic is required")
});

// Full schema for complete submission
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

const CaseForm = ({ initialData = null, onSubmit, onCancel, onSaveDraft }) => {
  const { clinics, doctors, products, addons } = useCrm();
  const { getWorkflowsForCategory } = useLab();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isDraft, setIsDraft] = useState(initialData?.isDraft || false);
  const formRef = useRef(null);

  // Map field names to user-friendly labels
  const FIELD_LABELS = {
    patientName: 'Patient Name',
    clinicId: 'Clinic',
    doctorId: 'Doctor',
    receivedDate: 'Received Date',
    dueDate: 'Due Date',
    units: 'Prescription Items'
  };

  // --- Helpers ---
  const getProductDetails = (productName) => {
    return products?.find(p => p.name === productName);
  };

  // Scroll to field with error
  const scrollToField = (fieldName) => {
    if (!formRef.current) return;
    
    // Find the input/select element by name attribute
    const field = formRef.current.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field.focus();
    }
  };

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

  const handleSaveDraft = (e) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate with minimal schema
    const result = draftSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      setFormError("Please provide at least patient name and clinic.");
      
      // Scroll to first error field
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField) {
        setTimeout(() => scrollToField(firstErrorField), 100);
      }
      return;
    }

    const draftSubmission = {
      ...formData,
      isDraft: true,
      patient: {
        name: formData.patientName,
        age: formData.patientAge,
        gender: formData.patientGender
      }
    };

    if (onSaveDraft) {
      onSaveDraft(draftSubmission);
    }
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
      
      // Scroll to first error field
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField) {
        setTimeout(() => scrollToField(firstErrorField), 100);
      }
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

  const handlePrescriptionSubmit = (units) => {
    // Validate patient and clinic info
    if (!formData.patientName || !formData.clinicId) {
      const fieldErrors = {};
      if (!formData.patientName) fieldErrors.patientName = "Patient name is required";
      if (!formData.clinicId) fieldErrors.clinicId = "Clinic is required";
      
      setErrors(fieldErrors);
      setFormError("Please fill patient name and select clinic first");
      
      // Scroll to first error
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField) {
        setTimeout(() => scrollToField(firstErrorField), 100);
      }
      return;
    }

    // Clear any existing errors
    setErrors({});
    setFormError(null);

    // Create submission with prescription units
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
      units
    };

    onSubmit(submission);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer} ref={formRef}>
      
      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className={styles.errorSummary}>
          <div className={styles.errorHeader}>
            <IconAlert width="20" height="20" />
            <strong>
              {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''} found
            </strong>
          </div>
          <div className={styles.errorList}>
            {Object.entries(errors).map(([field, message]) => (
              <button
                key={field}
                type="button"
                className={styles.errorItem}
                onClick={() => scrollToField(field)}
              >
                <span className={styles.errorField}>
                  {FIELD_LABELS[field] || field}:
                </span>
                <span className={styles.errorMessage}>{message}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      <PrescriptionForm
        onSubmit={handlePrescriptionSubmit}
        onCancel={onCancel}
        existingUnits={formData.units}
      />
    </form>
  );
};

export default CaseForm;