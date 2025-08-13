// assets/js/admin.js
import { supabase } from './supabaseClient.js';
const $ = (s,r=document)=>r.querySelector(s);

const el = {
  usersBody: $('[data-users-body]'),
  holForm: $('[data-hol-form]'),
  holBody: $('[data-hol-body]'),
};

function toast(m){ console.log('[admin]', m); }

async function renderUsers() {
  const { data, error } = await supabase.from('profiles').select('id,full_name,email,role_type,preferred_language,preferred_template').order('full_name');
  if (error){ toast(error.message); return; }
  el.usersBody.innerHTML = '';
  (data||[]).forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.full_name || u.email}</td>
      <td>${u.email}</td>
      <td>
        <select data-role>
          ${['admin','md','editor','tech','member','visitor','custom'].map(r =>
            `<option value="${r}" ${u.role_type===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </td>
      <td>${u.preferred_language||'ro'}</td>
      <td>${u.preferred_template||'lyrics_chords'}</td>
    `;
    const roleSel = tr.querySelector('[data-role]');
    roleSel.addEventListener('change', async ()=>{
      const { error } = await supabase.from('profiles').update({ role_type: roleSel.value }).eq('id', u.id);
      if (error) toast(error.message);
    });
    el.usersBody.appendChild(tr);
  });
}

async function renderHolidays() {
  const { data, error } = await supabase.from('holidays').select('*').order('date');
  if (error){ toast(error.message); return; }
  el.holBody.innerHTML = '';
  (data||[]).forEach(h=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${h.name}</td>
      <td>${new Date(h.date).toLocaleDateString()}</td>
      <td>${h.service_time || ''}</td>
      <td>
        <button data-pl>${h.playlist_id ? 'Edit Playlist' : 'Create Playlist'}</button>
      </td>
    `;
    tr.querySelector('[data-pl]').addEventListener('click', async ()=>{
      // Ensure (or create) a holiday playlist for that date
      const { data: pl, error: e1 } = await supabase
        .from('playlists')
        .select('id')
        .eq('type','holiday').eq('holiday_id', h.id).single();
      if (pl?.id) {
        window.location.href = `playlists.html#holiday:${pl.id}`;
      } else {
        const { data: newPl, error: e2 } = await supabase.from('playlists').insert({
          title: h.name,
          service_date: h.date,
          type: 'holiday',
          status: 'draft',
          holiday_id: h.id
        }).select('id').single();
        if (e2) return toast(e2.message);
        window.location.href = `playlists.html#holiday:${newPl.id}`;
      }
    });
    el.holBody.appendChild(tr);
  });
}

el.holForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(el.holForm);
  const payload = {
    name: fd.get('name')?.toString() || '',
    date: fd.get('date')?.toString(),
    service_time: fd.get('service_time')?.toString() || null,
  };
  const { error } = await supabase.from('holidays').insert(payload);
  if (error) toast(error.message);
  el.holForm.reset();
  renderHolidays();
});

(async function init(){
  await renderUsers();
  await renderHolidays();
})();
