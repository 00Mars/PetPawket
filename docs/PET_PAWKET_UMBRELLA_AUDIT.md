# Pet Pawket Umbrella Audit

Last updated: 2026-06-03

This document captures the current Pet Pawket umbrella review after the launch-prep work across the store, Pawket Packs, Pawket Packets, Pawket Picks, account, Pawket Passes, Pawket Pals, Community, CHARM, Pawket Network, Pawket Places, and the Pawket Dock.

Use this before broad page redesigns so Pet Pawket keeps reading as one living ecosystem instead of a set of disconnected feature pages.

## Current Diagnosis

Pet Pawket now has enough real surfaces that the main risk is no longer emptiness. The risk is fragmentation.

The storefront, account system, Pawket Passes, Pawket Pals, CHARM, Network, Places, Community, footer guide, and Pawket Dock all exist or have launch-prep scaffolding. Several pages explain the future well, but the user journey can still feel like a collection of separate destinations instead of one loop that starts with a pet and carries care, story, community, and impact forward.

The strongest unifying product spine is:

1. A customer shops, subscribes, or builds a pet profile.
2. The pet profile and journals create private care/story context.
3. Pawket Pals preserve emotional meaning through private certificates, HeartCodes, and consent-led story paths.
4. Pawket Passes let care, gifts, referrals, and impact travel without exposing private records.
5. CHARM carries mission and rescue impact once verified receipt/story rules are ready.
6. Pawket Network and Pawket Places connect the ecosystem to real-world care providers and pet-safe places.
7. Community/Town Square becomes the consent-safe public lane for Pawprints, approved Pal previews, pass activity, partner highlights, and CHARM-safe updates.

## Surface Roles

| Surface | Current Role | Needed Umbrella Role |
| --- | --- | --- |
| Home | Storefront and ecosystem preview | The clearest first explanation of the loop: pet care, story, Pals, Passes, CHARM, Network, and Community |
| Shop | Product catalog and Shopify-backed commerce path | Practical first action that can feed pet context, Packs, Picks, Passes, and later rewards |
| Packs | Subscription box education | Recurring care/story product that can later connect to Pal items, HeartCodes, and CHARM moments |
| Packets | Trial/sample box lane | Low-commitment entry into the same care/story loop |
| Picks | Bonus/threshold lane | Small rewards that should support the cart and future Pal/HeartPoint moments without becoming random clutter |
| Account | Private pet care record | The private source of truth for pets, journals, Core Memories, HeartCodes, Story Trail, and future Heroic Quests |
| Pawket Passes | Share/claim/save path using internal Loop contracts | Public-friendly movement layer for gifting, referral, CHARM-safe impact, and future HeartCode trails |
| Pawket Pals | Private-first Pal certificates, story intake, HeartCodes, ops review, and public-preview gates | Emotional bridge between real pet stories, legacy, loyalty, impact, and Pawket Haven |
| Community | Consent-safe Town Square surface | Public lane for reviewed Pawprints, Pal previews, partner highlights, pass activity, and CHARM-safe updates |
| CHARM | Protected foundation/impact preview | Mission and verified impact layer, never fake receipts or unsupported assistance promises |
| Pawket Network | Provider directory and partner ecosystem | Real-world care/provider layer with trust states, claims, nominations, and future account/quest handoffs |
| Pawket Places | Pet-safe reference-location concept | Separate location reference lane for dog parks, trails, beaches, relief areas, and safety notes |
| Pawket Dock | Personal floating workspace | Quick personal actions and active widgets, not a second global nav or stale roadmap panel |
| Footer guide | Recovery and routing tool | "Find the next useful stop" route helper, not primary product explanation |
| Pet Care Planning | Dormant direct preview | Must stay non-discoverable until review approves care-support public visibility |

## What Feels Disconnected

### Global Navigation

The nav groups are useful, but Pawket Pals have become too important to be hidden behind Community or the Dock. Pals should be reachable as an active ecosystem surface because `/pals.html`, private certificates, HeartCodes, story intake, ops review, Community draft gates, redacted previews, and public-preview approval now exist.

Care-support discovery should remain held. Do not add Pet Care Planning back to nav, footer, search, account, CHARM, or Explore links until the decision log approves public visibility.

### Pawket Dock

The Dock is valuable, but it should stop presenting implemented features as future ideas. Pawket Pals are no longer just "coming soon." The safe current language is:

- Private certificates.
- HeartCodes.
- Consent-led story paths.
- Pawket Haven later.

The Dock should act as a personal workspace:

- Pet Workspace for private pets, care checks, journals, favorite memories, and Pal starting points.
- Pawket Pals.
- Stories.
- Pawket Shop for Packs, Packets, Picks, and Pawket Passes.
- App shelf/settings.

The Dock should remain the host, launcher, window manager, and personal shortcut layer. The apps themselves should be treated as registered Pawket app modules that can also run in a standalone web shell. First-party apps, connected provider shortcuts, and future approved partner apps must stay visually and technically separate. App Shelf settings should only expose current behavior, not deprecated label modes, hidden badge toggles, or duplicate app-manager panels.

