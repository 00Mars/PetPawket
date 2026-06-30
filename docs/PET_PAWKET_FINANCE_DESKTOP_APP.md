# Pet Pawket Finance Desktop App

Last updated: 2026-05-30

Status: architecture direction. No packaged desktop application has been built in this pass. Current code includes local-only, read-only, non-production stdout and in-memory scaffolds for operator previews, app-shell contract smoke/inspection, panel render contracts, and panel navigation/focus contracts.

## Direction

The Pet Pawket Finance And Living Documentation System should be a standalone admin desktop application, not a public website page.

The finance system will eventually contain sensitive operating records: revenue, expenses, COGS, inventory, subscriptions, donations, Care Credit liabilities, CHARM and future CHERISH fund activity, assistance records, partner/referral metadata, source documents, report exports, investor metrics, accountant/tax evidence, and living value-flow lineage.

Those records should not sit in `public/`, should not be exportable by unauthenticated site visitors, and should not be served by the customer website as static JSON.

## Security Baseline

The desktop app should require:

- Pawket Admin account login.
- Admin-only authorization, not ordinary customer auth.
- Local encrypted storage for cached finance data.
- Encrypted connector nodes for any website, Shopify, CHARM, Pawket Network, Pawket Pals, or future service connection.
- Explicit export permissions.
- Audit logging for viewing, export, import, sync, report generation, close, correction, and rule changes.
- No public static finance seed data.
- No unauthenticated finance endpoints.

## Website Connector Nodes

The website may eventually expose connector nodes, but only as encrypted, authenticated, least-privilege interfaces.

Connector nodes should:

- Authenticate as a finance desktop app client or approved service account.
- Use short-lived tokens.
- Encrypt payloads in transit.
- Avoid exposing raw private finance records through public routes.
- Return only the minimum source events required for the sync.
- Include source record ids, timestamps, hashes, and provenance.
- Keep private pet, story, assistance, medical, hardship, and insurance details out of finance sync unless explicitly approved.

Connector nodes should not:

- Serve static JSON finance data from `public/`.
- Allow browser-only public export.
- Use customer account auth as admin authorization.
- Return Care Credit balances, assistance records, insurance metadata, or private story data before approvals exist.
- Bypass audit events.

## Desktop App Responsibilities

The future desktop app should own:

- Admin authentication session.
- Local encrypted vault.
- Source-document archive.
- Finance source-event inbox.
- Review and approval workflows.
- Calculation rule registry.
- Report runs and exports.
- Accountant/tax package generation.
- Investor report package generation.
- Foundation report package generation.
- Public impact proof package generation.
- Promise ledger and impact proof ledger.
- Value-flow graph exploration.
- Scenario simulator, if approved later.

## Recommended App Shape

Do not add a desktop framework until explicitly scoped.

When approved, evaluate:

- Local-first app with encrypted SQLite.
- Tauri or Electron shell only if the dependency and packaging cost is justified.
- A small backend sync adapter if the website needs to provide source events.
- Admin role checks using existing Pet Pawket auth concepts but separate admin authorization.

The first implementation should not start with a large UI framework. Start with an encrypted local data model, admin login, and one read-only connector.

## Export Controls

Exports should be intentional and traceable:

- JSON manifest exports.
- CSV accountant exports.
- PDF/report packets.
- Source-document bundles.

Each export should record:

- Admin user.
- Time.
- Report run.
- Source document ids.
- Rule versions.
- Export type.
- Destination or purpose.
- Audit hash.

## Current Repo State

The public website finance prototype has been removed. Current finance assets are internal docs, local example data, and plaintext test-only Pawket Admin trust-kernel utilities:

