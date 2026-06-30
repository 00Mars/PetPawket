# Pawket Admin Desktop Panel Render Guardrails

Status: production-disabled guardrails for panel render contracts.

## Hard Blocks

The panel renderer must keep these disabled:

- production ledger commits
- live ledger writes
- mutation actions and controls
- export actions and controls
- final exports
- PDF, CSV, XLSX, and ZIP artifacts
- official balances
- official reports
- production source mode
- public routes and public files
- raw document content
- document upload
- connector networking
- packaged desktop app behavior
- persisted runtime panel state

## Allowed Behavior

The renderer may read a local sample vault or safe provided vault, invoke existing smoke/inspection/contract utilities, build in-memory panel contracts and region metadata, and print a short stdout-only summary.

## Verification

`utils/pawketAdminDesktopPanelRenderer.js` validates panel render contracts, region maps, summary surfaces, stdout-only behavior, read-only behavior, public-path rejection, export artifact rejection, and absence of persisted runtime panel state.

Before this can become a real desktop screen, Pet Pawket still needs production encryption review, raw document storage review, live-ledger commit review, official balance/report/export review, connector networking review, privacy/redaction review, legal/accounting/tax/security/privacy review, UI security review, and local vault hardening.
