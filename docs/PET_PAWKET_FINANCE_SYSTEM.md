# Pet Pawket Finance And Living Documentation System

Last updated: 2026-05-26

Status: first implementation foundation. Internal planning and desktop-app architecture direction only. Not accounting advice, tax advice, legal advice, investor reporting approval, charity reporting approval, insurance approval, or launch approval for Care Credit, CHARM assistance, or insurance referrals.

## Purpose

The Pet Pawket Finance And Living Documentation System is intended to become the financial truth engine for the Pet Pawket umbrella.

It should eventually connect commerce, subscriptions, Pawket Packs, Pawket Packets, Pawket Picks, Pawket Pals, HeartCodes, Pawket Points, HeartPoints, CHARM, future CHERISH, Care Credit, donations, partner activity, public impact, accountant support, tax documentation, investor reporting, and future Lumerian value-flow tracking.

Guiding principle:

> Every dollar has a source. Every source has a document. Every document supports a report. Every report traces back to the living ecosystem.

## Current Implementation Scope

This pass creates only:

- Finance documentation.
- Desktop-app security and connector architecture direction.
- Static example schema and seed data stored outside `public/`.

The finance system should become a standalone Pawket Admin desktop app, not a website page. Website-facing integrations should be encrypted connector nodes with admin-only authorization and audit logging.

This pass does not create:

- Database migrations.
- API routes.
- Payment processor connections.
- Tax filing logic.
- Real Care Credit balances.
- Real CHARM assistance intake or disbursement.
- Insurance partner cards, referral tracking, quotes, applications, comparisons, or claim paths.
- Public navigation discovery for finance or care-support features.
- Public static finance pages or public static finance JSON.

## Umbrella Coverage

The system is designed around Pet Pawket's living umbrella:

- Pet Pawket commerce and Shopify-backed order flow.
- Pawket Packs as full subscription boxes.
- Pawket Packets as sample or intro boxes.
- Pawket Picks as threshold, seasonal, or reward items.
- Pawket Passes as the public sharing and referral path using internal Loop contracts.
- Pawket Pals and HeartCodes as story, provenance, identity, and future value anchors.
- Pawket Points as practical rewards.
- HeartPoints as impact and emotional contribution progress.
- Pawket Care Credit as future rewards value, not insurance.
- CHARM Emergency Assistance as future charitable aid, not insurance.
- CHARM Foundation donations, restricted funds, assistance, and impact reports.
- Future CHERISH Foundation activity, tracked separately from CHARM.
- Pawket Network partner, provider, referral, claim, and trust activity.
- Future Pawket Places, Heroic Quests, Pawket Haven, and Lumerian Value Graph connections.

## Four Connected Ledgers

### 1. Master Financial Ledger

Tracks financial accounting events:

- Revenue.
- Expenses.
- Assets.
- Liabilities.
- Equity.
- COGS.
- Donation payables.
- Care Credit liability, if approved later.
- Gift card or store-credit liability, if approved later.
- Taxes.
- Transfers.
- Journal entries.

### 2. Operational Subledger

Tracks operational business events:

- Orders.
- Products.
- SKUs.
- Subscriptions.
- Pawket Packs.
- Pawket Packets.
- Pawket Picks.
- Shipping.
- Refunds.
- Discounts.
- Campaigns.
- Inventory.

### 3. Mission And Foundation Ledger

Tracks mission activity:

- CHARM donations.
- Future CHERISH donations.
- Restricted and unrestricted funds.
- Assistance applications, if approved later.
- Assistance awards, if approved later.
- Shelter and rescue partners.
- Impact outcomes.
- Donor acknowledgments.

### 4. Rewards And Value Ledger

Tracks value obligations and participation:

- Pawket Care Credit earned, redeemed, reversed, expired, or held, if approved later.
- Pawket Points.
- HeartPoints.
- Customer tiers.
- Contribution multipliers, if approved later.
- Pawket Pick value.
- Reward redemptions.

## Traceability Standard

Every number should eventually trace to:

- Source event.
- Source document.
- Entity.
- Fund.
- Class or business unit.
- Account.
- Calculation rule.
- Period.
- Report run.
- Export.

The current local example data demonstrates the shape of this traceability with mock IDs and source links only; it is not served from the public website.

## Living Documentation Standard

The finance system should preserve:

- Event timeline.
- Decision memory.
- Calculation rule versions.
- Source documents.
- Report provenance.
- Audit trail.
- Promise ledger.
- Impact proof ledger.
- Value-flow graph.

Finance data should not become a flat spreadsheet. It should preserve why a number exists, who approved it, which rule calculated it, which source supported it, and which report reused it.

## Care-Support Boundary

The finance system may document future Care Credit, CHARM assistance, and insurance referral accounting needs. It must not make those programs active before approval.

Required short disclaimer:

> Not insurance. No guaranteed coverage. Pawket Care Credit is a rewards program. CHARM Emergency Assistance is charitable aid subject to eligibility, program guidelines, and available funds. Pet insurance, where available, is offered only through licensed insurance partners.

Pawket Care Credit, CHARM Emergency Assistance, and licensed insurance partner referrals remain governed by `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.

## Future Business Product Possibility

The same architecture could later become a stripped-down product for mission-driven businesses. Working names:

- MissionLedger.
- Living Ledger.
- ProofLedger.
- ImpactBooks.
- PromiseLedger.

Possible generic product:

A financial and impact documentation platform for mission-driven businesses, nonprofits, creators, subscription brands, and community commerce brands.

Generic future features:

- Income and expense tracking.
- Source documents.
- Audit trail.
- Fund tracking.
- Donation tracking.
- Reward or credit liability.
- Impact reports.
- Investor updates.
- Decision memory.
- Promise ledger.
- Proof ledger.
- Scenario simulator.

Do not implement generic SaaS behavior in the Pet Pawket app until a separate productization scope is approved.
