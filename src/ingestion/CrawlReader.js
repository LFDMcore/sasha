/* SASHA — CrawlReader
 * Reads website crawl CSV (from Screaming Frog or similar).
 *
 * Expected columns: URL, Title, H1, Meta Description, Word Count, Canonical
 *
 * Returns: { crawledUrls, existingPages }
 */

/**
 * Parse raw crawl CSV text into structured data.
 * @param {string} rawText
 * @returns {Object}
 */
export function parseCrawlCsv(rawText) {
  const lines = rawText.split(/\r?\n/);
  if (lines.length === 0) return { crawledUrls: [], existingPages: [] };

  // Parse header row — find column indices
  const headerCells = parseCsvLine(lines[0]);
  const colIndex = {
    url: findCol(headerCells, 'url', 'address'),
    title: findCol(headerCells, 'title'),
    h1: findCol(headerCells, 'h1'),
    metaDesc: findCol(headerCells, 'meta description', 'description', 'meta desc'),
    wordCount: findCol(headerCells, 'word count', 'words', 'length'),
    canonical: findCol(headerCells, 'canonical')
  };

  const pages = [];

  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const cells = parseCsvLine(trimmed);
    const url = colIndex.url >= 0 ? cells[colIndex.url]?.trim() : '';

    if (!url || url.startsWith('#')) continue;

    const page = {
      url,
      title: colIndex.title >= 0 ? cells[colIndex.title]?.trim() || '' : '',
      h1: colIndex.h1 >= 0 ? cells[colIndex.h1]?.trim() || '' : '',
      metaDescription: colIndex.metaDesc >= 0 ? cells[colIndex.metaDesc]?.trim() || '' : '',
      wordCount: colIndex.wordCount >= 0 ? parseInt(cells[colIndex.wordCount]?.replace(/[^0-9]/g, '') || '0', 10) : 0,
      canonical: colIndex.canonical >= 0 ? cells[colIndex.canonical]?.trim() || '' : ''
    };

    pages.push(page);
  }

  return {
    crawledUrls: pages.map((p) => p.url),
    existingPages: pages
  };
}

/**
 * Simple CSV line splitter that handles quoted commas.
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Find column index by checking aliases.
 */
function findCol(headers, ...aliases) {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lowerHeaders.indexOf(alias.toLowerCase());
    if (idx >= 0) return idx;
  }
  // Try partial match
  for (const alias of aliases) {
    const lower = alias.toLowerCase();
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (lowerHeaders[i].includes(lower)) return i;
    }
  }
  return -1;
}

/**
 * Read crawl file from File upload.
 * @param {File} file
 * @returns {Promise<Object>}
 */
export async function readCrawlFile(file) {
  const text = await file.text();
  return parseCrawlCsv(text);
}
