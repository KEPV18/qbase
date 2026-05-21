// ============================================================================
// Projects Data — All 9 Vezloo Projects with CRUD Operations
// ============================================================================

import { useState, useCallback, useEffect } from "react";

export interface TeamMember {
  role: string;
  count: number;
}

export interface Project {
  id: string;
  code: string;
  projectCode: string;
  serialNumber: string;
  name: string;
  type: string;
  client: string;
  status: "active" | "completed" | "pending";
  startDate?: string;
  endDate?: string;
  teamSize: number;
  team: TeamMember[];
  description: string;
  composition?: string;
  endProduct?: string;
  methodOfPrevention?: string;
  storageCondition?: string;
  distributionMethod?: string;
  supportPeriod?: string;
  licensing?: string;
  intendedUse?: string;
  regulatoryRequirements?: string;
  agents?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Initial Projects Data
const INITIAL_PROJECTS: Project[] = [
  {
    id: "VDP-001",
    code: "PROJ-001",
    projectCode: "VDP",
    serialNumber: "001",
    name: "Video Detection Project",
    type: "Video Classification & Detection",
    client: "External Client",
    status: "active",
    startDate: "2026-01-15",
    teamSize: 12,
    team: [
      { role: "Annotation Agents", count: 8 },
      { role: "Team Leaders", count: 2 },
      { role: "Quality Analysts", count: 2 }
    ],
    description: "AI-powered video classification and object detection project. Agents review and label video content, classify objects and events based on defined categories, and produce QA-validated outputs delivered through the client platform. Videos are stored on a client-secured platform with no local storage permitted. Intended for AI model training and improvement.",
    composition: "Agents, Team Leaders, Quality Analysts, Client Detection Platform, Approved Guidelines & SOPs",
    endProduct: "Reviewed and labeled videos, Detection results based on defined categories, QA-validated outputs delivered through client platform",
    methodOfPrevention: "Initial training before task assignment, Clear detection and classification guidelines, Random sampling and QA checks, Feedback and corrective actions when needed",
    storageCondition: "Videos stored on client-secured platform, Access limited to authorized project team only, No local storage or downloads",
    distributionMethod: "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod: "Continuous updates implemented based on client feedback, Ongoing support during project lifecycle",
    licensing: "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training and improvement",
    regulatoryRequirements: "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",

    createdAt: "2026-01-15",
    updatedAt: "2026-04-20"
  },
  {
    id: "VAI-002",
    code: "PROJ-002",
    projectCode: "VAI",
    serialNumber: "002",
    name: "Vocal AI Project",
    type: "Conversational AI Design, Testing & Optimization",
    client: "Internal R&D",
    status: "active",
    startDate: "2026-01-20",
    teamSize: 8,
    team: [
      { role: "Senior AI Operators", count: 4 },
      { role: "Junior AI Operators", count: 2 },
      { role: "QC Specialist", count: 1 },
      { role: "Team Leader", count: 1 }
    ],
    description: "Design, testing, and optimization of conversational AI systems with natural language processing capabilities. The team designs conversational flows, tests AI assistant performance, validates scenarios through QA, and delivers client-ready AI deployment support. Audio files are stored on a client-secured platform with strict access controls. Intended for conversational AI optimization, assistant performance improvement, and model training support.",
    composition: "7 Team Members (4 Senior AOs, 2 Junior AOs, 1 QC), 1 Team Leader, Client Conversational Platform, Approved Guidelines & SOPs",
    endProduct: "Designed and optimized conversational flows, Tested and validated AI assistant performance, Documented and QA-approved conversational scenarios, Client-ready AI deployment support",
    methodOfPrevention: "Initial training before task assignment, Clear conversational design and testing guidelines, Random sampling and QA checks, Continuous feedback and corrective actions, Structured QC reporting system, Escalation workflow for undetected issues, Team Leader review for quality gaps",
    storageCondition: "Audio files stored on client-secured platform, Access restricted to authorized project team only, No local storage or downloads",
    distributionMethod: "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod: "Continuous updates based on client feedback, Ongoing operational support during project lifecycle, Continuous performance monitoring",
    licensing: "NDA signed with the client, All audio data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "Conversational AI optimization, assistant performance improvement, and model training support",
    regulatoryRequirements: "Client Data Privacy Policies, Confidentiality Agreements, Internal SOP Compliance, ISO 9001 Quality Framework",

    createdAt: "2026-01-20",
    updatedAt: "2026-04-20"
  },
  {
    id: "TSA-003",
    code: "PROJ-003",
    projectCode: "TSA",
    serialNumber: "003",
    name: "Tennis / Sports Analytics Project",
    type: "Sports Data Analysis, Match Review & Performance Tagging",
    client: "Sports Analytics Company",
    status: "active",
    startDate: "2026-02-01",
    teamSize: 6,
    team: [
      { role: "Sports Analytics Agents", count: 3 },
      { role: "Tennis Analysts", count: 2 },
      { role: "Quality Analysts", count: 1 }
    ],
    description: "Comprehensive sports data analysis and match review project focused on tennis. Agents analyze match videos, tag performance events, classify player actions, and produce QA-validated analytics outputs. Match videos and analytics data are stored on a client-secured platform. Intended for sports performance analysis, player and match analytics, and AI/predictive sports models training.",
    composition: "Sports Analytics Agents, Tennis Analysts, Team Leaders, Quality Analysts, Sports Analytics Platform / Client Platform",
    endProduct: "Analyzed and tagged tennis match data, Performance metrics and event classifications, Accurate and QA-validated sports analytics outputs",
    methodOfPrevention: "Initial training on tennis rules and analytics criteria, Clear analysis and tagging guidelines, Random sampling and QA checks, Feedback and corrective actions when needed",
    storageCondition: "Match videos and analytics data stored on client-secured platform, Access limited to authorized analysts only, No local storage",
    distributionMethod: "Results submitted through client analytics platform, Secure system-based data delivery",
    supportPeriod: "Continuous updates based on client feedback, Ongoing analytical support during project lifecycle, Periodic recalibration sessions",
    licensing: "NDA signed with the client, All sports data, videos, and analytics outputs are client-owned, Internal use only for project execution",
    intendedUse: "Sports performance analysis, Player and match analytics, AI and predictive sports models training",
    regulatoryRequirements: "Client data protection policies, Internal quality and validation procedures, ISO 9001 requirements (where applicable)",

    createdAt: "2026-02-01",
    updatedAt: "2026-04-15"
  },
  {
    id: "OMN-004",
    code: "PROJ-004",
    projectCode: "OMN",
    serialNumber: "004",
    name: "OMNIAZ — Annotation & Store Miner Project",
    type: "Data Annotation + Store Miner & Mapping",
    client: "OMNIAZ Platform",
    status: "active",
    startDate: "2026-02-10",
    teamSize: 12,
    team: [
      { role: "Annotation Agents", count: 4 },
      { role: "Store Miner Agents", count: 6 },
      { role: "Reviewers", count: 2 }
    ],
    description: "Comprehensive data annotation and store location mapping project for the OMNIAZ retail intelligence platform. The team performs accurate data annotation tasks and validates store mapping data. Daily continuous review with instant correction upon detection ensures quality. Data is managed and stored on the client platform with direct submission through the client system.",
    composition: "10 Agents (4 Annotation + 6 Store Miner) + 2 Reviewers",
    endProduct: "Accurately annotated tasks and validated store mapping data",
    methodOfPrevention: "Daily continuous review + instant correction upon detection",
    storageCondition: "Data managed and stored on client platform",
    distributionMethod: "Direct submission through client system",
    supportPeriod: "Updates implemented based on client new requirements",
    licensing: "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "Retail intelligence platform data enrichment and store location mapping",
    regulatoryRequirements: "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",

    createdAt: "2026-02-10",
    updatedAt: "2026-04-18"
  },
  {
    id: "ETH-005",
    code: "PROJ-005",
    projectCode: "ETH",
    serialNumber: "005",
    name: "ETH — AI Model Testing Project",
    type: "AI Output Evaluation & Validation",
    client: "ETH / Adam",
    status: "completed",
    startDate: "2026-02-28",
    endDate: "2026-03-05",
    teamSize: 29,
    team: [
      { role: "Annotation Agents", count: 25 },
      { role: "Auditors", count: 4 }
    ],
    description: "AI model output evaluation and validation project. A large team of 25 agents evaluates AI-generated outputs against defined criteria, with 4 auditors providing quality oversight. Results are reviewed through random sampling and QA checks with corrective actions. All data and outputs are client-owned under NDA. Intended for AI model training, fine-tuning, and performance improvement.",
    composition: "25 Annotation Agents, 4 Auditors, Team Leader, Client AI Platform, Approved Evaluation Guidelines & SOPs",
    endProduct: "Evaluated and validated AI model outputs, Annotated feedback on model performance, QA-validated results delivered through client platform",
    methodOfPrevention: "Initial training on evaluation criteria, Clear validation and annotation guidelines, Random sampling and QA checks, Feedback and corrective actions, Structured QC reporting",
    storageCondition: "AI outputs and evaluation data stored on client-secured platform, Access limited to authorized project team only",
    distributionMethod: "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod: "Continuous updates based on client feedback, Ongoing support during project lifecycle",
    licensing: "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training, fine-tuning, and performance improvement",
    regulatoryRequirements: "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",

    agents: ["VIZ-001", "VIZ-002", "VIZ-003", "VIZ-004", "VIZ-005", "VIZ-006", "VIZ-007",
              "VIZ-008", "VIZ-009", "VIZ-010", "VIZ-011", "VIZ-012", "VIZ-013", "VIZ-014", "VIZ-015", "VIZ-016"],
    createdAt: "2026-02-01",
    updatedAt: "2026-03-05"
  },
  {
    id: "BTF-006",
    code: "PROJ-006",
    projectCode: "BTF",
    serialNumber: "006",
    name: "BatFast Project",
    type: "Image Annotation",
    client: "BatFast",
    status: "completed",
    startDate: "2026-02-01",
    endDate: "2026-02-17",
    teamSize: 5,
    team: [
      { role: "Annotation Agents", count: 5 }
    ],
    description: "Image annotation project for the BatFast platform. Five annotation agents label and annotate images according to defined guidelines, with quality assurance through random sampling and corrective feedback loops. All data and outputs are client-owned under NDA. Intended for AI model training and image recognition improvement.",
    composition: "5 Annotation Agents, Team Leader, Client Annotation Platform, Approved Guidelines & SOPs",
    endProduct: "Accurately labeled and annotated images, QA-validated image datasets, Results delivered through client platform",
    methodOfPrevention: "Initial training on annotation criteria, Clear annotation guidelines, Random sampling and QA checks, Feedback and corrective actions",
    storageCondition: "Images stored on client-secured platform, Access limited to authorized project team only",
    distributionMethod: "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod: "Updates based on client feedback, Ongoing support during project lifecycle",
    licensing: "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training and image recognition improvement",
    regulatoryRequirements: "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",

    agents: ["VIZ-001", "VIZ-002", "VIZ-003", "VIZ-004", "VIZ-005"],
    createdAt: "2026-01-25",
    updatedAt: "2026-02-17"
  },
  {
    id: "ETH2-007",
    code: "PROJ-007",
    projectCode: "ETH2",
    serialNumber: "007",
    name: "ETH — AI Model Testing Project (Batch 2)",
    type: "AI Model Output Validation",
    client: "ETH / Adam",
    status: "completed",
    startDate: "2026-02-28",
    endDate: "2026-03-05",
    teamSize: 15,
    team: [
      { role: "Annotation Agents", count: 12 },
      { role: "Team Leaders", count: 2 },
      { role: "QA Specialist", count: 1 }
    ],
    description: "Second batch of AI model output evaluation and validation for the ETH project. A team of 12 annotation agents with 2 team leaders and 1 QA specialist evaluates AI-generated outputs against defined criteria. Quality is ensured through structured QC reporting, random sampling, and corrective feedback. Intended for AI model training, fine-tuning, and performance improvement.",
    composition: "12 Annotation Agents, 2 Team Leaders, 1 QA Specialist, Client AI Platform, Approved Evaluation Guidelines & SOPs",
    endProduct: "Evaluated and validated AI model outputs, Annotated feedback on model performance, QA-validated results delivered through client platform",
    methodOfPrevention: "Initial training on evaluation criteria, Clear validation guidelines, Random sampling and QA checks, Structured QC reporting, Corrective actions and feedback loops",
    storageCondition: "AI outputs and evaluation data stored on client-secured platform, Access limited to authorized project team only",
    distributionMethod: "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod: "Continuous updates based on client feedback, Ongoing support during project lifecycle",
    licensing: "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training, fine-tuning, and performance improvement",
    regulatoryRequirements: "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",

    createdAt: "2026-02-15",
    updatedAt: "2026-03-05"
  },
  {
    id: "ETC-008",
    code: "PROJ-008",
    projectCode: "ETC",
    serialNumber: "008",
    name: "ETH-Cedric — Video Annotation Project",
    type: "Video Annotation & Quality Review",
    client: "Cedric",
    status: "completed",
    startDate: "2026-02-25",
    endDate: "2026-03-05",
    teamSize: 8,
    team: [
      { role: "Annotation Agents", count: 6 },
      { role: "Team Leader", count: 1 },
      { role: "QA Specialist", count: 1 }
    ],
    description: "Video annotation and quality review project for ETH-Cedric. A team of 6 annotation agents, 1 team leader, and 1 QA specialist annotates video content according to defined guidelines with rigorous validation. Quality is ensured through random sampling, QC reporting, and corrective actions. Intended for AI model training, fine-tuning, and video recognition improvement.",
    composition: "6 Annotation Agents, 1 Team Leader, 1 QA Specialist, Client Video Platform, Approved Annotation Guidelines & SOPs",
    endProduct: "Accurately annotated video datasets, QA-validated video annotations, Results delivered through client platform",
    methodOfPrevention: "Initial training on video annotation criteria, Clear annotation and review guidelines, Random sampling and QA checks, Feedback and corrective actions",
    storageCondition: "Videos stored on client-secured platform, Access limited to authorized project team only, No local storage or downloads",
    distributionMethod: "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod: "Updates implemented based on client feedback, Ongoing support during project lifecycle",
    licensing: "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training, fine-tuning, and video recognition improvement",
    regulatoryRequirements: "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",

    agents: ["VIZ-001", "VIZ-003", "VIZ-013", "VIZ-017", "VIZ-018", "VIZ-019"],
    createdAt: "2026-02-20",
    updatedAt: "2026-03-05"
  },
  {
    id: "FAT-009",
    code: "PROJ-009",
    projectCode: "FAT",
    serialNumber: "009",
    name: "Fallback Annotation Tool",
    type: "Video Annotation — Retail AI",
    client: "External Client (Retail)",
    status: "active",
    startDate: "2026-04-20",
    teamSize: 10,
    team: [
      { role: "Annotation Agents", count: 6 },
      { role: "Team Leader", count: 1 },
      { role: "QA Specialist", count: 1 },
      { role: "New Onboarded Agents", count: 4 },
      { role: "Trainer", count: 1 }
    ],
    description: "Video annotation project using a fallback annotation tool for retail AI data labeling. Initially staffed with 6 agents (including trainer Maria Magdy), later expanded with 4 additional onboarded agents. Quality is ensured through structured client training sessions, random sampling, and QC reviews. All annotation is performed on the client platform with no local storage permitted.",
    composition: "6 Initial Annotation Agents, 4 Onboarded Agents, 1 Team Leader, 1 QA Specialist, Trainer (Maria Magdy), Client Annotation Platform, Approved Guidelines & SOPs",
    endProduct: "Annotated video datasets for retail AI, QA-validated annotations, Results delivered through client platform",
    methodOfPrevention: "Initial training before task assignment, 4 client training sessions, Onboarding sessions for new agents, Random sampling and QA checks, Feedback and corrective actions",
    storageCondition: "Videos stored on client-secured platform, Access limited to authorized project team only, No local storage or downloads",
    distributionMethod: "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod: "Continuous updates based on client feedback, Ongoing support during project lifecycle",
    licensing: "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training for retail annotation, Video recognition improvement",
    regulatoryRequirements: "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",
    agents: ["VIZ-003", "VIZ-018", "VIZ-001", "VIZ-002", "VIZ-019", "VIZ-020", "VIZ-021", "VIZ-022", "VIZ-023", "VIZ-024"],
    createdAt: "2026-04-18",
    updatedAt: "2026-05-09"
  }
];

// Storage Key
const STORAGE_KEY = "vezloo_projects_data";

// ============================================================================
// CRUD Operations
// ============================================================================

let projectsCache: Project[] | null = null;

// Get all projects
export const getAllProjects = (): Project[] => {
  if (projectsCache) return projectsCache;
  
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        projectsCache = JSON.parse(stored);
        return projectsCache || INITIAL_PROJECTS;
      } catch {
        console.error("Failed to parse projects from localStorage");
      }
    }
  }
  return INITIAL_PROJECTS;
};

// Save projects to storage
const saveProjects = (projects: Project[]): void => {
  projectsCache = projects;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
};

// Get project by ID
export const getProjectById = (id: string): Project | null => {
  const projects = getAllProjects();
  return projects.find(p => p.id === id) || null;
};

// Get projects by status
export const getActiveProjects = (): Project[] => {
  return getAllProjects().filter(p => p.status === "active");
};

export const getCompletedProjects = (): Project[] => {
  return getAllProjects().filter(p => p.status === "completed");
};

export const getPendingProjects = (): Project[] => {
  return getAllProjects().filter(p => p.status === "pending");
};

// Generate next project code
export const getNextProjectCode = (): string => {
  const projects = getAllProjects();
  const numbers = projects
    .map(p => {
      const match = p.code.match(/PROJ-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `PROJ-${String(max + 1).padStart(3, "0")}`;
};

// Create new project
export const createProject = (projectData: Omit<Project, "id" | "code" | "projectCode" | "serialNumber" | "createdAt" | "updatedAt">): Project => {
  const projects = getAllProjects();
  const nextSerial = projects.length + 1;
  const serialStr = String(nextSerial).padStart(3, "0");
  const newProject: Project = {
    ...projectData,
    id: `PRJ-${serialStr}`,
    code: `PROJ-${serialStr}`,
    projectCode: `PRJ`,
    serialNumber: serialStr,
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0]
  };
  saveProjects([...projects, newProject]);
  return newProject;
};

// Update project
export const updateProject = (id: string, updates: Partial<Project>): Project | null => {
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const updatedProject = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString().split("T")[0]
  };
  
  projects[index] = updatedProject;
  saveProjects(projects);
  return updatedProject;
};

// Delete project
export const deleteProject = (id: string): boolean => {
  const projects = getAllProjects();
  const filtered = projects.filter(p => p.id !== id);
  if (filtered.length === projects.length) return false;
  saveProjects(filtered);
  return true;
};

// Get unique clients
export const getUniqueClients = (): string[] => {
  const projects = getAllProjects();
  return Array.from(new Set(projects.map(p => p.client))).sort();
};

// Get project statistics
export const getProjectStats = () => {
  const projects = getAllProjects();
  const totalAgents = projects.reduce((sum, p) => sum + p.teamSize, 0);
  const uniqueAgents = new Set<string>();
  projects.forEach(p => p.agents?.forEach(a => uniqueAgents.add(a)));
  
  return {
    total: projects.length,
    active: projects.filter(p => p.status === "active").length,
    completed: projects.filter(p => p.status === "completed").length,
    pending: projects.filter(p => p.status === "pending").length,
    totalTeam: totalAgents,
    totalUniqueAgents: uniqueAgents.size
  };
};

// Reset to initial data (for testing)
export const resetProjects = (): void => {
  projectsCache = [...INITIAL_PROJECTS];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PROJECTS));
  }
};

