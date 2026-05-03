import { ParkHighlight, ParkNotice, ParkPortal, ParkZone } from '../types/park';

export const parkZones: ParkZone[] = [
  {
    id: 'central-plaza',
    title: 'Central Plaza',
    description: 'The main gathering hub with notices, portals, and friendly hellos.',
    activities: ['Check the notice board', 'Meet new Pals', 'Pick a new path']
  },
  {
    id: 'story-lane',
    title: 'Story Lane',
    description: 'A cozy lane where story capsules shimmer near lanterns.',
    activities: ['Read a story', 'Leave a note', 'Collect memories']
  },
  {
    id: 'bloom-grove',
    title: 'Bloom Grove',
    description: 'A soft garden path with seasonal blooms and slow breezes.',
    activities: ['Stroll', 'Collect petals', 'Rest by the fountain']
  },
  {
    id: 'sunlit-meadow',
    title: 'Sunlit Meadow',
    description: 'A bright meadow of warm light, gentle naps, and slow afternoons.',
    activities: ['Visit Daisy Gate', 'Cloud watch', 'Share a quiet snack']
  },
  {
    id: 'riverbend-trail',
    title: 'Riverbend Trail',
    description: 'A winding stream trail with gentle ripples and shaded benches.',
    activities: ['Skip stones', 'Listen to the creek', 'Spot dragonflies']
  },
  {
    id: 'trailhead-terrace',
    title: 'Trailhead Terrace',
    description: 'A lookout terrace where new paths begin and markers appear.',
    activities: ['Check the trail board', 'Mark a new path', 'Rest at the overlook']
  },
  {
    id: 'lantern-meadow',
    title: 'Lantern Meadow',
    description: 'A warm field that glows at dusk with soft light and calm music.',
    activities: ['Watch the sky', 'Share a moment', 'Take a postcard']
  },
  {
    id: 'starlight-steps',
    title: 'Starlight Steps',
    description: 'Moonlit steps where lanterns shimmer and night stories gather.',
    activities: ['Watch the lanterns', 'Leave a note', 'Take a night stroll']
  },
  {
    id: 'bazaar-row',
    title: 'Bazaar Row',
    description: 'A playful market lane for craft tables, stickers, and shared goodies.',
    activities: ['Browse stalls', 'Swap stickers', 'Find a charm']
  },
  {
    id: 'whispering-grove',
    title: 'Whispering Grove',
    description: 'A quiet grove with soft rustles, shaded benches, and gentle pauses.',
    activities: ['Visit the Quiet Bench', 'Listen to the leaves', 'Write a small note']
  },
  {
    id: 'picnic-hill',
    title: 'Picnic Hill',
    description: 'A sunny slope for blankets, toy swaps, and cozy gatherings.',
    activities: ['Share a blanket', 'Swap a toy', 'Watch the breeze']
  },
  {
    id: 'event-green',
    title: 'Event Green',
    description: 'A grassy open space for meetups, pop-ups, and live moments.',
    activities: ['Check event times', 'Join a circle', 'Find a cozy spot']
  },
  {
    id: 'moonlit-arcade',
    title: 'Moonlit Arcade',
    description: 'A neon-lit arcade lane for playful games and friendly challenges.',
    activities: ['Play a mini-game', 'Collect tokens', 'Share a high score']
  },
  {
    id: 'portal-gate',
    title: 'Portal Gate',
    description: 'A gateway to future maps and seasonal park expansions.',
    activities: ['View future portals', 'Share a wish', 'Leave a pawprint']
  }
];

