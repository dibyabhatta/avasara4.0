# AVASARA v8.3 — Verification log

- Added `automation/verification-log.jsonl` (initially empty), a separate append-only verification audit trail.
- Added `automation/record_verification.py` to record UTC timestamp, official URL, reviewer, outcome, exactly which fields were checked, and notes.
- Added schema and documentation.
- Tightened automated inbox publication requirements to require verifiedOn, verifiedBy and verificationNotes alongside existing review flags.
- Preserved existing site UI, Community tab, existing opportunities, and scheduled automation.
- No claims that existing records were verified, and no new opportunities imported.
