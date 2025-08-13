// assets/js/prayers.js
import { supabase } from './supabaseClient.js';

const $ = (sel, root=document) => root.querySelector(sel);
const el = {
  form: $('[data-pr-form]'),
  filter: $('[data-pr-filter]'),
  counter: $('[data-pr-counter]'),
  list: $('[data-pr-list]'),
};

function toast(m){ console.log('[prayers]', m); }

async function loadPrayers(filter='all') {
  let q = supabase.from('prayers').select('id,title,content,image_url,answered,created_at,created_by').order('created_at', { ascending: false });
  if (filter === 'answered') q = q.eq('answered', true);
  if (filter === 'unanswered') q = q.eq('answered', false);
  const { data, error } = await q;
  if (error) { toast(error.message); return []; }
  return data || [];
}

async function loadAnsweredCount() {
  const { count, error } = await supabase.from('prayers').select('id', { count: 'exact', head: true }).eq('answered', true);
  if (error) { toast(error.message); return 0; }
  return count || 0;
}

function renderList(list) {
  el.list.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <h3>${p.title}</h3>
        <label>
          <input type="checkbox" ${p.answered ? 'checked':''} data-answered>
          answered
        </label>
      </div>
      <p>${p.content || ''}</p>
      ${p.image_url ? `<img src="${p.image_url}" alt="" style="max-width:100%;border-radius:8px;" />` : ''}
      <div class="card-actions">
        <button data-react>🙂 React</button>
        <button data-comment>💬 Comment</button>
      </div>
    `;
    card.querySelector('[data-answered]').addEventListener('change', async (e) => {
      const { error } = await supabase.from('prayers').update({ answered: e.target.checked }).eq('id', p.id);
      if (error) toast(error.message);
      else refresh();
    });
    el.list.appendChild(card);
  });
}

async function refresh() {
  const filter = el.filter?.value || 'all';
  renderList(await loadPrayers(filter));
  const answered = await loadAnsweredCount();
  el.counter.textContent = `Answered: ${answered}`;
}

el.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(el.form);
  const payload = {
    title: fd.get('title')?.toString() || '',
    content: fd.get('content')?.toString() || '',
    image_url: fd.get('image_url')?.toString() || null,
  };
  const { error } = await supabase.from('prayers').insert(payload);
  if (error) toast(error.message);
  el.form.reset();
  refresh();
});

el.filter?.addEventListener('change', refresh);

refresh();
