// ============================================================================
// F/47 — Internal Audit Checklist
// DOCX: 6C x 303R — ISO 9001:2015 clauses 4-10 with questions and status
// Strategy: Collapsible sections per ISO clause, each question has Yes/No/N/A + Evidence
// ============================================================================

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface F47Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

// ISO 9001:2015 Audit checklist structure - clauses and questions
const AUDIT_SECTIONS = [
  {
    clause: "4",
    title: "Context Of the Organization",
    subclauses: [
      { ref: "4.1", title: "Understanding the Organization and its context", questions: [
        "Have you determined external and internal issues in the organization?",
        "Does this issues are relevant to its purpose and affect its ability to achieve the intended results of the QMS?",
        "Have you considered the context of the organization as per ISO 9001:2015 requirements?",
        "Have you identified and determined the external and internal issues that are relevant to the organization's purpose and strategic direction?",
        "Is the organization monitoring and reviewing information about these external and internal issues?",
      ]},
      { ref: "4.2", title: "Understanding the needs and expectations of interested parties", questions: [
        "How many interested parties are identified by you that are relevant to the QMS?",
        "What are the requirements of interested parties in relation to QMS?",
        "Have you defined any other quality requirements interested parties are concerned with?",
        "Are these requirements being reviewed and updated regularly?",
      ]},
      { ref: "4.3", title: "Determining the scope of the quality management system", questions: [
        "Has the organization determined the boundaries and applicability of the QMS to establish its scope?",
        "Does the scope state the types of products and services covered?",
        "Does the scope state any justification for requirements that cannot be applied?",
        "Is the scope available and maintained as documented information?",
      ]},
      { ref: "4.4", title: "Quality management system and its processes", questions: [
        "Has the organization established, implemented, maintained and continually improved a QMS?",
        "Are the processes needed for the QMS and their application determined?",
        "Is the sequence and interaction of these processes determined?",
        "Are criteria and methods needed to ensure effective operation and control determined?",
        "Are resources needed for these processes determined?",
        "Are responsibilities and authorities for these processes assigned?",
        "Are risks and opportunities planned and actions defined?",
        "Is the QMS monitored, measured and evaluated?",
        "Is the QMS continually improved?",
      ]},
    ],
  },
  {
    clause: "5",
    title: "Leadership",
    subclauses: [
      { ref: "5.1", title: "Leadership and Commitment", questions: [
        "Does top management demonstrate leadership and commitment with respect to the QMS?",
        "Does top management ensure quality policy and objectives are established?",
        "Does top management ensure QMS requirements are integrated into business processes?",
        "Does top management promote the use of process approach and risk-based thinking?",
        "Does top management ensure resources needed for QMS are available?",
        "Does top management communicate the importance of effective QMS and conformity?",
        "Does top management ensure QMS achieves its intended results?",
        "Does top management engage, direct and support persons to contribute to QMS?",
        "Does top management promote improvement?",
        "Does top management support other relevant management roles?",
      ]},
      { ref: "5.2", title: "Policy", questions: [
        "Has top management established, implemented and maintained a quality policy?",
        "Is the policy appropriate to the purpose and context of the organization?",
        "Does the policy provide a framework for setting and reviewing quality objectives?",
        "Does the policy include a commitment to satisfy applicable requirements?",
        "Does the policy include a commitment to continual improvement of the QMS?",
        "Is the policy available as documented information?",
        "Is the policy communicated within the organization?",
        "Is the policy available to relevant interested parties?",
      ]},
      { ref: "5.3", title: "Organizational roles, responsibilities and authorities", questions: [
        "Has top management ensured responsibilities and authorities for relevant roles are assigned and understood?",
        "Has top management assigned responsibility for ensuring QMS conforms to requirements?",
        "Has top management assigned responsibility for reporting QMS performance?",
        "Has top management assigned responsibility for promoting customer focus?",
        "Has top management assigned responsibility for reporting on QMS performance to top management?",
      ]},
    ],
  },
  {
    clause: "6",
    title: "Planning",
    subclauses: [
      { ref: "6.1", title: "Actions to address risks and opportunities", questions: [
        "Has the organization determined the risks and opportunities that need to be addressed?",
        "Has the organization planned actions to address these risks and opportunities?",
        "Has the organization integrated and implemented the actions into QMS processes?",
        "Is the effectiveness of these actions evaluated?",
      ]},
      { ref: "6.2", title: "Quality objectives and planning to achieve them", questions: [
        "Has the organization established quality objectives at relevant functions and levels?",
        "Are the quality objectives consistent with the quality policy?",
        "Are the objectives measurable where practicable?",
        "Are objectives monitored, communicated and updated as appropriate?",
        "Is the planning to achieve objectives determined?",
      ]},
      { ref: "6.3", title: "Planning of changes", questions: [
        "Does the organization plan changes to the QMS and carry them out in a controlled manner?",
        "Are consequences of unintended changes considered?",
      ]},
    ],
  },
  {
    clause: "7",
    title: "Support",
    subclauses: [
      { ref: "7.1", title: "Resources", questions: [
        "Has the organization determined and provided resources needed for QMS?",
        "Are the resources adequate for the organization's QMS?",
        "Are infrastructure resources determined, provided and maintained?",
        "Is the environment for the operation of processes determined and managed?",
        "Are monitoring and measuring resources determined and maintained?",
        "Is measurement traceability maintained where required?",
        "Is organizational knowledge determined and maintained?",
      ]},
      { ref: "7.2", title: "Competence", questions: [
        "Has the organization determined the competence of persons doing work under its control?",
        "Are persons competent on the basis of education, training or experience?",
        "Is competence evaluated and actions taken to acquire necessary competence?",
        "Is appropriate documented information maintained as evidence of competence?",
      ]},
      { ref: "7.3", title: "Awareness", questions: [
        "Are persons doing work under control aware of the quality policy?",
        "Are they aware of relevant quality objectives?",
        "Are they aware of their contribution to QMS effectiveness?",
        "Are they aware of implications of not conforming to QMS requirements?",
      ]},
      { ref: "7.4", title: "Communication", questions: [
        "Has the organization determined the internal and external communications relevant to QMS?",
        "Has it determined what to communicate, when to communicate, with whom to communicate and how to communicate?",
      ]},
      { ref: "7.5", title: "Documented information", questions: [
        "Does the QMS include documented information required by ISO 9001?",
        "Has the organization determined the documented information needed for QMS effectiveness?",
        "Is documented information created and updated with appropriate identification and format?",
        "Is documented information reviewed and approved for suitability and adequacy?",
        "Is documented information available and suitable for use where and when needed?",
        "Is documented information adequately protected?",
        "Is documented information controlled for distribution, access, retrieval and use?",
        "Is documented information controlled for storage and preservation?",
        "Is documented information controlled for control of changes?",
        "Is documented information controlled for retention and disposition?",
      ]},
    ],
  },
  {
    clause: "8",
    title: "Operation",
    subclauses: [
      { ref: "8.1", title: "Operational planning and control", questions: [
        "Has the organization planned, implemented and controlled processes needed to meet QMS requirements?",
        "Have criteria for the processes and acceptance of products/services been determined?",
        "Has the organization determined the resources needed?",
        "Has the organization implemented control of the processes in accordance with the criteria?",
        "Has the organization determined kept documented information to the extent necessary to have confidence the processes have been carried out as planned?",
        "Does the organization control planned changes and review consequences?",
      ]},
      { ref: "8.2", title: "Requirements for products and services", questions: [
        "Is communication with customers defined and implemented?",
        "Are customer requirements determined including delivery and post-delivery?",
        "Are review requirements for products and services conducted?",
        "Are product/service requirements reviewed before commitment?",
        "Are records of review and requirements maintained?",
        "Is product/service requirements reviewed changes addressed?",
      ]},
      { ref: "8.3", title: "Design and development of products and services", questions: [
        "Is a design and development process established, implemented and maintained?",
        "Are design inputs determined and records maintained?",
        "Are design outputs meeting input requirements?",
        "Are design controls including reviews, verification and validation conducted?",
        "Are design and development outputs documented?",
        "Are design and development changes controlled?",
      ]},
      { ref: "8.4", title: "Control of externally provided processes, products and services", questions: [
        "Are externally provided processes, products and services conforming to requirements?",
        "Are criteria for evaluation, selection, monitoring of external providers determined?",
        "Is documented information maintained for evaluation and selection?",
        "Are controls for externally provided processes determined?",
        "Is verification of externally provided products and services determined?",
      ]},
      { ref: "8.5", title: "Production and service provision", questions: [
        "Are production and service provision carried out under controlled conditions?",
        "Are controlled conditions including availability of documented information defined?",
        "Are monitoring and measurement activities at appropriate stages conducted?",
        "Is traceability implemented where required?",
        "Are customer or external provider property identified, verified and protected?",
        "Is post-delivery activity carried out as required?",
        "Are process changes controlled?",
      ]},
      { ref: "8.6", title: "Release of products and services", questions: [
        "Are products and services not released until planned arrangements have been satisfactorily completed?",
        "Are documented information maintained for release of products and services?",
      ]},
      { ref: "8.7", title: "Control of nonconforming outputs", questions: [
        "Are nonconforming outputs identified and controlled?",
        "Are actions appropriate to the nature and effect of the nonconformity?",
        "Are nonconformities corrected or actions taken to eliminate?",
        "Is conformity verified after corrective action?",
        "Are actions to deal with nonconformity appropriate to the effects?",
        "Is documented information maintained for nonconformities?",
      ]},
    ],
  },
  {
    clause: "9",
    title: "Performance Evaluation",
    subclauses: [
      { ref: "9.1", title: "Monitoring, measurement, analysis and evaluation", questions: [
        "Has the organization determined what needs to be monitored and measured?",
        "Has the organization determined the methods for monitoring, measurement, analysis and evaluation?",
        "Has the organization determined when monitoring and measurement shall be performed?",
        "Has the organization determined when results shall be analyzed and evaluated?",
        "Has the organization evaluated the performance and effectiveness of QMS?",
        "Is documented information maintained as evidence of results?",
      ]},
      { ref: "9.1.2", title: "Customer satisfaction", questions: [
        "Does the organization monitor customers' perception of the degree to which requirements are met?",
        "Are the methods for obtaining customer satisfaction determined?",
      ]},
      { ref: "9.2", title: "Internal audit", questions: [
        "Are internal audits conducted at planned intervals?",
        "Is the audit programme planned considering the importance and results of prior audits?",
        "Are audit criteria, scope, methods defined for each audit?",
        "Are auditors selected ensuring objectivity and impartiality?",
        "Are audit results reported to relevant management?",
        "Is corrective action taken without undue delay?",
        "Is documented information maintained as evidence of audit programme and results?",
      ]},
      { ref: "9.3", title: "Management review", questions: [
        "Does top management review the QMS at planned intervals?",
        "Are management review inputs determined and addressed?",
        "Do review inputs include results of audits, customer feedback, process performance, etc.?",
        "Are management review outputs including decisions and actions for improvement recorded?",
        "Is documented information maintained as evidence of management review results?",
      ]},
    ],
  },
  {
    clause: "10",
    title: "Improvement",
    subclauses: [
      { ref: "10.1", title: "General", questions: [
        "Does the organization determine and select opportunities for improvement?",
        "Are actions taken to address nonconformities and improve the QMS?",
        "Does the organization continually improve the suitability, adequacy and effectiveness of the QMS?",
      ]},
      { ref: "10.2", title: "Nonconformity and corrective action", questions: [
        "Does the organization react to nonconformities and take action to control and correct them?",
        "Does the organization evaluate the need for action to eliminate causes of nonconformities?",
        "Are corrective actions appropriate to the effects of the nonconformities encountered?",
        "Are changes to the QMS made if necessary?",
        "Is documented information maintained for nonconformity, actions taken and results?",
        "Is the effectiveness of corrective actions reviewed?",
      ]},
      { ref: "10.3", title: "Continual improvement", questions: [
        "Does the organization continually improve the suitability, adequacy and effectiveness of the QMS?",
        "Are the results of analysis and evaluation and management review outputs used for improvement?",
      ]},
    ],
  },
];

