# AVASARA global official-source expansion (v7)

This release registers **93** official or institutional discovery portals across regions. All newly registered sources are `link_only`. This means the directory links to them; it does **not** imply that the website has ingested or verified their individual vacancies.

## Existing website and automation

The previous AVASARA website, its 142 curated review listings, UI, CV tools and workflow are retained. The 12-hour GitHub Actions schedule remains configured. It is active only when GitHub enables scheduled workflows on the repository's default branch; scheduled workflows generally do not execute from a test branch.

## How to turn sources into actual listings

1. Confirm each institution's current official application URL, permitted data access and publication terms.
2. Add an approved RSS/Atom feed or Greenhouse board token only where the institution actually supports it and terms permit use.
3. Review the discovered individual opportunities in `automation/review-queue.json`.
4. Add validated records to a JSON array in `automation/inbox/`, with `reviewed: true`, `officialSourceConfirmed: true`, and accurate majors, deadline, funding and source.
5. Run `python automation/import_opportunities.py` or the GitHub workflow to publish approved records.

**No new individual scholarships or PhD vacancies are represented as verified in this release.** Source-directory URLs should be checked before use because university web addresses can change.
