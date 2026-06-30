# Pet Pawket Care Support Review Worksheet

Last updated: 2026-05-09

Status: internal reviewer worksheet. Not legal advice. Not public terms. Not launch approval.

This worksheet gives product, legal, compliance, charity, tax/accounting, privacy, payments, insurance, partner, support, and engineering reviewers a single place to record care-support review notes before decisions are transferred into `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.

## How To Use This Worksheet

Use this worksheet during review meetings or async review passes.

1. Review the source documents listed below.
2. Fill the relevant lane sections.
3. Keep all unresolved items as blockers.
4. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` for returned packet answers before treating them as complete.
5. Transfer final decisions into `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
6. Update `docs/PET_PAWKET_CURRENT_STATE.md` after any decision changes implementation status.

Blank fields mean no approval. Notes in this worksheet do not authorize implementation until the decision log is updated.

## Source Documents

Core continuity:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`

Copy and program drafts:

- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`

Decision controls:

- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Current public files to review:

- `public/pet-care-planning.html`
- `public/charm.html`
- `public/account.html`
- `public/footer.html`
- `public/navbar.html`

## Global Review Questions

Reviewer:

Date:

Review role:

Files reviewed:

Related review-tracker rows:

Related review request IDs:

Related review packet ID:

Overall status:

- `pending_review`
- `approved_for_revised_draft`
- `approved_for_implementation_planning`
- `approved_for_build`
- `held`
- `rejected`

Required changes:

- To be completed by reviewer.

Implementation permission:

- None.
- Revised drafting only.
- Technical planning only.
- Build approved for a named ticket only.

Global checks:

- Are Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners clearly separate?
- Does any public copy imply insurance, guaranteed support, or guaranteed payment for Care Credit or CHARM?
- Does any planned UI blend rewards value, charity assistance, and insurance referrals into one product?
- Does the proposed public change match `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`?
- Does any planned data flow mix rewards records, assistance records, story consent, pet profiles, or insurance referral records?
- Does the proposed work preserve the data boundaries documented in `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`?
- Does the proposed work preserve the consent, role visibility, public story, CHARM impact, Pal/HeartCode, analytics, and youth boundaries documented in `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`?
- Has the future ticket been scoped with `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` if work will proceed beyond review?
- Does any copy use guilt, fear, pressure, or exploitative rescue language?
- Is Charm protected from being used as a sample case, applicant, placeholder, public reward, or generic story?
- Are private rescue, medical, memorial, family hardship, assistance, adoption, and insurance details kept private unless a separate consent path exists?

## Public Pet Care Planning Visibility

Current state:

- `public/pet-care-planning.html` is a direct dormant preview.
- Public discovery is held; active shared public surfaces should not link to it.
- No active care-support workflow exists.

Reviewer:

Date:

Status:

Visibility decision:

- Keep visible as-is.
- Keep visible with revised copy.
- Move to footer/support-only discovery.
- Hide until public education language is approved.

Required public copy changes:

- To be completed by reviewer.

Implementation permission:

- No new behavior unless explicitly approved in the decision log.

Decision log section to update:

- Public Pet Care Planning Visibility.

## Pawket Care Credit

Current state:

- Draft terms exist.
- No active balance, ledger, earning, redemption, provider redemption, checkout calculation, or account module exists.

Reviewer:

Date:

Status:

Required review areas:

- Rewards/gift-card/stored-value treatment.
- Consumer-protection requirements.
- Tax/accounting treatment.
- Refund, return, chargeback, and reversal handling.
- Expiration or no-expiration rules.
- Fraud and abuse controls.
- Terms acceptance and versioning.
- Account-bound value rules.
- Launch earn events.
- Launch redemption paths.
- Future external provider redemption limits, if any.

Approved launch posture:

- To be completed by reviewer.

Required changes before technical planning:

- To be completed by reviewer.

Implementation permission:

- No ledger, balance display, earn hook, redemption, checkout calculation, or provider redemption unless the decision log approves a scoped ticket.

Decision log sections to update:

- Pawket Care Credit.
- Pawket Care Credit ledger.
- Checkout And Commerce Hooks, if checkout is affected.
- Account Care-Support Modules, if account UI is affected.

## CHARM Emergency Assistance

Current state:

- Draft guidelines exist.
- No active intake form, request database, review queue, account status, documentation upload, disbursement flow, or public impact automation exists.

Reviewer:

Date:

Status:

Required review areas:

- CHARM entity structure.
- Charity registration and fundraising disclosures.
- Restricted-fund handling.
- Applicant types.
- Support categories.
- Documentation requirements.
- Review roles and escalation paths.
- Direct provider payment or other support method.
- Privacy for veterinary, rescue, family hardship, adoption, medical, and memorial information.
- Public impact reporting boundaries.
- Separate story consent.
- Outcome copy.
- Reconsideration path, if any.

Approved launch posture:

- To be completed by reviewer.

Required changes before technical planning:

- To be completed by reviewer.

Implementation permission:

- No request form, request database, ops queue, account request status, upload path, disbursement path, or automated public impact story unless the decision log approves a scoped ticket.

Decision log sections to update:

- CHARM Emergency Assistance.
- CHARM assistance intake and ops queue.
- Account Care-Support Modules, if account UI is affected.
- Ecosystem Integration, if Pawket Pals, HeartPoints, HeartCodes, quests, Packs, Packets, or Picks are affected.

## Licensed Insurance Partners

Current state:

- Draft partner requirements exist.
- No active partner cards, outbound referral links, referral tracking, state availability display, quote path, application path, comparison tool, or policy data storage exists.

Reviewer:

Date:

Status:

Required review areas:

- Insurance licensing boundaries.
- Partner licensing proof.
- State availability rules.
- Referral or affiliate compensation.
- Required disclosure placement.
- Privacy and tracking limits.
- Support routing.
- Partner-card copy.
- Outbound-link rules.
- Data-retention limits.
- Whether Pet Pawket can display general education before partners are selected.

Approved launch posture:

- To be completed by reviewer.

Required changes before technical planning:

- To be completed by reviewer.

Implementation permission:

- No partner cards, outbound links, referral tracking, state availability display, quote path, application path, comparison tool, support handoff, or policy data storage unless the decision log approves a scoped ticket.

Decision log sections to update:

- Licensed Insurance Partners.
- Account Care-Support Modules, if account UI is affected.

## Support And Ops FAQ

Current state:

- Internal FAQ draft exists.
- It is not approved for customer help pages, account surfaces, email, chat, macros, or support automation.

Reviewer:

Date:

Status:

Required review areas:

- Current not-active answers.
- Future launched-state answers.
- Escalation triggers.
- Customer confusion risk.
- Warm tone without promise language.
- Support routing for insurance questions.
- Privacy-sensitive assistance questions.
- CHARM urgent-case handling.

Approved support posture:

- To be completed by reviewer.

Required changes before public or operational use:

- To be completed by reviewer.

Implementation permission:

- No public FAQ, account-help copy, email template, chat macro, or support automation unless the decision log approves that use.

Decision log section to update:

- Support And Ops FAQ.

## Account, Checkout, And Ecosystem UI

Current state:

- Account currently has no Pet Care Planning handoff, Care Credit balance, assistance request status, partner card, or care-support workflow.
- Checkout has no care-support copy, earn hook, redemption, or assistance promise.
- Pawket Pals, Packs, Packets, Picks, HeartPoints, HeartCodes, Heroic Quests, and Pawket Haven have no active care-support value or eligibility behavior.

Reviewer:

Date:

Status:

Required review areas:

- Account lane separation.
- Data-boundary separation.
- Privacy and consent separation.
- Empty-state language.
- Safe button verbs.
- Checkout copy limits.
- Refund and reversal implications.
- Story consent separation.
- Public payload limits.
- HeartCode privacy.
- Pawket Pal value language.
- Charm protection.

Approved UI posture:

- To be completed by reviewer.

Required changes before technical planning:

- To be completed by reviewer.

Implementation permission:

- No account module, checkout hook, points integration, Pal integration, quest integration, HeartCode integration, Packs integration, Packets integration, or Picks integration unless the decision log approves a scoped ticket.

Decision log sections to update:

- Account Care-Support Modules.
- Checkout And Commerce Hooks.
- Ecosystem Integration.

## Final Review Transfer

Before notes in this worksheet change implementation status:

1. Copy final statuses into `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
2. Add a dated Decision History entry.
3. Update `docs/PET_PAWKET_CURRENT_STATE.md`.
4. Update `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md` blockers only for approved scoped tickets.
5. Update `docs/PET_PAWKET_COMPLIANCE_COPY.md` if public copy changes.
6. Update `docs/PET_PAWKET_CANON.md` if stable product canon changes.

Do not rely on this worksheet alone as approval.
