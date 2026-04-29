#!/usr/bin/env node
// Generate SASHA strategy document — Node-compatible version
// Uses docx directly (file-saver is browser-only)

import { buildContext } from '../src/ingestion/ContextBuilder.js';
import { parseLaylaCsv } from '../src/ingestion/LaylaReader.js';
import { analyzeOpportunities } from '../src/planner/OpportunityAnalyzer.js';
import { generateArchitecturePlan } from '../src/planner/PageArchitect.js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import fs from 'fs';

const CODI_PATH = '/home/lfdm/codiv4';
const SASHA_PATH = '/home/lfdm/sasha';

console.log('=== SASHA Strategy Document Generation ===\n');

// 1. Load data
console.log('1. Loading data...');
const handoff = JSON.parse(fs.readFileSync(SASHA_PATH + '/test-data/cavity-sliders-handoff.json', 'utf-8'));
const laylaCsv = fs.readFileSync(CODI_PATH + '/test-files/CavitySliders_LAYLA.csv', 'utf-8');
const laylaData = parseLaylaCsv(laylaCsv);
console.log(`   ${handoff.keywords.length} keywords loaded`);

// 2. Build context
const meetingNotes = `Pocket door content prioritization: Phase 1 focus on pocket door section.
US-only content strategy focus.
Company does not sell cabinet hardware, including shelf pins and hinges.
4-weight framework: heaviest=product/SKU, heavy=trade-flavored, medium=spec/install, light=DIY.
Mandatory B2B vocabulary required for every page.
Biggest opportunity: pocket door terms (356K monthly searches, CS captures ~11%).
Main competitor: Pocket Door Superstore (19K monthly traffic).
Phase 1: Reclaim pocket-door core, fix cannibalization, optimize existing pages.`;

const b2bVocab = handoff.config?.b2bVocabulary || [];

const context = buildContext({
  codiHandoff: handoff,
  laylaData: laylaData,
  meetingNotes: meetingNotes,
  b2bVocab: b2bVocab,
  crawlData: null
});

// 3. Analyze
console.log('2. Analyzing opportunities...');

// Exclusions come from the handoff config now — no hardcoded lists
// The context.excludePatterns is built by ContextBuilder from:
//   - handoff.config.negativeKeywords
//   - handoff.config.negativeProductCategories
//   - strategic exclusions parsed from meeting notes ("does not sell X")
console.log(`   Config exclusions: ${context.excludePatterns?.length || 0} patterns`);

const opps = analyzeOpportunities(context, { excludePatterns: context.excludePatterns || [] });
const topOps = opps.opportunities.filter(o => !o.coveredByClient).slice(0, 30);

