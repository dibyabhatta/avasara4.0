
#!/usr/bin/env python3
"""
AVASARA opportunity discovery, verification and publication importer.

Discovery is automatic.
Publication requires attributable human verification.

A working HTTP link is never treated as proof of eligibility,
funding, deadline, or academic relevance.
"""

import datetime as dt
import hashlib
import json
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]

REGISTRY = ROOT / "automation/sources/registry.json"
INBOX = ROOT / "automation/inbox"
OUTPUT = ROOT / "automated-opportunities.json"
QUEUE = ROOT / "automation/review-queue.json"
STATUS = ROOT / "automation/import-status.json"
ARCHIVE = ROOT / "automation/archived-opportunities.json"
VERIFICATION_LOG = ROOT / "automation/verification-log.jsonl"

TYPES = {
    "Scholarship",
    "Research",
    "Internship",
    "Summer school",
    "Postdoctoral",
    "Fellowship",
    "Academic job",
    "Funded PhD",
}

FUNDING = {
    "Fully funded",
    "Partial",
    "Paid",
    "Varies",
    "Not stated",
}

LEVELS = {"S", "B", "M", "P"}

CONFIRMED_FIELDS = {
    "title",
    "deadline",
    "funding",
    "eligibility",
    "majors",
    "application_url",
    "status",
}

REQUIRED_VERIFICATION = {"title", "application_url"}


# ------------------------------------------------------------
# URL AND RECORD VALIDATION
# ------------------------------------------------------------

def clean_url(url):
    if not isinstance(url, str):
        return ""

    try:
        u = urlsplit(url.strip())

        if (
            u.scheme != "https"
            or not u.netloc
            or u.username
            or u.password
        ):
            return ""

        return urlunsplit((
            u.scheme,
            u.netloc.lower(),
            u.path.rstrip("/") or "/",
            u.query,
            "",
        ))

    except ValueError:
        return ""


def ident(item):
    url = clean_url(item["url"])
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def validate(raw):
    if not isinstance(raw, dict):
        return None

    if not clean_url(raw.get("url")):
        return None

    required = (
        "name",
        "country",
        "type",
        "funding",
        "levels",
    )

    if any(not raw.get(k) for k in required):
        return None

    if raw["type"] not in TYPES:
        return None

    if raw["funding"] not in FUNDING:
        return None

    if (
        not isinstance(raw["levels"], list)
        or not raw["levels"]
        or not set(raw["levels"]) <= LEVELS
    ):
        return None

    item = {k: raw[k] for k in required}

    item["url"] = clean_url(raw["url"])

    optional_text = (
        "deadline",
        "deadlineTime",
        "fieldCategory",
        "source",
        "verifiedOn",
        "majorEligibilityStatus",
        "fundingSource",
        "institution",
        "jobCategory",
        "eligibilityNotes",
    )

    for key in optional_text:
        if isinstance(raw.get(key), str):
            item[key] = raw[key][:500]

    for key in ("majors", "discoverySubjects"):
        if isinstance(raw.get(key), list):
            item[key] = [
                str(v)[:100]
                for v in raw[key]
                if isinstance(v, str)
            ][:30]

    if item.get("deadline"):
        try:
            dt.date.fromisoformat(item["deadline"])
        except ValueError:
            item.pop("deadline", None)
            item.pop("deadlineTime", None)

    item["id"] = ident(item)
    item["sourceKind"] = "automated-reviewed"

    return item


# ------------------------------------------------------------
# HUMAN VERIFICATION LOG
# ------------------------------------------------------------

def load_verification_log():
    """
    Load append-only human verification events.

    Invalid log entries are rejected rather than silently
    treated as successful verification.
    """

    events = {}

    if not VERIFICATION_LOG.exists():
        return events

    with VERIFICATION_LOG.open(
        "r",
        encoding="utf-8"
    ) as file:

        for line_number, line in enumerate(file, start=1):

            if not line.strip():
                continue

            try:
                event = json.loads(line)

                if not isinstance(event, dict):
                    raise ValueError("Expected JSON object")

                url = clean_url(event.get("official_url"))

                if not url:
                    raise ValueError("Invalid official URL")

                if not isinstance(event.get("confirmed"), list):
                    raise ValueError("Invalid confirmed fields")

                if not set(event["confirmed"]) <= CONFIRMED_FIELDS:
                    raise ValueError("Unknown confirmed fields")

                events.setdefault(url, []).append(event)

            except (ValueError, TypeError) as error:
                raise ValueError(
                    f"Invalid verification log line "
                    f"{line_number}: {error}"
                ) from error

    return events


