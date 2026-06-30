# Pet Pawket Care Support Ticket Template

Last updated: 2026-05-09

Status: internal ticket template. Not legal advice. Not approval to build. Not public terms.

Use this template when opening any future care-support implementation, review, copy, design, QA, or planning ticket. A ticket that does not answer these fields should not move into engineering.

## Required Source Documents

Read these first:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md`
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

Use these when relevant:

- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`

## Ticket Header

Title:

Lane:

- Shared.
- Pawket Care Credit.
- CHARM Emergency Assistance.
- Licensed Insurance Partners.
- Account UI.
- Checkout/commerce.
- Public copy.
- Support/ops.
- Pawket Pals/HeartCodes/quests.
- Analytics.

Ticket type:

- Review.
- Copy.
- Design.
- Planning.
- Implementation.
- QA.
- Documentation.

Requested owner:

Requested reviewers:

Target files:

Related backlog ticket:

Related decision-log section:

## Approval Status

Decision-log status:

- `pending_review`
- `approved_for_revised_draft`
- `approved_for_implementation_planning`
- `approved_for_build`
- `held`
- `rejected`

Implementation permission:

- None.
- Revised draft only.
- Technical planning only.
- Build approved for the exact scope below.

Decision-log link or line:

Reviewer/decision owner:

Decision date:

Open blockers:

- To be completed before work starts.
- Returned review answers must already be processed through `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` if the ticket depends on reviewer output.

## Scope

Goal:

- To be completed before work starts.

In scope:

- To be completed before work starts.

Out of scope:

- To be completed before work starts.

Explicitly forbidden:

- Blending Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners into one product.
- Promise language for Pawket Care Credit or CHARM.
- Insurance terms for Pawket Care Credit or CHARM.
- Fake balances.
- Fake assistance requests.
- Fake partner cards.
- Fake eligibility.
- Fake program status.
- Public display of private story, rescue, adoption, medical, memorial, hardship, assistance, or insurance detail without approved consent.
- Charm as a sample case, applicant, placeholder, fixture, public reward, or generic story.

## Public-Surface Impact

Does this change a public surface?

- No.
- Yes.

If yes, list affected surfaces:

- `public/pet-care-planning.html`
- `public/navbar.html`
- `public/navbar.js`
- `public/footer.html`
- `public/account.html`
- `public/charm.html`
- Other:

Public-surface state:

- `informational_visible`
- `footer_only`
- `held_private`
- `revised_public_copy`
- `active_lane_preview`
- `active_lane_workflow`

Required checks:

- Confirm the change matches `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`.
- Confirm copy source from `docs/PET_PAWKET_COMPLIANCE_COPY.md` or reviewed successor.
- Confirm no label implies active Care Credit balance, assistance intake, insurance referral, or guaranteed support unless approved.
- Confirm this inventory will be updated if links, labels, CTAs, disclaimers, or page roles change.

## Copy And Tone

Approved copy source:

- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- Reviewed successor:
- New review needed:

Tone requirements:

- Warm.
- Clear.
- Affirming.
- Non-fear-based.
- Non-guilt-based.
- Precise about what is active versus planned.

Blocked copy:

- Coverage.
- Protection plan.
- File a claim.
- Claim status.
- Get covered.
- Guaranteed help.
- Emergency payment.
- Reimbursement.
- Premium.
- Deductible.
- Covered condition.
- Policy benefit.
- Apply now for guaranteed support.

## Data Boundary Impact

Does this touch data?

- No.
- Yes.

If yes, list data domains:

- Account identity.
- Pet profiles.
- Story/journal/Core Memory content.
- Story consent.
- Pawket Care Credit.
- CHARM Emergency Assistance.
- Licensed Insurance Partners.
- Pawket Pals/HeartCodes.
- Pawket Packs/Packets/Picks.
- Heroic Quests/HeartPoints.
- Support/ops notes.
- Analytics.

Allowed fields:

- To be completed before work starts.

Forbidden fields:

- To be completed before work starts.

Public payload fields:

- To be completed before work starts.

