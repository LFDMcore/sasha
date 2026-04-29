/* SASHA — PageArchitect
 * Uses DeepSeek v4 Flash for strategic reasoning to generate a
 * phased page architecture plan.
 *
 * Phases:
 *   Phase 1 — Core reclamation (pocket door first per meeting)
 *   Phase 2 — Adjacent hardware attack (Hafele/Johnson territory)
 *   Phase 3 — Authority building
 *
 * Per page: title, keyword targets, competitor gap, urgency score,
 *           content weight focus, mandatory vocab
 */

import { routeCompletion } from '../core/ModelRouter.js';

/**
 * Build the structured prompt for DeepSeek.
 *
 * @param {Object} context      — Output of ContextBuilder.buildContext()
 * @param {Object} opportunities — Output of OpportunityAnalyzer.analyzeOpportunities()
 * @returns {Array} messages array
 */
function buildArchitecturePrompt(context, opportunities) {
  const {
    competitors = [],
    clientInfo = {},
    b2bVocab = [],
    strategicDecisions = [],
    weightDistribution = {},
    keywords = []
  } = context;

  const topOpportunities = (opportunities.opportunities || []).slice(0, 30);

  const competitorNames = competitors.map((c) => c.domain).join(', ') || 'Hafele, Johnson Hardware, Richelieu';
  const clientName = clientInfo.name || 'Cavi (CaviSlider, CaviTrack, CaviLock)';

  // B2B vocabulary context
  const b2bContext = b2bVocab.length > 0
    ? b2bVocab.join(', ')
    : 'heavy-duty, commercial-grade, architectural hardware, continuous hinge, pocket door system, sliding door hardware, barn door hardware, fire-rated, ADA compliant, commercial construction, multi-family, hospitality';

  // Strategic decisions from meetings
  const decisionsText = strategicDecisions.length > 0
    ? strategicDecisions.map((d) => `- ${d.text}`).join('\n')
    : '- US-only focus\n- Pocket door hardware first (core reclamation)\n- Adjacent hardware attack (Hafele/Johnson territory) in Phase 2\n- Authority building in Phase 3';

  // Weight distribution summary
  const weightSummary = Object.entries(weightDistribution)
    .map(([w, count]) => `Weight ${w}: ${count} keywords`)
    .join('\n');

  const systemPrompt = `You are SASHA, an expert SEO strategist and content architect specializing in B2B architectural hardware e-commerce.

You are generating a Page Architecture Plan for ${clientName}.

## Context
- **Client**: ${clientName} — manufacturer of premium architectural hardware
- **Product Lines**: CaviSlider (sliding door systems), CaviTrack (track systems), CaviLock (locksets), CaviAccessories, CaviSelect
- **Target Market**: US only (commercial construction, multi-family, hospitality)
- **Competitors**: ${competitorNames}

## Strategic Decisions
${decisionsText}

## 4-Weight Keyword Framework
${weightSummary || 'Weight 4 (heaviest): Product/SKU pages\nWeight 3: Category/subcategory\nWeight 2: Supporting content\nWeight 1: Lightweight/brand'}

## Mandatory B2B Vocabulary
${b2bContext}

## Top Keyword Opportunities
${topOpportunities.map((o) => `- "${o.keyword}" (score: ${o.score}, urgency: ${o.urgency}, weight: ${o.weight}, intent: ${o.intent})`).join('\n')}

## Task
Generate a complete phased page architecture plan. Return ONLY valid JSON with this structure:

{
  "phases": {
    "phase1": {
      "title": "Core Reclamation",
      "description": "Pocket door systems and core product reclamation — highest priority",
      "pages": [
        {
          "title": "Page title for the new page",
          "urlSlug": "suggested-url-slug",
          "keywordTargets": ["primary keyword", "secondary keyword"],
          "competitorGap": "Which competitor currently dominates this",
          "urgencyScore": 90,
          "contentWeightFocus": 4,
          "mandatoryVocab": ["heavy-duty", "commercial-grade"],
          "intent": "commercial",
          "pageType": "product-category|product|guide|comparison",
          "reasoning": "Brief strategic rationale"
        }
      ]
    },
    "phase2": {
      "title": "Adjacent Hardware Attack",
      "description": "Attack Hafele/Johnson territory — adjacent product categories",
      "pages": []
    },
    "phase3": {
      "title": "Authority Building",
      "description": "Build topical authority and thought leadership",
      "pages": []
    }
  },
  "summary": {
    "totalNewPages": 0,
    "estimatedTimeframeWeeks": 0,
    "primaryFocus": "Strategic summary"
  }
}

Generate 5-8 pages per phase with realistic, specific page titles based on the keyword opportunities provided.`;
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Generate the page architecture plan based on the above context.' }
  ];
}

