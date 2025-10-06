"use strict";
// ================== SCORE MODAL ================== //
function openScoreModal(courtIdx, roundIdx){
  scoreCtx.court = courtIdx;
  scoreCtx.round = roundIdx;

  const r = (roundsByCourt[courtIdx] || [])[roundIdx] || {};
  // Sequential validation: only allow opening for start when previous match finished
  try{
    const hasScoreGuard = (r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '') || (r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '');
    if (!r.startedAt && !r.finishedAt && !hasScoreGuard && !canStartRoundBySequence(courtIdx, roundIdx)){
      showToast?.('Belum waktunya match ini. Selesaikan match sebelumnya dahulu.', 'info');
      return;
    }
  }catch{}
  scoreCtx.a = Number(r.scoreA || 0);
  scoreCtx.b = Number(r.scoreB || 0);

  byId('scoreTeamA').textContent = [r.a1||'-', r.a2||'-'].join(' & ');
  byId('scoreTeamB').textContent = [r.b1||'-', r.b2||'-'].join(' & ');
  byId('scoreRoundTitle').textContent = `Lap ${courtIdx+1} • Match ${roundIdx+1}`;
  byId('scoreAVal').textContent = scoreCtx.a;
  byId('scoreBVal').textContent = scoreCtx.b;
  renderServeBadgeInModal();

    const ready = r.a1 && r.a2 && r.b1 && r.b2;
  if (!ready){ alert('Pemain di ronde ini belum lengkap. Lengkapi dulu ya.'); return; }

  // matikan timer yang tersisa
  if (scoreCtx.timerId){ clearInterval(scoreCtx.timerId); scoreCtx.timerId = null; }
  scoreCtx.running = false;

  // ✅ DETEKSI SKOR DENGAN BENAR (jangan pakai truthy)
  const hasA = r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '';
  const hasB = r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '';
  const alreadyScored = hasA || hasB;

  const timerEl = byId('scoreTimer');

  if (alreadyScored){
    // mode hasil final: kunci tombol, timer = "Permainan Selesai"
    setScoreModalLocked(true);
    if (timerEl) timerEl.textContent = 'Permainan Selesai';
  } else {
    // mode main: tombol aktif & timer mm:ss dari Menit/Ronde
    const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
    scoreCtx.remainMs = minutes * 60 * 1000;
    if (timerEl) timerEl.textContent = fmtMMSS(scoreCtx.remainMs);
    setScoreModalLocked(false); // Start enabled
    // Sembunyikan +/- sampai Mulai ditekan, kecuali jika sudah r.startedAt
    setScoreModalPreStart(!r.startedAt);
  }

  // Read-only mode: selalu terkunci
  if (isViewer() && !isScoreOnlyMode()) setScoreModalLocked(true);

  // Jika match sudah pernah dimulai (flag pada round), sembunyikan tombol Start dan beritahu pengguna
  try{
    const startBtn = byId('btnStartTimer');
    const alreadyStarted = !!r.startedAt;
    if (startBtn) startBtn.classList.toggle('hidden', alreadyStarted);
    if (alreadyStarted){
      // Tampilkan tombol +/- jika sudah mulai
      setScoreModalPreStart(false);
    }
    if (alreadyStarted){ try{ showToast('Permainan sudah dimulai untuk match ini', 'info'); }catch{} }
  }catch{}

  byId('scoreModal').classList.remove('hidden');
}


function closeScoreModal(){
  if (scoreCtx.timerId){ clearInterval(scoreCtx.timerId); scoreCtx.timerId=null; }
  scoreCtx.running = false;
  byId('scoreModal').classList.add('hidden');
  try{ byId('scoreTimer')?.classList.remove('timer-running'); }catch{}
}

