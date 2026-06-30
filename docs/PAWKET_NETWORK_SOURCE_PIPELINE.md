# Pawket Network Source Pipeline

Last updated: 2026-05-05

This runbook covers how Pet Pawket can build real Pawket Network coverage without handpicking every provider in every state and without pretending source data is verification.

## Current Local Launch Coverage Snapshot

As of the latest local launch-prep pass on 2026-05-05, the Pawket Network database contains `25,087` public Network Listings built from staged source candidates after the source-quality audit:

- `MA=1,400`, including `8` exact public listings in Spencer, MA.
- Spencer, MA has `198` public listings inside `25 mi`; Princeton, MA has `194`; North Adams, MA has `52`.
- All 50 states have at least `438` public listings.
- `48` states have at least `450`, `34` states have at least `475`, and `4` states have at least `500`.
- `HI=449` and `ND=438` are the current lowest states after false-positive cleanup. Refill them only through audited source promotion.
- `DC=147`; invalid and ambiguous district rows were removed from public view or held for ops review.
- The prior `26,057` / `475+` snapshot was lowered intentionally because false-positive rows such as Peterbilt, CAT Scale, hot dog restaurants, parks, bars, and other non-pet providers were removed from the public directory.
- Eugene, OR now has `108` public listings inside `25 mi` after the bounded local Overture import, local coverage promotion, and later Oregon state-floor promotions.
- Fargo, ND now has `121` public listings inside `50 mi` even though the statewide North Dakota count remains under the `500` target.
- All public source-promoted rows remain `status=unclaimed`, with no Pawket Partner tier and CHARM support off.
- The dedicated `cleaner` category currently contains `44` public pet cleanup listings and `227` source candidates after reclassifying pet waste, litter-box, aquarium-cleaning, and fish-tank-cleaning providers out of `Other`.
- `npm run network:audit:listings` currently returns `rejectable=0`, `reclassifiable=0`, and `reviewable=0` against public listings.
- Public same-state/same-city duplicate names and normalized phone groups are currently `0`.
- Website-host groups are currently `20`; review these manually instead of deleting them automatically because shared hosts can represent legitimate chains, franchise pages, or service lines.

The final audit command for this target was:

```bash
npm run network:coverage:audit -- \
  --include-dc \
  --baseline=475 \
  --targets=MA:1400,DC:175 \
  --gaps-only
```

`scripts/network-coverage-audit.js` reports duplicate public name, normalized-phone, and website-host groups in its summary line. After the source-quality audit, the `475` command intentionally reports gaps in `17` states because suspect public rows were removed. Before calling a coverage pass done, duplicate public names and normalized public phone groups should be `0`, and `npm run network:audit:listings` should return no public rejects, reclassifications, or review holds. Source imports can produce alternate records for the same provider, especially when Overture has multiple brand or department rows at one address. Duplicate public rows should be removed from launch visibility, their source candidates should be held out of automatic promotion for manual review, and the affected state should be topped back up with a different candidate only after source audit. Website-host groups can include legitimate multi-location chains or service lines, so they should be reviewed instead of deleted automatically.

## Source Priority

1. Overture Maps Places
   - Best default national POI source for vets, groomers, shelters, boarding, daycare, and other pet-service businesses.
   - Use it to stage broad coverage by area of interest, then promote clean candidates as unclaimed Network Listings.
   - Overture publishes cloud-hosted GeoParquet and a Python client that can download by bounding box.
   - Pet Pawket now has a direct bbox importer, so Overture does not require a manual extract before candidate staging.
   - Dog parks, parks, trails, beaches, and pet-friendly public places should not be promoted as provider listings. Preserve them for a separate pet-safe reference-location lane when that tool is built.

2. IRS EO BMF
   - Best nonprofit source for animal rescues, shelters, humane societies, and animal-focused charities.
   - It is cumulative IRS data, divided by state and region, and headquartered address may not equal operating service area.
   - Use it to stage nonprofit rescue/shelter candidates, then enrich contact info before promotion when needed.

3. OpenStreetMap / Overpass
   - Good supplemental source for local vets, animal shelters, boarding, grooming, and dog wash records in a bounded region.
   - Use it to fill local gaps, but respect OSM licensing/attribution obligations and Overpass rate limits.
   - Pet Pawket's importer also stages `shop=pet`, `shop=pet_supplies`, and explicitly pet-related name matches so providers with incomplete OSM category tags can be reviewed without pretending they are verified partners.
   - Pet waste removal, dog waste cleanup, litter-box cleaning, aquarium cleaning, and fish-tank cleaning should classify as `cleaner`, not `other`.
   - OSM pet-safe place tags such as dog parks, off-leash areas, pet-friendly trails, and relief areas belong in a future reference-location tool, not the provider directory.

