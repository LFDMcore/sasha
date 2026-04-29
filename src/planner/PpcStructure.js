/* SASHA — PpcStructure
 * Generates PPC structure: ad groups, match types, budget allocation.
 *
 * Stub that returns structured data. In production, this would call DeepSeek.
 */

/**
 * Generate PPC campaign structure based on context and opportunities.
 *
 * @param {Object} context       — Output of ContextBuilder
 * @param {Object} opportunities — Output of OpportunityAnalyzer
 * @returns {Object} ppcStructure
 */
export function generatePpcStructure(context = {}, opportunities = {}) {
  const { competitors = [], weightDistribution = {}, clientInfo = {} } = context;
  const topKw = (opportunities.opportunities || []).slice(0, 20);

  const clientName = clientInfo?.name || 'Client';

  // Group by intent
  const byIntent = { commercial: [], informational: [], transactional: [], navigational: [] };
  for (const kw of topKw) {
    const intent = (kw.intent || 'informational').toLowerCase();
    if (byIntent[intent]) byIntent[intent].push(kw);
    else byIntent.informational.push(kw);
  }

  const campaignGroups = Object.entries(byIntent)
    .filter(([_, kws]) => kws.length > 0)
    .map(([intent, kws]) => ({
      campaignName: `${clientName} - ${capitalize(intent)} - Search`,
      adGroups: kws.slice(0, 5).map((kw, i) => ({
        name: `AG ${i + 1} - ${kw.keyword.slice(0, 30)}`,
        keywords: [kw.keyword],
        matchTypes: ['phrase', 'exact'],
        bidAdjustment: kw.weight >= 3 ? 1.2 : 1.0,
        estimatedTraffic: kw.volume || 0
      })),
      budget: allocateBudget(intent, kws.length),
      targetCpa: intent === 'transactional' ? 25 : intent === 'commercial' ? 35 : 50
    }));

  return {
    campaigns: campaignGroups,
    totalMonthlyBudget: campaignGroups.reduce((s, g) => s + g.budget, 0),
    recommendedMatchTypeDistribution: {
      exact: 40,
      phrase: 35,
      broad: 25
    },
    competitorTargets: competitors.map((c) => c.domain),
    negativeKeywords: ['free', 'diy', 'cheap', 'used'],
    notes: 'US-only targeting per meeting decision. Brand + non-brand split recommended.'
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function allocateBudget(intent, keywordCount) {
  const base = {
    transactional: 2000,
    commercial: 1500,
    informational: 800,
    navigational: 500
  };
  return (base[intent] || 800) + (keywordCount * 50);
}
