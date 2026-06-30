# Pawket Pals Living Value System

Last updated: 2026-05-07

This document captures the next major product direction for Pawket Pals: Pawket Pals should stop reading as "just collectibles" and become the bridge between real pet stories, emotional legacy, customer loyalty, charitable impact, real value, and the future game world.

## Core Idea

Every Pawket Pal can carry three kinds of value:

1. Emotional value
   - It honors a real animal, a real bond, a real story, or a meaningful community moment.
2. Functional value
   - It can unlock perks, quests, rewards, game interactions, contribution boosts, account progress, and future Pawket Haven experiences.
3. Market value
   - Some public Pawket Pals may eventually become authenticated, limited, protected ecosystem assets with controlled resale or trade.

Financial value must never replace emotional value. It sits underneath the story as a reward for participation, care, legacy, and trust.

Do not write public copy that implies guaranteed resale value, investment value, financial return, or speculation. Any transfer, trade, marketplace, multiplier, or donation-linked reward model needs legal, tax, fraud, age-gating, payment, consumer-protection, and charity-compliance review before launch.

## HeartCodes As Identity

Every Pawket Pal should eventually receive a unique HeartCode.

A HeartCode is not only a serial number. It is the Pal's identity anchor.

It can connect to:

- Pawket Pal name.
- Origin story.
- Inspired-by status.
- Owner account.
- Edition type.
- Release event.
- Rarity level.
- CHARM or CHERISH connection.
- Game stats.
- Quest history.
- Transfer history, if controlled trading is later allowed.

Customer-facing direction:

> Every Pawket Pal carries a HeartCode: a unique mark of the story, love, and legacy it represents.

Technical direction:

- HeartCodes should be durable and unique.
- HeartCodes should support authentication, ownership, perks, future game integration, and transfer history.
- HeartCodes should not expose private pet stories, private journals, private memorial details, medical details, rescue case details, or personal user data.
- HeartCodes overlap conceptually with older Loop Token and HeartCode language, but Pawket Passes remain the public launch expression for shareable pass mechanics.

Current implementation status:

