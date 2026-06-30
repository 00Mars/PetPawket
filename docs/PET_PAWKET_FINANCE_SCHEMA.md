# Pet Pawket Finance Schema

Last updated: 2026-05-26

Status: schema design document and static examples only. No database migration is approved in this pass.

## Current Posture

This pass does not create live finance tables. The current repo has a simple Postgres migration runner, but the care-support decision log blocks real Care Credit ledgers, CHARM assistance workflows, insurance referral tracking, and account modules. A live finance schema should wait until accounting, legal, tax, privacy, charity, insurance, and product review defines the actual program rules.

Current artifacts:

- `data/finance/finance-schema.example.json`
- `data/finance/finance-seed.example.json`
- `docs/PET_PAWKET_FINANCE_DESKTOP_APP.md`

Finance seed data must not be copied into `public/`. Future website connectors should expose only encrypted, authenticated, least-privilege source-event nodes.

## Transaction Base Fields

Every financial transaction or event should eventually support:

- `transaction_id`
- `event_id`
- `date_time`
- `entity_id`
- `fund_id`
- `class_id`
- `account_id`
- `category`
- `subcategory`
- `source_system`
- `source_record_id`
- `customer_id`
- `vendor_id`
- `order_id`
- `subscription_id`
- `campaign_id`
- `product_sku`
- `gross_amount`
- `discount_amount`
- `tax_amount`
- `fee_amount`
- `net_amount`
- `currency`
- `payment_method`
- `status`
- `document_links`
- `calculation_rule_id`
- `reconciled_status`
- `approval_status`
- `audit_hash`
- `notes`
- `created_at`
- `updated_at`

## Core Accounting Entities

### `finance_entities`

Tracks legal or operating entities.

Examples:

- Pet Pawket Commerce.
- CHARM Foundation.
- Future CHERISH Foundation.

Core fields:

- `entity_id`
- `name`
- `entity_type`
- `tax_profile_status`
- `default_currency`
- `legal_review_status`
- `active`

### `finance_accounts`

Chart of accounts.

Core fields:

- `account_id`
- `entity_id`
- `account_code`
- `name`
- `account_type`
- `normal_balance`
- `parent_account_id`
- `active`

### `finance_funds`

Tracks restricted, unrestricted, campaign, and operating funds.

Core fields:

- `fund_id`
- `entity_id`
- `name`
- `restriction_type`
- `restriction_source_document_id`
- `purpose`
- `active`

### `finance_classes`

Tracks business units and reporting classes.

Examples:

- Storefront.
- Pawket Packs.
- Pawket Packets.
- Pawket Picks.
- Pawket Pals.
- CHARM.
- Future CHERISH.
- Pawket Network.

### `finance_transactions`

Canonical business-event transaction table. It stores event-level financial facts and points to source systems and documents.

### `finance_journal_entries`

Accounting entry headers with period, entity, approval, reversal, and close status.

### `finance_journal_lines`

Debit and credit lines tied to accounts, funds, classes, documents, and source events.

### `finance_documents`

Source evidence repository.

Examples:

- Shopify order export.
- Stripe payout report.
- Vendor invoice.
- Donation receipt.
- Bank statement.
- Board decision.
- Care Credit terms version, if approved later.
- CHARM assistance guideline version, if approved later.

### `finance_calculation_rules`

Versioned calculation rules used by reports and derived ledgers.

### `finance_period_closes`

Monthly, quarterly, annual, and special-period close records.

### `finance_audit_events`

Append-only audit trail for creation, update, approval, reversal, export, close, and rule changes.

## Commerce And Operations Entities

### `finance_orders`

Order-level commerce facts. Source can be Shopify, manual adjustment, POS, campaign, or future subscription system.

### `finance_order_items`

Line-item detail for products, SKUs, Packs, Packets, Picks, discounts, taxes, and COGS attachment.

### `finance_products`

Product reporting records.

### `finance_skus`

SKU-level cost, inventory, price, and source mapping.

### `finance_subscriptions`

Subscription lifecycle records for Pawket Packs and future recurring programs.

### `finance_payments`

Payment events, authorization/capture/payout references, fees, and reconciliation state.

### `finance_refunds`

Refund, chargeback, reversal, and adjustment events. These should drive COGS, revenue, Care Credit, points, and donation reversals only through approved calculation rules.

### `finance_expenses`

