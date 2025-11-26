"use strict";
// ========== Auth helpers ==========
const __t = (k, f)=> (window.__i18n_get ? __i18n_get(k, f) : f);
async function handleAuthRedirect(){
  try{
    showLoading(__t('auth.processingLogin', 'Memproses login…'));
    const hash = location.hash || '';
    const hasCode = /[?#&](code|access_token)=/.test(location.href) || hash.includes('type=recovery');
    if (hasCode && sb?.auth?.exchangeCodeForSession) {
      await sb.auth.exchangeCodeForSession(window.location.href);
      try{ sessionStorage.setItem('auth.justExchanged','1'); }catch{}
      history.replaceState({}, '', location.pathname + location.search);
    }
  }catch(e){ console.warn('auth redirect handling failed', e); }
  finally { hideLoading(); }
}

async function getCurrentUser(){
  try{ const { data } = await sb.auth.getUser(); return data?.user || null; }catch{ return null; }
}

// Subscribe ke perubahan sesi: reload sederhana saat login sukses
try {
  if (window.sb && !window.__authRoleWatcher){
    window.__authRoleWatcher = sb.auth.onAuthStateChange((event, _session)=>{
      // Event bisa: INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, SIGNED_OUT
      try{
        if (event === 'SIGNED_IN') {
          const hash = location.hash || '';
          const viaCode = /[?#&](code|access_token)=/.test(location.href) || hash.includes('type=recovery') || sessionStorage.getItem('auth.justExchanged')==='1';
          const once = sessionStorage.getItem('auth.reloadOnce')==='1';
          if (viaCode && !once){ sessionStorage.setItem('auth.reloadOnce','1'); location.reload(); return; }
        }
        updateAuthUI?.();
      }catch{}
    });
  }
} catch {}

async function updateAuthUI(){
  const user = await getCurrentUser();
  // Simple reload-on-login: only when transitioning from logged-out → logged-in within this session
  try{
    const inited = sessionStorage.getItem('auth.init') === '1';
    const prev = sessionStorage.getItem('auth.prevUser') === '1';
    const now = !!user;
    if (!inited){
      sessionStorage.setItem('auth.init','1');
      sessionStorage.setItem('auth.prevUser', now ? '1' : '0');
    } else {
      if (!prev && now){
        sessionStorage.setItem('auth.prevUser','1');
        // reload handled once in onAuthStateChange
      }
      sessionStorage.setItem('auth.prevUser', now ? '1' : '0');
    }
  }catch{}
  try{ window.__hasUser = !!user; }catch{}
  const loginBtn = byId('btnLogin'); const logoutBtn = byId('btnLogout'); const info = byId('authInfo'); const email = byId('authUserEmail');
  if (user){
    // Otomatiskan akses editor berdasarkan metadata / tabel user_roles (tanpa owner=yes di URL)
    await resolveUserRoleAndApply(user);
    loginBtn?.classList.add('hidden'); byId('btnAdminLogin')?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');
    info?.classList.remove('hidden');
    if (email) email.textContent = user.email || user.id;
  } else {
    try{ window.__hasUser = false; }catch{}
    try{ if (typeof accessRole==='undefined' || accessRole!=='viewer') setAccessRole?.('viewer'); }catch{}
    loginBtn?.classList.remove('hidden'); byId('btnAdminLogin')?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');
    info?.classList.add('hidden');
  }
}

// Resolve role dari:
// 1) app_metadata.role / user_metadata.role (jika tersedia)
// 2) tabel Supabase 'user_roles' (kolom: user_id uuid, email text, role text, is_owner boolean)
//    kebijakan RLS: authenticated users boleh SELECT baris mereka sendiri (by user_id/email)
async function resolveUserRoleAndApply(user){
  let role = '';
  let isOwner = false;
  const prevOwner = !!window._isOwnerUser;
  try{
    role = String((user.app_metadata?.role || user.user_metadata?.role || '')).toLowerCase();
    // Global owner only if explicit is_owner true or role === 'owner'
    isOwner = !!(user.app_metadata?.is_owner || user.user_metadata?.is_owner || role==='owner');
  }catch{}

  // Cache ringan di localStorage untuk mengurangi hit /auth/v1/user dan query tabel
  const CK = `roleCache:v1:${user.id}`;
  if (!role){
    try{
      const cached = JSON.parse(localStorage.getItem(CK)||'null');
      // Perpanjang TTL cache agar survive refresh (24 jam)
      if (cached && Date.now() - (cached.ts||0) < 86_400_000){
        role = cached.role||''; isOwner = !!cached.isOwner;
      }
    }catch{}
  }

  if (!role){
    try{
      // Cari di tabel user_roles berdasarkan user_id atau email
      const { data, error } = await sb.from('user_roles')
        .select('role,is_owner')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();
      if (!error && data){
        role = String(data.role||'').toLowerCase();
        // Do NOT treat 'admin' as owner; only explicit is_owner or role 'owner'
        isOwner = !!data.is_owner || role==='owner';
        try{ localStorage.setItem(CK, JSON.stringify({ role, isOwner, ts: Date.now() })); }catch{}
        // Persist ke user_metadata agar terbaca di /auth/v1/user tanpa query DB pada refresh berikutnya
        try{ await sb.auth.updateUser({ data: { role, is_owner: isOwner } }); }catch{}
      }
    }catch{}
  }

  window._isOwnerUser = !!isOwner;
  // Admin is cashflow-only: keep viewer UI for admin
  let desired = (isOwner || role==='editor') ? 'editor' : 'viewer';
  // Jika sedang dalam Cloud Mode + ada event aktif, JANGAN menurunkan akses dari editor -> viewer.
  // Biarkan per-event role (loadAccessRoleFromCloud) yang menentukan. Hanya upgrade di sini.
  try{
    const inCloudEvent = (typeof isCloudMode==='function' && isCloudMode() && typeof currentEventId!=='undefined' && !!currentEventId);
    const curr = (typeof accessRole==='undefined') ? 'viewer' : accessRole;
    if (inCloudEvent) {
      // only upgrade
      desired = (curr === 'editor' || desired === 'editor') ? 'editor' : 'viewer';
    }
    if (curr !== desired) {
      setAccessRole?.(desired);
    } else {
      if (prevOwner !== window._isOwnerUser) { try{ applyAccessMode?.(); }catch{} }
    }
  }catch{}
}

function ensureAuthButtons(){
  const bar = byId('hdrControls'); if (!bar) return;
  if (!byId('authInfo')){
    const span = document.createElement('span'); span.id='authInfo'; span.className='text-xs px-2 py-1 bg-white/10 rounded hidden';
    const se = document.createElement('span'); se.id='authUserEmail'; span.innerHTML = __t('auth.signedIn', 'Signed in: ');
    span.appendChild(se);
    bar.appendChild(span);
  }
  if (!byId('btnLogin')){
    const b = document.createElement('button'); b.id='btnLogin'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90'; b.textContent=__t('login.title', 'Login');
    bar.appendChild(b);
    b.addEventListener('click', ()=>{
      const m = byId('loginModal'); if (!m) return; m.classList.remove('hidden');
      try{ sb.auth.getUser().then(({data})=>{ if (data?.user?.email) byId('loginEmail').value = data.user.email; }); }catch{}
    });
  }
  if (!byId('btnLogout')){
    const b = document.createElement('button'); b.id='btnLogout'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90 hidden'; b.textContent=__t('auth.logout', 'Logout');
    bar.appendChild(b);
    b.addEventListener('click', async ()=>{ try{ await sb.auth.signOut(); }catch{} location.reload(); });
  }
  if (!byId('btnAdminLogin')){
    const b = document.createElement('button'); b.id='btnAdminLogin'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90'; b.textContent=__t('admin.button', 'Login as Administrator');
    bar.appendChild(b);
    b.addEventListener('click', ()=>{
      const m = byId('adminLoginModal'); if (!m) return; m.classList.remove('hidden');
      try{ sb.auth.getUser().then(({data})=>{ if (data?.user?.email) byId('adminEmail').value = data.user.email; }); }catch{}
    });
  }
}
