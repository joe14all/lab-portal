import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { List } from 'react-window';
import { useLogistics, useCrm, useToast } from '../../contexts';
import { IconTruck, IconBox, IconChevronRight } from '../../layouts/components/LabIcons';
import StatusBadge from '../cases/StatusBadge';
import MapView from './MapView';
import SearchBar from '../common/SearchBar';
import { LabEventBus, EVENTS } from '../../utils/eventBus';
import styles from './RoutePlanner.module.css';

// Drag and Drop Type
const ItemTypes = {
  TASK: 'task'
};

// Draggable Task Card Component
const DraggableTaskCard = ({ task, isSelected, onSelect, selectedCount }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { task, isSelected, selectedCount },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const handleClick = (e) => {
    // Support shift+click for multi-select
    onSelect(task, e.shiftKey);
  };

  return (
    <div
      ref={drag}
      className={`
        ${styles.taskCard} 
        ${task.type === 'Pickup' ? styles.taskPickup : styles.taskDelivery}
        ${isSelected ? styles.taskSelected : ''}
        ${isDragging ? styles.taskDragging : ''}
        ${task.isRush ? styles.taskRush : ''}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${task.type} task for ${task.clinicId}. ${task.isRush ? 'Rush priority. ' : ''}${task.notes}`}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(task, false)}
    >
      {isSelected && selectedCount > 1 && (
        <div className={styles.multiSelectBadge} aria-label={`${selectedCount} items selected`}>
          {selectedCount}
        </div>
      )}
      <div className={styles.taskHeader}>
        <div className={styles.clinicName}>
          {task.isRush && (
            <span className={styles.rushBadge}>
              <span className={styles.rushIcon}>⚡</span>
              <span>RUSH</span>
            </span>
          )}
          {task.clinicId}
        </div>
        <span className={styles.taskType}>
          {task.type === 'Pickup' ? '📦' : '🚚'} {task.type}
        </span>
      </div>
      <div className={styles.taskMeta}>
        <div className={styles.taskMetaRow}>
          {task.notes && (
            <span className={styles.metaIcon} title={task.notes}>
              📝 Note
            </span>
          )}
          {task.packageCount && (
            <span className={styles.metaIcon}>
              📦 ×{task.packageCount}
            </span>
          )}
        </div>
        {task.notes && (
          <div className={styles.taskNotes}>
            {task.notes}
          </div>
        )}
      </div>
    </div>
  );
};

