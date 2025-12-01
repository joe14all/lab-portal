import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLab, useCrm } from '../../contexts';
import SearchBar from '../../components/common/SearchBar';
import CaseListTable from '../../components/cases/CaseListTable'; 
import CaseForm from '../../components/cases/CaseForm'; 
import CasePrintTicket from '../../components/cases/detail/CasePrintTicket'; 
import { 
  IconBox,
  IconClose,
  IconPrinter 
} from '../../layouts/components/LabIcons';
import styles from './CaseList.module.css';
import detailStyles from '../cases/CaseDetail.module.css'; 

const CaseList = () => {
  const navigate = useNavigate();
  const { cases, stages, loading: labLoading, createCase, bulkUpdateCaseStatus, checkDuplicateCase } = useLab();
  const { doctors, clinics, loading: crmLoading } = useCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const isLoading = labLoading || crmLoading;

  // Saved filter presets
  const FILTER_PRESETS = {
    MY_RUSH: {
      label: 'My Rush Cases',
      filter: (c) => {
        const dueDate = new Date(c.dates?.due);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 2 && c.status !== 'stage-shipped' && c.status !== 'stage-delivered';
      }
    },
    ON_HOLD: {
      label: 'On Hold This Week',
      filter: (c) => {
        if (c.status !== 'stage-hold') return false;
        const heldDate = new Date(c.updatedAt || c.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return heldDate >= weekAgo;
      }
    },
    READY_TO_SHIP: {
      label: 'Ready to Ship',
      filter: (c) => c.status === 'stage-ready-to-ship'
    },
    IN_PRODUCTION: {
      label: 'In Production',
      filter: (c) => ['stage-design', 'stage-milling', 'stage-finishing'].includes(c.status)
    }
  };

  const filteredCases = useMemo(() => {
    if (!cases) return [];
    
    // 1. Enrich Data
    const enriched = cases.map(c => {
      const doc = doctors.find(d => d.id === c.doctorId);
      const clinic = clinics.find(cl => cl.id === c.clinicId);
      const stage = stages.find(s => s.id === c.status);
      const units = c.units || c.items || []; 
      
      return {
        ...c,
        doctorName: doc ? `${doc.firstName} ${doc.lastName}` : 'Unknown Doctor',
        clinicName: clinic ? clinic.name : 'Unknown Clinic',
        stageLabel: stage ? stage.label : c.status,
        stageColor: stage ? stage.color : 'gray',
        units: units 
      };
    });

    // 2. Filter
    return enriched.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        item.caseNumber.toLowerCase().includes(searchLower) ||
        item.patient.name.toLowerCase().includes(searchLower) ||
        item.doctorName.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesStageFilter = item.status !== 'stage-production' || statusFilter === 'stage-production' || statusFilter === 'All';
      const matchesPreset = !activePreset || FILTER_PRESETS[activePreset].filter(item);

      return matchesSearch && matchesStatus && matchesStageFilter && matchesPreset;
    });
  }, [cases, doctors, clinics, stages, searchQuery, statusFilter, activePreset]);

  const selectedCases = useMemo(() => {
    return filteredCases.filter(c => selectedIds.includes(c.id));
  }, [filteredCases, selectedIds]);

  // --- Handlers ---
  const handleRowClick = useCallback((caseId) => {
    navigate(`/cases/${caseId}`);
  }, [navigate]);
  
  const handleCreateCase = useCallback(() => {
    setShowCreateModal(true);
  }, []);
  
  const handleNewCaseSubmit = useCallback(async (newCaseData) => {
    try {
        // Check for duplicates
        const duplicates = checkDuplicateCase(newCaseData);
        
        if (duplicates.length > 0) {
          const confirmCreate = window.confirm(
            `Warning: Found ${duplicates.length} similar case(s) for this patient and doctor today.\n\n` +
            `Existing case(s): ${duplicates.map(d => d.caseNumber).join(', ')}\n\n` +
            `Do you want to create a new case anyway?`
          );
          
          if (!confirmCreate) {
            return; // Cancel creation
          }
        }

        const newCase = await createCase(newCaseData);
        setShowCreateModal(false);
        navigate(`/cases/${newCase.id}`); 
    } catch (error) {
        console.error("Failed to create new case:", error);
    }
  }, [createCase, navigate, checkDuplicateCase]);

  const handleBatchPrint = () => {
    window.print();
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkStatusUpdate = () => {
    setShowBulkStatusModal(true);
  };

  const handleBulkStatusSubmit = async () => {
    if (!bulkTargetStatus) return;
    
    setIsBulkUpdating(true);
    try {
      const result = await bulkUpdateCaseStatus(selectedIds, bulkTargetStatus);
      
      if (result.errors.length > 0) {
        alert(`Updated ${result.success.length}/${result.total} cases. ${result.errors.length} failed.`);
      } else {
        alert(`Successfully updated ${result.success.length} cases to ${bulkTargetStatus}`);
      }
      
      setSelectedIds([]);
      setShowBulkStatusModal(false);
      setBulkTargetStatus('');
    } catch (error) {
      alert(`Bulk update failed: ${error.message}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handlePresetClick = (presetKey) => {
    setActivePreset(activePreset === presetKey ? null : presetKey);
  };

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.header}>Loading case list...</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      
      {/* --- BATCH PRINT RENDERER --- */}
      {/* Always rendered when selection exists, but hidden via CSS until print */}
      {selectedCases.length > 0 && (
        <div className={styles.printBatchWrapper}>
          {selectedCases.map(c => (
            <CasePrintTicket key={c.id} activeCase={c} />
          ))}
        </div>
      )}

      {/* --- HEADER --- */}
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

      {/* --- FILTER / BATCH BAR --- */}
      {selectedIds.length > 0 ? (
        <section className={`${styles.filterBar} ${styles.batchBar}`}>
          <div className={styles.batchInfo}>
            <span className={styles.batchCount}>{selectedIds.length} Selected</span>
            <span className={styles.batchHint}>Select actions to apply to all</span>
          </div>
          
          <div className={styles.batchActions}>
            <button className="button secondary" onClick={handleBulkStatusUpdate}>
              Bulk Status Update
            </button>
            <button className="button secondary" onClick={handleBatchPrint}>
              <IconPrinter width="16" height="16" style={{marginRight: '0.5rem'}}/> 
              Print Tickets
            </button>
            <button className="button text" onClick={handleClearSelection}>
              Cancel
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <SearchBar 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case #, patient, or doctor..."
            />
          </div>

          {/* Filter Presets */}
          <div className={styles.presetButtons}>
            {Object.entries(FILTER_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className={`${styles.presetBtn} ${activePreset === key ? styles.presetActive : ''}`}
                onClick={() => handlePresetClick(key)}
              >
                {preset.label}
              </button>
            ))}
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
      )}

      {/* --- TABLE --- */}
      <div className={styles.tableCard}>
        {filteredCases.length > 0 ? (
          <CaseListTable 
            cases={filteredCases} 
            onRowClick={handleRowClick} 
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
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
      
      {/* --- MODAL --- */}
      {showCreateModal && (
        <div className={detailStyles.modalBackdrop}>
          <div className={detailStyles.modalContent}>
            <div className={detailStyles.modalHeader}>
                <h3>Create New Case</h3>
                <button className="icon-button" onClick={() => setShowCreateModal(false)}>
                    <IconClose width="24" height="24" />
                </button>
            </div>
            <CaseForm
              initialData={null}
              onSubmit={handleNewCaseSubmit}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {showBulkStatusModal && (
        <div className={detailStyles.modalBackdrop}>
          <div className={detailStyles.modalContent} style={{maxWidth: '500px'}}>
            <div className={detailStyles.modalHeader}>
              <h3>Bulk Status Update</h3>
              <button className="icon-button" onClick={() => setShowBulkStatusModal(false)}>
                <IconClose width="24" height="24" />
              </button>
            </div>
            <div style={{padding: '1.5rem'}}>
              <p style={{marginBottom: '1rem'}}>
                Update {selectedIds.length} selected case{selectedIds.length > 1 ? 's' : ''} to:
              </p>
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value)}
                className={styles.selectInput}
                style={{width: '100%', marginBottom: '1.5rem'}}
              >
                <option value="">Select Status...</option>
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
              <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'flex-end'}}>
                <button 
                  className="button secondary" 
                  onClick={() => setShowBulkStatusModal(false)}
                  disabled={isBulkUpdating}
                >
                  Cancel
                </button>
                <button 
                  className="button primary" 
                  onClick={handleBulkStatusSubmit}
                  disabled={!bulkTargetStatus || isBulkUpdating}
                >
                  {isBulkUpdating ? 'Updating...' : 'Update Cases'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseList;