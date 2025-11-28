/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useCrm, useToast, useAuth } from '../../contexts';
import { COUNTRIES } from '../../constants';
import ProductFormModal from '../../components/lab-settings/catalog/ProductFormModal';
import AddonFormModal from '../../components/lab-settings/catalog/AddonFormModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import styles from "./LabCatalogSettings.module.css";

const LabCatalogSettings = () => {
  const { activeLab } = useAuth();
  const { 
    products, createProduct, updateProduct, deleteProduct,
    addons, createAddon, updateAddon, deleteAddon
  } = useCrm();
  const { addToast } = useToast();

  // --- Currency Logic ---
  // Default lab currency code (e.g. "USD")
  const defaultCurrencyCode = activeLab?.settings?.currency || 'USD';

  // Helper to get symbol from code
  const getSymbol = (code) => {
    const country = COUNTRIES.find(c => c.currency === code);
    return country ? country.symbol : '$';
  };

  // --- State for Modals ---
  const [activeModal, setActiveModal] = useState(null); // 'product' | 'addon'
  const [editingItem, setEditingItem] = useState(null);

  // --- State for Confirmation ---
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    type: null, // 'product' | 'addon'
    item: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Product Handlers ---
  const handleProductSubmit = async (data) => {
    try {
      if (editingItem) {
        await updateProduct(editingItem.id, data);
        addToast("Product updated successfully", "success");
      } else {
        await createProduct(data);
        addToast("Product created successfully", "success");
      }
      closeModal();
    } catch (err) {
      addToast("Failed to save product", "error");
    }
  };

  const initProductDelete = () => {
    if (!editingItem) return;
    setConfirmState({
      isOpen: true,
      type: 'product',
      item: editingItem
    });
  };

  // --- Addon Handlers ---
  const handleAddonSubmit = async (data) => {
    try {
      if (editingItem) {
        await updateAddon(editingItem.id, data);
        addToast("Add-on updated successfully", "success");
      } else {
        await createAddon(data);
        addToast("Add-on created successfully", "success");
      }
      closeModal();
    } catch (err) {
      addToast("Failed to save add-on", "error");
    }
  };

  const initAddonDelete = () => {
    if (!editingItem) return;
    setConfirmState({
      isOpen: true,
      type: 'addon',
      item: editingItem
    });
  };

  // --- Shared Confirmation Logic ---
  const executeDelete = async () => {
    const { type, item } = confirmState;
    if (!type || !item) return;

    setIsDeleting(true);
    try {
      if (type === 'product') {
        await deleteProduct(item.id);
        addToast("Product deleted", "success");
      } else if (type === 'addon') {
        await deleteAddon(item.id);
        addToast("Add-on deleted", "success");
      }
      
      setConfirmState({ isOpen: false, type: null, item: null });
      closeModal();
    } catch (err) {
      console.error(err);
      addToast(`Failed to delete ${type}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const closeConfirm = () => {
    setConfirmState({ isOpen: false, type: null, item: null });
  };

  // --- Utils ---
  const openProductModal = (product = null) => {
    setEditingItem(product);
    setActiveModal('product');
  };

  const openAddonModal = (addon = null) => {
    setEditingItem(addon);
    setActiveModal('addon');
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingItem(null);
  };

  return (
    <div>
      {/* --- PRODUCTS SECTION --- */ }
      <div className={styles.header}>
        <h2>Product Catalog</h2>
        <button className="button primary" onClick={() => openProductModal()}>+ Add Product</button>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Turnaround</th>
              <th>Default Price</th>
              <th className={styles.actionCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              // Dynamic Symbol Lookup
              const symbol = getSymbol(p.currency || defaultCurrencyCode);
              
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong><br/>
                    {p.sku && <small className={styles.skuText}>{p.sku}</small>}
                  </td>
                  <td>{p.category}</td>
                  <td>{p.turnaroundDays} Days</td>
                  <td>{symbol}{(p.defaultPrice || 0).toFixed(2)}</td>
                  <td className={styles.actionCell}>
                    <button 
                      className="button secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      onClick={() => openProductModal(p)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan="5" className={styles.emptyState}>No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADDONS SECTION --- */}
      <div className={`${styles.header} ${styles.marginTop}`}>
        <h3>Add-ons & Upgrades</h3>
        <button className="button secondary" onClick={() => openAddonModal()}>+ Add Add-on</button>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Add-on Name</th>
              <th>Price Impact</th>
              <th>Applies To</th>
              <th className={styles.actionCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {addons.map(a => {
              // Dynamic Symbol Lookup
              const symbol = getSymbol(a.currency || defaultCurrencyCode);

              return (
                <tr key={a.id}>
                  <td><strong>{a.name}</strong></td>
                  <td>+{symbol}{a.defaultPrice.toFixed(2)}</td>
                  <td className={styles.skuText}>
                    {a.applicableProducts?.length || 0} products
                  </td>
                  <td className={styles.actionCell}>
                    <button 
                      className="button secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      onClick={() => openAddonModal(a)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {addons.length === 0 && (
              <tr><td colSpan="4" className={styles.emptyState}>No add-ons found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- EDIT MODALS --- */}
      <ProductFormModal 
        isOpen={activeModal === 'product'} 
        onClose={closeModal}
        onSubmit={handleProductSubmit}
        isDeleting={initProductDelete} 
        initialData={editingItem}
        defaultCurrency={defaultCurrencyCode}
      />

      <AddonFormModal 
        isOpen={activeModal === 'addon'} 
        onClose={closeModal}
        onSubmit={handleAddonSubmit}
        isDeleting={initAddonDelete}
        initialData={editingItem}
        allProducts={products}
        defaultCurrency={defaultCurrencyCode}
      />

      {/* --- CONFIRMATION MODAL --- */}
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={executeDelete}
        isLoading={isDeleting}
        title={`Delete ${confirmState.type === 'product' ? 'Product' : 'Add-on'}`}
        message={`Are you sure you want to delete "${confirmState.item?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default LabCatalogSettings;