"use strict";
// ===== Join Event (Viewer self-join) =====
function ensureJoinControls(){
  const bar = byId('hdrControls'); if (!bar) return;
  if (!byId('btnJoinEvent')){
    const j = document.createElement('button');
    j.id='btnJoinEvent';
    j.className='px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:opacity-90 hidden';
    j.textContent='Join Event';
    j.addEventListener('click', openJoinFlow);
    bar.appendChild(j);
  }
  if (!byId('joinStatus')){
    const wrap = document.createElement('span');
    wrap.id='joinStatus';
    wrap.className='flex items-center gap-2 text-sm hidden';
    const label = document.createElement('span');
    label.textContent = 'Joined as';
    const name = document.createElement('span'); name.id='joinedPlayerName'; name.className='font-semibold';
    const edit = document.createElement('button');
    edit.id='btnEditSelfName';
    edit.className='px-2 py-1 rounded-lg border dark:border-gray-700';
    edit.textContent='Edit';
    edit.addEventListener('click', editSelfNameFlow);
    const leave = document.createElement('button');
    leave.id='btnLeaveSelf';
    leave.className='px-2 py-1 rounded-lg border dark:border-gray-700';
    leave.textContent='Leave';
    leave.addEventListener('click', async ()=>{
      if (!currentEventId) return;
      if (!confirm('Keluar dari event (hapus nama Anda dari daftar pemain)?')) return;
      try{
        showLoading('Leaving...');
        const res = await requestLeaveEventRPC();
        let removedName = null;
        try{
          if (res && typeof res === 'object') removedName = res.name || null;
        }catch{}
        if (removedName){
          try{
            const wasPaid = (typeof isPlayerPaid === 'function') ? isPlayerPaid(removedName) : false;
            if (wasPaid){
              await removeCashflowForPlayer(removedName);
            }
          }catch{}
        }
        if (res && res.promoted) {
          try{ showToast('Slot Anda digantikan oleh '+ res.promoted, 'info'); }catch{}
        }
        await loadStateFromCloud();
        renderPlayersList?.(); renderAll?.();
      }catch(e){ alert('Gagal leave: ' + (e?.message||'')); }
      finally{ hideLoading(); refreshJoinUI(); }
    });
    wrap.appendChild(label); wrap.appendChild(name); wrap.appendChild(edit); wrap.appendChild(leave);
    bar.appendChild(wrap);
  }
}

async function openJoinFlow(){
  if (!currentEventId){ alert('Buka event terlebih dahulu.'); return; }
  try{
    const data = await (window.getAuthUserCached ? getAuthUserCached() : sb.auth.getUser().then(r=>r.data));
    const user = data?.user || null;
    if (!user){ byId('loginModal')?.classList.remove('hidden'); return; }
  }catch{}
  openJoinModal();
}

function ensureJoinModal(){
  if (byId('joinModal')) return;
  const div = document.createElement('div');
  div.id='joinModal';
  div.className='fixed inset-0 z-50 hidden';
  div.innerHTML = `
    <div class="absolute inset-0 bg-black/40" id="joinBackdrop"></div>
    <div class="relative mx-auto mt-16 w-[92%] max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow p-4 md:p-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">Join Event</h3>
        <button id="joinCancelBtn" class="px-3 py-1 rounded-lg border dark:border-gray-700">Tutup</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Nama</label>
          <input id="joinNameInput" type="text" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Gender</label>
            <select id="joinGenderSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              <option value="">-</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Level</label>
            <select id="joinLevelSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              <option value="">-</option>
              <option value="beg">beg</option>
              <option value="pro">pro</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button id="joinSubmitBtn" class="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold">Join</button>
        </div>
        <div id="joinMsg" class="text-xs"></div>
      </div>
    </div>`;
  document.body.appendChild(div);
  byId('joinBackdrop').addEventListener('click', ()=> byId('joinModal').classList.add('hidden'));
  byId('joinCancelBtn').addEventListener('click', ()=> byId('joinModal').classList.add('hidden'));
  byId('joinSubmitBtn').addEventListener('click', submitJoinForm);
}