// Handler dengan konfirmasi: bila match sudah dimulai namun belum selesai,
// tutup = batalkan permainan (hapus startedAt) dan kembalikan tombol Mulai.
function onCloseScoreClick(){
  try{
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
    const isStarted = !!r.startedAt;
    const isFinished = !!r.finishedAt;
    if (isStarted && !isFinished){
      const ok = confirm('Permainan untuk match ini sedang berjalan. Menutup akan membatalkan permainan. Lanjutkan?');
      if (!ok) return; // batal menutup
      try{ delete r.startedAt; }catch{}
      // pulihkan skor semula jika ada cadangan
      try{
        const hadPrev = (typeof r._prevScoreA !== 'undefined') || (typeof r._prevScoreB !== 'undefined');
        if (hadPrev){
          r.scoreA = (typeof r._prevScoreA !== 'undefined') ? r._prevScoreA : '';
          r.scoreB = (typeof r._prevScoreB !== 'undefined') ? r._prevScoreB : '';
          try{ delete r._prevScoreA; delete r._prevScoreB; }catch{}
          // sinkronkan tampilan popup & tabel
          scoreCtx.a = Number(r.scoreA || 0);
          scoreCtx.b = Number(r.scoreB || 0);
          try{
            const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
            const aInp = row?.querySelector('.rnd-scoreA input');
            const bInp = row?.querySelector('.rnd-scoreB input');
            if (aInp) aInp.value = String(r.scoreA || '');
            if (bInp) bInp.value = String(r.scoreB || '');
          }catch{}
        }
      }catch{}
      // reset timer state agar siap mulai lagi
      try{
        const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
        scoreCtx.remainMs = minutes * 60 * 1000;
        const t = byId('scoreTimer'); if (t) t.textContent = fmtMMSS(scoreCtx.remainMs);
      }catch{}
      // update UI baris tabel: sembunyikan badge Live, tampilkan tombol Mulai jika boleh
      try{
        const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
        const actions = row?.querySelector('.rnd-col-actions');
        const live = actions?.querySelector('.live-badge'); if (live) live.classList.add('hidden');
        const btn = actions?.querySelector('button');
        const allowStart = (typeof canEditScore === 'function') ? canEditScore() : !isViewer();
        if (btn){
          btn.textContent = 'Mulai Main';
          if (allowStart) btn.classList.remove('hidden');
        }
      }catch{}
      try{ showToast('Permainan dibatalkan. Skor direset.', 'warn'); }catch{}
      // simpan pembatalan ke Cloud (realtime)
      markDirty();
      try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
    }
  }catch{}
  closeScoreModal();
}

