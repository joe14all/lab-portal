/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';

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
  // DERIVED STATE (Selectors)
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
      
      if (material.stockLevel < quantity) throw new Error("Insufficient stock");

      const updatedMaterial = await MockService.production.inventory.update(materialId, {
        stockLevel: material.stockLevel - quantity
      });

      setMaterials(prev => prev.map(m => m.id === materialId ? updatedMaterial : m));
      return updatedMaterial;
    } catch (err) {
      console.error("Failed to consume material", err);
      throw err;
    }
  }, [materials]);

  const createBatch = useCallback(async (batchData, user) => {
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
  }, [activeLab]);

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
    // State
    materials,
    batches,
    equipment,
    loading,
    error,

    // Computed
    activeBatches,
    lowStockMaterials,
    equipmentStats,

    // Actions
    consumeMaterial,
    createBatch,
    updateEquipmentStatus,
  }), [
    materials, batches, equipment, loading, error,
    activeBatches, lowStockMaterials, equipmentStats,
    consumeMaterial, createBatch, updateEquipmentStatus
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