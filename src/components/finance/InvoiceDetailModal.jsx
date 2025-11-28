import React from 'react';
import Modal from '../common/Modal';
import { IconInvoice } from '../../layouts/components/LabIcons';
import styles from './InvoiceDetailModal.module.css';

const InvoiceDetailModal = ({ invoice, isOpen, onClose }) => {
  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice #${invoice.invoiceNumber}`}
      icon={<IconInvoice />}
      width="700px"
      footer={<button className="button primary" onClick={onClose}>Close</button>}
    >
      <div className={styles.container}>
        {/* Top Meta */}
        <div className={styles.header}>
          <div className={styles.metaGroup}>
            <span className={styles.label}>Issued</span>
            <span className={styles.val}>{new Date(invoice.issueDate || Date.now()).toLocaleDateString()}</span>
          </div>
          <div className={styles.metaGroup}>
            <span className={styles.label}>Due</span>
            <span className={styles.val}>{new Date(invoice.dueDate).toLocaleDateString()}</span>
          </div>
          <div className={styles.metaGroup}>
            <span className={styles.label}>Status</span>
            <span className={`${styles.statusBadge} ${styles[invoice.status]}`}>{invoice.status}</span>
          </div>
        </div>

        {/* Table */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{textAlign:'center'}}>Type</th>
              <th style={{textAlign:'center'}}>Qty</th>
              <th style={{textAlign:'right'}}>Price</th>
              <th style={{textAlign:'right'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map(item => (
              <tr key={item.id}>
                <td>
                  <strong>{item.patientName}</strong><br/>
                  <span className={styles.subText}>{item.description}</span>
                </td>
                <td style={{textAlign:'center'}}>{item.itemType}</td>
                <td style={{textAlign:'center'}}>{item.quantity}</td>
                <td style={{textAlign:'right'}}>${item.unitPrice.toFixed(2)}</td>
                <td style={{textAlign:'right'}}>${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Tax:</span>
            <span>${invoice.taxTotal.toFixed(2)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>Grand Total:</span>
            <span>${invoice.totalAmount.toFixed(2)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.balance}`}>
            <span>Balance Due:</span>
            <span>${invoice.balanceDue.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceDetailModal;