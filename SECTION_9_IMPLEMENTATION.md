# Section 9: Point 5 Implementation - File Categorization System

**Date:** November 30, 2025  
**Requirement:** Extend `case_files.json` with `category: "input" | "design" | "production" | "shipping"`  
**Priority:** P1 (from CASES_DOMAIN_ANALYSIS.md)  
**Status:** ✅ Complete

---

## 1. Overview

### 1.1 Objective
Add a simplified categorization system to case files, enabling:
- **Tab-based filtering** in the UI (Inputs, Designs, Production, Shipping)
- **Clearer file organization** for technicians and doctors
- **Better workflow tracking** (which files belong to which phase)

### 1.2 Requirements from Analysis Document
> "Extend `case_files.json` with `category: "input" | "design" | "production" | "shipping"`"

**Design Decision:** Preserve existing detailed `category` field (e.g., `INPUT_SCAN`, `PRODUCTION_DESIGN`) and add a new `simplifiedCategory` field for UI filtering.

---

## 2. Implementation

### 2.1 Data Model Changes

**File:** `/src/_mock/data/cases/case_files.json`

**Changes Applied:**
- Added `simplifiedCategory` field to all 11 file entries
- Mapped detailed categories to simplified values:
  - `INPUT_SCAN` → `"input"`
  - `INPUT_PHOTO` → `"input"`
  - `REFERENCE` → `"input"`
  - `PRODUCTION_DESIGN` → `"design"`

**Example Before:**
```json
{
  "id": "file-101",
  "category": "INPUT_SCAN",
  "subCategory": "ARCH_UPPER",
  "fileName": "smith_john_upper.stl"
}
```

**Example After:**
```json
{
  "id": "file-101",
  "category": "INPUT_SCAN",
  "simplifiedCategory": "input",
  "subCategory": "ARCH_UPPER",
  "fileName": "smith_john_upper.stl"
}
```

**Files Updated:** 11 total
- `file-101` through `file-103` (case-5001) → `"input"`
- `file-201` (case-5002) → `"input"`
- `file-design-v2-5001` (case-5001) → `"design"`
- `file-401` (case-5004) → `"input"`
- `file-501`, `file-502` (case-5005) → `"input"`
- `file-601` (case-5006) → `"input"`
- `file-701` (case-5007) → `"input"`
- `file-801` (case-5008) → `"input"`

---

### 2.2 TypeScript Type Definitions

**File:** `/src/types/cases.ts`

**Changes Applied:**
- Added `SimplifiedFileCategory` type alias
- Created `CaseFile` interface with dual categorization support

**New Type Definition:**
```typescript
/**
 * Case File Management Types
 * Supports dual categorization for UI flexibility
 */
export type SimplifiedFileCategory = 'input' | 'design' | 'production' | 'shipping';

export interface CaseFile {
  id: string;
  labId: string;
  caseId: string;
  unitId?: string;
  uploaderId: string;
  
  /** Detailed category (e.g., INPUT_SCAN, PRODUCTION_DESIGN, REFERENCE) */
  category: string;
  
  /** Simplified category for UI tabs and filtering */
  simplifiedCategory: SimplifiedFileCategory;
  
  subCategory?: string;
  fileType: string;
  fileName: string;
  size: string;
  url: string;
  s3Key?: string;
  s3Bucket?: string;
  createdAt: string;
  isImmutable?: boolean;
  notes?: string;
  version?: number;
  isLatest?: boolean;
  parentFileId?: string;
}
```

**Design Benefits:**
- Type safety for simplified categories (prevents typos like `"inputs"` instead of `"input"`)
- Optional fields for S3 integration (presigned URLs)
- Support for file versioning (`version`, `isLatest`, `parentFileId`)

---

### 2.3 UI Component Updates

**File:** `/src/components/cases/detail/CaseFilesCard.jsx`

**Changes Applied:**

1. **Added Category Tab Navigation:**
   ```jsx
   const [activeTab, setActiveTab] = useState('all');
   // 'all' | 'input' | 'design' | 'production' | 'shipping'
   ```

