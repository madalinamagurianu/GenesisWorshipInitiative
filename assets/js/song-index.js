(async () => {
  const supa = window.supabaseClient;
  const pageSize = 20;
  let page = 0;
  let filter = '';

  const search = document.getElementById('songSearch');
  const tbody = document.querySelector('#songsTable tbody');
  const pageInfo = document.getElementById('pageInfo');
  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');

  function render(rows){
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><a href="song.html?id=${r.id}">${r.title||''}</a></td>
        <td>${r.default_key||''}</td>
        <td>${r.bpm ?? ''}</td>
        <td>${r.youtube_url ? `<a class='icon' href='${r.youtube_url}' target='_blank'><img src='assets/images/youtube.svg' alt='YouTube'/></a>` : ''}</td>
        <td>${r.audio_harmony_url ? `<a class='icon' href='${r.audio_harmony_url}' target='_blank'><img src='assets/images/audio.svg' alt='Audio H'/></a>` : ''}</td>
        <td>${r.audio_main_url ? `<a class='icon' href='${r.audio_main_url}' target='_blank'><img src='assets/images/audio.svg' alt='Audio'/></a>` : ''}</td>`;
      tbody.appendChild(tr);
    });
  }

  async function load(){
    const from = page * pageSize;
    let q = supa.from('songs').select('*', { count: 'exact' }).order('title');
    if (filter) q = q.ilike('title', `%${filter}%`);
    q = q.range(from, from + pageSize - 1);
    const { data, count, error } = await q;
    if (error) { console.error(error); return; }
    render(data || []);
    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
    pageInfo.textContent = `Page ${page+1} of ${totalPages}`;
    prev.disabled = page === 0;
    next.disabled = page+1 >= totalPages;
  }

  search?.addEventListener('input', (e) => { filter = e.target.value.trim(); page = 0; load(); });
  prev?.addEventListener('click', () => { page = Math.max(0, page-1); load(); });
  next?.addEventListener('click', () => { page = page+1; load(); });

  load();
})();
