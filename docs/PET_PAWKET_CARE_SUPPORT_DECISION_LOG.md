# Pet Pawket Care Support Decision Log

Last updated: 2026-05-09

Status: internal decision log. Not legal advice. Not public terms. Not launch approval.

This document records review decisions for Pawket Care Credit, CHARM Emergency Assistance, Licensed Insurance Partners, Pet Care Planning visibility, support copy, account UI, and future implementation tickets.

Current default:

- All lanes are pending review.
- No lane is approved for implementation.
- Current public discovery is held; the direct Pet Care Planning preview and dormant scaffold remain informational and inactive.
- Do not build schemas, APIs, ledgers, intake forms, account modules, checkout logic, partner cards, referral tracking, or ecosystem hooks from planning docs alone.

## How To Use This Log

Update this document only when there is a real product, legal, compliance, ops, privacy, payments, charity, insurance, partner, or engineering decision.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md` to collect review notes and blockers before changing this log. The worksheet does not grant approval by itself.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md` to orient reviewers to current posture, required outputs, and forbidden uses before recording decisions.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting review status, choosing the next review action, assigning owners, sending packets, or interpreting review progress.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before transferring returned reviewer answers into this log.

Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` when transferring review outcomes into this log.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` to confirm reviewer ownership, row status, and build-blocking dependencies before changing implementation permission.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` to connect returned reviewer answers to question IDs, tracker rows, and decision-log destinations.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` to confirm reviewer packets were scoped before interpreting returned answers.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` to confirm packet IDs, files, question IDs, tracker rows, and decision-log destinations.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` to confirm real reviewer ownership was recorded before treating a review as assigned.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` to confirm packet-specific reviewer-facing send notes were prepared before treating a review packet as properly sent.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` to confirm the packet was sent, returned, and ready for intake before changing a decision status.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` to confirm returned reviewer answers are complete, packet-specific, and mapped to tracker rows and decision-log sections before changing a decision status.

Use `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md` to sequence the first review tickets. The queue does not grant approval by itself.

Use `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` before touching the direct preview page or dormant care-support feature registry.

Each decision entry must include:

- Decision date.
- Reviewer or decision owner.
- Related review packet ID.
- Decision status.
- Files reviewed.
- Required changes.
- Public-surface impact, if any.
- Data-boundary impact, if any.
- Privacy and consent impact, if any.
- Ticket-template impact, if any.
- Implementation permission, if any.
- Follow-up owner.

Blank entries mean no approval.

## Decision Status Values

Use these statuses exactly:

- `pending_review`: not reviewed or no decision recorded.
- `approved_for_revised_draft`: reviewers approved continued drafting only.
- `approved_for_implementation_planning`: reviewers approved technical design planning, but not build.
- `approved_for_build`: reviewers approved implementation for the scoped ticket.
- `held`: blocked until required changes, entity work, partner work, privacy work, or other review is complete.
- `rejected`: do not pursue in current form.

## Current Gate Summary

| Area | Current status | Implementation allowed | Notes |
| --- | --- | --- | --- |
| Public Pet Care Planning visibility | held | Direct preview only | Public discovery is held pending review; active nav/footer/search/account/CHARM/Explore links should stay removed. |
| Dormant care-support scaffold | approved_for_build | Docs/static non-imported registry only | `public/careSupportFuture.js` may exist while every feature flag remains disabled and no active runtime imports it. |
| Pawket Care Credit terms | pending_review | No | Draft exists, but no ledger/account/checkout work is approved. |
| Pawket Care Credit ledger | pending_review | No | Requires terms, legal/accounting, and data design approval. |
| CHARM Emergency Assistance guidelines | pending_review | No | Draft exists, but no intake/review/status work is approved. |
| CHARM assistance intake and ops queue | pending_review | No | Requires guidelines, privacy, ops, and disbursement approval. |
| Licensed Insurance Partner requirements | pending_review | No | Draft exists, but no partner cards/referrals/tracking are approved. |
| Support and ops FAQ | pending_review | No public use | Internal draft only. |
| Account care-support modules | pending_review | No | No active account care-support handoff, balance, request status, or referral card is approved. |
| Checkout care-support copy or hooks | pending_review | No | No earn, redemption, or checkout behavior is approved. |
| Pawket Pals/Points/HeartCodes/Quests integration | pending_review | No | Future only; no eligibility or value promises. |

## Public Pet Care Planning Visibility

Current state:

- `public/pet-care-planning.html` exists as a direct dormant review preview.
- Navigation, footer, search, Explore, CHARM, and account should not link to it while visibility is held.
- `public/careSupportFuture.js` exists as a dormant, non-imported future registry with all feature flags disabled.
- No active Care Credit, CHARM assistance intake, or insurance referral behavior exists.

Decision record:

- Status: `held`
- Reviewer: Product direction; compliance reviewer still pending
- Date: 2026-05-09
- Files reviewed: `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md`, `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`, `public/pet-care-planning.html`, `public/careSupportFuture.js`, `public/navbar.html`, `public/navbar.js`, `public/footer.html`, `public/subnav.html`, `public/account.html`, `public/charm.html`
- Required changes: Keep public discovery removed until review approves visible public language.
- Visibility decision: `dormant_direct_preview`
- Implementation allowed: direct preview and non-imported dormant scaffold only

Allowed outcomes:

- Keep direct dormant preview only.
- Keep visible as-is.
- Keep visible with revised copy.
- Move to footer/support-only discovery.
- Hide until legal review approves public education.

## Pawket Care Credit

Current state:

- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md` exists.
- Pawket Care Credit is not active.
- No balance, earning, ledger, redemption, checkout calculation, or provider redemption exists.