function startScoreTimer(){
  if (!canEditScore()) return;
  if (scoreCtx.running) return;
  // jika sudah 0: reset ke durasi default lagi
  if (scoreCtx.remainMs <= 0){
    const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
    scoreCtx.remainMs = minutes * 60 * 1000;
  }
  // Set started flag once (and persist) to lock others realtime
  try {
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
    if (r.startedAt){ showToast?.("Permainan sudah dimulai untuk match ini", "warn"); const _btn=byId("btnStartTimer"); if(_btn) _btn.classList.add("hidden"); return; }
    // backup skor awal untuk pemulihan jika dibatalkan
    if (typeof r._prevScoreA === "undefined") r._prevScoreA = (typeof r.scoreA !== "undefined") ? r.scoreA : "";
    if (typeof r._prevScoreB === "undefined") r._prevScoreB = (typeof r.scoreB !== "undefined") ? r.scoreB : "";
    r.startedAt = new Date().toISOString();
    // Saat mulai: tampilkan +/- dan sembunyikan tombol Mulai (di modal)
    try{ setScoreModalPreStart(false); }catch{}
    try{ const sBtn = byId('btnStartTimer'); if (sBtn) sBtn.classList.add('hidden'); }catch{}
    // Update live badge and action button inline
    try{
      const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
      const actions = row?.querySelector('.rnd-col-actions');
      const live = actions?.querySelector('.live-badge');
      if (live){ live.classList.remove('hidden'); live.classList.add('fade-in'); setTimeout(()=>live.classList.remove('fade-in'),200); }
      const startBtn = actions?.querySelector('button');
      if (startBtn && /mulai/i.test(startBtn.textContent||'')) { startBtn.classList.add('fade-out'); setTimeout(()=>{ startBtn.classList.add('hidden'); startBtn.classList.remove('fade-out'); },150); }
    }catch{}
    // persist startedAt to Cloud
    markDirty();
    try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
  } catch {}

  scoreCtx.running = true;
  const btn = byId('btnStartTimer'); if (btn) btn.disabled = true;
  try{ byId('scoreTimer')?.classList.add('timer-running'); }catch{}

  const startedAt = Date.now();
  let last = startedAt;

  scoreCtx.timerId = setInterval(()=>{
    const now = Date.now();
    const delta = now - last;
    last = now;

    scoreCtx.remainMs -= delta;
    if (scoreCtx.remainMs < 0) scoreCtx.remainMs = 0;

    byId('scoreTimer').textContent = fmtMMSS(scoreCtx.remainMs);

    if (scoreCtx.remainMs <= 0){
      clearInterval(scoreCtx.timerId); scoreCtx.timerId=null; scoreCtx.running=false;
      const msg = 'Waktu habis untuk ronde ini.\nKlik OK untuk menyimpan skor saat ini.';
      // Tanpa alert; langsung tampilkan status selesai di UI
      const __t = byId('scoreTimer'); if (__t) __t.textContent = 'Permainan Selesai';
      setScoreModalLocked(true);
      // auto commit skor → sama seperti Finish tapi TANPA konfirmasi tambahan
      {
        const zero = (Number(scoreCtx.a)===0 && Number(scoreCtx.b)===0);
        if (zero){
          alert('Skor masih 0-0. Skor tidak akan disimpan.');
          try{ const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {}; delete r.startedAt; delete r.finishedAt; }catch{}
          try{ setScoreModalPreStart(true); }catch{}
          try{
            const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
            const actions = row?.querySelector('.rnd-col-actions');
            const live = actions?.querySelector('.live-badge'); if (live){ live.classList.add('fade-out'); setTimeout(()=>{ live.classList.add('hidden'); live.classList.remove('fade-out'); },150); }
            const done = actions?.querySelector('.done-badge'); if (done){ done.classList.add('fade-out'); setTimeout(()=>{ done.classList.add('hidden'); done.classList.remove('fade-out'); },150); }
            const startBtn = actions?.querySelector('button'); if (startBtn){ startBtn.textContent='Mulai Main'; startBtn.classList.remove('hidden'); startBtn.classList.add('fade-in'); setTimeout(()=>startBtn.classList.remove('fade-in'),200); }
          }catch{}
          markDirty();
          try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
          closeScoreModal();
        } else {
          commitScoreToRound(/*auto*/true);
        }
      }
      // Jangan tutup modal; biarkan pengguna melihat status dan klik "Hitung Ulang"
    }
  }, 250);
}

function commitScoreToRound(auto=false){
  const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round];
  if(!r){ alert('Match tidak ditemukan.'); return; }

  if (!auto){
    const msg = `Simpan skor untuk Lap ${scoreCtx.court+1} • Match ${scoreCtx.round+1}\n`+
                `A (${r.a1} & ${r.a2}) : ${scoreCtx.a}\n`+
                `B (${r.b1} & ${r.b2}) : ${scoreCtx.b}`;
    if(!confirm(msg)) return;
  }
  r.scoreA = String(scoreCtx.a);
  r.scoreB = String(scoreCtx.b);
  try{ r.finishedAt = new Date().toISOString(); }catch{}

  markDirty();
  renderAll();
  computeStandings();

  // Auto-simpan ke Cloud setelah skor dimasukkan (Finish atau waktu habis)
  try {
    if (typeof isCloudMode === 'function' && isCloudMode()) {
      // simpan tanpa overlay agar cepat
      if (typeof maybeAutoSaveCloud === 'function') {
        maybeAutoSaveCloud();
      } else if (typeof saveStateToCloud === 'function') {
        // fallback langsung
        saveStateToCloud();
      }
    }
  } catch (e) {
    console.warn('Autosave cloud setelah commit skor gagal:', e);
  }

  // Inline update badges for quick feedback
  try{
    const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
    const actions = row?.querySelector('.rnd-col-actions');
    const live = actions?.querySelector('.live-badge');
    const done = actions?.querySelector('.done-badge');
    if (live){ live.classList.add('fade-out'); setTimeout(()=>{ live.classList.add('hidden'); live.classList.remove('fade-out'); },150); }
    if (done){ done.classList.remove('hidden'); done.classList.add('fade-in'); setTimeout(()=>done.classList.remove('fade-in'),200); }
  }catch{}
}


