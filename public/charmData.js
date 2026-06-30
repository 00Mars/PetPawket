// public/charmData.js — shared placeholder loader for CHARM receipts
const DEFAULTS = {
  isPlaceholder: true,
  howCharmWorks: 'CHARM carries Pet Pawket\'s rescue and medicine mission. Public contribution details will be shown only after program rules and reviewed updates are ready.',
  storyPlaceholder: {
    title: 'Protected memorial origin',
    body: 'CHARM honors the love behind Pet Pawket while public rescue stories, medical updates, and memorial submissions stay consent-aware and carefully reviewed.',
    petName: '',
    imageUrl: ''
  },
  whereFundsGo: [
    { label: 'Urgent medical care', percent: 0 },
    { label: 'Rescue missions', percent: 0 },
    { label: 'Placement support', percent: 0 }
  ],
  fundedThisMonth: {
    monthLabel: 'Reviewed updates pending',
    currency: 'USD',
    items: [],
    total: 0
  },
  charmEditions: [
    'CHARM Edition contribution details will appear after rules are ready.',
    'Special releases need review before public impact details are shown.'
  ],
  receiptHighlight: {
    title: 'CHARM updates pending',
    label: 'Reviewed care updates',
    amount: 0,
    note: 'Reviewed CHARM updates will appear here when the details are ready.'
  },
  supportLinks: {
    supportCharm: '/shop.html',
    seeCase: '#charm-glance',
    exploreStories: '#charm-stories'
  }
};

export async function loadCharmPlaceholders() {
  try {
    const res = await fetch('/data/charm-placeholders.json', { cache: 'no-store' });
    if (!res.ok) return { ...DEFAULTS };
    const json = await res.json();
    return { ...DEFAULTS, ...(json || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export default { loadCharmPlaceholders };
