// Supabase environment + global client bootstrap
// -------------------------------------------------
window.__SUPABASE_URL__ = "https://jjqphteqyqjkathxmrrx.supabase.co";
window.__SUPABASE_ANON_KEY__ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXBodGVxeXFqa2F0aHhtcnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTE0NDYsImV4cCI6MjA3MDY2NzQ0Nn0.qRCVrh3MI0KmZZTrSGGshycIj7A5PywFlqIxqwcqBqw";

(function initSupabaseClient(){
  // If we ever need to fire the “ready” events, do it consistently.
  function fireReady(client){
    try { document.dispatchEvent(new CustomEvent("sb:ready", { detail: client })); } catch(_) {}
    try { window.dispatchEvent(new CustomEvent("sb:ready",  { detail: client })); } catch(_) {}
    try { window.dispatchEvent(new CustomEvent("gwi:sb-ready", { detail: client })); } catch(_) {}
    // Resolve the promise
    try {
      if (resolver) { resolver(client); resolver = null; }
    } catch(_) {}
  }

  // Promise that any script can await
  let resolver = null;
  if (!window.sbReady) {
    window.sbReady = new Promise((res) => { resolver = res; });
  } else {
    // If someone already created it, we won't overwrite it, but we still want a resolver
    // If __sb exists already, resolve immediately a tick later.
    if (window.__sb) { setTimeout(() => fireReady(window.__sb), 0); }
  }

  if (window.__sb_bootstrapped) {
    // Already bootstrapped; still broadcast readiness for late listeners
    if (window.__sb) fireReady(window.__sb);
    return;
  }
  window.__sb_bootstrapped = true;

  const URL = window.__SUPABASE_URL__;
  const KEY = window.__SUPABASE_ANON_KEY__;

  if (!URL || !KEY) {
    console.error("Supabase URL/KEY missing in env.js");
    return;
  }

  // Wait until the supabase library is available, then create one global client
  let waitedMs = 0;
  function ensure(){
    if (!(window.supabase && window.supabase.createClient)) {
      waitedMs += 30;
      if (waitedMs > 10000 && waitedMs < 10100) {
        console.warn("Supabase SDK still not present after 10s. Check the <script> tag order/network.");
      }
      return void setTimeout(ensure, 30);
    }

    if (!window.__sb) {
      window.__sb = window.supabase.createClient(URL, KEY);
      window.supabaseClient = window.__sb; // back-compat alias
    }

    fireReady(window.__sb);

    // Optional: keep header Login/Register vs Profile icon in sync (bind once)
    const sb = window.__sb;
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
        window.__sbAuthUnsub = listener?.subscription?.unsubscribe?.bind(listener?.subscription) || null;
      } catch(_){}
    }
  }

  ensure();

  if (!window.getSupabase) {
    window.getSupabase = function(){ return window.__sb; };
  }

  // Prevent accidental reassignments of URL/KEY in other scripts
  try {
    Object.defineProperty(window, '__SUPABASE_URL__',  { configurable:false, writable:false, value: window.__SUPABASE_URL__ });
    Object.defineProperty(window, '__SUPABASE_ANON_KEY__', { configurable:false, writable:false, value: window.__SUPABASE_ANON_KEY__ });
  } catch(_){}
})();