def get_human_verification(raw, verification_events):
    """
    Return the matching verified event, or None.

    The latest event for the official URL controls whether
    the opportunity may be imported.
    """

    url = clean_url(raw.get("url"))

    if not url:
        return None

    events = verification_events.get(url, [])

    if not events:
        return None

    latest = events[-1]

    if latest.get("result") != "verified":
        return None

    confirmed = set(latest.get("confirmed", []))

    if not REQUIRED_VERIFICATION.issubset(confirmed):
        return None

    reviewer = str(latest.get("reviewer", "")).strip()
    expected_reviewer = str(raw.get("verifiedBy", "")).strip()

    if not reviewer or reviewer != expected_reviewer:
        return None

    notes = str(latest.get("notes", "")).strip()

    if not notes:
        return None

    checked_at = str(latest.get("checked_at", ""))
    verified_on = str(raw.get("verifiedOn", ""))

    try:
        check_date = dt.date.fromisoformat(
            checked_at[:10]
        )
        approval_date = dt.date.fromisoformat(
            verified_on
        )
    except ValueError:
        return None

    if check_date != approval_date:
        return None

    if check_date > dt.datetime.now(
        dt.timezone.utc
    ).date():
        return None

    # Prevent a different record ID from borrowing
    # another record's verification.
    expected_id = ident({"url": url})

    if str(latest.get("record_id", "")) != expected_id:
        return None

    return latest


# ------------------------------------------------------------
# PREPARE SAFE PUBLICATION RECORDS
# ------------------------------------------------------------

def prepare_publication(raw, verification_event):
    """
    Remove unverified claims before publication.

    The source identity and application URL are required.
    Other details may remain unknown.
    """

    item = validate(raw)

    if not item:
        return None

    confirmed = set(verification_event["confirmed"])

    if "deadline" not in confirmed:
        item.pop("deadline", None)
        item.pop("deadlineTime", None)
        item["deadlineStatus"] = "Not yet verified"

    elif not item.get("deadline"):
        item["deadlineStatus"] = "Not stated"

    else:
        item["deadlineStatus"] = "Human-verified"

    if "funding" not in confirmed:
        item["funding"] = "Not stated"
        item.pop("fundingSource", None)
        item["fundingVerificationStatus"] = (
            "Not yet verified"
        )
    else:
        item["fundingVerificationStatus"] = (
            "Human-verified"
        )

    if "eligibility" not in confirmed:
        item.pop("eligibilityNotes", None)
        item["eligibilityNotes"] = (
            "Eligibility not yet verified. "
            "Check the official source."
        )
        item["eligibilityVerificationStatus"] = (
            "Not yet verified"
        )
    else:
        item["eligibilityVerificationStatus"] = (
            "Human-verified"
        )

    if "majors" not in confirmed:
        item["majors"] = []
        item["discoverySubjects"] = []
        item.pop("fieldCategory", None)
        item["majorEligibilityStatus"] = (
            "needs official verification"
        )
    else:
        item["majorEligibilityStatus"] = (
            "human-verified"
        )

    item["verifiedOn"] = str(raw["verifiedOn"])
    item["reviewedOn"] = str(
        raw.get("reviewedOn") or raw["verifiedOn"]
    )

    item["verificationStatus"] = "human-reviewed"

    item["verifiedBy"] = str(
        raw["verifiedBy"]
    )[:100]

    item["verificationNotes"] = str(
        raw["verificationNotes"]
    )[:500]

    item["confirmedFields"] = sorted(confirmed)

    item["sourceKind"] = "automated-reviewed"

    return item


# ------------------------------------------------------------
# FETCH OFFICIAL DISCOVERY SOURCES
# ------------------------------------------------------------

def fetch(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent":
            "AVASARA-Opportunity-Discovery/1.0 "
            "(+https://github.com/dibyabhatta/avasara4.0)"
        },
    )

    with urllib.request.urlopen(
        req,
        timeout=15
    ) as response:

        return response.read(2_000_000)