function updateScoreDisplay(){
  byId('scoreAVal').textContent = scoreCtx.a;
  byId('scoreBVal').textContent = scoreCtx.b;
  renderServeBadgeInModal();

  // Sinkronkan skor ke state ronde yang sedang dibuka agar tabel match ikut terupdate
  try{
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round];
    if (r){
      r.scoreA = String(scoreCtx.a);
      r.scoreB = String(scoreCtx.b);
      markDirty();

      // Update tampilan skor di tabel secara langsung tanpa renderAll
      try{
        const row = document.querySelector(`.rnd-table tbody tr[data-index="${scoreCtx.round}"]`);
        const aInp = row?.querySelector('.rnd-scoreA input');
        const bInp = row?.querySelector('.rnd-scoreB input');
        if (aInp) aInp.value = String(scoreCtx.a);
        if (bInp) bInp.value = String(scoreCtx.b);
      }catch{}

      // Autosave debounced ke Cloud supaya viewer lain melihat realtime
      saveLiveScoreDebounced();
    }
  }catch{}
}

// EVENTS
byId("btnTheme").addEventListener("click", toggleTheme);

// Manual Save: tunjukkan loading & sukses di tombol
byId('btnSave')?.addEventListener('click', async ()=>{
  const btn = byId('btnSave'); if (!btn) return;
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = 'Saving...';
  try{
    let ok = false;
    if (isCloudMode()) ok = await saveStateToCloudWithLoading();
    else ok = saveToStore();
    if (ok !== false){
      btn.textContent = 'Saved ✓';
      setTimeout(()=>{ btn.textContent = old || 'Save'; btn.disabled = false; }, 1200);
    } else {
      btn.textContent = old || 'Save'; btn.disabled = false;
    }
  }catch(e){
    console.error(e);
    btn.textContent = old || 'Save'; btn.disabled = false;
    alert('Gagal menyimpan.');
  }
});

// Header menu toggle (HP)
const btnHdrMenu = document.getElementById("btnHdrMenu");
if (btnHdrMenu) {
  btnHdrMenu.addEventListener("click", () => {
    const panel = document.getElementById("hdrControls");
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) panel.classList.add("hdr-slide");
    setTimeout(() => panel.classList.remove("hdr-slide"), 220);
  });
  window.addEventListener("resize", () => {
    const panel = document.getElementById("hdrControls");
    if (window.innerWidth >= 768) panel.classList.remove("hidden");
  });
}

// Filter panel toggle (HP)
const btnFilter = document.getElementById("btnFilter");
if (btnFilter) {
  btnFilter.addEventListener("click", () => {
    try { if (typeof isViewer === 'function' && isViewer()) return; } catch {}
    const panel = document.getElementById("filterPanel");
    const willShow = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    btnFilter.textContent = willShow
      ? "🔎 Sembunyikan Filter"
      : "🔎 Filter / Jadwal";
    if (willShow) panel.classList.add("filter-slide");
    setTimeout(() => panel.classList.remove("filter-slide"), 220);
  });
  window.addEventListener("resize", () => {
    const panel = document.getElementById("filterPanel");
    try {
      if (window.innerWidth >= 768 && !(typeof isViewer === 'function' && isViewer())) {
        panel.classList.remove("hidden");
      }
    } catch {}
  });
}

byId("btnCollapsePlayers").addEventListener("click", () =>
  byId("playersPanel").classList.toggle("hidden")
);

byId('btnResetActive').addEventListener('click', ()=>{
  const arr = roundsByCourt[activeCourt] || [];
  const has = arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB));
  if(has && !confirm('Data pada lapangan aktif akan dihapus. Lanjutkan?')) return;
  roundsByCourt[activeCourt] = [];
  markDirty(); renderAll();refreshFairness();
});

