# Pawket Admin Desktop Shell Disabled Actions

Status: disabled action registry.

The scaffold explicitly disables:

- create ledger entry
- commit ledger entry
- edit finance record
- approve production ledger
- create official balance
- create official report
- create final export
- generate PDF
- generate CSV
- generate XLSX
- generate ZIP
- upload document
- connect live connector
- publish public impact claim
- send accountant package
- send investor package
- send IRS package
- package desktop app

These actions must not appear as enabled controls, placeholder buttons, menu items, keyboard commands, background tasks, routes, scripts, or hidden feature flags in this phase.

The registry exists so future UI work has an explicit denylist before any interface is built.
