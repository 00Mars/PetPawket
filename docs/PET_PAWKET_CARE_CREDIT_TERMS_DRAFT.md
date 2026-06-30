# Pawket Care Credit Terms Draft

Last updated: 2026-05-07

Status: internal planning draft. Not public terms. Not legal advice. Not launch-approved. Pawket Care Credit is not active.

This document is the first working draft for Pawket Care Credit program terms. It must be reviewed by legal, tax/accounting, consumer-protection, payments, privacy, and product leadership before engineering builds a ledger, account balance, redemption path, checkout behavior, or customer-facing terms page.

Use with:

- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

## Draft Program Identity

Working public name:

- Pawket Care Credit.

Nature:

- Rewards-based credit program.
- Earned rewards value.
- Account-bound value inside the Pet Pawket ecosystem, if approved.
- Not insurance.
- Not cash.
- Not a donation.
- Not CHARM Emergency Assistance.
- Not a pet insurance referral.

Safe customer framing:

> Pawket Care Credit is planned as earned rewards value for eligible Pet Pawket activity. It may be redeemed only under future program terms after the program is reviewed and launched.

Required boundary:

> Pawket Care Credit is a rewards-based credit program, not insurance. Credits are earned through eligible Pet Pawket purchases and participation and may be redeemed only according to Pet Pawket's program terms. Pawket Care Credit does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.

## Current Status

Pawket Care Credit is not active.

Current public behavior:

- `public/pet-care-planning.html` explains Pawket Care Credit as a planned rewards lane.
- `/account.html` states that no Care Credit balance is active yet.
- No ledger exists.
- No earn rules are active.
- No redemption rules are active.
- No checkout calculation exists.
- No account balance exists.
- No provider or veterinary redemption exists.

## Launch Position

Recommended first launch posture after legal review:

- Account-bound rewards value.
- Earned only through a narrow list of eligible Pet Pawket activity.
- Redeemed only for approved Pet Pawket products or internal Pet Pawket care paths at first.
- No cash-out.
- No transfer.
- No provider, veterinary, emergency, or external-service redemption until separate legal/payments review approves that path.

This starting posture keeps the program useful while reducing confusion with insurance, charitable assistance, or stored-value products.

## Eligibility Draft

Potential eligible participants:

- Pet Pawket customer accounts in good standing.
- Customers who complete eligible purchases while signed in.
- Customers who later attach eligible guest orders to an account, if legal/accounting review approves.

Potential ineligible participants:

- Suspended accounts.
- Accounts involved in fraud, abuse, chargeback misuse, or policy evasion.
- Staff, test, vendor, partner, rescue, shelter, or business accounts unless separate rules allow participation.
- Accounts in jurisdictions where the program cannot be offered.

Open decisions:

- Will guest checkout ever earn Care Credit?
- Will Pawket Network partner accounts earn Care Credit?
- Will rescue or shelter accounts have different rules?
- Will geographic restrictions apply?
- What account verification is required before redemption?

## Eligible Earn Events Draft

Conservative launch candidates:

- Eligible Pet Pawket product purchases.
- Eligible Pawket Pack purchases or subscriptions, once Pawket Packs are active.
- Eligible Pawket Packet purchases, once Pawket Packets are active.
- Eligible Pawket Picks milestones, only after terms define them.

Deferred earn candidates:

- Pawket Pass activity.
- Referrals.
- Heroic Quest completion.
- Story submissions.
- Private journal activity.
- HeartPoint tier milestones.
- CHARM campaign participation.
- Pawket Pal activity.

Deferred earn candidates require additional review because they may affect privacy, consent, tax/accounting, charity compliance, fraud, or customer expectations.

Do not launch as earn events without review:

- CHARM assistance requests.
- Insurance referral clicks.
- Private medical, rescue, adoption, memorial, or hardship stories.
- Donations as direct Care Credit earn events unless charity/tax/accounting review approves the structure.

## Value Calculation Draft

Required decisions before implementation:

- Whether Care Credit is expressed as dollars, points-converted-to-credit, percentage value, fixed-value rewards, or internal non-cash credit.
- Earn rate.
- Rounding rules.
- Minimum earn threshold.
- Maximum earn per order.
- Maximum earn per account period.
- Pending period before value becomes available.
- Expiration rules.
- Reversal rules.
- Terms version tracking.

Recommended first posture:

- Keep Pawket Points and Pawket Care Credit separate.
- If points convert to Care Credit later, require a separate conversion rule and terms version.
- Use a pending state until refund and chargeback windows are defined.
- Keep values non-transferable and account-bound unless legal review says otherwise.

## Ledger State Draft

Future ledger states may include:

- Pending.
- Available.
- Redeemed.
- Reversed.
- Expired, if expiration is approved.
- Held for review.
- Voided.

Each ledger event should preserve:

- Account id.
- Source event id.
- Source event type.
- Amount or points value.
- Ledger state.
- Terms version.
- Created timestamp.
- Available timestamp, if any.
- Expiration timestamp, if any.
- Reversal source, if any.
- Admin/review note, if any.

