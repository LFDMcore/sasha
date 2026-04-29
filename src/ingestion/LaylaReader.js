/* SASHA — LaylaReader
 * Parses the LAYLA CSV export format.
 *
 * Expected format:
 *   DATE OF PULL: [date]
 *   [empty line]
 *   Client
 *   [client name], DR [number], Visibility [number]
 *   [empty line]
 *   Competitors Provided
 *   domain1.com
 *   domain2.com
 *   [empty line]
 *   Competitors Found
 *   domain3.com, DR [number], Visibility [number]
 *   [empty line]
 *   Potential Partners
 *   ...
 *
 * Returns: { client, competitors, pullDate, traffic }
 */

/**
 * Parse raw LAYLA CSV text into structured data.
 * @param {string} rawText
 * @returns {Object}
 */
export function parseLaylaCsv(rawText) {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const result = {
    pullDate: '',
    client: { name: '', dr: 0, visibility: 0 },
    competitors: [],      // { domain, dr, visibility }
    competitorsProvided: [],
    potentialPartners: [],
    raw: rawText
  };

  let section = null;

  for (const line of lines) {
    // Detect DATE OF PULL
    if (line.startsWith('DATE OF PULL:')) {
      result.pullDate = line.replace('DATE OF PULL:', '').trim();
      continue;
    }

    // Detect sections (exact match)
    if (line === 'Client') { section = 'client'; continue; }
    if (line === 'Competitors Provided') { section = 'competitorsProvided'; continue; }
    if (line === 'Competitors Found') { section = 'competitors'; continue; }
    if (line === 'Potential Partners') { section = 'potentialPartners'; continue; }

    // Parse based on section
    if (section === 'client') {
      const parsed = parseDomainLine(line);
      if (parsed) {
        result.client = parsed;
      }
    } else if (section === 'competitors') {
      const parsed = parseDomainLine(line);
      if (parsed) {
        result.competitors.push(parsed);
      }
    } else if (section === 'competitorsProvided') {
      // Just domain names, no metrics
      const domain = line.replace(/,.*$/, '').trim();
      if (domain) {
        result.competitorsProvided.push({ domain });
      }
    } else if (section === 'potentialPartners') {
      const parsed = parseDomainLine(line);
      if (parsed) {
        result.potentialPartners.push(parsed);
      }
    }
  }

  return result;
}

/**
 * Parse a line like "domain.com, DR 45, Visibility 12.3K"
 * or "domain.com, DR 45, 12.3K"
 */
function parseDomainLine(line) {
  const parts = line.split(',').map((p) => p.trim());
  if (parts.length === 0) return null;

  const domain = parts[0].replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  if (!domain || domain.includes(' ')) return null;

  let dr = 0;
  let visibility = 0;

  for (const part of parts.slice(1)) {
    const drMatch = part.match(/DR\s*(\d+)/i);
    if (drMatch) {
      dr = parseInt(drMatch[1], 10);
      continue;
    }
    const visMatch = part.match(/Visibility\s*([\d.]+)(K|k)?/);
    if (visMatch) {
      let val = parseFloat(visMatch[1]);
      if (visMatch[2]?.toUpperCase() === 'K') val *= 1000;
      visibility = val;
      continue;
    }
    // Bare number might be visibility
    const numMatch = part.match(/^([\d.]+)(K|k)?$/);
    if (numMatch && visibility === 0) {
      let val = parseFloat(numMatch[1]);
      if (numMatch[2]?.toUpperCase() === 'K') val *= 1000;
      visibility = val;
    }
  }

  return { domain, dr, visibility };
}

/**
 * Parse a raw file upload (File object) into LAYLA data.
 * @param {File} file
 * @returns {Promise<Object>}
 */
export async function readLaylaFile(file) {
  const text = await file.text();
  return parseLaylaCsv(text);
}
