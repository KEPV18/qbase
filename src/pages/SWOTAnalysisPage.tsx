/**
 * SWOT Analysis Page
 *
 * ISO 9001:2015 Clause 4.1 & 6.1 — Strategic analysis derived from
 * Context of Organization + Risk & Opportunity assessment.
 *
 * Strengths/Weaknesses = Internal factors
 * Opportunities/Threats = External factors
 *
 * Data sourced from ContextAnalysisPage + interestedPartiesData + Vezloo operations.
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Shield,
  Download,
  ChevronDown,
  ChevronUp,
  UserRound,
  Calendar,
  BookMarked,
  Zap,
  Eye,
  FileText,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type Quadrant = 'strengths' | 'weaknesses' | 'opportunities' | 'threats';

interface SWOTItem {
  id: string;
  text: string;
  category: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  source: string;
  actionPlan?: string;
  responsible?: string;
  targetDate?: string;
  isoClause?: string;
  linkedTo?: string[];
}

interface SOStrategy {
  name: string;
  strength: string;
  opportunity: string;
  action: string;
}

interface WTStrategy {
  name: string;
  weakness: string;
  threat: string;
  action: string;
}

// ============================================================================
// DATA — Derived from Context Analysis, Risk Register, and QMS Manual
// ============================================================================

const STRENGTHS: SWOTItem[] = [
  {
    id: 'S1',
    text: 'ISO 9001:2015 certified QMS with full digital traceability',
    category: 'Quality Management',
    riskLevel: 'Low',
    source: 'Context Analysis CTX-001',
    actionPlan: 'Maintain certification through annual surveillance audits',
    responsible: 'Quality Manager',
    targetDate: '2026-12-31',
    isoClause: '4.1, 4.4',
    linkedTo: ['CTX-001', 'CTX-008'],
  },
  {
    id: 'S2',
    text: 'Scalable workforce of 100+ trained data annotators across multiple domains',
    category: 'Human Resources',
    riskLevel: 'Low',
    source: 'Context Analysis CTX-002',
    actionPlan: 'Continue recruitment and cross-training programs',
    responsible: 'HR Manager',
    targetDate: '2026-09-30',
    isoClause: '7.2',
    linkedTo: ['CTX-002'],
  },
  {
    id: 'S3',
    text: 'Web-based QMS platform providing real-time process monitoring and automated documentation',
    category: 'Technology',
    riskLevel: 'Low',
    source: 'Context Analysis CTX-003',
    actionPlan: 'Continuous platform improvement and feature development',
    responsible: 'IT Manager',
    targetDate: '2026-12-31',
    isoClause: '7.1.3, 7.5',
    linkedTo: ['CTX-003'],
  },
  {
    id: 'S4',
    text: 'Diversified client portfolio across data annotation, AI testing, and sports analytics',
    category: 'Market Position',
    riskLevel: 'Low',
    source: 'Risk Register',
    actionPlan: 'Expand into new verticals (healthcare, automotive)',
    responsible: 'Sales Manager',
    isoClause: '4.1',
  },
  {
    id: 'S5',
    text: 'Structured training and onboarding programs for quality consistency',
    category: 'Competence',
    riskLevel: 'Medium',
    source: 'HR & Training Module',
    actionPlan: 'Document and standardize training SOPs',
    responsible: 'HR Manager',
    isoClause: '7.2',
  },
  {
    id: 'S6',
    text: 'Risk-based thinking embedded in all QMS processes',
    category: 'Quality Management',
    riskLevel: 'Low',
    source: 'Risk Register',
    actionPlan: 'Annual risk review and opportunity assessment',
    responsible: 'Quality Manager',
    isoClause: '6.1',
  },
  {
    id: 'S7',
    text: 'Strong client data protection culture with NDAs and confidentiality protocols',
    category: 'Data Security',
    riskLevel: 'Low',
    source: 'Legal/Regulatory Assessment',
    actionPlan: 'Regular security audits and policy updates',
    responsible: 'Compliance Officer',
    isoClause: '4.2, 8.2',
  },
  {
    id: 'S8',
    text: 'Multi-project management capability with dedicated team structures per project',
    category: 'Operations',
    riskLevel: 'Medium',
    source: 'Projects Data',
    actionPlan: 'Implement project management KPIs',
    responsible: 'Operations Manager',
    isoClause: '8.1',
  },
];

const WEAKNESSES: SWOTItem[] = [
  {
    id: 'W1',
    text: 'High employee turnover in data annotation roles affecting project continuity',
    category: 'Human Resources',
    riskLevel: 'High',
    source: 'Context Analysis CTX-002',
    actionPlan: 'Implement retention programs, competitive compensation, career paths',
    responsible: 'HR Manager',
    targetDate: '2026-06-30',
    isoClause: '7.2',
    linkedTo: ['CTX-002'],
  },
  {
    id: 'W2',
    text: 'Quality consistency challenges across large-scale annotation projects',
    category: 'Quality',
    riskLevel: 'High',
    source: 'Context Analysis CTX-002',
    actionPlan: 'Strengthen QC processes, increase sampling rates, add QA specialists',
    responsible: 'Quality Manager',
    targetDate: '2026-06-30',
    isoClause: '8.5, 9.1',
    linkedTo: ['CTX-002'],
  },
  {
    id: 'W3',
    text: 'Dependence on external client platforms for data annotation (no proprietary tools)',
    category: 'Technology',
    riskLevel: 'Medium',
    source: 'Context Analysis CTX-003',
    actionPlan: 'Evaluate developing proprietary annotation tools',
    responsible: 'R&D Manager',
    targetDate: '2026-12-31',
    isoClause: '7.1.3',
    linkedTo: ['CTX-003'],
  },
  {
    id: 'W4',
    text: 'Resource allocation challenges across multiple concurrent projects',
    category: 'Operations',
    riskLevel: 'Medium',
    source: 'Project Management',
    actionPlan: 'Implement resource planning tool and capacity forecasting',
    responsible: 'Operations Manager',
    isoClause: '7.1',
  },
  {
    id: 'W5',
    text: 'Limited brand recognition in international markets outside MENA region',
    category: 'Market Position',
    riskLevel: 'Medium',
    source: 'Marketing Assessment',
    actionPlan: 'Develop international marketing strategy and case studies',
    responsible: 'Sales Manager',
    isoClause: '4.1',
  },
  {
    id: 'W6',
    text: 'Training standardization gaps across different project teams',
    category: 'Competence',
    riskLevel: 'Medium',
    source: 'Internal Audit Findings',
    actionPlan: 'Create unified training curriculum with competency assessments',
    responsible: 'HR Manager',
    isoClause: '7.2',
  },
];

const OPPORTUNITIES: SWOTItem[] = [
  {
    id: 'O1',
    text: 'Growing global demand for AI training data and annotation services',
    category: 'Market',
    riskLevel: 'Low',
    source: 'Context Analysis CTX-004',
    actionPlan: 'Expand capacity and develop AI-assisted annotation',
    responsible: 'CEO',
    targetDate: '2026-12-31',
    isoClause: '4.1',
    linkedTo: ['CTX-004'],
  },
  {
    id: 'O2',
    text: 'ISO 9001 certification as competitive differentiator for enterprise clients',
    category: 'Market',
    riskLevel: 'Low',
    source: 'Context Analysis CTX-008',
    actionPlan: 'Highlight certification in all marketing materials and RFPs',
    responsible: 'Sales Manager',
    targetDate: '2026-06-30',
    isoClause: '4.2',
    linkedTo: ['CTX-008'],
  },
  {
    id: 'O3',
    text: 'AI-assisted annotation and quality control tools reducing human error',
    category: 'Technology',
    riskLevel: 'Medium',
    source: 'Context Analysis CTX-006',
    actionPlan: 'Invest in R&D for proprietary AI annotation platform',
    responsible: 'R&D Manager',
    targetDate: '2026-12-31',
    isoClause: '7.1.3',
    linkedTo: ['CTX-006'],
  },
  {
    id: 'O4',
    text: 'GDPR compliance as market entry requirement for EU clients',
    category: 'Legal/Regulatory',
    riskLevel: 'Low',
    source: 'Context Analysis CTX-005',
    actionPlan: 'Market GDPR compliance capability to EU prospects',
    responsible: 'Compliance Officer',
    isoClause: '4.2',
    linkedTo: ['CTX-005'],
  },
  {
    id: 'O5',
    text: 'Cost-conscious clients seeking efficiency through outsourcing',
    category: 'Market',
    riskLevel: 'Medium',
    source: 'Context Analysis CTX-007',
    actionPlan: 'Develop competitive pricing models for volume clients',
    responsible: 'Finance Manager',
    isoClause: '8.2',
    linkedTo: ['CTX-007'],
  },
  {
    id: 'O6',
    text: 'Premium service positioning for high-compliance industries (healthcare, automotive)',
    category: 'Market',
    riskLevel: 'Medium',
    source: 'Risk Register',
    actionPlan: 'Develop specialized annotation services for regulated industries',
    responsible: 'Sales Manager',
    isoClause: '4.1',
  },
  {
    id: 'O7',
    text: 'Real-time process monitoring enabling proactive quality management',
    category: 'Technology',
    riskLevel: 'Low',
    source: 'Context Analysis CTX-003',
    actionPlan: 'Enhance dashboards with predictive analytics',
    responsible: 'IT Manager',
    isoClause: '9.1',
  },
];

const THREATS: SWOTItem[] = [
  {
    id: 'T1',
    text: 'Increasing price pressure from competitors in BPO market',
    category: 'Market',
    riskLevel: 'High',
    source: 'Context Analysis CTX-004',
    actionPlan: 'Differentiate on quality and certification, not price alone',
    responsible: 'Sales Manager',
    targetDate: '2026-06-30',
    isoClause: '4.1',
    linkedTo: ['CTX-004'],
  },
  {
    id: 'T2',
    text: 'GDPR non-compliance penalties up to 4% of global revenue',
    category: 'Legal/Regulatory',
    riskLevel: 'High',
    source: 'Context Analysis CTX-005',
    actionPlan: 'Conduct quarterly compliance audits and staff training',
    responsible: 'Compliance Officer',
    targetDate: '2026-12-31',
    isoClause: '4.2',
    linkedTo: ['CTX-005'],
  },
  {
    id: 'T3',
    text: 'AI automation reducing demand for human annotation services',
    category: 'Technology',
    riskLevel: 'High',
    source: 'Context Analysis CTX-006',
    actionPlan: 'Pivot to AI-assisted annotation and higher-value services',
    responsible: 'R&D Manager',
    targetDate: '2026-12-31',
    isoClause: '7.1.3',
    linkedTo: ['CTX-006'],
  },
  {
    id: 'T4',
    text: 'Client budget cuts due to economic uncertainty',
    category: 'Economic',
    riskLevel: 'Medium',
    source: 'Context Analysis CTX-007',
    actionPlan: 'Diversify client portfolio and offer flexible pricing',
    responsible: 'Finance Manager',
    isoClause: '4.1',
    linkedTo: ['CTX-007'],
  },
  {
    id: 'T5',
    text: 'Data breach or security incident damaging client trust',
    category: 'Data Security',
    riskLevel: 'High',
    source: 'Legal/Regulatory Assessment',
    actionPlan: 'Implement zero-trust architecture and incident response plan',
    responsible: 'IT Manager',
    isoClause: '7.1.3, 8.5',
  },
  {
    id: 'T6',
    text: 'Client switching costs decreasing — easier to change providers',
    category: 'Market',
    riskLevel: 'Medium',
    source: 'Context Analysis CTX-004',
    actionPlan: 'Increase switching costs through deep integration and exclusive SLAs',
    responsible: 'Sales Manager',
    isoClause: '8.2',
    linkedTo: ['CTX-004'],
  },
  {
    id: 'T7',
    text: 'Skill obsolescence as AI tools evolve faster than workforce training',
    category: 'Human Resources',
    riskLevel: 'Medium',
    source: 'Context Analysis CTX-006',
    actionPlan: 'Continuous upskilling programs and AI literacy training',
    responsible: 'HR Manager',
    isoClause: '7.2',
    linkedTo: ['CTX-006'],
  },
];

// ============================================================================
// CROSS-IMPACT STRATEGIES (TOWS Matrix)
// ============================================================================

const SO_STRATEGIES: SOStrategy[] = [
  {
    name: 'SO1: Certified Market Expansion',
    strength: 'S1: ISO 9001 certified QMS',
    opportunity: 'O2: Certification as competitive differentiator',
    action: 'Target enterprise clients in regulated industries (healthcare, automotive) where ISO certification is a prerequisite. Highlight certification in all proposals.',
  },
  {
    name: 'SO2: AI-Powered Scale',
    strength: 'S3: Real-time QMS platform',
    opportunity: 'O3: AI-assisted annotation tools',
    action: 'Develop AI-assisted quality checks within the QMS platform. Leverage existing traceability infrastructure for AI training feedback loops.',
  },
  {
    name: 'SO3: Workforce Agility',
    strength: 'S2: 100+ trained annotators',
    opportunity: 'O1: Growing AI data demand',
    action: 'Scale workforce recruitment and training to capture growing market demand. Cross-train annotators across multiple domains.',
  },
  {
    name: 'SO4: Data-Driven Quality',
    strength: 'S6: Risk-based thinking in all processes',
    opportunity: 'O7: Real-time monitoring for proactive QM',
    action: 'Build predictive quality dashboards that leverage risk data to flag potential issues before they arise.',
  },
];

const WT_STRATEGIES: WTStrategy[] = [
  {
    name: 'WT1: Retention & Shield',
    weakness: 'W1: High employee turnover',
    threat: 'T7: Skill obsolescence as AI evolves',
    action: 'Implement retention programs (competitive pay, career paths) combined with continuous AI upskilling. Turn turnover challenge into training opportunity.',
  },
  {
    name: 'WT2: Quality Armor',
    weakness: 'W2: Quality consistency challenges',
    threat: 'T1: Price pressure from competitors',
    action: 'Invest in QC automation and AI-assisted checks. Differentiate on quality, not price. Make high quality the moat against low-cost competitors.',
  },
  {
    name: 'WT3: Platform Independence',
    weakness: 'W3: Dependence on external platforms',
    threat: 'T5: Data breach on client platforms',
    action: 'Develop proprietary annotation platform with zero-trust security. Reduce dependency on client infrastructure.',
  },
  {
    name: 'WT4: Compliance Fortress',
    weakness: 'W5: Limited international brand',
    threat: 'T2: GDPR penalties and T6: Client switching',
    action: 'Use GDPR compliance as marketing tool for international expansion. Build client integration that increases switching costs.',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Quadrant presentation.
 *
 * The quadrants are four SIBLING GROUPS of the same kind — four lists of
 * factors.  The design system says sibling items belong on one surface
 * separated by hairlines, not on four separately-bordered, separately-
 * tinted cards, so each quadrant is a single white panel whose rows are
 * divided by hairlines.  The panel header carries the quadrant's name and
 * its count in grayscale; the only colour on the panel is the risk chip,
 * which is coloured by RISK LEVEL (a real signal), not by quadrant.
 *
 * The previous version painted a saturated fill behind each header and
 * white text on it.  In dark mode that measured 2.02:1 (success), 2.08:1
 * (warning) and 3.65:1 (primary) — hard WCAG failures — and the row
 * badges measured 1.88–2.64:1 on their own tinted row.  Every pairing
 * below is measured: the panel body is `text-foreground` on `bg-card`
 * (16.83:1 light / 15.63:1 dark) and the risk chips are 5.44–7.76:1.
 */
