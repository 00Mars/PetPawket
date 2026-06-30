# Pet Pawket Finance Compliance Notes

Last updated: 2026-05-26

Status: internal compliance planning notes. Not legal advice, accounting advice, tax advice, insurance advice, charity compliance approval, investor disclosure approval, or public terms.

## Current Compliance Posture

The finance foundation is allowed only as documentation, static example data, and a non-live internal prototype.

The following are not active:

- Pawket Care Credit ledger.
- Pawket Care Credit balance.
- Pawket Care Credit earn or redemption.
- CHARM Emergency Assistance intake.
- CHARM assistance review queue.
- CHARM assistance payment or disbursement.
- Licensed insurance partner cards.
- Insurance referral tracking.
- Public care-support discovery.
- Customer account care-support modules.
- Checkout care-support hooks.

The care-support decision log remains the approval source of truth.

## Required Short Disclaimer

Not insurance. No guaranteed coverage. Pawket Care Credit is a rewards program. CHARM Emergency Assistance is charitable aid subject to eligibility, program guidelines, and available funds. Pet insurance, where available, is offered only through licensed insurance partners.

## Pawket Care Credit Review Items

Before implementing a live Care Credit ledger or liability report:

- Rewards or stored-value classification.
- Gift card or consumer-credit implications.
- Expiration and breakage.
- Refund and chargeback reversals.
- Fraud controls.
- Terms acceptance.
- Tax and accounting treatment.
- Liability recognition.
- Customer account display language.
- Whether external provider redemption is allowed.
- Whether any pet-care or veterinary redemption could be interpreted as insurance.

Care Credit must not promise coverage, emergency payment, reimbursement, guaranteed veterinary payment, or guaranteed pet-care support.

## CHARM Assistance Review Items

Before implementing live CHARM assistance records:

- CHARM entity and charity status.
- Fundraising registration.
- Restricted fund handling.
- Applicant eligibility.
- Assistance categories.
- Documentation requirements.
- Disbursement method.
- Direct provider payment rules.
- Privacy and consent.
- Support/ops capacity.
- Public impact proof and story consent.
- Donor acknowledgment requirements.

CHARM assistance must stay charitable aid, not insurance, not a claim path, and not guaranteed support.

## Insurance Referral Review Items

Before implementing partner cards or outbound referral tracking:

- Licensing requirements.
- Partner eligibility.
- State availability display.
- Referral compensation or affiliate disclosure.
- Partner copy approval.
- Privacy policy updates.
- Tracking limits.
- Data retention.
- Customer acknowledgment, if required.

Pet Pawket must not quote premiums, recommend policies, collect applications, compare benefits as advice, handle claims, store policy data, or guarantee partner outcomes unless future licensing and review explicitly allow it.

## Tax And Accounting Review Items

Before live reporting:

- Revenue recognition.
- Sales tax collected and remitted.
- Shipping revenue and shipping expense treatment.
- Discount and coupon accounting.
- Refund and chargeback treatment.
- COGS methodology.
- Inventory valuation.
- Pawket Pick cost classification.
- Donation pledge timing.
- Donation payable versus donation transferred.
- Restricted and unrestricted fund treatment.
- Care Credit liability treatment, if approved later.
- Contractor/vendor payment documentation.
- Owner contribution and draw handling.

## Privacy And Data Review Items

Finance records can become sensitive when they connect to stories, assistance, insurance, pet profiles, medical needs, or family hardship.

Before live implementation:

- Define public payload fields.
- Define internal role visibility.
- Keep story consent separate.
- Keep support notes internal.
- Keep assistance records private.
- Keep insurance referral metadata minimal.
- Keep HeartCodes free of private data.
- Aggregate analytics.
- Define retention and correction rules.

## Public Reporting Review Items

Before any public impact report:

- Confirm source records.
- Confirm donor restrictions.
- Confirm donation transfer status.
- Confirm impact outcome proof.
- Confirm consent for any story, image, name, rescue, shelter, or family details.
- Confirm public copy does not overstate assistance, insurance, or impact.
- Record public claims in the promise ledger or impact proof ledger.

## Investor Reporting Review Items

Before investor use:

- Confirm metric definitions.
- Confirm period boundaries.
- Confirm exclusions.
- Confirm revenue, margin, CAC, LTV, churn, runway, and subscription definitions.
- Confirm mission-adjusted metrics are clearly labeled.
- Confirm projections and scenarios are not presented as actuals.

## Charm Protection

Charm is the protected memorial/origin figure. Do not use Charm as:

- A finance sample customer.
- A sample pet.
- A sample applicant.
- A sample rescue case.
- A fake donor.
- A mock assistance recipient.
- A Pawket Pal finance fixture.
- A generic public impact example.

## Desktop App Security Review Items

Before implementation:

- Define Pawket Admin account authorization separately from ordinary customer auth.
- Define encrypted local storage requirements.
- Define encrypted connector node protocol.
- Define export permission levels.
- Define audit logging for view, sync, import, export, report, close, correction, and rule changes.
- Confirm no finance seed data or export endpoint is served from `public/`.
