/* SASHA — ContextBuilder
 * Merges all input data into a single context object:
 *   - CODI handoff.json (26K keywords, clusters, intents, weights, Approved status)
 *   - LAYLA data (competitor domains, DR, visibility)
 *   - Meeting notes (client strategic decisions)
 *   - B2B vocabulary list
 *   - Website crawl data
 */

/**
 * Build a unified context from all available data sources.
 *
 * @param {Object} sources
 * @param {Object} sources.codiHandoff   — Parsed CODI handoff.json
 * @param {Object} sources.laylaData     — Output of LaylaReader.parseLaylaCsv()
 * @param {string} sources.meetingNotes  — Raw meeting notes text
 * @param {string[]} sources.b2bVocab    — B2B vocabulary term array
 * @param {Object} sources.crawlData     — Output of CrawlReader.parseCrawlCsv()
 * @returns {Object} context
 */
export function buildContext(sources = {}) {
  const {
    codiHandoff = null,
    laylaData = null,
    meetingNotes = '',
    b2bVocab = [],
    crawlData = null
  } = sources;

  // --- Extract from CODI handoff ---
  const keywords = codiHandoff?.keywords || codiHandoff?.data?.keywords || [];
  const clusters = codiHandoff?.clusters || codiHandoff?.data?.clusters || [];
  const intents = codiHandoff?.intents || codiHandoff?.data?.intents || {};
  const approvedStatus = codiHandoff?.approvedStatus || codiHandoff?.data?.approvedStatus || {};

  // Build weight distribution
  const weightDistribution = buildWeightDistribution(keywords);

  // Build intent corrections map
  const intentCorrections = extractIntentCorrections(keywords, intents);

  // --- Competitor info from LAYLA ---
  const competitors = laylaData?.competitors || [];
  const clientInfo = laylaData?.client || {};

  // --- Parse strategic decisions from meeting notes ---
  const strategicDecisions = parseStrategicDecisions(meetingNotes);

  // --- Extract existing URLs from crawl ---
  const existingUrls = crawlData?.crawledUrls || [];

  return {
    competitors,
    clientInfo,
    keywords,
    clusters,
    intentCorrections,
    b2bVocab,
    weightDistribution,
    strategicDecisions,
    existingUrls,
    pullDate: laylaData?.pullDate || '',
    // Raw references for downstream use
    raw: {
      codiHandoff,
      laylaData,
      meetingNotes,
      crawlData
    }
  };
}

/**
 * Build a weight distribution summary from keyword array.
 * Assumes keywords have a `weight` or `weightGroup` property (1-4, 4=heaviest).
 */
function buildWeightDistribution(keywords) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const kw of keywords) {
    const w = parseInt(kw.weight || kw.weightGroup || 0, 10);
    if (w >= 1 && w <= 4) dist[w]++;
  }
  return dist;
}

/**
 * Extract intent corrections from keyword data.
 * Returns a map of keyword -> corrected intent.
 */
function extractIntentCorrections(keywords, intents) {
  const corrections = {};
  if (!keywords || !intents) return corrections;

  for (const kw of keywords) {
    const keyword = kw.keyword || kw.term || '';
    const assignedIntent = kw.intent || '';
    const correctedIntent = intents[keyword] || assignedIntent;
    if (correctedIntent && correctedIntent !== assignedIntent) {
      corrections[keyword] = correctedIntent;
    }
  }
  return corrections;
}

/**
 * Parse meeting notes for strategic decisions.
 * Two-pass approach:
 *   1) Structured decision markers (Decision:, Agreed:, etc.)
 *   2) Free-text regex scanning for key constraints
 *
 * @param {string} notes — Raw meeting notes text
 * @returns {Array<{text:string, source:string, date?:string, type?:string}>}
 */
function parseStrategicDecisions(notes) {
  if (!notes || typeof notes !== 'string') return [];

  const decisions = [];
  const lines = notes.split(/\r?\n/);

  // --- Pass 1: Structured decision markers (original) ---
  let currentDecision = null;
  for (const line of lines) {
    const trimmed = line.trim();

    if (/^decision:/i.test(trimmed) || /^-\s*decision:/i.test(trimmed)) {
      if (currentDecision) decisions.push(currentDecision);
      currentDecision = {
        text: trimmed.replace(/^.*?decision:\s*/i, ''),
        source: 'meeting-notes',
        date: extractDate(trimmed),
        type: 'decision'
      };
    } else if (/^(decided|agreed|confirmed|resolved):/i.test(trimmed)) {
      if (currentDecision) decisions.push(currentDecision);
      currentDecision = {
        text: trimmed,
        source: 'meeting-notes',
        date: extractDate(trimmed),
        type: 'decision'
      };
    } else if (currentDecision && trimmed) {
      currentDecision.text += ' ' + trimmed;
    }
  }
  if (currentDecision) decisions.push(currentDecision);

  // --- Pass 2: Free-text regex scanning ---
  // Extract key constraints from natural-language sentences
  const freeTextPatterns = [
    {
      // "does not sell cabinet hardware", "doesn't sell cabinet hardware", "not in their product line"
      pattern: /\bdoes not sell\b|\bdoesn't sell\b|\bnot in (?:their|our) (?:product|line|scope)\b/gi,
      type: 'exclusion'
    },
    {
      // "Phase 1 focus", "top priority", "strategic priority", "focus area"
      pattern: /\bphase (?:1|one)\b|\b(?:top\s+)?priority\b|\bfocus\b/gi,
      type: 'priority'
    },
    {
      // "US-only", "United States only"
      pattern: /\b(?:US-only|United States only)\b/gi,
      type: 'restriction'
    },
    {
      // "mandatory", "required", "must", "need to"
      pattern: /\bmandatory\b|\brequired\b|\bmust\b|\bneed to\b/gi,
      type: 'requirement'
    }
  ];

  // Track seen text snippets to avoid near-duplicate entries for the same match
  const seen = new Set();

  for (const { pattern, type } of freeTextPatterns) {
    // Clone pattern to reset lastIndex safely
    const re = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = re.exec(notes)) !== null) {
      // Extract surrounding context (roughly one sentence / line worth)
      const ctxStart = Math.max(0, match.index - 80);
      const ctxEnd = Math.min(notes.length, match.index + match[0].length + 120);
      const context = notes
        .slice(ctxStart, ctxEnd)
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Deduplicate: skip if we've already captured this exact snippet
      const key = `${type}::${context}`;
      if (seen.has(key)) continue;
      seen.add(key);

      decisions.push({
        text: context,
        type,
        source: 'meeting-notes'
      });
    }
  }

  return decisions;
}

/**
 * Naive date extractor from text.
 */
function extractDate(text) {
  const dateMatch = text.match(/\d{4}[-/]\d{2}[-/]\d{2}/);
  return dateMatch ? dateMatch[0] : '';
}
