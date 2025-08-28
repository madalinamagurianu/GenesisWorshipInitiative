(async () => {
  // Grab Supabase client that app.js/env.js puts on window
  const supa = window.__sb || window.supabase || window.supabaseClient;
  if (!supa) {
    console.warn('[song.js] Supabase client not found on window');
    return;
  }

  // Helpers
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);
  const esc = (s)=> String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');

  // Parse song id
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  try {
    // --- Load song record ---
    const { data: s, error: sErr } = await supa
      .from('songs')
      .select('*')
      .eq('id', id)
      .single();

    if (sErr) throw sErr;
    if (!s) return;

    // Title + meta
    byId('songTitle') && (byId('songTitle').textContent = s.title || 'Song');
    byId('songBpm')   && (byId('songBpm').textContent   = s.bpm ?? '—');
    byId('songKey')   && (byId('songKey').textContent   = s.default_key || '—');

    // YouTube + audio links
    const ytLink   = byId('ytLink');
    const harmLink = byId('audioHLink');
    const rehLink  = byId('audioLink');

    if (ytLink)   ytLink.href   = s.youtube_url        || '#';
    if (harmLink) harmLink.href = s.audio_harmony_url  || '#';
    if (rehLink)  rehLink.href  = s.audio_main_url     || '#';

    // Show players only when we have URLs; try to find a nearby wrapper to hide
    function togglePlayer(linkEl, url){
      if (!linkEl) return;
      const show = !!(url && url.trim());
      // Prefer an explicit wrapper id pattern: {linkId}Wrap or {linkId}Player
      const wrap = byId(linkEl.id + 'Wrap') || byId(linkEl.id.replace('Link','Player')) || linkEl.closest('.player');
      if (wrap) wrap.classList.toggle('hidden', !show);
    }
    togglePlayer(harmLink, s.audio_harmony_url || '');
    togglePlayer(rehLink,  s.audio_main_url    || '');

    // Notify any audio initialiser that links changed
    try { document.dispatchEvent(new CustomEvent('gwi:audio-links-updated')); } catch(_) {}

    // notes meta footer placeholders
    byId('createdBy') && (byId('createdBy').textContent = s.created_by || '—');
    byId('createdAt') && (byId('createdAt').textContent = (s.created_at||'').slice(0,10));
    byId('updatedAt') && (byId('updatedAt').textContent = new Date().toISOString().slice(0,10));

    // Render body placeholder if container exists (kept minimal)
    const body = byId('songBody');
    if (body && !body.childElementCount) {
      body.innerHTML = `<div class="section">
        <div class="section-band">Intro — who sings / intensity</div>
        <h3>Verse 1</h3>
        <div class="intensity-band">Soft, build on pre</div>
        <pre class="lyrics">[G] Amazing [D] grace how [Em] sweet the [C] sound</pre>
      </div>`;
    }

    // --- Scheduled note if in upcoming playlist ---
    // Use a proper foreign-table order; older code with order('playlist.service_date') can 400.
    const today = new Date().toISOString().slice(0,10);
    try {
      const { data: pl, error: plErr } = await supa
        .from('playlist_items')
        .select('lead_name,harmony_name, playlist:playlist_id(service_date)')
        .eq('song_id', id)
        .gte('playlist.service_date', today)
        .order('service_date', { ascending: true, foreignTable: 'playlist' })
        .limit(1);

      if (plErr) throw plErr;

      const sn = byId('scheduledNote');
      if (sn && pl && pl.length) {
        const p = pl[0];
        const d = p?.playlist?.service_date ? new Date(p.playlist.service_date) : null;
        sn.classList.remove('hidden');
        sn.textContent = `Scheduled for ${d ? d.toDateString() : 'TBA'} — Lead: ${p.lead_name || '-'} , Harmony: ${p.harmony_name || '-'}`;
      }
    } catch (e) {
      console.warn('[song.js] Upcoming playlist check skipped:', e?.message || e);
    }

    // Notation system toggle for Nashville key picker
    const notationSystem = byId('notationSystem');
    const nashKeyWrap    = byId('nashKeyWrap');
    if (notationSystem && nashKeyWrap) {
      notationSystem.addEventListener('change', (e) => {
        nashKeyWrap.classList.toggle('hidden', e.target.value !== 'nashville');
      });
      // initialise once
      nashKeyWrap.classList.toggle('hidden', notationSystem.value !== 'nashville');
    }
  } catch (err) {
    console.error('[song.js] Failed:', err);
  }
})();
