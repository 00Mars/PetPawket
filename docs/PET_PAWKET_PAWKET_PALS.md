# Pet Pawket Pawket Pals

Last updated: 2026-05-15

This document preserves the broad Pawket Pal model for future work. For the detailed living-value roadmap, read `docs/PAWKET_PALS_LIVING_VALUE_SYSTEM.md`. For privacy and care-support boundaries, read `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` and `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`.

## Core Idea

Pawket Pals are story-based companions, not random mascots.

They can be inspired by real pet stories, rescue stories, adoption stories, memorial stories, community kindness, CHARM moments, future CHERISH moments, and account-owned pet memories. They should preserve emotional dignity while preparing for future play, rewards, keepsakes, provenance, and Pawket Haven.

Every Pawket Pal should answer:

- What story or spirit does this Pal honor?
- What consent allows this Pal to exist?
- What is private, shareable, public, or protected?
- What HeartCode anchors its identity?
- What future value or game behavior is allowed without exposing private data?

## Pawket Pal Classes

Honorary Pawket Pals:

- Personal, consent-led tributes.
- Created from customer-submitted pet stories, account pet profiles, journals, or Core Memories.
- Private by default.
- May be given as a certificate or keepsake.
- Not automatically public, tradeable, market-enabled, or CHARM-connected.

Community Pawket Pals:

- Public-facing characters adapted from reviewed, consent-safe stories or community moments.
- Use redacted and permissioned story material.
- Can later appear in Community, Pawket Packs, Pawket Packets, Heroic Quests, Share Studio, or Pawket Haven.
- Must not expose raw private stories, account identity, medical hardship, assistance status, or unreviewed rescue details.

Limited Edition Pawket Pals:

- Meaningful, authenticated, possibly numbered public releases.
- Can be tied to Charm's Day, founders moments, rescue milestones, seasonal CHARM editions, shelter partnerships, or future CHERISH moments.
- Need legal, product, consent, moderation, and release review before public launch.
- Must not imply investment value, guaranteed resale value, or speculative upside.

One-of-One Pawket Pals:

- Singular private or protected tributes.
- Charm's private Pawket Pal belongs here.
- One-of-One Pals should stay private/protected, transfer locked, and market disabled unless an explicit protected-use decision says otherwise.

## Charm Guardrail

Charm is the protected memorial/origin figure. Charm's private Pawket Pal is not a public collectible, not a drop, not a marketplace item, not a product insert, and not a sample Pal.

Do not use Charm as a default avatar, fallback Pal, generic memorial example, public Community Pal, randomized reward, or public release.

## Share Your Heart

Share Your Heart is the preferred warm name for story submissions.

People may share:

- Saved Hearts: rescue stories.
- Treasured Memories: memorial stories.
- New Beginnings: adoption stories.
- Kindness in Action: stories of people, pets, rescues, shelters, and community care.
- Living beloved-pet stories.
- Optional photos, traits, favorite memories, symbolic marks, and avatar preferences.

Privacy rules:

- Private by default.
- Consent must be explicit and use-specific.
- Public story use, Community Pal adaptation, CHARM impact use, social use, marketing use, and future transfer/market use are separate decisions.
- Raw private story notes, journals, Core Memories, medical details, assistance details, rescue-sensitive details, and family hardship details must not leak into public Pal surfaces or HeartCodes.

## Character And Avatar Direction

Future Pal creation can use:

- Real story.
- Optional real photo.
- Pet traits.
- Species.
- Body type.
- Fur, markings, eyes, expression.
- Accessories.
- Symbolic marks.
- Personality.
- Favorite memory.

The final Pal should be a symbolic, stylized tribute, not necessarily a literal copy. It should honor the spirit of the animal without exposing private details or making grief feel like content.

## HeartCodes

Every Pawket Pal should eventually carry a HeartCode: a durable identity anchor for authenticity, provenance, ownership/guardianship, consent-safe origin metadata, perks, game state, quest history, and possible future transfer history.

HeartCodes must not encode:

- Private pet profiles.
- Private journals.
- Raw story text.
- Medical records.
- Assistance records.
- Insurance records.
- Family hardship details.
- Account-sensitive data.
- Unreviewed rescue, adoption, or memorial details.

## Current Implementation State

The current repo has a private-first Pawket Pal implementation foundation:

- `db/migrations/014_pawket_pal_identity.sql` defines Pal classes, privacy states, consent states, release states, rarity tiers, origin types, HeartCode events, Pal records, consent records, and event history.
- `palDB.pg.js` implements the Pal data layer.
- `routes/palRoutes.js` mounts `/api/pals` for private listing, private Honorary Pal creation, story submissions, ops review, internal Community draft work, release gates, public preview approval, redacted public preview lookup, and archive/takedown.
- `public/pals.html`, `public/pals.js`, and `public/css/pals.css` provide signed-in private Honorary Pal certificates and story intake.
- `public/account.html` and `public/account.js` connect pet profiles, journals, Core Memories, and Private HeartCodes to the Pal path.
- `public/community.html` and `public/communityPals.js` can render redacted Community Pal previews only after gates are satisfied.
- `/pawket-partners-ops.html` and `public/pawketPartnersOps.js` support ops review and Community Pal draft work.
- `scripts/seed-qa-story-world.js` provides a local-only, fictional QA seed that exercises the private Honorary Pal, consent review, Community draft, public-preview approval, and redacted preview path. It must stay QA-only: no Charm sample data, no real pet/family/rescue/medical/assistance/memorial details, no market behavior, no transfer path, no public drop, and no CHARM/CHERISH public claims.

The implementation intentionally does not launch public drops, market listings, transfer paths, CHARM public claims, CHERISH public claims, or raw public story pages.

## Future Pawket Haven

Pawket Haven is the preferred current name for the warm future game home where Pawket Pals can live and grow.

Future Pal traits may support gameplay:

- Gentle: healing/support quests.
- Brave: rescue quests.
- Playful: joy/community quests.
- Wise: memory/legacy quests.
- Loyal: bond bonuses.
- Curious: exploration events.

Build this layer from real account, story, consent, HeartCode, and quest foundations. Do not build a disconnected minigame that ignores the emotional origin of the Pals.
