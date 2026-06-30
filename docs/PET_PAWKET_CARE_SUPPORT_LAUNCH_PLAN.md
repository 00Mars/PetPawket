# Pet Pawket Care Support Launch Plan

Last updated: 2026-05-09

This document turns the care-support ecosystem into a practical implementation path. It is product and engineering planning, not legal advice. Pawket Care Credit, CHARM Emergency Assistance, and licensed insurance partner referrals require legal, insurance, charity, tax, accounting, consumer-protection, privacy, payments, and partner review before launch.

Use `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md` for the draft decision templates that sit behind these gates.
Use `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` before touching dormant care-support scaffolding, direct preview pages, or future feature-state registries.
Use `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md` before changing public care-support links, labels, CTAs, search metadata, navbar/footer discovery, CHARM handoffs, account handoffs, disclaimers, or public page roles.
Use `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md` before designing data domains, schemas, APIs, account payloads, checkout hooks, support tools, analytics, Pawket Pal connections, HeartCode connections, or test fixtures.
Use `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` before implementing consent-sensitive stories, public Pal adaptations, CHARM impact stories, HeartCode story payloads, analytics, or public content derived from private data.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md` when preparing legal, compliance, support, partner, product, or engineering review.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting review status, choosing the next review action, assigning owners, sending packets, or interpreting review progress.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before coordinating owner nomination, roster updates, dispatch updates, packet send status, return intake, or decision-log transfer.
Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` when moving review outcomes into the decision log.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` to coordinate reviewer ownership, row status, and build-blocking dependencies.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` when asking reviewers for decision-ready answers.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` when sending reviewer-specific packets.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` when assembling packet IDs, file lists, question IDs, and tracker rows.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` when recording reviewer owners or confirming assignment readiness.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` when preparing packet-specific reviewer-facing send notes.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` when tracking packet preparation, send status, return status, and decision-log intake.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` when reviewer answers return, before moving them into the worksheet, tracker, decision record, or decision log.
Use `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md` to sequence the first non-build review tickets.
Use `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` when scoping future review, copy, design, planning, implementation, QA, or documentation tickets.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md` for reviewer notes, then transfer approved statuses into `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.

## Purpose

Pet Pawket can help families plan with clarity through three separate lanes:

1. Pawket Care Credit: earned rewards value.
2. CHARM Emergency Assistance: charitable aid.
3. Licensed Insurance Partners: optional external insurance education and referrals.

The goal is to make these lanes feel emotionally connected while keeping their data, copy, accounting, eligibility, and customer expectations separate.

## Current Launch State

Active now:

- `public/pet-care-planning.html` is a direct dormant review preview.
- `public/careSupportFuture.js` is a dormant, non-imported future registry for disabled care-support feature flags, lane definitions, disclaimers, and activation requirements.
- Current direct preview copy explains the three lanes without launching any workflow.
- Public discovery is held. Active navbar, footer, search, Explore, CHARM, and account surfaces should not currently link to Pet Care Planning.
- No care-support database tables, APIs, ledgers, forms, redemption rules, referral tracking, insurance comparison, or checkout behavior exist.

Not active:

- No Pawket Care Credit balance.
- No Pawket Care Credit earning or redemption.
- No CHARM Emergency Assistance request/application intake.
- No CHARM assistance review queue.
- No licensed insurance partner cards or outbound referral tracking.
- No connection from Pawket Pals, Pawket Packs, Pawket Packets, Pawket Picks, HeartPoints, HeartCodes, Heroic Quests, or Pawket Haven to care-support value.

## Non-Negotiable Product Boundaries

Pawket Care Credit:

- Must be rewards value, not insurance.
- Must be earned only through eligible activity defined in program terms.
- Must never promise coverage, emergency payment, reimbursement, or payment for veterinary expenses.
- Must not use claim, premium, deductible, policy, covered condition, underwritten, or emergency protection language.

CHARM Emergency Assistance:

- Must be charitable assistance, not insurance.
- Must be subject to eligibility, mission fit, available funds, and program guidelines.
- Must never guarantee assistance, payment, reimbursement, or future eligibility.
- Must keep assistance records private unless a separate consent path grants public story use.

Licensed Insurance Partners:

- Must remain external to Pet Pawket unless Pet Pawket later becomes properly licensed and appointed.
- Must not make Pet Pawket sound like an insurer, broker, seller, underwriter, administrator, or policy advisor.
- Must route policy details, applications, claims, premiums, exclusions, deductibles, waiting periods, and benefits to licensed partners.

## Launch Gates

No implementation work should move past the current informational state until these gates are cleared.

### Gate 1: Legal And Compliance Review

Required before public launch language becomes stronger than educational copy:

- Rewards/gift-card/stored-value review for Pawket Care Credit.
- Charity/fundraising/registration review for CHARM Emergency Assistance.
- Insurance referral/licensing/affiliate review for Licensed Insurance Partners.
- Privacy review for assistance, veterinary, family hardship, rescue, adoption, medical, and memorial data.
- Tax/accounting review for rewards value, restricted funds, donations, reversals, and assistance payments.
- Payments review for refunds, chargebacks, direct provider payments, and disbursement handling.

Exit criteria:

- Approved program terms direction for Pawket Care Credit.
- Approved CHARM assistance guideline direction.
- Approved insurance referral disclosure direction.
- Approved disclaimer language for public pages, account, checkout, footer, and partner cards.

### Gate 2: Program Rules

Required before any schema, API, or account display:

- Define eligible Pawket Care Credit earn events.
- Define Care Credit caps, expiration, reversals, refund handling, and fraud review.
- Define eligible redemption categories and whether any external provider redemption is allowed.
- Define CHARM assistance applicant types.
- Define CHARM assistance categories, required documentation, review statuses, and emergency escalation rules.
- Define insurance partner eligibility, state availability, referral compensation, and disclosure display rules.

Exit criteria:

- Versioned internal program rules exist.
- The rules state what is active, what is not active, and what must remain hidden.
- Customer copy has matching short disclaimers.

### Gate 3: Data Separation Design

Required before database work:

- Care Credit ledger records stay separate from CHARM assistance records.
- Insurance referral records stay separate from rewards and charity records.
- Story consent stays separate from assistance, rewards, and referral data.
- HeartCodes must not encode private medical, assistance, hardship, or insurance data.
- Pawket Pals must not expose private support records or imply support eligibility.
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md` must be reviewed and updated for the intended data surface.
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` must be reviewed and updated for any consent-sensitive content, public story, CHARM impact, Pawket Pal, HeartCode, or analytics surface.

Exit criteria:

- Data model review confirms separate tables or domains for each lane.
- Sensitive fields are identified before schema work.
- Public payload rules are documented before any API is added.
- Consent type, role visibility, public exposure, and revocation/hold behavior are documented before consent-sensitive work starts.

### Gate 4: Ops Readiness

Required before any public intake or redemption action:

- CHARM review roles are defined.
- Review queue statuses are defined.
- Manual review and escalation paths are staffed.
- Fraud, duplicate, urgent, incomplete, and privacy-sensitive cases have handling rules.
- Assistance outcome copy is approved.
- Support documentation exists for customer questions.

Exit criteria:

- Ops can process a request without improvising policy.
- There is a clear path for closing requests without public explanation.
- No request status looks like an insurance claim.

### Gate 5: UI And Copy Approval

Required before public interactive UI:

- Account cards keep Care Credit, CHARM Assistance, and Licensed Insurance Partners in separate visual lanes.
- All cards include the correct short disclaimer or nearby expanded disclaimer.
- Buttons use safe verbs: Learn, View, Build, Redeem, Apply, Request, Visit Partner.
- Buttons avoid unsafe verbs: Get Covered, File Claim, Start Protection, Reimburse, Guarantee.
- Empty states clearly say when a program is planned or not active.

Exit criteria:

- Public copy review passes against `docs/PET_PAWKET_COMPLIANCE_COPY.md`.
- Public surface changes are reflected in `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`.
- Mobile and desktop screenshots show no visual blending of the three lanes.
- Search/nav/footer labels do not overstate active functionality.

