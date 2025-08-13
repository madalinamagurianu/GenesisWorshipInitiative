// assets/js/availability.js
import { supabase } from './supabaseClient.js';
const $ = (sel, root=document) => root.querySelector(sel);
const el = { tbody: $('[data-av-body]') };

function fmtDate(d){ return new Date(d).toLocaleDateString(); }
function toast(m){ console.log('[availability]', m); }

async function loadMyId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function loadRows(myId) {
  const { data, error } = await supabase
    .from('availability')
    .select('id, service_date, status, note')
    .order('service_date');
  if (error) { toast(error.message); return []; }
  // In UI we’ll show all dates; editing restricted by RLS (you can edit only yours)
  return data;
}

function render(rows) {
  el.tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = fmtDate(r.service_date);
    tr.appendChild(tdDate);

    const tdStatus = document.createElement('td');
    const sel = document.createElement('select');
    sel.innerHTML = `
      <option value="available">Available</option>
      <option value="maybe">Maybe</option>
      <option value="unavailable">Unavailable</option>
    `;
    sel.value = r.status || 'maybe';
    sel.addEventListener('change', async () => {
      const { error } = await supabase.from('availability').update({ status: sel.value }).eq('id', r.id);
      if (error) toast(error.message);
    });
    tdStatus.appendChild(sel);
    tr.appendChild(tdStatus);

    const tdNote = document.createElement('td');
    const note = document.createElement('input');
    note.value = r.note || '';
    note.placeholder = 'Comments…';
    note.addEventListener('change', async () => {
      const { error } = await supabase.from('availability').update({ note: note.value }).eq('id', r.id);
      if (error) toast(error.message);
    });
    tdNote.appendChild(note);
    tr.appendChild(tdNote);

    el.tbody.appendChild(tr);
  });
}

(async function init() {
  const myId = await loadMyId();
  const rows = await loadRows(myId);
  render(rows);
})();
