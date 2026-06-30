# Pet Pawket Project Overview

Last updated: 2026-05-15

This document is the broad orientation layer for fresh Pet Pawket work. Read it with `AGENTS.md`, `docs/PET_PAWKET_CANON.md`, `docs/PET_PAWKET_CURRENT_STATE.md`, and `docs/PET_PAWKET_UMBRELLA_AUDIT.md` before implementation.

Pet Pawket is not merely a pet ecommerce site. The storefront is the first public surface for a larger heart-centered ecosystem that connects everyday pet care with family, story, rescue, community, rewards, trusted local support, CHARM impact, and a future Pawket Pal world.

## Core Identity

Pet Pawket turns everyday care for a pet into a larger ecosystem of joy, story, rescue, memory, and impact.

The durable brand promise is:

> Care becomes story. Story becomes connection. Connection carries love forward.

Pet Pawket should feel warm, family-centered, affirming, protective, trustworthy, joyful, emotionally real, and community-oriented. It should never flatten into a generic store, a pressure-heavy charity page, or a speculative collectible project.

## Customer Loop

The customer journey should preserve this loop:

1. A customer discovers Pet Pawket through shopping, Packs, Packets, Picks, CHARM, Pals, community, or local discovery.
2. They feel warmth, trust, usefulness, and emotional difference.
3. They buy, subscribe, build a pet profile, save a journal moment, send a Pawket Pass, or meet a Pawket Pal path.
4. Their private account context can support better products, keepsakes, Pawket Pack fit, Pawket Pals, HeartCodes, and later Heroic Quests.
5. They can choose to share a story, support CHARM, nominate a provider, join community moments, or keep everything private.
6. Reviewed and consented stories may become Pawprints, Community Pals, CHARM-safe updates, or future Pawket Haven moments.
7. Rewards, points, passes, Pals, and impact should deepen belonging without measuring love by money, donations, public sharing, or urgency.

Core loop:

> care -> story -> connection -> contribution -> reward -> deeper belonging

## Umbrella Map

Pet Pawket currently spans these connected but distinct concepts:

- Pet Pawket: main brand, storefront, customer account, pet profiles, journals, Core Memories, and launch site.
- Pawket Packs: full subscription boxes for recurring pet care, story, and delight.
- Pawket Packets: smaller trial/sample/giftable boxes. Tagline: "Big love comes in small Packets."
- Pawket Picks: bonus, threshold, seasonal, or campaign reward items that feel like appreciation rather than manipulation.
- Pawket Passes: public launch name for the shareable pass, gift, referral, and impact chain path. Internal contracts may still use `loop`, `/api/loop/*`, and `pp_loop_token`.
- Pawket Pals: story-based companions and future game characters anchored by privacy, consent, HeartCodes, and emotional dignity.
- Share Your Heart: the future/public name for story submission paths covering rescue, adoption, memorial, living-pet, and kindness stories.
- HeartCodes: identity/authenticity anchors for Pawket Pals and broader story/pass provenance.
- Pawket Points: practical rewards for commerce and participation.
- HeartPoints: emotional/impact progress for CHARM, future CHERISH, stories, kindness, and Heroic Quests.
- CHARM Foundation: Caring Hearts for Animal Rescue and Medicine, the animal rescue and medicine mission inspired by Charm.
- CHERISH Foundation: Caring Hearts Enabling Resilience and Inspiring Happiness, a future sibling mission focused on human, family, youth, resilience, and community uplift.
- Pawket Network: trusted provider directory and partner ecosystem for vets, groomers, trainers, shelters, rescues, boarding, walking, daycare, and related care providers.
- Pawket Places: separate future/reference lane for dog parks, trails, pet-friendly stops, relief areas, and pet-safe locations.
- Pet Care Planning: dormant direct preview for future care-support education.
- Pawket Care Credit: future rewards-based care credit, not insurance.
- CHARM Emergency Assistance: future charitable assistance, not insurance.
- Licensed Insurance Partners: future external referral/education path, not a Pet Pawket insurance product.
- Heroic Quests: future kindness/action missions.
- Pawket Haven / Pawket World: future warm game/community layer where Pals can live, grow, remember, and participate.
- Finance And Living Documentation System: internal source, ledger, calculation-rule, report, promise, proof, and value-flow foundation for commerce, rewards, CHARM, future CHERISH, and mission reporting.

## Current Repository Architecture

The current repo is a pragmatic hybrid:

- `server.js` is the primary Express app, serving static pages from `public/`, mounting API routers under `/api/*`, integrating local JWT auth with Shopify customer access, and treating `/api/cart/create` as the canonical cart creation path.
- `public/` contains the main static customer-facing site: home, shop, product, account, Packs, Packets, Picks, Pawket Passes, Pawket Pals, Community, CHARM, Pawket Network, Pawket Places, dormant Pet Care Planning preview, navbar, footer, Dock, CSS, and browser JS.
- `routes/` contains Express API routers for addresses, products, search, cart, auth/password, pets, wishlist, loop/Pawket Passes, Pawket Network, Pawket Pals, and debug helpers.
- `db/migrations/` contains Postgres migrations for users, pets, journals, Loop/impact, Pawket Network, Pawket Pal identity, and related launch-prep structures.
- `userDB.pg.js`, `networkDB.pg.js`, and `palDB.pg.js` are the main Postgres data modules.
- `apps/charmfoundation/` is a separate CHARM Foundation Express/static site with its own routes, migrations, and public pages.
- `apps/pawketpals/` is an Expo Router Pawket Pals/Park app scaffold with mock data, tabs, Pal detail screens, Town Square, Share Studio, Home Space, and Park surfaces.
- `scripts/` contains migration, seed, network import, coverage, audit, promotion, test, and gateway helpers.
- `tests/` currently covers Network and Pawket Pal API behavior with Node's built-in test runner.
- `data/finance/*` and `docs/PET_PAWKET_FINANCE_*.md` now provide local finance planning assets and a standalone Pawket Admin desktop-app direction. Finance is not served as a public website page.

Preserve this split. Do not add a new build system, app framework, database, service, or dependency unless the user explicitly approves it and the change is justified by the task.

## Current Launch Posture

Active or partially active launch-prep surfaces:

- Static storefront and content pages.
- Shopify-backed cart creation through `/api/cart/create`.
- Local account auth and account profile paths.
- Pet profiles, journals, Core Memories, and Story Trail foundations.
- Pawket Passes using internal Loop routes/contracts.
- Private-first Pawket Pal HeartCode certificates, story intake, ops review, internal Community Pal drafts, redacted preview gates, and archive/takedown protections.
- Pawket Network public listings, nominations, claims, partner ops, source imports, and coverage/audit scripts.
- Pawket Places as an honest placeholder/reference surface, not a populated provider directory.
- CHARM public mission page and separate CHARM Foundation app scaffold.

Dormant or future-only:

- Pawket Care Credit ledger, balance display, earning, redemption, checkout hooks, or account modules.
- CHARM Emergency Assistance intake, review queue, request status, disbursement, or assistance workflow.
- Licensed insurance partner cards, quote paths, partner referrals, outbound referral tracking, or insurance comparison tools.
- Care-support public discovery beyond direct dormant review preview.
- Public Pawket Pal drops, trading, resale, market behavior, transfer paths, or CHARM/CHERISH claims.
- Pawket Haven production gameplay, Heroic Quest records, and Share Studio outputs.

## Non-Negotiable Product Boundaries

- Charm is the protected memorial/origin figure and must never become a generic demo pet, seed pet, placeholder, fallback, sample account pet, public collectible, or commercial drop.
- Charm's private one-of-one Pawket Pal remains private, protected, non-market, and non-collectible.
- Real pet stories, rescue stories, adoption stories, medical stories, assistance stories, and memorial stories are privacy- and consent-sensitive.
- Public story use requires explicit, use-specific consent and review.
- Pawket Care Credit, CHARM Emergency Assistance, and insurance referrals must remain separate in concept, copy, implementation, data, and accounting.
- Care-support features remain held unless `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` records approval for the exact scope.
- Pawket Network source records are not verified partners, claimed providers, or CHARM-supported providers by default.
- Pawket Places must stay separate from Pawket Network provider listings.
- Customer-facing copy should be warm and plain, not internal architecture language.

## Safest Next Implementation Direction

After this documentation pass, the safest next implementation work is narrow and non-financial:

- Continue home/account/Pawket Pals coherence work.
- Improve private-first story and HeartCode flows.
- Add Share Studio output rules or first non-financial Heroic Quest planning only if scoped.
- Keep Pet Care Planning as direct dormant preview until review approves public visibility.
- Do not implement care-support ledgers, applications, referrals, checkout hooks, or account modules without review approval.
