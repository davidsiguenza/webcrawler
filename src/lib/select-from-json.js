/**
 * Select 7 distinct image slots (logo, hero×3, newArrivals, featured women, featured men)
 * from the full scrape JSON. Deduplicates by "image family" (same asset in different formats)
 * and scores by aspect ratio + keywords so each slot gets a different, well-fitting image.
 */

import { candidateKeywords, normalizeWhitespace, slugify, titleCase, truncate } from './strings.js';

const DEFAULTS = {
  heroCtaText: 'SHOP NOW',
  featureCtaText: 'EXPLORE',
  browseTitle: 'Browse',
  browseCtaText: 'Shop',
  featuredProductsTitle: 'Our Picks',
};

/** Normalize URL to a stable "family" key so .avif, .webp, .jpg of the same asset share one key. */
export function imageFamilyKey(url) {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/$/, '');
    path = path.replace(/\.(avif|webp|jpg|jpeg|png|svg)(\?|$)/i, '$2');
    const segment = path.split('/').filter(Boolean).pop() || path;
    return segment || url;
  } catch {
    return url;
  }
}

/** Prefer one URL per family: .svg for logo; for photos prefer .jpg or .webp, then by dimensions. */
function pickRepresentativeUrl(candidates, preferSvg = false) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (preferSvg) {
    const svg = candidates.find((c) => /\.svg(\?|$)/i.test(c.url));
    if (svg) return svg;
  }

  const photo = candidates
    .filter((c) => /\.(jpg|jpeg|webp|avif|png)(\?|$)/i.test(c.url))
    .sort((a, b) => {
      const order = { jpg: 0, jpeg: 0, webp: 1, png: 2, avif: 3 };
      const extA = (a.url.match(/\.(jpg|jpeg|webp|avif|png)/i) || [])[1]?.toLowerCase();
      const extB = (b.url.match(/\.(jpg|jpeg|webp|avif|png)/i) || [])[1]?.toLowerCase();
      const scoreA = order[extA] ?? 4;
      const scoreB = order[extB] ?? 4;
      if (scoreA !== scoreB) return scoreA - scoreB;
      const areaA = (a.width || 0) * (a.height || 0);
      const areaB = (b.width || 0) * (b.height || 0);
      return areaB - areaA;
    })[0];
  return photo || candidates[0];
}

/** Group candidates by image family and attach keywords + scores to each representative. */
function buildFamilies(images, pageUrl) {
  const byFamily = new Map();

  for (const img of images) {
    const key = imageFamilyKey(img.url);
    if (!byFamily.has(key)) {
      byFamily.set(key, []);
    }
    byFamily.get(key).push(img);
  }

  const families = [];
  for (const [familyKey, candidates] of byFamily) {
    const isLogoFamily = candidates.some((c) => /\.svg(\?|$)/i.test(c.url));
    const representative = pickRepresentativeUrl(candidates, isLogoFamily);
    if (!representative) continue;

    const keywords = candidateKeywords(
      representative.url,
      representative.alt,
      representative.context?.heading,
      representative.context?.text,
      (representative.context?.links || [])
        .map((l) => `${l.text || ''} ${l.href || ''}`)
        .join(' '),
    );

    const scores = scoreCandidate({
      ...representative,
      keywords,
      index: Math.min(...candidates.map((c) => c.index ?? 0)),
    });

    families.push({
      familyKey,
      representative,
      candidates,
      keywords,
      scores,
    });
  }

  return families.sort((a, b) => topScore(b) - topScore(a));
}

function scoreCandidate(candidate) {
  const keywords = candidate.keywords || '';
  const landscapeScore = scoreLandscape(candidate);
  const topOfPageBonus = Math.max(0, 24 - (candidate.index || 0) * 4);

  return {
    logo:
      topOfPageBonus +
      landscapeScore * -0.15 +
      keywordScore(keywords, ['logo', 'brand', 'wordmark', 'header'], 40) +
      keywordScore(keywords, ['svg'], 30) +
      keywordScore(keywords, ['hero', 'banner', 'desktop', 'homepage'], -20) +
      keywordScore(keywords, ['icon', 'chevron', 'flexa', 'arrow'], -25),
    hero:
      landscapeScore +
      topOfPageBonus +
      keywordScore(keywords, ['hero', 'banner', 'homepage', 'desktop', '_desktop', 'carousel', 'slider'], 22) +
      keywordScore(keywords, ['.mp4', '.webm', 'video', 'movie'], -100) +
      keywordScore(
        keywords,
        ['mobile', '_mobile', 'portrait', 'logo', 'icon', 'new', 'arrival', 'noved', 'women', 'mujer', 'men', 'hombre', 'chevron', 'flexa'],
        -18,
      ),
    newArrivals:
      landscapeScore +
      keywordScore(keywords, ['.mp4', '.webm', 'video', 'movie'], -100) +
      keywordScore(
        keywords,
        ['new', 'arrivals', 'latest', 'season', 'collection', 'noved', 'just in', 'sneaker', 'launch', 'categor'],
        18,
      ) +
      keywordScore(keywords, ['mobile', '_mobile', 'logo', 'icon', 'chevron', 'flexa', 'arrow', 'breadcrumb'], -25),
    women:
      landscapeScore +
      keywordScore(keywords, ['.mp4', '.webm', 'video', 'movie'], -100) +
      keywordScore(keywords, ['women', 'woman', 'mujer', 'female', 'ladies'], 30) +
      keywordScore(keywords, ['men', 'man', 'hombre'], -12),
    men:
      landscapeScore +
      keywordScore(keywords, ['.mp4', '.webm', 'video', 'movie'], -100) +
      keywordScore(keywords, ['men', 'man', 'hombre', 'male'], 30) +
      keywordScore(keywords, ['women', 'woman', 'mujer'], -12),
  };
}

function scoreLandscape(candidate) {
  let score = 0;
  if (candidate.width && candidate.height) {
    score += candidate.width >= candidate.height ? 18 : -10;
    if (candidate.width / Math.max(candidate.height, 1) >= 1.45) {
      score += 12;
    }
  }
  const keywords = candidate.keywords || '';
  score += keywordScore(keywords, ['desktop', '_desktop', 'landscape', 'banner'], 18);
  score += keywordScore(keywords, ['mobile', '_mobile', 'portrait'], -22);
  return score;
}

function keywordScore(input, terms, scorePerHit) {
  const str = typeof input === 'string' ? input : '';
  return terms.reduce((total, term) => total + (str.includes(term) ? scorePerHit : 0), 0);
}

function topScore(family) {
  return Math.max(...Object.values(family.scores));
}

function selectFromFamilies(families) {
  const usedFamilies = new Set();

  const logo = pickBestByFamily(families, 'logo', usedFamilies);
  if (logo) usedFamilies.add(logo.familyKey);

  const heroSlides = [];
  for (const f of families
    .filter((f) => !usedFamilies.has(f.familyKey))
    .sort((a, b) => b.scores.hero - a.scores.hero)) {
    if (heroSlides.length >= 3) break;
    heroSlides.push(f.representative);
    usedFamilies.add(f.familyKey);
  }

  const women = pickBestByFamily(families, 'women', usedFamilies);
  if (women) usedFamilies.add(women.familyKey);

  const men = pickBestByFamily(families, 'men', usedFamilies);
  if (men) usedFamilies.add(men.familyKey);

  const newArrivals =
    pickBestByFamily(families, 'newArrivals', usedFamilies) ||
    families
      .filter((f) => !usedFamilies.has(f.familyKey))
      .sort(
        (a, b) =>
          b.scores.newArrivals + b.scores.hero - (a.scores.newArrivals + a.scores.hero),
      )[0];
  if (newArrivals) usedFamilies.add(newArrivals.familyKey);

  const womenFallback = women || pickBestByFamily(families, 'women', usedFamilies, ['hero']);
  const menFallback = men || pickBestByFamily(families, 'men', usedFamilies, ['hero']);

  return {
    logo: logo ? logo.representative : null,
    heroSlides,
    women: womenFallback ? womenFallback.representative : null,
    men: menFallback ? menFallback.representative : null,
    newArrivals: newArrivals ? newArrivals.representative : null,
  };
}

function pickBestByFamily(families, scoreKey, usedFamilies, fallbackKeys = []) {
  const available = families.filter((f) => !usedFamilies.has(f.familyKey));
  if (available.length === 0) return null;

  const keys = [scoreKey, ...fallbackKeys];
  return available.sort(
    (a, b) =>
      keys.reduce((sum, k) => sum + (b.scores[k] || 0), 0) -
      keys.reduce((sum, k) => sum + (a.scores[k] || 0), 0),
  )[0];
}

