/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';

const LabContext = createContext(null);

export const LabProvider = ({ children }) => {
  const { user, activeLab, hasRole } = useAuth();

  // --- State ---
  const [cases, setCases] = useState([]);
  const [stages, setStages] = useState([]); // System Stages
  const [workflows, setWorkflows] = useState([]); // Lab Workflows
  const [caseFiles, setCaseFiles] = useState([]);
  const [caseMessages, setCaseMessages] = useState([]);
  
  const [materials, setMaterials] = useState([]);
  const [batches, setBatches] = useState([]);
  const [equipment, setEquipment] = useState([]);
  
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
          fetchedMessages,
          fetchedMaterials, 
          fetchedBatches, 
          fetchedEquipment
        ] = await Promise.all([
          MockService.cases.cases.getAll({ labId: activeLab.id }),
          MockService.cases.stages.getAll(), 
          MockService.settings.workflows.getAll({ labId: activeLab.id }),
          MockService.cases.files.getAll({ labId: activeLab.id }),
          MockService.cases.messages.getAll({ labId: activeLab.id }),
          MockService.production.inventory.getAll({ labId: activeLab.id }),
          MockService.production.batches.getAll({ labId: activeLab.id }),
          MockService.production.equipment.getAll({ labId: activeLab.id })
        ]);
        
        setCases(fetchedCases);
        setStages(fetchedStages);
        setWorkflows(fetchedWorkflows);
        setCaseFiles(fetchedFiles);
        setCaseMessages(fetchedMessages);

        setMaterials(fetchedMaterials);
        setBatches(fetchedBatches);
        setEquipment(fetchedEquipment);
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

  const getWorkflowsForCategory = useCallback((category) => {
    return workflows.filter(w => w.category === category);
  }, [workflows]);


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
      return newFile;
    } catch (err) {
      console.error("Failed to upload file", err);
      throw err;
    }
  }, [activeLab, user]);

  const createCase = useCallback(async (newCaseData) => {
    if (!activeLab) return;
    try {
      const newCase = await MockService.cases.cases.create({
        ...newCaseData,
        labId: activeLab.id,
        caseNumber: `2025-${Math.floor(Math.random() * 10000)}`,
        status: 'stage-new',
        units: (newCaseData.units || []).map((unit, idx) => ({
           id: `unit-${Date.now()}-${idx}`,
           ...unit,
           status: 'stage-new'
        })),
        dates: {
          created: new Date().toISOString(),
          received: new Date().toISOString(),
          due: newCaseData.dates?.due || null, 
          shipped: null
        },
        systemInfo: { createdBy: user?.id || 'system' }
      });

      setCases(prev => [newCase, ...prev]);
      return newCase;
    } catch (err) {
      console.error("Failed to create case", err);
      throw err;
    }
  }, [activeLab, user]);

  const updateCase = useCallback(async (caseId, updates) => {
    try {
      const updatedCase = await MockService.cases.cases.update(caseId, updates);
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      return updatedCase;
    } catch (err) {
      console.error("Failed to update case", err);
      throw err;
    }
  }, []);

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

      const derivedStatus = deriveCaseStatus(updatedUnits);
      const caseHoldReason = derivedStatus === 'stage-hold' ? holdReason : null;

      const updatedCase = await MockService.cases.cases.update(caseId, {
        units: updatedUnits,
        status: derivedStatus,
        holdReason: caseHoldReason,
        heldAtStageId: derivedStatus === 'stage-hold' ? currentCase.status : null
      });

      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
    } catch (err) {
      console.error("Failed to update status", err);
      throw err;
    }
  }, [cases, validateTransition, deriveCaseStatus]);
  
  // ============================================================
  // 2. PRODUCTION HANDLERS
  // ============================================================
  
  const consumeMaterial = useCallback(async (materialId, quantity) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) throw new Error("Material not found");
      
      if (material.stockLevel < quantity) throw new Error("Insufficient stock");

      const updatedMaterial = await MockService.production.inventory.update(materialId, {
        stockLevel: material.stockLevel - quantity
      });

      setMaterials(prev => prev.map(m => m.id === materialId ? updatedMaterial : m));
    } catch (err) {
      console.error("Failed to consume material", err);
      throw err;
    }
  }, [materials]);

  const createBatch = useCallback(async (batchData) => {
    if (!activeLab) return;
    try {
      const newBatch = await MockService.production.batches.create({
        ...batchData,
        labId: activeLab.id,
        status: 'InProgress',
        startTime: new Date().toISOString(),
        operatorId: user?.id || 'system'
      });
      setBatches(prev => [newBatch, ...prev]);
      return newBatch;
    } catch (err) {
      console.error("Failed to create batch", err);
      throw err;
    }
  }, [activeLab, user]);

  const updateEquipmentStatus = useCallback(async (equipmentId, status, notes) => {
    try {
      const eq = equipment.find(e => e.id === equipmentId);
      const updatedEq = await MockService.production.equipment.update(equipmentId, {
        status,
        maintenance: { 
          ...eq?.maintenance, 
          notes: notes || eq?.maintenance?.notes 
        }
      });
      setEquipment(prev => prev.map(e => e.id === equipmentId ? updatedEq : e));
    } catch (err) {
      console.error("Failed to update equipment", err);
      throw err;
    }
  }, [equipment]);

  // ============================================================
  // 3. WORKFLOW HANDLERS (NEW)
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

  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    cases,
    stages,
    workflows,
    materials,
    batches,
    equipment,
    loading,
    error,
    
    getCaseById,
    getCaseFiles,
    getCaseMessages,
    getWorkflowsForCategory,
    addCaseMessage,
    addCaseFile,
    createCase,
    updateCase,
    updateCaseStatus,

    consumeMaterial,
    createBatch,
    updateEquipmentStatus,
    deriveCaseStatus,

    createWorkflow, 
    updateWorkflow, 
    deleteWorkflow
  }), [
    cases, stages, workflows, materials, batches, equipment, loading, error,
    getCaseById, getCaseFiles, getCaseMessages, getWorkflowsForCategory, addCaseMessage, addCaseFile, createCase, updateCase, updateCaseStatus,
    consumeMaterial, createBatch, updateEquipmentStatus, deriveCaseStatus,
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