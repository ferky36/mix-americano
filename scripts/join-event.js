"use strict";
// ===== Join Event (Viewer self-join) =====
const __joinT = (k,f)=> (window.__i18n_get ? __i18n_get(k,f) : f);
async function __joinAskYesNo(msg){
  try{ if (typeof askYesNo === 'function') return await askYesNo(msg); }catch{}
  if (!window.__ynModal){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);';
    const panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;padding:16px 18px;border-radius:12px;max-width:340px;width:92%;box-shadow:0 12px 28px rgba(0,0,0,0.25);';
    const txt = document.createElement('div'); txt.style.cssText='font-weight:600;margin-bottom:12px;color:#111;white-space:pre-line;'; panel.appendChild(txt);
    const row = document.createElement('div'); row.style.cssText='display:flex;gap:10px;justify-content:flex-end;'; panel.appendChild(row);
    const bNo = document.createElement('button'); bNo.textContent='Tidak'; bNo.style.cssText='padding:8px 12px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#111;';
    const bYes = document.createElement('button'); bYes.textContent='Ya'; bYes.style.cssText='padding:8px 12px;border-radius:10px;background:#2563eb;color:#fff;border:0;';
    row.append(bNo,bYes); overlay.appendChild(panel); document.body.appendChild(overlay);
    window.__ynModal = { overlay, txt, bNo, bYes };
  }
  const { overlay, txt, bNo, bYes } = window.__ynModal;
  return new Promise(res=>{
    txt.textContent = msg;
    overlay.style.display = 'flex';
    const cleanup = (v)=>{ overlay.style.display='none'; bNo.onclick=bYes.onclick=null; res(v); };
    bYes.onclick = ()=> cleanup(true);
    bNo.onclick  = ()=> cleanup(false);
    overlay.onclick = (e)=>{ if (e.target===overlay) cleanup(false); };
  });
}
function ensureJoinControls(){
  const bar = byId('hdrControls'); if (!bar) return;
  if (!byId('btnJoinEvent')){
    const j = document.createElement('button');
    j.id='btnJoinEvent';
    j.className='px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:opacity-90 hidden';
    j.textContent=__joinT('join.button','Join Event');
    j.addEventListener('click', openJoinFlow);
    bar.appendChild(j);
  }
  if (!byId('joinStatus')){
    const wrap = document.createElement('span');
    wrap.id='joinStatus';
    wrap.className='flex items-center gap-2 text-sm hidden';
    const label = document.createElement('span');
    label.textContent = __joinT('join.joinedAs','Joined as');
    const name = document.createElement('span'); name.id='joinedPlayerName'; name.className='font-semibold';
    const edit = document.createElement('button');
    edit.id='btnEditSelfName';
    edit.className='px-2 py-1 rounded-lg border dark:border-gray-700';
    edit.textContent=__joinT('join.edit','Edit');
    edit.addEventListener('click', editSelfNameFlow);
    const leave = document.createElement('button');
    leave.id='btnLeaveSelf';
    leave.className='px-2 py-1 rounded-lg border dark:border-gray-700';
    leave.textContent=__joinT('join.leave','Leave');
    leave.addEventListener('click', async ()=>{
      if (!currentEventId) return;
      const ok = await __joinAskYesNo(__joinT('join.leaveConfirm','Keluar dari event (hapus nama Anda dari daftar pemain)?'));
      if (!ok) { showToast?.(__joinT('join.leaveCancelled','Batal keluar event.'), 'info'); return; }
      try{
        showLoading(__joinT('join.leave','Leave')+'...');
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
          try{ showToast(__joinT('join.slotReplaced','Slot Anda digantikan oleh')+' '+ res.promoted, 'info'); }catch{}
        }
        await loadStateFromCloud();
        renderPlayersList?.(); renderAll?.();
      }catch(e){ showToast?.(__joinT('join.leaveFail','Gagal leave:') + ' ' + (e?.message||''), 'error'); }
      finally{ hideLoading(); refreshJoinUI(); }
    });
    wrap.appendChild(label); wrap.appendChild(name); wrap.appendChild(edit); wrap.appendChild(leave);
    bar.appendChild(wrap);
  }
}

