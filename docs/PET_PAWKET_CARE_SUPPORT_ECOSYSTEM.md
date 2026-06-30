# Pet Pawket Care Support Ecosystem

Last updated: 2026-05-08

This document defines the planned care-support ecosystem for Pet Pawket. It is product and implementation guidance, not legal advice. Pawket Care Credit, CHARM Emergency Assistance, and insurance referral workflows require legal, insurance, charity, tax, accounting, consumer-protection, privacy, and payments review before launch.

## Core Principle

Care has layers.

Pet Pawket can support families through earned rewards value, charitable assistance, and education/referrals to licensed insurance partners. These lanes should work together emotionally, but they must stay separate legally, operationally, and in customer-facing copy.

The three care-support lanes are:

1. Pawket Care Credit: rewards and loyalty value earned through eligible Pet Pawket activity.
2. CHARM Emergency Assistance: charitable aid for urgent animal-care and rescue-medicine needs, subject to program rules and available funds.
3. Pet Insurance Referrals: optional education and referral paths to licensed insurance providers or agencies.

Short combined disclaimer:

> Not insurance. No guaranteed coverage. Pawket Care Credit is a rewards program. CHARM Emergency Assistance is charitable aid subject to eligibility, program guidelines, and available funds. Pet insurance, where available, is offered only through licensed insurance partners.

## Where This Should Live

Documentation first:

- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md` is the source of truth for lane separation and implementation planning.
- `docs/PET_PAWKET_COMPLIANCE_COPY.md` is the reusable public-copy bank.
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md` is the launch-gate and implementation-order checklist for future care-support buildout.
- `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` is the current guardrail for future-facing scaffold work that must stay unimplemented on the active site.
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md` is the product/ops decision template for future Care Credit terms, CHARM assistance guidelines, and insurance partner requirements.
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`, `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`, and `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md` are internal, non-launch drafts for the three care-support lanes.
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md` is the internal legal/compliance review index.
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md` is the internal inventory for current public links, labels, CTAs, search metadata, account/CHARM handoffs, held discovery points, allowed current behavior, blocked labels, and QA checks.
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md` is the internal guardrail for data separation, public payloads, account display, checkout, support tools, Pawket Pals, HeartCodes, analytics, and test fixtures.
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` is the internal guardrail for consent types, sensitive data visibility, public story use, CHARM impact stories, Pal/HeartCode story use, support access, analytics, and revocation/hold expectations.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` is the process map for owner nomination, roster updates, dispatch, send status, return intake, and decision-log transfer.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md` is the structured reviewer worksheet for notes, blockers, and proposed status changes.
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md` is the internal support and ops language draft.
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md` is the gated future ticket sequence and does not approve implementation by itself.
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` is the reusable ticket shape for future care-support review, copy, design, planning, implementation, QA, and documentation work.
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` is the approval-state source of truth for lanes and tickets.
- `docs/PET_PAWKET_CANON.md` records stable ecosystem canon.
- `docs/PET_PAWKET_CURRENT_STATE.md` records what is planned versus implemented.

Future public surfaces:

- A static `Pet Care Planning` page or section can explain the three lanes without collecting applications, calculating rewards, comparing policies, or implying coverage.
- `public/pet-care-planning.html` currently exists as a direct dormant review preview. It is held out of active site discovery while review is pending and does not launch Care Credit, CHARM assistance intake, insurance referrals, or care-support account logic.
- `public/careSupportFuture.js` currently exists as a dormant, non-imported future registry. It must not be imported into active pages or routes until the decision log approves the relevant scope.
- `/account.html` can later show earned Pawket Care Credit balance, safe redemption paths, and CHARM assistance education, but only after terms, ledger rules, and compliance controls exist. It currently should not link to the dormant preview.
- `/charm.html` can later link to CHARM Emergency Assistance guidelines and application intake after charity eligibility and review process are defined. It currently should not link to the dormant preview.
- `/pawket-network.html` can later show approved provider/service redemption or partner paths, without implying a listed provider is covered or guaranteed.
- `/pals.html`, `/loop.html`, Pawket Packs, Pawket Packets, and Pawket Picks can later earn or boost points/credits only through defined terms.

Do not add database schemas, API endpoints, reward calculations, assistance applications, insurance comparisons, partner forms, or checkout rules until those rules are reviewed and approved.

## Lane A: Pawket Care Credit

### Definition

