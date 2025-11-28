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
  }, [activeLab]);

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