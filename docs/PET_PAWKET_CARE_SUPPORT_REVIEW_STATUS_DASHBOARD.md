# Pet Pawket Care Support Review Status Dashboard

Last updated: 2026-05-09

Status: internal review status dashboard. Not legal advice. Not public terms. Not launch approval. Not implementation approval.

Use this dashboard to see the care-support review state without scanning every packet, roster, dispatch entry, tracker row, and decision-log section. It is a snapshot and routing aid only. It does not approve public copy, reviewer answers, launch, planning, build work, or any care-support lane.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` for the step-by-step process after checking this dashboard.

## Current Snapshot

- CS-00 through CS-07 packet documents are assembled.
- No packet has a confirmed reviewer owner.
- No packet has a backup reviewer owner.
- No packet has a send date.
- No packet has been returned.
- No return-intake record has been created.
- Public visibility is held as `dormant_direct_preview`; no active site discovery is approved.
- The only build-scoped care-support approval is the dormant, non-imported scaffold recorded in `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` and `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
- No care-support lane, support copy, account module, checkout hook, data model, schema, API, ledger, CHARM intake, insurance referral, public discovery, or ecosystem integration is approved.

## Source Of Truth Chain

Use these in order:

1. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
2. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md`
3. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md`
4. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`
5. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
6. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
7. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
8. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
9. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`
10. `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
11. `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

If these files conflict, the decision log controls approval state and the dispatch log controls packet send/return state.

## Packet Status Overview

