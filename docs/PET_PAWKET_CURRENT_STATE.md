# Pet Pawket Current State

Last updated: 2026-06-30

This document preserves continuity for the current Pet Pawket launch-prep work. Future sessions should read this after `docs/PET_PAWKET_CANON.md` before making changes.

## Latest Safety Hardening

The 2026-06-30 security pass addressed the high-risk review findings first:

- Public Pawket Network list/detail responses now pass through public-only redaction at both the data and route boundaries. Owner user IDs, claim status, verification internals, priority/featured controls, and lead email/webhook routing stay internal while public browsing keeps safe listing, location, contact, offer, media, badge, and lead-form availability fields.
- Network lead webhooks now reject local/private/reserved targets at integration-save time and re-check DNS before live delivery. Live webhook dispatch blocks redirects, uses an abort timeout, and public rate limiting no longer trusts raw `X-Forwarded-For` unless `TRUST_PROXY_RATE_LIMIT_IPS=true` is explicitly set.
- Pet avatar upload now accepts only PNG, JPEG, GIF, and WebP data URLs, validates base64 and image magic bytes, normalizes JPEG/PNG/WebP through Sharp, size-limits decoded uploads, and serves avatar files only with known image content types plus `X-Content-Type-Options: nosniff`.
- Login and signup still set HttpOnly `auth_token` and `shopify_token` cookies when appropriate, but no longer return the JWT or Shopify customer token in JSON. The first-party auth client is now cookie-first and clears legacy `authToken`/`shopifyAccessToken` localStorage values instead of persisting or sending bearer tokens.
- Password reset tokens now include a random JWT ID and are backed by the `password_reset_tokens` table as SHA-256 hashes. Reset links must be stored, unexpired, and unused before a password change succeeds; successful resets revoke outstanding reset tokens for that user.
- Loop admin and debug controls now require explicit operator configuration. Admin routes require the signed-in email to appear in `ADMIN_EMAILS`; debug seed/clear routes require non-production, `LOOP_DEBUG_ENDPOINTS_ENABLED=true`, and authentication.

The follow-up 2026-06-30 security hardening pass closed the remaining high-risk items from the deep security check:

- Signup now rejects any existing email record, including no-password rows created by Shopify/account-linking paths, so signup cannot claim a webhook-created or fallback-created customer account. The stale `routes/signup-route.js` module is now a fail-closed `410` compatibility stub if it is ever mounted accidentally.
- `server.js` now applies baseline security headers and an unsafe-method origin guard for cookie-backed requests. Cross-origin unsafe requests with an `Origin` or `Referer` are rejected, and production cookie-backed writes require request provenance. Login, signup, password reset, password change, and CHARM prototype form submissions now use proxy-safe in-memory rate limiting that ignores forwarded IP headers unless `TRUST_PROXY_RATE_LIMIT_IPS=true`.
- Password reset links now use `PUBLIC_SITE_URL`, `PETPAWKET_PUBLIC_URL`, `APP_BASE_URL`, or `SITE_URL` in production instead of trusting the request `Host`. Reset tokens are consumed before bcrypt hashing, so replayed or invalid stored tokens fail cheaply.
- Shopify cookie fallback auth now allows cached customer identity only for safe read methods. Unsafe methods require a live Shopify token verification and fail closed on Shopify timeout.
- Pet journal writes now validate note/title/mood/tag sizes, cap metadata, and allow only bounded PNG/JPEG/GIF/WebP data URLs or same-site upload paths for journal photos. The account photo picker now rejects unsupported image types before upload.
- Authenticated global search now returns pet and journal summaries only. Journal search no longer returns raw row data, photos, metadata, visibility fields, or other private payload details.
- Unused vulnerable direct dependencies `docker` and `uuid` were removed, Express transitive dependencies were patched (`qs` and `path-to-regexp`), and `npm audit` now reports `0` vulnerabilities for the full install.
- Runtime `uploads/` files remain ignored and staged for removal, but the current Git history still contains previously committed pet media blobs. If those blobs were pushed anywhere public or shared, history rewrite and remote cache invalidation remain a separate operational cleanup.

The 2026-06-06 safety pass addressed the first review findings before resuming account polish:

- `server.js` no longer serves the entire `uploads/` tree. Network claim upload paths remain blocked, current flat `/uploads/pets/:fileName` avatar files and legacy one-directory `/uploads/pets/:ownerDir/:fileName` avatar files remain public, and deeper nested pet upload paths such as journal media are blocked from public static access.
- `.gitignore` now ignores `uploads/` as runtime media so pet uploads are not meant to be tracked with the repo.
- `routes/petsRoutes.js` gates `/api/pets/echo` behind `PETS_DEBUG` in non-production only and no longer returns raw headers, cookies, full customer payloads, or full DB user payloads.
- Pawket Pal story-review consent now defaults private-first: the shared-story and Community Pal checkboxes on `/pals.html` are unchecked by default, reset back to unchecked after submit, and omitted API consent defaults to `false` in `palDB.pg.js`.

## Latest Account Modal Parity

The 2026-06-06 account polish pass addressed the next documented account item:

- Add and Edit pet modals now expose the same trait chip keys, and Edit now serializes chip changes, allergy chips, measurements, and notes back into `petTraitsJson` before saving.
- Existing Edit hydration now restores allergy chips plus measurement/note fields from saved pet traits, with safe fallbacks from existing top-level pet fields where available.
- `POST /api/pets` now returns the post-update pet row when create-time normalized fields such as sex or spay/neuter are written after insert.
- `userDB.addPet` now returns `updatedAt` with the same casing as list and update pet queries.
- Journal modal polish continued after modal parity: composer and filter type selects now hydrate from the canonical journal type list, the visible favorite-memory filter copy no longer says `Core only`, and journal loads are guarded so stale responses from a previous pet cannot overwrite the currently open pet timeline.

## Current Focus

The newest Pawket Admin finance pass adds a local-only desktop panel navigation/focus contract scaffold. It consumes the existing desktop panel renderer scaffold, builds in-memory selection state, focus metadata, keyboard action metadata, attention routing, and disabled-action surfaces, then prints a stdout-only non-production navigation/focus summary through `npm run pawket-admin:desktop-navigation:inspect`.

This remains scaffold-only. It does not create an Electron/Tauri app, browser UI, public route, production finance editor, ledger posting interface, report generator, export package, official balance, persisted panel state, persisted navigation state, persisted focus state, runtime snapshot, connector network call, document upload, or raw document output. Production encryption, raw document storage, live ledger commits, official reports, official balances, final exports, public impact claims, tax/accountant/investor/foundation/public packages, connector networking, document upload, persisted runtime state, and packaged desktop UI remain blocked.

The newest documentation pass added a fresh-thread project orientation layer without changing runtime behavior:

- `docs/PET_PAWKET_PROJECT_OVERVIEW.md` captures the umbrella identity, customer loop, active/dormant posture, current repo architecture, and safest next implementation direction.
- `docs/PET_PAWKET_FOUNDATIONS.md` captures CHARM, Charm's protected origin role, Charm's private one-of-one Pawket Pal boundary, CHARM Emergency Assistance guardrails, and CHERISH separation.
- `docs/PET_PAWKET_PAWKET_PALS.md` captures Pawket Pal classes, Share Your Heart, avatar direction, HeartCode privacy, current private-first implementation state, and Pawket Haven direction.
- `docs/PET_PAWKET_REWARDS_AND_HEARTCODES.md` captures HeartCodes, Pawket Passes versus internal Loop contracts, Pawket Points, HeartPoints, contribution multipliers, Pawket Care Credit, CHARM Emergency Assistance, insurance referrals, and the current no-build care-support approval state.
- `AGENTS.md` now points broad orientation work to those docs before substantial implementation changes.

The recent work has been launch-prep polish across account, Pawket Dock, search, shop, curated box pages, Pawket Passes, the community surface, Pawket Network, Pawket Places, Pawket Pals, and the home page. `/loop.html` has been built from a placeholder into a real Pawket Pass hub and claim path while preserving the internal Loop contracts. `/community.html` has been rebuilt into a consent-safe Town Square surface. `/pawket-network.html` and `/pawket-places.html` have enough structure to support local care discovery and pet-safe place references. The current active direction is the home and cross-site umbrella pass that makes those surfaces read as one ecosystem.

The newest product-level pass stepped back from page-by-page polish and created `docs/PET_PAWKET_UMBRELLA_AUDIT.md`. That audit records the current umbrella diagnosis: Pet Pawket now has enough real surfaces that the risk is fragmentation rather than emptiness. The next global direction is to make the storefront, account, Pawket Pals, Pawket Passes, CHARM, Pawket Network, Pawket Places, Community, footer guide, and Pawket Dock read as one loop instead of parallel destinations.

The umbrella spine to preserve is:

1. A customer shops, subscribes, or builds a pet profile.
2. The pet profile and journals create private care/story context.
3. Pawket Pals preserve emotional meaning through private certificates, HeartCodes, and consent-led story paths.
4. Pawket Passes let care, gifts, referrals, and impact travel without exposing private records.
5. CHARM carries mission and rescue impact once verified receipt/story rules are ready.
6. Pawket Network and Pawket Places connect the ecosystem to real-world care providers and pet-safe places.
7. Community/Town Square becomes the consent-safe public lane for Pawprints, approved Pal previews, pass activity, partner highlights, and CHARM-safe updates.

Immediate umbrella guidance:

- Treat Pawket Pals as an active private/HeartCode surface, not just a future "soon" idea.
- Keep Pet Care Planning and care-support public discovery dormant until the decision log approves visibility.
- Keep the navbar as the public ecosystem map, the Pawket Dock as the personal workspace/actions layer, and the footer as the recovery/route finder.
- Reframe the home page around the living customer loop before doing deeper page-specific polish.
- Keep customer-facing copy simple, warm, and human. Public pages should not sound like documentation, product architecture, or AI-facing feature descriptions. Use words like care, story, keepsake, gift, share, help, community, and private notes stay private. Avoid front-loading terms like ecosystem, lane, handoff, source, ledger, review queue, consent-safe, CHARM-safe, public-surface, data boundaries, implementation, future hooks, transfer rights, and market language unless the surface is explicitly internal/admin.

## Latest Engineering Pass: CI And Local QA Seeds

The 2026-05-15 continuation pass filled two engineering gaps without changing public routes or adding dependencies:

- `.github/workflows/npm-gulp.yml` now runs a Pet Pawket CI workflow instead of the stale Node 18/Gulp build. The workflow uses Node 20 and 22 for the root app, installs with `npm ci`, checks key JavaScript entry points, runs `npm test`, runs `npm run lint:css`, and typechecks the Expo Pawket Pals app from `apps/pawketpals` on Node 20.
- `package.json` now includes `npm run seed:qa-story-world`.
- `scripts/seed-qa-story-world.js` now provides an idempotent local QA seed for story/Pawket Pal/impact testing. It creates or updates the fictional `qa-story-family@petpawket.test` account, a fictional `Maple QA` pet profile, a private fictional journal source, a private Honorary Pawket Pal, granted story consent, an approved redacted Community Pal preview, and a fictional active impact case titled `QA Seed: Partner Recovery Kits`.
- The seed is local QA scaffolding, not production content. It refuses `NODE_ENV=production`, requires `DATABASE_URL`, contains no real pet/family/rescue/medical/assistance/memorial details, does not use Charm as sample data, and keeps market, trading, transfer, public-drop, CHARM-claim, and CHERISH-claim behavior disabled.
- The impact seed is a fictional case for endpoint/ribbon testing. It is not a donation receipt, assistance decision, emergency-aid case, or real animal story. If a non-QA active impact case already exists, the script preserves it and leaves the QA case inactive.

Current seeded local QA records on the active database:

- Honorary Pal HeartCode: `PAL-HON-2026-B911008F16`.
- Community preview HeartCode: `PAL-COM-2026-8D58934BE4`.
- Public preview API returns the Community preview as redacted, public-preview-approved, market disabled, transfer locked, private source redacted, owner redacted, and without CHARM/CHERISH claims.
- `/api/loop/impact/active` returns the fictional QA impact case as active with `0%` progress.

The first global coherence implementation pass has started:

- `public/hero.js` no longer presents the Pawket Pals Dock app as only a "soon" feature. It now describes private Honorary Pal certificates, HeartCodes, and consent-led story paths.
- `public/navbar.html` now includes `/pals.html` under the Community group so Pawket Pals are reachable as an active ecosystem surface.
- `public/footer.html` now includes Pawket Pals in the footer jump menu and footer path grid, while Community copy is narrowed toward Pawprints and reviewed public stories.
- `public/index.html` now brings the living Pet Pawket loop directly under the hero before the Pawket Packs section. The home page frames day-one behavior as useful care and shopping that can connect to private profiles, journals, Core Memories, Pawket Pals, HeartCodes, Pawket Passes, CHARM-safe impact, Pawket Network, and Pawket Places.
- `public/hero.js` now uses home-hero copy that presents the store as the entry into the broader ecosystem rather than the entire point of the brand.
- `public/pals.html` now leads with the two real Pawket Pal actions: creating a private Honorary Pal HeartCode certificate and submitting a consent-safe story for review. The page adds explicit action cards and anchors for the certificate form, story intake form, and account HeartCode return path.
- `public/loop.js` and `public/css/loop.css` now frame Pawket Passes as the safe public handoff layer. The Pass hub and claim page explain what a pass can carry, what stays private, what requires review, and how to continue into shop, account, Pawket Pals, or CHARM without exposing private pet records.
- `public/impactRibbon.js`, `public/loopTracker.js`, `public/charm.html`, and `public/index.html` had old public "CHARM Points" wording tightened to future HeartPoints or reviewed impact language so the current site does not imply an already-launched CHARM points program.
- `public/community.html` and `public/css/community.css` now make the Town Square publishing flow explicit: private source material, intentional sharing choice, review lane, and approved public moment. The Community Board also includes a lane ledger separating private records, local saved steps, reviewed public content, and public discovery.
- `public/charm.html` and `public/css/charm.css` now make CHARM's active public role clearer as the reviewed impact lane across Pawket Passes, Pawket Pals, Community, Pawket Network, Shop, and Packs. The page now shows impact-review workflow, story-rights boundaries, and active ecosystem return paths while explicitly keeping assistance intake, Care Credit, and insurance referrals dormant.
- `public/pawket-network.html`, `public/pawket-places.html`, `public/css/pawket-network.css`, and `public/pawketNetwork.js` now make the provider directory and pet-safe place reference lanes cross-reference each other without blending data. Network no-result states route park/place intent to Pawket Places, and both pages show the future account-planning lane as private saved-provider/saved-place context rather than public content.
- `public/mission.html` now uses current launch-state language for the home mission section: Pawket Pals, Core Memories, and HeartCodes are active private/story-safe paths, while public stories and CHARM impact remain consent- and review-led.
- `public/account.html`, `public/css/account.css`, and `public/pals.html` now tighten the private account-to-Pals spine: account copy names private HeartCodes, Story Trail routes profile/Core Memory moments toward private Honorary Pal certificates, and the Pals page reflects signed-in private certificate/story intake as active while keeping Community Pal, CHARM, and public-use paths review-led.
- `public/account.js`, `public/css/account.css`, `public/pals.html`, and `public/css/pals.css` now make the Pawket Pal lanes easier to understand without adding new public behavior: private HeartCode certificates, optional review requests, and redacted Community Pal previews are shown as separate paths, with account CTAs for both certificate creation and story review.
- `public/community.html` and `public/css/community.css` now mirror that Pawket Pal lane separation on the public Town Square side. The Community Pal section points visitors back to private HeartCode certificates and consent-safe story intake, then explains that only redacted approved previews belong in Town Square and that those previews are not public drops.
- `public/charm.html`, `public/css/charm.css`, and `public/storyHub.js` now complete the same path from CHARM's side: consent-safe stories start through Pawket Pals intake, CHARM impact connection remains a review boundary separate from private records, approved summaries can return to Community, and generic Pawket Pass quest wording avoids claim-style language on CHARM.
- `public/subnav.html`, `public/hero.js`, and `public/community.html` now remove stale "soon" framing from active CHARM, Pawket Pals, Story Lane, and Community handoffs while keeping public story/impact use review-led and private-source protected.
- `public/hero.js`, `public/loop.js`, and `public/community.html` now replace remaining customer-facing "handoff" wording with clearer shared path, review path, connected path, and next-step language while preserving existing internal selectors and contracts.
- `public/account.html`, `public/account.js`, and `public/css/account.css` now strengthen the account-to-Pawket-Pals source path: profiles, journals, and Core Memories visibly lead into private HeartCode certificates before any optional review or public Community/CHARM path.
- `public/css/account.css` now fixes the Account Private HeartCodes empty-state layout so the intro copy cannot collapse into a zero-width grid column; the source path now spans the card cleanly and the certificate/story CTAs stay aligned beneath it.
- `public/navbar.html`, `public/navbar.js`, and `public/css/navbar.css` now turn the secondary `Links` group into a polished full site-map directory for active customer-facing paths: shop shelves, Packs, Packets, Picks, Account, Story Trail, Pawket Pals, Pawket Passes, Community, CHARM, Network, Places, Partner Portal, Events, News, support, and brand pages. Dormant Pet Care Planning discovery remains absent.
- `public/index.html`, `public/hero.js`, `public/pals.html`, `public/pals.js`, `public/community.html`, `public/communityPals.js`, `public/charm.html`, `public/mission.html`, `public/pawket-places.html`, `public/loop.js`, `public/loopTracker.js`, `public/account.html`, `public/account.js`, and `public/storyHub.js` now have a first public-copy simplification pass. The intent is to keep the same product spine while removing customer-facing internal language. Public copy should lead with care, memories, keepsakes, sharing by choice, CHARM kindness, and practical next steps instead of architecture terms.
- The follow-up public-copy simplification pass extended that direction into `public/footer.html`, `public/news.html`, `public/featuredGrid.js`, `public/packs.html`, `public/packets.html`, `public/picks.html`, `public/shop.html`, `public/product.js`, `public/loopModal.js`, `public/navbar.html`, `public/navbar.js`, `public/pawket-network.html`, `public/pawketNetwork.js`, and the direct dormant `public/pet-care-planning.html` preview. Customer-facing labels now prefer plain terms such as saved stories, favorite memories, box-friendly add-ons, care updates, CHARM kindness, and useful next steps. Internal names and selectors remain intact.
- The next home/account/Pawket Pals coherence pass kept existing routes and selectors while tightening the customer spine: home now points Pals toward private Pal creation, account Story Trail routes people to private-first story intake, account journal summaries use "suggested next steps" instead of internal idea language, and the Pals page names HeartCodes plus review requests without collectible/drop framing.
- The Community/CHARM return-path pass extended the same spine into `public/community.html`, `public/communityPals.js`, `public/charm.html`, `public/charm.js`, `public/charmData.js`, `public/impactRibbon.js`, and `public/storyHub.js`. Community now leads visitors to private-first story intake and reviewed public moments; CHARM now routes back to shop, Pawket Passes, private-first Pals, Community, and local discovery without fake receipt amounts, active assistance language, Care Credit/insurance discovery, CHARM Points, or public-drop framing.

Stabilization verification on 2026-05-10:

- Static checks passed: `git diff --check`, changed JavaScript `node --check`, `npm run lint:css`, and `npm test` with 62 passing tests.
- Live route checks on port `3001` returned 200 for `/`, `/account.html`, `/pals.html`, `/loop.html`, `/community.html`, `/charm.html`, `/pawket-network.html`, `/pawket-places.html`, `/pet-care-planning.html`, `/partner-portal.html`, `/pawket-partners-ops.html`, and `/pawket-network-detail.html`.
- Browser QA passed on desktop and mobile for home, account, Pals, Pawket Passes, Community, CHARM, Pawket Network, Pawket Places, and the direct dormant Pet Care Planning preview: no horizontal overflow, no console errors, loaded footers, and Pawket Dock stayed present and in-bounds.
- Follow-up browser spot check after the Story Lane/Explore copy pass confirmed the refreshed home page no longer renders the targeted stale "soon" labels for active CHARM, Pawket Pals, Story Lane, or Community handoffs; the dormant Pet Care Planning preview remains unlinked from the active home surface.
- Follow-up browser spot check after the shared-path wording pass confirmed home, Community, CHARM, and Pawket Passes render without visible customer-facing "handoff" wording, without the targeted stale "soon" labels, without active Pet Care Planning links, and without horizontal overflow.
- Follow-up browser spot check after the account-to-Pals source-path pass confirmed the Account Pawket Pals source map renders on desktop and mobile, the Pals page still exposes the private certificate form, story intake form, and account return path, and both pages avoid dormant Pet Care Planning links or horizontal overflow.
- Follow-up browser spot check after the Private HeartCodes layout fix confirmed the signed-in empty state no longer collapses the intro copy into a zero-width column; desktop and mobile layouts keep the source map and CTAs in-bounds without horizontal overflow.
- Follow-up browser spot check after the navbar Links pass confirmed the Links directory opens on desktop and mobile with 36 active customer-facing links, uses internal scrolling when needed, avoids horizontal overflow, and still omits dormant Pet Care Planning discovery.
- Follow-up browser spot check after the home/account/Pawket Pals coherence pass confirmed `/`, `/account.html`, and `/pals.html` return 200, render the new private-Pal/story-review/HeartCode wording, report no page-level horizontal overflow on desktop or mobile, and produce no console/page errors.
- Follow-up browser spot check after the Community/CHARM return-path pass ran on port `3011` and confirmed `/community.html`, `/charm.html`, `/pals.html`, and `/loop.html` return 200, avoid targeted care-support/claim/drop/CHARM Points wording, report no page-level horizontal overflow on desktop or mobile, and produce no console/page errors.
- Pawket Network interaction QA passed for Spencer, MA autocomplete/radius search, provider result rendering, empty-result launch desk, provider nomination form presence, and Pawket Places no-result handoff.
- Same-site link crawl across key pages checked 28 internal handoffs and found no broken links.
- Care-support public-surface hold was rechecked: active navbar, footer, search, account, CHARM, Explore, home, Network, Places, Passes, and Pals surfaces do not link to `/pet-care-planning.html`; `public/careSupportFuture.js` remains non-imported; the direct preview remains `noindex,nofollow`.
- `npm run test:networkdb:ci` was not run because `DATABASE_URL_TEST` is not set in this environment.

Additional verification on 2026-05-15:

- Home scroll stabilization removed the old wheel hijack, forced section snapping, repeated `window.scrollTo()` correction, and moving parallax transform from `public/sectionScroll.js` and `public/css/core.css`. The home section index and Return to top button remain, wheel/touchpad scrolling stays native, and the decorative section layer is static. A light wheel-idle settle now only catches near-label stops instead of forcing every wheel gesture to the next section, with scroll anchoring disabled for home section-scene mode so labels hold their target instead of drifting under the fixed navigation. The home section registry follows the DOM order and includes the CHARM impact and Pawket Haven standby sections between Stories and Mission, so they receive stable section height and section-index entries instead of being skipped.
- Mobile home section scenes are content-driven rather than viewport-height-driven. At narrow widths the hero, ecosystem, Packs, Stories, CHARM, Pawket Haven, Mission, and News section starts should keep the same document positions when the browser height changes; desktop keeps the full-screen section treatment. Mobile hero spacing is now width-stable, the secondary hero context panel collapses into a compact action tray instead of a second full visual card, and the short-height Pawket Dock uses a slightly smaller footprint so it does not make the first screen feel as cramped.
- The home News section now uses the full `#news-container` scroll section for a stronger Pet Pawket teal band while the injected news content stays transparent and centered. The home-only footer container bridge removes the bottom gap, so the News color runs directly to the footer boundary and under the footer shell instead of ending as a short boxed backdrop.
- The footer scaffold now has a simpler designed interface in `public/css/footer.css`: brand and paths share the top footer row, the Paths card grid stretches to fill the space beside the Pet Pawket brand card, the brand card uses a larger left logo with raised right-side title copy and a tighter tagline column beside the social links, the quick trail remains a compact full-width utility strip beneath them, the footer shell respects the Pawket Dock content gutter, and the existing footer links/actions remain intact without the previous word-by-word wrapping.
- `npm run seed:qa-story-world` was run twice and stayed idempotent: `2` QA Pals, `1` consent row, and `1` QA impact case.
- `GET http://localhost:3011/api/pals/community-previews?limit=3` returned the redacted `Maple Porchlight Pal` approved preview with market disabled, transfer locked, private source redacted, owner redacted, no public drop, and no CHARM/CHERISH claim flags.
- `GET http://localhost:3011/api/loop/impact/active` returned the fictional `QA Seed: Partner Recovery Kits` case as the active impact case.
- `npm test` passed with `62` tests.
- `npm run lint:css` passed.
- `cd apps/pawketpals && npx tsc --noEmit` passed.
- `node --check scripts/seed-qa-story-world.js`, `node --check server.js`, `node --check routes/palRoutes.js`, and `node --check public/pals.js` passed.

