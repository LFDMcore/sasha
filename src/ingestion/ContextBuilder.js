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
 * Simple extractor looking for decision markers.
 */
function parseStrategicDecisions(notes) {
  if (!notes || typeof notes !== 'string') return [];

  const decisions = [];
  const lines = notes.split(/\r?\n/);

  let currentDecision = null;
  for (const line of lines) {
    const trimmed = line.trim();

    // Detect decision markers
    if (/^decision:/i.test(trimmed) || /^-\s*decision:/i.test(trimmed)) {
      if (currentDecision) decisions.push(currentDecision);
      currentDecision = {
        text: trimmed.replace(/^.*?decision:\s*/i, ''),
        source: 'meeting-notes',
        date: extractDate(trimmed)
      };
    } else if (/^(decided|agreed|confirmed|resolved):/i.test(trimmed)) {
      if (currentDecision) decisions.push(currentDecision);
      currentDecision = {
        text: trimmed,
        source: 'meeting-notes',
        date: extractDate(trimmed)
      };
    } else if (currentDecision && trimmed) {
      // Continuation of previous decision
      currentDecision.text += ' ' + trimmed;
    }
  }

  if (currentDecision) decisions.push(currentDecision);

  return decisions;
}

/**
 * Naive date extractor from text.
 */
function extractDate(text) {
  const dateMatch = text.match(/\d{4}[-/]\d{2}[-/]\d{2}/);
  return dateMatch ? dateMatch[0] : '';
}