| Queue item | Packet doc | Primary packet | Owner status | Send status | Return status | Decision status | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CS-00 Public visibility | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS00_PUBLIC_VISIBILITY.md` | RP-01 | `unassigned` | `assembled_owner_needed` | `not_returned` | `held` | Assign product, brand/copy, and legal/compliance owners before changing the held discovery posture. |
| CS-01 Legal/compliance intake | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS01_LEGAL_COMPLIANCE.md` | RP-02 | `unassigned` | `assembled_owner_needed` | `not_returned` | `pending_review` | Assign legal/compliance owner and confirm cross-functional reviewer coverage. |
| CS-02 Support/ops copy | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS02_SUPPORT_OPS.md` | RP-07 | `unassigned` | `assembled_owner_needed` | `not_returned` | `pending_review` | Assign support/ops, product, and legal/compliance owners after Wave 1 owners are known. |
| CS-03 Care Credit terms | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS03_CARE_CREDIT.md` | RP-03 | `unassigned` | `assembled_owner_needed` | `not_returned` | `pending_review` | Assign tax/accounting, payments, legal/compliance, and product owners after CS-01 ownership is known. |
| CS-04 CHARM assistance | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS04_CHARM_ASSISTANCE.md` | RP-04 | `unassigned` | `assembled_owner_needed` | `not_returned` | `pending_review` | Assign CHARM leadership, charity compliance, ops, privacy/security, and legal/compliance owners after CS-01 ownership is known. |
| CS-05 Insurance partners | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS05_INSURANCE_PARTNERS.md` | RP-05 | `unassigned` | `assembled_owner_needed` | `not_returned` | `pending_review` | Assign insurance/legal, partner, privacy/security, support, and product owners after CS-01 ownership is known. |
| CS-06 Data/privacy/consent | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS06_DATA_PRIVACY_CONSENT.md` | RP-06 | `unassigned` | `assembled_owner_needed` | `not_returned` | `pending_review` | Assign privacy/security, engineering, product, and legal/compliance owners when lane scope is ready. |
| CS-07 Account empty-state | `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS07_ACCOUNT_EMPTY_STATE.md` | RP-08 | `unassigned` | `assembled_owner_needed` | `not_returned` | `pending_review` | Assign product, design, engineering, and legal/compliance owners after CS-00, CS-06, and relevant lane boundaries are understood. |

## Wave Status

| Wave | Queue items | Current status | Blocking issue | Next action |
| --- | --- | --- | --- | --- |
| Wave 1 | CS-00, CS-01 | Ready for owner assignment only | No reviewer owners assigned | Fill owner roster with real owners and backups. |
| Wave 2 | CS-02, CS-03, CS-04, CS-05 | Waiting for Wave 1 owner context | CS-01 legal/compliance owner not assigned | Assign after CS-01 reviewer coverage is known. |
| Wave 3 | CS-06, CS-07 | Waiting for lane and privacy context | Lane owners and data/privacy owners not assigned | Assign once Wave 1 and relevant lane scope are clear. |

## Role Coverage Summary

| Role area | Status | Notes |
| --- | --- | --- |
| Product | `unassigned` | Needed first for CS-00 and CS-01 coordination. |
| Brand/copy | `unassigned` | Needed for public visibility, labels, CTAs, disclaimers, and support copy. |
| Legal/compliance | `unassigned` | Required before any approval posture changes. |
| Tax/accounting | `unassigned` | Needed for Care Credit, rewards value, refunds, reversals, CHARM funds, and disbursement questions. |
| Payments | `unassigned` | Needed for chargebacks, refunds, ledger timing, direct payment, and disbursement handling. |
| Privacy/security | `unassigned` | Needed for assistance, insurance referral, story, Pal, HeartCode, analytics, and public payload boundaries. |
| CHARM leadership | `unassigned` | Needed for CHARM mission fit, assistance categories, story dignity, and public impact boundaries. |
| Charity compliance | `unassigned` | Needed for fundraising, restricted funds, registration, eligibility, and disbursement rules. |
| Insurance/legal | `unassigned` | Needed for licensed partner boundaries, state availability, disclosures, and referral compensation. |
| Partner/business development | `unassigned` | Needed for partner qualification and partner-card posture. |
| Support/ops | `unassigned` | Needed for internal support language, escalation paths, and must-not-say rules. |
| Engineering | `unassigned` | Planning review only until the decision log grants build permission. |
| Design | `unassigned` | Needed for account empty-state planning if design planning is approved. |
| Pawket Pals/story | `unassigned` | Needed only if Pal, HeartCode, HeartPoint, quest, Pack, Packet, Pick, Pawket Haven, or story adaptation scope enters review. |

## Decision Gate Summary

| Decision area | Current status | Implementation allowed | Notes |
| --- | --- | --- | --- |
| Public Pet Care Planning visibility | `held` | Direct preview only | Active site discovery is held; nav/footer/search/account/CHARM/Explore links should stay removed. |
| Dormant care-support scaffold | `approved_for_build` | Docs/static non-imported registry only | `public/careSupportFuture.js` may exist while all feature flags remain disabled and no active runtime imports it. |
| Pawket Care Credit terms | `pending_review` | No | No ledger, account display, earn, redemption, or checkout behavior is approved. |
| Pawket Care Credit ledger | `pending_review` | No | Requires legal/accounting/payments/privacy/data approval. |
| CHARM Emergency Assistance guidelines | `pending_review` | No | No intake, request status, upload path, review queue, or disbursement workflow is approved. |
| CHARM assistance intake and ops queue | `pending_review` | No | Requires CHARM, charity, privacy, ops, and disbursement approval. |
| Licensed Insurance Partner requirements | `pending_review` | No | No partner cards, referral links, tracking, quote paths, applications, or comparison tools are approved. |
| Support and ops FAQ | `pending_review` | No public use | Internal draft only. |
| Account care-support modules | `pending_review` | No | No active account care-support handoff, balance, request status, or referral card is approved. |
| Checkout care-support copy or hooks | `pending_review` | No | No earn, redemption, checkout copy, or checkout behavior is approved. |
| Pawket Pals/Points/HeartCodes/Quests integration | `pending_review` | No | Future only; no value, eligibility, assistance, or insurance status promises. |

## Next Action Checklist

1. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` to follow the workflow in order.
2. Fill `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md` with real owner nominations for CS-00 and CS-01.
3. Fill `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` only after owners are confirmed.
4. Confirm owner status becomes `owner_confirmed` before dispatch changes.
5. Prepare CS-00 and CS-01 send notes from `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`.
6. Update `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` only when owner, group, files, question IDs, intended send date, and expected return window are real.
7. Keep all other packets at `assembled_owner_needed` until their owners are real.
8. When responses return, use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` before changing tracker or decision-log status.

## Do Not Do Yet

- Do not mark any packet `ready_to_send` without real owner data.
- Do not mark any packet `sent` without an actual send date.
- Do not record returned answers without return-intake completeness checks.
- Do not move review tracker rows beyond `pending_review` without decision-log evidence.
- Do not build or wire schemas, APIs, ledgers, assistance intake, referral tracking, account modules, checkout behavior, support workflows, analytics, Pawket Pal hooks, HeartCode hooks, or public program behavior.
- Do not use Charm as a sample case, applicant, placeholder, fixture, public reward, or generic story.

## Final Guardrail

This dashboard summarizes review status only. It is not an approval source. The decision log remains the only approval-state source of truth, and the dispatch log remains the packet send/return source of truth.
