# Pawket Admin Evidence Deferrals

Status: first deferral model and plaintext test scaffold.

An evidence deferral is explicit permission to proceed while a required document is missing. It does not erase the original evidence requirement.

## Fields

- `deferral_id`
- `target_type`
- `target_id`
- `missing_requirement`
- `reason`
- `approved_by`
- `approver_role`
- `approved_at`
- `expires_at`
- `review_due_at`
- `risk_flags`
- `replacement_document_expected`
- `audit_event_id`
- `status`

## Rules

- Deferrals must be explicit.
- Deferrals must be audited.
- Deferrals must name the target record and missing requirement.
- Deferrals must include a clear reason.
- Deferrals should have an expiration or review date.
- Deferrals must not remove the original requirement from manifests or future reporting.
- High-risk deferrals may still block final commit unless an allowed role and policy override exists.
- Deferrals should be reviewed before final reporting, accountant packs, foundation packs, investor packs, or public impact reports.

## Statuses

- `approved`
- `pending_review`
- `revoked`
- `expired`

## Current Code Boundary

`createEvidenceDeferral()` and `writeEvidenceDeferral()` create metadata and append audit events. They do not post ledger entries, modify source documents, or remove evidence requirements.

Commit-gate evidence integration must keep approved deferrals visible as warnings. A deferral can permit a workflow to continue only when policy allows it; it does not make missing evidence disappear.
