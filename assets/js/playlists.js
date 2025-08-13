// assets/js/playlists.js
import { supabase } from './supabaseClient.js';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const el = {
  tabs: $('[data-pl-tabs]'),
  rail: $('[data-pl-rail]'),
  title: $('[data-pl-title]'),
  date: $('[data-pl-date]'),
  mdPicker: $('[data-md-picker]'),
  followMD: $('[data-follow-md]'),
  addRow: $('[data-add-row]'),
  save: $('[data-save]'),
  publish: $('[data-publish]'),
  tbody: $('[data-pl-body]'),
};

let state = {
  currentType: 'sunday',   // 'sunday' | 'holiday' | 'event'
  playlists: [],
  songs: [],
  currentPlaylist: null,   // { id, title, service_date, ... }
  items: [],               // playlist_items rows for current playlist
};

function fmtDate(d){ return new Date(d).toLocaleDateString(); }
function toast(msg){ console.log('[playlists]', msg); }

async function loadSongs() {
  const { data, error } = await supabase
    .from('songs')
    .select('id,title,default_key,bpm,youtube_url,audio_harmony_url,audio_main_url')
    .order('title');
  if (error) { toast(error.message); return; }
  state.songs = data || [];
}

async function loadPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('service_date', { ascending: true });
  if (error) { toast(error.message); return; }
  state.playlists = (data||[]).filter(p => p.type === state.currentType);
  renderRail();
}

function renderRail() {
  el.rail.innerHTML = '';
  state.playlists.forEach(p => {
    const b = document.createElement('button');
    b.className = 'rail-item';
    b.textContent = `${fmtDate(p.service_date)} — ${p.title}`;
    b.addEventListener('click', () => openPlaylist(p.id));
    el.rail.appendChild(b);
  });

  // “Archive” button
  const arch = document.createElement('button');
  arch.className = 'rail-archive';
  arch.textContent = 'Archive';
  arch.addEventListener('click', () => window.location.href = 'archive.html');
  el.rail.appendChild(arch);
}

async function openPlaylist(id) {
  const p = state.playlists.find(x => x.id === id);
  if (!p) return;
  state.currentPlaylist = p;
  el.title.textContent = p.title;
  el.date.textContent = fmtDate(p.service_date);
  await loadItems(p.id);
  renderItems();
}

async function loadItems(playlist_id) {
  const { data, error } = await supabase
    .from('playlist_items')
    .select('id, position, key_override, bpm_override, lead_name, harmony_name, admin_notes, song_id, songs(title,default_key,bpm)')
    .eq('playlist_id', playlist_id)
    .order('position');
  if (error) { toast(error.message); return; }
  state.items = (data||[]).map(r => ({
    id: r.id,
    position: r.position,
    key: r.key_override ?? r.songs?.default_key ?? '',
    bpm: r.bpm_override ?? r.songs?.bpm ?? null,
    title: r.songs?.title ?? '(missing)',
    song_id: r.song_id,
    lead_name: r.lead_name || '',
    harmony_name: r.harmony_name || '',
    admin_notes: r.admin_notes || ''
  }));
}

