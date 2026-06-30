# Pawket Admin Desktop Shell Guardrails

Last updated: 2026-05-30

Status: guardrails for the production-disabled desktop operator shell read layer, the local desktop shell architecture scaffold, the desktop shell composition contract, the stdout-only desktop contract smoke runner, the stdout-only desktop contract inspection layer, the in-memory desktop panel render contract scaffold, and the in-memory desktop panel navigation/focus contract scaffold.

## Required Guardrails

The current desktop operator shell layer must remain:

- Read-only.
- Local.
- Non-production.
- Metadata-only.
- Public-path blocked.
- Export-generation blocked.
- Official-report blocked.
- Official-balance blocked.
- Raw-document-content blocked.

## Forbidden Outputs

The desktop shell must not create:

- Final exports.
- PDFs.
- CSVs.
- XLSX files.
- ZIP files.
- Official reports.
- Official balances.
- Production source-mode records.
- Public impact claims.
- Raw document content.
- Public website files.
- Persisted navigation state.
- Persisted focus state.

## Allowed Outputs

Current code may create only in-memory view models, in-memory desktop shell scaffold state, in-memory app-shell contract state, in-memory panel render contracts, in-memory region metadata, in-memory selection/focus/keyboard/attention-routing metadata, stdout-only smoke summaries, stdout-only inspection reports, stdout-only panel contract summaries, stdout-only panel navigation/focus summaries, and static example fixtures under `data/finance/security`.

The current utility does not write dashboard caches, view model files, audit events, official reports, exports, or balances.

## Verification

The guardrail helpers verify:

- Production flags remain disabled.
- View models are read-only.
- Official balance/report/export statuses remain disabled.
- Public paths are rejected.
- Export artifacts are detected if present.
- Desktop-shell write targets are absent.

## Current Code Boundary

`verifyDesktopShellReadOnly()`, `verifyNoDesktopShellPublicFiles()`, and `verifyNoDesktopShellExports()` enforce the operator read-model boundaries.

`verifyDesktopShellHasNoMutationActions()`, `verifyDesktopShellHasNoExportActions()`, `verifyDesktopShellHasNoProductionAuthority()`, `verifyDesktopShellCreatesNoPublicFiles()`, and `verifyDesktopShellCreatesNoExports()` enforce the architecture scaffold boundaries.

`verifyDesktopCompositionReadOnly()`, `verifyDesktopCompositionHasNoProductionAuthority()`, `verifyDesktopCompositionHasNoExportActions()`, `verifyDesktopCompositionCreatesNoPublicFiles()`, and `verifyDesktopCompositionCreatesNoExports()` enforce the app-shell composition boundaries.

`verifyDesktopContractSmokeReadOnly()`, `verifyDesktopContractSmokeStdoutOnly()`, `verifyNoDesktopContractSmokePublicFiles()`, and `verifyNoDesktopContractSmokeExports()` enforce the stdout-only contract smoke runner boundaries.

`verifyDesktopContractInspectionReadOnly()`, `verifyDesktopContractInspectionStdoutOnly()`, `verifyNoDesktopContractInspectionPublicFiles()`, and `verifyNoDesktopContractInspectionExports()` enforce the stdout-only, in-memory-only contract inspection boundaries.

`verifyDesktopPanelRendererReadOnly()`, `verifyDesktopPanelRendererStdoutOnly()`, `verifyNoDesktopPanelRendererPublicFiles()`, `verifyNoDesktopPanelRendererExports()`, and `verifyNoDesktopPanelRendererRuntimeState()` enforce the stdout-only, in-memory-only panel render contract boundaries.

`verifyDesktopPanelNavigationReadOnly()`, `verifyDesktopPanelNavigationStdoutOnly()`, `verifyNoDesktopPanelNavigationPublicFiles()`, `verifyNoDesktopPanelNavigationExports()`, and `verifyNoDesktopPanelNavigationRuntimeState()` enforce the stdout-only, in-memory-only panel navigation and focus contract boundaries.
