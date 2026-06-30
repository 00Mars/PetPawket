# Pet Pawket Care Support Legal Review Packet

Last updated: 2026-05-09

Status: internal review index. Not legal advice. Not public terms. Not launch approval.

This packet gathers the care-support documents that need legal, compliance, charity, tax/accounting, privacy, payments, insurance, partner, and operations review before Pet Pawket launches Pawket Care Credit, CHARM Emergency Assistance, or Licensed Insurance Partner referrals.

## Review Goal

Confirm whether Pet Pawket can safely move from informational care-planning copy into active programs while keeping the three lanes separate:

1. Pawket Care Credit: earned rewards value.
2. CHARM Emergency Assistance: charitable aid.
3. Licensed Insurance Partners: external insurance education/referral path.

No engineering implementation should proceed from this packet until the relevant review gates are marked approved.

## Packet Documents

Core model:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
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

Copy and public-language controls:

- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`

Program and operations drafts:

- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

Current public informational surface:

- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md`
- `public/pet-care-planning.html`
- `public/careSupportFuture.js`
- Held CHARM/account handoffs to Pet Care Planning.
- Held nav/footer/search/Explore links to Pet Care Planning.

## Review Outputs Needed

For each lane, reviewers should return one of:

- Approved for implementation planning.
- Approved for revised draft only.
- Hold until entity, licensing, partner, accounting, or privacy work is complete.
- Do not pursue in current form.

Reviewers should also identify:

- Required public disclaimers.
- Required terms acceptance.
- Required privacy-policy updates.
- Required support-process updates.
- Required tracking limits.
- Required data-retention limits.
- Required state or jurisdiction restrictions.
- Required public-surface changes for links, labels, CTAs, search metadata, account handoffs, CHARM handoffs, footer, navbar, or disclaimers.
- Required data-boundary changes before schema, API, account, checkout, support-tool, analytics, Pawket Pal, HeartCode, or test-fixture work.
- Required consent, role-visibility, revocation, public-story, CHARM-impact, Pawket Pal, HeartCode, analytics, and youth/CHERISH restrictions.
- Required ticket-template fields or approval evidence for scoped future work.

