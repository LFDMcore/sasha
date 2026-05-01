# SASHA — Start Here

Last updated: 2026-05-01T01:46:53Z
Project root: `/home/lfdm/sasha`
Repository: `github.com/LFDMcore/sasha` local checkout at `/home/lfdm/sasha`
Status: active strategic layer / needs CODI-SASHA split hardening

## Project overview

SASHA means Segmented Action Sheets for Holistic Architecture.

SASHA is the strategic layer on top of CODI. It should read CODI output, client context, and the approved Strategy Contract, then produce:
- page creation priorities
- blog/content priorities
- PPC test/hold/exclude recommendations
- competitive attack plan
- timeline / phased roadmap
- strategy narrative or source material for a senior-model-written strategy doc

SASHA should answer: “What should we do with the approved CODI data?”

SASHA should not invent targeting parameters. It must respect the Strategy Contract and fail closed when client approval is missing.

## Source-of-truth boundaries

CODI runtime:
- `/home/lfdm/sassy-factory/codi/`
- owns CSV merge, keyword classification, topic/subtopic/locality classification, scoring, and handoff creation

CODI v4 reference:
- `/home/lfdm/codiv4/`
- browser/Vite reference only
- use for algorithms/column expectations, not as production runtime

SASHA runtime/reference:
- `/home/lfdm/sasha/`
- React/Vite app plus Node scripts for strategic outputs and DOCX reports

Client workflow source of truth:
- client strategy doc for comments/final narrative
- Project Control sheet for Strategy Contract, Feedback Items, and durable Decision Log
- avoid duplicate review-control docs unless a client-specific need proves it

## Current simplification decision

The CODI/SASHA feedback process was audited with gpt-5.5-pro and judged overcomplicated by about 3x.

Keep the safety gate, but remove excess process.

Minimum team workflow:
1. Client comments or meeting notes arrive.
2. SASSy checks feedback and classifies CODI/SASHA/PPC/doc-only/open question.
3. Human approves/edits Strategy Contract.
4. SASHA only runs final strategy from approved parameters.

Do not build more process trackers around SASHA until the Hittelman pilot proves the need.

## SASHA Final gate

Before SASHA Final, Strategy Contract must have:
- approved services
- approved geographies
- excluded services/geographies
- PPC test/hold/exclude decision
- open questions resolved or explicitly deferred

If this gate is not met, SASHA should produce a “needs decision” output instead of a final strategy.

## Key files

Application:
- `src/App.jsx` — React app shell, ingestion/results flow
- `src/components/IngestionPanel.jsx` — input surface
- `src/components/ResultsView.jsx` — strategy output view

Ingestion/context:
- `src/ingestion/ContextBuilder.js` — builds the SASHA context from handoff/LAYLA/crawl/notes

Planner modules:
- `src/planner/OpportunityAnalyzer.js` — pure opportunity computation
- `src/planner/PageArchitect.js` — LLM-backed phased architecture plan
- `src/planner/BlogCalendar.js` — blog calendar generation
- `src/planner/PpcStructure.js` — PPC structure generation
- `src/planner/CompetitiveAttack.js` — competitive attack plan
- `src/planner/TimelineGenerator.js` — roadmap/timeline

Model/core:
- `src/core/DeepSeekClient.js` — DeepSeek/OpenRouter client with thinking disabled for structured output
- `src/core/ModelRouter.js` — model routing abstraction

Scripts/test data:
- `scripts/generate-report.mjs` — report generation
- `scripts/generate-report-cli.mjs` — CLI report generation helper
- `scripts/sasha-integration-test.mjs` — integration test script
- `test-data/*handoff.json` — CODI handoff samples
- `test-data/*strategy-brief.json` — strategy brief samples
- `test-data/*strategy-report.docx` — generated report outputs

## Working commands

Install dependencies if needed:

```bash
cd /home/lfdm/sasha
npm install
```

Run dev server:

```bash
cd /home/lfdm/sasha
npm run dev
```

Build:

```bash
cd /home/lfdm/sasha
npm run build
```

Preview built app:

```bash
cd /home/lfdm/sasha
npm run preview
```

Run integration test if script remains current:

```bash
cd /home/lfdm/sasha
node scripts/sasha-integration-test.mjs
```

Generate report from CLI if script remains current:

```bash
cd /home/lfdm/sasha
node scripts/generate-report-cli.mjs
```

## Dependency map

Node/Vite:
- React 19 + Vite 6
- package scripts: `dev`, `build`, `preview`

Document generation:
- `docx`, `file-saver`, `jszip`, `xlsx`
- browser app generates DOCX; production Google Docs delivery should be handled by deterministic Docs API styling from SASSy/CODI side or a dedicated delivery script

AI models:
- DeepSeek V4 Flash/Pro direct preferred for cost/cache
- OpenRouter fallback supported by client code
- Structured JSON must disable thinking mode when using direct DeepSeek
- Senior strategy narrative should use GPT-5.5 Pro / equivalent higher-quality model when the deliverable is client-facing

