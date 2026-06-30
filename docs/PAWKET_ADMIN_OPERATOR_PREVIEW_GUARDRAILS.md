# Pawket Admin Operator Preview Guardrails

Status: required guardrails for the stdout-only preview runner.

## Hard Blocks

- No production ledger commits.
- No live ledger writes.
- No final exports.
- No PDF, CSV, XLSX, or ZIP files.
- No official balances.
- No official reports.
- No production source mode.
- No public website files or routes.
- No raw document content.
- No document upload.
- No connector networking.
- No tax filing.
- No investor, foundation, public, accountant, or IRS final package output.
- No mutation of existing pipeline records.
- No packaged app installer.

## Verifiers

The runner includes helpers to verify:

- stdout-only successful output
- no operator preview write targets
- no desktop shell write targets
- no UI adapter write targets
- no public-path usage
- no forbidden export/report/balance artifacts

## Current Boundary

The runner is a local operational convenience for previewing pipeline state. It is not production-ready and cannot be used as accounting truth, report output, export authorization, or public impact proof.
