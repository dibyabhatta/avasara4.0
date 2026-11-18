#!/usr/bin/env python3
"""Record a human-performed official-source verification. Never infer checks from HTTP status."""
import argparse,datetime as dt,hashlib,json,re
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
LOG=ROOT/'automation/verification-log.jsonl'
FIELDS=('official_url','record_id','reviewer','result','confirmed','notes','source_url','checked_at')
def main():
 p=argparse.ArgumentParser(description='Append a factual, attributable manual verification event')
 p.add_argument('--official-url',required=True);p.add_argument('--record-id',default='')
 p.add_argument('--reviewer',required=True);p.add_argument('--result',required=True,choices=['verified','partial','needs-review','closed','broken-link'])
 p.add_argument('--confirmed',default='',help='Comma-separated fields actually checked: title,deadline,funding,eligibility,majors,application_url,status')
 p.add_argument('--notes',required=True);p.add_argument('--source-url',default='')
 args=p.parse_args();u=urlsplit(args.official_url)
 if u.scheme!='https' or not u.netloc or u.username or u.password: p.error('Official URL must be HTTPS')
 allowed={'title','deadline','funding','eligibility','majors','application_url','status'}
 confirmed=sorted(set(x.strip() for x in args.confirmed.split(',') if x.strip()))
 if set(confirmed)-allowed: p.error('Unknown confirmed field')
 if args.result=='verified' and not confirmed: p.error('Verified requires at least one confirmed field')
 if args.source_url and (urlsplit(args.source_url).scheme!='https' or not urlsplit(args.source_url).netloc): p.error('Source URL must be HTTPS')
 now=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
 event={'checked_at':now,'record_id':args.record_id or hashlib.sha256(args.official_url.encode()).hexdigest()[:16], 'official_url':args.official_url,'source_url':args.source_url or args.official_url,'reviewer':args.reviewer,'result':args.result,'confirmed':confirmed,'notes':args.notes}
 LOG.parent.mkdir(parents=True,exist_ok=True)
 with LOG.open('a',encoding='utf-8') as f:f.write(json.dumps(event,ensure_ascii=False)+'\n')
 print('Recorded verification event:',event['record_id'],event['checked_at'])
if __name__=='__main__':main()
