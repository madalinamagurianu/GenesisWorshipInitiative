// assets/js/app.js — robust Supabase bootstrap + header UI wiring
(function () {
  // ---------- sbReady singleton (resolves once when client is ready) ----------
  if (!window.sbReady) {
    let _resolve;
    window.sbReady = new Promise(res => { _resolve = res; });
    window.__resolveSbReady = _resolve;
  }

  function resolveReady(client) {
    if (typeof window.__resolveSbReady === 'function') {
      try { window.__resolveSbReady(client); } catch(_) {}
      window.__resolveSbReady = null;
    }
    // fire a couple of friendly events others can hook into
    try {
      const ev = new Event('sb:ready');
      window.dispatchEvent(ev);
      document.dispatchEvent(ev);
    } catch(_) {}
  }

  // ---------- Create / reuse a single Supabase client ----------
  function ensureClient() {
    // if already made earlier on this page, reuse it
    if (window.__sb) { resolveReady(window.__sb); return window.__sb; }

    // SDK guard – env guard
    const URL = window.__SUPABASE_URL__;
    const KEY = window.__SUPABASE_ANON_KEY__;
    if (!URL || !KEY) {
      console.error('[app.js] Missing __SUPABASE_URL__ / __SUPABASE_ANON_KEY__ (provided by assets/js/env.js).');
      return null;
    }

    // if SDK is present, build immediately; otherwise poll briefly for it
    function build() {
      try {
        const sb = window.supabase.createClient(URL, KEY);
        window.__sb = sb;                // canonical reference
        window.supa = sb;                // legacy alias used elsewhere
        window.supabaseClient = sb;      // another common alias
        resolveReady(sb);
        return sb;
      } catch (e) {
        console.error('[app.js] Failed to create Supabase client:', e);
        return null;
      }
    }

    if (typeof window.supabase !== 'undefined') {
      return build();
    }

    // Poll for the SDK for up to ~10s (100 * 100ms)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (typeof window.supabase !== 'undefined') {
        clearInterval(t);
        build();
      } else if (tries > 100) {
        clearInterval(t);
        console.error('[app.js] Supabase SDK not found after waiting. Check the <script> in <head>.');
      }
    }, 100);

    return null;
  }

  // kick everything off
  ensureClient();

  // ---------- DOM refs ----------
  const loginBtn     = document.getElementById('loginBtn');
  const userChip     = document.getElementById('userChip');
  const userName     = document.getElementById('userName');
  const userAvatar   = document.getElementById('userAvatar');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn    = document.getElementById('logoutBtn');
  const hamburger    = document.getElementById('hamburger');
  const topmenu      = document.getElementById('topmenu');
  const authModal    = document.getElementById('authModal');

  // ---------- Helpers ----------
  const show = el => { if (el) el.classList.remove('hidden'); };
  const hide = el => { if (el) el.classList.add('hidden'); };

  function setUserUI(session) {
    if (session && session.user) {
      const meta = session.user.user_metadata || {};
      hide(loginBtn);
      show(userChip);

      if (userName) userName.textContent = meta.full_name || meta.name || session.user.email || 'Profile';
      if (userAvatar) {
        userAvatar.src = meta.avatar_url || 'assets/images/avatar-placeholder.png';
        userAvatar.alt = (meta.full_name || 'User') + ' avatar';
      }

      // Optional: reveal elements that need admin role
      const adminLinks = document.querySelectorAll('.admin-only');
      const role = (meta.role_type || meta.role || '').toLowerCase();
      adminLinks.forEach(a => {
        if (role === 'admin') a.removeAttribute('hidden'); else a.setAttribute('hidden', '');
      });
    } else {
      show(loginBtn);
      hide(userChip);
      document.querySelectorAll('.admin-only').forEach(a => a.setAttribute('hidden', ''));
    }
  }

  // ---------- Auth wiring (after client ready) ----------
  window.sbReady.then(async (sb) => {
    try {
      const { data } = await sb.auth.getSession();
      setUserUI(data?.session || null);
      sb.auth.onAuthStateChange((_event, session) => setUserUI(session));
    } catch (e) {
      console.error('[app.js] getSession failed:', e);
    }
  });

  // ---------- Login button opens modal ----------
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (authModal && typeof authModal.showModal === 'function') authModal.showModal();
      else console.warn('[app.js] #authModal not found on this page.');
    });
  }

  // ---------- User chip dropdown ----------
  if (userChip) {
    userChip.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown && userDropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!userChip.contains(e.target)) userDropdown && userDropdown.classList.remove('open');
    });
  }

  // ---------- Logout ----------
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const sb = await window.sbReady;
        await sb.auth.signOut();
        userDropdown && userDropdown.classList.remove('open');
      } catch (e) {
        console.error('[app.js] Logout failed:', e);
      }
    });
  }

  // ---------- Mobile menu (frosted dropdown; style handled in CSS) ----------
  if (hamburger && topmenu && !hamburger.dataset.bound) {
    hamburger.dataset.bound = 'true';

    let isOpen = false;
    const setMenu = (open) => {
      isOpen = open;
      topmenu.classList.toggle('open', isOpen);
      topmenu.setAttribute('aria-hidden', String(!isOpen));
      hamburger.setAttribute('aria-expanded', String(isOpen));
    };

    setMenu(false);

    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setMenu(!isOpen);
    });

    topmenu.addEventListener('click', () => setMenu(false));

    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      if (e.target.closest('#topmenu') || e.target.closest('#hamburger')) return;
      setMenu(false);
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 992) setMenu(false); });
  }
})();

// ---------- Public helpers used by the modal tabs ----------
window.openAuthModal = function () {
  const dlg = document.getElementById('authModal');
  if (dlg && !dlg.open && typeof dlg.showModal === 'function') dlg.showModal();
  setActiveTab('login');
};

function setActiveTab(which) {
  const loginActive  = which === 'login';
  const tabLogin     = document.getElementById('tabLogin');
  const tabRegister  = document.getElementById('tabRegister');
  const panelLogin   = document.getElementById('panelLogin');
  const panelRegister= document.getElementById('panelRegister');

  tabLogin?.classList.toggle('active', loginActive);
  tabRegister?.classList.toggle('active', !loginActive);
  tabLogin?.classList.toggle('btn--primary', loginActive);
  tabRegister?.classList.toggle('btn--primary', !loginActive);
  tabLogin?.classList.toggle('btn--outline', !loginActive);
  tabRegister?.classList.toggle('btn--outline', loginActive);

  panelLogin?.classList.toggle('active', loginActive);
  panelRegister?.classList.toggle('active', !loginActive);
  if (panelLogin)   panelLogin.hidden    = !loginActive;
  if (panelRegister)panelRegister.hidden =  loginActive;

  tabLogin?.setAttribute('aria-selected', String(loginActive));
  tabRegister?.setAttribute('aria-selected', String(!loginActive));
  panelLogin?.setAttribute('aria-hidden', String(!loginActive));
  panelRegister?.setAttribute('aria-hidden', String(loginActive));
}

// Wire tab buttons (if present on this page)
document.getElementById('tabLogin')?.addEventListener('click', () => setActiveTab('login'));
document.getElementById('tabRegister')?.addEventListener('click', () => setActiveTab('register'));
document.getElementById('authClose')?.addEventListener('click', () => {
  const dlg = document.getElementById('authModal');
  if (dlg?.open) dlg.close();
});

// Header button shortcut
document.getElementById('loginBtn')?.addEventListener('click', () => {
  try { window.openAuthModal(); } catch (e) { console.error(e); }
});