async function openJoinModal(){
  ensureJoinModal();
  const m = byId('joinModal'); if (!m) return;
  // Prefill values
  let suggestedName = '';
  let g = '', lv = '';
  try{
    const data = await (window.getAuthUserCached ? getAuthUserCached() : sb.auth.getUser().then(r=>r.data));
    const u = data?.user || null;
    const uid = u?.id || '';
    const found = findJoinedPlayerByUid(uid);
    if (found){ suggestedName = found.name; g = playerMeta[found.name]?.gender||''; lv = playerMeta[found.name]?.level||''; }
    if (!suggestedName){
      const fullName = u?.user_metadata?.full_name || '';
      const email = u?.email || '';
      suggestedName = fullName || (email ? email.split('@')[0] : '');
    }
  }catch{}
  byId('joinNameInput').value = suggestedName || '';
  byId('joinGenderSelect').value = g || '';
  byId('joinLevelSelect').value = lv || '';
  const msg = byId('joinMsg'); if (msg){ msg.textContent=''; msg.className='text-xs'; }
  m.classList.remove('hidden');
}

async function submitJoinForm(){
  // Gate: belum masuk waktu buka join
  if (!isJoinOpen()) {
    const msg = byId('joinMessage') || byId('joinError');
    const t = window.joinOpenAt
      ? `Belum bisa join. Pendaftaran dibuka pada ${toLocalDateValue(window.joinOpenAt)} ${toLocalTimeValue(window.joinOpenAt)}.`
      : 'Belum bisa join. Pendaftaran belum dibuka.';
    if (msg) { msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400'; }
    try{ showToast?.(t, 'info'); }catch{}
    return;
  }

  const name = (byId('joinNameInput').value||'').trim();
  const gender = byId('joinGenderSelect').value||'';
  const level = byId('joinLevelSelect').value||'';
  const msg = byId('joinMsg');
  if (!currentEventId){ msg.textContent='Tidak ada event aktif.'; return; }
  if (!name){ msg.textContent='Nama wajib diisi.'; return; }
  // disallow same name if already in waiting list or players (client-side friendly check)
  try {
    const norm = (s) => String(s || '').trim().toLowerCase();
    const n = norm(name);

    if (Array.isArray(waitingList) && waitingList.some(x => norm(x) === n)) {
      const t = 'Nama sudah ada di waiting list.'; 
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      return;
    }
    if (Array.isArray(players) && players.some(x => norm(x) === n)) {
      const t = 'Nama sudah ada di daftar pemain.';
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      return;
    }
  } catch {}
  // prevent duplicate join
  try{
    const { data } = await sb.auth.getUser();
    const uid = data?.user?.id || '';
    const found = findJoinedPlayerByUid(uid);
    if (found){ msg.textContent='Anda sudah join sebagai '+found.name; return; }
  }catch{}
  try{
    showLoading('Joining…');
    const res = await requestJoinEventRPC({ name, gender, level });
    const status = (res && res.status) || '';
    const joinedName = res?.name || name;
    if (status === 'joined') {
      showToast('Berhasil join sebagai '+ joinedName, 'success');
      const ok = await loadStateFromCloud();
      if (!ok) showToast('Berhasil join, tapi gagal memuat data terbaru.', 'warn');
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      byId('joinModal')?.classList.add('hidden');
    } else if (status === 'already') {
      const nm = res?.name || name;
      const t = 'Anda sudah terdaftar sebagai '+ nm;
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
    } else if (status === 'waitlisted' || status === 'full') {
      const t = 'List sudah penuh, Anda masuk ke waiting list';
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
      const ok = await loadStateFromCloud();
      if (!ok) showToast('Berhasil masuk waiting list, tapi gagal memuat data.', 'warn');
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      byId('joinModal')?.classList.add('hidden');
    } else if (status === 'closed') {
      const t = 'Pendaftaran ditutup. Hanya member yang bisa join.';
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
    } else if (status === 'unauthorized') {
      const t = 'Silakan login terlebih dahulu.';
      msg.textContent = t; msg.className = 'text-xs text-red-600 dark:text-red-400';
      showToast(t, 'error');
    } else if (status === 'not_found') {
      const t = 'Event tidak ditemukan.';
      msg.textContent = t; msg.className = 'text-xs text-red-600 dark:text-red-400';
      showToast(t, 'error');
    } else {
      const t = 'Gagal join. Silakan coba lagi.';
      msg.textContent = t; msg.className = 'text-xs text-red-600 dark:text-red-400';
      showToast(t, 'error');
    }
  }catch(e){
    console.error(e);
    const t = 'Gagal join: ' + (e?.message || '');
    msg.textContent = t;
    msg.className = 'text-xs text-red-600 dark:text-red-400';
    showToast(t, 'error');
  } finally { hideLoading(); refreshJoinUI(); }
}

function findJoinedPlayerByUid(uid){
  if (!uid) return null;
  try{
    const names = ([]).concat(players||[], waitingList||[]);
    for (const n of names){
      const meta = playerMeta?.[n] || {};
      if (meta.uid && meta.uid === uid) return { name: n, meta };
    }
  }catch{}
  return null;
}

async function requestJoinEventRPC({ name, gender, level }){
  const d = byId('sessionDate')?.value || currentSessionDate || new Date().toISOString().slice(0,10);
  const { data, error } = await sb.rpc('request_join_event', {
    p_event_id: currentEventId,
    p_session_date: d,
    p_name: name,
    p_gender: gender || null,
    p_level: level || null
  });
  if (error) throw error;
  return data;
}

// ===== Edit Self Name (preserve UID) =====
// Lightweight modal for editing display name
let __editNameOld = null;
function ensureEditNameModal(){
  if (byId('editNameModal')) return;
  const div = document.createElement('div');
  div.id='editNameModal';
  div.className='fixed inset-0 z-50 hidden';
  div.innerHTML = `
    <div class="absolute inset-0 bg-black/40" id="editNameBackdrop"></div>
    <div class="relative mx-auto mt-20 w-[92%] max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow p-4 md:p-6 border dark:border-gray-700">
      <h3 class="text-base md:text-lg font-semibold mb-3">Ubah nama tampilan Anda</h3>
      <input id="editNameInput" type="text" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Gender</label>
          <select id="editGenderSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            <option value="">-</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Level</label>
          <select id="editLevelSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            <option value="">-</option>
            <option value="beg">beg</option>
            <option value="pro">pro</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-4">
        <button id="editNameOk" class="px-3 py-2 rounded-xl bg-indigo-600 text-white">Simpan</button>
        <button id="editNameCancel" class="px-3 py-2 rounded-xl border dark:border-gray-700">Cancel</button>
      </div>
      <div id="editNameMsg" class="text-xs mt-2"></div>
    </div>`;
  document.body.appendChild(div);
  byId('editNameBackdrop').addEventListener('click', ()=> byId('editNameModal').classList.add('hidden'));
  byId('editNameCancel').addEventListener('click', ()=> byId('editNameModal').classList.add('hidden'));
  byId('editNameOk').addEventListener('click', submitEditSelfName);
  // Enter key support
  byId('editNameInput').addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); submitEditSelfName(); } });
}

