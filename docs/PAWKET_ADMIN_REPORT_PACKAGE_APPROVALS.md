# Pawket Admin Report Package Approvals

Last updated: 2026-05-29

Status: preview-package approval policy. Production export approval is not implemented.

## Approval Requirements By Report Type

### `internal_management_preview`

- Owner Root or Finance Admin.
- Evidence warnings allowed only with clear non-production labels.
- Final export disabled.

### `accountant_pack_preview`

- Owner Root or Finance Admin.
- Controlled sensitive financial metadata may be referenced.
- No raw documents in this phase.
- Final export disabled.

### `irs_support_preview`

- Owner Root only in the current policy.
- Future policy may require Owner Root plus Accountant role.
- Strict evidence warnings.
- Final export disabled.

### `investor_summary_preview`

- Owner Root or Finance Admin.
- Aggregate or sanitized values only.
- No private donor, customer, assistance, story, medical-adjacent, minor/family, partner-confidential, or legal-confidential data.
- Final export disabled.

### `foundation_pack_preview`

- Owner Root or Foundation Admin for foundation-scoped records.
- Donor and assistance privacy warnings must remain visible.
- Foundation Admin approval is limited to foundation scope.
- Final export disabled.

### `public_impact_preview`

- Owner Root only.
- Public-safe or redacted-only.
- No private donor, customer, assistance, story, medical-adjacent, minor/family, or raw document data.
- Aggregate-only by default.
- Final export disabled.

### `security_audit_preview`

- Owner Root.
- Security metadata only unless a future controlled export policy is approved.
- Final export disabled.

## Approval Result

The approval helper returns:

- `approved_for_preview_package`
- `blockers`
- `warnings`
- `final_export_status`
- `production_status`
- `approval_status`
- `required_role`

Approval can authorize only preview-package metadata. It cannot create production export files.

## Current Code Boundary

`validateReportPackageApproval()` checks role policy, report type, redaction profile, privacy/risk warnings, foundation scope, and the final-export-disabled rule.

## Review Queue Relationship

Package approval can create preview package metadata. The report review queue can later record review decisions against that preview package.

Review decisions do not generate final export files. They preserve reviewer context and blockers for a future production export review.
