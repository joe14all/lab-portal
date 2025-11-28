import React from 'react';
import { useProduction,useProcurement } from '../../../contexts';
import { IconAlert, IconTruck, IconCheck, IconSearch } from '../../../layouts/components/LabIcons';
import styles from "./ProcurementDashboard.module.css"

const ProcurementDashboard = () => {
  const { lowStockMaterials, materials } = useProduction();
  const { cart, purchaseOrders, addToCart, removeFromCart, checkout, receiveOrder } = useProcurement();

  // Helper to check if item is in cart
  const isInCart = (id) => cart.some(c => c.materialId === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Procurement</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Manage inventory replenishment and vendor orders.</p>
        </div>
        <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
          <strong>${cart.reduce((sum, i) => sum + (i.currentPrice * i.quantity), 0).toFixed(2)}</strong> Pending
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        
        {/* LEFT COL: Needs Attention */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Low Stock Alerts */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconAlert width="20" style={{ color: 'var(--error-500)' }} /> 
              Restock Needed ({lowStockMaterials.length})
            </h3>
            
            {lowStockMaterials.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Inventory levels healthy.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lowStockMaterials.map(mat => (
                  <div key={mat.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem', backgroundColor: 'var(--bg-body)', borderRadius: '0.5rem', border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{mat.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {mat.stockLevel} {mat.unit} remaining (Min: {mat.reorderThreshold})
                      </div>
                    </div>
                    {isInCart(mat.id) ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success-500)', fontWeight: 600 }}>In Cart</span>
                    ) : (
                      <button className="button secondary small" onClick={() => addToCart(mat)}>Add to Order</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Orders */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconTruck width="20" /> Active Purchase Orders
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>PO #</th>
                  <th style={{ padding: '0.5rem' }}>Vendor</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.filter(p => p.status !== 'Received').map(po => (
                  <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{po.id}</td>
                    <td style={{ padding: '0.5rem' }}>{po.vendorId}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--primary-50)', color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {po.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button className="button secondary small" onClick={() => receiveOrder(po.id)}>
                        Receive
                      </button>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.filter(p => p.status !== 'Received').length === 0 && (
                  <tr><td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active orders.</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT COL: Order Draft */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Order Draft</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {cart.length} items ready for checkout
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                Cart is empty.
              </div>
            ) : cart.map(item => (
              <div key={item.materialId} style={{ paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span>{item.name}</span>
                  <button 
                    style={{ border: 'none', background: 'none', color: 'var(--error-500)', cursor: 'pointer' }}
                    onClick={() => removeFromCart(item.materialId)}
                  >
                    &times;
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.vendorId}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>Qty: {item.quantity}</span>
                    <strong style={{ fontSize: '0.9rem' }}>${(item.currentPrice * item.quantity).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button 
              className="button primary" 
              style={{ width: '100%' }}
              disabled={cart.length === 0}
              onClick={checkout}
            >
              Submit Purchase Orders
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProcurementDashboard;