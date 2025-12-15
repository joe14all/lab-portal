import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLab, useAuth, useCrm, useToast } from '../../contexts'; 
import CaseForm from '../../components/cases/CaseForm'; 
import { IconClose } from '../../layouts/components/LabIcons';
import styles from './CaseDetail.module.css';

import CaseDetailHeader from '../../components/cases/detail/CaseDetailHeader';
import CaseDetailStepper from '../../components/cases/detail/CaseDetailStepper';
import CaseContextCard from '../../components/cases/detail/CaseContextCard';
import CaseUnitsList from '../../components/cases/detail/CaseUnitsList';
import PrescriptionUnitsView from '../../components/cases/detail/PrescriptionUnitsView';
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
  const { addToast } = useToast();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState('prescription'); // 'prescription' | 'list'

  // --- 1. Resolve Data (must come before callbacks that use it) ---
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

  const allFiles = useMemo(() => getCaseFiles(caseId), [getCaseFiles, caseId]);
  const messages = useMemo(() => getCaseMessages(caseId), [getCaseMessages, caseId]);

  const files = useMemo(() => {
    return {
      inputs: allFiles.filter(f => f.category?.includes('INPUT') || f.category?.includes('REFERENCE')),
      designs: allFiles.filter(f => f.category?.includes('PRODUCTION_DESIGN'))
    };
  }, [allFiles]);

  /**
   * Handle case edit submission with optimistic locking
   * If a concurrency error occurs, LabContext will:
   * 1. Show a toast notification to the user
   * 2. Automatically refresh the case with latest data
   * 3. User can retry the operation with fresh data
   */
  const handleCaseEditSubmit = useCallback(async (updates) => {
    try {
      // FIX: Removed unused 'result' variable assignment
      await updateCase(caseId, updates);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to save case updates:', error);
      // Concurrency errors are handled in LabContext with toast notifications
      // Keep modal open so user can retry with refreshed data
    }
  }, [caseId, updateCase]);

  /**
   * Update unit status with error handling for Point 3 business rule
   * Catches shipment prevention errors and displays user-friendly toast
   */
  const updateUnitStatus = useCallback(async (unitId, newStatus, holdReason = null) => {
    if (!activeCase) return;
    try {
      await updateCaseStatus(activeCase.id, newStatus, unitId, holdReason);
    } catch (error) {
      // Point 3: Show user-friendly error when shipment blocked due to held units
      if (error.message && error.message.includes('Cannot ship case')) {
        addToast(error.message, 'error', 6000);
      } else {
        addToast('Failed to update case status', 'error', 4000);
      }
      console.error('Failed to update unit status:', error);
    }
  }, [activeCase, updateCaseStatus, addToast]);

  const handleEditClick = useCallback(() => setShowEditModal(true), []);


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
            {/* View Toggle */}
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewToggleBtn} ${viewMode === 'prescription' ? styles.active : ''}`}
                onClick={() => setViewMode('prescription')}
              >
                📋 Prescription View
              </button>
              <button
                className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
              >
                📝 List View
              </button>
            </div>

            {/* Conditional Rendering */}
            {viewMode === 'prescription' ? (
              <PrescriptionUnitsView 
                units={activeCase.units}
                stages={stages}
                caseId={activeCase.id}
                updateUnitStatus={updateUnitStatus}
                onUnitClick={(unit) => {
                  // Open unit detail or edit modal
                  console.log('Unit clicked:', unit);
                }}
              />
            ) : (
              <CaseUnitsList 
                units={activeCase.units} 
                stages={stages}
                caseId={activeCase.id}
                updateUnitStatus={updateUnitStatus}
              />
            )}
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
              <div className={styles.modalBody}>
                <CaseForm
                  initialData={activeCase}
                  onSubmit={handleCaseEditSubmit}
                  onCancel={() => setShowEditModal(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CaseDetail;