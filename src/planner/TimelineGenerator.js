/* SASHA — TimelineGenerator
 * Generates project workstreams and timeline from the architecture plan.
 *
 * Stub returning structured data.
 */

/**
 * Generate timeline and workstreams.
 *
 * @param {Object} architecturePlan — Output of PageArchitect.generateArchitecturePlan()
 * @param {Object} options          — { startDate, teamSize }
 * @returns {Object} timeline
 */
export function generateTimeline(architecturePlan = {}, options = {}) {
  const { startDate = new Date().toISOString().split('T')[0], teamSize = 3 } = options;

  const phases = architecturePlan.phases || {};
  const allPages = [
    ...((phases.phase1?.pages) || []),
    ...((phases.phase2?.pages) || []),
    ...((phases.phase3?.pages) || [])
  ];

  const workstreams = [
    {
      id: 'ws-content',
      name: 'Content Production',
      pages: allPages.map((p) => ({
        title: p.title,
        estimatedWords: p.contentWeightFocus >= 3 ? 2500 : 1500,
        assignee: '',
        status: 'backlog'
      })),
      totalEstimatedHours: allPages.length * 16
    },
    {
      id: 'ws-design',
      name: 'Design & UX',
      pages: allPages.map((p) => ({
        title: p.title,
        estimatedHours: 8,
        status: 'backlog'
      })),
      totalEstimatedHours: allPages.length * 8
    },
    {
      id: 'ws-tech',
      name: 'Technical Implementation',
      tasks: [
        { name: 'Set up page templates', hours: 16, status: 'backlog' },
        { name: 'Implement schema markup', hours: 12, status: 'backlog' },
        { name: 'Configure redirects', hours: 4, status: 'backlog' },
        { name: 'Internal linking structure', hours: 8, status: 'backlog' }
      ],
      totalEstimatedHours: 40
    },
    {
      id: 'ws-review',
      name: 'Review & QA',
      tasks: [
        { name: 'SEO review', hours: allPages.length * 2, status: 'backlog' },
        { name: 'Fact-checking', hours: allPages.length * 1, status: 'backlog' },
        { name: 'Final approval', hours: 4, status: 'backlog' }
      ],
      totalEstimatedHours: allPages.length * 3 + 4
    }
  ];

  const totalHours = workstreams.reduce((s, ws) => s + ws.totalEstimatedHours, 0);
  const estimatedWeeks = Math.ceil(totalHours / (teamSize * 40));

  return {
    startDate,
    teamSize,
    estimatedWeeks,
    estimatedEndDate: addWeeks(startDate, estimatedWeeks),
    totalEstimatedHours,
    workstreams,
    phaseMilestones: [
      {
        phase: 'Phase 1: Core Reclamation',
        targetDate: addWeeks(startDate, Math.ceil(estimatedWeeks * 0.3)),
        pages: (phases.phase1?.pages || []).length
      },
      {
        phase: 'Phase 2: Adjacent Hardware Attack',
        targetDate: addWeeks(startDate, Math.ceil(estimatedWeeks * 0.6)),
        pages: (phases.phase2?.pages || []).length
      },
      {
        phase: 'Phase 3: Authority Building',
        targetDate: addWeeks(startDate, estimatedWeeks),
        pages: (phases.phase3?.pages || []).length
      }
    ]
  };
}

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + (weeks * 7));
  return d.toISOString().split('T')[0];
}
