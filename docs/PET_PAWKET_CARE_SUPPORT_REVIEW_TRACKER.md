# Pet Pawket Care Support Review Tracker

Last updated: 2026-05-09

Status: internal review tracker. Not legal advice. Not public terms. Not launch approval. Not implementation approval.

This tracker keeps the care-support review process operational. It identifies review workstreams, likely reviewers, source documents, expected outputs, and the decision-log sections that must be updated before any implementation status changes.

## Required Source Documents

Read these first:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md`

Use these when relevant:

- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`

## Tracker Rules

- Every row starts as `pending_review`.
- Blank owner, blank date, or blank output means no approval.
- Notes in this tracker do not authorize implementation.
- Final status must be recorded in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
- Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` when moving a row from review output into the decision log.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` when asking reviewers for row-specific answers.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting row status, choosing the next review action, assigning owners, sending packets, or interpreting review progress.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before changing row status based on owner assignment, dispatch state, returned answers, or decision-log transfer.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` when preparing the packet for a reviewer group.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` when assembling exact packet IDs, files, question IDs, and tracker rows.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` when recording real reviewer owners, backup owners, role coverage, or assignment readiness.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` when preparing packet-specific reviewer-facing send notes.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` when recording packet preparation, send status, return status, and decision-log intake.
- Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` before moving a returned reviewer response into tracker completion or decision-log entry.
- Keep Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners separate in every row.
- Confirm Charm protection before any row can move beyond review.

## Status Values

Use only:

- `pending_review`
- `approved_for_revised_draft`
- `approved_for_implementation_planning`
- `approved_for_build`
- `held`
- `rejected`

## Review Workstream Tracker

| ID | Workstream | Likely reviewers | Current status | Source docs | Required output | Decision-log destination |
| --- | --- | --- | --- | --- | --- | --- |
| RW-00 | Public visibility and public copy | Product, legal/compliance, brand/copy | `held` | Reviewer brief, public surface inventory, dormant scaffold, compliance copy, Pet Care Planning preview, held nav/footer/account/CHARM/search/Explore surfaces | Visibility decision, required copy revisions, whether held links may become visible | Public Pet Care Planning Visibility |
| RW-01 | Core three-lane model | Product, legal/compliance, engineering | `pending_review` | Canon, ecosystem doc, launch plan, reviewer brief | Confirm lane separation or required model changes | Public Pet Care Planning Visibility; Pawket Care Credit; CHARM Emergency Assistance; Licensed Insurance Partners |
| RW-02 | Pawket Care Credit legal/compliance | Legal/compliance, consumer protection, product | `pending_review` | Care Credit terms draft, compliance copy, program outlines, ecosystem doc | Decide whether Care Credit terms need revision, planning approval, hold, or rejection | Pawket Care Credit |
| RW-03 | Care Credit tax/accounting/payments | Tax/accounting, payments, finance, legal | `pending_review` | Care Credit terms draft, launch plan, data boundaries | Stored-value, reward, refund, chargeback, expiration, accounting, and payment-control decisions | Pawket Care Credit; Pawket Care Credit ledger; Checkout And Commerce Hooks |
| RW-04 | CHARM entity and charity compliance | Legal, charity compliance, CHARM leadership, finance | `pending_review` | CHARM guidelines draft, program outlines, legal review packet | Entity, registration, fundraising, restricted-fund, applicant, category, and disbursement direction | CHARM Emergency Assistance |
| RW-05 | CHARM privacy and assistance operations | Privacy/security, CHARM ops, support, product | `pending_review` | CHARM guidelines draft, privacy/consent matrix, data boundaries, ops FAQ | Intake privacy, documentation, role visibility, status language, outcome copy, ops readiness | CHARM assistance intake and ops queue |
| RW-06 | Licensed insurance partner boundaries | Insurance/legal, partner lead, compliance | `pending_review` | Insurance partner requirements draft, compliance copy, legal review packet | Licensing proof, state availability, disclosure, referral compensation, and support-routing decisions | Licensed Insurance Partners |
| RW-07 | Insurance privacy and tracking limits | Privacy/security, insurance/legal, analytics, engineering | `pending_review` | Insurance partner requirements draft, data boundaries, privacy/consent matrix | Outbound tracking, referral metadata, policy-data, and account-display restrictions | Licensed Insurance Partners |
| RW-08 | Support and ops language | Support leadership, legal/compliance, product | `pending_review` | Ops FAQ draft, compliance copy, reviewer brief | Approve, revise, hold, or reject internal support language and escalation paths | Support And Ops FAQ |
| RW-09 | Public surface inventory | Product, brand/copy, engineering, legal/compliance | `pending_review` | Public surface inventory, Pet Care Planning page, navbar, footer, account, CHARM | Confirm public surfaces, labels, CTAs, disclaimers, search metadata, and page roles | Public Pet Care Planning Visibility |
| RW-10 | Data-boundary architecture review | Engineering, privacy/security, product, legal/compliance | `pending_review` | Data boundaries, privacy/consent matrix, launch plan | Decide which data domains may move to technical planning and which remain held | Pawket Care Credit ledger; CHARM assistance intake and ops queue; Licensed Insurance Partners; Account Care-Support Modules |
| RW-11 | Privacy and consent review | Privacy/security, legal/compliance, product, CHARM leadership | `pending_review` | Privacy/consent matrix, data boundaries, canon, reviewer brief | Consent types, role visibility, revocation/hold, story use, CHERISH/youth, Pal/HeartCode restrictions | CHARM assistance intake and ops queue; Ecosystem Integration |
| RW-12 | Account empty-state planning | Product, design, engineering, legal/compliance | `pending_review` | Prelaunch queue CS-07, public surface inventory, compliance copy, account handoff | Decide whether separate empty-state account modules can move to design planning | Account Care-Support Modules |
| RW-13 | Checkout and commerce boundary | Commerce/product, engineering, legal/compliance, payments | `pending_review` | Launch plan, Care Credit terms draft, compliance copy, cart/checkout architecture notes | Decide whether checkout copy or future earn/redemption planning is allowed | Checkout And Commerce Hooks |
| RW-14 | Ecosystem integration boundary | Product, Pawket Pals/story, privacy/security, legal/compliance | `pending_review` | Canon, data boundaries, privacy/consent matrix, program outlines | Decide whether any Pal, HeartCode, HeartPoint, quest, Pack, Packet, Pick, or Pawket Haven planning may proceed | Ecosystem Integration |

