# Pawket Admin UI Adapter Guardrails

Status: required guardrails for the first local desktop UI adapter.

The UI adapter must remain a read-only projection over local non-production view models. It is a bridge to future UI work, not the UI itself and not finance authority.

## Hard Blocks

- No production ledger commits.
- No live ledger writes.
- No final exports.
- No PDF, CSV, XLSX, or ZIP artifacts.
- No official balances.
- No official reports.
- No production source mode.
- No public website files or routes.
- No raw document content.
- No document upload.
- No connector networking.
- No tax filing.
- No investor, foundation, public, accountant, or IRS final package output.
- No mutation of pipeline records.

## Verification Expectations

The adapter includes helpers to verify:

- no adapter write targets exist
- no files are under `public/`
- no forbidden export/report artifacts exist
- UI state labels remain read-only, local-only, and non-production
- navigation contains only safe panels

## Privacy Boundary

Panel summaries and CLI previews must not surface private payload bodies. Sensitive CHARM/CHERISH assistance, donor, customer, Pawket Pal story, medical-adjacent, or family/minor details remain protected and must be handled only through future reviewed privacy/redaction flows.
