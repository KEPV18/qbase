export interface ManualSection {
  id: string;
  title: string;
  content: string;
  subsections?: { id: string; title: string; content: string }[];
}

export const MANNUAL_METADATA = {
  company: "Vezloo",
  documentNo: "M/01",
  revisionNo: "02",
  updateDate: "03/2026",
  approvalDate: "01/2026",
  preparedBy: "Ahmed Khaled (QMS Team Leader)",
  approvedBy: "Top Management",
};

export const MANUAL_CONTENT: ManualSection[] = [
  {
    id: "introduction",
    title: "1. VEZLOO INTRODUCTION",
    content: "At Vezloo, we are committed to delivering world-class Business Process Outsourcing (BPO) services with a focus on AI data annotation, data labeling, sports analytics, video detection, generative AI support, gaming, and transcription.\n\nThis Quality Policy applies to all services provided by Vezloo and forms the foundation of our Quality Management System (QMS). Our mission is to empower our clients with accurate, high-quality, and timely data solutions that enhance their business performance and technological innovation.\n\nVezloo operates from its head office in Cairo, Egypt, with remote operations managed by distributed teams under centralized quality oversight and management controls. The organization follows a hierarchical structure: CEO → Operations Director → Operations Managers → Team Leaders → Specialists and Operational Teams.",
    subsections: [
      {
        id: "authorization-statement",
        title: "1.1 AUTHORIZATION STATEMENT",
        content: "Vezloo is fully committed to the establishment and maintenance of a Quality Management System as described in this manual and implemented by the organization to meet the requirements of ISO 9001:2015.\n\nAll personnel of Vezloo shall strictly adhere to the quality policies and procedures as addressed or referred to in this manual.\n\nAhmed Khaled has been appointed as QMS Team Leader of Vezloo. The QMS Team Leader is responsible for ensuring compliance with the Quality requirements stipulated in this manual. He is authorized to ensure that the quality system is established, implemented, and maintained throughout the organization. Top Management, under CEO Kareem Yehia, gives full support and cooperation to the QMS Team Leader and ensures that all Operations Managers and Team Leaders implement the system effectively."
      },
      {
        id: "organization-structure",
        title: "1.2 ORGANIZATION STRUCTURE",
        content: "The organizational structure of Vezloo is defined to ensure clear lines of authority and communication across all departments:\n\nCEO: Kareem Yehia — Responsible for setting the overall strategic direction, business objectives, and long-term vision.\n\nOperations Director: Eman El Serafy — Oversees execution of business operations and ensures alignment with company strategy. Reports directly to CEO.\n\nOperations Manager / QA Leader: Andrew Maged — Manages operational workflows, oversees quality assurance processes, and ensures compliance with performance standards. Reporting teams: Get Vocal Team (Team Leader: Mena Sami), Omniaz Team (Team Leader: Yara Khairy), Data Quality (Specialist: Mario Ehab), Tennis Team (Team Leader: Khaled Magdy), General Tagging Projects.\n\nOperations Manager: Youssef Hamada — Manages large-scale production teams and supervises content and video-related operations. Reporting teams: Video Teams (Team Leaders: Nada Ahmed, Aya Said, Merolla George, Rahma El Sayed, Nada Mohey, Omnia Ramadan, Shymaa Sayed, Eman Hamada), Video Training (Training Specialist: Yara Ehab), General Tagging Projects.\n\nSports Department Team Leader: Maria Maged — Manages small-scale sports-related projects and niche operational activities.\n\nQMS Team Leader: Ahmed Khaled — Responsible for QMS establishment, implementation, maintenance, and continual improvement.\n\nHR Function: Managed through T360 — Recruitment, onboarding, and employee management.\n\nVacant Positions: Operations Manager (3rd position), Commercial & Sales Head, IT & Cybersecurity Engineer."
      }
    ]
  },
  {
    id: "applicability",
    title: "2. APPLICABILITY",
    content: "This manual applies to all activities, processes, services, and operations performed by Vezloo. The organization provides Business Process Outsourcing (BPO) services with specialization in:\n- AI data annotation and data labeling\n- Sports analytics\n- Video detection and analysis\n- Generative AI support\n- Gaming support services\n- Transcription services\n\nThe QMS is organized into seven functional modules that align with ISO 9001:2015 requirements:\n1. Sales & Customer Service (Clauses 8.2, 9.1.2)\n2. Operations & Production (Clauses 8.1, 8.5)\n3. Quality & Audit (Clauses 9, 10)\n4. Procurement & Vendors (Clause 8.4)\n5. HR & Training (Clauses 7.2, 7.3)\n6. R&D & Design (Clause 8.3)\n7. Management & Documentation (Clauses 5, 6, 7.5)",
    subsections: [
      {
        id: "scope",
        title: "2.1 SCOPE OF QUALITY MANAGEMENT SYSTEM",
        content: "The scope of certification under ISO 9001:2015 for Vezloo is defined as:\n\n\"Provision of Business Process Outsourcing (BPO) services including AI data annotation, data labeling, sports analytics, video detection, generative AI support, gaming, and transcription services.\"\n\nThis scope covers all core service delivery processes, customer-facing operations, and supporting functions within the organization. The QMS applies to all operations performed by Vezloo's teams, whether located at the head office in Cairo or working remotely under centralized quality oversight."
      },
      {
        id: "operational-area",
        title: "2.2 OPERATIONAL AREA & PRODUCTION SITE(S)",
        content: "Head Office: Cairo, Egypt\n\nOperational Sites: Remote operations are performed by distributed teams under centralized quality oversight and management controls. All remote operations are managed through the QMS platform and follow the same quality standards and procedures as on-site operations."
      },
      {
        id: "exclusions",
        title: "2.3 PERMISSIBLE EXCLUSION(S)",
        content: "Based on the nature of the organization and its activities, the following requirements of ISO 9001:2015 are not applicable to Vezloo:\n\nClause 8.3 – Design and Development of Products and Services\n\nJustification: Vezloo provides services based on client specifications and does not engage in the design and development of new products or services. The R&D & Design module exists solely for feasibility testing and evaluation of potential new project types, not for actual design or development activities. All service delivery follows established client requirements and industry standards."
      }
    ]
  },
  {
    id: "terms-definitions",
    title: "3. TERMS AND DEFINITIONS",
    content: "Key terms used in this Quality Management System:\n\nQMS: Quality Management System – A formalized system documenting processes, procedures, and responsibilities for achieving quality policies and objectives.\n\nTop Management: Person or group of people who direct and control the organization at the highest level. At Vezloo, this refers to CEO Kareem Yehia.\n\nQMS Team Leader: The person responsible for ensuring the QMS conforms to ISO 9001:2015 requirements. At Vezloo, this is Ahmed Khaled.\n\nHOD (Head of Department): Operations Managers and Team Leaders responsible for implementing QMS requirements within their areas.\n\nNCR: Non-Conformity Report – A document recording a deviation from specified requirements.\n\nCAR: Corrective Action Report – A document recording corrective actions taken to eliminate the cause of a detected nonconformity.\n\nCAPA: Corrective and Preventive Action – Systematic approach to investigating, understanding, and correcting discrepancies.\n\nAudit: Systematic, independent, and documented process for obtaining audit evidence and evaluating it objectively.\n\nRisk: Effect of uncertainty on objectives (can be positive or negative).\n\nTraceability: Ability to follow the history, application, or location of an object through recorded identification.\n\nKPI: Key Performance Indicator – A measurable value demonstrating how effectively objectives are being achieved.\n\nSOP: Standard Operating Procedure – A set of step-by-step instructions for routine operations.\n\nInterested Party (Stakeholder): Person or organization that can affect, be affected by, or perceive itself to be affected by a decision or activity.\n\nBPO: Business Process Outsourcing – The practice of contracting specific business functions to external service providers.\n\nConformity: Fulfilment of a requirement.\n\nCorrection: Action to eliminate a detected nonconformity.\n\nCorrective Action: Action to eliminate the cause of a nonconformity and to prevent recurrence.\n\nDocumented Information: Information required to be controlled and maintained by an organization and the medium on which it is contained.\n\nValidation: Obtaining evidence that a control measure will be capable of effectively controlling the significant quality aspect.\n\nVerification: Confirmation, through the provision of objective evidence, that specified requirements have been fulfilled."
  },
  {
    id: "context",
    title: "4. CONTEXT OF THE ORGANIZATION",
    content: "Vezloo has identified internal and external issues that may affect its ability to achieve the intended results of the QMS. These issues are reviewed on an annual basis during the Management Review Meeting and on an ongoing basis when assessing changes in internal or external factors.",
    subsections: [
      {
        id: "understanding-context",
        title: "4.1 UNDERSTANDING THE ORGANIZATION AND ITS CONTEXT",
        content: "Vezloo monitors and reviews information about internal and external issues relevant to its purpose and strategic direction:\n\nInternal Issues:\n- IT infrastructure and technology capabilities require continuous upgrades to support high-volume data projects\n- Some processes rely on tools and workflows that may require optimization for efficiency\n- Need for highly trained employees in AI data annotation, sports analytics, and transcription\n- Employee competence, training, and retention in a competitive BPO market\n- Resource availability and allocation across multiple concurrent projects\n\nExternal Issues:\n- Data security and confidentiality must always comply with international standards and client requirements\n- Compliance with country-specific regulations on data protection (e.g., GDPR, local data privacy laws)\n- Rapid technological changes in AI, BPO tools, and evolving client expectations\n- High competition in the BPO industry requires continuous improvement and innovation\n- Economic and geopolitical factors affecting remote operations and client relationships"
      },
      {
        id: "interested-parties",
        title: "4.2 UNDERSTANDING THE NEEDS AND EXPECTATIONS OF INTERESTED PARTIES",
        content: "Vezloo has identified the following interested parties relevant to the QMS:\n\nCustomers: Expect high-quality, accurate, and timely service delivery with data security and confidentiality.\nMonitoring Method: Customer surveys, contract reviews, feedback analysis, client meetings.\n\nEmployees: Expect fair treatment, career development, safe working environment, clear communication, and training opportunities.\nMonitoring Method: Training programs, welfare activities, performance reviews, employee feedback.\n\nRegulatory Bodies: Expect compliance with applicable laws, regulations, and industry standards.\nMonitoring Method: Compliance monitoring, regulatory updates, visits/reports from inspectors.\n\nSuppliers & Partners: Expect clear specifications, timely payments, and mutually beneficial relationships.\nMonitoring Method: Supplier meetings, vendor rating evaluations, regular follow-ups.\n\nShareholders/Owners: Expect sustainable growth, profitability, and effective risk management.\nMonitoring Method: Financial reports, management review meetings, strategic planning sessions.\n\nCertification Bodies: Expect conformance to ISO 9001:2015 requirements and audit readiness.\nMonitoring Method: Internal audits, management reviews, corrective action follow-ups.\n\nAll requirements are reviewed by respective Operations Managers. If any specific requirements are identified, they are communicated to the QMS Team Leader for further action."
      },
      {
        id: "determining-scope",
        title: "4.3 DETERMINING THE SCOPE OF THE QUALITY MANAGEMENT SYSTEM",
        content: "The scope of the QMS has been determined considering:\n- External and internal issues identified in Clause 4.1\n- Requirements of interested parties identified in Clause 4.2\n- The services provided by Vezloo\n\nThe QMS scope is documented in Clause 2 of this manual. The exclusion of Clause 8.3 (Design and Development) does not affect Vezloo's ability or responsibility to ensure conformity of its services."
      },
      {
        id: "qms-processes",
        title: "4.4 QUALITY MANAGEMENT SYSTEM AND ITS PROCESSES",
        content: "Vezloo has established, implemented, maintained, and continually improves its QMS, including the processes needed and their interactions.\n\nFor each process, Vezloo has determined:\n- Required inputs and expected outputs\n- Sequence and interaction of processes\n- Criteria and methods for effective operation and control\n- Resources needed and their availability\n- Responsibilities and authorities\n- Risks and opportunities as identified in Clause 6.1\n- Methods for monitoring, measuring, and evaluating processes\n- Opportunities for improvement\n\nA Process Interaction Map is maintained (Annex 2) to show the relationship between core, support, and management processes. The processes are evaluated based on feedback from Operations Managers and discussed in the Management Review Meeting."
      }
    ]
  },
  {
    id: "leadership",
    title: "5. LEADERSHIP",
    content: "Top Management of Vezloo, led by CEO Kareem Yehia, demonstrates leadership and commitment with respect to the Quality Management System to ensure its effectiveness and alignment with the strategic direction of the organization.",
    subsections: [
      {
        id: "leadership-commitment",
        title: "5.1 LEADERSHIP AND COMMITMENT",
        content: "CEO Kareem Yehia demonstrates leadership and commitment by:\n- Taking accountability for the effectiveness of the QMS\n- Ensuring the Quality Policy and Quality Objectives are established and compatible with the strategic direction\n- Ensuring integration of QMS requirements into business processes\n- Promoting awareness of the process approach and risk-based thinking\n- Ensuring resources needed for the QMS are available\n- Communicating the importance of effective quality management\n- Ensuring the QMS achieves its intended results through internal audits\n- Engaging, directing, and supporting persons to contribute to QMS effectiveness\n- Promoting continual improvement\n- Supporting other relevant management roles\n\nManagement Review Meetings are conducted at least every six months. Resource requirements are identified and adequate in-house resources are provided."
      },
      {
        id: "customer-focus",
        title: "5.1.2 CUSTOMER FOCUS",
        content: "CEO Kareem Yehia demonstrates leadership and commitment with respect to customer focus by ensuring that:\n- Customer requirements and applicable statutory/regulatory requirements are determined, understood, and met\n- Risks and opportunities that can affect conformity of services are determined and addressed\n- The importance of meeting customer requirements is communicated across the organization\n- Focus on enhancing customer satisfaction is maintained\n- Customer needs and expectations are determined through contract reviews and surveys"
      },
      {
        id: "quality-policy",
        title: "5.2 QUALITY POLICY",
        content: "The Quality Policy of Vezloo:\n- Is appropriate to the purpose and context of Vezloo\n- Provides a framework for setting and reviewing quality objectives\n- Includes a commitment to satisfy applicable quality requirements\n- Addresses internal and external communication\n- Includes a commitment to continual improvement of the QMS\n\nThe Quality Policy is communicated to all employees by posting in the workplace, through training sessions, and by sharing as documented information. Assessments to ensure the policy is applied at all levels are conducted during inspections, internal audits, and management review meetings."
      },
      {
        id: "roles-responsibilities",
        title: "5.3 ORGANIZATIONAL ROLES, RESPONSIBILITIES AND AUTHORITIES",
        content: "Personnel at various levels are responsible and have the authority within their defined areas for:\n- The quality of work carried out\n- Initiating action to prevent the occurrence of nonconformities\n- Identifying and recording quality problems\n- Initiating, recommending, and providing solutions to quality problems\n- Verifying the effectiveness of the solutions\n- Controlling further processing until all conditions are satisfactory\n\nQMS Team Leader (Ahmed Khaled) is responsible for:\n- Ensuring QMS conforms to ISO 9001:2015 requirements\n- Ensuring processes deliver their intended outputs\n- Reporting to Top Management on QMS performance\n- Ensuring promotion of customer focus\n- Maintaining QMS integrity during changes"
      }
    ]
  },
  {
    id: "planning",
    title: "6. PLANNING",
    content: "Vezloo plans actions to address risks and opportunities, establishes quality objectives, and plans changes to ensure the QMS achieves its intended results.",
    subsections: [
      {
        id: "risks-opportunities",
        title: "6.1 ACTIONS TO ADDRESS RISKS AND OPPORTUNITIES",
        content: "Vezloo determines risks and opportunities that need to be addressed to:\n- Give assurance that the QMS can achieve its intended results\n- Enhance desirable effects\n- Prevent or reduce undesired effects\n- Achieve continual improvement\n\nThe Risk Register is prepared for overall major risks with mitigation plans. Minor process-wise risks are documented in process flow charts.\n\nThe risk identification system uses a multiplication factor of occurrence and severity. Risks are categorized as high, medium, or low. If any risk reaches a high level, actions are initiated as per the risk plan.\n\nNecessary actions against risks include: reducing the risk, retaining the risk, or creating opportunities by adding new services, new markets, new customers, new technology, or new partnerships."
      },
      {
        id: "quality-objectives",
        title: "6.2 QUALITY OBJECTIVES AND PLANNING TO ACHIEVE THEM",
        content: "Quality objectives:\n- Are consistent with the Quality Policy\n- Are measurable and take into account applicable requirements\n- Are relevant to conformity of services and enhancement of customer satisfaction\n- Are monitored, communicated, and maintained as documented information\n- Are updated as appropriate\n\nWhen planning how to achieve quality objectives, Vezloo determines:\n- What will be done to achieve each objective\n- What resources will be required\n- Who will be responsible\n- When it will be completed\n- How the results will be evaluated\n\nQuality objectives are developed on an annual basis through workshops and brainstorming techniques involving the QMS Team Leader and Operations Managers."
      },
      {
        id: "planning-changes",
        title: "6.3 PLANNING OF CHANGES",
        content: "When Vezloo determines the need for changes to the QMS, the changes are carried out in a planned manner considering:\n- The purpose of the changes and their potential consequences\n- The continued integrity of the QMS\n- The availability of resources to effectively implement the changes\n- The allocation or reallocation of responsibilities and authorities\n\nChanges are triggered by improvements, nonconformities, industry shifts, or customer needs. Change requests must be documented in a Management of Change Plan with clear justification and approved before implementation."
      }
    ]
  },
  {
    id: "support",
    title: "7. SUPPORT",
    content: "Vezloo determines and provides the resources, competence, awareness, communication, and documented information needed for the establishment, implementation, maintenance, and continual improvement of the QMS.",
    subsections: [
      {
        id: "resources",
        title: "7.1 RESOURCES",
        content: "7.1.1 GENERAL\nTop Management has determined and provided the resources needed for the QMS. Resources are provided considering the capability of existing internal resources and the need for external resources.\n\n7.1.2 PEOPLE\nTop Management ensures that persons necessary for QMS are competent as per Clause 7.2.\n\n7.1.3 INFRASTRUCTURE\nAppropriate facilities include:\n- Office facilities at the Cairo head office\n- IT infrastructure: computers, workstations, LAN connectivity\n- Cloud platforms and collaboration tools (Google Workspace)\n- Specialized software for AI data annotation, video detection, transcription\n- Communication technology: video conferencing, messaging, email\n- The QMS platform for document management, record tracking, and quality control\n\n7.1.4 ENVIRONMENT FOR THE OPERATION OF PROCESSES\nThe work environment considers:\n- Social factors: non-discriminatory, calm, collaborative culture\n- Psychological factors: stress-reducing measures, burnout prevention\n- Physical factors: adequate workspace, lighting, ventilation, noise control\n\n7.1.5 MONITORING AND MEASURING RESOURCES\n- Quality checking tools and accuracy measurement systems\n- KPI dashboards and performance tracking\n- Regular review and calibration of quality metrics\n\n7.1.6 ORGANIZATIONAL KNOWLEDGE\nKnowledge includes:\n- Experience and competence of personnel\n- Internal training programs and knowledge-sharing sessions\n- Access to external sources: industry standards, publications\n- Documentation of lessons learned from past projects"
      },
      {
        id: "competence-awareness",
        title: "7.2 & 7.3 COMPETENCE AND AWARENESS",
        content: "7.2 COMPETENCE\nThe QMS Team Leader identifies necessary competence for all persons. A gap analysis is carried out between identified competence requirements and actual qualifications.\n\nWhere competence gaps are identified, actions include:\n- Providing training or coaching\n- Assigning a mentor\n- Re-assigning job responsibilities\n- Hiring or contracting competent personnel\n\n7.3 AWARENESS\nAll persons are made aware of:\n- The Quality Policy\n- Relevant quality objectives\n- Their contribution to QMS effectiveness\n- The implications of not conforming to QMS requirements\n\nNew employees undergo induction training covering: Vezloo's background and services, job responsibilities, Quality Policy and Objectives, and QMS implementation."
      },
      {
        id: "communication",
        title: "7.4 COMMUNICATION",
        content: "Vezloo ensures internal and external communication regarding the QMS:\n- What to communicate\n- When to communicate\n- With whom to communicate\n- How to communicate\n- Who communicates\n\nCommunication channels include email, project management tools, video conferencing, team meetings, training sessions, and Management Review Meetings. The QMS Team Leader coordinates QMS-related communications."
      },
      {
        id: "documented-information",
        title: "7.5 DOCUMENTED INFORMATION",
        content: "7.5.1 GENERAL\nThe QMS includes:\n- Quality Policy and Quality Objectives (Annex 1)\n- Quality Manual (this document, M/01)\n- Procedures, exhibits, and process flow charts\n- Quality records and forms (F/xx series)\n\nAll documented information is identified with: date of issue/revision, revision number, approval, title, and document identification number.\n\nDOCUMENT CONTROL RESPONSIBILITIES:\n- Quality Manual: Review & Approval by CEO (Kareem Yehia), Maintenance by QMS Team Leader\n- Procedures: Review & Approval by QMS Team Leader / Operations Managers\n- Forms/Formats: Review & Approval by QMS Team Leader / Operations Managers\n\n7.5.2 CREATING AND UPDATING\nWhen creating and updating documented information, Vezloo ensures appropriate identification, description, format, media, and review/approval.\n\n7.5.3 CONTROL OF DOCUMENTED INFORMATION\nControls include:\n- Distribution and access management\n- Retrieval and use by authorized personnel\n- Storage and preservation (digital with access control and password protection; weekly backups)\n- Control of changes (version control via revision numbers)\n- Retention periods: Management Records (min 5 years), Service Records (project duration + 1 year), Training Records (employment + 2 years)"
      }
    ]
  },
  {
    id: "operation",
    title: "8. OPERATION",
    content: "Vezloo plans, implements, and controls the processes needed to meet the requirements for the provision of services, and to implement the actions determined in Clause 6.1.",
    subsections: [
      {
        id: "operational-planning",
        title: "8.1 OPERATIONAL PLANNING AND CONTROL",
        content: "Vezloo plans and controls its operations by:\n- Determining the requirements for services based on client specifications\n- Establishing criteria for processes and acceptance of services\n- Determining the resources needed\n- Implementing control of processes in accordance with defined criteria\n- Determining, maintaining, and retaining documented information\n\nFunctional-level objectives are defined and monitored monthly. The QMS Team Leader and Operations Managers control planned changes and review the consequences of unintended changes."
      },
      {
        id: "requirements",
        title: "8.2 REQUIREMENTS FOR PRODUCTS AND SERVICES",
        content: "8.2.1 CUSTOMER COMMUNICATION\nCommunication includes:\n- Service information through company profiles and project proposals\n- Inquiries, contracts, or order handling including changes\n- Customer feedback and complaints\n- Handling and controlling customer property\n- Specific requirements for contingency actions\n\n8.2.2 DETERMINING REQUIREMENTS\nRequirements include:\n- Requirements specified by the customer\n- Applicable statutory and regulatory requirements\n- Requirements necessary for intended use\n- Requirements specified by Vezloo\n\n8.2.3 REVIEW OF REQUIREMENTS\nBefore committing to supply services, Vezloo reviews to ensure:\n- Requirements are clearly defined\n- Any differences are resolved\n- The organization can meet defined requirements\n- Amendments are documented, reviewed, and confirmed"
      },
      {
        id: "external-providers",
        title: "8.4 CONTROL OF EXTERNALLY PROVIDED PROCESSES, PRODUCTS AND SERVICES",
        content: "Controls are applied when:\n- Products/services from external providers are incorporated into Vezloo's services\n- Services are provided directly to customers by external providers\n- A process is provided by an external provider as a result of Vezloo's decision\n\nThe system for selection and evaluation is based on ability to provide in accordance with requirements. The Approved Supplier List is maintained with evaluation results and reviewed periodically based on vendor rating."
      },
      {
        id: "service-provision",
        title: "8.5 PRODUCTION AND SERVICE PROVISION",
        content: "8.5.1 CONTROL OF SERVICE PROVISION\nControlled conditions include:\n- Availability of documented work instructions and project guidelines\n- Availability and use of suitable monitoring resources\n- Implementation of monitoring at appropriate stages\n- Use of suitable infrastructure and environment\n- Appointment of competent persons\n- Implementation of actions to prevent human error\n- Implementation of release, delivery, and post-delivery activities\n\n8.5.2 IDENTIFICATION AND TRACEABILITY\nVezloo uses project codes, batch identifiers, and quality status indicators. Traceability is maintained where required by clients.\n\n8.5.3 PROPERTY BELONGING TO CUSTOMERS\nCustomer property is checked upon receipt, stored with due care, and identified. Any property lost, damaged, or unsuitable is recorded and reported.\n\n8.5.4 PRESERVATION\nVezloo ensures preservation of outputs through proper handling, storage, and protection of data and deliverables.\n\n8.5.5 POST-DELIVERY ACTIVITIES\nPost-delivery activities include warranty support, feedback collection, and ongoing quality monitoring.\n\n8.5.6 CONTROL OF CHANGES\nChanges are reviewed, authorized by Operations Manager or QMS Team Leader, and documented using a Process Change Template."
      },
      {
        id: "release-nonconforming",
        title: "8.6 & 8.7 RELEASE OF SERVICES AND CONTROL OF NONCONFORMING OUTPUTS",
        content: "8.6 RELEASE OF SERVICES\nQuality checks are performed at defined stages. Release does not proceed until all quality checks are satisfactorily completed, unless otherwise approved.\n\n8.7 CONTROL OF NONCONFORMING OUTPUTS\nDisposition options:\n- Correction (rework to meet requirements)\n- Segregation, containment, or return\n- Informing the customer and obtaining concession\n- Suspension of provision of services\n\nAll disposition actions are recorded in the Non-Conforming Output Log. The Operations Director (Eman El Serafy) is responsible for disposal of final outputs. Operations Managers are responsible for disposal of in-process outputs."
      }
    ]
  },
  {
    id: "performance-evaluation",
    title: "9. PERFORMANCE EVALUATION",
    content: "Vezloo determines what needs to be monitored and measured, the methods for monitoring, measurement, analysis, and evaluation.",
    subsections: [
      {
        id: "monitoring-measurement",
        title: "9.1 MONITORING, MEASUREMENT, ANALYSIS AND EVALUATION",
        content: "9.1.1 GENERAL\nMonitoring parameters include:\n- Service Conformity (Clause 8.6): Per service delivery cycle\n- Customer Satisfaction (Clause 9.1.2): Annually\n- Process Performance (Clause 9.1.3): Monthly via KPI tracking\n- Internal Audit Results (Clause 9.2): Annually\n- Nonconformity & Corrective Action (Clause 10.2): As required\n- Management Review Inputs (Clause 9.3): Semi-annually\n\n9.1.2 CUSTOMER SATISFACTION\nMonitoring includes:\n- Annual customer satisfaction surveys with rating scales\n- Customer feedback analysis\n- Lost business analysis\n- Customer complaints tracking\n- Customer Satisfaction Index (CSI) calculation\n\n9.1.3 ANALYSIS AND EVALUATION\nVezloo analyzes data to assess:\n- Conformity of services\n- Customer satisfaction index\n- QMS performance and effectiveness\n- Effectiveness of planning activity\n- Effectiveness of actions taken to address risks\n- Performance of external providers\n- Need for improvements"
      },
      {
        id: "internal-audit",
        title: "9.2 INTERNAL AUDIT",
        content: "Vezloo conducts internal audits at planned intervals to verify:\n- QMS conforms to Vezloo's own requirements\n- QMS conforms to ISO 9001:2015\n- QMS is effectively implemented and maintained\n\nThe QMS Team Leader prepares the audit plan at least once a year. Audits are scheduled based on status, importance, and previous findings. Auditors must be independent and competent per ISO 19011 guidelines.\n\nAudit results are reported to relevant management. Follow-up activities include verification of actions taken. Results are discussed during Management Review Meetings."
      },
      {
        id: "management-review",
        title: "9.3 MANAGEMENT REVIEW",
        content: "9.3.1 GENERAL\nCEO Kareem Yehia reviews Vezloo's QMS at least every six months.\n\n9.3.2 MANAGEMENT REVIEW INPUT\nThe review considers:\n- Status of actions from previous reviews\n- Changes in external and internal issues\n- Customer satisfaction, feedback, and complaints\n- Extent to which quality objectives have been met\n- Process performance and service conformity\n- Nonconformities and corrective actions\n- Monitoring and measurement results\n- Audit results (Internal and External)\n- External provider performance\n- Adequacy of resources\n- Effectiveness of actions taken to address risks\n- Opportunities for improvement\n\n9.3.3 MANAGEMENT REVIEW OUTPUT\nOutputs include decisions related to:\n- Improvement of QMS effectiveness\n- Improvement of services related to customer requirements\n- Need for resources"
      }
    ]
  },
  {
    id: "improvement",
    title: "10. IMPROVEMENT",
    content: "Vezloo determines and selects opportunities for improvement and implements necessary actions to meet customer requirements and enhance customer satisfaction.",
    subsections: [
      {
        id: "general-improvement",
        title: "10.1 GENERAL",
        content: "Improvements include:\n- Improving services to meet requirements and address future needs\n- Correcting, preventing, or reducing undesired effects\n- Improving QMS performance and effectiveness\n\nExamples of improvement methods:\n- Correction and corrective action\n- Continual improvement through management review findings\n- Innovation and process re-organization\n- Breakthrough changes based on new technology adoption"
      },
      {
        id: "nonconformity-corrective-action",
        title: "10.2 NONCONFORMITY AND CORRECTIVE ACTION",
        content: "When a nonconformity occurs, Vezloo:\n\nREACTS by:\n- Taking action to control and correct it\n- Dealing with the consequences\n\nEVALUATES the need for action by:\n- Reviewing and analyzing the nonconformity\n- Determining causes (5-Why, Fishbone/Ishikawa)\n- Determining if similar nonconformities exist\n\nIMPLEMENTS any action needed\nREVIEWS the effectiveness of corrective action\nUPDATES risks and opportunities if necessary\nMAKES CHANGES to the QMS if necessary\n\nCORRECTIVE ACTION REQUEST (CAR) PROCESS:\n1. Nonconformity is identified and reported to QMS Team Leader\n2. Root cause analysis is conducted\n3. Correction and corrective actions proposed in CAR Form\n4. Responsible personnel implement and monitor actions\n5. Changes in procedures are documented\n6. Effectiveness reviewed before closing CAR\n7. If ineffective, CAR is reopened for additional analysis"
      },
      {
        id: "continual-improvement",
        title: "10.3 CONTINUAL IMPROVEMENT",
        content: "Vezloo continually improves the QMS by considering:\n- Results of analysis and evaluation\n- Outputs from management review\n\nTools and methods:\n- Management review findings and action plans\n- Internal audit results and follow-up actions\n- Corrective action effectiveness reviews\n- Risk-based thinking and opportunity analysis\n- Customer feedback analysis and satisfaction trends\n- Process performance trend analysis\n- KPI monitoring and objective reviews\n\nTop Management ensures continual improvement through communication, management review, internal audit, analysis of results, corrective actions, and QMS updating."
      }
    ]
  },
  {
    id: "annex-1-quality-policy",
    title: "ANNEX 1 – QUALITY POLICY",
    content: "Every employee of Vezloo is committed to ensuring the quality of all services delivered to customers. Vezloo strives to act with due attention to the quality of its services as specified and agreed with clients, as well as in legal and other requirements.\n\nTop Management of Vezloo is committed to comply with all customer, legal, and other requirements to ensure an effective QMS is established and maintained. This is achieved by:\n\n- Strictly implementing ISO 9001:2015 requirements and organizational standards\n- Hiring and developing competent personnel through continuous training and development programs\n- Providing training and awareness to all employees to ensure they are committed to implementing QMS\n- Ensuring critical threats to quality are identified, monitored, and corrected\n- Monitoring practice compliance through internal audits and performance reviews\n- Enhancing customer satisfaction through reliable, accurate, and timely service delivery\n- Applying risk-based thinking to prevent nonconformities and improve outcomes\n- Pursuing continual improvement in all aspects of operations and QMS\n- Effectively applying the system including processes for getting customer feedback\n\nThis Quality Policy is communicated with employees by posting in the workplace and is available on the website and company materials. The QMS Team Leader ensures the policy is understood by each employee and reviewed annually.\n\nKareem Yehia\nCEO, Vezloo"
  },
  {
    id: "annex-2-process-map",
    title: "ANNEX 2 – PROCESS INTERACTION MAP",
    content: "The Process Interaction Map illustrates how core, support, and management processes interact to deliver services that meet customer requirements.\n\nMANAGEMENT PROCESSES:\n- Strategic Planning & Management Review\n- Risk & Opportunity Management\n- Internal Audit\n\nCORE PROCESSES:\n- Customer Requirements & Contract Review\n- Service Planning & Delivery\n- Monitoring & Quality Control\n- Service Release & Delivery\n\nSUPPORT PROCESSES:\n- Human Resources & Training\n- Infrastructure & IT Management\n- Document & Record Control\n- Procurement & Supplier Management\n\nEach process has defined inputs, outputs, process owner, main activities, and KPIs."
  },
  {
    id: "annex-3-procedures",
    title: "ANNEX 3 – LIST OF PROCEDURES",
    content: "The following procedures have been established to implement the Quality Management System:\n\n1. Procedure for Context of Organization (P/01)\n2. Procedure for Objectives and Targets (P/02)\n3. Procedure for Monitoring and Measurement (P/03)\n4. Procedure for Management Review (P/04)\n5. Procedure for Internal Audit (P/05)\n6. Procedure for Training, Awareness & Competence (P/06)\n7. Procedure for Control of Document and Record (P/07)\n8. Procedure for Correction and Corrective Action (P/08)\n9. Procedure for Control of Monitoring and Measuring Equipment (P/09)\n10. Procedure for Purchasing and Subcontracting (P/10)\n11. Procedure for Change Management (P/11)\n12. Procedure for Legal Compliance (P/12)\n13. Procedure for Control of Non-Conforming Outputs (P/13)\n\nAll procedures are controlled documents maintained by the QMS Team Leader. Master copies are stored in the QMS platform and Google Drive."
  }
];