No ledger schema should be created until the program rules and legal review gates clear.

## Redemption Draft

Conservative first redemption categories:

- Eligible Pet Pawket products.
- Eligible Pawket Pack purchases, if active and approved.
- Eligible Pawket Packet purchases, if active and approved.
- Approved Pet Pawket add-ons or Pawket Picks, if active and approved.

Deferred redemption categories:

- External partner services.
- Pawket Network providers.
- Veterinary expenses.
- Emergency pet-care expenses.
- Rescue or shelter support.
- CHARM-related support paths.

Do not build deferred redemption categories until legal, payments, tax/accounting, provider contract, and customer-support processes are approved.

Redemption must not:

- Guarantee acceptance by any provider.
- Promise payment for emergencies.
- Imply insurance.
- Offset or replace CHARM assistance.
- Apply to insurance products unless approved by licensed partner/legal review.
- Become a cash-out path.

## Refunds, Returns, And Chargebacks

Required rules:

- Whether earned value is pending until return windows close.
- Whether refunds reverse pending value.
- Whether refunds reverse available value.
- Whether redemption can create a negative balance.
- How partial returns are handled.
- How chargebacks are handled.
- How suspected fraud is reviewed.

Recommended first posture:

- Earned value stays pending until the return/reversal window is defined.
- Refunds and chargebacks reverse related earned value where legally and operationally allowed.
- Accounts with unresolved abuse/fraud review may have earning or redemption paused.

## Expiration And Caps

Required legal/accounting review:

- Whether Care Credit can expire.
- What expiration notice is required.
- Whether state rules limit expiration.
- Whether unused value creates accounting or consumer-protection obligations.
- Whether caps apply per order, month, year, or account lifetime.

No expiration copy should be public until reviewed.

## Account Display Draft

Before launch, account display may say:

> Pawket Care Credit is not active yet. When launched, eligible Pet Pawket activity may earn rewards value under program terms.

After launch, account display may include:

- Available Pawket Care Credit.
- Pending Pawket Care Credit.
- Recent Care Credit activity.
- Terms link.
- Last updated timestamp.
- Short disclaimer.

Account display must not include:

- Covered amount.
- Claim status.
- Policy status.
- Emergency protection amount.
- CHARM assistance eligibility.
- Insurance partner eligibility.

## Customer Support Draft

Support documentation must define:

- How customers ask about missing value.
- How refunds affect value.
- How redemptions are reversed.
- How account closures affect value.
- How suspected fraud or abuse is handled.
- What support cannot promise.

Support must not:

- Tell customers Care Credit will pay for an emergency.
- Tell customers Care Credit replaces insurance.
- Tell customers Care Credit guarantees CHARM assistance.
- Tell customers private story activity creates financial entitlement.

## Privacy And Data Draft

Care Credit data should not expose:

- Private pet profiles.
- Journals.
- Core Memories.
- CHARM assistance records.
- Medical, rescue, adoption, memorial, or family hardship details.
- Insurance partner details.

If a story, quest, HeartCode, or Pawket Pal event ever earns value, the ledger should store a source reference and terms version without exposing private story content.

## Ecosystem Connections

Potential later connections:

- Pawket Packs and Packets earn eligible value under terms.
- Pawket Picks unlock approved earn boosts or redemption paths.
- Pawket Passes may become an earn source after referral rules are approved.
- Pawket Pals may show badges or perks that do not imply financial value.
- HeartPoints may influence future tiers only under approved rules.
- Heroic Quests may teach planning without creating guaranteed value.

Connections must not:

- Turn private hardship into rewards value.
- Make Pal ownership imply assistance or insurance.
- Make CHARM support a Care Credit entitlement.
- Use Charm's private one-of-one Pal as a public reward.

## Legal Review Questions

- Does the program create stored-value, gift-card, unclaimed-property, or consumer-credit obligations?
- Can rewards value expire, and under what notice rules?
- Are caps required?
- How should refunds and chargebacks reverse value?
- Can rewards value ever be used for external provider services?
- Could any veterinary or emergency redemption be interpreted as insurance?
- What tax/accounting treatment applies to earned and redeemed value?
- What terms acceptance is required?
- What privacy-policy updates are required?

## Implementation Blockers

Do not implement:

- Ledger schema.
- Account balance.
- Checkout calculation.
- Earn hooks.
- Redemption.
- Admin adjustments.
- Partner/provider redemption.
- Veterinary/emergency redemption.

Until:

- Program terms are approved.
- Legal/accounting gates clear.
- Data model is approved.
- Support and reversal rules exist.
- Public copy is approved.

## Draft Acceptance Checklist

Before this draft can become implementation-ready:

- Legal review completed.
- Accounting/tax review completed.
- Consumer-protection review completed.
- Payments/refund review completed.
- Privacy review completed.
- Terms versioning approved.
- Earn rules approved.
- Redemption rules approved.
- Account copy approved.
- Support process approved.
