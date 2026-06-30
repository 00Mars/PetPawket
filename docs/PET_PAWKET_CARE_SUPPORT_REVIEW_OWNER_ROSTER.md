# Pet Pawket Care Support Review Owner Roster

Last updated: 2026-05-09

Status: internal owner roster worksheet. Not legal advice. Not public terms. Not launch approval. Not implementation approval.

Use this roster before moving any CS-00 through CS-07 care-support review packet from `assembled_owner_needed` to `ready_to_send`. It records real reviewer owners, reviewer groups, backup coverage, and assignment readiness without inventing names or changing dispatch status by itself.

## Current Posture

- CS-00 through CS-07 packet documents are assembled.
- No packet has a named reviewer owner.
- No packet has a send date.
- No packet has been returned.
- No lane, public visibility change, support copy, account module, checkout hook, data model, schema, API, ledger, CHARM intake, insurance referral, or ecosystem integration is approved.
- This roster does not assign anyone by itself. A packet owner is assigned only when the actual name, role/group, packet, question IDs, source files, and intended send date are also recorded in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`.

## Required Source Documents

Read these first:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Use the relevant packet document:

- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS00_PUBLIC_VISIBILITY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS01_LEGAL_COMPLIANCE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS02_SUPPORT_OPS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS03_CARE_CREDIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS04_CHARM_ASSISTANCE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS05_INSURANCE_PARTNERS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS06_DATA_PRIVACY_CONSENT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS07_ACCOUNT_EMPTY_STATE.md`

## Owner Status Values

Use only:

- `unassigned`: no named owner.
- `candidate_identified`: possible owner named, not confirmed.
- `owner_confirmed`: owner has agreed to review.
- `backup_confirmed`: backup reviewer exists.
- `ready_for_dispatch_update`: owner, group, files, questions, and intended send date are complete enough to update the dispatch log.
- `blocked`: owner cannot be assigned until a named blocker is resolved.

## Role Coverage Needed

Use this table to collect real people or teams. Leave fields blank until known.

| Review role | Primary owner | Backup owner | Coverage status | Notes |
| --- | --- | --- | --- | --- |
| Product decision owner | To be assigned | To be assigned | `unassigned` | Needed for CS-00, CS-01, CS-02, CS-03, CS-05, CS-06, and CS-07. |
| Brand/copy owner | To be assigned | To be assigned | `unassigned` | Needed for public visibility, disclaimers, support copy, labels, and CTA review. |
| Legal/compliance owner | To be assigned | To be assigned | `unassigned` | Needed before any public posture, Care Credit, CHARM, insurance, account, checkout, or ecosystem decision changes. |
| Tax/accounting owner | To be assigned | To be assigned | `unassigned` | Needed for Care Credit, rewards value, reversals, expiration, refunds, CHARM funds, and payment/disbursement questions. |
| Payments owner | To be assigned | To be assigned | `unassigned` | Needed for refunds, chargebacks, ledger timing, direct payment, provider payment, and disbursement handling. |
| Privacy/security owner | To be assigned | To be assigned | `unassigned` | Needed for assistance data, insurance referral data, story consent, role visibility, analytics, and public payloads. |
| CHARM leadership owner | To be assigned | To be assigned | `unassigned` | Needed for mission fit, assistance categories, CHARM posture, story dignity, and public impact boundaries. |
| Charity compliance owner | To be assigned | To be assigned | `unassigned` | Needed for CHARM entity, fundraising, restricted funds, registration, eligibility, and disbursement rules. |
| Insurance/legal owner | To be assigned | To be assigned | `unassigned` | Needed for licensed partner boundaries, state availability, disclosures, referral compensation, and support routing. |
| Partner/business development owner | To be assigned | To be assigned | `unassigned` | Needed for partner qualification, documentation, partner card direction, and outbound referral posture. |
| Support/ops owner | To be assigned | To be assigned | `unassigned` | Needed for internal support language, escalation paths, must-not-say rules, and future ops readiness. |
| Engineering owner | To be assigned | To be assigned | `unassigned` | Needed only for planning/design review until the decision log grants build permission. |
| Design owner | To be assigned | To be assigned | `unassigned` | Needed for account empty-state planning and public information architecture if approved for design planning. |
| Pawket Pals/story owner | To be assigned | To be assigned | `unassigned` | Needed if HeartCodes, Pawket Pals, HeartPoints, quests, Packs, Packets, Picks, Pawket Haven, or story adaptation enter scope. |

## Wave 1 Owner Intake

