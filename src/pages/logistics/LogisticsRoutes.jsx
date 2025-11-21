import React from 'react';
import { useLogistics } from '../../contexts';

const LogisticsRoutes = () => {
  const { routes, pickups, loading, error } = useLogistics();

  if (loading) return <div className="card">Loading Logistics Data...</div>;
  if (error) return <div className="card error-text">Error loading logistics: {error}</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Logistics & Route Management</h1>
      <p>Real-time tracking of pickups and deliveries for in-house drivers.</p>

      {/* Routes Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Active Routes ({routes.length})</h2>
        {routes.map(route => (
          <div key={route.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--primary)' }}>
              {route.name} - Driver: {route.driverId}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Status: {route.status} | Stops: {route.stops.length}
            </p>
          </div>
        ))}
      </div>

      {/* Pickups Section */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem' }}>Pending Pickup Requests ({pickups.length})</h2>
        {pickups.map(pickup => (
          <div key={pickup.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500 }}>
              Clinic: {pickup.clinicId} | Status: {pickup.status}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Requested: {new Date(pickup.requestTime).toLocaleTimeString()} | Note: {pickup.notes}
            </p>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default LogisticsRoutes;