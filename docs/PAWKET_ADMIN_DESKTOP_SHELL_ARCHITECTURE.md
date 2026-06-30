# Pawket Admin Desktop Shell Architecture

Status: architecture scaffold only. This is not an Electron app, Tauri app, browser route, finance editor, ledger posting interface, export generator, or production UI.

## Purpose

The desktop shell architecture scaffold defines the local boundary a future packaged Pawket Admin app can use after security, accounting, tax, legal, privacy, and UI review.

The scaffold consumes existing concepts:

- Desktop operator shell read models.
- Desktop UI adapter state.
- Local sample-vault preview metadata.
- Desktop shell composition contract.

It does not create new finance truth. It only records what the future shell may load, which panels are allowed, which status surfaces are safe, which actions are disabled, and what must be reviewed before packaging.

## Current Code

- `utils/pawketAdminDesktopShellScaffold.js`
- `tests/pawketAdminDesktopShellScaffold.test.js`
- `utils/pawketAdminDesktopShellComposition.js`
- `tests/pawketAdminDesktopShellComposition.test.js`
- `utils/pawketAdminDesktopContractSmokeRunner.js`
- `tests/pawketAdminDesktopContractSmokeRunner.test.js`

## Boundary

The scaffold is local-only, read-only, and non-production. It has no connector networking, document upload, mutation actions, export actions, public route, official report, official balance, final export, or packaged installer behavior.

The composition layer may assemble this scaffold with the operator shell read model, UI adapter state, and optional sample preview metadata into one in-memory app-shell contract. It does not change the scaffold boundary or create a desktop app.

The contract smoke runner validates that assembled contract against the fake sample vault and prints a stdout-only summary. It does not package the shell, create a browser UI, or persist any desktop app state.
