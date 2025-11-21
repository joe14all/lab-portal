/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

// --- Mock Data Imports ---
import clinicsData from '../_mock/data/crm/clinics.json';
import doctorsData from '../_mock/data/crm/doctors.json';
import priceListsData from '../_mock/data/crm/price_lists.json';

const CrmContext = createContext(null);

export const CrmProvider = ({ children }) => {
  // --- State ---
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Initialize Data ---
  useEffect(() => {
    // Simulate initial fetch
    const initData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 600)); // Simulate latency
        setClinics(clinicsData);
        setDoctors(doctorsData);
        setPriceLists(priceListsData);
      } catch (err) {
        console.error("Failed to load CRM data", err);
        setError("Failed to load CRM data");
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
  // 1. CLINIC HANDLERS
  // ============================================================

  /**
   * (READ) Get a single clinic by ID
   */
  const getClinicById = useCallback((clinicId) => {
    return clinics.find(c => c.id === clinicId);
  }, [clinics]);

  /**
   * (CREATE) Onboard a new clinic
   */
  const addClinic = useCallback(async (newClinicData) => {
    return await simulateApi(() => {
      const newClinic = {
        ...newClinicData,
        id: `clinic-${Date.now()}`,
        status: 'Active',
        systemInfo: { createdAt: new Date().toISOString() }
      };
      setClinics(prev => [...prev, newClinic]);
      return newClinic;
    });
  }, []);

  /**
   * (UPDATE) Update clinic details (e.g., address, settings)
   */
  const updateClinic = useCallback(async (clinicId, updates) => {
    return await simulateApi(() => {
      let updatedClinic = null;
      setClinics(prev => prev.map(clinic => {
        if (clinic.id === clinicId) {
          updatedClinic = { ...clinic, ...updates };
          return updatedClinic;
        }
        return clinic;
      }));
      if (!updatedClinic) throw new Error("Clinic not found");
      return updatedClinic;
    });
  }, []);

  // ============================================================
  // 2. DOCTOR HANDLERS
  // ============================================================

  /**
   * (READ) Get all doctors associated with a specific clinic
   */
  const getDoctorsByClinic = useCallback((clinicId) => {
    return doctors.filter(d => d.clinicId === clinicId);
  }, [doctors]);

  /**
   * (CREATE) Add a doctor to a clinic
   */
  const addDoctor = useCallback(async (clinicId, doctorData) => {
    return await simulateApi(() => {
      const newDoctor = {
        ...doctorData,
        id: `doc-${Date.now()}`,
        clinicId: clinicId,
        isActive: true
      };
      setDoctors(prev => [...prev, newDoctor]);
      return newDoctor;
    });
  }, []);

  /**
   * (UPDATE) Update doctor preferences or details
   */
  const updateDoctor = useCallback(async (doctorId, updates) => {
    return await simulateApi(() => {
      setDoctors(prev => prev.map(doc => 
        doc.id === doctorId ? { ...doc, ...updates } : doc
      ));
    });
  }, []);

  /**
   * (DELETE) Soft-delete / Deactivate a doctor
   */
  const removeDoctor = useCallback(async (doctorId) => {
    return await simulateApi(() => {
      setDoctors(prev => prev.map(doc => 
        doc.id === doctorId ? { ...doc, isActive: false } : doc
      ));
    });
  }, []);

  // ============================================================
  // 3. PRICE LIST HANDLERS
  // ============================================================

  /**
   * (READ) Get a specific price list
   */
  const getPriceListById = useCallback((priceListId) => {
    return priceLists.find(pl => pl.id === priceListId);
  }, [priceLists]);

  /**
   * (CREATE) Create a new custom price list (e.g. "2026 VIP")
   */
  const createPriceList = useCallback(async (priceListData) => {
    return await simulateApi(() => {
      const newList = {
        ...priceListData,
        id: `pl-${Date.now()}`,
        items: priceListData.items || []
      };
      setPriceLists(prev => [...prev, newList]);
      return newList;
    });
  }, []);

  /**
   * (UPDATE) Modify prices in a list
   */
  const updatePriceList = useCallback(async (priceListId, updates) => {
    return await simulateApi(() => {
      setPriceLists(prev => prev.map(pl => 
        pl.id === priceListId ? { ...pl, ...updates } : pl
      ));
    });
  }, []);

  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    // State
    clinics,
    doctors,
    priceLists,
    loading,
    error,

    // Clinic Actions
    getClinicById,
    addClinic,
    updateClinic,

    // Doctor Actions
    getDoctorsByClinic,
    addDoctor,
    updateDoctor,
    removeDoctor,

    // Price List Actions
    getPriceListById,
    createPriceList,
    updatePriceList,
  }), [
    clinics, doctors, priceLists, loading, error,
    getClinicById, addClinic, updateClinic,
    getDoctorsByClinic, addDoctor, updateDoctor, removeDoctor,
    getPriceListById, createPriceList, updatePriceList
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