- `docs/PET_PAWKET_FINANCE_SYSTEM.md`
- `docs/PET_PAWKET_FINANCE_SCHEMA.md`
- `docs/PET_PAWKET_FINANCE_CALCULATION_RULES.md`
- `docs/PET_PAWKET_FINANCE_REPORTING.md`
- `docs/PET_PAWKET_FINANCE_LIVING_DOCUMENTATION.md`
- `docs/PET_PAWKET_FINANCE_IMPLEMENTATION_PLAN.md`
- `docs/PET_PAWKET_FINANCE_COMPLIANCE_NOTES.md`
- `docs/PAWKET_ADMIN_DESKTOP_BASELINE.md`
- `docs/PAWKET_ADMIN_SECURITY_MODEL.md`
- `docs/PAWKET_ADMIN_ENCRYPTED_VAULT.md`
- `docs/PAWKET_ADMIN_AUDIT_LOG.md`
- `docs/PAWKET_ADMIN_EXPORT_PERMISSION_MODEL.md`
- `docs/PAWKET_ADMIN_CONNECTOR_CONTRACT.md`
- `docs/PAWKET_ADMIN_THREAT_MODEL.md`
- `docs/PAWKET_ADMIN_LOCAL_VAULT_SKELETON.md`
- `docs/PAWKET_ADMIN_PRODUCTION_STORAGE_DESIGN.md`
- `docs/PAWKET_ADMIN_IMPORT_STATE_MACHINE.md`
- `docs/PAWKET_ADMIN_STAGED_SOURCE_EVENTS.md`
- `docs/PAWKET_ADMIN_NORMALIZATION_QUEUE.md`
- `docs/PAWKET_ADMIN_DRAFT_FINANCE_RECORDS.md`
- `docs/PAWKET_ADMIN_REVIEW_QUEUE.md`
- `docs/PAWKET_ADMIN_LEDGER_APPROVAL_BOUNDARY.md`
- `docs/PAWKET_ADMIN_PROPOSED_LEDGER_RECORDS.md`
- `docs/PAWKET_ADMIN_PROPOSED_JOURNAL_ENTRIES.md`
- `docs/PAWKET_ADMIN_FINAL_COMMIT_GATE.md`
- `docs/PAWKET_ADMIN_LEDGER_COMMIT_MODEL.md`
- `docs/PAWKET_ADMIN_CORRECTION_AND_ADJUSTMENT_MODEL.md`
- `docs/PAWKET_ADMIN_CHART_OF_ACCOUNTS_BASELINE.md`
- `docs/PAWKET_ADMIN_PERIOD_CLOSE_MODEL.md`
- `docs/PAWKET_ADMIN_DOCUMENT_COVERAGE_RULES.md`
- `docs/PAWKET_ADMIN_SOURCE_DOCUMENTS.md`
- `docs/PAWKET_ADMIN_EVIDENCE_COVERAGE_LAYER.md`
- `docs/PAWKET_ADMIN_DOCUMENT_REDACTION_AND_PRIVACY.md`
- `docs/PAWKET_ADMIN_EVIDENCE_DEFERRALS.md`
- `docs/PAWKET_ADMIN_COMMIT_EVIDENCE_MANIFESTS.md`
- `docs/PAWKET_ADMIN_DOCUMENT_VAULT_INTERFACE.md`
- `docs/PAWKET_ADMIN_DOCUMENT_INGESTION_POLICY.md`
- `docs/PAWKET_ADMIN_DOCUMENT_RETENTION_SCHEDULE.md`
- `docs/PAWKET_ADMIN_EXPORT_REDACTION_PROFILES.md`
- `docs/PAWKET_ADMIN_COMMIT_GATE_EVIDENCE_INTEGRATION.md`
- `docs/PAWKET_ADMIN_LIVE_LEDGER_DISABLED_COMMIT_GATE.md`
- `docs/PAWKET_ADMIN_IMMUTABLE_LEDGER_STORE.md`
- `docs/PAWKET_ADMIN_LEDGER_COMMIT_AUTHORIZATION_POLICY.md`
- `docs/PAWKET_ADMIN_LEDGER_PERIOD_ENFORCEMENT.md`
- `docs/PAWKET_ADMIN_LEDGER_BALANCE_AND_INTEGRITY.md`
- `docs/PAWKET_ADMIN_LEDGER_READ_MODEL.md`
- `docs/PAWKET_ADMIN_SIMULATED_BALANCE_MODEL.md`
- `docs/PAWKET_ADMIN_RECONCILIATION_READ_MODEL.md`
- `docs/PAWKET_ADMIN_REPORT_MANIFESTS.md`
- `docs/PAWKET_ADMIN_REPORTING_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_GATE.md`
- `docs/PAWKET_ADMIN_EXPORT_INTENT_RECORDS.md`
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_APPROVALS.md`
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_REPORT_REVIEW_QUEUE.md`
- `docs/PAWKET_ADMIN_REPORT_REVIEW_DECISIONS.md`
- `docs/PAWKET_ADMIN_REPORT_PREVIEW_SUPERSESSION.md`
- `docs/PAWKET_ADMIN_REDACTION_REVIEW_OUTCOMES.md`
- `docs/PAWKET_ADMIN_REPORT_REVIEW_AUDIT_NOTES.md`
- `docs/PAWKET_ADMIN_DESKTOP_OPERATOR_SHELL.md`
- `docs/PAWKET_ADMIN_PIPELINE_STATUS_VIEW_MODEL.md`
- `docs/PAWKET_ADMIN_OPERATOR_DASHBOARD_READ_MODEL.md`
- `docs/PAWKET_ADMIN_PIPELINE_HEALTH_AND_BLOCKERS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_UI_ADAPTER.md`
- `docs/PAWKET_ADMIN_OPERATOR_UI_STATE_MODEL.md`
- `docs/PAWKET_ADMIN_OPERATOR_CLI_PREVIEW.md`
- `docs/PAWKET_ADMIN_DESKTOP_NAVIGATION_MODEL.md`
- `docs/PAWKET_ADMIN_UI_ADAPTER_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_RUNNER.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_INPUTS.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_OUTPUT.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_HARNESS.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_DATA_MODEL.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_SMOKE_TESTING.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_PRIVACY_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_LIMITATIONS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_ARCHITECTURE.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_BOUNDARY.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_PANELS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_DISABLED_ACTIONS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_PACKAGING_BLOCKERS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_COMPOSITION.md`
- `docs/PAWKET_ADMIN_DESKTOP_APP_SHELL_CONTRACT.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_STATE_BINDINGS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SAMPLE_PREVIEW_BINDING.md`
- `docs/PAWKET_ADMIN_DESKTOP_COMPOSITION_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_CONTRACT_SMOKE_RUNNER.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_INPUTS.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_OUTPUT.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_GUARDRAIL_BASELINE.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_OUTPUT.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_CONTRACTS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_INPUTS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_OUTPUT.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_NAVIGATION_CONTRACT.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_FOCUS_MODEL.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_ATTENTION_ROUTING.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_DISABLED_ACTION_SURFACES.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_NAVIGATION_GUARDRAILS.md`
- `data/finance/finance-schema.example.json`
- `data/finance/finance-seed.example.json`
- `data/finance/security/audit-events.example.json`
- `data/finance/security/export-profiles.example.json`
- `data/finance/security/connector-bundle.example.json`
- `data/finance/security/permissions.example.json`
- `data/finance/security/vault-skeleton.example.json`
- `data/finance/security/import-state-machine.example.json`
- `data/finance/security/staged-source-events.example.json`
- `data/finance/security/invalid-connector-bundles.example.json`
- `data/finance/security/normalization-queue.example.json`
- `data/finance/security/draft-finance-records.example.json`
- `data/finance/security/review-queue.example.json`
- `data/finance/security/chart-of-accounts.example.json`
- `data/finance/security/proposed-ledger-records.example.json`
- `data/finance/security/ledger-approval-boundary.example.json`
- `data/finance/security/period-close.example.json`
- `data/finance/security/document-coverage-rules.example.json`
- `data/finance/security/proposed-journal-entries.example.json`
- `data/finance/security/final-commit-gate.example.json`
- `data/finance/security/ledger-commit-model.example.json`
- `data/finance/security/correction-adjustment-model.example.json`
- `data/finance/security/source-documents.example.json`
- `data/finance/security/evidence-coverage.example.json`
- `data/finance/security/document-redaction-privacy.example.json`
- `data/finance/security/evidence-deferrals.example.json`
- `data/finance/security/commit-evidence-manifests.example.json`
- `data/finance/security/document-vault-interface.example.json`
- `data/finance/security/document-ingestion-policy.example.json`
- `data/finance/security/document-retention-schedule.example.json`
- `data/finance/security/export-redaction-profiles.example.json`
- `data/finance/security/commit-gate-evidence-integration.example.json`
- `data/finance/security/live-ledger-disabled-commit-gate.example.json`
- `data/finance/security/immutable-ledger-store.example.json`
- `data/finance/security/ledger-commit-authorization-policy.example.json`
- `data/finance/security/ledger-period-enforcement.example.json`
- `data/finance/security/ledger-balance-integrity.example.json`
- `data/finance/security/ledger-read-model.example.json`
- `data/finance/security/simulated-balance-model.example.json`
- `data/finance/security/reconciliation-read-model.example.json`
- `data/finance/security/report-manifests.example.json`
- `data/finance/security/reporting-guardrails.example.json`
- `data/finance/security/report-package-gate.example.json`
- `data/finance/security/export-intent-records.example.json`
- `data/finance/security/report-package-approvals.example.json`
- `data/finance/security/report-package-guardrails.example.json`
- `data/finance/security/report-review-queue.example.json`
- `data/finance/security/report-review-decisions.example.json`
- `data/finance/security/report-preview-supersession.example.json`
- `data/finance/security/redaction-review-outcomes.example.json`
- `data/finance/security/report-review-audit-notes.example.json`
- `data/finance/security/desktop-operator-shell.example.json`
- `data/finance/security/pipeline-status-view-model.example.json`
- `data/finance/security/operator-dashboard-read-model.example.json`
- `data/finance/security/pipeline-health-and-blockers.example.json`
- `data/finance/security/desktop-shell-guardrails.example.json`
- `data/finance/security/desktop-ui-adapter.example.json`
- `data/finance/security/operator-ui-state-model.example.json`
- `data/finance/security/operator-cli-preview.example.json`
- `data/finance/security/desktop-navigation-model.example.json`
- `data/finance/security/ui-adapter-guardrails.example.json`
- `data/finance/security/operator-preview-runner.example.json`
- `data/finance/security/operator-preview-inputs.example.json`
- `data/finance/security/operator-preview-output.example.json`
- `data/finance/security/operator-preview-failure-modes.example.json`
- `data/finance/security/operator-preview-guardrails.example.json`
- `data/finance/security/sample-vault-harness.example.json`
- `data/finance/security/sample-vault-data-model.example.json`
- `data/finance/security/sample-vault-smoke-testing.example.json`
- `data/finance/security/sample-vault-privacy-guardrails.example.json`
- `data/finance/security/sample-vault-limitations.example.json`
- `data/finance/security/sample-vault/`
- `data/finance/security/desktop-shell-architecture.example.json`
- `data/finance/security/desktop-shell-boundary.example.json`
- `data/finance/security/desktop-shell-panels.example.json`
- `data/finance/security/desktop-shell-disabled-actions.example.json`
- `data/finance/security/desktop-shell-packaging-blockers.example.json`
- `data/finance/security/desktop-shell-composition.example.json`
- `data/finance/security/desktop-app-shell-contract.example.json`
- `data/finance/security/desktop-panel-state-bindings.example.json`
- `data/finance/security/desktop-sample-preview-binding.example.json`
- `data/finance/security/desktop-composition-guardrails.example.json`
- `data/finance/security/desktop-contract-smoke-runner.example.json`
- `data/finance/security/desktop-contract-smoke-inputs.example.json`
- `data/finance/security/desktop-contract-smoke-output.example.json`
- `data/finance/security/desktop-contract-smoke-failure-modes.example.json`
- `data/finance/security/desktop-contract-smoke-guardrails.example.json`
- `data/finance/security/desktop-contract-inspection.example.json`
- `data/finance/security/desktop-contract-guardrail-baseline.example.json`
- `data/finance/security/desktop-contract-inspection-output.example.json`
- `data/finance/security/desktop-contract-inspection-failure-modes.example.json`
- `data/finance/security/desktop-contract-inspection-guardrails.example.json`
- `utils/pawketAdminSecurity.js`
- `tests/pawketAdminSecurity.test.js`
- `utils/pawketAdminVault.js`
- `tests/pawketAdminVault.test.js`
- `utils/pawketAdminImportState.js`
- `tests/pawketAdminImportState.test.js`
- `utils/pawketAdminNormalization.js`
- `tests/pawketAdminNormalization.test.js`
- `utils/pawketAdminLedgerApproval.js`
- `tests/pawketAdminLedgerApproval.test.js`
- `utils/pawketAdminJournalCommitGate.js`
- `tests/pawketAdminJournalCommitGate.test.js`
- `utils/pawketAdminEvidence.js`
- `tests/pawketAdminEvidence.test.js`
- `utils/pawketAdminDocumentVault.js`
- `tests/pawketAdminDocumentVault.test.js`
- `utils/pawketAdminLiveLedgerGate.js`
- `tests/pawketAdminLiveLedgerGate.test.js`
- `utils/pawketAdminReportingReadModel.js`
- `tests/pawketAdminReportingReadModel.test.js`
- `utils/pawketAdminReportPackageGate.js`
- `tests/pawketAdminReportPackageGate.test.js`
- `utils/pawketAdminReportReviewQueue.js`
- `tests/pawketAdminReportReviewQueue.test.js`
- `utils/pawketAdminDesktopOperatorShell.js`
- `tests/pawketAdminDesktopOperatorShell.test.js`
- `utils/pawketAdminDesktopUiAdapter.js`
- `tests/pawketAdminDesktopUiAdapter.test.js`
- `utils/pawketAdminOperatorPreviewRunner.js`
- `scripts/pawketAdminOperatorPreview.js`
- `tests/pawketAdminOperatorPreviewRunner.test.js`
- `utils/pawketAdminSampleVaultHarness.js`
- `tests/pawketAdminSampleVaultHarness.test.js`
- `utils/pawketAdminDesktopShellScaffold.js`
- `tests/pawketAdminDesktopShellScaffold.test.js`
- `utils/pawketAdminDesktopShellComposition.js`
- `tests/pawketAdminDesktopShellComposition.test.js`
- `utils/pawketAdminDesktopContractSmokeRunner.js`
- `scripts/pawketAdminDesktopContractSmoke.js`
- `tests/pawketAdminDesktopContractSmokeRunner.test.js`
- `utils/pawketAdminDesktopContractInspection.js`
- `scripts/pawketAdminDesktopContractInspection.js`
- `tests/pawketAdminDesktopContractInspection.test.js`