## Implementation Phases

### Phase 0: Information Only

Status: active.

Allowed:

- Direct dormant preview page.
- Dormant future-state registry that is not imported by active runtime files.
- Documentation and copy bank updates.
- Launch planning and legal review checklists.

Not allowed:

- Balances.
- Earned value.
- Redemption.
- Assistance applications.
- Insurance partner referral tracking.
- Checkout care-support logic.
- Public discovery from CHARM, account, footer, nav, search, or Explore while visibility is held.

### Phase 1: Terms And Guidelines

Build only after Gate 1 starts.

Outputs:

- Draft Pawket Care Credit terms.
- Draft CHARM Emergency Assistance guidelines.
- Draft insurance referral disclosure and partner requirements.
- Draft internal FAQ for support and ops.
- Decide whether current held care-planning discovery can become visible, footer-only, revised, or stay held.

Current draft artifacts:

- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Acceptance criteria:

- Terms use rewards language for Care Credit.
- Guidelines use charitable aid language for CHARM.
- Referral disclosure names licensed partners as the insurance providers.
- No customer-facing copy promises coverage, reimbursement, guaranteed payment, or assistance approval.

### Phase 2: Account Information Cards

Build only after Gate 2.

Outputs:

- Account dashboard cards for the three lanes.
- Empty states only unless the underlying program is approved and real data exists.
- Clear status labels such as Planned, Not active, Learn, External partner.

Acceptance criteria:

- No fake balances or fake eligibility.
- No CHARM request statuses without a real request workflow.
- No insurance partner cards without approved partners and disclosures.

### Phase 3: Pawket Care Credit Ledger

Build only after Gates 1 through 3.

Outputs:

- Internal ledger schema.
- Event source rules.
- Reversal/refund handling.
- Terms version tracking.
- Admin review path.
- Tests for earn, reversal, expiration, and audit behavior.

Acceptance criteria:

- Ledger is auditable and reversible.
- Values are shown as earned rewards value only.
- No veterinary/emergency redemption behavior exists until approved separately.

### Phase 4: CHARM Assistance Intake And Review

Build only after Gates 1 through 4.

Outputs:

- Private request intake.
- Ops review queue.
- Eligibility/documentation checklist.
- Privacy and consent flags.
- Outcome messaging.
- Optional provider-payment workflow only after payments/legal review.

Acceptance criteria:

- Intake says request/apply, not claim.
- Statuses never imply entitlement.
- Assistance story consent is separate from request review.
- Records are private by default.

### Phase 5: Licensed Insurance Partner Referrals

Build only after Gates 1, 2, and 5.

Outputs:

- Approved partner cards.
- State availability display, if approved.
- External partner links.
- Referral and affiliate disclosure.
- Optional outbound tracking only if privacy and partner rules approve it.
- Partner requirements reviewed against `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`.

Acceptance criteria:

- Pet Pawket does not collect applications or policy data.
- Partner links clearly leave Pet Pawket for insurance details.
- No comparison or recommendation logic exists unless licensing review approves it.

### Phase 6: Ecosystem Integration

Build only after the relevant lane is functional and approved.

Possible integrations:

- Pawket Packs and Packets can introduce care planning.
- Pawket Picks can offer approved educational inserts or reward boosts.
- Pawket Pals can earn safe badges for learning or kindness milestones.
- HeartPoints can support impact progress without becoming guaranteed money.
- HeartCodes can record provenance without exposing private assistance data.
- Heroic Quests can guide planning steps without implying support eligibility.
- Pawket Haven can visualize care planning as a warm family-preparedness area.

Acceptance criteria:

- Emotional rewards do not imply financial entitlement.
- Private hardship never becomes gameplay spectacle.
- Charm remains protected and is never used as a sample case or public reward.

## Future Data Domains

These are planning domains, not approved schema names.

Care Credit ledger:

