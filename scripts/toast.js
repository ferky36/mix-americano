"use strict";
function roleDebug(){ try{ if (window.__debugRole) console.debug('[role]', ...arguments); }catch{} }
// ============== Toast helper ==============
function showToast(message, type='info'){
  try{
    let host = byId('toastHost');
    if (!host){
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'fixed inset-x-0 top-3 z-[60] flex justify-center pointer-events-none';
      document.body.appendChild(host);
    }
    const box = document.createElement('div');
    const base = 'pointer-events-auto max-w-md mx-2 px-3 py-2 rounded-lg shadow text-sm';
    const kind = type==='success' ? 'bg-emerald-600 text-white' : type==='error' ? 'bg-red-600 text-white' : type==='warn' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white';
    box.className = base + ' ' + kind;
    box.textContent = String(message||'');
    host.appendChild(box);
    setTimeout(()=>{ box.style.opacity='0'; box.style.transition='opacity .3s'; }, 2200);
    setTimeout(()=>{ box.remove(); }, 2600);
  }catch{}
}

async function refreshJoinUI(){
  try{
    const hasEvent = !!currentEventId;
    const joinBtn = byId('btnJoinEvent');
    const statusWrap = byId('joinStatus');
    const nameEl = byId('joinedPlayerName');
    if (!hasEvent || !isViewer()){
      joinBtn && joinBtn.classList.add('hidden');
      statusWrap && statusWrap.classList.add('hidden');
      return;
    }
    let user=null; try{ const { data } = await sb.auth.getUser(); user = data?.user || null; }catch{}
    if (!user){
      if (joinBtn) { joinBtn.classList.remove('hidden'); joinBtn.disabled=false; }
      statusWrap && statusWrap.classList.add('hidden');
      return;
    }
    const found = findJoinedPlayerByUid(user.id);
    if (found){
      if (nameEl) nameEl.textContent = found.name;
      statusWrap && statusWrap.classList.remove('hidden');
      joinBtn && joinBtn.classList.add('hidden');
    } else {
      statusWrap && statusWrap.classList.add('hidden');
      joinBtn && joinBtn.classList.remove('hidden');
    }
  }catch{}
  // UNTUK BONUS: disable tombol Join jika belum waktunya buka pendaftaran
  // try{
  //   const joinBtn = byId('btnJoinEvent') || byId('joinSubmitBtn');
  //   const nameInp = byId('joinNameInput');
  //   const open = isJoinOpen();
  //   if (joinBtn) {
  //     joinBtn.disabled = !open;
  //     joinBtn.title = (!open && window.joinOpenAt)
  //       ? ('Pendaftaran dibuka: '+toLocalDateValue(window.joinOpenAt)+' '+toLocalTimeValue(window.joinOpenAt))
  //       : '';
  //   }
  //   if (nameInp) nameInp.disabled = !open;
  // } catch {}

}
// Fetch role from Supabase based on current user and event membership
async function loadAccessRoleFromCloud(){
  try{
    showLoading('Memuat akses…');
    if (!isCloudMode() || !window.sb?.auth || !currentEventId) { setAccessRole('editor'); return; }
    const { data: userData } = await sb.auth.getUser();
    const uid = userData?.user?.id || null;
    if (!uid){ setAccessRole('viewer'); return; }

    // Global owner (from auth-core): always editor, regardless of event ownership/membership
    if (window._isOwnerUser) {
      setAccessRole('editor');
      roleDebug('global-owner=true -> editor full');
      try{ ensureMaxPlayersField(); await loadMaxPlayersFromDB(); }catch{}
      try{ ensureLocationFields(); await loadLocationFromDB(); }catch{}
      try{ ensureJoinOpenFields();  await loadJoinOpenFromDB(); }catch{}
      try{ getPaidChannel(); }catch{}
      return;
    }

    // 1) event owner shortcut (optional) — do NOT overwrite global owner flag
    try{
      const { data: ev } = await sb.from('events').select('owner_id').eq('id', currentEventId).maybeSingle();
      const isEventOwner = !!(ev?.owner_id && ev.owner_id === uid);
      if (isEventOwner) { setAccessRole('editor'); roleDebug('event-owner=true -> editor full'); return; }
    }catch{}

    // 2) membership check
    const { data: mem } = await sb
      .from('event_members')
      .select('role')
      .eq('event_id', currentEventId)
      .eq('user_id', uid)
      .maybeSingle();
    const memRoleRaw = mem?.role || null;
    const memRole = String(memRoleRaw||'').toLowerCase();
    window._memberRole = memRole;
    window._isCashAdmin = (!!window._isOwnerUser) || (memRole === 'admin');
    // If wasit, enable score-only mode behavior (equivalent to legacy ?view=1)
    try{ window._viewerScoreOnly = (memRole === 'wasit'); }catch{}
    // Admin adalah role khusus kas; untuk akses umum tetap viewer
    const uiRole = (memRole === 'editor') ? 'editor' : 'viewer';
    setAccessRole(uiRole);
    roleDebug('membership', { memRole, _isOwnerUser: window._isOwnerUser, _isCashAdmin: window._isCashAdmin, uiRole });
    // Load event settings (max_players, location) once role known
    try{ ensureMaxPlayersField(); await loadMaxPlayersFromDB(); }catch{}
    try{ ensureLocationFields(); await loadLocationFromDB(); }catch{}
    try{ ensureJoinOpenFields();  await loadJoinOpenFromDB(); }catch{}
    try{ getPaidChannel(); }catch{}
    // Sync mobile cash tab visibility
    try{ updateMobileCashTab?.(); }catch{}
  }catch{ setAccessRole('viewer'); }
  finally { hideLoading(); }
}

