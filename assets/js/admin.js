// assets/js/admin.js — Admin panel logic
// NOTE: This script is resilient: if a control isn't present in the HTML, it safely skips it.

import { supabase } from './supabaseClient.js';

// ---------- tiny helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const toast = (m) => console.log('[admin]', m);

// ---------- auth guard (admin only) ----------
async function ensureAdmin() {
  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) {
    window.location.href = 'index.html';
    return false;
  }
  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('id, role_type, full_name, email')
    .eq('id', user.id)
    .single();
  if (pErr || !prof) {
    window.location.href = 'index.html';
    return false;
  }
  if (prof.role_type !== 'admin') {
    // not an admin – bounce
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ---------- element hooks (optional) ----------
const el = {
  // Users
  usersBody: $('[data-users-body]'),
  usersSearch: $('[data-users-search]'),
  usersRoleFilter: $('[data-role-filter]'),
  usersActiveOnly: $('[data-active-only]'),

  // Holidays
  holForm: $('[data-hol-form]'),
  holBody: $('[data-hol-body]'),
};

let USERS_CACHE = [];

// ========== USERS ==========
async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role_type, created_at')
    .order('email');
  if (error) throw error;
  USERS_CACHE = data || [];
  return USERS_CACHE;
}

function renderUserRow(u) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="email-cell">${u.email || '-'}</td>
    <td>
      <select data-role class="role-select">
        ${['admin','md','editor','tech','member','visitor','custom']
          .map(r => `<option value="${r}" ${u.role_type===r?'selected':''}>${r}</option>`).join('')}
      </select>
    </td>
    <td class="access-cell">
      <div class="chip-row">
        <button class="btn btn-chip" data-access="playlists" data-user="${u.id}">Playlists</button>
        <button class="btn btn-chip" data-access="editor" data-user="${u.id}">Editor</button>
        <button class="btn btn-chip" data-access="social" data-user="${u.id}">Social</button>
      </div>
    </td>
    <td class="actions-cell">
      <button class="btn btn-primary btn-sm" data-set-md data-user="${u.id}">Set MD</button>
    </td>
  `;

  // role change handler
  tr.querySelector('[data-role]')?.addEventListener('change', async (e) => {
    const role_type = e.currentTarget.value;
    const { error } = await supabase.from('profiles').update({ role_type }).eq('id', u.id);
    if (error) toast(error.message); else toast(`Role for ${u.email} → ${role_type}`);
  });

  // granular access chips (placeholder)
  tr.querySelectorAll('[data-access]').forEach(btn => {
    btn.addEventListener('click', () => {
      toast(`Open granular permissions modal for ${u.email} [${btn.dataset.access}]`);
      // TODO: implement modal wired to user_permissions
    });
  });

  // set MD (placeholder)
  tr.querySelector('[data-set-md]')?.addEventListener('click', () => {
    toast(`Set ${u.email} as MD for next playlist (hook to playlist control/RPC).`);
    // TODO: implement
  });

  return tr;
}

function applyUserFilters(users) {
  const q = (el.usersSearch?.value || '').trim().toLowerCase();
  const role = el.usersRoleFilter?.value || '';
  const activeOnly = !!(el.usersActiveOnly && el.usersActiveOnly.checked);

  let rows = users;
  if (q) rows = rows.filter(u => (u.email||'').toLowerCase().includes(q) || (u.full_name||'').toLowerCase().includes(q));
  if (role) rows = rows.filter(u => u.role_type === role);
  if (activeOnly) rows = rows.filter(u => !!u.email); // trivial placeholder for "active"
  return rows;
}

async function renderUsers() {
  if (!el.usersBody) return;
  if (!USERS_CACHE.length) await fetchUsers();
  const list = applyUserFilters(USERS_CACHE);
  el.usersBody.innerHTML = '';
  list.forEach(u => el.usersBody.appendChild(renderUserRow(u)));
}

// wire filters if present
['input','change'].forEach(evt => {
  el.usersSearch?.addEventListener(evt, () => renderUsers());
  el.usersRoleFilter?.addEventListener(evt, () => renderUsers());
  el.usersActiveOnly?.addEventListener(evt, () => renderUsers());
});

// ========== HOLIDAYS ==========
async function renderHolidays() {
  if (!el.holBody) return;
  const { data, error } = await supabase.from('holidays').select('id, name, date, service_time').order('date');
  if (error) { toast(error.message); return; }

  el.holBody.innerHTML = '';
  (data || []).forEach(h => {
    const tr = document.createElement('tr');
    const dateStr = h.date ? new Date(h.date).toLocaleDateString() : '-';
    const timeStr = h.service_time || '';
    tr.innerHTML = `
      <td>${h.name}</td>
      <td>${dateStr}</td>
      <td>${timeStr}</td>
      <td class="actions-cell">
        <button class="btn btn-primary btn-sm" data-pl>Create/Edit Playlist</button>
        <button class="btn btn-ghost btn-sm" data-del>Delete</button>
      </td>
    `;

    tr.querySelector('[data-pl]')?.addEventListener('click', async () => {
      // open or create a holiday playlist
      const { data: pl, error: e1 } = await supabase
        .from('playlists')
        .select('id')
        .eq('type','holiday')
        .eq('holiday_id', h.id)
        .single();
      if (!e1 && pl?.id) {
        window.location.href = `playlists.html#holiday:${pl.id}`;
        return;
      }
      const { data: newPl, error: e2 } = await supabase
        .from('playlists')
        .insert({ title: h.name, service_date: h.date, type: 'holiday', status: 'draft', holiday_id: h.id })
        .select('id')
        .single();
      if (e2) return toast(e2.message);
      window.location.href = `playlists.html#holiday:${newPl.id}`;
    });

    tr.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!confirm(`Delete holiday “${h.name}”?`)) return;
      const { error: delErr } = await supabase.from('holidays').delete().eq('id', h.id);
      if (delErr) return toast(delErr.message);
      renderHolidays();
    });

    el.holBody.appendChild(tr);
  });
}

// Holiday create form
el.holForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(el.holForm);
  const payload = {
    name: fd.get('name')?.toString() || '',
    date: fd.get('date')?.toString() || null,
    service_time: fd.get('service_time')?.toString() || null,
  };
  const { error } = await supabase.from('holidays').insert(payload);
  if (error) toast(error.message); else toast('Holiday added');
  el.holForm.reset();
  renderHolidays();
});

// ========== INIT ==========
(async function init() {
  const ok = await ensureAdmin();
  if (!ok) return; // redirected
  try {
    await renderUsers();
    await renderHolidays();
  } catch (e) {
    toast(e.message || e);
  }
})();