async function editSelfNameFlow(){
  try{
    if (!currentEventId){ showToast?.('Buka event terlebih dahulu.', 'warn'); return; }
    let user=null; try{ const data = await (window.getAuthUserCached ? getAuthUserCached() : sb.auth.getUser().then(r=>r.data)); user = data?.user || null; }catch{}
    if (!user){ byId('loginModal')?.classList.remove('hidden'); return; }
    const found = findJoinedPlayerByUid(user.id);
    if (!found || !found.name){ showToast?.('Anda belum join di event ini.', 'warn'); return; }
    ensureEditNameModal();
    __editNameOld = found.name;
    const inp = byId('editNameInput');
    const msg = byId('editNameMsg'); if (msg){ msg.textContent=''; msg.className='text-xs'; }
    if (inp){ inp.value = __editNameOld; setTimeout(()=>{ inp.focus(); try{ inp.select(); }catch{} }, 30); }
    // Prefill gender & level from meta
    try{
      const meta = (playerMeta && playerMeta[__editNameOld]) ? playerMeta[__editNameOld] : {};
      const g = meta?.gender || '';
      const lv = meta?.level || '';
      const gs = byId('editGenderSelect'); if (gs) gs.value = g;
      const ls = byId('editLevelSelect'); if (ls) ls.value = lv;
    }catch{}
    byId('editNameModal').classList.remove('hidden');
  }catch(e){ console.warn('editSelfNameFlow failed', e); showToast?.('Gagal membuka editor nama.', 'error'); }
}