Review notes can be collected in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`, but returned answers must first pass through `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`, and final approval state must be copied into `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` before implementation status changes. Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` when making that transfer.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` when sending reviewer-specific questions and collecting answer IDs.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting packet status, choosing the next review action, assigning owners, sending packets, or interpreting review progress.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before coordinating owner nomination, roster updates, dispatch updates, packet send status, return intake, or decision-log transfer.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` when preparing the packet for a specific reviewer group.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` when assembling exact packet IDs and file lists.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` when recording reviewer owners or confirming assignment readiness.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` when preparing packet-specific reviewer-facing send notes.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` when tracking packet send status, return status, and decision-log intake.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` to check completeness, packet IDs, question IDs, implementation permission, and decision-log destinations when reviewer answers come back.

Use `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md` to open the first concrete review tickets. The queue does not grant implementation approval; it only sequences review work and names the decision-log sections that must be updated.

## Pawket Care Credit Review

Primary question:

- Can Pawket Care Credit operate as earned rewards value without being treated as insurance, stored value, consumer credit, gift card value, or another regulated product that changes the implementation path?

Review topics:

- Rewards/gift-card/stored-value treatment.
- Consumer-protection requirements.
- Expiration and breakage rules.
- Refund, return, and chargeback reversals.
- Fraud and abuse controls.
- Tax/accounting treatment.
- Terms acceptance.
- Account-bound versus transferable value.
- Redemption limited to Pet Pawket products at first.
- Whether external provider, veterinary, or emergency redemption is permitted later.

Engineering hold points:

- No ledger.
- No account balance.
- No earn hooks.
- No redemption.
- No checkout calculation.
- No provider or veterinary redemption.

## CHARM Emergency Assistance Review

Primary question:

- Can CHARM Emergency Assistance operate as charitable assistance with clear eligibility, mission fit, available-funds limits, privacy controls, and non-insurance boundaries?

Review topics:

- CHARM entity structure.
- Charitable registration and fundraising disclosures.
- Restricted-fund handling.
- Applicant eligibility.
- Support categories.
- Documentation requirements.
- Direct provider payment versus other support paths.
- Privacy of veterinary, rescue, family hardship, adoption, and memorial information.
- Public impact reporting.
- Separate story consent.
- Outcome language.
- Appeals or reconsideration, if any.

Engineering hold points:

- No intake form.
- No request database.
- No account request status.
- No ops queue.
- No documentation upload.
- No disbursement workflow.
- No public impact automation from assistance records.

## Licensed Insurance Partner Review

Primary question:

- Can Pet Pawket show optional external insurance partner education/referral paths without acting as an insurer, broker, seller, administrator, policy advisor, or claim handler?

Review topics:

- Insurance producer/broker licensing.
- Referral and affiliate compensation rules.
- State-by-state referral limits.
- Partner licensing proof.
- Partner copy approval.
- Required disclosures.
- State availability display.
- Outbound tracking limits.
- Customer acknowledgment before leaving Pet Pawket, if needed.
- Support routing to licensed partners.

Engineering hold points:

- No partner cards.
- No outbound referral links.
- No referral tracking.
- No state availability UI.
- No quote, application, or policy comparison UI.
- No policy data storage.

## Public Visibility Review

Current state:

- Pet Care Planning is held as a direct dormant review preview.
- Active navigation, footer, search, CHARM, account, and Explore surfaces should not link to the preview while review is pending.
- The page is informational and repeatedly states that programs are planned or separate.

Decision needed:

- Keep current public discovery held.
- Reintroduce approved public links.
- Move discovery to footer/support-only until legal review.
- Hide public links until approved.
- Revise copy but keep the page visible.

Reviewers should check:

- Whether "Pet Care Planning" is acceptable as public education.
- Whether "Pawket Care Credit" can be named publicly before launch.
- Whether CHARM assistance can be named publicly before guidelines are approved.
- Whether insurance referral language needs softer wording before partners are selected.

## Data And Privacy Review

Cross-lane data rules to approve:

- Care Credit ledger data stays separate from CHARM assistance records.
- Insurance referral metadata stays separate from rewards and charity records.
- Story consent stays separate from assistance, rewards, and referral activity.
- HeartCodes must not encode private medical, assistance, hardship, or insurance data.
- Pawket Pals must not expose private support records or imply eligibility.

Privacy topics:

- Veterinary information.
- Family hardship information.
- Rescue/adoption/memorial information.
- Assistance documentation.
- Insurance referral tracking.
- Support-team notes.
- Data retention and deletion.

## Support And Ops Review

Review:

- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`
- Support escalation rules.
- Language for not-active programs.
- Language for future launched programs.
- What support must route to CHARM ops.
- What support must route to licensed insurance partners.
- What support must never promise.

## Review Decision Log

Use this section during review; do not treat blank entries as approval.

Pawket Care Credit:

- Status:
- Reviewer:
- Date:
- Required changes:
- Implementation allowed:

CHARM Emergency Assistance:

- Status:
- Reviewer:
- Date:
- Required changes:
- Implementation allowed:

Licensed Insurance Partners:

- Status:
- Reviewer:
- Date:
- Required changes:
- Implementation allowed:

Public Pet Care Planning visibility:

- Status:
- Reviewer:
- Date:
- Required changes:
- Visibility decision:

## Minimum Approval Before Engineering

Before any implementation ticket is opened:

- Applicable lane status is explicitly approved for implementation planning.
- Approval is recorded in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
- Public copy is approved.
- Data boundaries are approved.
- Support and ops workflow is approved.
- Privacy requirements are documented.
- Test and QA expectations are documented.
- The relevant ticket in `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md` has its blockers cleared.
- `docs/PET_PAWKET_CURRENT_STATE.md` is updated with the decision.

If any lane is held, implementation must remain informational-only for that lane.
