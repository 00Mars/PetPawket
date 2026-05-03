import { BondRitual, PalBadge, PalMoment, PalProfile } from '../types/pal';

export const palProfiles: PalProfile[] = [
  {
    palId: 'sunny',
    homeZoneTitle: 'Sunlit Meadow',
    pawprints: 7,
    favoriteTreat: 'Peanut butter biscuit',
    lastMoment: 'Strolled past the Daisy Gate',
    favoriteActivities: ['Porch naps', 'Gentle fetch', 'Cloud watching']
  },
  {
    palId: 'pip',
    homeZoneTitle: 'Whispering Grove',
    pawprints: 4,
    favoriteTreat: 'Warm oat nibbles',
    lastMoment: 'Left a pawprint at the Quiet Bench',
    favoriteActivities: ['Window watching', 'Soft rustles', 'Lantern glow']
  },
  {
    palId: 'miso',
    homeZoneTitle: 'Moonlit Arcade',
    pawprints: 10,
    favoriteTreat: 'Honeyed salmon',
    lastMoment: 'Shared a sunset dash',
    favoriteActivities: ['Zoomie loops', 'Ribbon chase', 'Night garden hops']
  },
  {
    palId: 'nova',
    homeZoneTitle: 'Trailhead Terrace',
    pawprints: 3,
    favoriteTreat: 'Trail mix bites',
    lastMoment: 'Marked a new path marker',
    favoriteActivities: ['Slow hikes', 'Pond pauses', 'Leaf sniffing']
  },
  {
    palId: 'churro',
    homeZoneTitle: 'Picnic Hill',
    pawprints: 6,
    favoriteTreat: 'Cinnamon crunch',
    lastMoment: 'Shared a blanket cuddle',
    favoriteActivities: ['Soft hugs', 'Toy swaps', 'Laugh loops']
  },
  {
    palId: 'luna',
    homeZoneTitle: 'Starlight Steps',
    pawprints: 5,
    favoriteTreat: 'Moonlight cream',
    lastMoment: 'Watched the lanterns glow',
    favoriteActivities: ['Perch patrol', 'Quiet purrs', 'Night garden']
  }
];

export const palMoments: PalMoment[] = [
  {
    id: 'moment-sunny-1',
    palId: 'sunny',
    title: 'Porch nap',
    description: 'Sunny found a warm patch and shared it with a new friend.',
    timestamp: '2h ago'
  },
  {
    id: 'moment-sunny-2',
    palId: 'sunny',
    title: 'Daisy Gate stroll',
    description: 'A slow walk with extra tail wags.',
    timestamp: 'Yesterday'
  },
  {
    id: 'moment-pip-1',
    palId: 'pip',
    title: 'Quiet bench',
    description: 'Pip watched the Park lanterns blink on one by one.',
    timestamp: '3h ago'
  },
  {
    id: 'moment-pip-2',
    palId: 'pip',
    title: 'Window song',
    description: 'A soft purr while the leaves whispered.',
    timestamp: '2 days ago'
  },
  {
    id: 'moment-miso-1',
    palId: 'miso',
    title: 'Sunset dash',
    description: 'Miso led the zoomie parade across Moonlit Arcade.',
    timestamp: '1h ago'
  },
  {
    id: 'moment-miso-2',
    palId: 'miso',
    title: 'Ribbon chase',
    description: 'A joyful loop with a ribbon trail.',
    timestamp: 'Today'
  },
  {
    id: 'moment-nova-1',
    palId: 'nova',
    title: 'Trail marker',
    description: 'Nova sniffed out a new favorite path.',
    timestamp: 'This morning'
  },
  {
    id: 'moment-churro-1',
    palId: 'churro',
    title: 'Blanket cuddle',
    description: 'Churro shared a cozy moment on Picnic Hill.',
    timestamp: 'Yesterday'
  },
  {
    id: 'moment-luna-1',
    palId: 'luna',
    title: 'Lantern watch',
    description: 'Luna kept watch as the lights shimmered.',
    timestamp: 'Tonight'
  }
];

export const palBadges: PalBadge[] = [
  {
    id: 'badge-sunny-1',
    palId: 'sunny',
    title: 'Stormlight Survivor',
    description: 'Brave through the weather, steady in the Park.'
  },
  {
    id: 'badge-pip-1',
    palId: 'pip',
    title: 'Quiet Guardian',
    description: 'Gentle presence, steady paws.'
  },
  {
    id: 'badge-miso-1',
    palId: 'miso',
    title: 'Zoomie Captain',
    description: 'Leads the evening parade.'
  },
  {
    id: 'badge-nova-1',
    palId: 'nova',
    title: 'Trail Scout',
    description: 'Finds new paths for the Park.'
  },
  {
    id: 'badge-churro-1',
    palId: 'churro',
    title: 'Cuddle Courier',
    description: 'Brings comfort wherever they roam.'
  },
  {
    id: 'badge-luna-1',
    palId: 'luna',
    title: 'Starlight Keeper',
    description: 'Watches over the Park at night.'
  }
];

export const bondRituals: BondRitual[] = [
  {
    id: 'ritual-1',
    title: 'Morning check-in',
    description: 'Start the day with a greeting, a stretch, and a small Pawprint.'
  },
  {
    id: 'ritual-2',
    title: 'Park stroll',
    description: 'Pick a zone and take a short walk to raise bond and discover a moment.'
  },
  {
    id: 'ritual-3',
    title: 'Story Capsule note',
    description: 'Save one sentence about today’s moment to keep the story warm.'
  },
  {
    id: 'ritual-4',
    title: 'Evening wind-down',
    description: 'A gentle goodbye ritual that keeps bonds steady as the Park grows.'
  }
];
