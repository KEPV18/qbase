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
  Target,
  Download,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Zap,
  Eye,
  FileText,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const QUADRANT_CONFIG: Record<Quadrant, {
  title: string;
  icon: React.ElementType;
  bgColor: string;
  borderColor: string;
  headerBg: string;
  headerText: string;
  itemBg: string;
  badgeColor: string;
  arrowIcon: React.ElementType;
}> = {
  strengths: {
    title: 'Strengths',
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-300 dark:border-green-700',
    headerBg: 'bg-green-600',
    headerText: 'text-white',
    itemBg: 'bg-green-100/60 dark:bg-green-900/20',
    badgeColor: 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200',
    arrowIcon: ArrowUpRight,
  },
  weaknesses: {
    title: 'Weaknesses',
    icon: TrendingDown,
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-300 dark:border-red-700',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    itemBg: 'bg-red-100/60 dark:bg-red-900/20',
    badgeColor: 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200',
    arrowIcon: ArrowDownRight,
  },
  opportunities: {
    title: 'Opportunities',
    icon: TrendingUp,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    itemBg: 'bg-blue-100/60 dark:bg-blue-900/20',
    badgeColor: 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
    arrowIcon: ArrowUpRight,
  },
  threats: {
    title: 'Threats',
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    headerBg: 'bg-amber-600',
    headerText: 'text-white',
    itemBg: 'bg-amber-100/60 dark:bg-amber-900/20',
    badgeColor: 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200',
    arrowIcon: ArrowDownRight,
  },
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
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SWOT Analysis</h1>
            <p className="text-muted-foreground mt-1">
              ISO 9001:2015 Clause 4.1 & 6.1 — Strategic analysis of Strengths, Weaknesses, Opportunities & Threats
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.strengths}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Strengths</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.weaknesses}</div>
            <div className="text-xs text-red-600 dark:text-red-400">Weaknesses</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.opportunities}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Opportunities</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.threats}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400">Threats</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.highRisk}</div>
            <div className="text-xs text-muted-foreground">High Risk Items</div>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.withActionPlan}</div>
            <div className="text-xs text-muted-foreground">With Action Plan</div>
          </div>
        </div>

        {/* SWOT Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(Object.entries(QUADRANT_CONFIG) as [Quadrant, typeof QUADRANT_CONFIG[Quadrant]][]).map(([key, config]) => {
            const items = ALL_ITEMS[key];
            const Icon = config.icon;
            const ArrowIcon = config.arrowIcon;
            const isExpanded = expandedQuadrant === key;

            return (
              <div key={key} className={cn('rounded-lg border', config.borderColor, config.bgColor, 'overflow-hidden')}>
                {/* Header */}
                <div className={cn('px-4 py-3 flex items-center justify-between', config.headerBg)}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-white" />
                    <h3 className={cn('font-bold text-lg', config.headerText)}>{config.title}</h3>
                    <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                  </div>
                  <button
                    onClick={() => setExpandedQuadrant(isExpanded ? null : key)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {/* Items */}
                <div className="p-3 space-y-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-md p-3 cursor-pointer transition-all hover:shadow-md',
                        config.itemBg,
                        selectedItem?.id === item.id && 'ring-2 ring-primary'
                      )}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-start gap-2">
                        <ArrowIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.text}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                            <Badge className={cn('text-[10px]', config.badgeColor)} variant="secondary">
                              {item.riskLevel} Risk
                            </Badge>
                            {item.actionPlan && (
                              <Badge variant="outline" className="text-[10px]">
                                <Target className="h-2.5 w-2.5 mr-1" />
                                Has Action Plan
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3">
                    <Card className="bg-card">
                      <CardContent className="p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          All {config.title} Items — Detailed View
                        </h4>
                        <div className="space-y-3">
                          {items.map(item => (
                            <div key={item.id} className="flex items-start gap-3 text-sm border-b border-border pb-2 last:border-b-0">
                              <Badge variant="outline" className="text-[10px] mt-0.5 flex-shrink-0">{item.id}</Badge>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground">{item.text}</div>
                                {item.actionPlan && (
                                  <div className="text-muted-foreground mt-1">
                                    <Zap className="h-3 w-3 inline mr-1" />
                                    {item.actionPlan}
                                  </div>
                                )}
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  {item.responsible && (
                                    <span className="text-[10px] text-muted-foreground">📋 {item.responsible}</span>
                                  )}
                                  {item.targetDate && (
                                    <span className="text-[10px] text-muted-foreground">📅 {item.targetDate}</span>
                                  )}
                                  {item.isoClause && (
                                    <span className="text-[10px] text-muted-foreground">📐 ISO {item.isoClause}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* TOWS Strategies */}
        {showStrategies && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-foreground">TOWS Cross-Impact Strategies</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Derived from combining internal (Strengths/Weaknesses) with external (Opportunities/Threats) factors.
            </p>

            {/* SO Strategies */}
            <Card className="border-green-300 dark:border-green-700">
              <CardHeader className="bg-green-600 text-white rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5" />
                  SO Strategies (Strengths × Opportunities)
                </CardTitle>
                <CardDescription className="text-green-100">
                  Use strengths to capitalize on opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {SO_STRATEGIES.map(strategy => (
                  <div key={strategy.name} className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">{strategy.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Strength:</span> <span className="text-foreground">{strategy.strength}</span></div>
                      <div><span className="text-muted-foreground">Opportunity:</span> <span className="text-foreground">{strategy.opportunity}</span></div>
                    </div>
                    <div className="mt-2 text-sm bg-white dark:bg-green-900/30 rounded p-2">
                      <Zap className="h-3 w-3 inline mr-1 text-green-600" />
                      {strategy.action}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* WT Strategies */}
            <Card className="border-red-300 dark:border-red-700">
              <CardHeader className="bg-red-600 text-white rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  WT Strategies (Weaknesses × Threats)
                </CardTitle>
                <CardDescription className="text-red-100">
                  Minimize weaknesses and avoid threats
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {WT_STRATEGIES.map(strategy => (
                  <div key={strategy.name} className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">{strategy.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Weakness:</span> <span className="text-foreground">{strategy.weakness}</span></div>
                      <div><span className="text-muted-foreground">Threat:</span> <span className="text-foreground">{strategy.threat}</span></div>
                    </div>
                    <div className="mt-2 text-sm bg-white dark:bg-red-900/30 rounded p-2">
                      <Shield className="h-3 w-3 inline mr-1 text-red-600" />
                      {strategy.action}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ISO Compliance Summary */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              ISO 9001:2015 Compliance Mapping
            </CardTitle>
            <CardDescription>How SWOT items align with ISO 9001:2015 clauses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { clause: '4.1', title: 'Context of Organization', items: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.isoClause?.includes('4.1')).length },
                { clause: '4.2', title: 'Interested Parties', items: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.isoClause?.includes('4.2')).length },
                { clause: '6.1', title: 'Risk & Opportunity', items: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.isoClause?.includes('6.1')).length },
                { clause: '7.1', title: 'Resources', items: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.isoClause?.includes('7.1')).length },
                { clause: '7.2', title: 'Competence', items: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.isoClause?.includes('7.2')).length },
                { clause: '8.x', title: 'Operations', items: [...STRENGTHS, ...WEAKNESSES, ...OPPORTUNITIES, ...THREATS].filter(i => i.isoClause?.includes('8.')).length },
              ].map(item => (
                <div key={item.clause} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-mono">Clause {item.clause}</Badge>
                    <span className="text-lg font-bold text-foreground">{item.items}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{item.title}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {selectedItem?.id} — {selectedItem?.category}
            </DialogTitle>
            <DialogDescription>{selectedItem?.text}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="text-sm font-medium text-foreground">{selectedItem.source}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Risk Level</div>
                  <div className="text-sm font-medium text-foreground">{selectedItem.riskLevel}</div>
                </div>
                {selectedItem.responsible && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Responsible</div>
                    <div className="text-sm font-medium text-foreground">{selectedItem.responsible}</div>
                  </div>
                )}
                {selectedItem.targetDate && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Target Date</div>
                    <div className="text-sm font-medium text-foreground">{selectedItem.targetDate}</div>
                  </div>
                )}
              </div>

              {selectedItem.actionPlan && (
                <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4">
                  <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Action Plan
                  </div>
                  <div className="text-sm text-foreground">{selectedItem.actionPlan}</div>
                </div>
              )}

              {selectedItem.isoClause && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">ISO 9001:2015 Clause</div>
                  <Badge variant="secondary" className="font-mono">Clause {selectedItem.isoClause}</Badge>
                </div>
              )}

              {selectedItem.linkedTo && selectedItem.linkedTo.length > 0 && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Linked Context Issues</div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItem.linkedTo.map(link => (
                      <Badge key={link} variant="outline">{link}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}