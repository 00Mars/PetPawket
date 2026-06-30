# Pawket Admin Audit Log

Last updated: 2026-05-29

Status: append-only audit model and lightweight validation scaffold. No production audit database is implemented in this pass. Current code audits quarantine, staging, draft record writes, review queue writes, review decisions, proposed ledger record writes, proposed ledger decisions, proposed journal entry writes, proposed journal decisions, source document metadata writes, evidence deferrals, commit evidence manifests, document vault ingestion records, commit-gate evidence integration records, disabled production commit records, test-only commit artifacts, test-only immutable ledger entries, proposed correction/adjustment records, proposed ledger correction records, report manifest writes, export intent writes, preview package writes, report review item writes, report review decision writes, report preview supersession writes, redaction review outcome writes, reviewer note writes, rejection, export manifest creation, and vault skeleton events. The desktop operator shell read model is currently read-only and does not append audit events because it does not mutate pipeline records or create exports.

## Purpose

Pawket Admin must preserve a trustworthy record of high-value actions. Finance history should not be silently overwritten.

The audit log should answer:

- Who acted?
- What changed?
- When did it happen?
- Which role and permission allowed it?
- Which source, document, report, export, period, or connector bundle was involved?
- Which prior event came before it?
- Was the event chain tampered with?

## Append-Only Rule

Audit events are append-only.

Do not silently edit or delete audit events. Corrections are new events that reference the original event, source record, document, report, export, or period.

Examples:

- A bad expense category is fixed with `ledger_correction_created`.
- A wrong document link is fixed with `document_link_corrected`.
- A closed period is changed with `period_reopened` and an adjustment event.
- An export is replaced with a new export and manifest.

## Baseline Event Fields

Each audit event should eventually include:

- `event_id`
- `event_type`
- `occurred_at`
- `actor`
- `role`
- `permission`
- `target`
- `action`
- `reason`
- `source`
- `period_id`
- `connector_bundle_id`
- `export_id`
- `document_ids`
- `metadata`
- `previous_hash`
- `event_hash`

`event_hash` should be calculated from the event content excluding `event_hash` itself. `previous_hash` should point to the prior event hash or a genesis marker for the first event.

## Hash Chain

The audit hash chain gives Pawket Admin a basic tamper-detection spine.

Baseline behavior:

- First event uses `previous_hash: "GENESIS"`.
- Each later event uses the exact prior event hash as `previous_hash`.
- Event hashes are deterministic over canonical event content.
- Verification reports a mismatch if an event changes, is removed, reordered, or receives the wrong previous hash.

Hash-chain validation does not replace encryption, signatures, backups, access control, or external audit review. It is one integrity layer.

## High-Value Actions

The following actions must produce audit events:

- Vault initialized.
- Vault unlocked.
- Session auto-locked.
- Role granted.
- Role revoked.
- Permission profile changed.
- Connector bundle received.
- Connector bundle quarantined.
- Connector import state transitioned.
- Connector bundle validated for staging.
- Connector bundle staged as source evidence only.
- Connector bundle rejected.
- Source event staged.
- Draft finance records written.
- Review queue item written.
- Review queue decision marked.
- Ledger approval boundary checked.
- Proposed ledger records written.
- Proposed ledger record decision marked.
- Proposed journal entries written.
- Proposed journal entry decision marked.
- Final commit gate validated.
- Disabled production commit record created.
- Test-only ledger commit created.
- Test-only immutable ledger entry created.
- Proposed correction or adjustment created.
- Proposed ledger correction record created.
- Document added.
- Source document metadata written.
- Evidence deferral written.
- Commit evidence manifest written.
- Document vault ingestion record written.
- Commit-gate evidence integration record written.
- Document redacted.
- Duplicate document detected.
- Ledger record staged.
- Ledger record approved.
- Correction created.
- Calculation rule changed.
- Report run generated.
- Report manifest written.
- Export intent record written.
- Report preview package record written.
- Report review item written.
- Report review decision written.
- Report preview supersession written.
- Redaction review outcome written.
- Report reviewer note written.
- Export generated.
- Export manifest created.
- Period closed.
- Period reopened.
- Backup created.
- Backup restored.
- Key rotation started.
- Key rotation completed.
- Recovery key used.
- Audit tamper alert raised.

## Period Close Events

Period close is a finance integrity boundary.

Closing a period should record:

- Period id.
- Period start and end.
- Entity.
- Fund or class scope, if applicable.
- Report runs included.
- Open exceptions.
- Closing role and actor.
- Close timestamp.
- Close hash.

After close, records inside the period should not be silently edited. Adjustments require new correction events and may require period reopen depending on policy.

## Period Reopen Events

Reopening a period should require:

- Owner Root or approved high-trust role.
- Explicit reason.
- Affected period id.
- Affected report run ids.
- Expected correction type.
- Audit event.

Reopen must not erase the prior close event.

## Export Events

Every export must create an audit event.

Export audit metadata should include:

- Export profile.
- Export id.
- Manifest hash.
- Export hash.
- Period.
- Entity.
- Role.
- Actor.
- Destination or purpose.
- Field allowlist version.
- Redaction profile.
- Source document ids.

## Connector Import Events

Every connector import attempt must create audit events.

Minimum event sequence:

1. `connector_bundle_received`
2. `connector_bundle_quarantined`
3. `connector_bundle_validated` or `connector_bundle_rejected`
4. `connector_bundle_staged` only after staging validation and idempotency checks
5. Future `ledger_record_approved` or equivalent only after human normalization and approval

The connector can provide evidence. It cannot approve its own import.

Current skeleton behavior:

- `connector_bundle_quarantined` records the quarantine-only source evidence.
- `connector_bundle_staged` records that validated source events were copied to staging.
- Staging audit metadata must make clear that `live_ledger_write` is `false`.
- Rejected bundles preserve original quarantine evidence and add `connector_bundle_rejected`.
- Future live ledger approval must use a separate reviewed action and cannot be implied by staging.

## Normalization And Review Events

Normalization and review queue actions must create audit events.

Current skeleton actions:

- `draft_finance_records_written`
- `review_queue_item_written`
- `review_queue_item_decision_marked`

These audit events must include `live_ledger_write: false` metadata.

`approved_for_ledger_later` is not a ledger write. It is only a review queue decision that allows a future, separate approval workflow to continue.

## Proposed Ledger Events

Proposed ledger actions must create audit events.

Current skeleton actions:

- `proposed_ledger_records_written`
- `proposed_ledger_records_decision_marked`

These audit events must include `live_ledger_write: false` metadata.

Proposed ledger records are pre-ledger records. They may show intended debit/credit lines, account mappings, document links, and calculation-rule references, but they do not create posted journal entries, final balances, tax filings, Care Credit liability truth, CHARM payable truth, or public impact proof.

## Proposed Journal And Commit-Gate Events

Proposed journal and commit-gate actions must create audit events.

Current skeleton actions:

- `proposed_journal_entries_written`
- `proposed_journal_entry_decision_marked`
- `test_only_ledger_commit_created`
- `proposed_correction_adjustment_created`
- `disabled_production_commit_record_created`
- `test_only_immutable_ledger_entry_created`
- `proposed_ledger_correction_record_created`
- `report_manifest_written`
- `export_intent_record_written`
- `report_preview_package_record_written`
- `report_review_item_written`
- `report_review_decision_written`
- `report_preview_supersession_written`
- `redaction_review_outcome_written`
- `report_reviewer_note_written`

These audit events must include `live_ledger_write: false` metadata.

Test-only commit events are validation artifacts. They are not production commit events and do not create official journal entries or balances.

Disabled production commit events record that the live-ledger gate was reached while production posting remained disabled. Test-only immutable ledger events validate hash-chain behavior only.

Report manifest events record preview metadata only. They do not create official report packages, exports, balances, tax outputs, investor reports, foundation reports, public impact reports, PDFs, CSVs, XLSX files, or ZIP archives.

Export intent and preview package events record package intent and preview metadata only. They do not create final export files, official report packages, official balances, or production reports.

Report review events record review metadata only. Review approval, rejection, supersession, redaction outcomes, and reviewer notes do not create final export files, official report packages, official balances, public impact claims, or production reports.

Desktop operator shell reads do not currently append audit events. If future product policy requires view auditing, that should be added without turning the shell into a writer of reports, balances, exports, or ledger truth.

## Source Document And Evidence Events

Source document metadata and evidence actions must create audit events.

Current skeleton actions:

- `source_document_metadata_written`
- `evidence_deferral_written`
- `commit_evidence_manifest_written`
- `document_vault_ingestion_record_written`
- `commit_gate_evidence_integration_written`

These audit events must make clear that raw document content is not stored, deferrals do not remove original requirements, evidence manifests do not write live ledger truth, and document-vault records are metadata-only.

## Validation Scaffold

This pass adds `utils/pawketAdminSecurity.js` and `utils/pawketAdminVault.js` with lightweight validation helpers for:

- Audit hash-chain verification.
- Connector bundle shape checks.
- Idempotency-key duplicate detection.
- Export profile allowlist validation.
- File-backed vault skeleton audit append and verification.
- Quarantine-only connector import records.
- Export manifest creation and validation.
- Import state transitions.
- Connector bundle validation for staging.
- Staged source-event creation.
- Connector bundle rejection records.
- Live-ledger write guardrail checks.
- Draft finance record generation.
- Review queue item generation.
- Review queue decision updates.
- Baseline chart of accounts validation.
- Document coverage validation.
- Ledger approval boundary validation.
- Proposed ledger record generation.
- Proposed ledger balance validation.
- Proposed ledger decision updates.
- Proposed journal entry grouping.
- Proposed journal entry validation.
- Final commit-gate validation.
- Test-only ledger commit artifact creation.
- Proposed correction and adjustment validation.
- Proposed journal decision updates.
- Source document metadata validation.
- Source document metadata writes.
- Document hash calculation.
- Evidence link creation.
- Evidence coverage evaluation.
- Evidence deferral validation and writes.
- Commit evidence manifest creation and writes.
- Document vault storage policy validation.
- Blob-reference placeholder validation.
- Duplicate metadata detection.
- Document ingestion state transition validation.
- Retention assignment.
- Export redaction profile validation.
- Document vault ingestion record writes.
- Commit-gate evidence integration record writes.
- Raw document content guardrail checks.
- Proposed journal read-model projection.
- Test-only ledger read-model projection.
- Simulated non-production balance calculation.
- Reconciliation preview calculation.
- Report manifest creation, validation, listing, and writes.
- Export intent creation, validation, listing, and writes.
- Preview package approval validation, creation, listing, and writes.
- Report review item creation, validation, listing, and writes.
- Report review decision creation, validation, listing, and writes.
- Report preview supersession creation and writes.
- Redaction review outcome creation and writes.
- Audit-linked report reviewer note writes.
- Future optional desktop operator view-access audit events, if security/privacy review requires them.
- Official report/export/balance guardrail checks.
- Final export file guardrail checks.

These helpers do not implement encryption, signature verification, HMAC verification, or production authorization. They are guardrails for future tests and fixture shape.
