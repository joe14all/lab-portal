import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Import necessary contexts
import { useLab, useAuth, useCrm } from '../../contexts'; 
import CaseForm from '../../components/cases/CaseForm'; 
import { IconClose } from '../../layouts/components/LabIcons';
import styles from './CaseDetail.module.css';

// --- New Sub-Component Imports ---
import CaseDetailHeader from '../../components/cases/detail/CaseDetailHeader';
import CaseDetailStepper from '../../components/cases/detail/CaseDetailStepper';
import CaseContextCard from '../../components/cases/detail/CaseContextCard';
import CaseUnitsList from '../../components/cases/detail/CaseUnitsList';
import CaseFilesCard from '../../components/cases/detail/CaseFilesCard';
import CaseCommunicationCard from '../../components/cases/detail/CaseCommunicationCard';
// ----------------------------------

// Map specific stages to their representative icons
const getStageIcon = (stageId) => {
  switch (stageId) {
    case 'stage-milling':
      return <IconDrill width="16" height="16" />;
    case 'stage-finishing':
    case 'stage-qc':
      return <IconMicroscope width="16" height="16" />;
    case 'stage-shipped':
      return <IconCheck width="16" height="16" />;
    case 'stage-hold':
      return <IconAlert width="16" height="16" />;
    case 'stage-design':
    case 'stage-received':
    default:
      return null;
  }
};

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  // *** CONTEXT DEPENDENCIES ***
  const { 
    cases, stages, updateCaseStatus, updateCase, 
    getCaseFiles, getCaseMessages, loading: labLoading 
  } = useLab();

  const { clinics, doctors, loading: crmLoading } = useCrm(); 
  const { user } = useAuth(); // RE-INTRODUCED USER HERE
  
  const [showEditModal, setShowEditModal] = useState(false);

  // --- HOOKS (MUST BE UNCONDITIONAL) ---
  const handleCaseEditSubmit = useCallback(async (updates) => {
    try {
      const result = await updateCase(caseId, updates);
      console.log('Case updated successfully:', result);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to save case updates:', error);
    }
  }, [caseId, updateCase]);

  // --- 1. Resolve Data & Enrich Case (Memoized Data Layer) ---
  const activeCase = useMemo(() => {
    if (labLoading || crmLoading) return null;

    const foundCase = cases.find(c => c.id === caseId);
    if (!foundCase) return null;

    const clinic = clinics.find(cl => cl.id === foundCase.clinicId);
    const doctor = doctors.find(doc => doc.id === foundCase.doctorId);
    
    return {
      ...foundCase,
      clinicName: clinic ? clinic.name : 'Unknown Clinic',
      doctorName: doctor ? `Dr. ${doctor.lastName}` : (foundCase.doctorId || 'Unknown Doctor'),
      units: foundCase.units || foundCase.items || [] 
    };
  }, [cases, caseId, clinics, doctors, labLoading, crmLoading]);

  // --- 2. Related Data Getters ---
  const allFiles = getCaseFiles(caseId);
  const messages = getCaseMessages(caseId);

  const files = useMemo(() => {
    return {
      inputs: allFiles.filter(f => f.category?.includes('INPUT') || f.category?.includes('REFERENCE')),
      designs: allFiles.filter(f => f.category?.includes('PRODUCTION_DESIGN'))
    };
  }, [allFiles]);

  // --- 3. Loading/Error States ---
  if (labLoading || crmLoading || !activeCase) {
    if (labLoading || crmLoading) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading case data...
        </div>
      );
    }
    return (
      <div className="card">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Case Not Found</h2>
          <p>The requested case ID <strong>{caseId}</strong> does not exist or you do not have permission to view it.</p>
          <button className="button secondary" onClick={() => navigate('/cases')}>
            Back to Case List
          </button>
        </div>
      </div>
    );
  }

  // --- 4. Render Helpers ---
  const handleEditClick = () => setShowEditModal(true);

  // --- Stage Helpers (Kept here for simplicity, logic is in components) ---
  const currentStageId = activeCase.status; 
  const currentStageIndex = stages.findIndex(s => s.id === currentStageId);
  
  const getStageClass = (stageId, index) => {
    if (currentStageId === stageId) return `${styles.step} ${styles.active}`;
    if (index < currentStageIndex) return `${styles.step} ${styles.completed}`;
    return styles.step;
  };

  const updateUnitStatus = (unitId, newStatus) => {
    updateCaseStatus(activeCase.id, newStatus, unitId);
  };
  // ----------------------------------------------------------------------


  return (
    <div className={styles.container}>
      
      {/* === HEADER === */}
      <CaseDetailHeader 
        activeCase={activeCase} 
        onEditClick={handleEditClick} 
      />

      {/* === WORKFLOW STEPPER === */}
      <CaseDetailStepper 
        caseStatus={activeCase.status} 
        stages={stages}
      />
      
      {/* === MAIN GRID === */}
      <div className={styles.grid}>
        
        {/* --- COL 1: CONTEXT --- */}
        <div className={styles.leftCol}>
          <CaseContextCard 
            activeCase={activeCase} 
          />
        </div>

        {/* --- COL 2: THE WORK --- */}
        <div className={styles.centerCol}>
          <CaseUnitsList 
            units={activeCase.units} 
            stages={stages}
            caseId={activeCase.id}
            updateUnitStatus={updateUnitStatus}
          />
        </div>

        {/* --- COL 3: DIGITAL ASSETS & COMMUNICATION --- */}
        <div className={styles.rightCol}>
          
          <CaseFilesCard 
            files={files} 
            caseId={activeCase.id}
          />

          <CaseCommunicationCard 
            messages={messages} 
            caseId={activeCase.id}
            currentUserId={user?.id} // USER IS NOW DEFINED
          />
        </div>

      </div>

      {/* === EDIT CASE MODAL === */}
      {showEditModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
                <h3>Editing Case #{activeCase.caseNumber}</h3>
                <button className="icon-button" onClick={() => setShowEditModal(false)}>
                    <IconClose width="24" height="24" />
                </button>
            </div>
            <CaseForm
              initialData={activeCase}
              onSubmit={handleCaseEditSubmit}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetail;