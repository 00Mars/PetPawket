# Pawket Admin Desktop App Shell Contract

Status: non-production app-shell contract.

Every app-shell contract must include:

```json
{
  "production_enabled": false,
  "read_only": true,
  "local_only": true,
  "packaged_app": false,
  "official_balance_status": "disabled",
  "official_report_status": "disabled",
  "final_export_status": "disabled",
  "source_mode": "local_non_production_desktop_shell_contract",
  "raw_document_content_included": false,
  "mutation_actions_enabled": false,
  "export_actions_enabled": false,
  "connector_networking_enabled": false,
  "document_upload_enabled": false,
  "public_route_enabled": false
}
```

## Required Components

The contract combines:

- Shell boundary.
- Panel registry.
- Disabled action registry.
- Packaging blockers.
- Operator pipeline status.
- UI state.
- Navigation model.
- Panel summaries.
- Status badges.
- Attention queue.
- Optional sample preview binding.

The contract is a local state handoff only. It is not live ledger truth, an official balance, an official report, a final export, or a production desktop application.

The local desktop contract smoke runner may validate this contract from the fake sample vault and print only counts/status to stdout. The smoke summary is not a desktop UI, export, report, or production ledger artifact.
