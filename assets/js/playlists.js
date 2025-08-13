// TODO: wire playlists CRUD per spec
// assets/js/playlists.js
import { supa } from './app.js';

const els = {
  tabs: document.querySelector('[data-pl-tabs]'),
  rail: document.querySelector('[data-pl-rail]'),
  archiveBtn: document.querySelector('[data-archive]'),
  tableBody: document.querySelector('[data-pl-body]'),
  addRowBtn: document.querySelector('[data-add-row]'),
  saveBtn: document.querySelector('[data-save]'),
  publishBtn: document.querySelector('[data-publish]'),
  mdPicker: document.querySelector('[data-md-picker]'),
  followToggle: document.querySelector('[data-follow-md]'),
  titleEl: document.querySelector('[data-pl-title]'),
  dateEl: document.querySelector('[data-pl-date]'),
};

let currentType = 'sunday'; // 'sunday' | 'holiday' | 'event'
let playlists = [];
let currentPlaylist = null;
let songsIndex = [];
let user = null;

async function me() {
  const { data: { user: u } } = await supa.auth.getUser();
  user = u;
}

function isAdmin(profile) {
  return profile?.role_type === 'admin';
}

async function myProfile() {
  const { data } = await supa.from('profiles').select('*').eq('id', user?.id).single();
  return data;
}

async function loadSongsIndex() {
  const { data, error } = await supa
    .from('songs')
    .select('id,title,default_key,bpm,youtube_url,audio_main_url,audio_harmony_url')
    .order('title');
  if (!error) songsIndex = data || [];
}

async function loadRail() {
  const { data, error } = await supa
    .from('playlists')
    .select('id,title,service_date,type,status')
    .gte('service_date', new Date().toISOString().slice(0,10))
    .order('service_date', { ascending: true });

  if (error) return;
  playlists = (data || []).filter(p => p.type === currentType);
  els.rail.innerHTML = playlists.map(p => `
    <button class="rail-item" data-open="${p.id}">
      <span>${new Date(p.service_date).toLocaleDateString()}</span>
      <strong>${p.title || '(Untitled)'}</strong>
      <em class="${p.status}">${p.status}</em>
    </button>
  `).join('') || `<div class="muted p-3">No ${currentType} playlists yet.</div>`;
}

async function openPlaylist(id) {
  const { data: p } = await supa.from('playlists')
    .select('id,title,service_date,type,status,md_user_id')
    .eq('id', id).single();

  currentPlaylist = p;

  els.titleEl.textContent = p.title || '(Untitled)';
  els.dateEl.textContent = new Date(p.service_date).toLocaleDateString();

  // MD picker (admin only)
  const profile = await myProfile();
  const admin = isAdmin(profile);
  els.mdPicker.closest('[data-md-wrap]').style.display = admin ? '' : 'none';

  const { data: allUsers } = await supa.from('profiles').select('id,full_name');
  els.mdPicker.innerHTML = `<option value="">(no MD)</option>` + (allUsers||[])
    .map(u => `<option value="${u.id}" ${u.id===p.md_user_id?'selected':''}>${u.full_name||u.id}</option>`).join('');

  // Load items
  const { data: items } = await supa.from('playlist_items')
    .select('id,position,song_id,key_override,bpm_override,lead_name,harmony_name,admin_notes, songs!inner(id,title,default_key,bpm)')
    .eq('playlist_id', id)
    .order('position');

  renderTable(items || []);
}

function renderTable(items) {
  els.tableBody.innerHTML = items.map((it, idx) => {
    const title = it.songs?.title || '';
    const key = it.key_override ?? it.songs?.default_key ?? '';
    const bpm = it.bpm_override ?? it.songs?.bpm ?? '';
    return `
      <tr data-row="${it.id}">
        <td>
          <div class="typeahead">
            <input type="text" class="ta-input" value="${title}" placeholder="Search song…" data-ta="${it.id}">
            <div class="ta-list" data-ta-list="${it.id}" hidden></div>
          </div>
        </td>
        <td><input class="input" value="${key||''}" data-key="${it.id}"></td>
        <td><input class="input" value="${bpm||''}" data-bpm="${it.id}"></td>
        <td><input class="input" value="${it.lead_name||''}" data-lead="${it.id}"></td>
        <td><input class="input" value="${it.harmony_name||''}" data-harmony="${it.id}"></td>
        <td><input class="input" value="${it.admin_notes||''}" data-notes="${it.id}"></td>
        <td class="nowrap">
          <button class="btn btn-ghost" data-up="${it.id}">↑</button>
          <button class="btn btn-ghost" data-down="${it.id}">↓</button>
          <button class="btn btn-ghost danger" data-del="${it.id}">✕</button>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="7" class="muted p-3">Add songs to this playlist.</td></tr>`;

  wireTypeaheads(items);
}

function wireTypeaheads(items) {
  // Simple client-side typeahead
  items.forEach(it => {
    const input = document.querySelector(`[data-ta="${it.id}"]`);
    const list = document.querySelector(`[data-ta-list="${it.id}"]`);
    input?.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { list.hidden = true; return; }
      const filtered = songsIndex.filter(s => s.title.toLowerCase().includes(q)).slice(0,8);
      list.innerHTML = filtered.map(s => `<button data-pick="${it.id}" data-song="${s.id}">${s.title}</button>`).join('');
      list.hidden = filtered.length === 0;
    });
    list?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-pick]');
      if (!btn) return;
      const songId = btn.dataset.song;
      // Update row with selected song + prefill key/bpm
      const song = songsIndex.find(s => s.id === songId);
      input.value = song?.title || '';
      document.querySelector(`[data-key="${it.id}"]`).value = song?.default_key || '';
      document.querySelector(`[data-bpm="${it.id}"]`).value = song?.bpm ?? '';
      list.hidden = true;

      await supa.from('playlist_items').update({ song_id: songId }).eq('id', it.id);
    });
  });
}

