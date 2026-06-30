# Pet Pawket Care Support Reviewer Brief

Last updated: 2026-05-09

Status: internal reviewer brief. Not legal advice. Not public terms. Not launch approval. Not implementation approval.

This brief is the one-file starting point for reviewers who need to understand the Pet Pawket care-support model, what is active today, what decisions are needed, and where to record outcomes.

## Review Purpose

Pet Pawket is preparing a care-support ecosystem with three separate lanes:

1. Pawket Care Credit: earned rewards value.
2. CHARM Emergency Assistance: charitable aid.
3. Licensed Insurance Partners: optional external education or referral paths to licensed providers or agencies.

The review goal is to decide what may stay visible, what must be revised, what can move into implementation planning, and what must remain held.

This review does not approve engineering work by itself. Any implementation permission must be recorded in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` for a named lane or ticket.

## Current Posture

Active today:

- `public/pet-care-planning.html` is a direct dormant review preview.
- `public/careSupportFuture.js` is a dormant, non-imported future registry with all feature flags disabled.
- Public discovery is held. Active navigation, footer, search metadata, `/account.html`, `/charm.html`, and Explore surfaces should not link to Pet Care Planning while review is pending.
- The public copy separates rewards value, charitable aid, and licensed insurance partner education.
- The page includes non-insurance disclaimers.

Not active today:

- No Pawket Care Credit balance.
- No Pawket Care Credit earning, redemption, ledger, account module, or checkout hook.
- No CHARM Emergency Assistance request form, review queue, status, upload path, disbursement workflow, or public impact automation.
- No licensed insurance partner cards, outbound referral links, referral tracking, quote path, application path, comparison tool, or policy data storage.
- No Pawket Pal, HeartCode, HeartPoint, Pawket Pack, Pawket Packet, Pawket Pick, Heroic Quest, or Pawket Haven behavior creates care-support value, assistance eligibility, insurance status, or public support records.

## Non-Negotiable Boundaries

Pawket Care Credit must remain rewards value only. It must not be described as insurance, coverage, emergency payment, reimbursement, or guaranteed payment for veterinary or pet-care needs.

CHARM Emergency Assistance must remain charitable aid only. It must be subject to eligibility, mission fit, program guidelines, available funds, privacy controls, and separate story consent.

Licensed Insurance Partners must remain external licensed-provider paths only. Pet Pawket must not appear to sell, underwrite, administer, advise on, compare, recommend, or guarantee insurance unless the business later becomes properly licensed and appointed.

Charm is protected memorial/origin content. Charm must never be used as a sample case, applicant, placeholder, fixture, public reward, generic story, or public collectible.

Private pet, rescue, adoption, medical, memorial, hardship, assistance, and insurance data must remain private unless a separate approved consent path exists.

## Source Documents For Review

Start with:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md`

Use as needed:

- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`

## Decisions Needed First

### 1. Public Visibility

Decide whether current Pet Care Planning visibility should:

- Stay visible as-is.
- Stay visible with revised copy.
- Move to footer/support-only discovery.
- Hide until public education language is approved.

Record in:

- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`, if links, labels, CTAs, disclaimers, or page roles change.
- `docs/PET_PAWKET_CURRENT_STATE.md`, if public posture changes.

### 2. Lane Status

For each lane, return exactly one status:

- `pending_review`
- `approved_for_revised_draft`
- `approved_for_implementation_planning`
- `approved_for_build`
- `held`
- `rejected`

Review lanes:

- Pawket Care Credit terms.
- Pawket Care Credit ledger.
- CHARM Emergency Assistance guidelines.
- CHARM assistance intake and ops queue.
- Licensed Insurance Partners.
- Support And Ops FAQ.
- Account Care-Support Modules.
- Checkout And Commerce Hooks.
- Ecosystem Integration.

### 3. Allowed Next Work

For any lane not held or rejected, identify the exact next work allowed:

