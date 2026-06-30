# Pet Pawket Care Support Implementation Backlog

Last updated: 2026-05-09

Status: internal planning backlog. Not legal advice. Not approval to implement. Do not build schemas, APIs, ledgers, intake forms, account modules, checkout logic, partner cards, referral tracking, or ecosystem hooks until the relevant gates in `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md` and `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md` are approved.

Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` as the source of truth for whether a lane or ticket has approval. If the decision log says `pending_review`, `held`, or `rejected`, implementation remains blocked.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting review status, choosing the next review action, assigning owners, sending packets, or interpreting review progress.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before treating owner assignment, dispatch state, returned answers, tracker status, or decision-log transfer as complete.

Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` when decision-log entries change blockers or implementation permission.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` to confirm the build-blocking review rows are complete before opening implementation-planning or build tickets.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` to trace reviewer answers back to specific question IDs before clearing blockers.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` to confirm the relevant reviewer groups received the right packet before treating a returned answer as complete.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` to verify the exact packet IDs and build-blocking rows before clearing blockers.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` to confirm real reviewer ownership was recorded before treating review assignment as complete.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` to confirm reviewer-facing packet notes were prepared from the assembled packet scope before treating a review as properly sent.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` to confirm a packet was returned and recorded before treating reviewer output as complete.

Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` to confirm returned reviewer answers passed completeness checks before opening planning or build tickets from this backlog.

Use `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md` for the first review tickets that must happen before implementation planning.

Use `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` when opening any ticket from this backlog.

Use `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` before touching the dormant direct preview or non-imported care-support feature registry.

This backlog translates the care-support documentation packet into gated implementation tickets. It is ordered so each ticket produces the decisions, copy, controls, or reviewed interface needed by the next ticket.

## Global Rules For Every Ticket

Every future care-support implementation ticket must include:

