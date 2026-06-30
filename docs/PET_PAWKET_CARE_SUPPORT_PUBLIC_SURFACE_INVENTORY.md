# Pet Pawket Care Support Public Surface Inventory

Last updated: 2026-05-09

Status: internal public-surface inventory. Not legal advice. Not public terms. Not launch approval.

This document records where Pet Care Planning and care-support language currently appears in the public site, what each surface is allowed to do today, and what must remain blocked until review decisions are recorded in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.

## Required Source Documents

Read these first:

- `docs/PET_PAWKET_CANON.md`
- `docs/PET_PAWKET_CURRENT_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`

## Current Public Status

Current visible posture:

- Pet Care Planning is held as a direct dormant review preview only.
- The active site should not currently promote Pet Care Planning through navbar, footer, static search, account, CHARM, or Explore links.
- Pawket Care Credit is not active.
- CHARM Emergency Assistance intake is not active.
- Licensed insurance partner referrals are not active.
- No public surface calculates rewards, stores assistance requests, compares insurance, sends referrals, creates support status, or changes checkout behavior.

Current direct preview path:

- `/pet-care-planning.html`

Current safe summary:

> Pet Care Planning explains three separate planning lanes: Pawket Care Credit as future rewards value, CHARM Emergency Assistance as future charitable aid, and licensed insurance partners as a separate future path for actual pet insurance.

## Current Surface Map

| Surface | Current file | Current role | Allowed today | Must not do today |
| --- | --- | --- | --- | --- |
| Pet Care Planning page | `public/pet-care-planning.html` | Direct dormant review preview | Explain the three separate lanes, show disclaimers, state the feature is held out of active discovery | Collect forms, show balances, start assistance intake, show partner cards, compare insurance, imply active programs |
| Dormant future registry | `public/careSupportFuture.js` | Non-imported implementation scaffold | Store disabled feature flags, lane definitions, disclaimers, and future activation requirements | Import into active pages, routes, checkout, account, CHARM, navbar, footer, search, or API behavior |
| Global navbar impact menus | `public/navbar.html` | No current Pet Care Planning link | Keep care-support discovery absent while review is pending | Present Pet Care Planning as an active benefit, protection product, assistance portal, claim path, or insurance tool |
| Global navbar utility link | `public/navbar.html` | No current Pet Care Planning link | Keep secondary discovery absent while review is pending | Overstate program availability or make care-support a primary checkout promise |
| Search metadata | `public/navbar.js` | No current Pet Care Planning result or impact action | Keep care-support search discovery absent while review is pending | Return fake active balances, provider matches, quotes, eligibility, assistance statuses, or launched care-support autocomplete |
| Explore rail | `public/subnav.html` | No current Pet Care Planning chip | Keep care-support discovery absent while review is pending | Route people to care-support planning before visibility approval |
| Footer quick select | `public/footer.html` | No current Pet Care Planning option | Keep care-support discovery absent while review is pending | Use urgent, fear-based, protection, active aid, active credit, or active referral language |
| Footer path card | `public/footer.html` | No current Pet Care Planning card | Keep care-support discovery absent while review is pending | Suggest checkout earns active care support |
| Footer legal/support link | `public/footer.html` | No current Pet Care Planning link | Keep care-support discovery absent while review is pending | Hide required disclaimers on any future destination page |
| Account handoff | `public/account.html` | No current care-support account card or CTA | Keep account free of care-support balances, statuses, cards, and links while review is pending | Show Care Credit balance, assistance request status, partner referral status, eligibility, or one combined care-protection card |
| CHARM hero handoff | `public/charm.html` | No current Pet Care Planning CTA | Keep CHARM focused on mission preview while review is pending | Make CHARM assistance sound open, guaranteed, or linked to Care Credit/insurance |
| CHARM lower handoff | `public/charm.html` | No current Pet Care Planning card | Keep CHARM lower content free of care-support CTAs while review is pending | Convert to assistance intake, urgent application, or public impact story without review |

## Surface-Specific Notes

### `public/pet-care-planning.html`

Current page role:

- A direct dormant review preview.
- Explains that care has layers.
- Separates rewards value, charitable aid, and licensed insurance partner referrals.
- Includes the short combined disclaimer.
- Includes lane-specific disclaimer cards.
- Includes `noindex,nofollow` metadata.
- States that the preview is held out of active site discovery while review is pending.

Allowed today:

- Informational copy.
- Static anchor links.
- Link to `/charm.html`.
- Warm, clear, non-binding explanation.
- Direct review access only.

Blocked until approval:

- Care Credit account balance.
- Care Credit redemption.
- CHARM assistance request or application.
- Assistance request status.
- Licensed insurance partner cards.
- Outbound insurance referral links or tracking.
- Quote, comparison, application, or policy advice.
- Any form that collects support, medical, hardship, insurance, or private story data.

### `public/navbar.html`

Current page role:

- No current Pet Care Planning discovery link in Impact, Foundation, or Links.

Allowed today:

- Keep care-support discovery absent while review is pending.

Blocked until approval:

