# Pet Pawket Care Support Review Requests

Last updated: 2026-05-09

Status: internal review request sheet. Not legal advice. Not public terms. Not launch approval. Not implementation approval.

Use this document when asking product, legal, compliance, charity, tax/accounting, payments, privacy, insurance, partner, support, or engineering reviewers for decisions on the Pet Pawket care-support ecosystem. It converts the broader review packet into answerable questions with required response format.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting packet status, choosing the next review action, assigning owners, sending packets, or interpreting review progress.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before coordinating owner nomination, roster updates, dispatch updates, packet send status, return intake, or decision-log transfer.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` to decide which files and question IDs to send to each reviewer group.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` to assemble packet IDs and file lists.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` before recording real reviewer owners or owner readiness.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` when preparing packet-specific send notes.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` to track packet preparation, send status, return status, and decision-log intake.
Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` to confirm returned answers are complete before they are recorded as decisions.

## Required Source Documents

Send or reference these first:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`

Use these by reviewer role:

- Product/brand/copy: `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`, `docs/PET_PAWKET_COMPLIANCE_COPY.md`, `public/pet-care-planning.html`
- Legal/compliance: `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`, `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`, `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- Care Credit/tax/payments: `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`, `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- CHARM/charity/ops: `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`, `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`
- Insurance/partner: `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`, `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- Privacy/security/story: `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`, `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`, `docs/PET_PAWKET_CANON.md`

## Required Answer Format

Every reviewer answer should include:

- Reviewer name or role.
- Review date.
- Packet ID.
- Question IDs answered.
- Source files reviewed.
- Decision status for each question:
  - `pending_review`
  - `approved_for_revised_draft`
  - `approved_for_implementation_planning`
  - `approved_for_build`
  - `held`
  - `rejected`
- Implementation permission:
  - None.
  - Revised drafting only.
  - Technical planning only.
  - Public-copy revision only.
  - Build approved for the exact named scope.
- Required changes.
- Required public disclaimers or copy changes.
- Public-surface impact.
- Data-boundary impact.
- Privacy/consent impact.
- Support/ops impact.
- Follow-up owner.
- Related review-tracker rows.
- Related decision-log sections.

Blank, vague, verbal, or partial answers do not authorize implementation.

## Global Questions

### GQ-01: Three-Lane Separation

Related tracker rows:

- RW-01.

Question:

- Does the current model clearly separate Pawket Care Credit as rewards value, CHARM Emergency Assistance as charitable aid, and Licensed Insurance Partners as external insurance-provider paths?

Required answer:

- Status.
- Required model changes, if any.
- Any language that must be removed or softened.
- Whether the three-lane model can remain visible in public educational copy.

Decision-log destinations:

- Public Pet Care Planning Visibility.
- Pawket Care Credit.
- CHARM Emergency Assistance.
- Licensed Insurance Partners.

### GQ-02: Public Visibility

Related tracker rows:

- RW-00.
- RW-09.

Question:

- Should `public/pet-care-planning.html` remain held as a direct dormant preview, or may Pet Care Planning be reintroduced through navbar, footer, search metadata, `/account.html`, `/charm.html`, or Explore discovery before program launch?

Allowed answers:

- Keep held as direct dormant preview.
- Reintroduce visible discovery as-is.
- Reintroduce visible discovery with revised copy.
- Move to footer/support-only discovery.
- Hide until public education language is approved.

Required answer:

- Visibility decision.
- Required copy changes.
- Public files affected.
- Required disclaimer placement.

Decision-log destination:

- Public Pet Care Planning Visibility.

### GQ-03: Required Disclaimer Set

Related tracker rows:

- RW-00.
- RW-01.
- RW-09.

Question:

- Are the short combined disclaimer and lane-specific disclaimers in `docs/PET_PAWKET_COMPLIANCE_COPY.md` sufficient for current informational surfaces?

Required answer:

- Status.
- Approved disclaimer text or required revisions.
- Required placement rules.
- Whether footer, account, CHARM, or navbar/search copy needs changes.

Decision-log destinations:

- Public Pet Care Planning Visibility.
- Support And Ops FAQ, if support copy changes.

## Pawket Care Credit Questions

### CC-01: Rewards Value Treatment

Related tracker rows:

- RW-02.
- RW-03.

Question:

- Can Pawket Care Credit be structured and described as earned rewards value under the current draft terms without being treated as insurance, consumer credit, stored value, gift card value, or another regulated product that changes the implementation path?

