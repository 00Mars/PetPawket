# Pet Pawket Care Support Privacy And Consent Matrix

Last updated: 2026-05-08

Status: internal privacy and consent planning guide. Not legal advice. Not a privacy policy. Not public terms. Not launch approval.

This document defines how care-support, story, Pawket Pal, HeartCode, CHARM, insurance referral, support, and analytics data should be treated before any future implementation work.

The core rule is that care can be emotionally connected without making private data public.

## Required Source Documents

Read these first:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Related drafts:

- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`

## Privacy Principles

- Private by default.
- Consent must be explicit, use-specific, and recorded separately from content.
- Consent for one use never grants consent for another use.
- Purchases, donations, Pawket Pass activity, Care Credit, CHARM assistance, insurance referral clicks, Pawket Pal ownership, and support conversations do not imply public story consent.
- Real pet stories, rescue stories, adoption stories, medical stories, assistance stories, family hardship details, and memorial stories are sensitive.
- Charm is protected memorial/origin content and must not appear in test fixtures, generic examples, support cases, public rewards, or sample stories.
- Public surfaces should use redacted, reviewed, consent-safe content only.
- Internal access should be role-limited and purpose-limited.
- Analytics should use aggregated, privacy-reviewed data and avoid raw private story, medical, assistance, hardship, and insurance details.
- Consent revocation and correction paths need legal/privacy review before launch.

## Data Sensitivity Matrix

| Data type | Default visibility | Consent needed for public use | Can feed Pawket Pals/HeartCodes | Can feed CHARM impact | Can feed analytics | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Account identity | Private/account | Not normally public | Only approved display handle or account-safe ID | No | Aggregated only | Do not expose legal name by default. |
| Pet profile basics | Private/account | Explicit public pet/profile consent | Yes, only consent-safe basics | Only with separate impact consent | Aggregated only | Species/name may still be personal. |
| Journals/Core Memories | Private/account | Explicit story consent | Only reviewed excerpts or derived traits | Only with separate CHARM/story consent | Aggregated only | Never raw public by default. |
| Adoption story | Private by default | Explicit adoption story consent | Reviewed and redacted only | Reviewed and redacted only | Aggregated only | Protect people, shelters, dates, locations, and animal history. |
| Rescue story | Private/reviewed | Explicit rescue story consent and ops review | Reviewed and redacted only | Reviewed and redacted only | Aggregated only | Avoid exposing active rescue or safety details. |
| Medical or veterinary details | Private/restricted | Strong explicit consent plus legal/privacy review | No raw use | Only high-level reviewed impact language | No raw use | Do not expose diagnosis, documents, costs, or treatment details by default. |
| Memorial story | Private by default | Explicit memorial/story consent | Reviewed and dignity-safe only | Reviewed and dignity-safe only | Aggregated only | Never use grief as pressure. |
| Family hardship details | Private/restricted | Do not use publicly without legal/privacy review | No | No raw use | No raw use | Keep out of Pal, HeartCode, account-public, and marketing surfaces. |
| CHARM assistance request | Private/restricted | Separate public impact consent required | No raw use | Status or story only after approval and redaction | Aggregated only | Requesting help never grants public story rights. |
| CHARM assistance outcome | Private/restricted | Separate public impact consent required | Only generic safe milestone, if approved | Reviewed and redacted only | Aggregated only | Never imply future eligibility. |
| Pawket Care Credit activity | Private/account | Not public | Generic progress only after rules approval | No | Aggregated only | Keep separate from assistance and insurance. |
| Insurance referral activity | Private/restricted | Not public | No | No | Aggregated only | Do not store or expose policy, quote, application, or claim details. |
| Pawket Pass activity | Private/account or link-scoped | Explicit pass/share consent for story content | Generic activity only | No raw support details | Aggregated only | Link access must not expose private pet or support records. |
| Pawket Pal metadata | Private or public depending on class | Depends on Pal class and consent | Yes | Only reviewed public connection | Aggregated only | Public Pal data must be redacted and consent-safe. |
| HeartCode metadata | Link-scoped/private | Depends on use | Yes, but no private sensitive data | Only safe public impact marker | Aggregated only | HeartCodes must not encode sensitive data. |
| Support notes | Internal only | Not public | No | No | Aggregated only | Never leak into customer-facing UI or Pal metadata. |

## Consent Types

### Private Account Use

Purpose:

- Let customers manage their pet profiles, journals, care notes, story trails, and account experiences.

Does allow:

- Private account display.
- Account-owner editing.
- Internal support troubleshooting under role controls.

Does not allow:

- Public story use.
- Public Pawket Pal adaptation.
- CHARM impact story use.
- Marketing use.
- Insurance referral use.
- Partner sharing.

### Share Your Heart Story Consent

Purpose:

- Let a customer, rescue, partner, or staff member submit a story for review.

Does allow:

- Internal review.
- Consent-specific use planning.
- Possible private Honorary Pal creation, if selected.

Does not allow by itself:

- Public posting.
- Community Pal adaptation.
- Limited Edition release.
- CHARM impact report.
- Social media use.
- Partner sharing.
- Market/trading use.

### Private Honorary Pal Consent

Purpose:

- Create a private tribute or certificate-style Pawket Pal for the submitting account.

Does allow:

- Private account display.
- Private certificate or keepsake.
- Internal provenance and HeartCode record.

Does not allow:

- Public collectible release.
- Public story display.
- Commercial use.
- Transfer/trade/market behavior.
- CHARM or CHERISH public connection.

### Public Community Pal Adaptation Consent

Purpose:

- Adapt a reviewed story into a public-facing Community Pal.

Does allow, after ops review:

- Redacted character inspiration.
- Public Pal name or adapted name, if approved.
- Consent-safe personality traits.
- Consent-safe origin category.
- Public Community Pal preview or future release path.

Does not allow:

- Raw story publication.
- Private account identity exposure.
- Medical or hardship detail exposure.
- Assistance status exposure.
- Market/trading behavior unless separately approved.
- Charm as a public or generic reference.

### Limited Edition Release Consent

Purpose:

- Allow a story, rescue milestone, seasonal CHARM moment, shelter partnership, or community event to inspire a limited release.

Does allow, after legal/product/ops review:

- Redacted inspiration language.
- Edition metadata.
- Public release copy.
- HeartCode authenticity metadata.

Does not allow:

- Public release of private details.
- Investment or resale promises.
- Assistance eligibility promises.
- Insurance or support-status signals.
- Use of private Honorary Pals without separate consent.

### CHARM Impact Story Consent

Purpose:

- Let CHARM share a reviewed, dignity-safe impact update.

Does allow:

- Redacted public impact summary.
- Approved image or story excerpt, if separately granted.
- Approved animal/rescue/shelter context.
- Mission-safe follow-up updates.

Does not allow:

- Full assistance record exposure.
- Medical document exposure.
- Family hardship exposure.
- Pawket Pal public release.
- Pawket Pass story capsule.
- Marketing use outside the consent scope.

### Pawket Pass Story Capsule Consent

Purpose:

- Attach a consent-safe story moment to a shareable Pawket Pass or HeartCode experience.

Does allow:

- Link-scoped story snippet.
- Approved card/share language.
- Approved image or icon, if consented.

Does not allow:

- Full pet profile exposure.
- Journal/Core Memory exposure.
- Assistance or insurance detail exposure.
- Broad marketing use outside the pass scope.

### Social Or Marketing Consent

Purpose:

- Allow Pet Pawket to use reviewed story content in public marketing surfaces.

Does allow:

- Approved channel use.
- Approved excerpt or image.
- Approved attribution level.

Does not allow:

- New channels outside the approved scope.
- Sensitive detail expansion.
- Partner sharing unless named.
- Perpetual use unless reviewed and granted.

### Insurance Referral Consent

Purpose:

- Let a customer choose to leave Pet Pawket for a licensed insurance partner path, if referral paths are later approved.

Does allow:

- Showing the required disclosure.
- Opening an approved partner path.
- Recording an outbound click or disclosure version, if approved.

Does not allow:

- Pet Pawket storing insurance application, quote, policy, premium, deductible, waiting-period, exclusion, claim, or coverage decision data.
- Pet Pawket advising on which policy to buy.
- Insurance status feeding Care Credit, CHARM assistance, Pawket Pals, HeartCodes, or public account UI.

## Role Visibility Matrix

| Role or surface | May access | Must not access |
| --- | --- | --- |
| Public visitor | Public pages, redacted public Pal metadata, public Pawket Network listings, public Pet Care Planning copy | Private stories, support notes, assistance data, Care Credit data, insurance referral data, private account data |
| Signed-in account owner | Their own account data, pet profiles, journals, safe Care Credit/account states after approval, safe CHARM request states after approval | Internal review notes, fraud notes, partner data, other users' data |
| Support team | Account troubleshooting data needed for support, approved support macros, escalation paths | Public-release rights by default, raw assistance documents without role approval, insurance application details |
| CHARM reviewers | CHARM request details needed for review, documentation checklist, mission-fit notes | Care Credit ledger internals unless needed and approved, insurance partner details, unrelated private journals |
| Pal/story reviewers | Submitted stories, consent records, redaction notes, Pal adaptation drafts | CHARM assistance details unless separately authorized, insurance referral data, unrelated support notes |
| Partner/insurance provider | Only data the customer gives directly to the partner or data sharing explicitly reviewed and approved | Pet Pawket private stories, assistance data, account data, Pal metadata beyond public pages |
| Engineering | Minimal fixtures and redacted/debug-safe records needed for implementation | Charm as fixture, raw medical/assistance/insurance data, real private stories in tests |
| Analytics | Aggregated event data and privacy-reviewed metrics | Raw story text, medical documents, assistance narratives, insurance application/quote/policy/claim details |

## Surface-Specific Rules

### Account

Account may show private customer-owned data and safe future care-support states only after approval.

Account must not:

- Combine Care Credit, CHARM assistance, and insurance into one product.
- Show fake balances, fake statuses, or fake partner cards.
- Expose internal notes.
- Turn story consent into public use without review.
- Use Pawket Pal rewards to imply assistance eligibility.

### Public Pages

Public pages may show:

- Informational planning copy.
- Disclaimers.
- Redacted public impact stories.
- Redacted public Pal metadata.
- Public Pawket Network listings.

Public pages must not show:

- Private account or pet story data.
- Assistance request details.
- Insurance referral history.
- Raw support conversations.
- Unreviewed CHARM, rescue, adoption, medical, or memorial stories.

### Pawket Pals And HeartCodes

Pawket Pals and HeartCodes may show:

- Consent-safe Pal identity.
- Approved origin category.
- Approved traits.
- Approved public story excerpt.
- Safe quest or impact badges after rules approval.

They must not show:

- Private owner identity.
- Assistance request status.
- Medical details.
- Family hardship details.
- Insurance referral status.
- Raw journal/Core Memory text.
- Charm's private one-of-one Pal as a public collectible or example.

### CHARM

CHARM may use private assistance information internally for review only after program approval.

CHARM public impact must:

- Be separately consented.
- Be redacted.
- Be dignity-safe.
- Avoid pressure, guilt, or shock tactics.
- Avoid exposing medical, financial, family hardship, or identifying details unless explicitly reviewed and approved.

### Analytics

Analytics may measure:

- Page visits.
- Funnel progress.
- Aggregated care-planning interest.
- Aggregated CHARM education interactions.
- Aggregated partner referral clicks, if approved.
- Aggregated Pawket Pal/HeartCode engagement.

Analytics must not collect raw:

- Story text.
- Journal text.
- Medical records.
- CHARM application narratives.
- Family hardship details.
- Insurance application, quote, policy, claim, or coverage decision details.

## Revocation, Correction, And Hold Rules

Future implementation must support a reviewed path for:

- Withdrawing public story consent where policy allows.
- Correcting displayed names, dates, pet details, and attribution.
- Pausing public use while a consent question is reviewed.
- Separating withdrawal of public story use from private account records.
- Keeping legally required internal records private when public display is removed.

When consent is unclear:

- Treat the content as private.
- Do not publish.
- Do not adapt into a public Pal.
- Do not attach to a HeartCode or Pawket Pass.
- Do not use in CHARM impact.
- Do not use in marketing.

## Child, Youth, And CHERISH Boundary

CHERISH is a future/separate companion foundation with human, family, youth, resilience, and happiness focus. Do not collect, process, publish, or adapt youth-centered or child-related data for CHERISH-style programs through Pet Pawket care-support work unless a dedicated legal/privacy/consent review exists.

Pet Pawket care-support, CHARM, and Pawket Pal flows should avoid collecting child data unless it is required, reviewed, and protected by a specific future program design.

## Implementation Gate

Before any feature handles consent-sensitive data:

1. Confirm the lane status in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
2. Record review notes in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`.
3. Confirm data separation in `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`.
4. Identify the consent type.
5. Define who can see the data.
6. Define where the data can appear.
7. Define what must never be displayed.
8. Define revocation or hold behavior.
9. Define safe test fixtures that do not use Charm.
10. Update `docs/PET_PAWKET_CURRENT_STATE.md`.

This document does not approve implementation by itself.
