(async () => {
  // --- Helpers -------------------------------------------------------------
  const supa = window.supabaseClient;
  const $ = (id) => document.getElementById(id);
  const tbody = document.querySelector('#dashPlaylistTable tbody');
  const openBtn = $('openPlaylistBtn');

  const safeText = (node, text) => { if (node) node.textContent = text; };
  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  };
  const fmtCountdown = (target) => {
    const now = new Date();
    const ms = Math.max(0, target - now);
    const m = Math.floor(ms / 60000);
    const d = Math.floor(m / (60 * 24));
    const h = Math.floor((m % (60 * 24)) / 60);
    const mi = m % 60;
    return d > 0 ? `${d}d ${h}h ${mi}m` : `${h}h ${mi}m`;
  };

  const setLoadingRow = (text = 'Loading…') => {
    if (!tbody) return;
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
  };

  if (!supa) {
    console.error('Supabase client not found on window');
    setLoadingRow('Unable to load data.');
    return;
  }

  // --- Greeting ------------------------------------------------------------
  try {
    const { data, error } = await supa.auth.getUser();
    if (!error && data?.user) {
      const full = data.user.user_metadata?.full_name || data.user.email || '';
      const first = full.split(' ')[0] || 'friend';
      safeText($('hello'), `Hello, ${first}!`);
    } else {
      safeText($('hello'), 'Hello!');
    }
  } catch {
    safeText($('hello'), 'Hello!');
  }

  // --- Next Holiday --------------------------------------------------------
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: hol, error } = await supa
      .from('holidays')
      .select('name,date,service_time')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1);

    if (error) throw error;

    if (hol && hol.length) {
      const h = hol[0];
      // Build target datetime using service_time when provided
      const target = (() => {
        const datePart = h.date; // yyyy-mm-dd
        const t = h.service_time ? `${h.service_time}` : '00:00:00';
        return new Date(`${datePart}T${t}`);
      })();
      safeText($('nextHolidayName'), h.name || '—');
      const dateLabel = `${fmtDate(h.date)}${h.service_time ? ` • ${h.service_time.slice(0,5)}` : ''}`;
      safeText($('nextHolidayDate'), dateLabel);
      safeText($('nextHolidayCountdown'), fmtCountdown(target));
    } else {
      safeText($('nextHolidayName'), '—');
      safeText($('nextHolidayDate'), 'No upcoming holiday');
      safeText($('nextHolidayCountdown'), '');
    }
  } catch (err) {
    console.error('Holiday load failed:', err);
    safeText($('nextHolidayName'), '—');
    safeText($('nextHolidayDate'), 'Could not load');
    safeText($('nextHolidayCountdown'), '');
  }

  // --- Upcoming Sunday Playlist -------------------------------------------
  try {
    setLoadingRow();
    const today = new Date().toISOString().slice(0, 10);

    const { data: nextPl, error: plErr } = await supa
      .from('playlists')
      .select('id,title,service_date')
      .eq('type', 'sunday')
      .gte('service_date', today)
      .order('service_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (plErr) throw plErr;

    if (!nextPl) {
      setLoadingRow('No upcoming Sunday playlist.');
      if (openBtn) { openBtn.removeAttribute('href'); openBtn.setAttribute('disabled', 'true'); }
      return;
    }

    if (openBtn) { openBtn.href = `playlists.html#${nextPl.id}`; openBtn.removeAttribute('disabled'); }

    const { data: items, error: itErr } = await supa
      .from('playlist_items')
      .select('position, key_override, bpm_override, lead_name, harmony_name, song:song_id (id,title, default_key, bpm)')
      .eq('playlist_id', nextPl.id)
      .order('position');

    if (itErr) throw itErr;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!items || !items.length) {
      setLoadingRow('No songs added yet.');
      return;
    }

    for (const it of items) {
      const tr = document.createElement('tr');

      // Title (link to Song Page)
      const tdTitle = document.createElement('td');
      const a = document.createElement('a');
      a.href = it.song?.id ? `song.html?id=${it.song.id}` : '#';
      a.textContent = it.song?.title || '(missing)';
      tdTitle.appendChild(a);
      tr.appendChild(tdTitle);

      // Key & BPM (favor overrides)
      const key = it.key_override || it.song?.default_key || '';
      const bpm = it.bpm_override ?? it.song?.bpm ?? '';
      tr.insertAdjacentHTML('beforeend', `
        <td>${key}</td>
        <td>${bpm}</td>
        <td>${it.lead_name || ''}</td>
        <td>${it.harmony_name || ''}</td>
      `);

      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('Playlist load failed:', err);
    setLoadingRow('Could not load playlist.');
  }
})();
