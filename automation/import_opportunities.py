#!/usr/bin/env python3
"""Conservative, dependency-free AVASARA importer. Never auto-publishes raw discoveries."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.request
from urllib.parse import urlsplit, urlunsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'automation/sources/registry.json'
INBOX = ROOT / 'automation/inbox'
OUTPUT = ROOT / 'automated-opportunities.json'
QUEUE = ROOT / 'automation/review-queue.json'
STATUS = ROOT / 'automation/import-status.json'
TYPES = {'Scholarship','Research','Internship','Summer school','Postdoctoral','Fellowship','Academic job','Funded PhD'}
FUNDING = {'Fully funded','Partial','Paid','Varies','Not stated'}
LEVELS = {'S','B','M','P'}

def clean_url(url):
    if not isinstance(url, str): return ''
    u = urlsplit(url.strip())
    if u.scheme != 'https' or not u.netloc or u.username or u.password: return ''
    return urlunsplit((u.scheme,u.netloc.lower(),u.path.rstrip('/') or '/',u.query,''))

def ident(item):
    return hashlib.sha256(clean_url(item['url']).encode()).hexdigest()[:16]

def validate(raw):
    if not isinstance(raw,dict) or not clean_url(raw.get('url')): return None
    required = ('name','country','type','funding','levels')
    if any(not raw.get(k) for k in required): return None
    if raw['type'] not in TYPES or raw['funding'] not in FUNDING: return None
    if not isinstance(raw['levels'],list) or not raw['levels'] or not set(raw['levels']) <= LEVELS: return None
    item = {k:raw[k] for k in required}
    item['url'] = clean_url(raw['url'])
    for k in ('deadline','deadlineTime','fieldCategory','source','verifiedOn','majorEligibilityStatus','fundingSource','institution','jobCategory','eligibilityNotes'):
        if isinstance(raw.get(k),str): item[k] = raw[k][:500]
    for k in ('majors','discoverySubjects'):
        if isinstance(raw.get(k),list): item[k] = [str(v)[:100] for v in raw[k] if isinstance(v,str)][:30]
    if item.get('deadline'):
        try: dt.date.fromisoformat(item['deadline'])
        except ValueError: item.pop('deadline')
    item['id'] = ident(item)
    item['sourceKind'] = 'automated-reviewed'
    return item

def fetch(url):
    req = urllib.request.Request(url,headers={'User-Agent':'AVASARA-Opportunity-Discovery/1.0 (+https://github.com/dibyabhatta/avasara4.0)'})
    with urllib.request.urlopen(req,timeout=15) as r: return r.read(2_000_000)

def discover(source):
    mode = source.get('mode')
    if mode == 'link_only': return []
    if mode == 'rss':
        endpoint = clean_url(source.get('feed_url'))
        if not endpoint: return []
        root = ET.fromstring(fetch(endpoint))
        result=[]
        for el in list(root.findall('.//item')) + list(root.findall('.//{http://www.w3.org/2005/Atom}entry')):
            title = el.findtext('title') or el.findtext('{http://www.w3.org/2005/Atom}title') or ''
            link = el.findtext('link') or ''
            if not link:
                l=el.find('{http://www.w3.org/2005/Atom}link')
                if l is not None: link=l.get('href','')
            if clean_url(link) and title.strip(): result.append({'name':title.strip()[:200],'url':clean_url(link),'sourcePortal':source['name'],'reviewed':False,'reason':'Confirm official posting, deadline, eligibility, funding and subject majors'})
        return result[:200]
    if mode == 'grants_gov':
        # Public documented US federal opportunities API. Discovery only: most grants
        # are NOT individual student scholarships and require eligibility review.
        req = urllib.request.Request(
            'https://api.grants.gov/v1/api/search2',
            data=json.dumps({'rows':100,'oppStatuses':'posted','keyword':source.get('keyword','research')}).encode(),
            headers={'Content-Type':'application/json','User-Agent':'AVASARA-Opportunity-Discovery/1.0'},
            method='POST')
        with urllib.request.urlopen(req,timeout=25) as response:
            payload=json.load(response)
        hits=payload.get('data',{}).get('oppHits',[])
        results=[]
        for hit in hits:
            number=str(hit.get('number','')).strip()
            title=str(hit.get('title','')).strip()
            if not number or not title: continue
            results.append({
                'name':title[:200],
                'url':'https://www.grants.gov/search-results-detail/'+str(hit.get('id')),
                'sourcePortal':source['name'],
                'externalId':number,
                'agency':hit.get('agencyName',''),
                'sourceCloseDate':hit.get('closeDate',''),
                'reviewed':False,
                'reason':'US federal grant; check whether individuals/students are eligible, verify official URL, academic relevance, deadline, funding and subjects. Do not assume scholarship eligibility.'
            })
        return results
    if mode == 'greenhouse':
        token=source.get('board_token','')
        if not re.fullmatch(r'[A-Za-z0-9_-]{2,80}',token): return []
        obj=json.loads(fetch('https://boards-api.greenhouse.io/v1/boards/'+token+'/jobs'))
        return [{'name':j.get('title','')[:200],'url':clean_url(j.get('absolute_url')),'sourcePortal':source['name'],'reviewed':False,'reason':'Confirm official employer, academic relevance, eligibility, salary, deadline and subjects'} for j in obj.get('jobs',[]) if clean_url(j.get('absolute_url'))][:200]
    return []

def main():
    today=dt.date.today().isoformat()
    sources=json.loads(REGISTRY.read_text())
    existing=json.loads(OUTPUT.read_text()) if OUTPUT.exists() else []
    published={x['id']:x for x in existing if isinstance(x,dict) and x.get('id') and clean_url(x.get('url'))}
    pending={}
    errors=[]
    for source in sources:
        try:
            for row in discover(source): pending[ident(row)]=row
        except Exception as e: errors.append({'source':source.get('name'),'error':str(e)[:250]})
    for path in sorted(INBOX.glob('*.json')):
        try:
            rows=json.loads(path.read_text())
            if not isinstance(rows,list): raise ValueError('Expected JSON array')
            for raw in rows:
                valid=validate(raw)
                if valid and raw.get('reviewed') is True and raw.get('officialSourceConfirmed') is True and raw.get('verifiedOn') and raw.get('verificationNotes') and raw.get('verifiedBy'):
                    valid['reviewedOn']=str(raw.get('reviewedOn') or today)
                    valid['verificationStatus']='human-reviewed'
                    valid['verifiedBy']=str(raw['verifiedBy'])[:100]
                    valid['verificationNotes']=str(raw['verificationNotes'])[:500]
                    published[valid['id']]=valid
                    pending.pop(valid['id'],None)
                elif isinstance(raw,dict) and clean_url(raw.get('url')):
                    pending[ident(raw)]={**raw,'reason':'Needs human review: officialSourceConfirmed=true, verifiedOn, verifiedBy, verificationNotes and reviewed=true required'}
        except Exception as e: errors.append({'source':str(path.relative_to(ROOT)),'error':str(e)[:250]})
    # Retain reviewed records across runs. Expired records are archived, not deleted.
    previous_archive=json.loads((ROOT/'automation/archived-opportunities.json').read_text()) if (ROOT/'automation/archived-opportunities.json').exists() else []
    active=[]; archive={x['id']:x for x in previous_archive if isinstance(x,dict) and x.get('id')}
    for item in published.values():
        deadline=item.get('deadline','')
        if deadline and re.fullmatch(r'\d{4}-\d{2}-\d{2}',deadline) and deadline < today:
            archive[item['id']]={**item,'archivedReason':'Published deadline passed; confirm reopening before republishing'}
        else:
            active.append(item)
            archive.pop(item['id'],None)
    active.sort(key=lambda x:(x.get('deadline') or '9999',x['name'].lower()))
    (ROOT/'automation').mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(active,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'automation/archived-opportunities.json').write_text(json.dumps(list(archive.values()),ensure_ascii=False,indent=2)+'\n')
    QUEUE.write_text(json.dumps(sorted(pending.values(),key=lambda x:x.get('name','')),ensure_ascii=False,indent=2)+'\n')
    STATUS.write_text(json.dumps({'checkedOn':today,'activeReviewed':len(active),'archived':len(archive),'awaitingReview':len(pending),'sourcesRegistered':len(sources),'sourcesAutomated':sum(s.get('mode')!='link_only' for s in sources),'errors':errors},indent=2)+'\n')
    print(f'Active reviewed: {len(active)}; review queue: {len(pending)}; automated sources: {sum(s.get("mode")!="link_only" for s in sources)}; errors: {len(errors)}')

if __name__=='__main__': main()
