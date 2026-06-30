# Pawket Admin Export Permission Model

Last updated: 2026-05-26

Status: export baseline and fixture shape. No production exports are implemented in this pass.

## Principle

Exports are controlled releases of vault information. They are not casual downloads.

Every export should have:

- Explicit export profile.
- Role permission.
- Field allowlist.
- Redaction rules.
- Period and entity scope.
- Source document inclusion rules.
- Manifest.
- Export hash.
- Audit event.

## Export Profiles

### Owner Full Archive

Purpose: complete archive for Owner Root review, emergency continuity, or legal/accounting transfer.

Allowed role:

- Owner Root.

Includes:

- Reviewed ledger records.
- Source events.
- Source document references.
- Export manifests.
- Report runs.
- Audit event chain.
- Calculation rule versions.
- Period closes.

Still excludes:

- Raw vault keys.
- Raw connector secrets.
- Plaintext private keys.
- Unmasked payment secrets.

### Accountant Pack

Purpose: accountant support for bookkeeping, reconciliation, year-end, and advisory work.

Allowed roles:

- Owner Root.
- Finance Admin.
- Accountant Export User.

Includes:

- Gross receipts.
- Expenses by category.
- COGS.
- Inventory valuation.
- Sales tax collected and remitted.
- Refunds and chargebacks.
- Vendor and contractor payments.
- Receipts archive references.
- Bank and payment reconciliation.
- Donation payable and transferred records.

Redacts:

- Private stories.
- Private pet profiles.
- Assistance hardship details.
- Insurance metadata beyond approved minimal fields.

### IRS Support Pack

Purpose: tax support package.

Allowed roles:

- Owner Root.
- Finance Admin.
- Accountant Export User.

Includes only tax-support fields and supporting document references. Exact scope needs accountant/tax review.

### Investor Pack

Purpose: reviewed investor reporting.

Allowed roles:

- Owner Root.
- Finance Admin.
- Investor Read-Only for already generated packages only.

Includes:

- Revenue.
- Gross margin.
- Contribution margin.
- Subscription growth.
- Churn.
- Runway.
- CAC and LTV if definitions are approved.
- Mission-adjusted metrics if clearly labeled.
- Privacy-safe impact metrics.

Excludes:

- Raw customer ledger.
- Private story data.
- Private assistance records.
- Raw documents.
- Unreviewed projections presented as actuals.

### Foundation Pack

Purpose: CHARM and future CHERISH reporting once approved.

Allowed roles:

- Owner Root.
- Finance Admin.
- Foundation Admin.

Includes:

- Donations received.
- Restricted and unrestricted funds.
- Donor acknowledgment records.
- Assistance awards and payments only after approved.
- Privacy-safe outcomes.
- Public impact proof.

CHARM and CHERISH should remain separate unless legal/accounting review records a different treatment.

### Public Impact Report

Purpose: sanitized public impact artifact.

Allowed roles:

- Owner Root.
- Finance Admin with public impact export permission.

Includes only aggregated, consent-safe, review-approved values.

Excludes:

- Customer ids.
- Private pet or journal data.
- Raw rescue, memorial, adoption, medical, assistance, hardship, or insurance details.
- Untransferred donation amounts presented as transferred.
- Unapproved claims of guaranteed aid or insurance-like support.

### Connector Debug Export

Purpose: technical debugging for connector bundle validation.

Allowed roles:

- Owner Root.
- Finance Admin with connector debug permission.

Includes:

- Bundle id.
- Connector id.
- Cursor.
- Schema version.
- Payload hash.
- Signature or HMAC status.
- Import quarantine status.
- Validation errors.

Excludes:

- Decrypted vault documents.
- Raw secrets.
- Full private payload unless security review approves a controlled debug mode.

## Field Allowlists

Export profiles must use allowlists, not broad deny-only rules.

Rules:

- No wildcard `*` field allowlist.
- No raw key material in any export.
- No decrypted document content unless explicitly approved for a specific export and role.
- Public impact exports must use aggregate or redacted fields only.
- Investor exports must use reviewed metrics and definitions.
- Accountant and IRS packs may include sensitive financial support fields, but not private story or assistance narrative beyond approved evidence references.

## Export Manifest

Each export manifest should include:

- `export_id`
- `export_profile_id`
- `export_profile_version`
- `created_at`
- `created_by`
- `role`
- `period_start`
- `period_end`
- `entity_ids`
- `fund_ids`
- `class_ids`
- `field_allowlist`
- `redaction_rules`
- `source_record_ids`
- `document_ids`
- `report_run_ids`
- `calculation_rule_ids`
- `audit_event_id`
- `export_hash`

The manifest is part of the audit trail.

## Export Hash

Each export should have a content hash for integrity and later verification.

The export hash should not include raw secrets. If the export is encrypted, record hashes according to the security-reviewed export format.

## Audit Event

Every export must produce an audit event before it is treated as complete.

The audit event should link:

- Export profile.
- Manifest id.
- Export hash.
- Actor.
- Role.
- Period.
- Purpose.
- Destination if recorded.
