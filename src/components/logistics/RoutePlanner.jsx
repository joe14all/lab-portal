import React, { useState, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useLogistics } from '../../contexts';
import { IconTruck, IconBox, IconChevronRight } from '../../layouts/components/LabIcons';
import styles from './RoutePlanner.module.css';

// Drag and Drop Type
const ItemTypes = {
  TASK: 'task'
};

// Draggable Task Card Component
const DraggableTaskCard = ({ task, isSelected, onSelect }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={`
        ${styles.taskCard} 
        ${task.type === 'Pickup' ? styles.taskPickup : styles.taskDelivery}
        ${isSelected ? styles.taskSelected : ''}
        ${isDragging ? styles.taskDragging : ''}
      `}
      onClick={() => onSelect(task)}
      role="button"
      tabIndex={0}
      aria-label={`${task.type} task for ${task.clinicId}. ${task.isRush ? 'Rush priority. ' : ''}${task.notes}`}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(task)}
    >
      <div className={styles.taskHeader}>
        <span className={styles.clinicName}>{task.clinicId}</span>
        <span className={styles.taskType}>{task.type}</span>
      </div>
      <div className={styles.taskMeta}>
        {task.notes}
        {task.isRush && <span style={{color:'red', marginLeft:'0.5rem', fontWeight:'bold'}}>RUSH</span>}
      </div>
    </div>
  );
};

// Droppable Route Column Component
const DroppableRouteColumn = ({ route, selectedTask, onAssign, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: (item) => {
      onAssign(route.id, item.task);
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
      <div className={styles.routeHeader}>
        <div>
          <div className={styles.driverInfo}>{route.name}</div>
          <div className={styles.routeStats}>{route.driverId} • {route.status}</div>
        </div>
        <div>
          {selectedTask && (
            <button 
              className="button secondary small" 
              onClick={() => onAssign(route.id, selectedTask)}
              aria-label={`Assign selected task to ${route.name}`}
            >
              Assign Selected
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

const RoutePlanner = () => {
  const { routes, pickups, assignToRoute, createRoute } = useLogistics();
  const [selectedTask, setSelectedTask] = useState(null);

  // 1. Prepare Pool of Tasks
  // In a real app, 'deliveries' would come from filtering Cases. 
  // We'll mock a few deliveries here for the UI.
  const deliveryTasks = [
    { id: 'del-101', type: 'Delivery', clinicId: 'clinic-001', notes: 'Ready to Ship (Case #1003)', isRush: false },
    { id: 'del-102', type: 'Delivery', clinicId: 'clinic-005', notes: 'Ready to Ship (Case #1008)', isRush: true },
  ];

  const pool = useMemo(() => {
    const pTasks = pickups
      .filter(p => p.status === 'Pending')
      .map(p => ({ ...p, type: 'Pickup' }));
    
    return [...pTasks, ...deliveryTasks];
  }, [pickups]);

  // 2. Handlers
  const handleAssign = async (routeId, task) => {
    const taskToAssign = task || selectedTask;
    if (!taskToAssign) return;
    await assignToRoute(routeId, taskToAssign);
    setSelectedTask(null);
  };

  const handleCreateRoute = () => {
    const driverName = prompt("Enter Driver Name (or ID):");
    if (driverName) {
      createRoute({
        name: `Route ${routes.length + 1}`,
        driverId: driverName, // In real app, this would be a user select
        vehicleId: 'van-01'
      });
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.container}>
        
        {/* --- UNASSIGNED POOL --- */}
        <div className={styles.poolSection}>
          <div className={styles.poolHeader}>
            <span>Unassigned Tasks ({pool.length})</span>
          </div>
          <div className={styles.poolList}>
            {pool.map(task => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                isSelected={selectedTask?.id === task.id}
                onSelect={setSelectedTask}
              />
            ))}
            {pool.length === 0 && (
              <div style={{textAlign:'center', color:'var(--text-secondary)', padding:'2rem'}}>
                No pending tasks.
              </div>
            )}
          </div>
        </div>

        {/* --- ACTIVE ROUTES --- */}
        <div className={styles.routesSection}>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <button className="button primary" onClick={handleCreateRoute}>+ New Route</button>
          </div>
          
          {routes.map(route => (
            <DroppableRouteColumn
              key={route.id}
              route={route}
              selectedTask={selectedTask}
              onAssign={handleAssign}
            >
              <div className={styles.stopsList}>
                {route.stops.length === 0 ? (
                  <div className={styles.emptyRoute}>
                    <IconBox width="24" style={{opacity: 0.3, marginBottom: '0.5rem'}} />
                    <div>Drag tasks here to create route</div>
                  </div>
                ) : (
                  route.stops.map((stop, idx) => (
                    <div key={stop.id} className={styles.stopItem}>
                      <div className={styles.seqBadge}>{idx + 1}</div>
                      <div className={styles.stopContent}>
                        <div style={{fontWeight:600, fontSize:'0.9rem'}}>{stop.clinicId}</div>
                        <div style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>
                          {stop.type} • {stop.status}
                        </div>
                      </div>
                      <div>
                        {stop.type === 'Pickup' ? <IconBox width="16" /> : <IconTruck width="16" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DroppableRouteColumn>
          ))}
        </div>

      </div>
    </DndProvider>
  );
};

export default RoutePlanner;