const QUADRANT_CONFIG: Record<Quadrant, {
  title: string;
  icon: React.ElementType;
  /** One-line gloss shown under the quadrant name. */
  hint: string;
  arrowIcon: React.ElementType;
}> = {
  strengths: {
    title: 'Strengths',
    icon: CheckCircle,
    hint: 'Internal capabilities that give us an advantage',
    arrowIcon: ArrowUpRight,
  },
  weaknesses: {
    title: 'Weaknesses',
    icon: TrendingDown,
    hint: 'Internal gaps that limit what we can deliver',
    arrowIcon: ArrowDownRight,
  },
  opportunities: {
    title: 'Opportunities',
    icon: TrendingUp,
    hint: 'External trends we could turn to our benefit',
    arrowIcon: ArrowUpRight,
  },
  threats: {
    title: 'Threats',
    icon: AlertTriangle,
    hint: 'External pressures that could hurt us',
    arrowIcon: ArrowDownRight,
  },
};

/**
 * Risk chip classes.
 *
 * The risk LEVEL is the meaningful signal, so the chip is coloured by
 * level: red for High, amber for Medium, and plain grayscale for Low.
 * (The old chip was tinted by quadrant, which made four Low-risk items in
 * four different colours — colour carrying no information.)  Each pairing
 * is measured on a 10% wash of its own family over the white panel:
 * High 6.21:1 light / 6.69:1 dark · Medium 5.86:1 / 7.76:1 ·
 * Low 5.44:1 / 7.48:1.
 */
