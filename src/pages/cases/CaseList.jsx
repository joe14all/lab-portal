import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLab, useCrm } from '../../contexts';
import SearchBar from '../../components/common/SearchBar';
import CaseListTable from '../../components/cases/CaseListTable'; 
import CaseForm from '../../components/cases/CaseForm'; // NEW IMPORT for modal
import { 
  IconBox,
  IconClose // NEW IMPORT
} from '../../layouts/components/LabIcons';
import styles from './CaseList.module.css';
// Import modal styles from CaseDetail for consistency
import detailStyles from '../cases/CaseDetail.module.css'; 


const CaseList = () => {
  const navigate = useNavigate();
  const { cases, stages, loading: labLoading, createCase } = useLab();
  const { doctors, clinics, loading: crmLoading } = useCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false); // USED NOW

  const isLoading = labLoading || crmLoading;

  // --- Data Enrichment and Filtering ---
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    
    const enriched = cases.map(c => {
      const doc = doctors.find(d => d.id === c.doctorId);
      const clinic = clinics.find(cl => cl.id === c.clinicId);
      const stage = stages.find(s => s.id === c.status);

      // Use 'units' as the source of truth if available, otherwise fallback to 'items'
      const units = c.units || c.items || []; 
      
      return {
        ...c,
        doctorName: doc ? `${doc.firstName} ${doc.lastName}` : 'Unknown Doctor',
        clinicName: clinic ? clinic.name : 'Unknown Clinic',
        stageLabel: stage ? stage.label : c.status,
        stageColor: stage ? stage.color : 'gray',
        units: units // Pass enriched units array to the table component
      };
    });

    return enriched.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        item.caseNumber.toLowerCase().includes(searchLower) ||
        item.patient.name.toLowerCase().includes(searchLower) ||
        item.doctorName.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      
      // Filter out aggregate status (stage-production) unless specifically filtered for it
      const matchesStageFilter = item.status !== 'stage-production' || statusFilter === 'stage-production' || statusFilter === 'All';

      return matchesSearch && matchesStatus && matchesStageFilter;
    });
  }, [cases, doctors, clinics, stages, searchQuery, statusFilter]);

  // --- Handlers ---
  const handleRowClick = useCallback((caseId) => {
    navigate(`/cases/${caseId}`);
  }, [navigate]);
  
  const handleCreateCase = useCallback(() => {
    setShowCreateModal(true); // USE 1: Open Modal
  }, []);
  
  const handleNewCaseSubmit = useCallback(async (newCaseData) => { // USE 2: Used as onSubmit handler
    try {
        const newCase = await createCase(newCaseData);
        console.log("New Case Created:", newCase);
        setShowCreateModal(false);
        navigate(`/cases/${newCase.id}`); 
    } catch (error) {
        console.error("Failed to create new case:", error);
    }
  }, [createCase, navigate]);


  // --- Render ---
  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading case list...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Case Management</h1>
          <p className={styles.subtitle}>
            {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'} found
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className="button primary" onClick={handleCreateCase}>
            + New Case
          </button>
        </div>
      </header>

      {/* FILTER BAR */}
      <section className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <SearchBar 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case #, patient, or doctor..."
          />
        </div>

        <div className={styles.filterGroup}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="All">All Statuses</option>
            {stages.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* TABLE/LIST */}
      <div className={styles.tableCard}>
        {filteredCases.length > 0 ? (
          <CaseListTable 
            cases={filteredCases} 
            onRowClick={handleRowClick} 
          />
        ) : (
          <div className={styles.emptyState}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <IconBox width="48" height="48" style={{ opacity: 0.2 }} />
              <span>No cases match your filters.</span>
              <button className="button secondary" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}>Clear Filters</button>
            </div>
          </div>
        )}
      </div>
      
      {/* === NEW CASE MODAL === */}
      {showCreateModal && (
        <div className={detailStyles.modalBackdrop}>
          <div className={detailStyles.modalContent}>
            <div className={detailStyles.modalHeader}>
                <h3>Create New Case</h3>
                <button className="icon-button" onClick={() => setShowCreateModal(false)}>
                    <IconClose width="24" height="24" />
                </button>
            </div>
            {/* CaseForm handles the creation data input */}
            <CaseForm
              // In creation mode, initialData is null
              initialData={null}
              onSubmit={handleNewCaseSubmit}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseList;