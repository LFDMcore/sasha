/* SASHA — OpportunityAnalyzer
 * Pure computation (no LLM). For each keyword not covered by client pages,
 * calculate an opportunity score using:
 *   - SEO Priority
 *   - KD Opp (keyword difficulty opportunity)
 *   - Competitor density
 *   - CPC efficiency
 *   - Content weight (4-weight framework)
 *
 * Clusters by topic and returns ranked opportunities.
 */

/**
 * Analyze keyword opportunity gaps.
 *
 * @param {Object} context   — Output of ContextBuilder.buildContext()
 * @param {Object} [options] — Options object
 * @param {string[]} [options.excludePatterns=[]] — Keyword patterns to exclude (case-insensitive contains match)
 * @returns {Object} { topic, opportunities, totalGap }
 */
export function analyzeOpportunities(context = {}, options = {}) {
  const {
    keywords = [],
    clusters = [],
    existingUrls = [],
    competitors = [],
    weightDistribution = {}
  } = context;

  const { excludePatterns = [] } = options;

  // Build set of existing URL paths for quick matching
  const existingPaths = new Set(
    existingUrls.map((url) => normalizeUrl(url))
  );

  // Build segment lookup from clusters
  const segmentMap = {};
  for (const cluster of clusters) {
    const name = cluster.name || cluster.segment || '';
    const members = cluster.keywords || cluster.members || [];
    for (const kw of members) {
      const term = typeof kw === 'string' ? kw : (kw.keyword || kw.term || '');
      segmentMap[term] = name;
    }
  }

  // Score each keyword
  const scored = [];
  for (const kw of keywords) {
    const term = kw.keyword || kw.term || '';
    if (!term) continue;

    // Skip if this keyword matches any exclude pattern
    if (isExcluded(term, excludePatterns)) continue;

    const weight = parseInt(kw.weight || kw.weightGroup || 2, 10);
    const seoPriority = kw.seoPriority || kw.priority || 50;
    const kd = kw.kd || kw.difficulty || 50;
    const cpc = kw.cpc || 0;
    const intent = kw.intent || 'informational';
    const volume = kw.volume || kw.searchVolume || 0;

    // Check if this keyword is covered by existing pages
    const coveredByClient = isKeywordCovered(term, existingPaths);

    // Competitor gap: how many competitors rank for this?
    const competitorCount = countCompetitorsFor(term, competitors);
    const competitorGap = Math.max(0, 10 - competitorCount); // arbitrary scale

    // KD Opp: higher gap when difficulty is moderate and not covered
    const kdOpp = coveredByClient ? 0 : Math.max(0, 100 - kd) * (competitorGap / 10);

    // CPC efficiency: high CPC + low coverage = good opportunity
    const cpcEfficiency = coveredByClient ? 0 : (cpc / 10) * (1 - competitorCount / 20);

    // Weight multiplier (4-weight framework: 4=heaviest=product/SKU)
    const weightMultiplier = weight / 4;

    // Intent score: transactional/buying-intent higher value
    const intentScore = getIntentScore(intent);

    // Composite opportunity score (0-100)
    const opportunityScore = Math.round(
      (seoPriority * 0.15) +
      (kdOpp * 0.25) +
      (cpcEfficiency * 0.10) +
      (weightMultiplier * 25) +
      (intentScore * 0.15) +
      (volume > 0 ? Math.min(volume, 1000) / 1000 * 10 : 0)
    );

    const urgency = calculateUrgency(opportunityScore, weight, competitorGap, coveredByClient);

    scored.push({
      keyword: term,
      score: Math.min(100, opportunityScore),
      weight,
      intent,
      volume,
      seoPriority,
      kd,
      cpc,
      competitorGap,
      kdOpp,
      cpcEfficiency,
      coveredByClient,
      urgency,
      segment: segmentMap[term] || 'uncategorized'
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Cluster by segment/topic
  const byTopic = {};
  for (const item of scored) {
    const topic = item.segment || 'uncategorized';
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(item);
  }

  // Build topic summaries
  const topics = Object.entries(byTopic)
    .filter(([_, items]) => items.length > 0)
    .map(([topic, items]) => {
      const totalScore = items.reduce((s, i) => s + i.score, 0);
      const covered = items.filter((i) => i.coveredByClient).length;
      const uncovered = items.filter((i) => !i.coveredByClient).length;
      return {
        topic,
        opportunities: items.slice(0, 50), // top 50 per topic
        totalGap: uncovered,
        coverage: items.length > 0 ? Math.round((covered / items.length) * 100) : 0,
        avgScore: items.length > 0 ? Math.round(totalScore / items.length) : 0
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const totalGap = scored.filter((i) => !i.coveredByClient).length;

  return {
    topics,
    opportunities: scored,
    totalGap,
    totalKeywords: scored.length,
    coveredKeywords: scored.filter((i) => i.coveredByClient).length
  };
}

/**
 * Normalize URL for matching.
 */
function normalizeUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .trim();
}

/**
 * Check if a keyword is covered by existing pages.
 * Simple heuristic: see if the keyword appears in URL or title.
 */
function isKeywordCovered(keyword, existingPaths) {
  const normalized = keyword.toLowerCase().replace(/\s+/g, '-');
  for (const path of existingPaths) {
    if (path.includes(normalized)) return true;
    // Also check normalized path contains keyword words
    const words = keyword.toLowerCase().split(/\s+/);
    const matchCount = words.filter((w) => w.length > 3 && path.includes(w)).length;
    if (matchCount >= Math.min(2, words.length)) return true;
  }
  return false;
}

/**
 * Count how many competitors might rank for a keyword.
 * Uses domain-level heuristic based on competitor list.
 */
function countCompetitorsFor(keyword, competitors) {
  return competitors.length > 0 ? Math.min(competitors.length, 10) : 3;
}

/**
 * Score based on search intent.
 */
function getIntentScore(intent) {
  const scores = {
    transactional: 100,
    commercial: 85,
    navigational: 60,
    informational: 40,
    'buying-intent': 95,
    'product': 90,
    'category': 75
  };
  const lower = (intent || '').toLowerCase();
  return scores[lower] || 50;
}

/**
 * Calculate urgency: combination of opportunity score, weight, and gap.
 */
function calculateUrgency(score, weight, gap, covered) {
  if (covered) return 'none';
  if (score >= 80 && weight >= 3 && gap > 5) return 'critical';
  if (score >= 60 && weight >= 2) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Check if a keyword matches any exclude pattern (case-insensitive contains).
 * @param {string} term
 * @param {string[]} patterns
 * @returns {boolean}
 */
function isExcluded(term, patterns) {
  if (!patterns || patterns.length === 0) return false;
  const lower = term.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}
