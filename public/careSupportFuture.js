// Dormant Pet Pawket care-support registry.
//
// This module is intentionally not imported by main.js, account pages,
// checkout, CHARM pages, navbar, footer, or any route. It exists only as a
// future-forward implementation scaffold while compliance review is pending.

export const CARE_SUPPORT_FEATURE_STATE = Object.freeze({
  status: 'dormant_pending_review',
  approvedForSiteUse: false,
  publicDiscoveryEnabled: false,
  accountModulesEnabled: false,
  checkoutHooksEnabled: false,
  careCreditLedgerEnabled: false,
  charmAssistanceIntakeEnabled: false,
  insuranceReferralLinksEnabled: false,
  partnerCardsEnabled: false,
  rewardCalculationsEnabled: false,
  publicStoryConnectionsEnabled: false,
  decisionLog: 'docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md',
  sourceDocs: Object.freeze([
    'docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md',
    'docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md',
    'docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md',
    'docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md',
    'docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md',
    'docs/PET_PAWKET_COMPLIANCE_COPY.md'
  ])
});

export const CARE_SUPPORT_DISCLAIMERS = Object.freeze({
  combined:
    'Not insurance. No guaranteed coverage. Pawket Care Credit is a rewards program. CHARM Emergency Assistance is charitable aid subject to eligibility, program guidelines, and available funds. Pet insurance, where available, is offered only through licensed insurance partners.',
  careCredit:
    "Pawket Care Credit is a rewards-based credit program, not insurance. Credits are earned through eligible Pet Pawket purchases and participation and may be redeemed only according to Pet Pawket's program terms. Pawket Care Credit does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.",
  charmAssistance:
    'CHARM Emergency Assistance is a charitable assistance program, not insurance. Assistance may be available through an application process and is subject to eligibility, mission fit, available funds, and program guidelines. CHARM Emergency Assistance does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.',
  insuranceReferral:
    'Pet insurance is offered by licensed insurance providers or agencies, not Pet Pawket. Pet Pawket does not underwrite, sell, administer, or guarantee insurance policies. Coverage, eligibility, premiums, exclusions, deductibles, waiting periods, claims, and benefits are determined by the insurance provider.'
});

export const CARE_SUPPORT_LANES = Object.freeze([
  Object.freeze({
    id: 'pawket-care-credit',
    title: 'Pawket Care Credit',
    nature: 'earned_rewards_value',
    customerPurpose:
      'Future rewards value earned through eligible Pet Pawket activity and redeemed only under approved program terms.',
    currentState: 'planned_not_active',
    safeVerbs: Object.freeze(['learn', 'review', 'redeem']),
    blockedVerbs: Object.freeze(['claim', 'get covered', 'file', 'guarantee']),
    futureRequires: Object.freeze([
      'approved program terms',
      'legal and consumer-protection review',
      'tax and accounting review',
      'payments and refund review',
      'separate auditable ledger design',
      'approved account copy'
    ]),
    enabled: false
  }),
  Object.freeze({
    id: 'charm-emergency-assistance',
    title: 'CHARM Emergency Assistance',
    nature: 'charitable_assistance',
    customerPurpose:
      'Future charitable aid request path for mission-aligned urgent animal-care needs, subject to guidelines and available funds.',
    currentState: 'planned_not_active',
    safeVerbs: Object.freeze(['learn', 'review', 'request', 'apply']),
    blockedVerbs: Object.freeze(['claim', 'get covered', 'guarantee', 'reimburse']),
    futureRequires: Object.freeze([
      'approved CHARM assistance guidelines',
      'charity compliance review',
      'privacy and consent review',
      'ops staffing and escalation rules',
      'funding and disbursement rules',
      'approved outcome copy'
    ]),
    enabled: false
  }),
  Object.freeze({
    id: 'licensed-insurance-partners',
    title: 'Licensed Insurance Partners',
    nature: 'external_licensed_partner_path',
    customerPurpose:
      'Future education or referral path to licensed providers or agencies for actual pet insurance.',
    currentState: 'planned_not_active',
    safeVerbs: Object.freeze(['learn', 'visit partner', 'review disclosure']),
    blockedVerbs: Object.freeze(['underwrite', 'sell policy', 'administer', 'advise']),
    futureRequires: Object.freeze([
      'licensed partner selection',
      'insurance licensing review',
      'state availability rules',
      'approved referral disclosure',
      'privacy and tracking approval',
      'support routing rules'
    ]),
    enabled: false
  })
]);

export function getCareSupportLane(laneId) {
  return CARE_SUPPORT_LANES.find((lane) => lane.id === laneId) || null;
}

export function getDormantCareSupportState() {
  return {
    ...CARE_SUPPORT_FEATURE_STATE,
    lanes: CARE_SUPPORT_LANES,
    disclaimers: CARE_SUPPORT_DISCLAIMERS
  };
}

export function assertCareSupportFeatureInactive(featureKey) {
  const isKnownFeature = Object.hasOwn(CARE_SUPPORT_FEATURE_STATE, featureKey);
  return {
    ok: isKnownFeature && CARE_SUPPORT_FEATURE_STATE[featureKey] === false,
    status: CARE_SUPPORT_FEATURE_STATE.status,
    featureKey,
    decisionLog: CARE_SUPPORT_FEATURE_STATE.decisionLog
  };
}
