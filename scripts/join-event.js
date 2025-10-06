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
    label.textContent = 'Sudah Join sebagai';
    const name = document.createElement('span'); name.id='joinedPlayerName'; name.className='font-semibold';
    const leave = document.createElement('button');
    leave.id='btnLeaveSelf';
    leave.className='px-2 py-1 rounded-lg border dark:border-gray-700';
    leave.textContent='Leave';
    leave.addEventListener('click', async ()=>{
      if (!currentEventId) return;
      if (!confirm('Keluar dari event (hapus nama Anda dari daftar pemain)?')) return;
      try{
        showLoading('Leaving…');
        const res = await requestLeaveEventRPC();
        if (res && res.promoted) {
          try{ showToast('Slot Anda digantikan oleh '+ res.promoted, 'info'); }catch{}
        }
        await loadStateFromCloud();
        renderPlayersList?.(); renderAll?.();
      }catch(e){ alert('Gagal leave: ' + (e?.message||'')); }
      finally{ hideLoading(); refreshJoinUI(); }
    });
    wrap.appendChild(label); wrap.appendChild(name); wrap.appendChild(leave);
    bar.appendChild(wrap);
  }
}

async function openJoinFlow(){
  if (!currentEventId){ alert('Buka event terlebih dahulu.'); return; }
  try{
    const { data } = await sb.auth.getUser();
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
    const { data } = await sb.auth.getUser();
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

async function requestLeaveEventRPC(){
  const d = byId('sessionDate')?.value || currentSessionDate || new Date().toISOString().slice(0,10);
  const { data, error } = await sb.rpc('request_leave_event', {
    p_event_id: currentEventId,
    p_session_date: d
  });
  if (error) throw error;
  return data;
}
