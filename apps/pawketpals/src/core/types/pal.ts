export type PalSpecies = 'dog' | 'cat';

export type Pal = {
  id: string;
  name: string;
  species: PalSpecies;
  personalityTags: string[];
  bondLevel: number;
  storySnippet: string;
  homeZoneId: string;
};

export type PalProfile = {
  palId: string;
  homeZoneTitle: string;
  pawprints: number;
  favoriteTreat: string;
  lastMoment: string;
  favoriteActivities: string[];
};

export type PalMoment = {
  id: string;
  palId: string;
  title: string;
  description: string;
  timestamp: string;
};

export type PalBadge = {
  id: string;
  palId: string;
  title: string;
  description: string;
};

export type BondRitual = {
  id: string;
  title: string;
  description: string;
};
