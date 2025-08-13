// TODO: users, holidays, notifications admin
// assets/js/admin.js
import { supa } from './app.js';

const usersBody = document.querySelector('[data-users-body]');
const holForm = document.querySelector('[data-hol-form]');
const holBody = document.querySelector('[data-hol-body]');

async function loadUsers() {
  const { data } = await supa.from('profiles').select('id,full_name,email,role_type,preferred_language').order('full_name');
  usersBody.innerHTML = (data||[]).map(u => `
    <tr data-id="${u.id}">
      <td>${u.full_name||'(no name)'}<div class="muted">${u.email}</div></td>
      <td><select data-role>
        ${['admin','md','editor','tech','member','visitor','custom'].map(r=>
          `<option value="${r}" ${u.role_type===r?'selected':''}>${r}</option>`).join('')}
      </select></td>
      <td>${u.preferred_language||'ro'}</td>
      <td><button class="btn btn-ghost" data-save-role>Save</button></td>
    </tr>
  `).join('');
}
usersBody?.addEventListener('click', async (e)=>{
  const btn = e.target.closest('[data-save-role]');
  if (!btn) return;
  const tr = btn.closest('tr[data-id]');
  const id = tr.dataset.id;
  const role = tr.querySelector('[data-role]').value;
  await supa.from('profiles').update({ role_type: role }).eq('id', id);
  alert('Role updated.');
});

async function loadHolidays() {
  const { data } = await supa.from('holidays').select('id,name,date,service_time').order('date');
  holBody.innerHTML = (data||[]).map(h=>`
    <tr data-id="${h.id}">
      <td>${h.name}</td>
      <td>${new Date(h.date).toLocaleDateString()}</td>
      <td>${h.service_time || ''}</td>
      <td>
        <button class="btn btn-ghost" data-create-pl>Create/Edit Playlist</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="muted p-3">No holidays.</td></tr>`;
}

holForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(holForm);
  await supa.from('holidays').insert([{
    name: fd.get('name'), date: fd.get('date'), service_time: fd.get('service_time')||null
  }]);
  holForm.reset();
  loadHolidays();
});

holBody?.addEventListener('click', async (e)=>{
  const btn = e.target.closest('[data-create-pl]');
  if (!btn) return;
  const tr = btn.closest('tr[data-id]');
  const id = tr.dataset.id;
  // Ensure a playlist exists for this holiday
  const { data: existing } = await supa.from('playlists')
    .select('id').eq('holiday_id', id).single();
  if (!existing) {
    await supa.from('playlists').insert([{
      title: 'Holiday Service',
      service_date: tr.children[1].textContent.split('/').reverse().join('-'), // safe enough for now
      type: 'holiday',
      status: 'draft',
      holiday_id: id
    }]);
  }
  alert('Holiday playlist ready — open Playlists > Holidays.');
});

function init(){ loadUsers(); loadHolidays(); }
init();