Additional home mobile stabilization on 2026-05-16:

- The local server was kept on `http://localhost:3011/` for browser QA.
- The home mobile hero was adjusted so the `01 / Story` section label no longer overlaps the slide card. `public/css/core.css` keeps mobile section labels at `top: 10px`, and `public/css/hero.css` keeps mobile hero top padding at `42px` so the label has its own clearance.
- Mobile navbar side icon rails were raised in `public/css/navbar.css` with a small `translateY(-6px)` adjustment at `max-width: 440px`.
- The first story slide crop was corrected in `public/css/hero.css` by setting the mobile `.hero-slide--story` background focal point to `38%`. This shows more of the dog mascot face at very narrow widths without pulling the face across the headline copy.
- Browser checks at `332x473` and `390x844` confirmed zero horizontal overflow, stable label clearance, raised icon rails, and the corrected story slide focal point.
- Verification passed: `npm run lint:css`, `git diff --check -- public/css/core.css public/css/hero.css public/css/navbar.css`, `npm test` with `62` passing tests, and Playwright console review with `0` errors and `0` warnings.

Additional verification and Network hardening on 2026-05-23:

- `npm test` now passes with `65` tests after adding coverage for optional signed-in Network attribution and failed claim-upload cleanup.
- `npm run test:networkdb:ci` was run against the configured local `petpawket_test` database; migrations `000` through `015`, the Network seed step, and `5` Network DB integration tests passed.
- Verification also passed for `npm run lint:css`, `cd apps/pawketpals && ./node_modules/.bin/tsc --noEmit`, repository-wide JavaScript `node --check`, `node --check scripts/db-inspect.mjs`, and `git diff --check`.
- Live smoke on `PORT=3011 node server.js` returned `200` for the core public pages, health endpoints, public product/Network APIs, and public Community Pal previews.
- Playwright mobile browser QA at `390x844` confirmed no horizontal overflow and no console warnings/errors across `/`, `/shop.html`, `/account.html`, `/pals.html`, `/community.html`, `/charm.html`, `/pawket-network.html`, `/partner-portal.html`, `/pawket-partners-ops.html`, and the direct dormant `/pet-care-planning.html` preview.
- Implementation hardening kept existing routes and contracts while holding Network import-candidate promotion locks through status update, preserving optional signed-in context for public nominations/leads/outbound clicks, cleaning failed claim proof uploads, resolving Shopify fallback DB identity for `softSession`, and preventing anonymous Pawket Partners Ops pages from firing protected queue requests.

Additional home section rail rebuild on 2026-05-23:

- The home numbered section rail was rebuilt from a clean implementation in `public/sectionScroll.js` and `public/css/core.css` instead of continuing the older placement patchwork.
- Intended rail functions are now limited to home-only section discovery, section metadata, numbered section navigation, active-state tracking, reduced-motion-aware scrolling, and the existing Return to top control.
- The rebuild keeps native scroll behavior and removes the older wheel-settle/snap helper, hero-width placement math, hover-only label dependence, and Dock-collision hiding rules.
- Desktop uses a readable right-side rail with visible numbers and labels. Mobile uses a bottom numbered strip above the Pawket Dock reserve instead of a cramped right-side vertical stack.
- The section labels remain generated from the same metadata so Story, Care, Packs, Stories, CHARM, Haven, Mission, Featured, and News stay aligned with the rail.
- Follow-up QA on 2026-05-24 fixed the incomplete responsive behavior: the desktop rail is content-sized instead of stretched to the viewport bottom, the Return to top control sits outside the desktop rail lane and above the mobile rail, and mobile section buttons use compact item widths instead of inheriting full-track width.
- Small-screen follow-up on 2026-05-24 keeps desktop/larger screens on the side Dock and side section rail, while screens at `860px` wide and below use a stacked fixed bottom control system: Pawket Dock as the upper full-width row and the numbered section bar as the lower full-width row.
- Large-screen side-rail follow-up on 2026-05-24 centers the numbered rail on the hero control center, mirrors the rail's right inset to the open Pawket Dock's left inset, and lets the home hero rail fill the usable desktop space between the Dock and section rail at wide and ultra-wide viewports instead of retaining a fixed 1600px hero shell gap.

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

For broad product orientation in a fresh thread, also read:

1. `docs/PET_PAWKET_PROJECT_OVERVIEW.md`
2. `docs/PET_PAWKET_FOUNDATIONS.md`
3. `docs/PET_PAWKET_PAWKET_PALS.md`
4. `docs/PET_PAWKET_REWARDS_AND_HEARTCODES.md`

Current working app command:

```bash
cd /home/lumi/PetPawket
PORT=3011 node server.js
```

The server is currently expected at `http://localhost:3011/` for this pass, with logs going to `/tmp/petpawket-3011.log`. After a reboot, start it again on port `3011` before browser QA unless a later session records a different port.

Current implementation continuity:

- Do not rename the internal `loop` routes, database fields, storage key, or API contracts. Public copy should say `Pawket Passes`.
- Do not restore the stale GitHub Actions assumptions in `.github/workflows/npm-gulp.yml`: no Node 18 matrix and no `gulp` build unless a real Gulp build is intentionally added later.
- Treat `npm run seed:qa-story-world` as a local QA fixture only. Do not convert it into migrations, server startup behavior, production seed data, real CHARM impact content, or public customer proof.
- `/api/cart/create` remains the canonical cart creation path. Pawket Pass codes saved as `pp_loop_token` are carried into cart/checkout creation while normal inventory stays Shopify-backed.
- Charm is protected memorial/origin content and must not be used as a generic demo pet, placeholder, fallback, public impact story, or collectible.
- The worktree is intentionally broad and dirty from launch-prep work. Do not revert unrelated files.
- The latest verified pages are `/`, `/account.html`, `/pals.html`, `/loop.html`, `/community.html`, `/charm.html`, `/pawket-network.html`, `/pawket-places.html`, and the direct dormant `/pet-care-planning.html` preview. The next product direction should move back to the home/account/Pawket Pals spine only after preserving this stabilization baseline.

## Care Support Ecosystem Planning

The newest business/product planning pass defines the Pet Pawket care-support ecosystem in documentation first. The model has three separate lanes:

- Pawket Care Credit: earned rewards value for eligible Pet Pawket activity.
- CHARM Emergency Assistance: charitable aid for urgent animal-care, rescue medicine, family pet-retention, and mission-aligned needs.
- Pet insurance referrals: optional education/referral paths to licensed insurance providers or agencies.

What exists now:

