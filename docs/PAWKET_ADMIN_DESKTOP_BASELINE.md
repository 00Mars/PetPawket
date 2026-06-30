# Pawket Admin Desktop Baseline

Last updated: 2026-05-29

Status: technical baseline and scaffold. A production-disabled desktop operator shell read model exists for future UI consumption, but no packaged desktop application shell, real vault, live connector, live finance database, or UI is built in this pass.

## Purpose

Pawket Admin is the future local-first encrypted desktop application for the Pet Pawket Finance And Living Documentation System.

It is the only authority for full Pet Pawket finance truth. The public website can be a source of read-only events, but it must never own, edit, export, or decrypt the finance truth.

The baseline preserves the existing repo posture:

- No finance code or data under `public/`.
- No new desktop framework.
- No new dependencies.
- No live finance routes.
- No real cryptography or key storage implementation yet.
- No customer-facing finance, Care Credit, CHARM assistance, insurance, tax, or investor behavior.

## Authority Model

Pawket Admin owns:

- Encrypted local finance vault.
- Source document vault.
- Append-only audit log.
- Finance source-event inbox.
- Import review and quarantine state.
- Calculation rule registry.
- Period close state.
- Report run records.
- Controlled export manifests.
- Living documentation memory.
- Read-only pipeline status view models for future operator awareness.

The website owns only its existing public/customer operational surfaces. A future website connector node may provide authenticated, encrypted, read-only source-event bundles to Pawket Admin.

The connector node is not allowed to:

- Write to the vault.
- Edit finance records.
- Request report exports.
- Read decrypted documents.
- Act as a generic admin.
- Use customer auth as finance admin auth.
- Serve static finance JSON.

## Trust Kernel Components

The first security/trust kernel is defined by these documents:

- `docs/PAWKET_ADMIN_SECURITY_MODEL.md`
- `docs/PAWKET_ADMIN_ENCRYPTED_VAULT.md`
- `docs/PAWKET_ADMIN_AUDIT_LOG.md`
- `docs/PAWKET_ADMIN_EXPORT_PERMISSION_MODEL.md`
- `docs/PAWKET_ADMIN_CONNECTOR_CONTRACT.md`
- `docs/PAWKET_ADMIN_THREAT_MODEL.md`
- `docs/PAWKET_ADMIN_LOCAL_VAULT_SKELETON.md`
- `docs/PAWKET_ADMIN_DESKTOP_OPERATOR_SHELL.md`
- `docs/PAWKET_ADMIN_PIPELINE_STATUS_VIEW_MODEL.md`
- `docs/PAWKET_ADMIN_OPERATOR_DASHBOARD_READ_MODEL.md`
- `docs/PAWKET_ADMIN_PIPELINE_HEALTH_AND_BLOCKERS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_GUARDRAILS.md`

Local example fixtures live under:

- `data/finance/security/audit-events.example.json`
- `data/finance/security/export-profiles.example.json`
- `data/finance/security/connector-bundle.example.json`
- `data/finance/security/permissions.example.json`
- `data/finance/security/vault-skeleton.example.json`
- `data/finance/security/desktop-operator-shell.example.json`
- `data/finance/security/pipeline-status-view-model.example.json`
- `data/finance/security/operator-dashboard-read-model.example.json`
- `data/finance/security/pipeline-health-and-blockers.example.json`
- `data/finance/security/desktop-shell-guardrails.example.json`

Lightweight validation helpers live outside `public/`:

- `utils/pawketAdminSecurity.js`
- `tests/pawketAdminSecurity.test.js`
- `utils/pawketAdminVault.js`
- `tests/pawketAdminVault.test.js`
- `utils/pawketAdminDesktopOperatorShell.js`
- `tests/pawketAdminDesktopOperatorShell.test.js`

## Minimum Desktop App Build Order

When a desktop implementation is explicitly approved, build in this order:

1. Define Pawket Admin account and role assignment records.
2. Add vault unlock flow with auto-lock state.
3. Create encrypted local vault storage.
4. Add append-only audit event writer.
5. Add source document registry and encrypted document storage.
6. Add connector bundle import inbox in quarantine-only mode.
7. Add staged source-event intake.
8. Add draft-only normalization and review queue.
9. Add export profile registry with manifest and audit events.
10. Add period close and correction model.
11. Add management reporting from reviewed local records.

Do not start with a visual dashboard. The first operator-facing slice should remain a read-only local view model until trust boundaries, auditability, local encryption, and import quarantine are ready for desktop packaging.

## Current Scaffold

This pass defines structure and validation only:

- Security docs.
- Example fixture JSON.
- Hash-chain validation helper.
- Connector bundle shape validation helper.
- Idempotency duplicate detection helper.
- Export profile allowlist validation helper.
- Local vault skeleton helper.
- Import state-machine helper.
- Staged source-event helper.
- Draft finance record normalization helper.
- Review queue helper.
- Live-ledger write guardrail helper.
- Desktop operator shell read-model helper.

This pass does not provide production security. All cryptographic requirements remain design requirements pending security review.

## Non-Negotiables

- Pawket Admin must be separate from generic website admin.
- Owner Root must be distinct from Finance Admin.
- Connector Node must be read-only.
- Public website must not contain finance data.
- Raw secrets must never be committed to the repo.
- Corrections must be new events, not silent edits.
- Every export must have an audit event and manifest.
- Every connector import must be idempotent and quarantined until reviewed.
