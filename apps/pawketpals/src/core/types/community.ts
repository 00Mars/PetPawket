export type TownPostType = 'moment' | 'story' | 'event';

export type TownPost = {
  id: string;
  authorName: string;
  palId: string;
  caption: string;
  timestamp: string;
  type: TownPostType;
  pawprints: number;
  cheers: number;
  stickers: number;
  tags?: string[];
};

export type TownPrompt = {
  id: string;
  title: string;
  description: string;
  cta: string;
};

export type CommunityCircle = {
  id: string;
  name: string;
  focus: string;
  members: number;
  activity: string;
};

export type TownEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  summary: string;
};
