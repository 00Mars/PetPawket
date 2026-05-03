# Pet Pawket Current State

Last updated: 2026-05-03

This document preserves continuity for the current Pet Pawket launch-prep work. Future sessions should read this after `docs/PET_PAWKET_CANON.md` before making changes.

## Current Focus

The recent work has been launch-prep polish across account, Pawket Dock, search, shop, curated box pages, and Pawket Passes. The current active surface is `/loop.html`, which has been built from a placeholder into a real Pawket Pass hub and claim path while preserving the internal Loop contracts.

Account work ties together:

- Pet profiles.
- Pet edit modal polish.
- Add Pet modal polish.
- Species-aware breed/type fields.
- Real pet journals.
- Core Memory state.
- Story Trail progress.
- Heroic Quest/checkpoint foundations.
- Future Pawket Pals and CHARM handoff language.

## Restart Handoff

If the machine has been restarted, resume from these repo-local continuity files before making implementation changes:

1. `AGENTS.md`
2. `docs/PET_PAWKET_CANON.md`
3. `docs/PET_PAWKET_CURRENT_STATE.md`
4. `docs/CODEX_RECOVERY_NOTES.md`

Current working app command:

```bash
cd /home/lumi/PetPawket
PORT=3001 node server.js
```

The server was running at `http://localhost:3001/` before restart with logs previously going to `/tmp/petpawket-3001.log`. After a reboot, start it again on port `3001` before browser QA.

Current implementation continuity:

- Do not rename the internal `loop` routes, database fields, storage key, or API contracts. Public copy should say `Pawket Passes`.
- `/api/cart/create` remains the canonical cart creation path. Pawket Pass codes saved as `pp_loop_token` are carried into cart/checkout creation while normal inventory stays Shopify-backed.
- Charm is protected memorial/origin content and must not be used as a generic demo pet, placeholder, fallback, public impact story, or collectible.
- The worktree is intentionally broad and dirty from launch-prep work. Do not revert unrelated files.
- The latest verified page was `/loop.html`; next work should continue from Pawket Pass page polish or move to the next explicitly requested surface.

## Most Recent Work

The latest completed pass expanded the Pawket Passes page and supporting copy.

Pawket Pass latest pass:

- `/loop.html` now includes a real pass link/code entry on the hub. It accepts raw pass codes or pasted URLs containing `token` or `code` and routes to `/loop.html?token=...`.
- The hub shows saved-pass resume and clear controls when `pp_loop_token` is present. Clearing removes localStorage/cookie state and removes stale saved-pass UI from the page.
- The hub and claim page now share a clearer connector grid for Shop, Account, CHARM, and future Pawket Pals/quests.
- The claim page now explains browser-local saving, cart-checkout carryover, and private journal boundaries through explicit assurance chips.
- Public CHARM impact slots show a consent-safe waiting state when there are no approved public stories.
- The community pulse filters out one-person/test chains and zero-share rows so test data like `QA Loop` is not displayed as meaningful public social proof.
- Public copy avoids public technical terms such as `Shopify` and `canonical` on the Pawket Pass page while keeping the actual technical contracts intact.
- `docs/PET_PAWKET_CURRENT_STATE.md` was updated for continuity after this pass.

Recent verification for this Pawket Pass page pass:

- `node --check public/loop.js`
- `node --check public/loopTracker.js`
- `node --check public/loopModal.js`
- `node --check public/hero.js`
- `node --check routes/loopRoutes.js`
- `git diff --check -- public/loop.js public/css/loop.css docs/PET_PAWKET_CURRENT_STATE.md`
- `npm test` passed 14/14.
- `curl http://localhost:3001/api/loop/health` returned `{"ok":true}`.
- `curl -I http://localhost:3001/loop.html` returned `200 OK`.
- Browser QA on `http://localhost:3001/loop.html` confirmed hub, pass-code entry, claim page, saved-pass clear behavior, connector grid, consent-safe CHARM empty state, filtered community pulse, mobile width at `390px`, and no page-level horizontal overflow.

## Prior Recent Work

Earlier polish work rebuilt the global widget bar into a clearer launch surface called the Pawket Dock.

Pawket Dock state:

- The public dock model is now organized around fixed ecosystem shortcuts plus pinned apps: a combined Care + Impact shortcut, a scrollable dock app strip, and Apps.
- Shop is no longer a fixed dock lane because it is already covered by the navbar, homepage, product surfaces, and footer. Shop, Packs, Packets, and Picks remain reachable from the Apps shelf/overflow utilities.
- The dock keeps existing widget/app internals available as actual pinned dock apps instead of hiding every experimental widget behind Apps.
- Desktop renders as a compact side toolbar with visible short labels, `role="toolbar"`, an accessible label, and arrow-key roving focus.
- Mobile renders as a horizontally scrollable bottom dock with visible labels instead of continuously expanding or using the previous carousel.
- The old widget app bodies remain available from the new panels for Core Memory, Pawket Pass/Loop, Story Lane, Pawket Pals, Packs/Picks, and Integrations Lab. The former Care Rhythm public app has been merged into the fixed Care Journals + Impact surface while keeping the internal `reminders` id/storage key for stale-state compatibility.
- Support copy was softened from reward/streak language toward practical support paths.
- Dock action panels now avoid duplicate related-app rows; the primary cards are the handoff surface.
- Apps keeps the deeper app shelf, while launch actions stay focused on their primary page/app handoffs.
- Persisted collapsed state is now safe on desktop and mobile: desktop becomes an expandable icon rail, and mobile still shows the fixed actions plus pinned apps.
- On the left-side desktop dock, collapsed mode sits centered inside the expanded dock footprint instead of hugging the far-left edge or right edge. It remains closer to the hero slides, opens back into the same footprint with an outward-feeling expansion, and the collapsed control arrow points left.
- Desktop panel positioning now clamps around rendered panel height so tall panels stay inside the viewport after opening.
- Dock panels now include lightweight status strips. These hydrate from existing safe sources only: signed-in pets when available, local reminder/Core Memory state, featured products, public CHARM impact endpoints, Loop/Pawket Pass summary when signed in, open widget apps, and connected providers.
- Status strips stay launch-safe for signed-out users by showing account prompts or preview values instead of empty broken metrics.
- The deeper widget app windows now have a tighter shared chrome, less noisy card styling, app-specific accent variables, clearer focus states, and mobile-safe window spacing above the bottom dock.
- Widget app windows now render as non-modal dialogs with explicit `aria-labelledby` wiring while preserving the existing draggable/minimize/close behavior and app storage keys.
- Public widget copy now moves the old Loop Token language toward Pawket Passes and HeartCode-style rules without renaming the internal `loop` app id or route.
- Care Journals + Impact now owns the care rhythm, local quick checks, durable account journals, Core Memory summaries, CHARM handoff language, and future Pawket Pals/Share Studio/Town Square pathways in one fixed dock surface.
- Care Journals + Impact now includes an in-panel journal composer for signed-in users with pet profiles, so care notes can be saved to the durable `/api/pets/:id/journal` record without redirecting to the account page.
- The fifth dock action is now labeled `Apps` on the public surface while preserving the internal `more` action id. Its panel presents the full app shelf first, with support and dock settings below it.
- Dock selected state is now reserved for an open dock panel. Opening a widget app no longer makes related tabs such as Impact appear selected; the open-app indicator is held on Apps only.
- Desktop dock spacing was widened so header text, action labels, and two-line metadata are no longer heavily clipped. Dock action panels use a two-column header so the close control does not overlap title text.
- The dock mark/icon color was toned down from the saturated teal/gold treatment to a quieter white/teal treatment.
- Opening an app from the Apps shelf now pins it to the dock app strip. Apps can be pinned, removed, and moved up/down from the shelf; pinned app bubbles can also be drag-reordered on the dock.
- Desktop pinned apps live in a bounded vertical scroll strip. Mobile pinned apps live in the horizontal dock scroll strip. The dock no longer keeps growing as more apps are pinned.
- The separate fixed Pawket Pals shortcut was removed. Pawket Pals now behaves as a dock app, with preview, profile, Community, Town Square, mood, and random Pal preview controls folded into the Pals app window.
- Care journals and Impact are now grouped under the same fixed Care + Impact shortcut. Its panel links account journals/Core Memories with CHARM Story Lane and Pawket Pass handoffs.
- The desktop pinned app strip now shows about three and a half apps before scrolling, includes a subtle centered bottom scroll cue when more apps are available, and dock app buttons have restored per-app color accents instead of a single muted treatment.
- The pinned-app scroll cue is hidden in collapsed desktop mode because the collapsed icon rail does not show enough app-list context for that indicator to be clear.
- Mobile dock ordering keeps Apps next to the fixed Care + Impact shortcut, then shows pinned apps in the horizontal scroll track so the app shelf is not buried after the app list.
- Selecting a pinned dock app now preserves the pinned-app scroll position instead of re-rendering back to the top of the list. The Apps tab also has a little extra separation from the pinned-app section.
- Dock and navbar icon buttons now explicitly grid-center Bootstrap icon glyphs and apply a small optical nudge for heart-shaped icons so Care and Wishlist no longer sit off-center.
- Desktop Pawket Dock vertical positioning has been standardized from the homepage baseline across normal site pages. Pages without the homepage hero now use the same lower desktop dock baseline instead of falling back near the top of the post-nav viewport, and the shop-only vertical offset override was removed.
- The Care + Impact dock action now hydrates against the real pet journal system instead of only local placeholder state. Its status strip and live panel read signed-in pets, `/api/pets/:id/journal` entries, explicit Core Memory flags, and inferred future handoff targets for Pawket Pals, CHARM, Share Studio, and Town Square while keeping signed-out states privacy-safe.
- The Care Journals + Impact dock surface and Core Memory dock app now treat account journals as the durable source of truth. Quick care checks remain local-only helpers inside the Care surface, while Core Memory summaries come from real journal entries with local drafts only as a fallback.
- The Care panel journal composer preserves privacy defaults, optional Core Memory marking, handoff metadata, tags, and quick-check context. Successful saves refresh dock journal metrics and dispatch Story Trail refresh events without creating a second journal store.
- The dock listens for account Story Trail refresh events so pet, journal, and Core Memory changes on the account page can invalidate and rehydrate the Care surfaces without creating a parallel journal store.

