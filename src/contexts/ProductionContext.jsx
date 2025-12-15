/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';
import { LabEventBus, EVENTS } from '../utils/eventBus';

const ProductionContext = createContext(null);

export const ProductionProvider = ({ children }) => {
  const { activeLab } = useAuth();

  // --- Core State ---
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
        const [fetchedMaterials, fetchedBatches, fetchedEquipment] = await Promise.all([
          MockService.production.inventory.getAll({ labId: activeLab.id }),
          MockService.production.batches.getAll({ labId: activeLab.id }),
          MockService.production.equipment.getAll({ labId: activeLab.id })
        ]);
        
        setMaterials(fetchedMaterials);
        setBatches(fetchedBatches);
        setEquipment(fetchedEquipment);
        setError(null);
      } catch (err) {
        console.error("Failed to load Production data", err);
        setError("Failed to load Production data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [activeLab]);

  // Listen for case status changes to auto-create/assign batches
  useEffect(() => {
    const handleCaseStatusChange = async (event) => {
      // Only handle auto-advanced milling cases
      if (event.newStatus === 'stage-milling' && event.autoAdvanced) {
        
        try {
          const caseId = event.caseId;
          
          // Check if case is already in a batch
          const existingBatch = batches.find(b => b.caseIds?.includes(caseId));
          if (existingBatch) {
            return;
          }

          // Find or create a scheduled milling batch for today
          const today = new Date().toISOString().split('T')[0];
          let millingBatch = batches.find(b => 
            b.status === 'Scheduled' && 
            b.equipmentType === 'Mill' &&
            b.scheduledDate?.startsWith(today)
          );

          if (!millingBatch) {
            
            // Create new batch
            millingBatch = await MockService.production.batches.create({
              labId: activeLab.id,
              equipmentType: 'Mill',
              equipmentId: equipment.find(e => e.type === 'Mill' && e.status === 'Idle')?.id || 'mill-001',
              materialType: 'Zirconia',
              status: 'Scheduled',
              caseIds: [caseId],
              scheduledDate: new Date().toISOString(),
              estimatedDuration: 45,
              operatorId: 'system',
              materialConsumed: { type: 'Zirconia', units: 1 }
            });
            
            setBatches(prev => [millingBatch, ...prev]);
          } else {
            
            // Add case to existing batch
            const updatedCaseIds = [...new Set([...millingBatch.caseIds, caseId])];
            millingBatch = await MockService.production.batches.update(millingBatch.id, {
              caseIds: updatedCaseIds,
              materialConsumed: {
                ...millingBatch.materialConsumed,
                units: updatedCaseIds.length
              }
            });
            
            setBatches(prev => prev.map(b => b.id === millingBatch.id ? millingBatch : b));
          }
        } catch (err) {
          console.error("Failed to auto-assign case to batch:", err);
        }
      } else {
        console.log('Event does not match criteria for auto-batch creation');
        console.log('- New Status:', event.newStatus);
        console.log('- Auto Advanced:', event.autoAdvanced);
      }
    };

    const unsubscribe = LabEventBus.subscribe(EVENTS.CASE_STATUS_CHANGED, handleCaseStatusChange);
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [activeLab, batches, equipment]);

  // ============================================================
  // DERIVED STATE
  // ============================================================
  
  const activeBatches = useMemo(() => {
    return batches.filter(b => b.status === 'InProgress' || b.status === 'Scheduled');
  }, [batches]);

  const lowStockMaterials = useMemo(() => {
    return materials.filter(m => 
      m.status === 'LowStock' || 
      m.status === 'ReorderNow' || 
      (m.stockLevel <= m.reorderThreshold)
    );
  }, [materials]);

  const equipmentStats = useMemo(() => {
    const running = equipment.filter(e => e.status === 'Running').length;
    const idle = equipment.filter(e => e.status === 'Idle').length;
    const down = equipment.filter(e => e.status === 'Maintenance').length;
    return { running, idle, down, total: equipment.length };
  }, [equipment]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const consumeMaterial = useCallback(async (materialId, quantity) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) throw new Error("Material not found");
      
      const newLevel = Math.max(0, material.stockLevel - quantity);
      
      // Update DB
      const updatedMaterial = await MockService.production.inventory.update(materialId, {
        stockLevel: newLevel,
        status: newLevel <= material.reorderThreshold ? 'ReorderNow' : 'InStock'
      });

      // Update Local
      setMaterials(prev => prev.map(m => m.id === materialId ? updatedMaterial : m));
      
      // Emit event if low stock
      if (newLevel <= material.reorderThreshold) {
        LabEventBus.publish(EVENTS.MATERIAL_LOW, { 
          materialId, 
          currentStock: newLevel,
          timestamp: new Date().toISOString()
        });
      }

      return updatedMaterial;
    } catch (err) {
      console.error("Failed to consume material", err);
      throw err;
    }
  }, [materials]);

  // --- NEW: Restock Action for Procurement ---
  const restockMaterial = useCallback(async (materialId, quantityAdded, costPerUnit) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) throw new Error("Material not found");

      const newLevel = material.stockLevel + quantityAdded;
      
      // Add to cost history
      const historyEntry = {
        date: new Date().toISOString(),
        unitCost: costPerUnit,
        qty: quantityAdded
      };
      
      const updatedMaterial = await MockService.production.inventory.update(materialId, {
        stockLevel: newLevel,
        status: 'InStock',
        costHistory: [...(material.costHistory || []), historyEntry]
      });

      setMaterials(prev => prev.map(m => m.id === materialId ? updatedMaterial : m));
      return updatedMaterial;
    } catch (err) {
      console.error("Failed to restock material", err);
      throw err;
    }
  }, [materials]);

  const createBatch = useCallback(async (batchData, user) => {
    if (!activeLab) return;
    try {
      const newBatch = await MockService.production.batches.create({
        ...batchData,
        labId: activeLab.id,
        status: 'Scheduled',
        startTime: null,
        operatorId: user?.id || 'system'
      });
      setBatches(prev => [newBatch, ...prev]);
      return newBatch;
    } catch (err) {
      console.error("Failed to create batch", err);
      throw err;
    }
  }, [activeLab]);

  const addCasesToBatch = useCallback(async (batchId, caseIds) => {
    try {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) throw new Error("Batch not found");
      if (batch.status !== 'Scheduled') throw new Error("Can only add cases to scheduled batches");
      
      const updatedCaseIds = [...new Set([...batch.caseIds, ...caseIds])];
      const updatedBatch = await MockService.production.batches.update(batchId, {
        caseIds: updatedCaseIds,
        materialConsumed: {
          ...batch.materialConsumed,
          units: batch.materialConsumed.units + caseIds.length
        }
      });

      setBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));
      return updatedBatch;
    } catch (err) {
      console.error("Failed to add cases to batch", err);
      throw err;
    }
  }, [batches]);

  const removeCaseFromBatch = useCallback(async (batchId, caseId) => {
    try {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) throw new Error("Batch not found");
      if (batch.status !== 'Scheduled') throw new Error("Can only remove cases from scheduled batches");
      
      const updatedCaseIds = batch.caseIds.filter(id => id !== caseId);
      const updatedBatch = await MockService.production.batches.update(batchId, {
        caseIds: updatedCaseIds,
        materialConsumed: {
          ...batch.materialConsumed,
          units: Math.max(0, batch.materialConsumed.units - 1)
        }
      });

      setBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));
      return updatedBatch;
    } catch (err) {
      console.error("Failed to remove case from batch", err);
      throw err;
    }
  }, [batches]);

  const startBatch = useCallback(async (batchId) => {
    try {
      const updatedBatch = await MockService.production.batches.update(batchId, {
        status: 'InProgress',
        startTime: new Date().toISOString()
      });

      if (updatedBatch.machineId) {
        const updatedMachine = await MockService.production.equipment.update(updatedBatch.machineId, {
          status: 'Running',
          currentJobId: batchId
        });
        setEquipment(prev => prev.map(e => e.id === updatedBatch.machineId ? updatedMachine : e));
      }

      setBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));
      return updatedBatch;
    } catch (err) {
      console.error("Failed to start batch", err);
      throw err;
    }
  }, []);

  const completeBatch = useCallback(async (batchId, qualityMetrics) => {
    try {
      const batch = batches.find(b => b.id === batchId);
      const updatedBatch = await MockService.production.batches.update(batchId, {
        status: 'Completed',
        endTime: new Date().toISOString(),
        qualityMetrics
      });

      if (updatedBatch.machineId) {
        const updatedMachine = await MockService.production.equipment.update(updatedBatch.machineId, {
          status: 'Idle',
          currentJobId: null
        });
        setEquipment(prev => prev.map(e => e.id === updatedBatch.machineId ? updatedMachine : e));
      }

      // Update case statuses based on batch type
      if (batch && batch.caseIds && batch.caseIds.length > 0) {
        const stageMap = {
          'stage-design': 'stage-milling',
          'stage-milling': 'stage-finishing',
          'stage-finishing': 'stage-qc',
          'stage-qc': 'stage-shipping' // QC complete → Ready to Ship
        };

        // Update all cases in the batch to next stage
        for (const caseId of batch.caseIds) {
          try {
            const caseData = await MockService.cases.cases.getById(caseId);
            const currentStatus = caseData.status;
            const nextStatus = stageMap[currentStatus];
            
            if (nextStatus) {
              await MockService.cases.cases.update(caseId, {
                status: nextStatus,
                statusHistory: [
                  ...(caseData.statusHistory || []),
                  {
                    status: nextStatus,
                    timestamp: new Date().toISOString(),
                    note: `Batch ${batchId.split('-').pop()} completed`
                  }
                ]
              });
            }
          } catch (caseErr) {
            console.warn(`Failed to update case ${caseId}:`, caseErr);
          }
        }

        // Emit event to refresh cases in LabContext
        LabEventBus.publish(EVENTS.CASE_STATUS_CHANGED, {
          batchId,
          caseIds: batch.caseIds,
          timestamp: new Date().toISOString()
        });
      }

      setBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));

      // Emit Event
      LabEventBus.publish(EVENTS.BATCH_COMPLETED, {
        batch: updatedBatch,
        labId: activeLab.id,
        timestamp: new Date().toISOString()
      });

      return updatedBatch;
    } catch (err) {
      console.error("Failed to complete batch", err);
      throw err;
    }
  }, [activeLab, batches]);

  const logMaintenance = useCallback(async (equipmentId, logData) => {
    try {
      const eq = equipment.find(e => e.id === equipmentId);
      const updatedEq = await MockService.production.equipment.update(equipmentId, {
        status: 'Idle',
        maintenance: {
          lastServiceDate: new Date().toISOString(),
          nextServiceDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          notes: logData.notes
        }
      });
      setEquipment(prev => prev.map(e => e.id === equipmentId ? updatedEq : e));
      return updatedEq;
    } catch (err) {
      console.error("Maintenance log failed", err);
      throw err;
    }
  }, [equipment]);

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
      return updatedEq;
    } catch (err) {
      console.error("Failed to update equipment", err);
      throw err;
    }
  }, [equipment]);

  const value = useMemo(() => ({
    materials,
    batches,
    equipment,
    loading,
    error,
    activeBatches,
    lowStockMaterials,
    equipmentStats,
    consumeMaterial,
    restockMaterial, // EXPORTED
    createBatch,
    addCasesToBatch,
    removeCaseFromBatch,
    startBatch,
    completeBatch,
    logMaintenance,
    updateEquipmentStatus,
  }), [
    materials, batches, equipment, loading, error,
    activeBatches, lowStockMaterials, equipmentStats,
    consumeMaterial, restockMaterial, createBatch, startBatch, completeBatch, logMaintenance, updateEquipmentStatus
  ]);

  return (
    <ProductionContext.Provider value={value}>
      {children}
    </ProductionContext.Provider>
  );
};

export const useProduction = () => {
  const context = useContext(ProductionContext);
  if (!context) {
    throw new Error('useProduction must be used within a ProductionProvider');
  }
  return context;
};