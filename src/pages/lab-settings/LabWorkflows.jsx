import React, { useState, useMemo } from 'react';
import { useLab, useToast } from '../../contexts';
import WorkflowFormModal from '../../components/lab-settings/workflows/WorkflowFormModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { 
  IconLayers, 
  IconChevronRight, 
  IconSearch 
} from '../../layouts/components/LabIcons';
import styles from './LabWorkflows.module.css';

const LabWorkflows = () => {
  const { workflows, stages, createWorkflow, updateWorkflow, deleteWorkflow } = useLab();
  const { addToast } = useToast();

  const [filterCat, setFilterCat] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modalState, setModalState] = useState({ isOpen: false, data: null });
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null, name: '' });

  // --- 1. Filter Data ---
  const filteredWorkflows = useMemo(() => {
    return workflows.filter(w => {
      const matchesCat = filterCat === 'All' || w.category === filterCat;
      const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [workflows, filterCat, searchTerm]);

  // --- 2. Group Data by Category ---
  // Returns: { "Crown & Bridge": [wf1, wf2], "Implants": [wf3] }
  const groupedWorkflows = useMemo(() => {
    // Grouping
    const groups = filteredWorkflows.reduce((acc, wf) => {
      const cat = wf.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(wf);
      return acc;
    }, {});

    // Sort Keys Alphabetically for display consistency
    return Object.keys(groups).sort().reduce((obj, key) => { 
      obj[key] = groups[key]; 
      return obj;
    }, {});
  }, [filteredWorkflows]);

  // --- 3. Available Categories for Dropdown ---
  const categories = useMemo(() => {
    const cats = new Set(workflows.map(w => w.category));
    return ['All', ...Array.from(cats).sort()];
  }, [workflows]);

  // --- Handlers ---
  const handleSave = async (formData) => {
    try {
      if (modalState.data) {
        await updateWorkflow(modalState.data.id, formData);
        addToast("Workflow updated successfully", "success");
      } else {
        await createWorkflow(formData);
        addToast("Workflow created successfully", "success");
      }
      setModalState({ isOpen: false, data: null });
    } catch (err) {
      addToast("Failed to save workflow", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirmState.id) return;
    try {
      await deleteWorkflow(confirmState.id);
      addToast("Workflow deleted", "success");
      setConfirmState({ isOpen: false, id: null, name: '' });
      setModalState({ isOpen: false, data: null });
    } catch (err) {
      addToast("Failed to delete workflow", "error");
    }
  };

  const openDeleteConfirm = () => {
    if (!modalState.data) return;
    setConfirmState({
      isOpen: true,
      id: modalState.data.id,
      name: modalState.data.name
    });
  };

  // --- Render Card Helper ---
  const renderCard = (wf) => (
    <div key={wf.id} className={styles.workflowCard}>
      {wf.isDefault && <div className={styles.defaultBadge}>Default</div>}
      
      <div className={styles.cardHeader}>
        <span className={styles.wfName}>{wf.name}</span>
        <p className={styles.wfDesc}>{wf.description || 'No description provided.'}</p>
      </div>

      <div className={styles.flowVis}>
        {wf.stages.slice(0, 8).map((sid, idx) => (
          <React.Fragment key={idx}>
            <div 
              className={styles.stepDot} 
              title={stages.find(s => s.id === sid)?.label} 
              style={{ 
                backgroundColor: idx === 0 ? 'var(--success-500)' : idx === wf.stages.length -1 ? 'var(--primary)' : ''
              }}
            />
            {idx < Math.min(wf.stages.length, 8) - 1 && <span className={styles.stepArrow}>›</span>}
          </React.Fragment>
        ))}
        {wf.stages.length > 8 && <span style={{fontSize:'0.7rem', color:'var(--text-secondary)'}}>+{wf.stages.length - 8}</span>}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.stepCount}>
          <IconLayers width="14" style={{verticalAlign:'middle', marginRight:'4px'}} />
          {wf.stages.length} Steps
        </span>
        <button 
          className={styles.editBtn}
          onClick={() => setModalState({ isOpen: true, data: wf })}
        >
          Configure
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2>Workflow Configuration</h2>
          <p>Define production steps for different product categories.</p>
        </div>
        <button 
          className="button primary" 
          onClick={() => setModalState({ isOpen: true, data: null })}
        >
          + New Workflow
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <IconSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search workflows..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category:</span>
          <select 
            className={styles.filterSelect}
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {Object.keys(groupedWorkflows).length > 0 ? (
          Object.entries(groupedWorkflows).map(([category, items]) => (
            <div key={category} className={styles.categorySection}>
              {/* Only show headers if we are viewing "All" to provide structure */}
              {filterCat === 'All' && (
                <div className={styles.catHeader}>
                  {category}
                  <span className={styles.catCount}>{items.length}</span>
                </div>
              )}
              
              <div className={styles.grid}>
                {items.map(renderCard)}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            No workflows found matching your criteria.
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkflowFormModal 
        isOpen={modalState.isOpen}
        initialData={modalState.data}
        allStages={stages}
        onClose={() => setModalState({ isOpen: false, data: null })}
        onSubmit={handleSave}
        isDeleting={modalState.data ? openDeleteConfirm : null}
      />

      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: null, name: '' })}
        onConfirm={handleDelete}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${confirmState.name}"? This may affect existing cases using this workflow.`}
      />

    </div>
  );
};

export default LabWorkflows;