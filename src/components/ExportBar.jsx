/* SASHA — ExportBar
 * Export buttons for XLSX, DOCX strategy documents.
 */

import React from 'react';
import { FileDown, FileText } from 'lucide-react';

export default function ExportBar({ strategy, context }) {
  if (!strategy) return null;

  const handleDocx = async () => {
    try {
      const { downloadStrategyDocx } = await import('../planner/StrategyDocx.js');
      await downloadStrategyDocx(strategy, context || {});
    } catch (err) {
      console.error('[ExportBar] DOCX export error:', err);
      alert('Error exporting DOCX: ' + err.message);
    }
  };

  const handleXlsx = async () => {
    try {
      const { downloadStrategyXlsx } = await import('../planner/StrategyDocx.js');
      downloadStrategyXlsx(strategy);
    } catch (err) {
      console.error('[ExportBar] XLSX export error:', err);
      alert('Error exporting XLSX: ' + err.message);
    }
  };

  return (
    <div className="export-bar">
      <button className="btn btn-export" onClick={handleDocx}>
        <FileText size={16} />
        Export DOCX
      </button>
      <button className="btn btn-export" onClick={handleXlsx}>
        <FileDown size={16} />
        Export XLSX
      </button>
    </div>
  );
}
