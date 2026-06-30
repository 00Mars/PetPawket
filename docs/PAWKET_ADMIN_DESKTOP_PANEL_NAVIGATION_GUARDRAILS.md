# Pawket Admin Desktop Panel Navigation Guardrails

Status: production-disabled guardrails for desktop panel navigation and focus metadata.

## Hard Blocks

The navigation layer must keep these disabled:

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
- persisted runtime state
- persisted navigation state
- persisted focus state

## Allowed Behavior

The navigation layer may read a local sample vault or safe provided vault through the existing panel renderer path, build in-memory navigation/focus/selection metadata, build in-memory attention routing metadata, build disabled-action surfaces, and print a short stdout-only summary.

## Verification

`utils/pawketAdminDesktopPanelNavigation.js` validates the navigation contract, selection state, focus model, keyboard map, attention routing, disabled action surfaces, stdout-only behavior, read-only behavior, public-path rejection, export artifact rejection, and absence of persisted navigation/focus/runtime state.

Before this can become a real desktop screen, Pet Pawket still needs production encryption review, raw document storage review, live-ledger commit review, official balance/report/export review, connector networking review, privacy/redaction review, legal/accounting/tax/security/privacy review, UI security review, and local vault hardening.
