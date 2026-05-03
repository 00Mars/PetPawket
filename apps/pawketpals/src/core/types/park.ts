export type ParkZone = {
  id: string;
  title: string;
  description: string;
  activities: string[];
};

export type ParkPortal = {
  id: string;
  title: string;
  description: string;
  href: string;
  tag?: string;
};

export type ParkNotice = {
  id: string;
  title: string;
  type: string;
  cta: string;
  href?: string;
};

export type ParkHighlight = {
  id: string;
  title: string;
  description: string;
};
