# Pawket Admin Desktop Contract Smoke Guardrails

Status: production-disabled guardrails for smoke validation.

## Hard Blocks

The desktop contract smoke runner must keep these disabled:

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
- tax, accountant, investor, foundation, or public final report packages

## Allowed Behavior

The runner may read the local sample vault, build in-memory operator and desktop state, validate the composition contract, and print a short stdout-only summary.

The desktop contract inspection layer may reuse this summary as an input for in-memory baseline comparison, but it must not persist the smoke summary or inspection snapshot.

## Review Blockers

Before this can become a packaged desktop app, Pet Pawket still needs production encryption review, raw document storage review, live-ledger commit review, official balance/report/export review, connector networking review, privacy/redaction review, legal/accounting/tax/security/privacy review, UI security review, and local vault hardening.
