// assets/js/app.js (no module imports; uses global Supabase from CDN)
(function () {
  // ---- Guard: require global supabase ----
  if (typeof window.supabase === 'undefined') {
    console.error('[app.js] Supabase SDK not found. Ensure this is loaded in <head>:\n' +
      '<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    return;
  }

  // ---- Create client from globals injected in the page ----
  const URL = window.__SUPABASE_URL__;
  const KEY = window.__SUPABASE_ANON_KEY__;
  const supa = window.supabase.createClient(URL, KEY);
  window.supa = supa; // expose for debugging/other scripts

  // ---- DOM refs ----
  const loginBtn = document.getElementById('loginBtn');
  const userChip = document.getElementById('userChip');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  const hamburger = document.getElementById('hamburger');
  const topmenu = document.getElementById('topmenu');
  const authModal = document.getElementById('authModal');

  // ---- Helpers ----
  const show = el => el && el.classList.remove('hidden');
  const hide = el => el && el.classList.add('hidden');
  function setUserUI(session) {
    if (session && session.user) {
      const meta = session.user.user_metadata || {};
      // Toggle
      hide(loginBtn);
      show(userChip);
      // Name & avatar
      if (userName) userName.textContent = meta.full_name || meta.name || session.user.email || 'Profile';
      if (userAvatar) {
        userAvatar.src = meta.avatar_url || 'assets/images/avatar-placeholder.png';
        userAvatar.alt = (meta.full_name || 'User') + ' avatar';
      }
      // On desktop, also show the .topnav Admin link if role matches (optional: requires role in metadata)
      const adminLinks = document.querySelectorAll('.admin-only');
      const role = meta.role_type || meta.role || '';
      adminLinks.forEach(a => {
        if (['admin'].includes(role)) a.removeAttribute('hidden');
        else a.setAttribute('hidden', '');
      });
    } else {
      show(loginBtn);
      hide(userChip);
      // hide admin links when logged out
      document.querySelectorAll('.admin-only').forEach(a => a.setAttribute('hidden', ''));
    }
  }

  // ---- Initial session & auth listener ----
  supa.auth.getSession().then(({ data }) => setUserUI(data?.session || null));
  supa.auth.onAuthStateChange((_event, session) => setUserUI(session));

  // ---- Login button opens modal (if present) ----
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (authModal && typeof authModal.showModal === 'function') authModal.showModal();
      else console.warn('[app.js] #authModal not found on this page.');
    });
  }

  // ---- User chip dropdown ----
  if (userChip) {
    userChip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (userDropdown) userDropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!userChip.contains(e.target)) userDropdown && userDropdown.classList.remove('open');
    });
  }

  // ---- Logout ----
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await supa.auth.signOut();
        userDropdown && userDropdown.classList.remove('open');
      } catch (e) {
        console.error('Logout failed:', e);
      }
    });
  }

  // ---- Mobile menu (frosted dropdown) ----
  if (hamburger && topmenu) {
    // Prevent double-binding if this script is included twice
    if (!hamburger.dataset.bound) {
      hamburger.dataset.bound = 'true';

      let isOpen = false;
      const setMenu = (open) => {
        isOpen = open;
        topmenu.classList.toggle('open', isOpen);
        topmenu.setAttribute('aria-hidden', String(!isOpen));
        hamburger.setAttribute('aria-expanded', String(isOpen));
      };

      // start closed
      setMenu(false);

      // Toggle on burger click
      hamburger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu(!isOpen);
      });

      // Close when clicking inside the menu (anywhere including links)
      topmenu.addEventListener('click', () => {
        setMenu(false);
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!isOpen) return;
        if (e.target.closest('#topmenu') || e.target.closest('#hamburger')) return;
        setMenu(false);
      });

      // Close on ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
      });

      // Close when resizing to desktop breakpoint
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) setMenu(false);
      });
    }
  }
})();

// Open modal from header Login/Register
window.openAuthModal = function(){
  const dlg = document.getElementById('authModal');
  if (dlg && !dlg.open) dlg.showModal();
  setActiveTab('login');
};

// Tabs
function setActiveTab(which){
  const loginActive = which === 'login';
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const panelLogin = document.getElementById('panelLogin');
  const panelRegister = document.getElementById('panelRegister');

  tabLogin?.classList.toggle('active', loginActive);
  tabRegister?.classList.toggle('active', !loginActive);
  tabLogin?.classList.toggle('btn--primary', loginActive);
  tabRegister?.classList.toggle('btn--primary', !loginActive);
  tabLogin?.classList.toggle('btn--outline', !loginActive);
  tabRegister?.classList.toggle('btn--outline', loginActive);

  panelLogin?.classList.toggle('active', loginActive);
  panelRegister?.classList.toggle('active', !loginActive);
  panelLogin && (panelLogin.hidden = !loginActive);
  panelRegister && (panelRegister.hidden = loginActive);
  tabLogin?.setAttribute('aria-selected', String(loginActive));
  tabRegister?.setAttribute('aria-selected', String(!loginActive));
  panelLogin?.setAttribute('aria-hidden', String(!loginActive));
  panelRegister?.setAttribute('aria-hidden', String(loginActive));
}
document.getElementById('tabLogin')?.addEventListener('click', () => setActiveTab('login'));
document.getElementById('tabRegister')?.addEventListener('click', () => setActiveTab('register'));

document.getElementById('authClose')?.addEventListener('click', ()=>{
  const dlg = document.getElementById('authModal');
  if (dlg?.open) dlg.close();
});

// Wire the header button
document.getElementById('loginBtn')?.addEventListener('click', () => {
  try { window.openAuthModal(); } catch(e) { console.error(e); }
});
