# Pet Pawket Canon

Last updated: 2026-05-15

This document is the stable product and story canon for Pet Pawket. Future work should preserve this ecosystem instead of flattening the project into a generic ecommerce site.

## Core Brand

Pet Pawket is a pet-first lifestyle ecosystem. It combines real pet commerce, subscriptions, emotional storytelling, digital companions, charity impact, community systems, trusted partners, and a future game/world layer.

The brand should feel warm, joyful, cozy, trustworthy, polished, and emotionally meaningful. It should not become guilt-heavy, depressing, clinical, or generic. Rescue and memorial content should be handled with care, hope, consent, and dignity.

Pet Pawket is not just a pet store. The storefront is the launch surface for a larger living brand-world.

Public site copy should read like it was written for pet families, not for a product spec. Keep the underlying systems intact, but do not front-load customers with internal terms such as ecosystem, lane, handoff, source, ledger, review queue, consent-safe, CHARM-safe, public-surface, implementation, data boundaries, or future hooks. When a privacy or review boundary matters, say it plainly: "private notes stay private", "you choose what to share", "shared when ready", or "we check before sharing."

The emotional center is simple:

> Every pet has a story. Every story deserves love. Every act of love can help another life.

For broader orientation docs, use `docs/PET_PAWKET_PROJECT_OVERVIEW.md`, `docs/PET_PAWKET_FOUNDATIONS.md`, `docs/PET_PAWKET_PAWKET_PALS.md`, and `docs/PET_PAWKET_REWARDS_AND_HEARTCODES.md`. This canon remains the stable source of truth; those docs break the umbrella into easier working references.

## Business Flow

The launch business model has two connected commerce tracks:

1. Shopify-backed normal shop and inventory.
2. Pet Pawket native systems for accounts, pet profiles, journals, story trails, rewards, Pawket Network, Loop/HeartCode-style sharing, CHARM impact, and future game features.

`/api/cart/create` should be treated as a canonical cart creation path. The shop can integrate with Shopify while the account, story, charity, partner, and game-layer systems remain native to Pet Pawket.

## Finance And Living Documentation

Pet Pawket finance should become a living financial operating system, not a generic bookkeeping sheet. It should trace commerce, subscriptions, Packs, Packets, Picks, Pawket Pals, HeartCodes, Pawket Points, HeartPoints, CHARM, future CHERISH, Care Credit, donations, rewards, partner activity, impact proof, investor reporting, accountant/tax support, and future Lumerian value-flow tracking back to source events and documents.

Finance work should preserve the rule: every dollar has a source, every source has a document, every document supports a report, and every report traces back to the living ecosystem.

Live finance ledgers, report exports, Care Credit liability, CHARM assistance accounting, insurance referral metadata, public impact claims, and investor-ready metrics require accounting, tax, legal, privacy, charity, insurance, product, and operations review before launch.

Finance tooling must keep Pawket Care Credit, CHARM Emergency Assistance, and licensed insurance referrals separate in concept, data, copy, accounting, and reporting. It must not imply insurance, guaranteed coverage, guaranteed payment, guaranteed assistance, speculative Pal value, or public story rights.

Finance tooling should live outside the public customer website as a Pawket Admin desktop app direction. Website connector nodes should be encrypted, authenticated, least-privilege, and audit logged.

## Care Support Ecosystem

Pet Pawket's care-support ecosystem has three separate lanes:

1. Pawket Care Credit: rewards-based value earned through eligible Pet Pawket purchases and participation.
2. CHARM Emergency Assistance: charitable assistance for urgent animal-care, rescue medicine, family pet-retention, and mission-aligned support needs.
3. Pet insurance referrals: optional education or referral paths to licensed insurance providers or agencies.

These lanes can support the same family journey, but they must not be collapsed into one product.

Pawket Care Credit is not insurance and must not promise coverage, reimbursement, emergency payment, or payment for veterinary expenses. Use "earned rewards value", "available balance", "redeem", "eligible", and "program terms".

CHARM Emergency Assistance is charitable aid, not insurance. Assistance is subject to eligibility, mission fit, program guidelines, and available funds. Use "apply", "request assistance", "charitable aid", "review", and "available funds".

Pet insurance is separate from Pet Pawket and must be handled only through licensed insurance partners unless Pet Pawket later becomes properly licensed and appointed. Pet Pawket must not present itself as insurer, underwriter, broker, seller, administrator, or policy advisor.

Short public disclaimer:

> Not insurance. No guaranteed coverage. Pawket Care Credit is a rewards program. CHARM Emergency Assistance is charitable aid subject to eligibility, program guidelines, and available funds. Pet insurance, where available, is offered only through licensed insurance partners.