Inputs:
- CODI handoff JSON
- LAYLA / competitor context
- crawl/website context where available
- meeting notes/client decisions
- approved Strategy Contract

## What works now

Verified from files:
- React/Vite app exists with ingestion/results flow
- package scripts exist for dev/build/preview
- DeepSeek client includes thinking-disabled body for direct DeepSeek structured output
- PageArchitect uses ModelRouter and builds JSON strategy prompt
- test-data contains Cavity Sliders and Healthspan Wealth handoffs/reports
- CLI/report scripts exist, including `scripts/generate-report-cli.mjs`

## What is missing / not yet safe

- SASHA must not treat old hardcoded Cavity Sliders assumptions as generic strategy.
- PageArchitect currently contains architectural-hardware/Cavity-style prompt defaults; verify and generalize before using for unrelated verticals.
- Blog/PPC/competitive/timeline modules may be prototype-level; verify output evidence columns before shipping.
- Final Google Docs strategy styling should not rely on weak model formatting. Use deterministic Docs API formatting or a known-good template.
- SASHA Final must read/obey approved Strategy Contract; if not wired, do not call output final.

## Known issues and failure modes

DeepSeek JSON failures:
- symptom: fallback plan, truncated JSON, parse failures
- fix: disable thinking mode, increase max tokens, parse from content/reasoning_content, retry once, then fail with clear error

Prompt hardcoding risk:
- symptom: strategy refers to pocket doors, architectural hardware, US-only, or Cavity Sliders concepts for another client
- fix: move vertical assumptions into Strategy Contract/client context; no hardcoded strategic defaults in SASHA modules

Over-expansion risk:
- symptom: SASHA recommends pages/blogs/PPC outside approved services/geographies
- fix: fail closed unless Strategy Contract says approved; mark “needs client decision” instead of generating final strategy

Weak narrative risk:
- symptom: doc reads generic, poorly styled, or model-ish
- fix: senior model writes narrative from data brief; deterministic code formats Google Doc

## Scope boundary

Do not:
- make SASHA responsible for raw keyword math; CODI owns that
- let SASHA expand into unapproved services/geographies
- ship final client docs from prototype/stub planner outputs
- hardcode vertical-specific assumptions in generic modules
- build a new process-management app around SASHA

Do:
- keep SASHA as strategy/sequence layer
- use Strategy Contract as the approval gate
- produce evidence-backed page/blog/PPC recommendations
- separate data brief generation from final narrative writing/styling

## Recent updates and context

2026-05-01 — CODI/SASHA feedback loop simplified
- gpt-5.5-pro audit concluded process was too complex
- new rule: team maintains Strategy Contract + Feedback Items + Decision Log only unless pilot proves more is needed
- SASHA should treat Strategy Contract as final gate

2026-04-30 — Hittelman pilot context
- Hittelman strategy doc and Project Control artifacts created from CODI/SASHA split work
- feedback ingestion exists on CODI side at `/home/lfdm/sassy-factory/codi/scripts/ingest-feedback.py`
- SASHA should wait for approved targeting parameters before final output

2026-04-29 — CODI/SASHA split context
- CODI owns keyword intelligence and classification
- SASHA owns strategic prioritization, pages/blogs/PPC/timeline/doc narrative
- `/home/lfdm/codiv4/` remains reference, not runtime

## Next actions

1. Audit SASHA planner modules for hardcoded vertical assumptions.
2. Ensure SASHA can accept Strategy Contract values from CODI/SASSy project controls.
3. Add a fail-closed “needs decision” path when approved services/geographies/PPC constraints are missing.
4. Verify report generation with Hittelman-style legal vertical data, not only Cavity Sliders hardware data.
5. Keep final Google Docs delivery deterministic and LFDM-styled.

## Pre-flight checklist before modifying this project

- Read this file.
- Run `git status --short` in `/home/lfdm/sasha`.
- Confirm whether the task is SASHA strategy logic or CODI data logic.
- If touching model prompts, check for hardcoded client/vertical assumptions.
- If producing client-facing docs, verify Strategy Contract approval first.
- If editing generated reports/test-data, avoid committing large binary artifacts unless explicitly needed.

## Rollback plan

Use git to inspect and revert only the intended path. This repo currently has unrelated dirty/generated files; do not reset the whole repo without approval.

For client-facing output, regenerate from a known handoff + Strategy Contract rather than hand-editing generated artifacts where possible.

## Session handoff notes

Immediate next work: harden SASHA around Strategy Contract ingestion and fail-closed approvals, then test on Hittelman/legal-vertical context.

If resuming later: verify current git status, current CODI handoff format, and whether SASHA prompt modules still contain Cavity/hardware assumptions before using SASHA for a different client.