- Revised drafting only.
- Technical planning only.
- Public-copy revision only.
- Build for a named ticket only.

Blank or vague approval should be treated as no approval.

## Reviewer-Specific Questions

Legal/compliance:

- Does public care-planning copy create promises or regulated-product risk?
- Can Pawket Care Credit be described and operated as rewards value under the proposed rules?
- Does CHARM assistance require entity, registration, fundraising, restricted-fund, or disclosure work before public use?
- Are required disclaimers sufficient and placed close enough to relevant copy?

Tax/accounting/payments:

- Does Care Credit create stored-value, gift-card, rewards, breakage, expiration, refund, chargeback, tax, or accounting obligations?
- Can CHARM support use direct provider payment, applicant support, partner organization support, supplies, or another method?
- What records must be retained for reward value, charitable support, and payments?

Privacy/security:

- Are veterinary, hardship, rescue, adoption, memorial, assistance, and insurance details treated as private enough?
- Are consent types separated from assistance, rewards, insurance referral, Pal, HeartCode, marketing, and public impact uses?
- Are retention, deletion, hold, revocation, and role-visibility requirements clear enough before schema design?

Insurance/partner:

- Can Pet Pawket show education or referral paths without acting as an insurer, seller, broker, underwriter, administrator, or policy advisor?
- What partner licensing proof, state availability, disclosures, referral compensation rules, and outbound tracking limits are required?
- What support questions must always route to licensed partners?

Support/ops:

- Can support safely answer current not-active questions using the FAQ draft?
- Which questions must escalate to legal, CHARM leadership, privacy/security, payments, or licensed partners?
- Is the current warm tone clear without becoming a promise?

Product/engineering:

- Which lanes, if any, can move to technical planning?
- What exact public surfaces may change?
- What data domains remain blocked from schemas, APIs, account payloads, checkout hooks, support tools, analytics, Pawket Pals, HeartCodes, or test fixtures?

## Suggested First Review Agenda

1. Confirm the three-lane model and non-insurance boundaries.
2. Review current public Pet Care Planning visibility.
3. Decide whether held public links can become visible, change, or stay hidden.
4. Review the short combined disclaimer and lane-specific disclaimers.
5. Review current not-active support language.
6. Identify hard blockers for each lane.
7. Use the review handoff to send the correct packet and question IDs to each reviewer group.
8. Mark the relevant review-tracker rows and owners.
9. Record decisions in the worksheet.
10. Transfer final statuses into the decision log using the decision-record template.
11. Name the exact next tickets, if any.

## Required Review Outputs

At the end of review, produce:

- Reviewer name or role.
- Date.
- Files reviewed.
- Decision status for each lane reviewed.
- Required changes.
- Public-surface impact.
- Data-boundary impact.
- Privacy/consent impact.
- Support/ops impact.
- Implementation permission, if any.
- Follow-up owner.

Final approval state belongs in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`. Notes left only in this brief, the worksheet, or meeting notes do not authorize implementation.

## What This Brief Must Not Be Used For

Do not use this brief to:

- Launch Pawket Care Credit.
- Launch CHARM Emergency Assistance intake.
- Launch insurance partner referrals.
- Create schemas, APIs, ledgers, account modules, checkout hooks, partner cards, referral tracking, support tooling, analytics events, or test fixtures.
- Publish support FAQ language publicly without approval.
- Convert private stories, assistance details, or care records into Pawket Pals, HeartCodes, marketing, or public impact stories.

## Next Step After Review

If a lane is approved for revised drafting, update the relevant draft doc and current state.

If a lane is approved for implementation planning, open the next ticket through `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` and link it back to the decision log.

If a lane is approved for build, the decision log must name the exact scope, files, public surfaces, data boundaries, privacy/consent boundaries, tests, and follow-up owner before engineering starts.

If a lane is held or rejected, preserve that boundary in the decision log, current state, public-surface inventory, and backlog.
