# Licensed Insurance Partner Requirements Draft

Last updated: 2026-05-07

Status: internal planning draft. Not public partner terms. Not legal advice. Not launch-approved. Licensed insurance partner referrals are not active.

This document defines the requirements Pet Pawket should satisfy before showing any insurance partner card, outbound referral link, affiliate disclosure, state availability note, or account-facing insurance education. Pet Pawket must not underwrite, sell, administer, advise on, or guarantee insurance policies unless the business later becomes properly licensed and appointed.

Use with:

- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

## Program Identity

Working label:

- Licensed Insurance Partners.

Nature:

- Optional external education and referral path.
- Actual pet insurance is handled by licensed insurance providers or agencies.
- Separate from Pawket Care Credit.
- Separate from CHARM Emergency Assistance.
- Separate from Pawket Points, HeartPoints, HeartCodes, Pawket Pals, and Pawket Passes.

Required customer boundary:

> Pet insurance is offered by licensed insurance providers or agencies, not Pet Pawket. Pet Pawket does not underwrite, sell, administer, or guarantee insurance policies. Coverage, eligibility, premiums, exclusions, deductibles, waiting periods, claims, and benefits are determined by the insurance provider.

## Current Status

Licensed insurance partner referrals are not active.

Current public behavior:

- `public/pet-care-planning.html` explains insurance referrals as a planned licensed-partner lane.
- No partner cards exist.
- No outbound referral links exist.
- No referral tracking exists.
- No state availability logic exists.
- No insurance applications, quotes, policy comparisons, or policy data exist in Pet Pawket.

## Partner Eligibility Requirements

Before a partner appears publicly, Pet Pawket must collect and review:

- Legal business name.
- Public brand name.
- Licensed provider, agency, or brokerage status.
- License numbers or other licensing proof, where appropriate.
- Jurisdictions served.
- Whether the partner is a carrier, agency, broker, marketplace, or other entity type.
- Approved description of the partner's role.
- Approved customer support and service contact path.
- Partner privacy policy URL.
- Partner terms URL.
- Approved disclosure language.
- Advertising or brand-use requirements.
- Whether referral or affiliate compensation exists.
- Whether state-specific restrictions apply.
- Whether partner review of Pet Pawket copy is required.

Do not publish a partner card until licensing, disclosure, compensation, privacy, and copy review are complete.

## State Availability Requirements

Before showing state availability:

- Confirm the partner's availability by state or jurisdiction.
- Confirm whether availability changes by product, species, age, or other factors.
- Confirm how often availability must be refreshed.
- Confirm whether Pet Pawket is allowed to display state availability.
- Confirm whether state selection creates licensing or solicitation concerns.

Safe display language:

> Availability is determined by the licensed insurance partner.

Avoid:

- "You qualify."
- "Your pet is covered."
- "This plan is available for your pet."
- "Pet Pawket approved your insurance option."

## Referral Disclosure Requirements

Before outbound referral links exist:

- Legal review must decide whether referral compensation or affiliate disclosure is required.
- Partner review must approve any required disclosure.
- The disclosure version must be recorded in the implementation plan before tracking exists.
- The disclosure must be visible near the outbound action, not hidden only in footer copy.

Potential disclosure fields for future implementation:

- Disclosure version.
- Partner id.
- Jurisdiction selected, if any.
- Outbound link id.
- Timestamp.
- Customer acknowledgment state, if required.

No tracking should be implemented until privacy, affiliate, and partner rules approve it.

## Public Partner Card Requirements

Every future partner card should include:

- Partner name.
- Licensed partner framing.
- External-link cue.
- Availability note, if approved.
- Disclosure, if required.
- Insurance referral disclaimer.
- Clear statement that insurance details belong with the partner.

Safe CTA labels:

- Visit Licensed Partner.
- Learn From Licensed Partner.
- Continue To Partner.
- Review Partner Options.

Avoid CTA labels:

- Get Covered.
- Start Coverage.
- File A Claim.
- Get Reimbursed.
- Protect My Pet Now.
- Choose Best Policy.