Required answer:

- Status.
- Required legal/compliance changes.
- Required tax/accounting/payment changes.
- Whether public use of the name `Pawket Care Credit` is acceptable before launch.
- Whether the next allowed step is revised drafting, technical planning, or hold.

Decision-log destinations:

- Pawket Care Credit.
- Pawket Care Credit ledger.

### CC-02: Earn, Reversal, And Expiration Rules

Related tracker rows:

- RW-02.
- RW-03.
- RW-13.

Question:

- Which earn events, pending periods, reversal rules, refund/return/chargeback handling, expiration rules, abuse controls, and terms-version rules are acceptable for future planning?

Required answer:

- Approved or held earn events.
- Required reversal and refund rules.
- Expiration or no-expiration direction.
- Terms acceptance requirements.
- Whether checkout/cart planning can begin.

Decision-log destinations:

- Pawket Care Credit.
- Pawket Care Credit ledger.
- Checkout And Commerce Hooks.

### CC-03: Redemption Boundaries

Related tracker rows:

- RW-02.
- RW-03.
- RW-10.
- RW-13.

Question:

- What redemption categories, if any, may move into future planning, and should veterinary, emergency, provider, or partner-service redemption remain held?

Required answer:

- Approved launch redemption categories.
- Held categories.
- Required customer copy.
- Required data boundaries.
- Whether provider-service planning is allowed.

Decision-log destinations:

- Pawket Care Credit.
- Pawket Care Credit ledger.
- Checkout And Commerce Hooks.

## CHARM Emergency Assistance Questions

### CH-01: Charity And Entity Readiness

Related tracker rows:

- RW-04.

Question:

- What entity, charity registration, fundraising disclosure, restricted-fund, finance, tax/accounting, and leadership approvals are required before CHARM Emergency Assistance can move beyond draft guidelines?

Required answer:

- Status.
- Required entity or registration work.
- Required public disclosure changes.
- Approved or held fundraising language.
- Whether guidelines can move to revised draft or implementation planning.

Decision-log destination:

- CHARM Emergency Assistance.

### CH-02: Applicant, Category, And Documentation Rules

Related tracker rows:

- RW-04.
- RW-05.

Question:

- Which applicant types, support categories, documentation requirements, review roles, and outcome/status language are acceptable for future planning?

Required answer:

- Approved applicant types.
- Approved support categories.
- Required documentation rules.
- Review role requirements.
- Approved or blocked status labels.
- Outcome copy requirements.

Decision-log destinations:

- CHARM Emergency Assistance.
- CHARM assistance intake and ops queue.

### CH-03: Privacy, Consent, And Impact Story Separation

Related tracker rows:

- RW-05.
- RW-11.

Question:

- Are assistance records, medical details, hardship details, rescue/adoption details, memorial details, and public impact stories separated clearly enough?

Required answer:

- Required privacy changes.
- Required consent changes.
- Role-visibility rules.
- Whether public impact content can ever come from assistance records and what separate consent is required.
- Whether technical planning for intake privacy can begin.

Decision-log destinations:

- CHARM assistance intake and ops queue.
- Ecosystem Integration, if story/Pawket Pal/HeartCode use is discussed.

## Licensed Insurance Partner Questions

### IP-01: Referral And Licensing Boundary

Related tracker rows:

- RW-06.

Question:

- Can Pet Pawket show optional education or referral paths to licensed insurance providers or agencies without acting as an insurer, seller, broker, underwriter, administrator, comparison authority, policy advisor, or guarantor?

Required answer:

- Status.
- Required licensing boundary language.
- Required partner licensing proof.
- Whether Pet Pawket may receive referral or affiliate compensation.
- Required disclosures.
- Whether public partner-card planning is allowed.

Decision-log destination:

- Licensed Insurance Partners.

### IP-02: State Availability And Partner Cards

Related tracker rows:

- RW-06.
- RW-07.

Question:

- What state availability, partner approval, disclosure, outbound-link, support-routing, and customer acknowledgment rules are required before any partner cards or outbound links exist?

Required answer:

- State availability rules.
- Partner card copy requirements.
- External-link disclosure requirements.
- Support routing rules.
- Whether partner cards remain held.

Decision-log destination:

- Licensed Insurance Partners.

### IP-03: Referral Tracking And Data Limits

Related tracker rows:

- RW-07.
- RW-10.

Question:

- What referral metadata, outbound tracking, account display, privacy, retention, deletion, and support-note limits apply to future insurance partner referrals?