Relevant files:

- `public/hero.js`
- `public/widgetDock.js`
- `public/widgetAppSdk.js`
- `public/widgetDock.html`
- `public/css/hero.css`
- `public/css/navbar.css`

Recent verification for this dock slice:

- `node --check public/hero.js`
- `node --check public/widgetDock.js`
- `node --check public/widgetAppSdk.js`
- `npm test`
- Browser QA on `http://localhost:3001/`
- Desktop dock check: semantic toolbar, fixed launch actions plus desktop collapse control, no console errors.
- Mobile dock check at `390px`: fixed actions plus pinned apps are horizontally scrollable, no page-level horizontal overflow, no console errors.
- Collapsed-state QA: persisted collapsed desktop dock remains expandable and mobile still renders all five launch actions.
- Panel QA: fixed Care + Impact and Apps panels no longer repeat the same related widgets below their action cards; Apps remains scrollable for deeper tools.
- Status QA: Care + Impact and Apps status strips render on desktop and mobile, hydrate where existing endpoints allow, and do not create console errors.
- App-window QA: Core Memory, Pawket Passes, Story Lane, Pawket Pals, Packs/Picks, and Integrations Lab open through the dock/app shelf with dialog labels, in-viewport geometry, no old Loop Token public copy inside the Pass app, and no console errors. The former Care Rhythm app is intentionally not listed as a public dock app.
- Apps shelf QA: desktop and mobile show `Apps` as the fixed shelf item, the app shelf is discoverable before utilities, opening Pawket Passes from Apps leaves only Apps selected, and close controls do not overlap panel text.
- Pin/remove/reorder QA: Apps shelf shows pinned and unpinned states, opening or pinning an app adds it to the dock, removing an app takes it off the dock, move controls update persisted `pp-widget-band` order, desktop app strip scrolls when many apps are pinned, and Shop remains overflow-only.
- Care integration QA: signed-out desktop and mobile Care panels show safe sign-in states, local quick checks, journal/Core Memory/CHARM/Pawket Pal handoff copy, no horizontal overflow appears at `390px`, and no browser console errors were detected.
- Merged Care QA: stale browser state with `reminders` pinned/open migrates back to the default dock app set, the old Care Rhythm app is not shown in Apps, the Care panel owns quick checks, and local quick-check state still uses `pp-widget-reminders` for compatibility.

The global search overlay has now been rebuilt from a plain scaffold into a launch-ready Pet Pawket surface.

Search overlay state:

- The overlay keeps the established `#searchOverlay`, `#searchInput`, `#searchCategory`, `#searchGo`, and `#searchResults` contracts.
- The public shell now presents Pawket Search with a branded home state, quick pages, category chips, and a scoped results surface instead of opening as an empty placeholder.
- Search results can combine Shopify/native product search, signed-in pet profiles, signed-in care journals, and static Pet Pawket ecosystem pages such as Pawket Packs, Pawket Packets, Pawket Picks, Pawket Pals, CHARM Foundation, Pawket Network, Pawket Passes, pet profiles, and care journals.
- The overlay avoids localStorage search history so personal pet and journal queries are not stored casually in the browser.
- Keyboard and modal behavior were tightened: focus moves into search on open, Escape closes, focus returns to the opener, category chips stay synced to the legacy select, stale search requests are ignored, and `aria-hidden`/`aria-busy` states are maintained.
- Search handoffs now turn preview results into useful next steps: shop queries continue to `/shop.html?q=...`, inferred pet-type searches can jump to whimsical pet shelves such as `?pet=bird`, pack-eligible add-on searches can hand off to the shop planning shelf, and care/impact queries link toward account, CHARM, and Pawket Network surfaces.
- Search page matching now includes dog, cat, bird, small pet, fish, and reptile shelves so terms such as `bird toys`, `cockatiel`, or `blue-fronted amazon` can surface the right Pet Pawket page even when product inventory is sparse.
- Search copy now distinguishes query-based shop actions from static browse shelves: e.g. `Search the dog shelf` uses the current query, while `The Dog Shelf` opens the broader pet shelf page.
- The overlay was given a restrained blush color pass with the peach weight rebalanced toward the lower-right as a near-off-white warmth, and the top blue wash shifted left, fading back into white at the far-left edge.
- The search CSS is now scoped to the overlay in `public/css/navbar.css`; `public/main.js` no longer injects the old fallback search stylesheet when `core.css` or `navbar.css` is present, preventing runtime style overrides.
- Search overlay shell alignment now uses a sequential flex stack and explicitly resets the older generic `.search-tools` sticky offset, so the filter row no longer drops into or overlaps the home/results area.
- The `/api/search` route now honors a small product result limit and skips direct Shopify product search when Storefront credentials are not configured, leaving the browser fallback to use existing product data.

Relevant files:

- `public/navbar.html`
- `public/navbar.js`
- `public/css/navbar.css`
- `public/main.js`
- `routes/searchRoutes.js`

Recent verification for this search slice:

- `node --check public/navbar.js`
- `node --check public/main.js`
- `node --check routes/searchRoutes.js`
- `git diff --check -- public/navbar.html public/navbar.js public/css/navbar.css public/main.js routes/searchRoutes.js`
- `npm test`
- Browser QA on `http://localhost:3001/`: desktop open state, search home state, product query results, Impact/CHARM category filtering, Escape close behavior, no injected fallback search stylesheet, no console errors.
- Browser QA follow-up: `toy` shows product preview plus full-shop and pack-eligible add-on handoffs; `dog toys` shows query-based Dog Shelf search plus the broader Dog Shelf page result; `bird toys` shows Bird Shelf search plus the broader Bird Shelf page result.
- Mobile QA at `390px`: overlay card fits within viewport, no horizontal overflow, and the handoff/action rows stay within the card.
- Browser QA alignment follow-up: desktop and mobile search toolbar/results geometry no longer overlaps; the first home-state card sits below the filter row, and `bird toys` query results remain within the overlay card.
- API smoke check: `/api/search?q=toy&limit=4` returns a limited product result payload after server restart.

The old account-page `For My Pets` scaffold has now been moved into a more appropriate shop-owned personalization flow.

For My Pets personalization state:

- Account pet profiles remain the source of truth for species, detail fields, traits, allergies, preferences, notes, journals, and Core Memory context.
- The account page no longer exposes the old in-page recommendation test pane. It now shows a small handoff card linking to `/shop.html?mypets=1`.
- The shop page owns the launch-facing `For My Pets` experience through the existing `#pp-my-pets-toggle` and `#pp-my-pane` contracts.
- `public/petPersonalization.js` contains pure helpers for normalizing pet profile signals and ranking catalog products without adding dependencies or a build step.
- Shop personalization now uses saved pet details beyond generic pet type: species/detail, allergies, dislikes, toy/food preferences, size, chew/play/cage/habitat/water traits, and care notes.
- Turning on `For My Pets` loads signed-in pet profiles, renders per-pet shelves with explanation chips, wishlist/cart/detail actions, profile edit handoffs, and curated box-path handoffs.
- The main product grid now reranks around saved pet profiles while preserving the existing shop filters, page size, pagination, and product-card contracts.
- The curated ecosystem routes include a `For My Pets` entry that leads into the tuned shop surface.

Relevant files:

- `public/petPersonalization.js`
- `public/shop.js`
- `public/css/shop.css`
- `public/account.html`
- `public/css/account.css`

The shop page has started a ground-up visual and information-architecture redesign to remove the accumulated patchwork feel.

Shop redesign state:

- `public/shop.html` now organizes the page as a single Pet Pawket Market surface: hero/context, six ecosystem route cards, one command card for filters/modes, optional For My Pets pane, curated shelves, and product grid.
- The old assurance strip and duplicate curated ecosystem route block were removed from the active shop flow.
- For My Pets is now treated as a primary shopping mode, not an account-side test panel or a buried toggle.
- `public/shop.js` curated shelves now render actual shelves only: cart starters, care rhythm goods, play/enrichment, and pack-eligible add-ons.
- `public/css/shop.css` was rebuilt around a quieter market palette, lighter surfaces, lower visual noise, softer wishlist treatment, responsive command controls, dock-aware desktop spacing, and mobile-first access to the route cards.
- Shop visual pass 2 corrected the over-offset desktop shell by balancing the dock lane with an equal right gutter, restored the shared site background behind the shop, removed the shop-specific background wash/brand-pattern texture, kept foreground panels mostly opaque with only faint glass exposure, added subtler route-card color accents, and fixed compressed shop preview images so smaller product cards keep real thumbnail boxes instead of horizontal strips.
- Shop visual pass 3 adds a more distinctive Pet Pawket market identity without changing contracts: the hero now has a compact ecosystem trail, foreground panels have branded inner borders and path accents, the route cards read as one connected shop/world path, shelves and product cards have richer depth and hover treatment, and mobile grid overflow was fixed with an explicit single-column shell track.
- `public/css/core.css` now guards older `.product-card img` surfaces with a minimum image box so wide product photos do not collapse into thin banners when card layouts are tightened.
- Existing functional contracts were preserved: `#pp-grid`, `#pp-search`, `#pp-category`, `#pp-sort`, `#pp-page-size`, `#pp-subscribe-toggle`, `#pp-my-pets-toggle`, `#pp-my-pane`, `#shop-curated`, `#shop-active-filters`, and product card/cart/wishlist hooks.

Relevant files:

- `public/shop.html`
- `public/shop.js`
- `public/css/shop.css`
- `public/css/core.css`

Pawket Packs / Packets / Picks boundary state:

- Pawket Packs, Pawket Packets, and Pawket Picks now have dedicated curated launch pages instead of being framed as generic shop buttons.
- `/packs.html` is the canonical public Pawket Packs destination.
- `/packets.html` and `/picks.html` are distinct box-family destinations for trial/sample/partner boxes and curated bonus/threshold items.
- `/shop.html?subscribe=1` remains available as a shop-owned pack-eligible add-on shelf, but public copy should not present it as the Pawket Packs page.
- Shop, navbar, footer, subnav, CHARM, and search handoff copy now distinguish curated box pages from pack-eligible catalog items.
- The shop pack modal now saves products as pack-eligible add-ons for box planning rather than implying live subscription signup.

Relevant files:

- `public/packs.html`
- `public/packets.html`
- `public/picks.html`
- `public/css/pawket-boxes.css`
- `public/shop.html`
- `public/shop.js`
- `public/navbar.html`
- `public/navbar.js`
- `public/footer.html`
- `public/subnav.html`
- `public/charm.html`

Pawket Passes state:

- `/loop.html` is now a real Pawket Pass hub and claim surface instead of a thin placeholder.
- Public copy uses Pawket Pass language while preserving the internal `/api/loop/*`, `pp_loop_token`, and loop database contracts.
- A pass claim link can save the pass code to localStorage and cookie, then send the user into the shop/cart path. The canonical checkout handoff remains `/api/cart/create`, where the cart includes the saved pass as a Shopify cart attribute.
- The hub explains the customer path: order or gift, share with care, claim before shopping, checkout securely, then receive a new pass after eligible purchase.
- The hub now also includes a pasteable pass-link/code entry, saved-pass controls, a clearer shop/account/CHARM/future-world connection section, and public community pulse filtering so one-person/test chains are not shown as meaningful social proof.
- The pass page shows a consent-safe CHARM impact waiting state when no approved public impact stories are available instead of filling the page with protected or placeholder pet stories.
- The account Pawket Pass tracker now includes a richer overview, next-step progress, pass guidance, badges, community/impact panels, shareable/claimed/in-motion tabs, copy/open/share-card actions, and signed-out guidance.
- The Pawket Pass modal now supports opening a specific pass from Account, has clearer sharing copy, an empty state, share-card download naming, and hides itself from the accessibility tree while closed.
- The Pawket Dock Pass app copy now reflects the active pass system instead of "coming soon" placeholder language.
- Public impact endpoints now suppress genericized Charm story data from Pawket Pass surfaces. Charm remains protected memorial origin content, not a reusable impact story.