Care-support implementation should begin with documentation and informational pages only. No rewards ledger, assistance intake, redemption flow, insurance comparison, quote path, claim path, or partner referral tracking should launch without legal, insurance, charity, tax, accounting, consumer-protection, privacy, and payments review.

## Pawket Packs

Pawket Packs are the core subscription boxes. They are the main recurring product line and should connect to pet profiles, preferences, size, species, journals, and future Pawket Pal or quest handoffs.

Pawket Packs are currently in development. Launch copy and UI may preview them, but production subscription behavior should not be overstated until the system is real.

## Pawket Packets

Pawket Packets are smaller sample, trial, promo, or low-commitment boxes. They are an entry point into the ecosystem for customers who are not ready for a full Pawket Pack subscription.

Packets can support discovery, gifts, campaigns, rescue placements, partner promos, and first-time customer activation.

## Pawket Picks

Pawket Picks are bonus, rotating, curated, or threshold reward items. They may connect to seasonal campaigns, product discovery, Pawket Packs, Pawket Packets, Pawket Points, HeartCodes, or CHARM impact moments.

Pawket Picks may eventually include care-support education cards, reward boosts, Pawket Pal accessories, or CHARM-safe impact prompts, but they must not imply insurance, guaranteed assistance, guaranteed emergency payment, or guaranteed Care Credit redemption.

## Pawket Passes

Pawket Passes are the current public launch name for the shareable pass, gift, referral, impact, and chain mechanic.

A Pawket Pass can be a unique code or link that can be shared, claimed, tracked, saved locally before checkout, and connected to future rewards, Pawket Points, HeartPoints, CHARM impact, badges, story capsules, Share Studio assets, or Pawket World events.

Preserve the existing internal Loop contracts unless a coordinated migration is requested. Public UI should generally say Pawket Passes, while internal routes, files, storage keys, and database contracts may still use `loop`, `/api/loop/*`, and `pp_loop_token`.

Pawket Passes should not expose private pet profiles, private journals, or unreviewed rescue/memorial stories. Public pass surfaces should show only consent-safe information.

## CHARM Foundation

CHARM means Caring Hearts for Animal Rescue and Medicine.

CHARM is the animal rescue and medical support foundation tied to Pet Pawket. It should support rescue work, urgent medical care, placement, family retention, shelter needs, partner campaigns, and visible impact.

Charm is the heart of CHARM: the protected memorial/origin figure and sacred source of the foundation's emotional meaning. Charm was Jonas's beloved dog, rescued in Tyler, Texas, and her story should be framed as a long, beautiful, loved, joyful, and victorious life that carries love forward.

Charm must never be used as a generic placeholder pet, demo pet, seed pet, sample account pet, mock-data pet, fallback pet name, product example, ordinary rescue case, or reusable story template. Use neutral copy such as "your pet", "a pet profile", "sample pet", or "protected memorial origin" for examples and test flows.

Charm's role must be handled with special care. Charm can inspire CHARM, emotional tone, and protected origin storytelling, but Charm is not generic content.

## Charm's Private Pawket Pal

Charm's one-of-one Pawket Pal is private and protected.

It must never be treated as a collectible, public drop, randomized reward, marketplace item, or general user-claimable Pal. It can remain an internal/protected origin figure and emotional north star, but no launch or future feature should imply users can collect Charm's personal Pal.

## CHERISH Foundation

CHERISH means Caring Hearts Enabling Resilience and Inspiring Happiness. It is a later sibling project and should not be collapsed into the immediate Pet Pawket MVP unless the repo already contains explicit CHERISH surfaces.

CHERISH follows the broader formula but is more focused on human, family, community, youth, and care programs. Keep it conceptually related but operationally separate from Pet Pawket launch work.

## Pawket Pals

Pawket Pals are digital companions and collectibles inspired by real pet stories, rescue stories, adoption stories, memorial stories, and community milestones.

The intended feel is a blend of Neopets, Chao Garden, Tamagotchi, and Animal Crossing, but grounded in real emotional meaning and real pet stories.

Pawket Pals should eventually be able to grow, idle, appear in zones, participate in events, connect to journals, and create shareable moments. They are not just cosmetic avatars.

Pawket Pals should never exploit real pet grief or rescue hardship. Real stories require consent, privacy controls, respectful copy, and careful separation between private memory and public collectible mechanics.

Pawket Pals should become a living value system, not just collectibles. Each Pal can carry emotional value, functional value, and, for carefully controlled public editions only, potential ecosystem market value. Financial value must never replace or cheapen the emotional origin. Public copy must not imply investment value, guaranteed resale value, or speculative upside.

