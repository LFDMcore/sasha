# SASHA Google Docs & Sheets Template Engine — Implementation Plan
> **Date:** 2026-04-29
> **Auditor:** Hermes Agent (DeepSeek v4 Flash)
> **Context:** SASHA currently generates DOCX+XLSX downloads. Need to extend to Google Docs/Sheets.

---

## Current State

```
SASHA App (React/Vite)
├── src/
│   ├── google/                     ← EMPTY — needs creation
│   ├── planner/
│   │   ├── StrategyDocx.js         ✅ DOCX download
│   │   ├── PageArchitect.js        ✅ DeepSeek plan
│   │   ├── OpportunityAnalyzer.js  ✅ Scoring
│   │   ├── BlogCalendar.js         ✅ Stub
│   │   ├── PpcStructure.js         ✅ Stub
│   │   ├── CompetitiveAttack.js    ✅ Stub
│   │   └── TimelineGenerator.js    ✅ Stub
│   ├── components/
│   │   ├── ExportBar.jsx           ✅ DOCX + XLSX buttons
│   │   └── DeliverToClientButton.jsx ← NEEDS CREATE
│   └── core/
│       └── DeepSeekClient.js       ✅ API client with retry
│
├── test-data/
│   └── handoff.json                ✅ 26K Cavity Sliders keywords
│
└── package.json                    Needs googleapis added
```

### Data Available for Templates

From `ContextBuilder.buildContext()`:
- `clientInfo` — { name, domain, dr, visibility }
- `competitors` — [{ domain, dr, visibility }]
- `keywords` — 26K enriched keywords with weight, intent, GPG, priority
- `clusters` — cluster definitions with member keywords
- `weightDistribution` — { 1: N, 2: N, 3: N, 4: N }
- `intentCorrections` — { keyword: correctedIntent }
- `b2bVocab` — [strings]
- `strategicDecisions` — from meeting notes parsing
- `excludePatterns` — negative keywords + strategic exclusions
- `productNames` — auto-extracted from client context
- `handoffConfig` — raw CODI config

From `Strategy`:
- `architecturePlan` — phased pages with urgency, keywords, weights
- `blogCalendar` — weekly post schedule
- `ppc` — campaign + ad group structure
- `competitiveAttack` — per-competitor strategy
- `timeline` — workstreams, hours, milestones

---

## Architecture

```
User clicks "Deliver to Client"
         │
         ▼
DeliverToClientButton
         │
         ├── GoogleAuthService.authenticate()
         │       └── Uses google_credentials.json (or environment variable path)
         │
         ├── GoogleDocsTemplateEngine.buildBluePrint(context, strategy)
         │       └── Creates Google Doc with:
         │           ├── Title (Barlow Condensed, sage accent)
         │           ├── Executive Summary
         │           ├── Opportunity Summary (table)
         │           ├── Phased Plan (3 phases with page details)
         │           ├── Competitive Landscape (table)
         │           ├── B2B Vocabulary (bullet list)
         │           └── MAC Analysis (table)
         │
         ├── GoogleDocsTemplateEngine.buildAudit(context, strategy)
         │       └── Creates Google Doc with:
         │           ├── Run Metadata
         │           ├── Intent Corrections
         │           ├── Weight Distribution
         │           ├── Competitor Rankings
         │           └── CPC / GPG Analysis
         │
         ├── GoogleDocsTemplateEngine.buildInitialPlan(strategy)
         │       └── Creates Google Doc with:
         │           ├── 3-Phase Architecture Plan
         │           ├── Blog Calendar (first 12 weeks)
         │           ├── PPC Structure
         │           ├── Competitive Attack
         │           └── Timeline
         │
         ├── GoogleSheetsTemplateEngine.buildAllTabs(context, strategy)
         │       └── Creates Google Sheet with 6 tabs (see below)
         │
         └── GoogleDriveService.uploadAll(docs, sheet)
                 └── Sets permissions, returns links
```

---

## Module Specifications

### 1. GoogleAuthService.js

```javascript
import { google } from 'googleapis';

export class GoogleAuthService {
  constructor(options = {}) {
    this.credentialsPath = options.credentialsPath 
      || process.env.GOOGLE_CREDENTIALS_PATH 
      || '/home/lfdm/sassy-factory/google_credentials.json';
    this.impersonateUser = options.impersonateUser || 'core@lfdm.co';
    this.auth = null;
  }

  async authenticate() {
    const { JWT } = require('google-auth-library');
    const keys = require(this.credentialsPath);
    this.auth = new JWT({
      email: keys.client_email,
      key: keys.private_key,
      subject: this.impersonateUser,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    await this.auth.authorize();
    return this.auth;
  }

  getDocsClient() { return google.docs({ version: 'v1', auth: this.auth }); }
  getSheetsClient() { return google.sheets({ version: 'v4', auth: this.auth }); }
  getDriveClient() { return google.drive({ version: 'v3', auth: this.auth }); }
}
```