- `db/migrations/014_pawket_pal_identity.sql` creates the private-first Pawket Pal identity schema.
- `pawket_pals` stores the unique HeartCode, Pal class, privacy state, consent state, release state, source pet/journal links, edition metadata, CHARM/CHERISH alignment fields, future game metadata, and guarded market/transfer fields.
- `pawket_pal_story_consents` records the consent boundary separately from the Pal record so private Honorary Pals do not automatically grant public story, community character, marketing, transfer, CHARM, or CHERISH rights.
- `pawket_pal_heartcode_events` preserves HeartCode event history for issuance, consent updates, quest/perk events, and future controlled transfer history.
- `/api/pals` is authenticated and currently limited to private account-owned Pal listing, lookup, and private Honorary Pal creation through `/api/pals/honorary`.
- The API does not publish Community Pals, Limited Edition releases, market listings, public trading, or public story content.
- `public/pals.html`, `public/css/pals.css`, and `public/pals.js` now provide the first private Honorary Pal certificate UX. Signed-in users can create a private Pal certificate, optionally connect it to a pet profile, receive a HeartCode, and reopen existing private certificates from the page.
- Account pet profile cards and journal/Core Memory entries now hand off into `/pals.html` with private owned ids. The Pals page resolves those ids after authentication, preselects the pet profile, fetches the private journal memory when present, and pre-fills the Honorary Pal certificate form without putting the private journal text into the URL.
- The account dashboard now includes a Private HeartCodes module that summarizes recent private Pawket Pal certificates, linked pet profiles, linked memories, and review-requested paths.
- Certificate creation and reopening now sync the page URL to the selected Pal HeartCode, so users can reload or return to the exact private certificate state without leaking journal text into the URL.
- `palDB.pg.js`, `routes/palRoutes.js`, `public/pawket-partners-ops.html`, and `public/pawketPartnersOps.js` now provide the first ops-only consent review surface for Honorary Pal rows that request public story, Community Pal, CHARM, CHERISH, marketing, or transfer consideration.
- The ops review surface can mark consent rows as `review_required`, `pending`, `granted`, or `revoked`, and records HeartCode consent events. This is not a public release flow: reviewed Pals remain private/draft unless a later, separate Community Pal or Limited Edition release path is built.
- `POST /api/pals/story-submissions` and the `/pals.html` Story Intake form now provide a dedicated signed-in story submission lane. These submissions create private Honorary Pal records with `origin_type='story_submission'`, private story notes, a consent-safe public summary, and `review_required` consent.
- Story submissions feed the same ops review queue and remain private/draft. They are source material for future Community Pal templates only after consent, moderation, and rights review.
- `POST /api/pals/ops/community-drafts` now creates the first internal Community Pal draft/template records, but only from granted review consent rows with Community Pal rights. Drafts are stored as private `pal_class='community'` Pals with their own HeartCode and source metadata.
- Community drafts are still not public releases. They remain `privacy_state='private'`, transfer locked, market disabled, and visible only through ops surfaces.
- `/pawket-partners-ops.html` now includes an internal Community Pal draft workbench for draft name, consent-safe character summary, personality/quest traits, art direction, internal moderation notes, and release checklist state.
- `PATCH /api/pals/ops/community-drafts/:id` saves that workbench state without changing public visibility.
- `POST /api/pals/ops/community-drafts/:id/release-gate` is the first release gate. It validates source consent linkage, public copy, art direction, primary trait, privacy state, disabled market behavior, locked transfer state, and checklist items before moving a draft to `release_state='review'`.
- The release gate is still not a public release. It keeps the Community Pal private and marks it ready for future public-surface review only.
- `GET /api/pals/community-previews` now exposes a redacted public preview feed for release-gated Community Pal drafts only. It does not require sign-in, but it only reads private/protected Community Pal records in internal `release_state='review'` with the release gate marked ready and market/transfer behavior still disabled.
- The preview feed intentionally omits owner details, source consent IDs, source Pal IDs, source HeartCodes, private story notes, internal moderation notes, and raw art-direction notes. It returns the Community Pal HeartCode, name, consent-safe summary, broad inspired-by label, limited traits, and explicit privacy/market boundary flags.
- `/community.html` now renders those preview records in a gated Community Pal preview panel and stays hidden when no preview-ready records exist.
- `POST /api/pals/ops/community-drafts/:id/public-approval` now provides the next ops-only gate for redacted public Community Pal previews. It requires explicit confirmations that the public preview is ready, the private source story remains redacted, market/trading stays disabled, and CHARM/CHERISH public claims are not being made.
- Public preview approval moves the Community Pal to `privacy_state='public'` and `release_state='active'` only for the controlled preview surface. It keeps `market_enabled=false`, `transfer_locked=true`, `charm_enabled=false`, and `cherish_enabled=false`, records `communityDraft.publicApproval.status='public_preview_approved'`, and still does not create a drop, transfer path, marketplace listing, or CHARM/CHERISH claim.
- `GET /api/pals/community-previews` now includes both internal release-review-ready private previews and public-preview-approved records, always through the same redacted payload.
- `GET /api/pals/community-previews/:heartCode` now resolves approved public-preview Community Pals by HeartCode. It only returns redacted detail sections: identity, story-safe summary, limited traits, public safeguards, and future handoff placeholders for Heroic Quests, Share Studio, and Pawket Haven.
- `/community.html` now opens approved public previews in a redacted detail modal. Release-review-ready cards remain detail-locked until ops public-preview approval is complete.
- `POST /api/pals/ops/community-drafts/:id/public-archive` now gives ops a takedown path for approved public previews. Archiving removes the Pal from public lookup/surfaces, returns it to private archived state, and keeps market, trading, transfer, drop, CHARM, and CHERISH behavior disabled.
- The public page still treats future public story use, Community Pal adaptation, CHARM/CHERISH connection, marketing use, transfer, and market behavior as separate consent/review paths rather than automatic outcomes.

## Pawket Pal Classes

Not every Pawket Pal should have the same purpose. Classes preserve emotional dignity while giving the business room to grow.

### Honorary Pawket Pals

Honorary Pawket Pals are created from customer-submitted pet stories.

They may be:

- Private to the submitter.
- Shared publicly only with permission.
- Used as inspiration for future broader characters only after explicit rights and review.
- Given as a digital certificate or special tribute.

Honorary Pawket Pals should feel intimate and personal. They are not automatically mass collectibles and should not be treated as default tradeable assets.

### Community Pawket Pals

Community Pawket Pals are inspired by real stories but adapted into public-facing characters.

They can appear in:

- Pawket Packs.
- Pawket Packets.
- Heroic Quests.
- Pawket Haven.
- Story cards.
- Community events.
- Game events.

Community Pawket Pals are the main public collectible Pal class, but they still require source consent, review, and story dignity.

### Limited Edition Pawket Pals

Limited Edition Pawket Pals are intentionally scarce public releases.

Examples:

