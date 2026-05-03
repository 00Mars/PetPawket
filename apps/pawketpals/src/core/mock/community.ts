import { CommunityCircle, TownEvent, TownPost, TownPrompt } from '../types/community';

export const townPosts: TownPost[] = [
  {
    id: 'post-1',
    authorName: 'Riley',
    palId: 'sunny',
    caption: 'Sunny learned the new trail today and wagged the whole way.',
    timestamp: '2026-02-10',
    type: 'moment',
    pawprints: 18,
    cheers: 7,
    stickers: 3,
    tags: ['Trail day', 'Pawket Park']
  },
  {
    id: 'post-2',
    authorName: 'Jordan',
    palId: 'pip',
    caption: 'Pip found a sunny windowsill and stayed there through the rain.',
    timestamp: '2026-02-09',
    type: 'story',
    pawprints: 24,
    cheers: 11,
    stickers: 5,
    tags: ['Story Capsule', 'Quiet moments']
  },
  {
    id: 'post-3',
    authorName: 'Amara',
    palId: 'miso',
    caption: 'Miso brought back a tiny leaf like a treasure.',
    timestamp: '2026-02-08',
    type: 'moment',
    pawprints: 15,
    cheers: 5,
    stickers: 2,
    tags: ['Little joys']
  },
  {
    id: 'post-4',
    authorName: 'Kai',
    palId: 'nova',
    caption: 'Nova hit a new high score at the Moonlit Arcade and cheered for the next pal in line.',
    timestamp: '2026-02-07',
    type: 'moment',
    pawprints: 12,
    cheers: 4,
    stickers: 1,
    tags: ['Quiet stroll']
  },
  {
    id: 'post-5',
    authorName: 'Sam',
    palId: 'churro',
    caption: 'Churro shared a toy with a new pal at the park gate.',
    timestamp: '2026-02-06',
    type: 'story',
    pawprints: 19,
    cheers: 9,
    stickers: 4,
    tags: ['Community', 'Kindness']
  },
  {
    id: 'post-6',
    authorName: 'Noel',
    palId: 'luna',
    caption: 'Luna watched the lanterns come on as the sky turned purple.',
    timestamp: '2026-02-05',
    type: 'moment',
    pawprints: 17,
    cheers: 6,
    stickers: 2,
    tags: ['Lantern watch']
  },
  {
    id: 'post-7',
    authorName: 'Avery',
    palId: 'sunny',
    caption: 'Sunny left a pawprint at Town Square to welcome new pals.',
    timestamp: '2026-02-04',
    type: 'event',
    pawprints: 30,
    cheers: 12,
    stickers: 6,
    tags: ['Town Square', 'Welcome']
  },
  {
    id: 'post-8',
    authorName: 'Taylor',
    palId: 'miso',
    caption: 'Miso curled up after a long park stroll and purred softly.',
    timestamp: '2026-02-03',
    type: 'moment',
    pawprints: 14,
    cheers: 5,
    stickers: 2,
    tags: ['Rest day']
  }
];

export const townPrompts: TownPrompt[] = [
  {
    id: 'prompt-1',
    title: 'Leave a pawprint of gratitude',
    description: 'Share a small thank-you for someone who helped your Pal this week.',
    cta: 'Leave a Pawprint'
  },
  {
    id: 'prompt-2',
    title: 'Story Capsule check-in',
    description: 'Write one sentence about a moment you want to remember.',
    cta: 'Open Story Capsule'
  },
  {
    id: 'prompt-3',
    title: 'Park buddy call',
    description: 'Invite a friend to join you for a zone stroll.',
    cta: 'Invite a Buddy'
  }
];

export const communityCircles: CommunityCircle[] = [
  {
    id: 'circle-1',
    name: 'Sunrise Walkers',
    focus: 'Early morning strolls and gentle check-ins.',
    members: 18,
    activity: 'Active this morning'
  },
  {
    id: 'circle-2',
    name: 'Lantern Keepers',
    focus: 'Evening rituals, quiet Pawprints, and soft lights.',
    members: 24,
    activity: 'Active tonight'
  },
  {
    id: 'circle-3',
    name: 'Story Capsule Society',
    focus: 'Short story moments and community highlights.',
    members: 14,
    activity: 'New prompt today'
  }
];

export const townEvents: TownEvent[] = [
  {
    id: 'event-1',
    title: 'Example: Pawprint Parade',
    date: 'Feb 14',
    location: 'Town Square',
    summary: 'Example: A cozy meet-up to leave Pawprints and welcome new Pals.'
  },
  {
    id: 'event-2',
    title: 'Example: Moonlight Stroll',
    date: 'Feb 20',
    location: 'Moonlit Arcade',
    summary: 'Example: A gentle evening walk with lanterns and story sharing.'
  }
];