Pawket Care Credit is a rewards-based credit program. Customers may earn credit through eligible Pet Pawket purchases, Pawket Pack subscriptions, Pawket Packet orders, Pawket Picks milestones, participation, referrals, HeartPoint tiers, Heroic Quests, or other program-defined actions.

Pawket Care Credit is not insurance.

### Customer-Facing Purpose

Pawket Care Credit helps families turn everyday care, shopping, and participation into flexible support value inside the Pet Pawket ecosystem.

Suggested customer language:

> Pawket Care Credit is earned rewards value you can carry forward for eligible Pet Pawket care paths.

> Care has layers. Pawket Care Credit helps your everyday Pet Pawket activity become flexible support for future eligible needs.

### Internal Mechanics

Future implementation should treat Pawket Care Credit as a rewards ledger, not a benefit plan or insurance reserve.

Possible internal fields later:

- Account id.
- Credit event id.
- Earned amount or points-to-credit conversion.
- Source activity.
- Eligibility period.
- Expiration state, if any.
- Redemption category.
- Redemption transaction id.
- Terms version.
- Refund/reversal link.
- Fraud-review state.
- Admin notes.

The ledger must be auditable, reversible where needed, and tied to published program terms.

### What It May Do

Pawket Care Credit may eventually:

- Show an earned available balance in the account dashboard.
- Apply toward eligible Pet Pawket products.
- Apply toward Pawket Packs, Pawket Packets, or Pawket Picks where terms allow.
- Apply toward approved partner-service redemptions where contracts allow.
- Apply toward eligible pet-care expenses up to the customer's earned available balance, if a compliant redemption workflow is approved.
- Be influenced by HeartPoint tiers or Heroic Quest participation after accounting rules are defined.
- Connect to HeartCodes or Pawket Pals as perks, milestones, or unlocks.

### What It Must Not Do

Pawket Care Credit must not:

- Promise coverage.
- Promise reimbursement.
- Promise emergency payment.
- Promise payment for veterinary bills, illness, injury, emergencies, or any pet-care need.
- Use insurance terms such as policy, premium, deductible, covered condition, benefits, claim, or underwriting.
- Be marketed as a substitute for insurance.
- Create an application or claims process that resembles insurance.
- Guarantee acceptance by providers.
- Use the phrase "deposit" unless legal review approves it.

### Safe Terms

Use:

- Pawket Care Credit.
- Earned rewards value.
- Available balance.
- Eligible redemption.
- Redeem.
- Flexible care support.
- Pet Care Planning.
- Program terms.
- Care Reserve as an emotional phrase only, not the legal product name.

### Prohibited Or Risky Terms

Avoid:

- Insurance.
- Coverage.
- Claim.
- Premium.
- Deductible.
- Policy benefit.
- Covered condition.
- Reimbursement guarantee.
- Emergency protection plan.
- Underwritten.
- Deposit.
- Guaranteed payment.

### Sample Customer Copy

> Pawket Care Credit is earned through eligible Pet Pawket activity and may be redeemed under program terms for approved care paths.

> Your available balance can help with future eligible Pet Pawket purchases, partner paths, or other approved care needs. It is rewards value, not insurance.

Required disclaimer:

> Pawket Care Credit is a rewards-based credit program, not insurance. Credits are earned through eligible Pet Pawket purchases and participation and may be redeemed only according to Pet Pawket's program terms. Pawket Care Credit does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.

### Account And Dashboard Implications

Future account UI should separate:

- Pawket Points: practical reward points.
- HeartPoints: emotional/impact progress.
- Pawket Care Credit: rewards value available for eligible redemption, if launched.
- CHARM assistance requests: charitable aid status, if launched.
- Insurance partner referral links: optional external licensed partner paths.

Account copy should always show:

- Available balance language, not coverage language.
- Program terms link.
- Short disclaimer.
- Last-updated or terms-version note.
- Clear separation from CHARM and insurance.

### Future Implementation Notes

Recommended order:

1. Legal/accounting review of rewards terms.
2. Define earn events, eligible purchases, caps, expiration, refund handling, and reversals.
3. Add internal ledger schema and tests.
4. Add admin review/reversal tools.
5. Add account balance display.
6. Add redemption only after approved redemption categories are defined.
7. Add Pawket Pal, Pack, Packet, Pick, HeartPoint, and Heroic Quest earn hooks only after the ledger is stable.

### Compliance Notes Requiring Legal Review

