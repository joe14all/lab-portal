/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

// --- Mock Data Imports ---
import activeCasesData from '../_mock/data/cases/active_cases.json';
import caseStagesData from '../_mock/data/cases/case_stages.json';
import caseFilesData from '../_mock/data/cases/case_files.json'; 
import caseMessagesData from '../_mock/data/cases/case_messages.json'; 

import materialsData from '../_mock/data/production/materials.json';
import batchesData from '../_mock/data/production/batches.json';
import equipmentData from '../_mock/data/production/equipment.json';

const LabContext = createContext(null);

export const LabProvider = ({ children }) => {
  const { user, hasRole, hasPermission } = useAuth();

  // --- State ---
  const [cases, setCases] = useState([]);
  const [stages, setStages] = useState([]);
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
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 700)); 
        
        setCases(activeCasesData);
        setStages(caseStagesData);
        setCaseFiles(caseFilesData); 
        setCaseMessages(caseMessagesData);

        setMaterials(materialsData);
        setBatches(batchesData);
        setEquipment(equipmentData);
      } catch (err) {
        console.error("Failed to load Lab data", err);
        setError("Failed to load Lab data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // --- Helper for simulated API calls ---
  const simulateApi = (callback, delay = 500) => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);
      setTimeout(() => {
        try {
          const result = callback();
          resolve(result);
        } catch (err) {
          console.error("Mock API Error:", err.message);
          setError(err.message);
          reject(err);
        } finally {
          setLoading(false);
        }
      }, delay);
    });
  };

  // ============================================================
  // 0. UTILITY HELPERS
  // ============================================================

  const deriveCaseStatus = useCallback((units = []) => {
    if (!units || units.length === 0) return 'stage-new';
    const statusMap = units.map(u => u.status);
    
    if (statusMap.includes('stage-hold')) return 'stage-hold';
    if (statusMap.some(s => ['stage-design', 'stage-milling', 'stage-finishing'].includes(s))) {
      return 'stage-production';
    }
    if (statusMap.every(s => s === 'stage-shipped')) return 'stage-shipped';
    
    return 'stage-production';
  }, []);

  const validateTransition = useCallback((currentStage, nextStage) => {
    if (hasRole('role-driver') && nextStage !== 'stage-shipped' && nextStage !== 'stage-delivered') {
       throw new Error("Drivers can only update Shipping/Delivery status.");
    }
    return true;
  }, [hasRole]);

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
    return await simulateApi(() => {
      const senderName = user?.profile 
        ? `${user.profile.firstName} ${user.profile.lastName}`.trim() 
        : user?.email || 'Unknown';

      const newMessage = {
        id: `msg-${Date.now()}`,
        caseId,
        senderId: user?.id || 'system',
        senderName: senderName,
        senderRole: hasRole('role-client') ? 'Client' : 'Lab',
        content,
        isInternal: !!isInternal,
        createdAt: new Date().toISOString(),
        readAt: null
      };

      setCaseMessages(prev => [...prev, newMessage]);
      return newMessage;
    });
  }, [user, hasRole]);

  // --- NEW: File Upload Simulation ---
  const addCaseFile = useCallback(async (caseId, fileObj, category) => {
    return await simulateApi(() => {
      const newFile = {
        id: `file-new-${Date.now()}`,
        caseId,
        uploaderId: user?.id || 'system',
        category: category, // 'INPUT_SCAN', 'REFERENCE', 'PRODUCTION_DESIGN'
        subCategory: category === 'PRODUCTION_DESIGN' ? 'CAM_OUTPUT' : 'User Upload',
        fileType: fileObj.name.split('.').pop().toUpperCase(),
        fileName: fileObj.name,
        // Convert bytes to MB
        size: `${(fileObj.size / (1024 * 1024)).toFixed(2)} MB`,
        // Create a temporary local URL for preview
        url: URL.createObjectURL(fileObj),
        createdAt: new Date().toISOString(),
        isLatest: true, 
        version: 1
      };

      setCaseFiles(prev => [...prev, newFile]);
      return newFile;
    });
  }, [user]);

  const createCase = useCallback(async (newCaseData) => {
    return await simulateApi(() => {
      const newCase = {
        ...newCaseData,
        id: `case-${Date.now()}`,
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
      };
      if (newCase.items) delete newCase.items;
      setCases(prev => [...prev, newCase]);
      return newCase;
    });
  }, [user]);

  const updateCase = useCallback(async (caseId, updates) => {
    return await simulateApi(() => {
      let updatedCase = null;
      setCases(prev => prev.map(c => {
        if (c.id === caseId) {
          updatedCase = { ...c, ...updates };
          return updatedCase;
        }
        return c;
      }));
      if (!updatedCase) throw new Error("Case not found");
      return updatedCase;
    });
  }, []);

  const updateCaseStatus = useCallback(async (caseId, newStageId, unitId = null) => {
    return await simulateApi(() => {
      setCases(prev => prev.map(c => {
        if (c.id !== caseId) return c;

        validateTransition(c.status, newStageId);

        let updatedUnits = c.units || [];
        if (unitId) {
          updatedUnits = updatedUnits.map(u => 
            u.id === unitId ? { ...u, status: newStageId } : u
          );
        } else {
          updatedUnits = updatedUnits.map(u => ({ ...u, status: newStageId }));
        }

        const derivedStatus = deriveCaseStatus(updatedUnits);

        return { ...c, units: updatedUnits, status: derivedStatus };
      }));
    });
  }, [validateTransition, deriveCaseStatus]);

  // ============================================================
  // 2. PRODUCTION HANDLERS
  // ============================================================
  
  const consumeMaterial = useCallback(async (materialId, quantity) => {
    return await simulateApi(() => {
      let success = false;
      setMaterials(prev => prev.map(mat => {
        if (mat.id === materialId) {
          if (mat.stockLevel < quantity) throw new Error(`Insufficient stock.`);
          success = true;
          return { ...mat, stockLevel: mat.stockLevel - quantity };
        }
        return mat;
      }));
      if (!success) throw new Error("Material not found");
    });
  }, []);

  const createBatch = useCallback(async (batchData) => {
    return await simulateApi(() => {
      const newBatch = {
        ...batchData,
        id: `batch-${Date.now()}`,
        status: 'InProgress',
        startTime: new Date().toISOString(),
        operatorId: user?.id || 'system'
      };
      setBatches(prev => [...prev, newBatch]);
      return newBatch;
    });
  }, [user]);

  const updateEquipmentStatus = useCallback(async (equipmentId, status, notes) => {
    return await simulateApi(() => {
      setEquipment(prev => prev.map(eq => 
        eq.id === equipmentId 
          ? { ...eq, status, maintenance: { ...eq.maintenance, notes: notes || eq.maintenance.notes } } 
          : eq
      ));
    });
  }, []);

  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    cases,
    stages,
    materials,
    batches,
    equipment,
    loading,
    error,
    
    getCaseById,
    getCaseFiles,
    getCaseMessages,
    addCaseMessage,
    addCaseFile, // NEW
    createCase,
    updateCase,
    updateCaseStatus,

    consumeMaterial,
    createBatch,
    updateEquipmentStatus,
    deriveCaseStatus, 
  }), [
    cases, stages, materials, batches, equipment, loading, error,
    getCaseById, getCaseFiles, getCaseMessages, addCaseMessage, addCaseFile, createCase, updateCase, updateCaseStatus,
    consumeMaterial, createBatch, updateEquipmentStatus, deriveCaseStatus
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