Relevant files:

- `public/loop.html`
- `public/loop.js`
- `public/loopTracker.js`
- `public/loopModal.js`
- `public/css/loop.css`
- `public/hero.js`
- `routes/loopRoutes.js`

The active account polish now includes Story Trail and My Pets card integration beyond the Add Pet modal work below.

Story Trail / progress state:

- `public/account.html` includes the launch-readiness Story Trail context strip.
- `public/storyHub.js` reads pet journal metrics from real pet journal entries.
- `public/storyHub.js` now distinguishes real journal care moments from broader quest/checkpoint signals.
- The left-column `Your Progress` card and main `Your Story Trail` panel update from the same pet, journal, Core Memory, quest, Pawket Pass, and CHARM impact context.
- Journal metadata can contribute future handoff targets such as Pawket Pals, Share Studio, CHARM, and Town Square preview surfaces.
- The account Story Trail and Pawket Pass sections have had their public copy simplified so the visible UI reads as customer-facing account language instead of internal launch, test, handoff, XP, or reward-planning language.
- A broader public copy pass also softened visible homepage, news, admin, CHARM, community, Pawket Packs, Pawket Packets, Pawket Picks, Pawket Pals, search, and Pawket Dock wording away from internal terms such as launch preview, local preview, handoff, Loop Token, recursive reward chains, chain founder, Story XP, kindness streak, and HeartCode-style. Existing internal selectors/storage keys/data contracts using older names were intentionally preserved.
- Charm canon was corrected: Charm is a protected memorial/origin figure and must not be used as a generic demo pet, placeholder pet name, seed/default pet, mock account pet, product example, ordinary rescue case, or fallback. Use neutral copy such as "your pet", "a pet profile", or "sample pet" for examples and test flows.

My Pets card state:

- `public/account.js` renders richer pet cards with species-aware detail labels, journal counts, latest entry, Core Memory callout, and handoff tags.
- Pet card journal summaries hydrate from each pet's real journal entries and refresh after journal create, delete, and Core Memory toggles.
- The card language treats Core Memory as meaningful state, not a generic favorite.
- Pet profile cards now have a more polished profile-card shell with species-aware accenting, private-care state badges, compact action buttons, stronger journal/Core Memory hierarchy, and hydrated Core Memory icon state.

Signed-out account state:

- `public/account.html` now includes a signed-out account preview in the right column instead of leaving the account surface mostly blank.
- The preview introduces pet profiles, journals, Core Memories, Pawket Packs, CHARM, and consent-safe handoffs without exposing authenticated account controls.
- `public/css/account.css` contains the scoped desktop/mobile layout for this preview.

Recent browser QA created a temporary signed-in account, added a sample Cockatiel pet profile, added two journal entries, marked one Core Memory, and verified that the account and Story Trail surfaces showed:

- 1 pet.
- 2 journal care moments.
- 1 Core Memory.
- 3 future handoff targets.
- 80% progress with the next step pointing to Pawket Pass / purchase connection.

Signed-out QA verified that the account preview is visible only while signed out, authenticated account content remains hidden, and the page has no horizontal overflow. Signed-in QA verified that the preview hides once authenticated account content appears. Mobile QA at 390px showed no horizontal overflow.

The latest implementation replaced the old inline Add Pet form with a full Add Pet modal that resembles the Edit Pet modal.

Relevant files:

- `public/account.html`
- `public/account.js`
- `public/css/account.css`

Current Add Pet modal behavior:

- Opened by the `Add Pet` CTA in the My Pets section.
- Uses existing `#addPetForm`, `#newPetName`, `#newPetType`, and `#newPetBirthday` contracts.
- Adds up-front fields for photo, species/type, breed/species/type, traits, diet, allergies, training, measurements, and notes.
- Supports species-aware labels such as `Bird species` instead of forcing `Breed`.
- Includes common bird species/options such as Blue-fronted Amazon Parrot and Cockatiel.
- Supports `Other` detail entry.
- Serializes add-pet traits into `#addPetTraitsJson`.
- Sends `breed`, `traits`, and normalized top-level trait fields to `/api/pets`.
- Uploads a staged avatar after create when a pet id is returned.
- Emits pet refresh/progress events after successful create.

The most recent fix corrected Add Pet modal width. It was being capped by the global `.modal-content { max-width: 400px; }` rule in `public/css/core.css`. The fix added an explicit `max-width: 980px` to `.account-pet-profile-modal .modal-content` in `public/css/account.css`, matching the Edit Pet modal.

Verified measurements after the width fix:

