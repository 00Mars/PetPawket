# Pet Pawket Care Support Prelaunch Review Queue

Last updated: 2026-05-09

Status: internal review queue. Not legal advice. Not public terms. Not launch approval. Not implementation approval.

This queue turns the care-support backlog and ticket template into the first concrete review tickets. These tickets are meant to move Pet Pawket from broad planning into controlled review. They do not authorize schemas, APIs, ledgers, intake forms, account modules, checkout behavior, partner cards, referral tracking, or ecosystem hooks.

## Required Source Documents

Read these first:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`

Use these when relevant:

- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`

## Queue Rules

Every ticket in this queue starts with:

- Decision-log status: `pending_review`.
- Implementation permission: none.
- Public behavior: informational only.
- Data behavior: no new collection, storage, schema, API, support-tool, analytics, or test-fixture behavior.
- Copy behavior: no new public copy unless a reviewer explicitly approves a revised draft.

Every ticket must preserve:

- Pawket Care Credit as rewards value only.
- CHARM Emergency Assistance as charitable aid only.
- Licensed Insurance Partners as external licensed-provider paths only.
- Charm as protected origin/memorial content, never a sample case, applicant, placeholder, fixture, public reward, or generic story.
- Real pet, rescue, adoption, medical, hardship, assistance, insurance, and memorial data as private unless a separate approved consent path exists.
- Packet preparation, send status, and return status must be recorded in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`.
- Packet, wave, owner, send, return, and decision-gate status should be checked in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before choosing the next review action.
- Owner nomination, roster confirmation, dispatch, send, return intake, and decision-log transfer should follow `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`.
- Returned reviewer answers must pass through `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` before any worksheet, tracker, or decision-log status change treats them as complete.

## Recommended Order

1. CS-00: Public Pet Care Planning visibility review.
2. CS-01: Full legal and compliance packet intake.
3. CS-02: Support and ops copy review.
4. CS-03: Pawket Care Credit terms review.
5. CS-04: CHARM Emergency Assistance guidelines review.
6. CS-05: Licensed Insurance Partner requirements review.
7. CS-06: Data, privacy, and consent boundary review.
8. CS-07: Account empty-state planning authorization.

CS-00 can happen before the full packet is complete because it only decides whether existing informational links should remain visible. CS-01 through CS-06 should happen before any implementation planning. CS-07 is planning-only and should not become a build ticket until the relevant lane decisions are recorded.

## CS-00: Public Pet Care Planning Visibility Review

Lane:

- Shared.
- Public copy.

Ticket type:

- Review.
- Copy.

Target files:

- `public/pet-care-planning.html`
- `public/navbar.html`
- `public/navbar.js`
- `public/footer.html`
- `public/account.html`
- `public/charm.html`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Ticket 0: Public Visibility Decision.

Related review packets:

- Primary: RP-01.
- Supporting: RP-00.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS00_PUBLIC_VISIBILITY.md`

Related decision-log section:

- Public Pet Care Planning Visibility.

Goal:

- Decide whether the current dormant Pet Care Planning preview can move from held discovery to visible, footer/support-only, revised visible, or hidden until public education language is approved.

In scope:

- Review current held public labels, links, page copy, CHARM handoffs, account handoff, navbar discovery, footer discovery, Explore discovery, and search metadata.
- Record whether any informational visibility is acceptable before full program launch.
- Identify exact revised copy if needed.

Out of scope:

- New page behavior.
- Care Credit balance, earn, redeem, ledger, or checkout logic.
- CHARM assistance request or intake behavior.
- Insurance partner cards, quotes, applications, or outbound referrals.
- New tracking.

Implementation permission:

- None unless the decision log approves a revised public-copy-only ticket.

Required output:

- A visibility decision in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
- Required copy edits, if any.
- Updated `docs/PET_PAWKET_CURRENT_STATE.md` if the public posture changes.
- Updated `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md` if public links, labels, CTAs, disclaimers, or page roles change.

## CS-01: Full Legal And Compliance Packet Intake

Lane:

- Shared.

Ticket type:

- Review.

Target files:

- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Ticket 1: Legal Review Decision Recording.

Related review packets:

- Primary: RP-02.
- Supporting: RP-00, RP-03, RP-04, RP-05, RP-06, RP-07, and RP-08 as needed.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS01_LEGAL_COMPLIANCE.md`

Related decision-log sections:

- Public Pet Care Planning Visibility.
- Pawket Care Credit.
- Pawket Care Credit ledger.
- CHARM Emergency Assistance.
- CHARM assistance intake and ops queue.
- Licensed Insurance Partners.
- Support And Ops FAQ.
- Account Care-Support Modules.
- Checkout And Commerce Hooks.
- Ecosystem Integration.

Goal:

- Turn the review packet into lane-by-lane decisions without treating missing answers as approval.

In scope:

- Collect legal, compliance, charity, tax/accounting, privacy, payments, insurance, partner, support, and engineering review notes.
- Identify each lane as `approved_for_revised_draft`, `approved_for_implementation_planning`, `approved_for_build`, `held`, or `rejected`.
- Record blockers and required changes.

Out of scope:

- Implementation.
- Technical design that assumes a lane is approved.
- Public copy changes unless separately scoped through CS-00 or a revised-copy ticket.

Implementation permission:

- None.

Required output:

- Completed review worksheet sections.
- Updated decision log with explicit lane statuses.
- Updated current-state summary.
- List of exact follow-up tickets that are permitted, if any.

## CS-02: Support And Ops Copy Review

Lane:

- Support/ops.
- Shared.

Ticket type:

- Review.
- Copy.

Target files:

- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Ticket 2: Support And Ops Copy Approval.

Related review packets:

- Primary: RP-07.
- Supporting: RP-00 and RP-02 if legal/compliance copy is in scope.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS02_SUPPORT_OPS.md`

Related decision-log section:

- Support And Ops FAQ.

Goal:

- Approve or revise internal support language for the current not-active care-support state and future launched-state guardrails.

In scope:

- Current customer questions about Pawket Care Credit, CHARM Emergency Assistance, insurance partners, donations, purchases, Pawket Pals, HeartCodes, and Pet Care Planning.
- Escalation triggers.
- "Support may say" and "Support must not say" boundaries.

Out of scope:

- Public help center publication.
- Email automation.
- Chat automation.
- Account support workflows.
- Any promise of active programs.

Implementation permission:

- None unless the decision log approves support-copy use for a named internal or public surface.

Required output:

- Approved, revised, held, or rejected status for the FAQ.
- Required support escalation changes.
- Any approved public FAQ language moved into `docs/PET_PAWKET_COMPLIANCE_COPY.md`.

## CS-03: Pawket Care Credit Terms Review

Lane:

- Pawket Care Credit.

Ticket type:

- Review.
- Planning.

Target files:

- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Ticket 4: Care Credit Terms Approval.

Related review packets:

- Primary: RP-03.
- Supporting: RP-02 and RP-08 if technical planning is requested.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS03_CARE_CREDIT.md`

Related decision-log sections:

- Pawket Care Credit.
- Pawket Care Credit ledger.
- Checkout And Commerce Hooks.
- Account Care-Support Modules.

Goal:

- Decide whether Pawket Care Credit can move from draft language into approved program terms or implementation planning.

In scope:

- Earn events.
- Value calculation.
- Pending, available, reversed, expired, and redeemed states.
- Refund, return, and chargeback handling.
- Terms versioning.
- Account-bound value rules.
- Launch redemption categories.
- Whether provider or veterinary redemption is deferred or allowed later.

Out of scope:

- Ledger implementation.
- Balance display.
- Checkout hooks.
- Redemption flows.
- Provider payments.
- Care Credit as insurance, guaranteed payment, or emergency support.

Implementation permission:

- None unless the decision log approves a separate technical-planning ticket.

Required output:

- Terms status.
- Required legal, tax/accounting, consumer-protection, privacy, payments, and support changes.
- Whether the next allowed ticket is revised drafting, ledger design, or no further work.

## CS-04: CHARM Emergency Assistance Guidelines Review

Lane:

- CHARM Emergency Assistance.

Ticket type:

- Review.
- Planning.

Target files:

- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Ticket 7: CHARM Assistance Guidelines Approval.

Related review packets:

- Primary: RP-04.
- Supporting: RP-02 and RP-06.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS04_CHARM_ASSISTANCE.md`

Related decision-log sections:

- CHARM Emergency Assistance.
- CHARM assistance intake and ops queue.

Goal:

- Decide whether CHARM Emergency Assistance can move from draft guidelines into approved program guidelines or implementation planning.

In scope:

- Applicant types.
- Support categories.
- Documentation rules.
- Review roles.
- Status wording.
- Outcome copy.
- Disbursement/support method.
- Privacy and separate story-consent requirements.
- Public impact reporting boundaries.

Out of scope:

- Intake form.
- Request database.
- Ops queue.
- Upload path.
- Disbursement workflow.
- Public story automation.
- Any suggestion that assistance is guaranteed.

Implementation permission:

- None unless the decision log approves a separate technical-planning ticket.

Required output:

- Guidelines status.
- Required legal, charity, tax/accounting, privacy, payments, ops, and CHARM leadership changes.
- Whether the next allowed ticket is revised drafting, intake design, or no further work.

