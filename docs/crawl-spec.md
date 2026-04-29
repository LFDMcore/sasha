# Website Crawl Specification — SASHA Integration

## Tool

**Screaming Frog SEO Spider** (free tier: 500 URLs per crawl)

- Download: https://www.screamingfrog.co.uk/seo-spider/
- License: Free tier sufficient for up to 500 URLs per project
- Platform: Windows / macOS / Linux (Java-based)

## Scope

Crawl the client's existing production domain to capture the current site structure, page metadata, and content signals. One crawl per project, run at project start **before** keyword intelligence ingestion.

### What is crawled

| Target | Details |
|--------|---------|
| Domain | Client's primary production domain (e.g., `orangehospice.net`) |
| Protocol | HTTPS (preferred), fallback to HTTP |
| Max URLs | 500 (free tier limit) |
| Subdomains | Include if part of the same site (e.g., `blog.example.com`) |
| Exclude | Staging/dev environments, external third-party domains |

## Output Format

Screaming Frog can export a CSV with the following required columns:

| Column | Description | Screaming Frog Field |
|--------|-------------|---------------------|
| `URL` | Full page URL | `Address` |
| `title` | Page `<title>` tag | `Title 1` |
| `h1` | First `<h1>` element | `H1-1` |
| `meta_description` | Meta description content | `Meta Description 1` |
| `word_count` | Approximate visible word count | `Word Count` |
| `canonical` | Canonical URL if specified | `Canonical Link Element 1` |

### Export Procedure (Screaming Frog)

1. Open Screaming Frog SEO Spider
2. Enter the client's domain in the URL bar → click **Start**
3. Wait for crawl to complete (all URLs turn green)
4. Go to **File → Export → All Inlinks (CSV)**
5. Save as `{client-slug}-crawl.csv` (e.g., `orange-hospice-crawl.csv`)

Alternatively, use **File → Export → Sitemap** to generate an XML sitemap and then convert via SASHA's internal parser.

## Integration Path

```
[CSV or sitemap.xml]
        |
        v
SASHA Ingestion Pipeline
        |
        ├── Reads crawl CSV during keyword ingestion
        ├── Matches URLs to keywords (if clientUrl is available)
        ├── Verifies B2B vocabulary presence on existing pages
        └── Informs content gap analysis
```

### Minimum Viable

- **1 crawl per project start** — run after client onboarding, before keyword analysis
- The crawl CSV is stored at `sasha/data/crawls/{project-id}/{client-slug}-crawl.csv`
- If no crawl is available, SASHA operates in keyword-only mode (no URL matching)

## Expected Use Cases

1. **B2B Vocabulary Verification** — check whether existing pages contain mandatory B2B terms (high end, premium, architectural, etc.)
2. **URL-to-Keyword Matching** — map SEMrush keywords to existing pages via URL token overlap
3. **Content Gap Analysis** — identify keywords with no corresponding existing page (low word_count or no URL match)
4. **Canonical Audit** — detect duplicate or non-canonical pages

## Acceptance Criteria

- [ ] Screaming Frog free tier crawl completes for the client domain
- [ ] Exported CSV contains all required columns (URL, title, h1, meta_description, word_count, canonical)
- [ ] SASHA can parse the CSV without errors
- [ ] At least one crawl exists before the pipeline processes intelligence data