- Charm's Day editions.
- Founders editions.
- Rescue milestone editions.
- Seasonal CHARM editions.
- Shelter partnership editions.
- Future CHERISH healing editions.

Limited Editions can carry stronger functional or market value because they are authenticated, numbered, and tied to meaningful moments. They still must not imply investment return.

### One-of-One Pawket Pals

One-of-One Pawket Pals are singular and protected.

Charm's private Pawket Pal belongs here.

Charm is not a collectible, not a product, not a public reward, and not a market asset. Charm is the protected memorial/origin figure and the heart of the mission. Her one-of-one Pal remains locked/private unless the owner explicitly defines a different protected internal use.

## Rarity Language

Rarity can exist, but it should be framed around meaning, not artificial hype.

| Tier | Meaning |
| --- | --- |
| Family Pal | Public Pal available through normal engagement. |
| Rescue Pal | Connected to a reviewed CHARM rescue, adoption, or shelter story. |
| Legacy Pal | Inspired by a beloved pet who has passed, with consent and dignity. |
| Guardian Pal | Earned through major kindness, donation, or quest milestones. |
| Founders Pal | Early supporter edition. |
| One-of-One | Singular private or protected tribute. |

Rarity should help people understand meaning and provenance. It should not become cold, manipulative, or speculative.

## Pawket Points And HeartPoints

Pawket Points are the practical reward currency.

They can be earned through:

- Purchases.
- Pawket Pack subscriptions.
- Pawket Packet orders.
- Pawket Picks milestones.
- Referrals.
- Story submissions after review.
- Event participation.

They can be used for:

- Discounts.
- Bonus items.
- Early access.
- Pawket Pal accessories.
- Game perks.

HeartPoints are the emotional and impact layer.

They can be earned through:

- CHARM donations.
- Future CHERISH donations.
- Rescue sponsorships.
- Shelter support.
- Adoption story submissions after review.
- Memorial tributes after consent.
- Heroic Quests.
- Future verified volunteering.

HeartPoints can influence impact status, Heroic Quest progress, Pal growth, badges, and contribution multipliers. Do not promise redeemable monetary value until compliance and accounting rules are defined.

## Contribution Multiplier System

The contribution multiplier is a strong loyalty and impact idea: the more someone contributes to the mission, the more power their future eligible purchases can carry.

Example model:

| Tier | Requirement | Future Purchase Contribution |
| --- | --- | --- |
| Heartkeeper | Entry level | 1% of eligible purchases to CHARM |
| Guardian | $25 donated or equivalent HeartPoints | 2% |
| Rescuer | $100 donated or equivalent HeartPoints | 3% |
| Legacy Builder | $250 donated or major quest participation | 5% |
| Lightbearer | $500+ or annual supporter | 7% |

Customer-facing direction:

> The more love you pour into the mission, the more power your everyday care carries forward.

Implementation guardrails:

- Use "eligible purchases" and define eligibility before launch.
- Do not imply all purchases always trigger donations.
- Track contribution caps, campaign periods, accounting rules, refund handling, and charity receipts.
- Keep CHARM and CHERISH contribution rules separate where legally or operationally needed.
- Avoid pressure, guilt, or manipulative donation framing.

## Game Integration

Pawket Pals should eventually become playable, nurtureable companions.

Each Pawket Pal may have:

- Personality traits.
- Mood.
- Bond level.
- Growth path.
- Favorite activities.
- Kindness affinity.
- CHARM or CHERISH alignment.
- Quest abilities.
- Cosmetic accessories.
- A home space in Pawket Haven.

Example traits:

| Trait | Gameplay Meaning |
| --- | --- |
| Gentle | Better at healing quests. |
| Brave | Better at rescue quests. |
| Playful | Better at joy and community quests. |
| Wise | Better at memory and legacy quests. |
| Loyal | Gains stronger bond bonuses. |
| Curious | Unlocks exploration events. |

Traits should give the Pals personality while preserving the emotional origin.

## Pawket Haven

Pawket Haven is the preferred future game/world name for the warm, safe, mission-aligned space where Pawket Pals live and grow.

Pawket Haven can include:

- A home area for each customer's Pawket Pals.
- A garden or memory space.
- Quest board.
- CHARM rescue missions.
- Future CHERISH healing missions.
- Seasonal events.
- Pawket Pal interactions.
- Collection archive.
- Family story wall.

Pawket World and Pawket Park can remain broader or adjacent language, but Pawket Haven is the strongest current name for the future emotional game home.

## Heroic Quests

Heroic Quests are how real-world good becomes account, Pal, and future game progress.

