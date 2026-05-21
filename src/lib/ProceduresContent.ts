
export const PROCEDURES_METADATA = {
  company: "Vezloo",
  documentPrefix: "P-SOP",
  revisionNo: "01",
  approvalDate: "01/2026",
  preparedBy: "Ahmed Khaled (QMS Team Leader)",
  approvedBy: "Top Management",
};

export interface ProcedureSection {
  id: string;
  title: string;
  purpose: string;
  scope: string;
  responsibilities: string;
  procedureText: string;
}

export const PROCEDURES_CONTENT: ProcedureSection[] = [
  {
    id: "p01",
    title: "1. Procedure for Context of Organization",
    purpose: "To define how Vezloo's strategic direction is developed by Top Management through the identification of interested parties, issues of concern, risks and opportunities, and to address requirements of ISO 9001:2015 as stipulated under Clauses 4.1, 4.2 & 6.1.",
    scope: "Applicable to all activities Vezloo performs and services which Vezloo provides, including all departments and operations performed by Vezloo or outsourced on its behalf.",
    responsibilities: "Top Management, HODs, QMS Team Leader",
    procedureText: "4.1 IDENTIFICATION OF EXTERNAL AND INTERNAL ISSUES\nAll HODs are responsible for identifying internal and external issues on an ongoing basis which can have positive and/or negative impact on Vezloo's performance. These issues shall be identified and documented in the QMS Manual (Clause 4.1) and in the Risk and Opportunity Analysis Sheet (F/22) for further processing and actions by the QMS Team Leader. The QMS team is responsible for reviewing and keeping the documents up to date.\n\n4.2 IDENTIFICATION OF INTERESTED PARTIES & THEIR CONCERNS\nFollowing the scope of activities defined in Manual Clause 2, the interested parties shall be defined in Clause 4.2 of the manual. The parties shall be reviewed and their information shall be updated when required or at least on an annual basis during the Management Review Meeting.\nFor each interested party, the related issues of concern shall be identified in the Risk and Opportunity Analysis Sheet (F/22) by the QMS Team Leader with participation of HODs. These issues shall be identified along with the impact they can have on the organization, and further actions shall be decided.\nNote: When identifying internal concerns, consider technological, employee, and resource concerns. When identifying external concerns, consider competition, society and culture, labor relations, statutory and regulatory issues, supply chain, and economic factors.\n\n4.3 ACTIONS TO ADDRESS RISKS AND OPPORTUNITIES\nBased on analysis of issues identified as internal and external issues in Clause 4.1 and information gathered from needs and expectations of interested parties, the risks and opportunities shall be identified. Mitigation plans for risks and plans to capitalize on opportunities shall be developed by the QMS team and HODs, and approved and supported by Top Management.\nIn the Risk and Opportunity Analysis Sheet (F/22), each risk and opportunity shall be noted, along with the primary process involved, priority, and bias. The \"bias\" identifies if the issue is a risk, an opportunity, or a combination of both.\nPlans shall be developed to:\n    a) Give assurance that the QMS can achieve its intended result(s)\n    b) Enhance desirable effects\n    c) Prevent or reduce undesired effects\n    d) Achieve continual improvement\nMonitoring of implementation and review of plans shall be carried out by the QMS team, and results shall be analyzed and discussed during the Management Review Meeting. Where any plan does not achieve the expected results, corrective action shall be taken and records shall be maintained.\n\n5. REFERENCES\n• QMS Manual (Clause 4.1, 4.2, 6.1)\n• ISO 9001:2015\n\n6. RECORDS\n6.1 Risk and Opportunity Analysis Sheet (F/22)"
  },
  {
    id: "p02",
    title: "2. Procedure for Objectives and Targets",
    purpose: "To establish, implement, and maintain a system for developing, achieving, and monitoring the QMS objectives and targets necessary for improving the QMS performance of Vezloo.",
    scope: "Applicable to all activities Vezloo performs and to all departments and key functions of Vezloo.",
    responsibilities: "QMS Team Leader, HODs",
    procedureText: "4.1 DEVELOPING THE OBJECTIVES AND TARGETS\nThe QMS Team Leader and HODs shall develop QMS objectives and targets on an annual basis and review them on an ongoing basis using the QMS Objectives and Targets Form. The objectives and targets shall be developed through workshops and brainstorming techniques.\nThe objectives and targets shall be relevant and specific to Vezloo's operations, core functions, activities, and services, and shall be in line with the minimum standard requirements set by applicable regulatory bodies.\nIn developing the objectives and targets, the QMS Team Leader shall ensure that these are SMART (Specific, Measurable, Attainable, Realistic, and Time-bounded).\n\n4.2 PROGRAM TO ACHIEVE OBJECTIVES AND TARGETS\nTo achieve the objectives and targets, programs are established, documented, and implemented using the QMS Objectives and Targets Form. Resources, responsible persons, due dates, and time frames are clearly defined for every program, with consideration given to:\n    a) What will be done to achieve the objective?\n    b) What resources will be required?\n    c) Who will be responsible?\n    d) When will the program be completed?\n    e) How will the results be evaluated and reported?\n\n4.3 MONITORING & REVIEW OF OBJECTIVES & TARGETS\nThe QMS Team Leader is responsible for monitoring the progress and status of achieving Vezloo's QMS Objectives and Targets on an ongoing basis through updated information and reports submitted regularly by each responsible person.\nResults of achieving the objectives and targets shall be discussed during the Management Review Meeting. Inputs related to the status are presented to Top Management, and corrective actions are taken where a specific objective has not been achieved.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n\n6. RECORDS\n6.1 QMS Objectives and Targets Form (F/24)"
  },
  {
    id: "p03",
    title: "3. Procedure for Monitoring and Measurement",
    purpose: "To establish, implement, and maintain a system for monitoring and measuring the QMS as necessary for compliance with Vezloo's Quality Management System.",
    scope: "Applicable to all activities performed by Vezloo and outsourced on its behalf.",
    responsibilities: "Quality Team, Process HODs, Internal Auditors, QMS Team Leader",
    procedureText: "4.1 GENERAL\nFollowing the requirements of ISO 9001:2015 and other applicable standards, the following parameters shall be monitored and measured to ensure that the QMS is implemented effectively and operational within Vezloo.\n\nMONITORING PARAMETERS:\n• Service Conformity (Clause 8.6): Per service delivery cycle, via inspection and quality checks (Quality Team).\n• Customer Satisfaction (Clause 9.1.2): Annually, via surveys and feedback analysis (QMS Team / Customer Service).\n• Process Performance (Clause 9.1.3): Monthly, via KPI tracking and data review (Process HODs).\n• Internal Audit Results (Clause 9.2): Annually, via audit reports and findings review (Internal Auditors).\n• Nonconformity & Corrective Action (Clause 10.2): As required, via review of effectiveness (QMS Team).\n• Management Review Inputs (Clause 9.3.2): Annually, via performance trends (Top Management / QMS Team Leader).\n\nADDITIONAL CONTROLS:\n- Instruments and equipment used for monitoring and measurement shall be calibrated through accredited laboratories providing national/international traceability.\n- Personnel responsible for monitoring and measuring shall be trained and competent to perform these activities.\n- Analyzed data from performance monitoring and measurement shall be discussed in the Management Review Meeting.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n\n6. RECORDS\n6.1 Monitoring & Measuring Records\n6.2 Master List of Instruments/Equipment\n6.3 Calibration Calendar\n6.4 Calibration Certificates"
  },
  {
    id: "p04",
    title: "4. Procedure for Management Review",
    purpose: "To establish, implement, and maintain a system for regular management reviews at Vezloo to ensure the continuing suitability, adequacy, and effectiveness of the Quality Management System.",
    scope: "Applicable to all activities Vezloo performs and covered under the scope of the organization as stipulated in the QMS Manual.",
    responsibilities: "Top Management, QMS Team Leader, HODs",
    procedureText: "4.1 GENERAL\nThe QMS Team Leader shall report to Top Management on the performance of the documented QMS. The review meeting shall be held at least once a year.\n\nINPUTS FOR THE MEETING:\n• Status of actions from previous management reviews\n• Changes in external/internal issues relevant to the QMS\n• Customer satisfaction, feedback, and complaints\n• Extent to which quality objectives were met\n• Process performance and service conformity\n• Nonconformities and corrective actions\n• Monitoring and measurement results\n• Audit results (Internal and External)\n• External provider performance and adequacy of resources\n• Effectiveness of actions taken to address risks and opportunities\n\nOUTPUTS OF THE MEETING:\n• Decisions on continual improvement opportunities\n• Need for QMS updates or changes (resources, policy, objectives)\n• Improvements in processes and services to meet customer requirements\n\nDOCUMENTATION:\nThe QMS Team Leader retains the minutes of the Management Review Meeting as Action Plans (Action, Responsibility, Target Date). Results shall be analyzed and discussed for system improvement.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n\n6. RECORDS\n6.1 Management Review Meeting Minutes"
  },
  {
    id: "p05",
    title: "5. Procedure for Internal Audit",
    purpose: "To establish, implement, and maintain a system for internal audits of the QMS at Vezloo to determine the extent to which audit criteria are fulfilled.",
    scope: "Applicable to all activities Vezloo performs, including subcontracted and outsourced activities.",
    responsibilities: "QMS Team Leader, Internal Auditors, HODs, Top Management",
    procedureText: "4.1 INTERNAL AUDIT PLAN\nThe QMS Team Leader prepares the audit plan at least once a year. Audits are scheduled based on the status, importance, and previous findings of the activity.\n\n4.2 PLANNING & SCHEDULING\nThe plan includes the activity name, scope, date, time, and auditor. It must be communicated to the Auditor/Auditee at least 1 week in advance. Auditors must be independent of the area being audited.\n\n4.3 AUDITOR SELECTION\nAuditors must have undergone appropriate training, be independent of the audited section, and be competent to conduct audits in accordance with ISO 19011 guidelines.\n\n4.4 AUDIT EXECUTION\nAuditors verify system implementation via evidence collection and analysis. Auditees must provide full cooperation and access to facilities and documents. Any serious nonconformity can lead to immediate activity suspension pending corrective action.\n\n4.5 REPORT & FOLLOW-UP\nAfter completion, the auditor reviews findings with the auditee. The final report covers conformity and nonconformity findings. HODs are responsible for corrective actions, which are verified by the QMS Team Leader/Auditor to close the NCR.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n• ISO 19011:2018 (Guidelines for auditing management systems)\n\n6. RECORDS\n6.1 Internal Audit Plan\n6.2 Internal Audit Report\n6.3 Internal Audit Checklist\n6.4 Nonconformity Report (NCR)"
  },
  {
    id: "p06",
    title: "6. Procedure for Training, Awareness & Competence",
    purpose: "To establish, implement, and maintain a system to identify and meet the training, awareness, and competence needs for employees performing functions affecting quality at Vezloo.",
    scope: "Applicable to all employees of Vezloo as well as its subcontractors who perform functions on its behalf.",
    responsibilities: "QMS Team Leader, HODs, Administration Head, Top Management",
    procedureText: "4.1 TRAINING NEED IDENTIFICATION\nTraining needs are identified based on QMS awareness requirements, induction for new employees, and feedback on an annual and routine basis. The QMS Team Leader maintains the annual training program.\n\n4.2 AWARENESS\nAll personnel must be trained on ISO 9001:2015 concepts. All employees, including new recruits, must be acquainted with Vezloo's Quality Policy and QMS documentation.\n\n4.3 INDUCTION TRAINING\nNew employees undergo induction training covering: Vezloo's background and services, job responsibilities, Quality Policy and Objectives, and the importance of QMS implementation.\n\n4.4 COMPETENCE & GAP ANALYSIS\nThe QMS Team Leader maintains a competence matrix and performs gap analysis for each employee. Any gaps must be addressed prior to authorizing an employee for a role.\n\n4.5 ANNUAL ASSESSMENT\nTraining needs are assessed annually. The Administration Head organizes in-house and external training programs, maintaining records of attendance and certificates.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n\n6. RECORDS\n6.1 Induction Training Form\n6.2 Job Description\n6.3 Competence Matrix\n6.4 Competence Gap Analysis Form\n6.5 Annual Training Program\n6.6 Training Attendance Sheet\n6.7 Skill Requirements Record\n6.8 Multi-Skill Requirements Record"
  },
  {
    id: "p07",
    title: "7. Procedure for Control of Document and Record",
    purpose: "To establish, implement, and maintain a system to control documents and records as applicable to creation, updating, and maintaining documented information.",
    scope: "Applicable to all documents related to the Quality Management System of Vezloo.",
    responsibilities: "QMS Team Leader, CEO, HODs",
    procedureText: "4.1 GENERATION & APPROVAL\nDocuments are generated and approved by authorized personnel. The QMS Manual is approved by the CEO, while Procedures and Quality Control Plans are approved by the QMS Team Leader.\n\n4.2 CODIFICATION\n• Manual: M/##\n• Procedures: P/##\n• Formats/Forms: F/##\nMaster copies are kept by the QMS Team Leader. Controlled copies are stamped accordingly.\n\n4.3 MODIFICATION\nChanges are requested via Document Change Notes. Revised documents undergo the same approval process as originals. Obsolete documents are destroyed or clearly marked \"OBSOLETE\".\n\n4.4 RECORDS CONTROL\nRecords are collected daily, filed legibly (physical or digital), and indexed by date. Access is restricted to authorized personnel.\n\nRETENTION PERIODS:\n• Management Records: Minimum 5 years\n• Service Delivery Records: Project duration + 1 year\n• Training Records: Duration of employment + 2 years\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n\n6. RECORDS\n6.1 Master List of Documents\n6.2 Document Change Note\n6.3 Master List of Records"
  },
  {
    id: "p08",
    title: "8. Procedure for Correction and Corrective Action",
    purpose: "To establish a system for corrections and corrective actions on detected conditions adverse to the quality of Vezloo's services, processes, and QMS.",
    scope: "Applicable to the entire Quality Management System, including subcontracted and outsourced activities.",
    responsibilities: "QMS Team Leader, Functional Heads, Top Management",
    procedureText: "4.1 IDENTIFICATION OF NONCONFORMITY\nNonconformity is the non-fulfillment of requirements (ISO 9001:2015, customer, regulatory, or internal). Employees must report nonconformities immediately to the QMS Team Leader.\n\n4.2 ANALYSIS & ACTION\nCorrective and Preventive Action (CAPA) is triggered by:\n- Service delivery issues or process nonconformity reports\n- Data analysis failures or performance deviations\n- Customer complaints or feedback\n- Internal or external audit findings\n\nRoot causes are identified using appropriate analysis methods (e.g., 5-Why, Fishbone/Ishikawa) for repetitive or major nonconformities.\n\n4.3 CORRECTIVE ACTION REQUEST (CAR) PROCESS\n• Correction and corrective actions are proposed in the CAR Form\n• Responsible personnel implement and monitor actions within agreed timeframes\n• Changes in procedures resulting from CAPA are documented by the QMS Team Leader\n• Effectiveness of corrective actions is reviewed by the QMS Team Leader before closing the CAR\n• If corrective action is ineffective, the CAR is reopened and additional analysis is conducted\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n• Procedure for Internal Audit (P/05)\n\n6. RECORDS\n6.1 Corrective Action Request (CAR) Form"
  },
  {
    id: "p09",
    title: "9. Procedure for Control of Monitoring and Measuring Equipment",
    purpose: "To ensure that any equipment used for monitoring, measuring, and inspection is selected, maintained, calibrated, and functioning appropriately.",
    scope: "Applicable to all equipment linked with the QMS of Vezloo, including those used by outsourced service providers.",
    responsibilities: "HODs, QMS Team Leader, Heads of Operations",
    procedureText: "4.1 SELECTION & SPECIFICATION\nHODs ensure equipment is selected with the required precision and accuracy. All equipment is identified for calibration and recorded in the Master List.\n\n4.2 CALIBRATION PERIODICITY\nEstablished intervals are recorded in the Master List. Frequency is amended based on stability, purpose, and usage to ensure continued accuracy.\n\n4.3 CALIBRATION SYSTEM\nCalibration is performed via accredited laboratories against national/international standards. In-house cross-verification is done by the QMS Team Leader on a monthly basis. Equipment must be handled carefully to avoid damage affecting accuracy.\n\n4.4 NEW/REPAIRED EQUIPMENT\nMust be calibrated before being put into use, unless accompanied by a valid manufacturer's certificate. Each item is assigned a unique identification number.\n\n4.5 WITHDRAWAL\nEquipment with systematic errors or faults must be removed from service immediately, isolated, and labeled. The Master List is updated to reflect the withdrawal.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n• Procedure for Monitoring and Measurement (P/03)\n\n6. RECORDS\n6.1 Master List of Equipment\n6.2 In-House Inspection Report"
  },
  {
    id: "p10",
    title: "10. Procedure for Purchasing and Subcontracting",
    purpose: "To establish a system for effectively managing purchasing and subcontracting, including selection and evaluation of competent suppliers and external providers.",
    scope: "Applicable to all types of purchases and subcontracting linked with Vezloo's QMS.",
    responsibilities: "Purchasing Head, QMS Team Leader, Quality Team Leader",
    procedureText: "4.1 SUPPLIER REGISTRATION\nThe Purchasing Head identifies potential suppliers and evaluates them based on registration forms, pricing, quality, and reputation. The QMS Team Leader performs assessments and maintains evaluation records to complete registration.\n\n4.2 ORDER DETERMINATION\nQuantities and requirements are determined based on operational needs. Purchase requisitions include product/service description, specifications, quantity, and quality requirements.\n\n4.3 ORDER PLACEMENT\nA Purchase Order (PO) is completed for all orders, properly authorized, and entered into the PO log. Inspection requirements are identified as comments on the PO.\n\n4.4 PURCHASING REVIEW\nUpon receipt, receiving and inspection reports are completed. The Quality Team Leader issues nonconformity reports if products/services fail to meet requirements. The process is audited annually.\n\n4.5 SUPPLIER EVALUATION\nApproved suppliers are evaluated periodically based on delivery performance, quality of goods/services, responsiveness, and compliance with specifications. Results are recorded and maintained.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n• Procedure for Correction and Corrective Action (P/08)\n\n6. RECORDS\n6.1 Supplier Registration Form\n6.2 Approved Supplier List\n6.3 Supplier Evaluation Form\n6.4 Receiving and Inspection Reports"
  },
  {
    id: "p11",
    title: "11. Procedure for Change Management",
    purpose: "To establish a system to control unintended changes and ensure organizational changes are carried out in a controlled manner.",
    scope: "Applicable to changes in the QMS, including personnel, equipment, services, and suppliers.",
    responsibilities: "Senior Management, QMS Team Leader",
    procedureText: "4.1 CHANGES TO PROCESSES\nChanges are triggered by improvements, nonconformities, industry shifts, or customer needs. Change requests must be documented in a Management of Change Plan with clear justification and approved before implementation.\n\n4.2 SERVICE OUTPUTS\nMethods for changing service outputs are typically defined by customer requirements. Significant changes require a formal Management of Change Plan with risk assessment.\n\n4.3 DOCUMENTATION CHANGES\nMust follow the Procedure for Control of Document and Record (P/07).\n\n4.4 ORDERS/CONTRACTS\nChanges to active orders undergo the same review as the original engagement. Unacceptable changes result in negotiations, with the outcome recorded in the Management of Change Plan.\n\n4.5 RISK ASSESSMENT\nAll significant changes are assessed for potential risks and impacts before implementation. The QMS Team Leader ensures that changes do not compromise the integrity of the QMS.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n• Procedure for Control of Document and Record (P/07)\n\n6. RECORDS\n6.1 Management of Change Plan"
  },
  {
    id: "p12",
    title: "12. Procedure for Legal Compliance",
    purpose: "To establish, implement, and maintain a system to ensure that Vezloo complies with all applicable legal and regulatory requirements.",
    scope: "Applicable to all facilities, processes, and services of Vezloo.",
    responsibilities: "Top Management, QMS Team Leader",
    procedureText: "4.1 IDENTIFICATION\nTop Management identifies all applicable legal requirements (permits, licenses, data protection regulations, labor laws, etc.) and lists them in the Legal Register.\n\n4.2 ACCESS & COMMUNICATION\nThe QMS Team Leader maintains updated copies (hard/soft) of relevant legislation. Applicable staff and suppliers are given access to and communicated these requirements.\n\n4.3 MAINTAINING COMPLIANCE\nA designated person is appointed to monitor legal requirements. The Legal Register is reviewed at least annually and updated whenever legislation changes.\n\n4.4 EVALUATION\nCompliance is evaluated during internal audits or as needed by the QMS Team Leader. Non-compliance is handled via the CAPA process (P/08). Compliance status is reviewed annually during Management Review Meetings.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n• Applicable regulatory and legal requirements\n\n6. RECORDS\n6.1 Legal Register"
  },
  {
    id: "p13",
    title: "13. Procedure for Control of Non-Conforming Outputs",
    purpose: "To ensure that any service outputs that do not conform to requirements are identified, segregated, and controlled to prevent unintended use or delivery.",
    scope: "Applicable to all services received, processed, and delivered by Vezloo.",
    responsibilities: "Top Management, Heads of Operations, QMS Team, Quality Control",
    procedureText: "4.1 GENERAL\nTop Management, Heads of Operations, and the QMS Team ensure non-conforming outputs are suitably identified and controlled. Conforming outputs must not be mixed with non-conforming ones.\n\n4.2 INCOMING MATERIALS/INPUTS\nMaterials or inputs awaiting inspection are identified by location or tags. Non-conforming inputs are moved to a designated 'Rejected/Non-Conforming' area and returned to providers or disposed of appropriately.\n\n4.3 IN-PROCESS SERVICE DELIVERY\nIn-process service outputs are inspected per the Quality Plan. Rejected outputs are flagged and held in designated areas, while acceptable outputs proceed to the next stage.\n\n4.4 FINAL SERVICE DELIVERY\nNon-inspected outputs are identified by record review. Only 'Accepted/Approved' outputs are released for delivery to customers.\n\n4.5 DISPOSITION OF NON-CONFORMING OUTPUTS\n• Correction (rework to meet requirements)\n• Segregation, containment, or return\n• Informing the customer and obtaining concession where applicable\n• Suspension of provision of services\n\nAll disposition actions are recorded in the Non-Conforming Output Log.\n\n5. REFERENCES\n• QMS Manual\n• ISO 9001:2015\n• Procedure for Correction and Corrective Action (P/08)\n\n6. RECORDS\n6.1 Non-Conforming Output Log\n6.2 Disposition Records"
  }
];
