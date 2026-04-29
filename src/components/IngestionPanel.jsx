/* SASHA — IngestionPanel
 * File upload and ingestion preview component.
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function IngestionPanel({ onIngest }) {
  const [files, setFiles] = useState({
    codiHandoff: null,
    laylaCsv: null,
    crawlCsv: null,
    meetingNotes: null,
    b2bVocab: null
  });
  const [b2bText, setB2bText] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleFile = useCallback((key) => (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [key]: file }));
    }
  }, []);

  const handleIngest = useCallback(async () => {
    setParsing(true);
    try {
      const sources = {};

      // Read CODI handoff JSON
      if (files.codiHandoff) {
        const text = await files.codiHandoff.text();
        sources.codiHandoff = JSON.parse(text);
      }

      // Read LAYLA CSV
      if (files.laylaCsv) {
        const { readLaylaFile } = await import('../ingestion/LaylaReader.js');
        sources.laylaData = await readLaylaFile(files.laylaCsv);
      }

      // Read crawl CSV
      if (files.crawlCsv) {
        const { readCrawlFile } = await import('../ingestion/CrawlReader.js');
        sources.crawlData = await readCrawlFile(files.crawlCsv);
      }

      // Read meeting notes
      if (files.meetingNotes) {
        sources.meetingNotes = await files.meetingNotes.text();
      }

      // B2B vocabulary (from file or text input)
      if (files.b2bVocab) {
        const text = await files.b2bVocab.text();
        sources.b2bVocab = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      } else if (b2bText.trim()) {
        sources.b2bVocab = b2bText.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      }

      // Build context
      const { buildContext } = await import('../ingestion/ContextBuilder.js');
      const context = buildContext(sources);
      onIngest(context, sources);
    } catch (err) {
      console.error('[IngestionPanel] Error:', err);
      alert('Error ingesting files: ' + err.message);
    } finally {
      setParsing(false);
    }
  }, [files, b2bText, onIngest]);

  const fileCount = Object.values(files).filter(Boolean).length;
  const hasData = fileCount > 0 || b2bText.trim().length > 0;

  return (
    <div className="ingestion-panel">
      <div className="panel-header">
        <Upload size={20} />
        <h2>Data Ingestion</h2>
      </div>

      <div className="file-inputs">
        <FileInput
          label="CODI Handoff (JSON)"
          accept=".json"
          file={files.codiHandoff}
          onChange={handleFile('codiHandoff')}
        />
        <FileInput
          label="LAYLA CSV"
          accept=".csv,.txt"
          file={files.laylaCsv}
          onChange={handleFile('laylaCsv')}
        />
        <FileInput
          label="Website Crawl (CSV)"
          accept=".csv"
          file={files.crawlCsv}
          onChange={handleFile('crawlCsv')}
        />
        <FileInput
          label="Meeting Notes (TXT/PDF)"
          accept=".txt,.pdf,.md"
          file={files.meetingNotes}
          onChange={handleFile('meetingNotes')}
        />
        <FileInput
          label="B2B Vocabulary List (TXT)"
          accept=".txt,.csv"
          file={files.b2bVocab}
          onChange={handleFile('b2bVocab')}
        />
      </div>

      <div className="b2b-input">
        <label>Or paste B2B vocabulary (comma-separated):</label>
        <textarea
          value={b2bText}
          onChange={(e) => setB2bText(e.target.value)}
          placeholder="heavy-duty, commercial-grade, architectural hardware, ..."
          rows={2}
        />
      </div>

      <div className="ingestion-status">
        {fileCount > 0 && (
          <span className="status-badge">
            <CheckCircle size={14} /> {fileCount} file(s) loaded
          </span>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleIngest}
        disabled={!hasData || parsing}
      >
        {parsing ? 'Ingesting...' : 'Build Context'}
      </button>
    </div>
  );
}

function FileInput({ label, accept, file, onChange }) {
  return (
    <div className="file-input-row">
      <label className="file-input-label">
        <FileText size={16} />
        <span>{label}</span>
      </label>
      <div className="file-input-control">
        <input type="file" accept={accept} onChange={onChange} />
        {file && <span className="file-name">{file.name}</span>}
      </div>
    </div>
  );
}
