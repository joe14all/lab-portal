/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';

const CrmContext = createContext(null);

export const CrmProvider = ({ children }) => {
  const { activeLab } = useAuth(); // Get context for Multi-Tenancy

  // --- State ---
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]); 
  const [addons, setAddons] = useState([]);     
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Load Data (Reactive to Lab Switch) ---
  useEffect(() => {
    const loadData = async () => {
      // Don't fetch if no lab context is active (e.g. not logged in)
      if (!activeLab?.id) return; 

      setLoading(true);
      try {
        // Fetch all resources filtered by the current Lab ID
        const [
          fetchedClinics, 
          fetchedDoctors, 
          fetchedPriceLists,
          fetchedProducts,
          fetchedAddons
        ] = await Promise.all([
          MockService.crm.clinics.getAll({ labId: activeLab.id }),
          MockService.crm.doctors.getAll({ labId: activeLab.id }),
          MockService.crm.priceLists.getAll({ labId: activeLab.id }),
          MockService.catalog.products.getAll({ labId: activeLab.id }),
          MockService.catalog.addons.getAll({ labId: activeLab.id })
        ]);

        setClinics(fetchedClinics);
        setDoctors(fetchedDoctors);
        setPriceLists(fetchedPriceLists);
        setProducts(fetchedProducts);
        setAddons(fetchedAddons);
        setError(null);
      } catch (err) {
        console.error("Failed to load CRM data", err);
        setError("Failed to load CRM data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeLab]); // Re-run whenever the user switches labs

  // ============================================================
  // 1. CLINIC HANDLERS
  // ============================================================

  const getClinicById = useCallback((clinicId) => {
    return clinics.find(c => c.id === clinicId);
  }, [clinics]);

  const addClinic = useCallback(async (newClinicData) => {
    if (!activeLab) return;
    try {
      const newClinic = await MockService.crm.clinics.create({
        ...newClinicData,
        labId: activeLab.id, // Enforce tenant isolation
        status: 'Active'
      });
      setClinics(prev => [newClinic, ...prev]); // Optimistic update
      return newClinic;
    } catch (err) {
      console.error("Failed to add clinic", err);
      throw err;
    }
  }, [activeLab]);

  const updateClinic = useCallback(async (clinicId, updates) => {
    try {
      const updatedClinic = await MockService.crm.clinics.update(clinicId, updates);
      setClinics(prev => prev.map(c => c.id === clinicId ? updatedClinic : c));
      return updatedClinic;
    } catch (err) {
      console.error("Failed to update clinic", err);
      throw err;
    }
  }, []);

  // ============================================================
  // 2. DOCTOR HANDLERS
  // ============================================================

  const getDoctorsByClinic = useCallback((clinicId) => {
    return doctors.filter(d => d.clinicId === clinicId);
  }, [doctors]);

  const addDoctor = useCallback(async (clinicId, doctorData) => {
    if (!activeLab) return;
    try {
      const newDoctor = await MockService.crm.doctors.create({
        ...doctorData,
        labId: activeLab.id,
        clinicId: clinicId,
        isActive: true
      });
      setDoctors(prev => [newDoctor, ...prev]);
      return newDoctor;
    } catch (err) {
      console.error("Failed to add doctor", err);
      throw err;
    }
  }, [activeLab]);

  const updateDoctor = useCallback(async (doctorId, updates) => {
    try {
      const updatedDoctor = await MockService.crm.doctors.update(doctorId, updates);
      setDoctors(prev => prev.map(d => d.id === doctorId ? updatedDoctor : d));
      return updatedDoctor;
    } catch (err) {
      console.error("Failed to update doctor", err);
      throw err;
    }
  }, []);

  const removeDoctor = useCallback(async (doctorId) => {
    try {
      // Soft delete by setting isActive: false
      const updatedDoctor = await MockService.crm.doctors.update(doctorId, { isActive: false });
      setDoctors(prev => prev.map(d => d.id === doctorId ? updatedDoctor : d));
    } catch (err) {
      console.error("Failed to remove doctor", err);
      throw err;
    }
  }, []);

  // ============================================================
  // 3. PRICE LIST HANDLERS
  // ============================================================

  const getPriceListById = useCallback((priceListId) => {
    return priceLists.find(pl => pl.id === priceListId);
  }, [priceLists]);

  const createPriceList = useCallback(async (priceListData) => {
    if (!activeLab) return;
    try {
      const newList = await MockService.crm.priceLists.create({
        ...priceListData,
        labId: activeLab.id,
        items: priceListData.items || []
      });
      setPriceLists(prev => [newList, ...prev]);
      return newList;
    } catch (err) {
      console.error("Failed to create price list", err);
      throw err;
    }
  }, [activeLab]);

  const updatePriceList = useCallback(async (priceListId, updates) => {
    try {
      const updatedList = await MockService.crm.priceLists.update(priceListId, updates);
      setPriceLists(prev => prev.map(pl => pl.id === priceListId ? updatedList : pl));
      return updatedList;
    } catch (err) {
      console.error("Failed to update price list", err);
      throw err;
    }
  }, []);

  // ============================================================
  // 4. CATALOG HANDLERS
  // ============================================================
  
  const calculateProductPrice = useCallback((productId, clinicId) => {
    // 1. Find Clinic
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return null;

    // 2. Find Assigned Price List (or default if configured)
    const priceList = priceLists.find(pl => pl.id === clinic.priceListId);
    
    // 3. Fallback to Base Product Price
    const baseProduct = products.find(p => p.id === productId);
    if (!priceList) return baseProduct?.defaultPrice || null; // Note: products json doesn't have defaultPrice yet, usually in Price List logic

    // 4. Find Item in Price List
    const priceItem = priceList.items.find(item => item.productId === productId);
    
    if (priceItem) return priceItem.price;
    
    // If product not in specific list, maybe return 0 or handle differently
    return 0; 
  }, [clinics, priceLists, products]);


  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    // State
    clinics,
    doctors,
    priceLists,
    products,
    addons,
    loading,
    error,

    // Actions
    getClinicById,
    addClinic,
    updateClinic,

    getDoctorsByClinic,
    addDoctor,
    updateDoctor,
    removeDoctor,

    getPriceListById,
    createPriceList,
    updatePriceList,
    
    calculateProductPrice
  }), [
    clinics, doctors, priceLists, products, addons, loading, error,
    getClinicById, addClinic, updateClinic,
    getDoctorsByClinic, addDoctor, updateDoctor, removeDoctor,
    getPriceListById, createPriceList, updatePriceList,
    calculateProductPrice
  ]);

  return (
    <CrmContext.Provider value={value}>
      {children}
    </CrmContext.Provider>
  );
};

// Hook
export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};