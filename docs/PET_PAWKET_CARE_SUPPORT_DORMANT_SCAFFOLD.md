# Pet Pawket Care Support Dormant Scaffold

Last updated: 2026-05-09

Status: internal implementation scaffold. Not legal advice. Not public terms. Not launch approval.

This document records the limited work that can exist while Pawket Care Credit, CHARM Emergency Assistance, and Licensed Insurance Partners remain pending review in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.

## Current Product Decision

Care-support work may move forward only as dormant, future-facing scaffolding until compliance review is complete.

Allowed now:

- Internal documentation.
- Reusable copy and disclaimer banks.
- Future state constants that are not imported into active pages.
- Direct review preview pages that clearly state the programs are not active.
- Product planning that preserves the three separate lanes.

Not allowed now:

- Public navigation discovery that makes the feature feel launched.
- Account balances, status cards, or request modules.
- Checkout earning or redemption hooks.
- Pawket Care Credit ledgers.
- CHARM Emergency Assistance request forms or review queues.
- Insurance partner cards, quote paths, outbound referral tracking, or partner ranking.
- Pawket Pal, HeartCode, HeartPoints, Heroic Quest, Pack, Packet, or Pick hooks that imply eligibility, value, or support.

## Dormant Code Scaffold

`public/careSupportFuture.js` now exists as a dormant registry for the future feature.

It defines:

- Global feature state, with every public behavior set to disabled.
- The three care-support lanes.
- Required disclaimer language.
- Future activation requirements for each lane.
- A helper for future code to confirm a specific feature is still inactive.

It intentionally does not:

- Import into `public/main.js`.
- Import into `public/account.js`.
- Import into checkout or cart logic.
- Import into `public/charm.html`.
- Import into navbar, footer, search, Pawket Pals, Pawket Network, Pawket Places, or Pawket Passes.
- Create a database table, API route, form, event handler, ledger, referral link, partner card, or account module.

Do not import this module into any public runtime surface until the relevant approval is recorded in `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.

## Public Site Posture

The active site should not currently present care support as an implemented product.

`public/pet-care-planning.html` may remain as a direct review preview only. It should clearly state:

- Pet Care Planning is future planning.
- Pawket Care Credit is not active.
- CHARM Emergency Assistance intake is not active.
- Licensed insurance partner referrals are not active.
- No guarantee, payment, reimbursement, assistance, referral, quote, or policy behavior exists.

Global navigation, footer discovery, search metadata, account cards, CHARM calls to action, and Explore rails should not promote the preview until a public visibility decision is approved.

## Activation Requirements

Before any dormant scaffold becomes active, complete the relevant path:

1. Record reviewer ownership and review status through `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`.
2. Capture reviewer answers in `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`.
3. Transfer decisions using `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`.
4. Update `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`.
5. Update `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md` before any public link, label, CTA, search result, account handoff, or CHARM handoff changes.
6. Update `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md` and `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` before any schema, API, payload, support tool, analytics, Pawket Pal, HeartCode, HeartPoints, Heroic Quest, or story-connected work.
7. Open scoped tickets from `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`.

## Future Integration Notes

When review allows it, care support can connect to the broader Pet Pawket ecosystem without collapsing the lanes:

- Pawket Care Credit can become earned rewards value tied to eligible purchases, Packs, Packets, Picks, and approved participation.
- CHARM Emergency Assistance can become a charitable request and review path with separate privacy and consent controls.
- Licensed Insurance Partners can become an external education or referral path with approved disclosures and state availability rules.
- Pawket Pals, HeartCodes, HeartPoints, Heroic Quests, and Pawket Haven can later reflect care-planning milestones only through consent-safe, reviewed signals.

None of those integrations are active now.
