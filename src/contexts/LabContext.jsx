/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

// --- Mock Data Imports ---
import activeCasesData from '../_mock/data/cases/active_cases.json';
import caseStagesData from '../_mock/data/cases/case_stages.json';
// NEW IMPORTS: Case Files and Messages
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
  // NEW STATES: Files and Messages
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
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 700)); 
        
        setCases(activeCasesData);
        setStages(caseStagesData);
        // Load NEW data
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

  // --- Helper for simulated API calls (Unchanged) ---
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
  // 0. UTILITY HELPERS (Unchanged)
  // ============================================================

  const deriveCaseStatus = useCallback((units = []) => {
    if (!units || units.length === 0) return 'stage-new';
    
    const statusMap = units.map(u => u.status);
    
    if (statusMap.includes('stage-hold')) return 'stage-hold';
    if (statusMap.some(s => ['stage-design', 'stage-milling', 'stage-finishing'].includes(s))) {
      return 'stage-production'; // Aggregate status
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
  
  // NEW READ ACTIONS
  const getCaseFiles = useCallback((caseId) => {
    return caseFiles.filter(f => f.caseId === caseId);
  }, [caseFiles]);

  const getCaseMessages = useCallback((caseId) => {
    return caseMessages.filter(m => m.caseId === caseId);
  }, [caseMessages]);


  const createCase = useCallback(async (newCaseData) => {
    return await simulateApi(() => {
      const newCase = {
        ...newCaseData,
        id: `case-${Date.now()}`,
        caseNumber: `2025-${Math.floor(Math.random() * 10000)}`,
        status: 'stage-new',
        units: newCaseData.items?.map((item, idx) => ({
           id: `unit-${Date.now()}-${idx}`,
           ...item,
           status: 'stage-new'
        })) || [],
        dates: {
          created: new Date().toISOString(),
          received: new Date().toISOString(),
          due: newCaseData.dates?.due || null, 
          shipped: null
        },
        systemInfo: { createdBy: user?.id || 'system' }
      };
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
  // 2. PRODUCTION HANDLERS (Unchanged)
  // ============================================================

  const consumeMaterial = useCallback(async (materialId, quantity) => {
    return await simulateApi(() => {
      let success = false;
      setMaterials(prev => prev.map(mat => {
        if (mat.id === materialId) {
          if (mat.stockLevel < quantity) {
             throw new Error(`Insufficient stock for ${mat.name}. Current: ${mat.stockLevel}`);
          }
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
      
      if (batchData.productionJobs && batchData.productionJobs.length > 0) {
         setCases(prevCases => prevCases.map(c => {
            const caseJobs = batchData.productionJobs.filter(job => job.caseId === c.id);
            
            if (caseJobs.length === 0) return c;

            const targetStatus = batchData.type === 'Milling' ? 'stage-milling' 
                               : batchData.type === 'Printing' ? 'stage-printing' 
                               : 'stage-production';

            const updatedUnits = (c.units || []).map(unit => {
                const isIncluded = caseJobs.some(job => job.unitId === unit.id);
                return isIncluded ? { ...unit, status: targetStatus } : unit;
            });

            const newStatus = deriveCaseStatus(updatedUnits);

            return { ...c, units: updatedUnits, status: newStatus };
         }));
      }
      
      return newBatch;
    });
  }, [user, deriveCaseStatus]);

  const updateEquipmentStatus = useCallback(async (equipmentId, status, notes) => {
    return await simulateApi(() => {
      setEquipment(prev => prev.map(eq => 
        eq.id === equipmentId 
          ? { 
              ...eq, 
              status, 
              maintenance: { 
                ...eq.maintenance, 
                notes: notes || eq.maintenance.notes 
              } 
            } 
          : eq
      ));
    });
  }, []);

  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    // State
    cases,
    stages,
    materials,
    batches,
    equipment,
    loading,
    error,

    // Case Actions
    getCaseById,
    getCaseFiles,     // NEW EXPORT
    getCaseMessages,  // NEW EXPORT
    createCase,
    updateCase,
    updateCaseStatus,

    // Production Actions
    consumeMaterial,
    createBatch,
    updateEquipmentStatus,
    
    // Helpers
    deriveCaseStatus, 
  }), [
    cases, stages, materials, batches, equipment, loading, error,
    getCaseById, getCaseFiles, getCaseMessages, createCase, updateCase, updateCaseStatus,
    consumeMaterial, createBatch, updateEquipmentStatus,
    deriveCaseStatus
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