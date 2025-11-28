import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { useCrm } from '../../contexts';
import { IconInvoice, IconClose, IconMill } from '../../layouts/components/LabIcons';
import styles from './InvoiceFormModal.module.css';

const DEFAULT_ITEM = {
  productId: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
  itemType: 'Production'
};

const InvoiceFormModal = ({ isOpen, onClose, onSubmit }) => {
  const { clinics, products } = useCrm();
  
  const [formData, setFormData] = useState({
    clinicId: '',
    dueDate: '',
    notes: '',
    items: [{ ...DEFAULT_ITEM, id: Date.now() }]
  });

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setFormData({
        clinicId: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
        notes: '',
        items: [{ ...DEFAULT_ITEM, id: Date.now() }]
      });
    }
  }, [isOpen]);

  // --- Calculations ---
  const totals = useMemo(() => {
    return formData.items.reduce((acc, item) => {
      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const taxAmount = lineTotal * ((item.taxRate || 0) / 100);
      return {
        subtotal: acc.subtotal + lineTotal,
        tax: acc.tax + taxAmount,
        total: acc.total + lineTotal + taxAmount
      };
    }, { subtotal: 0, tax: 0, total: 0 });
  }, [formData.items]);

  // --- Handlers ---
  const handleItemChange = (id, field, value) => {
    const newItems = formData.items.map(item => {
      if (item.id !== id) return item;
      
      let updates = { [field]: value };
      
      // Auto-fill details if Product is selected
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updates = {
            ...updates,
            description: prod.name,
            unitPrice: prod.defaultPrice,
            itemType: 'Production' // Default
          };
        }
      }
      return { ...item, ...updates };
    });
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ...DEFAULT_ITEM, id: Date.now() }]
    });
  };

  const removeItem = (id) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== id)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Prepare payload matching the Data Model
    const payload = {
      clinicId: formData.clinicId,
      dueDate: formData.dueDate,
      notes: formData.notes,
      items: formData.items.map(({ id, ...item }) => ({
        ...item,
        taxAmount: (item.quantity * item.unitPrice) * (item.taxRate / 100),
        total: (item.quantity * item.unitPrice)
      })),
      currency: 'USD',
      status: 'Draft'
    };
    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Invoice"
      icon={<IconInvoice width="20" />}
      width="800px"
      footer={
        <div className={styles.footer}>
          <div className={styles.totalsDisplay}>
            <span>Sub: ${totals.subtotal.toFixed(2)}</span>
            <span>Tax: ${totals.tax.toFixed(2)}</span>
            <span className={styles.finalTotal}>Total: ${totals.total.toFixed(2)}</span>
          </div>
          <div className={styles.actions}>
            <button className="button text" onClick={onClose}>Cancel</button>
            <button className="button primary" onClick={handleSubmit} disabled={!formData.clinicId}>
              Generate Draft
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.formContainer}>
        {/* Header Fields */}
        <div className={styles.row}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Bill To Clinic *</label>
            <select 
              value={formData.clinicId}
              onChange={e => setFormData({...formData, clinicId: e.target.value})}
            >
              <option value="">Select Clinic...</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Due Date</label>
            <input 
              type="date" 
              value={formData.dueDate}
              onChange={e => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className={styles.itemsSection}>
          <div className={styles.itemsHeader}>
            <span style={{flex: 2}}>Product / Description</span>
            <span style={{width: '80px'}}>Type</span>
            <span style={{width: '60px'}}>Qty</span>
            <span style={{width: '80px'}}>Price</span>
            <span style={{width: '60px'}}>Tax %</span>
            <span style={{width: '80px', textAlign: 'right'}}>Total</span>
            <span style={{width: '30px'}}></span>
          </div>
          
          <div className={styles.itemsList}>
            {formData.items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <div style={{flex: 2, display: 'flex', gap: '0.5rem'}}>
                  <select 
                    style={{width: '120px'}}
                    value={item.productId}
                    onChange={e => handleItemChange(item.id, 'productId', e.target.value)}
                  >
                    <option value="">Custom...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Description"
                    value={item.description}
                    onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                    style={{flex: 1}}
                  />
                </div>
                
                <select 
                  style={{width: '80px'}}
                  value={item.itemType}
                  onChange={e => handleItemChange(item.id, 'itemType', e.target.value)}
                >
                  <option>Production</option>
                  <option>Fee</option>
                  <option>Service</option>
                </select>

                <input 
                  type="number" 
                  style={{width: '60px'}}
                  value={item.quantity}
                  min="1"
                  onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                />

                <input 
                  type="number" 
                  style={{width: '80px'}}
                  value={item.unitPrice}
                  step="0.01"
                  onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                />

                <input 
                  type="number" 
                  style={{width: '60px'}}
                  value={item.taxRate}
                  min="0"
                  onChange={e => handleItemChange(item.id, 'taxRate', parseFloat(e.target.value))}
                />

                <span style={{width: '80px', textAlign: 'right', fontWeight: 500}}>
                  ${((item.quantity * item.unitPrice) * (1 + item.taxRate/100)).toFixed(2)}
                </span>

                <button 
                  className={styles.removeBtn} 
                  onClick={() => removeItem(item.id)}
                >
                  <IconClose width="14" />
                </button>
              </div>
            ))}
          </div>
          
          <button className="button secondary small" onClick={addItem} style={{marginTop: '1rem'}}>
            + Add Line Item
          </button>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea 
            rows={2}
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            placeholder="Payment instructions or internal notes..."
          />
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceFormModal;