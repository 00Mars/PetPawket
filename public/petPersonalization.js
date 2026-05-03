/* /public/petPersonalization.js
   Profile-aware shopping helpers for For My Pets surfaces.
   Pure functions only: no DOM, no storage, no network.
*/

const SPECIES_ALIASES = [
  { key: 'bird', tests: ['bird', 'parrot', 'parakeet', 'cockatiel', 'cockatoo', 'macaw', 'conure', 'finch', 'canary', 'lovebird', 'amazon', 'lorikeet', 'dove', 'pionus', 'quaker', 'budgie'] },
  { key: 'dog', tests: ['dog', 'puppy', 'canine'] },
  { key: 'cat', tests: ['cat', 'kitten', 'feline'] },
  { key: 'small-pet', tests: ['rabbit', 'bunny', 'hamster', 'guinea', 'gerbil', 'chinchilla', 'ferret', 'small pet'] },
  { key: 'fish', tests: ['fish', 'betta', 'goldfish', 'aquarium', 'tank'] },
  { key: 'reptile', tests: ['reptile', 'lizard', 'snake', 'turtle', 'tortoise', 'gecko', 'dragon', 'python'] },
  { key: 'horse', tests: ['horse', 'pony', 'equine'] },
];

const SHELF_LABELS = {
  dog: 'Dog Shelf',
  cat: 'Cat Shelf',
  bird: 'Bird Shelf',
  'small-pet': 'Small Pet Shelf',
  fish: 'Fish Shelf',
  reptile: 'Reptile Shelf',
  horse: 'Horse Shelf',
  other: 'Pet Shelf',
};

const SPECIES_TOKENS = {
  dog: ['dog', 'puppy', 'canine', 'chew', 'leash', 'collar', 'walk', 'tug'],
  cat: ['cat', 'kitten', 'feline', 'scratch', 'scratcher', 'litter', 'catnip'],
  bird: ['bird', 'parrot', 'parakeet', 'cockatiel', 'cockatoo', 'macaw', 'conure', 'finch', 'canary', 'perch', 'seed', 'aviary'],
  'small-pet': ['rabbit', 'bunny', 'hamster', 'guinea', 'gerbil', 'small pet', 'hay', 'hutch'],
  fish: ['fish', 'aquarium', 'tank', 'betta', 'filter', 'water'],
  reptile: ['reptile', 'lizard', 'snake', 'gecko', 'turtle', 'tortoise', 'uvb', 'terrarium', 'habitat'],
  horse: ['horse', 'pony', 'equine', 'halter', 'lead', 'groom'],
};

const TRAIT_TOKENS = {
  size: {
    xs: ['small', 'mini', 'toy'],
    sm: ['small', 'mini'],
    md: ['medium'],
    lg: ['large', 'big'],
    xl: ['x-large', 'large', 'giant'],
  },
  chewStrength: {
    gentle: ['gentle', 'soft', 'plush'],
    moderate: ['chew', 'durable'],
    strong: ['strong', 'durable', 'tough', 'heavy duty'],
    power: ['power', 'super chewer', 'indestructible', 'tough', 'heavy duty'],
  },
  playStyle: {
    fetch: ['fetch', 'ball', 'frisbee'],
    tug: ['tug', 'rope'],
    puzzle: ['puzzle', 'enrichment', 'treat dispensing', 'interactive'],
    cuddly: ['plush', 'snuggle', 'comfort'],
    chase: ['chase', 'wand', 'laser', 'teaser'],
  },
  cageSizeClass: {
    compact: ['small cage', 'compact'],
    roomy: ['perch', 'ladder', 'swing'],
    aviary: ['aviary', 'large cage', 'flight'],
  },
  flightStatus: {
    flighted: ['flight', 'perch', 'foraging'],
    clipped: ['ladder', 'perch', 'cage'],
    disabled: ['platform', 'low perch', 'accessible'],
  },
  waterType: {
    freshwater: ['freshwater', 'aquarium'],
    saltwater: ['saltwater', 'marine', 'reef'],
  },
  habitat: {
    desert: ['desert', 'basking', 'uvb', 'heat'],
    tropical: ['tropical', 'humidity', 'mist', 'uvb'],
    aquatic: ['aquatic', 'water', 'filter'],
  },
};

const CARE_TOKENS = ['care', 'health', 'dental', 'clean', 'hygiene', 'groom', 'brush', 'shampoo', 'pad', 'waste', 'litter', 'wellness'];
const PACK_TOKENS = ['box', 'bundle', 'pack', 'subscription', 'kit', 'starter', 'variety'];

export function normalizePetSpecies(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'other';
  for (const entry of SPECIES_ALIASES) {
    if (entry.tests.some(test => raw.includes(test))) return entry.key;
  }
  return raw.replace(/\s+/g, '-');
}

export function petDisplayName(pet = {}) {
  return String(pet?.name || '').trim() || 'your pet';
}

export function petShelfLabel(petOrSpecies = '') {
  const species = typeof petOrSpecies === 'string' ? normalizePetSpecies(petOrSpecies) : normalizePetSpecies(petOrSpecies?.species || petOrSpecies?.type);
  return SHELF_LABELS[species] || SHELF_LABELS.other;
}

export function petShelfHref(pet = {}, extra = {}) {
  const species = normalizePetSpecies(pet.species || pet.type);
  const params = new URLSearchParams();
  params.set('mypets', '1');
  if (['dog', 'cat', 'bird', 'small-pet', 'fish', 'reptile'].includes(species)) params.set('pet', species);
  const query = buildPetSearchQuery(pet);
  if (extra.q || query) params.set('q', extra.q || query);
  return `/shop.html?${params.toString()}`;
}

export function buildPetProfile(pet = {}) {
  const traits = normalizeTraits(pet.traits);
  const species = normalizePetSpecies(pet.species || pet.type);
  const detail = cleanToken(pet.breed || pet.detail || traits.breed || traits.type || '');
  const allergies = uniqueTokens([
    ...toTokenList(pet.allergies),
    ...toTokenList(traits.allergies),
  ]);
  const dislikes = uniqueTokens([
    ...toTokenList(pet.dislikes),
    ...toTokenList(traits.dislikes),
  ]);
  const flavors = uniqueTokens([
    ...toTokenList(pet.food_prefs),
    ...toTokenList(pet.foodPrefs),
    ...toTokenList(traits.flavors),
    ...toTokenList(traits.diets),
  ]);
  const play = uniqueTokens([
    ...toTokenList(pet.toy_prefs),
    ...toTokenList(pet.toyPrefs),
    ...toTokenList(traits.playStyle),
    ...toTokenList(traits.chewStrength),
  ]);
  const care = uniqueTokens([
    ...toTokenList(traits.notes),
    ...toTokenList(pet.notes),
    ...toTokenList(traits.houseTrained),
    ...toTokenList(traits.litterTrained),
    ...toTokenList(traits.flightStatus),
    ...toTokenList(traits.cageSizeClass),
    ...toTokenList(traits.waterType),
    ...toTokenList(traits.habitat),
    ...toTokenList(traits.uvb),
    ...toTokenList(traits.schooling),
  ]).filter(token => token !== 'unknown');

  const traitTokens = uniqueTokens([
    species,
    detail,
    traits.size,
    traits.chewStrength,
    traits.playStyle,
    traits.cageSizeClass,
    traits.flightStatus,
    traits.waterType,
    traits.habitat,
    ...flavors,
    ...play,
    ...care,
  ]);

  const chips = uniqueLabels([
    labelForSpecies(species, pet.species),
    detail ? titleCase(detail) : '',
    displayTrait(traits.size),
    displayTrait(traits.chewStrength),
    displayTrait(traits.playStyle),
    displayTrait(traits.cageSizeClass),
    displayTrait(traits.flightStatus),
    displayTrait(traits.waterType),
    displayTrait(traits.habitat),
    allergies.length ? `Avoid ${allergies.slice(0, 2).join(', ')}` : '',
  ]).slice(0, 7);

  return {
    id: pet.id,
    name: petDisplayName(pet),
    species,
    speciesLabel: labelForSpecies(species, pet.species),
    shelfLabel: SHELF_LABELS[species] || SHELF_LABELS.other,
    detail,
    detailLabel: detail ? titleCase(detail) : '',
    traits,
    allergies,
    dislikes,
    flavors,
    play,
    care,
    traitTokens,
    chips,
    query: buildPetSearchQuery(pet),
  };
}

export function buildPetSearchQuery(pet = {}) {
  const profile = buildPetProfileShallow(pet);
  const parts = uniqueTokens([
    profile.species,
    profile.detail,
    ...profile.flavors.slice(0, 2),
    ...profile.play.slice(0, 2),
    profile.traits.chewStrength,
    profile.traits.playStyle,
    profile.traits.cageSizeClass,
    profile.traits.habitat,
  ]).filter(token => token && token !== 'other' && token !== 'unknown');
  return parts.slice(0, 5).join(' ');
}