// Droppable Route Column Component
const DroppableRouteColumn = ({ route, selectedTask, onAssign, onOptimize, isOptimizing, isAssigning, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: (item) => {
      // Pass the full item object to handle multi-select
      onAssign(route.id, item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  const dropZoneClass = `
    ${styles.routeColumn} 
    ${isOver && canDrop ? styles.routeDropActive : ''}
    ${canDrop && !isOver ? styles.routeDropReady : ''}
  `;

  return (
    <div ref={drop} className={dropZoneClass} aria-label={`Route ${route.name}, ${route.stops.length} stops`}>
      {isOver && canDrop && (
        <div className={styles.dropIndicator}>
          <div className={styles.dropIndicatorText}>
            📍 Drop here to assign
          </div>
        </div>
      )}
      <div className={styles.routeHeader}>
        <div>
          <div className={styles.driverInfo}>{route.name}</div>
          <div className={styles.routeStats}>
            {route.driverId} • {route.status}
            {route.metrics && (
              <span style={{marginLeft: '0.5rem', fontSize: '0.85em', opacity: 0.8}}>
                • {route.metrics.totalDistanceKm?.toFixed(1) || 0} km • {route.metrics.estimatedDurationMin || 0} min
              </span>
            )}
          </div>
        </div>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          {route.stops.length > 1 && (
            <button 
              className="button secondary small" 
              onClick={() => onOptimize(route.id)}
              disabled={isOptimizing || isAssigning}
              aria-label={`Optimize ${route.name} to minimize travel distance`}
              title="Reorder stops for shortest route (O)"
            >
              {isOptimizing ? '⏳' : '🗺️'} Optimize
            </button>
          )}
          {selectedTask && (
            <button 
              className="button secondary small" 
              onClick={() => onAssign(route.id, selectedTask)}
              disabled={isAssigning || isOptimizing}
              aria-label={`Assign ${selectedTask.length} selected task${selectedTask.length > 1 ? 's' : ''} to ${route.name}`}
            >
              {isAssigning ? '⏳ Assigning...' : `Assign ${selectedTask.length > 1 ? `All (${selectedTask.length})` : 'Selected'}`}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

const RoutePlanner = () => {
  const { routes, pickups, deliveries, assignToRoute, assignMultipleTasks, createRoute, optimizeRouteStops } = useLogistics();
  const { clinics } = useCrm();
  const { addToast } = useToast();
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // 'priority', 'time', 'clinic', 'type'
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState([]);
  const [driverFilter, setDriverFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationData, setOptimizationData] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDriver, setNewRouteDriver] = useState('');
  const [newRouteVehicle, setNewRouteVehicle] = useState('van-01');
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  // 1. Prepare Pool of Tasks
  // Deliveries now come from LogisticsContext (derived from cases with status='stage-qc')
  const pool = useMemo(() => {
    const pTasks = pickups
      .filter(p => p.status === 'Pending')
      .map(p => ({ ...p, type: 'Pickup' }));
    
    let allTasks = [...pTasks, ...deliveries];
    
    // Apply date filter
    if (dateFilter) {
      allTasks = allTasks.filter(task => {
        const taskDate = task.requestedTime ? new Date(task.requestedTime).toISOString().split('T')[0] : null;
        return taskDate === dateFilter;
      });
    }
    
    // Apply status filter
    if (statusFilter.length > 0) {
      allTasks = allTasks.filter(task => statusFilter.includes(task.status));
    }
    
    // Apply type filter
    if (typeFilter) {
      allTasks = allTasks.filter(task => task.type === typeFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allTasks = allTasks.filter(task => 
        task.clinicId?.toLowerCase().includes(query) ||
        task.notes?.toLowerCase().includes(query) ||
        task.type?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    allTasks.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          // Rush tasks first, then by time
          if (a.isRush !== b.isRush) return a.isRush ? -1 : 1;
          return (a.requestedTime || '').localeCompare(b.requestedTime || '');
        case 'time':
          return (a.requestedTime || '').localeCompare(b.requestedTime || '');
        case 'clinic':
          return (a.clinicId || '').localeCompare(b.clinicId || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        default:
          return 0;
      }
    });
    
    return allTasks;
  }, [pickups, deliveries, searchQuery, sortBy, dateFilter, statusFilter, typeFilter]);

  // 2. Handlers
  const handleTaskSelect = (task, isShiftClick) => {
    if (isShiftClick && selectedTasks.length > 0) {
      // Multi-select: range from last selected to current
      const lastSelected = selectedTasks[selectedTasks.length - 1];
      const lastIndex = pool.findIndex(t => t.id === lastSelected.id);
      const currentIndex = pool.findIndex(t => t.id === task.id);
      
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeSelection = pool.slice(start, end + 1);
      
      setSelectedTasks(rangeSelection);
    } else if (selectedTasks.find(t => t.id === task.id)) {
      // Deselect if already selected
      setSelectedTasks(selectedTasks.filter(t => t.id !== task.id));
    } else {
      // Single select (replace selection)
      setSelectedTasks([task]);
    }
  };

  const handleAssign = useCallback(async (routeId, item) => {
    // Handle both direct task assignment and drag-drop with multi-select
    let tasksToAssign;
    if (item && item.isSelected && item.selectedCount > 1) {
      // Multi-select drag: use all selected tasks
      tasksToAssign = selectedTasks;
    } else if (item && item.task) {
      // Single task from drag or parameter
      tasksToAssign = [item.task];
    } else if (item) {
      // Direct task object (legacy support)
      tasksToAssign = [item];
    } else {
      // No item provided, use selected tasks
      tasksToAssign = selectedTasks;
    }
    
    if (tasksToAssign.length === 0) return;
    
    setIsAssigning(true);
    
    try {
      if (tasksToAssign.length === 1) {
        // Single task assignment
        await assignToRoute(routeId, tasksToAssign[0]);
        addToast(`Task assigned successfully`, 'success');
      } else {
        // Bulk assignment using optimized function
        const result = await assignMultipleTasks(routeId, tasksToAssign);
        
        if (result.success > 0) {
          addToast(
            `Successfully assigned ${result.success} task${result.success > 1 ? 's' : ''}${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
            result.failed > 0 ? 'warning' : 'success'
          );
        }
        
        if (result.failed > 0 && result.errors) {
          console.error('Bulk assignment errors:', result.errors);
        }
      }
      
      setSelectedTasks([]);
    } catch (error) {
      console.error('Assignment failed:', error);
      addToast('Failed to assign tasks. Please try again.', 'error');
    } finally {
      setIsAssigning(false);
    }
  }, [selectedTasks, assignToRoute, assignMultipleTasks, addToast]);

  const handleCreateRoute = useCallback(() => {
    setNewRouteName(`Route ${routes.length + 1}`);
    setNewRouteDriver('');
    setNewRouteVehicle('van-01');
    setShowCreateRouteModal(true);
  }, [routes.length]);

  const handleConfirmCreateRoute = async () => {
    if (!newRouteDriver.trim()) {
      addToast('Please enter a driver name', 'error');
      return;
    }
    
    try {
      await createRoute({
        name: newRouteName.trim() || `Route ${routes.length + 1}`,
        driverId: newRouteDriver.trim(),
        vehicleId: newRouteVehicle
      });
      
      setShowCreateRouteModal(false);
      setNewRouteName('');
      setNewRouteDriver('');
      addToast(`Route "${newRouteName}" created successfully`, 'success');
    } catch (err) {
      console.error('Failed to create route:', err);
      addToast('Failed to create route', 'error');
    }
  };

  const handleCancelCreateRoute = () => {
    setShowCreateRouteModal(false);
    setNewRouteName('');
    setNewRouteDriver('');
  };

  const handleMarkerClick = (clinicId) => {
    // Find the first unassigned task for this clinic
    const taskForClinic = pool.find(t => t.clinicId === clinicId);
    if (taskForClinic) {
      setSelectedTasks([taskForClinic]);
    }
  };
  
  const handleClearSelection = useCallback(() => {
    setSelectedTasks([]);
  }, []);

  const handleClearFilters = useCallback(() => {
    setDateFilter(null);
    setStatusFilter([]);
    setDriverFilter(null);
    setTypeFilter('');
  }, []);

  const handleFilterToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter(today);
  }, []);

  const handleFilterTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDateFilter(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleOptimizeRoute = useCallback(async (routeId) => {
    setIsOptimizing(true);
    try {
      const result = await optimizeRouteStops(routeId);
      
      if (result) {
        setOptimizationData({ routeId, ...result });
        setShowOptimizationModal(true);
      } else {
        // Route has 0 or 1 stops, nothing to optimize
        addToast('This route has too few stops to optimize (minimum 2 required).', 'warning');
      }
    } catch (error) {
      console.error('Optimization failed:', error);
      addToast('Failed to optimize route. Please try again.', 'error');
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizeRouteStops, addToast]);

  const handleConfirmOptimization = () => {
    setShowOptimizationModal(false);
    setOptimizationData(null);
    // Route is already updated, just show success message
    addToast('Route optimized successfully!', 'success');
  };

  const handleCancelOptimization = async () => {
    // Would need to implement rollback in real app
    setShowOptimizationModal(false);
    setOptimizationData(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          // N = New route
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleCreateRoute();
          }
          break;
        case 'f':
          // F = Focus search
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 'escape':
          // Escape = Clear selection
          if (selectedTasks.length > 0) {
            e.preventDefault();
            handleClearSelection();
          }
          break;
        case 'a':
          // A alone (when tasks selected) = Quick assign to first route
          // Ctrl/Cmd+A = Select all visible tasks
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSelectedTasks(pool);
          } else if (selectedTasks.length > 0 && routes.length > 0 && !isAssigning) {
            // Quick assign selected tasks to first route
            e.preventDefault();
            handleAssign(routes[0].id, null);
          }
          break;
        case '?':
          // ? = Show keyboard help
          if (!e.ctrlKey && !e.metaKey && e.shiftKey) {
            e.preventDefault();
            setShowKeyboardHelp(prev => !prev);
          }
          break;
        case 'o':
          // O = Optimize first route
          if (!e.ctrlKey && !e.metaKey && routes.length > 0 && !isOptimizing) {
            e.preventDefault();
            handleOptimizeRoute(routes[0].id);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTasks, pool, routes, isAssigning, isOptimizing, handleCreateRoute, handleAssign, handleOptimizeRoute, handleClearSelection]);

  // Subscribe to real-time route updates
  useEffect(() => {
    const handleRouteCreated = (data) => {
      addToast(`New route created: ${data.routeName}`, 'info');
    };

    const handleRouteUpdated = (data) => {
      addToast(`Route ${data.routeName || data.routeId} updated`, 'info');
    };

    const handleStopAssigned = (data) => {
      addToast(`Task assigned to ${data.routeName || 'route'}`, 'success');
    };

    const handleRouteOptimized = (data) => {
      const savings = data.improvement;
      if (savings && savings.distanceSaved > 0) {
        addToast(`Route optimized - saved ${savings.distanceSaved.toFixed(1)} km`, 'success');
      }
    };

    // Subscribe to events
    const unsubRouteCreated = LabEventBus.subscribe(EVENTS.ROUTE_CREATED, handleRouteCreated);
    const unsubRouteUpdated = LabEventBus.subscribe(EVENTS.ROUTE_UPDATED, handleRouteUpdated);
    const unsubStopAssigned = LabEventBus.subscribe(EVENTS.STOP_ASSIGNED, handleStopAssigned);
    const unsubRouteOptimized = LabEventBus.subscribe(EVENTS.ROUTE_OPTIMIZED, handleRouteOptimized);

    // Cleanup subscriptions
    return () => {
      unsubRouteCreated();
      unsubRouteUpdated();
      unsubStopAssigned();
      unsubRouteOptimized();
    };
  }, [addToast]);

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Skip Link for Screen Readers */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div 
          className={styles.keyboardHelpModal}
          role="dialog"
          aria-labelledby="keyboard-help-title"
          aria-modal="true"
        >
          <div className={styles.keyboardHelpContent}>
            <h2 id="keyboard-help-title">Keyboard Shortcuts</h2>
            <button 
              className={styles.closeButton}
              onClick={() => setShowKeyboardHelp(false)}
              aria-label="Close keyboard shortcuts help"
            >
              ×
            </button>
            <dl className={styles.shortcutList}>
              <div className={styles.shortcutItem}>
                <dt><kbd>N</kbd></dt>
                <dd>Create new route</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>F</kbd></dt>
                <dd>Focus search box</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>Escape</kbd></dt>
                <dd>Clear selection</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>Ctrl</kbd>+<kbd>A</kbd> / <kbd>⌘</kbd>+<kbd>A</kbd></dt>
                <dd>Select all tasks</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>A</kbd></dt>
                <dd>Assign selected tasks to first route</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>Shift</kbd>+<kbd>?</kbd></dt>
                <dd>Toggle this help</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>Tab</kbd></dt>
                <dd>Navigate between elements</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>Enter</kbd></dt>
                <dd>Select/activate focused item</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>Shift</kbd>+<kbd>Click</kbd></dt>
                <dd>Select range of tasks</dd>
              </div>
              <div className={styles.shortcutItem}>
                <dt><kbd>O</kbd></dt>
                <dd>Optimize route (reorder stops)</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Optimization Confirmation Modal */}
      {showOptimizationModal && optimizationData && (
        <div className={styles.modal} onClick={handleCancelOptimization}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Route Optimization Results</h2>
            
            <div className={styles.optimizationComparison}>
              <div className={styles.metricsColumn}>
                <h3>Before</h3>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Distance:</span>
                  <span className={styles.metricValue}>{optimizationData.before.totalDistanceKm.toFixed(1)} km</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Duration:</span>
                  <span className={styles.metricValue}>{optimizationData.before.estimatedDurationMin} min</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Stops:</span>
                  <span className={styles.metricValue}>{optimizationData.before.stopsTotal}</span>
                </div>
              </div>

              <div className={styles.improvementArrow}>
                <div style={{fontSize: '2rem'}}>→</div>
              </div>

              <div className={styles.metricsColumn}>
                <h3>After</h3>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Distance:</span>
                  <span className={styles.metricValue} style={{color: 'var(--success-color)'}}>
                    {optimizationData.after.totalDistanceKm.toFixed(1)} km
                  </span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Duration:</span>
                  <span className={styles.metricValue} style={{color: 'var(--success-color)'}}>
                    {optimizationData.after.estimatedDurationMin} min
                  </span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Stops:</span>
                  <span className={styles.metricValue}>{optimizationData.after.stopsTotal}</span>
                </div>
              </div>
            </div>

            <div className={styles.improvementSummary}>
              <p>
                <strong>Savings:</strong> 
                {optimizationData.improvement.distanceSaved > 0 
                  ? ` ${optimizationData.improvement.distanceSaved.toFixed(1)} km` 
                  : ' No distance saved'}
                {optimizationData.improvement.timeSaved > 0 
                  ? ` • ${optimizationData.improvement.timeSaved} min` 
                  : ''}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button className="button secondary" onClick={handleCancelOptimization}>
                Close
              </button>
              <button className="button primary" onClick={handleConfirmOptimization}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.container} ref={containerRef} id="main-content">
        
        {/* LEFT PANE: Task Pool + Filters (30%) */}
        <div className={styles.leftPane}>
          <div className={styles.poolSection} role="region" aria-label="Unassigned tasks pool">
            <div className={styles.poolHeader}>
              <div className={styles.poolHeaderTop}>
                <span aria-live="polite" aria-atomic="true">
                  Unassigned Tasks ({pool.length})
                  {selectedTasks.length > 0 && (
                    <span style={{marginLeft: '0.5rem', fontSize: '0.9em', color: 'var(--primary-color)'}}>
                      • {selectedTasks.length} selected
                    </span>
                  )}
                </span>
                {selectedTasks.length > 0 && (
                  <button 
                    className="button secondary small"
                    onClick={handleClearSelection}
                    aria-label="Clear selection"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              
              {/* Bulk Assignment Helper */}
              {selectedTasks.length > 1 && (
                <div style={{
                  padding: '0.5rem',
                  background: 'var(--info-bg, #e0f2fe)',
                  border: '1px solid var(--info-border, #7dd3fc)',
                  borderRadius: '0.25rem',
                  fontSize: '0.85rem',
                  color: 'var(--info-text, #0c4a6e)',
                  marginBottom: '0.5rem'
                }}>
                  💡 <strong>{selectedTasks.length} tasks selected.</strong> Click "Assign All" on a route or press <kbd>A</kbd> to assign to first route.
                </div>
              )}
              
              {/* Search Bar */}
              <div ref={searchInputRef}>
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks by clinic, notes, or type..."
                  aria-label="Search tasks by clinic, notes, or type"
                />
              </div>
              
              {/* Sort Controls */}
              <div className={styles.sortControls}>
                <label htmlFor="task-sort-select">Sort by:</label>
                <select 
                  id="task-sort-select"
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.sortSelect}
                  aria-label="Sort tasks by priority, time, clinic, or type"
                >
                  <option value="priority">Priority (Rush first)</option>
                  <option value="time">Time</option>
                  <option value="clinic">Clinic Name</option>
                  <option value="type">Type</option>
                </select>
              </div>
              
              {/* Filter Toggle */}
              <button 
                className={styles.filterToggle}
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                aria-label="Toggle filters"
              >
                🔍 Filters {showFilters ? '▼' : '▶'}
              </button>
            </div>
            
            {/* Filters Panel */}
            {showFilters && (
              <div className={styles.filtersPanel}>
                {/* Quick Filters */}
                <div className={styles.quickFilters}>
                  <button 
                    className={`${styles.quickFilterBtn} ${dateFilter === new Date().toISOString().split('T')[0] ? styles.active : ''}`}
                    onClick={handleFilterToday}
                  >
                    Today
                  </button>
                  <button 
                    className={styles.quickFilterBtn}
                    onClick={handleFilterTomorrow}
                  >
                    Tomorrow
                  </button>
                  {(dateFilter || statusFilter.length > 0 || typeFilter || driverFilter) && (
                    <button 
                      className={styles.clearFiltersBtn}
                      onClick={handleClearFilters}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {/* Advanced Filters */}
                <div className={styles.advancedFilters}>
                  <div className={styles.filterGroup}>
                    <label htmlFor="type-filter">Type:</label>
                    <select 
                      id="type-filter"
                      value={typeFilter} 
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="">All Types</option>
                      <option value="Pickup">Pickup</option>
                      <option value="Delivery">Delivery</option>
                    </select>
                  </div>
                  
                  <div className={styles.filterGroup}>
                    <label htmlFor="date-filter">Date:</label>
                    <input 
                      id="date-filter"
                      type="date" 
                      value={dateFilter || ''} 
                      onChange={(e) => setDateFilter(e.target.value || null)}
                      className={styles.filterInput}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className={styles.poolList} role="list" aria-label="Task cards">
              {pool.length === 0 ? (
                <div style={{textAlign:'center', color:'var(--text-secondary)', padding:'2rem'}}>
                  {searchQuery ? 'No tasks match your search.' : 'No pending tasks.'}
                </div>
              ) : pool.length > 20 ? (
                /* Virtual scrolling for performance with 20+ tasks */
                <List
                  height={600}
                  itemCount={pool.length}
                  itemSize={100}
                  width="100%"
                >
                  {({ index, style }) => (
                    <div style={style}>
                      <DraggableTaskCard
                        task={pool[index]}
                        isSelected={selectedTasks.some(t => t.id === pool[index].id)}
                        onSelect={handleTaskSelect}
                        selectedCount={selectedTasks.length}
                      />
                    </div>
                  )}
                </List>
              ) : (
                /* Regular rendering for small lists */
                pool.map(task => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.some(t => t.id === task.id)}
                    onSelect={handleTaskSelect}
                    selectedCount={selectedTasks.length}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Map + Routes Timeline (70%) */}
        <div className={styles.rightPane}>
          {/* --- MAP VIEW (TOP 60%) --- */}
          <div className={styles.mapSection}>
            <MapView
              clinics={clinics}
              routes={routes}
              unassignedTasks={pool}
              selectedTask={selectedTasks[0] || null}
              onMarkerClick={handleMarkerClick}
            />
          </div>

          {/* --- ROUTE TIMELINE (BOTTOM 40%) --- */}
          <div className={styles.routesTimeline}>
            <div className={styles.routesHeader}>
              <h2 className={styles.routesTitle}>Active Routes ({routes.length})</h2>
              <div className={styles.routesActions}>
                <button 
                  className="button secondary small"
                  onClick={() => setShowKeyboardHelp(true)}
                  aria-label="Show keyboard shortcuts"
                  title="Keyboard shortcuts (Shift+?)"
                >
                  ⌨️ Shortcuts
                </button>
                <button 
                  className="button primary" 
                  onClick={handleCreateRoute}
                  aria-label="Create new delivery route"
                >
                  + New Route
                </button>
              </div>
            </div>
            
            <div className={styles.routesGrid} role="region" aria-label="Active routes">
              {routes.map(route => (
              <DroppableRouteColumn
                key={route.id}
                route={route}
                selectedTask={selectedTasks}
                onAssign={handleAssign}
                onOptimize={handleOptimizeRoute}
                isOptimizing={isOptimizing}
                isAssigning={isAssigning}
              >
                <div className={styles.stopsList} role="list" aria-label={`Stops for ${route.name}`}>
                  {route.stops.length === 0 ? (
                    <div className={styles.emptyRoute} role="status">
                      <div className={styles.emptyIcon}>
                        <IconBox width="32" aria-hidden="true" />
                      </div>
                      <div className={styles.emptyMessage}>Drag tasks here to create route</div>
                      <div className={styles.emptyHint}>or click task and press "Assign Selected"</div>
                    </div>
                  ) : (
                    route.stops.map((stop, idx) => (
                      <div 
                        key={stop.id} 
                        className={styles.stopItem}
                        role="listitem"
                        aria-label={`Stop ${idx + 1} of ${route.stops.length}: ${stop.type} at ${stop.clinicId}, ${stop.status}`}
                      >
                        <div className={styles.seqBadge} aria-label={`Sequence number ${idx + 1}`}>{idx + 1}</div>
                        <div className={styles.stopContent}>
                          <div style={{fontWeight:600, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                            {stop.clinicId}
                            {stop.type === 'Pickup' ? <IconBox width="14" /> : <IconTruck width="14" />}
                          </div>
                          <div style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                            <StatusBadge 
                              status={stop.status === 'Pending' ? 'stage-new' : 
                                      stop.status === 'InProgress' ? 'stage-processing' : 
                                      stop.status === 'Completed' ? 'stage-delivered' : 
                                      stop.status === 'Skipped' ? 'stage-hold' : 'stage-new'}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DroppableRouteColumn>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Create Route Modal */}
      {showCreateRouteModal && (
        <div className={styles.modalOverlay} onClick={handleCancelCreateRoute}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create New Route</h2>
            <p className={styles.modalSubtitle}>Set up a new delivery route with assigned driver</p>
            
            <div className={styles.formGroup}>
              <label htmlFor="route-name">Route Name</label>
              <input
                id="route-name"
                type="text"
                className={styles.formInput}
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="e.g., Morning Downtown Route"
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="route-driver">
                Driver Name/ID <span style={{color: 'var(--error-color)'}}>*</span>
              </label>
              <input
                id="route-driver"
                type="text"
                className={styles.formInput}
                value={newRouteDriver}
                onChange={(e) => setNewRouteDriver(e.target.value)}
                placeholder="Enter driver name or ID"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="route-vehicle">Vehicle</label>
              <select
                id="route-vehicle"
                className={styles.formSelect}
                value={newRouteVehicle}
                onChange={(e) => setNewRouteVehicle(e.target.value)}
              >
                <option value="van-01">Van 01</option>
                <option value="van-02">Van 02</option>
                <option value="truck-01">Truck 01</option>
                <option value="sedan-01">Sedan 01</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button className="button secondary" onClick={handleCancelCreateRoute}>
                Cancel
              </button>
              <button className="button primary" onClick={handleConfirmCreateRoute}>
                Create Route
              </button>
            </div>
          </div>
        </div>
      )}

    </DndProvider>
  );
};

export default RoutePlanner;