byId('btnClearScoresActive').addEventListener('click', clearScoresActive);
byId('btnClearScoresAll').addEventListener('click', clearScoresAll);
// save ke cloud atau local storage
byId('btnSave')?.addEventListener('click', async () => {
  console.log(isCloudMode());
  if (isCloudMode()) {
    console.log('Menyimpan ke cloud...');
    const ok = await saveStateToCloudWithLoading();
    if (!ok) alert('Gagal menyimpan ke Cloud. Coba lagi.');
  } else {
    const ok = saveToStore?.();
    console.log('Menyimpan ke json...');
    if (!ok) alert('Gagal menyimpan ke Local Storage.');
  }
});
// byId("btnLoadByDate").addEventListener("click", loadSessionByDate);
// byId("btnImportJSON").addEventListener("click", () =>
//   byId("fileInputJSON").click()
// );
// byId("fileInputJSON").addEventListener("change", (e) => {
//   if (e.target.files && e.target.files[0]) loadJSONFromFile(e.target.files[0]);
//   e.target.value = "";
// });

byId("startTime").addEventListener("change", () => {
  markDirty();
  renderAll();
  try{ renderFilterSummary(); }catch{}
});
byId("minutesPerRound").addEventListener("input", () => {
  markDirty();
  renderAll();
  try{ renderFilterSummary(); }catch{}
});
byId("roundCount").addEventListener("input", () => {
  markDirty();
  renderAll();
  try{ renderFilterSummary(); }catch{}
});

// tanggal sesi diubah
byId('sessionDate')?.addEventListener('change', async (e) => {
  currentSessionDate = normalizeDateKey(e.target.value);
  const url = new URL(location.href);
  url.searchParams.set('date', currentSessionDate);
  history.replaceState({}, "", url);

  if (isCloudMode()) {
    // const ok = await loadStateFromCloud();
    if (!ok) {
      seedDefaultIfEmpty?.();
      renderAll?.();
      // await saveStateToCloud();
    } else {
      renderAll?.();
    }
  } else {
    // fallback lokal
    const all = readAllSessionsLS?.() || {};
    if (all[currentSessionDate]) {
      applyPayload(all[currentSessionDate]);
    } else {
      seedDefaultIfEmpty?.();
      saveToStoreSilent?.();
    }
    renderAll?.();
  }
  try{ renderFilterSummary(); }catch{}
});


// removed: btnLoadByDate handler (deprecated)


byId("btnAddPlayer").addEventListener("click", () => {
  const v = byId("newPlayer").value;
  const changed = addPlayer(v);
  if (changed) { try { maybeAutoSaveCloud(true); } catch {} }
});
byId("newPlayer").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    byId("btnAddPlayer").click();
  }
});
byId("btnClearPlayers").addEventListener("click", () => {
  if (!confirm("Kosongkan semua pemain dan waiting list?")) return;
  players = [];
  try{
    if (!Array.isArray(waitingList)) waitingList = [];
    waitingList.splice(0, waitingList.length);
    window.waitingList = waitingList;
  }catch{}
  try{ Object.keys(playerMeta||{}).forEach(k => delete playerMeta[k]); }catch{}
  markDirty();
  renderPlayersList?.();
  try{ renderViewerPlayersList?.(); }catch{}
  validateNames?.();
  showToast?.('Semua pemain dan waiting list telah dikosongkan','success');
  try{ maybeAutoSaveCloud(); }catch{}
});
byId("btnPasteText").addEventListener("click", () => {
  showTextModal();
  byId("playersText").focus();
});
byId("btnApplyText").addEventListener("click", () => {
  const newList = parsePlayersText(byId("playersText").value);
  const oldActive = Array.isArray(players) ? players.slice() : [];
  const cap = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : Infinity;
  const newActive = newList.slice(0, cap);
  const overflow = newList.slice(newActive.length);
  // start from existing waitingList, drop those that moved to active
  let newWaiting = Array.isArray(waitingList) ? waitingList.slice() : [];
  newWaiting = newWaiting.filter(n => !newActive.includes(n));
  // append overflow that aren't already in active or waiting
  for (const n of overflow){
    if (!newActive.includes(n) && !newWaiting.includes(n)) newWaiting.push(n);
  }
  // Robust multi-rename detection (LVS-based)
  try{
    const pairs = computeRenamePairs(oldActive, newActive) || [];
    if (typeof replaceNameInRounds === 'function'){
      pairs.forEach(([o,n])=>{ if (o && n) replaceNameInRounds(o,n); });
    }
  }catch{}
  players = newActive;
  if (!Array.isArray(waitingList)) waitingList = [];
  waitingList.splice(0, waitingList.length, ...newWaiting);
  window.waitingList = waitingList;
  if (overflow.length > 0 && cap !== Infinity) {
    showToast('Beberapa nama masuk waiting list karena list penuh', 'warn');
  }
  hideTextModal();
  markDirty();
  renderPlayersList();
  renderAll?.();
  validateNames();
  try{ maybeAutoSaveCloud(); }catch{}
});
byId("btnCancelText").addEventListener("click", hideTextModal);