export function rankProductsForPet(products = [], pet = {}, options = {}) {
  const profile = buildPetProfile(pet);
  const minScore = Number.isFinite(options.minScore) ? options.minScore : 1;
  return (Array.isArray(products) ? products : [])
    .map(product => {
      const score = scoreProductForPet(product, profile);
      return {
        product,
        score,
        profile,
        reasons: productMatchReasons(product, profile, score),
      };
    })
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score || priceOf(a.product) - priceOf(b.product));
}

export function rankProductsForPets(products = [], pets = [], options = {}) {
  const profiles = (Array.isArray(pets) ? pets : []).map(buildPetProfile);
  if (!profiles.length) return (Array.isArray(products) ? products : []).map(product => ({ product, score: 0, profiles: [], reasons: [] }));
  const minScore = Number.isFinite(options.minScore) ? options.minScore : 1;
  return (Array.isArray(products) ? products : [])
    .map(product => {
      const scored = profiles
        .map(profile => ({
          profile,
          score: scoreProductForPet(product, profile),
          reasons: productMatchReasons(product, profile),
        }))
        .sort((a, b) => b.score - a.score);
      const best = scored[0] || { score: 0, profile: null, reasons: [] };
      return {
        product,
        score: best.score,
        profiles: scored.filter(item => item.score > 0).map(item => item.profile),
        profile: best.profile,
        reasons: best.reasons,
      };
    })
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score || priceOf(a.product) - priceOf(b.product));
}

export function productMatchReasons(product = {}, profile = buildPetProfile({}), precomputedScore = null) {
  const text = productSearchText(product);
  const reasons = [];
  const score = precomputedScore ?? scoreProductForPet(product, profile);
  if (score <= 0) return reasons;
  if (profile.species !== 'other' && includesAny(text, SPECIES_TOKENS[profile.species] || [profile.species])) {
    reasons.push(`${profile.speciesLabel} fit`);
  }
  if (profile.detail && text.includes(profile.detail)) reasons.push(profile.detail);
  if (profile.allergies.length && !includesAny(text, profile.allergies)) reasons.push('allergy-aware');
  if (includesAny(text, profile.play)) reasons.push('play preference');
  if (includesAny(text, profile.flavors)) reasons.push('flavor/diet note');
  if (includesAny(text, CARE_TOKENS)) reasons.push('care routine');
  if (includesAny(text, PACK_TOKENS)) reasons.push('Pack candidate');
  if (!reasons.length) reasons.push('profile match');
  return uniqueLabels(reasons).slice(0, 3);
}

export function buildPersonalizedShelf(products = [], pet = {}, limit = 4) {
  const profile = buildPetProfile(pet);
  const ranked = rankProductsForPet(products, pet, { minScore: 1 });
  const picks = ranked.slice(0, limit);
  const fallback = uniqueProducts(products)
    .filter(product => !picks.some(item => productKey(item.product) === productKey(product)))
    .slice(0, Math.max(0, limit - picks.length))
    .map(product => ({
      product,
      score: 0,
      profile,
      reasons: ['starter shelf'],
    }));
  return {
    profile,
    picks: [...picks, ...fallback].slice(0, limit),
  };
}

export function firstVariant(product = {}) {
  const list = Array.isArray(product?.variants?.edges)
    ? product.variants.edges.map(edge => edge?.node || edge)
    : Array.isArray(product?.variants)
      ? product.variants.map(edge => edge?.node || edge)
      : [];
  const variant = list.find(item => item?.id) || null;
  if (!variant) return null;
  return {
    id: variant.id,
    title: variant.title || 'Default',
    available: variant.availableForSale !== false && variant.available !== false,
    price: Number(variant?.price?.amount ?? variant?.price ?? product?.priceRange?.minVariantPrice?.amount ?? NaN),
  };
}

export function productKey(product = {}) {
  return String(product?.handle || product?.id || product?.title || '').trim();
}