No finance data should be copied back into `public/` unless a future decision explicitly creates a sanitized public impact artifact.

The current proposed-ledger, proposed-journal, evidence, document-vault interface, live-ledger gate, reporting read-model, report package gate, report review queue, desktop operator shell, desktop UI adapter, operator preview runner, sample vault harness, desktop shell scaffold, desktop shell composition, desktop contract smoke runner, and desktop contract inspection layers still write only pre-ledger records, metadata-only document evidence records, blob-reference placeholders, manifests, deferrals, disabled production commit records, proposed correction records, test-only commit artifacts, non-production report manifests, export-intent metadata, preview-only package metadata, report review metadata, and reviewer notes. The desktop operator shell itself writes no pipeline records and builds only in-memory read models. The desktop UI adapter writes no pipeline records and shapes only in-memory UI-ready state, navigation metadata, panel summaries, status badges, attention queue items, and CLI preview text. The operator preview runner writes no files and prints only local non-production preview text to stdout. The sample vault harness reads deterministic fake demo records and runs the existing preview path for smoke testing only. The desktop shell scaffold defines only in-memory architecture state, safe panels, disabled actions, and packaging blockers. The desktop shell composition layer combines those existing safe pieces into one in-memory app-shell contract. The desktop contract smoke runner reads the fake sample vault, validates the full operator/UI/scaffold/composition chain, and prints a stdout-only contract summary. The desktop contract inspection layer reuses that smoke summary, compares it to an in-memory guardrail baseline, and prints a stdout-only inspection report without persisting runtime snapshots. These layers do not create posted journal entries, final balances, official balances, tax reports, Care Credit balances, CHARM assistance records, encrypted document blobs, export archives, final report packages, production ledger truth, public impact proof, runtime snapshot files, or a packaged desktop UI.
