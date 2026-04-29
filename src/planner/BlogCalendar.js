/* SASHA — BlogCalendar
 * Generates blog topic calendar: topics, titles, publishing sequence.
 *
 * Stub that returns structured data. In production, this would call DeepSeek.
 */

/**
 * Generate a blog content calendar based on context and opportunities.
 *
 * @param {Object} context       — Output of ContextBuilder
 * @param {Object} opportunities — Output of OpportunityAnalyzer
 * @returns {Object} calendar
 */
export function generateBlogCalendar(context = {}, opportunities = {}) {
  const { b2bVocab = [], strategicDecisions = [] } = context;
  const topTopics = (opportunities.topics || []).slice(0, 6);

  const posts = topTopics.map((topic, idx) => ({
    week: idx + 1,
    topic: topic.topic,
    suggestedTitle: `${topic.topic}: A Complete Guide for Commercial Construction`,
    keywordTargets: (topic.opportunities || []).slice(0, 3).map((o) => o.keyword),
    contentWeight: idx < 2 ? 4 : 3,
    publishingDate: calculatePublishingDate(idx + 1),
    status: 'draft'
  }));

  // Add additional posts if we don't have enough
  while (posts.length < 6) {
    const fillerTopics = [
      'Architectural Hardware Specification Best Practices',
      'Commercial Door Hardware Trends 2025',
      'Multi-Family Housing Hardware Requirements',
      'Fire-Rated Door Hardware Guide',
      'ADA Compliance for Commercial Hardware',
      'Pocket Door Systems vs. Swing Doors'
    ];
    const idx = posts.length;
    posts.push({
      week: idx + 1,
      topic: fillerTopics[idx % fillerTopics.length],
      suggestedTitle: fillerTopics[idx % fillerTopics.length],
      keywordTargets: [],
      contentWeight: 2,
      publishingDate: calculatePublishingDate(idx + 1),
      status: 'draft'
    });
  }

  return {
    title: 'SASHA Blog Content Calendar',
    posts,
    totalPosts: posts.length,
    cadence: 'Weekly',
    b2bVocabRequired: b2bVocab.length > 0 ? b2bVocab : [
      'heavy-duty', 'commercial-grade', 'architectural hardware',
      'continuous hinge', 'pocket door system', 'ADA compliant'
    ]
  };
}

function calculatePublishingDate(weekOffset) {
  const d = new Date();
  d.setDate(d.getDate() + (weekOffset * 7));
  return d.toISOString().split('T')[0];
}
