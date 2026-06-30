# Pawket Admin Desktop Shell Composition

Status: local-only composition layer. This is not a packaged desktop app, browser UI, public route, production UI, finance editor, ledger posting interface, or export generator.

## Purpose

The desktop shell composition layer combines already-verified local Pawket Admin view models into one in-memory contract for a future desktop screen.

It composes:

- Desktop operator shell read model.
- Desktop UI adapter state.
- Desktop shell scaffold boundary and registries.
- Optional sample-vault preview metadata.

## Current Code

- `utils/pawketAdminDesktopShellComposition.js`
- `tests/pawketAdminDesktopShellComposition.test.js`
- `utils/pawketAdminDesktopContractSmokeRunner.js` consumes this layer for stdout-only sample-vault contract smoke validation.

## Composition Boundary

The layer may assemble in-memory state, validate labels, bind safe panels, surface blockers, and surface disabled gates.

It must not write Pawket Admin records, create final exports, create official reports, create official balances, add public routes, include raw document content, upload documents, connect live connectors, package a desktop app, or mark any state as production truth.

The desktop contract smoke runner may call this layer and print a summary of the validated contract. That runner remains stdout-only and must not persist the composed contract.