/**
 * Generate a page architecture plan using DeepSeek.
 *
 * @param {Object} context       — Output of ContextBuilder.buildContext()
 * @param {Object} opportunities — Output of OpportunityAnalyzer.analyzeOpportunities()
 * @param {Object} options       — Additional options (model, temperature, etc.)
 * @returns {Promise<Object>}    — Parsed architecture plan JSON
 */
export async function generateArchitecturePlan(context, opportunities, options = {}) {
  const messages = buildArchitecturePrompt(context, opportunities);

  try {
    const result = await routeCompletion('page-architecture', messages, {
      temperature: 0.3,
      maxTokens: 4096,
      parseJson: true,
      ...options
    });

    return result;
  } catch (err) {
    console.error('[PageArchitect] Failed to generate plan:', err.message);
    // Return a fallback structure so UI doesn't crash
    return getFallbackPlan();
  }
}

/**
 * Fallback plan if LLM call fails.
 */
function getFallbackPlan() {
  return {
    phases: {
      phase1: {
        title: 'Core Reclamation',
        description: 'Pocket door systems and core product reclamation',
        pages: [
          {
            title: 'Complete Pocket Door Hardware Systems Guide',
            urlSlug: 'pocket-door-hardware-systems',
            keywordTargets: ['pocket door hardware', 'pocket door system', 'commercial pocket door'],
            competitorGap: 'Hafele dominates this space',
            urgencyScore: 95,
            contentWeightFocus: 4,
            mandatoryVocab: ['heavy-duty', 'commercial-grade', 'pocket door system'],
            intent: 'commercial',
            pageType: 'guide',
            reasoning: 'Core reclamation — pocket door was identified as highest priority in meeting'
          },
          {
            title: 'Commercial Pocket Door Frames',
            urlSlug: 'commercial-pocket-door-frames',
            keywordTargets: ['commercial pocket door frame', 'pocket door frame kit'],
            competitorGap: 'Johnson Hardware has strong position',
            urgencyScore: 88,
            contentWeightFocus: 4,
            mandatoryVocab: ['commercial-grade', 'fire-rated'],
            intent: 'commercial',
            pageType: 'product-category',
            reasoning: 'Direct product category adjacent to pocket doors'
          }
        ]
      },
      phase2: {
        title: 'Adjacent Hardware Attack',
        description: 'Attack Hafele/Johnson territory',
        pages: [
          {
            title: 'Continuous Hinges for Commercial Doors',
            urlSlug: 'commercial-continuous-hinges',
            keywordTargets: ['continuous hinge', 'commercial door hinge', 'heavy duty hinge'],
            competitorGap: 'Hafele and Stanley dominate',
            urgencyScore: 75,
            contentWeightFocus: 3,
            mandatoryVocab: ['continuous hinge', 'heavy-duty', 'commercial-grade'],
            intent: 'commercial',
            pageType: 'product-category',
            reasoning: 'Adjacent category where Cavi can compete'
          }
        ]
      },
      phase3: {
        title: 'Authority Building',
        description: 'Build topical authority and thought leadership',
        pages: [
          {
            title: 'Commercial Door Hardware: Complete Specification Guide',
            urlSlug: 'commercial-door-hardware-specification-guide',
            keywordTargets: ['commercial door hardware', 'door hardware specification', 'architectural hardware guide'],
            competitorGap: 'Wide open opportunity',
            urgencyScore: 65,
            contentWeightFocus: 2,
            mandatoryVocab: ['architectural hardware', 'commercial construction', 'specification'],
            intent: 'informational',
            pageType: 'guide',
            reasoning: 'Authority content to capture top-of-funnel commercial searchers'
          }
        ]
      }
    },
    summary: {
      totalNewPages: 4,
      estimatedTimeframeWeeks: 12,
      primaryFocus: 'Pocket door hardware core reclamation with adjacent hardware expansion'
    }
  };
}

/**
 * Re-generate a specific phase plan (iterative refinement).
 */
export async function refinePhase(context, opportunities, phaseKey, feedback) {
  const messages = buildArchitecturePrompt(context, opportunities);
  messages.push({
    role: 'user',
    content: `Please refine ${phaseKey} specifically. Consider this feedback: ${feedback}`
  });

  try {
    const result = await routeCompletion('page-architecture', messages, {
      temperature: 0.4,
      maxTokens: 4096,
      parseJson: true
    });
    return result;
  } catch (err) {
    console.error('[PageArchitect] Refinement failed:', err.message);
    return null;
  }
}