## Per-Row Review Fields

When a row is actively reviewed, record:

- Row ID.
- Related review packet ID.
- Reviewer or decision owner.
- Review date.
- Files reviewed.
- Notes location.
- Required changes.
- Public-surface impact.
- Data-boundary impact.
- Privacy/consent impact.
- Support/ops impact.
- Implementation permission, if any.
- Follow-up owner.
- Decision-log section updated.
- Decision ID from the decision log.

## Row Completion Requirements

A row is complete only when:

- Reviewer or decision owner is named.
- Files reviewed are listed.
- Status uses an approved status value.
- Required changes are written down, even if none.
- Public-surface impact is explicit.
- Data-boundary impact is explicit.
- Privacy/consent impact is explicit.
- Implementation permission is explicit.
- Three-lane separation is confirmed.
- Charm protection is confirmed.
- Decision-log destination is updated.
- `docs/PET_PAWKET_CURRENT_STATE.md` is updated if the review changes posture.

## Build-Blocking Rows

No build ticket may open until the related rows are complete and the decision log grants the correct permission:

- Care Credit ledger or balance work: RW-02, RW-03, RW-10, and any relevant RW-13 decision.
- CHARM intake or ops queue work: RW-04, RW-05, RW-10, and RW-11.
- Insurance partner card or referral work: RW-06, RW-07, RW-10, and support routing from RW-08.
- Account care-support modules: RW-00, RW-09, RW-10, RW-12, and the relevant lane rows.
- Checkout hooks or commerce copy: RW-02, RW-03, RW-08 if support copy is affected, RW-10, and RW-13.
- Pawket Pals, HeartCodes, HeartPoints, quests, Packs, Packets, Picks, or Pawket Haven care-support integration: RW-10, RW-11, RW-14, and the relevant lane rows.

## Current Launch Posture

Current posture remains:

- Public Pet Care Planning is held as a direct dormant preview only; active site discovery should remain removed.
- CS-00 public visibility is `held` in the decision log, with dormant direct preview only.
- All other rows are `pending_review`.
- No row grants implementation permission.
- No lane is approved for active workflows.
- No public copy should imply active Care Credit balance, assistance intake, insurance referral, or guaranteed support.

## Final Guardrail

This tracker is an operational view, not an approval source. The decision log remains the only approval-state source of truth.