# ------------------------------------------------------------
# DISCOVERY ENGINE
# ------------------------------------------------------------

def discover(source):

    mode = source.get("mode")

    if mode == "link_only":
        return []

    if mode == "rss":

        endpoint = clean_url(source.get("feed_url"))

        if not endpoint:
            return []

        root = ET.fromstring(fetch(endpoint))

        result = []

        entries = (
            list(root.findall(".//item"))
            + list(root.findall(
                ".//{http://www.w3.org/2005/Atom}entry"
            ))
        )

        for element in entries:

            title = (
                element.findtext("title")
                or element.findtext(
                    "{http://www.w3.org/2005/Atom}title"
                )
                or ""
            )

            link = element.findtext("link") or ""

            if not link:
                atom_link = element.find(
                    "{http://www.w3.org/2005/Atom}link"
                )

                if atom_link is not None:
                    link = atom_link.get("href", "")

            if clean_url(link) and title.strip():

                result.append({
                    "name": title.strip()[:200],
                    "url": clean_url(link),
                    "sourcePortal": source["name"],
                    "reviewed": False,
                    "reason": (
                        "Confirm official posting, "
                        "deadline, eligibility, funding "
                        "and subject majors."
                    ),
                })

        return result[:200]

    if mode == "grants_gov":

        req = urllib.request.Request(
            "https://api.grants.gov/v1/api/search2",
            data=json.dumps({
                "rows": 100,
                "oppStatuses": "posted",
                "keyword": source.get(
                    "keyword", "research"
                ),
            }).encode(),
            headers={
                "Content-Type": "application/json",
                "User-Agent":
                "AVASARA-Opportunity-Discovery/1.0",
            },
            method="POST",
        )

        with urllib.request.urlopen(
            req,
            timeout=25
        ) as response:

            payload = json.load(response)

        hits = payload.get(
            "data", {}
        ).get("oppHits", [])

        results = []

        for hit in hits:

            number = str(
                hit.get("number", "")
            ).strip()

            title = str(
                hit.get("title", "")
            ).strip()

            if not number or not title:
                continue

            results.append({
                "name": title[:200],
                "url": (
                    "https://www.grants.gov/"
                    "search-results-detail/"
                    + str(hit.get("id"))
                ),
                "sourcePortal": source["name"],
                "externalId": number,
                "agency": hit.get(
                    "agencyName", ""
                ),
                "sourceCloseDate": hit.get(
                    "closeDate", ""
                ),
                "reviewed": False,
                "reason": (
                    "US federal grant. Verify whether "
                    "individuals or students are eligible. "
                    "Check academic relevance, official "
                    "URL, deadline, funding and subjects. "
                    "Do not assume scholarship eligibility."
                ),
            })

        return results

    if mode == "greenhouse":

        token = source.get(
            "board_token", ""
        )

        if not re.fullmatch(
            r"[A-Za-z0-9_-]{2,80}",
            token
        ):
            return []

        obj = json.loads(
            fetch(
                "https://boards-api.greenhouse.io/"
                "v1/boards/" + token + "/jobs"
            )
        )

        return [
            {
                "name": j.get("title", "")[:200],
                "url": clean_url(
                    j.get("absolute_url")
                ),
                "sourcePortal": source["name"],
                "reviewed": False,
                "reason": (
                    "Confirm official employer, "
                    "academic relevance, eligibility, "
                    "salary, deadline and subjects."
                ),
            }
            for j in obj.get("jobs", [])
            if clean_url(j.get("absolute_url"))
        ][:200]

    return []


# ------------------------------------------------------------
# MAIN IMPORT AND PUBLICATION PIPELINE
# ------------------------------------------------------------

