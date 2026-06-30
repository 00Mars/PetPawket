# Pawket Admin Desktop Contract Inspection Guardrails

Status: production-disabled guardrails for contract inspection.

## Hard Blocks

The desktop contract inspection layer must keep these disabled:

- production ledger commits
- live ledger writes
- mutation actions
- export actions
- final exports
- PDF, CSV, XLSX, and ZIP generation
- official balances
- official reports
- production source mode
- public files and public routes
- raw document content
- document upload
- connector networking
- packaged app behavior
- runtime snapshot persistence
- tax, accountant, investor, foundation, or public final report packages

## Allowed Behavior

The inspection layer may read the local sample vault or a provided safe vault path, invoke the existing smoke runner chain, build an in-memory normalized inspection snapshot, compare it with the expected guardrail baseline, and print a short stdout-only inspection report.

## Current Verification

`utils/pawketAdminDesktopContractInspection.js` validates the snapshot, report, stdout-only result, public-path rejection, read-only posture, export-artifact rejection, and missing/failed guardrail comparison behavior.

The inspection layer extends the smoke runner guardrails by explicitly checking in-memory-only behavior and blocking runtime snapshot persistence.
