/**
 * Interested Parties Data Module
 * 
 * ISO 9001:2015 Clause 4.2 — Understanding needs and expectations of interested parties
 * Required for Context of Organization analysis
 */

export interface InterestedParty {
  id: string;
  name: string;
  category: 'Customer' | 'Supplier' | 'Employee' | 'Regulatory' | 'Partner' | 'Community' | 'Investor';
  needs: string[];
  expectations: string[];
  legalRequirements: string[];
  riskLevel: 'High' | 'Medium' | 'Low';
  relevance: string;
  responsibleHOD: string;
  lastReviewed: string;
  nextReview: string;
  status: 'Active' | 'Inactive' | 'Monitoring';
}

export const DEFAULT_INTERESTED_PARTIES: InterestedParty[] = [
  // CUSTOMERS
  {
    id: 'IP-001',
    name: 'BatFast',
    category: 'Customer',
    needs: [
      'High-quality data annotation for sports analytics',
      'On-time delivery per project timelines',
      'Data security and confidentiality',
    ],
    expectations: [
      'Consistent quality standards across all projects',
      'Rapid response to queries and feedback',
      'Accurate labeling with minimal rework',
      'ISO 9001:2015 certified supplier',
    ],
    legalRequirements: [
      'GDPR compliance for EU data subjects',
      'Data processing agreement',
      'Confidentiality agreement',
    ],
    riskLevel: 'High',
    relevance: 'Primary client — 40% of revenue',
    responsibleHOD: 'Sales Manager',
    lastReviewed: '2026-01-15',
    nextReview: '2026-04-15',
    status: 'Active',
  },
  {
    id: 'IP-002',
    name: 'Adam (ETH Project)',
    category: 'Customer',
    needs: [
      'Data annotation for machine learning',
      'Flexible scaling per project needs',
      'Multi-format data delivery',
    ],
    expectations: [
      'Timely project completion',
      'Quality metrics above 95% accuracy',
      'Clear communication channels',
    ],
    legalRequirements: [
      'GDPR compliance',
      'IP protection clauses',
    ],
    riskLevel: 'High',
    relevance: 'Major client — 35% of revenue',
    responsibleHOD: 'Sales Manager',
    lastReviewed: '2026-02-28',
    nextReview: '2026-05-28',
    status: 'Active',
  },
  {
    id: 'IP-003',
    name: 'Other Vizzlo Clients',
    category: 'Customer',
    needs: [
      'Data annotation services',
      'Competitive pricing',
      'Reliable quality assurance',
    ],
    expectations: [
      'Consistent service levels',
      'ISO certification assurance',
      'Professional data handling',
    ],
    legalRequirements: [
      'NDA agreements',
      'Data protection clauses',
    ],
    riskLevel: 'Medium',
    relevance: 'Collective — 25% of revenue',
    responsibleHOD: 'Sales Manager',
    lastReviewed: '2026-01-20',
    nextReview: '2026-04-20',
    status: 'Active',
  },

  // SUPPLIER
  {
    id: 'IP-004',
    name: 'Al-Nasser Stationery',
    category: 'Supplier',
    needs: [
      'Timely payment',
      'Clear purchase orders',
      'Long-term partnership',
    ],
    expectations: [
      'Transparent procurement process',
      'On-time delivery of supplies',
      'Quality control acceptance',
      'Favorable payment terms (30 days)',
    ],
    legalRequirements: [
      'Tax compliance (Egypt)',
      'Commercial registration validity',
      'VAT compliance',
    ],
    riskLevel: 'Low',
    relevance: 'Office supplies supplier',
    responsibleHOD: 'Procurement Manager',
    lastReviewed: '2025-09-30',
    nextReview: '2026-03-30',
    status: 'Active',
  },

  // EMPLOYEES
  {
    id: 'IP-005',
    name: 'Vizzlo Data Annotators',
    category: 'Employee',
    needs: [
      'Fair compensation',
      'Safe working environment',
      'Professional development opportunities',
      'Clear work instructions and training',
    ],
    expectations: [
      'Regular payment schedule',
      'Performance feedback',
      'Career growth path',
      'Respectful workplace culture',
      'Equipment and tools provided',
    ],
    legalRequirements: [
      'Egyptian Labor Law compliance',
      'Social insurance registration',
      'Health and safety standards',
      'Working hours regulations (48h/week)',
    ],
    riskLevel: 'High',
    relevance: 'Core workforce — service delivery',
    responsibleHOD: 'HR Manager',
    lastReviewed: '2026-01-10',
    nextReview: '2026-04-10',
    status: 'Active',
  },
  {
    id: 'IP-006',
    name: 'Quality Assurance Team',
    category: 'Employee',
    needs: [
      'Authority to halt non-conforming work',
      'Training on QMS standards',
      'Access to quality metrics',
    ],
    expectations: [
      'Management support for quality decisions',
      'Sufficient resources for QC',
      'Recognition of quality achievements',
    ],
    legalRequirements: [
      'ISO 9001:2015 internal auditor qualifications',
      'Competence requirements per Clause 7.2',
    ],
    riskLevel: 'High',
    relevance: 'ISO compliance critical role',
    responsibleHOD: 'Quality Manager',
    lastReviewed: '2025-11-15',
    nextReview: '2026-02-15',
    status: 'Active',
  },

  // REGULATORY
  {
    id: 'IP-007',
    name: 'Egyptian General Authority for Investment',
    category: 'Regulatory',
    needs: [
      'Compliance with FDI regulations',
      'Accurate reporting',
      'License renewals on time',
    ],
    expectations: [
      'Tax compliance',
      'Labor law adherence',
      'Financial transparency',
      'Business registration validity',
    ],
    legalRequirements: [
      'Free Zone regulations (if applicable)',
      'Tax Authority reporting',
      'Commercial register updates',
      'Annual audit requirements',
    ],
    riskLevel: 'High',
    relevance: 'Legal entity compliance',
    responsibleHOD: 'CEO',
    lastReviewed: '2025-12-01',
    nextReview: '2026-06-01',
    status: 'Active',
  },
  {
    id: 'IP-008',
    name: 'GDPR/EU Data Protection Authorities',
    category: 'Regulatory',
    needs: [
      'Data protection compliance',
      'Breach notifications (72h)',
      'Data subject rights fulfillment',
    ],
    expectations: [
      'Data processing agreements',
      'Privacy impact assessments',
      'Cross-border transfer safeguards',
    ],
    legalRequirements: [
      'GDPR Article 28 (Processor obligations)',
      'Data retention limits',
      'Right to deletion compliance',
    ],
    riskLevel: 'High',
    relevance: 'EU client data processing',
    responsibleHOD: 'Quality Manager',
    lastReviewed: '2025-09-15',
    nextReview: '2026-03-15',
    status: 'Active',
  },

  // PARTNERS
  {
    id: 'IP-009',
    name: 'Technology Partners',
    category: 'Partner',
    needs: [
      'Reliable annotation quality',
      'Platform integration support',
      'Data security assurance',
    ],
    expectations: [
      'API compatibility',
      'Technical documentation',
      'Issue escalation responsiveness',
    ],
    legalRequirements: [
      'Service Level Agreements',
      'Data security certifications',
      'Insurance coverage',
    ],
    riskLevel: 'Medium',
    relevance: 'Technical infrastructure support',
    responsibleHOD: 'IT Manager',
    lastReviewed: '2025-10-20',
    nextReview: '2026-04-20',
    status: 'Monitoring',
  },

  // COMMUNITY
  {
    id: 'IP-010',
    name: 'Cairo Tech Community',
    category: 'Community',
    needs: [
      'Employment creation',
      'Skills development',
      'Technology advancement',
    ],
    expectations: [
      'Fair labor practices',
      'Community engagement',
      'Environmental responsibility',
    ],
    legalRequirements: [
      'Environmental regulations (basic)',
      'Social responsibility practices',
    ],
    riskLevel: 'Low',
    relevance: 'Reputation and talent pool',
    responsibleHOD: 'HR Manager',
    lastReviewed: '2025-08-15',
    nextReview: '2026-02-15',
    status: 'Active',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPartiesByCategory(category: InterestedParty['category']): InterestedParty[] {
  return DEFAULT_INTERESTED_PARTIES.filter(p => p.category === category);
}

export function getHighRiskParties(): InterestedParty[] {
  return DEFAULT_INTERESTED_PARTIES.filter(p => p.riskLevel === 'High');
}

export function getPartiesNeedingReview(asOfDate: Date = new Date()): InterestedParty[] {
  return DEFAULT_INTERESTED_PARTIES.filter(p => {
    const nextReview = new Date(p.nextReview);
    return nextReview <= asOfDate && p.status === 'Active';
  });
}

export function getPartyRiskSummary(): Record<string, number> {
  const summary: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  DEFAULT_INTERESTED_PARTIES.forEach(p => {
    summary[p.riskLevel]++;
  });
  return summary;
}

export function getCategorySummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  DEFAULT_INTERESTED_PARTIES.forEach(p => {
    summary[p.category] = (summary[p.category] || 0) + 1;
  });
  return summary;
}

export function exportToCSV(): string {
  const headers = [
    'ID', 'Name', 'Category', 'Status', 'Risk Level',
    'Relevance', 'Responsible HOD', 'Last Reviewed', 'Next Review',
    'Needs', 'Expectations', 'Legal Requirements',
  ].join('|');

  const rows = DEFAULT_INTERESTED_PARTIES.map(p => [
    p.id, p.name, p.category, p.status,
    p.riskLevel, p.relevance, p.responsibleHOD,
    p.lastReviewed, p.nextReview,
    p.needs.join('; '), p.expectations.join('; '), p.legalRequirements.join('; '),
  ].join('|'));

  return [headers, ...rows].join('\n');
}