# Pawket Admin Desktop Panel Render Contracts

Status: local-only, read-only renderer scaffold. This is not a packaged desktop app, Electron/Tauri implementation, browser UI, public route, production UI, finance editor, ledger posting interface, export generator, or persisted runtime state layer.

## Purpose

Panel render contracts describe how a future local desktop shell may display the validated app-shell contract as safe panels.

Safe chain:

```text
sample vault or provided safe vault
-> desktop contract smoke runner
-> desktop contract inspection
-> validated app-shell contract / inspection status
-> panel render contracts
-> stdout-only local panel contract summary
```

The renderer consumes existing panel bindings and inspection status. It does not create UI screens, routes, runtime snapshots, panel caches, reports, exports, official balances, or ledger truth.

## Required Fields

Every panel render contract must keep:

- `production_enabled: false`
- `read_only: true`
- `local_only: true`
- `in_memory_only: true`
- `runtime_state_persistence_enabled: false`
- `packaged_app: false`
- `official_balance_status: disabled`
- `official_report_status: disabled`
- `final_export_status: disabled`
- `source_mode: local_non_production_desktop_panel_render_contract`
- `raw_document_content_included: false`
- `mutation_actions_enabled: false`
- `export_actions_enabled: false`
- `connector_networking_enabled: false`
- `document_upload_enabled: false`
- `public_route_enabled: false`

Each panel also declares `panel_id`, `label`, `region_id`, `source_view_model`, `ui_state_key`, `render_mode: summary_only`, `data_scope: counts_status_and_guardrails_only`, `production_authority: false`, `raw_document_content_allowed: false`, `mutation_controls_allowed: false`, `export_controls_allowed: false`, `navigation_target_allowed: true`, and `public_route_allowed: false`.

## Allowed Panels

- Overview
- Pipeline
- Evidence
- Ledger Proposals
- Test-Only Ledger
- Reporting
- Report Packages
- Report Review
- Blockers
- Warnings
- Disabled Production Gates
- Audit Notes
- Sample Vault Preview