- `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md` documents the three-lane model, safe/prohibited terms, account implications, future implementation order, and legal review gates.
- `docs/PET_PAWKET_COMPLIANCE_COPY.md` provides reusable disclaimer and copy language for pages, footer, checkout, account dashboard, FAQ, Care Credit, CHARM Emergency Assistance, and insurance referral surfaces.
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md` now records the care-support launch gates, implementation phases, future data domains, account UI requirements, CHARM intake requirements, insurance referral requirements, copy review checklist, and QA checklist.
- `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` now records the currently allowed dormant implementation posture: future-facing constants and direct preview only, with no active site discovery or runtime behavior.
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md` now provides the draft decision templates for Pawket Care Credit terms, CHARM Emergency Assistance guidelines, licensed insurance partner requirements, future account modules, checkout copy, and ecosystem connections.
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md` now provides an internal, non-launch draft for Care Credit eligibility, earn events, value rules, ledger states, redemption boundaries, refunds/reversals, account display, privacy, ecosystem connections, and legal review questions.
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md` now provides an internal, non-launch draft for CHARM applicant types, support categories, exclusions, request workflow, safe statuses, review factors, documentation, privacy/consent, outcome copy, ops readiness, and implementation blockers.
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md` now provides an internal, non-launch draft for licensed insurance partner eligibility, licensing proof, state availability, disclosures, referral compensation, public partner cards, outbound tracking limits, account display, and implementation blockers.
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md` now indexes the care-support review packet and records lane-specific legal/compliance review outputs needed before implementation.
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md` now records the current public-surface hold posture for care support, including the direct preview page and the former navbar, search, footer, account, CHARM, and Explore entry points that must remain inactive until review allows discovery.
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md` now defines care-support data separation rules for future schema, API, account, checkout, support, analytics, Pawket Pal, HeartCode, and test-fixture work. It is a guardrail, not an approved schema.
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` now maps sensitive data types, consent types, role visibility, public-surface rules, revocation/hold expectations, CHERISH/youth boundaries, and implementation gates for future care-support and story-connected work.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md` now gives reviewers a one-file starting point for current posture, non-negotiable boundaries, review questions by role, first agenda, required outputs, and forbidden uses.
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` now gives reviewers and agents a standard format for transferring review outcomes into the decision log without vague approval or accidental build permission.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` now maps review workstreams, likely reviewers, source docs, required outputs, decision-log destinations, row completion rules, and build-blocking review dependencies.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` now provides question IDs, required answer format, reviewer-group questions, tracker-row mapping, and decision-log destinations for collecting decision-ready review answers.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` now provides reviewer-group packet contents, question IDs, expected outputs, return-processing steps, and a copy-paste opening note for sending care-support review packets.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` now provides packet IDs, file manifests, question IDs, tracker-row mappings, and decision-log destinations for assembling and tracking reviewer packets.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` now provides the one-page review status snapshot across packet, owner, send, return, wave, role coverage, and decision-gate state.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` now provides the process map for moving from current status to owner nomination, owner roster updates, dispatch updates, send status, return intake, decision-record drafting, and decision-log updates without treating any step as approval by itself.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md` now provides the Wave 1 owner nomination form for CS-00 and CS-01 so real reviewer names, confirmation status, send windows, and escalation paths can be collected before owner roster or dispatch status changes.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` now provides an operational send/return log, dispatch status values, CS-00 through CS-07 packet mappings, and return-intake rules so packet responses can be traced before decision-log updates.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md` now provides the reviewer owner assignment order, assignment matrix, status-change rules, owner record template, and return priority for CS-00 through CS-07.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` now provides the reviewer owner roster worksheet, Wave 1 owner intake fields for CS-00 and CS-01, role coverage table, packet assignment worksheet, assignment readiness checklist, and conflict/boundary checks needed before any packet can move to `ready_to_send`.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` now provides owner-ready send notes, send gates, reviewer-facing response format, and CS-00 through CS-07 packet-specific send instructions so review packets can be sent without reconstructing cover copy.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` now provides the returned-review intake workbook for CS-00 through CS-07, including completeness checks, packet-specific intake records, status values, and the required bridge from returned reviewer answers to worksheet/tracker/decision-log updates.
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS00_PUBLIC_VISIBILITY.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS01_LEGAL_COMPLIANCE.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS02_SUPPORT_OPS.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS03_CARE_CREDIT.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS04_CHARM_ASSISTANCE.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS05_INSURANCE_PARTNERS.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS06_DATA_PRIVACY_CONSENT.md`, and `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS07_ACCOUNT_EMPTY_STATE.md` are assembled but not sent. They provide ready-to-assign packet docs for the full CS-00 through CS-07 review queue. They do not approve launch or implementation.
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md` now gives reviewers a structured place to record lane notes, blockers, visibility decisions, and implementation permissions before final statuses are transferred into the decision log.
- `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md` now turns the first review steps into concrete non-build tickets for public visibility, legal/compliance packet intake, support copy, Care Credit terms, CHARM guidelines, insurance partner requirements, data/privacy/consent boundaries, and account empty-state planning authorization.
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` now provides the standard shape for future care-support review, copy, design, planning, implementation, QA, and documentation tickets so each ticket records approval state, lane ownership, public-surface impact, data/privacy boundaries, copy source, tests, and Charm protection.
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md` now provides internal customer-support and ops response language for current not-active state, future launched-state guardrails, escalation triggers, and common customer questions.
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md` now translates the care-support review packet into gated future implementation tickets with blockers, inputs, outputs, and acceptance criteria. No ticket in that backlog is approved for implementation yet.
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` now records lane and ticket approval state. All care-support lanes are currently `pending_review`, and no lane or backlog ticket is approved for implementation.
- Care-support routing has been audited across the review packets, draft terms, data/privacy/copy docs, backlog, ticket template, legal packet, launch plan, and operational review docs. Every care-support doc now routes approval state through `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`; every care-support doc except the coordinator runbook itself routes process movement through `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`.
- `docs/PET_PAWKET_CANON.md` now records care-support canon, Share Your Heart story language, character/avatar creation flow, customer engagement principles, and data/provenance/privacy rules.
- `AGENTS.md` now requires future sessions to read the care-support ecosystem, launch/review, dormant scaffold, public-surface, data-boundary, privacy/consent, reviewer brief, decision-record template, review tracker, review requests, review handoff, review packet index, packet docs, status dashboard, assignment plan, owner roster, send kit, dispatch log, return-intake workbook, worksheet, prelaunch review queue, backlog, ticket-template, and decision-log docs before treating care-support work as approved.
- `public/careSupportFuture.js` now exists as a dormant, non-imported future registry for care-support lanes, disabled feature flags, required disclaimers, and future activation requirements. It is not wired into account, checkout, CHARM, navbar, footer, search, Pawket Pals, Pawket Network, Pawket Places, Pawket Passes, or any API route.
- `public/pet-care-planning.html` remains as a direct dormant review preview using existing static-page conventions. It has `noindex,nofollow` metadata and no database, API, form, ledger, application, checkout, reward calculation, insurance comparison, referral tracking, or public discovery behavior.
- Pet Care Planning discovery has been pulled back while compliance review is pending. The active site no longer links to `/pet-care-planning.html` from the global nav, static search metadata, footer jump/path/legal links, Explore rail, account handoffs, or CHARM handoffs.

What is only planned:

- Pawket Care Credit ledger, balance display, earn rules, redemption rules, reversals, expiration, terms, and account dashboard modules.
- CHARM Emergency Assistance application/request intake, ops review queue, eligibility rules, documentation requirements, funding rules, and disbursement workflow.
- Licensed insurance partner cards, referral disclosures, state availability rules, outbound referral tracking, and partner compliance review.
- Connections from Pawket Pals, Pawket Packs, Pawket Packets, Pawket Picks, HeartPoints, HeartCodes, Heroic Quests, and Pawket Haven into care-support progress.

Legal/compliance questions before launch:

- Whether Pawket Care Credit creates stored-value, gift card, rewards, expiration, refund, tax, or consumer-protection obligations.
- Whether any Care Credit redemption toward veterinary or emergency expenses could be interpreted as insurance.
- CHARM charitable entity, registration, fundraising, restricted-fund, eligibility, privacy, and disbursement requirements.
- Whether CHARM support pays providers directly, supports applicants another way, or routes through partner organizations.
- Licensed insurance partner availability, producer/broker licensing boundaries, referral compensation, affiliate disclosure, and state-by-state rules.
- Privacy and consent rules for veterinary, medical, rescue, assistance, family hardship, adoption, and memorial information.

Recommended next steps:

1. Legal/compliance review of `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md` and `docs/PET_PAWKET_COMPLIANCE_COPY.md`.
2. Keep public discovery held until the visibility decision is reviewed and recorded; do not re-add nav, footer, search, account, CHARM, or Explore links from the dormant preview.
3. Use `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` before touching `public/careSupportFuture.js` or the direct Pet Care Planning preview.
4. Use `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md` as the gate checklist before proposing any schema, API, account module, assistance intake, redemption logic, or partner referral UI.
5. Use `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md` to turn Care Credit terms, CHARM guidelines, and insurance partner requirements into legally reviewed drafts.
6. Review `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md` as the index for legal, compliance, tax/accounting, privacy, payments, ops, charity, insurance, and partner review.
7. Use `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md` before changing Pet Care Planning public links, labels, CTAs, search metadata, navbar/footer discovery, CHARM handoffs, account handoffs, disclaimers, or public page roles.
8. Use `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md` before drafting schemas, APIs, account payloads, checkout hooks, support tools, analytics, Pawket Pal connections, HeartCode connections, or test fixtures.
9. Use `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` before implementing story consent, CHARM impact stories, public Pal adaptations, HeartCode story payloads, assistance privacy, insurance referral tracking, support tooling, analytics, or public content derived from private care-support data.
10. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md` to orient reviewers before legal, compliance, support, partner, product, or engineering review.
11. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md` to capture reviewer notes and required changes before changing approval statuses.
12. Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` when transferring reviewer outcomes into the decision log.
13. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` to coordinate reviewer ownership, row status, and build-blocking review dependencies.
14. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` when asking reviewers for decision-ready answers or interpreting returned reviewer answers.
15. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` before sending reviewer-specific packets.
16. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` to assemble exact packet IDs, file manifests, question IDs, and tracker-row mappings.
17. Use the assembled `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS*.md` packet docs when assigning reviewers for CS-00 through CS-07.
18. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting review status, choosing next review actions, assigning owners, sending packets, or interpreting review progress.
19. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before coordinating owner nomination, roster updates, dispatch updates, send status, return intake, decision-record drafting, or decision-log updates. The documentation routing audit is complete; do not keep adding routing-only docs unless the workflow actually changes.
20. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md` before assigning reviewer owners or moving assembled packets to `ready_to_send`.
21. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md` to collect real Wave 1 reviewer names, confirmation status, send windows, and escalation paths before owner roster or dispatch status changes.
22. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` to record real reviewer owners, backup owners, role coverage, and assignment readiness before dispatch status changes.
23. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` to prepare reviewer-facing send notes after owners are assigned and before packets are sent.
24. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` to record packet preparation, send status, return status, and decision-log intake.
25. Use `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` before interpreting returned reviewer answers, changing packet status to `returned_ready_for_intake`, or drafting decision-log entries.
26. Use `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md` to open the first non-build review tickets in a controlled order.
27. Review `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`, `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`, and `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md` before using them for engineering.
28. Review `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md` before using support copy publicly or in account/help surfaces.
29. Use `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` when scoping any future care-support ticket.
30. Update `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` whenever a lane, visibility choice, public-surface decision, support FAQ, account module, checkout hook, data-boundary decision, privacy/consent decision, reviewer-brief decision, decision-record decision, review-tracker decision, review-request decision, review-handoff decision, review-packet-index decision, review-status-dashboard decision, review-coordinator-runbook decision, review-assignment decision, review-owner-nomination decision, review-owner-roster decision, review-send-kit decision, review-dispatch decision, review-return-intake decision, review-queue decision, ticket-shape decision, or backlog ticket changes approval state.
31. Use `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md` to open future tickets only after the relevant review gates are approved and recorded in the decision log.
32. Identify licensed insurance partners and approved disclosure language before any referral UI.
33. If approved, design account dashboard cards that keep Pawket Care Credit, CHARM assistance, and insurance referrals visually and semantically separate.

Files likely to be touched later:

- `public/pet-care-planning.html`
- `public/careSupportFuture.js`
- `docs/PET_PAWKET_COMPLIANCE_COPY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md`
- `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md`
- `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md`
- `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS00_PUBLIC_VISIBILITY.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS01_LEGAL_COMPLIANCE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS02_SUPPORT_OPS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS03_CARE_CREDIT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS04_CHARM_ASSISTANCE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS05_INSURANCE_PARTNERS.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS06_DATA_PRIVACY_CONSENT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS07_ACCOUNT_EMPTY_STATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`
- `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`
- `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md`
- `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md`
- `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`
- `public/account.html`
- `public/account.js`
- `public/css/account.css`
- `public/charm.html`
- `public/css/charm.css`
- `public/footer.html`
- `public/navbar.html`
- `public/loop.html`
- `public/pals.html`
- `routes/*` only after backend scope is explicitly requested
- `db/migrations/*` only after ledger/intake/referral schemas are approved

## Finance And Living Documentation Foundation

The Pet Pawket Finance And Living Documentation System is continuing as a standalone Pawket Admin desktop-app foundation, not a website page. The newest finance implementation pass adds the local-only desktop panel navigation/focus contract scaffold. It consumes the existing desktop panel renderer scaffold, builds in-memory selection state, focus metadata, keyboard action metadata, attention routing, and disabled-action surfaces, then prints a stdout-only non-production navigation/focus summary through `npm run pawket-admin:desktop-navigation:inspect` without creating an Electron/Tauri app, browser UI, public route, persisted panel state, persisted navigation state, persisted focus state, runtime snapshot file, finance editor, production ledger interface, official report, official balance, final export, or mutation path.

What exists now:

- `docs/PET_PAWKET_FINANCE_SYSTEM.md` defines the finance system purpose, the four-ledger model, traceability standard, living-documentation standard, care-support boundary, and future generic product possibility.
- `docs/PET_PAWKET_FINANCE_SCHEMA.md` documents the planned finance entities and table families without creating migrations.
- `docs/PET_PAWKET_FINANCE_CALCULATION_RULES.md` records the first calculation-rule architecture for revenue, COGS, margin, donations, Care Credit, points, customer, and impact metrics.
- `docs/PET_PAWKET_FINANCE_REPORTING.md` defines planned internal, accountant/tax, foundation, investor, and public impact report outputs.
- `docs/PET_PAWKET_FINANCE_LIVING_DOCUMENTATION.md` defines event timeline, decision memory, source documents, audit trail, promise ledger, impact proof ledger, and future value-flow graph expectations.
- `docs/PET_PAWKET_FINANCE_IMPLEMENTATION_PLAN.md` records the phased path from local docs/example data to a standalone encrypted desktop app, source/document registry, management reporting, commerce subledger, mission ledger, rewards/Care Credit ledger, CHARM assistance workflow, insurance metadata, value graph, and simulator.
- `docs/PET_PAWKET_FINANCE_COMPLIANCE_NOTES.md` records accounting, tax, legal, charity, privacy, insurance, public-impact, investor-reporting, desktop-app security, and Charm-protection review items.
- `docs/PET_PAWKET_FINANCE_DESKTOP_APP.md` records the standalone Pawket Admin desktop app direction, encrypted connector-node posture, admin-only login requirement, local encrypted storage direction, and export audit requirements.
- `docs/PAWKET_ADMIN_DESKTOP_BASELINE.md`, `docs/PAWKET_ADMIN_SECURITY_MODEL.md`, `docs/PAWKET_ADMIN_ENCRYPTED_VAULT.md`, `docs/PAWKET_ADMIN_AUDIT_LOG.md`, `docs/PAWKET_ADMIN_EXPORT_PERMISSION_MODEL.md`, and `docs/PAWKET_ADMIN_CONNECTOR_CONTRACT.md` now define the Pawket Admin desktop-app security/trust kernel baseline.
- `docs/PAWKET_ADMIN_THREAT_MODEL.md` records the STRIDE-style Pawket Admin threat model for stolen devices/backups, compromised connectors, forged/replayed bundles, malicious exports, audit tampering, calculation manipulation, period bypass, restricted fund misuse, assistance-data exposure, Care Credit liability manipulation, fake impact proof, and source-document tampering.
- `docs/PAWKET_ADMIN_LOCAL_VAULT_SKELETON.md` defines the first local vault skeleton layout and its plaintext test-only boundaries.
- `docs/PAWKET_ADMIN_PRODUCTION_STORAGE_DESIGN.md` defines the production storage target and recommends a phased hybrid encrypted local database plus encrypted blob/document store.
- `docs/PAWKET_ADMIN_IMPORT_STATE_MACHINE.md` defines the connector intake lifecycle from quarantine through validation to staged source events.
- `docs/PAWKET_ADMIN_STAGED_SOURCE_EVENTS.md` defines staged source events as source evidence only, not accounting truth.
- `docs/PAWKET_ADMIN_NORMALIZATION_QUEUE.md` defines the draft-only normalization queue and the boundary between source evidence, draft interpretation, and live ledger truth.
- `docs/PAWKET_ADMIN_DRAFT_FINANCE_RECORDS.md` defines draft finance record fields and their interpretation-only status.
- `docs/PAWKET_ADMIN_REVIEW_QUEUE.md` defines review queue fields, statuses, risk flags, and decision boundaries.
- `docs/PAWKET_ADMIN_LEDGER_APPROVAL_BOUNDARY.md` defines the role, document, mapping, period, calculation-rule, risk, and audit checks required before reviewed draft records can become proposed ledger records.
- `docs/PAWKET_ADMIN_PROPOSED_LEDGER_RECORDS.md` defines proposed ledger record fields, traceability rules, balance requirements, correction paths, and the no-live-commit boundary.
- `docs/PAWKET_ADMIN_PROPOSED_JOURNAL_ENTRIES.md` defines proposed journal-entry grouping, balance expectations, journal types, non-financial record handling, and traceability.
- `docs/PAWKET_ADMIN_FINAL_COMMIT_GATE.md` defines final commit-gate roles, required checks, audit requirements, append-only expectations, and current test-only commit behavior.
- `docs/PAWKET_ADMIN_LEDGER_COMMIT_MODEL.md` defines the future live ledger journal entry and journal line target shape without implementing production commits.
- `docs/PAWKET_ADMIN_CORRECTION_AND_ADJUSTMENT_MODEL.md` defines correction, adjustment, reversal, supersession, void-before-commit, and append-only correction behavior.
- `docs/PAWKET_ADMIN_CHART_OF_ACCOUNTS_BASELINE.md` defines the first Pet Pawket chart of accounts baseline for assets, liabilities, equity, income, COGS, expenses, and foundation program expenses.
- `docs/PAWKET_ADMIN_PERIOD_CLOSE_MODEL.md` defines open, closed, locked, correction, adjustment, and reopen expectations for future period controls.
- `docs/PAWKET_ADMIN_DOCUMENT_COVERAGE_RULES.md` defines evidence requirements for sales, payments, refunds, donations, CHARM pledges, Care Credit, Pawket Pals, story submissions, and future expenses.
- `docs/PAWKET_ADMIN_SOURCE_DOCUMENTS.md` defines source document metadata, supported document types, link targets, and the separation between metadata and future encrypted blobs.
- `docs/PAWKET_ADMIN_EVIDENCE_COVERAGE_LAYER.md` defines evidence requirements, coverage statuses, evidence links, rejected evidence, approved deferrals, proof manifests, and report/export impacts.
- `docs/PAWKET_ADMIN_DOCUMENT_REDACTION_AND_PRIVACY.md` defines privacy classes, redaction states, and export privacy boundaries for financial, donor, customer, assistance, story, family/minor, partner, and legal records.
- `docs/PAWKET_ADMIN_EVIDENCE_DEFERRALS.md` defines explicit audited evidence deferrals and their expiration/review expectations.
- `docs/PAWKET_ADMIN_COMMIT_EVIDENCE_MANIFESTS.md` defines hashable evidence snapshots for proposed journal entries and future live ledger commits.
- `docs/PAWKET_ADMIN_DOCUMENT_VAULT_INTERFACE.md` defines the metadata layer, encrypted blob reference layer, storage path policy, blob reference shape, duplicate detection, and future encryption/key/backup dependencies.
- `docs/PAWKET_ADMIN_DOCUMENT_INGESTION_POLICY.md` defines document ingestion lifecycle states from `declared` through `manifest_eligible`, including duplicate, privacy, retention, redaction, blob reference, and evidence-link checks.
- `docs/PAWKET_ADMIN_DOCUMENT_RETENTION_SCHEDULE.md` defines placeholder retention classes and review needs for tax, accounting, donor, foundation, assistance, legal, creator/IP, customer, story consent, public impact, temporary import, export manifest, and audit support.
- `docs/PAWKET_ADMIN_EXPORT_REDACTION_PROFILES.md` defines owner, accountant, IRS, investor, foundation, donor acknowledgment, public impact, connector debug, and security audit redaction profiles.
- `docs/PAWKET_ADMIN_COMMIT_GATE_EVIDENCE_INTEGRATION.md` defines how commit evidence manifests feed final commit-gate evidence blockers and warnings.
- `docs/PAWKET_ADMIN_LIVE_LEDGER_DISABLED_COMMIT_GATE.md` defines disabled production commit behavior, commit gate statuses, safe test-only files, and forbidden official ledger files.
- `docs/PAWKET_ADMIN_IMMUTABLE_LEDGER_STORE.md` defines the future append-only immutable ledger store shape and the current test-only hash-chain boundary.
- `docs/PAWKET_ADMIN_LEDGER_COMMIT_AUTHORIZATION_POLICY.md` defines Owner Root, Finance Admin, Foundation Admin, Bookkeeper, Accountant Export User, Investor Read-Only, and Connector Node commit authority boundaries.
- `docs/PAWKET_ADMIN_LEDGER_PERIOD_ENFORCEMENT.md` defines open, soft-closed, closed, locked, and correction-period commit checks.
- `docs/PAWKET_ADMIN_LEDGER_BALANCE_AND_INTEGRITY.md` defines debit/credit balance, non-financial exemption, source lineage, evidence manifest, document link, calculation rule, and hash-chain integrity requirements.
- `docs/PAWKET_ADMIN_LEDGER_READ_MODEL.md` defines proposed-ledger, proposed-journal, test-only-ledger, evidence, reconciliation, and report-manifest read models as rebuildable projections, not source truth.
- `docs/PAWKET_ADMIN_SIMULATED_BALANCE_MODEL.md` defines simulated balances grouped by entity, fund, class, account, period, and currency, with non-production labels.
- `docs/PAWKET_ADMIN_RECONCILIATION_READ_MODEL.md` defines proposed/test-only reconciliation previews, variance checks, unreconciled source events, and warning families.
- `docs/PAWKET_ADMIN_REPORT_MANIFESTS.md` defines non-production report manifest metadata for internal, accountant, IRS, investor, foundation, public impact, and security-audit previews.
- `docs/PAWKET_ADMIN_REPORTING_GUARDRAILS.md` defines labels and blocked outputs for production-disabled reporting.
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_GATE.md` defines saved report package requests, export intent, redaction-profile enforcement, approval requirements, preview-only package records, audit events, and blocked final-export behavior.
- `docs/PAWKET_ADMIN_EXPORT_INTENT_RECORDS.md` defines export intent record fields, production statuses, final export statuses, and report-type/profile/source-mode validation rules.
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_APPROVALS.md` defines preview package approval roles and report-type-specific restrictions.
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_GUARDRAILS.md` defines blocked final export files, public impact privacy boundaries, required labels, and allowed metadata-only files.
- `docs/PAWKET_ADMIN_REPORT_REVIEW_QUEUE.md` defines report review queue items, statuses, role policy, and the metadata-only review boundary.
- `docs/PAWKET_ADMIN_REPORT_REVIEW_DECISIONS.md` defines append-only review decisions, allowed decision outcomes, rejection history, and blocked final-export behavior.
- `docs/PAWKET_ADMIN_REPORT_PREVIEW_SUPERSESSION.md` defines how preview package/export intent review items supersede one another without editing prior records.
- `docs/PAWKET_ADMIN_REDACTION_REVIEW_OUTCOMES.md` defines redaction review outcomes and public/investor privacy blockers.
- `docs/PAWKET_ADMIN_REPORT_REVIEW_AUDIT_NOTES.md` defines audit-linked reviewer notes and their metadata-only storage boundary.
- `docs/PAWKET_ADMIN_DESKTOP_OPERATOR_SHELL.md` defines the first read-only operator shell boundary for a future Pawket Admin desktop UI.
- `docs/PAWKET_ADMIN_PIPELINE_STATUS_VIEW_MODEL.md` defines the non-production full-pipeline status projection.
- `docs/PAWKET_ADMIN_OPERATOR_DASHBOARD_READ_MODEL.md` defines the dashboard section model a future desktop UI can consume.
- `docs/PAWKET_ADMIN_PIPELINE_HEALTH_AND_BLOCKERS.md` defines blocker and warning families for missing evidence, unresolved risks, review rejections, and disabled production gates.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_GUARDRAILS.md` defines the no-export, no-official-report, no-official-balance, no-public-path, and no-raw-document-content rules for the operator shell.
- `docs/PAWKET_ADMIN_DESKTOP_UI_ADAPTER.md` defines the first read-only local UI adapter boundary for future Pawket Admin desktop screens.
- `docs/PAWKET_ADMIN_OPERATOR_UI_STATE_MODEL.md` defines the UI-ready state model, required disabled-production labels, safe panels, and validation rules.
- `docs/PAWKET_ADMIN_OPERATOR_CLI_PREVIEW.md` defines the local plain-text preview boundary and required non-production banner.
- `docs/PAWKET_ADMIN_DESKTOP_NAVIGATION_MODEL.md` defines safe navigation metadata for the future desktop shell.
- `docs/PAWKET_ADMIN_UI_ADAPTER_GUARDRAILS.md` defines the no-export, no-mutation, no-public-route, no-raw-document-content, and no-production-state rules for the UI adapter.
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_RUNNER.md` defines the local-only stdout preview runner boundary.
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_INPUTS.md` defines accepted vault path inputs and known local NDJSON sources.
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_OUTPUT.md` defines stdout-only output labels, banner, and forbidden output content.
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_FAILURE_MODES.md` defines safe failure modes for missing paths, public paths, malformed records, raw content, and forbidden artifacts.
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_GUARDRAILS.md` defines no-write, no-export, no-public-route, no-ledger-truth, and no-raw-content guardrails for the runner.
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_HARNESS.md` defines the local fake sample-vault harness for preview smoke testing.
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_DATA_MODEL.md` defines the non-production sample NDJSON record families and required demo labels.
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_SMOKE_TESTING.md` defines how to run the sample preview and what blocker/warning states it intentionally surfaces.
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_PRIVACY_GUARDRAILS.md` defines the no-real-data, no-raw-document, and no-public-storage rules for the sample vault.
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_LIMITATIONS.md` defines why the sample vault is not a production vault, real ledger, export generator, or packaged desktop app.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_ARCHITECTURE.md` defines the first local desktop shell architecture scaffold for a future packaged Pawket Admin app.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_BOUNDARY.md` defines the local-only, read-only, non-production shell state flags.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_PANELS.md` defines the allowed read-only panels and panel-level no-mutation/no-export/no-raw-content requirements.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_DISABLED_ACTIONS.md` defines the explicit denylist for ledger, report, export, upload, connector, public-impact, package-send, and desktop-packaging actions.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_PACKAGING_BLOCKERS.md` defines the reviews and hardening required before any future desktop app packaging work.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_COMPOSITION.md` defines the local-only composition layer that assembles existing safe desktop models into one app-shell contract.
- `docs/PAWKET_ADMIN_DESKTOP_APP_SHELL_CONTRACT.md` defines the required non-production app-shell contract labels and included components.
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_STATE_BINDINGS.md` defines read-only panel-to-UI-state binding rules.
- `docs/PAWKET_ADMIN_DESKTOP_SAMPLE_PREVIEW_BINDING.md` defines the optional demo-only sample preview binding.
- `docs/PAWKET_ADMIN_DESKTOP_COMPOSITION_GUARDRAILS.md` defines no-write, no-export, no-public-route, no-production-authority guardrails for composition.
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_CONTRACT_SMOKE_RUNNER.md` defines the local stdout-only contract smoke runner.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_INPUTS.md` defines safe vault path inputs and local NDJSON sources for the contract smoke runner.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_OUTPUT.md` defines the stdout-only contract summary and required non-production labels.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_FAILURE_MODES.md` defines safe nonzero failure behavior for invalid paths, malformed records, and validation failures.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_GUARDRAILS.md` defines the no-write, no-export, no-public-route, no-production-authority guardrails for the contract smoke runner.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION.md` defines the local stdout-only guardrail inspection layer.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_GUARDRAIL_BASELINE.md` defines the expected non-production inspection baseline.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_OUTPUT.md` defines the safe counts/status-only inspection report.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_FAILURE_MODES.md` defines safe failure behavior for guardrail mismatches and unsafe state.
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_GUARDRAILS.md` defines the no-write, no-export, no-runtime-snapshot, no-public-route, no-production-authority guardrails for inspection.
- `data/finance/finance-schema.example.json` and `data/finance/finance-seed.example.json` provide internal example schema and mock seed data.
- `data/finance/security/audit-events.example.json`, `data/finance/security/export-profiles.example.json`, `data/finance/security/connector-bundle.example.json`, and `data/finance/security/permissions.example.json` provide local security/trust-kernel fixtures only.
- `data/finance/security/vault-skeleton.example.json` provides a local example of the vault skeleton layout, connector quarantine bundle, and export manifest shape.
- `data/finance/security/import-state-machine.example.json`, `data/finance/security/staged-source-events.example.json`, and `data/finance/security/invalid-connector-bundles.example.json` provide local connector-intake fixtures.
- `data/finance/security/normalization-queue.example.json`, `data/finance/security/draft-finance-records.example.json`, and `data/finance/security/review-queue.example.json` provide local draft-normalization fixtures.
- `data/finance/security/chart-of-accounts.example.json`, `data/finance/security/proposed-ledger-records.example.json`, `data/finance/security/ledger-approval-boundary.example.json`, `data/finance/security/period-close.example.json`, and `data/finance/security/document-coverage-rules.example.json` provide local proposed-ledger approval fixtures.
- `data/finance/security/proposed-journal-entries.example.json`, `data/finance/security/final-commit-gate.example.json`, `data/finance/security/ledger-commit-model.example.json`, and `data/finance/security/correction-adjustment-model.example.json` provide local proposed-journal and commit-gate fixtures.
- `data/finance/security/source-documents.example.json`, `data/finance/security/evidence-coverage.example.json`, `data/finance/security/document-redaction-privacy.example.json`, `data/finance/security/evidence-deferrals.example.json`, and `data/finance/security/commit-evidence-manifests.example.json` provide local metadata-only evidence fixtures.
- `data/finance/security/document-vault-interface.example.json`, `data/finance/security/document-ingestion-policy.example.json`, `data/finance/security/document-retention-schedule.example.json`, `data/finance/security/export-redaction-profiles.example.json`, and `data/finance/security/commit-gate-evidence-integration.example.json` provide local metadata-only document-vault fixtures.
- `data/finance/security/live-ledger-disabled-commit-gate.example.json`, `data/finance/security/immutable-ledger-store.example.json`, `data/finance/security/ledger-commit-authorization-policy.example.json`, `data/finance/security/ledger-period-enforcement.example.json`, and `data/finance/security/ledger-balance-integrity.example.json` provide local disabled live-ledger gate fixtures.
- `data/finance/security/ledger-read-model.example.json`, `data/finance/security/simulated-balance-model.example.json`, `data/finance/security/reconciliation-read-model.example.json`, `data/finance/security/report-manifests.example.json`, and `data/finance/security/reporting-guardrails.example.json` provide local production-disabled reporting/read-model fixtures.
- `data/finance/security/report-package-gate.example.json`, `data/finance/security/export-intent-records.example.json`, `data/finance/security/report-package-approvals.example.json`, and `data/finance/security/report-package-guardrails.example.json` provide local production-disabled report package/export-gate fixtures.
- `data/finance/security/report-review-queue.example.json`, `data/finance/security/report-review-decisions.example.json`, `data/finance/security/report-preview-supersession.example.json`, `data/finance/security/redaction-review-outcomes.example.json`, and `data/finance/security/report-review-audit-notes.example.json` provide local production-disabled report review queue fixtures.
- `data/finance/security/desktop-operator-shell.example.json`, `data/finance/security/pipeline-status-view-model.example.json`, `data/finance/security/operator-dashboard-read-model.example.json`, `data/finance/security/pipeline-health-and-blockers.example.json`, and `data/finance/security/desktop-shell-guardrails.example.json` provide local production-disabled desktop operator shell fixtures.
- `data/finance/security/desktop-ui-adapter.example.json`, `data/finance/security/operator-ui-state-model.example.json`, `data/finance/security/operator-cli-preview.example.json`, `data/finance/security/desktop-navigation-model.example.json`, and `data/finance/security/ui-adapter-guardrails.example.json` provide local production-disabled desktop UI adapter fixtures.
- `data/finance/security/operator-preview-runner.example.json`, `data/finance/security/operator-preview-inputs.example.json`, `data/finance/security/operator-preview-output.example.json`, `data/finance/security/operator-preview-failure-modes.example.json`, and `data/finance/security/operator-preview-guardrails.example.json` provide local production-disabled operator preview runner fixtures.
- `data/finance/security/sample-vault-harness.example.json`, `data/finance/security/sample-vault-data-model.example.json`, `data/finance/security/sample-vault-smoke-testing.example.json`, `data/finance/security/sample-vault-privacy-guardrails.example.json`, and `data/finance/security/sample-vault-limitations.example.json` provide local sample-vault harness fixtures. `data/finance/security/sample-vault/` provides the fake NDJSON sample vault used by the smoke preview.
- `data/finance/security/desktop-shell-architecture.example.json`, `data/finance/security/desktop-shell-boundary.example.json`, `data/finance/security/desktop-shell-panels.example.json`, `data/finance/security/desktop-shell-disabled-actions.example.json`, and `data/finance/security/desktop-shell-packaging-blockers.example.json` provide local production-disabled desktop shell scaffold fixtures.
- `data/finance/security/desktop-shell-composition.example.json`, `data/finance/security/desktop-app-shell-contract.example.json`, `data/finance/security/desktop-panel-state-bindings.example.json`, `data/finance/security/desktop-sample-preview-binding.example.json`, and `data/finance/security/desktop-composition-guardrails.example.json` provide local production-disabled desktop shell composition fixtures.
- `data/finance/security/desktop-contract-smoke-runner.example.json`, `data/finance/security/desktop-contract-smoke-inputs.example.json`, `data/finance/security/desktop-contract-smoke-output.example.json`, `data/finance/security/desktop-contract-smoke-failure-modes.example.json`, and `data/finance/security/desktop-contract-smoke-guardrails.example.json` provide local production-disabled desktop contract smoke fixtures.
- `data/finance/security/desktop-contract-inspection.example.json`, `data/finance/security/desktop-contract-guardrail-baseline.example.json`, `data/finance/security/desktop-contract-inspection-output.example.json`, `data/finance/security/desktop-contract-inspection-failure-modes.example.json`, and `data/finance/security/desktop-contract-inspection-guardrails.example.json` provide local production-disabled desktop contract inspection fixtures.
- `utils/pawketAdminSecurity.js` and `tests/pawketAdminSecurity.test.js` provide lightweight validation for audit hash chains, connector bundle shape, idempotency duplicate detection, and export profile allowlists.
- `utils/pawketAdminVault.js` and `tests/pawketAdminVault.test.js` provide the first file-backed local vault skeleton: directory creation, append-only audited writes, audit chain verification, quarantine-only connector imports, quarantined bundle listing, export manifest creation, and export manifest validation.
- `utils/pawketAdminImportState.js` and `tests/pawketAdminImportState.test.js` provide the first connector import state-machine layer: allowed transitions, staging validation, staged source-event writes, rejection records, duplicate staged-idempotency checks, audit events, and live-ledger write guardrails.
- `utils/pawketAdminNormalization.js` and `tests/pawketAdminNormalization.test.js` provide the first draft-only normalization and review queue layer: staged-event-to-draft mapping, draft finance record writes, review queue item writes, review decisions, audit events, and live-ledger write guardrails.
- `utils/pawketAdminLedgerApproval.js` and `tests/pawketAdminLedgerApproval.test.js` provide the first draft-to-proposed-ledger layer: chart validation, document coverage checks, approval-boundary validation, proposed ledger record mapping, balance checks, proposed-only writes, proposed decision history, audit events, and live-ledger write guardrails.
- `utils/pawketAdminJournalCommitGate.js` and `tests/pawketAdminJournalCommitGate.test.js` provide the first proposed-journal and commit-gate layer: proposed ledger grouping, proposed journal validation, final commit-gate validation, test-only commit artifacts, proposed correction/adjustment records, proposed journal decisions, audit events, and official live-ledger write guardrails.
- `utils/pawketAdminEvidence.js` and `tests/pawketAdminEvidence.test.js` provide the first source-document metadata and evidence coverage layer: document type support, metadata validation, deterministic document hashing, evidence links, coverage evaluation, approved deferrals, commit evidence manifests, audit events, raw-content guardrails, and public-path rejection.
- `utils/pawketAdminDocumentVault.js` and `tests/pawketAdminDocumentVault.test.js` provide the first document-vault interface layer: blob reference validation, storage policy, duplicate detection, ingestion state transitions, retention assignment, export redaction profile checks, ingestion records, commit-gate evidence integration records, audit events, raw-content guardrails, public-path rejection, and live-ledger write guardrails.
- `utils/pawketAdminLiveLedgerGate.js` and `tests/pawketAdminLiveLedgerGate.test.js` provide the disabled production live-ledger gate layer: commit policy, role authorization, period enforcement, balance/integrity validation, live commit readiness, disabled production commit records, test-only immutable ledger entries, test hash-chain verification, proposed ledger correction records, audit events, public-path rejection, and official live-ledger write guardrails.
- `utils/pawketAdminReportingReadModel.js` and `tests/pawketAdminReportingReadModel.test.js` provide the production-disabled read/reporting layer: proposed journal projections, test-only ledger projections, simulated balance previews, reconciliation previews, report manifest metadata, report manifest writes, audit events, public-path rejection, and official report/balance guardrails.
- `utils/pawketAdminReportPackageGate.js` and `tests/pawketAdminReportPackageGate.test.js` provide the production-disabled report package/export gate: export-intent metadata, preview package approval checks, redaction-profile enforcement, preview-only package records, audit events, final-export file guardrails, and public-path rejection.
- `utils/pawketAdminReportReviewQueue.js` and `tests/pawketAdminReportReviewQueue.test.js` provide the production-disabled report review queue: report review items, review decisions, rejection history, preview supersession, redaction review outcomes, audit-linked reviewer notes, final-export artifact guardrails, and public-path rejection.
- `utils/pawketAdminDesktopOperatorShell.js` and `tests/pawketAdminDesktopOperatorShell.test.js` provide the first production-disabled desktop operator shell read model: NDJSON reads, full-pipeline status projections, operator dashboard projections, counts, blockers, warnings, evidence/report summaries, production-disabled status checks, read-only verification, export artifact detection, and public-path rejection.
- `utils/pawketAdminDesktopUiAdapter.js` and `tests/pawketAdminDesktopUiAdapter.test.js` provide the first production-disabled desktop UI adapter: UI-ready state, safe navigation metadata, panel summaries, status badges, attention queue items, local CLI preview text, validation, read-only verification, export artifact detection, and public-path rejection.
- `utils/pawketAdminOperatorPreviewRunner.js`, `scripts/pawketAdminOperatorPreview.js`, and `tests/pawketAdminOperatorPreviewRunner.test.js` provide the first local-only operator preview runner: vault path resolution from argv/env, safe help/usage behavior, vault NDJSON reads, operator shell integration, UI adapter integration, stdout-only preview rendering, validation, read-only verification, export artifact detection, and public-path rejection.
- `utils/pawketAdminSampleVaultHarness.js` and `tests/pawketAdminSampleVaultHarness.test.js` provide the first local fake sample-vault smoke harness: deterministic demo records, sample-path safety checks, demo/privacy validation, preview-runner integration, stdout preview validation, and no-export/no-public-file guardrails.
- `utils/pawketAdminDesktopShellScaffold.js` and `tests/pawketAdminDesktopShellScaffold.test.js` provide the first read-only local desktop shell architecture scaffold: shell boundary state, safe panel registry, disabled actions, packaging blockers, scaffold validation, no-mutation/no-export/no-production-authority checks, public-path rejection, and export artifact detection.
- `utils/pawketAdminDesktopShellComposition.js` and `tests/pawketAdminDesktopShellComposition.test.js` provide the first local desktop shell state composition layer: composition input assembly, app-shell contract composition, panel state bindings, sample preview binding, status/attention surfaces, contract validation, no-mutation/no-export/no-production-authority checks, public-path rejection, and export artifact detection.
- `utils/pawketAdminDesktopContractSmokeRunner.js`, `scripts/pawketAdminDesktopContractSmoke.js`, and `tests/pawketAdminDesktopContractSmokeRunner.test.js` provide the local desktop contract smoke runner: default sample-vault input, argv/env vault path handling, full operator/UI/scaffold/composition chain integration, stdout-only contract summary rendering, validation, read-only verification, public-path rejection, and export artifact detection.
- `utils/pawketAdminDesktopContractInspection.js`, `scripts/pawketAdminDesktopContractInspection.js`, and `tests/pawketAdminDesktopContractInspection.test.js` provide the local desktop contract inspection layer: default sample-vault input, argv/env vault path handling, smoke-runner integration, in-memory inspection snapshots, guardrail baseline comparison, stdout-only inspection report rendering, validation, read-only verification, public-path rejection, and export artifact detection.
- `AGENTS.md` now requires future sessions to read the finance docs before finance, accounting, source-document, report, liability, value-flow, or living-documentation work.

Current finance behavior:

- No website finance command center is active.
- Mock finance data remains only in local `data/finance/` example files.
- Future finance UI should be a standalone Pawket Admin desktop app with encrypted local storage.
- Future website connector nodes should be encrypted, authenticated, least-privilege, read-only source nodes, and audit logged.
- Pawket Admin is the planned finance authority; the public website must not own, edit, export, or decrypt finance truth.
- Connector bundles should land in quarantine before review and import.
- Current plaintext test utilities can move valid quarantined bundles into staged source events only.
- Current plaintext test utilities can map staged source events into draft finance records and review queue items only.
- Current plaintext test utilities can validate approved review queue items and map eligible draft records into proposed ledger records only.
- Current plaintext test utilities can group proposed ledger records into proposed journal entries and validate final commit-gate eligibility only.
- Current plaintext test utilities can create test-only commit artifacts when explicitly enabled, but those artifacts are not final ledger truth.
- Current plaintext test utilities can create metadata-only source document records, approved evidence deferrals, and commit evidence manifests only.
- Current plaintext test utilities can create metadata-only document vault ingestion records and commit-gate evidence integration records only.
- Current plaintext test utilities can create disabled production commit records and explicitly enabled test-only immutable ledger entries only; neither is production ledger truth.
- Current plaintext test utilities can create read-model projections, simulated balances, reconciliation previews, and report manifests only; these are non-production previews and not official reports or balances.
- Current plaintext test utilities can create export-intent records and preview-only package records only; these are metadata records and not final report packages or exports.
- Current plaintext test utilities can create report review items, review decisions, supersession records, redaction review outcomes, and reviewer notes only; these are metadata records and not final report packages or exports.
- Current plaintext test utilities can build desktop operator shell view models only in memory; these are read-only non-production projections and not a desktop UI, official report, official balance, final export, or production ledger interface.
- Current plaintext test utilities can shape desktop UI adapter state and CLI preview text only in memory; these are read-only local non-production projections and not an interactive UI, packaged app, official report, official balance, final export, or production ledger interface.
- Current plaintext test utilities can run a local operator preview that reads a vault and prints CLI preview text to stdout only; this is read-only local non-production output and not an interactive UI, packaged app, official report, official balance, final export, or production ledger interface.
- Current plaintext test utilities can run the operator preview against a fake local sample vault under `data/finance/security/sample-vault/`; this is demo-only, contains no real private data or raw documents, and exists only for smoke testing the preview path.
- Current plaintext test utilities can define the local desktop shell architecture scaffold only in memory; this declares safe panels, disabled actions, packaging blockers, and non-production shell state, and is not a packaged app, public route, finance editor, official report, official balance, final export, or production ledger interface.
- Current plaintext test utilities can compose the local desktop shell app-shell contract only in memory; this combines the operator read model, UI adapter state, scaffold registries, and optional sample preview metadata, and is not a packaged app, public route, finance editor, official report, official balance, final export, or production ledger interface.
- Current plaintext test utilities can run a local desktop contract smoke summary from the fake sample vault to stdout only; this validates the full read-only contract chain and is not a packaged app, public route, finance editor, official report, official balance, final export, or production ledger interface.
- Current plaintext test utilities can run a local desktop contract guardrail inspection from the fake sample vault to stdout only; this compares the smoke summary to an in-memory baseline and is not runtime snapshot persistence, a packaged app, public route, finance editor, official report, official balance, final export, or production ledger interface.
- Staged source events and draft finance records are evidence/interpretation only and require future human ledger approval before any ledger truth exists.
- Proposed ledger records are pre-ledger records. They are not posted transactions, final journal entries, customer balances, Care Credit balances, CHARM payable truth, tax reports, or public impact proof.
- Proposed journal entries are grouped accounting proposals. They are not posted journal entries or final ledger truth.
- Simulated balances and report manifests are read/reporting previews. They are not official balances, tax support, accountant exports, investor reports, foundation reports, public impact reports, or final exports.
- Export-intent records and preview package records are metadata-only. Approval for a preview package does not create a final export.
- Report review decisions are metadata-only. Approval, rejection, redaction review, supersession, and reviewer notes do not create a final export.
- Source document metadata is evidence metadata only. It is not encrypted document blob storage, and it must not contain raw document content.
- Finance is not added to navbar, footer, search, account, CHARM, checkout, or public discovery.

What is not active:

- No finance database migrations or live tables.
- No finance API routes.
- No packaged Pawket Admin desktop app, Electron/Tauri shell, visual dashboard, interactive UI, or public route. The current desktop shell work is architecture-scaffold-only.
- No production vault encryption, key management, recovery key, key rotation, signature/HMAC verification, or connector endpoint.
- No connector import, draft review, proposed ledger approval, proposed journal grouping, evidence manifest, evidence deferral, document-vault metadata record, commit-gate evidence integration, commit-gate validation, disabled production commit record, test-only immutable ledger entry, proposed correction record, read-model projection, simulated balance, reconciliation preview, report manifest, export-intent record, preview package record, report review item, report review decision, report review supersession, redaction review outcome, reviewer note, desktop operator shell projection, desktop UI adapter state, operator preview runner, sample vault harness, desktop shell scaffold, desktop shell composition contract, desktop contract smoke runner, or desktop contract inspection layer can write to final journal entries, posted transactions, official balances, customer balances, Care Credit balances, CHARM assistance records, final reports, final exports, runtime snapshot files, or live ledger truth; the current skeleton can only quarantine bundles, stage source evidence, write draft finance records, write review queue items, write proposed ledger records, write proposed journal entries, write test-only commit artifacts, write proposed correction/adjustment records, write source document metadata, write evidence deferrals, write commit evidence manifests, write document vault ingestion records, write commit-gate evidence integration records, write disabled production commit records, write test-only immutable ledger entries, write proposed ledger correction records, write non-production report manifests, write export-intent metadata, write preview-only package metadata, write report review metadata, write report reviewer notes, build in-memory desktop operator shell read models, shape in-memory desktop UI adapter state, print local operator preview text to stdout, run a fake sample-vault preview smoke test, define in-memory desktop shell scaffold state, compose an in-memory desktop app-shell contract, print a local desktop contract smoke summary to stdout, and print a local desktop contract inspection report to stdout.
- No public static finance page or public static finance JSON.
- No real accounting entries, tax reports, or investor reports.
- No real payment, Shopify, bank, donation, or invoice ingestion.
- No live Pawket Care Credit ledger, balance, earn, redemption, reversal, or liability.
- No CHARM Emergency Assistance intake, review queue, award, disbursement, or request status.
- No licensed insurance partner cards, referral tracking, quote, comparison, application, policy, or claim behavior.
- No checkout hooks, account modules, public care-support discovery, Pawket Pal value hooks, HeartCode finance hooks, or customer-visible finance features.

Finance implementation guardrails:

- Keep the current pass as docs plus local mock data until desktop-app security, source-record, and accounting review approves live implementation work.
- Use `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` before treating Care Credit, CHARM assistance, insurance referrals, or care-support account/checkout behavior as approved.
- Keep CHARM and future CHERISH funds separate unless legal/accounting review records a different treatment.
- Do not use Charm as a finance sample customer, pet, applicant, rescue case, donor, assistance recipient, or Pawket Pal finance fixture.
- Do not put finance command-center UI, Pawket Admin code, security fixtures, finance seed data, or finance export data into `public/` unless a future review explicitly creates a sanitized public impact artifact.
- Keep connector nodes read-only. They can provide source-event bundles but cannot write to the vault, approve imports, request exports, or access decrypted documents.
- Treat `utils/pawketAdminVault.js`, `utils/pawketAdminImportState.js`, `utils/pawketAdminNormalization.js`, `utils/pawketAdminLedgerApproval.js`, `utils/pawketAdminJournalCommitGate.js`, `utils/pawketAdminEvidence.js`, `utils/pawketAdminDocumentVault.js`, `utils/pawketAdminLiveLedgerGate.js`, `utils/pawketAdminReportingReadModel.js`, `utils/pawketAdminReportPackageGate.js`, `utils/pawketAdminReportReviewQueue.js`, `utils/pawketAdminDesktopOperatorShell.js`, `utils/pawketAdminDesktopUiAdapter.js`, `utils/pawketAdminOperatorPreviewRunner.js`, `utils/pawketAdminSampleVaultHarness.js`, `utils/pawketAdminDesktopShellScaffold.js`, `utils/pawketAdminDesktopShellComposition.js`, `utils/pawketAdminDesktopContractSmokeRunner.js`, and `utils/pawketAdminDesktopContractInspection.js` as plaintext test skeletons only. Do not store real finance, customer, tax, source-document, Care Credit, CHARM assistance, insurance, private story, medical, or hardship data in them.
- Preserve the principle: every dollar has a source, every source has a document, every document supports a report, and every report traces back to the living ecosystem.

## Most Recent Work

The 2026-06-02 Pawket app consolidation pass added `Pet Workspace` as the anchor personal app. Pet Workspace now owns private pet profiles, care quick checks, account journal summaries, favorite memories, and Pal starting points in one app surface. The old `reminders`/Care Rhythm and `traits`/Favorite Memory app IDs remain direct-lookup legacy aliases for stale Dock/localStorage/URL compatibility, but normal app manifest lists now exclude legacy aliases by default and they are no longer current standalone apps, Dock apps, styled app shells, or visible App Manager entries.

The 2026-06-02 Pawket app runtime pass split the Dock conceptually and technically into a host plus registered apps. `public/pawketAppRuntime.js` now defines Pawket app manifests, allowed data/action scopes, blocked private/care-support/finance scopes, a scoped summary data bridge, action-intent validation, an app registry, and a host wrapper. `public/pawketFirstPartyApps.js` now registers the current first-party Pawket apps for Pet Workspace, Pawket Shop, Pawket Pals, and Stories while preserving legacy `reminders`, `traits`, and `subs` aliases, local storage keys, selectors, routes, and Dock window behavior. `public/hero.js` now asks that runtime to render/hydrate app windows instead of treating the Dock as the app container that owns every app body.

The same registered apps can now render outside the Dock through `public/pawket-app.html` and `public/pawketAppStandalone.js`, with `public/css/pawket-app.css` providing a standalone web/PWA-style shell. The former Integrations Lab/App Manager direction has been folded into the Apps shelf dock settings instead of remaining a launchable app. First-party Pawket apps, connected provider shortcuts, and future approved partner access remain visibly separate inside that shelf. Partner-style access remains manifest/scoped only; raw private pet data, journals, private stories, care-support data, and finance data are blocked from the bridge. Runtime coverage was added in `tests/pawketAppRuntime.test.js` and wired into `npm test`.

The 2026-06-02 Dock widget-app redesign pass rebuilt the four main customer-facing widget app bodies so they no longer share the same dashboard/KPI layout. Pawket Pals now opens as a private keepsake studio with a certificate-style Pal preview, HeartCode ribbon, Pal warmth control, and pet-profile shelf. Pawket Shop now combines the former Pawket Passes and Packs + Picks app-shell surfaces into one shop/pass workspace with a box-stage spotlight, Packs/Packets/Picks/Passes paths, featured product shelf, sendable pass card, CHARM note, and saved-pass pocket. Stories now opens as a small scrapbook with a story spark, Pawprints/CHARM/Pals paths, shared-update cards, and a plain privacy note.

The 2026-06-03 app taxonomy follow-up made `loop` the canonical Pawket Shop app while preserving the internal Loop route/API/storage contracts for Pawket Passes. The old `subs` app ID is now a direct-lookup legacy alias to `loop` for stale Dock/localStorage and standalone URL compatibility. Packs, Packets, Picks, and Pawket Passes remain separate website routes and product/pass concepts, but the tray and standalone app shell no longer expose `Packs + Picks` as a separate first-party app.

Verification for the 2026-06-03 Pawket Shop merge passed: `node --check public/hero.js`, `node --check public/pawketFirstPartyApps.js`, `node --check public/pawketAppStandalone.js`, `node --check public/pawketAppRuntime.js`, `node --test tests/pawketAppRuntime.test.js`, `npm run lint:css`, `git diff --check` on touched tracked files, and full `npm test` with `512` passing tests. Browser QA on `http://localhost:3011/` confirmed the default desktop and mobile tray apps are Home, Pals, and Shop; the Apps shelf lists Pet Workspace, Pawket Pals, Pawket Shop, and Stories with no separate Packs + Picks row; `/pawket-app.html?app=subs` renders Pawket Shop with the active `loop` tab and no `subs` tab; stale `subs` pinned/open storage reopens as a Pawket Shop/`loop` window; console errors stayed at `0`; and mobile page-level horizontal overflow stayed at `0`.

The follow-up Apps shelf pass removed App Manager as a normal first-party app. App access, connected providers, partner-access status, and compact Dock settings now live directly inside the fixed Apps shelf panel. The visible first-party app taxonomy is now Pet Workspace, Pawket Shop, Pawket Pals, and Stories. The old `integrations` standalone query is treated as a compatibility route into Pet Workspace rather than a current standalone tab/window.

Verification for the Apps shelf pass passed: `node --check public/hero.js`, `node --check public/pawketFirstPartyApps.js`, `node --check public/pawketAppStandalone.js`, `node --check public/pawketAppRuntime.js`, `node --test tests/pawketAppRuntime.test.js`, `npm run lint:css`, `git diff --check` on touched tracked files, and full `npm test` with `512` passing tests. Browser QA on `http://localhost:3011/` confirmed the desktop and mobile Apps shelf lists only Pet Workspace, Pawket Pals, Pawket Shop, and Stories; embeds Dock settings, provider cards, and partner access; shows no App Manager text or `integrations` app window; keeps standalone tabs to Shop, Pals, Home, and Stories; maps `/pawket-app.html?app=integrations` to Pet Workspace; has `0` console errors; and keeps mobile page-level horizontal overflow at `0`.

This pass kept the existing Dock shell, app IDs, routes, and local storage behavior while removing the spreadsheet-like KPI rows from those four app windows. Verification passed for this pass: `node --check public/hero.js`, `npm run lint:css`, `git diff --check -- public/hero.js public/css/hero.css`, `node --test tests/regressionFixes.test.js` with `8` passing tests, Playwright desktop widget checks confirming each app has its unique body and `0` old KPI rows, and Playwright mobile checks at `390x844` confirming no page-level or widget-level horizontal overflow.

The 2026-06-02 regression hardening pass addressed the review-identified implementation risks without changing the public launch direction. Network claim proof uploads now write under private runtime storage at `private_uploads/network/claims`; `.gitignore` excludes those runtime files and the legacy `uploads/network/claims` location; `/uploads/network/claims` is explicitly blocked from public static serving; ops claim queue responses redact stored proof paths and expose only an ops-only proof-download URL; and the partners ops UI uses that download URL instead of raw storage paths.

CHARM Foundation API routes now return explicit prototype fallback payloads via `apps/charmfoundation/utils/prototypeMode.js`, and the CHARM public renderer now builds DOM nodes/text content rather than interpolating fetched API/content JSON into unsafe HTML. Debug, password, avatar, and Network import regressions were hardened too: `/api/debug/whoami` is unavailable in production, password reset logging no longer prints tokenized reset links in production, avatar upload cleanup removes newly written files when DB persistence fails, and import candidate promotion writes the listing upsert plus candidate status/listing ID inside one PostgreSQL client transaction.

Regression coverage was added in `tests/regressionFixes.test.js` and expanded in `tests/networkRoutes.test.js`. Verification passed for this pass: `node --test tests/networkRoutes.test.js tests/regressionFixes.test.js` with `49` passing tests, full `npm test` with `508` passing tests, `npm run lint:css`, `git diff --check`, and `npm run pawket-admin:desktop-navigation:inspect`.

The previous finance/security pass added the local desktop panel navigation/focus contract scaffold. `utils/pawketAdminDesktopPanelNavigation.js` returns a navigation policy with production, packaged app mode, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, connector networking, document upload, public routes, raw document content, persisted navigation state, persisted focus state, runtime snapshots, and file output disabled; consumes the desktop panel renderer scaffold; builds in-memory selection state, focus metadata, keyboard action metadata, attention routing, and disabled-action surfaces; renders a stdout-only non-production navigation/focus summary with safe counts/status only; rejects unsafe runtime state persistence and public files; and does not write records, routes, reports, balances, exports, snapshots, navigation state, focus state, or app packages.

The prior finance/security pass added the local desktop shell contract inspection layer. `utils/pawketAdminDesktopContractInspection.js` returns an inspection policy with production, packaged app mode, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, connector networking, document upload, public routes, raw document content, runtime snapshot persistence, and file output disabled; resolves a vault path from the default sample vault, argv, or environment; supports safe help output; reuses the desktop contract smoke runner; builds an in-memory inspection snapshot; compares it to the expected non-production guardrail baseline; renders a stdout-only non-production inspection report with safe counts/status only; rejects public paths; detects forbidden export/report/balance/snapshot artifacts; and does not write records, routes, reports, balances, exports, snapshots, or app packages.

The previous finance/security pass added the local desktop shell contract smoke runner. `utils/pawketAdminDesktopContractSmokeRunner.js` returns a smoke-runner policy with production, packaged app mode, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, connector networking, document upload, public routes, raw document content, and file output disabled; resolves a vault path from the default sample vault, argv, or environment; supports safe help output; reads local NDJSON records; builds the operator shell read model, UI adapter state, desktop shell scaffold, and desktop shell composition contract; validates the composed app-shell contract; renders a stdout-only non-production summary with safe counts/status only; rejects public paths; detects forbidden export/report/balance artifacts; and does not write records, routes, reports, balances, exports, or app packages.

The previous finance/security pass added the local desktop shell state composition layer. `utils/pawketAdminDesktopShellComposition.js` returns a composition policy with production, packaged app mode, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, connector networking, document upload, public routes, and raw document content disabled; assembles composition input from the operator shell read model, UI adapter state, scaffold state, and optional sample preview metadata; composes an in-memory app-shell contract; builds panel state bindings, sample preview binding, status surface, and attention surface; validates local-only/read-only/non-production labels; rejects mutation/export/production-authority states; rejects public paths; detects forbidden export/report/balance artifacts; and does not write records, routes, reports, balances, exports, or app packages.

The previous finance/security pass added the read-only local desktop shell architecture scaffold. `utils/pawketAdminDesktopShellScaffold.js` returns a scaffold policy with production, packaged app mode, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, connector networking, document upload, public routes, and raw document content disabled; builds the future shell boundary, safe panel registry, disabled action registry, packaging blocker registry, and in-memory scaffold state; validates local-only/read-only/non-production flags; rejects mutation/export/production-authority states; rejects public paths; detects forbidden export/report/balance artifacts; and does not write records, routes, reports, balances, exports, or app packages.

The previous finance/security pass added the local fake sample-vault harness. `utils/pawketAdminSampleVaultHarness.js` returns a sample policy with production, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, raw document content, real private data, and public-file placement disabled; defines the deterministic sample record plan; validates demo/non-production labels; verifies sample vault paths; runs the existing operator preview runner against `data/finance/security/sample-vault/`; validates that the resulting stdout preview includes the required non-production banner and surfaces missing evidence, unresolved risk, report review rejection, privacy/redaction blockers, and disabled production gates; and verifies that no final exports, official reports, official balances, or public files were created.

The previous finance/security pass added the local-only operator preview runner. `utils/pawketAdminOperatorPreviewRunner.js` returns a runner policy with production, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, production source mode, raw document content, and file output disabled; resolves a vault path from argv or environment; supports safe help/usage output; reads known local NDJSON records; builds the desktop operator shell view model; passes it through the desktop UI adapter; prints the CLI preview to stdout only; validates required read-only/local-only/stdout-only labels; verifies that no runner, desktop shell, or UI adapter write targets were created; rejects public paths; and detects PDF, CSV, XLSX, ZIP, official report, official balance, final export, public-impact-export, and production-ledger artifacts if present.

The previous finance/security pass added the first production-disabled desktop UI adapter. `utils/pawketAdminDesktopUiAdapter.js` returns a UI adapter policy with production, live ledger commits, official balances, official reports, final exports, mutation actions, export actions, production source mode, and raw document content disabled; builds UI-ready state in memory; builds safe navigation metadata; creates panel summaries, status badges, and attention queue items; renders a plain-text local CLI preview with the required non-production banner; validates required read-only/local-only labels; verifies that no UI-adapter write targets were created; rejects public paths; and detects PDF, CSV, XLSX, ZIP, official report, official balance, final export, public-impact-export, and production-ledger artifacts if present.

The previous finance/security pass added the first production-disabled desktop operator shell read model. `utils/pawketAdminDesktopOperatorShell.js` returns a desktop operator shell policy with production, live ledger commits, official balances, official reports, final exports, production source mode, and raw document content disabled; reads local NDJSON records safely; builds pipeline status and operator dashboard view models in memory; summarizes counts, blockers, warnings, evidence status, report status, and disabled production gates; validates required non-production/read-only view model labels; verifies that no desktop-shell write targets were created; rejects public paths; and detects PDF, CSV, XLSX, ZIP, official report, official balance, final export, public-impact-export, and production-ledger artifacts if present.

The previous finance/security pass added the production-disabled report review queue. `utils/pawketAdminReportReviewQueue.js` returns a review queue policy with production reports, final exports, and official balances disabled; creates report review items linked to export intent and preview package records; validates reviewer roles; records approved/rejected/needs-changes decisions; preserves rejection history; creates supersession records that preserve old and new preview lineage; records redaction review outcomes; appends reviewer notes with audit events; writes only `manifests/report-review-queue.ndjson`, `manifests/report-review-decisions.ndjson`, `manifests/report-preview-supersessions.ndjson`, `manifests/redaction-review-outcomes.ndjson`, and `manifests/report-reviewer-notes.ndjson`; rejects public paths; rejects raw document content; and verifies no PDF, CSV, XLSX, ZIP, official export, official report, official balance, or final report package files were created.

The previous finance/security pass added the production-disabled report package/export gate. `utils/pawketAdminReportPackageGate.js` returns a package-gate policy with final exports and production reports disabled; creates export-intent records from report manifests; validates report type, source mode, redaction profile, recipient, non-production labels, public-impact privacy restrictions, and final-export status; validates preview package approval roles; creates preview-only package records; writes `manifests/export-intent-records.ndjson` and `manifests/report-preview-packages.ndjson`; appends audit events; rejects public paths; and verifies no PDF, CSV, XLSX, ZIP, official export, or final report package files were created.

The previous finance/security pass added the production-disabled ledger reporting/read model. `utils/pawketAdminReportingReadModel.js` returns a reporting policy with production reports, official balances, and final exports disabled; builds proposed journal read projections; builds test-only ledger read projections; calculates simulated balances from proposed or test-only records; creates reconciliation previews; creates and validates report manifest metadata; writes `manifests/report-manifests.ndjson`; appends audit events; rejects public paths; rejects production source modes and final export paths; and verifies no official reports or balances were created.

The previous finance/security pass added the disabled production live-ledger commit gate and first immutable ledger-store validation scaffold. `utils/pawketAdminLiveLedgerGate.js` returns a production-disabled commit policy, validates commit authorization by role and scope, enforces open/soft-closed/closed/locked/correction-period rules, validates debit/credit and non-financial integrity, validates live-ledger commit readiness against evidence manifests and source lineage, writes disabled production commit records, creates explicitly enabled test-only immutable ledger entries, verifies their hash chain, writes proposed ledger correction records, appends audit events, rejects public paths, and keeps official live ledger writes blocked.

The previous finance/security pass added the production document-vault interface and metadata-only document vault controls. `utils/pawketAdminDocumentVault.js` defines storage policy, creates and validates blob-reference placeholders, rejects public/traversal paths, detects duplicate document metadata by hash or exact metadata identity, models document ingestion transitions, assigns placeholder retention classes, validates export redaction profiles, creates ingestion records, creates commit-gate evidence integration records, appends audit events, and keeps raw document content and official live ledger writes blocked.

The previous finance/security pass added the first source-document metadata and evidence coverage layer. `utils/pawketAdminEvidence.js` defines supported document types with default privacy/retention metadata, creates and validates metadata-only source document records, hashes document bytes for proof tests, links documents to target records, maps coverage requirements to document types, evaluates missing/complete/deferred/privacy/redaction coverage, creates audited evidence deferrals, creates hashable commit evidence manifests, writes metadata to `documents/` or `manifests/`, rejects public paths, and keeps raw document content and official live ledger writes blocked.

The previous finance/security pass added proposed journal-entry grouping and the final commit-gate validation layer. `utils/pawketAdminJournalCommitGate.js` groups proposed ledger records into proposed journal entries, preserves all source IDs, separates non-financial proof/impact records from debit/credit journal balancing, validates commit-gate role/period/balance/document/traceability/risk/audit requirements, can create explicitly enabled test-only commit artifacts, creates proposed correction/adjustment records, appends audit events, and keeps official live ledger writes blocked.

The previous finance/security pass added the draft-to-ledger approval boundary. `utils/pawketAdminLedgerApproval.js` validates the baseline chart of accounts, checks document coverage, enforces role/review/period/mapping/calculation-rule/risk gates, maps eligible draft records into proposed ledger records, checks proposed debit/credit balance where applicable, appends audit events, and keeps final live ledger writes blocked.

The earlier finance/security pass added the draft-only normalization and human review queue layer. `utils/pawketAdminNormalization.js` maps staged source events into draft finance records, groups draft records into review queue items, records review decisions such as `needs_documents`, `ready_for_review`, and `approved_for_ledger_later`, appends audit events, and keeps live ledger writes blocked. Draft finance records are interpretations only, and review queue approval does not write ledger truth.

The earlier finance/security pass defined the production vault storage target and added the first connector import state-machine layer. The storage design recommends a phased hybrid architecture: encrypted local structured database for records plus encrypted blob/document storage for documents, exports, and backups, with append-only audit/event logs and hash-linked manifests. The import layer moves quarantined connector bundles through validation into staged source events only. It does not approve ledger truth, write customer balances, create Care Credit liability records, create CHARM assistance records, run connector network calls, implement real HMAC/signature verification, or build UI.

The previous finance/security pass added a formal Pawket Admin threat model and the first local vault skeleton. The skeleton is file-backed and plaintext for tests only: it creates the vault directory layout, appends hash-chained audit events, verifies audit continuity, quarantines connector bundles without writing ledger truth, rejects duplicate idempotency keys, creates export manifests, and validates export manifest allowlists. It did not build UI, desktop packaging, live connector routes, production cryptography, production key management, or live finance tables.

The previous finance/security pass defined the Pawket Admin desktop-app security/trust kernel. It added standalone baseline docs for auth boundaries, encrypted vault requirements, append-only audit log, export permissions, read-only encrypted connector contract, local security fixtures, and lightweight validation tests. It did not build UI, desktop packaging, live connector routes, production cryptography, or live finance tables.

The previous product-continuity pass captured the Pawket Pals Living Value System in `docs/PAWKET_PALS_LIVING_VALUE_SYSTEM.md` and updated canon. Pawket Pals should not be treated as simple collectible art. They are intended to become the bridge between real pet stories, emotional legacy, customer loyalty, charitable impact, functional rewards, protected value, and the future Pawket Haven game layer.

Key Pawket Pals continuity points:

- Pawket Pals can carry emotional value, functional value, and carefully controlled ecosystem market value.
- Financial or market value must stay underneath emotional value and must never imply investment return, guaranteed resale value, or speculative upside.
- Every Pawket Pal should eventually carry a HeartCode as its identity anchor for authenticity, origin metadata, ownership, perks, quest history, game integration, and possible future transfer history.
- Pawket Pal classes are Honorary, Community, Limited Edition, and One-of-One.
- Honorary Pals are personal consent-led tributes and are not automatically public collectibles.
- Community Pals are reviewed public-facing characters adapted from real stories or community moments.
- Limited Edition Pals are authenticated numbered releases tied to meaningful events such as Charm's Day, founders moments, rescue milestones, seasonal CHARM editions, shelter partnerships, or future CHERISH moments.
- One-of-One Pals are singular protected tributes. Charm's private Pal belongs here and remains locked/private, non-collectible, non-market, and non-reward.
- Pawket Haven is now the preferred future name for the warm, safe, mission-aligned game home where Pawket Pals live and grow.
- Pawket Points are the practical reward layer; HeartPoints are the emotional/impact layer.
- A contribution multiplier system is promising, but must wait for eligibility, cap, refund, receipt, fraud, tax, legal, accounting, and charity-compliance rules.
- `public/pals.html` now reflects this positioning at a visible product level: living value, HeartCodes, Honorary/Community/Limited Edition framing, protected one-of-one boundaries, Heroic Quests, CHARM, and Pawket Haven are explained without promising public trading or resale.
- The first Pawket Pal backend identity pass is now in place through `db/migrations/014_pawket_pal_identity.sql`, `palDB.pg.js`, and `routes/palRoutes.js`. It adds HeartCode-backed Pal records, consent records, HeartCode event history, and authenticated private Honorary Pal creation/listing under `/api/pals`.
- The implemented Pal API is intentionally private-first. It does not create public Community Pals, Limited Editions, market listings, transfer offers, public story pages, or public CHARM/CHERISH claims.
- The first private Honorary Pal certificate UX is now active on `/pals.html` through `public/pals.js` and `public/css/pals.css`. Signed-in users can create a private certificate, optionally connect a pet profile, receive a HeartCode, copy it, and reopen existing private Pal certificates from the same page.
- `/pals.html` now preserves certificate return state after creation or reopening by replacing the URL with the Pal HeartCode and the `#honorary-pal-certificates` anchor. The live certificate card also links back to the account Private HeartCodes module so users can return to the same account/Pals flow cleanly.
- `/pals.html` now renders the Pal class/value/HeartCode explanatory cards instead of hiding them behind standby placeholder behavior.
- `/account.html` now has direct private Pal handoffs from pet profile cards and journal/Core Memory entries. These handoffs send only owned pet/journal ids to `/pals.html`; the Pals page then preselects the pet, fetches the private journal entry when applicable, and pre-fills the private Honorary Pal certificate form for user review before creation.
- `/account.html` also includes a Private HeartCodes module showing recent private Pawket Pal certificates, pet-linked counts, memory-linked counts, review-path counts, and links that reopen a certificate on `/pals.html` by HeartCode.
- Pawket Pal consent review now has a private ops path. `palDB.pg.js` and `routes/palRoutes.js` expose authenticated ops-only review queue APIs under `/api/pals/ops/review-queue`, and `/pawket-partners-ops.html` renders a Pawket Pal story review panel for `review_required`, `pending`, `granted`, and `revoked` consent rows.
- The ops review path intentionally updates consent state only. It does not publish Community Pals, change privacy from private, activate releases, enable market behavior, or grant public CHARM/CHERISH claims.
- Pawket Pal story intake now exists as a signed-in private submission lane. `/pals.html` includes a Story Intake form, and `POST /api/pals/story-submissions` creates a private Honorary Pal with `origin_type='story_submission'`, a HeartCode, private story notes, a consent-safe public summary, and `review_required` consent.
- Story intake feeds the existing ops review queue rather than publishing anything. `/pawket-partners-ops.html` now shows submitted private story context and consent-safe public summaries for ops review.
- Internal Community Pal drafts now exist as an ops-only draft/template path. `POST /api/pals/ops/community-drafts` can create a private `pal_class='community'` Pal only from a granted review consent row with Community Pal rights, and `GET /api/pals/ops/community-drafts` lists those private draft records for ops.
- Community drafts receive their own HeartCode and source metadata linking back to the granted consent/source HeartCode, but they stay `privacy_state='private'`, `market_enabled=false`, and `transfer_locked=true`. They start as `release_state='draft'` and can only move to internal `release_state='review'` through the release gate. This is not a public Community Pal release, drop, market listing, CHARM claim, or customer-visible collectible.
- Browser QA verified the signed-in story intake to ops review to granted consent to `Create Community Draft` path on `http://localhost:3001`. The draft card rendered as a private Community Pal draft, the UI stated no public release was made, direct DB inspection confirmed both source and draft records remained private/draft with market disabled and transfers locked, and console errors were `0`.
- The Community Pal draft workbench now exists inside `/pawket-partners-ops.html`. Ops can edit draft name, public-safe character summary, primary trait/affinity/quest ability, visual/art direction notes, internal moderation notes, release-gate notes, and the release readiness checklist through `PATCH /api/pals/ops/community-drafts/:id`.
- The first release gate now exists as `POST /api/pals/ops/community-drafts/:id/release-gate`. It requires private-story protection confirmation, validates checklist/copy/art/trait/source/privacy/market/transfer requirements, and moves a draft to `release_state='review'` with `releaseGate.status='release_review_ready'`. It intentionally keeps `privacy_state='private'`, `market_enabled=false`, and `transfer_locked=true`; no public Pal page, drop, market item, CHARM claim, or public release is created by this gate.
- Browser QA verified the workbench and release gate: a submitted story was reviewed, converted to a Community draft, edited in the ops workbench, saved, and submitted through the release gate. The draft remained private, moved to internal `review` state, kept market/transfer protections, and browser console errors were `0`.
- A redacted Community Pal preview API now exists at `GET /api/pals/community-previews`. It is public-read but only returns `pal_class='community'` records that passed the release gate, are still `privacy_state='private'`, are in internal `release_state='review'`, and keep `market_enabled=false` and `transfer_locked=true`.
- The public preview payload intentionally omits owner data, source consent IDs, source Pal IDs, source HeartCodes, private story notes, internal moderation notes, and raw art-direction notes. It returns only the Community Pal HeartCode, name, consent-safe summary, broad inspired-by label, limited trait fields, and explicit boundary flags.
- `/community.html` now has a gated Community Pal preview panel powered by `public/communityPals.js`. The panel remains hidden when no release-gated previews exist, and renders cards only for the redacted preview API. Browser QA with a temporary gated record confirmed the panel renders, private/internal QA text and source markers do not appear, and desktop/mobile horizontal overflow is `0`.
- The final public-preview approval layer now exists as `POST /api/pals/ops/community-drafts/:id/public-approval`. It is ops-only and can only approve a private Community Pal that is already in internal `release_state='review'` with `releaseGate.status='release_review_ready'`, a complete release checklist, redacted private source-story handling, disabled market behavior, locked transfers, and no CHARM/CHERISH public claim.
- Public-preview approval moves the Community Pal to `privacy_state='public'` and `release_state='active'` only for the redacted Community preview surface. It explicitly keeps `market_enabled=false`, `transfer_locked=true`, `charm_enabled=false`, and `cherish_enabled=false`, records `communityDraft.publicApproval.status='public_preview_approved'`, and does not create a drop, marketplace listing, transfer path, or CHARM/CHERISH claim.
- `GET /api/pals/community-previews` now returns both internal release-review-ready private previews and approved public-preview records, still through the same redacted payload. The public card can label approved previews while continuing to show `Private story redacted` and `Not a drop`.
- Approved public previews now have a HeartCode detail lookup at `GET /api/pals/community-previews/:heartCode`. This endpoint only resolves `privacy_state='public'`, `release_state='active'`, `publicApproval.status='public_preview_approved'` Community Pals with market disabled and transfers locked. It returns redacted identity, story-safe summary, limited traits, public safeguards, and future Heroic Quest, Share Studio, and Pawket Haven handoff placeholders without owner/source/private/internal data.
- `/community.html` now opens approved Community Pal previews in a redacted modal from the preview card. Internal release-review-ready previews can still appear as cards, but their full public detail remains locked until public-preview approval.
- Ops now has a public-preview archive/takedown path at `POST /api/pals/ops/community-drafts/:id/public-archive`. It removes an approved public preview from public lookup/surfaces by moving it back to `privacy_state='private'` and `release_state='archived'`, records `communityDraft.publicArchive.status='public_preview_archived'`, and keeps market, transfer, drop, CHARM, and CHERISH behavior disabled.
- CSS lint is now normalized for the current launch-prep codebase. `.stylelintrc.json` keeps correctness-oriented checks such as unknown properties, duplicate properties inside a block, selector ID shape, and selector complexity limits, but disables high-churn stylistic rules that conflicted with established repo conventions such as classic `rgba()`, BEM-style modifier names, vendor-prefixed backdrop-filter fallbacks, legacy media query notation, intentional duplicate selector override sections, and empty placeholder CSS files. `npm run lint:css`, `git diff --check`, and `npm test` passed after this normalization on 2026-05-07.

Next best Pawket Pals implementation path:

- Start from `docs/PAWKET_PALS_LIVING_VALUE_SYSTEM.md`, `docs/PET_PAWKET_CANON.md`, and `public/pals.html`.
- The Pal identity schema, `/pals.html` certificate UX, account-surface pet/journal/Core Memory handoffs, certificate return state, story intake, ops review queue, internal Community draft model, workbench, internal release gate, redacted preview feed, public-preview approval layer, HeartCode detail modal, and archive/takedown path now exist.
- Continue by adding durable Share Studio output rules or first Heroic Quest records for approved public previews. Keep approved previews redacted and non-market until compliance and display rules exist.
- Do not expose public Community Pal drops, trading, resale, market behavior, or CHARM/CHERISH public claims until release, moderation, rights, compliance controls, and public display rules exist.
- Defer resale/trade/market features until HeartCode ownership, transfer controls, legal review, and marketplace policy exist.

The newest Pawket Network pass was a source-quality audit after QA found non-pet companies such as Peterbilt in the public directory. It hardened OSM and Overture import classification, added a repeatable public listing audit, removed clearly invalid public rows, held ambiguous rows for ops review, and reclassified obvious pet providers that had been sitting in `Other`.

Product boundary note: pet parks, dog parks, pet-friendly parks, trails, travel relief areas, and similar pet-safe locations are still a strong future reference tool idea, but they are not Pawket Network provider listings. Pawket Network should stay focused on care/service providers that can be claimed, contacted, reviewed, and eventually verified. Pet-safe locations should use a separate future reference-location lane with source/review state, safety notes, rules, and Pawket Pal/Pawket Park/community handoffs instead of provider claim, partner, or CHARM status.

The public site now has a reciprocal placeholder/reference surface for that split: `/pawket-network.html` links people looking for dog parks, trails, pet-friendly stops, and relief areas to `/pawket-places.html`, while `/pawket-places.html` sends provider-seeking visitors back to Pawket Network. The new Pawket Places page is intentionally source-honest and does not render fake location results; it frames the future reference lane and the data fields it will need. Navbar search, the community subnav, and the footer all include Pawket Places so the two surfaces are discoverable from global navigation.

Future resume point for Pawket Places:

- Start from `public/pawket-places.html`, `public/css/pawket-network.css`, and the source-lane notes in `docs/PAWKET_NETWORK_SOURCE_PIPELINE.md`.
- Keep Pawket Places separate from `network_listings`; do not put parks, trails, beaches, relief areas, or pet-friendly public stops back into the provider directory.
- Do not repurpose `network_place_index` as a public places table. It is currently for town/ZIP radius-search autocomplete centers, not destination records.
- The next implementation unit should be a dedicated places schema and API, likely a table for source-backed place records plus an import/staging path. The public page should then replace the disabled search preview with real place search once source-backed data exists.
- Preserve reciprocal routing: provider-seeking users on Pawket Places should be sent to Pawket Network, and pet-safe-location seekers on Pawket Network should be sent to Pawket Places.
- Avoid fake park/location results. Launch with an honest empty/reference state until the source-backed place lane has real records and review state.

Current Pawket Network coverage after this pass:

- Public Network total is `25,087` after quality cleanup.
- Massachusetts remains the deepest launch state at `1,400` public listings.
- All 50 states now have at least `438` public listings; `48` states have at least `450`, `34` have at least `475`, and `4` have at least `500`.
- `HI=449` and `ND=438` are the remaining lowest states after the audit. Refill these only through audited source promotion, not by re-promoting held or rejected false-positive rows.
- `DC=147` after ambiguous and invalid district rows were held or rejected.
- Coverage was intentionally lowered from the previous round-number expansion because public list quality now takes priority over keeping false-positive rows visible.
- Eugene, OR was explicitly topped up after QA found the 25-mile radius still empty. A bounded Eugene Overture import plus the local coverage promoter fixed the gap, and later Oregon state-floor promotions now return `108` listings inside `25 mi`.
- Trust state remains clean: `non_unclaimed=0`, `partnered=0`, and `charm_enabled=0`.
- All promoted source rows remain public `Network Listing` records only. They are not claimed listings, Pawket Verified Partners, or CHARM-supporting providers.
- Public same-state/same-city duplicate names and normalized phone groups are currently `0`; website-host groups remain `20` and are review-only because they can represent legitimate chains, franchise pages, or service lines.

Coverage/source work completed in this pass:

- `scripts/network-promote-candidates.js` and `scripts/network-coverage-audit.js` now preserve the requested `--baseline` as a true floor. The older Northeast deep-target defaults can no longer silently lower a national baseline for MA/RI/CT/NH/ME/VT/NY.
- Promoted from `9,266` to `10,024` while closing a true `150` floor for all 50 states; NJ, NY, and OR needed fresh bounded Overture imports to avoid duplicate-only leftovers.
- Promoted from `10,024` to `12,055` while closing a `200` floor for all 50 states and documenting `DC=175` as the honest district cap from the current source pool.
- Promoted from `12,055` to `14,138` while lifting `48` states to `250`; AL, AK, KS, ND, and WY needed extra regional Overture pulls before final duplicate filtering.
- Ran a Eugene, OR Overture import (`seen=15036`, `matched=232`, `imported=232`) and `npm run network:promote:local -- --state=OR --min-exact=2 --min-radius=12 --radius-mi=25 --per-place=4 --max-promotions=80 --candidate-limit=5000 --summary-only`, which promoted `56` Oregon listings and brought the final public total to `14,194`.
- Imported full-state Overture bboxes for `ND` and `WY`, then promoted them to `300`.
- Promoted the staged pool toward a `300` floor. Seven low-density states were still short after duplicate filtering, so full-state Overture bboxes were imported for `ID`, `IA`, `MS`, `MT`, `SD`, and `HI`, plus a broad Southcentral Alaska bbox. Those imports staged enough launch-safe source rows to close the `300` floor for all 50 states.
- A `350` floor promotion first raised the public total to `18,560` but left `KS`, `KY`, `LA`, `NE`, `NM`, `VA`, `WV`, and `WI` short because the remaining staged rows were duplicate-gated.
- Full-state Overture bboxes were imported for `KS`, `KY`, `LA`, `NE`, `NM`, `VA`, `WV`, and `WI`, staging `21,833` additional source candidates across those states.
- The final targeted promotion added `239` public listings and closed the `350` floor without weakening duplicate, contact, claim, partner, or CHARM gates.
- A `400` floor promotion raised the public total from `18,799` to `21,149`. Alaska stopped at `380` and Arkansas at `383` because their remaining staged candidates were duplicate-gated.
- Full-state Overture bboxes were imported for `AK` and `AR`, staging `628` Alaska candidates and `2,091` Arkansas candidates.
- The final Alaska/Arkansas targeted promotion added `37` public listings and closed the `400` floor without weakening duplicate, contact, claim, partner, or CHARM gates.
- A `450` floor promotion raised the public total from `21,186` to `23,601`. Missouri stopped at `432` and North Carolina at `438` because their remaining staged candidates were duplicate-gated.
- Full-state Overture bboxes were imported for `MO` and `NC`, staging `4,433` Missouri candidates and `7,282` North Carolina candidates.
- The final Missouri/North Carolina targeted promotion added `30` public listings and closed the `450` floor without weakening duplicate, contact, claim, partner, or CHARM gates.
- A `500` floor promotion raised the public total from `23,631` to `25,847`. Alaska, Alabama, Delaware, Hawaii, Indiana, Maryland, North Dakota, Oklahoma, and Utah remained short after the first pass because their remaining staged candidates were duplicate-gated or not launch-ready.
- Fresh Overture bboxes were imported for `AL`, `DE`, `HI`, `IN`, `MD`, `ND`, `OK`, and `UT`, plus a checked Alaska west bbox. Those pulls staged additional real provider candidates for the short states without changing the public trust boundary.
- `scripts/network-import-osm-overpass.js` now supplements the OSM source query with `shop=pet`, `shop=pet_supplies`, and a pet-related `name` regex so real providers with incomplete category tags can stage as candidates for manual/promotion review.
- Additional OSM city and island bboxes were run for Alaska, Delaware, Hawaii, and North Dakota. The resulting promotions closed Alaska, Delaware, Alabama, Indiana, Maryland, Oklahoma, and Utah to `500`, lifted Hawaii to `497`, and lifted North Dakota to `479`.
- `networkDB.pg.js` now keeps the listing count query's bind list separate from select/order distance parameters, so `lat/lng` distance searches without `radius_mi` no longer fail while the normal radius-search UI path remains unchanged.
- Pawket Network now has a dedicated `cleaner` category labeled `Cleaner` for pet waste removal, litter-box cleaning, aquarium/fish-tank cleaning, and similar pet cleanup providers that previously fell into `Other`; the local database currently has `44` public Cleaner listings and `227` Cleaner source candidates after audit reclassification.
- Added `scripts/network-audit-listings.js`, exposed as `npm run network:audit:listings`. It dry-runs by default, removes only unclaimed/unpartnered/CHARM-off rows with clear false-positive source evidence when `--apply` is used, reclassifies obvious pet providers, and can remove ambiguous public rows while holding their source candidates as `needs_review` via `--hold-review`.
- The audit rejected `854` public false-positive source candidates, held `116` ambiguous public rows for ops review, and reclassified `61` public listings into better categories.
- Peterbilt was traced to an OSM `shop=truck` row whose name matched the old broad OSM name regex. The public listing is gone, and the source candidate is now `rejected` with audit notes.
- OSM import now rejects disallowed explicit tags such as `shop=truck`, and its fallback name regex uses word boundaries so `Peterbilt` cannot match `pet`.
- Overture import now blocks explicit non-pet primary categories such as hot dog restaurants, truck gas stations, bars, cafes, parks, roofing, automotive, pest control, and similar false-positive categories before staging.
- Added audit cleanup indexes for import candidate/listing relationships and related listing child tables so future bulk audit cleanup runs quickly.

Recent verification for this expansion pass:

- `npm run network:audit:listings` returned `scanned=25087`, `rejectable=0`, `reclassifiable=0`, and `reviewable=0`.
- `npm run network:coverage:audit -- --include-dc --baseline=475 --targets=MA:1400,DC:175 --gaps-only` now correctly reports `below_target=17`, `public_total=25087`, `non_unclaimed=0`, `partnered=0`, `charm_enabled=0`, `duplicate_names=0`, and `duplicate_phones=0` after removing suspect rows.
- Direct DB checks returned `min_state=438`, `states_at_450=48`, `states_at_475=34`, `states_at_500=4`, `DC=147`, `HI=449`, `ND=438`, `MA=1400`, and `publicTotal=25087`.
- Direct API checks returned `total=0` for `search=Peterbilt`.
- Direct backend checks confirmed the Peterbilt source candidate is `rejected` with audit notes.
- `node --check scripts/network-promote-candidates.js`
- `node --check scripts/network-import-overture-bbox.js`
- `node --check scripts/network-import-overture.js`
- `node --check scripts/network-coverage-audit.js`
- `node --check scripts/network-promote-local-coverage.js`
- `node --check scripts/network-import-osm-overpass.js`
- `node --check scripts/network-audit-listings.js`
- `node --check networkDB.pg.js`
- `node --check routes/networkRoutes.js`
- `node --check public/pawketNetwork.js`
- `npm test` passed `35/35`.

The previous Pawket Network pass expanded the Massachusetts town/radius coverage model across the rest of the United States. It used the local coverage promoter state by state, topped up remaining states to a stronger public baseline, and staged fresh Washington Overture data to avoid weakening source quality or duplicate rules.

Current Pawket Network coverage after this pass:

- Public Network total is `9,266`.
- Massachusetts remains the deepest launch state at `1,406` public listings.
- Every other US state plus `DC` now has at least `125` public listings.
- Large post-pass examples: `CT=405`, `NH=363`, `ME=343`, `VT=273`, `IL=250`, `TX=240`, `TN=195`, `CA=180`, `RI=174`, `AR=164`, `MN=162`, `WA=161`, and `IN=158`.
- Washington was the only state left below the `125` floor after the first national pass. A Seattle-area Overture bbox import staged `761` additional source candidates, and later Washington promotions brought it to `WA=161`.
- Trust state remains clean: `non_unclaimed=0`, `partnered=0`, and `charm_enabled=0`.
- All promoted source rows remain public `Network Listing` records only. They are not claimed listings, Pawket Verified Partners, or CHARM-supporting providers.
- Public same-state/same-city duplicate names and normalized phone groups are currently `0`; website-host groups remain `20` and are review-only because they can represent legitimate chains, franchise pages, or service lines.

The previous Pawket Network pass made the Massachusetts coverage workflow town/radius-aware instead of only state-count-aware. It added a repeatable local coverage promoter and used it to improve exact town presence plus nearby radius usefulness from staged Overture candidates while preserving the trust boundary.

Current Pawket Network coverage after this pass:

- Public Network total is `5,456`.
- Massachusetts now has `1,406` public listings.
- Spencer, MA remains at `8` exact public listings, including `2` veterinary listings.
- Searching `Spencer, MA` and using `Near me` now returns `Showing 12 of 194 Network Listings`, sorted by distance with exact Spencer listings first.
- Princeton, MA now has `1` exact public listing and `185` listings inside `25 mi`.
- North Adams, MA now has `4` exact public listings and `28` listings inside `25 mi`.
- Stronger Northeast coverage targets are still met: `CT=125`, `NH=125`, `ME=125`, `RI=125`, `VT=125`, and `NY=125`.
- Every other US state plus `DC` still has at least `75` public listings.
- Trust state remains clean: `non_unclaimed=0`, `partnered=0`, and `charm_enabled=0`.
- All promoted source rows remain public `Network Listing` records only. They are not claimed listings, Pawket Verified Partners, or CHARM-supporting providers.
- Public same-state/same-city duplicate names and normalized phone groups are currently `0`; website-host groups remain `20` and are review-only because they can represent legitimate chains, franchise pages, or service lines.

Coverage/source work completed in this pass:

- Added `scripts/network-promote-local-coverage.js`, exposed as `npm run network:promote:local`.
- The local promoter compares Census place centers, current public listings, and staged source candidates, then promotes candidates only where exact town count or radius count is weak.
- The pass ran with `--state=MA --min-exact=2 --min-radius=12 --radius-mi=25 --per-place=4 --max-promotions=350`.
- It promoted `306` Massachusetts source-backed listings across rural, western, central, and under-covered towns, stopping naturally when eligible gap-closing opportunities ran out under the duplicate rules.
- The new helper keeps the same launch gate as other promotion paths: phone or HTTPS website required, non-`other` category required, public rows remain unclaimed, partner tier stays off, CHARM stays off, and same-state/same-city duplicate name/phone/host candidates are skipped.

Recent verification for this local coverage pass:

- `npm run network:coverage:audit -- --states=MA --targets=MA:1400 --json` returned `MA=1406`, `public_total=5456`, `non_unclaimed=0`, `partnered=0`, `charm_enabled=0`, `duplicate_names=0`, and `duplicate_phones=0`.
- `npm run network:coverage:audit -- --include-dc --baseline=75 --targets=MA:1400,RI:125,CT:125,NH:125,ME:125,VT:125,NY:125 --gaps-only` returned `below_target=0`, `public_total=5456`, `non_unclaimed=0`, `partnered=0`, `charm_enabled=0`, `duplicate_names=0`, and `duplicate_phones=0`.
- Direct API checks returned `total=1406` for `GET /api/network/listings?state=MA&page_size=1` and `GET /api/network/listings?q=Massachusetts&page_size=1`.
- Direct API checks returned `total=8` for exact Spencer, `total=1` for exact Princeton, and `total=4` for exact North Adams.
- Direct radius API checks returned `194` listings around Spencer, `185` around Princeton, and `28` around North Adams at `25 mi`.
- Direct autocomplete checks confirmed `Princeton, M`, `North Adams, M`, `vet Spencer, M`, and `01360` still return place or ZIP radius suggestions.
- Browser QA confirmed typing `Spencer, MA` and clicking `Near me` shows `Location: Spencer, MA · 25 mi`, `Sorted by Distance`, and exact Spencer listings first.
- Browser console QA for `/pawket-network.html` showed only existing verbose autocomplete suggestions, with no errors.
- `node --check scripts/network-promote-local-coverage.js`
- `node --check scripts/network-promote-candidates.js`
- `node --check scripts/network-coverage-audit.js`
- `node --check public/pawketNetwork.js`
- `node --check networkDB.pg.js`
- `npm test` passed `34/34`.

The previous Pawket Network coverage correction pass focused on Spencer, Massachusetts after browser QA showed that the statewide Massachusetts expansion still did not make the user's hometown feel covered. It moved the public directory from `5,050` launch listings to `5,150` real source-backed public Network Listings while preserving the trust boundary.

Current Pawket Network coverage after this pass:

- Public Network total is `5,150`.
- Massachusetts now has `1,100` public listings.
- Spencer, MA now has `8` exact public listings, including `2` veterinary listings.
- Stronger Northeast coverage targets are met: `CT=125`, `NH=125`, `ME=125`, `RI=125`, `VT=125`, and `NY=125`.
- Every other US state plus `DC` now has at least `75` public listings.
- Trust state remains clean: `non_unclaimed=0`, `partnered=0`, and `charm_enabled=0`.
- All promoted source rows remain public `Network Listing` records only. They are not claimed listings, Pawket Verified Partners, or CHARM-supporting providers.
- Public same-state/same-city duplicate names and normalized phone groups are currently `0`; website-host groups are `20` and remain review-only because they can represent legitimate chains or service lines.

Coverage/source work completed in this pass:

- A Spencer-area Massachusetts promotion pass selected `100` launch-safe source candidates within `25` miles of Spencer while preserving same-city duplicate phone/name/host checks.
- Newly visible Spencer-area listings include Spencer Veterinary Hospital, People for Animals League, Town & Country Grooming, Four Paws Academy, Pack of Paws Board & Train by Lil Canine, House Of Klein Dog Training, Moosehill Grooming Salon, Cedarwood Kennels Pet Grooming, and nearby Leicester/North Brookfield/Charlton providers.
- `public/pawketNetwork.js` now makes the `Near me` button honor a typed city/state or ZIP first. If the user enters `Spencer, MA` or `vet Spencer, MA`, the button resolves that typed place as the radius center instead of immediately replacing it with browser geolocation.
- `public/css/pawket-network.css` now lays out autocomplete suggestions in normal flow instead of as an overlay, so suggestions cannot block clicks on `Apply`, `Near me`, or `Reset`.
- A statewide Massachusetts Overture bbox import was run through the national source manifest: `seen=563608`, `matched=4402`, `imported=4402`, `failed=0`.
- After staging, Massachusetts had `2,662` launch-ready Overture candidates across veterinary, grooming, boarding, training, shelter, sitting, walking, rescue, and daycare categories.
- `npm run network:promote:candidates -- --states=MA --targets=MA:1000 --candidate-limit=5000` promoted `600` additional Massachusetts listings and brought `MA` from `400` to `1,000`.
- `scripts/network-promote-candidates.js` now fingerprints newly promoted listings using their nested `location` and `contact` fields. This fixes duplicate detection inside the same bulk promotion run.
- `scripts/network-coverage-audit.js` now reports duplicate public name, normalized-phone, and website-host groups in its summary line.
- The earlier tier-two duplicate cleanup remains preserved: eighty-one lower-ranked duplicate public rows were removed from launch visibility, their source candidates were marked `rejected` for manual review, and replacement candidates were promoted to keep state targets met.
- Final duplicate audit found no same-state/same-city duplicate public names and no same-state/same-city duplicate public phone numbers.

Recent verification for this coverage expansion pass:

- Browser QA confirmed typing `Spencer, MA` and clicking `Near me` returns `Showing 12 of 133 Network Listings`, sorted by distance within `25 mi` of Spencer, with exact Spencer listings first.
- Browser QA confirmed typing `vet Spencer, MA` and clicking `Near me` applies `Category: Veterinary`, returns `Showing 12 of 42 Network Listings`, and shows Spencer Veterinary Hospital plus People for Animals League first.
- Direct API checks returned `total=8` for `GET /api/network/listings?city=Spencer&state=MA&page_size=20` and `total=2` for the same Spencer exact query with `category=vet`.
- Direct API checks returned nearby Spencer radius results with exact Spencer listings first and `total=5150` for the national first page.
- `npm run network:coverage:audit -- --states=MA --targets=MA:1100 --json` returned `below_target=0`, `public_total=5150`, `MA=1100`, `non_unclaimed=0`, `partnered=0`, `charm_enabled=0`, `duplicate_names=0`, and `duplicate_phones=0`.
- `npm run network:coverage:audit -- --include-dc --baseline=75 --targets=MA:1100,RI:125,CT:125,NH:125,ME:125,VT:125,NY:125 --gaps-only` returned `below_target=0`, `public_total=5150`, `non_unclaimed=0`, `partnered=0`, `charm_enabled=0`, `duplicate_names=0`, and `duplicate_phones=0`.
- Direct API checks returned `total=1100` for `GET /api/network/listings?state=MA&page_size=1` and `GET /api/network/listings?q=Massachusetts&page_size=1`.
- Direct autocomplete checks confirmed `Princeton, MA` and `vet Spencer, MA` still return listing-independent `Place` suggestions from the local radius-search index, with the service-plus-place suggestion carrying `category=vet`.
- Direct radius API checks returned nearby listings around Princeton and Spencer after the Massachusetts expansion.
- Browser console QA for `/pawket-network.html` returned zero errors and zero warnings.
- `POST /api/network/geocode` with `Princeton, MA` returned a cached normalized location: `city=Princeton`, `state=MA`, `postal_code=01541`.
- `node --check public/pawketNetwork.js`
- `node --check scripts/network-import-overture-bbox.js`
- `node --check scripts/network-coverage-audit.js`
- `node --check scripts/network-promote-candidates.js`
- `npm test` passed `34/34`.

The newest Pawket Network completion pass added ZIP autocomplete and a radius-expansion empty state so resolved locations remain useful even when the default radius has no public listings.

ZIP and radius-empty additions:

- `scripts/network-import-census-places.js` now imports Census ZCTA rows as ZIP radius centers in `network_place_index`.
- The current local place index now contains `91,925` centroid records: `32,350` Census place rows, `25,784` town/city/village/borough/municipality/township county-subdivision rows, and `33,791` ZCTA ZIP rows.
- `networkDB.pg.js` now returns listing-independent `ZIP` suggestions from ZCTA centroids, including partial input such as `974` and service-plus-ZIP input such as `vet 97401`.
- Selecting a ZIP suggestion in `public/pawketNetwork.js` sets a distance-aware location center instead of exact-filtering only listings that already have that postal code.
- When a resolved place or ZIP has no results inside the current radius, the Launch Desk now shows a `Nearby search` block with `Try 50 mi`, `Try 100 mi`, or later expansion options before asking the user to nominate a provider.
- The result count now says `No listings inside <radius>` for location-aware empty radius searches instead of only `Launch Desk active`.

Recent verification for this completion pass:

- `npm run network:places:import` completed with `total=91925` after adding Census ZCTA import.
- Direct API checks confirmed `974` suggests `97401`, `97402`, etc.; `vet 97401` suggests `97401` with `Veterinary ZIP radius center`; `015` suggests Massachusetts-area ZIP centroids.
- Browser QA at `1370x760` confirmed selecting `97401` shows `No listings inside 25 mi`, `Location: ZIP 97401 · 25 mi`, and radius expansion buttons. `Try 50 mi` keeps the same search at 50 miles; `Try 100 mi` returns `Showing 3 of 3 Network Listings`.
- Browser QA confirmed selecting `vet 97401` on a fresh page applies `Category: Veterinary` plus `Location: ZIP 97401 · 25 mi`.
- Mobile browser QA at `390x844` confirmed ZIP autocomplete selection shows the radius-expansion block with horizontal overflow `0`.
- `node --check networkDB.pg.js`
- `node --check public/pawketNetwork.js`
- `node --check scripts/network-import-census-places.js`
- `npm test` passed 34/34.

The newest Pawket Network autocomplete pass extended the radius-search model into the autofill options themselves. Autocomplete no longer depends only on towns already represented by public listing rows.

Place autocomplete additions:

- `db/migrations/009_pawket_network_place_index.sql` adds `network_place_index`, a public place/town centroid table for radius autocomplete.
- `scripts/network-import-census-places.js` imports US Census Gazetteer place and county-subdivision centroids. The current local import used the 2025 Census Gazetteer place and county-subdivision national ZIPs.
- `package.json` now exposes `npm run network:places:import`.
- The local place index now contains `58,134` centroid records: `32,350` Census place rows plus `25,784` town/city/village/borough/municipality/township county-subdivision rows.
- `networkDB.pg.js` now prepends `Place` suggestions from `network_place_index` inside `/api/network/listings/suggestions`, including partial state input such as `Princeton, M`, `Exeter, N`, and `Eugene, O`.
- Service-plus-place autocomplete now carries category intent: `vet Spencer, M` returns a `Place` suggestion for `Spencer, MA` with `category: vet`, so selecting it applies Veterinary plus radius search.
- `public/pawketNetwork.js` no longer calls geocoding during every autocomplete keystroke; autocomplete uses the local place index, while explicit typed searches still use `/api/network/geocode` as the final resolver when needed.

Recent verification for this autocomplete pass:

- `npm run migrate` applied `009_pawket_network_place_index.sql`.
- `npm run network:places:import` completed with `total=58134`.
- Direct API checks confirmed `Princeton, M` suggests `Princeton, MA`, `Exeter, N` suggests `Exeter, NH`, `Eugene, O` suggests `Eugene, OR`, and `vet Spencer, M` suggests `Spencer, MA` with `Veterinary radius center`.
- Browser QA at `1370x760` confirmed partial autocomplete for `Princeton, M`, `Exeter, N`, and `Eugene, O`, and selecting `vet Spencer, M` returns `Showing 7 of 7 Network Listings` with `Category: Veterinary` and `Location: Spencer, MA · 25 mi`.
- Mobile browser QA at `390x844` confirmed selecting `Eugene, O` fills `Eugene, OR`, opens the location-aware Launch Desk at the default radius, and has horizontal overflow `0`.
- `node --check networkDB.pg.js`
- `node --check scripts/network-import-census-places.js`
- `node --check public/pawketNetwork.js`
- `npm test` passed 34/34.
- The server is running on `http://localhost:3001/` with logs at `/tmp/petpawket-3001.log`.

The newest Pawket Network radius-search pass fixed the gap between autocomplete/search and the actual nearby-directory model. Towns and ZIPs no longer have to already exist in `network_listings` before the Live Directory can use them as radius centers.

Radius search additions:

- `public/pawketNetwork.js` now recognizes city/town + state and ZIP search intent, including examples like `Princeton, MA`, `Spencer MA`, `Exeter, NH`, and service-plus-place searches such as `vet Spencer MA`.
- Explicit place searches resolve through the existing `/api/network/geocode` endpoint, set `lat`/`lng`, switch sorting to `distance`, and skip exact `q`, `city`, `state`, and `postal_code` filters that would otherwise block nearby results.
- Autocomplete can now prepend a `Place` suggestion from geocoding when the typed query has enough location context, even if the town has no published listing row.
- Service wording in the main search can set the existing category filter before radius search, so `vet Spencer MA` becomes a Veterinary category search around Spencer instead of a brittle free-text match.
- Active chips and sort status now show the resolved location and radius, while reset/clear returns the search box to the normal national directory state.
- `utils/networkGeocode.js` and `routes/networkRoutes.js` normalize Nominatim full state names back to postal codes on fresh and cached geocode responses.

Recent verification for this radius-search pass:

- Direct geocode API calls resolved `Princeton, MA`, `Spencer, MA`, `Exeter, NH`, and `Eugene, OR` with normalized state codes.
- Direct nearby API calls returned radius results for Princeton, Spencer, and Exeter; Eugene correctly resolves as a location and shows the Launch Desk at the default 25-mile radius when no nearby public listing is inside that radius.
- Browser QA at `1370x760` confirmed `Princeton, MA` autocomplete shows a `Place` suggestion, searching it returns `Showing 12 of 16 Network Listings`, switches to distance sort, shows `Location: Princeton, MA · 25 mi`, and has horizontal overflow `0`.
- Browser QA confirmed `vet Spencer MA` returns `Showing 7 of 7 Network Listings` with `Category: Veterinary` plus `Location: Spencer, MA · 25 mi`.
- Browser QA confirmed `Exeter, NH` returns `Showing 12 of 24 Network Listings` and `Eugene, OR` resolves to the location-aware Launch Desk at the default radius without console errors.
- Mobile browser QA at `390x844` confirmed selecting the `Place` suggestion for `Princeton, MA` returns nearby results, has horizontal overflow `0`, and reset clears location/search state back to `Showing 12 of 510 Network Listings`.
- `node --check public/pawketNetwork.js`
- `node --check routes/networkRoutes.js`
- `node --check utils/networkGeocode.js`
- `npm test` passed 34/34.
- `git diff --check -- public/pawketNetwork.js public/pawket-network.html routes/networkRoutes.js utils/networkGeocode.js tests/networkRoutes.test.js docs/PET_PAWKET_CURRENT_STATE.md`
- The server is running on `http://localhost:3001/` with logs at `/tmp/petpawket-3001.log`.

The newest Pawket Network implementation pass moved the source pipeline from "available" to actually usable for launch coverage. It added coverage auditing, tightened Overture category quality, staged Overture candidates for the remaining Northeast gaps, promoted only the needed public records, and cleaned duplicate Overture variants.

Coverage/source additions:

- `scripts/network-coverage-audit.js` now audits public Network coverage by state against the same baseline/deep targets as promotion. It reports public count, gap, ready source candidates by source, trust state, and a suggested next import or promote command.
- `package.json` now exposes `npm run network:coverage:audit`.
- `scripts/network-import-shared.js` now requires pet-specific context for generic trainer/daycare/shelter/rescue/boarding words, preventing Overture categories such as fitness trainers, child daycares, and homeless shelters from entering the pet-service candidate lane.
- `scripts/network-import-overture.js` now maps Overture categories with primary-category priority and treats alternates as supporting evidence only when the primary category or listing name is already pet-relevant. This prevents noisy alternates from overriding a pet boarding/grooming/sitting primary category.
- `scripts/network-promote-candidates.js` now skips duplicate promotion candidates by same-state/same-city normalized phone, name, or website host.
- `docs/PAWKET_NETWORK_SOURCE_PIPELINE.md` now documents the coverage audit and the Overture-to-promotion gap-fill workflow.

Actual data changes completed in this pass:

- A first Boston-area Overture import surfaced category pollution, so the non-promoted Overture candidate batch was deleted before any broad promotion.
- After classifier tightening, Overture candidates were restaged from bounded bbox jobs:
  - Boston/MA bbox: `seen=107314 matched=976 imported=976`.
  - Rhode Island bbox: `seen=71718 matched=763 imported=763`.
  - Southern/coastal Maine bbox: `seen=77301 matched=1132 imported=1132`.
  - Vermont bbox: `seen=88551 matched=717 imported=717`.
- Massachusetts was promoted from `75` to `80` public listings.
- Rhode Island was promoted from `15` to `35` public listings.
- Maine was promoted from `22` to `35` public listings.
- Vermont was promoted from `17` to `35` public listings.
- Two duplicate Vermont Overture variants for the same Orleans listing were removed from public listings and returned to candidate review; replacement promotions were selected with duplicate skipping active.
- One Massachusetts Overture listing category was corrected from `shelter` to `boarding` after the Overture primary-category fix.

Current Pawket Network coverage after this pass:

- Public Network total is `510`.
- Trust state remains clean: `non_unclaimed=0`, `partnered=0`, and `charm_enabled=0`.
- Deep targets are now met: `MA=80`, `RI=35`, `CT=35`, `NH=35`, `ME=35`, `VT=35`, `NY=35`.
- Every other US state still has at least `5`, and `DC=5`.

Recent verification for this coverage/source pass:

- `npm run network:coverage:audit -- --include-dc --gaps-only` returned `below_target=0`, `public_total=510`, `non_unclaimed=0`, `partnered=0`, and `charm_enabled=0`.
- A duplicate check over RI/ME/VT returned no same-state/same-city duplicate public names or phone numbers.
- `node --check scripts/network-import-shared.js`
- `node --check scripts/network-import-overture.js`
- `node --check scripts/network-promote-candidates.js`
- `node --check scripts/network-coverage-audit.js`
- `npm test` passed 32/32.
- `git diff --check`
- Direct API `GET /api/network/listings?q=Massachusetts&page_size=1` returned `total=80`.
- Direct API `GET /api/network/listings?state=RI&page_size=1` returned `total=35`.
- Direct API `GET /api/network/listings?state=ME&page_size=1` returned `total=35`.
- Direct API `GET /api/network/listings?state=VT&page_size=1` returned `total=35`.

The newest Pawket Network source pass promoted Overture Maps Places from a manual-file option into a first-class acquisition path. This addresses the source strategy concern directly: broad provider coverage should start from reusable public/paid source pipelines, not handpicked listings or public Overpass loops alone.

Overture source pipeline additions:

- `scripts/network-import-overture-bbox.js` now downloads Overture Places by bounding box through the official Overture CLI, writes GeoJSON sequence by default, runs the existing Overture candidate importer, and removes temp extracts unless `--keep-file` or `--output` is used.
- `scripts/network-import-shared.js` now reads `.geojsonseq` line by line, including Overture's record separator format, so large Overture extracts do not require loading one giant GeoJSON file into memory.
- `scripts/network-import-launch-plan.js` now supports the `overture_bbox` job type and `--replace-type=osm:overture_bbox`, allowing the existing national bbox manifest to run against Overture Places instead of public Overpass.
- `package.json` now exposes `npm run network:import:overture:bbox`.
- `data/pawket-network-source-plan.json` now includes a disabled `overture-boston-metro-places` bbox job as the repeatable example instead of a manual local-extract placeholder.
- `.gitignore` now excludes `data/sources/` so large downloaded source extracts are not accidentally committed.
- `docs/PAWKET_NETWORK_SOURCE_PIPELINE.md` now documents Overture as the primary bulk path, the local CLI/venv setup, direct bbox imports, and Overture reuse of the national bbox plan.

Recent verification for this Overture source pass:

- `python3 -m pip install --user overturemaps` was blocked by the system Python's externally-managed-environment guard, so verification used an ignored repo-local venv at `.cache/overture-venv`.
- `.cache/overture-venv/bin/python -m pip install overturemaps` installed the official Overture client for local verification.
- `OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps npm run network:import:overture:bbox -- --bbox=-71.12,42.34,-71.04,42.39 --state=MA --limit=100 --dry-run` downloaded 25,666 Overture Places rows for the bounded Boston-area bbox, read the first 100 source records, matched 6 pet-related candidates, imported 0 because it was dry-run, and removed the temp extract.
- Temp cleanup was verified for both `/tmp/overture-ma-535f16dbdf.geojsonseq` and `/tmp/overture-ma-535f16dbdf.geojsonseq.state`.
- `node --check scripts/network-import-shared.js`
- `node --check scripts/network-import-overture-bbox.js`
- `node --check scripts/network-import-launch-plan.js`
- `node -e "JSON.parse(require('fs').readFileSync('data/pawket-network-source-plan.json','utf8')); console.log('source-plan-json-ok')"`
- `npm test` passed 32/32.
- `git diff --check`
- `curl -I http://localhost:3001/pawket-network.html` returned `200 OK`.
- `curl http://localhost:3001/api/network/listings?q=Massachusetts&page_size=1` returned `total=75`.

The newest Pawket Network functionality pass expanded Live Directory search beyond the narrow full-state-name fix. Search now parses user intent across location, service/category language, and remaining name/address/city tokens instead of doing one loose `%query%` match across generic listing descriptions.

Search expansion additions:

- `networkDB.pg.js` now analyzes public search text into state/location intent, category/service intent, and remaining search tokens.
- Full state names, state abbreviations, and mixed phrases such as `vet MA`, `veterinarian in Massachusetts`, and `animal hospital NY` now combine correctly instead of relying on a single hard-coded state-name path.
- Common service phrases now map to categories: vet/veterinarian/animal hospital, grooming/dog wash/pet salon, shelter/SPCA/adoption, rescue, training/obedience, boarding/kennel, daycare, sitting, and walking.
- Generic source/import wording is no longer part of public free-text search, so terms like `MA` no longer match almost the whole directory through words in generated source descriptions.
- `search=` and `query=` are accepted as aliases for `q=` on the public listings route, so natural API callers do not accidentally get the whole directory because the search parameter was ignored.
- Autocomplete now includes category suggestions; selecting one applies the existing Category filter from the Live Directory search box.

Recent verification for this search expansion pass:

- Direct API `GET /api/network/listings?q=MA&page_size=1` returned `total=75`, not the full directory.
- Direct API `GET /api/network/listings?q=Massachusetts&page_size=1` returned `total=75`.
- Direct API `GET /api/network/listings?q=vet%20MA&page_size=3` returned `total=46`.
- Direct API `GET /api/network/listings?q=veterinarian%20in%20Massachusetts&page_size=3` returned `total=46`.
- Direct API `GET /api/network/listings?q=animal%20hospital%20NY&page_size=3` returned `total=22`.
- Direct API `GET /api/network/listings?search=dog%20grooming%20California&page_size=3` returned the California grooming result through the `search=` alias.
- Direct API `GET /api/network/listings?q=OpenStreetMap&page_size=1` returned `total=0`, confirming source-description text is not polluting public search.
- Browser QA confirmed typing `veterinarian` shows a `Category` suggestion for `Veterinary`; selecting it applies `Category: Veterinary` and returns `Showing 12 of 281 Network Listings`.
- `node --check networkDB.pg.js`
- `node --check routes/networkRoutes.js`
- `node --check public/pawketNetwork.js`
- `npm test` passed 32/32.

The newest Pawket Network implementation pass expanded the public directory from sparse Northeast coverage into broad launch coverage using real source candidates instead of handpicked placeholder listings. The public list now has deep Massachusetts coverage, stronger surrounding-state coverage, and at least five distinct public listings in every US state, while preserving the source-data trust boundary.

National Pawket Network coverage pass:

- IRS EO BMF was staged nationally as internal animal nonprofit candidates with `npm run network:import:irs -- --all-states --per-source-limit=5000`, producing `matched=5904 imported=5904`. These records remain review/enrichment backlog because most IRS rows do not include a launch-safe phone or HTTPS website.
- `data/pawket-network-national-osm-plan.json` now defines a repeatable OSM/Overpass metro source plan for every state plus DC, with extra Massachusetts, New England, New York, and sparse-state top-up jobs.
- `scripts/network-import-osm-overpass.js` now supports `--fallback-city=<city>`, reports `contactReady`, `locationReady`, and `promotableBasics`, supports `OVERPASS_ENDPOINT`, and includes `amenity=animal_training` as trainer candidates.
- `scripts/network-import-launch-plan.js` now supports `--delay-ms`, `--continue-on-error`, and `--start-at=<job-id>` so broad source plans can respect public Overpass limits and resume after a failed job.
- `scripts/network-promote-candidates.js` promotes source candidates by state target without weakening launch gates. It filters to phone or HTTPS-website candidates, summarizes skip reasons instead of flooding logs, and now counts distinct public listing IDs so duplicate source candidates do not overstate state coverage.
- The final public Network count is `454` distinct listings. Every public listing is still `status=unclaimed`, has no partner tier, and has CHARM support off.
- State coverage after promotion: `MA=75`, `CT=35`, `NH=35`, `NY=35`, `ME=22`, `VT=17`, `RI=15`, every other US state has at least `5`, and `DC=5`.

Recent verification for this national coverage pass:

- `npm run network:promote:candidates -- --dry-run --include-dc --baseline=5` planned launch-safe coverage for every state before the final promotion run.
- `npm run network:promote:candidates -- --include-dc --baseline=5` completed with `trust total=452 non_unclaimed=0 partnered=0 charm_enabled=0`; the follow-up duplicate-safe top-up for `CA,ND` completed with `trust total=454 non_unclaimed=0 partnered=0 charm_enabled=0`.
- Direct DB verification returned `total=454`, `non_unclaimed=0`, `partnered=0`, `charm_enabled=0`, every US state count `>=5`, and `DC=5`.
- Direct API `GET /api/network/listings?q=Massachusetts&page_size=3` returned `total=75`.
- Direct API `GET /api/network/listings?state=MA&page_size=3` returned `total=75`.
- `node --check scripts/network-import-osm-overpass.js`
- `node --check scripts/network-import-launch-plan.js`
- `node --check scripts/network-promote-candidates.js`

The newest Pawket Network polish pass tightened the integrated Live Directory controls into a cleaner, container-aware layout. The separate left-side filter panel remains removed, helper-pill copy was removed from the search box, and the filters no longer read as a loose admin grid inside the search surface.

Live Directory layout polish:

- `/pawket-network.html` keeps search, autocomplete, Category, Location, Trust state, Distance/sort, active chips, reset/clear behavior, location lookup, and status messages inside `#network-primary-search`.
- The filter controls now sit in consistent subpanels: Category and Distance/sort share the first constrained row, Trust state keeps its label, Claimed, Verified, CHARM, and partner-tier selector on one line at the constrained desktop width, and Location is collapsed by default because the main Live Directory search already supports city, state, ZIP, address, and area queries.
- `public/css/pawket-network.css` now uses container-aware wrapping for the actual Live Directory width, so the layout responds to the dock/context-rail constrained content area instead of relying only on viewport breakpoints.
- Narrow mobile layout now keeps the primary filters in a single-column stack, compresses Trust state into a shorter two-row control group, leaves Location collapsed below the primary filters, and keeps the filter actions as a compact Apply/Near me/Reset group.
- Results still sit below the Live Directory controls in a single-column response panel with the heading `Network listings and launch paths`.

Recent verification for this layout pass:

- Browser QA at `1370x760` confirmed the constrained Live Directory has helper support copy removed, Location collapsed, Trust state on one line, horizontal overflow `0`, card overlap `false`, footer gap `0`, and `Showing 12 of 33 Network Listings`.
- Browser QA at `390x844` confirmed mobile has Location collapsed, horizontal overflow `0`, card overlap `false`, footer gap `0`, and `Showing 12 of 33 Network Listings`.
- Browser QA confirmed searching `Massachusetts` returns `Showing 12 of 26 Network Listings`.
- Browser QA confirmed selecting the `Massachusetts` autocomplete suggestion fills State `MA`, returns `Showing 12 of 26 Network Listings`, and shows `State: MA` plus `Clear all` in the same Live Directory control surface.
- Browser QA confirmed `Clear all` clears the search and state controls, restores `Showing 12 of 33 Network Listings`, and returns active filters to `No active filters.`
- Browser console errors returned `0`.
- `node --check public/pawketNetwork.js`
- `npm test` passed 31/31.
- `git diff --check`

The newest fix pass made full US state names work in Pawket Network search and autocomplete. Before this fix, public listings stored state values as postal abbreviations such as `MA`, so typing `Massachusetts` returned no results even though Massachusetts listings existed.

State search fix:

- `networkDB.pg.js` now normalizes US state names and abbreviations for public listing search.
- Direct search for a full state name, such as `Massachusetts`, now matches listings whose stored state is `MA`.
- Autocomplete now includes a `State` suggestion type, such as `Massachusetts`, with the public listing count.
- Selecting a state suggestion fills the existing State filter while keeping the visible search phrase readable.
- The front-end structured-selection logic treats state suggestions like area/ZIP suggestions, so it does not double-apply the same value as a loose text query.

Recent verification for this state-search fix:

- Direct API `GET /api/network/listings?q=Massachusetts&page_size=3` returned `total=26`.
- Direct API `GET /api/network/listings/suggestions?q=Massachusetts&limit=8` returned a `State` suggestion for `Massachusetts` with `26 listings`.
- Browser QA confirmed typing and searching `Massachusetts` returns `Showing 12 of 26 Network Listings`.
- Browser QA confirmed selecting the `Massachusetts` autocomplete suggestion fills State `MA` and still returns `Showing 12 of 26 Network Listings`.
- Desktop and mobile autocomplete layout still have horizontal overflow `0`, footer gap `0`, and no console errors.
- `node --check networkDB.pg.js`
- `node --check public/pawketNetwork.js`
- `npm test` passed 31/31.
- The server is running on `http://localhost:3001/` with logs at `/tmp/petpawket-3001.log`.

The newest continuation pass made Pawket Network autocomplete selections structured instead of purely free-text. Choosing an area, ZIP, address, or listing now carries the public location metadata forward into the existing location controls.

Structured autocomplete additions:

- Public listing suggestions now include safe public location fields for listing and address suggestions: street address, city, state, and ZIP.
- Area suggestions populate the City and State filters while keeping the visible search value readable.
- ZIP suggestions populate City, State, and ZIP filters while the actual request uses the structured location fields instead of only loose text.
- Listing/address suggestions still perform direct searches, but attach location context so stale location filters do not accidentally block the selected result.
- Search chips suppress duplicate loose-search chips for structured area/ZIP choices, so the active filters show the actual location controls being used.

Recent verification for this structured autocomplete pass:

- `node --check networkDB.pg.js`
- `node --check public/pawketNetwork.js`
- `npm test` passed 31/31.
- Public suggestions for `Pawsh` now include public address/city/state/ZIP metadata.
- Browser QA confirmed selecting `Boston, MA` fills City `Boston` and State `MA` and returns 4 listings.
- Browser QA confirmed selecting `02115` fills City `Boston`, State `MA`, ZIP `02115`, and returns 1 listing.
- Browser QA confirmed selecting `Pawsh` returns the Pawsh listing with location context attached.
- Desktop and mobile autocomplete layout still have horizontal overflow `0`, footer gap `0`, and no console errors.
- The server is running on `http://localhost:3001/` with logs at `/tmp/petpawket-3001.log`.

The newest implementation pass added public-listing-backed autocomplete to the Pawket Network live directory search. Suggestions are sourced only from published `network_listings`, not internal import candidates or ops review rows.

Autocomplete/search additions:

- `GET /api/network/listings/suggestions` returns public suggestions for listing names, city/state areas, street addresses, and ZIPs.
- `networkDB.pg.js` now searches public listings by street address, category text, city/state combinations such as `Boston, MA`, and formatted full addresses such as `31 Gloucester Street, Boston, MA, 02115`.
- `/pawket-network.html` now exposes the main search as an accessible combobox with a responsive suggestion list.
- `public/pawketNetwork.js` debounces suggestion loading, supports mouse and keyboard selection, and immediately reruns the live listing search after a suggestion is chosen.
- `public/css/pawket-network.css` keeps the suggestion panel contained on desktop and static/responsive on mobile so it does not introduce horizontal overflow.
- `tests/networkRoutes.test.js` now covers the public suggestions route and invalid suggestion-limit validation.

Recent verification for this autocomplete pass:

- `node --check networkDB.pg.js`
- `node --check routes/networkRoutes.js`
- `node --check public/pawketNetwork.js`
- `npm test` passed 31/31.
- Direct API checks confirmed `Boston` returns area/listing/ZIP suggestions and `31 Gloucester` returns a street-address suggestion.
- Public listing search now resolves both `Boston, MA` and `31 Gloucester Street, Boston, MA, 02115`.
- Browser QA on `/pawket-network.html` confirmed autocomplete suggestions render on desktop and mobile, selecting the full address opens the `Pawsh` result, horizontal overflow is `0`, footer gap is `0`, and console errors are `0`.
- The server is running on `http://localhost:3001/` with logs at `/tmp/petpawket-3001.log`.

The newest implementation pass promoted the current launch-safe Pawket Network candidates into public unclaimed Network Listings through the explicit candidate promotion path. This moved the public directory out of the empty Launch Desk state without creating fake verified partners.

Candidate promotion completed:

- 33 `promotable` source candidates were promoted with `promoteNetworkImportCandidate()`.
- All 33 promotions succeeded with `failed=0`.
- Public Network now returns `total=33`.
- Every promoted listing is still `status=unclaimed`, `claim_status=pending`, `partner_tier=null`, and `charm_enabled=false`.
- Candidate summary now shows `promoted=33`, `needs_review=149`, and `promotable=0`.
- Public CHARM-filtered results still return `0`, preserving the CHARM review gate.
- Promoted public summaries were sanitized so public cards no longer say `source candidate`.
- `Zen Dog Training` was corrected from `groomer` to `trainer` after promotion.
- Public directory copy was tightened from `approved listings` to `Network Listings` / `published` wording so unclaimed source-promoted records are not overstated as verified partners.

Recent verification for this promotion pass:

- Direct DB trust check returned `total=33`, `non_unclaimed=0`, `partnered=0`, and `charm_enabled=0`.
- Public API `GET /api/network/listings?page_size=1` returned `total=33`.
- Public API `GET /api/network/listings?supports_charm=1&page_size=3` returned `total=0`.
- Public API search for `Zen` returned `Zen Dog Training` with `category_primary=trainer`.
- `node --check networkDB.pg.js`
- `node --check public/pawketNetwork.js`
- `npm test` passed 29/29.
- `git diff --check`
- The server was restarted on `http://localhost:3001/` so the promotion-summary helper and public copy are loaded.
- Browser QA on `/pawket-network.html` confirmed the page shows `Showing 12 of 33 Network Listings`, no Launch Desk, no `source candidate` public wording, desktop and mobile horizontal overflow are `0`, footer gap is `0`, and console errors are `0`.

The newest implementation pass added bulk internal review controls for Pawket Network import candidates. This is deliberately not a bulk public-publish path: ops can mark selected source candidates as `new`, `needs_review`, `approved`, or `rejected`, and can add shared review notes, but public promotion still requires the existing explicit candidate promotion action.

Bulk candidate review additions:

- `PATCH /api/network/partners-ops/import-candidates/bulk` accepts up to 100 selected candidate IDs plus `status` and/or `review_notes`.
- Bulk updates reject `promoted`; moving a candidate into a public unclaimed Network Listing still requires `POST /api/network/partners-ops/import-candidates/:id/promote`.
- `/pawket-partners-ops.html` now includes Select visible, Clear selected, Bulk status, Bulk review note, and Apply to selected controls beside the source candidate queue.
- `public/pawketPartnersOps.js` now adds per-candidate selection checkboxes, sends bulk updates, and refreshes the queue and summary after successful bulk review.
- `tests/networkRoutes.test.js` now covers successful bulk internal review and rejects attempted bulk promotion status.

Recent verification for this bulk review implementation pass:

- `node --check routes/networkRoutes.js`
- `node --check public/pawketPartnersOps.js`
- `npm test` passed 29/29.
- `git diff --check`
- The server was restarted on `http://localhost:3001/` so the bulk route and UI are loaded.
- Browser QA on `/pawket-partners-ops.html` confirmed the bulk status select, bulk review note, Select visible, Clear selected, and Apply to selected controls render; desktop and mobile horizontal overflow are `0`, and the footer gap remains `0`. Unsigned ops API requests correctly return `401 Unauthorized`.

The newest continuation pass added candidate readiness filters so the 182 staged Pawket Network source candidates can be reviewed by actual launch work needed instead of only status/source/state/search.

Import candidate readiness additions:

- `networkDB.pg.js` now supports `readiness` filters for `listNetworkImportCandidates()` and `summarizeNetworkImportCandidates()`.
- `routes/networkRoutes.js` now validates and forwards readiness filters on:
  - `GET /api/network/partners-ops/import-candidates`
  - `GET /api/network/partners-ops/import-candidates/summary`
- `/pawket-partners-ops.html` and `public/pawketPartnersOps.js` now expose an ops readiness selector with:
  - `Promotable basics`
  - `Needs contact`
  - `Needs location`
  - `Contact ready`
  - `Location ready`
- The filter remains an internal review aid. It does not verify partners, publish listings, claim owners, or enable CHARM support.

Direct DB readiness counts against the current local staged candidates:

- `promotable`: `33`
- `needs_contact`: `131`
- `needs_location`: `60`
- `contact_ready`: `51`
- `location_ready`: `122`
- Public listings still returned `total=0`.

Recent verification for this readiness filter pass:

- `node --check networkDB.pg.js`
- `node --check routes/networkRoutes.js`
- `node --check public/pawketPartnersOps.js`
- `npm test` passed 27/27.
- Direct DB smoke checks confirmed list and summary totals match for each readiness filter.
- `git diff --check`
- The server was restarted on `http://localhost:3001/` so the route validation is loaded.
- Browser QA on `/pawket-partners-ops.html` confirmed the readiness selector renders with all expected options, desktop and mobile horizontal overflow are `0`, and the footer gap remains `0`. Unsigned ops API requests correctly return `401 Unauthorized`.

The newest continuation pass added a manifest-driven Pawket Network source plan runner and used it to stage real Northeast launch candidates into the internal review queue. Public listings remain empty until candidates are reviewed and promoted through the existing launch-safe gate.

Launch source plan additions:

- `data/pawket-network-source-plan.json` defines the starter Northeast source plan:
  - IRS EO BMF animal nonprofit candidates for `MA, RI, CT, NH, ME, VT`.
  - OSM/Overpass pet-service candidates around Boston, Providence, Worcester, and the South Coast.
  - A disabled Overture Places job that can be enabled after a local extract is downloaded.
- `scripts/network-import-launch-plan.js` runs enabled jobs from the manifest and delegates to the existing IRS, OSM, and Overture importers.
- `npm run network:import:plan` runs the default plan. Useful options are `--dry-run`, `--job=<id>`, `--max-jobs=N`, `--plan=<path>`, and `--include-disabled`.
- `docs/PAWKET_NETWORK_SOURCE_PIPELINE.md` now documents the plan runner workflow.

Actual local candidate staging completed in this pass:

- `npm run network:import:plan` ran 5 enabled jobs with `dryRun=false`.
- IRS New England nonprofit job: `seen=6000 matched=64 imported=64 failed=0`.
- OSM Boston job: `records=84 matched=79 imported=79 failed=0`.
- OSM Providence job: `records=30 matched=29 imported=29 failed=0`.
- OSM Worcester job: `records=8 matched=7 imported=7 failed=0`.
- OSM South Coast job: `records=3 matched=3 imported=3 failed=0`.
- Direct DB summary after import returned `total=182`, `new=33`, `needs_review=149`, `with_contact=51`, `promotable=33`, sources `osm=118` and `irs_eo_bmf=64`.
- Public listings still returned `total=0`, preserving the no-fake-public-listings boundary.

Recent verification for this source plan pass:

- `node --check scripts/network-import-launch-plan.js`
- `node --check scripts/network-import-irs-eo-bmf.js`
- `node --check scripts/network-import-osm-overpass.js`
- `node -e "JSON.parse(require('fs').readFileSync('data/pawket-network-source-plan.json','utf8')); console.log('plan-json-ok')"`
- `npm run network:import:plan -- --job=irs-new-england-animal-nonprofits --dry-run` returned `seen=6000 matched=64 imported=0 failed=0 dryRun=true`.
- `npm run network:import:plan -- --job=osm-boston-metro-pet-services --dry-run` returned `records=84 matched=79 imported=0 failed=0 dryRun=true`.

The newest continuation pass added an ops-facing import candidate summary so broad Overture, IRS, OSM, licensed POI, or partner API staging runs can be reviewed by coverage and readiness instead of scanning only the first page of queue rows. It also made the Overture JSON/NDJSON reader honor early stop semantics, matching the IRS CSV reader so large source files do not keep parsing after `--limit` has been reached.

Import candidate summary additions:

- `networkDB.pg.js` now exposes `summarizeNetworkImportCandidates(filters)`, which aggregates candidate totals, average confidence, contact/location readiness, promotable basics, and top status/source/state/category breakdowns while respecting source, state, category, and search filters.
- `GET /api/network/partners-ops/import-candidates/summary` now returns that aggregate view for Network ops users.
- `/pawket-partners-ops.html` and `public/pawketPartnersOps.js` now show candidate summary chips and breakdown chips beside the source candidate queue.
- The summary intentionally defaults to all candidate statuses for the active source/state/search scope, so ops can understand the whole review backlog even while the row queue is filtered to one status.
- `scripts/network-import-shared.js` now lets JSON and NDJSON record callbacks return `false` to stop reading early, and `scripts/network-import-overture.js` uses that path for `--limit`.

Recent verification for this import candidate summary pass:

- `node --check networkDB.pg.js`
- `node --check routes/networkRoutes.js`
- `node --check public/pawketPartnersOps.js`
- `node --check scripts/network-import-overture.js`
- `node --check scripts/network-import-shared.js`
- A direct DB helper smoke check returned `{"total":0,"statuses":0,"sources":0,"states":0,"categories":0}` for `summarizeNetworkImportCandidates({})` on the current local database.
- A JSON-reader smoke check confirmed `readJsonRecords()` stops after two records when the callback returns `false`.
- `npm run network:import:irs -- --states=MA,RI --per-source-limit=20 --dry-run` returned `sources=2 seen=40 matched=1 imported=0 failed=0 dryRun=true`.
- `npm test` passed 25/25.
- `git diff --check`
- The server was restarted on `http://localhost:3001/` so the new summary route is loaded. `curl` against `/api/network/partners-ops/import-candidates/summary?status=all&limit=1` now returns `401 Unauthorized` when unsigned instead of a stale `404`.
- Browser QA on `/pawket-partners-ops.html` confirmed the candidate summary and breakdown containers render, desktop `1280x720` and mobile `390x844` have horizontal overflow `0`, and the footer gap remains `0`. Unsigned ops API requests correctly return `401 Unauthorized`.

The newest continuation pass extended the IRS EO BMF importer for batch state acquisition and made CSV limits stop reading early instead of streaming the whole source after a limit is reached.

IRS batch import additions:

- `scripts/network-import-irs-eo-bmf.js` now accepts `--states=MA,RI,CT`, `--all-states`, `--max-states=N`, and `--per-source-limit=N`.
- `--state=MA` still streams one IRS state file and implies a state filter. `--region=1 --filter-state=MA` still supports region pulls with a state filter.
- `scripts/network-import-shared.js` now lets CSV row callbacks return `false` to stop local or HTTP CSV reading early.
- `docs/PAWKET_NETWORK_SOURCE_PIPELINE.md` now documents single-state, multi-state, all-state, region, and local CSV IRS workflows.

Recent verification for this IRS batch continuation pass:

- `node --check scripts/network-import-irs-eo-bmf.js`
- `node --check scripts/network-import-shared.js`
- `npm run network:import:irs -- --states=MA,RI --per-source-limit=150 --dry-run` streamed two IRS state CSVs and returned:
  - MA: `seen=150 matched=3 imported=0 failed=0`
  - RI: `seen=150 matched=4 imported=0 failed=0`
  - Total: `sources=2 seen=300 matched=7 imported=0 failed=0 dryRun=true`
- `git diff --check`

The newest continuation pass added direct IRS EO BMF streaming so ops no longer has to hand-download every state CSV before staging nonprofit rescue/shelter candidates.

IRS source pipeline additions:

- `scripts/network-import-irs-eo-bmf.js` now accepts local CSV paths, explicit `--url=...`, direct state shortcuts such as `--state=MA`, and region shortcuts such as `--region=1 --filter-state=MA`.
- `scripts/network-import-shared.js` now supports streaming CSV parsing from HTTP responses as well as local files.
- `docs/PAWKET_NETWORK_SOURCE_PIPELINE.md` now documents direct IRS state and region commands.

Recent verification for this IRS continuation pass:

- `node --check scripts/network-import-irs-eo-bmf.js`
- `node --check scripts/network-import-shared.js`
- `npm run network:import:irs -- --state=MA --limit=250 --dry-run` streamed `https://www.irs.gov/pub/irs-soi/eo_ma.csv` and returned `seen=250 matched=4 imported=0 failed=0 dryRun=true`.
- `git diff --check`

The newest continuation pass made the source pipeline operationally usable by adding a runbook and an OpenStreetMap/Overpass importer alongside the Overture and IRS importers. The key decision remains unchanged: these sources create internal candidates, not verified public partner claims.

Pawket Network source acquisition additions:

- `docs/PAWKET_NETWORK_SOURCE_PIPELINE.md` now documents the source priority, trust rules, commands, and current references for Overture Maps Places, IRS EO BMF, OpenStreetMap/Overpass, licensed POI files, and partner APIs.
- `scripts/network-import-osm-overpass.js` stages bounded OSM/Overpass results for `amenity=veterinary`, `amenity=animal_shelter`, `amenity=animal_boarding`, `shop=pet_grooming`, and `amenity=dog_wash`.
- `npm run network:import:osm -- --bbox=west,south,east,north --state=MA --dry-run` now checks OSM source candidates without writing, and the same command without `--dry-run` stages candidates.
- The Overture importer now reads `categories.primary` in addition to older/main category fields so GeoJSON/JSON exports from current Overture Places schema are handled.
- Verified current official source docs before writing the runbook:
  - Overture Quickstart and Catalog docs show bounding-box downloads, GeoParquet/cloud access, STAC latest release lookup, and Places `theme=places/type=place`.
  - IRS EO BMF page currently lists CSV state/region files, a 04/14/2026 posting date, 1,952,238 records, and notes headquarters address caveats.
  - OSM wiki pages document animal-shelter/pet-service tags and Overpass API usage.

Recent verification for this continuation pass:

- `node --check scripts/network-import-osm-overpass.js`
- `node --check scripts/network-import-overture.js`
- `node --check scripts/network-import-irs-eo-bmf.js`
- `node --check scripts/network-import-shared.js`
- `npm run network:import:osm -- --bbox=-71.12,42.34,-71.04,42.39 --state=MA --dry-run` returned `records=12 matched=12 imported=0 failed=0 dryRun=true`.
- `git diff --check`

The newest Pawket Network pass adds a real-listing source pipeline so the directory can scale beyond handpicked state-by-state entries without inventing fake launch data or fake partner status. External records now stage as internal import candidates first, then ops can enrich, review, and promote candidates into public unclaimed Network Listings through the same launch-safe gate used by manual imports.

Pawket Network source candidate pipeline:

- `db/migrations/008_pawket_network_import_candidates.sql` adds `network_import_candidates`, candidate review status, source/source payload fields, normalized provider fields, confidence scoring fields, promotion links, and indexes for status, source, location, category, and confidence.
- `networkDB.pg.js` now exposes `prepareNetworkImportCandidate`, `upsertNetworkImportCandidate`, `listNetworkImportCandidates`, `updateNetworkImportCandidateStatus`, `promoteNetworkImportCandidate`, and `candidateDedupeKey`.
- Ops routes now expose candidate staging and promotion:
  - `GET /api/network/partners-ops/import-candidates`
  - `POST /api/network/partners-ops/import-candidates`
  - `PATCH /api/network/partners-ops/import-candidates/:id`
  - `POST /api/network/partners-ops/import-candidates/:id/promote`
- Candidate source imports can only start as `new` or `needs_review`; they cannot arrive already approved, promoted, claimed, partnered, or CHARM-enabled.
- Candidate promotion still runs through `upsertApprovedLaunchListing`, so public results remain `Network Listing` / `unclaimed` until claim review, reject fake contacts, reject partner tiers, and keep lead forms/offers/priority features off.
- `/pawket-partners-ops.html` now includes a Source candidates queue with status/source/state/search filters, candidate summary chips, contact/summary enrichment fields, save/promote actions, and a Candidate import JSON panel.
- New import scripts:
  - `npm run network:import:overture -- <places.json|places.ndjson> [--state=MA] [--limit=1000] [--dry-run]`
  - `npm run network:import:irs -- <eo-bmf.csv> [--state=MA] [--limit=1000] [--dry-run]`
- The Overture script stages pet-related Places records from JSON/NDJSON exports. The IRS script stages animal-focused nonprofit candidates from EO BMF CSV files. Both write only to the internal candidate table.

Recent verification for this Pawket Network source pipeline:

- `node --check networkDB.pg.js`
- `node --check routes/networkRoutes.js`
- `node --check public/pawketPartnersOps.js`
- `node --check scripts/network-import-overture.js`
- `node --check scripts/network-import-irs-eo-bmf.js`
- `node --check scripts/network-import-shared.js`
- `npm test` passed 24/24.
- `npm run migrate` applied through `008_pawket_network_import_candidates.sql`.
- A direct DB helper smoke check returned `{"total":0,"items":0}` for `listNetworkImportCandidates({ status: 'all', limit: 1 })` on the current local database.
- `curl -I http://localhost:3001/pawket-network.html` returned `200 OK` after the restart.
- `curl http://localhost:3001/api/network/listings?page_size=1` returned total `0`, preserving the no-fake-listings Launch Desk state.
- Browser QA on `/pawket-network.html` confirmed the Launch Desk still renders, shows four launch-path cards plus the nomination form, has horizontal overflow `0`, footer gap `0`, and browser console errors `0`.
- Browser QA on `/pawket-partners-ops.html` confirmed the new candidate queue/import UI exists, renders two ops-main grids, has horizontal overflow `0`, and footer gap `0`; unsigned ops API requests correctly return `401 Unauthorized`.
- The server is running on `http://localhost:3001/` with logs at `/tmp/petpawket-3001.log`.

The latest functionality pass turned Pawket Network from a polished directory surface into a launch-ready trust workflow. A follow-up review corrected the first over-safe version, which had made the public directory empty when no approved providers existed. The current public page now supports sparse national coverage honestly while remaining useful on day one: approved listings render with truthful status labels, empty provider searches become a search-aware Launch Desk with concrete paths, and placeholder seed listings are no longer the launch data source.

Pawket Network functionality pass:

- Public listing semantics now distinguish `Network Listing`, `Owner Claimed`, `Pawket Verified Partner`, and reviewed CHARM support without implying ordinary directory records are verified partners or endorsements.
- `/api/network/nominations` accepts provider nominations for zero-result searches while rejecting private pet, rescue, adoption, medical, and memorial story details from that form.
- Ops routes now expose nomination review and launch-safe import:
  - `GET /api/network/partners-ops/nominations`
  - `PATCH /api/network/partners-ops/nominations/:id`
  - `POST /api/network/partners-ops/import-launch-listings`
- `db/migrations/007_pawket_network_launch_readiness.sql` adds `network_nominations`, nomination status, indexes, and removes the three original fake placeholder rows if they had been imported locally.
- Launch listing imports now use `prepareApprovedLaunchListing` / `upsertApprovedLaunchListing`, require name/category/city/state/summary/contact, reject fake `example.com` or `555` contacts, reject claimed/partner/tier claims at import time, and require explicit CHARM review before public CHARM support can import.
- `scripts/network-seed.js` now reads `data/pawket-network-launch-listings.json` by default, or `PAWKET_NETWORK_LAUNCH_DATA`, and imports only launch-approved records. `public/data/pawket-network-seed.json` has been emptied so public placeholder data is not treated as launch proof.
- `/pawket-network.html` now renders a full no-results Launch Desk with search-aware paths for care visit prep, rescue/shelter onboarding, provider claims, local coverage, Pawket Pass campaigns, and community/CHARM review, plus a provider nomination form with provider/category/location/contact fields and privacy-safe note copy.
- `/pawket-partners-ops.html` now includes claim review, nomination review, launch JSON import, listing readiness chips, and the existing partner-gate controls in one Network ops workflow.
- `/partner-portal.html` now gives claimed owners a readiness strip and fuller profile fields for category, address/service area, description, and hours.

Recent verification for this Pawket Network functionality pass:

- `node --check routes/networkRoutes.js`
- `node --check networkDB.pg.js`
- `node --check public/pawketNetwork.js`
- `node --check public/pawketPartnersOps.js`
- `node --check public/partnerPortal.js`
- `node --test tests/networkRoutes.test.js` passed 20/20.
- `npm test` passed 20/20.
- `npm run migrate` applied through `007_pawket_network_launch_readiness.sql`.
- `curl http://localhost:3001/api/network/listings?page_size=6` returned `{"ok":true,"page":1,"pageSize":6,"total":0,"items":[]}` after placeholder cleanup.
- Browser QA on `http://localhost:3001/pawket-network.html` confirmed the no-results Launch Desk renders at `1280x720` and `390x844`, shows four launch-path cards plus the nomination form, page-level horizontal overflow is `0`, the footer gap remains `0`, browser console errors are `0`, and the server is running on port `3001`.
- Browser QA confirmed a `rescue` search reorders launch paths toward `Connect a rescue or shelter`, `Prepare for a care visit`, `Move public stories through review`, and `Claim or prepare a listing`.

The latest completed pass rebuilt `/pawket-network.html` from a conceptual directory shell into a launch-safe Pawket Network surface. The page now frames the Network as Pet Pawket's trust layer for shelters, rescues, vets, groomers, trainers, sitters, and pet-service partners while preserving verification, claim, CHARM, community, and private story boundaries.

Pawket Network latest pass:

- `/pawket-network.html` now has a full hero, listing-state explainer, Network workflow overview, live API-backed directory module, and ecosystem handoff section.
- The existing Network contracts remain intact: `data-network-filter`, `data-network-results`, `data-network-count`, `data-network-status`, `data-network-active-filters`, `data-network-sort-summary`, `data-network-action`, `/api/network/listings`, and listing detail links.
- Public copy now distinguishes unclaimed Network Listings, Claimed profiles, Pawket Partners, and CHARM-supporting listings without implying every listing is verified or endorsed.
- Network handoffs now connect to Pawket Passes, Community, Account Story Trail, and CHARM while reinforcing that private journals and sensitive rescue, adoption, medical, and memorial stories remain private or review-led.
- A follow-up layout pass moved the Network page's first-viewport focus back to search: the primary search bar now sits at the top of the live finder, with badge guidance, launch notes, privacy rules, filters, and results attached around it instead of placing all explanation before the search. A later tightening pass removed the extra `Live Directory` header/text between the primary search box and the filters/results so the finder reads as one continuous module.
- `public/pawketNetwork.js` no longer renders a fake `0.0 mi` distance when the API returns `distance_mi: null`; distance appears only when a real numeric value is available.
- `public/pawketNetwork.js` now binds all `[data-network-action="search"]` buttons so the promoted primary search button and the detailed filter button both trigger the existing listing reload path.
- `public/css/pawket-network.css` now removes the shared footer container margin for `.pp-network + #footer-container`, eliminating the gap between the final Network band and footer on the listing and detail page family.
- A Network-specific desktop dock gutter was added above the Pawket Dock breakpoint so side-dock mode clears hero and directory content at desktop widths.

Recent verification for this Pawket Network pass:

- `node --check public/pawketNetwork.js`
- `node --check public/main.js`
- `node --check routes/networkRoutes.js`
- `git diff --check -- public/pawket-network.html public/css/pawket-network.css public/pawketNetwork.js`
- `npm test` passed 14/14.
- `curl -I http://localhost:3001/pawket-network.html` returned `200 OK`.
- `curl http://localhost:3001/api/network/listings?page_size=6` returned 3 listings.
- `curl http://localhost:3001/api/network/listings?supports_charm=1&page_size=6` returned 2 CHARM-supporting listings.
- Browser QA on `http://localhost:3001/pawket-network.html` confirmed at `1920x1010`, `1280x720`, `1084x900`, and `390x844` that the footer gap is `0`, page-level horizontal overflow is `0`, the live directory renders 3 cards, distance text is omitted when `distance_mi` is null, and the Pawket Dock does not overlap the hero or directory panels in side-dock or bottom-dock layouts.
- Browser QA confirmed checking `Supports CHARM` and applying filters updates the results to Pawsome Grooming and Harbor Haven Shelter, renders the active filter chip, and keeps browser console errors at `0`.
- Browser QA after the entry-layout adjustment confirmed the promoted search input and primary Search button are visible on entry at `1920x1010`, `1280x720`, `1084x900`, and `390x844`, remain clear of the Pawket Dock, have no intervening header/text separating them from the finder controls, and searching `shelter` filters the live API results to Harbor Haven Shelter with the active search chip rendered.

The latest completed pass rebuilt `/community.html` from a placeholder into a consent-safe Town Square and community hub. It now connects Pawprints, Story Trail, Pawket Passes, CHARM impact, Pawket Network, Pawket Pals, Share Studio, and local saved community steps without implying that private journals or real pet stories are public by default.

Community latest pass:

- The old AI-generated mascot SVG image placeholders were removed from `public/community.html`; the community main content no longer uses `<img>` tags for Pawket Pal placeholder art.
- The hero now frames community as the public Town Square lane for Pawprints, Pawket Passes, CHARM-safe updates, partner highlights, and later Pawket Pal moments.
- The page now uses structured icon-based product placeholders for Pawprint slots, pass activity, CHARM updates, approved Pal-ready stories, Share Studio cards, and impact updates instead of fake sample mascots.
- Story guardrails are visible on the page: private journals are not community posts, public rescue/adoption/medical/memorial stories need review, and Pawket Pal concepts wait for approved story rights.
- The community board now links to live handoffs: Account Story Trail, Pawket Passes, Pawket Network, CHARM, and the Town Square section on the home page.
- The community moments section keeps the existing `storyHub.js` quest contracts active through `data-quest-toggle` and `data-quest-map="community"` so local saved steps can still connect to Pawprints, Pawket Pals, CHARM, and Share Studio later.
- A page-specific side-dock gutter was added above the dock breakpoint so `/community.html` keeps clearance from the Pawket Dock when the side dock returns at desktop widths.
- The community polish pass tightened the first-viewport hierarchy, added a publishing-rule trust row, added a draft/review/public-lane status strip to the Town Square preview, upgraded board headers with icons, added tag chips to the reserved story/Share Studio slots, and compacted the preview at bottom-dock laptop widths so it clears the Pawket Dock.
- The community footer handoff now removes the shared footer container margin on `/community.html` so the final community band meets the footer without a patterned-background gap.

Recent verification for this community page pass:

- `node --check public/main.js`
- `node --check public/storyHub.js`
- `git diff --check -- public/community.html public/css/community.css`
- `npm test` passed 14/14.
- `curl -I http://localhost:3001/community.html` returned `200 OK`.
- `curl http://localhost:3001/api/loop/health` returned `{"ok":true}`.
- Browser QA on `http://localhost:3001/community.html` confirmed at `1280px`, `1084px`, and `390px` that the community main content has `0` images, no old mascot image sources, no old `Sky Pal`/`Sunny Pal`/`Coral Pal` copy, no horizontal overflow, three structured placeholder rows, three trust chips, three status chips, six reserved-slot tags, and three rendered community quest cards.
- Browser QA confirmed the Pawket Dock does not overlap the community heading, hero actions, or preview at desktop side-dock width or bottom-dock laptop and phone widths.
- Browser QA confirmed a community quest button still advances from `Start` to `Continue` through the existing `storyHub.js` event path.
- Browser console errors stayed at `0`.

The latest completed pass expanded the Pawket Passes page and supporting copy. A follow-up continuity review clarified that `/loop.html` is not just a polish surface: it is the public Pawket Pass hub and claim path that connects commerce, account history, Story Trail/Core Memory context, CHARM impact, and future Pawket Pals/quest signals while preserving private pet-story boundaries.

Pawket Pass latest pass:

- `/loop.html` now includes a real pass link/code entry on the hub. It accepts raw pass codes or pasted URLs containing `token` or `code` and routes to `/loop.html?token=...`.
- The hub shows saved-pass resume and clear controls when `pp_loop_token` is present. Clearing removes localStorage/cookie state and removes stale saved-pass UI from the page.
- The hub and claim page now share a clearer connector grid for Shop, Account, CHARM, and future Pawket Pals/quests.
- The hub and claim page now include an explicit continuity path linking cart checkout, Account Story Trail, Pawket Pals, and CHARM Foundation review so Pawket Passes are framed as the public share path between systems, not as a replacement for profiles, journals, Core Memories, or story consent.
- The claim page now explains browser-local saving, cart-checkout carryover, and private journal boundaries through explicit assurance chips.
- Public CHARM impact slots show a consent-safe waiting state when there are no approved public stories.
- The community pulse filters out one-person/test chains and zero-share rows so test data like `QA Loop` is not displayed as meaningful public social proof.
- Public copy avoids public technical terms such as `Shopify` and `canonical` on the Pawket Pass page while keeping the actual technical contracts intact.
- `public/pals.html` copy was tightened so story-to-Pal language no longer implies automatic public Pal creation from rescue, adoption, medical, or memorial stories. It now preserves private, approved, and public paths based on consent.
- The polish pass widened the hub pass-code tool when no saved pass is present, shortened the claim pass card so it no longer stretches into empty space, added clearer focus states, and increased the main Pawket Pass surface opacity for better readability over the patterned site background.
- `docs/PET_PAWKET_CURRENT_STATE.md` was updated for continuity after this pass.

Recent verification for this Pawket Pass page pass:

- `node --check public/loop.js`
- `node --check public/loopTracker.js`
- `node --check public/loopModal.js`
- `node --check public/hero.js`
- `node --check routes/loopRoutes.js`
- `git diff --check -- public/loop.js public/css/loop.css docs/PET_PAWKET_CURRENT_STATE.md`
- `git diff --check -- public/loop.js public/css/loop.css public/pals.html docs/PET_PAWKET_CURRENT_STATE.md`
- `npm test` passed 14/14.
- `curl http://localhost:3001/api/loop/health` returned `{"ok":true}`.
- `curl -I http://localhost:3001/loop.html` returned `200 OK`.
- Browser QA on `http://localhost:3001/loop.html` confirmed hub, pass-code entry, claim page, saved-pass clear behavior, connector grid, consent-safe CHARM empty state, filtered community pulse, mobile width at `390px`, and no page-level horizontal overflow.
- Browser QA on `http://localhost:3001/loop.html` and local claim URL `http://localhost:3001/loop.html?token=VPGZPN2K8XS2HG` confirmed the new continuity path renders on both hub and claim states, links to cart/account/Pals/CHARM, and keeps console errors at `0`.
- Browser QA after the polish pass confirmed the hub pass-code entry no longer clips its placeholder, submitting `VPGZPN2K8XS2HG` still routes to the claim URL, the claim card no longer has a large empty stretched panel, mobile width at `390px` has no horizontal overflow, and console errors remained at `0`.
- Browser QA after the dock responsive pass confirmed `/loop.html` uses bottom dock mode at `1024px`, `1084px`, and `1220px`, returns to side dock mode at `1241px` and `1280px`, and has no Pawket Dock overlap with primary loop actions in side mode. A forced stale `data-mobile-dock="0"` check at `1084px` still rendered the dock as a compact bottom bar. `/shop.html`, `/packs.html`, `/charm.html`, and `/account.html` were sampled at `1024px`; each used bottom dock mode with no horizontal overflow and browser console errors stayed at `0`.
- Browser QA after the bottom-dock motion fix confirmed at `1084px` and `390px` that dock buttons have `animation: none`, the button top position stays fixed across animation frames, the icon wrapper keeps the up/down `ppDockIconBob` motion inside the button, no horizontal overflow appears, and console errors stayed at `0`.

## Prior Recent Work

Earlier polish work rebuilt the global widget bar into a clearer launch surface called the Pawket Dock.

Pawket Dock state:

- The public dock model is now organized around fixed ecosystem shortcuts plus pinned apps: a combined Care + Impact shortcut, a scrollable dock app strip, and Apps.
- Shop is no longer a fixed dock lane because it is already covered by the navbar, homepage, product surfaces, and footer. Shop, Packs, Packets, and Picks remain reachable from the Apps shelf/overflow utilities.
- The dock keeps existing widget/app internals available as actual pinned dock apps instead of hiding every experimental widget behind Apps.
- Desktop renders as a compact side toolbar with visible short labels, `role="toolbar"`, an accessible label, and arrow-key roving focus.
- Mobile renders as a horizontally scrollable bottom dock with visible labels instead of continuously expanding or using the previous carousel.
- The current widget app bodies are Pet Workspace, Pawket Shop, Pawket Pals, and Stories. Pawket Shop owns the tray-level Packs/Packets/Picks plus Pawket Passes experience while preserving `/packs.html`, `/packets.html`, `/picks.html`, `/loop.html`, `/api/loop/*`, and `pp_loop_token` contracts. App access, connected providers, partner-access status, and Dock settings live inside the fixed Apps shelf panel rather than a separate App Manager app. The former Care Rhythm, Favorite Memory, and Packs + Picks public app surfaces now route into Pet Workspace or Pawket Shop while keeping only the internal `reminders`, `traits`, `subs`, and `pp-widget-reminders` compatibility paths needed for stale-state/local quick-check compatibility.
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
- App Shelf settings now expose only current Dock controls: desktop side, desktop app size, connected-provider shortcuts, desktop collapsed state, reset pinned apps, and reset dock layout. The old duplicate Customize Dock panel no longer renders; stale customize entry points redirect to Apps. Deprecated label-mode and dock-badge settings are ignored/cleared from old browser state and are no longer shown as user controls.
- Desktop pinned apps live in a bounded vertical scroll strip. Mobile pinned apps live in the horizontal dock scroll strip. The dock no longer keeps growing as more apps are pinned.
- The separate fixed Pawket Pals shortcut was removed. Pawket Pals now behaves as a dock app, with preview, profile, Community, Town Square, mood, and random Pal preview controls folded into the Pals app window.
- Care journals and Impact are now grouped under the same fixed Care + Impact shortcut. Its panel links account journals/Core Memories with CHARM Story Lane and Pawket Pass handoffs.
- The desktop pinned app strip now shows about three and a half apps before scrolling, includes a subtle centered bottom scroll cue when more apps are available, and dock app buttons have restored per-app color accents instead of a single muted treatment.
- The pinned-app scroll cue is hidden in collapsed desktop mode because the collapsed icon rail does not show enough app-list context for that indicator to be clear.
- Mobile dock ordering keeps Apps next to the fixed Care + Impact shortcut, then shows pinned apps in the horizontal scroll track so the app shelf is not buried after the app list.
- Selecting a pinned dock app now preserves the pinned-app scroll position instead of re-rendering back to the top of the list. The Apps tab also has a little extra separation from the pinned-app section.
- Dock and navbar icon buttons now explicitly grid-center Bootstrap icon glyphs and apply a small optical nudge for heart-shaped icons so Care and Wishlist no longer sit off-center.
- Desktop Pawket Dock vertical positioning has been standardized from the homepage baseline across normal site pages. Pages without the homepage hero now use the same lower desktop dock baseline instead of falling back near the top of the post-nav viewport, and the shop-only vertical offset override was removed.
- Pawket Dock now treats tablet and small-laptop widths up to `1240px` as the bottom dock layout so the side dock does not cover primary page actions. The side dock resumes above that breakpoint, where desktop pages have enough horizontal clearance. A CSS fallback also forces the compact bottom bar at those widths if stale JS state briefly reports side mode. Bottom dock motion is constrained to an internal icon bob that rises, returns, dips, and returns while the full button stays fixed so it cannot clip against the dock container.
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
- App-window QA before the Shop merge: Pet Workspace, Pawket Passes, Stories, Pawket Pals, Packs/Picks, and App Manager opened through the dock/app shelf with dialog labels, in-viewport geometry, no old Loop Token public copy inside the Pass app, and no console errors. The former Care Rhythm and Favorite Memory apps are intentionally not listed as public current apps.
- Apps shelf QA before the Shop merge: desktop and mobile show `Apps` as the fixed shelf item, the app shelf is discoverable before utilities, opening Pawket Passes from Apps leaves only Apps selected, and close controls do not overlap panel text.
- Pin/remove/reorder QA: Apps shelf shows pinned and unpinned states, opening or pinning an app adds it to the dock, removing an app takes it off the dock, move controls update persisted `pp-widget-band` order, desktop app strip scrolls when many apps are pinned, and Shop remains overflow-only.
- Care integration QA: signed-out desktop and mobile Care panels show safe sign-in states, local quick checks, journal/Core Memory/CHARM/Pawket Pal handoff copy, no horizontal overflow appears at `390px`, and no browser console errors were detected.
- Merged Care QA: stale browser state with `reminders` or `traits` pinned/open migrates into Pet Workspace, the old Care Rhythm and Favorite Memory apps are not shown as current Apps, Pet Workspace owns quick checks plus memory prompts, and local quick-check state still uses `pp-widget-reminders` for compatibility.

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
- Browser QA for merged Care dock surface on `http://localhost:3001/`: the old `reminders`/Care Rhythm app is removed from visible dock apps and Apps shelf, stale `reminders` pinned/open localStorage migrates safely, quick-check checkbox state updates `pp-widget-reminders`, and desktop/mobile console errors remained at `0`. The follow-up app consolidation check verified stale `traits` state, Dock settings/order rows, App Manager, and standalone `?app=reminders`/`?app=traits` routes resolve to Pet Workspace instead of old app surfaces. The final `http://localhost:3011/` browser check verified stale open `reminders`/`traits` app windows close, Pet Workspace opens in their place, normal registry app lists exclude legacy aliases by default, App Manager omits the aliases, and old `reminders`/`traits` visual theme hooks are removed.
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


## Latest Home Care Section Polish

The 2026-06-07 home-section pass finalized the first post-hero `#pp-expansion` section as a customer-facing care and keepsakes entry point:

- `public/index.html` now leads the section with `Start with the pet you love.` instead of the older abstract care/keepsake/share headline.
- The section now uses a care-desk visual with a pet profile, favorite memory, private Pal, and Pawket Pass sharing cue, using existing Pet Pawket art and Bootstrap icons.
- The action cards now frame profiles, memories, Pawket Passes, and nearby care as practical next steps. Trust should be carried by product structure and a few intentional copy points, not repeated privacy-promises throughout the section.
- `public/css/core.css` now owns the section-specific desktop and mobile layout for `pp-care-*` classes, including a compact mobile presentation so the section remains readable without horizontal overflow.
- `public/petSurfacePersonalization.js` now personalizes marked surfaces from the signed-in account's pet profiles. The first marked surface receives the first account pet. With one pet, every marked surface uses that pet. With two or more pets, surfaces rotate through each pet plus one generic slot, so a two-pet account rotates pet one, pet two, generic, and then repeats. When a marked surface includes `data-pet-personalize-image`, the selected pet's avatar follows the same rotation and falls back to the default pet image when no avatar is uploaded.
- `public/index.html` marks the care profile, favorite memory, private Pal, compact Pawket Pass cue, and gift card with `data-pet-personalize` hooks. Future sections can join the same rotation by using the same data attributes rather than adding a separate pet fetch.

Verification for this pass on port `3011`:

- `git diff --check -- public/index.html public/css/core.css` passed.
- `npm run lint:css` passed.
- `/health` returned 200 OK.
- Playwright checked `/` at desktop `1440x900` and mobile `390x844`; the redesigned section had no page-level horizontal overflow, no measured child overflow, loaded `/assets/images/default-pet.png`, and produced no console errors.

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

1. Expand account empty states, error states, and mobile density now that Story Trail data is flowing.
2. Recheck progress/quest updates after each new account-surface change.
3. Keep a light Add/Edit modal browser recheck in the QA path for dog, cat, bird, rabbit, reptile, fish, horse, ferret, and other.
4. Review `/api/cart/create` and Shopify handoff only after account polish stops moving.
5. Keep Pawket Network lead forms testable but keep verification/trust controls conservative.

## Cautions For Future Sessions

- Do not rename established IDs, routes, data attributes, or selectors casually.
- Preserve `#navbar-container`, `#footer-container`, `#addPetForm`, `#editPetModal`, `#addPetModal`, and pet/account selector contracts.
- Treat DOM structure as behavior-bearing.
- Do not flatten Pet Pawket into a generic ecommerce template.
- Preserve Charm as the protected memorial/origin figure, never as a generic demo/default/seed pet name.
- Never make Charm's private one-of-one Pawket Pal a public collectible.
