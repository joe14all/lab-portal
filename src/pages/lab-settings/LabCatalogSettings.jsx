import React from 'react';
import { useCrm } from '../../contexts';
import styles from "./LabCatalogSettings.module.css"

const LabCatalogSettings = () => {
  const { products, addons } = useCrm();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Product Catalog</h2>
        <button className="button primary">+ Add Product</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-hover)', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Product Name</th>
              <th style={{ padding: '1rem' }}>Category</th>
              <th style={{ padding: '1rem' }}>Turnaround</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}><strong>{p.name}</strong><br/><small style={{color:'var(--text-secondary)'}}>{p.sku}</small></td>
                <td style={{ padding: '1rem' }}>{p.category}</td>
                <td style={{ padding: '1rem' }}>{p.turnaroundDays} Days</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Add-ons & Upgrades</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-hover)', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Add-on Name</th>
              <th style={{ padding: '1rem' }}>Price Impact</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {addons.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{a.name}</td>
                <td style={{ padding: '1rem' }}>+${a.defaultPrice.toFixed(2)}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LabCatalogSettings;