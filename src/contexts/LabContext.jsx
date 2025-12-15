/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { LabEventBus, EVENTS } from '../utils/eventBus';

const LabContext = createContext(null);

export const LabProvider = ({ children }) => {
  const { user, activeLab, hasRole } = useAuth();
  const { addToast } = useToast();

  // --- State ---
  const [cases, setCases] = useState([]);
  const [stages, setStages] = useState([]); // System Stages
  const [workflows, setWorkflows] = useState([]); // Lab Workflows
  const [caseFiles, setCaseFiles] = useState([]);
  const [caseMessages, setCaseMessages] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Initialize Data ---
  useEffect(() => {
    const initData = async () => {
      if (!activeLab?.id) return;

      setLoading(true);
      try {
        const [
          fetchedCases, 
          fetchedStages,
          fetchedWorkflows, 
          fetchedFiles, 
          fetchedMessages
        ] = await Promise.all([
          MockService.cases.cases.getAll({ labId: activeLab.id }),
          MockService.cases.stages.getAll(), 
          MockService.settings.workflows.getAll({ labId: activeLab.id }),
          MockService.cases.files.getAll({ labId: activeLab.id }),
          MockService.cases.messages.getAll({ labId: activeLab.id })
        ]);
        
        setCases(fetchedCases);
        setStages(fetchedStages);
        setWorkflows(fetchedWorkflows);
        setCaseFiles(fetchedFiles);
        setCaseMessages(fetchedMessages);
        setError(null);
      } catch (err) {
        console.error("Failed to load Lab data", err);
        setError("Failed to load Lab data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [activeLab]);

  // Listen for case status changes from production and logistics
  useEffect(() => {
    const handleCaseStatusChange = async (event) => {
      if (!activeLab?.id) return;
      try {
        // Refresh all cases to get the latest status
        const fetchedCases = await MockService.cases.cases.getAll({ labId: activeLab.id });
        setCases(fetchedCases);
      } catch (err) {
        console.error("Failed to refresh cases after status change", err);
      }
    };

    // Subscribe to case status change events
    const unsubscribe = LabEventBus.subscribe(EVENTS.CASE_STATUS_CHANGED, handleCaseStatusChange);
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [activeLab]);

  // ============================================================
  // 0. UTILITY HELPERS
  // ============================================================

  const deriveCaseStatus = useCallback((units = []) => {
    if (!units || units.length === 0) return 'stage-new';
    if (units.some(u => u.status === 'stage-hold')) return 'stage-hold';
    const allShipped = units.every(u => u.status === 'stage-shipped' || u.status === 'stage-delivered');
    if (allShipped) return 'stage-shipped';

    const activeUnitStages = units
      .map(u => stages.find(s => s.id === u.status))
      .filter(Boolean);

    if (activeUnitStages.length === 0) return 'stage-new';
    activeUnitStages.sort((a, b) => a.order - b.order);
    return activeUnitStages[0].id;
  }, [stages]); 

  const validateTransition = useCallback((currentStage, nextStage) => {
    if (hasRole('role-driver') && nextStage !== 'stage-shipped' && nextStage !== 'stage-delivered') {
       throw new Error("Drivers can only update Shipping/Delivery status.");
    }
    return true;
  }, [hasRole]);

  /**
   * Point 3: Prevent shipment if any unit is on hold
   * Business Rule: Cases with held units cannot be shipped
   * Prevents incomplete cases from being sent to clinics
   * 
   * @param {Array} units - Case units to check
   * @param {string} targetStage - Stage attempting to transition to
   * @throws {Error} If attempting to ship case with held units
   */
  const preventShipmentIfOnHold = useCallback((units = [], targetStage) => {
    // Only validate when attempting to ship
    const isShippingStage = targetStage === 'stage-shipping' || targetStage === 'stage-shipped';
    if (!isShippingStage) return true;

    // Check if any unit is on hold
    const heldUnits = units.filter(u => u.status === 'stage-hold');
    
    if (heldUnits.length > 0) {
      const heldTeeth = heldUnits
        .map(u => u.tooth ? `#${u.tooth}` : u.id)
        .join(', ');
      
      throw new Error(
        `Cannot ship case: ${heldUnits.length} unit(s) on hold (${heldTeeth}). ` +
        `Resolve hold issues before shipping.`
      );
    }

    return true;
  }, []);

  const getWorkflowsForCategory = useCallback((category) => {
    return workflows.filter(w => w.category === category);
  }, [workflows]);

  /**
   * Check for duplicate cases based on patient name, doctor, and date
   * @param {Object} caseData - Case data to check
   * @returns {Array} - Array of potential duplicates
   */
  const checkDuplicateCase = useCallback((caseData) => {
    const patientName = caseData.patient?.name || caseData.patientName;
    const doctorId = caseData.doctorId;
    const receivedDate = caseData.dates?.received || caseData.receivedDate;
    
    if (!patientName || !doctorId || !receivedDate) return [];

    const sameDayStart = new Date(receivedDate);
    sameDayStart.setHours(0, 0, 0, 0);
    const sameDayEnd = new Date(sameDayStart);
    sameDayEnd.setHours(23, 59, 59, 999);

    return cases.filter(c => {
      const caseDate = new Date(c.dates?.received || c.createdAt);
      return (
        c.patient.name.toLowerCase() === patientName.toLowerCase() &&
        c.doctorId === doctorId &&
        caseDate >= sameDayStart &&
        caseDate <= sameDayEnd
      );
    });
  }, [cases]);

  /**
   * Calculate estimated price for case units using productId catalog linkage
   * Replaces fragile string matching with direct product lookup
   * @param {Array} units - Case units with productId references
   * @param {string} priceListId - Price list to use for lookup
   * @returns {number} Total estimated price
   */
  const calculateCasePrice = useCallback(async (units = [], priceListId) => {
    if (!units || units.length === 0) return 0;
    if (!priceListId) return 0;

    try {
      // Fetch price list from CRM service
      const priceList = await MockService.crm.priceLists.getById(priceListId);
      if (!priceList) return 0;

      let total = 0;
      
      for (const unit of units) {
        // Use productId for lookup (Point 2 implementation)
        if (unit.productId) {
          const priceItem = priceList.items?.find(item => item.productId === unit.productId);
          if (priceItem) {
            total += priceItem.price;
          }
        }
      }

      return total;
    } catch (err) {
      console.error("Failed to calculate case price", err);
      return 0;
    }
  }, []);


  // ============================================================
  // 1. CASE MANAGEMENT HANDLERS
  // ============================================================

  const getCaseById = useCallback((caseId) => {
    return cases.find(c => c.id === caseId);
  }, [cases]);
  
  const getCaseFiles = useCallback((caseId) => {
    return caseFiles.filter(f => f.caseId === caseId);
  }, [caseFiles]);

  const getCaseMessages = useCallback((caseId) => {
    return caseMessages
      .filter(m => m.caseId === caseId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [caseMessages]);

  const addCaseMessage = useCallback(async (caseId, { content, isInternal }) => {
    if (!activeLab) return;
    try {
      const senderName = user?.profile 
        ? `${user.profile.firstName} ${user.profile.lastName}`.trim() 
        : user?.email || 'Unknown';

      const newMessage = await MockService.cases.messages.create({
        labId: activeLab.id,
        caseId,
        senderId: user?.id || 'system',
        senderName,
        senderRole: hasRole('role-client') ? 'Client' : 'Lab',
        content,
        isInternal: !!isInternal,
        readAt: null
      });

      setCaseMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err) {
      console.error("Failed to send message", err);
      throw err;
    }
  }, [activeLab, user, hasRole]);

  const addCaseFile = useCallback(async (caseId, fileObj, category) => {
    if (!activeLab) return;
    try {
      const newFile = await MockService.cases.files.create({
        labId: activeLab.id,
        caseId,
        uploaderId: user?.id || 'system',
        category: category, 
        subCategory: category === 'PRODUCTION_DESIGN' ? 'CAM_OUTPUT' : 'User Upload',
        fileType: fileObj.name.split('.').pop().toUpperCase(),
        fileName: fileObj.name,
        size: `${(fileObj.size / (1024 * 1024)).toFixed(2)} MB`,
        url: URL.createObjectURL(fileObj), 
        isLatest: true, 
        version: 1
      });

      setCaseFiles(prev => [...prev, newFile]);
      
      // Auto-advance to milling stage for design uploads
      if (category === 'PRODUCTION_DESIGN') {
        const currentCase = cases.find(c => c.id === caseId);
        if (currentCase && currentCase.units) {
          // Check if any units are crown, bridge, or implant types
          const shouldAutoAdvance = currentCase.units.some(unit => {
            const type = (unit.type || '').toLowerCase();
            return type.includes('crown') || 
                   type.includes('bridge') || 
                   type.includes('implant crown') || 
                   type.includes('implant bridge');
          });

          // Only auto-advance if currently in design stage
          if (shouldAutoAdvance && currentCase.status === 'stage-design') {
            try {
              // Update all units to milling stage
              const updatedUnits = currentCase.units.map(u => ({
                ...u,
                status: 'stage-milling'
              }));

              await MockService.cases.cases.update(caseId, {
                units: updatedUnits,
                status: 'stage-milling',
                version: currentCase.version
              });

              // Update local state
              setCases(prev => prev.map(c => 
                c.id === caseId 
                  ? { ...c, units: updatedUnits, status: 'stage-milling' }
                  : c
              ));
            } catch (err) {
              console.error("Failed to auto-advance to milling stage", err);
              // Don't throw - file upload was successful
            }
          }
        }
      }
      
      return newFile;
    } catch (err) {
      console.error("Failed to upload file", err);
      throw err;
    }
  }, [activeLab, user, cases]);

  /**
   * Bulk update status for multiple cases
   * @param {Array<string>} caseIds - Array of case IDs to update
   * @param {string} newStage - New stage to apply
   * @returns {Promise<Object>} - Results with success/error counts
   */
  const bulkUpdateCaseStatus = useCallback(async (caseIds, newStage) => {
    if (!caseIds || caseIds.length === 0) {
      throw new Error("No cases selected for bulk update");
    }

    const results = [];
    const errors = [];

    for (const caseId of caseIds) {
      try {
        const currentCase = cases.find(c => c.id === caseId);
        if (!currentCase) {
          errors.push({ caseId, error: "Case not found" });
          continue;
        }

        // Validate business rules
        preventShipmentIfOnHold(currentCase.units, newStage);
        validateTransition(currentCase.status, newStage);

        // Update all units to new stage
        const updatedUnits = currentCase.units.map(u => ({
          ...u,
          status: newStage
        }));

        const updatedCase = await MockService.cases.cases.update(caseId, {
          units: updatedUnits,
          status: newStage,
          version: currentCase.version
        });

        results.push(updatedCase);
      } catch (err) {
        errors.push({ caseId, error: err.message });
      }
    }

    // Update state with successful updates
    if (results.length > 0) {
      setCases(prev => prev.map(c => {
        const updated = results.find(r => r.id === c.id);
        return updated || c;
      }));
    }

    return { 
      success: results, 
      errors,
      total: caseIds.length 
    };
  }, [cases, preventShipmentIfOnHold, validateTransition]);

  const createCase = useCallback(async (newCaseData) => {
    if (!activeLab) return;
    try {
      // Prepare units with IDs
      const preparedUnits = (newCaseData.units || []).map((unit, idx) => ({
        id: `unit-${Date.now()}-${idx}`,
        ...unit,
        status: 'stage-new'
      }));

      // Calculate estimated total using productId lookups (Point 2)
      const priceListId = newCaseData.financial?.priceListId || 'pl-standard-2025';
      const estimatedTotal = await calculateCasePrice(preparedUnits, priceListId);

      const newCase = await MockService.cases.cases.create({
        ...newCaseData,
        labId: activeLab.id,
        caseNumber: `2025-${Math.floor(Math.random() * 10000)}`,
        status: 'stage-new',
        version: 0, // Initialize version for optimistic locking
        units: preparedUnits,
        dates: {
          created: new Date().toISOString(),
          received: new Date().toISOString(),
          due: newCaseData.dates?.due || null, 
          shipped: null
        },
        financial: {
          ...newCaseData.financial,
          priceListId,
          estimatedTotal, // Auto-calculated from product catalog
          currency: newCaseData.financial?.currency || 'USD',
          invoiceId: null
        },
        systemInfo: { createdBy: user?.id || 'system' }
      });

      setCases(prev => [newCase, ...prev]);
      return newCase;
    } catch (err) {
      console.error("Failed to create case", err);
      throw err;
    }
  }, [activeLab, user, calculateCasePrice]);

  const updateCase = useCallback(async (caseId, updates) => {
    try {
      const currentCase = cases.find(c => c.id === caseId);
      if (!currentCase) throw new Error("Case not found");

      // Include current version for optimistic locking
      const updatesWithVersion = {
        ...updates,
        version: currentCase.version
      };

      const updatedCase = await MockService.cases.cases.update(caseId, updatesWithVersion);
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      return updatedCase;
    } catch (err) {
      // Handle concurrency conflicts
      if (err.name === 'ConcurrencyError') {
        addToast(
          'This case was modified by another user. Please refresh and try again.',
          'error',
          5000
        );
        // Refresh the case from server
        try {
          const refreshedCase = await MockService.cases.cases.getById(caseId);
          setCases(prev => prev.map(c => c.id === caseId ? refreshedCase : c));
        } catch (refreshErr) {
          console.error("Failed to refresh case after conflict", refreshErr);
        }
      }
      console.error("Failed to update case", err);
      throw err;
    }
  }, [cases, addToast]);

  const updateCaseStatus = useCallback(async (caseId, newStageId, unitId = null, holdReason = null) => {
    try {
      const currentCase = cases.find(c => c.id === caseId);
      if (!currentCase) throw new Error("Case not found");

      validateTransition(currentCase.status, newStageId);

      let updatedUnits = currentCase.units || [];
      
      if (unitId) {
        updatedUnits = updatedUnits.map(u => {
          if (u.id === unitId) {
            return { 
              ...u, 
              status: newStageId,
              holdReason: newStageId === 'stage-hold' ? holdReason : null 
            };
          }
          return u;
        });
      } else {
        // Bulk update
        updatedUnits = updatedUnits.map(u => ({ 
          ...u, 
          status: newStageId,
          holdReason: newStageId === 'stage-hold' ? holdReason : null
        }));
      }

      // Point 3: Prevent shipment if any unit is on hold
      preventShipmentIfOnHold(updatedUnits, newStageId);

      const derivedStatus = deriveCaseStatus(updatedUnits);
      const caseHoldReason = derivedStatus === 'stage-hold' ? holdReason : null;

      // Include current version for optimistic locking
      const updatedCase = await MockService.cases.cases.update(caseId, {
        units: updatedUnits,
        status: derivedStatus,
        holdReason: caseHoldReason,
        heldAtStageId: derivedStatus === 'stage-hold' ? currentCase.status : null,
        version: currentCase.version // Pass current version
      });

      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
    } catch (err) {
      // Handle concurrency conflicts
      if (err.name === 'ConcurrencyError') {
        addToast(
          'This case was modified by another user. The page will refresh with the latest data.',
          'error',
          5000
        );
        // Refresh the case from server
        try {
          const refreshedCase = await MockService.cases.cases.getById(caseId);
          setCases(prev => prev.map(c => c.id === caseId ? refreshedCase : c));
        } catch (refreshErr) {
          console.error("Failed to refresh case after conflict", refreshErr);
        }
      }
      console.error("Failed to update status", err);
      throw err;
    }
  }, [cases, validateTransition, preventShipmentIfOnHold, deriveCaseStatus, addToast]);
  
  // ============================================================
  // 3. WORKFLOW HANDLERS
  // ============================================================

  const createWorkflow = useCallback(async (workflowData) => {
    if (!activeLab) return;
    try {
      const newWf = await MockService.settings.workflows.create({
        ...workflowData,
        labId: activeLab.id
      });
      setWorkflows(prev => [...prev, newWf]);
      return newWf;
    } catch (err) {
      console.error("Failed to create workflow", err);
      throw err;
    }
  }, [activeLab]);

  const updateWorkflow = useCallback(async (id, updates) => {
    try {
      const updatedWf = await MockService.settings.workflows.update(id, updates);
      setWorkflows(prev => prev.map(w => w.id === id ? updatedWf : w));
      return updatedWf;
    } catch (err) {
      console.error("Failed to update workflow", err);
      throw err;
    }
  }, []);

  const deleteWorkflow = useCallback(async (id) => {
    try {
      await MockService.settings.workflows.delete(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error("Failed to delete workflow", err);
      throw err;
    }
  }, []);

  const refreshCases = useCallback(async () => {
    if (!activeLab?.id) return;
    try {
      const fetchedCases = await MockService.cases.cases.getAll({ labId: activeLab.id });
      setCases(fetchedCases);
    } catch (err) {
      console.error("Failed to refresh cases", err);
      throw err;
    }
  }, [activeLab]);

  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    cases,
    stages,
    workflows,
    loading,
    error,
    
    getCaseById,
    getCaseFiles,
    getCaseMessages,
    getWorkflowsForCategory,
    calculateCasePrice,
    checkDuplicateCase,
    bulkUpdateCaseStatus,
    addCaseMessage,
    addCaseFile,
    createCase,
    updateCase,
    updateCaseStatus,
    deriveCaseStatus,
    refreshCases,

    createWorkflow, 
    updateWorkflow, 
    deleteWorkflow
  }), [
    cases, stages, workflows, loading, error,
    getCaseById, getCaseFiles, getCaseMessages, getWorkflowsForCategory, calculateCasePrice, 
    checkDuplicateCase, bulkUpdateCaseStatus,
    addCaseMessage, addCaseFile, createCase, updateCase, updateCaseStatus,
    deriveCaseStatus, refreshCases,
    createWorkflow, updateWorkflow, deleteWorkflow
  ]);

  return (
    <LabContext.Provider value={value}>
      {children}
    </LabContext.Provider>
  );
};

export const useLab = () => {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
};