## CS-05: Licensed Insurance Partner Requirements Review

Lane:

- Licensed Insurance Partners.

Ticket type:

- Review.
- Planning.

Target files:

- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Ticket 10: Insurance Partner Requirements Approval.

Related review packets:

- Primary: RP-05.
- Supporting: RP-02 and RP-07.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS05_INSURANCE_PARTNERS.md`

Related decision-log section:

- Licensed Insurance Partners.

Goal:

- Decide whether Pet Pawket can show external licensed insurance partner education or referral paths and what limits must apply.

In scope:

- Partner eligibility.
- Licensing proof.
- Referral or affiliate compensation rules.
- State availability rules.
- Disclosure language.
- Outbound tracking limits.
- Support routing.
- Partner card copy requirements.

Out of scope:

- Partner card implementation.
- Outbound referral links.
- Quote, application, comparison, policy, or claim handling.
- Policy data storage.
- Pet Pawket acting as insurer, seller, broker, administrator, or policy advisor.

Implementation permission:

- None unless the decision log approves a separate partner planning or build ticket.

Required output:

- Partner-requirements status.
- Required legal, insurance, affiliate/referral, privacy, partner, and support changes.
- Whether the next allowed ticket is revised drafting, partner sourcing, partner card planning, or no further work.

## CS-06: Data, Privacy, And Consent Boundary Review

Lane:

- Shared.
- Analytics.
- Pawket Pals/HeartCodes/quests.

Ticket type:

- Review.
- Planning.

Target files:

- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Cross-cutting gate for Tickets 5, 8, 11, 12, and 13.

Related review packets:

- Primary: RP-06.
- Supporting: RP-08.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS06_DATA_PRIVACY_CONSENT.md`

Related decision-log sections:

- Pawket Care Credit ledger.
- CHARM assistance intake and ops queue.
- Licensed Insurance Partners.
- Account Care-Support Modules.
- Checkout And Commerce Hooks.
- Ecosystem Integration.

Goal:

- Confirm the separation model for future care-support data before any schema, API, account payload, checkout hook, support tool, analytics event, Pawket Pal connection, HeartCode connection, or test fixture is designed.

In scope:

- Data domains.
- Public fields.
- Internal-only fields.
- Forbidden cross-lane fields.
- Consent types.
- Role visibility.
- Revocation/hold behavior.
- CHERISH/youth-adjacent boundaries.
- HeartCode and Pawket Pal privacy rules.

Out of scope:

- Schema design.
- API design.
- Test fixture creation.
- Analytics event implementation.
- Public story use.

Implementation permission:

- None unless the decision log approves a separate technical-planning ticket.

Required output:

- Approved, revised, held, or rejected status for data and consent boundaries.
- List of domains allowed for technical planning.
- List of domains held from technical planning.
- Specific required privacy-policy or consent-language updates.

## CS-07: Account Empty-State Planning Authorization

Lane:

- Account UI.
- Shared UI.

Ticket type:

- Design.
- Planning.

Target files:

- `public/account.html`
- `public/account.js`
- `public/css/account.css`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`

Related backlog ticket:

- Ticket 3: Account Empty-State UI Design.

Related review packets:

- Primary: RP-08.
- Supporting: RP-01 and RP-06.

Assembled packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS07_ACCOUNT_EMPTY_STATE.md`

Related decision-log section:

- Account Care-Support Modules.

Goal:

- Decide whether the account dashboard may move from the current informational handoff into a reviewed design spec for three separate empty-state modules.

In scope:

- Empty-state copy only.
- Separate module requirements for Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners.
- Desktop and mobile layout expectations.
- Which public labels are allowed if the lanes are not active.

Out of scope:

- Account implementation.
- Active balances.
- Assistance request status.
- Partner cards.
- Eligibility.
- Combined care-protection status.
- Pawket Pal reward copy that implies assistance, rewards value, or insurance eligibility.

Implementation permission:

- Technical planning only if the decision log approves it. No build permission from this queue.

Required output:

- Approved or held status for design planning.
- If approved, exact scope for a later design-spec ticket.
- Updated public-surface inventory if account page role changes.

## Queue Exit Criteria

This queue is complete enough to open implementation-planning work only when:

- CS-00 through CS-06 have recorded statuses in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
- Any held or rejected lane is clearly blocked from build.
- Any approved lane has exact allowed scope.
- The decision log names the next ticket and the allowed permission level.
- `docs/PET_PAWKET_CURRENT_STATE.md` reflects the latest approved posture.
- No ticket treats review notes, draft terms, or this queue as implementation approval.
