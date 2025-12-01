# Surface Selection & RPD Components Implementation

## Overview
Added advanced clinical features to the prescription form for inlay/onlay surface specification and comprehensive RPD (Removable Partial Denture) component selection.

## Features Added

### 1. Inlay/Onlay Surface Selection
**Purpose**: Allow precise specification of tooth surfaces involved in inlay/onlay restorations.

**Surfaces Supported**:
- **M** - Mesial (surface facing toward the midline)
- **O** - Occlusal (chewing surface)
- **D** - Distal (surface facing away from midline)
- **I** - Incisal (biting edge of front teeth)
- **B** - Buccal (cheek-facing surface)
- **L** - Lingual (tongue-facing surface)
- **F** - Facial (front-facing surface)

**User Experience**:
1. Select "Inlay/Onlay" restoration type
2. Choose material and shade
3. Select teeth from odontogram
4. **NEW**: Orange-highlighted surface selection panel appears
5. For each selected tooth, click surface buttons to toggle (M, O, D, I, B, L, F)
6. Selected surfaces show in orange (active state)
7. Surface combination displays next to each tooth (e.g., "MOD")
8. Prescription stores surface data per tooth

**Technical Implementation**:
```javascript
// State management
const [selectedSurfaces, setSelectedSurfaces] = useState({});
// Example: {11: ['M', 'O', 'D'], 12: ['D', 'O']}

// Toggle handler
const handleSurfaceToggle = (tooth, surface) => {
  const currentSurfaces = selectedSurfaces[tooth] || [];
  const updated = currentSurfaces.includes(surface)
    ? currentSurfaces.filter(s => s !== surface)
    : [...currentSurfaces, surface];
  setSelectedSurfaces({ ...selectedSurfaces, [tooth]: updated });
};
```

### 2. RPD Component Selection
**Purpose**: Comprehensive component specification for removable partial dentures matching real clinical workflows.

**Component Categories**:

#### Clasps (Retention Elements)
- Circumferential Clasp
- Akers Clasp
- C-Clasp
- I-Bar (Roach)
- Ring Clasp
- Back Action Clasp

#### Rests (Support Elements)
- Occlusal Rest
- Cingulum Rest
- Incisal Rest

#### Major Connectors
**Upper Arch**:
- Palatal Strap
- Palatal Plate
- Horseshoe (U-shaped)

**Lower Arch**:
- Lingual Bar
- Lingual Plate
- Kennedy Bar

#### Minor Connectors
- Minor Connector
- Approach Arm

#### Other Components
- Reciprocal Arm
- Indirect Retainer
- Denture Base
- Artificial Teeth (pontics)

**User Experience**:
1. Select "Partial Denture" restoration type
2. Choose material and missing teeth from odontogram
3. **NEW**: Red-highlighted RPD components panel appears
4. Components organized by category (Clasps, Rests, Connectors, etc.)
5. Click component buttons to toggle selection
6. Selected components show in red (active state)
7. Summary shows all selected components
8. Prescription stores complete RPD specification

**Technical Implementation**:
```javascript
// Component definitions
const RPD_COMPONENTS = {
  CLASPS: ['Circumferential Clasp', 'Akers Clasp', 'C-Clasp', 'I-Bar', 'Ring Clasp', 'Back Action Clasp'],
  RESTS: ['Occlusal Rest', 'Cingulum Rest', 'Incisal Rest'],
  CONNECTORS_MAJOR: ['Palatal Strap', 'Palatal Plate', 'Horseshoe', 'Lingual Bar', 'Lingual Plate', 'Kennedy Bar'],
  CONNECTORS_MINOR: ['Minor Connector', 'Approach Arm'],
  OTHER: ['Reciprocal Arm', 'Indirect Retainer', 'Denture Base', 'Artificial Teeth']
};

// State management
const [rpdComponents, setRpdComponents] = useState([]);
const [rpdDetails, setRpdDetails] = useState({});

// Toggle handler
const handleRpdComponentToggle = (component) => {
  setRpdComponents(prev =>
    prev.includes(component)
      ? prev.filter(c => c !== component)
      : [...prev, component]
  );
};
```

## UI Design

### Surface Selection Panel
- **Background**: Warm yellow (`#fef3c7`) with orange border
- **Active buttons**: Orange (`#f59e0b`)
- **Layout**: One row per tooth with surface button grid
- **Display**: Shows combined surfaces (e.g., "MOD", "DO")

