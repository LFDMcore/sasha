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
const handoff = JSON.parse(fs.readFileSync(SASHA_PATH + '/test-data/handoff.json', 'utf-8'));
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

const b2bVocab = ['high end', 'premium', 'luxury', 'architectural', 'heavy duty',
  'commercial', 'commercial grade', 'contractor', 'specifier', 'trade',
  'wholesale', 'OEM', 'distributor', 'dealer', 'spec sheet', 'cut sheet',
  'installer', 'rough opening', 'fire rated', 'ADA', 'soft close', 'automatic'];

const context = buildContext({
  codiHandoff: handoff,
  laylaData: laylaData,
  meetingNotes: meetingNotes,
  b2bVocab: b2bVocab,
  crawlData: null
});

// 3. Analyze
console.log('2. Analyzing opportunities...');
const EXCLUDED = ['cabinet hardware', 'cabinet hinge', 'cabinet door', 'cabinet pull',
  'cabinet knob', 'drawer slide', 'drawer pull', 'drawer glide', 'shelf bracket',
  'shelf standard', 'shelf pin', 'closet pole', 'closet rod', 'closet organizer',
  'barn door', 'barn door hardware', 'barn door kit', 'shower door', 'garage door',
  'screen door', 'window hardware', 'wire shelving', 'glass shelf', 'glass shelving',
  'magic corner', 'blind corner', 'lazy susan', 'led tape light', 'vending machine',
  'outdoor tv', 'tv lift', 'tv cabinet', 'coat hook', 'coat rack',
  'gate hardware', 'sliding gate', 'folding door',
  'door hinges', 'door closer', 'storm door'];

const opps = analyzeOpportunities(context, { excludePatterns: EXCLUDED });
const topOps = opps.opportunities.filter(o => !o.coveredByClient).slice(0, 30);

// 4. Generate architecture plan (fallback if no API key)
console.log('3. Generating architecture plan...');
const apiKey = process.env.VITE_OPENROUTER_KEY || '';
const arch = apiKey
  ? await generateArchitecturePlan(context, topOps, { apiKey })
  : { phases: {}, summary: {}, recommendations: [] };
console.log(`   Plan generated (${Object.keys(arch.phases || {}).length} phases)`);

// 5. Build DOCX
console.log('4. Building DOCX document...');

// Phase data from analysis
const phase1Pages = topOps.filter(o => o.urgency === 'critical' || (o.urgency === 'high' && o.weight >= 3)).slice(0, 5);
const phase2Pages = topOps.filter(o => o.urgency === 'high' && o.weight >= 2).slice(0, 5);
const phase3Pages = topOps.filter(o => o.urgency === 'medium').slice(0, 5);

const doc = new Document({
  title: 'SASHA Strategy Report — Cavity Sliders',
  description: 'Strategic Content Opportunity & 12-Month Plan',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    children: [
      // Title page
      new Paragraph({ text: 'SASHA — Strategic Architecture Plan', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: 'Cavity Sliders', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
      new Paragraph({ text: `Generated: ${new Date().toISOString().split('T')[0]} | OEM / Distributor Edition`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

      // Executive Summary
      new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        text: `Derived from CODI v4 pipeline export — ${opps.totalKeywords} keywords analyzed, ${opps.topics.length} topics identified. Total unmet opportunity gap: ${opps.totalGap} keywords. Cavity Sliders is massively under-indexed in the US pocket door category (356K monthly searches, ~11% capture). This plan follows the 4-weight content framework focusing on B2B-first content for contractors, architects, specifiers, and dealers.`,
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
      new Paragraph({ text: 'Phase 1: Reclaim Pocket-Door Core (B2B First)', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Mission: Stop losing the category that bears CS\'s flagship product\'s name in the US — with content built for contractors, architects and dealers, not homeowners.', spacing: { after: 200 } }),
      new Paragraph({ text: 'Key pages to build:', heading: HeadingLevel.HEADING_2 }),
      ...phase1Pages.flatMap((p, i) => [
        new Paragraph({ text: `${i+1}. "${p.keyword}"`, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: `   Volume: ${p.volume} | SEO Score: ${p.seoPriority} | Gap: ${p.competitorGap?.toFixed(1)} | Urgency: ${p.urgency}` }),
        new Paragraph({ text: `   Content weight: ${['','light','medium','heavy','heaviest'][p.weight] || 'light'} | Intent: ${p.intent}`, spacing: { after: 100 } }),
      ]),

      // Phase 2: Adjacent Attack
      new Paragraph({ text: 'Phase 2: Adjacent Hardware Attack', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Mission: Enter product-adjacent categories where CS has genuine products but zero search presence.', spacing: { after: 200 } }),
      ...phase2Pages.flatMap((p, i) => [
        new Paragraph({ text: `${i+1}. "${p.keyword}"`, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: `   Volume: ${p.volume} | SEO Score: ${p.seoPriority} | Gap: ${p.competitorGap?.toFixed(1)}` }),
      ]),

      // Phase 3: Authority
      new Paragraph({ text: 'Phase 3: Authority Building', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Mission: Establish CS as the definitive reference for pocket door and cavity slider systems across the architectural hardware industry.', spacing: { after: 200 } }),
      ...phase3Pages.flatMap((p, i) => [
        new Paragraph({ text: `${i+1}. "${p.keyword}"`, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: `   Volume: ${p.volume} | SEO Score: ${p.seoPriority}` }),
      ]),

      // Competitive Landscape
      new Paragraph({ text: 'Competitive Landscape', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Key competitors identified from LAYLA analysis: Pocket Door Superstore (19K monthly traffic, dominant in pocket door category), Hafele (55K, covers product-adjacent categories), Johnson Hardware (17.5K, pocket door frames), Sugatsune (29K, specialty hardware), Eclisse (2.8K, European cavity slider systems). CS dominates the branded "Cavity Slider" cluster (87% share, 2,310 monthly searches) but is nearly invisible in the 356K-volume US pocket door search landscape.', spacing: { after: 200 } }),

      // B2B Vocabulary
      new Paragraph({ text: 'Mandatory B2B Vocabulary', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: 'Every page must weave in these qualifying terms to capture B2B intent: ' + b2bVocab.join(', ') + '.', spacing: { after: 200 } }),

      // Recommendations
      new Paragraph({ text: 'Implementation Recommendations', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: '1. Fix cannibalization first — 24+ client URLs competing for pocket door keywords, consolidate canonicals.' }),
      new Paragraph({ text: '2. Optimize existing ranking pages — 674 "Optimize" actions tagged, prioritize pocket-door subset.' }),
      new Paragraph({ text: '3. Build B2B hub pages — missing content gaps where 3+ competitors rank and CS has no page.' }),
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
console.log(`   Phases: 3 (Reclaim Core, Adjacent Attack, Authority Building)`);
console.log(`   Phase 1 pages: ${phase1Pages.length}`);
console.log(`   Phase 2 pages: ${phase2Pages.length}`);
console.log(`   Phase 3 pages: ${phase3Pages.length}`);
console.log(`   B2B vocab terms: ${b2bVocab.length}`);
console.log(`   Top opportunity: "${topOps[0]?.keyword || 'N/A'}" (${topOps[0]?.volume || 0} vol)`);
console.log('\n✅ Report generation complete');
console.log(`   Open: ${outPath}`);