- Account id.
- Ledger event id.
- Source event id.
- Earned amount.
- Redeemed amount.
- Available amount.
- Terms version.
- Expiration state.
- Reversal/refund link.
- Fraud/review state.
- Admin notes.

CHARM assistance:

- Request id.
- Applicant type.
- Animal/pet context.
- Assistance category.
- Urgency level.
- Requested support type.
- Eligibility checklist.
- Documentation state.
- Review status.
- Decision/outcome.
- Fund/source campaign.
- Disbursement path.
- Privacy flags.
- Separate story consent id, if any.

Insurance referral:

- Partner id.
- Jurisdiction availability.
- Disclosure version.
- Outbound link id.
- Referral timestamp.
- Consent/acknowledgment state, if required.
- Affiliate/tracking state, if approved.

## Account UI Requirements

When account care-support cards are eventually built:

- Pawket Care Credit should show earned rewards value and program terms.
- CHARM Emergency Assistance should show charitable aid education or request state.
- Licensed Insurance Partners should show external referral education.
- The three cards should not share one progress meter.
- The three cards should not share one status badge.
- The three cards should not use a single "protection" heading.
- Each card should explain what is active now.

Safe account labels:

- Available Pawket Care Credit.
- CHARM Emergency Assistance.
- Licensed Insurance Partners.
- Pet Care Planning.
- Program terms.
- Request status.
- Visit partner.

Unsafe account labels:

- Coverage.
- Claims.
- Policy.
- Protection plan.
- Covered amount.
- Reimbursement.
- Guaranteed help.

## CHARM Assistance Intake Requirements

Before intake exists:

- Define who can apply.
- Define what urgent animal-care or rescue-medicine needs fit the mission.
- Define what documentation may be requested.
- Define how available funds are considered.
- Define how privacy is protected.
- Define how outcomes are explained with care.
- Define whether payments go to providers, applicants, rescues, or partners.

Safe statuses:

- Draft.
- Submitted.
- In review.
- Additional information requested.
- Approved.
- Not approved.
- Closed.
- Referred.

Avoid:

- Claim filed.
- Covered.
- Denied coverage.
- Benefit paid.
- Reimbursement pending.

## Insurance Referral Requirements

Before any partner card exists:

- Confirm partner is licensed.
- Confirm state availability.
- Confirm whether referral compensation exists.
- Confirm required disclosures.
- Confirm approved brand and copy.
- Confirm whether outbound tracking is allowed.
- Confirm that Pet Pawket does not collect or store policy/application details.

Every referral card should include:

- Partner name.
- Licensed partner framing.
- Availability note, if approved.
- External-link cue.
- Insurance referral disclaimer.

## Copy Review Checklist

For every care-support page, card, tooltip, search result, footer link, checkout note, email, insert, or FAQ:

- Does it identify the correct lane?
- Does it avoid promise language?
- Does it avoid insurance words for Care Credit and CHARM?
- Does it include the right disclaimer near the action?
- Does it make clear what is active versus planned?
- Does it avoid fear, guilt, and pressure?
- Does it protect private pet, family, medical, rescue, adoption, and memorial context?
- Does it preserve Charm as protected origin content?

## QA Checklist

Before any care-support UI ships:

- Desktop and mobile layout keep the three lanes visibly separate.
- Pawket Dock does not overlap care-support actions.
- Search results label care-support pages as informational unless workflows are active.
- Account signed-out and signed-in states do not show fake values.
- Footer and nav links do not overstate active status.
- Browser console errors are zero.
- Existing tests pass.
- CSS lint passes.
- `git diff --check` passes.

## Immediate Next Actions

1. Review this plan with legal/compliance before building interactive care-support behavior.
2. Draft Pawket Care Credit terms and decide whether veterinary/provider redemption is in scope.
3. Draft CHARM Emergency Assistance guidelines, including applicant types, support categories, review states, privacy rules, and fund rules.
4. Identify potential licensed insurance partners and collect their approved disclosure language.
5. Keep current Pet Care Planning discovery held until review approves visible public language.
6. Only after those decisions, start account dashboard design for the three separate lanes.
