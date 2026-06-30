# Pawket Admin Document Coverage Rules

Last updated: 2026-05-27

Status: document coverage planning model plus first metadata coverage scaffold. The current code can validate declared requirements and evaluate metadata-only source document coverage. It does not upload, decrypt, OCR, export, or encrypt document blobs.

## Purpose

Every number should trace back to source evidence.

Document coverage rules define what evidence must exist before a draft can move toward proposed ledger records and, later, final ledger truth. The evidence coverage layer maps these declared requirements to supported source document metadata types.

## Sales And Revenue

Required:

- Source order event.

Preferred or future policy-dependent:

- Payment event before final recognition.
- Tax calculation source.
- Product/SKU source.

## Payment

Required:

- Payment processor source evidence.

## Refund

Required:

- Refund source event.

Preferred:

- Original order reference.

Required warning:

- Reward, donation, Care Credit, tax, and inventory reversal review.

## Donation

Required:

- Donor/source evidence.

Review:

- Donor acknowledgment where applicable.
- Restricted fund mapping if donation is restricted.

## CHARM Pledge

Required:

- Pledge rule source.
- Source order or campaign.

Tracked separately:

- Transfer status.
- Restricted/unrestricted fund treatment.

## Care Credit

Required:

- Calculation rule source.
- Customer/account reference.
- Liability review flag.

Care Credit remains rewards value, not insurance.

## Pawket Pal

Required:

- HeartCode, story, or asset source reference.

Review:

- IP/rights review where applicable.
- Privacy and consent review where story material is involved.

## Expense

Future phase required:

- Receipt or invoice.

This pass does not implement expense intake.

## Current Skeleton Behavior

`utils/pawketAdminLedgerApproval.js` validates document coverage using declared document types such as:

- `order_source_evidence`
- `payment_source_evidence`
- `refund_source_evidence`
- `donor_source_evidence`
- `pledge_rule_source_evidence`
- `care_credit_rule_source_evidence`
- `story_asset_heartcode_source_reference`
- `consent_privacy_review_reference`

The helper does not upload, decrypt, redact, or export documents.

`utils/pawketAdminEvidence.js` maps those requirements into metadata document types such as:

- `order_source`
- `payment_processor_record`
- `refund_record`
- `donor_record`
- `donor_acknowledgment`
- `calculation_rule_record`
- `care_credit_rule_record`
- `pawket_pal_story_consent`
- `pawket_pal_asset_record`
- `receipt`
- `invoice`

Coverage can be `not_required`, `missing`, `partial`, `complete`, `deferred_approved`, `rejected`, `privacy_blocked`, or `redaction_required`.

Approved deferrals can satisfy the current metadata coverage check, but they must remain visible in evidence manifests and do not remove the original document requirement.