function nextPos(rows){ return (rows?.length||0)+1; }

els.addRowBtn?.addEventListener('click', async () => {
  if (!currentPlaylist) return;
  const { data: rows } = await supa.from('playlist_items').select('id').eq('playlist_id', currentPlaylist.id);
  const { data, error } = await supa.from('playlist_items').insert([{
    playlist_id: currentPlaylist.id,
    position: nextPos(rows)
  }]).select().single();
  if (!error) openPlaylist(currentPlaylist.id);
});

els.tableBody?.addEventListener('click', async (e) => {
  const up = e.target.closest('[data-up]');
  const down = e.target.closest('[data-down]');
  const del = e.target.closest('[data-del]');
  if (!currentPlaylist) return;

  // Fetch current rows to reorder
  if (up || down) {
    const id = up?.dataset.up || down?.dataset.down;
    let { data: items } = await supa.from('playlist_items')
      .select('id,position').eq('playlist_id', currentPlaylist.id).order('position');
    const idx = items.findIndex(r => r.id === id);
    if (idx === -1) return;
    const swapWith = up ? idx-1 : idx+1;
    if (swapWith < 0 || swapWith >= items.length) return;
    const a = items[idx], b = items[swapWith];
    await supa.from('playlist_items').update({ position: b.position }).eq('id', a.id);
    await supa.from('playlist_items').update({ position: a.position }).eq('id', b.id);
    openPlaylist(currentPlaylist.id);
    return;
  }
  if (del) {
    const id = del.dataset.del;
    await supa.from('playlist_items').delete().eq('id', id);
    openPlaylist(currentPlaylist.id);
  }
});

els.saveBtn?.addEventListener('click', async () => {
  if (!currentPlaylist) return;

  // Save MD
  const md = els.mdPicker.value || null;
  await supa.from('playlists').update({ md_user_id: md }).eq('id', currentPlaylist.id);

  // Save all row edits
  const rows = [...els.tableBody.querySelectorAll('tr[data-row]')];
  for (const tr of rows) {
    const id = tr.dataset.row;
    const key = tr.querySelector(`[data-key="${id}"]`)?.value || null;
    const bpmRaw = tr.querySelector(`[data-bpm="${id}"]`)?.value || null;
    const bpm = bpmRaw === '' ? null : Number(bpmRaw);
    const lead = tr.querySelector(`[data-lead="${id}"]`)?.value || null;
    const harm = tr.querySelector(`[data-harmony="${id}"]`)?.value || null;
    const note = tr.querySelector(`[data-notes="${id}"]`)?.value || null;

    await supa.from('playlist_items').update({
      key_override: key, bpm_override: bpm, lead_name: lead, harmony_name: harm, admin_notes: note
    }).eq('id', id);
  }

  // Ask if we should apply permanent updates for Key/BPM on Song List
  if (confirm('Apply changed Key/BPM permanently to Song List where different?')) {
    const { data: items } = await supa.from('playlist_items')
      .select('song_id,key_override,bpm_override')
      .eq('playlist_id', currentPlaylist.id);
    for (const it of (items||[])) {
      const updates = {};
      if (it.key_override) updates.default_key = it.key_override;
      if (Number.isInteger(it.bpm_override)) updates.bpm = it.bpm_override;
      if (Object.keys(updates).length) {
        await supa.from('songs').update(updates).eq('id', it.song_id);
      }
    }
  }

  alert('Saved!');
});

els.publishBtn?.addEventListener('click', async () => {
  if (!currentPlaylist) return;
  const notify = confirm('Publish this playlist?\n\nNotify members now?');
  await supa.from('playlists').update({ status: 'published' }).eq('id', currentPlaylist.id);
  if (notify) {
    // Broadcast a simple notification to all users
    const { data: users } = await supa.from('profiles').select('id');
    const payloads = (users||[]).map(u => ({
      user_id: u.id, kind: 'playlist_published',
      payload: { playlist_id: currentPlaylist.id, title: currentPlaylist.title }
    }));
    if (payloads.length) await supa.from('notifications').insert(payloads);
  }
  alert('Published!');
});

// Tabs
els.tabs?.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-tab]');
  if (!btn) return;
  currentType = btn.dataset.tab;
  await loadRail();
  // Auto open first in rail if exists
  const first = playlists[0];
  if (first) openPlaylist(first.id);
  else {
    els.tableBody.innerHTML = `<tr><td colspan="7" class="muted p-3">No ${currentType} playlists.</td></tr>`;
    els.titleEl.textContent = '';
    els.dateEl.textContent = '';
  }
});

els.rail?.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) openPlaylist(open.dataset.open);
});

async function init() {
  await me();
  await loadSongsIndex();
  await loadRail();
  if (playlists[0]) openPlaylist(playlists[0].id);
}

init();
