/**
 * KPI Data Model - Enhanced for ISO 9001:2015 with CAPA Integration
 * 
 * PHASE 2 ENHANCEMENTS:
 * - Actual vs Target tracking with alerting
 * - Variance calculation (auto-calculated)
 * - Linked CAPAs (for effectiveness verification)
 * - Management Review history
 * - Status: on-track | warning | critical (auto-calculated)
 */

// ============================================================================
// A. CORE INTERFACES
// ============================================================================

export interface KPIActualRecord {
  period: string;           // "2026-03", "2026-Q1"
  value: number;            // Actual achievement
  target: number;           // Target value
  variance: number;         // Calculated: (actual - target) / target * 100
  status: "on-track" | "warning" | "critical"; // Auto-calculated
  source: string;           // "IPM-Sheet-A", "Manual Entry", "System"
  enteredBy: string;
  enteredAt: string;        // ISO 8601 timestamp
}

export interface KPIManagementReview {
  date: string;
  f21Ref: string;           // e.g., "F/21-002"
  decision: string;         // "Continue Monitoring", "Review Target", "CAPA Initiated"
  notes?: string;
}

export interface OperationalKPI {
  id: string;               // e.g., "KPI-PROD-01"
  name: string;             // Display name
  description: string;
  category: string;         // "Production", "Quality", "HR", "Finance"
  role: string;             // Owner role
  target: number;           // Target value (e.g., 95.0 for 95%)
  unit: string;             // "%", "days", "count", "hours"
  frequency: "monthly" | "quarterly" | "annual";
  
  // Actuals array (historical data)
  actuals: KPIActualRecord[];
  
  // Variance (auto-calculated from latest actual)
  currentVariance: number;
  currentStatus: "on-track" | "warning" | "critical";
  
  // CAPA Integration
  linkedCAPAs: string[];      // Array of F/22-XXX or trace IDs
  