**Verification:** Creates auth, calls docs.documents.create, gets back document ID.

---

### 2. GoogleDocsTemplateEngine.js

**Core API:**

```javascript
class GoogleDocsTemplateEngine {
  constructor(authService, theme = lfdmTheme)
  
  // Document lifecycle
  async createDocument(title) → { documentId, documentUrl }
  
  // Content building (all return this for chaining)
  async addHeading(text, level)       // level 1-3, Barlow Condensed
  async addBodyText(text)             // Barlow 400
  async addStyledTable(headerRow, dataRows)  // Sage header, alternating rows
  async addBulletList(items)          // Properly indented
  async addDivider()                  // Sage accent horizontal rule
  async addImage(uri, width, height)  // Optional chart images (future)
  
  // High-level document builders
  async buildBluePrint(context, strategy) → { documentId, documentUrl }
  async buildAudit(context, strategy) → { documentId, documentUrl }
  async buildInitialPlan(strategy) → { documentId, documentUrl }
}
```

**Google Docs API Usage:**

The Google Docs API uses a batch update pattern:
- `docs.documents.batchUpdate({ documentId, requests: [...] })`
- Each request is an operation (insertText, updateTextStyle, createParagraphBullets, etc.)
- Nesting level tracked via `endOfSegmentLocation` for appending

**Document Structure (all three docs):**

```
┌─────────────────────────────────────────────┐
│ [Title] Barlow Condensed 800, 24pt, Sage     │
│ [Subtitle] Barlow 400, 12pt, Dark Gray       │
│ ═══════════════════════════════════════════ │
│ [H1] Barlow Condensed 700, 18pt, Sage       │
│ Body text. Barlow 400, 11pt, Dark Gray.      │
│                                              │
│ ┌──────────┬──────────┬────────────────────┐ │
│ │ Header 1 │ Header 2 │ Header 3 (Sage bg) │ │
│ ├──────────┼──────────┼────────────────────┤ │
│ │ Data     │ Data     │ Data               │ │
│ └──────────┴──────────┴────────────────────┘ │
│                                              │
│ [H2] Barlow Condensed 600, 14pt, Sage        │
│ • Bullet item                                │
│ • Another item                               │
└─────────────────────────────────────────────┘
```

---

### 3. GoogleSheetsTemplateEngine.js

**Core API:**

```javascript
class GoogleSheetsTemplateEngine {
  constructor(authService, theme = lfdmTheme)
  
  async createWorkbook(title, clientName) → { spreadsheetId, spreadsheetUrl }
  
  // Tab management
  async addTab(sheetId, title) → sheetId
  async deleteDefaultSheet(spreadsheetId)
  
  // Data + styling
  async populateTab(spreadsheetId, sheetId, columns, rows, options)
  // options: { freezeRows: 1, headerStyle, alternatingRows, columnWidths }
  
  async addCheckboxColumn(spreadsheetId, sheetId, column)
  async addConditionalFormat(spreadsheetId, sheetId, range, rules)
  async setColumnWidths(spreadsheetId, sheetId, widths)
  
  // Batch builder
  async buildAllTabs(context, strategy) → { spreadsheetId, spreadsheetUrl }
}
```

**Tab Specifications:**

**Tab 1: New Commercial Pages**
```
| Keyword | Volume | KD | CPC | Topic | Intent | Weight | Priority | GPG | Approved |
|---------|--------|----|-----|-------|--------|--------|----------|-----|----------|
| ...     | ...    | ...| ... | ...   | ...    | ...    | ...      | ... | ☐        |
```
- Source: keywords where action includes "MISSING CONTENT"
- Approved: checkbox data validation
- Sorting: by Priority descending

**Tab 2: Optimize Service Pages**
```
| Keyword | Volume | KD | CPC | Current Rank | Topic | Intent | Weight | Action |
|---------|--------|----|-----|-------------|-------|--------|--------|--------|
| ...     | ...    | ...| ... | ...          | ...   | ...    | ...    | ...    |
```
- Source: keywords where action includes "OPTIMIZE"
- Current Rank from competitor_columns

**Tab 3: Priority PPC**
```
| Keyword | CPC | GPG Efficiency | Volume | Intent | KD | Comp Density | Est. Bid |
|---------|-----|---------------|--------|--------|----|-------------|----------|
| ...     | ... | Good/Fair/Poor | ...    | ...    | ...| ...          | ...      |
```
- Source: keywords with GPG efficiency Good or Fair
- Conditional formatting: Green/Yellow/Red on GPG column
- Priority: PPC priority > 50

**Tab 4: MAC Analysis**
```
| Metric | Mean | P20 | P30 | P60 | P80 |
|--------|------|-----|-----|-----|-----|
| CPC    | $0.89| $0.00| $0.00| $0.89| $1.87|
| KD     | 34.6 | 8.0 | 14.0 | 33.0 | 59.0 |
| Volume | 123  | 10  | 20   | 90   | 590  |
```
- Source: handoff.json stats.mac
- Read-only data tab

**Tab 5: Cluster Summary**
```
| Cluster Name | Keyword Count | Avg Volume | Avg KD | Primary Intent | Avg Priority | Top Keywords |
|--------------|--------------|------------|--------|----------------|-------------|--------------|
| ...          | ...          | ...        | ...    | ...            | ...         | ...          |
```
- Source: coded clusters → aggregated from keywords
- Top Keywords: first 5 keywords per cluster

**Tab 6: Competitor Ownership**
```
| Topic | Dominant Competitor | Share % | Client Share % | Gap % | Attack Strategy |
|-------|--------------------|---------|---------------|-------|----------------|
| ...   | hafele.com         | 65%     | 5%            | 60%   | Content gap...|
| ...   | ...                | ...     | ...           | ...   | ...           |
```
- Source: competitive analysis from strategy

---

### 4. LfdmTheme.js

```javascript
export const lfdmTheme = {
  name: 'LFDM Design System',
  
  colors: {
    sage: '#E36A6A',
    sageLight: '#F0A0A0',
    darkBg: '#1a1a2e',
    darkSurface: '#16213e',
    warmDark: '#1a1a2e',
    textPrimary: '#2d2d2d',
    textLight: '#6b7280',
    white: '#ffffff',
    cream: '#FFF8F0',
    creamAlt: '#FFF0E0',
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444',
  },
  
  fonts: {
    heading: 'Barlow Condensed',
    body: 'Barlow',
    mono: 'JetBrains Mono',
  },
  
  // Google Docs named styles
  namedStyles: {
    'lfdm-title': {
      fontFamily: 'Barlow Condensed',
      fontWeight: 800,
      fontSize: 24,
      color: '#E36A6A',
    },
    'lfdm-h1': {
      fontFamily: 'Barlow Condensed',
      fontWeight: 700,
      fontSize: 18,
      color: '#E36A6A',
    },
    'lfdm-h2': {
      fontFamily: 'Barlow Condensed',
      fontWeight: 600,
      fontSize: 14,
      color: '#E36A6A',
    },
    'lfdm-body': {
      fontFamily: 'Barlow',
      fontWeight: 400,
      fontSize: 11,
      color: '#2d2d2d',
    },
    'lfdm-table-header': {
      fontFamily: 'Barlow Condensed',
      fontWeight: 700,
      fontSize: 10,
      color: '#ffffff',
      backgroundColor: '#E36A6A',
    },
  },
  
  // Google Sheets formatting
  sheets: {
    header: {
      backgroundColor: { red: 0.890, green: 0.416, blue: 0.416 },  // #E36A6A
      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
    },
    alternatingRow1: {
      backgroundColor: { red: 1, green: 0.973, blue: 0.941 },  // cream
    },
    alternatingRow2: {
      backgroundColor: { red: 1, green: 1, blue: 1 },  // white
    },
  },
};
```

---

## Implementation Steps (Detailed)

### Step 1: Add googleapis to SASHA

```bash
cd /home/lfdm/sasha
npm install googleapis
```

Verify: `import { google } from 'googleapis'` works in Node/ESM context.

### Step 2: Create GoogleAuthService.js

```
Path: /home/lfdm/sasha/src/google/GoogleAuthService.js
- JWT-based auth with service account
- Domain-wide delegation as core@lfdm.co
- Lazy initialization (auth on first use)
- Path to credentials: env var GOOGLE_CREDENTIALS_PATH or default path
```

**Important Design Decision:** The SASHA app runs in-browser (Vite/React). The Google API service account credentials should NOT be served to the browser. Two approaches:
1. **Backend proxy (recommended):** Create a small Node.js backend that handles Google API calls. SASHA frontend calls the backend API.
2. **Direct frontend (simpler but insecure):** Use the service account in a Node.js script only (for headless/CLI mode).

For this implementation, since SASHA is currently purely client-side React:

**Recommended approach:** Create a lightweight backend service (`sasha-backend/`) that:
- Accepts structured data (context + strategy JSON)  
- Uses the service account to create Google Docs/Sheets
- Returns shareable URLs
- SASHA frontend calls this backend for delivery

### Step 3: Create LfdmTheme.js (shared constants)

```
Path: /home/lfdm/sasha/src/google/LfdmTheme.js
- Color palette
- Font stack
- Named style definitions
- Sheets formatting constants
- Used by both Docs and Sheets engines
```

### Step 4: Create GoogleDocsTemplateEngine.js

```
Path: /home/lfdm/sasha/src/google/GoogleDocsTemplateEngine.js
- Uses Google Docs API batchUpdate
- All three document builders
- Style application via updateTextStyle requests
- Table creation via insertTable requests
- Font registration (Barlow, Barlow Condensed — may need Google Fonts API)
```

### Step 5: Create GoogleSheetsTemplateEngine.js

```
Path: /home/lfdm/sasha/src/google/GoogleSheetsTemplateEngine.js
- Uses Google Sheets API batchUpdate
- 6-tab workbook builder
- Data population via values.update (range-based)
- Conditional formatting via addConditionalFormatRule
- Checkbox via data validation with boolean condition
- Column width via updateDimensionProperties
```

### Step 6: Create SheetDataTransformer.js

```
Path: /home/lfdm/sasha/src/google/SheetDataTransformer.js
- Pure functions that transform context + strategy into sheet-ready arrays
- Each function returns { headers: string[], rows: any[][] }
- Filtering logic for each tab type
- Sorting by priority/urgency
```

### Step 7: Create DeliverToClientButton.jsx

```
Path: /home/lfdm/sasha/src/components/DeliverToClientButton.jsx
- Button in ExportBar
- Modal with options: docs only / sheets only / full
- Progress overlay (3 steps: Creating BluePrint... Building Sheet... etc.)
- Results display with links to each document
- Error state with retry
```

### Step 8: Update ExportBar.jsx

```
Modify: /home/lfdm/sasha/src/components/ExportBar.jsx
- Add DeliverToClientButton alongside existing DOCX/XLSX buttons
- Pass context + strategy props
```

### Step 9: Create GoogleDriveService.js

```
Path: /home/lfdm/sasha/src/google/GoogleDriveService.js
- Create folder per client if not exists
- Upload/update documents
- Set sharing permissions
- Return viewable links
```

---

## Testing Strategy

### Unit Tests

1. **DataTransformer tests** — pure functions, easy to test
   - Filter keywords by action type → correct count
   - Aggregate clusters → correct averages
   - Build competitor ownership → correct share calculations

2. **Theme tests** — constants only, mostly visual verification

### Integration Tests

1. **Auth test** — `GoogleAuthService.authenticate()` creates valid auth
2. **Create doc test** — Creates blank doc, adds text + table, deletes doc
3. **Create sheet test** — Creates blank sheet, populates 6 tabs, applies formatting, deletes sheet
4. **Full pipeline test** — Cavity Sliders handoff.json → all 3 docs + 1 sheet → verify in Drive

### Visual Verification

1. Compare generated BluePrint doc against the existing SASHA alpha strategy at:
   `https://docs.google.com/document/d/1VK44OVTP3eAyOlVRjmGmGm9i6xDeRw4Zl6V_Ju79RqE/edit`
2. Compare generated sheets against CODI's XLSX export structure

---

## Dependency Tree

```
googleapis (npm)
├── Required for: Auth (JWT), Docs API, Sheets API, Drive API
├── Peer deps: google-auth-library (included)
└── No frontend impact — used only in backend proxy service

sasha-backend/ (new service)
├── Express.js (minimal)
├── googleapis
├── /home/lfdm/sassy-factory/google_credentials.json (path configurable)
└── POST /api/deliver → accepts { context, strategy } → returns { docUrls, sheetUrl }
```

---

## File List (All New)

```
/home/lfdm/sasha/
├── src/google/
│   ├── GoogleAuthService.js        # Auth wrapper
│   ├── GoogleDocsTemplateEngine.js # Docs builder
│   ├── GoogleSheetsTemplateEngine.js # Sheets builder
│   ├── GoogleDriveService.js       # File management
│   ├── SheetDataTransformer.js     # Data → sheet format
│   └── LfdmTheme.js               # LFDM design constants
├── src/components/
│   └── DeliverToClientButton.jsx   # UI for one-click delivery
├── backend/
│   ├── package.json                # Express + googleapis
│   ├── index.js                    # POST /api/deliver
│   └── .env.example                # GOOGLE_CREDENTIALS_PATH
└── package.json                    # (modified) no new deps needed
```
