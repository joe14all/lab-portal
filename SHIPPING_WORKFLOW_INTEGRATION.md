# Shipping Workflow Integration

## Overview
Complete integration between the Cases domain and Logistics domain for seamless shipping workflow with automatic status updates.

## Workflow Stages

### 1. Ready to Ship (`stage-shipping`)
**When:** Case completes QC and is bagged/tagged  
**Status:** `stage-shipping`  
**Display:** "Ready to Ship" (cyan color)  
**Where:** Appears in Logistics > Deliveries tab as available delivery tasks  
**Next Action:** Assign to delivery route

### 2. Shipped (`stage-shipped`)
**When:** Case is assigned to a delivery route  
**Status:** `stage-shipped`  
**Display:** "Shipped" (blue color)  
**Where:** Case tracking shows route and driver info  
**Next Action:** Driver delivers to clinic

### 3. Delivered (`stage-delivered`)
**When:** Driver completes delivery and confirms at stop  
**Status:** `stage-delivered`  
**Display:** "Delivered" (green color)  
**Where:** Case is marked complete in system  
**Category:** COMPLETED

---

## Technical Implementation

### Case Stages Configuration
**File:** `src/constants/case_stages.json`

```json
{
  "id": "stage-shipping",
  "label": "Ready to Ship",
  "order": 11,
  "category": "POST_PRODUCTION",
  "color": "cyan"
},
{
  "id": "stage-shipped",
  "label": "Shipped",
  "order": 12,
  "category": "POST_PRODUCTION",
  "color": "blue"
},
{
  "id": "stage-delivered",
  "label": "Delivered",
  "order": 13,
  "category": "COMPLETED",
  "color": "green"
}
```

### Workflow Templates
**File:** `src/components/cases/CaseDetailStepper.jsx`

All case type workflows now include complete shipping stages:
- REMOVABLE: [...existing stages..., 'stage-qc', 'stage-shipping', 'stage-shipped', 'stage-delivered']
- CASTING: [...existing stages..., 'stage-qc', 'stage-shipping', 'stage-shipped', 'stage-delivered']
- ORTHO: [...existing stages..., 'stage-qc', 'stage-shipping', 'stage-shipped', 'stage-delivered']
- IMPLANT: [...existing stages..., 'stage-qc', 'stage-shipping', 'stage-shipped', 'stage-delivered']
- FIXED_DIGITAL: [...existing stages..., 'stage-qc', 'stage-shipping', 'stage-shipped', 'stage-delivered']

---

## Integration Points

### 1. Logistics → Cases: Assign to Route
**File:** `src/contexts/LogisticsContext.jsx`  
**Functions:** `assignToRoute`, `assignMultipleTasks`

When a delivery task is assigned to a route:

```javascript
// Single assignment (assignToRoute)
if (task.type === 'Delivery' && task.caseId) {
  await MockService.cases.cases.update(task.caseId, {
    status: 'stage-shipped',
    trackingInfo: {
      routeId,
      routeName: route.name,
      assignedAt: new Date().toISOString()
    }
  });

  LabEventBus.publish(EVENTS.CASE_STATUS_CHANGED, {
    caseId: task.caseId,
    oldStatus: 'stage-shipping',
    newStatus: 'stage-shipped',
    routeId,
    timestamp: new Date().toISOString()
  });
}

// Bulk assignment (assignMultipleTasks)
for (const caseId of casesToUpdate) {
  await MockService.cases.cases.update(caseId, {
    status: 'stage-shipped',
    trackingInfo: { routeId, routeName, assignedAt }
  });
  LabEventBus.publish(EVENTS.CASE_STATUS_CHANGED, {...});
}
```

### 2. Logistics → Cases: Complete Delivery
**File:** `src/contexts/LogisticsContext.jsx`  
**Function:** `updateRouteStopStatus`

When a driver completes a delivery stop:

```javascript
if (newStatus === 'Completed') {
  // Update all cases in delivery manifest
  if (updatedStop?.deliveryManifest && updatedStop.deliveryManifest.length > 0) {
    for (const delivery of updatedStop.deliveryManifest) {
      if (delivery.caseId) {
        await MockService.cases.cases.update(delivery.caseId, {
          status: 'stage-delivered',
          deliveryInfo: {
            deliveredAt: new Date().toISOString(),
            routeId,
            routeName: updatedRoute.name,
            stopId,
            ...proofData // signature, photo, etc.
          }
        });

        LabEventBus.publish(EVENTS.CASE_STATUS_CHANGED, {
          caseId: delivery.caseId,
          oldStatus: 'stage-shipped',
          newStatus: 'stage-delivered',
          routeId,
          stopId,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}
```

### 3. Cases: Real-Time Updates
**File:** `src/contexts/LabContext.jsx`

