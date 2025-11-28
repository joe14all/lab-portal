/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCrm, useToast, useAuth } from '../../contexts';
import { IconChevronRight, IconSearch, IconArrowDown } from '../../layouts/components/LabIcons';
import styles from "./LabPriceListDetail.module.css";
import { COUNTRIES } from '../../constants';

const LabPriceListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeLab } = useAuth();
  const { 
    priceLists, updatePriceList, 
    products, addons, loading 
  } = useCrm();

  const [search, setSearch] = useState('');
  const [localPrices, setLocalPrices] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // --- Bulk State ---
  const [bulkValue, setBulkValue] = useState('');
  const [bulkType, setBulkType] = useState('percent');
  const [bulkOperation, setBulkOperation] = useState('increase');

  // --- Helpers ---
  const activeList = useMemo(() => priceLists.find(pl => pl.id === id), [priceLists, id]);
  
  const currencyCode = activeList?.currency || activeLab?.settings?.currency || 'USD';
  const currencySymbol = useMemo(() => {
    const country = COUNTRIES.find(c => c.currency === currencyCode);
    return country ? country.symbol : '$';
  }, [currencyCode]);

  // --- 1. Initialize Local State ---
  useEffect(() => {
    if (activeList) {
      const initialMap = {};
      activeList.items?.forEach(item => {
        const key = item.productId || item.addonId;
        if (key) initialMap[key] = item.price;
      });
      setLocalPrices(initialMap);
    }
  }, [activeList]);

  // --- 2. Handlers ---
  const handlePriceChange = (itemId, newVal) => {
    setLocalPrices(prev => ({ ...prev, [itemId]: parseFloat(newVal) }));
    setHasChanges(true);
  };

  const applyBulkAdjustment = () => {
    if (!bulkValue || isNaN(parseFloat(bulkValue))) {
      addToast("Please enter a valid adjustment value", "error");
      return;
    }

    const value = parseFloat(bulkValue);
    const newPrices = { ...localPrices };
    let count = 0;

    // Helper to calculate new price
    const calculate = (basePrice) => {
      const base = basePrice || 0; // Use the passed base (current or default)
      let adjusted = 0;

      if (bulkType === 'percent') {
        const factor = value / 100;
        adjusted = bulkOperation === 'increase' 
          ? base * (1 + factor) 
          : base * (1 - factor);
      } else {
        // Fixed Value
        adjusted = bulkOperation === 'increase' 
          ? base + value 
          : base - value;
      }
      return Math.max(0, parseFloat(adjusted.toFixed(2)));
    };

    // Apply to Products
    products.forEach(p => {
      // FIX: Use existing list price if available, otherwise default
      const currentVal = newPrices[p.id] !== undefined ? newPrices[p.id] : p.defaultPrice;
      newPrices[p.id] = calculate(currentVal);
      count++;
    });

    // Apply to Add-ons
    addons.forEach(a => {
      // FIX: Use existing list price if available, otherwise default
      const currentVal = newPrices[a.id] !== undefined ? newPrices[a.id] : a.defaultPrice;
      newPrices[a.id] = calculate(currentVal);
      count++;
    });

    setLocalPrices(newPrices);
    setHasChanges(true);
    addToast(`Updated prices for ${count} items.`, "success");
  };

  const handleSave = async () => {
    if (!activeList) return;
    
    const newItems = Object.entries(localPrices).map(([key, price]) => {
      const isProduct = products.some(p => p.id === key);
      if (isProduct) return { productId: key, price: parseFloat(price) };
      return { addonId: key, price: parseFloat(price) };
    });

    try {
      await updatePriceList(id, { items: newItems });
      addToast("Prices updated successfully", "success");
      setHasChanges(false);
    } catch (err) {
      addToast("Failed to save prices", "error");
    }
  };

  if (loading) return <div className={styles.loading}>Loading price list...</div>;
  if (!activeList) return <div className={styles.emptyState}>Price list not found.</div>;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredAddons = addons.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span onClick={() => navigate('/lab-settings/price-lists')} className={styles.crumbLink}>Price Lists</span>
          <IconChevronRight width="14" height="14" />
          <span className={styles.crumbActive}>{activeList.name}</span>
        </div>
        <div className={styles.headerActions}>
          <button className="button text" onClick={() => navigate('/lab-settings/price-lists')}>Back</button>
          <button 
            className="button primary" 
            onClick={handleSave}
            disabled={!hasChanges}
          >
            {hasChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <IconSearch className={styles.searchIcon} />
          <input 
            className={styles.searchInput}
            placeholder="Search items..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.bulkTools}>
          <span className={styles.bulkLabel}>Bulk Adjust:</span>
          
          <div className={styles.selectWrapper}>
            <select 
              value={bulkOperation} 
              onChange={(e) => setBulkOperation(e.target.value)}
              className={styles.controlSelect}
            >
              <option value="increase">Increase All</option>
              <option value="decrease">Decrease All</option>
            </select>
            <IconArrowDown className={styles.selectIcon} width="12" />
          </div>

          <span className={styles.textBy}>by</span>

          <div className={styles.inputGroup}>
            <input 
              type="number" 
              placeholder="0" 
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className={styles.valInput}
            />
            <select 
              value={bulkType} 
              onChange={(e) => setBulkType(e.target.value)}
              className={styles.unitSelect}
            >
              <option value="percent">%</option>
              <option value="fixed">{currencySymbol}</option>
            </select>
          </div>

          <button className="button secondary small" onClick={applyBulkAdjustment}>
            Apply
          </button>
        </div>
      </div>

      {/* TWO-COLUMN GRID */}
      <div className={styles.gridContainer}>
        
        {/* LEFT: PRODUCTS */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Products</h3>
            <span className={styles.countBadge}>{filteredProducts.length}</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th className={styles.alignRight}>Default</th>
                  <th className={styles.alignRight}>List Price ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const currentPrice = localPrices[p.id];
                  const val = currentPrice !== undefined ? currentPrice : '';
                  const defaultP = p.defaultPrice || 0;
                  const isModified = currentPrice !== undefined && currentPrice !== defaultP;

                  return (
                    <tr key={p.id} className={isModified ? styles.rowModified : ''}>
                      <td>
                        <div className={styles.itemName}>{p.name}</div>
                        <div className={styles.itemSub}>{p.category} • {p.sku}</div>
                      </td>
                      <td className={styles.mutedCell}>
                        {currencySymbol}{defaultP.toFixed(2)}
                      </td>
                      <td className={styles.alignRight}>
                        <input 
                          type="number" 
                          step="0.01"
                          className={styles.priceInput}
                          placeholder={defaultP.toFixed(2)}
                          value={val}
                          onChange={(e) => handlePriceChange(p.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: ADD-ONS */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Add-ons & Upgrades</h3>
            <span className={styles.countBadge}>{filteredAddons.length}</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Add-on Name</th>
                  <th className={styles.alignRight}>Default</th>
                  <th className={styles.alignRight}>Price ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {filteredAddons.map(a => {
                  const currentPrice = localPrices[a.id];
                  const val = currentPrice !== undefined ? currentPrice : '';
                  const defaultP = a.defaultPrice || 0;
                  const isModified = currentPrice !== undefined && currentPrice !== defaultP;

                  return (
                    <tr key={a.id} className={isModified ? styles.rowModified : ''}>
                      <td>
                        <div className={styles.itemName}>{a.name}</div>
                        <div className={styles.itemSub}>Applies to {a.applicableProducts?.length || 'All'} items</div>
                      </td>
                      <td className={styles.mutedCell}>
                        {currencySymbol}{defaultP.toFixed(2)}
                      </td>
                      <td className={styles.alignRight}>
                        <input 
                          type="number" 
                          step="0.01"
                          className={styles.priceInput}
                          placeholder={defaultP.toFixed(2)}
                          value={val}
                          onChange={(e) => handlePriceChange(a.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LabPriceListDetail;