- Rewards value treatment.
- Gift card/stored value implications.
- Expiration and breakage rules.
- State consumer-protection rules.
- Tax/accounting treatment.
- Refund/reversal obligations.
- Fraud controls.
- Whether any veterinary-expense redemption could be interpreted as insurance.
- Provider contracts for partner redemptions.

## Lane B: CHARM Emergency Assistance

### Definition

CHARM Emergency Assistance is charitable assistance from Caring Hearts for Animal Rescue and Medicine. It may support urgent animal-care needs, rescue medicine, family pet-retention emergencies, shelter or rescue partner needs, and other mission-aligned support.

CHARM Emergency Assistance is not insurance.

Charm is the heart of CHARM. Copy should honor the mission without using Charm as a generic sample pet or public case.

### Customer-Facing Purpose

CHARM Emergency Assistance helps carry love forward when a family, rescue partner, or animal-care situation needs urgent support and fits the program mission.

Suggested customer language:

> CHARM Emergency Assistance is charitable aid for urgent animal-care needs, reviewed with care and guided by available funds.

> When care becomes heavy, CHARM may be able to help through a mission-guided assistance request.

### Internal Mechanics

Future implementation should treat CHARM assistance as charity intake and review, not an insurance claim.

Possible internal fields later:

- Request id.
- Applicant type: family, rescue partner, shelter, community member, internal referral.
- Animal/pet context.
- Urgency category.
- Requested support type.
- Mission-fit category.
- Consent/privacy flags.
- Required documentation.
- Review status.
- Approved amount or support type, if any.
- Fund/source campaign.
- Payment/disbursement destination.
- Verification notes.
- Follow-up story consent, separate from assistance.

### What It May Do

CHARM Emergency Assistance may eventually:

- Provide an application or request form.
- Support urgent veterinary care, rescue medicine, emergency transport, temporary boarding, family pet-retention needs, or shelter/rescue support where guidelines allow.
- Route requests to an ops review queue.
- Track available funds and campaign restrictions.
- Connect approved assistance to consent-safe CHARM impact receipts.
- Award HeartPoints or Heroic Quest progress for community support, without implying assistance eligibility.
- Inspire future Community Pawket Pals only after separate story consent.

### What It Must Not Do

CHARM Emergency Assistance must not:

- Guarantee help.
- Guarantee payment.
- Use claim language.
- Use coverage language.
- Promise reimbursement.
- Operate as a substitute for insurance.
- Publish private medical, rescue, memorial, or family hardship details without consent.
- Use Charm as a generic applicant, case, or placeholder.
- Promise that purchases or donations make a specific user eligible for future assistance.

### Safe Terms

Use:

- CHARM Emergency Assistance.
- Charitable assistance.
- Apply.
- Request assistance.
- Program guidelines.
- Eligibility.
- Mission fit.
- Available funds.
- Review.
- Support.
- Aid.
- Family pet-retention support.
- Rescue medicine.

### Prohibited Or Risky Terms

Avoid:

- Claim.
- Coverage.
- Policy.
- Premium.
- Deductible.
- Covered emergency.
- Guaranteed reimbursement.
- Guaranteed payment.
- Emergency protection.
- Benefit entitlement.

### Sample Customer Copy

> CHARM Emergency Assistance is a charitable aid path for urgent animal-care and rescue-medicine needs. Requests are reviewed with care, privacy, and mission fit in mind.

> Assistance depends on eligibility, program guidelines, available funds, and the needs CHARM is able to support at that time.

Required disclaimer:

> CHARM Emergency Assistance is a charitable assistance program, not insurance. Assistance may be available through an application process and is subject to eligibility, mission fit, available funds, and program guidelines. CHARM Emergency Assistance does not provide guaranteed coverage, reimbursement, or payment for veterinary expenses, emergencies, illness, injury, or any other pet-care need.

### Account And Dashboard Implications

Future account UI should:

- Show CHARM assistance as a request/application lane, not a claim lane.
- Clearly label statuses such as Draft, Submitted, In review, Additional information requested, Approved, Not approved, Closed, or Referred.
- Keep assistance requests privacy-protected.
- Separate assistance status from Pawket Care Credit balance.
- Separate assistance from insurance referrals.
- Avoid showing public story content unless a separate consent workflow grants it.

### Future Implementation Notes

Recommended order:

1. Define CHARM program guidelines.
2. Define eligible request categories and documentation requirements.
3. Define privacy and consent rules.
4. Define review roles, fraud controls, and emergency escalation rules.
5. Build an internal request/intake schema.
6. Build ops review before any public intake is promoted.
7. Build public application only after guidelines, disclaimers, and review capacity exist.
8. Add consent-safe CHARM impact receipts separately from assistance records.

