# Pet Pawket Canon

Last updated: 2026-05-03

This document is the stable product and story canon for Pet Pawket. Future work should preserve this ecosystem instead of flattening the project into a generic ecommerce site.

## Core Brand

Pet Pawket is a pet-first lifestyle ecosystem. It combines real pet commerce, subscriptions, emotional storytelling, digital companions, charity impact, community systems, trusted partners, and a future game/world layer.

The brand should feel warm, joyful, cozy, trustworthy, polished, and emotionally meaningful. It should not become guilt-heavy, depressing, clinical, or generic. Rescue and memorial content should be handled with care, hope, consent, and dignity.

Pet Pawket is not just a pet store. The storefront is the launch surface for a larger living brand-world.

## Business Flow

The launch business model has two connected commerce tracks:

1. Shopify-backed normal shop and inventory.
2. Pet Pawket native systems for accounts, pet profiles, journals, story trails, rewards, Pawket Network, Loop/HeartCode-style sharing, CHARM impact, and future game features.

`/api/cart/create` should be treated as a canonical cart creation path. The shop can integrate with Shopify while the account, story, charity, partner, and game-layer systems remain native to Pet Pawket.

## Pawket Packs

Pawket Packs are the core subscription boxes. They are the main recurring product line and should connect to pet profiles, preferences, size, species, journals, and future Pawket Pal or quest handoffs.

Pawket Packs are currently in development. Launch copy and UI may preview them, but production subscription behavior should not be overstated until the system is real.

## Pawket Packets

Pawket Packets are smaller sample, trial, promo, or low-commitment boxes. They are an entry point into the ecosystem for customers who are not ready for a full Pawket Pack subscription.

Packets can support discovery, gifts, campaigns, rescue placements, partner promos, and first-time customer activation.

## Pawket Picks

Pawket Picks are bonus, rotating, curated, or threshold reward items. They may connect to seasonal campaigns, product discovery, Pawket Packs, Pawket Packets, Pawket Points, HeartCodes, or CHARM impact moments.

## Pawket Passes

Pawket Passes are the current public launch name for the shareable pass, gift, referral, impact, and chain mechanic.

A Pawket Pass can be a unique code or link that can be shared, claimed, tracked, saved locally before checkout, and connected to future rewards, Pawket Points, HeartPoints, CHARM impact, badges, story capsules, Share Studio assets, or Pawket World events.

Preserve the existing internal Loop contracts unless a coordinated migration is requested. Public UI should generally say Pawket Passes, while internal routes, files, storage keys, and database contracts may still use `loop`, `/api/loop/*`, and `pp_loop_token`.

Pawket Passes should not expose private pet profiles, private journals, or unreviewed rescue/memorial stories. Public pass surfaces should show only consent-safe information.

## CHARM Foundation

CHARM means Caring Hearts for Animal Rescue and Medicine.

CHARM is the animal rescue and medical support foundation tied to Pet Pawket. It should support rescue work, urgent medical care, placement, family retention, shelter needs, partner campaigns, and visible impact.

Charm is the heart of CHARM: the protected memorial/origin figure and sacred source of the foundation's emotional meaning.

Charm must never be used as a generic placeholder pet, demo pet, seed pet, sample account pet, mock-data pet, fallback pet name, product example, ordinary rescue case, or reusable story template. Use neutral copy such as "your pet", "a pet profile", "sample pet", or "protected memorial origin" for examples and test flows.

Charm's role must be handled with special care. Charm can inspire CHARM, emotional tone, and protected origin storytelling, but Charm is not generic content.

## Charm's Private Pawket Pal

Charm's one-of-one Pawket Pal is private and protected.

It must never be treated as a collectible, public drop, randomized reward, marketplace item, or general user-claimable Pal. It can remain an internal/protected origin figure and emotional north star, but no launch or future feature should imply users can collect Charm's personal Pal.

## CHERISH Foundation

CHERISH is a later sibling project and should not be collapsed into the immediate Pet Pawket MVP unless the repo already contains explicit CHERISH surfaces.

CHERISH follows the broader formula but is more focused on human, family, community, youth, and care programs. Keep it conceptually related but operationally separate from Pet Pawket launch work.

## Pawket Pals

Pawket Pals are digital companions and collectibles inspired by real pet stories, rescue stories, adoption stories, memorial stories, and community milestones.

The intended feel is a blend of Neopets, Chao Garden, Tamagotchi, and Animal Crossing, but grounded in real emotional meaning and real pet stories.

Pawket Pals should eventually be able to grow, idle, appear in zones, participate in events, connect to journals, and create shareable moments. They are not just cosmetic avatars.

Pawket Pals should never exploit real pet grief or rescue hardship. Real stories require consent, privacy controls, respectful copy, and careful separation between private memory and public collectible mechanics.