async function openJoinFlow(){
  if (!currentEventId){ showToast?.(__joinT('join.openFirst','Buka event terlebih dahulu.'), 'warn'); return; }
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
        <h3 class="text-lg font-semibold">${__joinT('join.button','Join Event')}</h3>
        <button id="joinCancelBtn" class="px-3 py-1 rounded-lg border dark:border-gray-700">${__joinT('join.close','Tutup')}</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">${__joinT('join.nameLabel','Nama')}</label>
          <input id="joinNameInput" type="text" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" placeholder="${__joinT('join.namePlaceholder','Nama Anda')}" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">${__joinT('join.gender','Gender')}</label>
            <select id="joinGenderSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              <option value="">${__joinT('join.genderPlaceholder','-')}</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">${__joinT('join.level','Level')}</label>
            <select id="joinLevelSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              <option value="">${__joinT('join.levelPlaceholder','-')}</option>
              <option value="beg">beg</option>
              <option value="pro">pro</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button id="joinSubmitBtn" class="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold">${__joinT('join.button','Join Event')}</button>
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
    const tMsg = window.joinOpenAt
      ? __joinT('join.notOpenAt','Belum bisa join. Pendaftaran dibuka pada {date} {time}.')
          .replace('{date}', toLocalDateValue(window.joinOpenAt))
          .replace('{time}', toLocalTimeValue(window.joinOpenAt))
      : __joinT('join.notOpen','Belum bisa join. Pendaftaran belum dibuka.');
    if (msg) { msg.textContent = tMsg; msg.className = 'text-xs mt-2 text-amber-600 dark:text-amber-400'; }
    try{ showToast?.(tMsg, 'info'); }catch{}
    return;
  }

  const name = (byId('joinNameInput').value||'').trim();
  const gender = byId('joinGenderSelect').value||'';
  const level = byId('joinLevelSelect').value||'';
  const msg = byId('joinMsg');
  if (!currentEventId){ msg.textContent=__joinT('join.noEvent','Tidak ada event aktif.'); return; }
  if (!name){ msg.textContent=__joinT('join.nameRequired','Nama wajib diisi.'); return; }
  // disallow same name if already in waiting list or players (client-side friendly check)
  try {
    const norm = (s) => String(s || '').trim().toLowerCase();
    const n = norm(name);

    if (Array.isArray(waitingList) && waitingList.some(x => norm(x) === n)) {
      const t = __joinT('join.waitingDuplicate','Nama sudah ada di waiting list.'); 
      msg.textContent = t; msg.className = 'text-xs mt-2 text-amber-600 dark:text-amber-400';
      return;
    }
    if (Array.isArray(players) && players.some(x => norm(x) === n)) {
      const t = __joinT('join.playerDuplicate','Nama sudah ada di daftar pemain.');
      msg.textContent = t; msg.className = 'text-xs mt-2 text-amber-600 dark:text-amber-400';
      return;
    }
  } catch {}
  // prevent duplicate join
  try{
    const { data } = await sb.auth.getUser();
    const uid = data?.user?.id || '';
    const found = findJoinedPlayerByUid(uid);
    if (found){ msg.textContent=__joinT('join.already','Anda sudah join sebagai')+' '+found.name; return; }
  }catch{}
  try{
    showLoading(__joinT('join.loading','Joining…'));
    const res = await requestJoinEventRPC({ name, gender, level });
    const status = (res && res.status) || '';
    const joinedName = res?.name || name;
    if (status === 'joined') {
      showToast(__joinT('join.success','Berhasil join sebagai')+' '+ joinedName, 'success');
      const ok = await loadStateFromCloud();
      if (!ok) showToast(__joinT('join.partialLoadFail','Berhasil join, tapi gagal memuat data terbaru.'), 'warn');
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      byId('joinModal')?.classList.add('hidden');
    } else if (status === 'already') {
      const nm = res?.name || name;
      const t = __joinT('join.alreadyRegistered','Anda sudah terdaftar sebagai')+' '+ nm;
      msg.textContent = t; msg.className = 'text-xs mt-2 text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
    } else if (status === 'waitlisted' || status === 'full') {
      const t = __joinT('join.waitlistFull','List sudah penuh, Anda masuk ke waiting list');
      msg.textContent = t; msg.className = 'text-xs mt-2 text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
      const ok = await loadStateFromCloud();
      if (!ok) showToast(__joinT('join.waitlistPartial','Berhasil masuk waiting list, tapi gagal memuat data.'), 'warn');
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      byId('joinModal')?.classList.add('hidden');
    } else if (status === 'closed') {
      const t = __joinT('join.closed','Pendaftaran ditutup. Hanya member yang bisa join.');
      msg.textContent = t; msg.className = 'text-xs mt-2 text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
    } else if (status === 'unauthorized') {
      const t = __joinT('join.loginFirst','Silakan login terlebih dahulu.');
      msg.textContent = t; msg.className = 'text-xs mt-2 text-red-600 dark:text-red-400';
      showToast(t, 'error');
    } else if (status === 'not_found') {
      const t = __joinT('join.eventNotFound','Event tidak ditemukan.');
      msg.textContent = t; msg.className = 'text-xs mt-2 text-red-600 dark:text-red-400';
      showToast(t, 'error');
    } else {
      const t = __joinT('join.failed','Gagal join. Silakan coba lagi.');
      msg.textContent = t; msg.className = 'text-xs mt-2 text-red-600 dark:text-red-400';
      showToast(t, 'error');
    }
  }catch(e){
    console.error(e);
    const t = __joinT('join.failedPrefix','Gagal join:') + ' ' + (e?.message || '');
    msg.textContent = t;
    msg.className = 'text-xs mt-2 text-red-600 dark:text-red-400';
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

// ===== Edit Name Modal (self or player list) =====
let __editNameCtx = null;
let editNameModalEl=null, editNameInputEl=null, editGenderSelectEl=null, editLevelSelectEl=null,
    editNameMsgEl=null, editNameTitleEl=null, editNameMetaRowEl=null;

function ensureEditNameModal(){
  if (editNameModalEl) return;
  const div = document.createElement('div');
  div.id='editNameModal';
  div.className='fixed inset-0 z-50 hidden';
  div.innerHTML = `
    <div class="absolute inset-0 bg-black/40" id="editNameBackdrop"></div>
    <div class="relative mx-auto mt-20 w-[92%] max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow p-4 md:p-6 border dark:border-gray-700">
      <h3 id="editNameTitle" class="text-base md:text-lg font-semibold mb-3">${__joinT('join.editTitle','Ubah Nama')}</h3>
      <input id="editNameInput" type="text" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
      <div id="editNameMetaRow" class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">${__joinT('join.gender','Gender')}</label>
          <select id="editGenderSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            <option value="">${__joinT('join.genderPlaceholder','-')}</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">${__joinT('join.level','Level')}</label>
          <select id="editLevelSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            <option value="">${__joinT('join.levelPlaceholder','-')}</option>
            <option value="beg">beg</option>
            <option value="pro">pro</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-4">
        <button id="editNameOk" class="px-3 py-2 rounded-xl bg-indigo-600 text-white">${__joinT('join.save','Simpan')}</button>
        <button id="editNameCancel" class="px-3 py-2 rounded-xl border dark:border-gray-700">${__joinT('join.cancel','Batal')}</button>
      </div>
      <div id="editNameMsg" class="text-xs mt-2"></div>
    </div>`;
  document.body.appendChild(div);
  editNameModalEl = div;
  editNameInputEl = byId('editNameInput');
  editGenderSelectEl = byId('editGenderSelect');
  editLevelSelectEl = byId('editLevelSelect');
  editNameMsgEl = byId('editNameMsg');
  editNameTitleEl = byId('editNameTitle');
  editNameMetaRowEl = byId('editNameMetaRow');
  byId('editNameBackdrop').addEventListener('click', hideEditNameModal);
  byId('editNameCancel').addEventListener('click', hideEditNameModal);
  byId('editNameOk').addEventListener('click', submitEditNameModal);
  editNameInputEl.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); submitEditNameModal(); } });
}

