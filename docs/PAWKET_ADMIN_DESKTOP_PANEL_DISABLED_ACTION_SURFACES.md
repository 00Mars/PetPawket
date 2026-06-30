# Pawket Admin Desktop Panel Disabled Action Surfaces

Status: disabled-action metadata for future local desktop panels.

## Purpose

Disabled action surfaces make blocked behavior explicit for every allowed panel. They list action IDs and labels only. They do not create buttons, controls, handlers, routes, writes, exports, reports, balances, uploads, connector calls, or ledger actions.

## Required Disabled Actions

Every panel must keep these actions unavailable:

- `create_ledger_entry`
- `commit_ledger_entry`
- `edit_finance_record`
- `approve_production_ledger`
- `create_official_balance`
- `create_official_report`
- `create_final_export`
- `generate_pdf`
- `generate_csv`
- `generate_xlsx`
- `generate_zip`
- `upload_document`
- `connect_live_connector`
- `publish_public_impact_claim`
- `send_accountant_package`
- `send_investor_package`
- `send_irs_package`
- `package_desktop_app`

Each disabled action must remain disabled, unavailable, read-only, side-effect-free, non-persistent, mutation-disabled, export-disabled, and without production authority.

## Panel Coverage

Disabled action surfaces are created for:

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