## Pawket World / Game Layer

Pawket World, Pawket Park, and related game-layer concepts are future expansion surfaces where Pawket Pals live, grow, idle, appear in zones, participate in events, unlock moments, and connect to quests and community.

The game layer should build from real account and pet-story systems rather than existing as a disconnected minigame. Pet profiles, journals, Core Memories, story submissions, HeartCodes, Heroic Quests, and CHARM impact can all become future world inputs.

## Story Submissions

Story submissions are the pipeline for users, rescues, partners, and Pet Pawket staff to submit pet stories, adoption wins, rescue updates, memorial moments, CHARM cases, or future Pawket Pal seeds.

Submission workflows must include consent, privacy boundaries, moderation, and clear rights around whether a story can be public, used for a Pal, used in CHARM impact content, or kept private.

Story content should emphasize dignity, love, resilience, care, and connection. Avoid manipulative guilt, shock imagery, or pressure tactics.

## HeartCodes

HeartCodes are the broader emotional sharing/referral/pass concept connected to gifting, impact, and chain mechanics. Pawket Passes are the current public launch expression of this idea.

A HeartCode may be a unique code or link that can be shared, claimed, tracked, and connected to rewards, Pawket Points, HeartPoints, CHARM impact, badges, story capsules, or future world events.

HeartCodes overlap with earlier Loop Token ideas. Treat Loop Tokens as a technical or experimental predecessor/variant unless a later decision says otherwise. Do not expose `Loop Token` as the primary public customer-facing name when the intended surface is Pawket Passes.

## Heroic Quests

Heroic Quests are structured account, pet, story, partner, or impact missions. They should eventually hand off to Pawket Pals, CHARM, Pawket World, Town Square, Share Studio, and community features.

Examples:

- Add a pet profile.
- Log a care or story journal.
- Mark a Core Memory.
- Complete a rescue walk checkpoint.
- Share or claim a HeartCode.
- Support a CHARM case.
- Submit a story with consent.
- Verify or connect with a Pawket Network partner.

Quest language should feel encouraging and meaningful, not gamified in a shallow or exploitative way.

## Pawket Points / HeartPoints

Pawket Points and HeartPoints are reward currencies or progress systems that may connect to purchases, referrals, HeartCodes, Heroic Quests, CHARM impact, profile completion, story submissions, or future game-layer progress.

Naming is not fully locked for launch. Use neutral internal language where needed and avoid promising redeemable monetary value until rules, compliance, fraud controls, and accounting are defined.

## Pawket Network / Partners

Pawket Network and Pawket Partners are the verified directory and partner ecosystem for shelters, rescues, vets, groomers, trainers, and pet services.

Verification matters. Listings should not casually go live without trust controls. Lead forms should be testable at launch, but public partner claims, owner controls, and verification badges must be handled carefully.

## Community, Town Square, Pawprints, And Share Studio

Town Square is the future community/feed surface for Pawprints, Pal moments, story moments, rescue wins, adoption highlights, CHARM impact updates, and community sharing.

Pawprints are shareable community posts or moments involving a Pal, real pet story, event, Park interaction, quest, or impact milestone.

Share Studio is the future growth and sharing engine for Pal cards, posters, badges, story cards, social media assets, deep links, HeartCodes, and impact receipts.

These should remain future/post-launch surfaces unless implemented with moderation, privacy, and content controls.

## Core Memory

Core Memory is an emotionally weighted pet/account/journal feature. It evolved from a generic favorite/star concept into a locked or unlocked meaningful memory marker.

Core Memory should be stored explicitly as state and not inferred fragilely from visuals alone. It should not feel like a shallow favorite button.

## Emotional Tone

Pet Pawket should feel:

- Warm.
- Joyful.
- Cozy.
- Trustworthy.
- Polished.
- Playful where appropriate.
- Emotionally meaningful.
- Hopeful around rescue and memorial content.

Pet Pawket should not feel:

- Generic ecommerce.
- Guilt-heavy.
- Depressing.
- Exploitative.
- Overly clinical.
- Like charity content was bolted onto a shop.
- Like game mechanics are disconnected from real pet meaning.

## Privacy And Ethics Around Real Pet Stories

Real pet stories, rescue stories, adoption stories, medical stories, and memorial stories require explicit care.

Rules:

- Get consent before using public story content.
- Separate private journal memories from public story submissions.
- Do not turn private grief into public collectible content without explicit permission.
- Avoid identifiable personal data unless necessary and consented.
- Provide moderation and review before public community or story surfaces go live.
- Treat shelters, rescues, vets, and partners as trust-bearing entities.
- Do not imply medical, rescue, or charity claims without substantiation.
- Keep Charm's private one-of-one Pawket Pal protected and non-collectible.
