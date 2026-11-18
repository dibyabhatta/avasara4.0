#!/usr/bin/env python3
"""Opt-in monitoring of official URLs only. A changed page is NOT a verified opportunity."""
import datetime as dt, hashlib, json, os, pathlib, urllib.request, urllib.error
ROOT=pathlib.Path(__file__).resolve().parent
CONFIG=ROOT/'monitor-allowlist.json'
STATE=ROOT/'page-fingerprints.json'
REPORT=ROOT/'page-change-review.json'
config=json.loads(CONFIG.read_text())
previous=json.loads(STATE.read_text()) if STATE.exists() else {}
report=[]; next_state=dict(previous)
for entry in config:
    if not entry.get('approved_for_monitoring') or not entry.get('url','').startswith('https://'):
        continue
    url=entry['url']; ident=entry['id']
    try:
        request=urllib.request.Request(url, headers={'User-Agent':'AVASARA-SourceMonitor/1.0 (academic opportunity verification; contact via GitHub repository)'})
        with urllib.request.urlopen(request, timeout=15) as resp:
            content=resp.read(750000)
            digest=hashlib.sha256(content).hexdigest()
            last=previous.get(ident,{}).get('sha256')
            if last and last!=digest:
                report.append({'source_id':ident,'url':url,'detected_at':dt.datetime.now(dt.timezone.utc).isoformat(),'status':'needs-human-review','reason':'Page content fingerprint changed; deadline/funding/eligibility NOT verified'})
            next_state[ident]={'url':url,'sha256':digest,'last_checked':dt.datetime.now(dt.timezone.utc).isoformat(),'http_status':resp.status}
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        report.append({'source_id':ident,'url':url,'status':'check-failed','reason':type(exc).__name__})
STATE.write_text(json.dumps(next_state,indent=2)+'\n')
REPORT.write_text(json.dumps(report,indent=2)+'\n')
print(f'Checked {len(next_state)} approved pages; {len(report)} changes/errors require review')