Internal-only fields:

- To be completed before work starts.

Required checks:

- Confirm separation against `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`.
- Confirm HeartCodes do not encode private support, medical, hardship, insurance, rescue, adoption, memorial, or account data.
- Confirm Pawket Pals do not expose private support records or imply support eligibility.
- Confirm no schema, API, account payload, checkout hook, support tool, analytics event, or test fixture is created unless approved.

## Privacy And Consent Impact

Does this touch private, story-derived, support, assistance, medical, hardship, memorial, rescue, adoption, insurance, or youth/CHERISH-adjacent data?

- No.
- Yes.

Consent type, if any:

- Private Account Use.
- Share Your Heart Story Consent.
- Private Honorary Pal Consent.
- Public Community Pal Adaptation Consent.
- Limited Edition Release Consent.
- CHARM Impact Story Consent.
- Pawket Pass Story Capsule Consent.
- Social Or Marketing Consent.
- Insurance Referral Consent.
- Other:

Allowed roles:

- Public visitor.
- Signed-in account owner.
- Support team.
- CHARM reviewers.
- Pal/story reviewers.
- Partner/insurance provider.
- Engineering.
- Analytics.

Must never display:

- To be completed before work starts.

Revocation/hold behavior:

- To be completed before work starts.

Required checks:

- Confirm against `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`.
- Confirm consent for one use is not reused for another use.
- Confirm assistance requests do not grant public story rights.
- Confirm insurance referral activity does not feed Care Credit, CHARM, Pawket Pals, HeartCodes, or public account UI.
- Confirm child/youth/CHERISH-adjacent data is out of scope unless separately reviewed.

## Lane-Specific Requirements

### Pawket Care Credit

Applies?

- No.
- Yes.

If yes, confirm:

- Terms are approved for this scope.
- Ledger design is approved, if touched.
- Refund/reversal rules are approved, if touched.
- No veterinary payment promise is made.
- No assistance eligibility is implied.
- No insurance language is used.

### CHARM Emergency Assistance

Applies?

- No.
- Yes.

If yes, confirm:

- Guidelines are approved for this scope.
- Charity/privacy/payment review is complete for this scope.
- Intake/review/status behavior is approved, if touched.
- Public impact content has separate consent, if touched.
- No future assistance is guaranteed.
- No Care Credit or insurance status is mixed into CHARM status.

### Licensed Insurance Partners

Applies?

- No.
- Yes.

If yes, confirm:

- Partner requirements are approved for this scope.
- Licensing/referral/affiliate review is complete for this scope.
- State availability rules are approved, if shown.
- Outbound tracking is approved, if used.
- Pet Pawket does not advise, sell, underwrite, administer, or guarantee insurance.
- No policy/application/quote/claim data is stored unless explicitly approved.

## UX And Accessibility Requirements

Required if UI changes:

- Desktop layout reviewed.
- Mobile layout reviewed.
- No page-level horizontal overflow.
- Text fits in controls and cards.
- Three lanes stay visually and semantically separate.
- Disclaimers are visible near relevant copy.
- Buttons use safe verbs.
- Focus states remain visible.
- Existing IDs/classes/routes are preserved unless explicitly approved.

## Test And Verification Plan

Expected checks:

- `git diff --check`
- Existing relevant test script:
- Existing relevant lint/build script:
- Browser QA path:
- Mobile viewport QA path:
- Accessibility/manual checks:
- Risk-term scan:

If a check is unavailable:

- Record why.

If a check is skipped:

- Record why.

## Documentation Updates Required

Update these if the ticket changes their scope:

- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CANON.md`, only if stable canon changes.

## Final Ticket Readiness

This ticket is ready only when:

- The decision log allows the requested level of work.
- Lane ownership is clear.
- Public-surface impact is clear.
- Data-boundary impact is clear.
- Privacy/consent impact is clear.
- Approved copy source is clear.
- Tests and QA are defined.
- Charm protection is explicitly confirmed.
- Out-of-scope items are explicit.

Do not treat this template as implementation approval.
