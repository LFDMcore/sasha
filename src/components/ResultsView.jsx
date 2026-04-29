/* SASHA — ResultsView
 * Main results display with tabs for different strategy outputs.
 */

import React, { useState } from 'react';
import { BarChart3, Calendar, Megaphone, FileSpreadsheet, Timer } from 'lucide-react';
import PageArchitectureTab from './PageArchitectureTab.jsx';
import ExportBar from './ExportBar.jsx';

const TABS = [
  { id: 'architecture', label: 'Page Architecture', icon: BarChart3 },
  { id: 'blog', label: 'Blog Calendar', icon: Calendar },
  { id: 'ppc', label: 'PPC Structure', icon: Megaphone },
  { id: 'competitive', label: 'Competitive Attack', icon: Timer },
  { id: 'timeline', label: 'Timeline', icon: Timer }
];

export default function ResultsView({ strategy, context }) {
  const [activeTab, setActiveTab] = useState('architecture');

  if (!strategy) {
    return (
      <div className="results-view empty">
        <div className="empty-state">
          <FileSpreadsheet size={48} />
          <h3>No Strategy Generated Yet</h3>
          <p>Upload data sources and generate a plan to see results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-view">
      <div className="results-header">
        <h2>Strategic Plan Outputs</h2>
        <ExportBar strategy={strategy} context={context} />
      </div>

      <div className="results-tabs">
        {TABS.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="tab-content">
        {activeTab === 'architecture' && (
          <PageArchitectureTab architecturePlan={strategy.architecturePlan} />
        )}
        {activeTab === 'blog' && (
          <BlogCalendarTab blogCalendar={strategy.blogCalendar} />
        )}
        {activeTab === 'ppc' && (
          <PpcTab ppcStructure={strategy.ppc} />
        )}
        {activeTab === 'competitive' && (
          <CompetitiveTab competitiveAttack={strategy.competitiveAttack} />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab timeline={strategy.timeline} context={context} />
        )}
      </div>
    </div>
  );
}

function BlogCalendarTab({ blogCalendar }) {
  if (!blogCalendar?.posts) return <EmptyTab />;
  return (
    <div className="tab-panel">
      <h3>Blog Content Calendar</h3>
      <p className="tab-subtitle">Weekly cadence — {blogCalendar.totalPosts} posts planned</p>
      <div className="post-list">
        {blogCalendar.posts.map((post, i) => (
          <div key={i} className="post-item">
            <span className="post-week">Week {post.week}</span>
            <div className="post-details">
              <strong>{post.suggestedTitle}</strong>
              <span className="post-date">{post.publishingDate}</span>
              {post.keywordTargets?.length > 0 && (
                <span className="post-kw">{post.keywordTargets.join(', ')}</span>
              )}
            </div>
            <span className={`post-status status-${post.status}`}>{post.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PpcTab({ ppcStructure }) {
  if (!ppcStructure?.campaigns) return <EmptyTab />;
  return (
    <div className="tab-panel">
      <h3>PPC Campaign Structure</h3>
      <p className="tab-subtitle">Budget: ${ppcStructure.totalMonthlyBudget?.toLocaleString()}/mo</p>
      {ppcStructure.campaigns.map((camp, i) => (
        <div key={i} className="campaign-card">
          <h4>{camp.campaignName}</h4>
          <p>Budget: ${camp.budget}/mo | Target CPA: ${camp.targetCpa}</p>
          <div className="adgroup-list">
            {camp.adGroups?.map((ag, j) => (
              <div key={j} className="adgroup-item">
                <span>{ag.name}</span>
                <span className="match-types">{ag.matchTypes.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompetitiveTab({ competitiveAttack }) {
  if (!competitiveAttack?.phaseStrategy) return <EmptyTab />;
  return (
    <div className="tab-panel">
      <h3>Competitive Attack Plan</h3>
      {Object.entries(competitiveAttack.phaseStrategy).map(([key, phase]) => (
        <div key={key} className="phase-strategy-card">
          <h4>{phase.name}</h4>
          <p>{phase.strategy}</p>
          <ul className="kpi-list">
            {phase.kpis?.map((kpi, i) => <li key={i}>{kpi}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ timeline }) {
  if (!timeline?.workstreams) return <EmptyTab />;
  return (
    <div className="tab-panel">
      <h3>Project Timeline</h3>
      <p className="tab-subtitle">
        {timeline.estimatedWeeks} weeks · Team of {timeline.teamSize} ·
        {timeline.totalEstimatedHours} total hours
      </p>
      {timeline.workstreams.map((ws, i) => (
        <div key={i} className="workstream-card">
          <div className="ws-header">
            <h4>{ws.name}</h4>
            <span className="ws-hours">{ws.totalEstimatedHours}h</span>
          </div>
          {ws.pages?.map((p, j) => (
            <div key={j} className="ws-item">
              <span>{p.title}</span>
              <span className="ws-est">{p.estimatedWords ? `${p.estimatedWords} words` : `${p.estimatedHours}h`}</span>
            </div>
          ))}
          {ws.tasks?.map((t, j) => (
            <div key={j} className="ws-item">
              <span>{t.name}</span>
              <span className="ws-est">{t.hours}h</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyTab() {
  return (
    <div className="empty-state">
      <p>No data available for this section. Generate a plan first.</p>
    </div>
  );
}