Required answer:

- Approved tracking fields, if any.
- Forbidden fields.
- Retention limits.
- Whether policy, quote, application, claim, premium, deductible, or benefit data must remain out of Pet Pawket systems.
- Whether analytics planning may begin.

Decision-log destination:

- Licensed Insurance Partners.

## Support And Ops Questions

### SO-01: Current Not-Active Support Language

Related tracker rows:

- RW-08.

Question:

- Can support use the current not-active answers in `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md` internally?

Required answer:

- Status.
- Approved internal answers.
- Required revisions.
- Required escalation language.
- Whether any answer may be used publicly.

Decision-log destination:

- Support And Ops FAQ.

### SO-02: Escalation And Must-Not-Say Rules

Related tracker rows:

- RW-08.
- RW-05.
- RW-07.

Question:

- Which customer questions must route to legal/compliance, CHARM leadership, privacy/security, payments, support leadership, or licensed insurance partners?

Required answer:

- Escalation categories.
- Must-not-say language.
- Sensitive-data intake rules.
- Support owner for future FAQ updates.

Decision-log destination:

- Support And Ops FAQ.

## Data, Privacy, Account, Checkout, And Ecosystem Questions

### DP-01: Data Boundary Planning

Related tracker rows:

- RW-10.

Question:

- Which future data domains may move into technical planning, and which must remain held?

Required answer:

- Allowed technical-planning domains.
- Held domains.
- Forbidden cross-lane data.
- Required privacy/security controls.
- Whether any schema or API planning is allowed.

Decision-log destinations:

- Pawket Care Credit ledger.
- CHARM assistance intake and ops queue.
- Licensed Insurance Partners.
- Account Care-Support Modules.

### DP-02: Privacy And Consent Matrix

Related tracker rows:

- RW-11.

Question:

- Are the proposed consent types, role visibility, revocation/hold behavior, story-use boundaries, CHERISH/youth boundaries, Pawket Pal boundaries, and HeartCode boundaries sufficient?

Required answer:

- Required consent changes.
- Required privacy-policy changes.
- Role-visibility decisions.
- Story-use restrictions.
- Pal/HeartCode restrictions.
- Whether any ecosystem planning can begin.

Decision-log destinations:

- CHARM assistance intake and ops queue.
- Ecosystem Integration.

### AC-01: Account Empty-State Planning

Related tracker rows:

- RW-12.

Question:

- Can the account dashboard move from the current single informational handoff to separate empty-state planning for Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners?

Required answer:

- Status.
- Allowed labels.
- Required disclaimers.
- Whether design planning is allowed.
- Whether any implementation remains held.

Decision-log destination:

- Account Care-Support Modules.

### CK-01: Checkout And Commerce Boundary

Related tracker rows:

- RW-13.

Question:

- Can checkout or cart copy mention future care support, Care Credit earning, CHARM impact, or Pet Care Planning without implying active benefits, assistance, insurance, or guaranteed support?

Required answer:

- Status.
- Allowed copy.
- Blocked copy.
- Whether checkout/cart planning is allowed.
- Required tests if future implementation is approved.

Decision-log destination:

- Checkout And Commerce Hooks.

### EC-01: Pawket Pals, HeartCodes, Points, Packs, And Quests

Related tracker rows:

- RW-14.
- RW-11.

Question:

- Can Pawket Pals, HeartCodes, HeartPoints, Pawket Points, Pawket Packs, Pawket Packets, Pawket Picks, Heroic Quests, or Pawket Haven mention care-support education or future benefits without implying value, eligibility, assistance status, insurance status, or public story consent?

Required answer:

- Status.
- Allowed education language.
- Blocked value or eligibility language.
- Privacy and consent requirements.
- Whether ecosystem planning is allowed.
- Confirmation that Charm's private one-of-one Pawket Pal remains protected.

Decision-log destination:

- Ecosystem Integration.

## How To Process Returned Answers

1. Attach or summarize returned answers in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`.
2. Update relevant rows in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`.
3. Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` to create decision-log entries.
4. Update `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
5. Update `docs/PET_PAWKET_CURRENT_STATE.md`.
6. Update public-surface, data-boundary, privacy/consent, compliance-copy, backlog, or ticket-template docs if the decision changes their scope.

## Final Guardrail

Returned answers are review input until recorded in the decision log. Do not treat emails, comments, notes, this request sheet, or the review tracker as implementation approval.
