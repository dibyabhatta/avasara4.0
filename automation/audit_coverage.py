#!/usr/bin/env python3
"""Report coverage and data quality. Does not invent opportunities or eligibility."""
import json, pathlib, collections, csv, datetime
ROOT=pathlib.Path(__file__).resolve().parents[1]
s=(ROOT/'data.js').read_text(encoding='utf-8')
start=s.index('opportunities: [')+len('opportunities: ')
rows,_=json.JSONDecoder().raw_decode(s[start:])
extra=json.loads((ROOT/'automated-opportunities.json').read_text())
allrows=rows+extra
cats=json.loads((ROOT/'automation/taxonomy/majors.json').read_text())['categories']
known={x for values in cats.values() for x in values}
print('Legacy records:',len(rows),'Reviewed automated records:',len(extra),'Total:',len(allrows))
print('Distinct URLs:',len({str(x.get('url','')).rstrip('/').lower() for x in allrows}))
print('Records with majors:',sum(bool(x.get('majors')) for x in allrows))
print('Verified major eligibility:',sum(x.get('majorEligibilityStatus')=='verified' for x in allrows))
print('Recorded deadlines:',sum(bool(x.get('deadline')) for x in allrows))
print('Records with non-catalogue majors:',sum(any(m not in known and m!='All eligible majors' for m in x.get('majors',[])) for x in allrows))
print('Types:',dict(collections.Counter(x.get('type','Unknown') for x in allrows)))
