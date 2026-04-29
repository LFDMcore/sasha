/* SASHA — Main Application
 * Strategic Layer UI with ingestion, planning, and results display.
 */

import React, { useState, useCallback } from 'react';
import { Sparkles, Database, FileSpreadsheet } from 'lucide-react';
import IngestionPanel from './components/IngestionPanel.jsx';
import ResultsView from './components/ResultsView.jsx';
import './App.css';

export default function App() {
  const [context, setContext] = useState(null);
  const [rawSources, setRawSources] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('ingest'); // 'ingest' | 'results'

  const handleIngest = useCallback((ctx, sources) => {
    setContext(ctx);
    setRawSources(sources);
    setActiveView('results');
    setError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!context) return;
    setGenerating(true);
    setError(null);

    try {
      // Run opportunity analysis (pure computation)
      const { analyzeOpportunities } = await import('./planner/OpportunityAnalyzer.js');
      const opportunities = analyzeOpportunities(context);
      console.log(`[SASHA] Opportunities: ${opportunities.totalGap} gaps found across ${opportunities.topics.length} topics`);

      // Generate page architecture plan (LLM-backed)
      const { generateArchitecturePlan } = await import('./planner/PageArchitect.js');
      const architecturePlan = await generateArchitecturePlan(context, opportunities);
      console.log('[SASHA] Architecture plan generated');

      // Generate remaining strategy outputs (stubs)
      const { generateBlogCalendar } = await import('./planner/BlogCalendar.js');
      const blogCalendar = generateBlogCalendar(context, opportunities);

      const { generatePpcStructure } = await import('./planner/PpcStructure.js');
      const ppc = generatePpcStructure(context, opportunities);

      const { generateCompetitiveAttack } = await import('./planner/CompetitiveAttack.js');
      const competitiveAttack = generateCompetitiveAttack(context, opportunities);

      const { generateTimeline } = await import('./planner/TimelineGenerator.js');
      const timeline = generateTimeline(architecturePlan, { startDate: new Date().toISOString().split('T')[0], teamSize: 3 });

      setStrategy({
        architecturePlan,
        blogCalendar,
        ppc,
        competitiveAttack,
        timeline
      });
    } catch (err) {
      console.error('[SASHA] Generation error:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [context]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <Sparkles className="brand-icon" size={24} />
          <h1>SASHA</h1>
          <span className="brand-sub">Strategic Layer</span>
        </div>
        <div className="header-tabs">
          <button
            className={`view-tab ${activeView === 'ingest' ? 'active' : ''}`}
            onClick={() => setActiveView('ingest')}
          >
            <Database size={16} />
            Ingestion
          </button>
          <button
            className={`view-tab ${activeView === 'results' ? 'active' : ''}`}
            onClick={() => setActiveView('results')}
          >
            <FileSpreadsheet size={16} />
            Strategy
          </button>
        </div>
      </header>

      <main className="app-main">
        {activeView === 'ingest' && (
          <div className="view-panel">
            <IngestionPanel onIngest={handleIngest} />

            {context && (
              <div className="context-preview">
                <h3>Context Built</h3>
                <div className="preview-grid">
                  <div className="preview-item">
                    <strong>{context.keywords?.length || 0}</strong>
                    <span>Keywords</span>
                  </div>
                  <div className="preview-item">
                    <strong>{context.competitors?.length || 0}</strong>
                    <span>Competitors</span>
                  </div>
                  <div className="preview-item">
                    <strong>{context.clusters?.length || 0}</strong>
                    <span>Clusters</span>
                  </div>
                  <div className="preview-item">
                    <strong>{context.existingUrls?.length || 0}</strong>
                    <span>Existing URLs</span>
                  </div>
                  <div className="preview-item">
                    <strong>{context.strategicDecisions?.length || 0}</strong>
                    <span>Decisions</span>
                  </div>
                  <div className="preview-item">
                    <strong>{context.b2bVocab?.length || 0}</strong>
                    <span>B2B Terms</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'results' && (
          <div className="view-panel">
            {!context ? (
              <div className="empty-state">
                <p>No data ingested. Go to Ingestion tab to upload files.</p>
                <button className="btn btn-primary" onClick={() => setActiveView('ingest')}>
                  Go to Ingestion
                </button>
              </div>
            ) : (
              <>
                <div className="generate-bar">
                  <button
                    className="btn btn-primary btn-generate"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? 'Generating Strategic Plan...' : 'Generate Page Architecture Plan'}
                  </button>
                  {error && <div className="error-msg">Error: {error}</div>}
                </div>
                <ResultsView strategy={strategy} context={context} />
              </>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>SASHA v1.0 — Built for LFDM</span>
        <span className="footer-model">DeepSeek v4 Flash via OpenRouter</span>
      </footer>
    </div>
  );
}