  // Management Review tracking
  reviewHistory: KPIManagementReview[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ============================================================================
// B. KPI REGISTRY STORAGE
// ============================================================================

const KPI_STORAGE_KEY = "qms_operational_kpis";

// Pre-populated operational KPIs aligned with company structure
export const DEFAULT_KPIs: OperationalKPI[] = [
  // Production KPIs
  {
    id: "KPI-PROD-01",
    name: "Annotation Accuracy",
    description: "Percentage of correctly annotated images/videos",
    category: "Production",
    role: "Team Leader",
    target: 98.5,
    unit: "%",
    frequency: "monthly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "KPI-PROD-02",
    name: "Production Output",
    description: "Units completed per agent per day",
    category: "Production",
    role: "Operations Director",
    target: 250,
    unit: "count",
    frequency: "monthly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  
  // Quality KPIs
  {
    id: "KPI-QUAL-01",
    name: "Customer Complaint Rate",
    description: "Number of complaints per 1000 units delivered",
    category: "Quality",
    role: "Quality Manager",
    target: 0.5,
    unit: "%",
    frequency: "monthly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "KPI-QUAL-02",
    name: "CAPA Effectiveness Rate",
    description: "Percentage of CAPAs with verified effectiveness",
    category: "Quality",
    role: "Quality Manager",
    target: 95.0,
    unit: "%",
    frequency: "quarterly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  
  // HR KPIs
  {
    id: "KPI-HR-01",
    name: "Training Completion Rate",
    description: "Percentage of required training completed on time",
    category: "HR",
    role: "HR Manager",
    target: 100.0,
    unit: "%",
    frequency: "monthly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "KPI-HR-02",
    name: "Agent Turnover Rate",
    description: "Percentage of agents terminated/resigned per quarter",
    category: "HR",
    role: "HR Manager",
    target: 8.0,
    unit: "%",
    frequency: "quarterly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  
  // Client KPIs
  {
    id: "KPI-CLIENT-01",
    name: "Client Satisfaction Score",
    description: "Average client satisfaction rating (1-10)",
    category: "Client",
    role: "Operations Director",
    target: 9.0,
    unit: "score",
    frequency: "quarterly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
  {
    id: "KPI-CLIENT-02",
    name: "On-Time Delivery Rate",
    description: "Percentage of projects delivered on or before deadline",
    category: "Client",
    role: "Operations Director",
    target: 98.0,
    unit: "%",
    frequency: "monthly",
    actuals: [],
    currentVariance: 0,
    currentStatus: "on-track",
    linkedCAPAs: [],
    reviewHistory: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
];

// ============================================================================
// C. STORAGE FUNCTIONS
// ============================================================================

export function loadKPIsFromStorage(): OperationalKPI[] {
  try {
    const data = localStorage.getItem(KPI_STORAGE_KEY);
    if (!data) {
      // Initialize with defaults
      saveKPIsToStorage(DEFAULT_KPIs);
      return DEFAULT_KPIs;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_KPIs;
  }
}

export function saveKPIsToStorage(kpis: OperationalKPI[]): void {
  localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(kpis));
}

// ============================================================================
// D. CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate variance and status from actual vs target
 */
export function calculateKPIStatus(
  actual: number, 
  target: number, 
  isLowerBetter: boolean = false
): { variance: number; status: "on-track" | "warning" | "critical" } {
  if (target === 0) return { variance: 0, status: "on-track" };
  
  const variance = ((actual - target) / target) * 100;
  
  // For metrics where lower is better (e.g., complaints, defects)
  if (isLowerBetter) {
    if (variance <= -10) return { variance, status: "critical" }; // 10% better than target
    if (variance <= -5) return { variance, status: "warning" };
    return { variance, status: "on-track" };
  }
  
  // For metrics where higher is better (e.g., accuracy, completion)
  if (variance >= -5) return { variance, status: "on-track" }; // Within 5% of target
  if (variance >= -10) return { variance, status: "warning" };
  return { variance, status: "critical" };
}

/**
 * Add actual value to KPI
 */
export function addKPIActual(
  kpiId: string,
  period: string,
  value: number,
  enteredBy: string
): OperationalKPI | null {
  const kpis = loadKPIsFromStorage();
  const kpi = kpis.find(k => k.id === kpiId);
  if (!kpi) return null;
  
  const isLowerBetter = kpi.unit === "%" && kpi.name.toLowerCase().includes("complaint");
  const { variance, status } = calculateKPIStatus(value, kpi.target, isLowerBetter);
  
  const actualRecord: KPIActualRecord = {
    period,
    value,
    target: kpi.target,
    variance,
    status,
    source: "Manual Entry",
    enteredBy,
    enteredAt: new Date().toISOString(),
  };
  
  kpi.actuals.push(actualRecord);
  kpi.currentVariance = variance;
  kpi.currentStatus = status;
  kpi.updatedAt = new Date().toISOString();
  
  saveKPIsToStorage(kpis);
  return kpi;
}

/**
 * Link CAPA to KPI (for effectiveness tracking)
 */
export function linkCAPAToKPI(kpiId: string, capaId: string): OperationalKPI | null {
  const kpis = loadKPIsFromStorage();
  const kpi = kpis.find(k => k.id === kpiId);
  if (!kpi) return null;
  
  if (!kpi.linkedCAPAs.includes(capaId)) {
    kpi.linkedCAPAs.push(capaId);
    kpi.updatedAt = new Date().toISOString();
    saveKPIsToStorage(kpis);
  }
  
  return kpi;
}

/**
 * Get KPIs by category
 */
export function getKPIsByCategory(category: string): OperationalKPI[] {
  const kpis = loadKPIsFromStorage();
  return kpis.filter(k => k.category === category && k.isActive);
}

/**
 * Get KPIs by status (for alerting)
 */
export function getKPIsByStatus(status: "on-track" | "warning" | "critical"): OperationalKPI[] {
  const kpis = loadKPIsFromStorage();
  return kpis.filter(k => k.currentStatus === status && k.isActive);
}

/**
 * Get KPIs with linked CAPAs
 */
export function getKPIsWithLinkedCAPAs(): OperationalKPI[] {
  const kpis = loadKPIsFromStorage();
  return kpis.filter(k => k.linkedCAPAs.length > 0);
}

/**
 * Add management review entry
 */
export function addKPIReviewEntry(
  kpiId: string,
  f21Ref: string,
  decision: string,
  notes?: string
): OperationalKPI | null {
  const kpis = loadKPIsFromStorage();
  const kpi = kpis.find(k => k.id === kpiId);
  if (!kpi) return null;
  
  const review: KPIManagementReview = {
    date: new Date().toISOString(),
    f21Ref,
    decision,
    notes,
  };
  
  kpi.reviewHistory.push(review);
  kpi.updatedAt = new Date().toISOString();
  saveKPIsToStorage(kpis);
  
  return kpi;
}

// ============================================================================
// E. ALERT FUNCTIONS
// ============================================================================

/**
 * Get all KPIs requiring attention (warning or critical)
 */
export function getKPIsRequiringAttention(): { critical: OperationalKPI[]; warning: OperationalKPI[] } {
  const kpis = loadKPIsFromStorage();
  return {
    critical: kpis.filter(k => k.currentStatus === "critical" && k.isActive),
    warning: kpis.filter(k => k.currentStatus === "warning" && k.isActive),
  };
}

/**
 * Get summary statistics
 */
export function getKPISummary(): {
  total: number;
  onTrack: number;
  warning: number;
  critical: number;
  withLinkedCAPAs: number;
} {
  const kpis = loadKPIsFromStorage();
  return {
    total: kpis.filter(k => k.isActive).length,
    onTrack: kpis.filter(k => k.currentStatus === "on-track" && k.isActive).length,
    warning: kpis.filter(k => k.currentStatus === "warning" && k.isActive).length,
    critical: kpis.filter(k => k.currentStatus === "critical" && k.isActive).length,
    withLinkedCAPAs: kpis.filter(k => k.linkedCAPAs.length > 0 && k.isActive).length,
  };
}

// ============================================================================
// F. EXPORT
// ============================================================================

// Export singleton for immediate use
export const KPI_REGISTRY = {
  load: loadKPIsFromStorage,
  save: saveKPIsToStorage,
  addActual: addKPIActual,
  linkCAPA: linkCAPAToKPI,
  getByCategory: getKPIsByCategory,
  getByStatus: getKPIsByStatus,
  getRequiringAttention: getKPIsRequiringAttention,
  addReview: addKPIReviewEntry,
  getSummary: getKPISummary,
};
