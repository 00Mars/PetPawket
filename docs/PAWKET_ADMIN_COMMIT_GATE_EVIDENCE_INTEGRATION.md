# Pawket Admin Commit-Gate Evidence Integration

Last updated: 2026-05-29

Status: metadata integration model. No production live ledger commit is implemented.

The final commit gate must know whether a proposed journal entry has evidence support. The evidence integration record summarizes the proposed journal entry, evidence manifest, source documents, approved deferrals, privacy warnings, redaction warnings, export profile warnings, commit blockers, and commit warnings.

## Integration Flow

1. Proposed journal entry references source proposed ledger records.
2. Commit evidence manifest references the proposed journal entry, source IDs, linked documents, missing documents, deferrals, privacy warnings, redaction warnings, and manifest hash.
3. Commit-gate evidence integration validates manifest identity, coverage status, source IDs, and unresolved evidence state.
4. Final commit gate blocks or warns based on missing evidence, deferrals, redaction state, privacy warnings, and export profile restrictions.
5. Disabled production live-ledger gate preserves the manifest ID/hash, coverage state, blockers, warnings, and source IDs if a production commit is requested while disabled.

## Checks

- Proposed journal entry id exists.
- Evidence manifest id and hash exist.
- Coverage status exists.
- Source proposed ledger, draft, source event, and bundle IDs exist.
- Missing documents are absent or covered by explicit approved deferrals.
- Privacy and redaction warnings remain visible.
- Manifest hash remains attached.
- Export profile blockers are preserved as warnings or blockers depending purpose.
- Live ledger write remains disabled in the current code.
- Disabled production commit records must preserve the evidence manifest identity and blockers/warnings.

## Commit Rule

A proposed journal entry cannot become final ledger truth without evidence status being evaluated. Missing evidence may require an explicit approved deferral. Sensitive evidence must not be exported publicly without redaction/export profile checks.

## Current Code Boundary

`createCommitGateEvidenceIntegrationRecord()` and `writeCommitGateEvidenceIntegrationRecord()` create metadata records in `manifests/commit-gate-evidence-integration.ndjson` and append audit events.

They do not commit live ledger truth, export documents, store raw content, upload files, or encrypt blobs.

`utils/pawketAdminLiveLedgerGate.js` consumes the evidence manifest and evidence integration context during readiness validation. Missing evidence, missing manifest hash, incomplete coverage, unresolved redaction blockers, and unresolved high-risk flags block readiness unless an explicit reviewed deferral or override is present.

`utils/pawketAdminReportingReadModel.js` may include evidence manifest IDs, privacy warnings, redaction warnings, and missing evidence warnings in report manifests. Those manifests are metadata previews only and do not generate final reports or exports.
