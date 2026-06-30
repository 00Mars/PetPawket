# Pawket Admin Document Retention Schedule

Status: policy model only. Retention periods require legal, accounting, tax, privacy, and charity review before production.

The current code models retention classes and review needs. It does not destroy real encrypted blobs.

## Retention Fields

- `retention_class`
- `description`
- `default_minimum_years_placeholder`
- `review_frequency`
- `destruction_allowed`
- `destruction_requires_approval`
- `legal_hold_supported`
- `export_allowed`
- `notes`

## Retention Classes

- `tax_support`
- `accounting_support`
- `donor_support`
- `foundation_program_support`
- `assistance_sensitive`
- `legal_contract`
- `creator_ip_rights`
- `customer_support`
- `story_consent`
- `public_impact_proof`
- `temporary_import`
- `export_manifest`
- `audit_support`

## Rules

Legal hold overrides destruction.

Destruction must be audited.

Sensitive assistance, donor, story, family/minor, medical-adjacent, customer, partner, and legal records require purpose-specific review before export or destruction.

Current helper behavior can assign a retention class and mark review areas such as accounting, tax, legal, privacy, and foundation review. It does not approve retention periods.