// 4. Generate architecture plan
console.log('3. Generating architecture plan...');
// Read DeepSeek API key from Hermes env (ESM-compatible)
let apiKey = process.env.VITE_DEEPSEEK_API_KEY || '';
if (!apiKey) {
  try {
    const envContent = fs.readFileSync('/home/lfdm/.hermes/.env', 'utf-8');
    const match = envContent.match(/^DEEPSEEK_API_KEY=(.+)$/m);
    if (match) apiKey = match[1].trim().replace(/^["']|["']$/g, '');
  } catch (e) { console.warn('Could not read DeepSeek key:', e.message); }
}
// Also try the local .env as fallback
if (!apiKey) {
  try {
    const envContent = fs.readFileSync('/home/lfdm/sasha/.env', 'utf-8');
    const match = envContent.match(/^VITE_DEEPSEEK_API_KEY=(.+)$/m);
    if (match) apiKey = match[1].trim().replace(/^["']|["']$/g, '');
  } catch (e) {}
}

// Set env so DeepSeekClient picks it up
process.env.VITE_DEEPSEEK_API_KEY = apiKey;
process.env.VITE_OPENROUTER_KEY = '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';

// Debug: verify key loaded
if (!apiKey) {
  console.warn('   ⚠️ No DeepSeek API key found. Check .hermes/.env or .env');
} else {
  console.log(`   ✅ DeepSeek key loaded (${apiKey.substring(0, 8)}...)`);
}

const arch = apiKey
  ? await generateArchitecturePlan(context, topOps, { apiKey })
  : { phases: {}, summary: {}, recommendations: [] };
console.log(`   Plan generated (${Object.keys(arch.phases || {}).length} phases, ${Object.keys(arch).length} top-level keys)`);

// 5. Build DOCX
console.log('4. Building DOCX document...');

// Phase data from analysis
// Use real DeepSeek data when available, fall back to opportunity analysis
const hasRealPlan = arch?.phases && Object.keys(arch.phases).length > 0;
const phaseData = hasRealPlan ? arch.phases : {};
const phase1Pages = hasRealPlan
  ? (phaseData.phase1?.pages || [])
  : topOps.filter(o => o.urgency === 'critical' || (o.urgency === 'high' && o.weight >= 3)).slice(0, 5);
const phase2Pages = hasRealPlan
  ? (phaseData.phase2?.pages || [])
  : topOps.filter(o => o.urgency === 'high' && o.weight >= 2).slice(0, 5);
const phase3Pages = hasRealPlan
  ? (phaseData.phase3?.pages || [])
  : topOps.filter(o => o.urgency === 'medium').slice(0, 5);

const doc = new Document({
  title: `SASHA Strategy Report — ${handoff.client || handoff.config?.clientDomain || 'Client'}`,
  description: 'Strategic Content Opportunity & 12-Month Plan',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    children: [
      // Title page
      new Paragraph({ text: 'SASHA — Strategic Architecture Plan', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: handoff.client || handoff.config?.clientDomain || 'Client', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
      new Paragraph({ text: `Generated: ${new Date().toISOString().split('T')[0]} | Strategic Edition`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

      // Executive Summary
      new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        text: `Derived from CODI v4 pipeline export — ${opps.totalKeywords} keywords analyzed, ${opps.topics.length} topics identified. Total unmet opportunity gap: ${opps.totalGap} keywords. This plan follows the 4-weight content framework focusing on B2B-first content for contractors, architects, specifiers, and dealers.`,
        spacing: { after: 200 }
      }),

      // Key Stats
      new Paragraph({ text: 'Key Statistics', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: `• Keywords analyzed: ${opps.totalKeywords.toLocaleString()}` }),
      new Paragraph({ text: `• Topics/clusters: ${opps.topics.length}` }),
      new Paragraph({ text: `• Unmet opportunity gap: ${opps.totalGap.toLocaleString()} keywords` }),
      new Paragraph({ text: `• Critical urgency items: ${topOps.filter(o => o.urgency === 'critical').length}` }),
      new Paragraph({ text: `• High urgency items: ${topOps.filter(o => o.urgency === 'high').length}` }),
      new Paragraph({ text: `• Content weights: heaviest=${context.keywords.filter(k => (k.content_weight||0)>=4).length}, heavy=${context.keywords.filter(k => k.content_weight===3).length}, medium=${context.keywords.filter(k => k.content_weight===2).length}, light=${context.keywords.filter(k => k.content_weight===1).length}`, spacing: { after: 200 } }),

      // Phase 1: Reclaim Core
      new Paragraph({ text: 'Phase 1: Core Product Categories (B2B First)', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Mission: Build content for the client\'s core product categories with content built for contractors, architects and dealers, not homeowners.', spacing: { after: 200 } }),
      new Paragraph({ text: 'Key pages to build:', heading: HeadingLevel.HEADING_2 }),
      ...phase1Pages.flatMap((p, i) => {
        // Handle both DeepSeek API format and fallback format
        const pageTitle = p.title || `"${p.keyword}"`;
        const pageVol = p.volume || '';
        const pageSeo = p.seoPriority || p.urgencyScore || '';
        const pageGap = typeof p.competitorGap === 'number' ? p.competitorGap?.toFixed(1) : p.competitorGap || '';
        const pageUrgency = p.urgency || (p.urgencyScore > 80 ? 'high' : 'medium');
        const pageWeight = p.contentWeightFocus || p.weight || '';
        const pageIntent = p.intent || '';
        return [
          new Paragraph({ text: `${i+1}. ${pageTitle}`, heading: HeadingLevel.HEADING_3 }),
          ...(pageVol ? [new Paragraph({ text: `   Volume: ${pageVol} | Score: ${pageSeo} | Gap: ${pageGap} | Urgency: ${pageUrgency}` })] : []),
          ...(pageWeight ? [new Paragraph({ text: `   Content weight: ${['','light','medium','heavy','heaviest'][pageWeight] || 'light'} | Intent: ${pageIntent}`, spacing: { after: 100 } })] : []),
        ];
      }),

      // Phase 2: Adjacent Attack
      new Paragraph({ text: 'Phase 2: Adjacent Categories', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Mission: Enter product-adjacent categories where the client has genuine products but zero search presence.', spacing: { after: 200 } }),
      ...phase2Pages.flatMap((p, i) => {
        const pageTitle = p.title || `"${p.keyword}"`;
        const pageVol = p.volume || '';
        const pageSeo = p.seoPriority || p.urgencyScore || '';
        const pageGap = typeof p.competitorGap === 'number' ? p.competitorGap?.toFixed(1) : p.competitorGap || '';
        return [
          new Paragraph({ text: `${i+1}. ${pageTitle}`, heading: HeadingLevel.HEADING_3 }),
          ...(pageVol ? [new Paragraph({ text: `   Volume: ${pageVol} | Score: ${pageSeo} | Gap: ${pageGap}` })] : []),
        ];
      }),

      // Phase 3: Authority
      new Paragraph({ text: 'Phase 3: Authority Building', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Mission: Establish the client as the definitive reference for their product categories across the industry.', spacing: { after: 200 } }),
      ...phase3Pages.flatMap((p, i) => {
        const pageTitle = p.title || `"${p.keyword}"`;
        const pageVol = p.volume || '';
        const pageSeo = p.seoPriority || p.urgencyScore || '';
        return [
          new Paragraph({ text: `${i+1}. ${pageTitle}`, heading: HeadingLevel.HEADING_3 }),
          ...(pageVol ? [new Paragraph({ text: `   Volume: ${pageVol} | Score: ${pageSeo}` })] : []),
        ];
      }),

      // Competitive Landscape
      new Paragraph({ text: 'Competitive Landscape', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Key competitors identified from LAYLA analysis: ${context.competitors?.map(c => (c.domain || c.name)).join(', ') || 'Various competitors in the space'}.`, spacing: { after: 200 } }),

      // B2B Vocabulary
      new Paragraph({ text: 'Mandatory B2B Vocabulary', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Every page must weave in these qualifying terms to capture B2B intent: ' + b2bVocab.join(', ') + '.', spacing: { after: 200 } }),

      // Recommendations
      new Paragraph({ text: 'Implementation Recommendations', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '1. Fix cannibalization first — consolidate overlapping URLs targeting the same keywords.' }),
      new Paragraph({ text: '2. Optimize existing ranking pages — prioritize pages with high opportunity scores.' }),
      new Paragraph({ text: '3. Build B2B hub pages — fill content gaps where 3+ competitors rank and the client has no page.' }),
      new Paragraph({ text: '4. Use mandatory B2B vocabulary on every page — trade modifiers qualify traffic for contract/architect audiences.' }),
      new Paragraph({ text: '5. Monitor GPG CPC thresholds — target $0.55 avg CPC, avoid keywords above $0.78 for initial campaigns.' }),
    ]
  }]
});

const buffer = await Packer.toBuffer(doc);
const outPath = SASHA_PATH + '/test-data/sasha-strategy-report.docx';
fs.writeFileSync(outPath, buffer);
console.log(`   ✅ DOCX saved: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB, ${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

// 6. Verify
console.log('\n5. Verification:');
const stats = fs.statSync(outPath);
console.log(`   File size: ${(stats.size / 1024).toFixed(0)} KB`);
console.log(`   Using real DeepSeek plan: ${hasRealPlan ? '✅ YES' : '❌ NO (fallback)'}`);
if (hasRealPlan) {
  console.log(`   Phase 1: ${phaseData.phase1?.title || 'N/A'} — ${phase1Pages.length} pages`);
  console.log(`   Phase 2: ${phaseData.phase2?.title || 'N/A'} — ${phase2Pages.length} pages`);
  console.log(`   Phase 3: ${phaseData.phase3?.title || 'N/A'} — ${phase3Pages.length} pages`);
} else {
  console.log(`   Phases: 3 (Reclaim Core, Adjacent Attack, Authority Building)`);
  console.log(`   Phase 1 pages: ${phase1Pages.length}`);
  console.log(`   Phase 2 pages: ${phase2Pages.length}`);
  console.log(`   Phase 3 pages: ${phase3Pages.length}`);
}
console.log(`   B2B vocab terms: ${b2bVocab.length}`);
console.log(`   Top opportunity: "${topOps[0]?.keyword || 'N/A'}" (${topOps[0]?.volume || 0} vol)`);
console.log('\n✅ Report generation complete');
console.log(`   Open: ${outPath}`);
