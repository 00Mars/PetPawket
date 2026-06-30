# Pet Pawket Care Support Data Boundaries

Last updated: 2026-05-08

Status: internal implementation guardrail. Not legal advice. Not a schema. Not API approval. Not launch approval.

This document defines the data boundaries Pet Pawket must preserve before any future database, API, account, checkout, support, Pawket Pal, HeartCode, or analytics work is built for the care-support ecosystem.

The goal is simple: care can feel connected to customers, but the underlying data must stay separated, private, reviewable, and truthful.

## Required Source Documents

Read these first:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Related program and copy drafts:

- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`

## Non-Negotiable Boundaries

- Pawket Care Credit records must stay separate from CHARM Emergency Assistance records.
- CHARM Emergency Assistance records must stay separate from insurance referral records.
- Insurance referral records must stay separate from rewards, charity, story, and pet-profile records.
- Story consent records must stay separate from rewards, assistance, referral, purchase, and Pawket Pal records.
- HeartCodes must not encode private medical, assistance, family hardship, insurance, rescue, adoption, memorial, or account data.
- Pawket Pals must not expose private support records or imply support eligibility.
- Charm must never be used as a sample case, seed record, placeholder, demo applicant, public reward, or generic support story.
- Public payloads must never expose private veterinary, rescue, adoption, memorial, assistance, insurance, family hardship, or account-sensitive data.
- No data model may imply insurance, guaranteed support, guaranteed payment, or guaranteed future eligibility for Pawket Care Credit or CHARM Emergency Assistance.

## Domain Separation Map

| Domain | Purpose | Must stay separate from | Public exposure |
| --- | --- | --- | --- |
| Account identity | Customer login and profile identity | Private story detail, assistance records, insurance data | Minimal customer-controlled account fields only |
| Pet profiles | Customer pet care and story context | Assistance eligibility, insurance referral data, public Pal releases | Private by default |
| Story and journal content | Customer memories, care notes, adoption, rescue, memorial, and story trail content | Rewards ledger, assistance review, insurance referrals | Private unless consented and reviewed |
| Story consent | Rights and permission state for story use | Raw story content, assistance status, reward value | Consent status only, never private story details |
| Pawket Care Credit | Earned rewards value and program terms | CHARM applications, insurance referrals, private stories | Available balance or safe empty state only after approval |
| CHARM Emergency Assistance | Charitable aid request and review path | Rewards value, insurance referrals, Pawket Pal ownership | Private request status only after approval |
| Licensed Insurance Partners | External partner education/referral path | Rewards value, CHARM assistance, story consent | Partner education only after approval |
| Pawket Pals and HeartCodes | Consent-safe companion identity, story adaptation, perks, and future game links | Private assistance, medical, hardship, and insurance data | Redacted Pal identity and approved public metadata only |
| Pawket Packs, Packets, and Picks | Commerce and reward experiences | Assistance eligibility, insurance referral outcomes | Product and approved reward copy only |
| Heroic Quests and HeartPoints | Participation, kindness, and impact progress | Assistance approval, insurance status, private support details | Badges/progress only after rules approval |
| Support and ops notes | Internal customer support and review handling | Public pages, public Pal metadata, analytics payloads | Internal only |
| Analytics | Aggregated behavior and program performance | Private story, assistance, medical, insurance, and hardship details | Aggregated and privacy-reviewed only |

## Pawket Care Credit Data Boundary

Future Care Credit data may include, after approval:

- Account identifier.
- Terms version.
- Earn event type.
- Earn event reference.
- Earned amount or unit.
- Reversal reference.
- Redemption reference.
- Ledger status.
- Expiration or no-expiration rule.
- Fraud or manual review flag.
- Public-safe balance summary.

It must not include:

- CHARM request details.
- Veterinary diagnosis or treatment details.
- Family hardship narratives.
- Memorial story text.
- Insurance policy, application, quote, or partner-response details.
- Raw private journal or story text.
- Any field named or framed as a claim, coverage, premium, deductible, reimbursement, or emergency payment for Care Credit.

Public account payloads, if later approved, should expose only:

- Safe available balance.
- Safe pending state.
- Program terms version.
- Safe redeem path labels.
- Clear not-insurance disclaimer.

Public account payloads must not expose:

- Fraud flags.
- Internal review notes.
- Private purchase-risk notes.
- Assistance records.
- Insurance referral records.
- Private story or pet medical context.

## CHARM Emergency Assistance Data Boundary

Future CHARM assistance data may include, after approval:

- Applicant account identifier, if account-based.
- Applicant type.
- Pet or animal reference, when needed.
- Request category.
- Request status.
- Review priority.
- Documentation checklist state.
- Mission-fit review state.
- Funding availability state.
- Internal reviewer assignment.
- Outcome state.
- Public story consent reference, if separately granted.

It must not include in public payloads:

- Veterinary records.
- Medical diagnoses.
- Family hardship details.
- Financial hardship details.
- Rescue-sensitive details.
- Adoption-sensitive details.
- Memorial story text.
- Internal reviewer notes.
- Fraud or abuse notes.
- Private documents.
- Insurance referral details.

CHARM support data must not:

- Create Pawket Care Credit value.
- Create insurance referral status.
- Grant Pawket Pal public release rights.
- Grant public story rights.
- Guarantee future assistance.
- Be used as public impact content without a separate consent record.

Safe public/account status labels, if later approved:

- Not started.
- Draft.
- Submitted for review.
- More information requested.
- In review.
- Support offered.
- Unable to support.
- Closed.

Unsafe labels:

- Claim filed.
- Covered.
- Coverage approved.
- Reimbursement pending.
- Guaranteed.
- Denied coverage.

## Licensed Insurance Partner Data Boundary

Future insurance referral data may include, after approval:

- External partner identifier.
- State availability display.
- Outbound click timestamp.
- Disclosure version shown.
- Referring page or campaign.
- Consent to leave Pet Pawket, if required.
- Aggregated referral reporting.

It must not include unless legal/privacy review explicitly approves:

- Insurance application details.
- Policy details.
- Quote details.
- Premiums.
- Deductibles.
- Waiting periods.
- Exclusions.
- Claim details.
- Coverage decisions.
- Partner underwriting decisions.
- Medical data sent to or returned from a partner.

Pet Pawket systems must not:

- Store policy numbers.
- Compare policy benefits as advice.
- Tell customers what insurance to buy.
- Present Pet Pawket as the insurer, seller, broker, underwriter, administrator, or policy advisor unless licensing changes.
- Mix referral status into Care Credit or CHARM assistance eligibility.

## Story Consent Boundary

Story consent is its own domain.

Use `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` for the detailed consent types, role visibility rules, public-surface rules, revocation/hold expectations, and CHERISH/youth boundaries.

It may authorize specific uses such as:

- Private Honorary Pawket Pal creation.
- Public Community Pal adaptation.
- CHARM impact update.
- Social post.
- Product insert.
- Pawket Pass story capsule.
- Pawket Haven future use.

Consent must be:

- Explicit.
- Versioned.
- Use-specific.
- Revocable where policy allows.
- Separate from purchases, rewards, assistance requests, insurance referrals, and customer support.

Consent must not be inferred from:

- A purchase.
- A Pawket Pass claim.
- A CHARM assistance request.
- A Care Credit balance.
- An insurance referral click.
- A Pawket Pal ownership record.
- A support conversation.

## Pawket Pals, HeartCodes, And Game-Layer Boundary

Pawket Pals and HeartCodes may eventually connect to care-support participation through safe, reviewed signals.

Safe future signals could include:

- A generic care-planning badge.
- A CHARM support education badge.
- A HeartPoints contribution milestone.
- A Pawket Pack care-support insert unlock.
- A consent-safe quest completion marker.
- A public, reviewed, redacted CHARM story connection.

Unsafe signals:

- Assistance request status.
- Medical diagnosis.
- Treatment amount.
- Family hardship details.
- Insurance referral status.
- Insurance eligibility.
- Care Credit cash-equivalent promises.
- Any Pal trait implying support eligibility.
- Any HeartCode encoding private support or insurance history.

Pawket Pal public metadata must stay consent-safe and should not expose:

- Private pet profile details.
- Raw story submissions.
- Assistance applications.
- Medical or hardship details.
- Insurance interactions.
- Owner account identity beyond approved display rules.

Charm's private one-of-one Pawket Pal remains protected, private, non-transferable, non-commercial, and never a sample or public reward.

## Account Display Boundary

Future account modules must keep separate lanes:

1. Pawket Care Credit.
2. CHARM Emergency Assistance.
3. Licensed Insurance Partners.

The account UI may later show:

- A safe Care Credit empty state or approved balance.
- A CHARM assistance education or safe request status.
- A licensed partner education card.
- Disclaimers near each lane.
- Links to terms or guidelines.

The account UI must not show:

- One combined "care coverage" card.
- Fake balances.
- Fake eligibility.
- Fake request statuses.
- Fake partner cards.
- Insurance quote or policy data.
- Private assistance details in shared or public contexts.
- Pawket Pal rewards that imply assistance approval.

## Checkout And Commerce Boundary

Checkout may later include care-support copy only after approval.

Future checkout work must keep:

- Purchase records separate from Care Credit ledger records.
- Care Credit earn events separate from CHARM assistance.
- Donations separate from purchases and rewards accounting.
- Pawket Pass attributes separate from support and insurance data.
- Refund and reversal rules explicit before any value is shown.

Checkout must not:

- Promise emergency help from a purchase.
- Promise Care Credit can pay future care needs.
- Promise CHARM assistance.
- Create insurance referral status.
- Add default donations without clear consent.
- Hide disclaimers.
- Convert private story participation into public content.

## Support And Ops Boundary

Support and ops tools must separate:

- Customer support notes.
- CHARM assistance review notes.
- Care Credit ledger review notes.
- Insurance referral routing notes.
- Story consent notes.
- Public story/pal release notes.

Ops tools must not make private support notes available to:

- Public pages.
- Pawket Pal public metadata.
- Pawket Pass public views.
- Pawket Network public listings.
- Customer-visible analytics.
- Unrelated partner portals.

## Public Payload Rules

Before any API exposes care-support data, document:

- Endpoint purpose.
- Lane ownership.
- Allowed fields.
- Forbidden fields.
- Consent dependency.
- Auth requirement.
- Role requirement.
- Cache rules.
- Logging limits.
- Error-message limits.
- Test fixtures that do not use Charm.

Public payloads should prefer:

- Boolean capability flags.
- Safe status labels.
- Redacted display summaries.
- Disclaimer copy references.
- Links to approved pages.

Public payloads should avoid:

- Internal notes.
- Sensitive documents.
- Medical, assistance, hardship, memorial, insurance, or private story detail.
- Numeric values not approved for display.
- Review reasons that could expose sensitive facts.

## Test Data Rules

Test fixtures must use neutral examples:

- "Sample Pet".
- "Demo Family".
- "Example Pawket Pal".
- "Sample Rescue Partner".
- "Care planning demo account".

Test fixtures must not use:

- Charm.
- Real family names without consent.
- Real pet medical stories without consent.
- Real assistance cases without consent.
- Real insurance applications.
- Private memorial stories.
- Plausible-looking fake insurance or assistance approvals.

## Implementation Gate

Before any data work begins:

1. The relevant lane must be approved in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
2. The relevant review notes should be captured in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`.
3. The implementation ticket must appear in `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`.
4. Public copy must come from `docs/PET_PAWKET_COMPLIANCE_COPY.md` or a reviewed successor.
5. Sensitive fields must be listed before schema work starts.
6. Public payload rules must be written before API work starts.
7. Test fixtures must be reviewed for Charm protection and privacy safety.

This document does not approve implementation by itself.