4. US Census Gazetteer
   - Best source for radius-search place autocomplete, not provider listings.
   - Use place, county-subdivision, and ZCTA centroids so towns and ZIPs can be suggested before a public provider exists there.
   - This should populate `network_place_index`; it must not create provider records, partner status, CHARM support, or claims.

5. Licensed POI vendors or direct partner APIs
   - Best when Pet Pawket needs stronger contact completeness, phone normalization, freshness, or commercial support.
   - Stage records as candidates first. Do not skip Pawket claim, partner, or CHARM gates.

## Non-Negotiable Trust Rules

- Source records are not Pawket Verified Partners.
- Public promotion creates an unclaimed `Network Listing`, not a claimed listing and not a partner listing.
- Lead forms, offers, priority rank, and featured slots stay off until ops review.
- CHARM support stays off unless reviewed through the CHARM-safe path.
- Do not import Google Places into the durable directory unless legal review explicitly approves storage/caching terms.
- Do not paste rescue, adoption, medical, memorial, or private pet stories into listing source notes.
- Do not use Pawket Network provider listings for pet parks, dog parks, trails, beaches, relief areas, or other pet-safe places. Those are reference locations and need their own source/review model.

## Future Pet-Safe Places Lane

The source-quality audit removed public dog parks and parks from Pawket Network because they are not service providers. That should not be treated as rejecting the underlying idea. Pet-safe places are a separate useful launch-adjacent tool.

A future pet-safe reference table should track location name, source, source record id, coordinates, address or area, place kind, leash/off-leash state, fenced state, water/accessibility notes, rules URL, hours/seasonality, source freshness, and review state. These records should not have provider claim status, lead forms, Pawket Partner tiers, or CHARM flags by default.

Good seed sources for that lane include OSM dog park and leisure tags, Overture Places public-place categories, municipal park datasets, state park/trail datasets, licensed POI files, and manual community nominations with moderation.

Public UX should cross-reference the lanes: Pawket Network should point pet-safe-location searches to Pawket Places, and Pawket Places should point care-provider searches back to Pawket Network.

### How To Continue Pawket Places Later

When returning to this work, continue from the existing placeholder surface at `public/pawket-places.html`. Keep it source-honest until real place records exist.

Recommended implementation order:

1. Add a dedicated migration for a pet-safe place reference table. Do not use `network_listings`, and do not overload `network_place_index`.
2. Include fields for `source`, `source_record_id`, `source_url`, `source_payload`, `name`, `place_kind`, `address_line1`, `city`, `state`, `postal_code`, `latitude`, `longitude`, `rules_url`, `hours_text`, `leash_policy`, `fenced_state`, `water_access`, `accessibility_notes`, `safety_notes`, `review_status`, `review_notes`, `created_at`, and `updated_at`.
3. Add importers that stage OSM and Overture pet-safe places separately from provider candidates. Good first filters are dog parks, off-leash areas, pet-friendly parks/trails/beaches, travel relief areas, and municipal park datasets with pet rules.
4. Add an audit script before publishing any place records. It should reject generic parks without pet-safety signals unless the source has explicit dog/pet-friendly metadata or manual review.
5. Add `/api/places` routes for search, radius, place-kind filters, and review-state-safe public results.
6. Replace the disabled search preview on `/pawket-places.html` with the real API-backed search UI.
7. Keep cross-links in both directions after implementation: Pawket Places to Pawket Network for providers, and Pawket Network to Pawket Places for pet-safe locations.
8. Run browser QA at desktop and mobile widths for `/pawket-places.html` and `/pawket-network.html`, checking reciprocal links, no horizontal overflow, and no Pawket Dock overlap.

Do not import Google Places into this durable place lane unless legal review explicitly approves storage and caching terms. Do not add user-submitted private pet stories, rescue stories, medical stories, or memorial stories to place records.

## Launch Plan Runner

Use the manifest runner when ops wants repeatable coverage staging across a defined launch area instead of manually running every source command.

Default dry run:

```bash
npm run network:import:plan -- --dry-run
```

Stage the enabled jobs after the dry run looks reasonable:

```bash
npm run network:import:plan
```

Run one job from the default plan:

```bash
npm run network:import:plan -- --job=irs-new-england-animal-nonprofits --dry-run
```

Run only the first two enabled jobs:

```bash
npm run network:import:plan -- --max-jobs=2 --dry-run
```

