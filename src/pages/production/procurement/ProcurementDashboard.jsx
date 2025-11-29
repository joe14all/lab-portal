import React from 'react';
import { useProduction, useProcurement } from '../../../contexts';
import { IconAlert, IconTruck, IconTrash } from '../../../layouts/components/LabIcons';
import styles from "./ProcurementDashboard.module.css";

const ProcurementDashboard = () => {
  const { lowStockMaterials } = useProduction();
  const { cart, purchaseOrders, addToCart, removeFromCart, checkout, receiveOrder } = useProcurement();

  // Helper to check if item is in cart
  const isInCart = (id) => cart.some(c => c.materialId === id);

  // Calculate pending total
  const pendingTotal = cart.reduce((sum, i) => sum + (i.currentPrice * i.quantity), 0);

  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Procurement</h1>
          <p>Manage inventory replenishment and vendor orders.</p>
        </div>
        <div className={styles.totalBadge}>
          <strong>${pendingTotal.toFixed(2)}</strong> Pending
        </div>
      </div>

      <div className={styles.mainGrid}>
        
        {/* LEFT COL: Needs Attention */}
        <div className={styles.leftCol}>
          
          {/* Low Stock Alerts */}
          <div className="card">
            <h3 className={styles.cardTitle}>
              <IconAlert width="20" className={styles.iconAlert} /> 
              Restock Needed ({lowStockMaterials.length})
            </h3>
            
            {lowStockMaterials.length === 0 ? (
              <p className={styles.emptyState}>Inventory levels healthy.</p>
            ) : (
              <div className={styles.alertList}>
                {lowStockMaterials.map(mat => (
                  <div key={mat.id} className={styles.alertItem}>
                    <div>
                      <div className={styles.itemName}>{mat.name}</div>
                      <div className={styles.itemMeta}>
                        {mat.stockLevel} {mat.unit} remaining (Min: {mat.reorderThreshold})
                      </div>
                    </div>
                    {isInCart(mat.id) ? (
                      <span className={styles.inCartBadge}>In Cart</span>
                    ) : (
                      <button className="button secondary small" onClick={() => addToCart(mat)}>
                        Add to Order
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Orders */}
          <div className="card">
            <h3 className={styles.cardTitle}>
              <IconTruck width="20" /> Active Purchase Orders
            </h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.filter(p => p.status !== 'Received').map(po => (
                  <tr key={po.id}>
                    <td className={styles.monoText}>{po.id}</td>
                    <td>{po.vendorId}</td>
                    <td>
                      <span className={styles.statusBadge}>
                        {po.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="button secondary small" onClick={() => receiveOrder(po.id)}>
                        Receive
                      </button>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.filter(p => p.status !== 'Received').length === 0 && (
                  <tr>
                    <td colSpan="4" className={styles.emptyTable}>No active orders.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT COL: Order Draft */}
        <div className={`card ${styles.cartCard}`}>
          <div className={styles.cartHeader}>
            <h3>Order Draft</h3>
            <p>{cart.length} items ready for checkout</p>
          </div>

          <div className={styles.cartList}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>
                Cart is empty.
              </div>
            ) : cart.map(item => (
              <div key={item.materialId} className={styles.cartItem}>
                <div className={styles.cartItemTop}>
                  <span>{item.name}</span>
                  <button 
                    className={styles.removeBtn}
                    onClick={() => removeFromCart(item.materialId)}
                    title="Remove item"
                  >
                    <IconTrash width="14" />
                  </button>
                </div>
                <div className={styles.cartItemBottom}>
                  <span className={styles.vendorName}>{item.vendorId}</span>
                  <div className={styles.priceGroup}>
                    <span>Qty: {item.quantity}</span>
                    <strong>${(item.currentPrice * item.quantity).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.cartFooter}>
            <button 
              className="button primary full-width" 
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