# AVASARA: 2,000 distinct opportunities roadmap

## Honest baseline
The inherited v7 database contains 142 records. The 2,000 figure is a **target**, not a delivered count. The existing source directory contains discovery portals, not individual opportunities. No unverified records have been generated to inflate totals.

## Proposed balanced intake targets (total 2,000)
- Undergraduate scholarships: 250
- Master's scholarships (including individual Erasmus Mundus programmes): 450
- Funded PhD projects and doctoral scholarships (including MSCA vacancies): 650
- Postdoctoral fellowships and research appointments: 250
- Internships and summer research: 250
- Summer schools and short academic programmes: 150

Targets are planning allocations, not evidence of open positions. Archive closed rounds; do not label all programme pages as currently funded.

## Sources, in order of priority
1. Official programme/application pages for Erasmus Mundus (programme-by-programme), DAAD, government awards and university scholarship offices.
2. Official employer vacancies: ANU, CSIRO, Wageningen, Max Planck institutes, national labs and other universities worldwide.
3. Official EURAXESS vacancy records, where access and reuse are permitted; resolve to employer pages where possible.
4. Official university summer research, undergraduate, internship and summer school pages.
5. Third-party portals as manual discovery leads only unless permission for automation is established.

## Data policy
One record per distinct programme, application round or position (where independently applicable). Keep separate: eligible majors, research subjects, broad field, degree/career stage, funding evidence, official application URL, verified date, deadline and source provenance. Do not infer eligibility from research topics. Use 'All eligible majors' only with official evidence. Do not claim 'fully funded' when salary/tuition details are missing. Use unknown/needs-review status. Never publish discovery leads without review.

## Current implementation
The taxonomy is in `automation/taxonomy/majors.json`. Run `python automation/audit_coverage.py` to see the real count and coverage. The CSV template documents the desired individual-opportunity fields; the existing JSON inbox importer remains the supported publication path. `automation/review-queue.json` stores leads awaiting verification. GitHub Actions runs the importer on a schedule, but link-only sources do not automatically generate opportunities.

## Recommended next engineering tasks
Add authorised per-source importers and source-specific tests, enforce subject taxonomy at publication, improve the on-site subject browser and display verified-vs-research subject badges. Measure number of distinct live verified records, not number of portal links.