Use this section first. Do not fill these fields with guesses, placeholders, or desired future owners. A row can move out of `unassigned` only when the named person or team has actually accepted the review role.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md` to collect real owner names and confirmation details before updating this roster.

### CS-00 Public Visibility Owner Intake

Purpose:

- Decide whether current informational Pet Care Planning visibility stays as-is, changes copy, moves to footer/support-only discovery, or hides until review is complete.

Required owner coverage:

- Product decision owner.
- Brand/copy reviewer.
- Legal/compliance reviewer.

Owner intake fields:

| Field | Required value |
| --- | --- |
| Product decision owner | To be assigned |
| Brand/copy reviewer | To be assigned |
| Legal/compliance reviewer | To be assigned |
| Backup reviewer or escalation path | To be assigned |
| Owner confirmation status | `unassigned` |
| Intended send date | To be assigned |
| Expected return window | To be assigned |
| Dispatch entry to update | `DISPATCH-2026-05-08-RP-01-public-visibility` |

Minimum decision needed:

- Public visibility decision.
- Required copy or disclaimer changes, if any.
- Explicit implementation permission value. Current default is none.

### CS-01 Legal And Compliance Owner Intake

Purpose:

- Establish baseline legal/compliance posture for the full care-support model before lane-specific planning is treated as available.

Required owner coverage:

- Legal/compliance decision owner.
- Product decision owner.
- Privacy/security reviewer.
- Tax/accounting reviewer.
- Payments reviewer.
- CHARM or charity reviewer.
- Insurance/legal or partner reviewer.
- Support/ops reviewer.
- Engineering reviewer only if technical planning scope is discussed.

Owner intake fields:

| Field | Required value |
| --- | --- |
| Legal/compliance decision owner | To be assigned |
| Product decision owner | To be assigned |
| Privacy/security reviewer | To be assigned |
| Tax/accounting reviewer | To be assigned |
| Payments reviewer | To be assigned |
| CHARM or charity reviewer | To be assigned |
| Insurance/legal or partner reviewer | To be assigned |
| Support/ops reviewer | To be assigned |
| Engineering reviewer, if needed | To be assigned |
| Backup reviewer or escalation path | To be assigned |
| Owner confirmation status | `unassigned` |
| Intended send date | To be assigned |
| Expected return window | To be assigned |
| Dispatch entry to update | `DISPATCH-2026-05-08-RP-02-legal-compliance-intake` |

Minimum decision needed:

- Three-lane separation decision.
- Public visibility posture.
- Lane status for Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners.
- Explicit implementation permission value for each lane. Current default is none.

## Packet Assignment Worksheet

Do not move a packet to `ready_to_send` until every required field is filled with real information and the dispatch log is updated.

| Queue item | Required owner groups | Primary owner | Backup owner | Owner status | Send kit note prepared | Dispatch status |
| --- | --- | --- | --- | --- | --- | --- |
| CS-00 Public visibility | Product, brand/copy, legal/compliance | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |
| CS-01 Legal/compliance intake | Legal/compliance plus cross-functional reviewers | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |
| CS-02 Support/ops copy | Support/ops, product, legal/compliance | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |
| CS-03 Care Credit terms | Tax/accounting, payments, legal/compliance, product | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |
| CS-04 CHARM assistance | CHARM leadership, charity compliance, ops, privacy/security, legal/compliance | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |
| CS-05 Insurance partners | Insurance/legal, partner lead, privacy/security, support, product | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |
| CS-06 Data/privacy/consent | Privacy/security, engineering, product, legal/compliance | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |
| CS-07 Account empty-state | Product, design, engineering, legal/compliance | To be assigned | To be assigned | `unassigned` | No | `assembled_owner_needed` |

## Assignment Readiness Checklist

Before updating dispatch status to `ready_to_send`, confirm:

1. Primary reviewer owner is real and confirmed.
2. Backup reviewer owner is named or intentionally not needed.
3. Reviewer role or group is named.
4. Queue item is named.
5. Packet document is named.
6. Primary packet ID is named.
7. Supporting packet IDs are named.
8. Question IDs requested are named.
9. Source files are confirmed.
10. Intended send date is recorded.
11. Expected return date or review window is recorded.
12. Send kit note is prepared.
13. Dispatch entry is updated.
14. No requested answer implies launch or implementation approval by default.
15. Three-lane separation is stated.
16. Charm protection is stated.

If any required item is missing, leave the packet at `assembled_owner_needed`.

## Conflict And Boundary Notes

Use these checks before assigning an owner:

- Legal/compliance review should not be replaced by product preference.
- Insurance partner review should include insurance/legal boundaries before any partner or affiliate direction is treated as available.
- CHARM assistance review should include CHARM leadership and charity compliance before assistance categories, applicants, or funding paths are treated as available.
- Privacy/security review should be included before any assistance, insurance referral, story, Pal, HeartCode, analytics, or public impact data boundary moves to planning.
- Engineering may review feasibility, but engineering cannot convert review notes into build permission.
- Support may review language, but support copy cannot create program eligibility, assistance routing, or insurance advice.
- Product may set desired experience, but product notes cannot override legal, privacy, charity, accounting, payments, or insurance holds.

## Owner Record Template

Copy this into the dispatch log when an owner is confirmed.

Assignment date:

- To be completed.

Assigned reviewer owner:

- To be completed.

Backup reviewer owner:

- To be completed or marked intentionally not needed.

Reviewer role or group:

- To be completed.

Queue item:

- CS-00.
- CS-01.
- CS-02.
- CS-03.
- CS-04.
- CS-05.
- CS-06.
- CS-07.

Packet document:

- To be completed.

Primary packet ID:

- To be completed.

Supporting packet IDs:

- To be completed.

Question IDs requested:

- To be completed.

Source files confirmed:

- To be completed.

Intended send date:

- To be completed.

Expected return date or review window:

- To be completed.

Send kit note prepared:

- No.
- Yes.

Dispatch status:

- `ready_to_send`

Assignment notes:

- To be completed.

## Next Assignment Priority

When real owners are available, assign in this order:

1. CS-00 public visibility, because it controls whether held public links stay held, become visible, move to limited discovery, or hide completely.
2. CS-01 legal/compliance intake, because it controls baseline posture for all lanes.
3. CS-06 data/privacy/consent, if any data, story, account, Pal, HeartCode, analytics, or support tooling scope is being discussed early.
4. CS-02 through CS-05 as lane-specific reviews.
5. CS-07 account empty-state planning only after public visibility, data/privacy, and relevant lane boundaries are understood.

## Final Guardrail

This roster organizes owner assignment only. It does not approve reviewers' answers, public copy changes, technical planning, launch, implementation, or any care-support lane. The decision log remains the only approval-state source of truth.
