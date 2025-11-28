import React, { useState } from 'react';
import { useLogistics, useToast } from '../../contexts';
import { IconCheck, IconTruck } from '../../layouts/components/LabIcons';
import styles from './DriverManifest.module.css';

const DriverManifest = () => {
  const { myRoutes, updateRouteStopStatus } = useLogistics();
  const { addToast } = useToast();
  
  // For demo, assume active route is the first "InProgress" one
  const activeRoute = myRoutes.find(r => r.status === 'InProgress') || myRoutes[0];

  // Local state for active stop interaction
  // eslint-disable-next-line no-unused-vars
  const [activeStopId, setActiveStopId] = useState(null);

  const handleAction = async (stop, action) => {
    if (action === 'start') {
      await updateRouteStopStatus(activeRoute.id, stop.id, 'InProgress');
    } else if (action === 'complete') {
      // Simulate signature
      await updateRouteStopStatus(activeRoute.id, stop.id, 'Completed', { signedBy: 'Front Desk' });
      setActiveStopId(null);
      addToast(`Stop at ${stop.clinicId} completed`, 'success');
    }
  };

  if (!activeRoute) {
    return (
      <div className={styles.manifestContainer}>
        <div className={styles.routeCard} style={{textAlign:'center', padding:'2rem'}}>
          <IconTruck width="48" style={{color:'var(--text-secondary)', marginBottom:'1rem'}} />
          <h3>No Active Route</h3>
          <p>You have no assigned routes for today.</p>
        </div>
      </div>
    );
  }

  const completedCount = activeRoute.stops.filter(s => s.status === 'Completed').length;

  return (
    <div className={styles.manifestContainer}>
      
      {/* Route Header */}
      <div className={styles.routeCard}>
        <div className={styles.header}>{activeRoute.name}</div>
        <div className={styles.progress}>
          {completedCount} of {activeRoute.stops.length} Stops Completed
        </div>
        <div style={{height:'6px', background:'var(--neutral-200)', borderRadius:'3px', marginTop:'0.5rem'}}>
          <div style={{
            height:'100%', 
            background:'var(--success-500)', 
            borderRadius:'3px', 
            width: `${(completedCount / activeRoute.stops.length) * 100}%`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {activeRoute.stops.map((stop, index) => {
          const isNext = index === 0 || activeRoute.stops[index-1].status === 'Completed';
          const isActive = stop.status === 'InProgress';
          const isDone = stop.status === 'Completed';
          
          let statusClass = styles.stopPending;
          if (isActive) statusClass = styles.stopInProgress;
          if (isDone) statusClass = styles.stopCompleted;

          return (
            <div key={stop.id} className={`${styles.stopCard} ${statusClass}`}>
              <div className={styles.stopHeader}>
                <span className={styles.stopTitle}>
                  {index + 1}. {stop.clinicId}
                </span>
                <span className={styles.stopBadge}>{stop.type}</span>
              </div>
              
              {!isDone && (
                <div className={styles.address}>
                  <p style={{margin:0}}>123 Main St, Suite 100</p>
                  <p style={{margin:0, fontSize:'0.8rem', marginTop:'4px'}}>Note: {stop.driverInstructions || stop.pickupTasks?.[0]?.notes || 'No instructions'}</p>
                </div>
              )}

              {/* Action Area */}
              {!isDone && (
                <div className={styles.actions}>
                  {!isActive ? (
                    <button 
                      className="button secondary" 
                      style={{width:'100%'}}
                      disabled={!isNext} // Enforce sequence
                      onClick={() => handleAction(stop, 'start')}
                    >
                      {isNext ? 'Start Stop' : 'Locked'}
                    </button>
                  ) : (
                    <div style={{width:'100%'}}>
                      <div className={styles.signatureBox}>
                        [ Signature Pad Placeholder ]
                      </div>
                      <button 
                        className={styles.completeBtn}
                        onClick={() => handleAction(stop, 'complete')}
                      >
                        Complete {stop.type}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isDone && (
                <div style={{fontSize:'0.8rem', color:'var(--success-600)', display:'flex', alignItems:'center', gap:'0.25rem'}}>
                  <IconCheck width="14" /> Completed at {new Date(stop.completedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default DriverManifest;