### Compliance Notes Requiring Legal Review

- CHARM entity structure and charitable registration.
- Fundraising disclosures.
- Restricted fund accounting.
- Assistance eligibility rules.
- Anti-discrimination and fairness concerns.
- Tax receipt boundaries.
- Privacy of veterinary/medical/family hardship information.
- Direct payment to providers versus reimbursement to applicants.
- Public story consent and impact reporting.

## Lane C: Pet Insurance Referrals

### Definition

Pet insurance referrals are optional education and referral paths to licensed insurance providers, agencies, or broker partners. Pet Pawket may help customers find licensed partners, but Pet Pawket must not act as insurer, underwriter, seller, broker, administrator, or policy advisor unless the business later becomes properly licensed and appointed.

### Customer-Facing Purpose

Pet insurance referrals help families explore licensed insurance options when they want actual insurance coverage.

Suggested customer language:

> For families who want actual pet insurance, Pet Pawket may introduce licensed insurance partners so policy questions stay with qualified providers.

### Internal Mechanics

Future implementation should treat insurance referral links as external partner referrals unless Pet Pawket becomes licensed.

Possible internal fields later:

- Insurance partner id.
- License/appointment metadata.
- Jurisdiction availability.
- Referral URL.
- Disclosure version.
- Referral timestamp.
- Consent to leave Pet Pawket.
- Affiliate/referral tracking, if approved.
- State availability rules.

### What It May Do

Pet insurance referral lane may:

- Link to licensed providers or agencies.
- Offer general education about planning for pet-care costs.
- Explain that insurance details are handled by licensed partners.
- Show partner availability by state only when reviewed.
- Include affiliate/referral disclosure where required.
- Route users out to a licensed partner for quotes, applications, claims, policy details, and service.

### What It Must Not Do

Pet insurance referral lane must not:

- Quote premiums.
- Recommend a policy.
- Compare policy benefits in a way that requires licensing.
- Explain coverage, exclusions, deductibles, waiting periods, or claim outcomes as Pet Pawket advice.
- Collect applications.
- File claims.
- Imply Pet Pawket guarantees any policy or provider outcome.
- Present Pawket Care Credit or CHARM assistance as insurance.

### Safe Terms

Use:

- Licensed insurance partners.
- Optional referral.
- Learn about insurance options.
- Visit partner.
- Provider determines coverage and eligibility.
- Education.
- Pet Care Planning.

### Prohibited Or Risky Terms

Avoid in Pet Pawket-owned copy:

- We insure.
- Our policies.
- Our coverage.
- We cover.
- File a claim with us.
- Guaranteed reimbursement.
- Best policy.
- Covered conditions.
- Deductibles/premiums/waiting periods except as general items determined by provider.

### Sample Customer Copy

> Pet insurance is a separate path for families who want actual insurance coverage. Pet Pawket may connect you with licensed insurance partners, and those partners handle policy details, applications, claims, premiums, exclusions, deductibles, waiting periods, and benefits.

Required disclaimer:

> Pet insurance is offered by licensed insurance providers or agencies, not Pet Pawket. Pet Pawket does not underwrite, sell, administer, or guarantee insurance policies. Coverage, eligibility, premiums, exclusions, deductibles, waiting periods, claims, and benefits are determined by the insurance provider.

### Account And Dashboard Implications

Future account UI should:

- Place insurance referrals in a clearly labeled external partner lane.
- Show "Licensed Insurance Partners" language.
- Include the insurance referral disclaimer near links.
- Avoid storing policy details unless legal/privacy review approves it.
- Avoid showing insurance status beside Pawket Care Credit or CHARM assistance in a way that makes them look interchangeable.

### Future Implementation Notes

Recommended order:

1. Legal review of referral/affiliate model.
2. Identify licensed partners and allowed jurisdictions.
3. Confirm disclosures and state requirements.
4. Create simple external referral cards with clear disclaimers.
5. Add outbound tracking only if privacy and affiliate rules approve it.
6. Avoid quote/comparison/application functionality unless licensed.

### Compliance Notes Requiring Legal Review

- Insurance producer/broker licensing.
- State-by-state referral and compensation rules.
- Affiliate disclosures.
- Advertising review by insurance partners.
- Privacy and tracking consent.
- Whether any copy could be interpreted as advice, solicitation, or sale.

## Future Ecosystem Connections