const RISK_CHIP_CLASS: Record<SWOTItem['riskLevel'], string> = {
  High: 'border-destructive/20 bg-destructive/10 text-destructive-tint',
  Medium: 'border-warning/20 bg-warning/10 text-warning-tint',
  Low: 'border-foreground/10 bg-foreground/5 text-foreground/70',
};

const ALL_ITEMS: Record<Quadrant, SWOTItem[]> = {
  strengths: STRENGTHS,
  weaknesses: WEAKNESSES,
  opportunities: OPPORTUNITIES,
  threats: THREATS,
};

export default function SWOTAnalysisPage(): JSX.Element {
  const [selectedItem, setSelectedItem] = useState<SWOTItem | null>(null);
  const [expandedQuadrant, setExpandedQuadrant] = useState<Quadrant | null>(null);
  const [showStrategies, setShowStrategies] = useState(false);

  const stats = useMemo(() => ({
    strengths: STRENGTHS.length,
    weaknesses: WEAKNESSES.length,
    opportunities: OPPORTUNITIES.length,
    threats: THREATS.length,
    highRisk: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.riskLevel === 'High').length,
    withActionPlan: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.actionPlan).length,
  }), []);

  const handleExport = () => {
    const lines = ['Quadrant,ID,Text,Category,RiskLevel,Source,ActionPlan,Responsible,TargetDate,ISOClause'];
    (Object.entries(ALL_ITEMS) as [Quadrant, SWOTItem[]][]).forEach(([quadrant, items]) => {
      items.forEach(i => {
        lines.push(`${quadrant},${i.id},"${i.text}",${i.category},${i.riskLevel},"${i.source}","${i.actionPlan || ''}",${i.responsible || ''},${i.targetDate || ''},${i.isoClause || ''}`);
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swot-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppShell breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'SWOT Analysis' }]}>
      <div className="space-y-10 p-6">
        {/* Page header — eyebrow, negative-tracked title, one lede line */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
              ISO 9001:2015 · Clause 4.1 &amp; 6.1
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-[-0.02em] text-foreground">
              SWOT Analysis
            </h1>
            <p className="mt-2 text-[15px] leading-[1.7] text-muted-foreground max-w-2xl">
              Strategic analysis of the organisation&apos;s internal strengths and weaknesses
              against its external opportunities and threats.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowStrategies(!showStrategies)}>
              <Lightbulb className="h-4 w-4 mr-2" />
              {showStrategies ? 'Hide Strategies' : 'TOWS Strategies'}
            </Button>
          </div>
        </div>

        {/* Stats — ONE panel of hairline-separated cells, not six tinted cards.
            The numbers are the content; the label is the quiet part.  The
            hairline technique: every cell carries a bottom+right border and
            is pulled 1px out, so the outermost lines merge into the panel's
            own border instead of doubling it. */}
        <div className="ds-panel grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 overflow-hidden">
          {([
            { value: stats.strengths, label: 'Strengths', tone: '' },
            { value: stats.weaknesses, label: 'Weaknesses', tone: '' },
            { value: stats.opportunities, label: 'Opportunities', tone: '' },
            { value: stats.threats, label: 'Threats', tone: '' },
            { value: stats.highRisk, label: 'High risk items', tone: 'text-destructive-tint' },
            { value: stats.withActionPlan, label: 'With action plan', tone: '' },
          ] as const).map((stat) => (
            <div
              key={stat.label}
              className="px-5 py-4 text-center border-b border-r border-border -mb-px -mr-px"
            >
              <div className={cn('text-2xl font-bold tracking-[-0.01em] tabular-nums text-foreground', stat.tone)}>
                {stat.value}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* SWOT Matrix — four sibling panels, one surface each, hairlines
            between the rows inside them.  The quadrants are the same KIND of
            thing, so they get the same treatment; nothing is tinted per
            quadrant.  Colour appears only where it carries information: the
            risk chip, coloured by RISK LEVEL. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(Object.entries(QUADRANT_CONFIG) as [Quadrant, typeof QUADRANT_CONFIG[Quadrant]][]).map(([key, config]) => {
            const items = ALL_ITEMS[key];
            const Icon = config.icon;
            const ArrowIcon = config.arrowIcon;
            const isExpanded = expandedQuadrant === key;

            return (
              <section key={key} className="ds-card overflow-hidden flex flex-col">
                {/* Panel header — name, count and one gloss line, all grayscale. */}
                <header className="px-5 pt-4 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
                    <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                      {config.title}
                    </h2>
                    <span className="ml-auto text-[13px] tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedQuadrant(isExpanded ? null : key)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? `Collapse ${config.title}` : `Expand ${config.title}`}
                      className="-mr-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 pl-[26px] text-[13px] leading-[1.6] text-muted-foreground">
                    {config.hint}
                  </p>
                </header>

                {/* The items — one continuous list, hairline-separated. */}
                <ul className="border-t border-border">
                  {items.map(item => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          'flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors',
                          'border-b border-border last:border-b-0',
                          'hover:bg-foreground/[0.03]',
                          selectedItem?.id === item.id && 'bg-foreground/[0.06]'
                        )}
                      >
                        <ArrowIcon
                          className="mt-[3px] h-4 w-4 flex-shrink-0 text-ink-3"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-medium leading-[1.45] text-foreground">
                            {item.text}
                          </span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-foreground/10 bg-foreground/5 px-2 py-[1px] text-[11px] font-medium text-foreground/70">
                              {item.category}
                            </span>
                            <span
                              className={cn(
                                'rounded-full border px-2 py-[1px] text-[11px] font-medium',
                                RISK_CHIP_CLASS[item.riskLevel]
                              )}
                            >
                              {item.riskLevel} risk
                            </span>
                            {item.actionPlan && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[11px] font-medium text-primary-tint">
                                <Zap className="h-3 w-3" aria-hidden />
                                Action plan
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Expanded detail — the same list, unwrapped.  A hairline
                    separates it from the summary rows above. */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/40 px-5 py-4">
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {config.title} — full detail
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {items.map(item => (
                        <li key={item.id} className="flex items-start gap-3">
                          <span className="mt-[1px] flex-shrink-0 rounded-sm bg-muted px-1.5 py-[1px] font-mono text-[11px] tabular-nums text-foreground">
                            {item.id}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium leading-[1.5] text-foreground">
                              {item.text}
                            </span>
                            {item.actionPlan && (
                              <span className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-[1.6] text-foreground/70">
                                <Zap className="mt-[2px] h-3 w-3 flex-shrink-0 text-primary-tint" aria-hidden />
                                {item.actionPlan}
                              </span>
                            )}
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-foreground/70">
                              {item.responsible && (
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="h-3 w-3 text-ink-3" aria-hidden />
                                  {item.responsible}
                                </span>
                              )}
                              {item.targetDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-ink-3" aria-hidden />
                                  {item.targetDate}
                                </span>
                              )}
                              {item.isoClause && (
                                <span className="inline-flex items-center gap-1">
                                  <BookMarked className="h-3 w-3 text-ink-3" aria-hidden />
                                  ISO {item.isoClause}
                                </span>
                              )}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* TOWS Strategies — two panels, one per cross-impact.  The accent is
            carried by the icon and the strategy name, not by a saturated
            header band: the old `bg-success` / `bg-destructive` headers
            measured 1.00:1 and 1.49:1 for their own description text. */}
        {showStrategies && (
          <section className="space-y-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
                Cross-impact matrix
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-foreground">
                TOWS Strategies
              </h2>
              <p className="mt-1.5 max-w-2xl text-[14px] leading-[1.7] text-ink">
                Internal factors combined with external ones — strengths with opportunities,
                weaknesses with threats.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* SO — strengths × opportunities */}
              <div className="ds-card overflow-hidden">
                <header className="flex items-center gap-2.5 border-b border-border px-5 py-4">
                  <ArrowUpRight className="h-[18px] w-[18px] text-success-tint" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">
                      SO — Strengths × Opportunities
                    </h3>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      Use strengths to capitalize on opportunities
                    </p>
                  </div>
                </header>
                <ul className="divide-y divide-border">
                  {SO_STRATEGIES.map(strategy => (
                    <li key={strategy.name} className="px-5 py-4">
                      <h4 className="text-[14px] font-semibold text-foreground">{strategy.name}</h4>
                      <dl className="mt-2 grid grid-cols-1 gap-1.5 text-[13px]">
                        <div className="flex gap-2">
                          <dt className="w-[86px] flex-shrink-0 text-foreground/70">Strength</dt>
                          <dd className="min-w-0 flex-1 text-foreground">{strategy.strength}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-[86px] flex-shrink-0 text-foreground/70">Opportunity</dt>
                          <dd className="min-w-0 flex-1 text-foreground">{strategy.opportunity}</dd>
                        </div>
                      </dl>
                      <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-[1.6] text-foreground">
                        <Zap className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-success-tint" aria-hidden />
                        {strategy.action}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* WT — weaknesses × threats */}
              <div className="ds-card overflow-hidden">
                <header className="flex items-center gap-2.5 border-b border-border px-5 py-4">
                  <Shield className="h-[18px] w-[18px] text-destructive-tint" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">
                      WT — Weaknesses × Threats
                    </h3>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      Minimize weaknesses and avoid threats
                    </p>
                  </div>
                </header>
                <ul className="divide-y divide-border">
                  {WT_STRATEGIES.map(strategy => (
                    <li key={strategy.name} className="px-5 py-4">
                      <h4 className="text-[14px] font-semibold text-foreground">{strategy.name}</h4>
                      <dl className="mt-2 grid grid-cols-1 gap-1.5 text-[13px]">
                        <div className="flex gap-2">
                          <dt className="w-[86px] flex-shrink-0 text-foreground/70">Weakness</dt>
                          <dd className="min-w-0 flex-1 text-foreground">{strategy.weakness}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-[86px] flex-shrink-0 text-foreground/70">Threat</dt>
                          <dd className="min-w-0 flex-1 text-foreground">{strategy.threat}</dd>
                        </div>
                      </dl>
                      <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-[1.6] text-foreground">
                        <Shield className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-destructive-tint" aria-hidden />
                        {strategy.action}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ISO Compliance Summary — one panel, hairline-separated rows. */}
        <section className="ds-card overflow-hidden">
          <header className="flex items-center gap-2.5 border-b border-border px-5 py-4">
            <FileText className="h-[18px] w-[18px] text-primary-tint" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">
                ISO 9001:2015 compliance mapping
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                How the SWOT factors align with the clauses they answer
              </p>
            </div>
          </header>
          <ul className="-mb-px -mr-px grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[
              { clause: '4.1', title: 'Context of Organization' },
              { clause: '4.2', title: 'Interested Parties' },
              { clause: '6.1', title: 'Risk & Opportunity' },
              { clause: '7.1', title: 'Resources' },
              { clause: '7.2', title: 'Competence' },
              { clause: '8.x', title: 'Operations' },
            ].map(item => {
              const count = [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS]
                .filter(i => i.isoClause?.includes(item.clause)).length;
              return (
                <li
                  key={item.clause}
                  className="flex items-center justify-between gap-3 border-b border-r border-border px-5 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[11.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                      Clause {item.clause}
                    </span>
                    <span className="mt-0.5 block text-[13.5px] text-foreground">{item.title}</span>
                  </span>
                  <span className="text-xl font-bold tabular-nums tracking-[-0.01em] text-foreground">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-foreground">
              <Eye className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
              {selectedItem?.id} — {selectedItem?.category}
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-[1.7] text-foreground/70">
              {selectedItem?.text}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {/* Details — one panel of hairline-separated rows, not four
                  separately-filled tiles.  The old tiles put 12px muted text
                  on `bg-muted` (4.50:1, exactly on the AA line) and made
                  each field its own card. */}
              <dl className="overflow-hidden rounded-lg border border-border">
                {([
                  { label: 'Source', value: selectedItem.source },
                  { label: 'Risk level', value: selectedItem.riskLevel },
                  selectedItem.responsible
                    ? { label: 'Responsible', value: selectedItem.responsible }
                    : null,
                  selectedItem.targetDate
                    ? { label: 'Target date', value: selectedItem.targetDate }
                    : null,
                ].filter(Boolean) as { label: string; value: string }[]).map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={cn(
                      'flex items-baseline justify-between gap-4 px-4 py-2.5',
                      i < arr.length - 1 && 'border-b border-border'
                    )}
                  >
                    <dt className="text-[12.5px] text-foreground/70">{row.label}</dt>
                    <dd className="text-[13.5px] font-medium text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {selectedItem.actionPlan && (
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-primary-tint">
                    <Zap className="h-3 w-3" aria-hidden />
                    Action plan
                  </div>
                  <div className="text-[13.5px] leading-[1.7] text-foreground">
                    {selectedItem.actionPlan}
                  </div>
                </div>
              )}

              {(selectedItem.isoClause ||
                (selectedItem.linkedTo && selectedItem.linkedTo.length > 0)) && (
                <dl className="overflow-hidden rounded-lg border border-border">
                  {selectedItem.isoClause && (
                    <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-2.5">
                      <dt className="text-[12.5px] text-foreground/70">ISO 9001:2015 clause</dt>
                      <dd className="font-mono text-[12.5px] tabular-nums text-foreground">
                        {selectedItem.isoClause}
                      </dd>
                    </div>
                  )}
                  {selectedItem.linkedTo && selectedItem.linkedTo.length > 0 && (
                    <div
                      className={cn(
                        'flex items-baseline justify-between gap-4 px-4 py-2.5',
                        selectedItem.isoClause && 'border-t border-border'
                      )}
                    >
                      <dt className="text-[12.5px] text-foreground/70">Linked context issues</dt>
                      <dd className="flex flex-wrap justify-end gap-1.5">
                        {selectedItem.linkedTo.map(link => (
                          <span
                            key={link}
                            className="rounded-full border border-foreground/10 bg-foreground/5 px-2 py-[1px] font-mono text-[11px] text-foreground/80"
                          >
                            {link}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
