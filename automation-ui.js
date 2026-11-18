/* Progressive enhancement: curated listings stay intact if fetch is unavailable. */
(() => {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid = (o) => o && typeof o.name==='string' && typeof o.country==='string' && Array.isArray(o.levels) && /^https:\/\//.test(o.url||'');
  async function init(){
    const status=document.getElementById('av-auto-status');
    try {
      const [records, registry, report] = await Promise.all([
        fetch('automated-opportunities.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('records unavailable');return r.json()}),
        fetch('automation/sources/registry.json').then(r=>r.json()),
        fetch('automation/import-status.json').then(r=>r.json())
      ]);
      const seen=new Set(AVASARA.opportunities.map(o=>(o.url||'').replace(/\/$/,'')));
      let added=0;
      for(const item of records){if(!valid(item)||seen.has(item.url.replace(/\/$/,'')))continue;AVASARA.opportunities.push(item);seen.add(item.url.replace(/\/$/,''));added++}
      if(added){const q=document.getElementById('q');if(q)q.dispatchEvent(new Event('input',{bubbles:true}));}
      if(status)status.textContent=`${AVASARA.opportunities.length} curated and reviewed listings · ${added} additional automated imports · ${report.sourcesRegistered} source portals indexed · checked ${report.checkedOn}. Portal links are discovery sources, not individual verified vacancies.`;
      const box=document.getElementById('av-source-directory');
      if(box && Array.isArray(registry)){
        const countries=[...new Set(registry.map(s=>s.country))];
        box.innerHTML='<label for="av-source-region">Explore official funding and research portals</label> <select id="av-source-region"><option value="">All regions</option>'+countries.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')+'</select><div id="av-source-links" class="av-source-links"></div>';
        const select=document.getElementById('av-source-region'), links=document.getElementById('av-source-links');
        const render=()=>{links.innerHTML=registry.filter(s=>!select.value||s.country===select.value).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(s.name)}</strong><small>${esc(s.country)} · ${esc(s.category)} · Official source ↗</small></a>`).join('')};
        select.addEventListener('change',render);render();
      }
    } catch(err) { if(status)status.textContent='Curated opportunities remain available. Automated updates and source directory require the published site or a local web server.'; }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
