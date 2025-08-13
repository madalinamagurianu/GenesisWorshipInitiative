(async () => {
  const supa = window.supabaseClient;
  // hello
  const { data: me } = await supa.auth.getUser().catch(() => ({ data: null }));
  const hello = document.getElementById('hello');
  if (hello) hello.textContent = me?.user?.user_metadata?.full_name ? 
      `Hello, ${me.user.user_metadata.full_name.split(' ')[0]}!` : 'Hello!';

  // basic next holiday (nearest >= today)
  const today = new Date().toISOString().slice(0,10);
  const { data: hol } = await supa.from('holidays')
    .select('name,date,service_time')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1);
  if (hol && hol.length) {
    const h = hol[0];
    const date = new Date(h.date + 'T00:00:00');
    const left = (date - new Date()) / (1000*60*60*24);
    document.getElementById('nextHolidayName').textContent = h.name;
    document.getElementById('nextHolidayDate').textContent = new Date(h.date).toDateString();
    document.getElementById('nextHolidayCountdown').textContent = `~${Math.max(0, Math.ceil(left))} days left`;
  }
  // upcoming sunday playlist (first future playlist with type=sunday)
  const { data: pls } = await supa.from('playlists')
    .select('id,title,service_date, playlist_items:songs!inner (title), items:playlist_items (position, key_override, bpm_override, lead_name, harmony_name, song:song_id (title, default_key, bpm))')
    .eq('type', 'sunday')
    .gte('service_date', today)
    .order('service_date', { ascending: true })
    .limit(1);
  const tbody = document.querySelector('#dashPlaylistTable tbody');
  if (tbody) {
    tbody.innerHTML = '';
    // lightweight fallback: query items separately
    const { data: nextPl } = await supa.from('playlists')
      .select('id,title,service_date')
      .eq('type','sunday').gte('service_date', today).order('service_date', { ascending: true }).limit(1).single();
    if (nextPl) {
      const { data: items } = await supa.from('playlist_items')
        .select('position, key_override, bpm_override, lead_name, harmony_name, song:song_id (id,title, default_key, bpm)')
        .eq('playlist_id', nextPl.id).order('position');
      (items || []).forEach(it => {
        const tr = document.createElement('tr');
        const key = it.key_override || it.song?.default_key || '';
        const bpm = it.bpm_override || it.song?.bpm || '';
        const titleCell = document.createElement('td');
        const a = document.createElement('a');
        a.href = `song.html?id=${it.song?.id}`;
        a.textContent = it.song?.title || '(missing)';
        titleCell.appendChild(a);
        tr.appendChild(titleCell);
        tr.innerHTML += `<td>${key}</td><td>${bpm}</td><td>${it.lead_name||''}</td><td>${it.harmony_name||''}</td>`;
        tbody.appendChild(tr);
      });
      document.getElementById('openPlaylistBtn').href = `playlists.html#${nextPl.id}`;
    }
  }
})();
