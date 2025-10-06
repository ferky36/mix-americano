"use strict";
// ========== Auth helpers ==========
async function handleAuthRedirect(){
  try{
    showLoading('Memproses login…');
    const hash = location.hash || '';
    const hasCode = /[?#&](code|access_token)=/.test(location.href) || hash.includes('type=recovery');
    if (hasCode && sb?.auth?.exchangeCodeForSession) {
      await sb.auth.exchangeCodeForSession(window.location.href);
      history.replaceState({}, '', location.pathname + location.search);
    }
  }catch(e){ console.warn('auth redirect handling failed', e); }
  finally { hideLoading(); }
}

async function getCurrentUser(){
  try{ const { data } = await sb.auth.getUser(); return data?.user || null; }catch{ return null; }
}

// Subscribe ke perubahan sesi agar role/owner ter-update setelah refresh/token refresh
try {
  if (window.sb && !window.__authRoleWatcher){
    window.__authRoleWatcher = sb.auth.onAuthStateChange((_event, _session)=>{
      // Event bisa: INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, SIGNED_OUT
      try{ updateAuthUI?.(); }catch{}
    });
  }
} catch {}

async function updateAuthUI(){
  const user = await getCurrentUser();
  const loginBtn = byId('btnLogin'); const logoutBtn = byId('btnLogout'); const info = byId('authInfo'); const email = byId('authUserEmail');
  if (user){
    // Otomatiskan akses editor berdasarkan metadata / tabel user_roles (tanpa owner=yes di URL)
    await resolveUserRoleAndApply(user);
    loginBtn?.classList.add('hidden'); byId('btnAdminLogin')?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');
    info?.classList.remove('hidden');
    if (email) email.textContent = user.email || user.id;
  } else {
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
    isOwner = !!(user.app_metadata?.is_owner || user.user_metadata?.is_owner || role==='owner' || role==='admin');
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
        isOwner = !!data.is_owner || role==='owner' || role==='admin';
        try{ localStorage.setItem(CK, JSON.stringify({ role, isOwner, ts: Date.now() })); }catch{}
        // Persist ke user_metadata agar terbaca di /auth/v1/user tanpa query DB pada refresh berikutnya
        try{ await sb.auth.updateUser({ data: { role, is_owner: isOwner } }); }catch{}
      }
    }catch{}
  }

  window._isOwnerUser = !!isOwner;
  const desired = (role==='editor' || role==='owner' || role==='admin') ? 'editor' : 'viewer';
  try{
    if (typeof accessRole==='undefined' || accessRole !== desired) {
      setAccessRole?.(desired);
    } else {
      // Role tidak berubah; jika owner flag berubah, terapkan ulang mode agar tombol owner muncul
      if (prevOwner !== window._isOwnerUser) { try{ applyAccessMode?.(); }catch{} }
    }
  }catch{}
}

function ensureAuthButtons(){
  const bar = byId('hdrControls'); if (!bar) return;
  if (!byId('authInfo')){
    const span = document.createElement('span'); span.id='authInfo'; span.className='text-xs px-2 py-1 bg-white/10 rounded hidden';
    const se = document.createElement('span'); se.id='authUserEmail'; span.innerHTML = 'Signed in: ';
    span.appendChild(se);
    bar.appendChild(span);
  }
  if (!byId('btnLogin')){
    const b = document.createElement('button'); b.id='btnLogin'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90'; b.textContent='Login';
    bar.appendChild(b);
    b.addEventListener('click', ()=>{
      const m = byId('loginModal'); if (!m) return; m.classList.remove('hidden');
      try{ sb.auth.getUser().then(({data})=>{ if (data?.user?.email) byId('loginEmail').value = data.user.email; }); }catch{}
    });
  }
  if (!byId('btnLogout')){
    const b = document.createElement('button'); b.id='btnLogout'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90 hidden'; b.textContent='Logout';
    bar.appendChild(b);
    b.addEventListener('click', async ()=>{ try{ await sb.auth.signOut(); }catch{} location.reload(); });
  }
  if (!byId('btnAdminLogin')){
    const b = document.createElement('button'); b.id='btnAdminLogin'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90'; b.textContent='Login as Administrator';
    bar.appendChild(b);
    b.addEventListener('click', ()=>{
      const m = byId('adminLoginModal'); if (!m) return; m.classList.remove('hidden');
      try{ sb.auth.getUser().then(({data})=>{ if (data?.user?.email) byId('adminEmail').value = data.user.email; }); }catch{}
    });
  }
}