Example quest families:

### Rescue Quest

Action:

- Donate to a reviewed CHARM medical or rescue case.

Rewards:

- HeartPoints.
- Pawket Pal courage boost.
- Rescue badge.
- Story update when consent-safe.

### Memory Quest

Action:

- Submit a tribute for a pet who passed.

Rewards:

- Legacy badge.
- Memory lantern accessory.
- CHERISH HeartPoints if CHERISH is active and appropriate.

### New Beginning Quest

Action:

- Share an adoption story with consent.

Rewards:

- Adoption ribbon.
- Pawket Pal joy boost.
- Shelter spotlight contribution.

### Kindness Quest

Action:

- Support a local shelter, volunteer, or share an adoptable pet through a reviewed path.

Rewards:

- Community badge.
- Pawket Points.
- Quest completion marker.

## Protected Market Value

Pawket Pals may eventually become financially meaningful through controlled ecosystem value, not speculative hype.

Possible value sources:

- Numbered editions.
- Verified HeartCode ownership.
- Perks attached to ownership.
- Event access.
- Game areas.
- Quest bonuses.
- Early product access.
- Exclusive Pawket Packs.
- Contribution multipliers.

Example edition format:

```text
Benny the Brave - Charm's Day Rescue Edition
HeartCode: CD-2027-BENNY-042/500
```

Future protected family market rules:

- Only HeartCode-verified transfers.
- A portion of resale can support CHARM or CHERISH if legally and operationally approved.
- Private Honorary Pawket Pals remain non-transferable unless the owner explicitly enables transfer.
- One-of-One sacred tributes remain locked/private.
- No public claim of investment value or guaranteed resale value.

## Packs, Packets, Picks, And Pals

Pawket Packs are monthly premium subscriptions.

They can include:

- Products.
- Story cards.
- Pawket Pal items.
- CHARM or CHERISH updates.
- Quest codes.
- Limited digital unlocks.

Pawket Packets are smaller intro/sample bundles.

They can include:

- Smaller product selection.
- Starter Pawket Pal card or digital Pal.
- Story insert.
- Gentle invitation into the full ecosystem.

Tagline direction:

> Big love comes in small Packets.

Pawket Picks are bonus choices unlocked by purchase threshold.

They can include:

- Treat sample.
- Toy.
- Pawket Pal card.
- Digital accessory.
- CHARM donation.
- HeartPoints boost.

## Living Customer Loop

The ideal loop:

1. Customer buys something for their pet.
2. They receive a Pawket Pick, Packet, or Pack.
3. They meet a Pawket Pal.
4. They learn the story behind that Pal.
5. They feel connected to the mission.
6. They donate, submit a story, or complete a Heroic Quest.
7. Their Pawket Pal grows.
8. Their HeartPoints increase.
9. Their future eligible purchases contribute more.
10. They feel like part of the Pet Pawket family.
11. They return.

This loop should feel like care, story, connection, contribution, reward, and deeper belonging. It should not feel like pressure, guilt, speculation, or a gimmick.

## Strategic Center

Pet Pawket can become four things at once:

- A pet commerce brand that sells real products people need and enjoy.
- A subscription brand where Pawket Packs create recurring value.
- A charitable engine where CHARM and future CHERISH create real-world good.
- A digital emotional world where Pawket Pals become characters, companions, and protected valuable assets.

The center:

> Every pet has a story. Every story deserves love. Every act of love can help another life.

## Recommended Next Implementation Sequence

1. Update public Pawket Pals positioning so the page explains living value without promising marketplace behavior.
2. Define a first database model for Pal identity: Pal records, HeartCodes, class, privacy state, source story consent, edition metadata, and account ownership.
3. Add story submission and consent fields needed to create Honorary Pals safely.
4. Add a private Honorary Pal certificate flow before public collectibles.
5. Add Community Pal templates only after moderation and rights review.
6. Add redacted Community Pal public-preview approval only after the internal release gate, keeping market/trading/drop/CHARM claim behavior disabled.
7. Add redacted HeartCode detail views and an ops archive/takedown path for approved public previews.
8. Add Pawket Points and HeartPoints as accounting-safe internal ledgers before public redemption rules.
9. Add Heroic Quest records that can connect purchases, CHARM activity, story submissions, and Pal growth.
10. Add contribution multiplier rules only after eligibility, caps, refunds, receipts, and compliance handling are defined.
11. Defer resale, trade, or protected market features until HeartCode ownership, transfer controls, legal review, and marketplace policy are complete.
