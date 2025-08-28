// assets/js/prayers.js
// Enhanced: safe rendering, filter buttons, counters, and optional image upload to Supabase Storage
import { supabase } from './supabaseClient.js';

// ---------- Helpers ----------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const el = {
  form: $('[data-pr-form]'),
  // Either a <select data-pr-filter> OR three buttons with [data-pr-filter-btn]
  filterSelect: $('[data-pr-filter]'),
  list: $('[data-pr-list]'),
  // optional counters (make them clickable filters if present)
  cTotal: $('[data-pr-counter-total]'),
  cAnswered: $('[data-pr-counter-answered]'),
  cPending: $('[data-pr-counter-pending]'),
};

function toast(m){ console.log('[prayers]', m); }

function byId(id){ return document.getElementById(id); }

function create(tag, props={}){
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>{
    if(k === 'text') n.textContent = v;
    else if(k === 'html') n.innerHTML = v; // used only for safe SVG/emoji
    else if(k === 'class') n.className = v;
    else if(k === 'dataset') Object.assign(n.dataset, v);
    else if(k in n) n[k] = v;
    else n.setAttribute(k, v);
  });
  return n;
}

// ---------- Data ----------
async function loadPrayers(filter='all') {
  let q = supabase
    .from('prayers')
    .select('id,title,content,image_url,answered,created_at,created_by', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (filter === 'answered') q = q.eq('answered', true);
  if (filter === 'unanswered') q = q.eq('answered', false);
  const { data, error } = await q;
  if (error) { toast(error.message); return []; }
  return data || [];
}

async function loadCounts(){
  const totalP = supabase.from('prayers').select('id', { count:'exact', head:true });
  const ansP   = supabase.from('prayers').select('id', { count:'exact', head:true }).eq('answered', true);
  const penP   = supabase.from('prayers').select('id', { count:'exact', head:true }).eq('answered', false);
  const [{count: total=0}, {count: answered=0}, {count: pending=0}] = await Promise.all([totalP, ansP, penP].map(p=>p.then(r=>r).catch(()=>({count:0}))));
  return { total, answered, pending };
}

// ---------- Rendering ----------
function renderList(list) {
  if (!el.list) return;
  el.list.innerHTML = '';
  if (!Array.isArray(list) || !list.length){
    const empty = create('div', { class:'card', text:'No prayers yet.' });
    el.list.appendChild(empty);
    return;
  }
  list.forEach(p => {
    const card = create('div', { class:'card' });

    const header = create('div', { class:'card-header' });
    const h3 = create('h3', { text: p.title || 'Untitled' });
    const label = create('label');
    const chk = create('input', { type:'checkbox', checked: !!p.answered });
    chk.addEventListener('change', async (e)=>{
      const { error } = await supabase.from('prayers').update({ answered: e.target.checked }).eq('id', p.id);
      if (error) toast(error.message);
      await refresh();
    });
    label.append(chk, document.createTextNode(' Answered'));
    header.append(h3, label);

    const content = create('p', { text: p.content || '' });
    card.append(header, content);

    if(p.image_url){
      const img = create('img', { src:p.image_url, alt:'', style:'max-width:100%;border-radius:8px;display:block;margin-top:.5rem;' });
      card.append(img);
    }

    const actions = create('div', { class:'card-actions' });
    const reactBtn = create('button', { text:'🙂 React' });
    const commentBtn = create('button', { text:'💬 Comment' });
    actions.append(reactBtn, commentBtn);
    card.append(actions);

    el.list.appendChild(card);
  });
}

function renderCounters({total, answered, pending}, active='all'){
  const map = {
    total: el.cTotal,
    answered: el.cAnswered,
    pending: el.cPending,
  };
  if (el.cTotal) el.cTotal.textContent = String(total);
  if (el.cAnswered) el.cAnswered.textContent = String(answered);
  if (el.cPending) el.cPending.textContent = String(pending);
  // Set active state for filter buttons if these counters are used as buttons
  Object.entries(map).forEach(([key, node])=>{
    if(!node) return;
    node.classList.toggle('active', (active === key) || (active==='all' && key==='total'));
  });
}

// ---------- Upload (optional file input) ----------
async function uploadImageIfAny(form){
  // Supports either <input type="file" name="image"> or <input data-pr-image>
  const fileInput = form.querySelector('input[type="file"][name="image"], input[data-pr-image]');
  const file = fileInput?.files?.[0];
  if(!file) return null;
  try {
    const bucket = 'prayer-images';
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    const path = `uploads/${id}.${ext}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert:false, cacheControl:'3600', contentType: file.type || 'image/jpeg' });
    if (upErr) { toast(upErr.message); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch(e){ toast(e.message || e); return null; }
}

// ---------- State & Refresh ----------
let currentFilter = 'all';

async function refresh() {
  const list = await loadPrayers(currentFilter);
  renderList(list);
  const counts = await loadCounts();
  renderCounters(counts, currentFilter);
}

// ---------- Events ----------
// Filter select (fallback)
el.filterSelect?.addEventListener('change', (e)=>{
  currentFilter = e.target.value || 'all';
  refresh();
});

// Filter buttons (preferred)
$$('[data-pr-filter-btn]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const f = btn.getAttribute('data-pr-filter-btn') || 'all';
    currentFilter = f;
    refresh();
  });
});

// Form submit
el.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(el.form);
  const title = (fd.get('title')||'').toString().trim();
  const content = (fd.get('content')||'').toString().trim();
  let image_url = (fd.get('image_url')||'').toString().trim() || null; // support legacy URL field
  if(!image_url){
    // if a file input exists, try uploading it
    image_url = await uploadImageIfAny(el.form);
  }

  if(!title){ toast('Please add a title.'); return; }

  const payload = { title, content, image_url };
  const { error } = await supabase.from('prayers').insert(payload);
  if (error) { toast(error.message); return; }
  el.form.reset();
  await refresh();
});

// Initial load
refresh();
