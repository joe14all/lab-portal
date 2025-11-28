import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCrm, useToast, useAuth } from '../../contexts';
import { IconChevronRight, IconSearch, IconSettings } from '../../layouts/components/LabIcons';
import styles from "./LabPriceListDetail.module.css";
import { COUNTRIES } from '../../constants';

const LabPriceListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { activeLab } = useAuth();
  const { 
    priceLists, updatePriceList, 
    products, addons 
  } = useCrm();

  const [search, setSearch] = useState('');
  const [localPrices, setLocalPrices] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // --- Bulk State ---
  const [bulkValue, setBulkValue] = useState('');
  const [bulkType, setBulkType] = useState('percent'); // 'percent' | 'fixed'
  const [bulkOperation, setBulkOperation] = useState('increase'); // 'increase' | 'decrease'

  // --- Helpers ---
  const activeList = useMemo(() => priceLists.find(pl => pl.id === id), [priceLists, id]);
  
  // Get Currency Symbol
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

  // --- 2. Bulk Handler ---
  const applyBulkAdjustment = () => {
    if (!bulkValue || isNaN(parseFloat(bulkValue))) {
      addToast("Please enter a valid adjustment value", "error");
      return;
    }

    const value = parseFloat(bulkValue);
    const newPrices = { ...localPrices };
    let count = 0;

    // Helper to calculate new price
    const calculate = (defaultPrice) => {
      const base = defaultPrice || 0;
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
      return Math.max(0, parseFloat(adjusted.toFixed(2))); // Ensure no negative prices
    };

    // Apply to Products
    products.forEach(p => {
      newPrices[p.id] = calculate(p.defaultPrice);
      count++;
    });

    // Apply to Add-ons
    addons.forEach(a => {
      newPrices[a.id] = calculate(a.defaultPrice);
      count++;
    });

    setLocalPrices(newPrices);
    setHasChanges(true);
    addToast(`Updated prices for ${count} items.`, "success");
  };

  // --- 3. Save Handler ---
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

  const handlePriceChange = (id, val) => {
    setLocalPrices(prev => ({ ...prev, [id]: val }));
    setHasChanges(true);
  };

  if (!activeList) return <div className="card">Loading...</div>;

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredAddons = addons.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.container}>
      {/* Header */}
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

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <IconSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search items..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.bulkTools}>
          <span className={styles.bulkLabel}>Bulk Adjust:</span>
          
          <select 
            value={bulkOperation} 
            onChange={(e) => setBulkOperation(e.target.value)}
            className={styles.controlInput}
          >
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </select>

          <span className={styles.textBy}>by</span>

          <div className={styles.inputGroup}>
            <input 
              type="number" 
              placeholder="0" 
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className={styles.valueInput}
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

          <button className="button secondary" onClick={applyBulkAdjustment}>
            Apply to All
          </button>
        </div>
      </div>

      <div className={styles.gridContainer}>
        
        {/* Products Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className={styles.panelHeader}>
            <span>Products</span>
            <span className={styles.countBadge}>{filteredProducts.length}</span>
          </div>
          <div className={styles.scrollArea}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{width:'100px', textAlign:'right'}}>Default</th>
                  <th style={{width:'130px', textAlign:'right'}}>List Price ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const currentPrice = localPrices[p.id] !== undefined ? localPrices[p.id] : '';
                  const isOverridden = localPrices[p.id] !== undefined;
                  const defaultP = p.defaultPrice || 0;
                  
                  return (
                    <tr key={p.id} className={isOverridden ? styles.activeRow : ''}>
                      <td>
                        <div className={styles.itemName}>{p.name}</div>
                        <div className={styles.itemSub}>{p.category}</div>
                      </td>
                      <td className={styles.mutedCell}>{currencySymbol}{defaultP.toFixed(2)}</td>
                      <td style={{textAlign:'right'}}>
                        <input 
                          type="number" 
                          step="0.01"
                          className={styles.priceInput}
                          placeholder={defaultP.toFixed(2)}
                          value={currentPrice}
                          onChange={(e) => handlePriceChange(p.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && <tr><td colSpan="3" className={styles.empty}>No products found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add-ons Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className={styles.panelHeader}>
            <span>Add-ons & Upgrades</span>
            <span className={styles.countBadge}>{filteredAddons.length}</span>
          </div>
          <div className={styles.scrollArea}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{width:'100px', textAlign:'right'}}>Default</th>
                  <th style={{width:'130px', textAlign:'right'}}>List Price ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {filteredAddons.map(a => {
                  const currentPrice = localPrices[a.id] !== undefined ? localPrices[a.id] : '';
                  const isOverridden = localPrices[a.id] !== undefined;
                  const defaultP = a.defaultPrice || 0;

                  return (
                    <tr key={a.id} className={isOverridden ? styles.activeRow : ''}>
                      <td>
                        <div className={styles.itemName}>{a.name}</div>
                        <div className={styles.itemSub}>Applies to {a.applicableProducts?.length || 'All'} items</div>
                      </td>
                      <td className={styles.mutedCell}>{currencySymbol}{defaultP.toFixed(2)}</td>
                      <td style={{textAlign:'right'}}>
                        <input 
                          type="number" 
                          step="0.01"
                          className={styles.priceInput}
                          placeholder={defaultP.toFixed(2)}
                          value={currentPrice}
                          onChange={(e) => handlePriceChange(a.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {filteredAddons.length === 0 && <tr><td colSpan="3" className={styles.empty}>No add-ons found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LabPriceListDetail;