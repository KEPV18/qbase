// VEZLOO Individual Performance Management (IPM) - KPI Data
// Auto-generated and enhanced from IPM sheets
// Source: /home/kepa/Downloads/FORMS/vezlooipmssheets/

export interface KPI {
  id: string;
  category: string;
  objective: string;
  weight: number;
  target: number;
  evaluation: number | null;
  frequency: string;
}

export interface RoleKPIData {
  roleKey: string;
  title: string;
  department: string;
  manager: string;
  jobLevel: string;
  employmentStatus: string;
  kpiWeight: number;
  competenciesWeight: number;
  kpis: KPI[];
}

// Raw data import
import kpiDataJson from './kpiData.json';

export const KPI_DATA: RoleKPIData[] = (kpiDataJson as RoleKPIData[]).map(role => {
  // Normalize weights so they sum to 1.0 (100%) per role
  const rawWeights = role.kpis.map(kpi => kpi.weight || 0.1);
  const rawSum = rawWeights.reduce((a, b) => a + b, 0);
  return {
    ...role,
    kpis: role.kpis.map((kpi, i) => ({
      ...kpi,
      target: kpi.target || 0.9,
      weight: rawSum > 0 ? kpi.weight / rawSum : 1 / role.kpis.length,
    })),
  };
});

// Helper function to get KPIs by role
export const getKPIsByRole = (roleKey: string): RoleKPIData | undefined => {
  return KPI_DATA.find(role => role.roleKey === roleKey);
};

// Helper function to get role by title
export const getKPIsByTitle = (title: string): RoleKPIData | undefined => {
  return KPI_DATA.find(role => role.title === title);
};

// Helper function to get all role titles
export const getAllRoleTitles = (): string[] => {
  return KPI_DATA.map(role => role.title).filter((t): t is string => !!t);
};

// Helper function to get all unique categories
export const getAllCategories = (): string[] => {
  const categories = new Set<string>();
  KPI_DATA.forEach(role => {
    role.kpis.forEach(kpi => categories.add(kpi.category));
  });
  return Array.from(categories).sort();
};

// Helper function to get roles by manager
export const getRolesByManager = (managerName: string): RoleKPIData[] => {
  return KPI_DATA.filter(role => role.manager?.includes(managerName));
};

// Helper function to get roles by department
export const getRolesByDepartment = (department: string): RoleKPIData[] => {
  return KPI_DATA.filter(role => role.department === department);
};

// Helper function to calculate overall KPI score for a role
export const calculateRoleKPIScore = (roleData: RoleKPIData): number => {
  if (!roleData.kpis.length) return 0;
  const validKpis = roleData.kpis.filter(kpi => kpi.evaluation !== null);
  if (!validKpis.length) return 0;
  return validKpis.reduce((sum, kpi) => sum + (kpi.weight * (kpi.evaluation || 0)), 0);
};

// Helper function to get KPI achievement percentage
export const calculateKPIAchievement = (kpi: KPI): number => {
  if (kpi.evaluation === null || kpi.target === 0) return 0;
  return (kpi.evaluation / kpi.target) * 100;
};

// Helper function to generate category color
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Data Quality & Accuracy': '#10b981', // emerald-500
    'Team Management': '#3b82f6', // blue-500
    'Project Delivery': '#f59e0b', // amber-500
    'Quality Management': '#ef4444', // red-500
    'Training & Development': '#8b5cf6', // violet-500
    'Client Satisfaction': '#06b6d4', // cyan-500
    'Strategic Objectives': '#ec4899', // pink-500
  };
  return colors[category] || '#6b7280'; // gray-500
};

// Helper to map projects to team leaders
export const getTeamLeaderForProject = (projectName: string): RoleKPIData | undefined => {
  const mapping: Record<string, string> = {
    'BatFast': 'Small_Projects_Team_Leader',
    'ETH': 'Get_Vocal_Team_Leader',
    'ETH-Cedric': 'Get_Vocal_Team_Leader',
    'ETH-Copy2': 'Get_Vocal_Team_Leader',
    'Video Detection': 'Veesion_Team_Leader',
    'Vocal AI': 'Get_Vocal_Team_Leader',
    'Tennis Analytics': 'Data_Quality_Specialist',
    'OMNIAZ': 'Omniaz_Team_Leader',
  };
  return KPI_DATA.find(r => r.roleKey === mapping[projectName]);
};

// Audit-ready statistics
export const getKPIStatistics = () => {
  const totalRoles = KPI_DATA.length;
  const totalKPIs = KPI_DATA.reduce((sum, r) => sum + r.kpis.length, 0);
  const categories = getAllCategories();
  const avgKPIsPerRole = totalKPIs / totalRoles;
  
  // Weight validation (should sum to 1.0 for each role)
  const rolesWithValidWeights = KPI_DATA.filter(role => {
    const totalWeight = role.kpis.reduce((sum, k) => sum + k.weight, 0);
    return totalWeight >= 0.95 && totalWeight <= 1.05;
  });
  
  return {
    totalRoles,
    totalKPIs,
    categories: categories.length,
    avgKPIsPerRole: Math.round(avgKPIsPerRole * 10) / 10,
    rolesWithValidWeights: rolesWithValidWeights.length,
    departments: new Set(KPI_DATA.map(r => r.department)).size
  };
};
