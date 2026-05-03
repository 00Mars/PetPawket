import { ShareChallenge, ShareTemplate, StickerPack } from '../types/share';

export const shareTemplates: ShareTemplate[] = [
  {
    id: 'template-1',
    title: 'Pal Card',
    description: 'Name, bond level, and a short caption for a clean share card.',
    format: '1080 x 1350'
  },
  {
    id: 'template-2',
    title: 'Story Capsule Post',
    description: 'A warm, minimal layout for a Story Capsule excerpt.',
    format: '1080 x 1080'
  },
  {
    id: 'template-3',
    title: 'Pawprint Snapshot',
    description: 'A quick Town Square moment with a cozy frame.',
    format: '1080 x 1080'
  },
  {
    id: 'template-4',
    title: 'Park Moment Poster',
    description: 'A tall poster for seasonal Park moments and prompts.',
    format: '1080 x 1920'
  }
];

export const stickerPacks: StickerPack[] = [
  {
    id: 'stickers-1',
    title: 'Kindness Pack',
    description: 'Soft hearts, pawprints, and warm thank-you tags.',
    tags: ['Kindness', 'Warmth']
  },
  {
    id: 'stickers-2',
    title: 'Park Icons',
    description: 'Lanterns, leaves, and tiny Park tokens.',
    tags: ['Park', 'Seasonal']
  },
  {
    id: 'stickers-3',
    title: 'Bond Mood',
    description: 'Tiny expressions and bond badges for Pals.',
    tags: ['Bond', 'Mood']
  }
];

export const shareChallenges: ShareChallenge[] = [
  {
    id: 'challenge-1',
    title: 'Pawprint of the Day',
    description: 'Share a small moment from your Pal’s day.'
  },
  {
    id: 'challenge-2',
    title: 'Story Capsule Sunday',
    description: 'Post one sentence from your Story Capsule.'
  },
  {
    id: 'challenge-3',
    title: 'Park Buddy Shoutout',
    description: 'Thank a friend who visited your Park.'
  }
];
