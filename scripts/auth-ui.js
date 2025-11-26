"use strict";
// ========== Auth UI bindings ==========
const __authT = (k,f)=> (window.__i18n_get ? __i18n_get(k,f) : f);
byId('btnLogin')?.addEventListener('click', ()=>{
  const m = byId('loginModal'); if (!m) return; m.classList.remove('hidden');
  const user = null; try{ sb.auth.getUser().then(({data})=>{ if (data?.user?.email) byId('loginEmail').value = data.user.email; }); }catch{}
});
byId('loginBackdrop')?.addEventListener('click', ()=> byId('loginModal').classList.add('hidden'));
byId('loginCancelBtn')?.addEventListener('click', ()=> { byId('loginModal').classList.add('hidden'); const b=byId('loginSendBtn'); if (b) b.textContent=__authT('auth.send','Kirim Link Login'); const m=byId('loginMsg'); if(m) m.textContent=''; });
// Login OTP sederhana (tanpa Edge Function)
byId('loginSendBtn')?.addEventListener('click', async ()=>{
  const email = (byId('loginEmail').value||'').trim();
  const msg = byId('loginMsg'); const btn = byId('loginSendBtn');
  msg.textContent=''; msg.className = 'text-xs text-gray-500 dark:text-gray-300';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.textContent=__authT('auth.emailInvalid','Email tidak valid.'); return; }
  btn.disabled = true; btn.textContent=__authT('auth.sending','Mengirim…');
  try{
    await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: getAuthRedirectURL(), shouldCreateUser: true } });
    msg.textContent=__authT('auth.sendSuccess','Cek email Anda untuk magic link.');
    msg.className='text-xs text-green-600 dark:text-green-400';
  }catch(e){ console.error(e); msg.textContent=__authT('auth.sendError','Gagal mengirim link.'); msg.className='text-xs text-red-600 dark:text-red-400'; }
  finally{ btn.disabled=false; btn.textContent=__authT('auth.send','Kirim Link Login'); }
});
byId('btnLogout')?.addEventListener('click', async ()=>{
  try{ await sb.auth.signOut(); }catch{}
  location.reload();
});

// ===== Admin (email+password) modal =====
byId('adminBackdrop')?.addEventListener('click', ()=> byId('adminLoginModal')?.classList.add('hidden'));
byId('adminCancelBtn')?.addEventListener('click', ()=>{ const m=byId('adminLoginModal'); if (m) m.classList.add('hidden'); const b=byId('adminLoginBtn'); if (b) b.textContent=__authT('admin.submit','Login'); const s=byId('adminMsg'); if (s) s.textContent=''; });
byId('adminLoginBtn')?.addEventListener('click', async ()=>{
  const email = (byId('adminEmail')?.value||'').trim();
  const pass  = (byId('adminPass')?.value||'').trim();
  const btn   = byId('adminLoginBtn'); const msg = byId('adminMsg');
  if (msg){ msg.textContent=''; msg.className='text-xs text-gray-500 dark:text-gray-300'; }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if(msg) msg.textContent=__authT('auth.emailInvalid','Email tidak valid.'); return; }
  if (!pass || pass.length<6){ if(msg) msg.textContent=__authT('auth.passwordMin','Password minimal 6 karakter.'); return; }
  try{
    if (btn) { btn.disabled=true; btn.textContent=__authT('auth.processing','Memproses…'); }
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error){ if(msg){ msg.textContent=__authT('auth.loginFailed','Login gagal.'); msg.className='text-xs text-red-600 dark:text-red-400'; } return; }
    // sukses
    try{ await updateAuthUI(); }catch{}
    const m = byId('adminLoginModal'); if (m) m.classList.add('hidden');
  }catch(e){ if(msg){ msg.textContent=__authT('auth.error','Terjadi kesalahan.'); msg.className='text-xs text-red-600 dark:text-red-400'; } }
  finally{ if (btn){ btn.disabled=false; btn.textContent=__authT('admin.submit','Login'); } }
});
