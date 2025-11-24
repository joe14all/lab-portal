import React from 'react';
import { useCrm } from '../../contexts';
import styles from "./LabFinancialSettings.module.css"

const LabFinancialSettings = () => {
  const { priceLists } = useCrm();

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Financial Settings</h2>

      <div className="card">
        <h3>Global Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label>Base Currency</label>
            <select disabled style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
              <option>USD ($)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tax Rate (%)</label>
            <input type="number" defaultValue="0.00" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '2rem' }}>
        <h3>Price Lists</h3>
        <button className="button secondary">+ New Price List</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-hover)', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>List Name</th>
              <th style={{ padding: '1rem' }}>Description</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {priceLists.map(pl => (
              <tr key={pl.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}><strong>{pl.name}</strong></td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{pl.description}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LabFinancialSettings;