// public/storyHub.js — account story, care steps, and connected-path glue
import { authFetch, getSession } from './auth.js';
import { getLoopAvailability } from './loopState.js';

const QUEST_STORAGE_KEY = 'pp_story_quests_v2';
const LEGACY_QUEST_KEY = 'pp_story_quests_v1';
const LEGACY_REWARD_KEY = 'pp_story_rewards_v1';
const LEGACY_STREAK_KEY = 'pp_story_streak_v1';
const QUEST_API = '/api/account/quests';

let started = false;
let activeState = createEmptyQuestState();
let activeContext = createEmptyContext();
let lastSignedIn = false;
let saveTimer = 0;

const QUEST_CATALOG = [
  {
    id: 'rescue-walk',
    groups: ['account', 'community'],
    title: 'Walk or outing note',
    eyebrow: 'Journal step',
    icon: 'bi-compass',
    summary: 'Save a walk, outing, or favorite moment so it is easy to find later.',
    cta: { label: 'Open pet journals', href: '/account.html#account-pets' },
    reward: {
      label: 'Walk memory saved',
      points: 15,
      target: 'pawket-pals',
      type: 'pal-story-seed',
      handoffTitle: 'Walk memory saved',
    },
    checkpoints: [
      { id: 'pet-profile', label: 'Pet profile saved', hint: 'Add the pet this note belongs to.', auto: 'hasPet' },
      { id: 'walk-note', label: 'Journal note saved', hint: 'Capture the care moment in a journal entry.', auto: 'hasJournal' },
      { id: 'pal-spark', label: 'Favorite detail chosen', hint: 'Pick the mood, phrase, or detail you want to remember.' },
    ],
  },
  {
    id: 'care-rhythm',
    groups: ['account', 'charm'],
    title: 'Weekly care check-in',
    eyebrow: 'Favorite memory',
    icon: 'bi-stars',
    summary: 'Add a care note and mark the moments that matter most.',
    cta: { label: 'Review memories', href: '/account.html#account-pets' },
    reward: {
      label: 'Care check-in saved',
      points: 20,
      target: 'charm-foundation',
      type: 'care-rhythm',
      handoffTitle: 'Care check-in saved',
    },
    checkpoints: [
      { id: 'pet-profile', label: 'Pet profile saved', hint: 'A saved profile keeps care details together.', auto: 'hasPet' },
      { id: 'journal-note', label: 'Care note saved', hint: 'Add one journal note from this week.', auto: 'hasJournal' },
      { id: 'core-memory', label: 'Favorite memory marked', hint: 'Mark the most meaningful entry as a favorite memory.', auto: 'hasCoreMemory' },
    ],
  },
  {
    id: 'pawket-pass',
    groups: ['account', 'charm'],
    title: 'Pawket Pass share',
    eyebrow: 'Sharing',
    icon: 'bi-ticket-perforated',
    summary: 'Keep track of a Pawket Pass when one is available to share or save.',
    cta: { label: 'View passes', href: '/account.html#loopTokensSection' },
    reward: {
      label: 'Pass step saved',
      points: 10,
      target: 'charm-foundation',
      type: 'loop-token',
      handoffTitle: 'Pawket Pass step saved',
    },
    checkpoints: [
      { id: 'pass-ready', label: 'Pawket Pass available', hint: 'Complete a purchase or save a pass link.', auto: 'hasPass' },
      { id: 'share-plan', label: 'Recipient chosen', hint: 'Choose who should receive the pass.' },
      { id: 'impact-review', label: 'CHARM update seen', hint: 'Open the current CHARM update.', auto: 'hasImpact' },
    ],
  },
  {
    id: 'photo-walk',
    groups: ['community'],
    title: 'Sunny day photo',
    eyebrow: 'Pawprint',
    icon: 'bi-camera',
    summary: 'Save one joyful photo idea for a later community post or share card.',
    cta: { label: 'Open community', href: '/community.html' },
    reward: {
      label: 'Photo idea saved',
      points: 15,
      target: 'pawket-pals',
      type: 'pawprint-draft',
      handoffTitle: 'Photo idea saved',
    },
    checkpoints: [
      { id: 'photo-picked', label: 'Photo picked', hint: 'Choose one bright pet photo.' },
      { id: 'caption-written', label: 'Caption written', hint: 'Write a short caption with the pet name.' },
      { id: 'pal-mood', label: 'Pal mood chosen', hint: 'Pick the Pal mood this moment should carry.' },
    ],
  },
  {
    id: 'rescue-drive',
    groups: ['community', 'charm'],
    title: 'CHARM Rescue Drive',
    eyebrow: 'Foundation',
    icon: 'bi-heart-pulse',
    summary: 'Connect a small action to a rescue update without making the story feel heavy.',
    cta: { label: 'See CHARM', href: '/charm.html#charm-glance' },
    reward: {
      label: 'CHARM step saved',
      points: 20,
      target: 'charm-foundation',
      type: 'impact-campaign',
      handoffTitle: 'CHARM support step saved',
    },
    checkpoints: [
      { id: 'impact-case', label: 'Care update opened', hint: 'Open the active care update.', auto: 'hasImpact' },
      { id: 'support-path', label: 'Support idea chosen', hint: 'Choose shopping, sharing, or partner support.' },
      { id: 'care-message', label: 'Care message drafted', hint: 'Write a short kindness note for the impact trail.' },
    ],
  },
  {
    id: 'pawket-party',
    groups: ['community'],
    title: 'Pawket Party Prep',
    eyebrow: 'Community',
    icon: 'bi-people',
    summary: 'Build the lightest version of a meetup, story circle, or shared Pack reveal.',
    cta: { label: 'Explore partners', href: '/pawket-network.html' },
    reward: {
      label: 'Community idea saved',
      points: 15,
      target: 'community',
      type: 'town-square-seed',
      handoffTitle: 'Community idea saved',
    },
    checkpoints: [
      { id: 'theme', label: 'Theme chosen', hint: 'Pick a care, play, or rescue theme.' },
      { id: 'partner', label: 'Partner or friend picked', hint: 'Choose who should be part of it.' },
      { id: 'share-moment', label: 'Share moment planned', hint: 'Plan the Pawprint or pass people can carry forward.' },
    ],
  },
];

const QUEST_BY_ID = Object.fromEntries(QUEST_CATALOG.map((quest) => [quest.id, quest]));
const QUEST_GROUPS = {
  account: ['rescue-walk', 'care-rhythm', 'pawket-pass'],
  community: ['photo-walk', 'rescue-drive', 'pawket-party'],
  charm: ['care-rhythm', 'pawket-pass', 'rescue-drive'],
  all: QUEST_CATALOG.map(q => q.id),
};

const contextChecks = {
  hasPet: (ctx) => (ctx.pets?.length || 0) > 0,
  hasJournal: (ctx) => Number(ctx.journalCount || 0) > 0,
  hasCoreMemory: (ctx) => Number(ctx.coreMemoryCount || 0) > 0,
  hasPass: (ctx) => Number(ctx.passCount || 0) > 0,
  hasImpact: (ctx) => !!ctx.impact,
};

const money = (amount = 0, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function percent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

function tokenCode(item) {
  return String(item?.code || item || '').trim().toUpperCase();
}

function countAvailablePasses(summary) {
  const sent = Array.isArray(summary?.sentTokens) ? summary.sentTokens : [];
  const codes = new Set(sent.map(tokenCode).filter(Boolean));
  const pendingCode = tokenCode(summary?.pendingToken);
  if (pendingCode) codes.add(pendingCode);
  return codes.size;
}

function createEmptyContext() {
  return {
    pets: [],
    passCount: 0,
    signedIn: false,
    impact: null,
    stories: [],
    journalCount: 0,
    coreMemoryCount: 0,
    journalHandoffTargets: [],
    latestJournalTitle: '',
    latestJournalDate: '',
    latestCoreMemoryTitle: '',
  };
}

function createEmptyQuestState() {
  return {
    version: 2,
    quests: {},
    rewards: [],
    handoffs: [],
    streak: { count: 0, lastDate: null },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCheckpoint(raw) {
  const done = typeof raw === 'boolean' ? raw : !!raw?.done;
  return {
    done,
    source: raw?.source || 'manual',
    completedAt: done ? (raw?.completedAt || new Date().toISOString()) : null,
  };
}

function normalizeQuest(raw = {}) {
  const checkpoints = {};
  Object.entries(raw.checkpoints || {}).forEach(([id, cp]) => {
    checkpoints[id] = normalizeCheckpoint(cp);
  });
  const status = ['available', 'active', 'completed'].includes(raw.status) ? raw.status : 'available';
  return {
    status,
    startedAt: raw.startedAt || null,
    completedAt: raw.completedAt || null,
    checkpoints,
  };
}

function normalizeState(raw) {
  const state = createEmptyQuestState();
  if (!raw || typeof raw !== 'object') return state;
  Object.entries(raw.quests || {}).forEach(([id, quest]) => {
    if (QUEST_BY_ID[id]) state.quests[id] = normalizeQuest(quest);
  });
  state.rewards = Array.isArray(raw.rewards) ? raw.rewards.filter(Boolean).slice(0, 12) : [];
  state.handoffs = Array.isArray(raw.handoffs) ? raw.handoffs.filter(Boolean).slice(0, 20) : [];
  state.streak = {
    count: Number.isFinite(Number(raw.streak?.count)) ? Math.max(0, Number(raw.streak.count)) : 0,
    lastDate: raw.streak?.lastDate || null,
  };
  state.updatedAt = raw.updatedAt || new Date().toISOString();
  return state;
}

function migrateLegacyState() {
  const state = createEmptyQuestState();
  try {
    const raw = localStorage.getItem(LEGACY_QUEST_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    Object.entries(parsed || {}).forEach(([id, quest]) => {
      if (!QUEST_BY_ID[id] || !quest?.done) return;
      const catalog = QUEST_BY_ID[id];
      const checkpoints = {};
      catalog.checkpoints.forEach((cp) => {
        checkpoints[cp.id] = { done: true, source: 'legacy', completedAt: quest.completedAt || new Date().toISOString() };
      });
      state.quests[id] = {
        status: 'completed',
        startedAt: quest.completedAt || new Date().toISOString(),
        completedAt: quest.completedAt || new Date().toISOString(),
        checkpoints,
      };
    });
  } catch {}
  try {
    const rawRewards = localStorage.getItem(LEGACY_REWARD_KEY);
    const parsedRewards = rawRewards ? JSON.parse(rawRewards) : [];
    state.rewards = Array.isArray(parsedRewards)
      ? parsedRewards.slice(0, 6).map((item, index) => ({
          id: `legacy-${index}-${slug(item?.label || 'reward')}`,
          label: item?.label || 'Step completed',
          target: 'legacy',
          type: 'legacy',
          points: 0,
          status: 'legacy',
          createdAt: item?.at || new Date().toISOString(),
        }))
      : [];
  } catch {}
  try {
    const rawStreak = localStorage.getItem(LEGACY_STREAK_KEY);
    const parsedStreak = rawStreak ? JSON.parse(rawStreak) : null;
    if (parsedStreak) state.streak = { count: Number(parsedStreak.count || 0), lastDate: parsedStreak.lastDate || null };
  } catch {}
  return state;
}

function readLocalState() {
  try {
    const raw = localStorage.getItem(QUEST_STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
  } catch {}
  return migrateLegacyState();
}

function saveLocalState(state) {
  try {
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(normalizeState(state)));
  } catch {}
}

function stateTime(state) {
  const n = new Date(state?.updatedAt || 0).getTime();
  return Number.isFinite(n) ? n : 0;
}

function mergeState(localState, remoteState) {
  const merged = normalizeState(stateTime(remoteState) > stateTime(localState) ? remoteState : localState);
  const other = normalizeState(stateTime(remoteState) > stateTime(localState) ? localState : remoteState);

  Object.entries(other.quests).forEach(([questId, quest]) => {
    const dest = merged.quests[questId] || normalizeQuest({});
    if (quest.status === 'completed') dest.status = 'completed';
    else if (quest.status === 'active' && dest.status !== 'completed') dest.status = 'active';
    dest.startedAt ||= quest.startedAt;
    dest.completedAt ||= quest.completedAt;
    Object.entries(quest.checkpoints || {}).forEach(([checkpointId, checkpoint]) => {
      if (checkpoint?.done) dest.checkpoints[checkpointId] = checkpoint;
    });
    merged.quests[questId] = dest;
  });

  const rewardMap = new Map();
  [...merged.rewards, ...other.rewards].forEach((reward) => {
    const id = reward?.id || `${reward?.questId || 'quest'}-${reward?.label || 'reward'}`;
    if (id && !rewardMap.has(id)) rewardMap.set(id, reward);
  });
  merged.rewards = Array.from(rewardMap.values()).slice(0, 12);

  const handoffMap = new Map();
  [...merged.handoffs, ...other.handoffs].forEach((handoff) => {
    const id = handoff?.id || `${handoff?.questId || 'quest'}-${handoff?.target || 'handoff'}`;
    if (id && !handoffMap.has(id)) handoffMap.set(id, handoff);
  });
  merged.handoffs = Array.from(handoffMap.values()).slice(0, 20);

  if (Number(other.streak?.count || 0) > Number(merged.streak?.count || 0)) {
    merged.streak = other.streak;
  }
  merged.updatedAt = new Date(Math.max(stateTime(localState), stateTime(remoteState), Date.now())).toISOString();
  return merged;
}

async function fetchRemoteState() {
  try {
    const res = await authFetch(QUEST_API);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) return null;
    return normalizeState(data?.state);
  } catch {
    return null;
  }
}

async function saveRemoteState(state) {
  try {
    const res = await authFetch(QUEST_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: normalizeState(state) }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.ok !== false;
  } catch {
    return false;
  }
}

function setSyncStatus(status) {
  document.querySelectorAll('[data-quest-sync]').forEach((el) => {
    el.textContent = status;
    el.dataset.status = status.toLowerCase().replace(/\s+/g, '-');
  });
}

function persistState(state, { remote = true } = {}) {
  activeState = normalizeState({ ...state, updatedAt: new Date().toISOString() });
  saveLocalState(activeState);
  renderQuestSystem(activeState, activeContext);
  if (!remote || !lastSignedIn) {
    setSyncStatus(lastSignedIn ? 'Saved on this device' : 'Saved here');
    return;
  }
  setSyncStatus('Saving');
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    const ok = await saveRemoteState(activeState);
    setSyncStatus(ok ? 'Saved' : 'Saved on this device');
  }, 450);
}

async function fetchPets(session) {
  try {
    if (!session?.signedIn) return [];
    const res = await authFetch('/api/pets');
    const data = await res.json().catch(() => ([]));
    if (!res.ok) return [];
    return Array.isArray(data) ? data : (data.pets || []);
  } catch {
    return [];
  }
}

function parseJournalTags(input) {
  if (Array.isArray(input)) return input.map(tag => String(tag).replace(/^#/, '').trim()).filter(Boolean);
  return String(input || '').split(',').map(tag => tag.replace(/^#/, '').trim()).filter(Boolean);
}

function normalizeJournalMetricEntry(raw = {}) {
  const createdAt = raw.createdAt || raw.created_at || raw.created || '';
  const occurredAt = raw.occurredAt || raw.occurred_at || createdAt;
  const entryType = String(raw.entryType || raw.entry_type || 'note').trim().toLowerCase() || 'note';
  const metadata = raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
    ? raw.metadata
    : {};
  return {
    title: String(raw.title || raw.noteTitle || '').trim(),
    text: String(raw.text || raw.note || '').trim(),
    entryType,
    occurredAt,
    createdAt,
    highlighted: raw.highlighted === true || raw.coreMemory === true,
    visibility: String(raw.visibility || 'private').trim().toLowerCase() || 'private',
    tags: parseJournalTags(raw.tags),
    metadata,
  };
}

function journalMetricTime(entry = {}) {
  const time = new Date(entry.occurredAt || entry.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function journalMetricTitle(entry = {}) {
  if (entry.title) return entry.title;
  const typeLabels = {
    note: 'Journal entry',
    story: 'Story moment',
    milestone: 'Milestone',
    wellness: 'Wellness note',
    vet: 'Vet visit',
    medication: 'Medication note',
    meal: 'Meal note',
    walk: 'Walk note',
    training: 'Training note',
    grooming: 'Grooming note',
    play: 'Play note',
    behavior: 'Behavior note',
    rescue: 'Rescue/adoption note',
    memorial: 'Memorial note',
  };
  return typeLabels[entry.entryType] || 'Journal entry';
}

function inferJournalMetricHandoffs(entry = {}) {
  const targets = new Set();
  const tags = parseJournalTags(entry.tags).map(tag => tag.toLowerCase());
  const metadataTargets = Array.isArray(entry.metadata?.handoffTargets) ? entry.metadata.handoffTargets : [];
  metadataTargets.forEach(target => targets.add(target));

  if (entry.highlighted || ['story', 'milestone', 'memorial', 'rescue', 'pawket-pal'].includes(entry.entryType)) {
    targets.add('pawket-pals');
  }
  if (['vet', 'medication', 'wellness', 'allergy', 'weight', 'rescue', 'charm'].includes(entry.entryType) ||
      entry.visibility === 'charm-foundation' ||
      tags.some(tag => ['rescue', 'adoption', 'foster', 'medical', 'shelter'].includes(tag))) {
    targets.add('charm-foundation');
  }
  if (entry.visibility === 'shareable' || entry.visibility === 'community' || entry.highlighted) {
    targets.add('share-studio');
  }
  if (entry.visibility === 'community') targets.add('town-square');
  return [...targets];
}

async function fetchJournalMetrics(pets = []) {
  const petIds = pets.slice(0, 8).map(p => p?.id).filter(Boolean);
  if (!petIds.length) {
    return {
      journalCount: 0,
      coreMemoryCount: 0,
      journalHandoffTargets: [],
      latestJournalTitle: '',
      latestJournalDate: '',
      latestCoreMemoryTitle: '',
    };
  }
  const results = await Promise.all(petIds.map(async (petId) => {
    try {
      const res = await authFetch(`/api/pets/${encodeURIComponent(petId)}/journal`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return [];
      return Array.isArray(data) ? data : (data.journal || data.entries || data.items || []);
    } catch {
      return [];
    }
  }));
  const entries = results.flat().map(normalizeJournalMetricEntry);
  const sorted = entries.slice().sort((a, b) => journalMetricTime(b) - journalMetricTime(a));
  const coreEntries = sorted.filter(item => item.highlighted);
  const handoffTargets = new Set();
  sorted.forEach(entry => inferJournalMetricHandoffs(entry).forEach(target => handoffTargets.add(target)));
  const latest = sorted[0] || null;
  const latestCore = coreEntries[0] || null;
  return {
    journalCount: entries.length,
    coreMemoryCount: coreEntries.length,
    journalHandoffTargets: [...handoffTargets],
    latestJournalTitle: latest ? journalMetricTitle(latest) : '',
    latestJournalDate: latest?.occurredAt || latest?.createdAt || '',
    latestCoreMemoryTitle: latestCore ? journalMetricTitle(latestCore) : '',
  };
}

async function fetchImpact() {
  try {
    const res = await fetch('/api/loop/impact/active', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    return data?.activeCase || null;
  } catch {
    return null;
  }
}

async function fetchStories(limit = 3) {
  try {
    const res = await fetch(`/api/loop/impact?limit=${limit}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.stories) ? data.stories : [];
  } catch {
    return [];
  }
}

function isCheckpointContextDone(checkpoint, ctx) {
  if (!checkpoint?.auto) return false;
  return !!contextChecks[checkpoint.auto]?.(ctx);
}

function getQuestState(state, questId) {
  return state.quests[questId] || normalizeQuest({});
}

function isCheckpointDone(questState, checkpoint, ctx) {
  return !!questState.checkpoints?.[checkpoint.id]?.done || isCheckpointContextDone(checkpoint, ctx);
}

function getQuestStats(quest, state = activeState, ctx = activeContext) {
  const questState = getQuestState(state, quest.id);
  const total = quest.checkpoints.length;
  const done = quest.checkpoints.filter(cp => isCheckpointDone(questState, cp, ctx)).length;
  const complete = done >= total;
  const status = questState.status === 'completed' || complete ? 'completed' : questState.status;
  return {
    total,
    done,
    percent: total ? percent((done / total) * 100) : 0,
    complete,
    active: status === 'active',
    status,
  };
}

function applyContextCheckpoints(state, ctx) {
  const next = normalizeState(state);
  let changed = false;
  QUEST_CATALOG.forEach((quest) => {
    const questState = next.quests[quest.id];
    if (!questState || questState.status === 'available') return;
    quest.checkpoints.forEach((checkpoint) => {
      if (!checkpoint.auto || !isCheckpointContextDone(checkpoint, ctx)) return;
      const current = questState.checkpoints[checkpoint.id];
      if (!current?.done) {
        questState.checkpoints[checkpoint.id] = {
          done: true,
          source: 'context',
          completedAt: new Date().toISOString(),
        };
        changed = true;
      }
    });
    if (getQuestStats(quest, next, ctx).complete && questState.status !== 'completed') {
      completeQuest(next, quest, { silent: true });
      changed = true;
    }
  });
  return changed ? next : state;
}

function touchStreak(state) {
  const today = new Date().toISOString().slice(0, 10);
  const streak = state.streak || { count: 0, lastDate: null };
  if (streak.lastDate === today) {
    streak.count = Math.max(1, Number(streak.count || 0));
  } else {
    const last = streak.lastDate ? new Date(streak.lastDate) : null;
    const diff = last ? (new Date(today) - last) : 0;
    streak.count = diff === 86400000 ? Number(streak.count || 0) + 1 : 1;
    streak.lastDate = today;
  }
  state.streak = streak;
}

function addRewardAndHandoff(state, quest) {
  const now = new Date().toISOString();
  const rewardId = `${quest.id}-${quest.reward.type}`;
  if (!state.rewards.some(item => item.id === rewardId)) {
    state.rewards.unshift({
      id: rewardId,
      questId: quest.id,
      label: `${quest.title}: ${quest.reward.label}`,
      target: quest.reward.target,
      type: quest.reward.type,
      points: quest.reward.points,
      status: 'saved',
      createdAt: now,
    });
    state.rewards = state.rewards.slice(0, 12);
  }

  const handoffId = `${quest.id}-${quest.reward.target}-${quest.reward.type}`;
  if (!state.handoffs.some(item => item.id === handoffId)) {
    state.handoffs.unshift({
      id: handoffId,
      questId: quest.id,
      target: quest.reward.target,
      type: quest.reward.type,
      title: quest.reward.handoffTitle,
      status: 'saved',
      createdAt: now,
      meta: {
        pointsPreview: quest.reward.points,
        source: 'storyHub',
      },
    });
    state.handoffs = state.handoffs.slice(0, 20);
  }
}

function startQuest(state, quest) {
  const questState = getQuestState(state, quest.id);
  if (questState.status === 'completed') return state;
  questState.status = 'active';
  questState.startedAt ||= new Date().toISOString();
  state.quests[quest.id] = questState;
  return state;
}

function completeQuest(state, quest, { silent = false } = {}) {
  const questState = getQuestState(state, quest.id);
  if (questState.status === 'completed') return state;
  questState.status = 'completed';
  questState.startedAt ||= new Date().toISOString();
  questState.completedAt = new Date().toISOString();
  quest.checkpoints.forEach((checkpoint) => {
    if (!questState.checkpoints[checkpoint.id]?.done) {
      questState.checkpoints[checkpoint.id] = {
        done: true,
        source: silent ? 'context' : 'manual',
        completedAt: questState.completedAt,
      };
    }
  });
  state.quests[quest.id] = questState;
  addRewardAndHandoff(state, quest);
  touchStreak(state);
  return state;
}

function setCheckpoint(state, quest, checkpointId, done = true) {
  startQuest(state, quest);
  const questState = getQuestState(state, quest.id);
  questState.checkpoints[checkpointId] = {
    done,
    source: 'manual',
    completedAt: done ? new Date().toISOString() : null,
  };
  if (getQuestStats(quest, state, activeContext).complete) completeQuest(state, quest);
  return state;
}

function findNextCheckpoint(quest, state, ctx) {
  const questState = getQuestState(state, quest.id);
  return quest.checkpoints.find(cp => !cp.auto && !isCheckpointDone(questState, cp, ctx)) || null;
}

function targetLabel(target) {
  const map = {
    'pawket-pals': 'Pawket Pals',
    'charm-foundation': 'CHARM',
    community: 'Community',
    legacy: 'Saved progress',
  };
  return map[target] || target || 'Pet Pawket';
}

function questIdsForRoot(root) {
  const raw = root.getAttribute('data-quest-map') || 'account';
  if (QUEST_GROUPS[raw]) return QUEST_GROUPS[raw];
  return raw.split(',').map(s => s.trim()).filter(id => QUEST_BY_ID[id]);
}

function buttonLabel(quest, stats) {
  if (stats.complete) return 'Step complete';
  if (stats.active) return stats.done > 0 ? 'Save next step' : 'Continue';
  return quest.id === 'rescue-walk' ? 'Save step' : 'Start';
}

function renderQuestCard(quest, state, ctx) {
  const questState = getQuestState(state, quest.id);
  const stats = getQuestStats(quest, state, ctx);
  const nextManualCheckpoint = findNextCheckpoint(quest, state, ctx);
  const blockedByAutoCheckpoint = stats.active && !stats.complete && !nextManualCheckpoint;
  const checkpoints = quest.checkpoints.map((checkpoint) => {
    const contextDone = isCheckpointContextDone(checkpoint, ctx);
    const done = isCheckpointDone(questState, checkpoint, ctx);
    const autoLocked = checkpoint.auto && !contextDone;
    const source = contextDone ? 'Saved' : 'Added';
    return `
      <li class="pp-checkpoint${done ? ' is-done' : ''}${contextDone ? ' is-context' : ''}${autoLocked ? ' is-locked' : ''}">
        <button
          type="button"
          class="pp-checkpoint-toggle"
          data-checkpoint-toggle
          data-quest-id="${esc(quest.id)}"
          data-checkpoint-id="${esc(checkpoint.id)}"
          aria-pressed="${done ? 'true' : 'false'}"
          ${contextDone || stats.complete || autoLocked ? 'disabled' : ''}>
          <i class="bi ${done ? 'bi-check2' : autoLocked ? 'bi-lock' : 'bi-circle'}" aria-hidden="true"></i>
          <span>${esc(checkpoint.label)}</span>
        </button>
        <small>${esc(checkpoint.hint)}${done ? ` · ${source}` : autoLocked ? ' · Add account details first' : ''}</small>
      </li>`;
  }).join('');

  return `
    <article class="pp-quest-card${stats.complete ? ' is-complete' : stats.active ? ' is-active' : ''}" data-quest-card="${esc(quest.id)}">
      <div class="pp-quest-card-head">
        <div class="pp-quest-icon"><i class="bi ${esc(quest.icon)}" aria-hidden="true"></i></div>
        <div>
          <span class="pp-quest-eyebrow">${esc(quest.eyebrow)}</span>
          <h3>${esc(quest.title)}</h3>
        </div>
        <span class="pp-quest-target">${esc(targetLabel(quest.reward.target))}</span>
      </div>
      <p>${esc(quest.summary)}</p>
      <div class="pp-quest-progress-wrap">
        <div class="pp-quest-progress-meta">
          <span>${stats.done}/${stats.total} steps</span>
          <span>${stats.percent}%</span>
        </div>
        <div class="pp-quest-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percent}">
          <span style="width:${stats.percent}%"></span>
        </div>
      </div>
      <ul class="pp-checkpoint-list">${checkpoints}</ul>
      <div class="pp-quest-card-actions">
        <button
          class="pp-quest-btn"
          type="button"
          data-quest-toggle
          data-quest-id="${esc(quest.id)}"
          data-quest-label="${esc(buttonLabel(quest, { ...stats, active: false }))}"
          aria-pressed="${stats.complete ? 'true' : 'false'}"
          ${stats.complete || blockedByAutoCheckpoint ? 'disabled' : ''}>
          ${esc(blockedByAutoCheckpoint ? 'Add account details first' : buttonLabel(quest, stats))}
        </button>
        <a class="pp-text-link" href="${esc(quest.cta.href)}">${esc(quest.cta.label)}</a>
      </div>
    </article>`;
}

function renderQuestMaps(state, ctx) {
  document.querySelectorAll('[data-quest-map]').forEach((root) => {
    const ids = questIdsForRoot(root);
    root.innerHTML = ids.map(id => renderQuestCard(QUEST_BY_ID[id], state, ctx)).join('');
  });
}

function renderHandoffPanels(state) {
  const handoffs = Array.isArray(state.handoffs) ? state.handoffs : [];
  document.querySelectorAll('[data-handoff-panel]').forEach((root) => {
    if (!handoffs.length) {
      root.innerHTML = `
        <div class="pp-handoff-empty">
          <strong>Suggested next steps</strong>
          <span>Saved steps can point to private Pals, CHARM, or Community when you choose what to share.</span>
        </div>`;
      return;
    }
    root.innerHTML = `
      <div class="pp-handoff-head">
        <strong>Suggested next steps</strong>
        <span>${handoffs.length} saved</span>
      </div>
      <ul class="pp-handoff-list">
        ${handoffs.slice(0, 5).map(item => `
          <li>
            <span>${esc(targetLabel(item.target))}</span>
            <strong>${esc(item.title)}</strong>
            <small>${esc(item.status === 'queued' ? 'saved' : (item.status || 'saved'))}</small>
          </li>`).join('')}
      </ul>`;
  });
}

function updateQuestButtons(state = activeState, ctx = activeContext) {
  document.querySelectorAll('[data-quest-toggle][data-quest-id]').forEach((btn) => {
    const id = btn.getAttribute('data-quest-id');
    const quest = QUEST_BY_ID[id];
    if (!quest) return;
    const stats = getQuestStats(quest, state, ctx);
    btn.classList.toggle('is-complete', stats.complete);
    btn.classList.toggle('is-active', stats.active && !stats.complete);
    btn.textContent = buttonLabel(quest, stats);
    btn.setAttribute('aria-pressed', String(stats.complete));
    if (stats.complete) btn.setAttribute('disabled', 'disabled');
    else btn.removeAttribute('disabled');
  });
}

function renderQuestSystem(state = activeState, ctx = activeContext) {
  renderQuestMaps(state, ctx);
  renderHandoffPanels(state);
  updateQuestButtons(state, ctx);
}

function setProgressStep(step, { complete = false, active = false, note = '' } = {}) {
  document.querySelectorAll(`[data-account-progress-step="${step}"]`).forEach((el) => {
    el.classList.toggle('is-complete', !!complete);
    el.classList.toggle('is-active', !!active && !complete);
    el.setAttribute('aria-current', active && !complete ? 'step' : 'false');
  });
  document.querySelectorAll(`[data-account-progress-note="${step}"]`).forEach((el) => {
    el.textContent = note;
  });
}

function updateAccountProgressSummary({
  pets = [],
  journalCount = 0,
  coreMemoryCount = 0,
  passCount = 0,
  impact = null,
  completedQuests = 0,
  activeQuests = 0,
  completedCheckpoints = 0,
  totalAccountCheckpoints = 1,
  level = 1,
  signedIn = false,
} = {}) {
  const hasPet = pets.length > 0;
  const hasJournal = Number(journalCount || 0) > 0;
  const hasCoreMemory = Number(coreMemoryCount || 0) > 0;
  const hasQuest = completedQuests > 0 || completedCheckpoints > 0 || activeQuests > 0;
  const hasPass = Number(passCount || 0) > 0;
  const hasImpact = !!impact;

  const steps = [
    {
      id: 'profile',
      complete: hasPet,
      active: signedIn && !hasPet,
      note: hasPet
        ? `${pets.length} pet${pets.length === 1 ? '' : 's'} anchoring recommendations.`
        : signedIn ? 'Add your first pet profile.' : 'Sign in to save pet profiles.',
      next: signedIn ? 'Add your first pet profile.' : 'Sign in and add a pet profile.',
      weight: 20,
    },
    {
      id: 'journal',
      complete: hasJournal,
      active: hasPet && !hasJournal,
      note: hasJournal
        ? `${journalCount} journal entr${journalCount === 1 ? 'y' : 'ies'} saved.`
        : hasPet ? 'Log the first care or story note.' : 'Journals unlock after a pet profile.',
      next: 'Add the first pet journal entry.',
      weight: 20,
    },
    {
      id: 'core',
      complete: hasCoreMemory,
      active: hasJournal && !hasCoreMemory,
      note: hasCoreMemory
        ? `${coreMemoryCount} favorite memor${coreMemoryCount === 1 ? 'y' : 'ies'} marked.`
        : hasJournal ? 'Mark one meaningful memory.' : 'Favorite memories come from journal entries.',
      next: 'Mark a journal entry as a favorite memory.',
      weight: 20,
    },
    {
      id: 'quest',
      complete: completedQuests > 0,
      active: hasCoreMemory && completedQuests === 0,
      note: completedQuests > 0
        ? `${completedQuests} helpful step${completedQuests === 1 ? '' : 's'} saved.`
        : hasQuest ? `${completedCheckpoints}/${totalAccountCheckpoints} account steps ready.`
          : 'Choose a helpful next step.',
      next: activeQuests > 0 || completedCheckpoints > 0 ? 'Finish the next saved step.' : 'Choose a helpful next step.',
      weight: 20,
    },
    {
      id: 'pass',
      complete: hasPass,
      active: completedQuests > 0 && !hasPass,
      note: hasPass
        ? `${passCount} Pawket Pass${passCount === 1 ? '' : 'es'} ready.`
        : 'Passes appear after purchases, gifts, or saved links.',
      next: 'Connect a purchase or Pawket Pass.',
      weight: 10,
    },
    {
      id: 'impact',
      complete: hasImpact,
      active: hasPass && !hasImpact,
      note: hasImpact
        ? `${impact.title || 'CHARM update'} is connected.`
        : 'Impact updates appear when CHARM campaigns are live.',
      next: 'Open the current CHARM update.',
      weight: 10,
    },
  ];

  const readiness = steps.reduce((sum, step) => sum + (step.complete ? step.weight : 0), 0);
  const nextStep = steps.find((step) => !step.complete) || steps[steps.length - 1];
  const title = readiness >= 100
    ? 'Account ready'
    : readiness >= 60
      ? 'Your account is taking shape'
      : readiness >= 20
        ? 'Good start'
        : 'Build your pet-first account';

  steps.forEach((step) => {
    setProgressStep(step.id, {
      complete: step.complete,
      active: step.id === nextStep.id,
      note: step.note,
    });
  });

  document.querySelectorAll('[data-account-progress-score]').forEach((el) => {
    el.textContent = `${readiness}%`;
  });
  document.querySelectorAll('[data-account-progress-level]').forEach((el) => {
    el.textContent = `Progress step ${level}`;
  });
  document.querySelectorAll('[data-account-progress-title]').forEach((el) => {
    el.textContent = title;
  });
  document.querySelectorAll('[data-account-progress-copy]').forEach((el) => {
    el.textContent = hasPet
      ? 'Your saved pet details, journals, and passes make the account more useful.'
      : 'Add a pet profile, then save journals and favorite memories as you go.';
  });
  document.querySelectorAll('[data-account-next-action]').forEach((el) => {
    el.textContent = nextStep?.next || 'Keep your pet details up to date.';
  });
  document.querySelectorAll('.account-progress-ring').forEach((el) => {
    el.style.setProperty('--account-progress', `${readiness}%`);
  });

  return {
    readiness,
    title,
    nextStep,
    steps,
    hasPet,
    hasJournal,
    hasCoreMemory,
    hasQuest,
    hasPass,
    hasImpact,
  };
}

function formatStoryDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function setStoryContextStep(step, { complete = false, active = false } = {}) {
  document.querySelectorAll(`[data-story-context-step="${step}"]`).forEach((el) => {
    el.classList.toggle('is-complete', !!complete);
    el.classList.toggle('is-active', !!active && !complete);
  });
}

function updateStoryContextPanel({
  progress,
  pets = [],
  journalCount = 0,
  coreMemoryCount = 0,
  passCount = 0,
  impact = null,
  completedQuests = 0,
  activeQuests = 0,
  completedCheckpoints = 0,
  trailSignals = 0,
  signedIn = false,
  ctx = activeContext,
} = {}) {
  const readiness = Number(progress?.readiness || 0);
  const hasPet = pets.length > 0;
  const hasJournal = Number(journalCount || 0) > 0;
  const hasCoreMemory = Number(coreMemoryCount || 0) > 0;
  const hasQuest = completedQuests > 0 || activeQuests > 0 || completedCheckpoints > 0;
  const latestTitle = ctx?.latestJournalTitle || '';
  const latestDate = formatStoryDate(ctx?.latestJournalDate);
  const latestCore = ctx?.latestCoreMemoryTitle || '';
  const handoffTargets = Array.isArray(ctx?.journalHandoffTargets) ? ctx.journalHandoffTargets : [];
  const totalHandoffs = (activeState.handoffs?.length || 0) + handoffTargets.length;

  let title = "Build your pet's story.";
  let copy = 'Profiles, journals, favorite memories, and passes help keep care and meaningful moments organized.';
  let next = signedIn ? 'Add your first pet profile.' : 'Sign in and add a pet profile.';
  let stage = signedIn ? 'Account overview' : 'Sign in';

  if (hasPet && !hasJournal) {
    title = 'Profile ready. Add the first note.';
    copy = `${pets[0]?.name || 'Your pet'} can now anchor journals, Pawket Pack fit, and better recommendations.`;
    next = 'Open the pet journal and save a care or story moment.';
  } else if (hasJournal && !hasCoreMemory) {
    title = 'Journal started.';
    copy = latestTitle
      ? `Latest moment: ${latestTitle}${latestDate ? ` (${latestDate})` : ''}. Mark one meaningful entry as a favorite memory when ready.`
      : 'Journal moments are now saved to this account.';
    next = 'Mark one journal entry as a favorite memory.';
  } else if (hasCoreMemory && !hasQuest) {
    title = 'Favorite memory saved.';
    copy = latestCore
      ? `${latestCore} is saved as a meaningful moment for this pet.`
      : 'A meaningful journal entry is now marked as a favorite memory.';
    next = 'Choose a suggested next step.';
  } else if (hasQuest && completedQuests === 0) {
    title = 'Next steps are in progress.';
    copy = `${completedCheckpoints} step${completedCheckpoints === 1 ? '' : 's'} saved. Finish the next one when it is useful.`;
    next = 'Complete the next active step.';
  } else if (completedQuests > 0) {
    title = 'Helpful steps saved.';
    copy = `${completedQuests} suggested step${completedQuests === 1 ? '' : 's'} completed for this account.`;
    next = passCount > 0 || impact ? 'Open Pawket Passes and CHARM updates.' : 'Connect a purchase, pass, or CHARM update next.';
    stage = 'In progress';
  }

  if (readiness >= 100) {
    stage = 'Ready';
    next = 'Review your saved pets, journals, passes, and CHARM updates.';
  }

  document.querySelectorAll('[data-story-stage-pill]').forEach((el) => {
    el.textContent = stage;
    el.dataset.stage = stage.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  });
  document.querySelectorAll('[data-story-context-title]').forEach((el) => {
    el.textContent = title;
  });
  document.querySelectorAll('[data-story-context-copy]').forEach((el) => {
    el.textContent = copy;
  });
  document.querySelectorAll('[data-story-context-next]').forEach((el) => {
    el.textContent = next;
  });
  document.querySelectorAll('[data-story-context-pets]').forEach((el) => {
    el.textContent = String(pets.length || 0);
  });
  document.querySelectorAll('[data-story-context-journals]').forEach((el) => {
    el.textContent = String(journalCount || 0);
  });
  document.querySelectorAll('[data-story-context-core]').forEach((el) => {
    el.textContent = String(coreMemoryCount || 0);
  });
  document.querySelectorAll('[data-story-context-handoffs]').forEach((el) => {
    el.textContent = String(totalHandoffs || 0);
  });
  document.querySelectorAll('[data-story-context-panel]').forEach((el) => {
    el.dataset.readiness = String(readiness);
    el.dataset.trailSignals = String(trailSignals || 0);
  });

  setStoryContextStep('profile', { complete: hasPet, active: signedIn && !hasPet });
  setStoryContextStep('journal', { complete: hasJournal, active: hasPet && !hasJournal });
  setStoryContextStep('core', { complete: hasCoreMemory, active: hasJournal && !hasCoreMemory });
  setStoryContextStep('quest', { complete: completedQuests > 0, active: hasCoreMemory && completedQuests === 0 });
}

function updateStoryStats({ state, pets = [], passCount = 0, impact = null, signedIn = false, stories = [], journalCount = 0, coreMemoryCount = 0 }) {
  const questStats = QUEST_CATALOG.map(quest => getQuestStats(quest, state, activeContext));
  const completedQuests = questStats.filter(stats => stats.complete).length;
  const activeQuests = questStats.filter(stats => stats.active && !stats.complete).length;
  const completedCheckpoints = questStats.reduce((sum, stats) => sum + stats.done, 0);
  const accountQuestStats = QUEST_GROUPS.account.map(id => getQuestStats(QUEST_BY_ID[id], state, activeContext));
  const accountCheckpoints = accountQuestStats.reduce((sum, stats) => sum + stats.done, 0);
  const totalAccountCheckpoints = accountQuestStats.reduce((sum, stats) => sum + stats.total, 0);
  const careMoments = Math.max(0, Number(journalCount || 0));
  const trailSignals = Math.max(0, pets.length + journalCount + coreMemoryCount + passCount + completedCheckpoints);
  const progressPct = Math.min(100, Math.round((completedCheckpoints / Math.max(1, QUEST_CATALOG.length * 3)) * 100));
  const xp = Math.max(0, pets.length * 10 + journalCount * 8 + passCount * 20 + completedCheckpoints * 15 + completedQuests * 40);
  const level = Math.max(1, Math.floor(xp / 120) + 1);
  const nextReward = xp >= 240 ? 'Pawket Pass' : xp >= 120 ? 'CHARM update' : 'Helpful note';
  const rewards = Array.isArray(state.rewards) ? state.rewards : [];
  const accountSignedIn = signedIn || lastSignedIn;

  document.querySelectorAll('[data-story-pets-count]').forEach((el) => {
    el.textContent = String(pets.length || 0);
  });
  document.querySelectorAll('[data-story-pass-count]').forEach((el) => {
    if (el.tagName === 'STRONG') {
      el.textContent = signedIn ? String(passCount) : '0';
    } else {
      el.textContent = signedIn ? `${passCount} Pawket Pass${passCount === 1 ? '' : 'es'}` : 'Sign in for passes';
    }
  });
  document.querySelectorAll('[data-story-care-count]').forEach((el) => {
    el.textContent = String(careMoments);
  });
  document.querySelectorAll('[data-story-progress-bar]').forEach((el) => {
    el.style.width = `${progressPct}%`;
  });
  document.querySelectorAll('[data-story-xp]').forEach((el) => {
    el.textContent = String(xp);
  });
  document.querySelectorAll('[data-story-level]').forEach((el) => {
    el.textContent = String(level);
  });
  document.querySelectorAll('[data-story-next-reward]').forEach((el) => {
    el.textContent = nextReward;
  });
  document.querySelectorAll('[data-story-streak]').forEach((el) => {
    el.textContent = String(state.streak?.count || 0);
  });

  const progressSummary = updateAccountProgressSummary({
    pets,
    journalCount,
    coreMemoryCount,
    passCount,
    impact,
    completedQuests,
    activeQuests,
    completedCheckpoints: accountCheckpoints,
    totalAccountCheckpoints,
    level,
    signedIn: accountSignedIn,
  });
  updateStoryContextPanel({
    progress: progressSummary,
    pets,
    journalCount,
    coreMemoryCount,
    passCount,
    impact,
    completedQuests,
    activeQuests,
    completedCheckpoints,
    trailSignals,
    signedIn: accountSignedIn,
    ctx: activeContext,
    state,
  });

  const rewardsList = document.querySelector('[data-story-rewards]');
  if (rewardsList) {
    rewardsList.innerHTML = rewards.length
      ? rewards.slice(0, 6).map(item => `<li>${esc(item.label)} · ${esc(targetLabel(item.target))}</li>`).join('')
      : '<li>Save your first suggested step to start activity here.</li>';
  }
  document.querySelectorAll('[data-story-reward]').forEach((el) => {
    el.textContent = completedQuests > 0 ? `${completedQuests} helpful step${completedQuests === 1 ? '' : 's'} saved` : 'Next: add a helpful note';
  });

  const firstPetName = pets?.[0]?.name;
  const palNameEl = document.querySelector('[data-story-pal-name]');
  const palCopyEl = document.querySelector('[data-story-pal-copy]');
  if (palNameEl) {
    palNameEl.textContent = firstPetName
      ? `${firstPetName}'s private Pal`
      : 'Create a private Pal';
  }
  if (palCopyEl) {
    palCopyEl.textContent = firstPetName
      ? `Pawket Pals can connect to ${firstPetName}'s saved story privately first. Public sharing happens only when you choose it.`
      : 'Pawket Pals can begin from saved stories and favorite moments. Private journals stay private unless you choose otherwise.';
  }

  if (impact) {
    const funded = Number(impact.fundedAmount || 0);
    const goal = Number(impact.goalAmount || 0);
    const pct = percent(impact.progressPct);
    document.querySelectorAll('[data-story-impact-title]').forEach((el) => {
      el.textContent = impact.title || 'CHARM update in motion';
    });
    document.querySelectorAll('[data-story-impact-meta]').forEach((el) => {
      el.textContent = goal
        ? `${money(funded, impact.currency)} of ${money(goal, impact.currency)} funded`
        : 'CHARM update coming into view';
    });
    document.querySelectorAll('[data-story-impact-funded]').forEach((el) => {
      el.textContent = money(funded, impact.currency);
    });
    document.querySelectorAll('[data-story-impact-progress]').forEach((el) => {
      el.style.width = `${pct}%`;
    });
    document.querySelectorAll('[data-story-impact-percent]').forEach((el) => {
      el.textContent = `${pct}%`;
    });
  }

  if (stories.length) {
    const cards = document.querySelectorAll('[data-story-card]');
    cards.forEach((card, idx) => {
      if (stories.length === 1 && idx > 0) return;
      const story = stories[idx % stories.length];
      const title = story?.title || story?.petName || 'Rescue story';
      const body = story?.body || 'Rescue story coming into view.';
      card.querySelector('[data-story-card-title]')?.replaceChildren(document.createTextNode(title));
      card.querySelector('[data-story-card-body]')?.replaceChildren(document.createTextNode(body));
      const kicker = story?.petName ? `Featuring ${story.petName}` : 'Rescue spotlight';
      card.querySelector('[data-story-card-kicker]')?.replaceChildren(document.createTextNode(kicker));
    });

    const palCards = document.querySelectorAll('[data-story-pal-card]');
    palCards.forEach((card, idx) => {
      const story = stories[idx % stories.length];
      const name = story?.petName || story?.title || 'Pawket Pal';
      const body = story?.body || 'Rescue story coming into view.';
      card.querySelector('[data-story-pal-title]')?.replaceChildren(document.createTextNode(name));
      card.querySelector('[data-story-pal-body]')?.replaceChildren(document.createTextNode(body));
    });
  }
}

async function loadStoryData({ preferRemote = true, saveContext = false } = {}) {
  const session = await getSession({ force: false });
  lastSignedIn = !!session?.signedIn;

  let state = readLocalState();
  if (preferRemote && lastSignedIn) {
    const remote = await fetchRemoteState();
    if (remote) state = mergeState(state, remote);
  }

  const [pets, impact, loopState, stories] = await Promise.all([
    fetchPets(session),
    fetchImpact(),
    getLoopAvailability(),
    fetchStories(6),
  ]);
  const summary = loopState?.summary;
  const passCount = countAvailablePasses(summary);
  const signedIn = loopState?.ok && !!summary;
  const journalMetrics = await fetchJournalMetrics(pets);

  activeContext = {
    pets,
    passCount,
    impact,
    stories,
    signedIn,
    journalCount: journalMetrics.journalCount,
    coreMemoryCount: journalMetrics.coreMemoryCount,
    journalHandoffTargets: journalMetrics.journalHandoffTargets,
    latestJournalTitle: journalMetrics.latestJournalTitle,
    latestJournalDate: journalMetrics.latestJournalDate,
    latestCoreMemoryTitle: journalMetrics.latestCoreMemoryTitle,
  };
  const contextState = applyContextCheckpoints(state, activeContext);
  activeState = normalizeState(contextState);
  saveLocalState(activeState);

  if (saveContext && lastSignedIn && contextState !== state) {
    persistState(activeState, { remote: true });
  } else {
    renderQuestSystem(activeState, activeContext);
    setSyncStatus(lastSignedIn ? 'Saved' : 'Saved here');
  }

  updateStoryStats({
    state: activeState,
    pets,
    passCount,
    impact,
    signedIn,
    stories,
    ...journalMetrics,
  });
}

function wireQuestToggles() {
  document.addEventListener('click', (e) => {
    const checkpointBtn = e.target.closest('[data-checkpoint-toggle][data-quest-id][data-checkpoint-id]');
    if (checkpointBtn) {
      const quest = QUEST_BY_ID[checkpointBtn.getAttribute('data-quest-id')];
      const checkpointId = checkpointBtn.getAttribute('data-checkpoint-id');
      if (!quest || !checkpointId) return;
      const state = normalizeState(activeState);
      setCheckpoint(state, quest, checkpointId, true);
      persistState(state);
      updateStoryStats({ state: activeState, ...activeContext });
      return;
    }

    const questBtn = e.target.closest('[data-quest-toggle][data-quest-id]');
    if (!questBtn) return;
    const quest = QUEST_BY_ID[questBtn.getAttribute('data-quest-id')];
    if (!quest) return;
    const state = normalizeState(activeState);
    const stats = getQuestStats(quest, state, activeContext);
    if (stats.complete) return;
    if (!stats.active) {
      startQuest(state, quest);
    } else {
      const nextCheckpoint = findNextCheckpoint(quest, state, activeContext);
      if (nextCheckpoint) setCheckpoint(state, quest, nextCheckpoint.id, true);
    }
    persistState(state);
    updateStoryStats({ state: activeState, ...activeContext });
  });
}

export function initStoryHub() {
  if (started) return;
  started = true;
  activeState = readLocalState();
  renderQuestSystem(activeState, activeContext);
  wireQuestToggles();
  loadStoryData();
  document.addEventListener('pp:loop:summary', () => loadStoryData({ saveContext: true }));
  document.addEventListener('pp:story:refresh', () => loadStoryData({ saveContext: true }));
  document.addEventListener('auth:login', () => loadStoryData({ preferRemote: true, saveContext: true }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initStoryHub(), { once: true });
} else {
  initStoryHub();
}
