/* SASHA — StrategyDocx
 * DOCX generator using the docx npm package.
 * Produces a formatted strategy document from the architecture plan.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Generate and download a DOCX strategy document.
 *
 * @param {Object} strategy — Combined strategy data
 * @param {Object} strategy.architecturePlan — From PageArchitect
 * @param {Object} strategy.timeline         — From TimelineGenerator
 * @param {Object} strategy.competitiveAttack — From CompetitiveAttack
 * @param {Object} strategy.ppc              — From PpcStructure
 * @param {Object} strategy.blogCalendar     — From BlogCalendar
 * @param {Object} context                   — From ContextBuilder
 */
export async function downloadStrategyDocx(strategy, context) {
  const {
    architecturePlan = {},
    timeline = {},
    competitiveAttack = {},
    ppc = {},
    blogCalendar = {}
  } = strategy;

  const phases = architecturePlan.phases || {};
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: 'SASHA — Strategic Architecture Plan',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      text: `Generated: ${now}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: `Client: ${context?.clientInfo?.name || 'Cavi Architectural Hardware'}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // Summary section
  children.push(
    new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      text: architecturePlan.summary?.primaryFocus || 'Strategic plan for architectural hardware market.',
      spacing: { after: 200 }
    })
  );

  // Phase details
  for (const [phaseKey, phase] of Object.entries(phases)) {
    const phaseLabel = phase.title || phaseKey;
    children.push(
      new Paragraph({ text: phaseLabel, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: phase.description || '', spacing: { after: 200 } })
    );

    for (const page of (phase.pages || [])) {
      children.push(
        new Paragraph({
          text: page.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'URL: ', bold: true }),
            new TextRun(page.urlSlug || '')
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Keywords: ', bold: true }),
            new TextRun((page.keywordTargets || []).join(', '))
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Urgency: ', bold: true }),
            new TextRun(`Score ${page.urgencyScore} — ${page.competitorGap || ''}`)
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Reasoning: ', bold: true }),
            new TextRun(page.reasoning || '')
          ]
        }),
        new Paragraph({ spacing: { after: 100 } })
      );
    }
  }

  // Timeline section
  if (timeline.workstreams) {
    children.push(
      new Paragraph({ text: 'Project Timeline', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        text: `Estimated duration: ${timeline.estimatedWeeks} weeks (${timeline.estimatedEndDate})`,
        spacing: { after: 200 }
      })
    );

    for (const ws of timeline.workstreams) {
      children.push(
        new Paragraph({ text: ws.name, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          text: `Estimated hours: ${ws.totalEstimatedHours}`,
          spacing: { after: 100 }
        })
      );
    }
  }

  // PPC section
  if (ppc.campaigns) {
    children.push(
      new Paragraph({ text: 'PPC Structure', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        text: `Total monthly budget: $${ppc.totalMonthlyBudget?.toLocaleString() || '0'}`,
        spacing: { after: 200 }
      })
    );
  }

  // Blog calendar
  if (blogCalendar.posts) {
    children.push(
      new Paragraph({ text: 'Blog Content Calendar', heading: HeadingLevel.HEADING_1 }),
      ...blogCalendar.posts.slice(0, 12).map((post) =>
        new Paragraph({
          text: `Week ${post.week}: ${post.suggestedTitle} (${post.publishingDate})`,
          spacing: { after: 100 }
        })
      )
    );
  }

  // Build document
  const doc = new Document({
    title: 'SASHA Strategy Document',
    description: 'Strategic Architecture Plan for SASHA',
    sections: [{ children }]
  });

  // Generate blob and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `SASHA_Strategy_Plan_${new Date().toISOString().split('T')[0]}.docx`);
}

/**
 * Generate and download an XLSX strategy export.
 */
import * as XLSX from 'xlsx';

export function downloadStrategyXlsx(strategy) {
  const workbook = XLSX.utils.book_new();
  const { architecturePlan = {} } = strategy;
  const phases = architecturePlan.phases || {};

  // Pages sheet
  const allPages = [];
  for (const [phaseKey, phase] of Object.entries(phases)) {
    for (const page of (phase.pages || [])) {
      allPages.push({
        Phase: phase.title || phaseKey,
        Title: page.title,
        URL: page.urlSlug || '',
        Keywords: (page.keywordTargets || []).join(', '),
        Urgency: page.urgencyScore || 0,
        'Competitor Gap': page.competitorGap || '',
        Weight: page.contentWeightFocus || 0,
        Intent: page.intent || '',
        'Page Type': page.pageType || '',
        Reasoning: page.reasoning || ''
      });
    }
  }

  const pageSheet = XLSX.utils.json_to_sheet(allPages);
  XLSX.utils.book_append_sheet(workbook, pageSheet, 'Page Architecture');

  // Summary sheet
  const summaryData = [{
    Metric: 'Total New Pages',
    Value: architecturePlan.summary?.totalNewPages || 0
  }, {
    Metric: 'Estimated Timeframe (weeks)',
    Value: architecturePlan.summary?.estimatedTimeframeWeeks || 0
  }, {
    Metric: 'Primary Focus',
    Value: architecturePlan.summary?.primaryFocus || ''
  }];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Export
  XLSX.writeFile(workbook, `SASHA_Strategy_${new Date().toISOString().split('T')[0]}.xlsx`);
}
