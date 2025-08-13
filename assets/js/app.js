// assets/js/app.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const url = window.__SUPABASE_URL__;
const key = window.__SUPABASE_ANON_KEY__;
export const supa = createClient(url, key);

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