### RPD Components Panel
- **Background**: Light red (`#fef2f2`) with red border
- **Active buttons**: Red (`#dc2626`)
- **Layout**: Categorized sections with labeled groups
- **Summary**: Shows comma-separated list of selected components

## Edit Mode Support
Both features fully integrated into inline editing:
- Edit surfaces for inlay/onlay prescriptions
- Edit RPD components for partial denture prescriptions
- Toggle buttons maintain same visual style
- Changes save to prescription object

## Data Storage

### Prescription Object Structure
```javascript
{
  id: "rx-1234",
  type: "INLAY_ONLAY",
  teeth: [11, 12],
  surfaces: {
    11: ['M', 'O', 'D'],
    12: ['D', 'O']
  },
  material: "Porcelain",
  shade: "A2",
  // ... other fields
}

// OR for RPD:
{
  id: "rx-5678",
  type: "DENTURE_PARTIAL",
  arch: "Lower",
  teeth: [36, 37], // missing teeth
  toothRoles: {38: 'abutment', 34: 'abutment'},
  rpdComponents: ['Circumferential Clasp', 'Occlusal Rest', 'Lingual Bar'],
  rpdDetails: {}, // for future expansion (tooth assignments, etc.)
  material: "Cobalt Chrome",
  // ... other fields
}
```

## View Mode Display
Prescription list shows surface and RPD data:
- **Surfaces**: `• Surfaces: #11(MOD), #12(DO)`
- **RPD Components**: `• Components: Circumferential Clasp, Occlusal Rest, Lingual Bar`

## Workflow Integration

### Reset Behavior
- Surface selections clear when changing restoration type
- RPD components clear when changing restoration type
- All reset after adding to prescription (ready for next item)

### Validation
- Surface selection appears only when teeth are selected
- RPD components appear immediately (not tooth-dependent)
- No forced validation (clinician decides what to specify)

## Clinical Accuracy
These features match real-world dental laboratory workflows:
- **Inlay/Onlay**: Technicians need exact surface information for proper fit and preparation
- **RPD**: Complete component specification essential for complex prosthetic fabrication
- **Flexibility**: Allows clinicians to specify as much or as little detail as needed

## Files Modified

1. **PrescriptionForm.jsx** (~200 lines added):
   - TOOTH_SURFACES constant
   - RPD_COMPONENTS constant
   - selectedSurfaces, rpdComponents, rpdDetails state
   - handleSurfaceToggle, handleRpdComponentToggle handlers
   - Surface selection UI panel
   - RPD components UI panel
   - Edit mode integration
   - Prescription data storage

2. **PrescriptionForm.module.css** (~160 lines added):
   - `.surfaceSelection` - yellow theme container
   - `.toothSurfaceRow` - individual tooth surface layout
   - `.surfaceBtn` / `.surfaceBtn.active` - orange buttons
   - `.surfaceDisplay` - surface combination display
   - `.rpdComponents` - red theme container
   - `.componentCategory` - categorized layout
   - `.componentBtn` / `.componentBtn.active` - red buttons
   - `.selectedComponents` - summary display
   - `.editSurfaces` / `.editRpd` - edit mode styling

## Testing Checklist

- [x] Surface selection shows for inlay/onlay
- [x] Surface buttons toggle correctly
- [x] Surface display shows combinations (MOD, etc.)
- [x] RPD panel shows for partial dentures
- [x] Component categories render correctly
- [x] Component selection toggles work
- [x] Surface data saves to prescription
- [x] RPD data saves to prescription
- [x] Edit mode allows surface modification
- [x] Edit mode allows RPD modification
- [x] View mode displays surface info
- [x] View mode displays RPD components
- [x] States reset after adding prescription
- [x] States clear when changing restoration type

## Future Enhancements (Optional)

1. **Surface Presets**: Common combinations (MOD, MO, DO) as quick-select buttons
2. **RPD Details**: Tooth assignments for clasps/rests (e.g., "Clasp on #38")
3. **Visual Feedback**: Show surfaces on odontogram tooth representation
4. **Validation**: Warn if no surfaces selected for inlay/onlay
5. **Component Library**: Custom component templates per lab
6. **Arch Auto-Suggest**: Suggest major connector based on selected arch

## Status
✅ **Complete** - Surface selection and RPD components fully implemented and integrated into prescription workflow.
