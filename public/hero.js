// hero.js - module version
import { createWidgetAppSdk } from './widgetAppSdk.js';
import {
  createPawketAppHost,
  createPawketAppRegistry,
  createScopedAppDataBridge
} from './pawketAppRuntime.js';
import {
  firstPartyPawketApps,
  pawketConnectorProviders
} from './pawketFirstPartyApps.js';
import { getSession } from './auth.js';

const defaultHeroChips = [
  { icon: 'bi-bag-heart', label: 'Everyday care', tooltip: 'Useful products for real pet routines.' },
  { icon: 'bi-person-heart', label: 'Pet profiles', tooltip: 'Save the little details that help care feel personal.' },
  { icon: 'bi-stars', label: 'Pals & passes', tooltip: 'Make keepsakes, send gifts, and share the love.' }
];

const defaultFeaturedArticles = [
  { title: 'Browse sale-ready Pet Pawket products', href: '/shop.html', tag: 'Shop' },
  { title: 'Meet Pawket Pals', href: '/pals.html', tag: 'Pals' },
  { title: 'Open Pawket Passes', href: '/loop.html', tag: 'Passes' }
];

const slidesData = [
  {
    background: "/assets/images/huey-herobg1-cutout.png",
    layout: { align: 'left', variant: 'story' },
    headline: "Where Every Pet Story Begins Again",
    subtext: "Shop for your pet, save the moments that matter, and share the love when you are ready.",
    button: { text: "Shop Pet Pawket", link: "/shop.html", visible: true, tooltip: "Browse sale-ready Pet Pawket products." },
    secondaryCta: { text: "Meet Pals", link: "/pals.html", tooltip: "Open Pawket Pals." },
    chips: [
      { icon: 'bi-bag-heart', label: 'Everyday care', tooltip: 'Useful products for real pet routines.' },
      { icon: 'bi-stars', label: 'Pals & passes', tooltip: 'Make keepsakes, send gifts, and share the love.' }
    ],
    proofLine: "Shop, boxes, Pals, Passes, and CHARM.",
    visual: {
      type: "story",
      badge: "NEW STORY",
      watermark: "PAWKET",
      assets: [
        { src: "/assets/images/HeroBG1.png", alt: "Pet Pawket mascot", label: "Mascot spotlight", tone: "sun" },
        { src: "/assets/images/pet-dog.png", alt: "Rescue dog story", label: "Rescue pup", tone: "sky" },
        { src: "/assets/images/pet-cat.png", alt: "Rescue cat story", label: "Rescue cat", tone: "mint" }
      ],
      microcopy: "A sweet place for pet memories, gifts, and care."
    },
    panel: {
      layoutStyle: 'story',
      mode: 'store',
      headline: 'Start here',
      subhead: 'Shop, save, share.',
      rescue: {
        kicker: 'Start here',
        title: "Care that feels personal",
        body: 'Start with useful products, then add your pet profile, a Pal keepsake, or a Pawket Pass when it fits.',
        image: '/assets/images/banner-1.jpg',
        href: '/shop.html',
        cta: 'Open shop'
      },
      routes: [
        { icon: 'bi-bag-heart', label: 'All products', meta: 'Core shelf', href: '/shop.html' },
        { icon: 'bi-person-heart', label: 'Pet profile', meta: 'Save details', href: '/account.html#account-pets' },
        { icon: 'bi-stars', label: 'Pawket Pals', meta: 'Keepsakes', href: '/pals.html' }
      ],
      tiles: [
        { src: '/assets/images/DogBowlFilled.png', alt: 'Filled pet bowl', label: 'Products' },
        { src: '/assets/images/CarePocket.png', alt: 'Pawket Pack box', label: 'Boxes', fit: 'contain' },
        { src: '/assets/images/journal.png', alt: 'Pet care journal', label: 'Profile', fit: 'contain' }
      ],
      articles: [
        { title: 'Browse all Pet Pawket products', href: '/shop.html', tag: 'Shop' },
        { title: 'Meet Pawket Pals', href: '/pals.html', tag: 'Pals' },
        { title: 'Open Pawket Passes', href: '/loop.html', tag: 'Passes' }
      ],
      spotlight: {
        label: 'Pet Pawket family',
        text: 'A pet profile can make shopping easier and help special memories become Pals, Passes, or CHARM kindness later.',
        href: '/pals.html',
        cta: 'Meet Pals'
      },
      feed: [
        { title: 'Shop page stays the primary sales surface', href: '/shop.html', tag: 'Store' },
        { title: 'Pawket Pals turn memories into keepsakes', href: '/pals.html', tag: 'Pals' },
        { title: 'Pet Pawket keeps private stories private', href: '/about.html', tag: 'Brand' }
      ],
      quickActions: [
        { text: 'Shop products', href: '/shop.html' },
        { text: 'Meet Pals', href: '/pals.html' }
      ],
      metrics: [
        { value: 'Shop', label: 'Core shelf' },
        { value: 'Pals', label: 'Keepsakes' },
        { value: 'Passes', label: 'Gift links' }
      ],
      heroStat: { value: 'Live', label: 'Ways to start' }
    }
  },
  {
    background: "#FFA625",
    layout: { align: 'center', variant: 'promo' },
    headline: "Top Picks of the Week",
    subtext: "",
    button: { text: "Shop Now", link: "/shop.html", visible: true, tooltip: "Browse this week's top picks." },
    secondaryCta: { text: "See Packs", link: "/packs.html", tooltip: "Compare Pawket Pack tiers and editions." },
    chips: defaultHeroChips,
    proofLine: "",
    visual: {
      type: "packs",
      badge: "SEASONAL",
      watermark: "PACKS",
      assets: [
        { src: "/assets/images/CarePocket.png", alt: "Pawket Pack box and goodies", label: "Pawket Pack", tone: "sun", fit: "contain" },
        { src: "/assets/images/DogBowlFilled.png", alt: "Pet bowl item", label: "Care item", tone: "mint", fit: "contain" },
        { src: "/assets/images/pet-dog.png", alt: "Pet care pick", label: "Pet care", tone: "sky", fit: "contain" }
      ],
      microcopy: "This week’s picks rotate with pets, seasons, and useful care."
    },
    panel: {
      layoutStyle: 'promo',
      mode: 'boxes',
      headline: 'Boxes',
      subhead: 'Packs, Packets, and Picks.',
      rescue: {
        kicker: 'Pack spotlight',
        title: 'Packs',
        body: 'Start with a full box, try a smaller Packet, or browse bonus Picks.',
        image: '/assets/images/CarePocket.png',
        href: '/packs.html',
        cta: 'Compare pack tiers'
      },
      routes: [
        { icon: 'bi-box-seam', label: 'Pawket Packs', meta: 'Full boxes', href: '/packs.html' },
        { icon: 'bi-envelope-heart', label: 'Packets', meta: 'Small trials', href: '/packets.html' },
        { icon: 'bi-stars', label: 'Picks', meta: 'Bonuses', href: '/picks.html' }
      ],
      tiles: [
        { src: '/assets/images/CarePocket.png', alt: 'Pawket Pack box', label: 'Packs', fit: 'contain' },
        { src: '/assets/images/DogBowlFilled.png', alt: 'Pet care bowl item', label: 'Packets', fit: 'contain' },
        { src: '/assets/images/journal.png', alt: 'Pet care journal item', label: 'Picks', fit: 'contain' }
      ],
      articles: [
        { title: 'What goes into a Standard Pack', href: '/packs.html', tag: 'Packs' },
        { title: 'Choosing Deluxe vs Collector', href: '/packs.html', tag: 'Guide' },
        { title: 'Trying Pawket Packets first', href: '/packets.html', tag: 'Packets' }
      ],
      spotlight: {
        label: 'Featured bundle',
        text: 'This week’s Picks include care essentials, enrichment toys, and rescue-linked add-ons.',
        href: '/shop.html',
        cta: 'Shop featured'
      },
      feed: [
        { title: 'Compare Standard, Deluxe, and Collector Packs', href: '/packs.html', tag: 'Packs' },
        { title: 'Try a smaller Pawket Packet first', href: '/packets.html', tag: 'Packets' },
        { title: 'Find seasonal bonus Picks', href: '/picks.html', tag: 'Picks' }
      ],
      quickActions: [
        { text: 'Compare packs', href: '/packs.html' },
        { text: 'Try packets', href: '/packets.html' }
      ],
      metrics: [
        { value: 'Packs', label: 'Full boxes' },
        { value: 'Packets', label: 'Small boxes' },
        { value: 'Picks', label: 'Bonus shelf' }
      ],
      heroStat: { value: '3', label: 'Ways to box' }
    }
  }
];

function heroEsc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateWords(value, maxWords = 16) {
  const text = String(value || '').trim();
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function toPanelText(value, maxWords = 16) {
  return heroEsc(truncateWords(value, maxWords));
}

function normalizeToneClass(tone = '') {
  const token = String(tone || '').toLowerCase().trim();
  if (!token) return '';
  if (!/^[a-z0-9-]+$/.test(token)) return '';
  return `tone-${token}`;
}

function normalizePanelTheme(slide = {}) {
  const requested = String(slide.panel?.layoutStyle || slide.layout?.variant || 'story').toLowerCase();
  if (['story', 'promo', 'impact', 'launch'].includes(requested)) return requested;
  return 'story';
}

function normalizePanelFeed(panel = {}) {
  const list = Array.isArray(panel.feed) ? panel.feed : [];
  return list.slice(0, 2);
}

function normalizeQuickActions(panel = {}) {
  const quickActions = Array.isArray(panel.quickActions) ? panel.quickActions : [];
  return quickActions
    .filter((action) => action && action.text)
    .slice(0, 2);
}

function renderContextPattern(theme = 'story') {
  const recipe = {
    story: [
      { shape: 'paw', x: '7%', y: '14%', size: '88px', rot: '-14deg', alpha: '.058' },
      { shape: 'heart', x: '27%', y: '6%', size: '64px', rot: '6deg', alpha: '.05' },
      { shape: 'clover', x: '57%', y: '10%', size: '82px', rot: '4deg', alpha: '.05' },
      { shape: 'star', x: '88%', y: '16%', size: '52px', rot: '-6deg', alpha: '.05' },
      { shape: 'bone', x: '16%', y: '78%', size: '110px', rot: '-8deg', alpha: '.045' },
      { shape: 'paw', x: '48%', y: '84%', size: '92px', rot: '8deg', alpha: '.042' },
      { shape: 'heart', x: '82%', y: '72%', size: '70px', rot: '-10deg', alpha: '.042' }
    ],
    promo: [
      { shape: 'bone', x: '8%', y: '12%', size: '112px', rot: '-10deg', alpha: '.054' },
      { shape: 'paw', x: '25%', y: '8%', size: '74px', rot: '2deg', alpha: '.05' },
      { shape: 'star', x: '52%', y: '12%', size: '58px', rot: '8deg', alpha: '.046' },
      { shape: 'clover', x: '86%', y: '18%', size: '88px', rot: '-5deg', alpha: '.045' },
      { shape: 'heart', x: '15%', y: '74%', size: '76px', rot: '-16deg', alpha: '.044' },
      { shape: 'paw', x: '44%', y: '84%', size: '90px', rot: '12deg', alpha: '.04' },
      { shape: 'bone', x: '79%', y: '78%', size: '102px', rot: '10deg', alpha: '.04' }
    ],
    impact: [
      { shape: 'heart', x: '9%', y: '10%', size: '78px', rot: '-8deg', alpha: '.054' },
      { shape: 'star', x: '29%', y: '12%', size: '54px', rot: '8deg', alpha: '.05' },
      { shape: 'paw', x: '59%', y: '8%', size: '82px', rot: '-4deg', alpha: '.048' },
      { shape: 'clover', x: '86%', y: '16%', size: '84px', rot: '6deg', alpha: '.045' },
      { shape: 'bone', x: '18%', y: '72%', size: '112px', rot: '10deg', alpha: '.044' },
      { shape: 'heart', x: '50%', y: '84%', size: '74px', rot: '-9deg', alpha: '.042' },
      { shape: 'paw', x: '80%', y: '76%', size: '92px', rot: '4deg', alpha: '.04' }
    ],
    launch: [
      { shape: 'star', x: '8%', y: '12%', size: '58px', rot: '-12deg', alpha: '.055' },
      { shape: 'paw', x: '28%', y: '8%', size: '82px', rot: '4deg', alpha: '.05' },
      { shape: 'heart', x: '58%', y: '10%', size: '74px', rot: '-6deg', alpha: '.047' },
      { shape: 'clover', x: '84%', y: '16%', size: '92px', rot: '8deg', alpha: '.046' },
      { shape: 'bone', x: '16%', y: '76%', size: '106px', rot: '-8deg', alpha: '.042' },
      { shape: 'star', x: '50%', y: '84%', size: '62px', rot: '6deg', alpha: '.04' },
      { shape: 'paw', x: '82%', y: '74%', size: '86px', rot: '-4deg', alpha: '.04' }
    ]
  };
  const set = recipe[theme] || recipe.story;
  return `
    <div class="hero-context-pattern" data-context-theme="${heroEsc(theme)}" aria-hidden="true">
      ${set.map((shape, index) => `
        <span
          class="hero-context-shape"
          data-shape="${heroEsc(shape.shape)}"
          data-shape-index="${index}"
          style="--mx:${heroEsc(shape.x)};--my:${heroEsc(shape.y)};--ms:${heroEsc(shape.size)};--mr:${heroEsc(shape.rot)};--mo:${heroEsc(shape.alpha)};"
        ></span>
      `).join('')}
    </div>
  `;
}

function renderHeroChips(chips = []) {
  const list = Array.isArray(chips) && chips.length ? chips : defaultHeroChips;
  return list.map((chip, index) => `
    <span class="hero-chip" data-hero-chip data-chip-index="${index}" data-tooltip="${heroEsc(chip.tooltip || chip.label || 'Hero feature')}">
      <i class="bi ${heroEsc(chip.icon || 'bi-stars')}" aria-hidden="true"></i>
      <span>${heroEsc(chip.label || 'Feature')}</span>
    </span>
  `).join('');
}

function renderHeroAction(action = {}, className = '') {
  const text = heroEsc(action.text || 'Explore');
  const href = String(action.link || '').trim();
  const tooltip = heroEsc(action.tooltip || text);
  const classes = `hero-button ${className}`.trim();
  if (!href || href === '#') {
    return `<button class="${classes}" type="button" data-tooltip="${tooltip}">${text}</button>`;
  }
  return `<a class="${classes}" href="${heroEsc(href)}" data-tooltip="${tooltip}">${text}</a>`;
}

function renderHeroAsideCard(asset = {}, options = {}) {
  const compact = !!options.compact;
  const srcValue = String(asset.src || '');
  const explicitContain = String(asset.fit || '').toLowerCase() === 'contain';
  const inferredContain = /\.svg(?:[?#]|$)/i.test(srcValue);
  const fitClass = explicitContain || inferredContain ? 'is-contain' : '';
  const src = heroEsc(asset.src || '/assets/images/placeholder.png');
  const alt = heroEsc(asset.alt || asset.label || 'Pet Pawket visual');
  const tone = heroEsc(asset.tone || 'sky');
  const label = asset.label ? `<span class="hero-opposite-label">${heroEsc(asset.label)}</span>` : '';
  return `
    <article class="hero-opposite-card ${compact ? 'is-compact' : ''} ${fitClass}" data-tone="${tone}">
      <span class="hero-opposite-fallback" aria-hidden="true">${heroEsc(asset.label || 'Pet Pawket')}</span>
      <img src="${src}" alt="${alt}" loading="lazy" decoding="async" onerror="this.closest('.hero-opposite-card')?.classList.add('is-fallback'); this.remove();">
      ${label}
    </article>
  `;
}

function renderPromoStageItem(asset = {}, slot = 'left', fallbackLabel = 'Pack item') {
  const src = heroEsc(asset.src || '/assets/images/placeholder.png');
  const alt = heroEsc(asset.alt || asset.label || fallbackLabel);
  const label = asset.label ? `<figcaption>${heroEsc(asset.label)}</figcaption>` : '';
  const tone = heroEsc(String(asset.tone || 'sky').toLowerCase());
  const slotClass = heroEsc(String(slot || 'left').toLowerCase());
  return `
    <figure class="hero-promo-item hero-promo-item--${slotClass}" data-tone="${tone}">
      <span class="hero-promo-item-fallback" aria-hidden="true">${heroEsc(asset.label || fallbackLabel)}</span>
      <img src="${src}" alt="${alt}" loading="lazy" decoding="async" onerror="this.closest('.hero-promo-item')?.classList.add('is-fallback'); this.remove();">
      ${label}
    </figure>
  `;
}

function renderPromoCenterShowcase(visual = {}) {
  const assets = Array.isArray(visual.assets) ? visual.assets : [];
  if (!assets.length) return '';
  const center = assets[0];
  const left = assets[1] || center;
  const right = assets[2] || assets[1] || center;
  return `
    <div class="hero-promo-stage" data-hero-showcase>
      ${renderPromoStageItem(left, 'left', 'Care item')}
      ${renderPromoStageItem(center, 'center', 'Pack spotlight')}
      ${renderPromoStageItem(right, 'right', 'Drop item')}
    </div>
  `;
}

function renderHeroOpposingMedia(slide = {}, align = 'left') {
  const variant = slide.layout?.variant || 'default';
  if (variant === 'story') return '';

  const assets = Array.isArray(slide.visual?.assets) ? slide.visual.assets : [];
  if (!assets.length) return '';

  const primary = assets[0] || {};
  const secondary = assets[1] || primary;
  const tertiary = assets[2] || secondary;

  if (align === 'center') {
    return `
      <aside class="hero-opposite hero-opposite--left">
        ${renderHeroAsideCard(secondary, { compact: true })}
      </aside>
      <aside class="hero-opposite hero-opposite--right">
        ${renderHeroAsideCard(tertiary, { compact: true })}
      </aside>
    `;
  }

  const sideClass = align === 'right' ? 'left' : 'right';
  return `
    <aside class="hero-opposite hero-opposite--${sideClass}">
      ${renderHeroAsideCard(primary)}
      ${renderHeroAsideCard(secondary, { compact: true })}
    </aside>
  `;
}

function isHeroImageBackground(value = '') {
  const src = String(value || '').trim();
  return Boolean(src && !src.startsWith('#'));
}

function renderHeroSlideArt(slide = {}) {
  const src = String(slide.background || '').trim();
  if (!isHeroImageBackground(src)) return '';
  return `
    <div class="hero-slide-art" aria-hidden="true">
      <img src="${heroEsc(src)}" alt="" loading="eager" decoding="async" />
    </div>
  `;
}

function renderHeroSlideContent(slide = {}) {
  const btnTooltip = slide.button?.tooltip || `Open: ${slide.button?.text || 'featured action'}`;
  const visual = slide.visual || {};
  const secondary = slide.secondaryCta?.text ? renderHeroAction(slide.secondaryCta, 'hero-button--ghost') : '';
  const kicker = visual.badge || 'Featured';
  const watermark = visual.watermark ? `<span class="hero-watermark">${heroEsc(visual.watermark)}</span>` : '';
  const align = ['left', 'center', 'right'].includes(slide.layout?.align) ? slide.layout.align : 'left';
  const variantKey = slide.layout?.variant || 'default';
  const variant = heroEsc(variantKey);
  const copyClass = `hero-slide-copy hero-slide-copy--${align}`;
  const usePromoShowcase = variantKey === 'promo' && align === 'center';
  const promoShowcase = usePromoShowcase ? renderPromoCenterShowcase(visual) : '';
  const oppositeMedia = usePromoShowcase ? '' : renderHeroOpposingMedia(slide, align);
  const hasOppositeMedia = oppositeMedia.trim().length > 0;
  const contentClass = `hero-slide-content${hasOppositeMedia ? ' has-opposite' : ''}`;
  const copyMarkup = `
      ${watermark}
      <span class="hero-info-kicker">${heroEsc(kicker)}</span>
      <h1>${heroEsc(slide.headline || 'Pet Pawket')}</h1>
      ${slide.subtext ? `<p>${heroEsc(slide.subtext)}</p>` : ""}
      <div class="hero-cta-row">
        ${slide.button?.visible ? renderHeroAction({ ...slide.button, tooltip: btnTooltip }) : ""}
        ${secondary}
      </div>
      <div class="hero-chip-row">
        ${renderHeroChips(slide.chips)}
      </div>
      ${slide.proofLine ? `<p class="hero-proof" data-hero-proof>${heroEsc(slide.proofLine)}</p>` : ""}
  `;

  if (usePromoShowcase) {
    return `
      <div class="${contentClass} hero-promo-layout" data-hero-layout="carousel-slide" data-slide-type="${variant}" data-slide-align="${align}" data-hero-surface>
        <div class="${copyClass} hero-promo-lane hero-promo-lane--top">
          ${copyMarkup}
        </div>
        <div class="hero-promo-lane hero-promo-lane--bottom" data-hero-media-lane>
          ${promoShowcase}
        </div>
      </div>
    `;
  }

  return `
    <div class="${contentClass}" data-hero-layout="carousel-slide" data-slide-type="${variant}" data-slide-align="${align}" data-hero-surface>
      <div class="${copyClass}">
      ${copyMarkup}
      </div>
      ${oppositeMedia}
    </div>
  `;
}

function getArticleIcon(tag = '') {
  const norm = String(tag).toLowerCase();
  if (norm.includes('impact') || norm.includes('receipt')) return 'bi-receipt-cutoff';
  if (norm.includes('checklist') || norm.includes('guide')) return 'bi-list-check';
  if (norm.includes('community')) return 'bi-people';
  if (norm.includes('event')) return 'bi-calendar-event';
  if (norm.includes('story') || norm.includes('lore')) return 'bi-journal-bookmark';
  return 'bi-stars';
}

function renderPanelAsset(asset = {}, className = '', fallbackLabel = 'Feature') {
  const fitClass = String(asset.fit || '').toLowerCase() === 'contain' ? 'is-contain' : '';
  const toneClass = normalizeToneClass(asset.tone);
  const classes = ['hero-panel-asset', className, fitClass, toneClass].filter(Boolean).join(' ');
  const src = heroEsc(asset.src || '/assets/images/placeholder.png');
  const alt = heroEsc(asset.alt || asset.label || fallbackLabel);
  const caption = asset.label ? `<figcaption>${heroEsc(asset.label)}</figcaption>` : '';
  return `
    <figure class="${classes}">
      <span class="hero-panel-fallback" aria-hidden="true">${heroEsc(asset.label || fallbackLabel)}</span>
      <img src="${src}" alt="${alt}" loading="lazy" decoding="async" onerror="this.closest('.hero-panel-asset')?.classList.add('is-fallback'); this.remove();">
      ${caption}
    </figure>
  `;
}

function renderArticleStrip(articles = [], mode = 'list', limit = 3) {
  const items = (Array.isArray(articles) && articles.length ? articles : defaultFeaturedArticles).slice(0, limit);
  const titleWordCap = mode === 'pill' ? 6 : mode === 'timeline' ? 8 : 7;
  return items.map((article, index) => {
    const href = heroEsc(article.href || '/community.html');
    const tag = heroEsc(article.tag || 'Article');
    const icon = getArticleIcon(article.tag || '');
    const title = heroEsc(truncateWords(article.title || `Pet Pawket read ${index + 1}`, titleWordCap));
    const fullTitle = heroEsc(article.title || `Pet Pawket read ${index + 1}`);
    return `
      <a class="hero-article-${mode}" href="${href}" data-tooltip="${fullTitle}">
        <i class="bi ${heroEsc(icon)}" aria-hidden="true"></i>
        <span>${title}</span>
        <em>${tag}</em>
      </a>
    `;
  }).join('');
}

function renderMetricPills(metrics = []) {
  const rows = (Array.isArray(metrics) && metrics.length ? metrics : []).slice(0, 3);
  return rows.map((metric) => `
    <span class="hero-metric-pill">
      <strong>${heroEsc(metric.value || '0')}</strong>
      <span>${heroEsc(metric.label || 'Metric')}</span>
    </span>
  `).join('');
}

function renderMetricTags(metrics = [], limit = 3) {
  const rows = (Array.isArray(metrics) && metrics.length ? metrics : []).slice(0, limit);
  return rows.map((metric, index) => `
    <span class="hero-tag-pill" data-tag-index="${index}">
      <i class="bi bi-stars" aria-hidden="true"></i>
      <span>${heroEsc(truncateWords(metric.label || 'Highlight', 3))}</span>
    </span>
  `).join('');
}

function normalizePanelUtilityActions(slide = {}, payload = {}) {
  const quickActions = Array.isArray(payload.quickActions) ? payload.quickActions : [];
  const rescue = payload.rescue || {};
  const spotlight = payload.spotlight || {};
  const sources = [
    ...quickActions,
    { text: rescue.cta || rescue.kicker || 'Rescue update', href: rescue.href || '/community.html' },
    { text: spotlight.cta || spotlight.label || 'Spotlight', href: spotlight.href || '/community.html' },
    { text: slide.secondaryCta?.text || '', href: slide.secondaryCta?.link || '' },
    { text: slide.button?.text || '', href: slide.button?.link || '' }
  ];
  const dedupe = new Set();
  const normalized = [];
  sources.forEach((item) => {
    const text = String(item?.text || '').trim();
    const href = String(item?.href || item?.link || '').trim();
    if (!text || !href || href === '#') return;
    const key = `${text.toLowerCase()}|${href.toLowerCase()}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    normalized.push({ text, href });
  });
  return normalized.slice(0, 2);
}

function getPanelLaneLabel(theme = 'story') {
  if (theme === 'promo') return 'Boxes';
  if (theme === 'impact') return 'CHARM';
  if (theme === 'launch') return 'Pals';
  return 'Shop';
}

function renderPanelUtility(slide = {}, payload = {}, theme = 'story') {
  const heroStat = payload.heroStat || null;
  const metricRows = Array.isArray(payload.metrics) ? payload.metrics : [];
  const stats = [];
  if (heroStat?.value || heroStat?.label) stats.push({ value: heroStat.value || 'Now', label: heroStat.label || 'Live stat' });
  metricRows.forEach((metric) => {
    if (!metric || (!metric.value && !metric.label)) return;
    if (stats.length >= 2) return;
    const exists = stats.some((row) => String(row.label || '').toLowerCase() === String(metric.label || '').toLowerCase());
    if (!exists) stats.push({ value: metric.value || 'Live', label: metric.label || 'Metric' });
  });

  const actions = normalizePanelUtilityActions(slide, payload);
  const feedCount = Array.isArray(payload.feed) ? payload.feed.length : 0;
  const articleCount = Array.isArray(payload.articles) ? payload.articles.length : 0;
  const utilityMetaParts = [];
  if (feedCount > 0) utilityMetaParts.push(`${feedCount} updates`);
  else if (articleCount > 0) utilityMetaParts.push(`${articleCount} updates`);
  if (actions.length > 0) utilityMetaParts.push(`${actions.length} quick routes`);
  const utilityMeta = utilityMetaParts.join(' • ') || 'Store overview';

  if (!stats.length && !actions.length && !utilityMeta) return '';

  return `
    <section class="hero-panel-utility hero-panel-utility--${heroEsc(theme)}" data-context-utility>
      <div class="hero-panel-utility-head">
        <span class="hero-panel-utility-lane">${heroEsc(getPanelLaneLabel(theme))}</span>
        <span class="hero-panel-utility-meta">${heroEsc(utilityMeta)}</span>
      </div>
      ${stats.length ? `
        <div class="hero-panel-utility-stats">
          ${stats.map((metric) => `
            <span class="hero-panel-stat" data-tooltip="${heroEsc(metric.label || 'Metric')}">
              <strong>${heroEsc(metric.value || 'Now')}</strong>
              <span>${heroEsc(truncateWords(metric.label || 'Metric', 3))}</span>
            </span>
          `).join('')}
        </div>
      ` : ''}
      ${actions.length ? `
        <div class="hero-panel-utility-actions">
          ${actions.map((action, index) => `
            <a class="hero-panel-action${index === 0 ? ' is-primary' : ''}" href="${heroEsc(action.href)}" data-tooltip="${heroEsc(action.text)}">
              <i class="bi bi-arrow-up-right-circle" aria-hidden="true"></i>
              <span>${heroEsc(truncateWords(action.text, 3))}</span>
            </a>
          `).join('')}
        </div>
      ` : ''}
    </section>
  `;
}

function renderQuickActionRow(actions = [], fallbackHref = '/community.html', avoidLabels = []) {
  if (!actions.length) return '';
  const blacklist = new Set((Array.isArray(avoidLabels) ? avoidLabels : [avoidLabels])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean));
  const filtered = actions.filter((action) => {
    const label = String(action?.text || '').trim().toLowerCase();
    return label && !blacklist.has(label);
  });
  if (!filtered.length) return '';
  return `
    <div class="hero-context-quick-row">
      ${filtered.map((action, index) => {
        const label = heroEsc(truncateWords(action.text || `Action ${index + 1}`, 3));
        const href = heroEsc(action.href || fallbackHref);
        return `<a class="hero-context-quick" href="${href}" data-tooltip="${label}">${label}</a>`;
      }).join('')}
    </div>
  `;
}

function renderStoryContext(payload) {
  const { rescue, spotlight, articles, assets } = payload;
  const articleItems = Array.isArray(articles) && articles.length ? articles : defaultFeaturedArticles;
  return `
    <div class="hero-context-layout hero-context-layout--story">
      <article class="hero-module hero-module--story-feature">
        ${renderPanelAsset({ ...assets.primary, src: rescue.image || assets.primary.src, alt: rescue.title || assets.primary.alt }, 'is-wide', 'Rescue story')}
        <div class="hero-module-copy hero-module-copy--story">
          <span class="hero-context-kicker">${heroEsc(rescue.kicker || 'Featured rescue story')}</span>
          <h3>${heroEsc(truncateWords(rescue.title || 'Featured rescue story', 5))}</h3>
          <p>${toPanelText(rescue.body || 'Rescue update appears here.', 7)}</p>
          <a href="${heroEsc(rescue.href || '/charm.html')}" class="hero-context-link">${heroEsc(rescue.cta || 'View case')}</a>
        </div>
      </article>

      <section class="hero-module hero-module--story-spotlight">
        <span class="hero-context-kicker">${heroEsc(spotlight.label || 'Today’s spotlight')}</span>
        <p>${toPanelText(spotlight.text || 'Pet Pawket community update.', 5)}</p>
        <a href="${heroEsc(spotlight.href || '/community.html')}" class="hero-context-link hero-context-link--ghost">${heroEsc(spotlight.cta || 'Open highlights')}</a>
      </section>

      <section class="hero-module hero-module--story-reads">
        <header>
          <h3>Featured reads</h3>
          <span>Fresh reads</span>
        </header>
        <div class="hero-article-flow hero-article-flow--cards">
          ${renderArticleStrip(articleItems, 'card', 1)}
        </div>
      </section>
    </div>
  `;
}

function renderPromoContext(payload) {
  const { spotlight, articles, metrics, assets } = payload;
  const articleItems = Array.isArray(articles) && articles.length ? articles : defaultFeaturedArticles;
  return `
    <div class="hero-context-layout hero-context-layout--promo">
      <section class="hero-module hero-module--promo-collage">
        <header>
          <h3>Pack spotlight</h3>
          <span>Editor picks</span>
        </header>
        <div class="hero-collage-grid">
          ${renderPanelAsset(assets.primary, 'is-tall is-contain tone-sun', 'Pack spotlight')}
          ${renderPanelAsset(assets.secondary, 'is-square is-contain tone-mint', 'Care item')}
          ${renderPanelAsset(assets.tertiary, 'is-square is-contain tone-sky', 'Drop item')}
        </div>
      </section>

      <section class="hero-module hero-module--promo-reads">
        <header>
          <h3>Fresh reads</h3>
          <span>2 min scans</span>
        </header>
        <div class="hero-article-flow hero-article-flow--pills">
          ${renderArticleStrip(articleItems, 'pill', 2)}
        </div>
      </section>

      <section class="hero-module hero-module--promo-burst">
        <span class="hero-context-kicker">${heroEsc(spotlight.label || 'Featured bundle')}</span>
        <p>${toPanelText(spotlight.text || 'Featured bundle highlight', 8)}</p>
        <div class="hero-tag-row">
          ${renderMetricTags(metrics, 3)}
        </div>
        <a href="${heroEsc(spotlight.href || '/shop.html')}" class="hero-context-link">${heroEsc(spotlight.cta || 'Shop featured')}</a>
      </section>
    </div>
  `;
}

function renderImpactContext(payload) {
  const { rescue, spotlight, articles, metrics, assets, feed, heroStat } = payload;
  const primaryMetric = Array.isArray(metrics) && metrics.length ? metrics[0] : null;
  const laneMetrics = Array.isArray(metrics) ? metrics.slice(1) : [];
  const feedItems = Array.isArray(feed) && feed.length ? feed : articles;
  const activeStat = heroStat || primaryMetric || null;
  return `
    <div class="hero-context-layout hero-context-layout--impact">
      <section class="hero-module hero-module--impact-ticket">
        <span class="hero-context-kicker">${heroEsc(rescue.kicker || 'Impact receipt')}</span>
        <h3>${heroEsc(truncateWords(rescue.title || 'Urgent care in motion', 5))}</h3>
        <p>${toPanelText(rescue.body || 'CHARM kindness update', 9)}</p>
        <p class="hero-impact-note">${toPanelText(spotlight.text || 'Spotlight update from CHARM', 7)}</p>
        ${activeStat ? `
          <div class="hero-kpi-line">
            <strong>${heroEsc(activeStat.value || '')}</strong>
            <span>${heroEsc(activeStat.label || 'Care funded')}</span>
          </div>
        ` : ''}
        <div class="hero-tag-row">
          ${renderMetricTags(laneMetrics, 2)}
        </div>
        <a href="${heroEsc(rescue.href || '/charm.html')}" class="hero-context-link">${heroEsc(rescue.cta || 'See receipts')}</a>
      </section>

      <section class="hero-module hero-module--impact-case">
        ${renderPanelAsset({ ...assets.primary, src: rescue.image || assets.primary.src, alt: rescue.title || assets.primary.alt }, 'is-wide', 'Case spotlight')}
      </section>

      <section class="hero-module hero-module--impact-feed">
        <header>
          <h3>Kindness trail</h3>
          <span>Live</span>
        </header>
        <div class="hero-article-flow hero-article-flow--timeline">
          ${renderArticleStrip(feedItems, 'timeline', 2)}
        </div>
      </section>
    </div>
  `;
}

function renderLaunchContext(payload) {
  const { rescue, spotlight, articles, metrics, assets, feed, quickActions } = payload;
  const feedItems = Array.isArray(feed) && feed.length ? feed : articles;
  const fallbackActions = quickActions.length ? quickActions : [
    { text: 'Open pals', href: '/community.html' },
    { text: 'View Pals', href: '/community.html' }
  ];
  const actionBlacklist = [spotlight.cta, rescue?.cta];
  const pulseItem = feedItems[2] || feedItems[0] || { title: 'New zone updates rolling out in waves', href: '/community.html' };
  return `
    <div class="hero-context-layout hero-context-layout--launch">
      <section class="hero-module hero-module--launch-pals">
        <header>
          <h3>Pawket Pals</h3>
          <span>World cast</span>
        </header>
        <div class="hero-pals-cluster">
          ${renderPanelAsset(assets.primary, 'is-avatar', 'Pal 1')}
          ${renderPanelAsset(assets.secondary, 'is-avatar', 'Pal 2')}
          ${renderPanelAsset(assets.tertiary, 'is-avatar', 'Pal 3')}
        </div>
      </section>

      <section class="hero-module hero-module--launch-roadmap">
        <span class="hero-context-kicker">${heroEsc(spotlight.label || 'Roadmap')}</span>
        <p>${toPanelText(spotlight.text || 'Roadmap highlight', 5)}</p>
        <div class="hero-tag-row">
          ${renderMetricTags(metrics, 2)}
        </div>
        ${renderQuickActionRow(fallbackActions.slice(0, 1), '/community.html', actionBlacklist)}
        <a href="${heroEsc(spotlight.href || '/community.html')}" class="hero-context-link hero-context-link--ghost">${heroEsc(spotlight.cta || 'View Pals')}</a>
      </section>

      <section class="hero-module hero-module--launch-pulse">
        <header>
          <h3>Park pulse</h3>
        </header>
        <p>${toPanelText(pulseItem.title || 'New zone previews rolling out in waves', 5)}</p>
      </section>

      <section class="hero-module hero-module--launch-links">
        <header>
          <h3>Community sparks</h3>
          <span>Now live</span>
        </header>
        <div class="hero-article-flow hero-article-flow--cards">
          ${renderArticleStrip(feedItems, 'card', 1)}
        </div>
      </section>
    </div>
  `;
}

function getPanelThemeMeta(theme = 'story') {
  const meta = {
    story: {
      icon: 'bi-shop-window',
      eyebrow: 'Pet Pawket Store',
      title: 'Start with the store',
      subtitle: 'Fast paths to the shelves people can use first.',
      status: 'Store ready'
    },
    promo: {
      icon: 'bi-box-seam',
      eyebrow: 'Box Builder',
      title: 'Choose a box',
      subtitle: 'Compare full packs, small packets, and bonus picks without hunting.',
      status: 'Boxes ready'
    },
    impact: {
      icon: 'bi-heart-pulse',
      eyebrow: 'CHARM Signal',
      title: 'Impact receipts in motion',
      subtitle: 'Care funding, rescue case notes, and medical support updates from CHARM.',
      status: 'Updates live'
    },
    launch: {
      icon: 'bi-stars',
      eyebrow: 'Pawket World',
      title: 'Pawket Pals are waking up',
      subtitle: 'Little companions, keepsakes, and Town Square moments are starting to connect.',
      status: 'Pals ready'
    }
  };
  return meta[theme] || meta.story;
}

function normalizePulseFeed(panel = {}, articles = []) {
  const sources = [
    ...(Array.isArray(panel.feed) ? panel.feed : []),
    ...(Array.isArray(articles) ? articles : [])
  ];
  const seen = new Set();
  return sources
    .filter((item) => item && item.title)
    .filter((item) => {
      const key = `${String(item.title).toLowerCase()}|${String(item.href || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function normalizePulseActions(slide = {}, payload = {}) {
  const sources = [
    ...(Array.isArray(payload.quickActions) ? payload.quickActions : []),
    { text: payload.rescue?.cta || '', href: payload.rescue?.href || '' },
    { text: payload.spotlight?.cta || '', href: payload.spotlight?.href || '' },
    { text: slide.secondaryCta?.text || '', href: slide.secondaryCta?.link || '' },
    { text: slide.button?.text || '', href: slide.button?.link || '' }
  ];
  const seen = new Set();
  return sources
    .map((item) => ({
      text: String(item?.text || '').trim(),
      href: String(item?.href || item?.link || '').trim()
    }))
    .filter((item) => item.text && item.href && item.href !== '#')
    .filter((item) => {
      const key = `${item.text.toLowerCase()}|${item.href.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);
}

function renderPulseMetrics(metrics = [], heroStat = null, limit = 2) {
  const rows = [];
  if (heroStat?.value || heroStat?.label) {
    rows.push({ value: heroStat.value || 'Now', label: heroStat.label || 'Live update' });
  }
  (Array.isArray(metrics) ? metrics : []).forEach((metric) => {
    if (!metric || rows.length >= limit) return;
    const label = metric.label || 'Metric';
    const exists = rows.some((row) => String(row.label || '').toLowerCase() === String(label).toLowerCase());
    if (!exists) rows.push({ value: metric.value || 'Now', label });
  });
  return rows.slice(0, limit).map((metric, index) => `
    <span class="hero-pulse-stat" data-stat-index="${index}">
      <strong>${heroEsc(metric.value || 'Now')}</strong>
      <span>${heroEsc(truncateWords(metric.label || 'Live update', 4))}</span>
    </span>
  `).join('');
}

function normalizeLaneRoutes(panel = {}, articles = []) {
  const sources = [
    ...(Array.isArray(panel.routes) ? panel.routes : []),
    ...(Array.isArray(articles) ? articles.map((item) => ({
      icon: getArticleIcon(item.tag),
      label: item.tag || item.title,
      meta: item.title,
      href: item.href
    })) : [])
  ];
  const seen = new Set();
  return sources
    .map((item) => ({
      icon: item?.icon || 'bi-arrow-up-right',
      label: String(item?.label || item?.title || '').trim(),
      meta: String(item?.meta || item?.tag || '').trim(),
      href: String(item?.href || item?.link || '').trim()
    }))
    .filter((item) => item.label && item.href && item.href !== '#')
    .filter((item) => {
      const key = `${item.label.toLowerCase()}|${item.href.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function renderLaneRoutes(routes = []) {
  if (!routes.length) return '';
  return `
    <nav class="hero-lane-routes" aria-label="Hero quick paths">
      ${routes.map((route) => `
        <a class="hero-lane-route" href="${heroEsc(route.href)}" data-tooltip="${heroEsc(route.label)}">
          <i class="bi ${heroEsc(route.icon)}" aria-hidden="true"></i>
          <span>${heroEsc(truncateWords(route.label, 3))}</span>
          <small>${heroEsc(truncateWords(route.meta, 3))}</small>
        </a>
      `).join('')}
    </nav>
  `;
}

function normalizeLaneTiles(panel = {}, assets = {}, routes = []) {
  const fallbackTiles = [
    assets.secondary,
    assets.tertiary,
    assets.primary
  ].filter(Boolean);
  const sourceTiles = Array.isArray(panel.tiles) && panel.tiles.length ? panel.tiles : fallbackTiles;
  return sourceTiles.slice(0, 3).map((tile, index) => {
    const route = routes[index] || {};
    return {
      src: tile?.src || fallbackTiles[index]?.src || '/assets/images/placeholder.png',
      alt: tile?.alt || tile?.label || route.label || 'Pet Pawket path',
      label: tile?.label || route.label || `Path ${index + 1}`,
      fit: tile?.fit || fallbackTiles[index]?.fit || '',
      tone: tile?.tone || fallbackTiles[index]?.tone || '',
      href: tile?.href || route.href || panel.rescue?.href || '/shop.html'
    };
  });
}

function renderLaneTiles(tiles = []) {
  if (!tiles.length) return '';
  return `
    <div class="hero-lane-tiles" aria-label="Hero visual paths">
      ${tiles.map((tile) => `
        <a class="hero-lane-tile" href="${heroEsc(tile.href)}" data-tooltip="${heroEsc(tile.label)}">
          ${renderPanelAsset(tile, 'hero-lane-tile-asset', tile.label || 'Path')}
          <span>${heroEsc(truncateWords(tile.label, 2))}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderStoreLanePanel({ theme, panel, rescue, spotlight, themeMeta, primaryAsset, tiles, pulseActions }) {
  return `
    ${renderContextPattern(theme)}
    <div class="hero-info-inner hero-info-inner--context hero-scene-panel hero-shop-scene" data-hero-layout="image-scene" data-context-theme="${heroEsc(theme)}" data-panel-mode="store">
      <a class="hero-shop-scene-photo" href="${heroEsc(rescue.href || pulseActions[0]?.href || '/shop.html')}" data-tooltip="${heroEsc(rescue.cta || pulseActions[0]?.text || 'Open shop')}">
        ${renderPanelAsset(primaryAsset, 'hero-shop-scene-asset', rescue.kicker || 'Store')}
        <span class="hero-scene-badge">
          <i class="bi ${heroEsc(themeMeta.icon)}" aria-hidden="true"></i>
          ${heroEsc(panel.headline || 'Store')}
        </span>
      </a>

      <nav class="hero-scene-actions" aria-label="Hero actions">
        ${pulseActions.map((action, index) => `
          <a class="hero-scene-action${index === 0 ? ' is-primary' : ''}" href="${heroEsc(action.href)}" data-tooltip="${heroEsc(action.text)}">
            <span>${heroEsc(truncateWords(action.text, 3))}</span>
            <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
          </a>
        `).join('')}
      </nav>
    </div>
  `;
}

function renderBoxLanePanel({ theme, panel, rescue, spotlight, themeMeta, primaryAsset, tiles, pulseActions }) {
  const sideTiles = tiles.slice(1, 3);
  return `
    ${renderContextPattern(theme)}
    <div class="hero-info-inner hero-info-inner--context hero-scene-panel hero-pack-scene" data-hero-layout="pack-scene" data-context-theme="${heroEsc(theme)}" data-panel-mode="boxes">
      <a class="hero-pack-scene-stage" href="${heroEsc(rescue.href || pulseActions[0]?.href || '/packs.html')}" data-tooltip="${heroEsc(rescue.cta || pulseActions[0]?.text || 'Compare packs')}">
        <span class="hero-scene-badge">
          <i class="bi ${heroEsc(themeMeta.icon)}" aria-hidden="true"></i>
          ${heroEsc(panel.headline || 'Boxes')}
        </span>
        <span class="hero-pack-glow" aria-hidden="true"></span>
        ${renderPanelAsset(primaryAsset, 'hero-pack-scene-main', rescue.kicker || 'Packs')}
        ${sideTiles.map((tile, index) => `
          <span class="hero-pack-scene-item hero-pack-scene-item--${index + 1}">
            ${renderPanelAsset(tile, 'hero-pack-scene-mini', tile.label || 'Box path')}
          </span>
        `).join('')}
      </a>

      <nav class="hero-scene-actions" aria-label="Hero actions">
        ${pulseActions.map((action, index) => `
          <a class="hero-scene-action${index === 0 ? ' is-primary' : ''}" href="${heroEsc(action.href)}" data-tooltip="${heroEsc(action.text)}">
            <span>${heroEsc(truncateWords(action.text, 3))}</span>
            <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
          </a>
        `).join('')}
      </nav>
    </div>
  `;
}

function renderPulseTrail(items = []) {
  if (!items.length) return '';
  return `
    <section class="hero-pulse-trail" aria-label="Current highlight trail">
      <header>
        <h3>Signal trail</h3>
        <span>${items.length} updates</span>
      </header>
      <div class="hero-pulse-feed">
        ${items.map((item, index) => {
          const tag = item.tag || 'Update';
          const href = item.href || '/community.html';
          const icon = getArticleIcon(tag);
          return `
            <a class="hero-pulse-feed-item" href="${heroEsc(href)}" data-feed-index="${index}" data-tooltip="${heroEsc(item.title)}">
              <i class="bi ${heroEsc(icon)}" aria-hidden="true"></i>
              <span>${heroEsc(truncateWords(item.title || 'Pet Pawket update', 8))}</span>
              <em>${heroEsc(tag)}</em>
            </a>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderHeroPanel(slide = {}) {
  const panel = slide.panel || {};
  const rescue = panel.rescue || {};
  const spotlight = panel.spotlight || {};
  const theme = normalizePanelTheme(slide);
  const panelMode = ['store', 'boxes', 'impact', 'launch'].includes(String(panel.mode || '').toLowerCase())
    ? String(panel.mode).toLowerCase()
    : theme;
  const articles = Array.isArray(panel.articles) ? panel.articles : [];
  const assets = {
    primary: slide.visual?.assets?.[0] || { src: '/assets/images/banner-1.jpg', alt: 'Pet Pawket spotlight', label: 'Spotlight' },
    secondary: slide.visual?.assets?.[1] || slide.visual?.assets?.[0] || { src: '/assets/images/pet-dog.png', alt: 'Pet Pawket visual', label: 'Feature' },
    tertiary: slide.visual?.assets?.[2] || slide.visual?.assets?.[1] || slide.visual?.assets?.[0] || { src: '/assets/images/pet-cat.png', alt: 'Pet Pawket visual', label: 'Feature' }
  };

  const payload = { rescue, spotlight, quickActions: panel.quickActions || [] };
  const themeMeta = getPanelThemeMeta(theme);
  const pulseActions = normalizePulseActions(slide, payload);
  const routes = normalizeLaneRoutes(panel, articles);
  const tiles = normalizeLaneTiles(panel, assets, routes);
  const primaryAsset = {
    ...assets.primary,
    src: rescue.image || assets.primary.src,
    alt: rescue.title || assets.primary.alt,
    label: rescue.kicker || assets.primary.label
  };
  const featureFitClass = panelMode === 'boxes' ? 'is-contained' : 'is-photo';

  if (panelMode === 'boxes') {
    return renderBoxLanePanel({ theme, panel, rescue, spotlight, themeMeta, primaryAsset, tiles, pulseActions });
  }

  if (panelMode === 'store') {
    return renderStoreLanePanel({ theme, panel, rescue, spotlight, themeMeta, primaryAsset, tiles, pulseActions });
  }

  return `
    ${renderContextPattern(theme)}
    <div class="hero-info-inner hero-info-inner--context hero-lane-panel" data-hero-layout="context-box" data-context-theme="${heroEsc(theme)}" data-panel-mode="${heroEsc(panelMode)}">
      <div class="hero-lane-visual-stack">
        <a class="hero-lane-hero-shot ${featureFitClass}" href="${heroEsc(rescue.href || pulseActions[0]?.href || '/shop.html')}" data-tooltip="${heroEsc(rescue.cta || pulseActions[0]?.text || 'Open')}">
          <span class="hero-lane-glance">
            <span class="hero-lane-eyebrow">
              <i class="bi ${heroEsc(themeMeta.icon)}" aria-hidden="true"></i>
              ${heroEsc(panel.headline || themeMeta.title)}
            </span>
            <span class="hero-lane-status">
              <span aria-hidden="true"></span>
              ${heroEsc(themeMeta.status)}
            </span>
          </span>
          <span class="hero-lane-media">
            ${renderPanelAsset(primaryAsset, 'hero-lane-asset', rescue.kicker || 'Spotlight')}
          </span>
          <strong>${heroEsc(truncateWords(rescue.title || spotlight.label || 'Open', 2))}</strong>
        </a>

        ${renderLaneTiles(tiles)}

        <div class="hero-lane-actions" aria-label="Hero actions">
          ${pulseActions.map((action, index) => `
            <a class="hero-lane-action${index === 0 ? ' is-primary' : ''}" href="${heroEsc(action.href)}" data-tooltip="${heroEsc(action.text)}">
              <span>${heroEsc(truncateWords(action.text, 3))}</span>
              <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function injectHero() {
  const heroContainer = document.getElementById("hero-container");
  if (!heroContainer) {
    console.warn("[Hero] No #hero-container found to inject hero section.");
    return;
  }

  heroContainer.innerHTML = `
    <section class="hero-backdrop">
      <div class="hero-rail hero-rail--split">
        <div class="hero-slider-shell">
          <div class="hero-slider-container">
            <div class="hero-slide-track"></div>
            <div class="hero-indicators"></div>
            <span class="hero-arrow-edge hero-arrow-edge--left" aria-hidden="true"></span>
            <span class="hero-arrow-edge hero-arrow-edge--right" aria-hidden="true"></span>
            <button class="arrow prev" data-hero-control="prev" aria-label="Previous hero slide" data-tooltip="Go to previous featured highlight.">‹</button>
            <button class="arrow next" data-hero-control="next" aria-label="Next hero slide" data-tooltip="Go to next featured highlight.">›</button>
            <div class="hero-autoplay-watermark" data-hero-autoplay-toast aria-live="polite" aria-atomic="true"></div>
          </div>
          <div class="hero-controls-rail">
            <p class="hero-pause-hint">Tip: Click the center of the slide to pause or resume.</p>
          </div>
        </div>
        <aside class="hero-info-card hero-info-card--context">
          <span class="hero-panel-edge hero-panel-edge--left" aria-hidden="true"></span>
          <button class="hero-panel-prev" data-hero-control="panel-prev" aria-label="Previous hero slide" data-tooltip="Show previous featured highlight.">‹</button>
          <div data-hero-panel></div>
          <span class="hero-panel-edge hero-panel-edge--right" aria-hidden="true"></span>
          <button class="hero-panel-next" data-hero-control="panel-next" aria-label="Next hero slide" data-tooltip="Show next featured highlight.">›</button>
        </aside>
      </div>
    </section>
  `;

  const track = document.querySelector(".hero-slide-track");
  const indicators = document.querySelector(".hero-indicators");
  const heroPanel = document.querySelector('[data-hero-panel]');
  if (heroPanel) heroPanel.innerHTML = renderHeroPanel(slidesData[0] || {});

  slidesData.forEach((slide, i) => {
    const div = document.createElement("div");
    const visualType = slide.visual?.type || 'story';
    const hasImageArt = isHeroImageBackground(slide.background);
    div.className = `hero-slide-item hero-slide--${visualType}`;
    if (i === 0) div.classList.add("active");
    if (hasImageArt) {
      div.dataset.slideArt = 'image';
    } else if (slide.background?.startsWith("#")) {
      div.style.backgroundColor = slide.background;
    }
    div.style.borderRadius = "inherit";

    div.innerHTML = `${renderHeroSlideArt(slide)}${renderHeroSlideContent(slide)}`;
    track.appendChild(div);

    const dot = document.createElement("div");
    dot.className = "hero-indicator" + (i === 0 ? " active" : "");
    dot.dataset.index = i;
    dot.dataset.heroControl = "indicator";
    dot.setAttribute("data-tooltip", `Jump to slide ${i + 1}`);
    indicators.appendChild(dot);
  });

  initializeHeroSlider();
  try { document.dispatchEvent(new CustomEvent('pp:hero:ready')); } catch {}
}

function initializeHeroSlider() {
  const heroContainer = document.querySelector(".hero-slider-container");
  if (!heroContainer) return;

  const heroShell = heroContainer.closest(".hero-slider-shell") || heroContainer.parentElement;
  const heroRail = heroContainer.closest(".hero-rail--split") || heroContainer.closest(".hero-backdrop");
  const slides = heroContainer.querySelectorAll(".hero-slide-item");
  const indicators = heroContainer.querySelectorAll(".hero-indicator");
  const nextBtn = heroContainer.querySelector(".arrow.next");
  const prevBtn = heroContainer.querySelector(".arrow.prev");
  const pauseBtns = heroShell?.querySelectorAll(".pause-btn") || [];
  const panelPrevBtn = heroRail?.querySelector(".hero-panel-prev");
  const panelNextBtn = heroRail?.querySelector(".hero-panel-next");
  const autoplayToast = heroContainer.querySelector("[data-hero-autoplay-toast]");
  const heroPanel = document.querySelector('[data-hero-panel]');
  const AUTOPLAY_DELAY = 12000;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const backgroundToggleIgnoreSelector = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    'label[for]',
    'summary',
    '[role="button"]',
    '[data-hero-control]',
    '.arrow',
    '.hero-indicator',
    '.hero-chip',
    '[data-hero-chip]',
    '[aria-controls]'
  ].join(',');

  // SWIPE LOGIC
  let startX = 0;
  let endX = 0;
  let suppressCenterToggleUntil = 0;
  let suppressSyntheticClickUntil = 0;

  heroContainer.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    endX = startX;
  });

  heroContainer.addEventListener("touchmove", (e) => {
    endX = e.touches[0].clientX;
  });

  heroContainer.addEventListener("touchend", () => {
    const threshold = 50;
    const deltaX = endX - startX;
    let didSwipe = false;

    if (deltaX > threshold) {
      changeSlide(-1);
      didSwipe = true;
    } else if (deltaX < -threshold) {
      changeSlide(1);
      didSwipe = true;
    }
    if (didSwipe) suppressCenterToggleUntil = Date.now() + 420;

    startX = 0;
    endX = 0;
  });


  if (slides.length === 0) return;

  let current = 0;
  let paused = false;
  let autoplayTimerId = null;
  let autoplayToastTimer = null;

  function stopAutoplay() {
    if (autoplayTimerId !== null) {
      window.clearTimeout(autoplayTimerId);
      autoplayTimerId = null;
    }
  }

  function scheduleAutoplay(delay = AUTOPLAY_DELAY) {
    stopAutoplay();
    if (paused) return;
    autoplayTimerId = window.setTimeout(() => {
      autoplayTimerId = null;
      changeSlide(1, { source: 'autoplay', resetAutoplay: false });
      if (!paused) scheduleAutoplay(AUTOPLAY_DELAY);
    }, delay);
  }

  function startAutoplay() {
    scheduleAutoplay(AUTOPLAY_DELAY);
  }

  function updatePauseControls() {
    heroContainer.dataset.paused = paused ? 'true' : 'false';
    pauseBtns.forEach((btn) => {
      if (!btn) return;
      if (paused) {
        btn.innerHTML = '<i class="bi bi-play-fill" aria-hidden="true"></i>';
        btn.setAttribute('aria-label', 'Play slideshow');
        btn.setAttribute('data-tooltip', 'Resume automatic hero rotation.');
        btn.dataset.paused = 'true';
      } else {
        btn.innerHTML = '<i class="bi bi-pause-fill" aria-hidden="true"></i>';
        btn.setAttribute('aria-label', 'Pause slideshow');
        btn.setAttribute('data-tooltip', 'Pause automatic hero rotation.');
        btn.dataset.paused = 'false';
      }
    });
  }

  function showAutoplayToast(message) {
    if (!autoplayToast || !message) return;
    autoplayToast.textContent = message;
    autoplayToast.classList.remove('is-visible');
    void autoplayToast.offsetWidth;
    autoplayToast.classList.add('is-visible');
    if (autoplayToastTimer) window.clearTimeout(autoplayToastTimer);
    autoplayToastTimer = window.setTimeout(() => {
      autoplayToast.classList.remove('is-visible');
    }, 920);
  }

  function setPaused(nextPaused, options = {}) {
    const previousPaused = paused;
    paused = Boolean(nextPaused);
    if (paused) stopAutoplay();
    else startAutoplay();
    updatePauseControls();
    if (!options.silent && previousPaused !== paused) {
      showAutoplayToast(paused ? 'Autoplay paused' : 'Autoplay resumed');
    }
  }

  function togglePaused() {
    setPaused(!paused);
  }

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.remove("active");
      slide.style.left = "0";
      slide.style.transform = "translateX(100%)";
      indicators[i]?.classList.remove("active");
    });
    slides[index].classList.add("active");
    slides[index].style.left = "0";
    slides[index].style.transform = "translateX(0)";
    indicators[index]?.classList.add("active");
    if (heroPanel && slidesData[index]) {
      heroPanel.innerHTML = renderHeroPanel(slidesData[index]);
    }
  }

  function setSlide(nextIndex, options = {}) {
    current = (nextIndex + slides.length) % slides.length;
    showSlide(current);
    if (!paused && options.resetAutoplay !== false) {
      scheduleAutoplay(AUTOPLAY_DELAY);
    }
  }

  function changeSlide(step, options = {}) {
    setSlide(current + step, options);
  }

  nextBtn?.addEventListener("click", () => changeSlide(1));
  prevBtn?.addEventListener("click", () => changeSlide(-1));
  panelPrevBtn?.addEventListener("click", () => changeSlide(-1));
  panelNextBtn?.addEventListener("click", () => changeSlide(1));

  indicators.forEach(dot => {
    dot.addEventListener("click", () => {
      const index = parseInt(dot.dataset.index);
      if (!isNaN(index)) {
        setSlide(index);
      }
    });
  });

  pauseBtns.forEach((btn) => {
    btn.addEventListener("click", togglePaused);
  });

  function getInteractionTarget(event) {
    if (event.target instanceof Element) return event.target;
    if (event.target && event.target.parentElement instanceof Element) return event.target.parentElement;
    if (typeof event.composedPath === 'function') {
      const path = event.composedPath();
      return path.find((node) => node instanceof Element) || null;
    }
    return null;
  }

  function getInteractionPoint(event) {
    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      return { x: event.clientX, y: event.clientY };
    }
    if (event.changedTouches && event.changedTouches.length) {
      return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
    }
    return null;
  }

  function handleCenterBackgroundToggle(event, source = 'click') {
    if (Date.now() < suppressCenterToggleUntil) return;
    if (source === 'click' && Date.now() < suppressSyntheticClickUntil) return;
    const target = getInteractionTarget(event);
    if (!target) return;
    if (target.closest(backgroundToggleIgnoreSelector)) return;

    const activeSlide = heroContainer.querySelector(".hero-slide-item.active");
    if (!activeSlide) return;
    const activeSurface = activeSlide.querySelector("[data-hero-surface]") || activeSlide;
    if (!activeSurface.contains(target)) return;

    const point = getInteractionPoint(event);
    if (!point) return;
    const rect = activeSurface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const isNarrow = window.matchMedia("(max-width: 900px)").matches;
    const marginX = isNarrow
      ? clamp(rect.width * 0.1, 40, 68)
      : clamp(rect.width * 0.13, 52, 90);
    const marginY = clamp(rect.height * 0.02, 6, 24);

    const withinX = point.x >= (rect.left + marginX) && point.x <= (rect.right - marginX);
    const withinY = point.y >= (rect.top + marginY) && point.y <= (rect.bottom - marginY);

    if (!withinX || !withinY) return;
    togglePaused();
    if (source === 'pointerup') suppressSyntheticClickUntil = Date.now() + 360;
  }

  heroContainer.addEventListener("pointerup", (event) => {
    const pointerType = String(event.pointerType || '').toLowerCase();
    if (pointerType === 'mouse') return;
    handleCenterBackgroundToggle(event, 'pointerup');
  });

  heroContainer.addEventListener("click", (event) => {
    handleCenterBackgroundToggle(event, 'click');
  });

  setPaused(false, { silent: true });
  showSlide(current);
} 

// Optional dev utility
window.getCurrentSlides = () => JSON.stringify(slidesData, null, 2);

/* =========================
   Widget band (expandable)
========================= */
export function initWidgetBand() {
  const dock = document.querySelector('[data-widget-dock]');
  const shell = document.querySelector('[data-widget-shell]');
  const panel = document.querySelector('[data-widget-panel]');
  const appLayer = document.querySelector('[data-widget-app-layer]');
  const helpPill = document.querySelector('[data-help-pill]');
  const helpToggle = document.querySelector('[data-help-toggle]');
  const helpPanel = helpPill?.querySelector?.('.pp-help-panel');
  const helpItemsEl = document.querySelector('[data-help-items]');
  const helpQuickEl = document.querySelector('[data-help-quick]');
  const helpTipEl = document.querySelector('[data-help-tip]');
  const helpTipBtn = document.querySelector('[data-help-tip-refresh]');
  const helpStreakEl = document.querySelector('[data-help-streak]');
  const helpStreakBar = document.querySelector('[data-help-streak-bar]');
  if (!dock || !shell || !panel || !appLayer || !helpPill || !helpToggle || !helpItemsEl) return;
  if (dock.dataset.ppWidgetInit === '1') return;
  window.__PP_WIDGET_BAND_READY = false;
  dock.dataset.ppWidgetInit = '1';

  const DEBUG_STORAGE_KEY = 'pp-widget-debug';
  const debugSearchValue = (() => {
    try {
      return new URLSearchParams(window.location.search).get('ppWidgetDebug');
    } catch {
      return null;
    }
  })();
  const debugQueryOn = debugSearchValue === '1';
  const debugQueryOff = debugSearchValue === '0';
  const debugStored = (() => {
    try {
      return localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  })();
  const DEBUG_ON = debugQueryOff ? false : (window.__PP_WIDGET_DEBUG === true || debugStored || debugQueryOn);
  const DOCK_MOBILE_QUERY = '(max-width: 1240px)';
  const debugLines = [];
  let debugEl = null;

  try {
    const staleDebug = document.querySelector('.pp-widget-debug');
    if (staleDebug) staleDebug.remove();
  } catch {}

  function ensureDebugHud() {
    if (!DEBUG_ON) return null;
    if (debugEl && document.body.contains(debugEl)) return debugEl;
    debugEl = document.createElement('div');
    debugEl.className = 'pp-widget-debug';
    debugEl.setAttribute(
      'style',
      [
        'position:fixed',
        'left:auto',
        'right:10px',
        'top:calc(var(--nav-offset, 170px) + 10px)',
        'bottom:auto',
        'z-index:2500',
        'max-width:min(440px,92vw)',
        'max-height:min(38vh,300px)',
        'overflow:auto',
        'padding:8px 10px',
        'border-radius:10px',
        'border:1px solid rgba(255,255,255,.35)',
        'background:rgba(7,20,30,.88)',
        'color:#d8f4ff',
        'font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        'box-shadow:0 12px 22px rgba(0,0,0,.32)',
        'white-space:pre-wrap',
        'pointer-events:none'
      ].join(';')
    );
    document.body.appendChild(debugEl);
    return debugEl;
  }

  function placeDebugHud(hud) {
    if (!hud) return;
    const dockSide = shell?.dataset?.widgetSide === 'right' ? 'right' : 'left';
    if (dockSide === 'right') {
      hud.style.left = '10px';
      hud.style.right = 'auto';
    } else {
      hud.style.left = 'auto';
      hud.style.right = '10px';
    }
  }

  function debugLog(label, payload) {
    if (!DEBUG_ON) return;
    const stamp = new Date().toISOString().slice(11, 23);
    const tail = payload ? ` ${JSON.stringify(payload)}` : '';
    debugLines.push(`${stamp} ${label}${tail}`);
    while (debugLines.length > 140) debugLines.shift();
    const hud = ensureDebugHud();
    if (hud) {
      placeDebugHud(hud);
      hud.textContent = debugLines.join('\n');
    }
  }

  if (DEBUG_ON) {
    window.PP_forceAppShelfPanel = () => {
      debugLog('manual:forceAppShelf');
      openAppShelfPanel();
    };
  } else {
    try { delete window.PP_forceAppShelfPanel; } catch {}
    try { delete window.PP_forceCustomizePanel; } catch {}
  }

  const widgets = [
    {
      id: 'pet-workspace',
      label: 'Pet Workspace',
      shortLabel: 'Home',
      hint: 'Private pets, care, and memories.',
      tag: 'Private',
      badge: 'HOME',
      icon: 'bi-house-heart',
      title: 'Pet Workspace',
      body: 'Keep pet profiles, care notes, favorite memories, and Pal starting points together.',
      primary: { text: 'Open journals', href: '/account.html#account-pets' },
      secondary: { text: 'Make a Pal', href: '/pals.html' },
      link: { text: 'Open journals', href: '/account.html#account-pets' },
      meta: ['Private workspace', 'Care + memories'],
      cardsLabel: 'Workspace tools',
      cards: [
        { icon: 'bi-journal-heart', title: 'Care journals', desc: 'Open pet profiles, care notes, and favorite memories.', cta: 'Open journals', href: '/account.html#account-pets' },
        { icon: 'bi-stars', title: 'Pal ideas', desc: 'Turn a memory or care ritual into a private Pal when it feels right.', cta: 'Open Pals', href: '/pals.html' }
      ]
    },
    {
      id: 'loop',
      label: 'Pawket Shop',
      shortLabel: 'Shop',
      hint: 'Packs, picks, and passes.',
      tag: 'Shop',
      badge: 'SHOP',
      icon: 'bi-bag-heart',
      title: 'Pawket Shop',
      body: 'Build a box, browse useful picks, and send Pawket Passes from one place.',
      primary: { text: 'Build a Pack', href: '/packs.html' },
      secondary: { text: 'Pass hub', href: '/loop.html' },
      link: { text: 'Open shop', href: '/packs.html' },
      meta: ['Packs + Picks', 'Pawket Passes'],
      cardsLabel: 'Shop paths',
      cards: [
        { icon: 'bi-box-seam', title: 'Pawket Packs', desc: 'Compare boxes, Packets, and Picks.', cta: 'Build a pack', href: '/packs.html' },
        { icon: 'bi-send', title: 'Pawket Passes', desc: 'Save, gift, share, and return to the right place.', cta: 'Open passes', href: '/loop.html' }
      ]
    },
    {
      id: 'pals',
      label: 'Pawket Pals',
      shortLabel: 'Pals',
      hint: 'Make private keepsakes.',
      tag: 'Pals',
      badge: 'PAL',
      icon: 'bi-stars',
      title: 'Pawket Pals',
      body: 'Create a private Pal keepsake, then choose later if a story should be shared.',
      primary: { text: 'Open Pals', href: '/pals.html' },
      secondary: { text: 'Community hub', href: '/community.html' },
      link: { text: 'Open Pals', href: '/pals.html' },
      meta: ['Private keepsakes', 'Shared by choice'],
      cardsLabel: 'Pal tools',
      cards: [
        { icon: 'bi-patch-check', title: 'Pal keepsakes', desc: 'Create or reopen private Pals.', cta: 'Open Pals', href: '/pals.html' },
        { icon: 'bi-journal-text', title: 'Saved stories', desc: 'Choose what, if anything, you want to share later.', cta: 'Open saved stories', href: '/account.html#account-story-trail' }
      ]
    },
    {
      id: 'stories',
      label: 'Stories',
      shortLabel: 'Stories',
      hint: 'A small shared scrapbook.',
      tag: 'Stories',
      badge: 'dot',
      icon: 'bi-chat-heart',
      title: 'Stories',
      body: 'Move between CHARM and Community while private pet notes stay private.',
      primary: { text: 'CHARM updates', href: '/charm.html' },
      secondary: { text: 'Community stories', href: '/community.html' },
      link: { text: 'Open stories', href: '/charm.html' },
      meta: ['Shared by choice', 'Private notes protected'],
      cardsLabel: 'Story spots',
      cards: [
        { icon: 'bi-heart-pulse', title: 'CHARM highlights', desc: 'Open the rescue impact experience.', cta: 'Open CHARM', href: '/charm.html' },
        { icon: 'bi-people', title: 'Community moments', desc: 'Pawprints and shared wins belong in Town Square.', cta: 'Open community', href: '/community.html' }
      ]
    },
  ];

  const dockActions = [
    {
      id: 'care',
      label: 'Care',
      meta: 'Journals + care',
      icon: 'bi-heart-pulse',
      tone: 'care',
      title: 'Care Journals',
      kicker: 'Journals, memories, CHARM',
      body: 'A simple workspace for care notes, daily check-ins, favorite memories, CHARM updates, and Pal ideas.',
      primary: { text: 'Add Journal Here', action: 'care-compose' },
      secondary: { text: 'CHARM Updates', href: '/charm.html' },
      widgets: ['pet-workspace', 'stories', 'loop'],
      cardsLabel: 'Journal tools',
      cards: [
        { icon: 'bi-journals', title: 'Care journals', desc: 'Open your pet notes and profile details.', cta: 'Open journals', href: '/account.html#account-pets' },
        { icon: 'bi-gem', title: 'Favorite memories', desc: 'Keep meaningful moments close.', cta: 'Saved stories', href: '/account.html#account-story-trail' },
        { icon: 'bi-heart-pulse', title: 'CHARM notes', desc: 'See mission updates and care stories.', widget: 'stories' },
        { icon: 'bi-bag-heart', title: 'Pawket Shop', desc: 'Shop paths and Pawket Passes stay together.', widget: 'loop' }
      ]
    },
    {
      id: 'more',
      label: 'Apps',
      meta: 'App shelf',
      icon: 'bi-ui-checks-grid',
      tone: 'more',
      title: 'App Shelf',
      kicker: 'Dock apps',
      body: 'Open Pawket apps directly. App access, connected providers, and Dock settings live here instead of inside a separate app.',
      primary: { text: 'Contact Support', href: '/contact.html' },
      secondary: { text: 'Open Support', action: 'help' },
      widgets: ['pet-workspace', 'loop', 'stories', 'pals'],
      cardsLabel: 'Shop and utilities',
      cards: [
        { icon: 'bi-bag-heart', title: 'Shop', desc: 'Products, Packs, Packets, and Picks stay close by.', cta: 'Open shop', href: '/shop.html' },
        { icon: 'bi-box-seam', title: 'Pawket Packs', desc: 'Compare boxes, Packets, and Picks.', cta: 'See boxes', href: '/packs.html' },
        { icon: 'bi-question-circle', title: 'Support Hub', desc: 'Orders, returns, account help, and care guidance.', action: 'help' }
      ]
    }
  ];

  const helpQuick = [
    { label: 'Start Chat', icon: 'bi-chat-dots', href: '/contact.html', tone: 'mint' },
    { label: 'Track Order', icon: 'bi-truck', href: '/order-tracker.html', tone: 'sky' },
    { label: 'Returns', icon: 'bi-arrow-repeat', href: '/contact.html', tone: 'amber' },
    { label: 'FAQs', icon: 'bi-question-circle', href: '/contact.html', tone: 'plum' },
    { label: 'Care Guides', icon: 'bi-journal-heart', href: '/community.html', tone: 'moss' }
  ];

  const helpItems = [
    {
      label: 'Account & Profile',
      desc: 'Update pets, addresses, and preferences.',
      icon: 'bi-person-circle',
      href: '/account.html',
      tag: 'Popular',
      tone: 'sky'
    },
    {
      label: 'Orders & Tracking',
      desc: 'Live delivery updates and receipts.',
      icon: 'bi-receipt',
      href: '/order-tracker.html',
      tag: 'Fast',
      tone: 'mint'
    },
    {
      label: 'Returns & Exchanges',
      desc: 'Easy swaps with rescue-friendly care.',
      icon: 'bi-arrow-left-right',
      href: '/contact.html',
      tag: 'Easy',
      tone: 'amber'
    },
    {
      label: 'Pawket Passes',
      desc: 'Save links, send gifts, and share Pet Pawket with someone else.',
      icon: 'bi-infinity',
      href: '/loop.html',
      tag: 'Pass',
      tone: 'rose'
    },
    {
      label: 'Pawket Pals',
      desc: 'Private Pal keepsakes and stories you choose to share.',
      icon: 'bi-stars',
      href: '/pals.html',
      tag: 'Pals',
      tone: 'plum'
    },
    {
      label: 'Rescue Impact',
      desc: 'CHARM updates are shared when the details are ready.',
      icon: 'bi-heart-pulse',
      href: '/charm.html',
      tag: 'CHARM',
      tone: 'moss'
    }
  ];

  const helpTips = [
    'Tip: A 10‑minute play break boosts calm focus.',
    'Rescue note: CHARM care stories are shared only when they are ready.',
    'Kindness grows best when private details stay private.',
    'Pet care win: Short, consistent walks beat long marathons.',
    'Community tip: Pawket Passes can help a gift keep moving.',
    'Fun fact: Snuffle mats turn meals into brain games.'
  ];

  const legacyWidgetAliases = {
    reminders: 'pet-workspace',
    traits: 'pet-workspace',
    subs: 'loop'
  };
  const mergedWidgetIds = new Set(Object.keys(legacyWidgetAliases));
  const workspaceLegacyWidgetIds = new Set(['reminders', 'traits']);
  const shopLegacyWidgetIds = new Set(['subs']);
  const canonicalWidgetId = (id) => legacyWidgetAliases[String(id || '')] || String(id || '');
  const widgetExists = (id) => widgets.some((widget) => widget.id === id);
  const widgetIsDockApp = (id) => widgetExists(id) && !mergedWidgetIds.has(id);
  const visibleDockWidgets = () => widgets.filter((widget) => widgetIsDockApp(widget.id));
  const normalizeDockAppIds = (ids = []) => [...new Set((Array.isArray(ids) ? ids : [])
    .map(canonicalWidgetId)
    .filter(widgetIsDockApp))];
  const defaultEnabled = ['pet-workspace', 'pals', 'loop'];
  const previousDefaultEnabled = ['reminders', 'traits', 'loop', 'pals', 'subs'];
  let activeId = null;
  let mobileCarouselOffset = 0;
  let dockRovingIndex = 0;
  const dockScrollMemory = {
    appStripTop: 0,
    mobileLeft: 0
  };

  function loadState() {
    try {
      const raw = localStorage.getItem('pp-widget-band');
      if (!raw) return { enabled: defaultEnabled.slice(), order: defaultEnabled.slice() };
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.enabled) && parsed.enabled.length) {
        const enabled = normalizeDockAppIds(parsed.enabled);
        const order = Array.isArray(parsed?.order)
          ? normalizeDockAppIds(parsed.order)
          : enabled.slice();
        enabled.forEach(id => { if (!order.includes(id)) order.push(id); });
        return { enabled, order };
      }
    } catch {}
    return { enabled: defaultEnabled.slice(), order: defaultEnabled.slice() };
  }

  function saveState(state) {
    try { localStorage.setItem('pp-widget-band', JSON.stringify(state)); } catch {}
  }

  let state = loadState();
  if (!state.order || !state.order.length) state.order = state.enabled.slice();
  if (!state.enabled || !state.enabled.length) state.enabled = defaultEnabled.slice();
  state.enabled = normalizeDockAppIds(state.enabled);
  state.order = normalizeDockAppIds(state.order);
  state.enabled.forEach((id) => {
    if (!state.order.includes(id)) state.order.push(id);
  });
  const previousDockDefaults = normalizeDockAppIds(previousDefaultEnabled);
  if (
    state.enabled.length === previousDockDefaults.length
    && state.order.length === previousDockDefaults.length
    && previousDockDefaults.every((id, index) => state.enabled[index] === id && state.order[index] === id)
  ) {
    state.enabled = defaultEnabled.slice();
    state.order = defaultEnabled.slice();
    saveState(state);
  } else {
    try {
      const savedState = localStorage.getItem('pp-widget-band');
      if (savedState && savedState !== JSON.stringify(state)) saveState(state);
    } catch {}
  }
  const escapeAttr = (value = '') => heroEsc(value);
  const escapeAttrSelector = (value = '') => String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const safeClassList = (value = '', fallback = '') => {
    const tokens = String(value || '')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => /^[a-zA-Z0-9_-]+$/.test(token));
    return tokens.join(' ') || fallback;
  };

  const safeIconClass = (value = '', fallback = 'bi-stars') =>
    safeClassList(value, fallback);

  const safeHref = (value = '', fallback = '#') => {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^(javascript|data|vbscript):/i.test(raw)) return fallback;
    if (raw.startsWith('//')) return fallback;
    try {
      const url = new URL(raw, window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') return raw;
    } catch {}
    return fallback;
  };

  const DOCK_SETTINGS_KEY = 'pp-widget-dock-settings-v1';
  const defaultDockSettings = {
    collapsed: false,
    side: 'left',
    size: 'md',
    providerWidgets: true
  };

  function loadDockSettings() {
    try {
      const raw = localStorage.getItem(DOCK_SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        collapsed: parsed?.collapsed === true,
        side: parsed?.side === 'right' ? 'right' : 'left',
        size: ['sm', 'md', 'lg'].includes(parsed?.size) ? parsed.size : 'md',
        providerWidgets: parsed?.providerWidgets !== false
      };
    } catch {
      return { ...defaultDockSettings };
    }
  }

  function saveDockSettings() {
    try { localStorage.setItem(DOCK_SETTINGS_KEY, JSON.stringify(dockSettings)); } catch {}
  }

  let dockSettings = loadDockSettings();
  let integrationsFocus = null;
  let dockReorderMode = false;

  function applyDockSettings() {
    shell.dataset.widgetCollapsed = dockSettings.collapsed ? '1' : '0';
    shell.dataset.widgetSide = dockSettings.side;
    shell.dataset.widgetSize = dockSettings.size;
    shell.dataset.widgetProviders = dockSettings.providerWidgets ? '1' : '0';
    dock.dataset.widgetCollapsed = shell.dataset.widgetCollapsed;
    dock.dataset.widgetSide = shell.dataset.widgetSide;
    dock.dataset.widgetSize = shell.dataset.widgetSize;
    dock.dataset.widgetProviders = shell.dataset.widgetProviders;
    delete shell.dataset.widgetLabels;
    delete shell.dataset.widgetBadges;
    delete dock.dataset.widgetLabels;
    delete dock.dataset.widgetBadges;
    try { document.dispatchEvent(new CustomEvent('pp:widgetDock:settings')); } catch {}
  }

  function applyDockInteractionMode() {
    const value = dockReorderMode ? '1' : '0';
    shell.dataset.dockReorderMode = value;
    dock.dataset.dockReorderMode = value;
  }

  function syncDockReorderItems() {
    dock.querySelectorAll('.pp-dock-app-bubble[data-widget-draggable="1"]').forEach((node) => {
      node.classList.toggle('is-reorderable', dockReorderMode);
    });
  }

  function setDockReorderMode(enabled, { render = true } = {}) {
    dockReorderMode = !!enabled;
    applyDockInteractionMode();
    if (!dockReorderMode) {
      dock.classList.remove('pp-dragging');
      dock.querySelectorAll('.pp-dragging').forEach((node) => node.classList.remove('pp-dragging'));
    }
    syncDockReorderItems();
    if (render) renderDock();
    debugLog('dock:reorder-mode', { enabled: dockReorderMode });
  }

  function updateDockSetting(key, value) {
    dockSettings[key] = value;
    saveDockSettings();
    applyDockSettings();
    renderDock();
  }

  applyDockSettings();
  applyDockInteractionMode();
  const appSdk = createWidgetAppSdk({
    layer: appLayer,
    storageKey: 'pp-widget-apps-v2',
    minWidth: 290,
    minHeight: 220,
    maxWidth: 560,
    maxHeight: 780,
    mobileBreakpoint: 600,
    startZ: 930,
    onStateChange: () => renderDock()
  });

  appSdk.registerProviders(pawketConnectorProviders);

  const pawketAppRegistry = createPawketAppRegistry({ apps: firstPartyPawketApps });
  const pawketAppDataBridge = createScopedAppDataBridge({
    getSourceData: () => ({
      pets: dockStatusCache.pets,
      journalMetrics: dockStatusCache.journalMetrics,
      featured: dockStatusCache.featured.length ? dockStatusCache.featured : appData.featured,
      stories: dockStatusCache.impactStories.length ? dockStatusCache.impactStories : appData.stories,
      activeCase: dockStatusCache.activeCase,
      loopSummary: dockStatusCache.loopSummary,
      dockSettings
    })
  });

  function executePawketAppIntent(manifest, intent = {}) {
    const type = String(intent.type || '').trim();
    if (type === 'navigate') {
      const href = safeHref(intent.href || '#', '#');
      if (href !== '#') window.location.href = href;
      return { ok: href !== '#', type };
    }
    if (type === 'send_pass') {
      if (typeof window.PP_openLoopModal === 'function') window.PP_openLoopModal();
      else window.location.href = '/loop.html';
      return { ok: true, type };
    }
    if (type === 'open_pal_creator') {
      window.location.href = '/pals.html#private-pal-certificate-form';
      return { ok: true, type };
    }
    if (type === 'open_story_composer') {
      window.location.href = '/pals.html#pal-story-intake';
      return { ok: true, type };
    }
    return { ok: true, type, appId: manifest?.id || '' };
  }

  function buildPawketAppContext(appId, extra = {}) {
    return {
      root: extra.root || appSdk.getBody(appId) || appLayer,
      windowEl: appSdk.getWindow(appId),
      data: appData,
      runtimeState: { dockStatusCache },
      providers: appSdk.listProviders(),
      integrationFocus: integrationsFocus,
      settings: { dockSettings, integrationsFocus },
      setBody: (id, html) => appSdk.setBody(id, html),
      fetchJson,
      actions: {
        setProviderState: (id, patch) => appSdk.setProviderState(id, patch),
        toggleProviderConnection: (id) => appSdk.toggleProviderConnection(id),
        setIntegrationsFocus: (id) => { integrationsFocus = id; },
        updateDockProviderWidgets: (value) => updateDockSetting('providerWidgets', value)
      },
      helpers: {
        cachePetsResponse,
        ensureCareJournalMetrics,
        renderCareJournalItems,
        renderCareHandoffChips,
        updateDockStatusStrip,
        hydrateCarePanel,
        careJournalTitle,
        formatCareJournalDate
      }
    };
  }

  const pawketAppHost = createPawketAppHost({
    registry: pawketAppRegistry,
    surface: 'dock',
    dataBridge: pawketAppDataBridge,
    makeContext: buildPawketAppContext,
    executeIntent: executePawketAppIntent
  });

  function appIsOpen(id) {
    return appSdk.isOpen(canonicalWidgetId(id));
  }

  function setAppBody(id, html) {
    appSdk.setBody(id, html);
  }

  function connectedProviderDockWidgets() {
    if (!dockSettings.providerWidgets) return [];
    return appSdk
      .listProviders()
      .filter((provider) => provider.connected && provider.enabled)
      .slice(0, 4)
      .map((provider) => ({
        id: `provider:${provider.id}`,
        providerId: provider.id,
        label: provider.name,
        hint: provider.description || 'Connected provider shortcut.',
        icon: provider.icon || 'bi-box-arrow-up-right',
        tag: provider.statusLabel || 'Connected'
      }));
  }

  function pct(value, fallback = 50) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return Math.max(0, Math.min(100, fallback));
    return Math.max(0, Math.min(100, raw));
  }

  function renderWidgetAppHero({
    id = '',
    icon = 'bi-stars',
    eyebrow = 'Pawket widget',
    title = 'Widget',
    body = '',
    chips = [],
    meter = null
  } = {}) {
    const meterPct = pct(meter?.value, 50);
    const chipHtml = Array.isArray(chips) && chips.length
      ? `<div class="pp-widget-app-hero-chips">${chips.slice(0, 4).map((chip) => `<span>${heroEsc(chip)}</span>`).join('')}</div>`
      : '';
    const meterHtml = meter
      ? `
        <div class="pp-widget-app-meter">
          <div class="pp-widget-app-meter-head">
            <span>${heroEsc(meter.label || 'Progress')}</span>
            <strong>${heroEsc(meter.valueLabel || `${Math.round(meterPct)}%`)}</strong>
          </div>
          <div class="pp-widget-app-meter-track"><span style="width:${meterPct}%;"></span></div>
        </div>
      `
      : '';

    return `
      <section class="pp-widget-app-hero" data-widget-app-hero="${escapeAttr(id)}">
        <div class="pp-widget-app-hero-main">
          <span class="pp-widget-app-hero-icon"><i class="bi ${safeIconClass(icon)}" aria-hidden="true"></i></span>
          <div>
            <span class="pp-widget-app-eyebrow">${heroEsc(eyebrow)}</span>
            <h4>${heroEsc(title)}</h4>
            ${body ? `<p>${heroEsc(body)}</p>` : ''}
          </div>
        </div>
        ${chipHtml}
        ${meterHtml}
      </section>
    `;
  }

  function renderWidgetTrail(items = []) {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <div class="pp-widget-app-trail">
        ${items.slice(0, 4).map((item, index) => `
          <span class="pp-widget-app-trail-item${index === 0 ? ' is-current' : ''}">
            <i class="bi ${safeIconClass(item.icon || 'bi-dot')}" aria-hidden="true"></i>
            <span>${heroEsc(item.label || '')}</span>
          </span>
        `).join('')}
      </div>
    `;
  }

  function renderLoopAppBody() {
    return `
      ${renderWidgetAppHero({
        id: 'loop',
        icon: 'bi-bag-heart',
        eyebrow: 'Pawket Shop',
        title: 'Shop, save, and share',
        body: 'Build a box, browse useful picks, and keep Pawket Passes close.',
        chips: ['Packs', 'Packets', 'Picks', 'Passes'],
        meter: { label: 'Shop path', value: 72, valueLabel: 'Ready' }
      })}
      <section class="pp-app-experience pp-shop-wallet pp-box-picker pp-pass-wallet" data-widget-app-hero="loop">
        <div class="pp-shop-wallet-grid">
          <div class="pp-box-stage">
            <span class="pp-box-lid" aria-hidden="true"></span>
            <span class="pp-box-badge">Box picker</span>
            <strong data-app-subs-spotlight>Loading featured picks...</strong>
            <em><span data-app-subs-price>--</span> spotlight</em>
          </div>
          <article class="pp-pass-card pp-pass-card--main">
            <span class="pp-pass-card-kicker">Pawket Pass</span>
            <strong data-app-loop-main-code>Ready to send</strong>
            <p data-app-loop-next>Send a gift, save a useful link, or keep a Pet Pawket visit moving.</p>
            <div class="pp-pass-route" aria-label="Pass route">
              <span>Shop</span>
              <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
              <span>Pass</span>
              <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
              <span>Return</span>
            </div>
          </article>
        </div>
        <div class="pp-box-options pp-box-options--shop" aria-label="Pawket shop paths">
          <a href="/packs.html"><i class="bi bi-box-seam" aria-hidden="true"></i><span>Packs</span></a>
          <a href="/packets.html"><i class="bi bi-bag-heart" aria-hidden="true"></i><span>Packets</span></a>
          <a href="/picks.html"><i class="bi bi-stars" aria-hidden="true"></i><span>Picks</span></a>
          <a href="/loop.html"><i class="bi bi-send" aria-hidden="true"></i><span>Passes</span></a>
        </div>
        <div class="pp-shop-wallet-shelves">
          <div class="pp-box-shelf" data-app-subs-list>
            <article class="pp-box-product-card">Loading featured products...</article>
          </div>
          <div class="pp-pass-wallet-pocket" data-app-loop-list>
            <article class="pp-pass-mini-card">No passes yet. Shop, gift, or save a pass to start.</article>
          </div>
        </div>
        <article class="pp-pass-note">
          <span><i class="bi bi-heart-pulse" aria-hidden="true"></i> CHARM note</span>
          <p data-app-loop-story>CHARM updates will appear when they are ready to share.</p>
        </article>
      </section>
      <div class="pp-widget-app-actions">
        <a class="is-primary" href="/packs.html">Build a Pack</a>
        <button type="button" data-app-loop-share>Send a Pass</button>
        <button type="button" data-app-subs-spin>Shuffle pick</button>
        <a href="/loop.html">Pass hub</a>
      </div>
      <div class="pp-widget-app-note"><span data-app-subs-count>--</span> featured picks loaded. Passes never expose private pet notes.</div>
    `;
  }

  function renderPalsAppBody() {
    const rawMood = Number(localStorage.getItem('pp-widget-pals-mood') || 60);
    const mood = Number.isFinite(rawMood) ? Math.max(0, Math.min(100, rawMood)) : 60;
    return `
      <section class="pp-app-experience pp-pals-studio" data-widget-app-hero="pals">
        <article class="pp-pal-certificate">
          <span class="pp-pal-cert-label">Private keepsake</span>
          <div class="pp-pal-medallion" aria-hidden="true">
            <i class="bi bi-stars"></i>
          </div>
          <h4 data-app-pals-focus>Start with a pet you love.</h4>
          <p data-app-pals-summary>Choose a profile or favorite memory, then make a private Pal when it feels right.</p>
          <div class="pp-heartcode-ribbon">
            <span>HeartCode</span>
            <strong>Created with your Pal</strong>
          </div>
        </article>
        <div class="pp-pal-studio-side">
          <div class="pp-pal-studio-meter">
            <div>
              <span>Pal warmth</span>
              <strong data-app-pals-mood-value>${mood}%</strong>
            </div>
            <input type="range" min="0" max="100" step="5" value="${mood}" data-app-pals-mood />
          </div>
          <div class="pp-pal-shelf" data-app-pals-list>
            <article class="pp-pal-shelf-card">Loading pet profiles…</article>
          </div>
          <div class="pp-pal-studio-count">
            <span><strong data-app-pals-count>--</strong> profiles</span>
            <span data-app-pals-species>Private by default</span>
          </div>
        </div>
      </section>
      <div class="pp-widget-app-actions">
        <a class="is-primary" href="/pals.html">Make a private Pal</a>
        <a href="/account.html#account-pets">Pet profiles</a>
        <button type="button" data-app-pals-random>New Pal idea</button>
      </div>
      <div class="pp-widget-app-note">You choose if a story should ever be shared.</div>
    `;
  }

  const CARE_QUICK_CHECKS_KEY = 'pp-widget-reminders';
  const CARE_QUICK_CHECKS = [
    { id: 'feed', label: 'Feed check-in', icon: 'bi-egg-fried' },
    { id: 'water', label: 'Refresh water', icon: 'bi-droplet' },
    { id: 'walk', label: 'Play or walk break', icon: 'bi-signpost-split' },
    { id: 'med', label: 'Wellness / meds check', icon: 'bi-heart-pulse' }
  ];

  function readCareQuickCheckIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CARE_QUICK_CHECKS_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      const valid = new Set(CARE_QUICK_CHECKS.map((task) => task.id));
      return parsed.map((id) => String(id || '')).filter((id) => valid.has(id));
    } catch {
      return [];
    }
  }

  function saveCareQuickCheckIds(ids = []) {
    const valid = new Set(CARE_QUICK_CHECKS.map((task) => task.id));
    const next = [...new Set((Array.isArray(ids) ? ids : [])
      .map((id) => String(id || ''))
      .filter((id) => valid.has(id)))];
    try { localStorage.setItem(CARE_QUICK_CHECKS_KEY, JSON.stringify(next)); } catch {}
    return next;
  }

  function careQuickCheckStats(ids = readCareQuickCheckIds()) {
    const doneIds = saveCareQuickCheckIds(ids);
    return {
      doneIds,
      doneSet: new Set(doneIds),
      doneCount: doneIds.length,
      total: CARE_QUICK_CHECKS.length
    };
  }

  function syncCareQuickCheckCounts(root = document, ids = readCareQuickCheckIds()) {
    const doneCount = ids.length;
    const total = CARE_QUICK_CHECKS.length;
    root.querySelectorAll('[data-care-panel-quick-done], [data-app-reminders-done]').forEach((el) => {
      el.textContent = String(doneCount);
    });
    root.querySelectorAll('[data-care-panel-quick-total]').forEach((el) => {
      el.textContent = String(total);
    });
    root.querySelectorAll('[data-app-reminders-togo]').forEach((el) => {
      el.textContent = String(Math.max(0, total - doneCount));
    });
  }

  function renderCareQuickCheckPanel() {
    const stats = careQuickCheckStats();
    return `
      <article class="pp-dock-care-quick" data-care-panel-quick>
        <div class="pp-dock-care-quick-head">
          <div>
            <span>Today's care rhythm</span>
            <strong>Quick checks before the full journal</strong>
          </div>
          <span class="pp-dock-care-quick-count"><span data-care-panel-quick-done>${stats.doneCount}</span>/<span data-care-panel-quick-total>${stats.total}</span></span>
        </div>
        <div class="pp-dock-care-check-list">
          ${CARE_QUICK_CHECKS.map((task) => `
            <label class="pp-dock-care-check">
              <input type="checkbox" data-care-panel-task="${escapeAttr(task.id)}" ${stats.doneSet.has(task.id) ? 'checked' : ''}>
              <span class="pp-dock-care-check-icon"><i class="bi ${safeIconClass(task.icon)}" aria-hidden="true"></i></span>
              <span>${heroEsc(task.label)}</span>
            </label>
          `).join('')}
        </div>
        <p class="pp-dock-care-footnote">These quick checks stay in this browser. Journals and favorite memories stay private unless you choose to share something later.</p>
      </article>
    `;
  }

  function renderStoriesAppBody() {
    return `
      <section class="pp-app-experience pp-storybook" data-widget-app-hero="stories">
        <article class="pp-storybook-page pp-storybook-page--spark">
          <span class="pp-storybook-kicker">Story spark</span>
          <h4>Something worth sharing starts gently.</h4>
          <p data-app-story-spark>Reviewed story sparks will appear after approved public updates.</p>
        </article>
        <div class="pp-storybook-tabs" aria-label="Story spaces">
          <a href="/community.html"><i class="bi bi-chat-heart" aria-hidden="true"></i> Pawprints</a>
          <a href="/charm.html"><i class="bi bi-heart-pulse" aria-hidden="true"></i> CHARM</a>
          <a href="/pals.html"><i class="bi bi-stars" aria-hidden="true"></i> Pals</a>
        </div>
        <div class="pp-storybook-feed" data-app-stories-list>
          <article class="pp-storybook-note">No public updates yet.</article>
        </div>
        <aside class="pp-storybook-privacy">
          <i class="bi bi-lock" aria-hidden="true"></i>
          <span>Private notes stay private. Public moments are shared by choice.</span>
        </aside>
      </section>
      <div class="pp-widget-app-actions">
        <button type="button" data-app-story-refresh>New spark</button>
        <a class="is-primary" href="/charm.html">Open CHARM</a>
        <a href="/community.html">Town Square</a>
      </div>
      <div class="pp-widget-app-note"><span data-app-stories-count>0</span> public updates loaded. <span data-app-stories-active>Shared when ready</span></div>
    `;
  }

  function renderSubsAppBody() {
    return renderLoopAppBody();
  }

  const CORE_MEMORY_KEY = 'pp-widget-core-memories';

  function loadCoreMemories() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CORE_MEMORY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 12) : [];
    } catch {
      return [];
    }
  }

  function saveCoreMemories(memories = []) {
    try {
      localStorage.setItem(CORE_MEMORY_KEY, JSON.stringify(memories.slice(0, 12)));
    } catch {}
  }

  function widgetAppBody(id) {
    if (pawketAppRegistry.has(id)) return pawketAppHost.render(id);
    return `<div class="pp-widget-app-note">App content coming soon.</div>`;
  }

  async function fetchJson(url) {
    try {
      const apiPath = new URL(url, window.location.origin).pathname;
      if (apiPath === '/api/pets' || apiPath === '/api/loop/me') {
        const session = await getSession();
        if (!session?.signedIn) return null;
      }
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function closeWidgetApp(id) {
    const canonicalId = canonicalWidgetId(id);
    appSdk.closeApp(canonicalId);
    if (canonicalId !== id) appSdk.closeApp(id);
    renderDock();
  }

  function widgetAppDefaults(id = '') {
    const dockRect = dock?.getBoundingClientRect?.() || null;
    const width = Math.min(460, Math.max(380, Math.round(window.innerWidth * 0.28)));
    const height = Math.min(430, Math.max(380, Math.round(window.innerHeight * 0.48)));
    const widgetIndex = Math.max(0, widgets.findIndex((widget) => widget.id === id));
    const offsetX = (widgetIndex % 3) * 18;
    const offsetY = (widgetIndex % 4) * 22;
    const y = Math.max(getNavOffsetPx() + 22, Math.round((dockRect?.top || 300) + 12 + offsetY));
    const x = dockSettings.side === 'right'
      ? Math.max(12, Math.round((dockRect?.left || window.innerWidth) - width - 24 - offsetX))
      : Math.min(
          Math.max(12, window.innerWidth - width - 12),
          Math.max(196, Math.round((dockRect?.right || 172) + 24 + offsetX))
        );
    return { x, y, w: width, h: height };
  }

  function normalizeWidgetAppEntry(id, defaults) {
    const entry = appSdk.ensureEntry(id, defaults);
    if (!entry) return;
    const minW = Math.min(defaults.w, window.innerWidth - 20);
    const minH = Math.min(defaults.h, Math.max(300, window.innerHeight - getNavOffsetPx() - 28));
    if ((Number(entry.w) || 0) < minW) entry.w = minW;
    if ((Number(entry.h) || 0) < minH) entry.h = minH;
  }

  function openWidgetApp(id) {
    id = canonicalWidgetId(id);
    if (mergedWidgetIds.has(id)) {
      setActiveDockAction('care');
      return;
    }
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    const defaults = widgetAppDefaults(id);
    normalizeWidgetAppEntry(id, defaults);
    appSdk.openApp({
      id,
      title: widget.title,
      subtitle: widget.hint || 'Widget app',
      icon: widget.icon,
      themeClass: `is-${id}`,
      bodyHtml: widgetAppBody(id),
      defaults
    });
    hydrateAppWindow(id);
    renderDock();
  }

  function toggleWidgetApp(id) {
    id = canonicalWidgetId(id);
    if (mergedWidgetIds.has(id)) {
      setActiveDockAction('care');
      return;
    }
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    const defaults = widgetAppDefaults(id);
    if (!appSdk.isOpen(id)) normalizeWidgetAppEntry(id, defaults);
    appSdk.toggleApp({
      id,
      title: widget.title,
      subtitle: widget.hint || 'Widget app',
      icon: widget.icon,
      themeClass: `is-${id}`,
      bodyHtml: widgetAppBody(id),
      defaults
    });
    if (appSdk.isOpen(id)) hydrateAppWindow(id);
    renderDock();
  }

  function randomFrom(arr = []) {
    if (!Array.isArray(arr) || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const CARE_HANDOFF_LABELS = {
    'pawket-pals': 'Pawket Pals',
    'charm-foundation': 'CHARM',
    'share-studio': 'Share Studio',
    'town-square': 'Town Square'
  };

  const CARE_JOURNAL_TYPE_LABELS = {
    note: 'Daily note',
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
    weight: 'Weight note',
    allergy: 'Allergy note',
    rescue: 'Rescue/adoption note',
    memorial: 'Memorial note',
    charm: 'CHARM note',
    'pawket-pal': 'Pawket Pal note'
  };

  const CARE_JOURNAL_TYPE_ICONS = {
    note: 'bi-journal-text',
    story: 'bi-bookmark-heart',
    milestone: 'bi-award',
    wellness: 'bi-heart-pulse',
    vet: 'bi-clipboard2-pulse',
    medication: 'bi-capsule',
    meal: 'bi-egg-fried',
    walk: 'bi-signpost-split',
    training: 'bi-mortarboard',
    grooming: 'bi-scissors',
    play: 'bi-joystick',
    behavior: 'bi-chat-heart',
    weight: 'bi-speedometer2',
    allergy: 'bi-exclamation-triangle',
    rescue: 'bi-house-heart',
    memorial: 'bi-stars',
    charm: 'bi-shield-heart',
    'pawket-pal': 'bi-controller'
  };

  function emptyCareMetrics(extra = {}) {
    return {
      loaded: false,
      signedIn: false,
      journalCount: 0,
      coreMemoryCount: 0,
      handoffTargets: [],
      entries: [],
      coreEntries: [],
      latest: null,
      latestCore: null,
      ...extra
    };
  }

  function normalizeCareTags(input) {
    if (Array.isArray(input)) {
      return input.map((tag) => String(tag).replace(/^#/, '').trim()).filter(Boolean);
    }
    const raw = String(input || '').trim();
    if (!raw) return [];
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return normalizeCareTags(parsed);
      } catch {}
    }
    return raw.split(',').map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean);
  }

  function normalizeCareMetadata(input) {
    if (input && typeof input === 'object' && !Array.isArray(input)) return input;
    if (typeof input === 'string' && input.trim()) {
      try {
        const parsed = JSON.parse(input);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {}
    }
    return {};
  }

  function normalizeCareJournalEntry(raw = {}, pet = {}) {
    const entryType = String(raw.entryType || raw.entry_type || 'note').trim().toLowerCase() || 'note';
    const createdAt = raw.createdAt || raw.created_at || raw.created || raw.updatedAt || raw.updated_at || '';
    const occurredAt = raw.occurredAt || raw.occurred_at || raw.date || createdAt;
    const metadata = normalizeCareMetadata(raw.metadata);
    return {
      id: String(raw.id || raw.entryId || `${pet.id || 'pet'}-${occurredAt || createdAt || entryType}`),
      petId: String(raw.petId || raw.pet_id || pet.id || ''),
      petName: String(raw.petName || raw.pet_name || pet.name || 'Pet'),
      species: String(raw.species || pet.species || ''),
      title: String(raw.title || raw.noteTitle || '').trim(),
      text: String(raw.text || raw.note || raw.description || '').trim(),
      entryType,
      occurredAt,
      createdAt,
      highlighted: raw.highlighted === true || raw.coreMemory === true,
      visibility: String(raw.visibility || 'private').trim().toLowerCase() || 'private',
      tags: normalizeCareTags(raw.tags),
      metadata
    };
  }

  function careJournalTime(entry = {}) {
    const time = new Date(entry.occurredAt || entry.createdAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function careJournalTitle(entry = {}) {
    if (entry.title) return entry.title;
    return CARE_JOURNAL_TYPE_LABELS[entry.entryType] || 'Journal entry';
  }

  function careJournalIcon(entryType = 'note') {
    return CARE_JOURNAL_TYPE_ICONS[entryType] || CARE_JOURNAL_TYPE_ICONS.note;
  }

  function formatCareJournalDate(value = '') {
    const time = new Date(value || 0).getTime();
    if (!Number.isFinite(time) || time <= 0) return '';
    try {
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(time));
    } catch {
      return '';
    }
  }

  function inferCareJournalHandoffs(entry = {}) {
    const targets = new Set();
    const tags = normalizeCareTags(entry.tags).map((tag) => tag.toLowerCase());
    const metadataTargets = Array.isArray(entry.metadata?.handoffTargets) ? entry.metadata.handoffTargets : [];
    metadataTargets.forEach((target) => {
      const key = String(target || '').trim();
      if (key) targets.add(key);
    });

    if (entry.highlighted || ['story', 'milestone', 'memorial', 'rescue', 'pawket-pal'].includes(entry.entryType)) {
      targets.add('pawket-pals');
    }
    if (
      ['vet', 'medication', 'wellness', 'allergy', 'weight', 'rescue', 'charm'].includes(entry.entryType) ||
      entry.visibility === 'charm-foundation' ||
      tags.some((tag) => ['rescue', 'adoption', 'foster', 'medical', 'shelter'].includes(tag))
    ) {
      targets.add('charm-foundation');
    }
    if (entry.visibility === 'shareable' || entry.visibility === 'community' || entry.highlighted) {
      targets.add('share-studio');
    }
    if (entry.visibility === 'community') targets.add('town-square');
    return [...targets];
  }

  function renderCareHandoffChips(targets = [], emptyLabel = 'Private by default') {
    const normalized = Array.isArray(targets) ? targets.filter(Boolean) : [];
    const chips = normalized.length
      ? normalized.slice(0, 5).map((target) => CARE_HANDOFF_LABELS[target] || target)
      : [emptyLabel];
    return chips.map((label) => `<span class="pp-care-handoff-chip">${heroEsc(label)}</span>`).join('');
  }

  function renderCarePurposeTrail(metrics = emptyCareMetrics()) {
    const handoffTargets = Array.isArray(metrics.handoffTargets) ? metrics.handoffTargets : [];
    const labels = handoffTargets.length
      ? handoffTargets.slice(0, 4).map((target) => CARE_HANDOFF_LABELS[target] || target)
      : ['Journals', 'Favorite memories', 'CHARM', 'Pawket Pals'];
    const icons = ['bi-journal-heart', 'bi-gem', 'bi-heart-pulse', 'bi-stars'];
    return `
      <div class="pp-dock-care-purpose" aria-label="Care and impact path">
        ${labels.map((label, index) => `
          <span class="pp-dock-care-purpose-step">
            <i class="bi ${safeIconClass(icons[index] || 'bi-stars')}" aria-hidden="true"></i>
            ${heroEsc(label)}
          </span>
        `).join('')}
      </div>
    `;
  }

  const CARE_JOURNAL_COMPOSER_TYPES = [
    'note',
    'wellness',
    'meal',
    'walk',
    'play',
    'story',
    'milestone',
    'vet',
    'medication',
    'grooming',
    'training',
    'behavior',
    'rescue',
    'charm',
    'pawket-pal',
    'memorial'
  ];

  const CARE_JOURNAL_VISIBILITY_OPTIONS = [
    { value: 'private', label: 'Private journal' },
    { value: 'shareable', label: 'Share Studio candidate' },
    { value: 'charm-foundation', label: 'CHARM care note' },
    { value: 'community', label: 'Town Square candidate' }
  ];

  function careComposerSelectedPet(pets = dockStatusCache.pets) {
    const list = Array.isArray(pets) ? pets.filter((pet) => pet?.id) : [];
    if (!list.length) return null;
    const selected = list.find((pet) => String(pet.id) === String(careComposerSelectedPetId));
    return selected || list[0];
  }

  function renderCareJournalComposer(metrics = emptyCareMetrics()) {
    const pets = Array.isArray(dockStatusCache.pets) ? dockStatusCache.pets.filter((pet) => pet?.id) : [];
    if (!dockStatusCache.petsSignedIn || !pets.length) return '';
    const selectedPet = careComposerSelectedPet(pets);
    const selectedPetId = String(selectedPet?.id || '');
    const feedback = careComposerFeedback;
    const feedbackClass = feedback?.tone ? ` is-${safeClassList(feedback.tone, 'muted')}` : '';
    const quickChecksDone = readCareQuickCheckIds().length;
    const recentCount = Number(metrics?.journalCount || 0);

    return `
      <section class="pp-dock-care-compose" data-care-journal-compose>
        <div class="pp-dock-care-compose-head">
          <span class="pp-dock-care-compose-icon"><i class="bi bi-journal-plus" aria-hidden="true"></i></span>
          <div>
            <span>Save to pet journal</span>
            <strong>Add the care moment without leaving this panel</strong>
          </div>
        </div>
        <form class="pp-dock-care-form" data-care-journal-form>
          <div class="pp-dock-care-form-grid">
            <label>
              <span>Pet</span>
              <select name="petId" data-care-journal-pet>
                ${pets.map((pet) => {
                  const petId = String(pet.id || '');
                  return `<option value="${escapeAttr(petId)}"${petId === selectedPetId ? ' selected' : ''}>${heroEsc(pet.name || 'Pet')}</option>`;
                }).join('')}
              </select>
            </label>
            <label>
              <span>Moment</span>
              <select name="entryType">
                ${CARE_JOURNAL_COMPOSER_TYPES.map((type) => (
                  `<option value="${escapeAttr(type)}">${heroEsc(CARE_JOURNAL_TYPE_LABELS[type] || 'Journal entry')}</option>`
                )).join('')}
              </select>
            </label>
            <label class="is-wide">
              <span>Title <em>optional</em></span>
              <input name="title" type="text" maxlength="90" placeholder="${escapeAttr(selectedPet?.name ? `${selectedPet.name}'s care note` : 'Care note title')}">
            </label>
            <label class="is-wide">
              <span>Journal note</span>
              <textarea name="text" rows="3" maxlength="900" required placeholder="What happened, what helped, or what should be remembered?"></textarea>
            </label>
            <label>
              <span>Tags</span>
              <input name="tags" type="text" placeholder="care, walk, comfort">
            </label>
            <label>
              <span>Privacy</span>
              <select name="visibility">
                ${CARE_JOURNAL_VISIBILITY_OPTIONS.map((option) => (
                  `<option value="${escapeAttr(option.value)}">${heroEsc(option.label)}</option>`
                )).join('')}
              </select>
            </label>
          </div>
          <div class="pp-dock-care-compose-footer">
            <label class="pp-dock-care-core-check">
              <input type="checkbox" name="highlighted">
              <span><i class="bi bi-stars" aria-hidden="true"></i> Mark as favorite memory</span>
            </label>
            <button type="submit" data-care-journal-submit>
              <i class="bi bi-journal-check" aria-hidden="true"></i>
              Save entry
            </button>
          </div>
          <div class="pp-dock-care-compose-meta">
            <span>${recentCount} saved journal ${recentCount === 1 ? 'entry' : 'entries'}</span>
            <span>${quickChecksDone}/${CARE_QUICK_CHECKS.length} quick checks today</span>
          </div>
          <p class="pp-dock-care-compose-status${feedbackClass}" data-care-journal-status role="status">${feedback?.message ? heroEsc(feedback.message) : ''}</p>
        </form>
      </section>
    `;
  }

  function renderCareJournalItems(entries = [], emptyText = 'No journal entries yet.') {
    const rows = Array.isArray(entries) ? entries.filter(Boolean).slice(0, 4) : [];
    if (!rows.length) return `<li>${heroEsc(emptyText)}</li>`;
    return rows.map((entry) => {
      const title = careJournalTitle(entry);
      const date = formatCareJournalDate(entry.occurredAt || entry.createdAt);
      const petLine = [entry.petName || 'Pet', date].filter(Boolean).join(' • ');
      const snippet = entry.text ? truncateWords(entry.text, 12) : (CARE_JOURNAL_TYPE_LABELS[entry.entryType] || 'Journal note');
      const coreBadge = entry.highlighted
        ? '<span class="pp-care-entry-badge"><i class="bi bi-stars" aria-hidden="true"></i> Core</span>'
        : '';
      return `
        <li class="pp-care-entry-row">
          <span class="pp-care-entry-icon"><i class="bi ${safeIconClass(careJournalIcon(entry.entryType))}" aria-hidden="true"></i></span>
          <span class="pp-care-entry-copy">
            <strong>${heroEsc(title)}</strong>
            <small>${heroEsc(petLine || 'Private journal')}</small>
            <em>${heroEsc(snippet)}</em>
          </span>
          ${coreBadge}
        </li>
      `;
    }).join('');
  }

  async function fetchCareJournalMetrics(pets = []) {
    const petList = Array.isArray(pets) ? pets.filter((pet) => pet?.id).slice(0, 8) : [];
    if (!petList.length) {
      return emptyCareMetrics({ loaded: true, signedIn: dockStatusCache.petsSignedIn });
    }

    const results = await Promise.allSettled(petList.map(async (pet) => {
      const data = await fetchJson(`/api/pets/${encodeURIComponent(pet.id)}/journal`);
      const rows = Array.isArray(data) ? data : (data?.journal || data?.entries || data?.items || []);
      return Array.isArray(rows) ? rows.map((entry) => normalizeCareJournalEntry(entry, pet)) : [];
    }));
    const entries = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    const sorted = entries.slice().sort((a, b) => careJournalTime(b) - careJournalTime(a));
    const coreEntries = sorted.filter((entry) => entry.highlighted);
    const handoffTargets = new Set();
    sorted.forEach((entry) => {
      inferCareJournalHandoffs(entry).forEach((target) => handoffTargets.add(target));
    });

    return emptyCareMetrics({
      loaded: true,
      signedIn: true,
      journalCount: entries.length,
      coreMemoryCount: coreEntries.length,
      handoffTargets: [...handoffTargets],
      entries: sorted.slice(0, 8),
      coreEntries: coreEntries.slice(0, 8),
      latest: sorted[0] || null,
      latestCore: coreEntries[0] || null
    });
  }

  const appData = {
    stories: [],
    featured: [],
    pets: [],
    journalMetrics: emptyCareMetrics()
  };

  const dockStatusCache = {
    petsLoaded: false,
    petsSignedIn: false,
    journalsLoaded: false,
    productsLoaded: false,
    impactLoaded: false,
    loopLoaded: false,
    pets: [],
    journalMetrics: emptyCareMetrics(),
    featured: [],
    impactStories: [],
    activeCase: null,
    loopSummary: null
  };
  let careComposerSelectedPetId = null;
  let careComposerFeedback = null;

  function cachePetsResponse(petsRes) {
    const signedIn = Array.isArray(petsRes?.pets);
    const nextPets = signedIn ? petsRes.pets : [];
    const previousSignature = dockStatusCache.pets.map((pet) => String(pet.id || '')).join('|');
    const nextSignature = nextPets.map((pet) => String(pet.id || '')).join('|');
    dockStatusCache.petsLoaded = true;
    dockStatusCache.petsSignedIn = signedIn;
    dockStatusCache.pets = nextPets;
    appData.pets = nextPets;
    if (previousSignature !== nextSignature) {
      dockStatusCache.journalsLoaded = false;
      dockStatusCache.journalMetrics = emptyCareMetrics({ signedIn });
      appData.journalMetrics = dockStatusCache.journalMetrics;
    }
    return nextPets;
  }

  async function ensurePetsLoaded(force = false) {
    if (!force && dockStatusCache.petsLoaded) return dockStatusCache.pets;
    const petsRes = await fetchJson('/api/pets');
    return cachePetsResponse(petsRes);
  }

  async function ensureCareJournalMetrics(force = false) {
    if (!force && dockStatusCache.journalsLoaded) return dockStatusCache.journalMetrics;
    await ensurePetsLoaded(force && !dockStatusCache.petsLoaded);
    const metrics = await fetchCareJournalMetrics(dockStatusCache.pets);
    dockStatusCache.journalsLoaded = true;
    dockStatusCache.journalMetrics = metrics;
    appData.journalMetrics = metrics;
    return metrics;
  }

  function setCareComposerFeedback(message = '', tone = 'muted') {
    careComposerFeedback = message ? { message, tone } : null;
    const status = panel.querySelector('[data-care-journal-status]');
    if (status) {
      status.textContent = message;
      status.classList.remove('is-muted', 'is-danger', 'is-success');
      if (tone) status.classList.add(`is-${safeClassList(tone, 'muted')}`);
    }
  }

  function setCareJournalFormBusy(form, busy = false) {
    form?.querySelectorAll('input, select, textarea, button').forEach((control) => {
      control.disabled = busy;
    });
  }

  function focusCareComposer() {
    const form = panel.querySelector('[data-care-journal-form]');
    if (!form) {
      panel.querySelector('[data-care-panel-live]')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    form.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    setTimeout(() => {
      const textarea = form.querySelector('textarea[name="text"]');
      textarea?.focus?.();
    }, 80);
  }

  async function submitCareJournalFromPanel(form) {
    const formData = new FormData(form);
    const petId = String(formData.get('petId') || '').trim();
    const text = String(formData.get('text') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const entryType = String(formData.get('entryType') || 'note').trim() || 'note';
    const visibility = String(formData.get('visibility') || 'private').trim() || 'private';
    const tags = normalizeCareTags(formData.get('tags') || '');
    const highlighted = form.querySelector('[name="highlighted"]')?.checked === true;
    const pet = dockStatusCache.pets.find((item) => String(item.id || '') === petId) || null;

    if (!petId || !pet) {
      setCareComposerFeedback('Choose a pet before saving this journal entry.', 'danger');
      form.querySelector('[name="petId"]')?.focus?.();
      return;
    }
    if (!text) {
      setCareComposerFeedback('Add a journal note before saving.', 'danger');
      form.querySelector('[name="text"]')?.focus?.();
      return;
    }

    const handoffTargets = inferCareJournalHandoffs({ entryType, visibility, highlighted, tags });
    const metadata = {
      source: 'dock-care-journal',
      schemaVersion: 1,
      petName: pet.name || null,
      quickChecks: readCareQuickCheckIds(),
      handoffTargets,
      updatedAt: new Date().toISOString()
    };

    careComposerSelectedPetId = petId;
    setCareJournalFormBusy(form, true);
    setCareComposerFeedback('Saving journal entry...', 'muted');
    try {
      const res = await fetch(`/api/pets/${encodeURIComponent(petId)}/journal`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          entryType,
          occurredAt: new Date().toISOString(),
          text,
          tags,
          highlighted,
          visibility,
          metadata
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      careComposerFeedback = {
        message: `Journal entry saved${pet.name ? ` for ${pet.name}` : ''}.`,
        tone: 'success'
      };
      dockStatusCache.journalsLoaded = false;
      await refreshCareSurfaces({ forcePets: false });
      try {
        document.dispatchEvent(new CustomEvent('pp:story:refresh', {
          detail: { source: 'dock-journal-created', skipDock: true }
        }));
      } catch {}
    } catch (err) {
      console.warn('[widgetDock] care journal create failed:', err);
      setCareComposerFeedback('Could not save this journal entry. Please try again.', 'danger');
      setCareJournalFormBusy(form, false);
    }
  }

  function countConnectedProviders() {
    try {
      return appSdk.listProviders().filter((provider) => provider.connected).length;
    } catch {
      return 0;
    }
  }

  function statusValue(value, fallback = '--') {
    if (value == null || value === '') return fallback;
    return String(value);
  }

  function renderDockStatusShell(actionId) {
    const rows = buildDockStatusRows(actionId);
    const statusHtml = rows.map((row) => `
      <div class="pp-dock-status-item">
        <strong data-dock-status-value="${escapeAttr(row.key)}">${heroEsc(row.value)}</strong>
        <span>${heroEsc(row.label)}</span>
      </div>
    `).join('');
    return `
      <div class="pp-dock-status-strip" data-dock-status-strip="${escapeAttr(actionId)}">
        ${statusHtml}
      </div>
    `;
  }

  function buildDockStatusRows(actionId) {
    const memories = loadCoreMemories();
    const pets = dockStatusCache.pets;
    const petCount = dockStatusCache.petsLoaded && dockStatusCache.petsSignedIn ? pets.length : null;
    const journalMetrics = dockStatusCache.journalMetrics || emptyCareMetrics();
    const journalReady = dockStatusCache.journalsLoaded;
    const careNeedsSignIn = (dockStatusCache.petsLoaded && !dockStatusCache.petsSignedIn) || (journalReady && !journalMetrics.signedIn);
    const careSignInValue = careNeedsSignIn ? 'Sign in' : '--';
    const storyCount = dockStatusCache.impactLoaded ? dockStatusCache.impactStories.length : null;
    const activeCase = dockStatusCache.impactLoaded ? !!dockStatusCache.activeCase : null;
    const featured = dockStatusCache.productsLoaded ? dockStatusCache.featured.length : null;
    const loopSummary = dockStatusCache.loopSummary;
    const sentTokens = Array.isArray(loopSummary?.sentTokens) ? loopSummary.sentTokens.length : null;
    const openApps = visibleDockWidgets().filter((widget) => appIsOpen(widget.id)).length;
    const connectedProviders = countConnectedProviders();

    if (actionId === 'care') {
      return [
        { key: 'journals', value: careNeedsSignIn ? 'Sign in' : (journalReady ? journalMetrics.journalCount : '--'), label: 'Journal entries' },
        { key: 'memories', value: careNeedsSignIn ? 'Sign in' : (journalReady ? journalMetrics.coreMemoryCount : '--'), label: 'Favorite memories' },
        { key: 'handoffs', value: careNeedsSignIn ? '--' : (journalReady ? journalMetrics.handoffTargets.length : '--'), label: 'Links' }
      ];
    }
    if (actionId === 'shop') {
      return [
        { key: 'featured', value: featured == null ? '--' : featured, label: 'Featured picks' },
        { key: 'packs', value: '3', label: 'Pack types' },
        { key: 'packets', value: '2+', label: 'Ways in' }
      ];
    }
    if (actionId === 'impact') {
      return [
        { key: 'stories', value: storyCount == null ? '--' : storyCount, label: 'Impact updates' },
        { key: 'active', value: activeCase == null ? '--' : (activeCase ? 'Live' : 'Review'), label: 'CHARM case' },
        { key: 'passes', value: sentTokens == null ? (dockStatusCache.loopLoaded ? '0' : '--') : sentTokens, label: 'Passes' }
      ];
    }
    if (actionId === 'pals') {
      const species = new Set(pets.map((pet) => String(pet.species || '').trim()).filter(Boolean));
      const memorySeeds = journalReady ? journalMetrics.coreMemoryCount : memories.length;
      return [
        { key: 'profiles', value: petCount == null ? (dockStatusCache.petsLoaded ? 'Sign in' : '--') : petCount, label: 'Profile inputs' },
        { key: 'species', value: petCount == null ? '--' : species.size, label: 'Species mix' },
        { key: 'memories', value: memorySeeds, label: 'Memory seeds' }
      ];
    }
    return [
      { key: 'apps', value: openApps, label: 'Open apps' },
      { key: 'providers', value: connectedProviders, label: 'Providers' },
      { key: 'enabled', value: state.enabled.length, label: 'Enabled tools' }
    ];
  }

  function updateDockStatusStrip(actionId) {
    const strip = panel.querySelector(`[data-dock-status-strip="${escapeAttrSelector(actionId)}"]`);
    if (!strip) return;
    buildDockStatusRows(actionId).forEach((row) => {
      const valueEl = strip.querySelector(`[data-dock-status-value="${escapeAttrSelector(row.key)}"]`);
      if (valueEl) valueEl.textContent = statusValue(row.value);
    });
  }

  async function ensureDockPanelStatus(actionId) {
    const needsPets = ['care', 'pals'].includes(actionId);
    const needsJournals = ['care', 'pals'].includes(actionId);
    const needsProducts = actionId === 'shop';
    const needsImpact = ['care', 'impact'].includes(actionId);
    const tasks = [];

    if (needsPets && !dockStatusCache.petsLoaded) {
      tasks.push((async () => {
        const petsRes = await fetchJson('/api/pets');
        cachePetsResponse(petsRes);
      })());
    }

    if (needsProducts && !dockStatusCache.productsLoaded) {
      tasks.push((async () => {
        const featuredRes = await fetchJson('/api/products/featured?limit=8');
        dockStatusCache.productsLoaded = true;
        dockStatusCache.featured = Array.isArray(featuredRes?.items) ? featuredRes.items : [];
        appData.featured = dockStatusCache.featured;
      })());
    }

    if (needsImpact && !dockStatusCache.impactLoaded) {
      tasks.push((async () => {
        const [storiesRes, activeRes] = await Promise.all([
          fetchJson('/api/loop/impact?limit=5'),
          fetchJson('/api/loop/impact/active')
        ]);
        dockStatusCache.impactLoaded = true;
        dockStatusCache.impactStories = Array.isArray(storiesRes?.stories) ? storiesRes.stories : [];
        dockStatusCache.activeCase = activeRes?.activeCase || null;
        appData.stories = dockStatusCache.impactStories;
      })());
    }

    if (needsImpact && !dockStatusCache.loopLoaded) {
      tasks.push((async () => {
        const summary = await fetchJson('/api/loop/me');
        dockStatusCache.loopLoaded = true;
        dockStatusCache.loopSummary = summary?.ok ? summary : null;
      })());
    }

    if (tasks.length) await Promise.allSettled(tasks);
    if (needsJournals && !dockStatusCache.journalsLoaded) {
      await ensureCareJournalMetrics();
    }
    if (activeId === dockActionPanelId(actionId)) updateDockStatusStrip(actionId);
    if (actionId === 'care') hydrateCarePanel();
  }

  function renderSparkFromStories() {
    const sparkEl = appLayer.querySelector('[data-app-story-spark]');
    const story = randomFrom(appData.stories);
    if (!sparkEl) return;
    if (!story) {
      sparkEl.textContent = 'No public story is ready yet. Start with your private story or open CHARM.';
      return;
    }
    const title = story.title || story.name || 'Rescue story';
    const detail = story.summary || story.snippet || story.description || 'Community impact update.';
    sparkEl.textContent = `${title}: ${detail}`;
  }

  function renderRandomSubSpotlight() {
    const spotEl = appLayer.querySelector('[data-app-subs-spotlight]');
    const priceEl = appLayer.querySelector('[data-app-subs-price]');
    const item = randomFrom(appData.featured);
    if (!spotEl || !priceEl) return;
    if (!item) {
      spotEl.textContent = 'No pack spotlight loaded yet.';
      priceEl.textContent = '--';
      return;
    }
    const title = item.title || 'Featured pick';
    const min = item.priceRange?.minVariantPrice;
    const rawAmount = Number(min?.amount);
    const amount = Number.isFinite(rawAmount) ? `$${rawAmount.toFixed(2)}` : '--';
    spotEl.textContent = `${title}`;
    priceEl.textContent = amount;
  }

  function productPriceLabel(item = {}) {
    const min = item.priceRange?.minVariantPrice;
    const rawAmount = Number(min?.amount);
    return Number.isFinite(rawAmount) ? `$${rawAmount.toFixed(2)}` : 'Open';
  }

  function productHref(item = {}) {
    const handle = String(item.handle || '').trim();
    if (handle) return `/product.html?handle=${encodeURIComponent(handle)}`;
    return '/shop.html';
  }

  function renderRandomTraitFocus() {
    const focusEl = appLayer.querySelector('[data-app-traits-focus]');
    const pet = randomFrom(appData.pets);
    const memories = loadCoreMemories();
    const metrics = appData.journalMetrics || emptyCareMetrics();
    if (!focusEl) return;
    if (metrics.latestCore) {
      const title = careJournalTitle(metrics.latestCore);
      const petName = metrics.latestCore.petName || 'your pet';
      focusEl.textContent = `Latest favorite memory: ${petName} - ${title}.`;
      return;
    }
    if (metrics.latest) {
      const title = careJournalTitle(metrics.latest);
      const petName = metrics.latest.petName || 'your pet';
      focusEl.textContent = `Latest journal moment: ${petName} - ${title}. Mark it as a favorite memory if it feels meaningful.`;
      return;
    }
    if (!pet) {
      focusEl.textContent = memories.length
        ? `Latest locked memory: ${memories[0].petName || 'Your pet'} — ${memories[0].label || 'Story moment'}`
        : 'Add pet profiles to unlock memory prompts.';
      return;
    }
    const species = String(pet.species || '').toLowerCase();
    const prompt = species.includes('cat')
      ? 'lock a cozy observation, favorite perch, or trust-building routine.'
      : 'lock a brave moment, scent-game win, or care breakthrough.';
    focusEl.textContent = `${pet.name || 'Pet profile'} memory prompt: ${prompt}`;
  }

  function renderRandomPalProfile() {
    const listEl = appLayer.querySelector('[data-app-pals-list]');
    if (!listEl) return;
    if (!appData.pets.length) {
      listEl.innerHTML = '<article class="pp-pal-shelf-card">Create a pet profile to start your first Pal idea.</article>';
      return;
    }
    const pet = randomFrom(appData.pets);
    const item = document.createElement('article');
    item.className = 'pp-pal-shelf-card is-new';
    item.innerHTML = `
      <span>${heroEsc(pet.species || 'Pet profile')}</span>
      <strong>${heroEsc(pet.name || 'Pet')} Pal idea</strong>
      <em>Choose one gentle trait, memory, or care ritual.</em>
    `;
    listEl.prepend(item);
    const items = listEl.querySelectorAll('.pp-pal-shelf-card');
    if (items.length > 5) items[items.length - 1].remove();
  }

  async function hydrateLoopApp() {
    const [summary, story] = await Promise.all([
      fetchJson('/api/loop/me'),
      fetchJson('/api/loop/impact/random')
    ]);

    const pointsEl = appLayer.querySelector('[data-app-loop-points]');
    const chainsEl = appLayer.querySelector('[data-app-loop-chains]');
    const badgesEl = appLayer.querySelector('[data-app-loop-badges]');
    const storyEl = appLayer.querySelector('[data-app-loop-story]');
    const nextEl = appLayer.querySelector('[data-app-loop-next]');
    const listEl = appLayer.querySelector('[data-app-loop-list]');
    const mainCodeEl = appLayer.querySelector('[data-app-loop-main-code]');

    if (summary?.ok) {
      const sent = Array.isArray(summary.sentTokens) ? summary.sentTokens : [];
      const badges = Array.isArray(summary.badges) ? summary.badges : [];
      if (pointsEl) pointsEl.textContent = String(summary.points ?? 0);
      if (chainsEl) chainsEl.textContent = String(sent.length);
      if (badgesEl) badgesEl.textContent = String(badges.length);
      if (nextEl) {
        const recent = sent[0];
        nextEl.textContent = recent?.code
          ? `Latest pass ${recent.code} is active. Share it with someone next.`
          : 'Shop, gift, or save a pass to start.';
      }
      if (mainCodeEl) mainCodeEl.textContent = sent[0]?.code || 'Ready to send';
      if (listEl) {
        listEl.innerHTML = sent.length
          ? sent.slice(0, 4).map((token) => {
              const chainLength = Math.max(1, Math.floor(Number(token.chainLength) || 1));
              return `
                <article class="pp-pass-mini-card">
                  <span>${heroEsc(token.code || 'PASS')}</span>
                  <strong>${chainLength} connected</strong>
                </article>
              `;
            }).join('')
          : '<article class="pp-pass-mini-card">No passes yet. Shop, gift, or save a pass to start.</article>';
      }
    } else {
      if (pointsEl) pointsEl.textContent = '--';
      if (chainsEl) chainsEl.textContent = '--';
      if (badgesEl) badgesEl.textContent = '--';
      if (nextEl) nextEl.textContent = 'Sign in to load your live pass summary.';
      if (mainCodeEl) mainCodeEl.textContent = 'Sign in for wallet';
      if (listEl) listEl.innerHTML = '<article class="pp-pass-mini-card">Pass wallet is available after sign-in.</article>';
    }

    if (storyEl) {
      const s = story?.story;
      storyEl.textContent = s
        ? `${s.title || 'Impact update'} - ${s.body || s.summary || s.description || 'Rescue progress in motion.'}`
        : 'Rescue story coming into view.';
    }
  }

  async function hydratePalsApp() {
    const petsRes = await fetchJson('/api/pets');
    const pets = cachePetsResponse(petsRes);

    const countEl = appLayer.querySelector('[data-app-pals-count]');
    const speciesEl = appLayer.querySelector('[data-app-pals-species]');
    const listEl = appLayer.querySelector('[data-app-pals-list]');
    const focusEl = appLayer.querySelector('[data-app-pals-focus]');
    const summaryEl = appLayer.querySelector('[data-app-pals-summary]');
    if (countEl) countEl.textContent = String(pets.length);
    const dogs = pets.filter((p) => String(p.species || '').toLowerCase().includes('dog')).length;
    const cats = pets.filter((p) => String(p.species || '').toLowerCase().includes('cat')).length;
    if (speciesEl) speciesEl.textContent = pets.length ? `${dogs} dog / ${cats} cat` : 'Private by default';
    const first = pets[0];
    if (focusEl) focusEl.textContent = first ? `${first.name || 'Your pet'} could become a Pal.` : 'Start with a pet you love.';
    if (summaryEl) {
      summaryEl.textContent = first
        ? 'Pick one favorite trait, memory, or care ritual. The Pal stays private unless you choose otherwise.'
        : 'Add a pet profile or favorite memory, then make a private Pal when it feels right.';
    }
    if (listEl) {
      listEl.innerHTML = pets.length
        ? pets.slice(0, 4).map((pet) => `
          <article class="pp-pal-shelf-card">
            <span>${heroEsc(pet.species || 'Pet profile')}</span>
            <strong>${heroEsc(pet.name || 'Pet')}</strong>
            <em>Ready for a keepsake idea</em>
          </article>
        `).join('')
        : '<article class="pp-pal-shelf-card">No pet profiles yet. Add one in Account to start your first Pal idea.</article>';
    }
  }

  async function hydrateStoriesApp() {
    const [storiesRes, activeRes] = await Promise.all([
      fetchJson('/api/loop/impact?limit=5'),
      fetchJson('/api/loop/impact/active')
    ]);

    appData.stories = Array.isArray(storiesRes?.stories) ? storiesRes.stories : [];
    const countEl = appLayer.querySelector('[data-app-stories-count]');
    const activeEl = appLayer.querySelector('[data-app-stories-active]');
    const fundedEl = appLayer.querySelector('[data-app-stories-funded]');
    const listEl = appLayer.querySelector('[data-app-stories-list]');
    if (countEl) countEl.textContent = String(appData.stories.length || 0);
    if (activeEl) activeEl.textContent = activeRes?.activeCase ? 'CHARM has an active update.' : 'Shared when ready';
    if (fundedEl) fundedEl.textContent = activeRes?.recentlyFunded ? 'Yes' : 'No';
    if (listEl) {
      listEl.innerHTML = appData.stories.length
        ? appData.stories.slice(0, 4).map((story) => `
          <article class="pp-storybook-note">
            <span>Shared update</span>
            <strong>${heroEsc(story.title || 'Impact update')}</strong>
          </article>
        `).join('')
        : '<article class="pp-storybook-note">No public updates yet.</article>';
    }
    renderSparkFromStories();
  }

  async function hydrateSubsApp() {
    const featuredRes = await fetchJson('/api/products/featured?limit=8');
    appData.featured = Array.isArray(featuredRes?.items) ? featuredRes.items : [];
    const countEl = appLayer.querySelector('[data-app-subs-count]');
    const listEl = appLayer.querySelector('[data-app-subs-list]');
    if (countEl) countEl.textContent = String(appData.featured.length || 0);
    if (listEl) {
      listEl.innerHTML = appData.featured.length
        ? appData.featured.slice(0, 4).map((item) => {
            const amount = productPriceLabel(item);
            const href = safeHref(productHref(item), '/shop.html');
            return `
              <a class="pp-box-product-card" href="${escapeAttr(href)}">
                <span>${heroEsc(amount)}</span>
                <strong>${heroEsc(item.title || 'Featured pick')}</strong>
              </a>
            `;
          }).join('')
        : '<article class="pp-box-product-card">No featured products loaded yet.</article>';
    }
    renderRandomSubSpotlight();
  }

  let lastCoreMemoryLockAt = 0;

  function hydrateAppWindow(id) {
    if (pawketAppRegistry.has(id)) return pawketAppHost.hydrate(id);
    return null;
  }

  async function refreshCareSurfaces({ forcePets = false } = {}) {
    if (forcePets) dockStatusCache.petsLoaded = false;
    dockStatusCache.journalsLoaded = false;
    await ensureCareJournalMetrics(true);
    updateDockStatusStrip('care');
    hydrateCarePanel();
    if (appIsOpen('pet-workspace')) hydrateAppWindow('pet-workspace');
  }

  function orderedWidgetIds() {
    const seen = new Set();
    const ordered = [];
    state.order.forEach((id) => {
      if (seen.has(id)) return;
      if (!state.enabled.includes(id)) return;
      if (!widgetIsDockApp(id)) return;
      seen.add(id);
      ordered.push(id);
    });
    state.enabled.forEach((id) => {
      if (seen.has(id)) return;
      if (!widgetIsDockApp(id)) return;
      seen.add(id);
      ordered.push(id);
    });
    return ordered;
  }

  function orderedWidgets() {
    return orderedWidgetIds()
      .map((id) => widgets.find((x) => x.id === id))
      .filter(Boolean);
  }

  function orderedAllWidgets() {
    const seen = new Set();
    const ordered = [];
    state.order.forEach((id) => {
      if (!widgetIsDockApp(id)) return;
      const widget = widgets.find((x) => x.id === id);
      if (!widget || seen.has(id)) return;
      seen.add(id);
      ordered.push(widget);
    });
    visibleDockWidgets().forEach((widget) => {
      if (seen.has(widget.id)) return;
      seen.add(widget.id);
      ordered.push(widget);
    });
    return ordered;
  }

  function pinWidgetToDock(id, { save = true } = {}) {
    id = canonicalWidgetId(id);
    if (!widgetIsDockApp(id)) return false;
    let changed = false;
    if (!state.enabled.includes(id)) {
      state.enabled.push(id);
      changed = true;
    }
    if (!state.order.includes(id)) {
      state.order.push(id);
      changed = true;
    }
    normalizeOrder();
    if (changed && save) {
      saveState(state);
      appSdk.syncAllowed(state.enabled);
      renderDock();
    }
    return changed;
  }

  function removeWidgetFromDock(id, { close = true } = {}) {
    id = canonicalWidgetId(id);
    if (!widgetIsDockApp(id)) return false;
    if (!state.enabled.includes(id)) return false;
    if (state.enabled.length <= 1) return false;
    state.enabled = state.enabled.filter((x) => x !== id);
    state.order = state.order.filter((x) => x !== id);
    if (close) closeWidgetApp(id);
    normalizeOrder();
    saveState(state);
    appSdk.syncAllowed(state.enabled);
    renderDock();
    return true;
  }

  function dockActionPanelId(id) {
    return `dock:${id}`;
  }

  function dockActionById(id) {
    return dockActions.find((action) => action.id === id) || null;
  }

  function activeDockActionId() {
    return String(activeId || '').startsWith('dock:')
      ? String(activeId).slice(5)
      : null;
  }

  function dockActionIsActive(action) {
    if (!action) return false;
    return activeId === dockActionPanelId(action.id);
  }

  function dockActionHasOpenApp(action) {
    if (action?.id !== 'more') return false;
    return visibleDockWidgets().some((widget) => appIsOpen(widget.id));
  }

  function setActiveDockAction(id) {
    const action = dockActionById(id);
    if (!action) return;
    activeId = dockActionPanelId(action.id);
    panelOpenedAt = Date.now();
    ignoreOutsideCloseUntil = Math.max(ignoreOutsideCloseUntil, panelOpenedAt + 320);
    closeHelpPill();
    renderDock();
    renderPanel();
  }

  function dockFocusableItems() {
    return Array.from(dock.querySelectorAll('[data-dock-roving="1"]')).filter((el) => {
      if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function syncDockRovingTabindex() {
    const items = dockFocusableItems();
    if (!items.length) return;
    const activeAction = activeDockActionId();
    const activeIndex = activeAction
      ? items.findIndex((item) => item.getAttribute('data-dock-action') === activeAction)
      : -1;
    const index = activeIndex >= 0
      ? activeIndex
      : Math.min(Math.max(dockRovingIndex, 0), items.length - 1);
    dockRovingIndex = index;
    items.forEach((item, itemIndex) => {
      item.setAttribute('tabindex', itemIndex === index ? '0' : '-1');
    });
  }

  function focusDockItem(index) {
    const items = dockFocusableItems();
    if (!items.length) return;
    const next = wrapIndex(index, items.length);
    dockRovingIndex = next;
    items.forEach((item, itemIndex) => {
      item.setAttribute('tabindex', itemIndex === next ? '0' : '-1');
    });
    items[next]?.focus?.();
  }

  function wrapIndex(value, size) {
    if (!Number.isFinite(size) || size <= 0) return 0;
    const raw = Number(value) || 0;
    return ((raw % size) + size) % size;
  }

  function mobileTrackSlots() {
    const raw = Number.parseInt(getComputedStyle(shell).getPropertyValue('--pp-mobile-visible-widgets'), 10);
    const totalSlots = Number.isFinite(raw) && raw > 0 ? raw : 7;
    return Math.max(1, totalSlots - 4);
  }

  function renderWidgetBubble(widget, draggableFlag = '1') {
    const activeClass = (activeId === widget.id || appIsOpen(widget.id)) ? ' is-active' : '';
    const canReorder = draggableFlag === '1';
    const reorderClass = dockReorderMode && canReorder ? ' is-reorderable' : '';
    const displayLabel = widget.shortLabel || widget.label;
    const meta = widget.hint ? `<span class="pp-widget-label-meta">${heroEsc(widget.hint)}</span>` : '';
    const tag = widget.tag ? `<span class="pp-widget-label-tag">${heroEsc(widget.tag)}</span>` : '';
    const ariaLabel = dockReorderMode && canReorder
      ? `${widget.label}. Rearrange mode active. Drag to move. Press Shift and arrow keys to move.`
      : widget.label;
    return `
      <button class="pp-widget-bubble pp-dock-app-bubble${activeClass}${reorderClass}" data-widget="${escapeAttr(widget.id)}" data-widget-draggable="${escapeAttr(draggableFlag)}" data-dock-roving="1" aria-label="${escapeAttr(ariaLabel)}" aria-expanded="${appIsOpen(widget.id)}" type="button">
        <span class="pp-widget-icon-wrap"><i class="bi ${safeIconClass(widget.icon)}" aria-hidden="true"></i></span>
        <span class="pp-widget-button-title" aria-hidden="true">${heroEsc(displayLabel)}</span>
        <span class="pp-widget-label">
          <span class="pp-widget-label-title">${heroEsc(widget.label)}</span>
          ${meta}
          ${tag}
        </span>
      </button>
    `;
  }

  function renderProviderBubble(provider) {
    const activeClass = integrationsFocus === provider.providerId ? ' is-active' : '';
    return `
      <button class="pp-widget-bubble pp-widget-provider${activeClass}" data-widget-provider="${escapeAttr(provider.providerId)}" type="button" aria-label="${escapeAttr(provider.label)}">
        <span class="pp-widget-icon-wrap"><i class="bi ${safeIconClass(provider.icon)}" aria-hidden="true"></i></span>
        <span class="pp-widget-button-title" aria-hidden="true">${heroEsc(provider.shortLabel || provider.label)}</span>
        <span class="pp-widget-label">
          <span class="pp-widget-label-title">${heroEsc(provider.label)}</span>
          <span class="pp-widget-label-meta">${heroEsc(provider.hint || 'Connected provider shortcut.')}</span>
          <span class="pp-widget-label-tag">${heroEsc(provider.tag || 'Connected')}</span>
        </span>
      </button>
    `;
  }

  function renderDockAction(action) {
    const activeClass = dockActionIsActive(action) ? ' is-active' : '';
    const appOpenClass = !activeClass && dockActionHasOpenApp(action) ? ' has-open-app' : '';
    const expanded = activeId === dockActionPanelId(action.id);
    return `
      <button
        class="pp-widget-bubble pp-dock-action${activeClass}${appOpenClass}"
        data-dock-action="${escapeAttr(action.id)}"
        data-dock-tone="${escapeAttr(action.tone || action.id)}"
        data-dock-roving="1"
        aria-label="${escapeAttr(action.label)}"
        aria-expanded="${expanded}"
        aria-controls="pp-widget-panel"
        type="button"
      >
        <span class="pp-widget-icon-wrap"><i class="bi ${safeIconClass(action.icon)}" aria-hidden="true"></i></span>
        <span class="pp-widget-action-body">
          <span class="pp-widget-action-label">${heroEsc(action.label)}</span>
          <span class="pp-widget-action-meta">${heroEsc(action.meta || '')}</span>
        </span>
      </button>
    `;
  }

  function clampScrollValue(value, maxValue) {
    const raw = Number(value) || 0;
    const max = Math.max(0, Number(maxValue) || 0);
    return Math.max(0, Math.min(raw, max));
  }

  function restoreDockScrollMemory() {
    const appStripEl = dock.querySelector('[data-dock-app-strip]');
    if (appStripEl) {
      appStripEl.scrollTop = clampScrollValue(
        dockScrollMemory.appStripTop,
        appStripEl.scrollHeight - appStripEl.clientHeight
      );
    }

    const mobileScrollEl = dock.querySelector('[data-dock-mobile-scroll]');
    if (mobileScrollEl) {
      mobileScrollEl.scrollLeft = clampScrollValue(
        dockScrollMemory.mobileLeft,
        mobileScrollEl.scrollWidth - mobileScrollEl.clientWidth
      );
    }
  }

  function renderDock() {
    syncHelpPillAccessibility();
    applyDockInteractionMode();
    const mobileCarouselMode = window.matchMedia(DOCK_MOBILE_QUERY).matches;
    const collapseIcon = dockSettings.side === 'right'
      ? (dockSettings.collapsed ? 'bi-chevron-double-left' : 'bi-chevron-double-right')
      : (dockSettings.collapsed ? 'bi-chevron-double-left' : 'bi-chevron-double-left');
    const collapseTitle = dockSettings.collapsed ? 'Expand dock' : 'Collapse dock';
    const activeAction = activeDockActionId();
    const fixedActions = dockActions.filter((action) => action.id !== 'more');
    const appsAction = dockActionById('more');
    const pinnedApps = orderedWidgets();
    const appStrip = pinnedApps.length
      ? `
        <div class="pp-dock-scroll-section${pinnedApps.length > 3 ? ' is-scrollable' : ''}" aria-label="Pinned dock apps">
          <div class="pp-dock-scroll-label">Dock apps</div>
          <div class="pp-dock-app-strip" data-dock-app-strip data-widget-mobile-track>
            ${pinnedApps.map((widget) => renderWidgetBubble(widget)).join('')}
          </div>
        </div>
      `
      : `
        <div class="pp-dock-scroll-section is-empty" aria-label="Pinned dock apps">
          <div class="pp-dock-scroll-label">Dock apps</div>
          <div class="pp-dock-empty-apps">Open apps from the shelf to pin them here.</div>
        </div>
      `;
    const dockHead = `
      <div class="pp-widget-dock-head">
        <span class="pp-widget-dock-mark"><i class="bi bi-stars"></i></span>
        <span class="pp-widget-dock-copy">
          <strong>Pawket Dock</strong>
          <span>${activeAction ? `${dockActionById(activeAction)?.label || 'Tools'} open` : 'Care + apps'}</span>
        </span>
        <button
          class="pp-widget-head-btn"
          data-widget-control="collapse"
          data-dock-roving="1"
          aria-label="${escapeAttr(collapseTitle)}"
          aria-pressed="${dockSettings.collapsed}"
          type="button"
        >
          <i class="bi ${collapseIcon}" aria-hidden="true"></i>
        </button>
      </div>
    `;

    dock.setAttribute('role', 'toolbar');
    dock.setAttribute('aria-label', 'Pawket Dock');
    dock.setAttribute('aria-orientation', mobileCarouselMode ? 'horizontal' : 'vertical');
    mobileCarouselOffset = 0;
    shell.dataset.mobileCarousel = '0';
    dock.classList.remove('has-mobile-carousel');

    if (mobileCarouselMode) {
      dock.innerHTML = `
        <div class="pp-dock-mobile-scroll" data-dock-mobile-scroll data-widget-mobile-track>
          ${fixedActions.map((action) => renderDockAction(action)).join('')}
          ${appsAction ? renderDockAction(appsAction) : ''}
          ${pinnedApps.map((widget) => renderWidgetBubble(widget)).join('')}
        </div>
      `;
      restoreDockScrollMemory();
      syncDockRovingTabindex();
      debugLog('dock:render', {
        side: dockSettings.side,
        collapsed: dockSettings.collapsed,
        size: dockSettings.size,
        bubbleCount: dock.querySelectorAll('.pp-widget-bubble').length,
        mode: 'launch-bottom',
        mobileCarousel: false
      });
      return;
    }

    dock.innerHTML = `
      ${dockHead}
      ${fixedActions.map((action) => renderDockAction(action)).join('')}
      ${appStrip}
      ${appsAction ? renderDockAction(appsAction) : ''}
    `;
    restoreDockScrollMemory();
    syncDockRovingTabindex();
    debugLog('dock:render', {
      side: dockSettings.side,
      collapsed: dockSettings.collapsed,
      size: dockSettings.size,
      bubbleCount: dock.querySelectorAll('.pp-widget-bubble').length,
      mode: 'launch-side',
      mobileCarousel: false
    });
  }

  function renderCards(cards, label = 'Quick actions') {
    if (!Array.isArray(cards) || !cards.length) return '';
    return `
      <div class="pp-panel-divider"></div>
      <div class="pp-panel-subhead">${heroEsc(label)}</div>
      <div class="pp-panel-grid">
        ${cards.map(card => `
          <a class="pp-panel-card" href="${escapeAttr(safeHref(card.href || '#'))}" data-tooltip="${escapeAttr(card.desc || card.title || 'Open action')}">
            <span class="pp-panel-card-icon"><i class="bi ${safeIconClass(card.icon)}" aria-hidden="true"></i></span>
            <span class="pp-panel-card-body">
              <strong>${heroEsc(card.title || 'Open')}</strong>
              <span>${heroEsc(card.desc || '')}</span>
            </span>
            ${card.cta ? `<span class="pp-panel-card-cta">${heroEsc(card.cta)}</span>` : ''}
          </a>
        `).join('')}
      </div>
    `;
  }

  function renderDockActionCards(cards, label = 'Quick actions') {
    if (!Array.isArray(cards) || !cards.length) return '';
    return `
      <div class="pp-panel-divider"></div>
      <div class="pp-panel-subhead">${heroEsc(label)}</div>
      <div class="pp-dock-action-grid">
        ${cards.map((card) => {
          const icon = safeIconClass(card.icon || 'bi-arrow-right');
          const title = heroEsc(card.title || 'Open');
          const desc = heroEsc(card.desc || '');
          const kind = card.widget ? 'app' : (card.action ? 'action' : 'link');
          const cta = card.widget ? 'Open app' : (card.action ? 'Open' : 'Open page');
          const attrs = card.widget
            ? `button type="button" data-dock-open-widget="${escapeAttr(card.widget)}"`
            : (card.action
              ? `button type="button" data-dock-panel-action="${escapeAttr(card.action)}"`
              : `a href="${escapeAttr(safeHref(card.href || '#'))}"`);
          const close = card.widget || card.action ? 'button' : 'a';
          return `
            <${attrs} class="pp-dock-action-card" data-dock-card-kind="${escapeAttr(kind)}">
              <span class="pp-dock-action-card-icon"><i class="bi ${icon}" aria-hidden="true"></i></span>
              <span class="pp-dock-action-card-body">
                <strong>${title}</strong>
                <span>${desc}</span>
              </span>
              <span class="pp-dock-card-cta">${heroEsc(cta)}</span>
            </${close}>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderCarePanelLiveShell() {
    return `
      <div class="pp-panel-divider"></div>
      <section class="pp-dock-care-panel" data-care-panel-live aria-live="polite">
        <div class="pp-dock-care-panel-head">
          <span class="pp-dock-care-panel-icon"><i class="bi bi-journal-heart" aria-hidden="true"></i></span>
          <div>
            <span>Care workspace</span>
            <strong data-care-panel-title>Loading pet journals…</strong>
          </div>
        </div>
        <div class="pp-dock-care-panel-body" data-care-panel-body>
          <p>Checking private pet journals, favorite memories, and care notes.</p>
        </div>
      </section>
    `;
  }

  function renderCarePanelBody(metrics = emptyCareMetrics()) {
    const signedIn = dockStatusCache.petsSignedIn;
    const petCount = dockStatusCache.pets.length;
    const quickChecks = renderCareQuickCheckPanel();
    const purposeTrail = renderCarePurposeTrail(metrics);
    const journalComposer = renderCareJournalComposer(metrics);
    if (!dockStatusCache.petsLoaded || !dockStatusCache.journalsLoaded) {
      return `
        <p>Checking private pet journals, favorite memories, and care notes.</p>
        ${quickChecks}
        ${purposeTrail}
      `;
    }
    if (!signedIn) {
      return `
        <p>Sign in to load private pet journals and favorite memories. You can still use the quick checks here before saving anything to your account.</p>
        ${quickChecks}
        ${purposeTrail}
        <div class="pp-dock-care-actions">
          <a href="/account.html">Sign in or create account</a>
          <a href="/charm.html">CHARM updates</a>
        </div>
      `;
    }
    if (!petCount) {
      return `
        <p>Add a pet profile first, then the dock can summarize journals, favorite memories, Pals, and CHARM updates.</p>
        ${quickChecks}
        ${purposeTrail}
        <div class="pp-dock-care-actions">
          <a href="/account.html#account-pets">Add pet profile</a>
          <a href="/charm.html">CHARM updates</a>
        </div>
      `;
    }
    if (!metrics.journalCount) {
      return `
        <p>${petCount === 1 ? 'Your pet profile is' : 'Your pet profiles are'} ready. Add the first care note, story moment, or favorite memory right here.</p>
        ${quickChecks}
        ${journalComposer}
        ${purposeTrail}
        <div class="pp-dock-care-actions">
          <a href="/account.html#account-story-trail">View saved stories</a>
          <a href="/charm.html">CHARM updates</a>
        </div>
      `;
    }

    const latest = metrics.latest;
    const latestTitle = latest ? careJournalTitle(latest) : 'Latest journal entry';
    const latestDate = latest ? formatCareJournalDate(latest.occurredAt || latest.createdAt) : '';
    const latestLine = [latest?.petName || '', latestDate].filter(Boolean).join(' • ');
    const latestCore = metrics.latestCore;
    const coreText = latestCore
      ? `${careJournalTitle(latestCore)}${latestCore.petName ? ` for ${latestCore.petName}` : ''}`
      : 'Mark a meaningful journal entry as a favorite memory when one is ready.';

    return `
      <div class="pp-dock-care-live-grid">
        <article class="pp-dock-care-live-card">
          <h4>Latest journal</h4>
          <strong>${heroEsc(latestTitle)}</strong>
          <span>${heroEsc(latestLine || 'Private account journal')}</span>
        </article>
        <article class="pp-dock-care-live-card">
          <h4>Favorite memory</h4>
          <strong>${heroEsc(metrics.coreMemoryCount ? `${metrics.coreMemoryCount} saved` : 'Not marked yet')}</strong>
          <span>${heroEsc(coreText)}</span>
        </article>
      </div>
      <ul class="pp-widget-app-list pp-widget-care-journal-list">
        ${renderCareJournalItems(metrics.entries, 'No journal entries yet.')}
      </ul>
      ${quickChecks}
      ${journalComposer}
      <div class="pp-widget-care-chip-row">
        ${renderCareHandoffChips(metrics.handoffTargets, 'Private by default')}
      </div>
      ${purposeTrail}
      <div class="pp-dock-care-actions">
        <a href="/account.html#account-pets">Open journals</a>
        <a href="/account.html#account-story-trail">Saved stories</a>
        <a href="/charm.html">CHARM</a>
      </div>
    `;
  }

  function hydrateCarePanel() {
    const live = panel.querySelector('[data-care-panel-live]');
    if (!live) return;
    const titleEl = live.querySelector('[data-care-panel-title]');
    const bodyEl = live.querySelector('[data-care-panel-body]');
    const metrics = dockStatusCache.journalMetrics || emptyCareMetrics();
    if (titleEl) {
      if (!dockStatusCache.petsLoaded || !dockStatusCache.journalsLoaded) {
        titleEl.textContent = 'Loading pet journals…';
      } else if (!dockStatusCache.petsSignedIn) {
        titleEl.textContent = 'Sign in to load journals';
      } else if (!dockStatusCache.pets.length) {
        titleEl.textContent = 'Add a pet profile';
      } else if (!metrics.journalCount) {
        titleEl.textContent = 'Ready for the first journal';
      } else {
        titleEl.textContent = `${metrics.journalCount} journal ${metrics.journalCount === 1 ? 'entry' : 'entries'} linked`;
      }
    }
    if (bodyEl) bodyEl.innerHTML = renderCarePanelBody(metrics);
  }

  function renderAppShelfSettings() {
    const providers = appSdk.listProviders();
    const connected = providers.filter((provider) => provider.connected).length;
    const currentApps = pawketAppRegistry.manifests({ surface: 'dock' });
    const partnerApps = [
      {
        name: 'Care calendar partner',
        status: 'Manifest review',
        scopes: 'pets:summary, dock:preferences'
      },
      {
        name: 'Story studio partner',
        status: 'Not installed',
        scopes: 'stories:public, open_story_composer'
      }
    ];

    return `
      <div class="pp-panel-divider"></div>
      <section class="pp-app-manager pp-app-shelf-settings" data-app-shelf-settings>
        <div class="pp-app-manager-group">
          <div class="pp-app-manager-head">
            <strong>Dock settings</strong>
            <span>${currentApps.length} apps available</span>
          </div>
          <div class="pp-panel-settings-grid pp-panel-settings-grid--shelf">
            <label class="pp-panel-setting">
              <span>Dock side</span>
              <select data-dock-setting="side">
                <option value="left" ${dockSettings.side === 'left' ? 'selected' : ''}>Left</option>
                <option value="right" ${dockSettings.side === 'right' ? 'selected' : ''}>Right</option>
              </select>
            </label>
            <label class="pp-panel-setting">
              <span>Desktop app size</span>
              <select data-dock-setting="size">
                <option value="sm" ${dockSettings.size === 'sm' ? 'selected' : ''}>Small</option>
                <option value="md" ${dockSettings.size === 'md' ? 'selected' : ''}>Medium</option>
                <option value="lg" ${dockSettings.size === 'lg' ? 'selected' : ''}>Large</option>
              </select>
            </label>
          </div>
          <div class="pp-panel-inline-toggles pp-panel-inline-toggles--shelf">
            <label class="pp-panel-check">
              <input type="checkbox" data-dock-setting-check="providerWidgets" ${dockSettings.providerWidgets ? 'checked' : ''}>
              <span>Show connected-provider shortcuts</span>
            </label>
            <label class="pp-panel-check">
              <input type="checkbox" data-dock-setting-check="collapsed" ${dockSettings.collapsed ? 'checked' : ''}>
              <span>Keep desktop dock collapsed</span>
            </label>
          </div>
          <div class="pp-panel-actions pp-panel-actions--compact">
            <button class="pp-panel-reset" type="button" data-reset-widgets data-tooltip="Restore the default pinned apps.">Reset pinned apps</button>
            <button class="pp-panel-reset" type="button" data-reset-dock-settings>Reset dock layout</button>
          </div>
        </div>

        <div class="pp-app-manager-group">
          <div class="pp-app-manager-head">
            <strong>Connected providers</strong>
            <span>${connected}/${providers.length} connected</span>
          </div>
          <div class="pp-widget-provider-grid">
            ${providers.map((provider) => {
              const providerId = String(provider.id || '');
              const isConnected = provider.connected === true;
              return `
                <article class="pp-widget-provider-card${integrationsFocus === providerId ? ' is-focus' : ''}" data-provider-id="${escapeAttr(providerId)}">
                  <div class="pp-widget-provider-head">
                    <span class="pp-widget-provider-icon"><i class="bi ${safeIconClass(provider.icon || 'bi-box-arrow-up-right')}" aria-hidden="true"></i></span>
                    <strong>${heroEsc(provider.name)}</strong>
                    <span class="pp-widget-provider-status ${isConnected ? 'is-on' : 'is-off'}">${isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <p>${heroEsc(provider.description || 'Connected provider shortcut.')}</p>
                  <label class="pp-app-provider-enable">
                    <input type="checkbox" data-provider-enabled="${escapeAttr(providerId)}" ${provider.enabled ? 'checked' : ''}>
                    <span>Show shortcut</span>
                  </label>
                  <div class="pp-widget-app-actions pp-app-provider-actions">
                    <button type="button" data-app-shelf-provider-toggle="${escapeAttr(providerId)}" class="${isConnected ? '' : 'is-primary'}">${isConnected ? 'Disconnect' : 'Connect'}</button>
                    <button type="button" data-app-shelf-provider-focus="${escapeAttr(providerId)}">Focus</button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pp-app-manager-group">
          <div class="pp-app-manager-head">
            <strong>Partner access</strong>
            <span>Scoped access only</span>
          </div>
          <div class="pp-app-manager-list">
            ${partnerApps.map((app) => `
              <article class="pp-app-manager-partner">
                <strong>${heroEsc(app.name)}</strong>
                <span>${heroEsc(app.status)}</span>
                <em>${heroEsc(app.scopes)}</em>
              </article>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function renderDockActionPanel(action) {
    const renderAppShelf = (items = [], note = '') => {
      if (!items.length) return '';
      return `
        <div class="pp-panel-divider"></div>
        <div class="pp-panel-subhead">App shelf</div>
        ${note ? `<p class="pp-dock-action-note">${heroEsc(note)}</p>` : ''}
        <div class="pp-dock-app-list pp-dock-app-list--tiles">
          ${items.map((widget) => {
            const pinned = state.enabled.includes(widget.id);
            const orderedPinnedIds = orderedWidgetIds();
            const pinnedIndex = orderedPinnedIds.indexOf(widget.id);
            return `
              <div class="pp-dock-app-row${pinned ? ' is-pinned' : ' is-unpinned'}" data-dock-app-row="${escapeAttr(widget.id)}">
                <button class="pp-dock-app-main" type="button" data-dock-open-widget="${escapeAttr(widget.id)}">
                  <span class="pp-dock-app-icon"><i class="bi ${safeIconClass(widget.icon)}" aria-hidden="true"></i></span>
                  <span class="pp-dock-app-copy">
                    <strong>${heroEsc(widget.label)}</strong>
                    <small>${heroEsc(widget.hint || widget.body || 'Open tool')}</small>
                    <em>${pinned ? 'Pinned on dock' : 'Not on dock'}</em>
                  </span>
                </button>
                <span class="pp-dock-app-state">${pinned ? 'Pinned' : 'Available'}</span>
                <div class="pp-dock-app-row-actions">
                  <button type="button" data-dock-pin-widget="${escapeAttr(widget.id)}" aria-pressed="${pinned}" data-tooltip="${pinned ? 'Remove from dock.' : 'Pin to dock.'}">
                    <i class="bi ${pinned ? 'bi-dash-lg' : 'bi-plus-lg'}" aria-hidden="true"></i>
                    <span>${pinned ? 'Remove' : 'Pin'}</span>
                  </button>
                  <button type="button" data-move-widget="${escapeAttr(widget.id)}" data-move-dir="-1" ${!pinned || pinnedIndex <= 0 ? 'disabled' : ''} aria-label="Move ${escapeAttr(widget.label)} up">
                    <i class="bi bi-chevron-up" aria-hidden="true"></i>
                  </button>
                  <button type="button" data-move-widget="${escapeAttr(widget.id)}" data-move-dir="1" ${!pinned || pinnedIndex < 0 || pinnedIndex >= orderedPinnedIds.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeAttr(widget.label)} down">
                    <i class="bi bi-chevron-down" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };
    const secondary = action.secondary?.action
      ? `<button class="pp-panel-btn ghost" type="button" data-dock-panel-action="${escapeAttr(action.secondary.action)}">${heroEsc(action.secondary.text || 'Open')}</button>`
      : (action.secondary?.href
        ? `<a class="pp-panel-btn ghost" href="${escapeAttr(safeHref(action.secondary.href))}">${heroEsc(action.secondary.text || 'Open')}</a>`
        : '');
    const primary = action.primary?.action
      ? `<button class="pp-panel-btn" type="button" data-dock-panel-action="${escapeAttr(action.primary.action)}">${heroEsc(action.primary.text || 'Open')}</button>`
      : (action.primary?.href
        ? `<a class="pp-panel-btn" href="${escapeAttr(safeHref(action.primary.href))}">${heroEsc(action.primary.text || 'Open')}</a>`
        : '');
    const widgetList = action.id === 'more' ? orderedAllWidgets() : [];
    const cardsHtml = renderDockActionCards(action.cards, action.cardsLabel);
    const appShelfHtml = renderAppShelf(
      widgetList,
      'Open an app, pin it to the Dock, or move pinned apps into the order you use most.'
    );
    const shelfSettingsHtml = action.id === 'more' ? renderAppShelfSettings() : '';
    const actionToolsHtml = action.id === 'more'
      ? `${appShelfHtml}${shelfSettingsHtml}${cardsHtml}`
      : cardsHtml;
    panel.classList.add('is-open', 'is-dock-action');
    panel.dataset.panelKind = 'dock-action';
    panel.hidden = false;
    panelOpenedAt = Date.now();
    panel.innerHTML = `
      <div class="pp-panel-head pp-dock-action-head">
        <div>
          <span class="pp-panel-kicker">${heroEsc(action.kicker || 'Pawket Dock')}</span>
          <h3>${heroEsc(action.title || action.label)}</h3>
        </div>
        <button class="pp-panel-close" type="button" data-close-panel data-tooltip="Close this panel.">×</button>
      </div>
      <p class="pp-dock-action-copy">${heroEsc(action.body || '')}</p>
      ${renderDockStatusShell(action.id)}
      <div class="pp-panel-actions">
        ${primary}
        ${secondary}
      </div>
      ${action.id === 'care' ? renderCarePanelLiveShell() : ''}
      ${actionToolsHtml}
      ${action.id === 'more' ? `
        <div class="pp-panel-divider"></div>
        <div class="pp-dock-support-row">
          <button class="pp-panel-btn ghost" type="button" data-dock-panel-action="help">Open support</button>
        </div>
      ` : ''}
    `;
    positionPanelNearDock();
    ensureDockPanelStatus(action.id).catch(() => {});
    debugLog('panel:dock-action-open', { id: action.id, html: panel.innerHTML.length });
  }

  function getNavOffsetPx() {
    try {
      const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset'));
      return Number.isFinite(raw) ? raw : 170;
    } catch {
      return 170;
    }
  }

  function positionPanelNearDock() {
    const isMobile = shell?.dataset?.mobileDock === '1' || window.matchMedia(DOCK_MOBILE_QUERY).matches;
    if (isMobile) {
      panel.style.removeProperty('top');
      panel.style.removeProperty('max-height');
      debugLog('panel:position-mobile');
      return;
    }

    const dockRect = dock.getBoundingClientRect();
    const navOffset = getNavOffsetPx();
    const minTop = Math.max(84, navOffset + 24);
    const maxHeight = Math.max(260, Math.round(window.innerHeight - minTop - 24));
    panel.style.maxHeight = `${maxHeight}px`;
    const panelHeight = Math.min(
      maxHeight,
      Math.max(240, Math.round(panel.scrollHeight || panel.getBoundingClientRect().height || 360))
    );
    const target = dockRect.top + (dockRect.height / 2);
    const minCenter = minTop + (panelHeight / 2);
    const maxCenter = Math.max(minCenter, window.innerHeight - 18 - (panelHeight / 2));
    const top = Math.max(minCenter, Math.min(maxCenter, target));
    panel.style.top = `${Math.round(top)}px`;
    debugLog('panel:position', {
      top: Math.round(top),
      minTop: Math.round(minTop),
      minCenter: Math.round(minCenter),
      maxCenter: Math.round(maxCenter),
      panelHeight: Math.round(panelHeight),
      maxHeight
    });
  }

  function renderPanel() {
    if (!activeId) {
      panelOpenedAt = 0;
      panel.classList.remove('is-open', 'is-dock-action');
      delete panel.dataset.panelKind;
      panel.innerHTML = '';
      panel.hidden = true;
      panel.style.removeProperty('top');
      panel.style.removeProperty('max-height');
      debugLog('panel:closed');
      return;
    }

    panel.classList.remove('is-dock-action');
    delete panel.dataset.panelKind;

    const activeAction = activeDockActionId();
    if (activeAction) {
      const action = dockActionById(activeAction);
      if (!action) {
        closePanel();
        return;
      }
      renderDockActionPanel(action);
      return;
    }

    if (activeId === 'customize') {
      const appsAction = dockActionById('more');
      if (!appsAction) {
        closePanel();
        return;
      }
      activeId = dockActionPanelId(appsAction.id);
      renderDockActionPanel(appsAction);
      debugLog('panel:customize-redirect', { target: appsAction.id });
      return;
    }

    const w = widgets.find(x => x.id === activeId);
    if (!w) return;

    if (w.id === 'loop') {
      panel.classList.add('is-open');
      panel.hidden = false;
      panelOpenedAt = Date.now();
      panel.innerHTML = `
        <div class="pp-panel-head">
          <div>
            <span class="pp-panel-kicker">Pawket Shop</span>
            <h3>${heroEsc(w.title)}</h3>
          </div>
          <button class="pp-panel-close" type="button" data-close-panel data-tooltip="Close this panel.">×</button>
        </div>
        <p>${heroEsc(w.body)}</p>
        ${w.meta ? `<div class="pp-panel-meta">${w.meta.map(m => `<span>${heroEsc(m)}</span>`).join('')}</div>` : ''}
        <div class="pp-loop-panel-stats" data-loop-panel-stats>
          <div class="pp-loop-stat">
            <span class="pp-loop-stat-value" data-loop-points>—</span>
            <span class="pp-loop-stat-label">CHARM</span>
          </div>
          <div class="pp-loop-stat">
            <span class="pp-loop-stat-value" data-loop-chains>—</span>
            <span class="pp-loop-stat-label">Passes</span>
          </div>
          <div class="pp-loop-stat">
            <span class="pp-loop-stat-value" data-loop-badges>—</span>
            <span class="pp-loop-stat-label">Badges</span>
          </div>
        </div>
        ${renderCards(w.cards, w.cardsLabel)}
        <div class="pp-panel-actions">
          <button class="pp-panel-btn" type="button" data-loop-share data-tooltip="Open the Pawket Pass sharing flow.">Open Pawket Pass</button>
          <a class="pp-panel-link" href="${escapeAttr(safeHref(w.link?.href || '#'))}" data-tooltip="Open your Pawket Pass dashboard.">${heroEsc(w.link?.text || 'Open dashboard')}</a>
        </div>
      `;
      hydrateLoopPanel();
      return;
    }

    panel.classList.add('is-open');
    panel.hidden = false;
    panelOpenedAt = Date.now();
    panel.innerHTML = `
      <div class="pp-panel-head">
        <div>
          <span class="pp-panel-kicker">Widget</span>
          <h3>${heroEsc(w.title)}</h3>
        </div>
        <button class="pp-panel-close" type="button" data-close-panel data-tooltip="Close this panel.">×</button>
      </div>
      <p>${heroEsc(w.body)}</p>
      ${w.meta ? `<div class="pp-panel-meta">${w.meta.map(m => `<span>${heroEsc(m)}</span>`).join('')}</div>` : ''}
      ${renderCards(w.cards, w.cardsLabel)}
      <div class="pp-panel-actions">
        ${w.primary ? `<a class="pp-panel-btn" href="${escapeAttr(safeHref(w.primary.href))}" data-tooltip="Open ${escapeAttr(w.primary.text)}.">${heroEsc(w.primary.text)}</a>` : ''}
        ${w.secondary ? `<a class="pp-panel-btn ghost" href="${escapeAttr(safeHref(w.secondary.href))}" data-tooltip="Open ${escapeAttr(w.secondary.text)}.">${heroEsc(w.secondary.text)}</a>` : ''}
        ${w.link ? `<a class="pp-panel-link" href="${escapeAttr(safeHref(w.link.href))}" data-tooltip="Open ${escapeAttr(w.link.text || w.title)}.">${heroEsc(w.link.text)}</a>` : ''}
        ${w.id !== 'support' ? `<button class="pp-panel-remove" type="button" data-remove-widget="${escapeAttr(w.id)}" data-tooltip="Hide this widget from the dock.">Remove</button>` : ''}
      </div>
    `;
    positionPanelNearDock();
    debugLog('panel:widget-open', { id: w.id, html: panel.innerHTML.length });
  }

  async function fetchLoopSummary() {
    try {
      const session = await getSession();
      if (!session?.signedIn) return { ok: false };
      const res = await fetch('/api/loop/me', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return { ok: false };
      const data = await res.json();
      return data?.ok ? data : { ok: false };
    } catch {
      return { ok: false };
    }
  }

  async function hydrateLoopPanel() {
    const stats = panel.querySelector('[data-loop-panel-stats]');
    if (!stats) return;
    stats.classList.add('is-loading');
    const data = await fetchLoopSummary();
    const pointsEl = panel.querySelector('[data-loop-points]');
    const chainsEl = panel.querySelector('[data-loop-chains]');
    const badgesEl = panel.querySelector('[data-loop-badges]');

    if (!data?.ok) {
      if (pointsEl) pointsEl.textContent = '—';
      if (chainsEl) chainsEl.textContent = '—';
      if (badgesEl) badgesEl.textContent = '—';
      const shareBtn = panel.querySelector('[data-loop-share]');
      if (shareBtn) {
        shareBtn.hidden = true;
        shareBtn.setAttribute('aria-hidden', 'true');
      }
      stats.classList.remove('is-loading');
      return;
    }

    const sent = Array.isArray(data.sentTokens) ? data.sentTokens : [];
    const badges = Array.isArray(data.badges) ? data.badges : [];
    if (pointsEl) pointsEl.textContent = String(data.points ?? 0);
    if (chainsEl) chainsEl.textContent = String(sent.length);
    if (badgesEl) badgesEl.textContent = String(badges.length);
    const shareBtn = panel.querySelector('[data-loop-share]');
    if (shareBtn) {
      const hasTokens = sent.length > 0;
      shareBtn.hidden = !hasTokens;
      shareBtn.setAttribute('aria-hidden', String(!hasTokens));
    }
    stats.classList.remove('is-loading');
  }

  function setActive(id) {
    activeId = id;
    debugLog('active:set', { id });
    closeHelpPill();
    renderDock();
    renderPanel();
  }

  function closePanel() {
    activeId = null;
    panelOpenedAt = 0;
    debugLog('active:clear');
    renderDock();
    renderPanel();
  }

  function openAppShelfPanel() {
    setActiveDockAction('more');
  }

  function openCustomizePanel() {
    debugLog('customize:redirect-app-shelf');
    openAppShelfPanel();
  }

  function normalizeOrder() {
    const seen = new Set();
    const next = [];
    state.order.forEach((id) => {
      id = canonicalWidgetId(id);
      if (seen.has(id)) return;
      if (!widgetIsDockApp(id)) return;
      seen.add(id);
      next.push(id);
    });
    state.enabled.forEach((id) => {
      id = canonicalWidgetId(id);
      if (seen.has(id)) return;
      if (!widgetIsDockApp(id)) return;
      seen.add(id);
      next.push(id);
    });
    state.order = next;
  }

  function moveWidgetOrder(id, direction) {
    id = canonicalWidgetId(id);
    if (!widgetIsDockApp(id)) return false;
    normalizeOrder();
    const current = state.order.indexOf(id);
    if (current < 0) return false;
    const next = current + direction;
    if (next < 0 || next >= state.order.length) return false;
    const clone = state.order.slice();
    [clone[current], clone[next]] = [clone[next], clone[current]];
    state.order = clone;
    saveState(state);
    renderDock();
    renderPanel();
    return true;
  }

  function openEnabledApps() {
    orderedWidgets().forEach((widget) => openWidgetApp(widget.id));
  }

  function closeAllApps() {
    widgets.forEach((widget) => closeWidgetApp(widget.id));
  }

  function renderHelpQuick() {
    if (!helpQuickEl) return;
    helpQuickEl.innerHTML = helpQuick.map(item => `
      <a class="pp-help-chip" data-tone="${escapeAttr(safeClassList(item.tone || ''))}" href="${escapeAttr(safeHref(item.href))}" data-tooltip="${escapeAttr(item.label)}">
        <i class="bi ${safeIconClass(item.icon)}" aria-hidden="true"></i>
        <span>${heroEsc(item.label)}</span>
      </a>
    `).join('');
  }

  function renderHelpItems() {
    helpItemsEl.innerHTML = helpItems.map(item => `
      <a class="pp-help-card" data-tone="${escapeAttr(safeClassList(item.tone || ''))}" href="${escapeAttr(safeHref(item.href))}" data-tooltip="${escapeAttr(item.desc)}">
        <span class="pp-help-card-icon"><i class="bi ${safeIconClass(item.icon)}" aria-hidden="true"></i></span>
        <span class="pp-help-card-body">
          <strong>${heroEsc(item.label)}</strong>
          <span>${heroEsc(item.desc)}</span>
        </span>
        ${item.tag ? `<span class="pp-help-card-tag">${heroEsc(item.tag)}</span>` : ''}
      </a>
    `).join('');
  }

  function updateHelpTip() {
    if (!helpTipEl || !helpTips.length) return;
    const tip = helpTips[Math.floor(Math.random() * helpTips.length)];
    helpTipEl.textContent = tip;
  }

  function updateHelpStreak() {
    if (!helpStreakEl) return;
    const key = 'pp-help-streak';
    const today = new Date().toDateString();
    let data = { count: 1, last: today };
    try {
      const raw = localStorage.getItem(key);
      if (raw) data = JSON.parse(raw);
    } catch {}
    if (data.last !== today) {
      data.count = Math.max(1, (data.count || 0) + 1);
      data.last = today;
      try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    }
    const count = Math.max(1, Number(data.count) || 1);
    helpStreakEl.textContent = `Support path • ${Math.min(count, 3)}/3 useful stops`;
    if (helpStreakBar) {
      const pct = Math.min(100, Math.max(20, (Math.min(count, 3) / 3) * 100));
      helpStreakBar.style.width = `${pct}%`;
    }
  }

  let helpLastFocus = null;
  function helpFocusable() {
    if (!helpPanel) return [];
    const sel = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(helpPanel.querySelectorAll(sel)).filter(el => {
      const style = window.getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none';
    });
  }

  function onHelpKeydown(e) {
    if (!helpPill.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeHelpPill();
      if (shell.dataset.mobileDock !== '1') helpToggle?.focus?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = helpFocusable();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }

  function openHelpPill() {
    helpLastFocus = document.activeElement;
    helpPill.classList.add('is-open');
    helpToggle.setAttribute('aria-expanded', 'true');
    syncHelpPillAccessibility();
    updateHelpTip();
    updateHelpStreak();
    if (helpPanel) {
      helpPanel.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => helpPanel.focus?.());
    }
    document.addEventListener('keydown', onHelpKeydown);
    renderDock();
  }

  function closeHelpPill() {
    helpPill.classList.remove('is-open');
    helpToggle.setAttribute('aria-expanded', 'false');
    syncHelpPillAccessibility();
    document.removeEventListener('keydown', onHelpKeydown);
    if (helpLastFocus && typeof helpLastFocus.focus === 'function') {
      try { helpLastFocus.focus(); } catch {}
    }
    helpLastFocus = null;
    renderDock();
  }

  function syncHelpPillAccessibility() {
    const mobileDock = shell.dataset.mobileDock === '1';
    if (mobileDock) {
      helpToggle.setAttribute('tabindex', '-1');
      helpToggle.setAttribute('aria-hidden', 'true');
    } else {
      helpToggle.removeAttribute('tabindex');
      helpToggle.removeAttribute('aria-hidden');
    }
    if (helpPanel) {
      helpPanel.setAttribute('aria-hidden', helpPill.classList.contains('is-open') ? 'false' : 'true');
    }
  }

  let suppressClick = null;
  let suppressAnyDockClickUntil = 0;
  let ignoreCustomizeClickUntil = 0;
  let ignoreOutsideCloseUntil = 0;
  let panelOpenedAt = 0;
  let pressLabelBubble = null;
  let pressLabelPointerId = null;
  let pressLabelHideTimer = 0;
  let mobileSwipeState = null;
  let dockTrackDragState = null;
  let dockLongPressState = null;

  const MOBILE_SWIPE_ACTIVATE_PX = 8;
  const MOBILE_SWIPE_STEP_PX = 28;
  const MOBILE_SWIPE_CLICK_SUPPRESS_MS = 360;
  const DOCK_REORDER_LONG_PRESS_MS = 760;
  const DOCK_REORDER_MOVE_CANCEL_PX = 10;

  function mobileCarouselPoolSize() {
    return orderedWidgets().length + connectedProviderDockWidgets().length + 1; // + Apps shelf
  }

  function canUseMobileCarouselTrack() {
    return (
      shell?.dataset?.mobileDock === '1'
      && shell?.dataset?.mobileCarousel === '1'
      && shell?.dataset?.widgetCollapsed !== '1'
    );
  }

  function rotateMobileCarousel(direction = 1, source = 'unknown') {
    const poolSize = mobileCarouselPoolSize();
    if (poolSize <= 1) return false;
    const dir = direction < 0 ? -1 : 1;
    mobileCarouselOffset = wrapIndex(mobileCarouselOffset + dir, poolSize);
    renderDock();
    debugLog('dock:carousel-rotate', {
      source,
      direction: dir,
      poolSize,
      offset: mobileCarouselOffset
    });
    return true;
  }

  function bubbleDebugId(bubble) {
    if (!bubble) return null;
    return (
      bubble.getAttribute('data-widget')
      || bubble.getAttribute('data-widget-provider')
      || bubble.getAttribute('data-widget-control')
      || bubble.getAttribute('aria-label')
      || 'unknown'
    );
  }

  function bubbleLabelSnapshot(bubble) {
    if (!bubble) return null;
    const label = bubble.querySelector('.pp-widget-label');
    if (!label) {
      return {
        id: bubbleDebugId(bubble),
        hasLabel: false,
        isPressing: bubble.classList.contains('is-pressing')
      };
    }
    const style = getComputedStyle(label);
    const rect = label.getBoundingClientRect();
    return {
      id: bubbleDebugId(bubble),
      hasLabel: true,
      isPressing: bubble.classList.contains('is-pressing'),
      shellMobileDock: shell?.dataset?.mobileDock || '',
      shellDockMode: shell?.dataset?.dockMode || '',
      display: style.display,
      opacity: style.opacity,
      visibility: style.visibility,
      transform: style.transform,
      zIndex: style.zIndex,
      bottom: style.bottom,
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };
  }

  function clearPressLabel() {
    if (pressLabelHideTimer) {
      clearTimeout(pressLabelHideTimer);
      pressLabelHideTimer = 0;
    }
    if (!pressLabelBubble) return;
    debugLog('label:clear', bubbleLabelSnapshot(pressLabelBubble));
    pressLabelBubble.classList.remove('is-pressing');
    pressLabelBubble = null;
    pressLabelPointerId = null;
  }

  function showPressLabel(bubble, pointerId = null) {
    if (!bubble) return;
    debugLog('label:show-request', {
      id: bubbleDebugId(bubble),
      pointerId,
      mobileDock: shell?.dataset?.mobileDock || '',
      dockMode: shell?.dataset?.dockMode || ''
    });
    if (pressLabelHideTimer) {
      clearTimeout(pressLabelHideTimer);
      pressLabelHideTimer = 0;
    }
    if (pressLabelBubble && pressLabelBubble !== bubble) {
      pressLabelBubble.classList.remove('is-pressing');
    }
    pressLabelBubble = bubble;
    pressLabelPointerId = pointerId;
    pressLabelBubble.classList.add('is-pressing');
    requestAnimationFrame(() => {
      debugLog('label:show-applied', bubbleLabelSnapshot(pressLabelBubble));
    });
  }

  function schedulePressLabelClear(delayMs = 0) {
    debugLog('label:clear-scheduled', { delayMs, active: bubbleDebugId(pressLabelBubble) });
    if (pressLabelHideTimer) {
      clearTimeout(pressLabelHideTimer);
      pressLabelHideTimer = 0;
    }
    if (delayMs <= 0) {
      clearPressLabel();
      return;
    }
    pressLabelHideTimer = setTimeout(() => clearPressLabel(), delayMs);
  }

  function shouldSuppressDockClick(event) {
    if (Date.now() < suppressAnyDockClickUntil) return true;
    if (!suppressClick) return false;
    const now = Date.now();
    if (now > suppressClick.until) {
      suppressClick = null;
      return false;
    }
    const btn = event.target.closest('[data-widget]');
    const id = btn?.getAttribute('data-widget');
    if (id && id !== suppressClick.id) {
      suppressClick = null;
      return false;
    }
    suppressClick = null;
    return true;
  }

  dock.addEventListener('scroll', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches('[data-dock-app-strip]')) {
      dockScrollMemory.appStripTop = target.scrollTop;
      return;
    }
    if (target.matches('[data-dock-mobile-scroll]')) {
      dockScrollMemory.mobileLeft = target.scrollLeft;
    }
  }, true);

  dock.addEventListener('wheel', (e) => {
    const track = e.target.closest('[data-dock-mobile-scroll], [data-dock-app-strip]');
    if (!(track instanceof HTMLElement)) return;
    if (track.scrollWidth <= track.clientWidth + 2) return;
    const horizontal = Math.abs(e.deltaX) >= Math.abs(e.deltaY);
    const delta = horizontal ? e.deltaX : e.deltaY;
    if (!delta) return;
    track.scrollLeft += delta;
    e.preventDefault();
  }, { passive: false });

  function dockTrackIsScrollable(track) {
    return track instanceof HTMLElement && track.scrollWidth > track.clientWidth + 2;
  }

  function endDockTrackDrag() {
    const drag = dockTrackDragState;
    if (!drag) return;
    drag.track.classList.remove('is-dragging');
    try { drag.track.releasePointerCapture?.(drag.pointerId); } catch {}
    if (drag.moved) {
      suppressAnyDockClickUntil = Date.now() + 260;
    }
    dockTrackDragState = null;
  }

  dock.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    if (dockReorderMode && e.target.closest('.pp-widget-bubble[data-widget-draggable="1"]')) return;
    const track = e.target.closest('[data-dock-mobile-scroll], [data-dock-app-strip]');
    if (!dockTrackIsScrollable(track)) return;
    dockTrackDragState = {
      track,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: track.scrollLeft,
      axis: '',
      moved: false,
    };
    track.setPointerCapture?.(e.pointerId);
  });

  dock.addEventListener('pointermove', (e) => {
    const drag = dockTrackDragState;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (!drag.axis) {
      if (adx < 4 && ady < 4) return;
      drag.axis = adx >= ady ? 'x' : 'y';
      if (drag.axis !== 'x') {
        dockTrackDragState = null;
        return;
      }
      drag.track.classList.add('is-dragging');
    }

    if (drag.axis !== 'x') return;
    drag.moved = drag.moved || adx > 5;
    drag.track.scrollLeft = drag.startLeft - dx;
    e.preventDefault();
  });

  dock.addEventListener('pointerup', endDockTrackDrag);
  dock.addEventListener('pointercancel', endDockTrackDrag);
  dock.addEventListener('pointerleave', endDockTrackDrag);

  dock.addEventListener('click', (e) => {
    // Prevent the same click from bubbling to the document-level outside-close
    // after dock re-render swaps out the clicked node.
    e.stopPropagation();
    ignoreOutsideCloseUntil = Date.now() + 340;

    if (shouldSuppressDockClick(e)) {
      debugLog('dock:click-suppressed');
      return;
    }

    if (dockReorderMode) {
      const reorderBtn = e.target.closest('.pp-widget-bubble[data-widget-draggable="1"]');
      if (reorderBtn) {
        e.preventDefault();
        return;
      }
      setDockReorderMode(false);
    }

    const dockActionBtn = e.target.closest('[data-dock-action]');
    if (dockActionBtn) {
      const actionId = dockActionBtn.getAttribute('data-dock-action');
      debugLog('dock:action-click', { id: actionId });
      if (!dockActionById(actionId)) return;
      if (activeId === dockActionPanelId(actionId)) {
        closePanel();
      } else {
        setActiveDockAction(actionId);
      }
      return;
    }

    const control = e.target.closest('[data-widget-control]');
    if (control) {
      const action = control.getAttribute('data-widget-control');
      debugLog('dock:control', { action });
      if (action === 'collapse') {
        updateDockSetting('collapsed', !dockSettings.collapsed);
        return;
      }
      if (action === 'support') {
        ignoreOutsideCloseUntil = Math.max(ignoreOutsideCloseUntil, Date.now() + 360);
        const wasExpanded = control.getAttribute('aria-expanded') === 'true';
        if (wasExpanded) {
          closeHelpPill();
        } else {
          closeAllApps();
          closePanel();
          openHelpPill();
        }
        return;
      }
      if (action === 'carousel-prev' || action === 'carousel-next') {
        const dir = action === 'carousel-prev' ? -1 : 1;
        rotateMobileCarousel(dir, 'control');
      }
      return;
    }

    const providerBtn = e.target.closest('[data-widget-provider]');
    if (providerBtn) {
      const providerId = providerBtn.getAttribute('data-widget-provider');
      debugLog('dock:provider', { providerId });
      if (!providerId) return;
      integrationsFocus = providerId;
      if (!appSdk.listProviders().some((provider) => provider.id === providerId && provider.connected)) {
        appSdk.setProviderState(providerId, { connected: true, lastConnectedAt: new Date().toISOString() });
      }
      setActiveDockAction('more');
      return;
    }

    const btn = e.target.closest('[data-widget]');
    if (!btn) return;
    const id = btn.getAttribute('data-widget');
    debugLog('dock:widget-click', { id });
    if (id === 'customize') {
      if (Date.now() < ignoreCustomizeClickUntil) return;
      if (activeId === id) {
        closePanel();
      } else {
        openCustomizePanel();
      }
      return;
    }
    closePanel();
    closeHelpPill();
    toggleWidgetApp(id);
  });

  dock.addEventListener('keydown', (e) => {
    if (dockReorderMode) {
      const reorderItem = document.activeElement?.closest?.('.pp-widget-bubble[data-widget-draggable="1"]');
      const keyDir = e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0);
      if (reorderItem && keyDir && (e.shiftKey || e.altKey)) {
        const id = reorderItem.getAttribute('data-widget');
        e.preventDefault();
        if (moveWidgetOrder(id, keyDir)) {
          requestAnimationFrame(() => dock.querySelector(`[data-widget="${escapeAttrSelector(id)}"]`)?.focus?.());
        }
        return;
      }
    }

    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const items = dockFocusableItems();
    if (!items.length) return;
    const current = Math.max(0, items.indexOf(document.activeElement));
    const horizontal = shell.dataset.mobileDock === '1';
    let next = current;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if ((horizontal && e.key === 'ArrowRight') || (!horizontal && e.key === 'ArrowDown')) next = current + 1;
    else if ((horizontal && e.key === 'ArrowLeft') || (!horizontal && e.key === 'ArrowUp')) next = current - 1;
    else return;
    e.preventDefault();
    focusDockItem(next);
  });

  function handleDockContextMenu(e) {
    if (!(e.target instanceof Element)) return;
    if (!dock.contains(e.target)) return;
    const dockTarget = e.target.closest('.pp-widget-bubble, [data-widget], [data-widget-control], [data-widget-provider], [data-dock-action]');
    if (!dockTarget) return;
    const reorderBtn = e.target.closest('.pp-widget-bubble[data-widget-draggable="1"]');
    debugLog('dock:contextmenu-blocked', { id: bubbleDebugId(e.target.closest('.pp-widget-bubble')) });
    e.preventDefault();
    e.stopPropagation();
    if (reorderBtn && !dockReorderMode) {
      if (dockLongPressState?.btn === reorderBtn) {
        activateDockLongPressReorder();
      } else {
        clearDockLongPressState();
        setDockReorderMode(true, { render: false });
      }
      suppressAnyDockClickUntil = Date.now() + 420;
    }
  }

  document.addEventListener('contextmenu', handleDockContextMenu, true);

  if (helpPill) {
    helpPill.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.pp-help-toggle, .pp-help-pill')) e.preventDefault();
    });
  }

  dock.addEventListener('pointerdown', (e) => {
    const bubble = e.target.closest('.pp-widget-bubble');
    if (!bubble) return;
    if (e.pointerType !== 'touch') return;
    debugLog('dock:pointerdown-touch', { id: bubbleDebugId(bubble), pointerId: e.pointerId });
    showPressLabel(bubble, e.pointerId);
  });

  dock.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    if (!canUseMobileCarouselTrack()) return;
    const track = e.target.closest('[data-widget-mobile-track]');
    if (!track) return;
    mobileSwipeState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null
    };
    track.setPointerCapture?.(e.pointerId);
    debugLog('dock:swipe-start', {
      pointerId: e.pointerId,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY)
    });
  });

  dock.addEventListener('pointermove', (e) => {
    if (!mobileSwipeState) return;
    if (mobileSwipeState.pointerId !== e.pointerId) return;
    if (!canUseMobileCarouselTrack()) {
      mobileSwipeState = null;
      return;
    }
    const dx = e.clientX - mobileSwipeState.startX;
    const dy = e.clientY - mobileSwipeState.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (!mobileSwipeState.axis) {
      if (adx < MOBILE_SWIPE_ACTIVATE_PX && ady < MOBILE_SWIPE_ACTIVATE_PX) return;
      mobileSwipeState.axis = adx > ady ? 'x' : 'y';
      debugLog('dock:swipe-axis', {
        axis: mobileSwipeState.axis,
        dx: Math.round(dx),
        dy: Math.round(dy)
      });
    }
    if (mobileSwipeState.axis !== 'x') return;
    if (adx < MOBILE_SWIPE_STEP_PX) return;

    const dir = dx < 0 ? 1 : -1;
    suppressAnyDockClickUntil = Date.now() + MOBILE_SWIPE_CLICK_SUPPRESS_MS;
    schedulePressLabelClear(0);
    rotateMobileCarousel(dir, 'swipe');
    mobileSwipeState = null;
    e.preventDefault();
  });

  dock.addEventListener('pointerup', (e) => {
    if (pressLabelBubble && (pressLabelPointerId == null || pressLabelPointerId === e.pointerId)) {
      debugLog('dock:pointerup-touch', { id: bubbleDebugId(pressLabelBubble), pointerId: e.pointerId });
      schedulePressLabelClear(1100);
    }
    const btn = e.target.closest('[data-widget="customize"]');
    if (!btn) return;
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    e.stopPropagation();
    debugLog('dock:app-shelf-touch-pointerup');
    ignoreCustomizeClickUntil = Date.now() + 320;
    ignoreOutsideCloseUntil = Date.now() + 360;
    if (activeId === 'customize') closePanel();
    else openCustomizePanel();
  });

  dock.addEventListener('pointerup', (e) => {
    if (mobileSwipeState && mobileSwipeState.pointerId === e.pointerId) {
      debugLog('dock:swipe-end', { pointerId: e.pointerId });
      mobileSwipeState = null;
    }
  });

  dock.addEventListener('pointercancel', (e) => {
    if (mobileSwipeState && mobileSwipeState.pointerId === e.pointerId) {
      debugLog('dock:swipe-cancel', { pointerId: e.pointerId });
      mobileSwipeState = null;
    }
  });

  document.addEventListener('pointerdown', (e) => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : null;
    const inDock = path ? path.includes(dock) : dock.contains(e.target);
    const inPanel = path ? path.includes(panel) : panel.contains(e.target);
    const inHelp = path ? path.includes(helpPill) : helpPill.contains(e.target);
    if (dockReorderMode && !inDock && !inPanel && !inHelp) {
      setDockReorderMode(false);
    }
    if (inDock || inPanel || inHelp) {
      ignoreOutsideCloseUntil = Math.max(ignoreOutsideCloseUntil, Date.now() + 260);
      debugLog('outside:pointer-inside', { inDock, inPanel, inHelp });
    }
  }, true);

  helpToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    ignoreOutsideCloseUntil = Math.max(ignoreOutsideCloseUntil, Date.now() + 360);
    if (helpPill.classList.contains('is-open')) {
      closeHelpPill();
    } else {
      closePanel();
      openHelpPill();
    }
  });

  if (helpTipBtn) {
    helpTipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      updateHelpTip();
    });
  }

  panel.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-panel]')) {
      closePanel();
      return;
    }

    const dockPanelAction = e.target.closest('[data-dock-panel-action]');
    if (dockPanelAction) {
      const action = dockPanelAction.getAttribute('data-dock-panel-action');
      if (action === 'help') {
        closePanel();
        openHelpPill();
        return;
      }
      if (action === 'customize') {
        openCustomizePanel();
        return;
      }
      if (action === 'toggle-reorder') {
        const nextMode = !dockReorderMode;
        setDockReorderMode(nextMode);
        if (nextMode) {
          closePanel();
        } else {
          renderPanel();
        }
        return;
      }
      if (action === 'care-compose') {
        focusCareComposer();
        return;
      }
    }

    const dockOpenWidget = e.target.closest('[data-dock-open-widget]');
    if (dockOpenWidget) {
      const id = canonicalWidgetId(dockOpenWidget.getAttribute('data-dock-open-widget'));
      if (widgetIsDockApp(id)) {
        pinWidgetToDock(id);
        closePanel();
        closeHelpPill();
        openWidgetApp(id);
      }
      return;
    }

    const dockPinWidget = e.target.closest('[data-dock-pin-widget]');
    if (dockPinWidget) {
      const id = canonicalWidgetId(dockPinWidget.getAttribute('data-dock-pin-widget'));
      if (!widgetIsDockApp(id)) return;
      if (state.enabled.includes(id)) {
        removeWidgetFromDock(id, { close: true });
      } else {
        pinWidgetToDock(id);
      }
      renderPanel();
      return;
    }

    const shelfProviderToggle = e.target.closest('[data-app-shelf-provider-toggle]');
    if (shelfProviderToggle) {
      const providerId = shelfProviderToggle.getAttribute('data-app-shelf-provider-toggle');
      if (!providerId) return;
      const connected = appSdk.toggleProviderConnection(providerId);
      if (!connected && integrationsFocus === providerId) integrationsFocus = null;
      renderDock();
      renderPanel();
      return;
    }

    const shelfProviderFocus = e.target.closest('[data-app-shelf-provider-focus]');
    if (shelfProviderFocus) {
      const providerId = shelfProviderFocus.getAttribute('data-app-shelf-provider-focus');
      if (!providerId) return;
      integrationsFocus = providerId;
      if (!appSdk.listProviders().some((provider) => provider.id === providerId && provider.connected)) {
        appSdk.setProviderState(providerId, { connected: true, lastConnectedAt: new Date().toISOString() });
      }
      renderDock();
      renderPanel();
      return;
    }

    const shareBtn = e.target.closest('[data-loop-share]');
    if (shareBtn) {
      if (typeof window.PP_openLoopModal === 'function') {
        window.PP_openLoopModal();
      } else {
        window.location.href = '/account.html#loopTokensSection';
      }
      return;
    }
    const removeBtn = e.target.closest('[data-remove-widget]');
    if (removeBtn) {
      const id = removeBtn.getAttribute('data-remove-widget');
      if (!removeWidgetFromDock(id, { close: true })) return;
      closePanel();
      return;
    }

    const moveBtn = e.target.closest('[data-move-widget]');
    if (moveBtn) {
      const id = moveBtn.getAttribute('data-move-widget');
      const dir = Number(moveBtn.getAttribute('data-move-dir') || 0);
      if (!id || !dir) return;
      moveWidgetOrder(id, dir);
      return;
    }

    if (e.target.closest('[data-open-enabled-apps]')) {
      openEnabledApps();
      return;
    }

    if (e.target.closest('[data-close-all-apps]')) {
      closeAllApps();
      return;
    }

    if (e.target.matches('[data-reset-widgets]')) {
      state.enabled = defaultEnabled.slice();
      state.order = defaultEnabled.slice();
      saveState(state);
      appSdk.syncAllowed(state.enabled);
      renderDock();
      renderPanel();
      return;
    }

    if (e.target.matches('[data-reset-dock-settings]')) {
      dockSettings = { ...defaultDockSettings };
      saveDockSettings();
      applyDockSettings();
      renderDock();
      renderPanel();
    }
  });

  panel.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-care-journal-form]');
    if (!form) return;
    e.preventDefault();
    submitCareJournalFromPanel(form).catch((err) => {
      console.warn('[widgetDock] care journal submit failed:', err);
      setCareComposerFeedback('Could not save this journal entry. Please try again.', 'danger');
      setCareJournalFormBusy(form, false);
    });
  });

  panel.addEventListener('change', (e) => {
    const dockSelect = e.target.closest('[data-dock-setting]');
    if (dockSelect) {
      const key = dockSelect.getAttribute('data-dock-setting');
      const value = dockSelect.value;
      if (key === 'side' && (value === 'left' || value === 'right')) {
        updateDockSetting('side', value);
      } else if (key === 'size' && ['sm', 'md', 'lg'].includes(value)) {
        updateDockSetting('size', value);
      }
      return;
    }

    const dockCheck = e.target.closest('[data-dock-setting-check]');
    if (dockCheck) {
      const key = dockCheck.getAttribute('data-dock-setting-check');
      if (['collapsed', 'providerWidgets'].includes(key)) {
        updateDockSetting(key, !!dockCheck.checked);
      }
      return;
    }

    const providerCheck = e.target.closest('[data-provider-enabled]');
    if (providerCheck) {
      const providerId = providerCheck.getAttribute('data-provider-enabled');
      if (!providerId) return;
      appSdk.setProviderState(providerId, { enabled: !!providerCheck.checked });
      if (!providerCheck.checked && integrationsFocus === providerId) integrationsFocus = null;
      renderDock();
      renderPanel();
      return;
    }

    const carePetSelect = e.target.closest('[data-care-journal-pet]');
    if (carePetSelect) {
      careComposerSelectedPetId = carePetSelect.value;
      careComposerFeedback = null;
      return;
    }

    const careQuickCheck = e.target.closest('[data-care-panel-task]');
    if (careQuickCheck) {
      const root = careQuickCheck.closest('[data-care-panel-quick]') || panel;
      const checked = Array.from(root.querySelectorAll('[data-care-panel-task]:checked'))
        .map((el) => el.getAttribute('data-care-panel-task'));
      const saved = saveCareQuickCheckIds(checked);
      syncCareQuickCheckCounts(document, saved);
      if (appIsOpen('pet-workspace')) hydrateAppWindow('pet-workspace');
      return;
    }

    const input = e.target.closest('[data-toggle-widget]');
    if (!input) return;
    const id = canonicalWidgetId(input.getAttribute('data-toggle-widget'));
    if (!widgetIsDockApp(id)) {
      input.checked = false;
      return;
    }
    if (input.checked) {
      if (!state.enabled.includes(id)) state.enabled.push(id);
      if (!state.order.includes(id)) state.order.push(id);
    } else {
      if (state.enabled.length <= 1) {
        input.checked = true;
        return;
      }
      state.enabled = state.enabled.filter(x => x !== id);
      state.order = state.order.filter(x => x !== id);
      closeWidgetApp(id);
    }
    normalizeOrder();
    saveState(state);
    appSdk.syncAllowed(state.enabled);
    renderDock();
    renderPanel();
  });

  appLayer.addEventListener('click', (e) => {
    if (e.target.closest('[data-app-loop-share]')) {
      if (typeof window.PP_openLoopModal === 'function') window.PP_openLoopModal();
      else window.location.href = '/loop.html';
      return;
    }

    if (e.target.closest('[data-app-story-refresh]')) {
      pawketAppHost.runAction('stories', 'refreshSpark');
      return;
    }

    if (e.target.closest('[data-app-subs-spin]')) {
      const result = pawketAppHost.runAction(canonicalWidgetId('loop'), 'shufflePick');
      if (result === null) pawketAppHost.runAction('subs', 'shufflePick');
      return;
    }

    if (e.target.closest('[data-app-memory-lock]')) {
      const now = Date.now();
      if (now - lastCoreMemoryLockAt < 280) return;
      lastCoreMemoryLockAt = now;
      if (dockStatusCache.petsSignedIn) {
        const listEl = appLayer.querySelector('[data-app-traits-list]');
        if (listEl) {
          const row = document.createElement('li');
          row.textContent = 'Draft prompt: open a pet journal and mark a meaningful memory.';
          listEl.prepend(row);
          const rows = listEl.querySelectorAll('li');
          if (rows.length > 6) rows[rows.length - 1].remove();
        }
        return;
      }
      const pet = randomFrom(appData.pets) || { name: 'Sample Pet', species: 'Demo profile' };
      const memories = loadCoreMemories();
      const label = `${pet.species || 'Pal'} story spark`;
      memories.unshift({
        id: `memory-${Date.now()}`,
        petName: pet.name || 'Sample Pet',
        label,
        lockedAt: new Date().toISOString()
      });
      saveCoreMemories(memories);
      hydrateAppWindow('pet-workspace');
      return;
    }

    if (e.target.closest('[data-app-traits-random]')) {
      const appId = e.target.closest('[data-widget-app-id]')?.getAttribute('data-widget-app-id') || 'pet-workspace';
      const result = pawketAppHost.runAction(appId, 'randomFocus');
      if (result === null) pawketAppHost.runAction('pet-workspace', 'randomFocus');
      return;
    }

    if (e.target.closest('[data-app-pals-random]')) {
      pawketAppHost.runAction('pals', 'randomProfile');
      return;
    }

    if (e.target.closest('[data-app-reminders-celebrate]')) {
      const done = document.querySelectorAll('[data-app-reminder-task]:checked').length;
      const appRoot = e.target.closest('[data-widget-app-id]');
      const note = appRoot?.querySelector('[data-app-reminders-list]') || appLayer.querySelector('[data-app-reminders-list]');
      if (note) {
        const row = document.createElement('li');
        row.textContent = `Quick check-in saved here: ${done} care checks complete. Open journals to save a fuller note.`;
        note.prepend(row);
        const rows = note.querySelectorAll('li');
        if (rows.length > 6) rows[rows.length - 1].remove();
      }
      return;
    }

    const intToggle = e.target.closest('[data-app-int-toggle]');
    if (intToggle) {
      const providerId = intToggle.getAttribute('data-app-int-toggle');
      if (!providerId) return;
      const connected = appSdk.toggleProviderConnection(providerId);
      if (!connected && integrationsFocus === providerId) integrationsFocus = null;
      renderDock();
      renderPanel();
      return;
    }

    const intFocus = e.target.closest('[data-app-int-focus]');
    if (intFocus) {
      const providerId = intFocus.getAttribute('data-app-int-focus');
      if (!providerId) return;
      integrationsFocus = providerId;
      renderDock();
      renderPanel();
      return;
    }

    if (e.target.closest('[data-app-int-toggle-dock-providers]')) {
      updateDockSetting('providerWidgets', !dockSettings.providerWidgets);
      renderPanel();
      return;
    }

    if (e.target.closest('[data-app-int-reload]')) {
      renderDock();
      renderPanel();
      return;
    }
  });

  appLayer.addEventListener('input', (e) => {
    const slider = e.target.closest('[data-app-pals-mood]');
    if (slider) {
      const value = Number(slider.value || 0);
      localStorage.setItem('pp-widget-pals-mood', String(value));
      const moodValue = appLayer.querySelector('[data-app-pals-mood-value]');
      if (moodValue) moodValue.textContent = `${value}%`;
      const kpi = appLayer.querySelector('[data-app-pals-count]')?.closest('.pp-widget-app-kpis')?.querySelector('.pp-widget-app-kpi:last-child strong');
      if (kpi) kpi.textContent = `${value}%`;
      return;
    }

    const reminder = e.target.closest('[data-app-reminder-task]');
    if (reminder) {
      const root = reminder.closest('.pp-widget-app') || appLayer;
      const checked = Array.from(root.querySelectorAll('[data-app-reminder-task]:checked')).map((el) => el.getAttribute('data-app-reminder-task'));
      const saved = saveCareQuickCheckIds(checked);
      const doneEl = root?.querySelector('[data-app-reminders-done]');
      const todoEl = root?.querySelector('[data-app-reminders-togo]');
      if (doneEl) doneEl.textContent = String(saved.length);
      if (todoEl) todoEl.textContent = String(Math.max(0, CARE_QUICK_CHECKS.length - saved.length));
      syncCareQuickCheckCounts(panel, saved);
    }
  });

  document.addEventListener('pp:story:refresh', (event) => {
    if (event?.detail?.skipDock) return;
    const source = String(event?.detail?.source || '');
    refreshCareSurfaces({ forcePets: source.startsWith('pet-') }).catch(() => {});
  });

  // Phone-style dock reorder: drag-scroll normally, long-press an app to rearrange.
  let dragState = null;
  const DRAG_THRESHOLD = 6;

  function getAxis() {
    const dir = window.getComputedStyle(dock).flexDirection || 'column';
    return dir.includes('row') ? 'x' : 'y';
  }

  function getPos(e, axis) {
    return axis === 'x' ? e.clientX : e.clientY;
  }

  function bubbles() {
    return Array.from(dock.querySelectorAll('.pp-widget-bubble[data-widget-draggable="1"]'));
  }

  function updateOrderFromDom() {
    const ids = bubbles().map(b => b.getAttribute('data-widget')).filter(Boolean);
    const tail = state.order.filter((id) => !ids.includes(id));
    state.order = [...ids, ...tail];
    normalizeOrder();
    saveState(state);
  }

  function clearDockLongPressState() {
    if (!dockLongPressState) return;
    if (dockLongPressState.timer) clearTimeout(dockLongPressState.timer);
    dockLongPressState = null;
  }

  function startDockBubbleDrag(btn, e, { fromLongPress = false } = {}) {
    const id = btn.getAttribute('data-widget');
    if (!id || id === 'customize') return false;
    debugLog('drag:start', { id, pointerType: e.pointerType, pointerId: e.pointerId, fromLongPress });
    dragState = {
      id,
      btn,
      axis: getAxis(),
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      activated: true,
      pointerType: e.pointerType,
      fromLongPress,
      timer: null
    };
    try { btn.setPointerCapture?.(e.pointerId); } catch {}
    clearPressLabel();
    return true;
  }

  function activateDockLongPressReorder() {
    const press = dockLongPressState;
    if (!press || press.activated) return;
    press.activated = true;
    endDockTrackDrag();
    setDockReorderMode(true, { render: false });
    suppressAnyDockClickUntil = Date.now() + 340;
    startDockBubbleDrag(press.btn, press.event, { fromLongPress: true });
    debugLog('dock:long-press-reorder', { id: press.id });
    dockLongPressState = null;
  }

  dock.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    if (dockReorderMode) return;
    const btn = e.target.closest('.pp-widget-bubble[data-widget-draggable="1"]');
    if (!btn) return;
    if (!btn.closest('[data-dock-mobile-scroll], [data-dock-app-strip]')) return;
    const id = btn.getAttribute('data-widget');
    if (!id || id === 'customize') return;
    clearDockLongPressState();
    dockLongPressState = {
      id,
      btn,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      activated: false,
      event: {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        clientX: e.clientX,
        clientY: e.clientY
      },
      timer: setTimeout(activateDockLongPressReorder, DOCK_REORDER_LONG_PRESS_MS)
    };
  });

  dock.addEventListener('pointermove', (e) => {
    const press = dockLongPressState;
    if (!press || press.pointerId !== e.pointerId || press.activated) return;
    const dx = e.clientX - press.startX;
    const dy = e.clientY - press.startY;
    if (Math.hypot(dx, dy) > DOCK_REORDER_MOVE_CANCEL_PX) {
      clearDockLongPressState();
    }
  });

  dock.addEventListener('pointerup', (e) => {
    if (dockLongPressState?.pointerId === e.pointerId) clearDockLongPressState();
  });

  dock.addEventListener('pointercancel', (e) => {
    if (dockLongPressState?.pointerId === e.pointerId) clearDockLongPressState();
  });

  dock.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.pp-widget-bubble');
    if (!btn) return;
    if (!dockReorderMode) return;
    if (btn.getAttribute('data-widget-draggable') !== '1') return;
    e.preventDefault();
    e.stopPropagation();
    startDockBubbleDrag(btn, e);
  });

  dock.addEventListener('pointermove', (e) => {
    if (!dragState) return;
    if (dragState.pointerId !== e.pointerId) return;
    const { btn, axis, startX, startY } = dragState;
    const container = btn.parentElement;
    if (!container) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dist = Math.hypot(dx, dy);
    if (!dragState.moved && dist > DRAG_THRESHOLD) {
      dragState.moved = true;
      dock.classList.add('pp-dragging');
      btn.classList.add('pp-dragging');
    }
    if (!dragState.moved) return;
    e.preventDefault();

    const pos = getPos(e, axis);
    const items = bubbles().filter((b) => b !== btn && b.parentElement === container);
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const mid = axis === 'x' ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      if (pos < mid) {
        if (item.previousSibling !== btn) {
          container.insertBefore(btn, item);
        }
        break;
      }
      if (item === items[items.length - 1]) {
        container.insertBefore(btn, item.nextSibling);
      }
    }
  });

  function endDrag(e = null) {
    if (!dragState) return;
    if (e?.pointerId != null && dragState.pointerId !== e.pointerId) return;
    if (dragState.timer) clearTimeout(dragState.timer);
    dragState.btn.classList.remove('pp-dragging');
    dock.classList.remove('pp-dragging');
    if (dragState.moved) {
      updateOrderFromDom();
      debugLog('drag:end-reordered', { id: dragState.id });
    } else {
      debugLog('drag:end-no-move', { id: dragState.id });
    }
    suppressClick = {
      id: dragState.id,
      until: Date.now() + 420
    };
    schedulePressLabelClear(0);
    dragState = null;
  }

  dock.addEventListener('pointerup', endDrag);
  dock.addEventListener('pointercancel', endDrag);
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  dock.addEventListener('pointerleave', () => schedulePressLabelClear(0));
  document.addEventListener('pointercancel', () => schedulePressLabelClear(0));

  function getWidgetDebugSnapshot() {
    const dockDebug = (() => {
      try {
        if (window.PP_widgetDockDebug?.snapshot) {
          return window.PP_widgetDockDebug.snapshot({ silent: true });
        }
      } catch {}
      try {
        return window.__PP_WIDGET_DOCK_DEBUG_STATE || null;
      } catch {
        return null;
      }
    })();

    return {
      debugEnabled: DEBUG_ON,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      shell: {
        widgetSide: shell?.dataset?.widgetSide || '',
        mobileDock: shell?.dataset?.mobileDock || '',
        dockMode: shell?.dataset?.dockMode || ''
      },
      dockSettings: { ...dockSettings },
      activeId,
      pressLabel: {
        pointerId: pressLabelPointerId,
        bubble: bubbleLabelSnapshot(pressLabelBubble)
      },
      drag: dragState
        ? {
            id: dragState.id,
            pointerType: dragState.pointerType,
            moved: !!dragState.moved,
            activated: !!dragState.activated
          }
        : null,
      dockDebug,
      debugLineCount: debugLines.length
    };
  }

  function installWidgetDebugApi() {
    window.PP_widgetDebug = {
      enabled: DEBUG_ON,
      enablePersistent() {
        try { localStorage.setItem(DEBUG_STORAGE_KEY, '1'); } catch {}
        console.info('[PP_widgetDebug] persistent debug enabled. Reload the page.');
      },
      disablePersistent() {
        try { localStorage.removeItem(DEBUG_STORAGE_KEY); } catch {}
        console.info('[PP_widgetDebug] persistent debug disabled. Reload the page.');
      },
      reloadWithDebug(enabled = true) {
        const url = new URL(window.location.href);
        url.searchParams.set('ppWidgetDebug', enabled ? '1' : '0');
        window.location.href = url.toString();
      },
      snapshot() {
        return getWidgetDebugSnapshot();
      },
      log(label, payload) {
        const safeLabel = String(label || 'external');
        debugLog(safeLabel, payload);
        return getWidgetDebugSnapshot();
      },
      dump(limit = 120) {
        const n = Math.max(1, Number(limit) || 120);
        return debugLines.slice(-n);
      },
      dumpLabels(limit = 120) {
        const n = Math.max(1, Number(limit) || 120);
        const lines = debugLines.filter((line) => line.includes(' label:') || line.includes(' dock:pointer'));
        return lines.slice(-n);
      },
      printLabels(limit = 60) {
        const lines = this.dumpLabels(limit);
        console.log(lines.join('\n'));
        return lines;
      },
      currentLabelState() {
        return {
          pointerId: pressLabelPointerId,
          bubble: bubbleLabelSnapshot(pressLabelBubble),
          mobileDock: shell?.dataset?.mobileDock || '',
          dockMode: shell?.dataset?.dockMode || ''
        };
      },
      viewportState() {
        return {
          width: getWidgetViewportWidth(),
          lastWidth: lastWidgetViewportWidth,
          mobile: window.matchMedia(DOCK_MOBILE_QUERY).matches,
          lastMobile: lastWidgetViewportMobile,
          refreshAt: shell?.dataset?.viewportRefreshAt || null
        };
      },
      forceViewportReset(reason = 'debug') {
        resetWidgetBarForViewport({
          reason,
          width: getWidgetViewportWidth(),
          previousWidth: lastWidgetViewportWidth,
          widthDelta: Math.abs(getWidgetViewportWidth() - lastWidgetViewportWidth),
          mobileDock: window.matchMedia(DOCK_MOBILE_QUERY).matches,
          mobileChanged: window.matchMedia(DOCK_MOBILE_QUERY).matches !== lastWidgetViewportMobile
        });
        return this.viewportState();
      },
      print(limit = 40) {
        const lines = this.dump(limit);
        console.log(lines.join('\n'));
        return lines;
      },
      clear() {
        debugLines.length = 0;
        const hud = ensureDebugHud();
        if (hud) hud.textContent = '';
      }
    };
  }

  installWidgetDebugApi();
  debugLog('debug:init', getWidgetDebugSnapshot());

  document.addEventListener('click', (e) => {
    const now = Date.now();
    if (now < ignoreOutsideCloseUntil) {
      debugLog('panel:outside-skip-timer', { remaining: ignoreOutsideCloseUntil - now });
      return;
    }

    const path = typeof e.composedPath === 'function' ? e.composedPath() : null;
    const inDock = path ? path.includes(dock) : dock.contains(e.target);
    const inPanel = path ? path.includes(panel) : panel.contains(e.target);
    const inHelp = path ? path.includes(helpPill) : helpPill.contains(e.target);

    if (panel.classList.contains('is-open')) {
      const panelAge = panelOpenedAt ? now - panelOpenedAt : 9999;
      if (panelAge < 360) {
        debugLog('panel:outside-skip-fresh-open', { age: panelAge });
        return;
      }
      if (!inDock && !inPanel) {
        debugLog('panel:outside-click-close');
        closePanel();
      }
    }
    if (helpPill.classList.contains('is-open')) {
      if (!inHelp) {
        closeHelpPill();
      }
    }
  });

  function getWidgetViewportWidth() {
    const viewport = window.visualViewport;
    const width = Number.isFinite(viewport?.width)
      ? viewport.width
      : (window.innerWidth || document.documentElement.clientWidth || 0);
    return Math.max(0, Math.round(width));
  }

  const WIDGET_VIEWPORT_REFRESH_MIN_DELTA = 12;
  const WIDGET_VIEWPORT_REFRESH_DEBOUNCE_MS = 140;
  let lastWidgetViewportWidth = getWidgetViewportWidth();
  let lastWidgetViewportMobile = window.matchMedia(DOCK_MOBILE_QUERY).matches;
  let widgetViewportRefreshTimer = 0;

  function resetWidgetBarForViewport(detail = {}) {
    mobileCarouselOffset = 0;
    mobileSwipeState = null;
    suppressClick = null;
    suppressAnyDockClickUntil = 0;
    ignoreCustomizeClickUntil = 0;
    shell.dataset.viewportRefreshAt = String(Date.now());
    clearPressLabel();
    if (detail.mobileChanged && helpPill.classList.contains('is-open')) {
      closeHelpPill();
    }
    syncHelpPillAccessibility();
    applyDockSettings();
    renderDock();
    if (activeId) {
      renderPanel();
      requestAnimationFrame(positionPanelNearDock);
    }
    debugLog('dock:viewport-local-reset', detail);
  }

  function scheduleWidgetBarViewportReset(reason = 'resize') {
    const width = getWidgetViewportWidth();
    const mobile = window.matchMedia(DOCK_MOBILE_QUERY).matches;
    const widthDelta = Math.abs(width - lastWidgetViewportWidth);
    const mobileChanged = mobile !== lastWidgetViewportMobile;
    if (widthDelta < WIDGET_VIEWPORT_REFRESH_MIN_DELTA && !mobileChanged) return;

    if (widgetViewportRefreshTimer) clearTimeout(widgetViewportRefreshTimer);
    widgetViewportRefreshTimer = setTimeout(() => {
      widgetViewportRefreshTimer = 0;
      const finalWidth = getWidgetViewportWidth();
      const finalMobile = window.matchMedia(DOCK_MOBILE_QUERY).matches;
      const finalDelta = Math.abs(finalWidth - lastWidgetViewportWidth);
      const finalMobileChanged = finalMobile !== lastWidgetViewportMobile;
      if (finalDelta < WIDGET_VIEWPORT_REFRESH_MIN_DELTA && !finalMobileChanged) return;

      const previousWidth = lastWidgetViewportWidth;
      lastWidgetViewportWidth = finalWidth;
      lastWidgetViewportMobile = finalMobile;
      resetWidgetBarForViewport({
        reason,
        width: finalWidth,
        previousWidth,
        widthDelta: finalDelta,
        mobileDock: finalMobile,
        mobileChanged: finalMobileChanged
      });
    }, WIDGET_VIEWPORT_REFRESH_DEBOUNCE_MS);
  }

  window.addEventListener('resize', () => {
    if (activeId) positionPanelNearDock();
    scheduleWidgetBarViewportReset('resize');
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    scheduleWidgetBarViewportReset('orientationchange');
  }, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      scheduleWidgetBarViewportReset('visualViewport.resize');
    }, { passive: true });
  }

  document.addEventListener('pp:widgetDock:viewport-refresh', (event) => {
    const detail = event?.detail || {};
    lastWidgetViewportWidth = getWidgetViewportWidth();
    lastWidgetViewportMobile = window.matchMedia(DOCK_MOBILE_QUERY).matches;
    resetWidgetBarForViewport(detail);
    debugLog('dock:viewport-refresh', detail);
  });

  renderDock();
  renderPanel();
  renderHelpQuick();
  renderHelpItems();
  debugLog('init:widget-band-ready');

  const hadOpenWorkspaceLegacyWidgetApp = Array.from(workspaceLegacyWidgetIds).some((id) => appSdk.isOpen(id));
  const hadOpenShopLegacyWidgetApp = Array.from(shopLegacyWidgetIds).some((id) => appSdk.isOpen(id));
  appSdk.syncAllowed(state.enabled);
  if (hadOpenWorkspaceLegacyWidgetApp && state.enabled.includes('pet-workspace')) {
    openWidgetApp('pet-workspace');
  }
  if (hadOpenShopLegacyWidgetApp && state.enabled.includes('loop')) {
    openWidgetApp('loop');
  }
  appSdk.hydrateOpen((id) => {
    if (!state.enabled.includes(id) || !widgetIsDockApp(id)) return null;
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return null;
    return {
      id,
      title: widget.title,
      subtitle: widget.hint || 'Widget app',
      icon: widget.icon,
      themeClass: `is-${id}`,
      bodyHtml: widgetAppBody(id),
      defaults: widgetAppDefaults(id)
    };
  });
  appSdk.forEachOpen((id) => hydrateAppWindow(id));
  window.__PP_WIDGET_BAND_READY = true;
}