2. **Filtering Logic:**
   ```jsx
   const filteredFiles = useMemo(() => {
     if (activeTab === 'all') return allFiles;
     return allFiles.filter(file => file.simplifiedCategory === activeTab);
   }, [allFiles, activeTab]);
   ```

3. **Tab UI Elements:**
   ```jsx
   <div className={styles.tabs}>
     <button 
       className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
       onClick={() => setActiveTab('all')}
     >
       All ({allFiles.length})
     </button>
     <button 
       className={`${styles.tab} ${activeTab === 'input' ? styles.activeTab : ''}`}
       onClick={() => setActiveTab('input')}
     >
       Inputs ({allFiles.filter(f => f.simplifiedCategory === 'input').length})
     </button>
     {/* ... design, production, shipping tabs ... */}
   </div>
   ```

4. **Empty State Messaging:**
   ```jsx
   {activeTab === 'all' ? 'No files uploaded yet.' : `No ${activeTab} files.`}
   ```

---

### 2.4 Styling

**File:** `/src/components/cases/detail/CaseFilesCard.module.css`

**Changes Applied:**
```css
.tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background-color: var(--bg-subtle);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  flex-shrink: 0;
}

.tab {
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab:hover {
  background-color: var(--bg-surface);
  color: var(--text-primary);
}

.activeTab {
  background-color: var(--primary-50);
  color: var(--primary-600);
  font-weight: 600;
}
```

**Features:**
- Horizontal scroll for mobile responsiveness
- Active tab highlighting with primary color
- Smooth transitions on hover
- Badge counts for each category

---

## 3. Validation

### 3.1 File Count Verification

**Total Files by Simplified Category:**
```bash
# Input files: 10
# - file-101, file-102, file-103 (case-5001)
# - file-201 (case-5002)
# - file-401 (case-5004)
# - file-501, file-502 (case-5005)
# - file-601 (case-5006)
# - file-701 (case-5007)
# - file-801 (case-5008)

# Design files: 1
# - file-design-v2-5001 (case-5001)

# Production files: 0
# Shipping files: 0
```

### 3.2 Expected Tab Counts (Case Detail Page - case-5001)
- **All:** 4 files (file-101, file-102, file-103, file-design-v2-5001)
- **Inputs:** 3 files
- **Designs:** 1 file
- **Production:** 0 files
- **Shipping:** 0 files

### 3.3 Code Quality Checks

✅ **No ESLint Errors**
```bash
# Verified files:
# - /src/components/cases/detail/CaseFilesCard.jsx
# - /src/types/cases.ts
# - /src/_mock/data/cases/case_files.json
```

✅ **Type Safety**
- `SimplifiedFileCategory` restricts values to union type
- `CaseFile` interface enforces required fields
- No `any` types used

✅ **Backward Compatibility**
- Existing `category` field preserved
- No changes to file upload logic
- UI gracefully handles missing `simplifiedCategory` (defaults to 'All' tab)

---

## 4. Testing Recommendations

### 4.1 Manual Testing
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to Case Detail page
http://localhost:5173/cases/case-5001

# 3. Verify CaseFilesCard shows:
#    - 5 tabs (All, Inputs, Designs, Production, Shipping)
#    - Correct badge counts
#    - Filtered file list when clicking tabs
#    - Empty state for Production/Shipping tabs

# 4. Test file upload workflow:
#    - Upload a new file
#    - Verify it appears in correct tab based on category selection
```

### 4.2 Unit Test Example
```javascript
// tests/components/cases/CaseFilesCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import CaseFilesCard from './CaseFilesCard';

