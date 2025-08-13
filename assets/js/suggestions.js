// TODO: suggestions tables & forms
// assets/js/suggestions.js
import { supa } from './app.js';

const els = {
  teamForm: document.querySelector('[data-team-form]'),
  teamBody: document.querySelector('[data-team-body]'),
  teamFilter: document.querySelector('[data-team-filter]'),

  leadForm: document.querySelector('[data-lead-form]'),
  leadBody: document.querySelector('[data-lead-body]'),

  genForm: document.querySelector('[data-gen-form]'),
  genList: document.querySelector('[data-gen-list]'),
};

function statusBadge(s) {
  const map = { pending:'gray', in_progress:'amber', finalized:'green', rejected:'red' };
  return `<span class="chip ${map[s]||'gray'}">${s.replace('_',' ')}</span>`;
}

// TEAM
async function loadTeam() {
  let q = supa.from('suggestions_team')
    .select('id,title,key,resources,status,comments,submitted_by,created_at,edited_at')
    .order('created_at',{ascending:false});
  const f = els.teamFilter.value;
  if (f !== 'all') q = q.eq('status', f);
  const { data } = await q;
  els.teamBody.innerHTML = (data||[]).map(r => `
    <tr data-id="${r.id}">
      <td>${r.title}</td>
      <td>${r.key||''}</td>
      <td>
        ${r.resources?.youtube?`<a href="${r.resources.youtube}" target="_blank">YouTube</a>`:''}
        ${r.resources?.audio?` • <a href="${r.resources.audio}" target="_blank">Audio</a>`:''}
        ${r.resources?.harmony?` • <a href="${r.resources.harmony}" target="_blank">Harmony</a>`:''}
      </td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.comments||''}</td>
      <td class="muted">${new Date(r.created_at).toLocaleDateString()}${r.edited_at?' • edited':''}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="muted p-3">No suggestions yet.</td></tr>`;
}
els.teamFilter?.addEventListener('change', loadTeam);

els.teamForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(els.teamForm);
  const { data:{ user } } = await supa.auth.getUser();
  await supa.from('suggestions_team').insert([{
    title: fd.get('title'),
    key: fd.get('key')||null,
    resources: {
      youtube: fd.get('youtube')||null,
      audio: fd.get('audio')||null,
      harmony: fd.get('harmony')||null
    },
    status: 'pending',
    comments: fd.get('comments')||null,
    submitted_by: user?.id
  }]);
  els.teamForm.reset();
  loadTeam();
});

// LEADER
async function loadLeader() {
  const { data } = await supa.from('leader_proposals')
    .select('id,title,key,resources,status,created_at')
    .order('created_at',{ascending:false});
  els.leadBody.innerHTML = (data||[]).map(r => `
    <tr>
      <td>${r.title}</td>
      <td>${r.key||''}</td>
      <td>
        ${r.resources?.youtube?`<a href="${r.resources.youtube}" target="_blank">YouTube</a>`:''}
        ${r.resources?.audio?` • <a href="${r.resources.audio}" target="_blank">Audio</a>`:''}
        ${r.resources?.harmony?` • <a href="${r.resources.harmony}" target="_blank">Harmony</a>`:''}
      </td>
      <td>${statusBadge(r.status)}</td>
      <td class="muted">${new Date(r.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="muted p-3">No leader proposals.</td></tr>`;
}
els.leadForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(els.leadForm);
  await supa.from('leader_proposals').insert([{
    title: fd.get('title'),
    key: fd.get('key')||null,
    resources: {
      youtube: fd.get('youtube')||null,
      audio: fd.get('audio')||null,
      harmony: fd.get('harmony')||null
    },
    status: 'pending'
  }]);
  els.leadForm.reset();
  loadLeader();
});

// GENERAL
async function loadGeneral() {
  const { data } = await supa.from('general_suggestions')
    .select('id,title,content,attachments,submitted_by,created_at')
    .order('created_at', { ascending:false });
  els.genList.innerHTML = (data||[]).map(r => `
    <article class="card">
      <h4>${r.title}</h4>
      <p>${r.content||''}</p>
      <footer class="muted">${new Date(r.created_at).toLocaleString()}</footer>
    </article>
  `).join('') || `<div class="muted p-3">No general suggestions.</div>`;
}
els.genForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(els.genForm);
  const { data:{ user } } = await supa.auth.getUser();
  await supa.from('general_suggestions').insert([{
    title: fd.get('title'),
    content: fd.get('content')||null,
    attachments: null,
    submitted_by: user?.id
  }]);
  els.genForm.reset();
  loadGeneral();
});

function init(){
  loadTeam(); loadLeader(); loadGeneral();
}
init();
