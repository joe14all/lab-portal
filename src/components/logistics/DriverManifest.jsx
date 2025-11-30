import React, { useState, useEffect } from 'react';
import { useLogistics, useToast } from '../../contexts';
import { IconCheck, IconTruck } from '../../layouts/components/LabIcons';
import StatusBadge from '../cases/StatusBadge';
import { cacheOfflineData, getCachedData } from '../../utils/performance/offlineSync';
import { 
  queueStopUpdate, 
  setupAutoSync, 
  getActionCounts,
  isOnline 
} from '../../utils/logistics/offlineQueue';
import { LabEventBus, EVENTS } from '../../utils/eventBus';
import SignaturePad from './SignaturePad';
import PhotoUpload from './PhotoUpload';
import styles from './DriverManifest.module.css';

const DriverManifest = () => {
  const { myRoutes, updateRouteStopStatus, skipRouteStop } = useLogistics();
  const { addToast } = useToast();
  
  // For demo, assume active route is the first "InProgress" one
  const activeRoute = myRoutes.find(r => r.status === 'InProgress') || myRoutes[0];

  // Local state for active stop interaction
  // eslint-disable-next-line no-unused-vars
  const [activeStopId, setActiveStopId] = useState(null);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [stopToSkip, setStopToSkip] = useState(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipNotes, setSkipNotes] = useState('');
  const [offline, setOffline] = useState(!isOnline());
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  // Signature and photo state
  const [stopSignatures, setStopSignatures] = useState({});
  const [stopPhotos, setStopPhotos] = useState({});
  const [activeSignatureStop, setActiveSignatureStop] = useState(null);

  // Pull-to-refresh state
  const [isPulling, setIsPulling] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const PULL_THRESHOLD = 80; // pixels to trigger refresh

  // Cache route data for offline access
  useEffect(() => {
    const cacheRouteData = async () => {
      if (activeRoute && isOnline()) {
        try {
          const cacheKey = `driver-manifest-${activeRoute.id}`;
          const ttl = 8 * 60 * 60 * 1000; // 8 hours
          await cacheOfflineData(cacheKey, activeRoute, ttl);
          console.log(`[OFFLINE] Cached route ${activeRoute.id} for offline access`);
        } catch (err) {
          console.error('Failed to cache route:', err);
        }
      }
    };

    cacheRouteData();
  }, [activeRoute]);

  // Load cached data when offline
  useEffect(() => {
    const loadCachedData = async () => {
      if (!isOnline() && activeRoute) {
        try {
          const cacheKey = `driver-manifest-${activeRoute.id}`;
          const cached = await getCachedData(cacheKey);
          if (cached) {
            // Use cached data if needed for offline mode
            addToast('Loaded cached manifest (offline mode)', 'info');
          }
        } catch (err) {
          console.error('Failed to load cached data:', err);
        }
      }
    };

    loadCachedData();
  }, [activeRoute, addToast]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      addToast('Connection restored - syncing pending actions', 'success');
      updatePendingCount();
    };

    const handleOffline = () => {
      setOffline(true);
      addToast('You are offline - actions will be queued for sync', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  // Setup auto-sync for queued actions
  useEffect(() => {
    const apiHandlers = {
      UPDATE_STOP_STATUS: async (payload) => {
        const { stopId, status, proofOfService } = payload;
        await updateRouteStopStatus(activeRoute.id, stopId, status, proofOfService);
      },
      SKIP_STOP: async (payload) => {
        const { stopId, skipReason: reason, skipNotes: notes } = payload;
        await skipRouteStop(activeRoute.id, stopId, reason, notes);
      },
    };

    const cleanup = setupAutoSync(apiHandlers, 30000); // Sync every 30 seconds

    return cleanup;
  }, [activeRoute, updateRouteStopStatus, skipRouteStop]);

  // Update pending actions count
  const updatePendingCount = async () => {
    try {
      const counts = await getActionCounts();
      setPendingActionsCount(counts.pending);
    } catch (err) {
      console.error('Failed to get action counts:', err);
    }
  };

  // Poll for pending action count
  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time route updates
  useEffect(() => {
    if (!activeRoute) return;

    const handleRouteUpdate = (data) => {
      if (data.routeId === activeRoute.id) {
        addToast('Route updated - refreshing manifest', 'info');
        // Force a re-render by triggering parent context refresh
        // In a real app, this would call refreshData() from context
      }
    };

    const handleStopAssigned = (data) => {
      if (data.routeId === activeRoute.id) {
        addToast(`New stop assigned to your route: ${data.clinicId}`, 'info');
      }
    };

    const handleStopUpdated = (data) => {
      if (data.routeId === activeRoute.id && data.stopId) {
        // Only show toast if it's not our own update
        if (!data.source || data.source !== 'self') {
          addToast(`Stop ${data.clinicId || data.stopId} updated`, 'info');
        }
      }
    };

    // Subscribe to events
    const unsubRouteUpdate = LabEventBus.subscribe(EVENTS.ROUTE_UPDATED, handleRouteUpdate);
    const unsubStopAssigned = LabEventBus.subscribe(EVENTS.STOP_ASSIGNED, handleStopAssigned);
    const unsubStopUpdated = LabEventBus.subscribe(EVENTS.STOP_UPDATED, handleStopUpdated);
    const unsubRouteOptimized = LabEventBus.subscribe(EVENTS.ROUTE_OPTIMIZED, (data) => {
      if (data.routeId === activeRoute.id) {
        addToast('Route optimized - stops reordered for efficiency', 'success');
      }
    });

    // Cleanup subscriptions
    return () => {
      unsubRouteUpdate();
      unsubStopAssigned();
      unsubStopUpdated();
      unsubRouteOptimized();
    };
  }, [activeRoute, addToast]);

  const handleAction = async (stop, action) => {
    if (action === 'start') {
      if (offline) {
        await queueStopUpdate(stop.id, 'InProgress', {});
        addToast('Action queued for sync when online', 'info');
        updatePendingCount();
      } else {
        await updateRouteStopStatus(activeRoute.id, stop.id, 'InProgress');
      }
    } else if (action === 'complete') {
      // Include signature and photos in proof of service
      const proofOfService = { 
        signedBy: 'Customer', 
        timestamp: new Date().toISOString(),
        signature: stopSignatures[stop.id] || null,
        photos: stopPhotos[stop.id] || []
      };
      
      if (offline) {
        await queueStopUpdate(stop.id, 'Completed', proofOfService);
        addToast(`Stop at ${stop.clinicId} completed (queued for sync)`, 'info');
        updatePendingCount();
      } else {
        await updateRouteStopStatus(activeRoute.id, stop.id, 'Completed', proofOfService);
        addToast(`Stop at ${stop.clinicId} completed`, 'success');
      }
      
      // Clear signature capture UI
      setActiveSignatureStop(null);
      setActiveStopId(null);
    }
  };

  // Signature handlers
  const handleSignatureSave = (stopId, signatureData) => {
    setStopSignatures(prev => ({ ...prev, [stopId]: signatureData }));
    setActiveSignatureStop(null);
    addToast('Signature captured', 'success');
  };

  const handleSignatureCancel = () => {
    setActiveSignatureStop(null);
  };

  const handlePhotosChange = (stopId, photos) => {
    setStopPhotos(prev => ({ ...prev, [stopId]: photos }));
  };

  // Navigation handler - opens Google/Apple Maps with stop coordinates
  const handleNavigate = (stop) => {
    if (!stop.coordinates || !stop.coordinates.lat || !stop.coordinates.lng) {
      addToast('Location coordinates not available for this stop', 'error');
      return;
    }

    const { lat, lng } = stop.coordinates;
    
    // Build address string if available
    const address = stop.clinicSnapshot?.address;
    let destination = `${lat},${lng}`;
    
    if (address) {
      const addressParts = [
        address.line1,
        address.city,
        address.state,
        address.zip
      ].filter(Boolean);
      destination = addressParts.join(', ');
    }

    // Universal Maps URL - works on iOS (Apple Maps) and Android/Desktop (Google Maps)
    const mapsUrl = `https://maps.google.com/maps?daddr=${encodeURIComponent(destination)}`;
    
    // Open in new tab/window (desktop) or Maps app (mobile)
    window.open(mapsUrl, '_blank');
    
    addToast('Opening navigation...', 'info');
  };

  const handleSkipClick = (stop) => {
    setStopToSkip(stop);
    setSkipModalOpen(true);
  };

  const handleSkipConfirm = async () => {
    if (!skipReason) {
      addToast('Please select a reason for skipping', 'error');
      return;
    }
    
    try {
      if (offline) {
        // Queue skip action for later sync
        const { queueAction } = await import('../../utils/logistics/offlineQueue');
        await queueAction('SKIP_STOP', {
          stopId: stopToSkip.id,
          skipReason,
          skipNotes
        });
        addToast(`Stop at ${stopToSkip.clinicId} skipped (queued for sync)`, 'info');
        updatePendingCount();
      } else {
        await skipRouteStop(activeRoute.id, stopToSkip.id, skipReason, skipNotes);
        addToast(`Stop at ${stopToSkip.clinicId} skipped and reported to dispatcher`, 'warning');
      }
      
      // Reset modal state
      setSkipModalOpen(false);
      setStopToSkip(null);
      setSkipReason('');
      setSkipNotes('');
      setActiveStopId(null);
    } catch (err) {
      console.error('Failed to skip stop:', err);
      addToast('Failed to skip stop', 'error');
    }
  };

  const handleSkipCancel = () => {
    setSkipModalOpen(false);
    setStopToSkip(null);
    setSkipReason('');
    setSkipNotes('');
  };

  // Pull-to-refresh handlers for mobile
  const handleTouchStart = (e) => {
    // Only trigger if scrolled to top
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || pullStartY === 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;
    
    // Only allow pulling down
    if (distance > 0) {
      setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
      
      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD) {
      // Trigger refresh
      addToast('Refreshing route data...', 'info');
      
      try {
        // In a real app, this would call refreshData() from LogisticsContext
        // For now, we simulate a refresh
        await new Promise(resolve => setTimeout(resolve, 1000));
        addToast('Route updated', 'success');
      } catch (err) {
        console.error('Failed to refresh route:', err);
        addToast('Failed to refresh route', 'error');
      }
    }
    
    // Reset pull state
    setIsPulling(false);
    setPullStartY(0);
    setPullDistance(0);
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
  const skippedCount = activeRoute.stops.filter(s => s.status === 'Skipped').length;
  const processedCount = completedCount + skippedCount;

  return (
    <div 
      className={styles.manifestContainer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        overflowY: 'auto'
      }}
    >
      
      {/* Pull-to-refresh indicator */}
      {isPulling && pullDistance > 0 && (
        <div className={styles.pullIndicator} style={{
          height: `${pullDistance}px`,
          opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
        }}>
          <div className={styles.pullIcon}>
            {pullDistance >= PULL_THRESHOLD ? '↓' : '↻'}
          </div>
          <div className={styles.pullText}>
            {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}
      
      {/* Offline Status Indicator */}
      {offline && (
        <div className={styles.offlineBanner}>
          <div className={styles.offlineIcon}>📡</div>
          <div className={styles.offlineText}>
            <strong>Offline Mode</strong>
            <span>Actions will sync when connection is restored</span>
          </div>
          {pendingActionsCount > 0 && (
            <div className={styles.pendingBadge}>
              {pendingActionsCount} pending
            </div>
          )}
        </div>
      )}

      {/* Pending Sync Indicator (when online) */}
      {!offline && pendingActionsCount > 0 && (
        <div className={styles.syncBanner}>
          <div className={styles.syncIcon}>⏳</div>
          <div className={styles.syncText}>
            <strong>Syncing...</strong>
            <span>{pendingActionsCount} action{pendingActionsCount > 1 ? 's' : ''} pending</span>
          </div>
        </div>
      )}
      
      {/* Route Header */}
      <div className={styles.routeCard}>
        <div className={styles.header}>{activeRoute.name}</div>
        <div className={styles.progress}>
          {completedCount} of {activeRoute.stops.length} Stops Completed
          {skippedCount > 0 && <span style={{color: 'var(--warning-600)', marginLeft: '0.5rem'}}>({skippedCount} skipped)</span>}
        </div>
        <div style={{height:'6px', background:'var(--neutral-200)', borderRadius:'3px', marginTop:'0.5rem'}}>
          <div style={{
            height:'100%', 
            background:'var(--success-500)', 
            borderRadius:'3px', 
            width: `${(processedCount / activeRoute.stops.length) * 100}%`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {activeRoute.stops.map((stop, index) => {
          const prevStop = index > 0 ? activeRoute.stops[index - 1] : null;
          const isNext = index === 0 || (prevStop && (prevStop.status === 'Completed' || prevStop.status === 'Skipped'));
          const isActive = stop.status === 'InProgress';
          const isDone = stop.status === 'Completed';
          const isSkipped = stop.status === 'Skipped';
          
          let statusClass = styles.stopPending;
          if (isActive) statusClass = styles.stopInProgress;
          if (isDone) statusClass = styles.stopCompleted;
          if (isSkipped) statusClass = styles.stopSkipped;

          return (
            <div key={stop.id} className={`${styles.stopCard} ${statusClass}`}>
              <div className={styles.stopHeader}>
                <span className={styles.stopTitle}>
                  {index + 1}. {stop.clinicId}
                </span>
                <div className={styles.stopBadgeContainer}>
                  <span className={styles.taskTypeIcon}>
                    {stop.type === 'Pickup' ? '📦' : '🚚'} {stop.type}
                  </span>
                  <StatusBadge 
                    status={stop.status === 'Pending' ? 'stage-new' : 
                            stop.status === 'InProgress' ? 'stage-processing' : 
                            stop.status === 'Completed' ? 'stage-delivered' : 
                            stop.status === 'Skipped' ? 'stage-hold' : 'stage-new'}
                  />
                </div>
              </div>
              
              {!isDone && (
                <div className={styles.address}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem'}}>
                    <div style={{flex: 1}}>
                      <p style={{margin:0}}>
                        {stop.clinicSnapshot?.address?.line1 || '123 Main St, Suite 100'}
                      </p>
                      <p style={{margin:0, fontSize:'0.8rem', marginTop:'4px'}}>
                        Note: {stop.driverInstructions || stop.pickupTasks?.[0]?.notes || 'No instructions'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => handleNavigate(stop)}
                      aria-label="Navigate to this location"
                      title="Open in Maps app"
                      style={{whiteSpace: 'nowrap'}}
                    >
                      🧭 Navigate
                    </button>
                  </div>
                </div>
              )}

              {/* Action Area */}
              {!isDone && !isSkipped && (
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
                      {/* Signature Capture */}
                      {activeSignatureStop === stop.id ? (
                        <SignaturePad
                          onSave={(signatureData) => handleSignatureSave(stop.id, signatureData)}
                          onCancel={handleSignatureCancel}
                          initialSignature={stopSignatures[stop.id]}
                        />
                      ) : (
                        <div className={styles.signatureBox}>
                          {stopSignatures[stop.id] ? (
                            <div className={styles.signaturePreview}>
                              <img 
                                src={stopSignatures[stop.id]} 
                                alt="Customer signature" 
                                className={styles.signatureImage}
                              />
                              <button
                                type="button"
                                className="button secondary small"
                                onClick={() => setActiveSignatureStop(stop.id)}
                                aria-label="Re-capture signature"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.signaturePlaceholder}
                              onClick={() => setActiveSignatureStop(stop.id)}
                              aria-label="Capture customer signature"
                            >
                              ✍️ Tap to capture signature
                            </button>
                          )}
                        </div>
                      )}

                      {/* Photo Upload */}
                      {activeSignatureStop !== stop.id && (
                        <div style={{marginTop: '0.75rem'}}>
                          <PhotoUpload
                            photos={stopPhotos[stop.id] || []}
                            onPhotosChange={(photos) => handlePhotosChange(stop.id, photos)}
                            maxPhotos={3}
                          />
                        </div>
                      )}

                      <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.75rem'}}>
                        <button 
                          className="button secondary"
                          style={{flex: 1}}
                          onClick={() => handleSkipClick(stop)}
                        >
                          Skip & Report
                        </button>
                        <button 
                          className={styles.completeBtn}
                          style={{flex: 2}}
                          onClick={() => handleAction(stop, 'complete')}
                          disabled={!stopSignatures[stop.id]}
                          title={!stopSignatures[stop.id] ? 'Signature required to complete' : ''}
                        >
                          Complete {stop.type}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isDone && (
                <div style={{fontSize:'0.8rem', color:'var(--success-600)', display:'flex', alignItems:'center', gap:'0.25rem'}}>
                  <IconCheck width="14" /> Completed at {new Date(stop.completedAt).toLocaleTimeString()}
                </div>
              )}

              {isSkipped && (
                <div style={{fontSize:'0.8rem', color:'var(--warning-600)'}}>
                  <div style={{fontWeight: 600, marginBottom: '0.25rem'}}>⚠️ Skipped - Requires Follow-up</div>
                  <div>Reason: {stop.skipReason}</div>
                  {stop.skipNotes && <div style={{marginTop: '0.25rem', fontStyle: 'italic'}}>Notes: {stop.skipNotes}</div>}
                  <div style={{opacity: 0.7, marginTop: '0.25rem'}}>Skipped at {new Date(stop.skippedAt).toLocaleTimeString()}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Skip Stop Modal */}
      {skipModalOpen && stopToSkip && (
        <div className={styles.modalOverlay} onClick={handleSkipCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Skip Stop & Report Issue</h2>
            <p className={styles.modalSubtitle}>Stop: {stopToSkip.clinicId}</p>
            
            <div className={styles.formGroup}>
              <label htmlFor="skip-reason">Reason for skipping <span style={{color: 'var(--error-color)'}}>*</span></label>
              <select
                id="skip-reason"
                className={styles.formSelect}
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
              >
                <option value="">Select a reason...</option>
                <option value="Customer not ready">Customer not ready</option>
                <option value="Access issue (gate locked, no parking)">Access issue (gate locked, no parking)</option>
                <option value="Incomplete paperwork">Incomplete paperwork</option>
                <option value="Safety concern">Safety concern</option>
                <option value="Other">Other (describe below)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="skip-notes">Additional details</label>
              <textarea
                id="skip-notes"
                className={styles.formTextarea}
                value={skipNotes}
                onChange={(e) => setSkipNotes(e.target.value)}
                placeholder="Provide additional context about why this stop needs to be skipped..."
                rows={4}
              />
            </div>

            <div className={styles.modalAlert}>
              <strong>⚠️ Note:</strong> Skipping this stop will notify the dispatcher and mark it for follow-up. You can continue to the next stop.
            </div>

            <div className={styles.modalActions}>
              <button className="button secondary" onClick={handleSkipCancel}>
                Cancel
              </button>
              <button className="button primary" onClick={handleSkipConfirm}>
                Skip & Notify Dispatcher
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverManifest;