// ============================================================================
// QMS Forge — Project Data (Static Seed)
// Source of truth for all Vezloo projects with QMS compliance data.
// This file replaces localStorage-based project storage with a persistent
// file-based approach that survives browser cache clears.
// ============================================================================

export interface TeamRole {
  role: string;
  count: number;
}

export interface QMSRecord {
  serial: string;
  formCode: string;
  formName: string;
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
  startDate: string;
  endDate?: string;
  teamSize: number;
  team: TeamRole[];
  description: string;
  composition: string;
  endProduct: string;
  methodOfPrevention: string;
  storageCondition: string;
  distributionMethod: string;
  supportPeriod: string;
  licensing: string;
  intendedUse: string;
  regulatoryRequirements: string;
  agents?: string[];
  qmsRecords: QMSRecord[];
  createdAt: string;
  updatedAt: string;
}

export const PROJECTS: Project[] = [
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
      { role: "Quality Analysts", count: 2 },
    ],
    description:
      "AI-powered video classification and object detection project. Agents review and label video content, classify objects and events based on defined categories, and produce QA-validated outputs delivered through the client platform. Videos are stored on a client-secured platform with no local storage permitted. Intended for AI model training and improvement.",
    composition:
      "Agents, Team Leaders, Quality Analysts, Client Detection Platform, Approved Guidelines & SOPs",
    endProduct:
      "Reviewed and labeled videos, Detection results based on defined categories, QA-validated outputs delivered through client platform",
    methodOfPrevention:
      "Initial training before task assignment, Clear detection and classification guidelines, Random sampling and QA checks, Feedback and corrective actions when needed",
    storageCondition:
      "Videos stored on client-secured platform, Access limited to authorized project team only, No local storage or downloads",
    distributionMethod:
      "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod:
      "Continuous updates implemented based on client feedback, Ongoing support during project lifecycle",
    licensing:
      "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training and improvement",
    regulatoryRequirements:
      "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",
    qmsRecords: [],
    createdAt: "2026-01-15",
    updatedAt: "2026-04-20",
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
      { role: "Team Leader", count: 1 },
    ],
    description:
      "Design, testing, and optimization of conversational AI systems with natural language processing capabilities. The team designs conversational flows, tests AI assistant performance, validates scenarios through QA, and delivers client-ready AI deployment support. Audio files are stored on a client-secured platform with strict access controls. Intended for conversational AI optimization, assistant performance improvement, and model training support.",
    composition:
      "7 Team Members (4 Senior AOs, 2 Junior AOs, 1 QC), 1 Team Leader, Client Conversational Platform, Approved Guidelines & SOPs",
    endProduct:
      "Designed and optimized conversational flows, Tested and validated AI assistant performance, Documented and QA-approved conversational scenarios, Client-ready AI deployment support",
    methodOfPrevention:
      "Initial training before task assignment, Clear conversational design and testing guidelines, Random sampling and QA checks, Continuous feedback and corrective actions, Structured QC reporting system, Escalation workflow for undetected issues, Team Leader review for quality gaps",
    storageCondition:
      "Audio files stored on client-secured platform, Access restricted to authorized project team only, No local storage or downloads",
    distributionMethod:
      "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod:
      "Continuous updates based on client feedback, Ongoing operational support during project lifecycle, Continuous performance monitoring",
    licensing:
      "NDA signed with the client, All audio data and outputs are client-owned, Internal use only for project execution",
    intendedUse:
      "Conversational AI optimization, assistant performance improvement, and model training support",
    regulatoryRequirements:
      "Client Data Privacy Policies, Confidentiality Agreements, Internal SOP Compliance, ISO 9001 Quality Framework",
    qmsRecords: [],
    createdAt: "2026-01-20",
    updatedAt: "2026-04-20",
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
      { role: "Quality Analysts", count: 1 },
    ],
    description:
      "Comprehensive sports data analysis and match review project focused on tennis. Agents analyze match videos, tag performance events, classify player actions, and produce QA-validated analytics outputs. Match videos and analytics data are stored on a client-secured platform. Intended for sports performance analysis, player and match analytics, and AI/predictive sports models training.",
    composition:
      "Sports Analytics Agents, Tennis Analysts, Team Leaders, Quality Analysts, Sports Analytics Platform / Client Platform",
    endProduct:
      "Analyzed and tagged tennis match data, Performance metrics and event classifications, Accurate and QA-validated sports analytics outputs",
    methodOfPrevention:
      "Initial training on tennis rules and analytics criteria, Clear analysis and tagging guidelines, Random sampling and QA checks, Feedback and corrective actions when needed",
    storageCondition:
      "Match videos and analytics data stored on client-secured platform, Access limited to authorized analysts only, No local storage",
    distributionMethod:
      "Results submitted through client analytics platform, Secure system-based data delivery",
    supportPeriod:
      "Continuous updates based on client feedback, Ongoing analytical support during project lifecycle, Periodic recalibration sessions",
    licensing:
      "NDA signed with the client, All sports data, videos, and analytics outputs are client-owned, Internal use only for project execution",
    intendedUse:
      "Sports performance analysis, Player and match analytics, AI and predictive sports models training",
    regulatoryRequirements:
      "Client data protection policies, Internal quality and validation procedures, ISO 9001 requirements (where applicable)",
    qmsRecords: [],
    createdAt: "2026-02-01",
    updatedAt: "2026-04-15",
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
      { role: "Reviewers", count: 2 },
    ],
    description:
      "Comprehensive data annotation and store location mapping project for the OMNIAZ retail intelligence platform. The team performs accurate data annotation tasks and validates store mapping data. Daily continuous review with instant correction upon detection ensures quality. Data is managed and stored on the client platform with direct submission through the client system.",
    composition: "10 Agents (4 Annotation + 6 Store Miner) + 2 Reviewers",
    endProduct:
      "Accurately annotated tasks and validated store mapping data",
    methodOfPrevention:
      "Daily continuous review + instant correction upon detection",
    storageCondition: "Data managed and stored on client platform",
    distributionMethod: "Direct submission through client system",
    supportPeriod:
      "Updates implemented based on client new requirements",
    licensing:
      "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse:
      "Retail intelligence platform data enrichment and store location mapping",
    regulatoryRequirements:
      "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",
    qmsRecords: [],
    createdAt: "2026-02-10",
    updatedAt: "2026-04-18",
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
      { role: "Auditors", count: 4 },
    ],
    description:
      "AI model output evaluation and validation project. A large team of 25 agents evaluates AI-generated outputs against defined criteria, with 4 auditors providing quality oversight. Results are reviewed through random sampling and QA checks with corrective actions. All data and outputs are client-owned under NDA. Intended for AI model training, fine-tuning, and performance improvement.",
    composition:
      "25 Annotation Agents, 4 Auditors, Team Leader, Client AI Platform, Approved Evaluation Guidelines & SOPs",
    endProduct:
      "Evaluated and validated AI model outputs, Annotated feedback on model performance, QA-validated results delivered through client platform",
    methodOfPrevention:
      "Initial training on evaluation criteria, Clear validation and annotation guidelines, Random sampling and QA checks, Feedback and corrective actions, Structured QC reporting",
    storageCondition:
      "AI outputs and evaluation data stored on client-secured platform, Access limited to authorized project team only",
    distributionMethod:
      "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod:
      "Continuous updates based on client feedback, Ongoing support during project lifecycle",
    licensing:
      "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse:
      "AI model training, fine-tuning, and performance improvement",
    regulatoryRequirements:
      "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",
    agents: [
      "VIZ-001", "VIZ-002", "VIZ-003", "VIZ-004", "VIZ-005",
      "VIZ-006", "VIZ-007", "VIZ-008", "VIZ-009", "VIZ-010",
      "VIZ-011", "VIZ-012", "VIZ-013", "VIZ-014", "VIZ-015",
      "VIZ-016",
    ],
    qmsRecords: [],
    createdAt: "2026-02-01",
    updatedAt: "2026-03-05",
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
    team: [{ role: "Annotation Agents", count: 5 }],
    description:
      "Image annotation project for the BatFast platform. Five annotation agents label and annotate images according to defined guidelines, with quality assurance through random sampling and corrective feedback loops. All data and outputs are client-owned under NDA. Intended for AI model training and image recognition improvement.",
    composition:
      "5 Annotation Agents, Team Leader, Client Annotation Platform, Approved Guidelines & SOPs",
    endProduct:
      "Accurately labeled and annotated images, QA-validated image datasets, Results delivered through client platform",
    methodOfPrevention:
      "Initial training on annotation criteria, Clear annotation guidelines, Random sampling and QA checks, Feedback and corrective actions",
    storageCondition:
      "Images stored on client-secured platform, Access limited to authorized project team only",
    distributionMethod:
      "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod:
      "Updates based on client feedback, Ongoing support during project lifecycle",
    licensing:
      "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse: "AI model training and image recognition improvement",
    regulatoryRequirements:
      "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",
    agents: ["VIZ-001", "VIZ-002", "VIZ-003", "VIZ-004", "VIZ-005"],
    qmsRecords: [],
    createdAt: "2026-01-25",
    updatedAt: "2026-02-17",
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
      { role: "QA Specialist", count: 1 },
    ],
    description:
      "Second batch of AI model output evaluation and validation for the ETH project. A team of 12 annotation agents with 2 team leaders and 1 QA specialist evaluates AI-generated outputs against defined criteria. Quality is ensured through structured QC reporting, random sampling, and corrective feedback. Intended for AI model training, fine-tuning, and performance improvement.",
    composition:
      "12 Annotation Agents, 2 Team Leaders, 1 QA Specialist, Client AI Platform, Approved Evaluation Guidelines & SOPs",
    endProduct:
      "Evaluated and validated AI model outputs, Annotated feedback on model performance, QA-validated results delivered through client platform",
    methodOfPrevention:
      "Initial training on evaluation criteria, Clear validation guidelines, Random sampling and QA checks, Structured QC reporting, Corrective actions and feedback loops",
    storageCondition:
      "AI outputs and evaluation data stored on client-secured platform, Access limited to authorized project team only",
    distributionMethod:
      "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod:
      "Continuous updates based on client feedback, Ongoing support during project lifecycle",
    licensing:
      "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse:
      "AI model training, fine-tuning, and performance improvement",
    regulatoryRequirements:
      "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",
    qmsRecords: [],
    createdAt: "2026-02-15",
    updatedAt: "2026-03-05",
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
      { role: "QA Specialist", count: 1 },
    ],
    description:
      "Video annotation and quality review project for ETH-Cedric. A team of 6 annotation agents, 1 team leader, and 1 QA specialist annotates video content according to defined guidelines with rigorous validation. Quality is ensured through random sampling, QC reporting, and corrective actions. Intended for AI model training, fine-tuning, and video recognition improvement.",
    composition:
      "6 Annotation Agents, 1 Team Leader, 1 QA Specialist, Client Video Platform, Approved Annotation Guidelines & SOPs",
    endProduct:
      "Accurately annotated video datasets, QA-validated video annotations, Results delivered through client platform",
    methodOfPrevention:
      "Initial training on video annotation criteria, Clear annotation and review guidelines, Random sampling and QA checks, Feedback and corrective actions",
    storageCondition:
      "Videos stored on client-secured platform, Access limited to authorized project team only, No local storage or downloads",
    distributionMethod:
      "Results submitted directly through the client platform, Secure system-based delivery",
    supportPeriod:
      "Updates implemented based on client feedback, Ongoing support during project lifecycle",
    licensing:
      "NDA signed with the client, All data and outputs are client-owned, Internal use only for project execution",
    intendedUse:
      "AI model training, fine-tuning, and video recognition improvement",
    regulatoryRequirements:
      "Client data protection policies, Internal quality procedures, ISO 9001 requirements (where applicable)",
    agents: [
      "VIZ-001", "VIZ-003", "VIZ-013", "VIZ-017", "VIZ-018", "VIZ-019",
    ],
    qmsRecords: [],
    createdAt: "2026-02-20",
    updatedAt: "2026-03-05",
  },
  {
    id: "PRJ-009",
    code: "PROJ-009",
    projectCode: "PRJ",
    serialNumber: "009",
    name: "Fallback Annotation Tool",
    type: "Video Annotation",
    client: "International Client",
    status: "active",
    startDate: "2026-04-20",
    teamSize: 11,
    team: [
      { role: "Annotation Agents", count: 10 },
      { role: "Team Lead", count: 1 },
    ],
    description:
      "Video annotation for AI model training and data enrichment. Client-provided fallback annotation tool for retail AI video labeling tasks.",
    composition: "10 Agents + 1 Team Lead",
    endProduct:
      "Reviewed and labeled videos with detection results based on defined criteria",
    methodOfPrevention:
      "Initial training before task assignment. Clear detection and quality guidelines. Review process for every batch.",
    storageCondition:
      "Videos stored on client-secured platform. Access limited to authorized personnel.",
    distributionMethod:
      "Results submitted directly through the client platform. Secure delivery.",
    supportPeriod:
      "Continuous updates implemented based on client feedback",
    licensing:
      "NDA signed with the client. All data and outputs are client-owned and confidential.",
    intendedUse:
      "Video annotation for AI model training and data enrichment",
    regulatoryRequirements:
      "Client data protection policies, Internal quality procedures",
    qmsRecords: [
      { serial: "F/08-006", formCode: "F/08", formName: "Order Form" },
      { serial: "F/19-009", formCode: "F/19", formName: "Product Description" },
      { serial: "F/11-009", formCode: "F/11", formName: "Production Plan" },
      { serial: "F/28-014", formCode: "F/28", formName: "Training Attendance" },
      { serial: "F/28-015", formCode: "F/28", formName: "Training Attendance" },
      { serial: "F/29-012", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/29-013", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/29-014", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/29-015", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/29-016", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/29-017", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/29-018", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/29-019", formCode: "F/29", formName: "Training & Competence Record" },
      { serial: "F/43-065", formCode: "F/43", formName: "Induction Training" },
      { serial: "F/43-066", formCode: "F/43", formName: "Induction Training" },
      { serial: "F/43-067", formCode: "F/43", formName: "Induction Training" },
      { serial: "F/43-068", formCode: "F/43", formName: "Induction Training" },
    ],
    createdAt: "2026-05-10",
    updatedAt: "2026-05-10",
  },
];