def main():

    today = dt.datetime.now(
        dt.timezone.utc
    ).date().isoformat()

    sources = json.loads(
        REGISTRY.read_text(encoding="utf-8")
    )

    existing = (
        json.loads(
            OUTPUT.read_text(encoding="utf-8")
        )
        if OUTPUT.exists()
        else []
    )

    published = {
        x["id"]: x
        for x in existing
        if (
            isinstance(x, dict)
            and x.get("id")
            and clean_url(x.get("url"))
        )
    }

    pending = {}
    errors = []

    # Load verification events before processing approvals.
    # A malformed log must stop publication rather than
    # silently bypassing verification.
    verification_events = load_verification_log()

    # --------------------------------------------------------
    # 1. DISCOVER
    # --------------------------------------------------------

    for source in sources:

        try:

            for row in discover(source):
                pending[ident(row)] = row

        except Exception as error:

            errors.append({
                "source": source.get("name"),
                "error": str(error)[:250],
            })

    # --------------------------------------------------------
    # 2. REVIEW AND VERIFY
    # --------------------------------------------------------

    for path in sorted(
        INBOX.glob("*.json")
    ):

        try:

            rows = json.loads(
                path.read_text(encoding="utf-8")
            )

            if not isinstance(rows, list):
                raise ValueError(
                    "Expected JSON array"
                )

            for raw in rows:

                if not isinstance(raw, dict):
                    continue

                valid = validate(raw)

                approved = (
                    valid is not None
                    and raw.get("reviewed") is True
                    and raw.get(
                        "officialSourceConfirmed"
                    ) is True
                    and bool(raw.get("verifiedOn"))
                    and bool(raw.get("verifiedBy"))
                    and bool(raw.get(
                        "verificationNotes"
                    ))
                )

                verification_event = (
                    get_human_verification(
                        raw,
                        verification_events
                    )
                    if approved
                    else None
                )

                if approved and verification_event:

                    safe_record = prepare_publication(
                        raw,
                        verification_event
                    )

                    if safe_record:

                        published[
                            safe_record["id"]
                        ] = safe_record

                        pending.pop(
                            safe_record["id"],
                            None
                        )

                elif clean_url(raw.get("url")):

                    pending[ident(raw)] = {
                        **raw,
                        "reason": (
                            "Awaiting human approval and "
                            "matching verified log event. "
                            "Official title and application "
                            "URL must be confirmed."
                        ),
                    }

        except Exception as error:

            errors.append({
                "source": str(
                    path.relative_to(ROOT)
                ),
                "error": str(error)[:250],
            })

    # --------------------------------------------------------
    # 3. ARCHIVE EXPIRED OPPORTUNITIES
    # --------------------------------------------------------

    previous_archive = (
        json.loads(
            ARCHIVE.read_text(encoding="utf-8")
        )
        if ARCHIVE.exists()
        else []
    )

    archive = {
        x["id"]: x
        for x in previous_archive
        if (
            isinstance(x, dict)
            and x.get("id")
        )
    }

    active = []

    for item in published.values():

        deadline = item.get(
            "deadline", ""
        )

        if (
            deadline
            and re.fullmatch(
                r"\d{4}-\d{2}-\d{2}",
                deadline
            )
            and deadline < today
        ):

            archive[item["id"]] = {
                **item,
                "archivedReason": (
                    "Published deadline passed; "
                    "confirm reopening before "
                    "republishing."
                ),
            }

        else:

            active.append(item)

            archive.pop(
                item["id"],
                None
            )

    active.sort(
        key=lambda x: (
            x.get("deadline") or "9999",
            x["name"].lower(),
        )
    )

    # --------------------------------------------------------
    # 4. WRITE PUBLICATION AND REVIEW FILES
    # --------------------------------------------------------

    (ROOT / "automation").mkdir(
        exist_ok=True
    )

    OUTPUT.write_text(
        json.dumps(
            active,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8",
    )

    ARCHIVE.write_text(
        json.dumps(
            list(archive.values()),
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8",
    )

    QUEUE.write_text(
        json.dumps(
            sorted(
                pending.values(),
                key=lambda x: x.get(
                    "name", ""
                )
            ),
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8",
    )

    STATUS.write_text(
        json.dumps({
            "checkedOn": today,
            "activeReviewed": len(active),
            "archived": len(archive),
            "awaitingReview": len(pending),
            "sourcesRegistered": len(sources),
            "sourcesAutomated": sum(
                s.get("mode") != "link_only"
                for s in sources
            ),
            "errors": errors,
        }, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Active reviewed: {len(active)}; "
        f"review queue: {len(pending)}; "
        f"automated sources: "
        f"{sum(s.get('mode') != 'link_only' for s in sources)}; "
        f"errors: {len(errors)}"
    )


if __name__ == "__main__":
    main()
