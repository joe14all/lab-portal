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
import CasePrintTicket from '../../components/cases/detail/CasePrintTicket';

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  // *** CONTEXT DEPENDENCIES ***
  const { 
    cases, stages, updateCaseStatus, updateCase, 
    getCaseFiles, getCaseMessages, loading: labLoading 
  } = useLab();

  const { clinics, doctors, loading: crmLoading } = useCrm(); 
  const { user } = useAuth();
  
  const [showEditModal, setShowEditModal] = useState(false);

  // --- HOOKS ---
  const handleCaseEditSubmit = useCallback(async (updates) => {
    try {
      const result = await updateCase(caseId, updates);
      console.log('Case updated successfully:', result);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to save case updates:', error);
    }
  }, [caseId, updateCase]);

  // --- 1. Resolve Data & Enrich Case ---
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

  // --- 2. Related Data ---
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

  // --- 4. Helpers ---
  const handleEditClick = () => setShowEditModal(true);

  const updateUnitStatus = (unitId, newStatus) => {
    updateCaseStatus(activeCase.id, newStatus, unitId);
  };

  return (
    <>
      {/* --- PRINT COMPONENT (Hidden on Screen) --- */}
      <CasePrintTicket activeCase={activeCase} />

      {/* --- WEB UI (Hidden on Print) --- */}
      <div className={styles.container}>
        
        {/* HEADER */}
        <CaseDetailHeader 
          activeCase={activeCase} 
          onEditClick={handleEditClick} 
        />

        {/* STEPPER */}
       <CaseDetailStepper 
          activeCase={activeCase} 
          stages={stages}
        />
        
        {/* MAIN GRID */}
        <div className={styles.grid}>
          
          {/* COL 1: CONTEXT */}
          <div className={styles.leftCol}>
            <CaseContextCard activeCase={activeCase} />
          </div>

          {/* COL 2: WORK */}
          <div className={styles.centerCol}>
            <CaseUnitsList 
              units={activeCase.units} 
              stages={stages}
              caseId={activeCase.id}
              updateUnitStatus={updateUnitStatus}
            />
          </div>

          {/* COL 3: ASSETS & COMMS */}
          <div className={styles.rightCol}>
            <CaseFilesCard files={files} caseId={activeCase.id} />
            <CaseCommunicationCard 
              messages={messages} 
              caseId={activeCase.id}
              currentUserId={user?.id}
            />
          </div>

        </div>

        {/* MODAL */}
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
    </>
  );
};

export default CaseDetail;