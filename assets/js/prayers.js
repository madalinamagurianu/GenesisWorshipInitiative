// TODO: prayer wall with filters & reactions
// assets/js/prayers.js
import { supa } from './app.js';

const form = document.querySelector('[data-pr-form]');
const list = document.querySelector('[data-pr-list]');
const filter = document.querySelector('[data-pr-filter]');
const counter = document.querySelector('[data-pr-counter]');

async function load() {
  let query = supa.from('prayers').select('id,title,content,image_url,answered,created_at');
  if (filter.value === 'answered') query = query.eq('answered', true);
  if (filter.value === 'open') query = query.eq('answered', false);
  const { data } = await query.order('created_at', { ascending: false });

  const { data: all } = await supa.from('prayers').select('id,answered');
  const answered = (all||[]).filter(x => x.answered).length;
  counter.textContent = `${answered} answered`;

  list.innerHTML = (data||[]).map(p => `
    <article class="card">
      <header><strong>${p.title}</strong>
        <label class="switch">
          <input type="checkbox" data-toggle="${p.id}" ${p.answered?'checked':''}> Answered
        </label>
      </header>
      <p>${p.content||''}</p>
      ${p.image_url?`<img src="${p.image_url}" alt="">`:''}
      <footer class="muted">${new Date(p.created_at).toLocaleString()}</footer>
    </article>
  `).join('') || `<div class="muted p-3">No prayers yet.</div>`;
}

filter?.addEventListener('change', load);

list?.addEventListener('change', async (e) => {
  const t = e.target.closest('[data-toggle]');
  if (!t) return;
  await supa.from('prayers').update({ answered: e.target.checked }).eq('id', t.dataset.toggle);
  load();
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const { data: { user } } = await supa.auth.getUser();
  await supa.from('prayers').insert([{
    title: fd.get('title'), content: fd.get('content'), image_url: fd.get('image_url')||null,
    created_by: user?.id
  }]);
  form.reset();
  load();
});

load();