function buildContent({ selections, metadata, pageUrl, displayName }) {
  const heroSlides = selections.heroSlides.map((candidate, index) =>
    buildImageSlot(candidate, {
      fallbackTitle: `${displayName} ${index + 1}`,
      fallbackCtaText: DEFAULTS.heroCtaText,
      fallbackLink: pageUrl,
      allowSubtitle: true,
    }),
  );

  while (heroSlides.length < 3) {
    heroSlides.push({
      title: `${displayName} ${heroSlides.length + 1}`,
      subtitle: metadata?.description || `Discover the latest from ${displayName}.`,
      ctaText: DEFAULTS.heroCtaText,
      ctaLink: '/',
      imageUrl: '',
      imageAlt: `${displayName} hero image ${heroSlides.length + 1}`,
    });
  }

  const women = buildImageSlot(selections.women, {
    fallbackTitle: 'Women',
    fallbackCtaText: DEFAULTS.featureCtaText,
    fallbackLink: pageUrl,
    allowSubtitle: true,
  });

  const men = buildImageSlot(selections.men, {
    fallbackTitle: 'Men',
    fallbackCtaText: DEFAULTS.featureCtaText,
    fallbackLink: pageUrl,
    allowSubtitle: true,
  });

  const newArrivals = buildImageSlot(selections.newArrivals, {
    fallbackTitle: 'New Arrivals',
    fallbackCtaText: DEFAULTS.heroCtaText,
    fallbackLink: pageUrl,
    allowSubtitle: true,
  });

  return {
    hero: {
      slide1: heroSlides[0],
      slide2: heroSlides[1],
      slide3: heroSlides[2],
    },
    featuredProducts: { title: DEFAULTS.featuredProductsTitle },
    newArrivals: {
      title: newArrivals.title,
      description: newArrivals.subtitle,
      ctaText: newArrivals.ctaText,
      ctaLink: newArrivals.ctaLink,
      imageUrl: newArrivals.imageUrl,
      imageAlt: newArrivals.imageAlt,
    },
    categoryGrid: { title: DEFAULTS.browseTitle, shopNowButton: DEFAULTS.browseCtaText },
    featuredContent: {
      women: {
        title: women.title,
        description: women.subtitle,
        ctaText: women.ctaText,
        ctaLink: women.ctaLink,
        imageUrl: women.imageUrl,
        imageAlt: women.imageAlt,
      },
      men: {
        title: men.title,
        description: men.subtitle,
        ctaText: men.ctaText,
        ctaLink: men.ctaLink,
        imageUrl: men.imageUrl,
        imageAlt: men.imageAlt,
      },
    },
    pageTitle: metadata?.title || `${displayName} Store`,
    pageDescription: metadata?.description || `Welcome to ${displayName}.`,
  };
}

function buildImageSlot(candidate, options) {
  if (!candidate) {
    return {
      title: options.fallbackTitle,
      subtitle: options.allowSubtitle ? `Discover ${options.fallbackTitle}.` : '',
      ctaText: options.fallbackCtaText,
      ctaLink: sanitizeLink(options.fallbackLink),
      imageUrl: '',
      imageAlt: options.fallbackTitle,
    };
  }

  const title = firstMeaningful([
    candidate.context?.heading,
    candidate.alt,
    options.fallbackTitle,
  ]);
  const subtitle = options.allowSubtitle
    ? firstMeaningful([
        candidate.context?.paragraph,
        candidate.context?.headings?.[1],
        candidate.context?.text,
        `Discover ${title}.`,
      ])
    : null;
  const cta = firstRelevantLink(candidate.context?.links) || {};
  const ctaText = cta.text || options.fallbackCtaText;
  const ctaLink = sanitizeLink(cta.href || options.fallbackLink);

  return {
    title,
    subtitle: truncate(subtitle || '', 180),
    ctaText,
    ctaLink,
    imageUrl: candidate.url || '',
    imageAlt: candidate.alt || title,
  };
}

function firstMeaningful(values) {
  return values.map((v) => normalizeWhitespace(v)).find((v) => v && v.length > 0) || '';
}

function firstRelevantLink(links = []) {
  return (links || []).find((link) => {
    const text = normalizeWhitespace(link.text || '').toLowerCase();
    return text && text.length <= 30 && !['search', 'menu', 'close'].includes(text);
  });
}

function sanitizeLink(rawLink) {
  if (!rawLink) return '/';
  try {
    const url = new URL(rawLink);
    return `${url.pathname}${url.search}` || '/';
  } catch {
    return rawLink.startsWith('/') ? rawLink : '/';
  }
}

/**
 * From scrape payload (full page JSON with images + metadata), select 7 distinct slots
 * and build content. Returns { brandId, displayName, selections, content, source, imageCandidateCount, familyCount }.
 */
export function selectFromScrapePayload(payload, options = {}) {
  const { brandId, displayName } = options;
  const images = payload.images || [];
  const metadata = payload.metadata || {};
  const pageUrl = payload.finalUrl || payload.requestedUrl || '';
  const requestedUrl = payload.requestedUrl || pageUrl;

  const effectiveDisplayName =
    displayName ||
    metadata.siteName ||
    deriveDisplayName(metadata.title, requestedUrl) ||
    titleCase(brandId || 'Brand');
  const effectiveBrandId = brandId || slugify(effectiveDisplayName);

  const families = buildFamilies(images, pageUrl);
  const selections = selectFromFamilies(families);
  const content = buildContent({
    selections,
    metadata,
    pageUrl,
    displayName: effectiveDisplayName,
  });

  return {
    brandId: effectiveBrandId,
    displayName: effectiveDisplayName,
    selections,
    content,
    source: {
      requestedUrl,
      finalUrl: pageUrl,
      fetchedAt: new Date().toISOString(),
    },
    imageCandidateCount: images.length,
    familyCount: families.length,
  };
}

function deriveDisplayName(title, requestedUrl) {
  if (title) {
    const fromTitle = title.split(/[|\-–·]/)[0];
    if (normalizeWhitespace(fromTitle)) return normalizeWhitespace(fromTitle);
  }
  try {
    return new URL(requestedUrl).hostname.replace(/^www\./, '').split('.')[0];
  } catch {
    return 'Brand';
  }
}