Run a different manifest:

```bash
npm run network:import:plan -- --plan=data/my-market-source-plan.json --dry-run
```

The default manifest is `data/pawket-network-source-plan.json`. It currently stages internal candidates for New England IRS nonprofit records and OSM pet-service coverage around Boston, Providence, Worcester, and the South Coast. It also includes a disabled Overture bbox job that can be run after the local Overture CLI is available.

For broader launch coverage, use `data/pawket-network-national-osm-plan.json`. It stages bounded OSM metro jobs for every US state plus DC, with extra Massachusetts/New England/New York coverage and sparse-state top-up jobs.

```bash
npm run network:import:plan -- --plan=data/pawket-network-national-osm-plan.json --dry-run --delay-ms=1500 --continue-on-error
npm run network:import:plan -- --plan=data/pawket-network-national-osm-plan.json --delay-ms=1500 --continue-on-error
```

Useful broad-plan controls:

- `--start-at=<job-id>` resumes a plan from a specific job after rate limits or endpoint timeouts.
- `--delay-ms=1500` or higher spaces requests to public Overpass endpoints.
- `--continue-on-error` records failed jobs and keeps the plan moving.
- `OVERPASS_ENDPOINT=https://overpass.kumi.systems/api/interpreter` can temporarily switch endpoints if the default public Overpass endpoint rate-limits.
- `--replace-type=osm:overture_bbox` reuses an OSM bbox manifest against Overture Places instead of Overpass.

Example Overture reuse of the national bbox plan:

```bash
OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps \
  npm run network:import:plan -- \
  --plan=data/pawket-network-national-osm-plan.json \
  --replace-type=osm:overture_bbox \
  --dry-run \
  --max-jobs=1
```

## Overture Workflow

Use Overture's own tooling through Pet Pawket's bbox wrapper to download a Places extract by bounding box and immediately stage matching pet-service records as source candidates.

One-time local tool install for development:

```bash
python3 -m venv .cache/overture-venv
.cache/overture-venv/bin/python -m pip install overturemaps
```

Direct bounded dry run:

```bash
OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps \
  npm run network:import:overture:bbox -- \
  --bbox=-71.12,42.34,-71.04,42.39 \
  --state=MA \
  --limit=100 \
  --dry-run
```

Direct bounded staging run:

```bash
OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps \
  npm run network:import:overture:bbox -- \
  --bbox=-71.25,42.20,-70.85,42.55 \
  --state=MA \
  --keep-file
```

The bbox wrapper defaults to Overture's `geojsonseq` output so large extracts can be read line by line by the existing importer. `--keep-file` stores the downloaded source under `data/sources/`, which is intentionally gitignored.

Manual file import is still supported when ops already has an Overture GeoJSON, GeoJSON sequence, JSON, or NDJSON extract.

Example source download:

```bash
pip install overturemaps
overturemaps download \
  --bbox=-71.25,42.20,-70.85,42.55 \
  -f geojson \
  --type=place \
  -o data/sources/overture-boston-places.geojson
```

Stage candidates:

```bash
npm run network:import:overture -- data/sources/overture-boston-places.geojson --state=MA --dry-run
npm run network:import:overture -- data/sources/overture-boston-places.geojson --state=MA
```

The importer filters pet-related category/name signals and stages records as `overture` candidates.
For large JSON, NDJSON, or GeoJSON sequence extracts, `--limit=N` stops reading after the limit is reached instead of parsing the remaining file. The bbox wrapper still downloads the requested bbox before the import limit is applied.

## Census Gazetteer Place Autocomplete

Use the Census Gazetteer importer to refresh the local radius-search place index. This is for town/city/ZIP-style autocomplete only; it does not stage or publish provider listings.

Default full refresh:

```bash
npm run network:places:import
```

Dry run a small state sample:

```bash
npm run network:places:import -- --states=MA,NH --limit=100 --dry-run
```

Refresh downloaded Census ZIPs:

```bash
npm run network:places:import -- --refresh
```

The importer currently reads the Census 2025 national place, county-subdivision, and ZCTA Gazetteer ZIPs, strips common legal suffixes for display names, keeps coordinates as radius centers, and stores rows in `network_place_index`. County subdivisions are filtered to town/city/village/borough/municipality/township-style rows so New England towns such as Princeton, MA are available even when they are not Census `place` rows. ZCTA rows are stored as ZIP radius centers for autocomplete and nearby search; they are not provider records.

## IRS EO BMF Workflow

