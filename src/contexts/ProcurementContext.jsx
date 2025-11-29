/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useProduction } from './ProductionContext';
import { VendorConnector } from '../utils/integration/vendorConnector';
import { useToast } from './ToastContext';

const ProcurementContext = createContext(null);

export const ProcurementProvider = ({ children }) => {
  // Removed 'materials' as it was unused.
  const { restockMaterial } = useProduction();
  const { addToast } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState([]); // Local state for POs
  const [cart, setCart] = useState([]); // Items to order

  // --- ACTIONS ---

  const addToCart = useCallback((material) => {
    setCart(prev => {
      // Prevent duplicates
      if (prev.find(item => item.materialId === material.id)) return prev;
      
      return [...prev, {
        materialId: material.id,
        name: material.name,
        sku: material.sku,
        vendorId: material.supplierInfo?.supplierId,
        quantity: material.reorderThreshold * 3 || 5, // Default reorder amount
        currentPrice: material.unitCost
      }];
    });
  }, []);

  const removeFromCart = useCallback((materialId) => {
    setCart(prev => prev.filter(item => item.materialId !== materialId));
  }, []);

  const updateCartItem = useCallback((materialId, updates) => {
    setCart(prev => prev.map(item => item.materialId === materialId ? { ...item, ...updates } : item));
  }, []);

  /**
   * Check Live Pricing for all items in cart
   */
  const refreshPricing = useCallback(async () => {
    if (cart.length === 0) return;

    const updates = await Promise.all(cart.map(async (item) => {
      try {
        const quote = await VendorConnector.checkAvailability(item.sku, item.vendorId);
        return { 
          materialId: item.materialId, 
          currentPrice: quote.currentPrice,
          available: quote.available
        };
      } catch (error) {
        console.warn(`Pricing check failed for ${item.sku}:`, error);
        return null;
      }
    }));

    setCart(prev => prev.map(item => {
      const update = updates.find(u => u?.materialId === item.materialId);
      return update ? { ...item, ...update } : item;
    }));
    
    addToast("Vendor pricing updated", "info");
  }, [cart, addToast]);

  /**
   * Submit POs grouped by Vendor
   */
  const checkout = useCallback(async () => {
    if (cart.length === 0) return;

    // Group by Vendor
    const ordersByVendor = cart.reduce((acc, item) => {
      const vid = item.vendorId || 'unknown';
      if (!acc[vid]) acc[vid] = [];
      acc[vid].push(item);
      return acc;
    }, {});

    const newOrders = [];

    for (const [vendorId, items] of Object.entries(ordersByVendor)) {
      try {
        const total = items.reduce((sum, i) => sum + (i.currentPrice * i.quantity), 0);
        
        // Call API
        const response = await VendorConnector.submitPurchaseOrder({
          vendorId,
          items,
          totalEstimated: total
        });

        // Create PO Record
        newOrders.push({
          id: response.poNumber,
          vendorId,
          status: 'Ordered',
          createdDate: new Date().toISOString(),
          expectedDate: response.submissionDate, // Mock
          items,
          totalCost: total,
          vendorRef: response.vendorRef
        });

      } catch (err) {
        console.error(`Failed order for ${vendorId}`, err);
        addToast(`Failed to place order for ${vendorId}`, "error");
      }
    }

    if (newOrders.length > 0) {
      setPurchaseOrders(prev => [...newOrders, ...prev]);
      setCart([]); // Clear cart
      addToast("Orders placed successfully", "success");
    }
  }, [cart, addToast]);

  /**
   * Receive a PO (Updates Inventory)
   */
  const receiveOrder = useCallback(async (poId) => {
    const order = purchaseOrders.find(po => po.id === poId);
    if (!order) return;

    // Logic: Prevent receiving the same order twice
    if (order.status === 'Received') {
      addToast("This order has already been received.", "info");
      return;
    }

    // Update inventory for each item
    for (const item of order.items) {
      await restockMaterial(item.materialId, item.quantity, item.currentPrice);
    }

    // Update PO status
    setPurchaseOrders(prev => prev.map(po => 
      po.id === poId ? { ...po, status: 'Received', receivedDate: new Date().toISOString() } : po
    ));
    
    addToast(`PO #${poId} received into inventory`, "success");
  }, [purchaseOrders, restockMaterial, addToast]);

  const value = useMemo(() => ({
    purchaseOrders,
    cart,
    addToCart,
    removeFromCart,
    updateCartItem,
    refreshPricing,
    checkout,
    receiveOrder
  }), [
    purchaseOrders, 
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartItem, 
    refreshPricing, 
    checkout, 
    receiveOrder
  ]);

  return (
    <ProcurementContext.Provider value={value}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (!context) throw new Error('useProcurement must be used within a ProcurementProvider');
  return context;
};