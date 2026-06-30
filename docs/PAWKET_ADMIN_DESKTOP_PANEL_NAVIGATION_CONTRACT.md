# Pawket Admin Desktop Panel Navigation Contract

Status: local-only, read-only navigation/focus scaffold. This is not a UI framework implementation, packaged desktop app, Electron/Tauri shell, browser UI, public route, production UI, finance editor, ledger posting interface, export generator, or persisted runtime state layer.

## Purpose

The panel navigation contract consumes the existing desktop panel render contracts and defines safe in-memory navigation metadata for a future local Pawket Admin desktop shell.

Safe chain:

```text
sample vault or safe provided vault
-> desktop panel renderer scaffold
-> panel render contracts
-> navigation/focus contract
-> stdout-only navigation/focus summary
```

It does not create desktop windows, routes, files, exports, reports, balances, ledger entries, navigation caches, focus caches, or public assets.

## Required Fields

Every navigation/focus contract must keep:

- `production_enabled: false`
- `read_only: true`
- `local_only: true`
- `in_memory_only: true`
- `stdout_only: true`
- `runtime_state_persistence_enabled: false`
- `navigation_state_persistence_enabled: false`
- `focus_state_persistence_enabled: false`
- `packaged_app: false`
- `official_balance_status: disabled`
- `official_report_status: disabled`
- `final_export_status: disabled`
- `source_mode: local_non_production_desktop_panel_navigation_contract`
- `raw_document_content_included: false`
- `mutation_actions_enabled: false`
- `export_actions_enabled: false`
- `connector_networking_enabled: false`
- `document_upload_enabled: false`
- `public_route_enabled: false`

## Contract Sections

- `selection_state`
- `focus_model`
- `keyboard_map`
- `attention_routing`
- `disabled_action_surfaces`
- `region_map`
- `summary_surface`
- `attention_surface`

The contract may reference panel IDs and summary counts only. It must not include raw document contents, full private records, generated report payloads, export paths, or mutable action targets.