function renderItems() {
  el.tbody.innerHTML = '';
  state.items.forEach((it, idx) => {
    const tr = document.createElement('tr');

    // Title with searchable select
    const tdTitle = document.createElement('td');
    const sel = document.createElement('select');
    sel.innerHTML = `<option value="">— pick song —</option>` + state.songs.map(s =>
      `<option value="${s.id}" ${s.id===it.song_id?'selected':''}>${s.title}</option>`
    ).join('');
    sel.addEventListener('change', () => {
      const s = state.songs.find(x => x.id === sel.value);
      it.song_id = s?.id || null;
      it.title = s?.title || '';
      if (s) { it.key = s.default_key || ''; it.bpm = s.bpm || null; }
      renderItems();
    });
    tdTitle.appendChild(sel);
    tr.appendChild(tdTitle);

    // Key
    const tdKey = document.createElement('td');
    const keyIn = document.createElement('input');
    keyIn.value = it.key || '';
    keyIn.addEventListener('input', () => it.key = keyIn.value);
    tdKey.appendChild(keyIn);
    tr.appendChild(tdKey);

    // BPM
    const tdBpm = document.createElement('td');
    const bpmIn = document.createElement('input');
    bpmIn.type = 'number';
    bpmIn.value = it.bpm ?? '';
    bpmIn.addEventListener('input', () => it.bpm = bpmIn.value ? parseInt(bpmIn.value,10) : null);
    tdBpm.appendChild(bpmIn);
    tr.appendChild(tdBpm);

    // Lead
    const tdLead = document.createElement('td');
    const leadIn = document.createElement('input');
    leadIn.value = it.lead_name;
    leadIn.addEventListener('input', () => it.lead_name = leadIn.value);
    tdLead.appendChild(leadIn);
    tr.appendChild(tdLead);

    // Harmony
    const tdHar = document.createElement('td');
    const harIn = document.createElement('input');
    harIn.value = it.harmony_name;
    harIn.addEventListener('input', () => it.harmony_name = harIn.value);
    tdHar.appendChild(harIn);
    tr.appendChild(tdHar);

    // Notes
    const tdNotes = document.createElement('td');
    const nIn = document.createElement('input');
    nIn.value = it.admin_notes;
    nIn.addEventListener('input', () => it.admin_notes = nIn.value);
    tdNotes.appendChild(nIn);
    tr.appendChild(tdNotes);

    // Reorder/remove
    const tdAct = document.createElement('td');
    const up = document.createElement('button'); up.textContent = '↑';
    const dn = document.createElement('button'); dn.textContent = '↓';
    const rm = document.createElement('button'); rm.textContent = '✕';
    up.addEventListener('click', () => { if (idx>0){ [state.items[idx-1],state.items[idx]]=[state.items[idx],state.items[idx-1]]; reindex(); renderItems(); }});
    dn.addEventListener('click', () => { if (idx<state.items.length-1){ [state.items[idx+1],state.items[idx]]=[state.items[idx],state.items[idx+1]]; reindex(); renderItems(); }});
    rm.addEventListener('click', () => { state.items.splice(idx,1); reindex(); renderItems(); });
    tdAct.append(up,dn,rm);
    tr.appendChild(tdAct);

    el.tbody.appendChild(tr);
  });
}

function reindex(){ state.items.forEach((it,i)=> it.position = i+1); }

el.addRow?.addEventListener('click', () => {
  state.items.push({
    id: null,
    position: state.items.length + 1,
    key: '',
    bpm: null,
    title: '',
    song_id: null,
    lead_name: '',
    harmony_name: '',
    admin_notes: ''
  });
  renderItems();
});

el.save?.addEventListener('click', async () => {
  if (!state.currentPlaylist) return;
  // Upsert each row
  for (const it of state.items) {
    const payload = {
      playlist_id: state.currentPlaylist.id,
      position: it.position,
      song_id: it.song_id,
      key_override: it.key || null,
      bpm_override: it.bpm ?? null,
      lead_name: it.lead_name || null,
      harmony_name: it.harmony_name || null,
      admin_notes: it.admin_notes || null
    };
    if (it.id) {
      const { error } = await supabase.from('playlist_items').update(payload).eq('id', it.id);
      if (error) { toast(error.message); return; }
    } else {
      const { data, error } = await supabase.from('playlist_items').insert(payload).select('id').single();
      if (error) { toast(error.message); return; }
      it.id = data.id;
    }
  }
  toast('Saved playlist items.');
});

el.publish?.addEventListener('click', async () => {
  if (!state.currentPlaylist) return;
  // confirm notify?
  const doNotify = confirm('Notify team now about this playlist?');
  const { error } = await supabase
    .from('playlists')
    .update({ status: 'published', last_notification_sent_at: doNotify ? new Date().toISOString() : null })
    .eq('id', state.currentPlaylist.id);
  if (error) { toast(error.message); return; }
  toast('Playlist published.');
  if (doNotify) {
    // (Optional) insert notifications per user later
    toast('Notifications would be sent (in-app).');
  }
});

el.tabs?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tab]');
  if (!btn) return;
  state.currentType = btn.getAttribute('data-tab'); // sunday | holiday | event
  state.currentPlaylist = null;
  el.title.textContent = '';
  el.date.textContent = '';
  el.tbody.innerHTML = '';
  loadPlaylists();
});

(async function init(){
  await loadSongs();
  await loadPlaylists();
})();