- Add modal desktop width: `980px`
- Edit modal desktop width: `980px`
- Mobile 390px modal width: `370px`
- No horizontal overflow detected.

## Current Verification

Recent checks passed:

- `node --check public/petPersonalization.js`
- `node --check public/shop.js`
- `node --check public/navbar.js`
- `node --check public/forMyPets.js`
- `node --check public/widgetDock.js`
- `node --check public/hero.js`
- `node --check public/account.js`
- `node --check public/storyHub.js`
- `git diff --check -- public/packs.html public/packets.html public/picks.html public/css/pawket-boxes.css public/navbar.html public/footer.html public/subnav.html public/shop.html public/shop.js public/navbar.js public/charm.html public/account.html public/forMyPets.js docs/PET_PAWKET_CURRENT_STATE.md`
- `git diff --check -- public/shop.html public/shop.js public/css/shop.css docs/PET_PAWKET_CURRENT_STATE.md`
- `git diff --check -- public/petPersonalization.js public/shop.js public/css/shop.css public/account.html public/css/account.css docs/PET_PAWKET_CURRENT_STATE.md`
- `git diff --check -- public/account.html public/account.js public/css/account.css`
- `npm test`
- Browser QA on `http://localhost:3001/packs.html`, `/packets.html`, and `/picks.html`: desktop and mobile no horizontal overflow, no console errors, curated box pages load, and desktop dock does not overlap hero content after the box-page gutter fix.
- Browser QA on `http://localhost:3001/shop.html?subscribe=1`: the toggle reads `Pack-eligible`, active filters use `Pack-eligible`, grid add-on CTAs read `Save as add-on`, modal copy says `Save as pack-eligible add-on`, and no console errors were detected.
- Browser QA for Pawket Dock positioning on `/`, `/shop.html`, `/packs.html`, `/account.html`, `/charm.html`, and `/pawket-network.html`: desktop dock top/bottom now matches the homepage baseline within a few pixels at 1366x900 and 1280x720, mobile bottom dock remains unchanged at 390px, no horizontal overflow, and no console errors.
- Browser QA for Pawket Dock Care integration on `http://localhost:3001/`: desktop Care panel hydrates journal/Core Memory/handoff rows into a signed-out-safe state, quick checks live inside the Care surface, Core Memory opens with journal-linked copy, mobile `390px` Care panel has no horizontal overflow, and browser console errors remained at `0`.
- Browser QA for merged Care dock surface on `http://localhost:3001/`: the old `reminders`/Care Rhythm app is removed from visible dock apps and Apps shelf, stale `reminders` pinned/open localStorage migrates safely, quick-check checkbox state updates `pp-widget-reminders`, and desktop/mobile console errors remained at `0`.
- Browser QA for in-panel Care journal creation on `http://localhost:3001/`: a throwaway signed-in account with a sample Cockatiel profile saved a `wellness` journal entry from the Care modal, marked it as Core Memory, persisted `dock-care-journal` metadata and handoff targets, refreshed the Care journal count to `1`, fit at `390px`, and reported `0` console errors.
- Browser QA for pet profile card polish on `http://localhost:3001/account.html`: a throwaway signed-in account with a sample Cockatiel profile rendered the polished pet card with `1` journal entry, `1` Core Memory, hydrated star icon/state badge, desktop/mobile no horizontal overflow, and `0` console errors.
- Browser QA for account copy simplification on `http://localhost:3001/account.html`: a throwaway signed-in account with a sample Cockatiel profile showed the simplified Story Trail and Pawket Pass surfaces without the old `handoff`, `launch preview`, `test mode`, `Story XP`, `kindness streak`, `Loop Token`, or chain-founder language; the removed Storyboard block stayed absent; localhost pass tools stayed hidden unless explicitly requested; desktop/mobile had no horizontal overflow and `0` console errors.
- Copy-polish verification: syntax checks passed for `public/hero.js`, `public/navbar.js`, `public/account.js`, `public/storyHub.js`, `public/loopTracker.js`, `public/loop.js`, and `public/loopModal.js`; `git diff --check` passed for the touched copy files; `npm test` passed 14/14; `http://localhost:3001/account.html` returned 200.
- Browser QA on `http://localhost:3001/account.html`
- Browser QA on `http://localhost:3001/shop.html?mypets=1`
- Browser QA follow-up after shop redesign: desktop avoids Pawket Dock overlap, route cards are visible below the hero, mobile has no horizontal overflow and reaches route cards before the bottom dock covers content.
- Console error check: `0` errors during the Add/Edit modal QA pass.
- Console error check: `0` errors during the Story Trail / progress QA pass.
- Console error check: `0` errors during the For My Pets shop/account smoke pass.