function openEditNameModal(ctx){
  ensureEditNameModal();
  __editNameCtx = ctx || {};
  const title = ctx?.title || __joinT('join.editTitle','Ubah Nama');
  const initial = ctx?.initialName || '';
  const allowMeta = !!ctx?.allowMeta;
  const g = ctx?.initialGender || '';
  const lv = ctx?.initialLevel || '';
  if (editNameTitleEl) editNameTitleEl.textContent = title;
  if (editNameInputEl){
    editNameInputEl.value = initial;
    setTimeout(()=>{ try{ editNameInputEl.focus(); editNameInputEl.select(); }catch{} }, 30);
  }
  if (editNameMetaRowEl) editNameMetaRowEl.classList.toggle('hidden', !allowMeta);
  if (editGenderSelectEl) editGenderSelectEl.value = g;
  if (editLevelSelectEl) editLevelSelectEl.value = lv;
  if (editNameMsgEl){ editNameMsgEl.textContent=''; editNameMsgEl.className='text-xs mt-2'; }
  editNameModalEl.classList.remove('hidden');
}

function hideEditNameModal(){
  if (editNameModalEl) editNameModalEl.classList.add('hidden');
  __editNameCtx = null;
}

async function editSelfNameFlow(){
  try{
    if (!currentEventId){ showToast?.(__joinT('join.openFirst','Buka event terlebih dahulu.'), 'warn'); return; }
    let user=null; try{ const data = await (window.getAuthUserCached ? getAuthUserCached() : sb.auth.getUser().then(r=>r.data)); user = data?.user || null; }catch{}
    if (!user){ byId('loginModal')?.classList.remove('hidden'); return; }
    const found = findJoinedPlayerByUid(user.id);
    if (!found || !found.name){ showToast?.(__joinT('join.notJoined','Anda belum join di event ini.'), 'warn'); return; }
    const meta = (playerMeta && playerMeta[found.name]) ? playerMeta[found.name] : {};
    openEditNameModal({
      mode:'self',
      title:__joinT('join.editSelfTitle','Ubah nama tampilan Anda'),
      initialName: found.name,
      initialGender: meta?.gender || '',
      initialLevel: meta?.level || '',
      allowMeta: true,
      userId: user.id,
      originalName: found.name
    });
  }catch(e){ console.warn('editSelfNameFlow failed', e); showToast?.(__joinT('join.editOpenFail','Gagal membuka editor nama.'), 'error'); }
}

