import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { IconInvoice } from '../../../layouts/components/LabIcons';
import { COUNTRIES } from '../../../constants';
import styles from './PriceListModal.module.css';

const PriceListModal = ({ isOpen, onClose, onSubmit, initialData, isDeleting }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'USD',
    effectiveDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen) {
      const nextData = initialData ? {
        name: initialData.name || '',
        description: initialData.description || '',
        currency: initialData.currency || 'USD',
        effectiveDate: initialData.effectiveDate ? initialData.effectiveDate.split('T')[0] : new Date().toISOString().split('T')[0]
      } : {
        name: '',
        description: '',
        currency: 'USD',
        effectiveDate: new Date().toISOString().split('T')[0]
      };

      setFormData(prev => {
        if (JSON.stringify(prev) === JSON.stringify(nextData)) return prev;
        return nextData;
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Price List" : "New Price List"}
      icon={<IconInvoice width="20" height="20" />}
      width="500px"
      footer={
        <div className={styles.footer}>
          {initialData ? (
            <button 
              type="button" 
              className="button secondary danger" 
              onClick={isDeleting}
            >
              Delete List
            </button>
          ) : <div />}
          
          <div className={styles.actions}>
            <button type="button" className="button text" onClick={onClose}>Cancel</button>
            <button type="submit" form="plForm" className="button primary">Save</button>
          </div>
        </div>
      }
    >
      <form id="plForm" onSubmit={handleSubmit} className={styles.form}>
        <div className="form-group">
          <label>List Name *</label>
          <input 
            required
            type="text" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., 2025 Standard Pricing"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            rows={3}
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="Internal notes about this price list..."
            className={styles.textarea}
          />
        </div>

        <div className={styles.grid}>
          <div className="form-group">
            <label>Currency</label>
            <select 
              value={formData.currency} 
              onChange={e => setFormData({...formData, currency: e.target.value})}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.currency}>
                  {c.currency} ({c.symbol}) - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Effective Date</label>
            <input 
              type="date" 
              value={formData.effectiveDate} 
              onChange={e => setFormData({...formData, effectiveDate: e.target.value})}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default PriceListModal;