export function F47Template({ data, isTemplate = true, editMode = false, onChange, className }: F47Props) {
  const d = data ?? {};
  const ph = isTemplate && !editMode;

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["4", "5"]));

  const toggleSection = (clause: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(clause)) next.delete(clause);
      else next.add(clause);
      return next;
    });
  };

  const statusRadio = (key: string) => {
    const current = val(d, key);
    return editMode ? (
      <div className="flex gap-1">
        {["Yes", "No", "N/A"].map(opt => (
          <label key={opt} className="flex items-center gap-0.5 text-[10px]">
            <input type="radio" name={key} className="w-2.5 h-2.5" checked={current === opt} onChange={() => onChange?.(key, opt)} />
            {opt}
          </label>
        ))}
      </div>
    ) : (
      <span className="text-xs font-medium">{current || ""}</span>
    );
  };

  const evidenceInp = (key: string) =>
    editMode ? (
      <input className="w-full bg-transparent text-[10px] px-0.5 border-none outline-none" value={val(d, key)} onChange={e => onChange?.(key, e.target.value)} placeholder="Evidence/Reference" />
    ) : (
      <span className="text-[10px]">{val(d, key) || ""}</span>
    );

  // Count total questions
  const totalQuestions = AUDIT_SECTIONS.reduce((acc, s) => 
    acc + s.subclauses.reduce((a, sc) => a + sc.questions.length, 0), 0);

  return (
    <div className={cn("bg-white text-black text-sm", className)}>
      {/* Header */}
      <div className="grid grid-cols-[4fr_2fr_1fr] border border-black">
        <div className="p-2 font-bold bg-primary/5 text-base">Internal Audit Checklist</div>
        <div className="p-2 border-l border-black bg-primary/5 text-xs flex flex-col justify-center">
          <div>Audit Date: {val(d, "audit_date") || (ph ? "___" : "")}</div>
          <div>Auditor: {val(d, "auditor") || (ph ? "___" : "")}</div>
        </div>
        <div className="p-2 border-l border-black bg-primary/5 text-right text-xs">
          F/47 Rev No. {val(d, "serial") || (ph ? "{{SERIAL}}" : "—")}
        </div>
      </div>

      <div className="text-xs text-muted-foreground px-2 py-1 bg-gray-50 border-x border-b border-black">
        ISO 9001:2015 Compliance Checklist — {totalQuestions} questions across {AUDIT_SECTIONS.length} clauses
      </div>

      {/* Collapsible sections */}
      {AUDIT_SECTIONS.map(section => {
        const isOpen = openSections.has(section.clause);
        const questionCount = section.subclauses.reduce((a, sc) => a + sc.questions.length, 0);
        // Count answered questions
        let answeredCount = 0;
        section.subclauses.forEach(sc => {
          sc.questions.forEach((_, qi) => {
            const key = `s${section.clause}_${sc.ref}_${qi}`;
            if (val(d, key)) answeredCount++;
          });
        });

        return (
          <div key={section.clause} className="border-x border-b border-black">
            {/* Section header - clickable */}
            <button
              className="w-full flex items-center justify-between px-2 py-1.5 bg-primary/10 hover:bg-primary/15 transition-colors text-xs font-semibold"
              onClick={() => toggleSection(section.clause)}
            >
              <span className="flex items-center gap-1">
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {section.clause}. {section.title}
              </span>
              <span className="text-muted-foreground">{answeredCount}/{questionCount}</span>
            </button>

            {isOpen && section.subclauses.map(subclause => (
              <div key={subclause.ref} className="border-t border-foreground/10">
                {/* Subclause header */}
                <div className="px-3 py-1 bg-gray-50 text-xs font-medium">
                  {subclause.ref} {subclause.title}
                </div>

                {/* Questions */}
                {subclause.questions.map((question, qi) => {
                  const key = `s${section.clause}_${subclause.ref}_${qi}`;
                  return (
                    <div key={key} className="grid grid-cols-[1fr_120px_1fr] gap-0 border-t border-foreground/5 px-3 py-1 text-[11px] even:bg-gray-50/30">
                      <div className="py-0.5 pr-2">{question}</div>
                      <div className="py-0.5 pr-2">{statusRadio(key)}</div>
                      <div className="py-0.5">{evidenceInp(`${key}_evidence`)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}

      {/* Sign-off */}
      <div className="grid grid-cols-[1fr_1fr_1fr] border border-t-2 border-black text-xs">
        <div className="p-1.5 border-r border-black">Auditor: {val(d, "auditor") || (ph ? "___" : "")}</div>
        <div className="p-1.5 border-r border-black">Date: {val(d, "audit_date") || (ph ? "___" : "")}</div>
        <div className="p-1.5">Approved: {val(d, "approved_by") || (ph ? "___" : "")}</div>
      </div>
    </div>
  );
}