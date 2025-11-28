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

  const defaultCurrencyCode = activeLab?.settings?.currency || 'USD';

  const getSymbol = (code) => {
    const country = COUNTRIES.find(c => c.currency === code);
    return country ? country.symbol : '$';
  };

  const [activeModal, setActiveModal] = useState(null); 
  const [editingItem, setEditingItem] = useState(null);

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    type: null, 
    item: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

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
    setConfirmState({ isOpen: true, type: 'product', item: editingItem });
  };

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
    setConfirmState({ isOpen: true, type: 'addon', item: editingItem });
  };

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
    <div className={styles.container}>
      
      {/* --- PRODUCTS SECTION --- */ }
      <div className={styles.sectionHeader}>
        <div>
          <h2>Product Catalog</h2>
          <p>Define base products and services offered by your lab.</p>
        </div>
        <button className="button primary" onClick={() => openProductModal()}>
          + Add Product
        </button>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Product Name</th>
                <th>Category</th>
                <th>Turnaround</th>
                <th style={{ textAlign: 'right' }}>Base Price</th>
                <th className={styles.actionCell}></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const symbol = getSymbol(p.currency || defaultCurrencyCode);
                return (
                  <tr key={p.id} onClick={() => openProductModal(p)} className={styles.clickableRow}>
                    <td>
                      <div className={styles.itemName}>{p.name}</div>
                      {p.sku && <div className={styles.itemMeta}>{p.sku}</div>}
                    </td>
                    <td><span className={styles.categoryBadge}>{p.category}</span></td>
                    <td className={styles.metaText}>{p.turnaroundDays} Days</td>
                    <td className={styles.priceCell}>{symbol}{(p.defaultPrice || 0).toFixed(2)}</td>
                    <td className={styles.actionCell}>
                      <button 
                        className="button secondary small" 
                        onClick={(e) => { e.stopPropagation(); openProductModal(p); }}
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
      </div>

      {/* --- ADDONS SECTION --- */}
      <div className={`${styles.sectionHeader} ${styles.marginTop}`}>
        <div>
          <h3>Add-ons & Upgrades</h3>
          <p>Optional extras that can be applied to products.</p>
        </div>
        <button className="button secondary" onClick={() => openAddonModal()}>
          + Add Add-on
        </button>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Add-on Name</th>
                <th style={{ textAlign: 'right' }}>Price Impact</th>
                <th>Applies To</th>
                <th className={styles.actionCell}></th>
              </tr>
            </thead>
            <tbody>
              {addons.map(a => {
                const symbol = getSymbol(a.currency || defaultCurrencyCode);
                return (
                  <tr key={a.id} onClick={() => openAddonModal(a)} className={styles.clickableRow}>
                    <td><div className={styles.itemName}>{a.name}</div></td>
                    <td className={styles.priceCell}>+{symbol}{a.defaultPrice.toFixed(2)}</td>
                    <td className={styles.metaText}>
                      {a.applicableProducts?.length || 0} products
                    </td>
                    <td className={styles.actionCell}>
                      <button 
                        className="button secondary small" 
                        onClick={(e) => { e.stopPropagation(); openAddonModal(a); }}
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
      </div>

      {/* --- MODALS --- */}
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