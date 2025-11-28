/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useCrm, useToast, useAuth } from '../../contexts';
import { 
  IconSearch, 
  IconSettings, 
  IconCheck, 
  IconTrash, 
  IconEdit,
  IconChevronDown,
  IconEye 
} from '../../layouts/components/LabIcons';
import PriceListModal from '../../components/lab-settings/financials/PriceListModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import styles from "./LabPriceLists.module.css";
import { COUNTRIES } from '../../constants';

const LabPriceLists = () => {
  const { 
    priceLists, createPriceList, updatePriceList, deletePriceList,
    products, addons, loading 
  } = useCrm();
  const { activeLab } = useAuth();
  const { addToast } = useToast();

  // --- 1. Local State for Data Manipulation ---
  // We keep a local copy of "items" for each price list to allow fast editing
  // Structure: { [priceListId]: { [itemId]: price } }
  const [priceMatrix, setPriceMatrix] = useState({});
  const [changedListIds, setChangedListIds] = useState(new Set());
  
  // View State
  const [search, setSearch] = useState('');
  const [visibleListIds, setVisibleListIds] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Bulk Tools
  const [bulkValue, setBulkValue] = useState('');
  const [bulkType, setBulkType] = useState('percent'); // 'percent' | 'fixed'
  const [bulkOperation, setBulkOperation] = useState('increase'); // 'increase' | 'decrease'

  // Modals
  const [listModal, setListModal] = useState({ open: false, data: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, item: null });

  // --- 2. Initialization ---
  useEffect(() => {
    if (priceLists.length > 0) {
      const matrix = {};
      const ids = [];
      
      priceLists.forEach(pl => {
        ids.push(pl.id);
        const itemMap = {};
        pl.items?.forEach(item => {
          // Key can be product or addon ID
          const key = item.productId || item.addonId;
          itemMap[key] = item.price;
        });
        matrix[pl.id] = itemMap;
      });

      setPriceMatrix(matrix);
      // By default show all (or limit if too many)
      setVisibleListIds(ids); 
    }
  }, [priceLists]);

  // --- 3. Derived Data ---
  const allRows = useMemo(() => {
    const prodRows = products.map(p => ({ ...p, type: 'Product' }));
    const addonRows = addons.map(a => ({ ...a, type: 'Add-on' }));
    return [...prodRows, ...addonRows].filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, addons, search]);

  const defaultCurrencySymbol = useMemo(() => {
    const code = activeLab?.settings?.currency || 'USD';
    return COUNTRIES.find(c => c.currency === code)?.symbol || '$';
  }, [activeLab]);

  const getListCurrency = (listId) => {
    const list = priceLists.find(pl => pl.id === listId);
    const code = list?.currency || 'USD';
    return COUNTRIES.find(c => c.currency === code)?.symbol || '$';
  };

  // --- 4. Handlers ---

  const handlePriceChange = (listId, itemId, newVal) => {
    setPriceMatrix(prev => ({
      ...prev,
      [listId]: {
        ...prev[listId],
        [itemId]: parseFloat(newVal)
      }
    }));
    setChangedListIds(prev => new Set(prev).add(listId));
  };

  const handleSaveAll = async () => {
    try {
      const promises = Array.from(changedListIds).map(listId => {
        const priceMap = priceMatrix[listId];
        const newItems = Object.entries(priceMap).map(([key, price]) => {
          // Determine if key is product or addon (naive check or check dataset)
          const isProduct = products.some(p => p.id === key);
          if (isProduct) return { productId: key, price };
          return { addonId: key, price };
        });
        return updatePriceList(listId, { items: newItems });
      });

      await Promise.all(promises);
      addToast(`Successfully saved ${changedListIds.size} price lists.`, 'success');
      setChangedListIds(new Set());
    } catch (err) {
      console.error(err);
      addToast("Failed to save changes.", "error");
    }
  };

  // --- Bulk Operations (Targeting Selected Column) ---
  const applyBulkToColumn = () => {
    if (!selectedListId) return;
    if (!bulkValue || isNaN(parseFloat(bulkValue))) return;

    const val = parseFloat(bulkValue);
    const listMap = { ...priceMatrix[selectedListId] }; // Copy current prices for this list
    let count = 0;

    allRows.forEach(row => {
      // Base for calculation: Default Price from Catalog
      const base = row.defaultPrice || 0; 
      let calculated = 0;

      if (bulkType === 'percent') {
        const factor = val / 100;
        calculated = bulkOperation === 'increase' ? base * (1 + factor) : base * (1 - factor);
      } else {
        calculated = bulkOperation === 'increase' ? base + val : base - val;
      }
      
      // Round and ensure non-negative
      listMap[row.id] = Math.max(0, parseFloat(calculated.toFixed(2)));
      count++;
    });

    setPriceMatrix(prev => ({ ...prev, [selectedListId]: listMap }));
    setChangedListIds(prev => new Set(prev).add(selectedListId));
    addToast(`Updated ${count} prices in selected list.`, "success");
  };

  // --- List Metadata & Create/Delete ---
  const handleListSave = async (data) => {
    try {
      if (listModal.data) {
        await updatePriceList(listModal.data.id, data);
        addToast("List updated", "success");
      } else {
        await createPriceList(data);
        addToast("New list created", "success");
      }
      setListModal({ open: false, data: null });
    } catch (err) {
      addToast("Error saving list", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.item) return;
    try {
      await deletePriceList(confirmModal.item.id);
      
      // Clean up local state
      setVisibleListIds(prev => prev.filter(id => id !== confirmModal.item.id));
      if (selectedListId === confirmModal.item.id) setSelectedListId(null);
      
      addToast("List deleted", "success");
      setConfirmModal({ open: false, item: null });
    } catch (err) {
      addToast("Error deleting list", "error");
    }
  };

  const toggleVisibility = (id) => {
    setVisibleListIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  return (
    <div className={styles.pageContainer}>
      
      {/* --- HEADER --- */ }
      <div className={styles.header}>
        <div>
          <h1>Master Price Matrix</h1>
          <p>Manage all price lists in a single view.</p>
        </div>
        <div className={styles.headerActions}>
          <button className="button text" onClick={() => setListModal({ open: true, data: null })}>
            + Add Price List
          </button>
          <button 
            className="button primary" 
            onClick={handleSaveAll}
            disabled={changedListIds.size === 0}
          >
            {changedListIds.size > 0 ? `Save Changes (${changedListIds.size})` : 'No Changes'}
          </button>
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className={styles.toolbar}>
        
        {/* 1. Filter / Search */}
        <div className={styles.searchGroup}>
          <div className={styles.searchWrapper}>
            <IconSearch className={styles.searchIcon} />
            <input 
              className={styles.searchInput} 
              placeholder="Search products..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {/* Column Visibility Dropdown */}
          <div className={styles.columnMenuWrapper}>
            <button 
              className={`button secondary ${styles.colBtn}`}
              onClick={() => setShowColumnMenu(!showColumnMenu)}
            >
              <IconSettings width="16" /> Columns
            </button>
            {showColumnMenu && (
              <div className={styles.columnMenu}>
                <div className={styles.menuHeader}>Show/Hide Lists</div>
                {priceLists.map(pl => (
                  <label key={pl.id} className={styles.colOption}>
                    <input 
                      type="checkbox" 
                      checked={visibleListIds.includes(pl.id)}
                      onChange={() => toggleVisibility(pl.id)}
                    />
                    {pl.name}
                  </label>
                ))}
              </div>
            )}
            {/* Backdrop to close menu */}
            {showColumnMenu && <div className={styles.backdrop} onClick={() => setShowColumnMenu(false)} />}
          </div>
        </div>

        {/* 2. Bulk Actions (Contextual) */}
        <div className={`${styles.bulkGroup} ${selectedListId ? styles.bulkActive : ''}`}>
          {!selectedListId ? (
            <span className={styles.bulkHint}>Click a column header to enable bulk tools</span>
          ) : (
            <>
              <span className={styles.bulkLabel}>
                Editing: <strong>{priceLists.find(l => l.id === selectedListId)?.name}</strong>
              </span>
              
              <select 
                className={styles.controlInput}
                value={bulkOperation}
                onChange={e => setBulkOperation(e.target.value)}
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
              
              <span style={{fontSize:'0.9rem', color:'var(--text-secondary)'}}>by</span>

              <div className={styles.inputGroup}>
                <input 
                  type="number" 
                  className={styles.valInput}
                  placeholder="0"
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                />
                <select 
                  className={styles.unitInput}
                  value={bulkType}
                  onChange={e => setBulkType(e.target.value)}
                >
                  <option value="percent">%</option>
                  <option value="fixed">$</option>
                </select>
              </div>

              <button className="button secondary small" onClick={applyBulkToColumn}>Apply</button>
              <button className="icon-button small" onClick={() => setSelectedListId(null)} title="Deselect">
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- MATRIX TABLE --- */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.stickyCol} style={{minWidth:'250px', left:0, zIndex: 20}}>
                  Product / Service
                </th>
                <th className={styles.stickyCol} style={{minWidth:'100px', left:'250px', zIndex: 20, borderRight:'2px solid var(--border-color)'}}>
                  Default
                </th>
                
                {/* Dynamic Price List Columns */}
                {visibleListIds.map(listId => {
                  const pl = priceLists.find(l => l.id === listId);
                  if (!pl) return null;
                  const isSelected = selectedListId === listId;

                  return (
                    <th 
                      key={listId} 
                      className={`${styles.listHeader} ${isSelected ? styles.headerSelected : ''}`}
                      onClick={() => setSelectedListId(listId)}
                    >
                      <div className={styles.headerContent}>
                        <div className={styles.headerTitle}>
                          {pl.name}
                          {isSelected && <IconCheck width="14" className={styles.checkIcon} />}
                        </div>
                        <div className={styles.headerSub}>
                          {pl.currency} • {new Date(pl.effectiveDate).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {/* Column Actions (Stop Propagation to avoid selecting) */}
                      <div className={styles.headerActionsCol}>
                        <button 
                          className={styles.colActionBtn} 
                          title="Edit Info"
                          onClick={(e) => { e.stopPropagation(); setListModal({open:true, data:pl}); }}
                        >
                          <IconEdit width="14" />
                        </button>
                        <button 
                          className={`${styles.colActionBtn} ${styles.dangerBtn}`} 
                          title="Delete List"
                          onClick={(e) => { e.stopPropagation(); setConfirmModal({open:true, item:pl}); }}
                        >
                          <IconTrash width="14" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allRows.map(row => (
                <tr key={row.id}>
                  {/* Fixed Columns */}
                  <td className={styles.stickyCol} style={{left:0, backgroundColor:'var(--bg-surface)'}}>
                    <div className={styles.rowTitle}>{row.name}</div>
                    <div className={styles.rowSub}>{row.sku || row.type}</div>
                  </td>
                  <td className={`${styles.stickyCol} ${styles.defaultCell}`} style={{left:'250px', borderRight:'2px solid var(--border-color)'}}>
                    {defaultCurrencySymbol}{row.defaultPrice?.toFixed(2)}
                  </td>

                  {/* Editable Columns */}
                  {visibleListIds.map(listId => {
                    const symbol = getListCurrency(listId);
                    const currentVal = priceMatrix[listId]?.[row.id] ?? ''; // Allow 0
                    const isSelected = selectedListId === listId;

                    return (
                      <td 
                        key={`${listId}-${row.id}`}
                        className={isSelected ? styles.cellSelected : ''}
                      >
                        <div className={styles.inputWrapper}>
                          <span className={styles.currencyPrefix}>{symbol}</span>
                          <input 
                            type="number" 
                            className={styles.priceInput}
                            value={currentVal}
                            placeholder={row.defaultPrice?.toFixed(2)}
                            onChange={(e) => handlePriceChange(listId, row.id, e.target.value)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {allRows.length === 0 && (
                <tr><td colSpan={visibleListIds.length + 2} className={styles.emptyState}>No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}
      <PriceListModal 
        isOpen={listModal.open}
        initialData={listModal.data}
        onClose={() => setListModal({ open: false, data: null })}
        onSubmit={handleListSave}
        isDeleting={null} // Delete handled via column action now
      />

      <ConfirmationModal
        isOpen={confirmModal.open}
        title="Delete Price List"
        message={`Are you sure you want to delete ${confirmModal.item?.name}? This cannot be undone.`}
        onConfirm={handleDelete}
        onClose={() => setConfirmModal({ open: false, item: null })}
      />
    </div>
  );
};

export default LabPriceLists;