### Pawket Pals

Pawket Pals can make care support feel personal without turning private hardship into content.

Future safe connections:

- Heroic Quest badges for learning about Pet Care Planning.
- HeartPoint progress for supporting CHARM campaigns.
- Pawket Pal accessories tied to care-support milestones.
- Community Pawket Pals inspired by consent-safe rescue or support stories after review.
- HeartCodes that authenticate a Pal's identity and preserve provenance.

Do not:

- Tie a Pal's public value to a person's private emergency.
- Publish medical hardship without consent.
- Use Charm's private one-of-one Pal as a public reward.
- Suggest Pal ownership guarantees assistance, credit, or insurance.

### Pawket Packs, Packets, And Picks

Future safe connections:

- Eligible Pawket Pack subscriptions may earn Pawket Care Credit under program terms.
- Pawket Packets can introduce Pet Care Planning gently.
- Pawket Picks can offer care-support education cards or eligible reward boosts.
- Pack inserts can explain CHARM, Care Credit, and insurance referral separation.

Do not:

- Promise that a box purchase creates emergency coverage.
- Hide disclaimers in inserts only; digital pages and account UI need them too.

### Pawket Points And HeartPoints

Future safe connections:

- Pawket Points may remain the practical reward layer.
- HeartPoints may remain the emotional/impact layer.
- Pawket Care Credit may be earned through defined conversion rules only after legal/accounting review.
- HeartPoints may influence kindness tiers, contribution multipliers, or future Pal growth without becoming guaranteed money.

Do not promise redeemable monetary value until terms, accounting, fraud, and consumer-protection controls exist.

### HeartCodes

Future safe connections:

- HeartCodes can record provenance for Pawket Pals, story permissions, Quest participation, and care-support milestones.
- HeartCodes should not encode private medical, emergency, assistance, or insurance information.
- HeartCodes should not imply eligibility for Care Credit, CHARM assistance, or insurance.

### Heroic Quests

Future safe Quest examples:

- Learn the three care-support lanes.
- Build a Pet Care Plan checklist.
- Support a CHARM campaign.
- Nominate a trusted care provider.
- Save emergency contacts.
- Review insurance options through licensed partners.

Quest completion can offer badges, HeartPoints, or safe rewards only under program terms. It must not imply assistance approval or insurance coverage.

### Pawket Haven

Future Pawket Haven can turn planning and kindness into growth:

- A Care Garden area could show a family's completed planning checklist.
- Pawket Pals can gain care-themed accessories through education and participation.
- CHARM support milestones can unlock consent-safe community celebrations.

Do not turn real emergencies into gameplay spectacle.

## Data, Privacy, And Provenance

Care-support data can be sensitive. Treat it with stronger privacy assumptions than ordinary shopping data.

Rules:

- Separate rewards ledger data from CHARM assistance data.
- Separate insurance referral metadata from rewards and charity records.
- Do not store insurance policy details without legal/privacy approval.
- Do not expose veterinary, medical, family hardship, rescue, adoption, or memorial details publicly without explicit consent.
- Store story consent separately from support or assistance records.
- Keep source/provenance for public impact receipts.
- Use review states before public visibility.

## Implementation Guardrails

- Documentation and copy can exist now.
- A direct dormant preview page can exist now if it includes disclaimers, `noindex,nofollow`, and no functional promises.
- A non-imported future registry can exist now only while all feature flags remain disabled.
- Use `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md` before proposing schemas, APIs, account modules, assistance intake, redemption logic, partner cards, or ecosystem integrations.
- Do not add databases, APIs, ledgers, application forms, partner referral tracking, reward calculations, or checkout logic in this pass.
- Do not wire public navigation, footer, search, account, CHARM, or Explore discovery before review. The current posture is direct dormant preview only.
- Keep all three lanes visibly separate.
- Run existing tests and CSS lint after any page or CSS changes.

## Open Questions Before Launch

- What exact actions earn Pawket Care Credit?
- Can Pawket Care Credit expire?
- Can Pawket Care Credit be redeemed outside Pet Pawket products?
- Who funds Care Credit redemption?
- How are refunds, returns, chargebacks, and fraud handled?
- What entity administers CHARM Emergency Assistance?
- What are CHARM assistance eligibility rules?
- Will CHARM pay providers directly or support applicants another way?
- Which insurance partners are licensed and available by state?
- What referral compensation disclosures are required?
- How will privacy and consent be handled for assistance stories and impact receipts?