The currently defined `npm test` command runs `node --test tests/networkRoutes.test.js` and passed 14/14.

The local server has been running on port `3001` during QA. As of the latest refresh, it was reopened with `PORT=3001 npm start`.

## Open / Actively Touched Files

The active account polish files are:

- `public/account.html`
- `public/account.js`
- `public/css/account.css`
- `public/storyHub.js`

Related account/pet/story files that have been part of recent launch-prep work include:

- `routes/petsRoutes.js`
- `routes/journalRoutes.js`
- `public/accountPets.js`
- `public/accountPetsBridge.js`
- `public/accountPetsTraitsEnhancer.js`
- `public/accountProfileGuard.js`
- `public/petTraitsform.js`
- `public/css/pets-traits.css`

Do not assume the whole dirty worktree belongs to the next task. The repo currently contains many modified and untracked files from broader launch-prep work. Future changes should stay tightly scoped and avoid reverting unrelated files.

## Account Area State

### Mostly Implemented

- Signed-in account shell.
- Profile fields.
- Address area.
- My Pets list.
- Add Pet modal.
- Edit Pet modal.
- Pet avatar staging/upload.
- Species-aware breed/type/species detail selector.
- Journal modal foundations.
- Real journal entry flow rather than pure placeholder UI.
- Core Memory concept and journal linkage.
- Story Trail progress sections.
- Heroic Quest/checkpoint foundation.
- Pawket Pass / Loop test surface.
- Story Trail context strip fed by real pets, journals, Core Memories, quests, and handoff targets.
- My Pets cards with journal summaries, latest entry, Core Memory state, and handoff tags.

### Still Needs Polish / Hardening

- Confirm Add/Edit modal parity across more pet species and long custom values.
- Confirm all trait fields persist and rehydrate consistently across add/edit/list/journal surfaces.
- Improve account information density and mobile layout where needed.
- Continue reviewing journal modal interactions after the Add/Edit modal changes.
- Keep confirming Core Memory state across add/edit/delete flows and browser refreshes.
- Continue checking Story Trail progress after journal and Core Memory changes as new account features are added.
- Confirm empty states remain warm and launch-ready.

## Commerce And Launch Context

The launch is both Shopify-backed shop/inventory and native Pet Pawket systems.

Important decisions already stated:

- Normal shop and inventory are Shopify based.
- The rest of the site is its own Pet Pawket system.
- `/api/cart/create` should be treated as a canonical path.
- Pawket Packs are in development.
- Pawket Network lead forms should be testable and verifiable at launch.
- Public partner verification must be handled carefully.
- Namecheap/cPanel is expected for launch hosting for `petpawket.com`.
- Node.js app setup and PostgreSQL databases are available in the hosting environment.

## Open Decisions

These are not blockers for account modal polish, but they affect launch sequencing:

- Final public naming for Loop Tokens vs HeartCodes.
- Final public naming for Pawket Points vs HeartPoints.
- Exact Shopify cart handoff behavior and production credentials.
- Pawket Packs subscription launch scope.
- Which Pawket Network listing states are public at launch.
- What story submission consent model is required for public stories and future Pawket Pals.
- Which parts of Pawket Pals/Pawket World remain teaser-only at MVP.
- Production database migration and seed strategy for Namecheap/cPanel.

## Recommended Next Actions

1. Continue account polish from the user-facing surfaces first.
2. Recheck Add/Edit modal parity for dog, cat, bird, rabbit, reptile, fish, horse, ferret, and other.
3. Continue polishing journal modal layout and persistence after modal parity is stable.
4. Expand account empty states, error states, and mobile density now that Story Trail data is flowing.
5. Recheck progress/quest updates after each new account-surface change.
6. Review `/api/cart/create` and Shopify handoff only after account polish stops moving.
7. Keep Pawket Network lead forms testable but keep verification/trust controls conservative.

## Cautions For Future Sessions

- Do not rename established IDs, routes, data attributes, or selectors casually.
- Preserve `#navbar-container`, `#footer-container`, `#addPetForm`, `#editPetModal`, `#addPetModal`, and pet/account selector contracts.
- Treat DOM structure as behavior-bearing.
- Do not flatten Pet Pawket into a generic ecommerce template.
- Preserve Charm as the protected memorial/origin figure, never as a generic demo/default/seed pet name.
- Never make Charm's private one-of-one Pawket Pal a public collectible.
