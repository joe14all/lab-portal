/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm, useToast, useAuth } from '../../contexts';
import { COUNTRIES } from '../../constants';
import PriceListModal from '../../components/lab-settings/financials/PriceListModal';
import styles from "./LabFinancialSettings.module.css";

const LabFinancialSettings = () => {
  const navigate = useNavigate();
  const { priceLists, createPriceList } = useCrm();
  const { activeLab } = useAuth();
  const { addToast } = useToast();

  // --- Local State for Global Config ---
  const [globalConfig, setGlobalConfig] = useState({
    currency: activeLab?.settings?.currency || 'USD',
    taxRate: 0.00,
    paymentTerms: 'Net 30'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Handlers ---

  const handleConfigChange = (e) => {
    setGlobalConfig({ ...globalConfig, [e.target.name]: e.target.value });
  };

  const handleSaveGlobal = (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      addToast("Financial configuration saved", "success");
    }, 600);
  };

  const handleCreateList = async (data) => {
    try {
      await createPriceList(data);
      addToast("New Price List created", "success");
      setIsModalOpen(false);
    } catch (err) {
      addToast("Failed to create list", "error");
    }
  };

  return (
    <div className={styles.container}>
      
      <div className={styles.header}>
        <h2>Financial Settings</h2>
        <p>Configure global billing parameters and manage price lists.</p>
      </div>

      {/* --- GLOBAL CONFIG CARD --- */}
      <div className="card">
        <div className={styles.cardHeader}>
          <h3>Global Configuration</h3>
        </div>
        
        <form onSubmit={handleSaveGlobal} className={styles.form}>
          <div className={styles.grid2}>
            <div className="form-group">
              <label>Base Currency</label>
              <select 
                name="currency"
                value={globalConfig.currency}
                onChange={handleConfigChange}
                disabled // Usually locked per lab instance
                style={{ backgroundColor: 'var(--bg-surface-hover)' }}
              >
                {COUNTRIES.map(c => <option key={c.code} value={c.currency}>{c.currency} ({c.symbol})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Default Tax Rate (%)</label>
              <input 
                type="number" 
                step="0.01" 
                name="taxRate"
                value={globalConfig.taxRate}
                onChange={handleConfigChange}
              />
            </div>
            <div className="form-group">
              <label>Default Payment Terms</label>
              <select 
                name="paymentTerms"
                value={globalConfig.paymentTerms}
                onChange={handleConfigChange}
              >
                <option>Due on Receipt</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 60</option>
              </select>
            </div>
          </div>

          <div className={styles.formFooter}>
            <button 
              type="submit" 
              className="button primary" 
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* --- PRICE LISTS CARD --- */}
      <div className={styles.sectionHeader}>
        <div>
          <h3>Price Lists</h3>
          <p>Manage pricing tiers for different client groups.</p>
        </div>
        <div className={styles.actions}>
          <button className="button text" onClick={() => navigate('/lab-settings/price-lists')}>
            View Matrix
          </button>
          <button className="button secondary" onClick={() => setIsModalOpen(true)}>
            + New Price List
          </button>
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>List Name</th>
              <th>Currency</th>
              <th>Description</th>
              <th className={styles.actionCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {priceLists.map(pl => (
              <tr key={pl.id} onClick={() => navigate(`/lab-settings/price-lists/${pl.id}`)} className={styles.clickableRow}>
                <td>
                  <strong>{pl.name}</strong>
                </td>
                <td>{pl.currency}</td>
                <td className={styles.descCell}>{pl.description || '-'}</td>
                <td className={styles.actionCell}>
                  <button 
                    className="button secondary small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/lab-settings/price-lists/${pl.id}`);
                    }}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {priceLists.length === 0 && (
              <tr>
                <td colSpan="4" className={styles.emptyState}>No price lists defined.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL --- */}
      <PriceListModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateList}
        isDeleting={null}
      />

    </div>
  );
};

export default LabFinancialSettings;