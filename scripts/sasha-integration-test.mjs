#!/usr/bin/env node
// SASHA end-to-end integration test
// This imports SASHA modules and runs them with the Cavity Sliders data.

import { buildContext } from '../src/ingestion/ContextBuilder.js';
import { parseLaylaCsv } from '../src/ingestion/LaylaReader.js';
import { analyzeOpportunities } from '../src/planner/OpportunityAnalyzer.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CODI_PATH = '/home/lfdm/codiv4';
const SASHA_PATH = '/home/lfdm/sasha';

console.log('=== SASHA Integration Test ===\n');

// 1. Load handoff
console.log('1. Loading CODI handoff...');
const handoffPath = SASHA_PATH + '/test-data/handoff.json';
const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf-8'));
console.log(`   ${handoff.keywords.length} keywords, ${handoff.clusters.length} clusters\n`);

// 2. Load LAYLA
console.log('2. Loading LAYLA data...');
const laylaPath = CODI_PATH + '/test-files/CavitySliders_LAYLA.csv';
const laylaCsv = fs.readFileSync(laylaPath, 'utf-8');
const laylaData = parseLaylaCsv(laylaCsv);
console.log(`   Client: ${laylaData?.client?.domain || 'Unknown'}`);
console.log(`   Competitors provided: ${laylaData?.competitors?.length || 0}`);
if (laylaData?.competitors) {
  laylaData.competitors.forEach(c => console.log(`     - ${c.domain || c.name || '?'}`));
}
console.log();

// 3. Meeting notes
console.log('3. Loading meeting notes...');
const meetingPath = CODI_PATH + '/test-files/Meeting_ Howard Lee_Ken - 2026_04_27 15_31 PDT - Notes by Gemini.pdf';
// PDF parsing is complex in Node — use extracted text from the meeting doc
const meetingNotes = `
Pocket door content prioritization: The content strategy will prioritize the build-out of the pocket door section.
US-only content strategy focus: restricted to US market.
Development site password protection needed.
4-weight framework: Heaviest=product/SKU terms, Heavy=trade-flavored, Medium=spec/install, Light=DIY.
Mandatory B2B vocabulary: high end, premium, luxury, architectural, heavy duty, commercial, contractor, specifier, trade, wholesale, OEM, distributor, dealer, spec sheet, cut sheet, fire rated, ADA, soft close, automatic.
Biggest opportunity: pocket door terms (356K monthly searches, CS captures ~11%).
Main competitor: Pocket Door Superstore (19K monthly traffic, covers wide range of topics).
Cannibalization issues: 24 client URLs competing for 234 pocket door keywords.
Phase 1 focus: Reclaim pocket-door core, fix cannibalization, optimize existing pages, build B2B hub pages.
`;
console.log(`   Meeting notes: ${meetingNotes.length} chars\n`);

// 4. B2B vocab
const b2bVocab = handoff.config?.b2bVocabulary || [];

// 5. Build context
console.log('4. Building context...');
const context = buildContext({
  codiHandoff: handoff,
  laylaData: laylaData,
  meetingNotes: meetingNotes,
  b2bVocab: b2bVocab,
  crawlData: null
});
console.log(`   Competitors: ${context.competitors?.length || 0}`);
console.log(`   Keywords in context: ${context.keywords?.length || 0}`);
console.log(`   Weight distribution: ${JSON.stringify(context.weightDistribution)}`);
console.log(`   Strategic decisions: ${Object.keys(context.strategicDecisions || {}).length}\n`);

// 6. Analyze opportunities
console.log('5. Analyzing opportunities...');

// Exclude cabinet hardware and non-product terms per strategic decision
const excludePatterns = [
  'cabinet hardware', 'cabinet hinge', 'cabinet door', 'cabinet pull', 'cabinet knob',
  'drawer slide', 'drawer pull', 'drawer glide', 'drawer runner',
  'shelf bracket', 'shelf standard', 'shelf pin', 'shelf support', 'shelf clip',
  'closet pole', 'closet rod', 'closet organizer', 'closet system',
  'barn door', 'barn door hardware', 'barn door kit', 'barn door track',
  'shower door', 'shower enclosure', 'shower hardware',
  'garage door', 'garage door hardware', 'garage door opener',
  'screen door', 'storm door', 'window hardware', 'window lock',
  'shelf and pole', 'shelving system', 'wire shelving',
  'closet maid', 'closetmaid', 'rubbermaid closet',
  'glass shelf bracket', 'glass shelving bracket', 'glass shelving', 'glass shelf',
  'shelving bracket', 'shelf glass',
  'pull out shelf', 'pullout shelf', 'pull down shelf',
  'magic corner', 'blind corner', 'lazy susan'
];

const opportunities = analyzeOpportunities(context, { excludePatterns });

// Check that excluded terms are gone
const excludedChecks = [
  'barn door hardware kit', 'closet poles', 'cabinet hinges',
  'hidden cabinet door hinges', 'sliding cabinet door hardware',
  'bar drawer pulls', 'brackets for glass shelving'
];
for (const term of excludedChecks) {
  const found = (opportunities.opportunities || []).some(o =>
    o.keyword.toLowerCase().includes(term.toLowerCase())
  );
  if (found) {
    console.error(`   ❌ EXCLUDED TERM STILL PRESENT: "${term}"`);
    process.exitCode = 1;
  } else {
    console.log(`   ✅ Excluded term correctly removed: "${term}"`);
  }
}

// Check that pocket door terms ARE still present
const includedChecks = [
  'pocket door system', 'pocket door frame kit',
  'pocket door hardware', 'pocket doors'
];
for (const term of includedChecks) {
  const found = (opportunities.opportunities || []).some(o =>
    o.keyword.toLowerCase().includes(term.toLowerCase())
  );
  if (found) {
    console.log(`   ✅ Core term still present: "${term}"`);
  } else {
    console.warn(`   ⚠️ Core term not found in top results: "${term}"`);
  }
}

console.log(`   Opportunity topics: ${opportunities.topics?.length || 0}`);
const topics = (opportunities.topics || [])
  .sort((a, b) => b.totalGap - a.totalGap);

console.log('\n   Top opportunity topics:');
topics.slice(0, 10).forEach((t) => {
  console.log(`     ${t.topic.padEnd(40)} gap=${t.totalGap} ops=${t.opportunities?.length || 0}`);
});

console.log('\n   Top individual opportunities:');
(opportunities.opportunities || [])
  .slice(0, 10)
  .forEach(o => {
    console.log(`     "${o.keyword}" (vol=${o.volume}, seo=${o.seoPriority}, gap=${o.competitorGap?.toFixed(1) || '?'}) — ${o.urgency || 'N/A'}`);
  });

// 7. Weight breakdown
console.log('\n6. Weight distribution across data:');
const wd = { heaviest: 0, heavy: 0, medium: 0, light: 0 };
for (const kw of context.keywords.slice(0, 5000)) {
  const w = kw.content_weight || 1;
  if (w === 4) wd.heaviest++;
  else if (w === 3) wd.heavy++;
  else if (w === 2) wd.medium++;
  else wd.light++;
}
console.log(`   heaviest=${wd.heaviest} heavy=${wd.heavy} medium=${wd.medium} light=${wd.light} (first 5000)`);

console.log('\n✅ SASHA integration test complete');
console.log(`   Ready for PageArchitect + DeepSeek generation`);