async function submitEditNameModal(){
  try{
    const ctx = __editNameCtx || {};
    const oldName = ctx.originalName || '';
    const allowMeta = !!ctx.allowMeta;
    const msg = editNameMsgEl;
    const newName = (editNameInputEl?.value || '').trim();
    const newGender = allowMeta ? (editGenderSelectEl?.value || '') : '';
    const newLevel  = allowMeta ? (editLevelSelectEl?.value || '') : '';
    if (!newName){ if (msg){ msg.textContent=__joinT('join.nameEmpty','Nama tidak boleh kosong.'); msg.className='text-xs mt-2 text-red-600 dark:text-red-400'; } return; }
    const norm = (s)=>String(s||'').trim().toLowerCase();
    const targetN = norm(newName);
    const oldN = norm(oldName);
    if (ctx.mode === 'self'){
      let userId = ctx.userId;
      if (!userId){
        try{ const data = await (window.getAuthUserCached ? getAuthUserCached() : sb.auth.getUser().then(r=>r.data)); userId = data?.user?.id || null; }
        catch{}
      }
      if (!userId){ byId('loginModal')?.classList.remove('hidden'); return; }
      const dupPlayers = Array.isArray(players) && players.some(n=>{ const k=norm(n); return k===targetN && k!==oldN; });
      const dupWaiting = Array.isArray(waitingList) && waitingList.some(n=>{ const k=norm(n); return k===targetN && k!==oldN; });
      if (dupPlayers || dupWaiting){ if (msg){ msg.textContent=__joinT('join.nameUsed','Nama sudah digunakan. Pilih nama lain.'); msg.className='text-xs mt-2 text-amber-600 dark:text-amber-400'; } return; }
      if (newName === oldName){
      try{
        playerMeta = (typeof playerMeta==='object' && playerMeta) ? playerMeta : {};
        const prev = playerMeta[oldName] ? {...playerMeta[oldName]} : {};
        playerMeta[oldName] = { ...prev, uid: prev.uid || userId, gender: newGender || '', level: newLevel || '' };
      }catch{}
      try{ markDirty?.(); renderPlayersList?.(); renderAll?.(); validateNames?.(); refreshJoinUI?.(); }catch{}
      try{ if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{}
      showToast?.(__joinT('join.profileUpdated','Profil diperbarui.'), 'success');
      hideEditNameModal();
      return;
      }
      // rename self entry in players/waiting list
      let renamed=false;
      if (Array.isArray(players)){
        const idx = players.findIndex(n => norm(n)===oldN);
        if (idx>=0){ players[idx]=newName; renamed=true; }
      }
      if (!renamed && Array.isArray(waitingList)){
        const idx2 = waitingList.findIndex(n => norm(n)===oldN);
        if (idx2>=0){ waitingList[idx2]=newName; renamed=true; }
      }
      try{
        playerMeta = (typeof playerMeta==='object' && playerMeta) ? playerMeta : {};
        const meta = playerMeta[oldName] ? {...playerMeta[oldName]} : {};
        if (!playerMeta[newName]) playerMeta[newName] = {};
        playerMeta[newName] = { ...meta, uid: meta.uid || userId, gender: newGender || '', level: newLevel || '' };
        if (oldName in playerMeta) delete playerMeta[oldName];
      }catch{}
      try{ if (typeof replaceNameInRounds === 'function') replaceNameInRounds(oldName, newName); }catch{}
      try{ markDirty?.(); renderPlayersList?.(); renderAll?.(); validateNames?.(); refreshJoinUI?.(); }catch{}
      try{ if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{}
      showToast?.(__joinT('join.selfRenamed','Nama diperbarui menjadi {name}').replace('{name}', newName), 'success');
      hideEditNameModal();
      return;
    }

    if (ctx.mode === 'playerList'){
      if (typeof isViewer === 'function' && isViewer()) { hideEditNameModal(); return; }
      const idx = Array.isArray(players) ? players.findIndex(n => norm(n)===oldN) : -1;
      if (idx < 0){ if (msg){ msg.textContent=__joinT('join.nameNotFound','Nama tidak ditemukan di daftar pemain.'); msg.className='text-xs mt-2 text-red-600 dark:text-red-400'; } return; }
      const dupPlayers = players.some((n,i)=>{ const k=norm(n); return i!==idx && k===targetN; });
      const dupWaiting = Array.isArray(waitingList) && waitingList.some(n=> norm(n)===targetN);
      if (dupPlayers || dupWaiting){ if (msg){ msg.textContent=__joinT('join.nameUsed','Nama sudah digunakan. Pilih nama lain.'); msg.className='text-xs mt-2 text-amber-600 dark:text-amber-400'; } return; }
      if (newName === oldName){ hideEditNameModal(); return; }
      players[idx] = newName;
      try{
        playerMeta = (typeof playerMeta==='object' && playerMeta) ? playerMeta : {};
        const meta = playerMeta[oldName] ? {...playerMeta[oldName]} : {};
        if (!playerMeta[newName]) playerMeta[newName] = {};
        playerMeta[newName] = { ...meta };
        if (oldName in playerMeta) delete playerMeta[oldName];
      }catch{}
      try{ if (typeof replaceNameInRounds === 'function') replaceNameInRounds(oldName, newName); }catch{}
      try{ markDirty?.(); renderPlayersList?.(); renderAll?.(); validateNames?.(); refreshJoinUI?.(); }catch{}
      try{ if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{}
      showToast?.(__joinT('join.playerUpdated','Nama pemain diperbarui.'), 'success');
      hideEditNameModal();
      return;
    }

    hideEditNameModal();
  }catch(e){ console.warn('submitEditSelfName failed', e); showToast?.(__joinT('join.updateFail','Gagal memperbarui nama. Coba lagi.'), 'error'); }
}

function openPlayerNameEditModal(name){
  if (!name || (typeof isViewer==='function' && isViewer())) return;
  const norm = s=>String(s||'').trim().toLowerCase();
  const exists = Array.isArray(players) && players.some(n=>norm(n)===norm(name));
  if (!exists){ showToast?.(__joinT('join.nameNotFound','Nama tidak ditemukan di daftar pemain.'), 'warn'); return; }
  openEditNameModal({
    mode:'playerList',
    title:__joinT('join.editPlayerTitle','Ubah nama pemain'),
    initialName: name,
    allowMeta:false,
    originalName: name
  });
}
window.openPlayerNameEditModal = openPlayerNameEditModal;

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