- Lane ownership: Care Credit, CHARM Assistance, Licensed Insurance Partners, shared support, or shared UI.
- Gate status from `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`.
- Approval status from `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
- Completed ticket shape from `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`.
- Public-surface impact from `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`, if any public page, link, CTA, label, search result, account handoff, CHARM handoff, navbar, or footer changes.
- Data-boundary impact from `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`.
- Privacy and consent impact from `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`.
- Review notes or blockers from `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`, if review has started.
- Approved copy source.
- Privacy impact.
- Data domain touched.
- Public payload fields, if any.
- Forbidden fields confirmed out of scope.
- Consent type and role visibility, if any private or story-derived data is touched.
- Tests and QA required.
- Explicit statement that Charm is not used as a sample case, applicant, placeholder, or public reward.

Every ticket must avoid:

- Blending Care Credit, CHARM assistance, and insurance into one product.
- Promise language for Care Credit or CHARM.
- Insurance terms for Care Credit or CHARM.
- Fake balances, fake requests, fake partner cards, fake eligibility, or fake program status.
- Any private story, rescue, adoption, medical, memorial, hardship, assistance, or insurance detail in public UI without approved consent.

## Ticket 0: Public Visibility Decision

Lane:

- Shared.

Blocked by:

- Legal/compliance review of current informational Pet Care Planning copy.

Goal:

- Decide whether held Pet Care Planning discovery can become visible, move to footer/support-only discovery, stay held with the direct preview, or be hidden until program approval.

Inputs:

- `public/pet-care-planning.html`
- `public/careSupportFuture.js`
- Current held CHARM/account handoffs.
- Current held nav/footer/search/Explore links.
- `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`

Outputs:

- Visibility decision.
- Required copy revisions, if any.
- Updated `docs/PET_PAWKET_CURRENT_STATE.md`.
- If public files change, browser QA at desktop and mobile widths.

Acceptance criteria:

- Public visibility decision is recorded.
- Search/nav/footer/account/CHARM/Explore labels do not overstate active functionality.
- If discovery remains held, active surfaces do not link to `/pet-care-planning.html`.
- If discovery becomes visible, the page still states informational-only status and includes required disclaimers.

## Ticket 1: Legal Review Decision Recording

Lane:

- Shared.

Blocked by:

- Reviewers completing the decision log in `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`.

Goal:

- Convert legal/compliance review outcomes into implementation-ready gate status.

Inputs:

- Legal review packet.
- Care Support Review Worksheet.
- Care Credit terms draft.
- CHARM guidelines draft.
- Insurance partner requirements draft.
- Compliance copy bank.

Outputs:

- Updated review decision log.
- Updated current-state summary.
- Clear list of approved, held, revised, or rejected lanes.

Acceptance criteria:

- No blank review decision is treated as approval.
- Each lane has explicit implementation status.
- Held lanes remain informational-only.

## Ticket 2: Support And Ops Copy Approval

Lane:

- Shared support.

Blocked by:

- Legal/compliance review of `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`.

Goal:

- Approve internal support language before any customer-facing help, account, email, or support workflow uses care-support copy.

Inputs:

- Ops/support FAQ draft.
- Compliance copy bank.
- Legal review packet.

Outputs:

- Approved support FAQ.
- Support escalation rules.
- "Must not say" list preserved.
- Any public FAQ copy revisions added to the compliance copy bank.

Acceptance criteria:

- Support can answer current not-active questions safely.
- Support knows what to route to legal/compliance, CHARM ops, privacy/security, or licensed partners.
- No support response promises coverage, reimbursement, emergency payment, assistance approval, or insurance advice.

## Ticket 3: Account Empty-State UI Design

Lane:

- Shared UI.

Blocked by:

- Ticket 0 visibility decision.
- Ticket 2 support/copy approval.
- Gate 2 program-rules direction for any lane shown in account.

Goal:

- Design account dashboard empty-state modules for the three separate care-support lanes without fake values or active workflows.

Inputs:

- Current `/account.html` informational handoff.
- Compliance copy bank.
- Program outlines.
- Launch plan account UI requirements.

Outputs:

- Account UI copy/spec for three separate modules.
- Decision on whether to implement in static HTML, account JS, or defer.
- Mobile/desktop layout expectations.

Acceptance criteria:

- Care Credit, CHARM assistance, and Licensed Insurance Partners do not share one status badge, one progress meter, or one "protection" panel.
- Empty states state "not active" or approved active status clearly.
- No balance, request state, or partner card appears without real approved data.

## Ticket 4: Care Credit Terms Approval

Lane:

- Pawket Care Credit.

Blocked by:

- Legal, tax/accounting, payments, privacy, and consumer-protection review.

Goal:

- Convert `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md` into approved program terms and implementation requirements.

Inputs:

- Care Credit terms draft.
- Program outlines.
- Compliance copy bank.

Outputs:

- Approved earn events.
- Approved value calculation.
- Approved pending/available/reversal/expiration rules.
- Approved redemption categories.
- Approved account copy.
- Approved support process.

Acceptance criteria:

- Veterinary, emergency, and provider redemptions are explicitly approved or explicitly deferred.
- Refund and chargeback handling is defined.
- Terms versioning is defined.
- No ledger work begins until this ticket is approved.

## Ticket 5: Care Credit Ledger Design

Lane:

- Pawket Care Credit.

Blocked by:

- Ticket 4 approval.
- Gate 3 data separation design.

Goal:

- Design the auditable Care Credit ledger before implementation.

Inputs:

- Approved Care Credit terms.
- Existing account/order/cart architecture.
- Privacy and data separation rules.

Outputs:

- Proposed schema.
- Ledger event states.
- Earn/reversal/redemption source mapping.
- Terms-version storage.
- Admin/review notes plan.
- Test plan.

Acceptance criteria:

- Ledger is auditable and reversible.
- Ledger does not store private story, CHARM assistance, or insurance data.
- Values are described as earned rewards value only.
- No implementation happens until schema design is reviewed.

## Ticket 6: Care Credit Ledger Implementation

Lane:

- Pawket Care Credit.

Blocked by:

- Ticket 5 approved design.

Goal:

- Implement the minimum approved ledger and tests.

Inputs:

- Approved schema design.
- Approved terms and copy.

Outputs:

- Migration, data layer, route/admin surface only as approved.
- Unit/integration tests for earn, reverse, expire if applicable, and audit behavior.
- No checkout redemption unless approved in a separate ticket.

Acceptance criteria:

- Existing tests pass.
- New ledger tests pass.
- No public account balance appears until display ticket is approved.
- No redemption exists unless separately approved.

## Ticket 7: CHARM Assistance Guidelines Approval

Lane:

- CHARM Emergency Assistance.

Blocked by:

- Legal, charity compliance, privacy, payments/disbursement, ops, and CHARM leadership review.

Goal:

- Convert `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md` into approved program guidelines and ops requirements.

Inputs:

- CHARM guidelines draft.
- Legal review packet.
- Ops FAQ draft.

Outputs:

- Approved applicant types.
- Approved support categories.
- Approved documentation rules.
- Approved review statuses.
- Approved outcome copy.
- Approved disbursement/support type rules.
- Approved privacy and consent rules.

Acceptance criteria:

- Public intake remains blocked until ops capacity exists.
- Assistance remains charitable aid, not insurance.
- Story consent remains separate from assistance review.

## Ticket 8: CHARM Assistance Intake Design

Lane:

- CHARM Emergency Assistance.

Blocked by:

- Ticket 7 approval.
- Gate 4 ops readiness.

Goal:

- Design private intake and ops review before implementation.

Inputs:

- Approved CHARM guidelines.
- Existing account/auth/ops patterns.
- Privacy and consent rules.

Outputs:

- Proposed request schema.
- Request statuses.
- Required fields by request type.
- Documentation handling plan.
- Ops queue design.
- Outcome-message plan.
- Test plan.

Acceptance criteria:

- Intake says request/apply, not claim.
- Records are private by default.
- Public story use is impossible without separate consent.
- No implementation happens until design is reviewed.

## Ticket 9: CHARM Assistance Intake And Ops Implementation

Lane:

- CHARM Emergency Assistance.

Blocked by:

- Ticket 8 approved design.

Goal:

- Implement the approved private request and ops review workflow.

Inputs:

- Approved schema/design.
- Approved copy.
- Approved ops roles.

Outputs:

- Migration, route, data layer, account/ops UI only as approved.
- Tests for auth, privacy, status transitions, validation, and non-public behavior.

Acceptance criteria:

- No request is public by default.
- No status uses insurance language.
- No public impact story is created from a request.
- Browser QA verifies account/ops UI if UI is added.

## Ticket 10: Insurance Partner Requirements Approval

Lane:

- Licensed Insurance Partners.

Blocked by:

- Legal, insurance licensing, affiliate/referral, privacy, partner, and support review.

Goal:

- Approve partner requirements before any partner cards or outbound links exist.

Inputs:

- Insurance partner requirements draft.
- Legal review packet.
- Compliance copy bank.

Outputs:

- Approved partner eligibility checklist.
- Approved disclosure language.
- Approved state availability rules.
- Approved tracking limits.
- Approved support routing.
- Approved partner card copy.

Acceptance criteria:

- Pet Pawket role remains referral/education only.
- No policy advice, comparison, application, quote, or claim handling is approved unless licensing changes.
- No partner card appears without reviewed partner data.

## Ticket 11: Insurance Partner Card Implementation

Lane:

- Licensed Insurance Partners.

Blocked by:

- Ticket 10 approval.
- Approved partner data.

Goal:

- Implement approved partner cards and optional outbound referral behavior.

Inputs:

- Approved partner list.
- Approved disclosure language.
- Approved tracking/privacy rules.

Outputs:

- Partner card UI.
- External-link cue.
- Disclosure near outbound action.
- Optional tracking only if approved.
- Tests/browser QA if runtime UI is added.

Acceptance criteria:

- Partner cards never imply Pet Pawket sells, administers, or guarantees insurance.
- No policy data is collected or stored.
- State availability is shown only if approved.
- Outbound action clearly routes to a licensed partner.

## Ticket 12: Checkout Copy Or Reward Hook

Lane:

- Shared commerce / Care Credit.

Blocked by:

- Care Credit terms approval.
- Ledger implementation, if earning or redemption is involved.
- Checkout copy approval.

Goal:

- Add only approved checkout copy or approved earn/redemption hooks.

Inputs:

- Approved Care Credit rules.
- Existing checkout/cart architecture.
- Compliance copy bank.

Outputs:

- Checkout note, earn hook, or redemption path only as approved.
- Tests for checkout/cart behavior if logic changes.

Acceptance criteria:

- Checkout copy does not imply emergency support, insurance, or CHARM eligibility.
- Purchases do not imply guaranteed assistance.
- Refund/reversal behavior is tested before earn or redemption goes live.

## Ticket 13: Ecosystem Integration

Lane:

- Shared ecosystem.

Blocked by:

- Relevant lane launched and approved.
- Privacy and consent review.

Goal:

- Connect care-support education or approved benefits into Pawket Packs, Packets, Picks, Pals, HeartPoints, HeartCodes, Heroic Quests, or Pawket Haven without creating financial or assistance promises.

Inputs:

- Approved lane rules.
- Pawket Pals/HeartCodes consent rules.
- Compliance copy bank.

Outputs:

- Education cards, badges, safe quests, or approved reward hooks.
- No private assistance data in public Pal/story surfaces.

Acceptance criteria:

- Pal ownership does not imply Care Credit, CHARM assistance, or insurance eligibility.
- HeartCodes do not expose private medical, assistance, hardship, or insurance data.
- Charm's protected one-of-one Pal is never a public reward.

## Backlog Status Summary

Current status:

- Tickets 0 through 13 are planning only.
- No ticket is approved for implementation.
- Current public behavior remains informational-only.

The next real-world action is review, not engineering:

1. Complete legal/compliance review packet.
2. Record lane decisions.
3. Decide Pet Care Planning public visibility.
4. Approve or revise support FAQ.
5. Only then open implementation tickets for approved lanes.
