(() => {
  const url = window.__SUPABASE_URL__;
  const anon = window.__SUPABASE_ANON_KEY__;
  window.supabaseClient = supabase.createClient(url, anon);

  // menu
  const h = document.getElementById('hamburger');
  const m = document.getElementById('topmenu');
  if (h && m) {
    h.addEventListener('click', () => m.classList.toggle('hidden'));
  }
})();
