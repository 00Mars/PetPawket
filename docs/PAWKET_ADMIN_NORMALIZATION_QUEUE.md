# Pawket Admin Normalization Queue

Last updated: 2026-05-27

Status: draft-only normalization design. This pass creates draft finance records and review queue records only. It does not write live ledger records.

## Purpose

The normalization queue turns staged source events into draft finance records that a human can review later.

Flow:

`staged source events -> normalized draft finance records -> review queue items -> approval checks -> proposed ledger records -> future final ledger commit`

The final live ledger write is still out of scope. The next boundary can create proposed ledger records only.

## Boundaries

Source events are connector evidence.

Draft finance records are interpretations of source events.

Live ledger truth is the future approved accounting record.

Current code may create draft records and review queue items, but it must not:

- Create journal entries.
- Create official transactions.
- Update balances.
- Update Care Credit liability.
- Update CHARM assistance records.
- Update tax reports.
- Update public impact proof.
- Write live ledger files.
- Write proposed ledger records without a separate approval-boundary check.

## Source-Event-To-Draft Mapping

The first mapping layer supports:

- `order.created`
- `payment.received`
- `refund.issued`
- `subscription.created`
- `subscription.cancelled`
- `pawket_packet.purchased`
- `pawket_pick.selected`
- `donation.created`
- `care_credit.planned`
- `charm_pledge.created`
- `story.submitted`
- `pawket_pal.created`

Draft mappings are intentionally conservative:

- `order.created` can create sales revenue, sales tax payable review, CHARM pledge hint, and Care Credit hint drafts.
- `payment.received` can create a payment reconciliation draft.
- `refund.issued` can create a refund/reversal draft with reward, donation, tax, Care Credit, and inventory reversal warnings.
- `donation.created` can create a donation draft with donor/source evidence requirements.
- `care_credit.planned` can create a Care Credit liability review draft.
- `charm_pledge.created` can create a donation payable draft with restricted fund review.
- `pawket_packet.purchased` can create a Packet revenue/category draft.
- `pawket_pick.selected` can create a reward cost/value draft.
- `story.submitted` can create a non-financial impact/story review draft.
- `pawket_pal.created` can create an asset/IP/Pawket Pal value review draft.

## Review Statuses

Draft records start as:

- `unreviewed`

Review queue items may use:

- `unreviewed`
- `needs_mapping`
- `needs_documents`
- `ready_for_review`
- `approved_for_ledger_later`
- `rejected`
- `superseded`

`approved_for_ledger_later` is not a ledger write. It only records that a future ledger approval step may continue from the reviewed draft.

## Rejection And Supersession

Rejected draft interpretations must preserve source evidence.

Corrections should create new draft records or new review decisions. They should not silently edit source events, staged events, or audit events.

Supersession should preserve:

- Original staged event id.
- Original draft record ids.
- Review item ids.
- Decision reason.
- Actor.
- Audit event id.

## Document Requirements

Document requirements by draft type:

- Sales or revenue: `order_source_evidence`
- Payment: `payment_source_evidence`
- Refund: `refund_source_evidence`
- Donation: `donor_source_evidence`
- CHARM pledge: `pledge_rule_source_evidence`
- Care Credit: `care_credit_rule_source_evidence`
- Expense, future only: `receipt_or_invoice`
- Pawket Pal: `story_asset_heartcode_source_reference`
- Story submission: `consent_privacy_review_reference`

Missing required documents should keep the review item in `needs_documents`.

## Mapping Confidence

Each draft record carries a `confidence_score`.

Low confidence means the draft needs human mapping before it can move toward future ledger approval. Confidence is not accounting approval, legal approval, tax approval, privacy approval, or proof that the source event is correct.

## Human Approval Boundary

Human review may mark a review item as:

- `needs_mapping`
- `needs_documents`
- `ready_for_review`
- `approved_for_ledger_later`
- `rejected`
- `superseded`

None of these statuses write the live ledger in this pass.

Future ledger approval must be a separate action with its own role permissions, audit event, period checks, document checks, and accounting rules.

## Proposed Ledger Handoff

`approved_for_ledger_later` review items may be passed to the ledger approval boundary, but only as approval intent.

Before any proposed ledger record is created, the next layer must confirm:

- Required role is present.
- Required documents are complete or explicitly deferred with risk flags.
- Draft records are not rejected or superseded.
- Entity, fund, class, account, and calculation-rule mappings exist where required.
- The effective period is open.
- High-risk flags are resolved or explicitly accepted.

Passing those checks creates proposed ledger records only. It does not post journals, update balances, recognize tax filings, update Care Credit liability, or create CHARM payable truth.

## Why Live Ledger Writes Are Out Of Scope

Live ledger writes require:

- Production encrypted storage design.
- Accounting chart and entity/fund/class rules.
- Period close policy.
- Source document validation.
- Calculation rule approval.
- Tax review.
- Charity/restricted-fund review.
- Care Credit liability review.
- Privacy and consent review.
- Role permission model.
- Audit and correction policy.

Those decisions are not complete yet, so this pass stops at draft-only normalization and review queue evidence.