function scoreProductForPet(product = {}, profile = buildPetProfile({})) {
  const text = productSearchText(product);
  if (!text) return 0;
  if (profile.allergies.length && includesAny(text, profile.allergies)) return -10;
  if (profile.dislikes.length && includesAny(text, profile.dislikes)) return -4;

  let score = 0;
  const speciesTokens = SPECIES_TOKENS[profile.species] || [profile.species];
  if (profile.species !== 'other' && includesAny(text, speciesTokens)) score += 8;
  if (profile.detail && text.includes(profile.detail)) score += 3;

  for (const token of profile.traitTokens) {
    if (token && token !== 'other' && token !== 'unknown' && text.includes(token)) score += 2;
  }

  score += countTokenMatches(text, profile.flavors) * 2;
  score += countTokenMatches(text, profile.play) * 2;
  score += countTraitTokenMatches(text, profile.traits);
  if (includesAny(text, CARE_TOKENS)) score += 1.5;
  if (includesAny(text, PACK_TOKENS)) score += 1;

  return score;
}

function countTraitTokenMatches(text, traits = {}) {
  let score = 0;
  for (const [traitKey, values] of Object.entries(TRAIT_TOKENS)) {
    const selected = toTokenList(traits[traitKey]);
    for (const value of selected) {
      const tokens = values[value] || [value];
      if (includesAny(text, tokens)) score += 1.5;
    }
  }
  return score;
}

function productSearchText(product = {}) {
  return [
    product.title,
    product.handle,
    product.description,
    product.descriptionHtml,
    product.productType,
    product.vendor,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].map(part => stripHtml(String(part || '').toLowerCase())).join(' ');
}

function buildPetProfileShallow(pet = {}) {
  const traits = normalizeTraits(pet.traits);
  return {
    species: normalizePetSpecies(pet.species || pet.type),
    detail: cleanToken(pet.breed || pet.detail || traits.breed || traits.type || ''),
    traits,
    allergies: uniqueTokens([...toTokenList(pet.allergies), ...toTokenList(traits.allergies)]),
    flavors: uniqueTokens([...toTokenList(pet.food_prefs), ...toTokenList(pet.foodPrefs), ...toTokenList(traits.flavors), ...toTokenList(traits.diets)]),
    play: uniqueTokens([...toTokenList(pet.toy_prefs), ...toTokenList(pet.toyPrefs), ...toTokenList(traits.playStyle), ...toTokenList(traits.chewStrength)]),
  };
}

function normalizeTraits(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toTokenList(value) {
  if (Array.isArray(value)) return value.flatMap(toTokenList);
  if (value === null || value === undefined) return [];
  if (typeof value === 'object') return [];
  return String(value)
    .split(/[,/|]+/)
    .map(cleanToken)
    .filter(Boolean);
}

function uniqueTokens(values = []) {
  const seen = new Set();
  return values
    .map(cleanToken)
    .filter(Boolean)
    .filter(value => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function uniqueLabels(values = []) {
  const seen = new Set();
  return values
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanToken(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function labelForSpecies(normalized, raw = '') {
  const cleanRaw = String(raw || '').trim();
  if (cleanRaw && normalized !== 'other') return titleCase(cleanRaw);
  return titleCase((SHELF_LABELS[normalized] || 'Pet Shelf').replace(/\s+shelf$/i, ''));
}

function titleCase(value = '') {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function displayTrait(value = '') {
  const clean = cleanToken(value);
  const map = {
    xs: 'Extra Small',
    sm: 'Small',
    md: 'Medium',
    lg: 'Large',
    xl: 'Extra Large',
    gentle: 'Gentle',
    moderate: 'Moderate',
    strong: 'Strong',
    power: 'Power Chewer',
    fetch: 'Fetch',
    tug: 'Tug',
    puzzle: 'Puzzle',
    cuddly: 'Cuddly',
    chase: 'Chase',
    flighted: 'Flighted',
    clipped: 'Clipped',
    disabled: 'Accessible Setup',
    freshwater: 'Freshwater',
    saltwater: 'Saltwater',
  };
  return map[clean] || titleCase(clean);
}

function includesAny(text, tokens = []) {
  return tokens.some(token => {
    const clean = cleanToken(token);
    return clean && text.includes(clean);
  });
}

function countTokenMatches(text, tokens = []) {
  return uniqueTokens(tokens).reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0);
}

function priceOf(product = {}) {
  const n = Number(product?.priceRange?.minVariantPrice?.amount ?? product?.price?.amount ?? product?.price ?? NaN);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ');
}

function uniqueProducts(products = []) {
  const seen = new Set();
  return (Array.isArray(products) ? products : []).filter(product => {
    const key = productKey(product);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
