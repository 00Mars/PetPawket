# Pet Pawket Finance Calculation Rules

Last updated: 2026-05-26

Status: rule architecture only. Local example data uses planning-only calculation examples. No live accounting, tax, Care Credit, CHARM assistance, or insurance referral logic is active.

## Rule Architecture

Every calculated number should carry:

- `calculation_rule_id`
- `rule_key`
- `version`
- `effective_start`
- `effective_end`
- `status`
- `owner`
- `review_status`
- `input_fields`
- `formula_description`
- `rounding_rule`
- `source_documents`
- `test_cases`
- `report_dependencies`

Rules should be versioned because one report may need to explain why a number changed after a refund, legal review, accounting policy update, campaign change, or donation allocation decision.

## Revenue Rules

Required rule keys:

- `gross_sales`
- `discounts`
- `refunds`
- `net_product_sales`
- `shipping_revenue`
- `tax_collected`
- `net_revenue`

Starting definitions:

- Gross sales equals product and subscription sale value before discounts, taxes, fees, refunds, and reversals.
- Discounts are tracked separately from refunds.
- Tax collected is a liability until remitted.
- Net revenue excludes tax collected and excludes pass-through amounts.
- Refund rules must preserve original source order, refund source, date, amount, and impact on points, Care Credit, donation pledges, and COGS.

## COGS Rules

Required rule keys:

- `product_cost`
- `packaging_cost`
- `inbound_freight`
- `fulfillment_materials`
- `pawket_pick_cost`
- `pawket_pack_cogs`
- `pawket_packet_cogs`

Starting definitions:

- Product COGS should attach to SKU and fulfillment event where possible.
- Pawket Pack COGS should include product, packaging, insert, labor allocation if approved, and fulfillment materials.
- Pawket Packet COGS should be tracked separately from Pawket Pack COGS.
- Pawket Pick cost should be tracked as reward cost, campaign cost, or COGS according to accounting review.

## Margin Rules

Required rule keys:

- `gross_margin`
- `contribution_margin`
- `donation_adjusted_margin`
- `pack_margin`
- `packet_margin`

Starting definitions:

- Gross margin equals net product sales minus COGS.
- Contribution margin may subtract payment fees, shipping subsidies, rewards cost, Pawket Pick cost, and campaign costs if approved.
- Donation-adjusted margin should show pledged mission amounts separately so operating margin and mission commitment remain clear.

## Donation Rules

Required rule keys:

- `eligible_revenue`
- `charm_pledge`
- `cherish_pledge`
- `restricted_fund_allocation`
- `donation_payable`
- `donation_transferred`
- `donation_pending`

Starting definitions:

- Donation pledges must state whether they are order-based, campaign-based, board-restricted, donor-restricted, or discretionary.
- Donation payable must remain separate from donation transferred.
- CHARM and future CHERISH must remain separate entities/funds unless legal/accounting review approves a shared treatment.
- Public impact claims must trace to source records, donor restrictions, and report runs.

## Care Credit Rules

Required future rule keys:

- `care_credit_earned`
- `care_credit_redeemed`
- `care_credit_reversed_from_refund`
- `care_credit_available`
- `care_credit_outstanding_liability`
- `care_credit_projected_redemption_exposure`

Current status:

- Pawket Care Credit rules are planning-only.
- No earn, redemption, liability, reversal, or account balance behavior is active.
- No rule may imply coverage, guaranteed reimbursement, guaranteed payment, or insurance.

Required boundary:

> Pawket Care Credit is a rewards-based credit program, not insurance. Credits are earned through eligible Pet Pawket purchases and participation and may be redeemed only according to Pet Pawket's program terms. Pawket Care Credit does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.

## Points Rules

Required future rule keys:

- `pawket_points_earned`
- `pawket_points_redeemed`
- `heartpoints_earned`
- `heartpoints_redeemed`
- `tier_lookup`
- `contribution_multiplier`

Starting definitions:

- Pawket Points are practical reward progress.
- HeartPoints are emotional and impact progress.
- Neither points system should imply guaranteed cash value, Care Credit value, CHARM assistance eligibility, or insurance status.
- Contribution multipliers remain future-only until caps, eligibility, refund handling, charity compliance, accounting, and legal review are approved.

## Customer Rules

Required rule keys:

- `average_order_value`
- `lifetime_value`
- `mission_adjusted_lifetime_value`
- `repeat_purchase_rate`
- `subscription_conversion`
- `churn`

Starting definitions:

- Mission-adjusted LTV should show revenue, margin, donations, story participation, Pawket Pass activity, subscriptions, and impact outcomes without reducing customer love to spend.
- Private pet, assistance, medical, hardship, memorial, or insurance details must not be used in customer finance reports without privacy review.

## Impact Rules

Required rule keys:

- `donation_per_order`
- `impact_per_customer`
- `cost_per_animal_helped`
- `assistance_approval_rate`
- `story_to_dollar_attribution`

Starting definitions:

- Cost per animal helped should be used only after CHARM outcome definitions and source proof rules are approved.
- Assistance approval rate must not expose private assistance records publicly.
- Story-to-dollar attribution must use consent-safe signals and aggregated reporting unless explicit review allows more.

## Future Advanced Rule Sets

Documented for future phases only:

- Mission ROI Engine.
- Story-to-Dollar Attribution.
- Pawket Pal Value Ledger.
- Care Credit Liability Forecast.
- Fund Waterfall.
- One Order, Many Outcomes View.
- Restricted Fund Integrity Monitor.
- Investor Story Dashboard.
- Impact Proof Ledger.
- Promise Ledger.
- Scenario Simulator.
- Lumerian Value Graph.

## Rule Approval Flow

Before a rule powers live accounting, customer balances, public impact, investor reporting, or tax documentation:

1. Define inputs and source documents.
2. Define formula and rounding.
3. Define refund, reversal, and correction behavior.
4. Define affected ledgers.
5. Add sample cases.
6. Review with product, accounting, tax, legal, privacy, and operations as needed.
7. Record the rule version.
8. Attach the rule to report runs and exports.