// ============================================================================
// React Hook
// ============================================================================

export const useProjects = () => {
  const [projects, setProjectsState] = useState<Project[]>(getAllProjects);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh from storage
  const refresh = useCallback(() => {
    projectsCache = null;
    setProjectsState(getAllProjects());
  }, []);

  // Create
  const create = useCallback((data: Omit<Project, "id" | "code" | "createdAt" | "updatedAt">) => {
    setIsLoading(true);
    const newProject = createProject(data);
    refresh();
    setIsLoading(false);
    return newProject;
  }, [refresh]);

  // Update
  const update = useCallback((id: string, updates: Partial<Project>) => {
    setIsLoading(true);
    const updated = updateProject(id, updates);
    refresh();
    setIsLoading(false);
    return updated;
  }, [refresh]);

  // Delete
  const remove = useCallback((id: string) => {
    setIsLoading(true);
    const result = deleteProject(id);
    refresh();
    setIsLoading(false);
    return result;
  }, [refresh]);

  // Get by ID
  const getById = useCallback((id: string) => {
    return projects.find(p => p.id === id) || null;
  }, [projects]);

  return {
    projects,
    isLoading,
    refresh,
    create,
    update,
    delete: remove,
    getById,
    stats: getProjectStats(),
    clients: getUniqueClients()
  };
};

// ============================================================================
// Export Initial Data for Reference
// ============================================================================
export const PROJECTS_DATA = getAllProjects();
