"use strict";
// ================== Sessions ================== //
// removed: populateDatePicker (deprecated)
function currentPayload(){
  return {
    date: byId('sessionDate').value || '',
    startTime: byId('startTime').value,
    minutesPerRound: byId('minutesPerRound').value,
    roundCount: byId('roundCount').value,
    players: players.join('\n'),
    waitingList: (Array.isArray(waitingList) ? waitingList : []).join('\n'),
    playerMeta,             // <<< tambahkan ini
    // simpan limit pemain dalam state juga (null = tak terbatas)
    maxPlayers: (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : null,

    // 🔹 format baru
    roundsByCourt,

    // 🔹 kompat: tetap tulis 2 lapangan pertama agar JSON lama tetap kebaca
    rounds1: roundsByCourt[0] || [],
    rounds2: roundsByCourt[1] || [],
    breakPerRound: byId('breakPerRound').value,
    showBreakRows: !!byId('showBreakRows').checked,
    eventTitle: byId('appTitle')?.textContent || 'Mix Americano',

    ts: new Date().toISOString()
  };
}


// Build a read-only summary of filter/schedule for viewer mode
function renderFilterSummary(){
  const panel = byId('filterPanel');
  if (!panel) return;
  // ensure container exists (after filterPanel)
  let box = byId('filterSummary');
  if (!box){
    box = document.createElement('div');
    box.id = 'filterSummary';
    box.className = 'max-w-7xl mx-auto px-4 pb-4';
    panel.parentNode.insertBefore(box, panel.nextSibling);
  }

  // Ensure panel and summary are mutually exclusive to avoid flicker
  const viewerMode = (typeof isViewer === 'function') ? isViewer() : false;
  panel.classList.toggle('hidden', viewerMode);
  box.classList.toggle('hidden', !viewerMode);
  box.setAttribute('aria-hidden', viewerMode ? 'false' : 'true');
  if (!viewerMode){ box.innerHTML = ''; return; }

  const date = byId('sessionDate')?.value || '';
  const t = byId('startTime')?.value || '';
  const m = byId('minutesPerRound')?.value || '';
  const br = byId('breakPerRound')?.value || '0';
  const showBr = !!byId('showBreakRows')?.checked;
  const r = byId('roundCount')?.value || '';

  function fmtDateLabel(iso){
    if (!iso) return '-';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return `${m[3]} / ${m[2]} / ${m[1]}`;
  }

  box.innerHTML = `
    <div class="px-0">
      <button id="filterSummaryToggle" class="w-full md:w-auto px-3 py-2 rounded-xl bg-white/20 dark:bg-gray-700
            text-gray-900 dark:text-white font-semibold shadow hover:bg-white/30 flex items-center gap-2">
        <span id="filterSummaryChevron">▲</span>
        <span>Jadwal</span>
      </button>
      <div id="filterSummaryBody" class="mt-3">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Tanggal</div>
            <div class="mt-1 font-medium">${fmtDateLabel(date)}</div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Mulai</div>
            <div class="mt-1 font-medium">${t || '-'}</div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Menit/Match</div>
            <div class="mt-1 font-medium">${m || '-'}</div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Jeda/Match (menit)</div>
            <div class="mt-1 font-medium">${br} &nbsp; <span class="text-xs text-gray-500">${showBr ? '(Tampilkan baris jeda)' : ''}</span></div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Match/Lapangan</div>
            <div class="mt-1 font-medium">${r || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  // already toggled above with viewerMode guard

  // summary toggle
  try {
    const btn = byId('filterSummaryToggle');
    const chevron = byId('filterSummaryChevron');
    const body = byId('filterSummaryBody');
    if (btn && body && chevron) {
      btn.onclick = () => {
        const hidden = body.classList.toggle('hidden');
        chevron.textContent = hidden ? '▼' : '▲';
      };
    }
  } catch {}
}


let _autoSaveTimer = null;

// Wrapper util untuk menampilkan loading saat menyimpan ke Cloud
async function saveStateToCloudWithLoading(){
  showLoading('Menyimpan ke Cloud…');
  try{ return await saveStateToCloud(); }
  finally{ hideLoading(); }
}

// Autosave helper: save to cloud if enabled; else save to local storage silently
// useLoading=true will show overlay (for big changes like Apply Teks)
function maybeAutoSaveCloud(useLoading=false){
  try{
    if (isCloudMode()) {
      if (useLoading) return saveStateToCloudWithLoading();
      return saveStateToCloud(); // silent
    } else {
      return saveToStoreSilent?.();
    }
  }catch(e){ console.warn('Auto-save failed', e); }
}

function initCloudFromUrl() {
  const p = getUrlParams();           // fungsi yang sudah kamu punya
  if (p.event) {
    currentEventId = p.event;
  }
  if (p.date) {
    currentSessionDate = p.date;
    const el = byId('sessionDate');
    if (el) el.value = p.date;        // sinkron ke input tanggal
  }
  // Force viewer from link (?view=1 or role=viewer)
  _forceViewer = (String(p.view||'') === '1') || (String(p.role||'').toLowerCase() === 'viewer');
  // Mode khusus: viewer boleh hitung skor jika ?view=1
  window._viewerScoreOnly = (String(p.view||'') === '1');
  if (_forceViewer) setAccessRole('viewer');

  // Load access role if in cloud mode (skip elevation if forced viewer)
  if (currentEventId && !_forceViewer) {
    (async ()=>{ const ok = await ensureEventExistsOrReset(); if (ok) loadAccessRoleFromCloud?.(); else applyAccessMode(); })();
  } else {
    applyAccessMode();
  }
  try{ updateAdminButtonsVisibility?.(); }catch{}

  // Load event title + location for header (viewer/editor)
  if (currentEventId){
    (async ()=>{
      try{
        const meta = await fetchEventMetaFromDB(currentEventId);
        if (meta?.title) setAppTitle(meta.title);
        renderEventLocation(meta?.location_text || '', meta?.location_url || '');
        try{ ensureLocationFields(); await loadLocationFromDB(); }catch{}
        try{ renderHeaderChips(); }catch{}
      }catch{}
    })();
  }

  // Jika link undangan (invite=token) dibuka: terima undangan setelah login
  if (p.invite && currentEventId){
    (async () => {
      try{
        const { data: ud } = await sb.auth.getUser();
        const email = ud?.user?.email || null;
        if (!email) return; // user belum login

        // 1) Coba pakai RPC SECURITY DEFINER jika tersedia (lebih aman terhadap RLS)
        try{
          const { data: accData, error: accErr } = await sb.rpc('accept_event_invite', { p_token: p.invite });
          if (!accErr && accData){
            // Jika RPC mengembalikan event_id/role, sinkronkan lokal
            if (accData.event_id && !currentEventId) currentEventId = accData.event_id;
            loadAccessRoleFromCloud?.();
            return; // selesai
          }
        }catch{}

        // 2) Fallback tanpa RPC: validasi token lalu UPSERT membership (upgrade ke editor bila perlu)
        const { data: inv, error } = await sb.from('event_invites')
          .select('event_id, email, role')
          .eq('token', p.invite)
          .maybeSingle();
        if (error || !inv) return;
        if (String(inv.email).toLowerCase() !== String(email).toLowerCase()) return;

        // gunakan event_id dari undangan untuk berjaga-jaga
        const eid = inv.event_id || currentEventId;
        if (!currentEventId) currentEventId = eid;

        // UPSERT agar jika sudah ada row (viewer) akan di-upgrade ke editor
        const uid = ud.user.id;
        const up = await sb.from('event_members')
          .upsert({ event_id: eid, user_id: uid, role: inv.role }, { onConflict: 'event_id,user_id' });
        if (up?.error) { console.warn('membership upsert failed', up.error); return; }

        // tandai accepted (best effort)
        try{ await sb.from('event_invites').update({ accepted_at: new Date().toISOString() }).eq('token', p.invite); }catch{}

        // refresh akses
        loadAccessRoleFromCloud?.();
      }catch(e){ console.warn('accept-invite failed', e); }
    })();
  }
}


function markDirty() {
  dirty = true;
  byId("unsavedDot")?.classList.remove("hidden");

  // autosave debounce → benar-benar menulis ke localStorage
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(saveToLocalSilent, 600);
}
function saveToLocalSilent() {
  const raw = byId("sessionDate").value || "";
  const d = normalizeDateKey(raw);
  if (!d) return;

  const payload = currentPayload();  // <- sudah ada di kode kamu
  const all = readAllSessionsLS();
  all[d] = payload;
  all.__lastTs = new Date().toISOString();
  writeAllSessionsLS(all);
}

function markSaved(ts) {
  dirty = false;
  byId("unsavedDot")?.classList.add("hidden");
  if (ts){
    const t = new Date(ts).toLocaleTimeString().replace(/:/g, '.');
    const el = byId("lastSaved");
    if (el) el.textContent = "Saved " + t;
  }
}
function saveToStore() {
  const raw = byId("sessionDate").value || new Date().toISOString().slice(0,10);
  if (!raw) { alert("Isi tanggal dulu ya."); return false; }

  const d = normalizeDateKey(raw);
  const payload = currentPayload();

  // simpan ke objek store lama (jika kamu masih pakai)
  store.sessions[d] = payload;
  store.lastTs = new Date().toISOString();

  // simpan ke localStorage (persist)
  const all = readAllSessionsLS();
  all[d] = payload;
  all.__lastTs = store.lastTs;
  writeAllSessionsLS(all);

  markSaved(store.lastTs);
  // removed: datePicker UI update
  return true;
}

function applyPayload(payload) {
  if (!payload) return;

  // Keep previous players/waiting for diff-based handling (e.g., viewer leave + auto-promote)
  const prevPlayers = Array.isArray(players) ? players.slice() : [];
  const prevWaitingCopy = Array.isArray(window.waitingList) ? window.waitingList.slice() : [];

  // 1) Inputs dasar
  if (byId('sessionDate'))      byId('sessionDate').value      = payload.date || '';
  if (byId('startTime'))        byId('startTime').value        = payload.startTime || '19:00';
  if (byId('minutesPerRound'))  byId('minutesPerRound').value  = payload.minutesPerRound ?? 12;
  if (byId('roundCount'))       byId('roundCount').value       = payload.roundCount ?? 10;
  if (byId('breakPerRound'))    byId('breakPerRound').value    = payload.breakPerRound ?? 0;
  if (byId('showBreakRows'))    byId('showBreakRows').checked  = !!payload.showBreakRows;

  // 2) Pemain & meta
  const list = (payload.players || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  players.splice(0, players.length, ...list);   // overwrite players array
  // waiting list
  try{
    const wait = (payload.waitingList || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (Array.isArray(wait)) {
      if (typeof waitingList === 'undefined') { window.waitingList = []; }
      waitingList.splice(0, waitingList.length, ...wait);
    }
  }catch{}
  // asumsi playerMeta adalah object { [nama]: {gender,level,...} }
  if (payload.playerMeta && typeof payload.playerMeta === 'object') {
    // copy aman
    Object.keys(playerMeta).forEach(k => delete playerMeta[k]);
    Object.assign(playerMeta, payload.playerMeta);
  }

  // 3) Rounds per court (format baru)
  let restored = [];
  if (Array.isArray(payload.roundsByCourt) && payload.roundsByCourt.length) {
    restored = payload.roundsByCourt.map(c => (c || []).map(r => ({ ...r })));
  } else {
    // Fallback dari JSON lama
    const r1 = Array.isArray(payload.rounds1) ? payload.rounds1.map(r=>({...r})) : [];
    const r2 = Array.isArray(payload.rounds2) ? payload.rounds2.map(r=>({...r})) : [];
    restored = [r1, r2];
  }

  // 4) Terapkan ke roundsByCourt global milik app
  roundsByCourt.splice(0, roundsByCourt.length, ...restored);

  // 4b) Max pemain dari payload (jika ada)
  try {
    if (payload.maxPlayers === null || payload.maxPlayers === undefined || payload.maxPlayers === '') {
      currentMaxPlayers = null;
    } else {
      const mp = parseInt(payload.maxPlayers, 10);
      currentMaxPlayers = (Number.isFinite(mp) && mp > 0) ? mp : null;
    }
    const maxEl = byId('maxPlayersInput');
    if (maxEl) maxEl.value = currentMaxPlayers ? String(currentMaxPlayers) : '';
  } catch {}

  // 5) Render & hitung
  renderAll?.();
  validateAll?.();
  computeStandings?.();
  refreshFairness?.();

  // 5b) If exactly one player left and exactly one promoted from waiting joined,
  // replace old name with new in all rounds to keep schedule consistent.
  try{
    const added = players.filter(p => !prevPlayers.includes(p));
    const removed = prevPlayers.filter(p => !players.includes(p));
    if (added.length === 1 && removed.length === 1) {
      const wasInWaiting = prevWaitingCopy.includes(added[0]);
      const nowInWaiting = (Array.isArray(waitingList) ? waitingList : []).includes(added[0]);
      if (wasInWaiting && !nowInWaiting && typeof replaceNameInRounds === 'function') {
        replaceNameInRounds(removed[0], added[0]);
        // Re-render after replacement
        renderAll?.();
        validateAll?.();
        computeStandings?.();
      }
    }
  }catch{}

  // 6) Tandai saved
  if (payload.ts) markSaved(payload.ts);
  else byId("unsavedDot")?.classList.add("hidden");

  // 7) Judul event
  if (payload.eventTitle) setAppTitle(payload.eventTitle);
  try{ renderHeaderChips(); }catch{}
}


function saveToJSONFile(){
  if(!saveToStore()) return;

  const date = byId('sessionDate').value || new Date().toISOString().slice(0,10);
  const safeDate = date.replace(/\//g,'-'); // kalau formatnya dd/mm/yyyy → diganti strip

  const blob = new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);

  const a=document.createElement('a');
  a.href=url;
  a.download = `session_${safeDate}.json`;   // 🔹 nama file = session_YYYY-MM-DD.json
  a.click();
  URL.revokeObjectURL(url);
}

function loadJSONFromFile(file){
  const r = new FileReader();
  r.onload = (ev)=>{
    try{
      const raw = JSON.parse(ev.target.result);

      // 🔹 dukung dua bentuk file:
      //    A) { sessions: { "YYYY-MM-DD": payload, ... }, lastTs: ... }
      //    B) { "YYYY-MM-DD": payload, ... }  (tanpa wrapper 'sessions')
      let incoming = raw;
      if (!incoming.sessions) {
        // bentuk B → bungkus jadi bentuk A
        incoming = { sessions: raw, lastTs: new Date().toISOString() };
      }

      // 🔹 normalisasi tiap payload
      Object.keys(incoming.sessions).forEach(dateKey=>{
        incoming.sessions[dateKey] = normalizeLoadedSession(incoming.sessions[dateKey]);
      });

      store = incoming;
      // removed: populateDatePicker UI
      alert('JSON dimuat.');
    }catch(e){
      console.error(e);
      alert('File JSON tidak valid.');
    }
  };
  r.readAsText(file);
}

function loadSessionByDate(){
  // removed: no UI to pick arbitrary local dates
  alert('Fitur muat berdasarkan tanggal lokal dinonaktifkan.');
  return;

  let data = store.sessions[d];
  if(!data){ alert('Tidak ada data untuk tanggal tsb.'); return; }
  if (byId('breakPerRound'))  byId('breakPerRound').value  = data.breakPerRound ?? '1';
  if (byId('showBreakRows'))  byId('showBreakRows').checked = !!data.showBreakRows;


  // 🔹 normalisasi jika yang masuk masih format lama
  data = normalizeLoadedSession(data);

  // 🔹 isi UI
  byId('sessionDate').value    = data.date || d;
  byId('startTime').value      = data.startTime || '19:00';
  byId('minutesPerRound').value= data.minutesPerRound || '12';
  byId('roundCount').value     = data.roundCount || '10';

  players        = parsePlayersText(data.players || '');
  roundsByCourt  = (data.roundsByCourt || []).map(arr => Array.isArray(arr) ? arr : []);
  playerMeta    = data.playerMeta || {}; // <<< tambahkan ini

  // fallback: minimal 1 lapangan
  if (roundsByCourt.length === 0) roundsByCourt = [[]];

  // 🔹 reset ke Lapangan 1, panjang ronde disesuaikan
  activeCourt = 0;
  ensureRoundsLengthForAllCourts();

  renderPlayersList();
  renderAll();
  markSaved(data.ts);
  refreshFairness();
}

// Pastikan panjang tiap lapangan sesuai 'roundCount'
function ensureRoundsLengthForAllCourts(){
  const R = parseInt(byId('roundCount').value || '10', 10);
  roundsByCourt.forEach((arr, ci)=>{
    while(arr.length < R) arr.push({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''});
    if(arr.length > R) roundsByCourt[ci] = arr.slice(0, R);
  });
}

// Konversi JSON lama -> struktur baru
function normalizeLoadedSession(data){
  // Kalau sudah ada roundsByCourt: pakai itu
  if (Array.isArray(data.roundsByCourt)) return data;

  // JSON lama: hanya rounds1/rounds2
  const rc = [];
  if (Array.isArray(data.rounds1)) rc.push(data.rounds1);
  if (Array.isArray(data.rounds2)) rc.push(data.rounds2);
  if (rc.length === 0) rc.push([]); // minimal 1 lapangan

  data.roundsByCourt = rc;
  return data;
}


function startAutoSave() {
  clearInterval(window._autosaveTick);
  window._autosaveTick = setInterval(async () => {
    if (!dirty) return;
    if (isCloudMode()) {
      // Autosave tanpa overlay/loading
      await saveStateToCloud();
    } else {
      saveToStoreSilent();
    }
  }, 1800000); // 30 menit
}