// Boot
// (function boot() {
//   applyThemeFromStorage();
//   if (!byId("sessionDate").value) {
//     const d = new Date();
//     const s =
//       d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
//     byId("sessionDate").value = s;
//   }
//   players = [
//     "Della",
//     "Rangga",
//     "Fai",
//     "Gizla",
//     "Abdi",
//     "Diana",
//     "Kris",
//     "Ichsan",
//     "Marchel",
//     "Altundri",
//     "Ferdi",
//     "Tyas",
//   ];
//   renderPlayersList();
//   renderAll();
//   validateNames();
//   startAutoSave();
// })();

async function boot() {
  applyThemeFromStorage?.();

  // Set tanggal default di input (hari ini) kalau kosong
  if (!byId("sessionDate").value) {
    byId("sessionDate").value = new Date().toISOString().slice(0,10);
  }

  const params = getUrlParams();
  currentSessionDate = normalizeDateKey(params.date || byId("sessionDate").value);
  byId("sessionDate").value = currentSessionDate;

  // ⬇️ Mode Cloud hanya jika ada event UUID valid di URL
  currentEventId = (params.event && isUuid(params.event)) ? params.event : null;

  if (isCloudMode()) {
    // --- CLOUD MODE ---
    const t = await fetchEventTitleFromDB(currentEventId); // optional (judul)
    if (t) setAppTitle(t);

    const ok = await loadStateFromCloud();
    if (!ok) {
      seedDefaultIfEmpty?.();
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      await saveStateToCloud();
    } else {
      renderPlayersList?.(); renderAll?.(); validateNames?.();
    }
    subscribeRealtimeForState?.();
    startAutoSave?.();
    return;
  }

  // --- LOCAL MODE (tanpa ?event=) ---
  setAppTitle('Mix Americano'); // default judul lokal
  const all = readAllSessionsLS?.() || {};
  if (all[currentSessionDate]) {
    applyPayload(all[currentSessionDate]);
    markSaved?.(all.__lastTs || new Date().toISOString());
  } else {
    seedDefaultIfEmpty?.();
    // simpan seed pertama agar konsisten
    const payload = currentPayload();
    all[currentSessionDate] = payload;
    all.__lastTs = payload.ts;
    writeAllSessionsLS(all);
    markSaved?.(payload.ts);
  }
  renderPlayersList?.();
  renderAll?.();
  validateNames?.();
  startAutoSave?.();
}





