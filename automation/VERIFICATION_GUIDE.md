# AVASARA verification log (v8.3)

`verification-log.jsonl` is an **append-only record of human checks**, separate from the public opportunity dataset. It starts empty: no checks have been claimed. Do not put private reviewer emails or tokens in it.

## Record a check

```bash
python automation/record_verification.py --official-url https://example.edu/scholarship --reviewer "AVASARA editorial" --result partial --confirmed title,application_url --notes "Official page lists this title and application link; deadline not checked"
```

Use `--result verified` only for fields you actually inspected on the official source. `confirmed` identifies exactly which fields were checked. `checked_at` is generated in UTC. Each check adds a new JSON line, preserving earlier results. A successful HTTP request is **not** proof of eligibility, funding or deadline.

## Publishing a reviewed inbox entry

Place structured JSON records in `automation/inbox/*.json` (see import template). To qualify for publication, include `reviewed: true`, `officialSourceConfirmed: true`, `verifiedOn` (ISO date), `verifiedBy` (public role/name), and `verificationNotes` (factual review details), plus existing required fields. Also add a corresponding verification-log event with the same official URL; the importer does not currently enforce that log-to-record match automatically. Uncertain entries stay in the review queue.

## Security and limitations

The log is committed to a public GitHub repository. Do not include passwords, tokens, personal applicant data or non-public material. The log documents editorial checks; it does not independently verify that the checks were correct. Older records are **not** retrospectively marked verified.
