(()=>{'use strict';
const gallery=document.getElementById('av-cv-gallery');if(!gallery)return;
const designs=[
{id:'academic',name:'Academic Research',desc:'PhD · postdoc · publications',group:'research',cls:'av-style-academic',sections:['EDUCATION','RESEARCH EXPERIENCE','PUBLICATIONS']},
{id:'australian',name:'Australian Professional',desc:'Research · employment · referees',group:'professional',cls:'av-style-australian',sections:['PROFILE','EXPERIENCE','EDUCATION']},
{id:'us',name:'US Résumé',desc:'Internships · industry · concise',group:'professional',cls:'av-style-us',sections:['EDUCATION','EXPERIENCE','SKILLS']},
{id:'uk',name:'UK Graduate',desc:'Graduate roles · master’s',group:'professional',cls:'av-style-uk',sections:['PROFILE','EDUCATION','EXPERIENCE']},
{id:'european',name:'European Minimal',desc:'Europe · clear chronology',group:'europe',cls:'av-style-european',sections:['PROFILE','EXPERIENCE','EDUCATION']},
{id:'scholarship',name:'Scholarship Student',desc:'Bachelor’s · master’s · awards',group:'scholarship',cls:'av-style-scholarship',sections:['EDUCATION','AWARDS','PROJECTS']}
];
const preview=document.getElementById('cvprev'),filter=document.getElementById('av-cv-filter'),status=document.getElementById('av-cv-style-status');
let selected='academic';try{selected=localStorage.getItem('av-cv-style')||'academic'}catch(e){}if(!designs.some(d=>d.id===selected))selected='academic';
function apply(id){const d=designs.find(x=>x.id===id);if(!d)return;selected=id;preview.className='av-cv-paper '+d.cls;gallery.querySelectorAll('button[data-style]').forEach(b=>{const active=b.dataset.style===id;b.setAttribute('aria-pressed',String(active));b.classList.toggle('selected',active)});status.textContent='Selected: '+d.name+'. Edit your information below; the preview changes as you type.';try{localStorage.setItem('av-cv-style',id)}catch(e){} }
designs.forEach(d=>{const card=document.createElement('button');card.type='button';card.className='av-cv-choice';card.dataset.style=d.id;card.dataset.group=d.group;card.setAttribute('aria-pressed','false');const sample=document.createElement('div');sample.className='av-cv-mini '+d.cls;sample.innerHTML='<div class="av-cv-mini-name">YOUR NAME</div><div class="av-cv-mini-contact">email · location</div>'+d.sections.map(s=>'<div class="av-cv-mini-section">'+s+'</div><div class="av-cv-mini-line"></div>').join('');const title=document.createElement('strong');title.textContent=d.name;const desc=document.createElement('span');desc.textContent=d.desc;card.append(sample,title,desc);card.addEventListener('click',()=>{apply(d.id);document.getElementById('cvfields')?.scrollIntoView({behavior:'smooth',block:'start'});});gallery.append(card)});
filter.addEventListener('change',()=>{gallery.querySelectorAll('button[data-style]').forEach(b=>{b.hidden=filter.value!=='all'&&b.dataset.group!==filter.value})});
document.getElementById('av-cv-browse')?.addEventListener('click',()=>{document.getElementById('cvtemplates').scrollIntoView({behavior:'smooth',block:'start'});gallery.querySelector('button[data-style="'+selected+'"]')?.focus({preventScroll:true})});
apply(selected);
})();