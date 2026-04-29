/* SASHA — PageArchitectureTab
 * Tab view for Phase 1/2/3 page architecture results.
 */

import React, { useState } from 'react';
import { Layers, ArrowRight, Clock, Target, BookOpen } from 'lucide-react';

const PHASE_ICONS = {
  phase1: { icon: Target, color: '#ef4444' },
  phase2: { icon: ArrowRight, color: '#f59e0b' },
  phase3: { icon: BookOpen, color: '#3b82f6' }
};

export default function PageArchitectureTab({ architecturePlan }) {
  const [activePhase, setActivePhase] = useState('phase1');

  if (!architecturePlan || !architecturePlan.phases) {
    return (
      <div className="empty-state">
        <Layers size={40} />
        <p>Generate a page architecture plan to see results here.</p>
      </div>
    );
  }

  const phases = architecturePlan.phases;
  const summary = architecturePlan.summary || {};
  const phaseKeys = Object.keys(phases);

  return (
    <div className="page-architecture">
      <div className="summary-row">
        <div className="summary-card">
          <strong>{summary.totalNewPages || 0}</strong>
          <span>Total Pages</span>
        </div>
        <div className="summary-card">
          <strong>{summary.estimatedTimeframeWeeks || 0}w</strong>
          <span>Timeframe</span>
        </div>
        <div className="summary-card highlight">
          <strong>{summary.primaryFocus || 'Strategic plan'}</strong>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="phase-tabs">
        {phaseKeys.map((key) => {
          const phase = phases[key];
          const icon = PHASE_ICONS[key]?.icon || Layers;
          const IconComponent = icon;
          return (
            <button
              key={key}
              className={`phase-tab ${activePhase === key ? 'active' : ''}`}
              onClick={() => setActivePhase(key)}
            >
              <IconComponent size={16} />
              <span>{phase.title || key}</span>
              <span className="page-count">{phase.pages?.length || 0} pages</span>
            </button>
          );
        })}
      </div>

      {/* Active phase content */}
      <div className="phase-content">
        {phaseKeys.filter((k) => k === activePhase).map((key) => {
          const phase = phases[key];
          return (
            <div key={key} className="phase-detail">
              <p className="phase-description">{phase.description}</p>
              <div className="page-cards">
                {(phase.pages || []).map((page, idx) => (
                  <PageCard key={idx} page={page} idx={idx} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageCard({ page, idx }) {
  const urgencyColors = {
    95: '#ef4444', 90: '#ef4444', 85: '#f97316', 80: '#f97316',
    75: '#f59e0b', 70: '#f59e0b', 65: '#22c55e', 60: '#22c55e',
    default: '#6b7280'
  };
  const color = urgencyColors[page.urgencyScore] || urgencyColors.default;

  return (
    <div className="page-card">
      <div className="page-card-header">
        <span className="page-index">#{idx + 1}</span>
        <h4>{page.title}</h4>
        <span className="urgency-badge" style={{ backgroundColor: color }}>
          U:{page.urgencyScore}
        </span>
      </div>

      <div className="page-card-body">
        {page.urlSlug && (
          <div className="detail-row">
            <span className="label">URL:</span>
            <span className="value slug">/{page.urlSlug}</span>
          </div>
        )}
        {page.keywordTargets && page.keywordTargets.length > 0 && (
          <div className="detail-row">
            <span className="label">Keywords:</span>
            <span className="value">{page.keywordTargets.join(', ')}</span>
          </div>
        )}
        {page.competitorGap && (
          <div className="detail-row">
            <span className="label">Gap:</span>
            <span className="value">{page.competitorGap}</span>
          </div>
        )}
        <div className="detail-row meta">
          <span>Weight: {page.contentWeightFocus}/4</span>
          <span>Intent: {page.intent}</span>
          <span>Type: {page.pageType}</span>
        </div>
        {page.reasoning && (
          <div className="reasoning">
            <span className="label">Why:</span>
            <p>{page.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}