// helper kecil: seed default jika players kosong
function seedDefaultIfEmpty(){
  if (!Array.isArray(window.players) || window.players.length === 0) {
    window.players = [
      "Della","Rangga","Fai","Gizla","Abdi","Diana",
      "Kris","Ichsan","Marchel","Altundri","Ferdi","Tyas",
    ];
  }
  window.playerMeta = window.playerMeta || {};
  window.waitingList = window.waitingList || [];
  if (!Array.isArray(window.roundsByCourt) || window.roundsByCourt.length === 0) {
    const R = parseInt(byId('roundCount')?.value || '10', 10);
    window.roundsByCourt = [
      Array.from({length:R}, () => ({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''}))
    ];
  }
  // kalau kamu pakai courts[], samakan juga:
  if (!Array.isArray(window.courts) || window.courts.length === 0) {
    window.courts = roundsByCourt.map((rounds,i)=>({ name:`Lapangan ${i+1}`, rounds }));
  }
}


// Report events (temporarily hidden/inactive)
const _btnReport = byId('btnReport');
if (_btnReport) _btnReport.classList.add('hidden');
byId('btnReport').addEventListener('click', ()=>{
  const keys = Object.keys(store.sessions||{}).sort();
  byId('repFrom').value = keys[0] || byId('sessionDate').value;
  byId('repTo').value   = keys[keys.length-1] || byId('sessionDate').value;
  openReportModal();
  runReport();
});
byId('btnReportClose').addEventListener('click', closeReportModal);
byId('btnRunReport').addEventListener('click', runReport);

byId('btnAddCourt').addEventListener('click', ()=>{
  const R = parseInt(byId('roundCount').value || '10', 10);
  const arr = Array.from({length:R}, ()=>({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''}));
  roundsByCourt.push(arr);
  activeCourt = roundsByCourt.length - 1;
  markDirty();
  renderAll();
});
byId('pairMode').addEventListener('change', ()=>{
  markDirty();
  validateNames();
});
byId('btnApplyPlayersActive').addEventListener('click', ()=>{
  const ok = validateNames(); // jalankan dulu
  const pm = byId('pairMode') ? byId('pairMode').value : 'free';
  if (!ok && pm !== 'free'){
    const proceed = confirm('Beberapa pemain belum melengkapi data sesuai mode pairing. Tetap lanjutkan?');
    if (!proceed) return;
  }
  const arr = roundsByCourt[activeCourt] || [];
  const has = arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB));
  if(has && !confirm('Menerapkan pemain akan reset pairing+skor pada lapangan aktif. Lanjutkan?')) return;
  autoFillActiveCourt(); markDirty(); renderAll(); computeStandings();refreshFairness();
  markDirty();
  renderPlayersList();
});
// Modal Hitung Skor
byId('btnCloseScore').addEventListener('click', onCloseScoreClick);

byId('btnAPlus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.a = Math.min(999, scoreCtx.a + 1); updateScoreDisplay(); });
byId('btnAMinus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.a = Math.max(0,   scoreCtx.a - 1); updateScoreDisplay(); });
byId('btnBPlus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.b = Math.min(999, scoreCtx.b + 1); updateScoreDisplay(); });
byId('btnBMinus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.b = Math.max(0,   scoreCtx.b - 1); updateScoreDisplay(); });
// Set skor seri (rata-rata, dibulatkan ke bawah)
// byId('btnTie').addEventListener('click', ()=>{
//   const avg = Math.max(scoreCtx.a, scoreCtx.b);
//   scoreCtx.a = avg; scoreCtx.b = avg;
//   updateScoreDisplay();
// });

// tutup modal jika klik backdrop
byId('scoreModal').addEventListener('click', (e)=>{ if(e.target.id === 'scoreModal') onCloseScoreClick(); });
// Start timer
byId('btnStartTimer').addEventListener('click', startScoreTimer);

// Finish manual (tetap dengan konfirmasi)
byId('btnFinishScore').addEventListener('click', ()=>{
  if (!canEditScore()) return;
  // Blokir finish jika skor 0-0
  if (Number(scoreCtx.a)===0 && Number(scoreCtx.b)===0){
    alert('Skor masih 0-0. Skor belum disimpan.');
    return;
  }
  // Konfirmasi di sini agar Cancel tidak menutup popup
  try{
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
    const msg = 'Simpan skor untuk Lap '+(scoreCtx.court+1)+' - Match '+(scoreCtx.round+1)+'\n'
      + 'A ('+(r.a1||'-')+' & '+(r.a2||'-')+') : '+scoreCtx.a+'\n'
      + 'B ('+(r.b1||'-')+' & '+(r.b2||'-')+') : '+scoreCtx.b;
    if (!confirm(msg)) return; // jangan tutup popup jika batal
  }catch{}
  // Simpan tanpa prompt lagi, lalu tutup
  commitScoreToRound(/*auto*/true);
  closeScoreModal();
});

byId('btnRecalc').addEventListener('click', ()=>{
  if (!canEditScore()) return;
  setScoreModalLocked(false);                  // munculkan semua kontrol
  const start = byId('btnStartTimer'); if (start) start.disabled = true;   // tidak boleh start ulang
  const t = byId('scoreTimer');     if (t)     t.textContent = 'Permainan Selesai';
});

// Reset skor & timer (tapi tidak menghapus skor di ronde)
byId('btnResetScore').addEventListener('click', ()=>{
  if (!canEditScore()) return;
  const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
  // Pulihkan skor ke awal jika ada cadangan; jika tidak, set 0
  const prevA = (typeof r._prevScoreA !== 'undefined') ? r._prevScoreA : '';
  const prevB = (typeof r._prevScoreB !== 'undefined') ? r._prevScoreB : '';
  scoreCtx.a = Number(prevA || 0);
  scoreCtx.b = Number(prevB || 0);
  try{ delete r._prevScoreA; delete r._prevScoreB; }catch{}
  // Update tampilan skor di modal saja, lalu kosongkan nilai di data ronde supaya tidak dianggap selesai (0-0 bukan skor final)
  updateScoreDisplay();
  try{ r.scoreA = ''; r.scoreB = ''; }catch{}
  try{
    const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
    const aInp = row?.querySelector('.rnd-scoreA input');
    const bInp = row?.querySelector('.rnd-scoreB input');
    if (aInp) aInp.value = '';
    if (bInp) bInp.value = '';
  }catch{}
  // Hapus startedAt agar kembali ke pra-mulai
  try{ delete r.startedAt; }catch{}
  try{ delete r.finishedAt; }catch{}
  setScoreModalPreStart(true); // sembunyikan +/- , tampilkan Mulai
  // reset timer tampilan juga
  const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
  scoreCtx.remainMs = minutes * 60 * 1000;
  byId('scoreTimer').textContent = fmtMMSS(scoreCtx.remainMs);
  // hentikan timer jika sedang berjalan
  if (scoreCtx.timerId){ try{ clearInterval(scoreCtx.timerId); }catch{} scoreCtx.timerId = null; }
  scoreCtx.running = false;
  try{ const btn = byId('btnStartTimer'); if (btn){ btn.disabled = false; btn.classList.remove('hidden'); } }catch{}
  // Update table UI badges/tombol
  try{
    const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
    const actions = row?.querySelector('.rnd-col-actions');
    const live = actions?.querySelector('.live-badge'); if (live){ live.classList.add('fade-out'); setTimeout(()=>{ live.classList.add('hidden'); live.classList.remove('fade-out'); },150); }
    const done = actions?.querySelector('.done-badge'); if (done){ done.classList.add('fade-out'); setTimeout(()=>{ done.classList.add('hidden'); done.classList.remove('fade-out'); },150); }
    const btn = actions?.querySelector('button'); if (btn){ btn.textContent='Mulai Main'; btn.classList.remove('hidden'); btn.classList.add('fade-in'); setTimeout(()=>btn.classList.remove('fade-in'),200); }
  }catch{}
  // Persist ke Cloud
  markDirty();
  try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
});
['minutesPerRound','breakPerRound','showBreakRows','startTime'].forEach(id=>{
  const el = byId(id);
  if(!el) return;
  el.addEventListener('change', ()=>{
    markDirty();
    renderAll();          // waktu & baris jeda ikut update
    validateAll();
    try{ renderHeaderChips(); }catch{}
  });
});
// Update chips on date change as well
try{ byId('sessionDate')?.addEventListener('change', ()=>{ try{ renderHeaderChips(); }catch{} }); }catch{}
