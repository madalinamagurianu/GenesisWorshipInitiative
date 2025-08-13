// assets/js/suggestions.js
import { supabase } from './supabaseClient.js';
const $ = (s,r=document)=>r.querySelector(s);

const el = {
  teamForm: $('[data-team-form]'),
  teamFilter: $('[data-team-filter]'),
  teamBody: $('[data-team-body]'),
  leadForm: $('[data-lead-form]'),
  leadBody: $('[data-lead-body]'),
  genForm: $('[data-gen-form]'),
  genList: $('[data-gen-list]'),
};

function toast(m){ console.log('[suggestions]', m); }

async function loadTeam(filter='all'){
  let q = supabase.from('suggestions_team').select('*').order('created_at',{ascending:false});
  if (filter!=='all') q = q.eq('status', filter);
  const { data, error } = await q;
  if (error){ toast(error.message); return []; }
  return data||[];
}

async function renderTeam() {
  const filter = el.teamFilter?.value || 'all';
  const rows = await loadTeam(filter);
  el.teamBody.innerHTML = '';
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.title}</td>
      <td>${r.key||''}</td>
      <td>
        ${r.resources?.youtube ? `<a href="${r.resources.youtube}" target="_blank">YT</a>`:''}
        ${r.resources?.audio ? ` | <a href="${r.resources.audio}" target="_blank">Audio</a>`:''}
        ${r.resources?.harmony ? ` | <a href="${r.resources.harmony}" target="_blank">Harmony</a>`:''}
      </td>
      <td>${r.status}</td>
      <td>${r.comments||''}</td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
    `;
    el.teamBody.appendChild(tr);
  });
}

el.teamFilter?.addEventListener('change', renderTeam);

el.teamForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(el.teamForm);
  const payload = {
    title: fd.get('title')?.toString() || '',
    key: fd.get('key')?.toString() || null,
    resources: {
      youtube: fd.get('youtube')?.toString() || null,
      audio: fd.get('audio')?.toString() || null,
      harmony: fd.get('harmony')?.toString() || null
    },
    status: 'pending',
    comments: fd.get('comments')?.toString() || null
  };
  const { error } = await supabase.from('suggestions_team').insert(payload);
  if (error) toast(error.message);
  el.teamForm.reset();
  renderTeam();
});

// Leader proposals
async function renderLeader(){
  const { data, error } = await supabase.from('leader_proposals').select('*').order('created_at',{ascending:false});
  if (error){ toast(error.message); return; }
  el.leadBody.innerHTML = '';
  (data||[]).forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.title}</td>
      <td>${r.key||''}</td>
      <td>${r.resources?.youtube ? `<a href="${r.resources.youtube}" target="_blank">YT</a>`:''}</td>
      <td>${r.status}</td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
    `;
    el.leadBody.appendChild(tr);
  });
}

el.leadForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(el.leadForm);
  const payload = {
    title: fd.get('title')?.toString() || '',
    key: fd.get('key')?.toString() || null,
    resources: { youtube: fd.get('youtube')?.toString() || null },
    status: 'pending'
  };
  const { error } = await supabase.from('leader_proposals').insert(payload);
  if (error) toast(error.message);
  el.leadForm.reset();
  renderLeader();
});

// General suggestions (ideas)
async function renderGeneral(){
  const { data, error } = await supabase.from('general_suggestions').select('*').order('created_at',{ascending:false});
  if (error){ toast(error.message); return; }
  el.genList.innerHTML = '';
  (data||[]).forEach(g=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<h3>${g.title}</h3><p>${g.content||''}</p><small>${new Date(g.created_at).toLocaleString()}</small>`;
    el.genList.appendChild(div);
  });
}

el.genForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(el.genForm);
  const payload = {
    title: fd.get('title')?.toString() || '',
    content: fd.get('content')?.toString() || '',
  };
  const { error } = await supabase.from('general_suggestions').insert(payload);
  if (error) toast(error.message);
  el.genForm.reset();
  renderGeneral();
});

(async function init(){
  await renderTeam();
  await renderLeader();
  await renderGeneral();
})();
