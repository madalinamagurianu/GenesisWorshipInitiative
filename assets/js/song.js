(async () => {
  const supa = window.supabaseClient;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  const { data: s } = await supa.from('songs').select('*').eq('id', id).single();
  if (!s) return;
  document.getElementById('songTitle').textContent = s.title || 'Song';
  document.getElementById('songBpm').textContent = s.bpm ?? '—';
  document.getElementById('songKey').textContent = s.default_key || '—';
  const yl = document.getElementById('ytLink'); if (yl) yl.href = s.youtube_url || '#';
  const ahl = document.getElementById('audioHLink'); if (ahl) ahl.href = s.audio_harmony_url || '#';
  const al = document.getElementById('audioLink'); if (al) al.href = s.audio_main_url || '#';

  // scheduled note if in upcoming playlist
  const today = new Date().toISOString().slice(0,10);
  const { data: pl } = await supa
    .from('playlist_items')
    .select('lead_name,harmony_name, playlist:playlist_id (service_date)')
    .eq('song_id', id)
    .gte('playlist.service_date', today)
    .order('playlist.service_date', { ascending: true })
    .limit(1);
  const sn = document.getElementById('scheduledNote');
  if (pl && pl.length) {
    const p = pl[0];
    sn.classList.remove('hidden');
    sn.textContent = `Scheduled for ${new Date(p.playlist.service_date).toDateString()} — Lead: ${p.lead_name||'-'} , Harmony: ${p.harmony_name||'-'}`;
  }

  // notes meta footer placeholders
  document.getElementById('createdBy').textContent = s.created_by || '—';
  document.getElementById('createdAt').textContent = (s.created_at||'').slice(0,10);
  document.getElementById('updatedAt').textContent = new Date().toISOString().slice(0,10);

  // render body (placeholder)
  const body = document.getElementById('songBody');
  body.innerHTML = `<div class="section">
    <div class="section-band">Intro — who sings / intensity</div>
    <h3>Verse 1</h3>
    <div class="intensity-band">Soft, build on pre</div>
    <pre class="lyrics">[G] Amazing [D] grace how [Em] sweet the [C] sound</pre>
  </div>`;

  const notationSystem = document.getElementById('notationSystem');
  const nashKeyWrap = document.getElementById('nashKeyWrap');
  notationSystem.addEventListener('change', (e) => {
    nashKeyWrap.classList.toggle('hidden', e.target.value !== 'nashville');
  });
})();