// Compute cash-admin flag even if UI stays viewer (e.g., forced viewer via URL)
async function ensureCashAdminFlag(){
  try{
    if (!isCloudMode() || !window.sb?.auth || !currentEventId) return;
    const { data: userData } = await sb.auth.getUser();
    const uid = userData?.user?.id || null;
    if (!uid) return;
    const { data: mem } = await sb
      .from('event_members')
      .select('role')
      .eq('event_id', currentEventId)
      .eq('user_id', uid)
      .maybeSingle();
    const memRoleRaw = mem?.role || null;
    const memRole = String(memRoleRaw||'').toLowerCase();
    window._memberRole = memRole;
    window._isCashAdmin = (!!window._isOwnerUser) || (memRole === 'admin');
    try{ window._viewerScoreOnly = (memRole === 'wasit'); }catch{}
    roleDebug('ensureCashAdminFlag', { memRole, _isOwnerUser: window._isOwnerUser, _isCashAdmin: window._isCashAdmin, event: currentEventId, cloud:isCloudMode() });
    // Jika membership sudah editor dan tidak forced viewer, naikkan UI ke editor
    try{
      const forced = !!window._forceViewer;
      if (memRole === 'editor' && !forced) {
        if (typeof accessRole==='undefined' || accessRole !== 'editor') setAccessRole?.('editor');
      }
    }catch{}
    try{ const cb = byId('btnCashflow'); if (cb) cb.classList.toggle('hidden', !((!!window._isCashAdmin) && currentEventId && isCloudMode())); }catch{}
    try{ updateMobileCashTab?.(); }catch{}
  }catch{}
}

async function fetchEventTitleFromDB(eventId){
  try{
    showLoading('Memuat judul event…');
    const { data, error } = await sb
      .from('events')
      .select('title')
      .eq('id', eventId)
      .maybeSingle(); // jangan pakai .single() agar tidak PGRST116 ketika 0 row (bukan owner/member)
    if (error) return null;      
    return data?.title || null;
  }catch{ return null; }
  finally { hideLoading(); }
}





// Load state (JSONB) sekali saat buka/refresh
async function loadStateFromCloud() {
  showLoading('Memuat data dari Cloud…');
  const { data, error } = await sb.from('event_states')
    .select('state, version, updated_at')
    .eq('event_id', currentEventId)
    .eq('session_date', currentSessionDate)
    .maybeSingle();

  if (error) { console.error(error); hideLoading(); return false; }

  if (data && data.state) {
    console.log('Loaded state from Cloud, version', data);
    _serverVersion = data.version || 0;
    applyPayload(data.state);               // ← fungsi kamu yg sudah ada
    // kalau belum sempat set judul dari DB, pakai yang di payload
    if (data.state.eventTitle) setAppTitle(data.state.eventTitle);
    markSaved?.(data.updated_at);
    try{ refreshJoinUI?.(); }catch{}
    hideLoading();
    return true;
  }
  hideLoading();
  return false;
}

// Save (upsert) dengan optimistic concurrency
async function saveStateToCloud() {
  try {
    const payload = currentPayload();       // ← fungsi kamu yg sudah ada
    // Gunakan waitingList lokal apa adanya (lokal otoritatif).
    const { data, error } = await sb.from('event_states')
      .upsert({
        event_id: currentEventId,                 // UUID
        session_date: currentSessionDate,         // 'YYYY-MM-DD'
        state: payload,                            // JSONB
        version: (_serverVersion || 0) + 1
      }, { onConflict: 'event_id,session_date' })
      .select('version, updated_at')
      .single();

    if (error) throw error;
    // Sinkronkan kolom events.max_players saat Save (bukan onchange)
    try {
      if (isCloudMode() && window.sb?.from && currentEventId) {
        const mp = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : null;
        await sb.from('events').update({ max_players: mp }).eq('id', currentEventId);
      }
    } catch {}
    
    _serverVersion = data.version;
    markSaved?.(data.updated_at);
    return true;
  } catch (e) {
    console.error(e);
    const msg = String(e?.message||'');
    if (msg.includes('event_states_event_id_fkey') || msg.includes('Key is not present in table "events"') || e?.code==='23503'){
      showToast?.('Event tidak ditemukan / sudah dihapus. Keluar dari mode event.', 'error');
      try{ leaveEventMode?.(true); }catch{}
      try{ openSearchEventModal?.(); }catch{}
      return false;
    }
    alert('Gagal menyimpan ke Cloud. Coba lagi.');
    return false;
  }
}

