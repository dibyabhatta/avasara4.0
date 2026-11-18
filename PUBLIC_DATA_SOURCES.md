# Public data integration status (v8.1)

## Active discovery adapter (not automatic publication)
- **Grants.gov** — https://www.grants.gov/api/api-guide — public `search2` API, unauthenticated. Search results are placed in `automation/review-queue.json`; grants are **not presumed to be student scholarships**. The official source URL, eligibility, closing date, funding and subject must be reviewed before publication. Usage must comply with Grants.gov API terms.

## Official discovery portals (not enabled as bulk imports)
- EURAXESS: https://euraxess.ec.europa.eu/jobs/search — verify supported API/feed access before importing.
- Erasmus Mundus: https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en — verify programme-level official links, scholarship availability and intake.
- DAAD: https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/ — verify reuse permission before bulk extraction.
- Australian RTP: https://www.education.gov.au/research-block-grants/research-training-program — programme-level background; university-specific awards require separate records.
- ANU: https://jobs.anu.edu.au/jobs/search — official vacancies, no importer enabled.
- CSIRO: https://jobs.csiro.au/ — official vacancies, no importer enabled.
- Wageningen University & Research: https://www.wur.nl/en/jobs/jobs-wageningen-university-research — official vacancies, no importer enabled.

## Running
`python automation/import_opportunities.py` runs discovery and generates the review queue. Network access is required in GitHub Actions. Errors are recorded in `automation/import-status.json`. Only reviewed records from the inbox with `officialSourceConfirmed=true` are published.

**This build does not contain 2,000 verified opportunities.** It provides one additional real API discovery adapter. Third-party aggregators are not scraped.