Every Pawket Pal should eventually carry a unique HeartCode as its identity anchor. A Pal HeartCode can connect to the Pal's name, origin story, inspired-by status, owner account, edition type, release event, rarity level, CHARM or CHERISH connection, game stats, quest history, and future transfer history if trading is ever allowed.

Pawket Pal classes should preserve dignity:

- Honorary Pawket Pals are personal, consent-led tributes from submitted pet stories and are not automatically public collectibles.
- Community Pawket Pals are public-facing characters adapted from reviewed stories or community moments.
- Limited Edition Pawket Pals are authenticated, numbered releases tied to meaningful events, rescue milestones, founding moments, seasonal CHARM moments, shelter partnerships, or future CHERISH moments.
- One-of-One Pawket Pals are singular protected tributes. Charm's private Pawket Pal belongs here and remains protected, locked/private, and non-collectible.

## Pawket World / Game Layer

Pawket World, Pawket Park, and related game-layer concepts are future expansion surfaces where Pawket Pals live, grow, idle, appear in zones, participate in events, unlock moments, and connect to quests and community.

The game layer should build from real account and pet-story systems rather than existing as a disconnected minigame. Pet profiles, journals, Core Memories, story submissions, HeartCodes, Heroic Quests, and CHARM impact can all become future world inputs.

Pawket Haven is the preferred current name for the future warm, safe, mission-aligned game home where Pawket Pals live and grow. Pawket World and Pawket Park can remain broader or adjacent language, but Pawket Haven is the strongest name for the emotional companion space.

## Story Submissions

Story submissions are the pipeline for users, rescues, partners, and Pet Pawket staff to submit pet stories, adoption wins, rescue updates, memorial moments, CHARM cases, or future Pawket Pal seeds.

The preferred public program language for this path is "Share Your Heart" when a warm customer-facing name is needed.

Submission workflows must include consent, privacy boundaries, moderation, and clear rights around whether a story can be public, used for a Pal, used in CHARM impact content, or kept private.

Story content should emphasize dignity, love, resilience, care, and connection. Avoid manipulative guilt, shock imagery, or pressure tactics.

## Character And Avatar Creation Flow

Pawket Pal character and avatar creation must start private and consent-led.

Safe creation flow:

1. A customer, rescue, partner, or staff member submits or selects a real pet story through a private path.
2. The story remains private by default.
3. Pet Pawket records consent separately from the Pal or story record.
4. Private Honorary Pal certificates may be created for the account owner.
5. Ops review is required before public story use, Community Pal adaptation, CHARM/CHERISH connection, marketing use, or future transfer/market consideration.
6. Public Community Pal or Limited Edition work uses redacted, consent-safe character material instead of raw private story details.
7. HeartCodes anchor Pal identity without exposing private pet, account, medical, rescue, memorial, or assistance data.

Charm must never be used as a default avatar, seed pet, sample account pet, fallback Pal, randomized reward, public collectible, or generic memorial example. Charm's private one-of-one Pawket Pal remains protected.

## HeartCodes

HeartCodes are the broader emotional sharing/referral/pass concept connected to gifting, impact, and chain mechanics. Pawket Passes are the current public launch expression of this idea.

A HeartCode may be a unique code or link that can be shared, claimed, tracked, and connected to rewards, Pawket Points, HeartPoints, CHARM impact, badges, story capsules, or future world events.

HeartCodes overlap with earlier Loop Token ideas. Treat Loop Tokens as a technical or experimental predecessor/variant unless a later decision says otherwise. Do not expose `Loop Token` as the primary public customer-facing name when the intended surface is Pawket Passes.

For Pawket Pals, a HeartCode is the Pal's identity anchor. It should authenticate the Pal, connect it to consent-safe origin metadata, support ownership and perks, and prepare future game or transfer history without exposing private pet stories or private account data.

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

Pawket Points should be the practical reward layer for commerce, referrals, Packs, Packets, Picks, events, and game perks. HeartPoints should be the emotional and impact layer for CHARM, future CHERISH, rescue sponsorships, shelter support, adoption stories, memorial tributes, Heroic Quests, and verified generosity.

A future contribution multiplier can let mission participation increase the impact of eligible future purchases, but only after eligibility, caps, refunds, charity receipts, fraud controls, tax, legal, accounting, and compliance rules are defined. The tone should be generous and empowering, never guilt-heavy.

Pawket Points, HeartPoints, Pawket Care Credit, and CHARM assistance are separate concepts. Points can support progress, perks, or future program eligibility only under defined terms. Do not imply HeartPoints or Pawket Points are guaranteed cash value, insurance coverage, CHARM assistance eligibility, or emergency payment.