Decision record:

- Status: `pending_review`
- Reviewer:
- Date:
- Files reviewed:
- Required changes:
- Implementation allowed: no

Before implementation can be allowed:

- Legal review complete.
- Tax/accounting review complete.
- Consumer-protection review complete.
- Payments/refund review complete.
- Privacy review complete.
- Earn rules approved.
- Redemption rules approved.
- Reversal/refund rules approved.
- Terms versioning approved.
- Account copy approved.

## CHARM Emergency Assistance

Current state:

- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md` exists.
- CHARM Emergency Assistance intake is not active.
- No request form, review queue, status, documentation upload, disbursement flow, or public impact automation exists.

Decision record:

- Status: `pending_review`
- Reviewer:
- Date:
- Files reviewed:
- Required changes:
- Implementation allowed: no

Before implementation can be allowed:

- Legal review complete.
- Charity compliance review complete.
- Tax/accounting review complete.
- Privacy review complete.
- Payments/disbursement review complete.
- Applicant types approved.
- Support categories approved.
- Documentation rules approved.
- Ops roles approved.
- Outcome copy approved.
- Story consent separation approved.

## Licensed Insurance Partners

Current state:

- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md` exists.
- Licensed insurance partner referrals are not active.
- No partner cards, outbound links, referral tracking, state availability, quote path, application path, or policy data storage exists.

Decision record:

- Status: `pending_review`
- Reviewer:
- Date:
- Files reviewed:
- Required changes:
- Implementation allowed: no

Before implementation can be allowed:

- Insurance licensing review complete.
- Partner review complete.
- Affiliate/referral compensation review complete.
- Privacy review complete.
- State availability rules approved.
- Tracking rules approved.
- Partner card copy approved.
- Support routing approved.

## Support And Ops FAQ

Current state:

- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md` exists as an internal draft.
- It is not approved for public help pages, account surfaces, emails, chat macros, or support automation.

Decision record:

- Status: `pending_review`
- Reviewer:
- Date:
- Files reviewed:
- Required changes:
- Implementation allowed: no public use

Before public or operational use:

- Legal/compliance review complete.
- Support leadership review complete.
- Escalation paths approved.
- "Must not say" language preserved.
- Current not-active answers approved.
- Future launched-state answers approved only when the relevant lane launches.

## Account Care-Support Modules

Current state:

- `/account.html` has no current Pet Care Planning handoff, Care Credit balance, assistance request status, partner card, or care-support workflow.
- Account care-support modules remain future-only until reviewed and approved.

Decision record:

- Status: `pending_review`
- Reviewer:
- Date:
- Files reviewed:
- Required changes:
- Implementation allowed: no

Before implementation can be allowed:

- Public visibility decision recorded.
- Account copy approved.
- Lane-specific active or planned states approved.
- UI keeps the three lanes visually and semantically separate.
- No fake values or statuses.

## Checkout And Commerce Hooks

Current state:

- No Care Credit earn hook exists.
- No Care Credit redemption exists.
- No checkout care-support copy is approved.
- No purchase guarantees CHARM assistance.

Decision record:

- Status: `pending_review`
- Reviewer:
- Date:
- Files reviewed:
- Required changes:
- Implementation allowed: no

Before implementation can be allowed:

- Care Credit terms approved, if earning or redemption is involved.
- Checkout copy approved.
- Refund/reversal rules approved.
- Existing cart/checkout contract reviewed.
- Tests defined.

## Ecosystem Integration

Current state:

- Pawket Pals, Pawket Packs, Pawket Packets, Pawket Picks, Pawket Points, HeartPoints, HeartCodes, Heroic Quests, and Pawket Haven can conceptually connect to care support later.
- No care-support value, eligibility, assistance status, or insurance referral behavior is active in those systems.

Decision record:

- Status: `pending_review`
- Reviewer:
- Date:
- Files reviewed:
- Required changes:
- Implementation allowed: no

Before implementation can be allowed:

- Relevant lane is approved and launched.
- Privacy and consent review complete.
- No private assistance, medical, hardship, insurance, rescue, adoption, or memorial data is exposed.
- Charm's private one-of-one Pal remains protected and never becomes a public reward.

## Decision History

Use this section for dated decisions. New entries go at the top.

### 2026-05-07: Initial Decision Log Created

- Owner: Codex documentation pass.
- Status: `pending_review`
- Summary: Created the decision log and marked all care-support lanes as pending review with no implementation approval.
- Implementation allowed: no
- Files added or referenced:
  - `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
  - `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
  - `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`

## Required Update Pattern

When a decision changes:

1. Update the relevant section status.
2. Add a dated entry to Decision History.
3. Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` to keep status, permission, impacts, and next tickets explicit.
4. Update `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` if row status, owner, blockers, or build dependencies change.
5. Reference the relevant review notes from `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`, if used.
6. Update `docs/PET_PAWKET_CURRENT_STATE.md`.
7. If implementation becomes allowed, update `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md` with the cleared blockers.
8. If public surfaces change, update `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`.
9. If data boundaries change, update `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`.
10. If privacy or consent boundaries change, update `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`.
11. If future ticket shape changes, update `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`.
12. If public copy changes, update `docs/PET_PAWKET_COMPLIANCE_COPY.md`.
13. If stable canon changes, update `docs/PET_PAWKET_CANON.md`.

Do not rely on chat history alone for approval state.
