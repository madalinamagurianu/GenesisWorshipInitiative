// Song Index — robust, consistent renderer with debounced search and single Supabase client
(function(){
  // Prevent double-binding if hot-reloaded
  if (window.__gwiSongsBound) return; 
  window.__gwiSongsBound = true;

  const ICONS = {
    yt: "assets/images/youtube.svg",
    audio: "assets/images/audio.svg"
  };

  // Find a single Supabase client from any of our entry points
  function getSB(){
    return (
      window.supabaseClient ||
      window.__sb ||
      (window.supabase && window.supabase) ||
      null
    );
  }

  const sb = getSB();
  if (!sb) {
    console.warn("Supabase client not ready yet. Waiting for 'sb:ready' event...");
    window.addEventListener('sb:ready', init, { once:true });
  } else {
    init();
  }

  function init(){
    const supa = getSB();
    if (!supa){ console.error('Supabase client still missing.'); return; }

    const pageSize = 20;
    let page = 0;
    let filter = '';

    const search    = document.getElementById('songSearch');
    const tbody     = document.querySelector('#songsTable tbody');
    const pageInfo  = document.getElementById('pageInfo');
    const prev      = document.getElementById('prevPage');
    const next      = document.getElementById('nextPage');

    // Utility — simple debounce
    function debounce(fn, ms){
      let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,args), ms); };
    }

    // Utility — normalize URL (auto add https:// if looks like bare domain)
    function normUrl(url){
      if(!url) return '';
      const u = String(url).trim();
      if (!u) return '';
      if (/^https?:\/\//i.test(u)) return u;
      return `https://${u}`; // best-effort
    }

    // Keep row layout consistent: always render 6 TDs, add fixed-size icons, and dashes when empty
    function dash(){ return '<span class="dash">—</span>'; }

    function icon(href, type){
      const src = type === 'yt' ? ICONS.yt : ICONS.audio;
      const safe = normUrl(href);
      if(!safe) return dash();
      return `<a class="icon" href="${safe}" target="_blank" rel="noopener">
                <img class="icon-img" src="${src}" width="20" height="20" alt="${type==='yt'?'YouTube':'Audio'}">
              </a>`;
    }

    function render(rows){
      // Clear first to avoid flicker/duplication
      tbody.textContent = '';
      rows.forEach(r => {
        const tr = document.createElement('tr');
        // Title wraps; other columns stay on one line via CSS
        tr.innerHTML = `
          <td class="col-title"><a href="song.html?id=${r.id}">${r.title || ''}</a></td>
          <td class="col-key">${r.default_key || ''}</td>
          <td class="col-bpm">${(r.bpm ?? '')}</td>
          <td class="col-yt">${icon(r.youtube_url, 'yt')}</td>
          <td class="col-audioH">${icon(r.audio_harmony_url, 'audio')}</td>
          <td class="col-audio">${icon(r.audio_main_url, 'audio')}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    async function load(){
      const from = page * pageSize;
      let q = supa.from('songs').select('*', { count: 'exact' }).order('title', { ascending: true });
      if (filter) q = q.ilike('title', `%${filter}%`);
      q = q.range(from, from + pageSize - 1);
      const { data, count, error } = await q;
      if (error) { console.error(error); render([]); pageInfo.textContent = 'Error loading'; return; }
      render(data || []);
      const total = count || 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      pageInfo.textContent = `Page ${page+1} of ${totalPages} • ${total} songs`;
      prev.disabled = page === 0;
      next.disabled = (page+1) >= totalPages;
    }

    const onSearch = debounce((val)=>{ filter = (val||'').trim(); page = 0; load(); }, 200);

    search && search.addEventListener('input', (e)=> onSearch(e.target.value));
    prev   && prev.addEventListener('click', ()=>{ page = Math.max(0, page-1); load(); });
    next   && next.addEventListener('click', ()=>{ page = page+1; load(); });

    // First load
    load();
  }
})();