export const parkPortals: ParkPortal[] = [
  {
    id: 'portal-central-plaza',
    title: 'Central Plaza',
    description: 'The main hub where all paths connect.',
    href: '/park/zones/central-plaza',
    tag: 'Hub'
  },
  {
    id: 'portal-story-lane',
    title: 'Story Lane',
    description: 'Story capsules, lanterns, and soft reflections.',
    href: '/park/zones/story-lane',
    tag: 'Stories'
  },
  {
    id: 'portal-bloom-grove',
    title: 'Bloom Grove',
    description: 'Seasonal blooms and gentle rituals.',
    href: '/park/zones/bloom-grove',
    tag: 'Nature'
  },
  {
    id: 'portal-sunlit-meadow',
    title: 'Sunlit Meadow',
    description: 'Warm light, cloud watching, and Daisy Gate strolls.',
    href: '/park/zones/sunlit-meadow',
    tag: 'Meadow'
  },
  {
    id: 'portal-riverbend',
    title: 'Riverbend Trail',
    description: 'Streamside strolls and little discoveries.',
    href: '/park/zones/riverbend-trail',
    tag: 'Trail'
  },
  {
    id: 'portal-trailhead-terrace',
    title: 'Trailhead Terrace',
    description: 'Start new paths and watch the horizon.',
    href: '/park/zones/trailhead-terrace',
    tag: 'Trail'
  },
  {
    id: 'portal-lantern-meadow',
    title: 'Lantern Meadow',
    description: 'Evening glow and calm gathering spots.',
    href: '/park/zones/lantern-meadow',
    tag: 'Night'
  },
  {
    id: 'portal-starlight-steps',
    title: 'Starlight Steps',
    description: 'Lantern shimmer and quiet night stories.',
    href: '/park/zones/starlight-steps',
    tag: 'Night'
  },
  {
    id: 'portal-bazaar-row',
    title: 'Bazaar Row',
    description: 'Crafts, stickers, and shareable goodies.',
    href: '/park/zones/bazaar-row',
    tag: 'Market'
  },
  {
    id: 'portal-whispering-grove',
    title: 'Whispering Grove',
    description: 'Quiet benches and soft rustles.',
    href: '/park/zones/whispering-grove',
    tag: 'Quiet'
  },
  {
    id: 'portal-picnic-hill',
    title: 'Picnic Hill',
    description: 'Blankets, toy swaps, and gentle laughs.',
    href: '/park/zones/picnic-hill',
    tag: 'Cozy'
  },
  {
    id: 'portal-event-green',
    title: 'Event Green',
    description: 'Events, pop-ups, and community moments.',
    href: '/park/zones/event-green',
    tag: 'Events'
  },
  {
    id: 'portal-moonlit-arcade',
    title: 'Moonlit Arcade',
    description: 'Retro games, glow signs, and playful challenges.',
    href: '/park/zones/moonlit-arcade',
    tag: 'Games'
  },
  {
    id: 'portal-gate',
    title: 'Portal Gate',
    description: 'A peek at what’s next for the Park.',
    href: '/park/zones/portal-gate',
    tag: 'Future'
  }
];

export const parkNotices: ParkNotice[] = [
  {
    id: 'notice-1',
    title: 'Example: Lantern Meadow social at dusk (bring a story)',
    type: 'Gathering',
    cta: 'See Event Green',
    href: '/events'
  },
  {
    id: 'notice-2',
    title: 'Example: Story Lane capsule prompt — “first day home”',
    type: 'Prompt',
    cta: 'Open Story Capsule',
    href: '/create'
  },
  {
    id: 'notice-3',
    title: 'Example: Bazaar Row sticker swap opens today',
    type: 'Community',
    cta: 'Visit Bazaar Row',
    href: '/park/zones/bazaar-row'
  },
  {
    id: 'notice-4',
    title: 'Example: Moonlit Arcade challenge night',
    type: 'Games',
    cta: 'Enter Moonlit Arcade',
    href: '/park/zones/moonlit-arcade'
  }
];

export const parkHighlights: ParkHighlight[] = [
  {
    id: 'highlight-1',
    title: 'Example: Event Green weekend lineup posted',
    description: 'Pop-up gatherings, cozy crafts, and a Pawprint parade.'
  },
  {
    id: 'highlight-2',
    title: 'Example: Bloom Grove petals are in season',
    description: 'New stroll prompts and a gentle photo spot.'
  }
];
