# Pet Pawket Finance Reporting

Last updated: 2026-05-26

Status: reporting plan only. Not tax advice, accounting advice, investor disclosure approval, public impact approval, or charity reporting approval.

## Reporting Principle

Reports should not be static screenshots. Every report should keep provenance:

- Report run id.
- Period.
- Entity.
- Fund.
- Class.
- Calculation rule versions.
- Source records.
- Source documents.
- Reviewer.
- Export file.
- Audit event.

## Internal Reports

Required internal report families:

- Monthly management report.
- Profit and loss summary.
- Cash flow.
- Margin by product.
- Margin by Pawket Pack.
- Margin by Pawket Packet.
- Pawket Pick cost and threshold report.
- Subscription performance.
- Care Credit liability report, if approved later.
- Donation payable and transferred report.
- Inventory report.
- Campaign performance.
- Pawket Pass and HeartCode value-flow report.

## IRS And Accountant Reports

Required accountant-support outputs:

- Gross receipts.
- Expenses by category.
- COGS.
- Inventory valuation.
- Sales tax collected and remitted.
- Refunds and chargebacks.
- Vendor and contractor payments.
- Receipts archive.
- Owner contributions and draws.
- Bank and payment reconciliation.
- Donation payable and donation transfer documentation.
- Restricted fund usage, if applicable.

Each export should include source document references and a report-run manifest.

## Foundation Reports

Required CHARM and future CHERISH outputs:

- Donations received.
- Restricted and unrestricted funds.
- Assistance applications, if approved later.
- Assistance awards, if approved later.
- Assistance payments, if approved later.
- Donor acknowledgments.
- Impact outcomes.
- Fund restriction review.
- Public impact proof package.

CHARM and CHERISH should remain separate unless a future legal/accounting decision says otherwise.

## Investor Reports

Potential investor-ready outputs:

- Revenue.
- Gross margin.
- Contribution margin.
- CAC.
- LTV.
- Churn.
- Runway.
- Subscription growth.
- Impact metrics.
- Mission-adjusted LTV.
- Mission ROI.
- Story-to-Dollar Attribution summary.
- Investor narrative dashboard.

Investor reports must keep financial data, impact data, and customer/story privacy boundaries intact.

## Public Impact Reports

Potential public outputs:

- Dollars donated.
- Animals helped.
- Shelters supported.
- Families supported.
- Pawket Pack impact.
- Pawket Packet impact.
- Charm's Day impact.
- Privacy-safe stories.

Public reports must not expose raw medical, rescue, adoption, assistance, family hardship, memorial, private journal, insurance, or account-sensitive details.

## Export Types

Future export types:

- JSON manifest.
- CSV.
- PDF report packet.
- Accountant workbook.
- Investor update packet.
- Public impact page payload.

The current pass does not expose browser-generated finance exports from the website. Future exports should be generated inside the standalone Pawket Admin desktop app and recorded in the audit trail.

## Report Run Fields

Each `finance_report_runs` record should eventually include:

- `report_run_id`
- `report_key`
- `title`
- `period_start`
- `period_end`
- `entity_id`
- `fund_id`
- `class_id`
- `rule_versions`
- `source_snapshot_ids`
- `document_ids`
- `generated_by`
- `reviewed_by`
- `status`
- `export_ids`
- `audit_event_ids`
- `created_at`

## Report Integrity Checklist

Before a report is used for business decisions:

1. Confirm the period.
2. Confirm source imports.
3. Confirm document coverage.
4. Confirm calculation rule versions.
5. Confirm exclusions.
6. Confirm reversals and refunds.
7. Confirm restricted fund treatment.
8. Confirm review status.
9. Export with provenance.

## Public Impact Checklist

Before a public impact number is published:

1. Confirm source records.
2. Confirm donation payable versus transferred status.
3. Confirm restricted fund use.
4. Confirm assistance and outcome privacy.
5. Confirm story consent.
6. Confirm that public copy does not imply guaranteed support, insurance, or unsupported impact.
7. Record the public claim in the promise ledger or impact proof ledger.
