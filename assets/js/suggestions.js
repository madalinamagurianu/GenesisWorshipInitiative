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
// /js/suggestions.js
/* global supabase */

const form = document.getElementById('new-suggestion-form');
const formStatus = document.getElementById('form-status');

const teamBody = document.getElementById('team-body');
const teamFilters = document.getElementById('team-status-filters');

const leaderBody = document.getElementById('leader-body');
const leaderFilters = document.getElementById('leader-status-filters');

const generalForm = document.getElementById('general-form');
const generalStatus = document.getElementById('general-status');
const generalFeed = document.getElementById('general-feed');

// Helper renderers
function linkify(url, label) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return `<a href="${u.href}" target="_blank" rel="noopener">${label || u.hostname}</a>`;
  } catch {
    return '';
  }
}
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

/* ---------------- Team Suggestions ---------------- */
let teamFilter = 'all';

async function loadTeam() {
  teamBody.innerHTML = `<tr><td colspan="6" class="muted">Loading…</td></tr>`;
  let q = supabase.from('suggestions_team').select('*').order('created_at', { ascending: false });

  if (teamFilter !== 'all') q = q.eq('status', teamFilter);

  const { data, error } = await q;
  if (error) {
    teamBody.innerHTML = `<tr><td colspan="6" class="muted">Error: ${error.message}</td></tr>`;
    return;
  }
  if (!data || !data.length) {
    teamBody.innerHTML = `<tr><td colspan="6" class="muted">No suggestions yet.</td></tr>`;
    return;
  }

  teamBody.innerHTML = data.map(row => {
    const r = row.resources || {};
    const res = [
      linkify(r.youtube, 'YouTube'),
      linkify(r.audio, 'Audio'),
      linkify(r.harmony, 'Harmony')
    ].filter(Boolean).join(' • ');

    const edited = row.edited_at ? ` <span class="muted">(edited)</span>` : '';
    const sub = row.submitted_by ? `${row.submitted_by.slice(0,8)}…` : '—';
    return `
      <tr>
        <td>${row.title || ''}</td>
        <td>${row.key || ''}</td>
        <td>${res || ''}</td>
        <td>${row.status || ''}</td>
        <td>${fmtDate(row.created_at)}<br><span class="muted">by ${sub}${edited}</span></td>
        <td><button class="btn btn-sm" data-edit="${row.id}">Edit</button></td>
      </tr>
    `;
  }).join('');
}

teamFilters.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  [...teamFilters.querySelectorAll('.chip')].forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  teamFilter = chip.dataset.status;
  loadTeam();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formStatus.textContent = 'Saving…';

  const fd = new FormData(form);
  const title = fd.get('title')?.trim();
  const key = (fd.get('key') || '').trim();
  const resources = {
    youtube: (fd.get('youtube') || '').trim(),
    audio: (fd.get('audio_main') || '').trim(),
    harmony: (fd.get('audio_harmony') || '').trim(),
  };
  const comments = (fd.get('comments') || '').trim();

  const { data: user } = await supabase.auth.getUser();
  const submitted_by = user?.user?.id || null;

  const { error } = await supabase.from('suggestions_team').insert({
    title,
    key: key || null,
    resources,
    status: 'pending',
    comments: comments || null,
    submitted_by,
  });

  if (error) {
    formStatus.textContent = 'Error: ' + error.message;
    return;
  }
  form.reset();
  formStatus.textContent = 'Saved!';
  loadTeam();
});

/* ---------------- Leader Proposals ---------------- */
let leaderFilter = 'all';

async function loadLeader() {
  leaderBody.innerHTML = `<tr><td colspan="5" class="muted">Loading…</td></tr>`;
  let q = supabase.from('leader_proposals').select('*').order('created_at', { ascending: false });
  if (leaderFilter !== 'all') q = q.eq('status', leaderFilter);
  const { data, error } = await q;
  if (error) {
    leaderBody.innerHTML = `<tr><td colspan="5" class="muted">Error: ${error.message}</td></tr>`;
    return;
  }
  if (!data || !data.length) {
    leaderBody.innerHTML = `<tr><td colspan="5" class="muted">No leader proposals.</td></tr>`;
    return;
  }
  leaderBody.innerHTML = data.map(row => {
    const r = row.resources || {};
    const res = [linkify(r.youtube,'YouTube'), linkify(r.audio,'Audio'), linkify(r.harmony,'Harmony')].filter(Boolean).join(' • ');
    return `
      <tr>
        <td>${row.title || ''}</td>
        <td>${row.key || ''}</td>
        <td>${res || ''}</td>
        <td>${row.status || ''}</td>
        <td>${fmtDate(row.created_at)}</td>
      </tr>
    `;
  }).join('');
}

leaderFilters.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  [...leaderFilters.querySelectorAll('.chip')].forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  leaderFilter = chip.dataset.status;
  loadLeader();
});

/* ---------------- General Suggestions Feed ---------------- */
async function loadGeneral() {
  generalFeed.innerHTML = `<div class="muted">Loading…</div>`;
  const { data, error } = await supabase
    .from('general_suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    generalFeed.innerHTML = `<div class="muted">Error: ${error.message}</div>`;
    return;
  }
  if (!data || !data.length) {
    generalFeed.innerHTML = `<div class="muted">No posts yet.</div>`;
    return;
  }

  generalFeed.innerHTML = data.map(row => `
    <div class="card pad" style="padding:.75rem;">
      <div style="font-weight:600; color:#263839;">${row.title || ''}</div>
      <div class="muted" style="font-size:.85rem; margin:.15rem 0 .4rem;">${fmtDate(row.created_at)}</div>
      <div>${(row.content || '').replace(/\n/g,'<br>')}</div>
    </div>
  `).join('');
}

generalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  generalStatus.textContent = 'Posting…';
  const fd = new FormData(generalForm);
  const title = fd.get('title')?.trim();
  const content = (fd.get('content') || '').trim();
  const { data: user } = await supabase.auth.getUser();
  const submitted_by = user?.user?.id || null;

  const { error } = await supabase.from('general_suggestions').insert({
    title,
    content,
    submitted_by
  });
  if (error) {
    generalStatus.textContent = 'Error: ' + error.message;
    return;
  }
  generalForm.reset();
  generalStatus.textContent = 'Posted!';
  loadGeneral();
});

/* ---------------- Init ---------------- */
loadTeam();
loadLeader();
loadGeneral();