The current first-party app taxonomy is Pet Workspace, Pawket Pals, Pawket Shop, and Stories. Pawket Shop owns the app-shell experience for Packs, Packets, Picks, and Pawket Passes while the website routes and internal contracts remain distinct. App access, connected providers, partner-access status, and Dock settings belong inside the fixed Apps shelf panel, not inside a separate App Manager app. Former separate Care Rhythm and Favorite Memory app surfaces should route into Pet Workspace as direct-lookup compatibility aliases only, and the former Packs + Picks app ID should route into Pawket Shop as a direct-lookup compatibility alias. These aliases should not appear in normal app lists, standalone tabs, Dock settings, or styled current-app shells.

Third-party or partner app access must use explicit manifests, approved scopes, sanitized summaries, and host-executed action intents. Do not let partner apps read raw pet profiles, private journals, private stories, care-support records, finance records, account secrets, assistance details, medical details, memorial details, or rescue/adoption source material.

It should not duplicate the entire footer or nav.

### Home

The home page still reads strongest as a store page. Commerce should stay prominent, but the first product story should be clearer:

> Start with care for your pet. Pet Pawket turns that care into profile context, story, Pawket Pals, Pawket Passes, trusted local paths, and CHARM-safe impact.

The store can remain the first action, but Pawket Pals and the private account story loop should not feel buried under future-block language.

### Community

Community is privacy-conscious and structurally safer than before, but it still feels staged. It should become the public-facing counterpart to the private account/Pals system:

- Private story stays private.
- User chooses what can travel.
- Reviewed Pal previews can appear.
- Pawprints can represent approved public moments.
- CHARM and Network updates appear only through consent-safe review.

### CHARM

CHARM copy is appropriately cautious. The next improvement is to give visitors a safe day-one action without pretending the receipt, assistance, or case systems are live. Suitable actions:

- Shop Pet Pawket.
- Open Pawket Passes.
- Learn what CHARM is preparing.
- Join/ask for updates through contact.

Avoid fake donation ledgers, fake rescue cases, fake medical receipts, or public assistance promises.

### Network And Places

Network and Places now have a good conceptual separation. Their next umbrella role is cross-handoff:

- Network should help someone find care providers, nominate missing providers, and understand trust states.
- Places should help someone find pet-safe locations, rules, and safety context.
- Both should eventually connect to account planning, saved places/providers, and Heroic Quest style actions.

## Immediate Implementation Priorities

### Phase 1: Global Coherence

1. Treat Pawket Pals as an active private/HeartCode surface in nav, footer, help, and Dock copy.
2. Keep care-support discovery dormant.
3. Clarify global roles:
   - Navbar: public ecosystem map.
   - Pawket Dock: personal workspace/actions.
   - Footer: recovery and route finder.
4. Remove or soften stale "soon" language for implemented Pals features.
5. Keep CHARM "in progress" language where the underlying receipt/assistance systems are not live.

### Phase 2: Home Reframe

1. Rework the home hero/supporting sections so the user understands the living loop earlier.
2. Keep commerce CTAs clear.
3. Make Pals, Passes, and private profile/story context visible as real day-one paths.
4. Reduce generic future-world copy unless it explains a concrete handoff from current systems.

### Phase 3: Page-Level Continuity

1. `/pals.html`: make private certificate and story intake the obvious first actions.
2. `/loop.html`: make pass claim/save/share feel connected to account, Pals, and CHARM without exposing private records.
3. `/community.html`: make it clear which content is public, reviewed, staged, or local/private.
4. `/pawket-network.html` and `/pawket-places.html`: improve saved-provider/place future hooks without merging the lanes.
5. `/charm.html`: add safe day-one CTAs and keep unsupported systems visibly pending.

### Phase 4: Product System Backbone

Plan, but do not overbuild until explicitly requested:

1. A first Heroic Quest record model or static quest registry.
2. Share Studio output rules for approved public Pal previews.
3. Account saved provider/place stubs.
4. CHARM-safe update subscription or contact path.
5. Home/dashboard "living loop" summary component.

## Guardrails

- Do not flatten Pet Pawket into a generic ecommerce site.
- Do not use Charm as a placeholder, demo pet, sample pet, generic memorial example, or collectible.
- Do not imply Pawket Care Credit, CHARM Emergency Assistance, or insurance referral functionality is launched.
- Do not expose private pet profiles, journals, memorial stories, rescue stories, medical details, assistance details, or raw story submissions.
- Do not treat source-imported Pawket Network records as claimed, verified partners, or CHARM-supported providers.
- Do not mix Pawket Places into Pawket Network provider listings.
- Do not imply Pawket Pals have public trading, resale, market value, or CHARM/CHERISH claims until legal/release controls exist.

## Next Best Pass

The next best implementation pass is a global coherence pass:

1. Update nav/footer/Dock language so Pals are active and care support remains dormant.
2. Browser-QA the public entry points after global copy changes.
3. Then rework the home page around the customer spine before making deeper page-specific polish changes.