Operating expenses and vendor bills.

### `finance_inventory_movements`

Inventory receipts, adjustments, fulfillment movement, shrinkage, and COGS allocation.

### `finance_campaigns`

Marketing, seasonal, CHARM, Pack, Packet, Pick, Pawket Pass, and Pal campaign definitions.

### `finance_coupons`

Discount code metadata, campaign attachment, finance treatment, and reporting class.

## Rewards Entities

### `finance_care_credit_ledger`

Future table only. Not approved for implementation now.

Tracks Care Credit events only after terms, accounting, privacy, refund, consumer-protection, and legal review approve the ledger.

Do not store medical, hardship, CHARM assistance, or insurance details here.

### `finance_pawket_points_ledger`

Tracks Pawket Points earned, redeemed, expired, reversed, or held once point rules are approved.

### `finance_heartpoints_ledger`

Tracks HeartPoints and impact/emotional contribution events after rules approval.

### `finance_customer_tiers`

Tracks tier state, qualification period, rule version, and safe progress summary.

### `finance_reward_redemptions`

Tracks reward redemption events and source rule versions.

### `finance_pawket_picks`

Tracks Pawket Pick thresholds, item value, COGS, fulfillment, campaign, and reversal behavior.

## Foundations And Mission Entities

### `finance_donations`

Donation or pledged support events by entity, campaign, fund, source, restriction, and document.

### `finance_donor_acknowledgments`

Receipts, thank-you status, charity acknowledgement requirements, and source document links.

### `finance_fund_restrictions`

Restricted-fund rules, allowed uses, donor restrictions, board restrictions, and release conditions.

### `finance_assistance_applications`

Future table only. Not approved for implementation now.

Tracks CHARM assistance requests only after guidelines, privacy, charity compliance, operations, and data-boundary review approve the workflow.

### `finance_assistance_awards`

Future table only. Tracks approved assistance awards after review approval.

### `finance_assistance_payments`

Future table only. Tracks provider payments, reimbursements, supply purchases, or partner disbursements only after payment/disbursement rules are approved.

### `finance_impact_outcomes`

Tracks privacy-safe outcome metrics and proof records.

### `finance_foundation_partners`

Tracks shelter, rescue, provider, and community partners with verification and role boundaries.

## Pawket Pals And Asset Value Entities

### `finance_pawket_pals`

Finance-facing summary of Pal creation cost, edition, revenue, donation impact, and asset handling. It must not replace `palDB.pg.js` as the Pal identity source.

### `finance_heartcodes`

Finance-facing HeartCode references for provenance, report lineage, and safe event linkage. HeartCodes must not encode private data.

### `finance_story_submissions`

Finance-facing references only. Raw story content and consent details belong in their own privacy-controlled domains.

### `finance_pal_editions`

Edition-level release planning, cost, revenue, donation allocation, and report treatment.

### `finance_asset_ledger`

Internal asset valuation, creation cost, IP, design files, or future game-utility tracking. No speculative resale or investment promise.

### `finance_contractors_creators`

Tracks creator, artist, contractor, vendor, rights, W-9/1099 support, and payment records.

## Reporting Entities

### `finance_report_runs`

Report execution metadata: report type, period, rule version, source snapshot, export status, and reviewer.

### `finance_report_exports`

Generated report artifacts and export provenance.

### `finance_reconciliations`

Bank, payment processor, Shopify, donation, inventory, and ledger reconciliation records.

### `finance_decisions`

Decision memory tied to financial rules, program status, report treatment, and review evidence.

### `finance_promises`

Promise ledger for public claims, campaign promises, donation commitments, reward obligations, and fulfillment state.

### `finance_value_flow_edges`

Lumerian Value Graph edge table for source-to-outcome lineage.

Example:

`customer -> order -> payment -> COGS -> donation payable -> CHARM fund -> impact outcome -> report export`

## Migration Recommendation

When live implementation is approved, build in this order:

1. Read-only finance source registry and documents.
2. Master transaction and document tables.
3. Calculation rule versioning.
4. Report-run provenance.
5. Commerce import adapters.
6. Restricted fund and donation payable tracking.
7. Rewards ledger only after rules approval.
8. CHARM assistance tables only after guidelines and privacy approval.
9. Insurance referral metadata only after legal and partner approval.

Do not start with the largest schema. Start with traceable source records and reports.