- `Pet Care Planning`.
- `Care support overview`.
- `Apply for support`.
- `File a claim`.
- `Get covered`.
- `Use Care Credit`.
- `Emergency protection`.
- `Insurance quote`.
- Any label suggesting active support or insurance functionality.

### `public/navbar.js`

Current page role:

- No current Pet Care Planning search result or impact action.

Allowed today:

- Keep care-support search discovery absent while review is pending.

Blocked until approval:

- Search title: `Pet Care Planning`.
- Search metadata describing rewards value, CHARM assistance, and licensed partner paths.
- Search result badges for active balances.
- Search result badges for eligibility.
- Search result badges for assistance status.
- Search result cards for insurance quotes or partner availability.
- Search autocomplete that implies a launched care-support product.

### `public/footer.html`

Current page role:

- No current Pet Care Planning quick select, path card, or secondary link.

Allowed today:

- Keep care-support footer discovery absent while review is pending.

Blocked until approval:

- Low-pressure route to learn about care-support planning.
- Checkout-like prompts.
- Emergency or fear-based language.
- Claims of active aid, active credit, or active insurance partner availability.
- Any footer copy that hides or bypasses the planning-page disclaimers.

### `public/account.html`

Current page role:

- No current care-support account card, guest CTA, signed-in handoff, balance, request status, or partner referral status.

Allowed today:

- Keep care-support out of account UI while review is pending.

Blocked until approval:

- Planning-only card.
- Link to `/pet-care-planning.html`.
- Balance display.
- Earned value display.
- Assistance request status.
- Assistance application CTA.
- Insurance referral CTA.
- Partner card.
- Combined care-protection status.
- Pawket Pal reward copy implying assistance eligibility.

### `public/charm.html`

Current page role:

- No current CHARM-adjacent Pet Care Planning CTA or care-support lane card.

Allowed today:

- CHARM mission context.
- Keep care-support CTA language absent while review is pending.

Blocked until approval:

- Planning guide link.
- Lane-separation CTA copy.
- Assistance intake.
- Emergency application.
- Assistance status.
- Funding promise.
- Direct relationship between donations and future assistance.
- Public CHARM impact story derived from private support data without consent review.

## Safe Labels For Future Approved Discovery

These labels are safer than active-benefit language, but they should not be reintroduced to public navigation, footer, search, account, CHARM, or Explore surfaces until the visibility decision is approved and recorded.

- Pet Care Planning.
- Care support overview.
- Plan care support options.
- Care planning.
- Open guide.
- Planning only.
- Review Pet Care Planning.
- Open care planning.

Safe future descriptions:

- Informational guide.
- Planned paths.
- Separate lanes.
- Rewards value.
- Charitable aid.
- Licensed insurance partner education.

## Blocked Public Labels

Do not use for Care Credit or CHARM:

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

Do not use for insurance referrals unless a licensed-partner path is approved and clearly external:

- Our insurance.
- Pet Pawket coverage.
- We insure.
- We underwrite.
- Best policy.
- Guaranteed reimbursement.
- File a claim with us.

## Required Review Before Public Surface Changes

Before changing any public surface listed here:

1. Confirm the affected lane status in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
2. Check approved copy in `docs/PET_PAWKET_COMPLIANCE_COPY.md`.
3. Check dormant-surface limits in `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md`.
4. Check data restrictions in `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`.
5. Check consent restrictions in `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`.
6. Record review notes in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`, if review has started.
7. Update this inventory if a link, label, CTA, public disclaimer, or page role changes.
8. Update `docs/PET_PAWKET_CURRENT_STATE.md`.

## Public QA Checklist

Run this checklist after public care-support copy or links change:

- `/pet-care-planning.html` loads as a dormant direct preview.
- `/pet-care-planning.html` includes `noindex,nofollow` while public discovery is held.
- Navbar desktop Impact and Links groups do not link to `/pet-care-planning.html`.
- Navbar search does not return Pet Care Planning while discovery is held.
- Footer quick select, path cards, and legal links do not route to `/pet-care-planning.html`.
- Account does not show a care-support card, guest CTA, balance, request state, or referral state.
- CHARM does not show a Pet Care Planning CTA or care-support lane card while discovery is held.
- `public/careSupportFuture.js` remains non-imported by active runtime files.
- Mobile layout has no horizontal overflow.
- Disclaimers are visible near care-support explanations.
- No public copy implies active Care Credit balance, assistance intake, insurance referral, or guaranteed support.

## Future Public Surface States

Possible future states must be explicitly approved:

- `dormant_direct_preview`: direct review preview and dormant scaffold only; no active site discovery.
- `informational_visible`: public planning copy remains visible and static.
- `footer_only`: public discovery is reduced to footer/support paths.
- `held_private`: public page is hidden until review is complete.
- `revised_public_copy`: public page remains visible with reviewed copy changes.
- `active_lane_preview`: one lane receives approved empty-state/account preview copy, with no workflow.
- `active_lane_workflow`: one lane receives approved workflow implementation through a scoped ticket.

Only `dormant_direct_preview` is reflected by the current public surface. No future state is approved by this inventory.