Download state or region CSVs from the IRS EO BMF page, or let the importer stream the IRS CSV directly. Region files are better for broad launch staging; state files are easier to review.

Stage candidates directly from the IRS state CSV endpoint:

```bash
npm run network:import:irs -- --state=MA --limit=1000 --dry-run
npm run network:import:irs -- --state=MA
```

Stage multiple state files in one run:

```bash
npm run network:import:irs -- --states=MA,RI,CT --per-source-limit=500 --dry-run
npm run network:import:irs -- --states=MA,RI,CT
```

Stage all state files when ops is ready for a broad nonprofit candidate pass:

```bash
npm run network:import:irs -- --all-states --per-source-limit=1000 --dry-run
npm run network:import:irs -- --all-states
```

Stage candidates from an IRS region file:

```bash
npm run network:import:irs -- --region=1 --filter-state=MA --dry-run
npm run network:import:irs -- --region=1 --filter-state=MA
```

Stage candidates from a downloaded local CSV:

```bash
npm run network:import:irs -- data/sources/eo_ma.csv --state=MA --dry-run
npm run network:import:irs -- data/sources/eo_ma.csv --state=MA
```

The importer filters animal-focused names, NTEE/activity signals, shelters, rescues, humane societies, SPCA records, and veterinary nonprofits.

## OpenStreetMap / Overpass Workflow

Use this for bounded regional gap-filling, not national bulk pulls from public Overpass servers.

Example Boston-area dry run:

```bash
npm run network:import:osm -- --bbox=-71.25,42.20,-70.85,42.55 --state=MA --dry-run
npm run network:import:osm -- --bbox=-71.25,42.20,-70.85,42.55 --state=MA
npm run network:import:osm -- --bbox=-71.25,42.20,-70.85,42.55 --state=MA --fallback-city=Boston --dry-run
```

The importer currently stages these OSM tags:

- `amenity=veterinary`
- `amenity=animal_shelter`
- `amenity=animal_boarding`
- `shop=pet_grooming`
- `shop=pet`
- `shop=pet_supplies`
- `amenity=dog_wash`
- `amenity=animal_training`
- Pet-related `name` matches for records such as veterinary offices, animal hospitals, grooming shops, kennels, dog daycare/boarding/training businesses, humane societies, SPCA listings, and pet cleanup providers when the explicit category tag is missing.

Use `--fallback-city=<city>` only for tight metro boxes where the source record is inside that metro but OSM omitted the city tag. It should not be used for broad statewide boxes because it can make suburbs or neighboring cities look more precise than the source data supports.

Each OSM import summary includes:

- `contactReady`: rows with a phone or HTTPS website, matching the public launch gate.
- `locationReady`: rows with city and state.
- `promotableBasics`: rows with launch contact, launch location, and a non-`other` category.

## Ops Promotion Workflow

1. Open `/pawket-partners-ops.html` as a Network ops user.
2. Use Source candidates filters for status, source, state, and search.
3. Use the readiness filter to isolate `Promotable basics`, `Needs contact`, `Needs location`, `Contact ready`, or `Location ready` records.
4. Check the candidate summary chips for backlog totals, source/state/category mix, contact readiness, and promotable basics.
5. Enrich missing phone, website, or public summary when needed.
6. Use Select visible and Apply to selected for internal bulk status review when a filtered batch is clearly ready to mark `approved`, `needs_review`, or `rejected`.
7. Save per-candidate review notes when a record needs individual context.
8. Promote only candidates that should become public unclaimed Network Listings. Promotion must keep owner claim, Pawket Partner status, lead routing, offers, priority placement, featured placement, and CHARM support off until their separate review gates are completed.
9. Owner claim, Pawket Partner status, lead routing, offers, and CHARM all remain separate review gates.

For a launch-safe state coverage pass from staged candidates:

```bash
npm run network:promote:candidates -- --dry-run --include-dc --baseline=5
npm run network:promote:candidates -- --include-dc --baseline=5
```

The promotion helper keeps the same launch gate as manual promotion: public listings must have name, category, city, state, summary, and phone or HTTPS website; placeholder contacts are rejected; listings remain unclaimed, unpartnered, and CHARM-off. The helper counts distinct public listing IDs so duplicate source candidates do not overstate state coverage.

`--baseline` is now treated as a true floor in both `network:promote:candidates` and `network:coverage:audit`. The built-in Northeast deep-target defaults can raise older low baselines, but they no longer lower a requested national baseline.

For a local town/radius coverage pass from staged candidates:

```bash
npm run network:promote:local -- \
  --state=MA \
  --min-exact=2 \
  --min-radius=12 \
  --radius-mi=25 \
  --per-place=4 \
  --max-promotions=350 \
  --dry-run \
  --summary-only

npm run network:promote:local -- \
  --state=MA \
  --min-exact=2 \
  --min-radius=12 \
  --radius-mi=25 \
  --per-place=4 \
  --max-promotions=350 \
  --summary-only
```

The local coverage helper reads `network_place_index` town/place centers, current public listings, and ready source candidates. It prioritizes places where exact town count or radius count is weak, promotes exact-town candidates first, then nearby candidates inside the selected radius, and applies the same duplicate and trust rules as the state target helper. Use this after statewide count targets are met but individual towns still feel empty or under-served. `--summary-only` is useful for large state-by-state runs because it keeps the trust and duplicate summaries without printing every touched place.

Recent national local expansion example:

```bash
for state in AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY; do
  npm run network:promote:local -- \
    --state=$state \
    --min-exact=2 \
    --min-radius=12 \
    --radius-mi=25 \
    --per-place=4 \
    --max-promotions=250 \
    --summary-only
done

npm run network:promote:candidates -- \
  --include-dc \
  --baseline=125 \
  --targets=MA:1400,RI:125,CT:125,NH:125,ME:125,VT:125,NY:125 \
  --candidate-limit=5000
```

When a state cannot reach the baseline from staged candidates, import a bounded Overture source first. The Washington completion pass used:

```bash
OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps \
  npm run network:import:overture:bbox -- \
  --bbox=-122.50,47.45,-122.15,47.75 \
  --state=WA

npm run network:promote:candidates -- --states=WA --targets=WA:125 --candidate-limit=5000
```

Recent national target-fill examples from the 2026-05-05 expansion:

```bash
npm run network:promote:candidates -- \
  --include-dc \
  --baseline=150 \
  --targets=MA:1400 \
  --candidate-limit=5000

npm run network:promote:candidates -- \
  --include-dc \
  --baseline=200 \
  --targets=MA:1400 \
  --candidate-limit=5000

npm run network:promote:candidates -- \
  --include-dc \
  --baseline=250 \
  --targets=MA:1400,DC:175 \
  --candidate-limit=5000

npm run network:promote:candidates -- \
  --include-dc \
  --baseline=300 \
  --targets=MA:1400,DC:175 \
  --candidate-limit=5000
```

When the 250 pass ran out of promotable rows, the follow-up did not relax the gate. It imported bounded Overture boxes for short states and explicit town gaps, then promoted only rows that still passed duplicate and contact checks. Eugene, OR used:

```bash
OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps \
  npm run network:import:overture:bbox -- \
  --bbox=-123.30,43.90,-122.85,44.20 \
  --state=OR

npm run network:promote:local -- \
  --state=OR \
  --min-exact=2 \
  --min-radius=12 \
  --radius-mi=25 \
  --per-place=4 \
  --max-promotions=80 \
  --candidate-limit=5000 \
  --summary-only
```

The final 300-floor close used full-state or broad bounded Overture pulls for the remaining short states before promotion. Keep this pattern for future `350+` passes: audit first, import bounded source data for the actual short states, dry-run promotion, then promote only if duplicate/name/phone checks remain clean.

Before promoting, run the coverage audit so gaps and ready source candidates are visible:

```bash
npm run network:coverage:audit -- --include-dc --gaps-only
npm run network:coverage:audit -- --include-dc --states=MA,RI,CT,NH,ME,VT,NY --json
```

The audit reports public count, target, gap, ready candidates by source, and a suggested next import or promote command. Promotion also skips same-state/same-city duplicate candidates by normalized phone, name, and website host so repeated Overture or OSM variants do not create multiple public records for the same local listing.

Recent Northeast target-fill example:

```bash
OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps \
  npm run network:import:plan -- \
  --plan=data/pawket-network-national-osm-plan.json \
  --replace-type=osm:overture_bbox \
  --job=osm-ri-statewide-pet-services

npm run network:promote:candidates -- --states=RI,ME,VT --targets=RI:35,ME:35,VT:35
```

## References

- Overture Maps Quickstart: https://docs.overturemaps.org/getting-data/
- Overture Maps Catalog: https://docs.overturemaps.org/getting-data/cloud-sources/
- IRS EO BMF: https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf
- OSM animal shelter tag: https://wiki.openstreetmap.org/wiki/Tag%3Aamenity%3Danimal_shelter
- OSM pet shop/grooming related tags: https://wiki.openstreetmap.org/wiki/Tag%3Ashop%3Dpet
- OSM Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
