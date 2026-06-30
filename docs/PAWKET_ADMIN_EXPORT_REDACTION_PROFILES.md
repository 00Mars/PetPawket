# Pawket Admin Export Redaction Profiles

Status: export policy model and metadata validation scaffold. No export ZIP, PDF, accountant pack, IRS pack, or public report generation is implemented.

Export redaction profiles decide whether document metadata and future blobs may be included for a particular purpose.

## Profile Fields

- `allowed_privacy_classes`
- `excluded_privacy_classes`
- `required_redaction_states`
- `allowed_document_types`
- `excluded_document_types`
- `aggregate_only_fields`
- `document_metadata_allowed`
- `blob_access_allowed`
- `requires_approval_role`
- `export_risk_flags`

## Profiles

### `owner_full_internal`

Owner archive profile. May include sensitive metadata and future blobs only under Owner Root authority and production encryption policy.

### `accountant_pack`

Controlled accounting support profile. May include financial-sensitive metadata and future controlled blob access. Must not casually include donor, assistance, story, family/minor, or medical-adjacent context.

### `irs_support_pack`

Controlled tax support profile. Should include only tax-relevant financial evidence and exclude unrelated private story, donor, assistance, and family/minor data.

### `investor_summary`

Aggregate/sanitized profile. Should not include raw customer, donor, assistance, story, medical-adjacent, partner, or legal-confidential records.

### `foundation_board_pack`

Foundation governance profile. May include foundation-sensitive metadata with review, but should aggregate or redact assistance outcomes.

### `donor_acknowledgment_pack`

Donor-purpose profile. Must protect assistance recipients and unrelated story/customer data.

### `public_impact_report`

Public-safe profile. Must not include private donor, customer, assistance, story, family/minor, medical-adjacent, partner, legal, or raw financial-sensitive records. Public impact reports should use aggregate or consent-approved public-safe proof only.

### `connector_debug`

Connector troubleshooting profile. Must never include decrypted/raw document content and should avoid private donor, assistance, story, or customer context.

### `security_audit_pack`

Security review profile. Metadata-oriented by default. Future blob access requires separate approval.

## Current Code Boundary

`validateDocumentAgainstExportProfile()` checks privacy class, redaction state, document type, and requested blob access against a profile. It returns blockers and warnings only. It does not generate an export.

## Report Manifest Boundary

Report manifests must reference a required redaction profile, but the manifest itself is not an export.

Preview manifests may use profiles such as `owner_full_internal`, `accountant_pack`, `irs_support_pack`, `investor_summary`, `foundation_board_pack`, `public_impact_report`, `connector_debug`, or `security_audit_pack` to identify future review requirements. They must not create PDF, CSV, XLSX, ZIP, public report, accountant pack, IRS pack, investor pack, or foundation pack outputs.

## Report Package Gate Boundary

The report package gate must enforce redaction-profile requirements again when an export intent is requested.

Current preview package requirements:

- `internal_management_preview` uses `owner_full_internal`.
- `accountant_pack_preview` uses `accountant_pack`.
- `irs_support_preview` uses `irs_support_pack`.
- `investor_summary_preview` uses `investor_summary`.
- `foundation_pack_preview` uses `foundation_board_pack`.
- `public_impact_preview` uses `public_impact_report`.
- `security_audit_preview` uses `security_audit_pack`.

Passing a redaction-profile check authorizes preview metadata only. It does not create final export files or allow raw document blobs.