// Realtime subscribe untuk row event+date aktif
function subscribeRealtimeForState(){
  if (!isCloudMode()) return;
  // Pastikan kanal lama dibersihkan agar tidak dobel callback
  try{ if (_stateRealtimeChannel){ _stateRealtimeChannel.unsubscribe?.(); try{ sb.removeChannel?.(_stateRealtimeChannel); }catch{} _stateRealtimeChannel=null; } }catch{}

  _stateRealtimeChannel = sb.channel(`es:${currentEventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_states',
      filter: `event_id=eq.${currentEventId}`
    }, (payload) => {
      const row = payload.new || payload.old || {};
      // Be robust: row.session_date may be undefined or a Date-like value
      const raw = (row && (row.session_date ?? row.sessionDate)) ?? null;
      if (raw) {
        let key = '';
        try {
          if (typeof raw === 'string') {
            // normalize 'YYYY-MM-DD' or full ISO; keep only date part
            key = normalizeDateKey(raw.slice(0, 10));
          } else {
            const dt = new Date(raw);
            key = isNaN(dt.getTime()) ? String(raw).slice(0, 10) : dt.toISOString().slice(0, 10);
          }
        } catch { key = String(raw).slice(0, 10); }
        if (key && key !== currentSessionDate) return;
      }

      // Snapshot sebelum reload untuk mendeteksi auto-promote dari server
      const prevPlayers = (Array.isArray(players) ? players.slice() : []);
      const prevWaiting = (Array.isArray(waitingList) ? waitingList.slice() : []);

      (async () => {
        try{
          // Guard ringan: jika perubahan hanya skor/startedAt/finishedAt 1 match, terapkan delta tanpa full reload
          try{
            if (payload?.new?.state){
              const applied = applyMinorRoundDelta(payload.new.state);
              if (applied) return; // cukup update ringan
            }
          }catch{}
          // Guard untuk perubahan list pemain saja (tanpa full reload)
          try{
            if (payload?.new?.state){
              const applied2 = applyMinorPlayersDelta(payload.new.state);
              if (applied2) return;
            }
          }catch{}

          const ok = await loadStateFromCloudSilent();
          if (!ok) return;
          // Deteksi hanya untuk editor (viewer tidak perlu notifikasi ini)
          if (isViewer && isViewer()) return;
          const norm = s => String(s||'').trim().toLowerCase();
          const nowPlayers = Array.isArray(players) ? players : [];
          const nowWaiting = Array.isArray(waitingList) ? waitingList : [];
          const added = nowPlayers.filter(p => !prevPlayers.some(x => norm(x) === norm(p)));
          const removedPlayers = prevPlayers.filter(p => !nowPlayers.some(x => norm(x) === norm(p)));
          const waitingDelta = (prevWaiting.length - nowWaiting.length); // >0 means waiting reduced
          const playersDelta = (nowPlayers.length - prevPlayers.length);

          // Kandidat paling mungkin yang dipromosikan: nama yang hilang dari waiting list
          const removedFromWaiting = prevWaiting.filter(n => !nowWaiting.some(x => norm(x) === norm(n)));
          const candidate = removedFromWaiting.length > 0 ? removedFromWaiting[0] : (added[0] || null);

          // Heuristik auto-promote (lebih longgar dan deterministik):
          // - waiting berkurang (>=1) DAN
          //   (ada 1 nama baru di players ATAU ada 1 nama keluar dari players → netral (leave+promote))
          if (waitingDelta >= 1 && (added.length >= 1 || removedPlayers.length >= 1)) {
            const promotedName = candidate || added[0];
            if (promotedName) {
              try{ showToast(`Auto-promote: ${promotedName} masuk dari waiting list`, 'info'); }catch{}
              try{ highlightPlayer(promotedName); }catch{}
            } else {
              try{ showToast('Auto-promote: 1 pemain masuk dari waiting list', 'info'); }catch{}
            }
          }
        }catch(e){ /* noop */ }
      })();
    })
    .subscribe();
}

// Versi tanpa overlay/loading untuk panggilan realtime agar tidak "flash" satu halaman
async function loadStateFromCloudSilent() {
  const { data, error } = await sb.from('event_states')
    .select('state, version, updated_at')
    .eq('event_id', currentEventId)
    .eq('session_date', currentSessionDate)
    .maybeSingle();
  if (error) { console.error(error); return false; }
  if (data && data.state) {
    _serverVersion = data.version || 0;
    applyPayload(data.state);
    if (data.state.eventTitle) setAppTitle(data.state.eventTitle);
    markSaved?.(data.updated_at);
    try{ refreshJoinUI?.(); }catch{}
    return true;
  }
  return false;
}

function unsubscribeRealtimeForState(){
  try{
    if (_stateRealtimeChannel){
      _stateRealtimeChannel.unsubscribe?.();
      try{ sb.removeChannel?.(_stateRealtimeChannel); }catch{}
      _stateRealtimeChannel = null;
    }
  }catch{}
}
