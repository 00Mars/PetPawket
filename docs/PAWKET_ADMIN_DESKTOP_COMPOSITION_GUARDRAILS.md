# Pawket Admin Desktop Composition Guardrails

Status: production-disabled composition guardrails.

The composition layer must remain:

- Local-only.
- Read-only.
- In-memory.
- Non-production.
- Public-path blocked.
- Export-generation blocked.
- Official-report blocked.
- Official-balance blocked.
- Raw-document-content blocked.
- Mutation-action blocked.
- Connector-networking blocked.
- Document-upload blocked.
- Desktop-packaging blocked.

## Forbidden Outputs

The composition layer must not create PDFs, CSVs, XLSX files, ZIP files, official reports, official balances, final exports, production source-mode records, public impact claims, raw document content, public website files, or packaged desktop app artifacts.

## Current Verification

`utils/pawketAdminDesktopShellComposition.js` validates the app-shell contract, panel bindings, optional sample preview binding, read-only posture, no-production-authority posture, no-export-action posture, public-path rejection, and export artifact rejection.

`utils/pawketAdminDesktopContractSmokeRunner.js` inherits these same guardrails. It validates the composed contract and prints a short stdout-only summary, but it must not write the contract, cache it, expose it through a browser route, or create export/report/balance artifacts.

`utils/pawketAdminDesktopContractInspection.js` inherits the smoke runner guardrails, normalizes a smoke summary into an in-memory inspection snapshot, compares it with the expected guardrail baseline, and prints a stdout-only inspection report. It must not persist runtime snapshots, cache inspection reports, expose them through a browser route, or create export/report/balance artifacts.

`utils/pawketAdminDesktopPanelRenderer.js` consumes the inspected app-shell contract and panel bindings to build in-memory summary-only panel render contracts, a region map, and a stdout-only panel contract summary. It must not persist panel state, write runtime snapshots, expose a browser route, create UI assets, or create export/report/balance artifacts.