## Pawket Network / Partners

Pawket Network and Pawket Partners are the verified directory and partner ecosystem for shelters, rescues, vets, groomers, trainers, and pet services.

Verification matters. Listings should not casually go live without trust controls. Lead forms should be testable at launch, but public partner claims, owner controls, and verification badges must be handled carefully.

Day-one Network coverage should be honest even when sparse: public provider results come from approved provider data, and missing areas should still be useful through launch paths for care preparation, provider nomination, business claims, CHARM-safe impact, Pawket Pass campaigns, community review, and partner onboarding instead of fake listings or fake partner status.

Real external provider data should stage as internal Pawket Network import candidates before becoming public listings. Overture Maps, OpenStreetMap, IRS EO BMF, licensed POI files, partner APIs, and manual team research can help coverage scale, but source data is not the same as Pawket verification. Promotion from source candidate to public listing must keep the listing unclaimed until owner claim review, must not assign Pawket Partner status, and must not expose CHARM support unless reviewed through the CHARM-safe path.

## Pet-Safe Places / Reference Tool

Pet parks, dog parks, pet-friendly parks, trails, beaches, travel relief areas, and similar pet-safe or pet-relevant locations are a separate good Pawket reference concept. They should not be mixed into Pawket Network provider listings just because they are pet-related.

These locations are places to visit or reference, not care providers to claim, message, verify as partners, or connect to CHARM by default. They may eventually support maps, saved places, Pawket Pal outings, Pawket World/Pawket Park handoffs, park-day checklists, safety notes, leash/fence rules, accessibility notes, community Pawprints, and local pet-friendly discovery.

Source data for pet-safe places can come from OpenStreetMap, Overture Maps, parks departments, licensed POI files, or manual review, but it should stage through its own reference-location lane. A pet-safe place should be labeled with source and review state, not represented as a Pawket Verified Partner unless there is a separate verified organization relationship.

Pawket Network and Pawket Places should cross-reference each other prominently. People who land on Pawket Network while looking for dog parks or pet-safe locations should be routed to Pawket Places; people who land on Pawket Places while looking for vets, groomers, shelters, rescues, trainers, boarding, sitting, walking, daycare, or cleaners should be routed back to Pawket Network.

## Community, Town Square, Pawprints, And Share Studio

Town Square is the future community/feed surface for Pawprints, Pal moments, story moments, rescue wins, adoption highlights, CHARM impact updates, and community sharing.

Pawprints are shareable community posts or moments involving a Pal, real pet story, event, Park interaction, quest, or impact milestone.

Share Studio is the future growth and sharing engine for Pal cards, posters, badges, story cards, social media assets, deep links, HeartCodes, and impact receipts.

These should remain future/post-launch surfaces unless implemented with moderation, privacy, and content controls.

## Customer Family And Community Engagement

Pet Pawket should make customers feel like part of a care-centered family without pressuring them.

The desired journey is:

1. A customer cares for their pet through normal shopping, profile setup, packs, packets, picks, or community paths.
2. They meet stories, Pawket Pals, CHARM impact, or trusted local providers at the right moment.
3. They can choose to share, support, submit a story, complete a Heroic Quest, or keep everything private.
4. Their participation may earn points, perks, or future rewards value under terms.
5. Their Pawket Pals, HeartCodes, journals, and Core Memories help preserve the emotional record.
6. The ecosystem carries love forward without guilt, pressure, fake urgency, or exploiting hardship.

Care support should strengthen this journey by helping families plan clearly. It must not make customers feel that love is measured only by purchases, donations, public sharing, or financial participation.

## Data, Provenance, And Privacy

Pet Pawket should preserve provenance and consent for every trust-bearing object:

- Product and order records.
- Pawket Passes and Loop/HeartCode sharing paths.
- Pet profiles.
- Journals and Core Memories.
- Story submissions and Share Your Heart materials.
- Pawket Pals and HeartCodes.
- CHARM impact receipts and assistance records.
- Pawket Network source records and partner states.
- Future Pawket Places source and review records.
- Future Pawket Care Credit ledger records.
- Future insurance referral records.

Rules:

- Separate private journal data from public story data.
- Separate story consent from Pal ownership.
- Separate rewards data from charitable assistance data.
- Separate insurance referral metadata from rewards and charity data.
- Do not encode private medical, rescue, memorial, hardship, assistance, or insurance details into public HeartCodes.
- Do not publish real pet stories, rescue details, adoption details, medical details, memorial details, or assistance details without explicit consent and review.
- Keep source data and verification state visible internally, but do not represent source records as verified partner, CHARM, insurance, or public story claims without review.

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
