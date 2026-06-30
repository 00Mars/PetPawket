# Pet Pawket Rewards And HeartCodes

Last updated: 2026-05-15

This document preserves the current rewards, HeartCode, Pawket Pass, care-support, and legal-boundary model. It is product guidance, not legal advice, public terms, accounting approval, or implementation approval.

## HeartCodes

HeartCodes are identity and provenance anchors for Pet Pawket story objects, especially Pawket Pals.

A Pal HeartCode may eventually connect to:

- Pawket Pal ID.
- Pal name.
- Edition.
- Origin category.
- Consent-safe inspired-by metadata.
- Privacy state.
- Owner or guardian account.
- Creation date.
- Story type.
- Game state.
- Quest history.
- Perks.
- Donation or impact tie, where reviewed.
- Transfer history, if controlled transfer is ever approved.

HeartCodes should support authenticity, emotional continuity, ownership/guardianship, anti-theft controls, future game integration, and lineage without exposing private data.

Customer-facing direction:

> Every Pawket Pal carries a HeartCode: a unique mark of the story, love, and legacy it represents.

## Pawket Passes And Loop Contracts

Pawket Passes are the current public launch name for the shareable pass, gift, referral, and impact chain mechanic.

Preserve existing internal Loop contracts unless a coordinated migration is requested:

- `/api/loop/*`
- `loopRoutes.js`
- Loop token database fields.
- `pp_loop_token`
- Existing Loop/impact ledger helpers.

Public UI should generally say Pawket Passes, not Loop Tokens, unless the context is internal implementation.

Pawket Passes must not expose private pet profiles, private journals, assistance records, insurance data, raw story submissions, or unreviewed rescue/memorial details.

## Pawket Points

Pawket Points are the practical rewards layer.

They may eventually be earned through:

- Purchases.
- Pawket Pack subscriptions.
- Pawket Packet orders.
- Pawket Picks milestones.
- Referrals.
- Approved story submissions.
- Events.
- Future Heroic Quests.

They may eventually support:

- Discounts.
- Bonus items.
- Early access.
- Pawket Pal accessories.
- Game perks.
- Account progress.

Do not promise cash value, guaranteed redemption, care-support eligibility, CHARM assistance eligibility, or insurance-like protection until terms and review approve it.

## HeartPoints

HeartPoints are the emotional and impact layer.

They may eventually be earned through:

- CHARM donations or support.
- Future CHERISH donations or support.
- Rescue sponsorships.
- Shelter support.
- Adoption story submissions after review.
- Memorial tributes after consent.
- Heroic Quests.
- Future verified volunteering.
- Kindness in Action community moments.

HeartPoints can influence impact status, Heroic Quest progress, Pal growth, badges, contribution multipliers, and future Pawket Haven moments. They should feel generous and affirming, never guilt-heavy.

HeartPoints must not imply:

- Redeemable money unless approved terms exist.
- Guaranteed Care Credit.
- Guaranteed CHARM assistance.
- Insurance status.
- Public story consent.
- That donations purchase future help.

## Contribution Multiplier Concept

The contribution multiplier is a future loyalty and impact idea: the more a customer contributes to the mission, the more their eligible future purchases may help carry impact.

Example concept:

| Tier | Future purchase contribution concept |
| --- | --- |
| Heartkeeper | 1% of eligible purchases |
| Guardian | 2% of eligible purchases |
| Rescuer | 3% of eligible purchases |
| Legacy Builder | 5% of eligible purchases |
| Lightbearer | 7% of eligible purchases |

This is not approved for launch.

Before implementation, define:

- Eligible purchases.
- Caps.
- Campaign periods.
- Refund and reversal handling.
- Chargeback handling.
- Fraud controls.
- Donation receipt boundaries.
- Tax/accounting treatment.
- Charity compliance.
- CHARM and future CHERISH separation.
- Public copy and disclaimers.

## Pawket Care Credit

Pawket Care Credit is planned rewards-based care credit. It is not insurance.

Possible future earn sources:

- Eligible Pet Pawket purchases.
- Pawket Packs.
- Pawket Packets.
- Pawket Picks milestones.
- Loyalty milestones.
- Approved participation.
- HeartPoint tier multipliers, if legally and operationally approved.

Possible future uses:

- Pet Pawket products.
- Pawket Packs.
- Pawket Packets.
- Approved partner services.
- Approved pet-care needs.
- Emergency pet expenses only up to an earned available balance and only if future terms approve that redemption.

Required disclaimer:

> Pawket Care Credit is a rewards-based credit program, not insurance. Credits are earned through eligible Pet Pawket purchases and participation and may be redeemed only according to Pet Pawket's program terms. Pawket Care Credit does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.

Do not use insurance terms such as claim, premium, policy, coverage, deductible, covered condition, guaranteed reimbursement, benefit, or emergency protection plan.

## CHARM Emergency Assistance

CHARM Emergency Assistance is planned charitable aid, not insurance.

It may eventually support urgent animal-care, rescue medicine, family pet-retention, and mission-aligned partner needs, subject to guidelines and available funds.

Required disclaimer:

> CHARM Emergency Assistance is a charitable assistance program, not insurance. Assistance may be available through an application process and is subject to eligibility, mission fit, available funds, and program guidelines. CHARM Emergency Assistance does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.

Do not imply assistance is guaranteed, that a request is a claim, that a not-approved outcome is denied coverage, or that purchases/donations make a customer eligible.

## Licensed Insurance Partner Referrals

Pet insurance, where offered, belongs to licensed insurance providers or agencies, not Pet Pawket.

Required disclaimer:

> Pet insurance is offered by licensed insurance providers or agencies, not Pet Pawket. Pet Pawket does not underwrite, sell, administer, or guarantee insurance policies. Coverage, eligibility, premiums, exclusions, deductibles, waiting periods, claims, and benefits are determined by the insurance provider.

Pet Pawket must not present itself as insurer, underwriter, broker, seller, administrator, policy advisor, or claims handler unless the business later becomes properly licensed and appointed.

## Three-Lane Care Support Model

Keep these lanes separate:

1. Pawket Care Credit: rewards-based value.
2. CHARM Emergency Assistance: charitable aid.
3. Licensed Insurance Partners: external insurance product/referral path.

Short combined disclaimer:

> Not insurance. No guaranteed coverage. Pawket Care Credit is a rewards program. CHARM Emergency Assistance is charitable aid subject to eligibility, program guidelines, and available funds. Pet insurance, where available, is offered only through licensed insurance partners.

## Current Approval State

As of this documentation pass:

- `public/pet-care-planning.html` exists only as a direct dormant review preview.
- `public/careSupportFuture.js` exists only as a dormant, non-imported registry.
- Public Pet Care Planning discovery is held.
- Pawket Care Credit terms, ledger, earning, redemption, checkout hooks, and account modules are pending review.
- CHARM Emergency Assistance guidelines, intake, ops queue, request status, and disbursement workflow are pending review.
- Licensed Insurance Partner requirements, partner cards, referral links, tracking, and account display are pending review.
- Pawket Pals, HeartCodes, HeartPoints, Pawket Points, Heroic Quests, Packs, Packets, Picks, and Pawket Haven do not currently create care-support value, assistance eligibility, insurance status, or public support records.

Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` as the source of truth before any implementation.