## Prohibited Pet Pawket Behavior

Pet Pawket must not:

- Quote premiums.
- Recommend a policy.
- Rank partners as best unless legal/licensing review explicitly approves the criteria and display.
- Compare policy benefits in a way that requires licensing.
- Explain exclusions, deductibles, waiting periods, or claims as Pet Pawket advice.
- Collect insurance applications.
- File insurance claims.
- Store policy details.
- Store application decisions.
- Store claim outcomes.
- Guarantee partner availability or outcome.
- Present Pawket Care Credit or CHARM assistance as insurance.

## Data Handling Requirements

Default safe posture:

- Do not store policy details.
- Do not store application details.
- Do not store claim details.
- Do not store insurance eligibility decisions.
- Do not store payment or premium details.
- Do not combine referral data with CHARM assistance records.
- Do not combine referral data with Pawket Care Credit ledger records.

Potential minimal referral metadata after approval:

- Account id, if signed in and tracking is approved.
- Partner id.
- Disclosure version.
- Timestamp.
- Outbound link id.
- State or jurisdiction selected, if approved.
- Consent or acknowledgment state, if required.

## Account Display Requirements

Before launch, account display may say:

> Licensed insurance partner referrals are not active yet. For families who want actual pet insurance, Pet Pawket may later provide education or links to licensed insurance providers or agencies.

After launch, account display may include:

- Approved partner cards.
- External-link cue.
- Jurisdiction note, if approved.
- Referral disclosure, if required.
- Insurance referral disclaimer.

Account display must not include:

- Policy status.
- Coverage status.
- Claim status.
- Premium estimate.
- Deductible estimate.
- Benefit estimate.
- Pawket Care Credit balance in the same status lane.
- CHARM assistance request state in the same status lane.

## Relationship To Care Credit And CHARM

Licensed Insurance Partners must remain separate from Pawket Care Credit and CHARM Emergency Assistance.

Do not:

- Suggest Care Credit replaces insurance.
- Suggest CHARM assistance replaces insurance.
- Suggest insurance referral completion affects CHARM eligibility.
- Suggest insurance referral completion earns Care Credit unless a separate legally approved reward rule exists.
- Use one combined "protection" panel for all three lanes.

## Copy Review Checklist

Before publishing insurance referral copy:

- Does it state that insurance is handled by licensed partners?
- Does it avoid making Pet Pawket sound licensed unless that changes?
- Does it avoid policy advice?
- Does it avoid premium, benefit, waiting period, deductible, exclusion, or claim advice?
- Does it include the insurance referral disclaimer near the action?
- Does it explain that Care Credit and CHARM assistance are separate?
- Does it avoid fear or pressure?
- Does it avoid implying that buying products, donating, earning points, or owning Pals changes insurance eligibility?

## Legal And Partner Review Questions

- Which partner types are allowed: carrier, agency, broker, marketplace, or affiliate?
- Does Pet Pawket need any licenses, appointments, or registrations for the referral model?
- Is referral compensation allowed by state?
- What affiliate disclosures are required?
- What state availability language is approved?
- Can Pet Pawket store outbound referral metadata?
- Is customer acknowledgment required before leaving Pet Pawket?
- What partner copy requires approval?
- What support questions must be routed to the licensed partner?
- What privacy policy changes are required?

## Implementation Blockers

Do not implement:

- Partner cards.
- Outbound referral links.
- Referral tracking.
- State availability filters.
- Insurance partner account modules.
- Insurance comparison UI.
- Quote, application, or claim handoff logic.

Until:

- Partner licensing is reviewed.
- Disclosure rules are approved.
- Compensation rules are approved.
- Privacy review is complete.
- Partner copy is approved.
- Support routing is defined.

## Draft Acceptance Checklist

Before this draft can become implementation-ready:

- Legal review completed.
- Insurance licensing review completed.
- Partner review completed.
- Affiliate/referral disclosure review completed.
- Privacy review completed.
- State availability rules approved.
- Tracking rules approved.
- Public card copy approved.
- Support FAQ approved.
