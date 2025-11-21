/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext'; // We might need user ID for audit trails

// --- Mock Data Imports ---
import activeCasesData from '../_mock/data/cases/active_cases.json';
import caseStagesData from '../_mock/data/cases/case_stages.json';
import materialsData from '../_mock/data/production/materials.json';
import batchesData from '../_mock/data/production/batches.json';
import equipmentData from '../_mock/data/production/equipment.json';

const LabContext = createContext(null);

export const LabProvider = ({ children }) => {
  const { user } = useAuth();

  // --- State ---
  const [cases, setCases] = useState([]);
  const [stages, setStages] = useState([]);
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
  // 1. CASE MANAGEMENT HANDLERS
  // ============================================================

  /**
   * (READ) Get a single case by ID
   */
  const getCaseById = useCallback((caseId) => {
    return cases.find(c => c.id === caseId);
  }, [cases]);

  /**
   * (CREATE) Create a new case (Order Entry)
   */
  const createCase = useCallback(async (newCaseData) => {
    return await simulateApi(() => {
      const newCase = {
        ...newCaseData,
        id: `case-${Date.now()}`,
        caseNumber: `2025-${Math.floor(Math.random() * 10000)}`, // Auto-generate ID
        status: 'stage-new', // Default start stage
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

  /**
   * (UPDATE) Update case details (non-status changes)
   */
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

  /**
   * (UPDATE) Move case to next stage (Workflow Transition)
   */
  const updateCaseStatus = useCallback(async (caseId, newStageId) => {
    return await simulateApi(() => {
      // In a real app, validate transition logic here (e.g. can't skip QC)
      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, status: newStageId } : c
      ));
    });
  }, []);

  // ============================================================
  // 2. PRODUCTION HANDLERS
  // ============================================================

  /**
   * (UPDATE) Deduct material stock (Inventory Management)
   */
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

  /**
   * (CREATE) Create a production batch (e.g. nesting a mill run)
   */
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
      
      // Optional: Automatically update status of all cases in this batch to 'In Production'
      if (batchData.caseIds && batchData.caseIds.length > 0) {
         setCases(prev => prev.map(c => 
            batchData.caseIds.includes(c.id) ? { ...c, status: 'stage-milling' } : c
         ));
      }
      
      return newBatch;
    });
  }, [user]);

  /**
   * (UPDATE) Update equipment status (e.g. Machine Maintenance)
   */
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
    createCase,
    updateCase,
    updateCaseStatus,

    // Production Actions
    consumeMaterial,
    createBatch,
    updateEquipmentStatus,
  }), [
    cases, stages, materials, batches, equipment, loading, error,
    getCaseById, createCase, updateCase, updateCaseStatus,
    consumeMaterial, createBatch, updateEquipmentStatus
  ]);

  return (
    <LabContext.Provider value={value}>
      {children}
    </LabContext.Provider>
  );
};

// Hook
export const useLab = () => {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
};