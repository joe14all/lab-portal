/**
 * Cases Domain Type Definitions
 * Implements optimistic locking via version field for concurrency control
 */

export interface CaseUnit {
  id: string;
  tooth: number;
  type: string;
  material: string;
  shade?: string;
  stumpShade?: string;
  instructions?: string;
  status: string;
  holdReason?: string | null;
  
  /**
   * Foreign key reference to products.json
   * Enables automated price calculation from catalog
   * Replaces fragile string matching on type + material
   */
  productId?: string;
}

export interface CasePatient {
  name: string;
  age?: number;
  gender?: string;
  chartNumber?: string;
}

export interface CaseDates {
  created: string;
  received?: string;
  due: string;
  shipped?: string | null;
}

export interface CaseFinancial {
  priceListId: string;
  estimatedTotal: number;
  currency: string;
  invoiceId?: string | null;
}

export interface Case {
  id: string;
  labId: string;
  caseNumber: string;
  clinicId: string;
  doctorId: string;
  patient: CasePatient;
  status: string;
  dates: CaseDates;
  units: CaseUnit[];
  panNumbers?: string[];
  financial: CaseFinancial;
  tags?: string[];
  holdReason?: string | null;
  heldAtStageId?: string | null;
  
  /**
   * Version field for optimistic locking
   * Incremented on every update to prevent concurrent modification conflicts
   * @default 0
   */
  version: number;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface CaseUpdatePayload {
  units?: CaseUnit[];
  status?: string;
  holdReason?: string | null;
  heldAtStageId?: string | null;
  dates?: Partial<CaseDates>;
  financial?: Partial<CaseFinancial>;
  tags?: string[];
  panNumbers?: string[];
  
  /**
   * Required for optimistic locking - must match current version
   */
  version: number;
}

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

/**
 * Error thrown when version mismatch detected during update
 */
export class ConcurrencyError extends Error {
  constructor(
    public readonly entityId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Concurrency conflict: Case ${entityId} was modified by another user. ` +
      `Expected version ${expectedVersion}, but found ${actualVersion}.`
    );
    this.name = 'ConcurrencyError';
  }
}