LabContext listens for case status changes and automatically refreshes:

```javascript
useEffect(() => {
  const handleCaseStatusChange = async (event) => {
    if (!activeLab?.id) return;
    try {
      // Refresh all cases to get the latest status
      const fetchedCases = await MockService.cases.cases.getAll({ labId: activeLab.id });
      setCases(fetchedCases);
    } catch (err) {
      console.error("Failed to refresh cases after status change", err);
    }
  };

  const unsubscribe = LabEventBus.subscribe(EVENTS.CASE_STATUS_CHANGED, handleCaseStatusChange);
  
  return () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
}, [activeLab]);
```

---

## Event Flow

### Scenario: Case Ready for Delivery

1. **QC Complete**
   - User marks case as QC approved
   - Case status → `stage-shipping`
   - Case appears in Logistics > Deliveries tab

2. **Assign to Route**
   - User drags case from Deliveries to a route
   - `assignToRoute()` or `assignMultipleTasks()` called
   - Case status updated: `stage-shipping` → `stage-shipped`
   - Tracking info added to case
   - Event published: `EVENTS.CASE_STATUS_CHANGED`
   - LabContext refreshes case list
   - Case removed from Deliveries tab (no longer stage-shipping)

3. **Driver Delivers**
   - Driver arrives at clinic
   - Driver marks stop as "Complete" with signature/photo
   - `updateRouteStopStatus(routeId, stopId, 'Completed', proofData)` called
   - Loop through all cases in stop's deliveryManifest
   - Each case status updated: `stage-shipped` → `stage-delivered`
   - Delivery info added to case (timestamp, proof data)
   - Event published: `EVENTS.CASE_STATUS_CHANGED` for each case
   - LabContext refreshes case list
   - Cases now marked as COMPLETED

---

## Data Structures

### Delivery Task
```javascript
{
  id: 'delivery-{caseId}',
  caseId: 'case-123',
  caseNumber: 'C-2024-123',
  type: 'Delivery',
  clinicId: 'clinic-abc',
  notes: 'Ready to Ship (Case #C-2024-123)',
  isRush: false,
  requestedTime: '2024-01-15T10:00:00Z',
  units: [...],
  patient: {...}
}
```

### Route Stop with Delivery Manifest
```javascript
{
  id: 'stop-123',
  sequence: 1,
  clinicId: 'clinic-abc',
  type: 'Delivery',
  status: 'Pending', // → 'Completed'
  deliveryManifest: [
    {
      id: 'delivery-case-123',
      caseId: 'case-123',
      caseNumber: 'C-2024-123',
      type: 'Delivery',
      // ... other task properties
    }
  ]
}
```

### Case Tracking Info (added on ship)
```javascript
{
  trackingInfo: {
    routeId: 'route-456',
    routeName: 'Downtown Route - Morning',
    assignedAt: '2024-01-15T08:00:00Z'
  }
}
```

### Case Delivery Info (added on complete)
```javascript
{
  deliveryInfo: {
    deliveredAt: '2024-01-15T11:30:00Z',
    routeId: 'route-456',
    routeName: 'Downtown Route - Morning',
    stopId: 'stop-123',
    signature: 'base64...',
    photo: 'url...'
  }
}
```

---

## Benefits

1. **Automatic Status Updates**
   - No manual case status changes needed
   - Cases automatically progress through shipping stages

2. **Real-Time Visibility**
   - Case management updates immediately when routes are assigned
   - Dashboard reflects current shipping status
   - Clinics can see when their cases ship and deliver

3. **Proof of Delivery**
   - Driver signatures and photos attached to cases
   - Complete audit trail from QC to delivery

4. **Bidirectional Communication**
   - Logistics updates Cases domain
   - Cases domain queries filter by shipping status
   - Event-driven architecture ensures consistency

5. **Error Handling**
   - If case update fails, route assignment still completes
   - Errors logged without blocking workflow
   - Graceful degradation ensures system continues

---

## Testing Checklist

- [ ] Case completes QC → appears in Deliveries tab
- [ ] Assign delivery to route → case status changes to shipped
- [ ] Case list updates immediately after assignment
- [ ] Multiple cases assigned to route → all update to shipped
- [ ] Driver completes stop → all cases in manifest become delivered
- [ ] Tracking info saved correctly on ship
- [ ] Delivery info saved correctly on complete (with proof data)
- [ ] Events published for all status changes
- [ ] LabContext refreshes on status change events
- [ ] Delivered cases show in COMPLETED category
- [ ] Case detail stepper shows all shipping stages

---

## Future Enhancements

- Real-time notifications when cases ship
- SMS/email alerts when cases are delivered
- Estimated delivery time windows
- Route optimization to minimize delivery times
- Multi-stop tracking for clinic users
- Return/exchange workflow for damaged cases
