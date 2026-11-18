# AVASARA v8.4 — Independent improvements

Implemented independently; no Scholio code, content, or dataset copied.

1. **Public correction reporting:** opportunity details now link to a prefilled GitHub issue in `dibyabhatta/avasara4.0`. Visitors need a GitHub account. A repository administrator must enable Issues. Community submissions remain in the separate Community tab.
2. **Tracker calendar export:** the existing Tracker now offers an `.ics` download with seven-day reminders for dated entries. Reminders depend on the calendar application; the file does not send email.
3. **Opt-in official-page monitoring:** `automation/monitor_official_pages.py` records SHA-256 page fingerprints and flags changed pages for human review. The allowlist is deliberately empty: do not add a source until monitoring access and permissions are checked. No content is republished. A page change does not confirm funding, deadline, or eligibility.
4. **Verification history:** v8.3's append-only verification log is retained.

## Enable monitoring

After reviewing an official site's automation policy, add objects to `automation/monitor-allowlist.json` with `id`, `url`, and `approved_for_monitoring: true`. Run `python automation/monitor_official_pages.py`. First run creates baseline fingerprints; subsequent changed pages appear in `automation/page-change-review.json`. Manual reviewers must confirm what changed and append verified evidence via `automation/record_verification.py`.

## Limitations

No new opportunity records have been added; the database remains at its existing size. No monitoring sources are enabled by default. Existing profile matching is indicative, not a guarantee of admission. This release does not implement automatic email alerts, private accounts, or a backend correction form.