async function submitEditSelfName(){
  try{
    let user=null; try{ const data = await (window.getAuthUserCached ? getAuthUserCached() : sb.auth.getUser().then(r=>r.data)); user = data?.user || null; }catch{}
    if (!user) { byId('loginModal')?.classList.remove('hidden'); return; }
    const oldName = __editNameOld || '';
    const inp = byId('editNameInput');
    const msg = byId('editNameMsg');
    const newName = (inp?.value||'').trim();
    const newGender = byId('editGenderSelect')?.value || '';
    const newLevel  = byId('editLevelSelect')?.value || '';
    if (!newName){ if (msg){ msg.textContent='Nama tidak boleh kosong.'; msg.className='text-xs text-red-600 dark:text-red-400'; } return; }
    // If only gender/level changed (name stays the same), still update meta and save
    if (newName === oldName){
      try{
        playerMeta = (typeof playerMeta==='object' && playerMeta) ? playerMeta : {};
        const prev = playerMeta[oldName] ? {...playerMeta[oldName]} : {};
        playerMeta[oldName] = { ...prev, uid: prev.uid || user.id, gender: newGender || '', level: newLevel || '' };
      }catch{}
      try{ markDirty?.(); renderPlayersList?.(); renderAll?.(); validateNames?.(); refreshJoinUI?.(); }catch{}
      try{ if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{}
      showToast?.('Profil diperbarui.', 'success');
      byId('editNameModal').classList.add('hidden');
      return;
    }
    const norm = (s)=>String(s||'').trim().toLowerCase();
    const targetN = norm(newName);
    const oldN = norm(oldName);
    const dupPlayers = Array.isArray(players) && players.some(n=>{ const k=norm(n); return k===targetN && k!==oldN; });
    const dupWaiting = Array.isArray(waitingList) && waitingList.some(n=>{ const k=norm(n); return k===targetN && k!==oldN; });
    if (dupPlayers || dupWaiting){ if (msg){ msg.textContent='Nama sudah digunakan. Pilih nama lain.'; msg.className='text-xs text-amber-600 dark:text-amber-400'; } return; }
    // Apply rename in players or waiting list
    let renamed=false;
    if (Array.isArray(players)){
      const idx = players.findIndex(n => norm(n)===oldN);
      if (idx>=0){ players[idx]=newName; renamed=true; }
    }
    if (!renamed && Array.isArray(waitingList)){
      const idx2 = waitingList.findIndex(n => norm(n)===oldN);
      if (idx2>=0){ waitingList[idx2]=newName; renamed=true; }
    }
    // Move meta and preserve UID/attributes
    try{
      playerMeta = (typeof playerMeta==='object' && playerMeta) ? playerMeta : {};
      const meta = playerMeta[oldName] ? {...playerMeta[oldName]} : {};
      if (!playerMeta[newName]) playerMeta[newName] = {};
      playerMeta[newName] = { ...meta, uid: meta.uid || user.id, gender: newGender || '', level: newLevel || '' };
      if (oldName in playerMeta) delete playerMeta[oldName];
    }catch{}
    // Also propagate rename into scheduled matches (all courts/rounds)
    try{ if (typeof replaceNameInRounds === 'function') replaceNameInRounds(oldName, newName); }catch{}
    // Persist + refresh UI
    try{ markDirty?.(); renderPlayersList?.(); renderAll?.(); validateNames?.(); refreshJoinUI?.(); }catch{}
    try{ if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{}
    showToast?.('Nama diperbarui menjadi '+ newName, 'success');
    byId('editNameModal').classList.add('hidden');
  }catch(e){ console.warn('submitEditSelfName failed', e); showToast?.('Gagal memperbarui nama. Coba lagi.', 'error'); }
}

async function requestLeaveEventRPC(){
  const d = byId('sessionDate')?.value || currentSessionDate || new Date().toISOString().slice(0,10);
  const { data, error } = await sb.rpc('request_leave_event', {
    p_event_id: currentEventId,
    p_session_date: d
  });
  if (error) throw error;
  return data;
}

async function removeCashflowForPlayer(name){
  if (!name) return;
  const norm = (s)=>String(s||'').trim().toLowerCase();
  const target = norm(name);
  if (!target) return;
  try{
    if (typeof isCloudMode === 'function' && isCloudMode() && window.sb && currentEventId){
      try{
        const { error: rpcErr } = await sb.rpc('remove_paid_income', { p_event_id: currentEventId, p_label: name });
        if (rpcErr) throw rpcErr;
      }catch(err){
        try{
          await sb.from('event_cashflows')
            .delete()
            .eq('event_id', currentEventId)
            .eq('kind','masuk')
            .eq('label', name);
        }catch(fallbackErr){ console.warn('removeCashflowForPlayer fallback failed', fallbackErr); }
      }
    } else {
      const key = 'cash:'+ (currentEventId || 'local');
      let raw = null;
      try{ raw = localStorage.getItem(key); }catch{}
      if (!raw) return;
      let stored;
      try{ stored = JSON.parse(raw); }catch{ stored = null; }
      if (!stored || typeof stored !== 'object') return;
      if (!Array.isArray(stored.masuk)) stored.masuk = [];
      const before = stored.masuk.length;
      stored.masuk = stored.masuk.filter(row=> norm(row?.label) !== target);
      if (stored.masuk.length !== before){
        try{ localStorage.setItem(key, JSON.stringify(stored)); }catch{}
      }
    }
  }catch(e){ console.warn('removeCashflowForPlayer failed', e); }
}
