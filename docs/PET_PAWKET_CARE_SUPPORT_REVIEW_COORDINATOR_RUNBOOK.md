# Pet Pawket Care Support Review Coordinator Runbook

Last updated: 2026-05-09

Status: internal coordinator runbook. Not legal advice. Not public terms. Not launch approval. Not implementation approval.

Use this runbook when coordinating the care-support review process from assembled packet docs through owner nomination, dispatch, return intake, and decision-log updates. It is a process map only. It does not override the dashboard, owner roster, dispatch log, return intake workbook, tracker, or decision log.

## Current Starting Point

- CS-00 through CS-07 packet documents are assembled.
- CS-00 and CS-01 are the first Wave 1 packets.
- No reviewer owner is confirmed.
- No packet is `ready_to_send`.
- No packet is sent.
- No packet has returned.
- All decision-log areas remain `pending_review`.
- No care-support lane, public visibility change, support copy, account module, checkout hook, data model, schema, API, ledger, CHARM intake, insurance referral, or ecosystem integration is approved.

## Source Of Truth By Job

Use this runbook to choose the next action. Use the source document below to record state.

| Job | Source of truth |
| --- | --- |
| Current status snapshot | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` |
| Packet IDs, file manifests, question IDs | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` |
| Owner nomination | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md` |
| Confirmed owner roster | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` |
| Assignment order and status rules | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md` |
| Reviewer-facing send notes | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` |
| Packet send and return status | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` |
| Returned answer completeness | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` |
| Reviewer notes before final decisions | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md` |
| Row-level review status | `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` |
| Decision-log entry shape | `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` |
| Approval state | `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` |

If files conflict, the decision log controls approval state and the dispatch log controls packet send/return state.

## Wave 1 Process

### 1. Confirm Current Status

Read:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Confirm:

- CS-00 and CS-01 are still `assembled_owner_needed`.
- Owner status is still `unassigned`.
- Return status is still `not_returned`.
- Decision status is still `pending_review`.

Stop if a packet is already `sent`, `returned_ready_for_intake`, or `recorded_in_decision_log`; use the return-intake or decision-log path instead.

### 2. Nominate Real Owners

Use:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md`

Collect for CS-00:

- Product decision owner.
- Brand/copy reviewer.
- Legal/compliance reviewer.
- Backup reviewer or escalation path.
- Intended send date.
- Expected return window.

Collect for CS-01:

- Legal/compliance decision owner.
- Product decision owner.
- Privacy/security reviewer.
- Tax/accounting reviewer.
- Payments reviewer.
- CHARM or charity reviewer.
- Insurance/legal or partner reviewer.
- Support/ops reviewer.
- Engineering reviewer, if technical planning scope is discussed.
- Backup reviewer or escalation path.
- Intended send date.
- Expected return window.

Do not write placeholder names. If an owner is not confirmed, leave the field as `To be assigned`.

### 3. Update Confirmed Owner Roster

Use:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`

Update only fields that are real and confirmed.

Allowed owner status changes:

- `unassigned` to `candidate_identified`, if a possible reviewer is named but not confirmed.
- `candidate_identified` to `owner_confirmed`, if the reviewer accepts the role.
- `owner_confirmed` to `ready_for_dispatch_update`, only when owner, group, files, question IDs, intended send date, and return window are ready for dispatch-log update.

Do not move a packet to `ready_to_send` from the roster alone.

### 4. Prepare Dispatch Entry

Use:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`

For CS-00, update:

- `DISPATCH-2026-05-08-RP-01-public-visibility`

For CS-01, update:

- `DISPATCH-2026-05-08-RP-02-legal-compliance-intake`

Required before `ready_to_send`:

- Reviewer group.
- Reviewer owner.
- Prepared by.
- Prepared date.
- Source files sent or referenced.
- Question IDs requested.
- Related review-tracker rows.
- Related decision-log sections.
- Intended send date or send window.
- Expected return date or review window.

Do not mark `sent` until the actual send date is real.

### 5. Prepare Reviewer-Facing Send Note

Use:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`

Use the packet-specific note for:

- CS-00 Public Visibility Review.
- CS-01 Legal And Compliance Intake.

Confirm the message includes:

- The three separate lanes.
- Required response format.
- Required question IDs.
- Source files.
- Statement that blank, verbal, vague, or partial answers do not authorize implementation.
- Statement that final approval state belongs only in the decision log.

### 6. Send Packet

Use:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`

After the packet is actually sent:

- Record sent date.
- Move dispatch status from `ready_to_send` to `sent`.
- Keep return result as `Not returned`.
- Update `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` if the status snapshot changes.

### 7. Process Returned Answers

Use:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`

Do not update the decision log first. The response must pass intake completeness checks.

If incomplete:

- Mark `returned_incomplete` or `returned_needs_clarification`.
- Name the missing fields.
- Keep decision status as `pending_review`.

If complete:

- Mark `returned_ready_for_decision_record`.
- Transfer notes into the worksheet if needed.
- Use the decision-record template before updating the decision log.

### 8. Record Decisions

Use:

- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Only the decision log can change approval state.

Every decision must include:

- Reviewer or decision owner.
- Review date.
- Packet ID.
- Files reviewed.
- Decision status.
- Implementation permission.
- Required changes.
- Public-surface impact.
- Data-boundary impact.
- Privacy/consent impact.
- Support/ops impact.
- Follow-up owner.

### 9. Update Current State

Use:

- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`

Update these only when posture changes, packets move state, returned answers are recorded, or decision-log status changes.

## Do Not Do

- Do not assign imaginary reviewers.
- Do not move a packet to `ready_to_send` without confirmed owner and dispatch details.
- Do not mark a packet `sent` without the actual send date.
- Do not treat verbal, partial, blank, or vague feedback as approval.
- Do not update the decision log before return intake.
- Do not open implementation work from packet docs alone.
- Do not blend Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners.
- Do not use Charm as a sample case, applicant, placeholder, fixture, public reward, or generic story.

## Fast Resume Checklist

When resuming this process:

1. Read the dashboard.
2. Check whether CS-00 or CS-01 has real owners in the nomination form or owner roster.
3. If no owners are real, send or reuse the owner nomination request.
4. If owners are confirmed, update the roster.
5. If roster and dispatch details are complete, update dispatch to `ready_to_send`.
6. If a send date exists, update dispatch to `sent`.
7. If a response exists, run return intake before touching the decision log.
8. If the decision log changes, update current state and dashboard.

## Final Guardrail

This runbook coordinates the workflow only. It does not grant review authority, public visibility approval, technical planning approval, launch approval, or build permission.
