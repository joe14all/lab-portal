import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLab, useAuth, useCrm } from '../../contexts'; 
import CaseForm from '../../components/cases/CaseForm'; 
import { IconClose } from '../../layouts/components/LabIcons';
import styles from './CaseDetail.module.css';

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
  
  const { 
    cases, stages, updateCaseStatus, updateCase, 
    getCaseFiles, getCaseMessages, loading: labLoading 
  } = useLab();

  const { clinics, doctors, loading: crmLoading } = useCrm(); 
  const { user } = useAuth();
  
  const [showEditModal, setShowEditModal] = useState(false);

  const handleCaseEditSubmit = useCallback(async (updates) => {
    try {
      // FIX: Removed unused 'result' variable assignment
      await updateCase(caseId, updates);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to save case updates:', error);
    }
  }, [caseId, updateCase]);

  // --- 1. Resolve Data ---
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

  const allFiles = getCaseFiles(caseId);
  const messages = getCaseMessages(caseId);

  const files = useMemo(() => {
    return {
      inputs: allFiles.filter(f => f.category?.includes('INPUT') || f.category?.includes('REFERENCE')),
      designs: allFiles.filter(f => f.category?.includes('PRODUCTION_DESIGN'))
    };
  }, [allFiles]);

  if (labLoading || crmLoading || !activeCase) {
    if (labLoading || crmLoading) {
      return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>;
    }
    return (
      <div className="card">
        <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <h3>Case Not Found</h3>
          {/* FIX: Used 'navigate' to provide a way back */}
          <button className="button secondary" onClick={() => navigate('/cases')}>
            Back to Case List
          </button>
        </div>
      </div>
    );
  }

  const handleEditClick = () => setShowEditModal(true);
  const updateUnitStatus = (unitId, newStatus, holdReason = null) => {
    // Pass 'holdReason' to context function. 
    // We need to update the Context signature in the next step to handle this.
    updateCaseStatus(activeCase.id, newStatus, unitId, holdReason);
  };

  return (
    <>
      {/* --- PRINT AREA --- */}
      <div className={styles.printArea}>
        <CasePrintTicket activeCase={activeCase} />
      </div>

      {/* --- SCREEN AREA --- */}
      <div className={styles.container}>
        <CaseDetailHeader 
          activeCase={activeCase} 
          onEditClick={handleEditClick} 
        />

        <CaseDetailStepper 
          activeCase={activeCase} 
          stages={stages}
        />
        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <CaseContextCard activeCase={activeCase} />
          </div>

          <div className={styles.centerCol}>
            <CaseUnitsList 
                units={activeCase.units} 
                stages={stages}
                caseId={activeCase.id}
                updateUnitStatus={updateUnitStatus}
              />
            </div>

          <div className={styles.rightCol}>
            <CaseFilesCard files={files} caseId={activeCase.id} />
            <CaseCommunicationCard 
              messages={messages} 
              caseId={activeCase.id}
              currentUserId={user?.id}
            />
          </div>
        </div>

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