// TODO: availability CRUD
// assets/js/availability.js
import { supa } from './app.js';

const tbody = document.querySelector('[data-av-body]');

async function getDates() {
  // Next 12 Sundays + any playlist.service_date within that range
  const today = new Date();
  const dates = [];
  const add = d => { const s = d.toISOString().slice(0,10); if (!dates.includes(s)) dates.push(s); };

  // Sundays
  let d = new Date(today);
  while (dates.length < 12) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) add(new Date(d));
  }

  // Playlists
  const until = dates[dates.length-1];
  const { data: pls } = await supa.from('playlists')
    .select('service_date').gte('service_date', today.toISOString().slice(0,10)).lte('service_date', until);
  (pls||[]).forEach(p => add(new Date(p.service_date)));

  return dates.sort();
}

async function load() {
  const { data: { user } } = await supa.auth.getUser();
  const uid = user?.id;
  if (!uid) return;

  const dates = await getDates();
  const { data: recs } = await supa.from('availability')
    .select('service_date,status,note').eq('user_id', uid);

  const map = new Map((recs||[]).map(r => [r.service_date, r]));
  tbody.innerHTML = dates.map(s => {
    const r = map.get(s);
    return `
      <tr data-date="${s}">
        <td>${new Date(s).toLocaleDateString()}</td>
        <td>
          <select data-status>
            <option value="" ${!r?.status?'selected':''}>—</option>
            <option value="available" ${r?.status==='available'?'selected':''}>Available</option>
            <option value="maybe" ${r?.status==='maybe'?'selected':''}>Maybe</option>
            <option value="unavailable" ${r?.status==='unavailable'?'selected':''}>Unavailable</option>
          </select>
        </td>
        <td><input class="input" data-note value="${r?.note||''}"></td>
      </tr>
    `;
  }).join('');
}

tbody?.addEventListener('change', async (e) => {
  const tr = e.target.closest('tr[data-date]'); if (!tr) return;
  const sdate = tr.dataset.date;
  const status = tr.querySelector('[data-status]').value || null;
  const note = tr.querySelector('[data-note]').value || null;

  const { data: { user } } = await supa.auth.getUser();
  const uid = user?.id;
  await supa.from('availability').upsert({
    user_id: uid, service_date: sdate, status, note
  }, { onConflict: 'user_id,service_date' });
});

load();
