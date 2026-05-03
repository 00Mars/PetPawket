import { ProfileBadge, ProfileSnapshot } from '../types/profile';

export const profileSnapshot: ProfileSnapshot = {
  pawprints: 32,
  circles: 3,
  badges: 6,
  stories: 4,
  memberSince: 'Winter 2025'
};

export const profileBadges: ProfileBadge[] = [
  {
    id: 'profile-badge-1',
    title: 'Town Square Neighbor',
    description: 'Left Pawprints that welcomed new Pals.'
  },
  {
    id: 'profile-badge-2',
    title: 'Story Keeper',
    description: 'Saved Story Capsules with care.'
  },
  {
    id: 'profile-badge-3',
    title: 'Park Helper',
    description: 'Joined community moments and rituals.'
  }
];