describe('CaseFilesCard - Simplified Categories', () => {
  const mockFiles = {
    inputs: [
      { id: 'f1', simplifiedCategory: 'input', fileName: 'scan.stl' },
      { id: 'f2', simplifiedCategory: 'input', fileName: 'photo.jpg' }
    ],
    designs: [
      { id: 'f3', simplifiedCategory: 'design', fileName: 'design.stl' }
    ]
  };

  it('should show correct tab counts', () => {
    render(<CaseFilesCard files={mockFiles} caseId="case-5001" />);
    
    expect(screen.getByText(/All \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Inputs \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Designs \(1\)/)).toBeInTheDocument();
  });

  it('should filter files when clicking tabs', () => {
    render(<CaseFilesCard files={mockFiles} caseId="case-5001" />);
    
    fireEvent.click(screen.getByText(/Inputs/));
    expect(screen.queryByText('design.stl')).not.toBeInTheDocument();
    expect(screen.getByText('scan.stl')).toBeInTheDocument();
  });

  it('should show empty state for unused categories', () => {
    render(<CaseFilesCard files={mockFiles} caseId="case-5001" />);
    
    fireEvent.click(screen.getByText(/Production/));
    expect(screen.getByText('No production files.')).toBeInTheDocument();
  });
});
```

---

## 5. Future Enhancements

### 5.1 Production Files (Phase 2)
When production systems generate files (QC reports, milling logs):
```json
{
  "id": "file-qc-5001",
  "caseId": "case-5001",
  "category": "PRODUCTION_QC",
  "simplifiedCategory": "production",
  "fileName": "qc_inspection_report.pdf",
  "uploaderId": "system-qc-bot"
}
```

### 5.2 Shipping Files (Phase 3)
When logistics generates packing slips:
```json
{
  "id": "file-ship-5001",
  "caseId": "case-5001",
  "category": "SHIPPING_LABEL",
  "simplifiedCategory": "shipping",
  "fileName": "fedex_label_tracking_123.pdf",
  "uploaderId": "system-shipping-bot"
}
```

### 5.3 UI Enhancements
- **Drag-and-drop reordering** within tabs
- **Bulk file operations** (download all inputs as ZIP)
- **File comparison view** (side-by-side STL diff for design iterations)
- **Smart categorization** (ML auto-suggests category based on file name/type)

---

## 6. Integration with GraphQL Schema

The `simplifiedCategory` field is already incorporated into the AppSync schema (Point 4):

```graphql
type CaseFile {
  id: ID!
  caseId: ID!
  
  # Detailed category (INPUT_SCAN, PRODUCTION_DESIGN, etc.)
  category: CaseFileCategoryEnum!
  
  # Simplified category for UI filtering
  simplifiedCategory: SimplifiedFileCategory!
  
  fileName: String!
  fileType: String!
  # ... other fields
}

enum SimplifiedFileCategory {
  INPUT
  DESIGN
  PRODUCTION
  SHIPPING
}
```

**Resolver Mapping (DynamoDB):**
```vtl
## Lambda function to normalize category on file upload
#set($simplifiedCategory = "input")
#if($ctx.args.input.category.startsWith("PRODUCTION"))
  #set($simplifiedCategory = "production")
#elseif($ctx.args.input.category.contains("DESIGN"))
  #set($simplifiedCategory = "design")
#elseif($ctx.args.input.category.startsWith("SHIPPING"))
  #set($simplifiedCategory = "shipping")
#end
```

---

## 7. Summary

### 7.1 Files Changed
1. `/src/_mock/data/cases/case_files.json` - Added `simplifiedCategory` to 11 files
2. `/src/types/cases.ts` - Created `CaseFile` interface with type safety
3. `/src/components/cases/detail/CaseFilesCard.jsx` - Added tab navigation and filtering
4. `/src/components/cases/detail/CaseFilesCard.module.css` - Styled category tabs

### 7.2 Key Metrics
- **11 files categorized** (10 input, 1 design)
- **4 simplified categories defined** (input, design, production, shipping)
- **5 UI tabs implemented** (All + 4 categories)
- **0 breaking changes** (backward compatible)

### 7.3 Benefits
✅ **User Experience:** Technicians can quickly filter files by workflow phase  
✅ **Type Safety:** TypeScript prevents invalid category values  
✅ **Scalability:** Easy to add production/shipping files in future phases  
✅ **Consistency:** Aligns with GraphQL schema from Point 4  

---

**Implementation Complete:** Point 5 ✅  
**Next Recommended:** Continue with remaining points from CASES_DOMAIN_ANALYSIS.md or deploy Point 4 AppSync schema.
