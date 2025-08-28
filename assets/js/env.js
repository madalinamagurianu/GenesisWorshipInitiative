// Supabase environment + global client bootstrap
// -------------------------------------------------
// 1) Put your project URL and anon key here (already filled)
window.__SUPABASE_URL__ = "https://jjqphteqyqjkathxmrrx.supabase.co";
window.__SUPABASE_ANON_KEY__ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXBodGVxeXFqa2F0aHhtcnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTE0NDYsImV4cCI6MjA3MDY2NzQ0Nn0.qRCVrh3MI0KmZZTrSGGshycIj7A5PywFlqIxqwcqBqw";

(function initSupabaseClient(){
  if (window.__sb_bootstrapped) {
    // If already bootstrapped, still notify listeners that the client is ready
    try { document.dispatchEvent(new CustomEvent('sb:ready', { detail: window.__sb })); } catch(_){}
    return;
  }
  window.__sb_bootstrapped = true;

  const URL = window.__SUPABASE_URL__;
  const KEY = window.__SUPABASE_ANON_KEY__;

  // Guard: values must exist
  if(!URL || !KEY){
    console.error("Supabase URL/KEY missing in env.js");
    return;
  }

  // Wait until the supabase library is available, then create one global client
  function ensure(){
    if(!(window.supabase && window.supabase.createClient)){
      // try again shortly (defer/load order safe)
      return void setTimeout(ensure, 30);
    }

    // Create a single global client (singleton)
    if (!window.__sb) {
      window.__sb = window.supabase.createClient(URL, KEY);
      window.supabaseClient = window.__sb; // back-compat alias
    }

    // Let pages know the client is ready (every time ensure() wins the race)
    try { document.dispatchEvent(new CustomEvent('sb:ready', { detail: window.__sb })); } catch(_){}

    const sb = window.__sb;

    // Optional: keep header Login/Register vs Profile icon in sync (bind once)
    async function updateHeaderAuthUI(){
      try {
        const { data: { session } } = await sb.auth.getSession();
        const loggedIn = !!session;
        const loginBtn    = document.getElementById('loginBtn');
        const profileIcon = document.getElementById('profileIconBtn');
        const userChip    = document.getElementById('userChip');
        if (loginBtn)    loginBtn.classList.toggle('hidden', loggedIn);
        if (profileIcon) profileIcon.classList.toggle('hidden', !loggedIn);
        if (userChip)    userChip.classList.toggle('hidden', !loggedIn);
      } catch(_){}
    }

    updateHeaderAuthUI();

    if (!window.__sbAuthBound) {
      window.__sbAuthBound = true;
      try {
        const { data: listener } = sb.auth.onAuthStateChange((_event,_session)=>updateHeaderAuthUI());
        // keep unsubscribe globally to avoid stacking listeners across HMR/reloads
        window.__sbAuthUnsub = listener?.subscription?.unsubscribe?.bind(listener?.subscription) || null;
      } catch(_){}
    }
  }

  ensure();

  // Stable getter
  if (!window.getSupabase) {
    window.getSupabase = function(){ return window.__sb; };
  }

  // Prevent accidental reassignments of URL/KEY in other scripts
  try {
    Object.defineProperty(window, '__SUPABASE_URL__',  { configurable:false, writable:false, value: URL });
    Object.defineProperty(window, '__SUPABASE_ANON_KEY__', { configurable:false, writable:false, value: KEY });
  } catch(_){}
})();