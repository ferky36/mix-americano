"use strict";
// ===== Minor delta applier: hindari full render jika hanya 1 match yang berubah skornya
function applyMinorRoundDelta(newState){
  try{
    const nr = Array.isArray(newState?.roundsByCourt) ? newState.roundsByCourt : null;
    const or = Array.isArray(roundsByCourt) ? roundsByCourt : null;
    if (!nr || !or) return false;

    let diffCourt=-1, diffRound=-1, diffCount=0, allowedOnly=true;
    for (let c=0; c<Math.max(or.length, nr.length); c++){
      const oc = or[c] || []; const nc = nr[c] || [];
      const len = Math.max(oc.length, nc.length);
      for (let i=0;i<len;i++){
        const o = oc[i] || {}; const n = nc[i] || {};
        const sameTeams = (o.a1===n.a1 && o.a2===n.a2 && o.b1===n.b1 && o.b2===n.b2);
        if (!sameTeams) { allowedOnly=false; diffCount++; if (diffCount>1) break; continue; }
        const keys = ['scoreA','scoreB','startedAt','finishedAt'];
        const otherKeysChanged = Object.keys({...o, ...n}).some(k=>!keys.includes(k) && o[k]!==n[k]);
        if (otherKeysChanged) { allowedOnly=false; diffCount++; if (diffCount>1) break; continue; }
        const changed = (o.scoreA!==n.scoreA)||(o.scoreB!==n.scoreB)||(o.startedAt!==n.startedAt)||(o.finishedAt!==n.finishedAt);
        if (changed){ diffCount++; diffCourt=c; diffRound=i; }
        if (diffCount>1) break;
      }
      if (diffCount>1) break;
    }
    if (diffCount!==1 || !allowedOnly) return false;

    const n = (nr[diffCourt]||[])[diffRound] || {};
    const target = (roundsByCourt[diffCourt]||[])[diffRound];
    if (!target) return false;
    target.scoreA = (n.scoreA ?? '');
    target.scoreB = (n.scoreB ?? '');
    if ('startedAt' in n) target.startedAt = n.startedAt; else delete target.startedAt;
    if ('finishedAt' in n) target.finishedAt = n.finishedAt; else delete target.finishedAt;

    try{
      if (diffCourt === activeCourt){
        const row = document.querySelector('.rnd-table tbody tr[data-index="'+diffRound+'"]');
        const aInp = row?.querySelector('.rnd-scoreA input');
        const bInp = row?.querySelector('.rnd-scoreB input');
        if (aInp) aInp.value = String(target.scoreA||'');
        if (bInp) bInp.value = String(target.scoreB||'');
        const actions = row?.querySelector('.rnd-col-actions');
        const live = actions?.querySelector('.live-badge');
        const done = actions?.querySelector('.done-badge');
        const liveOn = !!(target.startedAt && !target.finishedAt);
        const doneOn = !!target.finishedAt;
        if (live) live.classList.toggle('hidden', !liveOn);
        if (done) done.classList.toggle('hidden', !doneOn);
        if (doneOn) { try{ updateNextStartButton(diffCourt, diffRound); }catch{} }
      }
    }catch{}

    try{
      const modal = byId('scoreModal');
      const isOpen = modal && !modal.classList.contains('hidden');
      if (isOpen && scoreCtx.court===diffCourt && scoreCtx.round===diffRound){
        scoreCtx.a = Number(target.scoreA||0);
        scoreCtx.b = Number(target.scoreB||0);
        byId('scoreAVal').textContent = scoreCtx.a;
        byId('scoreBVal').textContent = scoreCtx.b;
        const startBtn = byId('btnStartTimer');
        if (target.startedAt){ if (startBtn) startBtn.classList.add('hidden'); setScoreModalPreStart(false); }
        if (target.finishedAt){ setScoreModalLocked(true); const t = byId('scoreTimer'); if (t) t.textContent='Permainan Selesai'; }
      }
    }catch{}

    return true;
  }catch(e){ return false; }
}

// Minor delta for players list only: update players/waitingList without full payload
function applyMinorPlayersDelta(newState){
  try{
    const newPlayersArr = String(newState?.players||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const curPlayersArr = Array.isArray(players) ? players.slice() : [];
    const newWaitingArr = String(newState?.waitingList||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const curWaitingArr = Array.isArray(window.waitingList) ? window.waitingList.slice() : [];

    const roundsSame = JSON.stringify(newState?.roundsByCourt||[]) === JSON.stringify(roundsByCourt||[]);
    const playersChanged = JSON.stringify(newPlayersArr)!==JSON.stringify(curPlayersArr);
    const waitingChanged = JSON.stringify(newWaitingArr)!==JSON.stringify(curWaitingArr);
    if (!(playersChanged || waitingChanged)) return false;
    if (!roundsSame) return false; // kalau jadwal berubah, jangan pakai delta ringan

    // apply
    players.splice(0, players.length, ...newPlayersArr);
    if (!Array.isArray(window.waitingList)) window.waitingList = [];
    window.waitingList.splice(0, window.waitingList.length, ...newWaitingArr);

    // 🔧 NEW: sinkronkan playerMeta agar UID/atribut tidak hilang
    const newMeta = newState?.playerMeta;
    if (newMeta && typeof newMeta === 'object') {
      // ganti isi object tetap (jaga referensi)
      Object.keys(playerMeta).forEach(k => delete playerMeta[k]);
      Object.assign(playerMeta, newMeta);
    }

    // re-render list pemain saja (editor + viewer), hindari overlay
    try{ renderPlayersList?.(); }catch{}
    try{ renderViewerPlayersList?.(); }catch{}
    try{ renderHeaderChips?.(); }catch{}
    try{ refreshJoinUI?.(); }catch{}
    return true;
  }catch(e){ return false; }
}

// Highlight helper untuk menyorot pemain tertentu di daftar editor
function highlightPlayer(name){
  const norm = s => String(s||'').trim().toLowerCase();
  const list = byId('playersList');
  if (!list) return;
  const items = list.querySelectorAll('li');
  for (const li of items){
    const span = li.querySelector('.player-name');
    if (!span) continue;
    if (norm(span.textContent) === norm(name)){
      li.classList.add('ring-2','ring-amber-400');
      try{ li.scrollIntoView({ behavior:'smooth', block:'nearest' }); }catch{}
      setTimeout(()=>{ li.classList.remove('ring-2','ring-amber-400'); }, 1800);
      break;
    }
  }
}

// --- ALT REALTIME FALLBACK (non-intrusive) ---
// Tujuan: jika subscribeRealtimeForState() tidak terpanggil saat init,
// aktifkan kanal alternatif untuk memantau perubahan event_states atau polling ringan.
// Catatan: tidak menyentuh/ubah fungsi lain; hanya memanfaatkan fungsi yang sudah ada.
(function setupAltRealtimeFallback(){
  let retryTimer = null;
  let pollTimer = null;

  function mainChannelActive(){
    try{
      const chans = window.sb?.getChannels?.() || [];
      return chans.some(ch => String(ch?.topic||'').includes(`es:${currentEventId}`));
    }catch{ return false; }
  }

  function altChannelActive(){
    return !!window.__altStateCh && window.__altStateKey === currentEventId;
  }

  function handleRowChange(payload){
    try{
      const row = payload?.new || payload?.old || {};
      const raw = (row && (row.session_date ?? row.sessionDate)) ?? null;
      if (raw){
        let key = '';
        try{
          if (typeof raw === 'string') key = normalizeDateKey(raw.slice(0,10));
          else { const dt=new Date(raw); key = isNaN(dt.getTime()) ? String(raw).slice(0,10) : dt.toISOString().slice(0,10); }
        }catch{ key = String(raw).slice(0,10); }
        if (key && key !== currentSessionDate) return; // beda tanggal -> abaikan
      }
      let applied = false;
      try{ if (payload?.new?.state && typeof applyMinorRoundDelta === 'function') applied = !!applyMinorRoundDelta(payload.new.state); }catch{}
      if (!applied){ try{ if (payload?.new?.state && typeof applyMinorPlayersDelta === 'function') applied = !!applyMinorPlayersDelta(payload.new.state); }catch{} }
      if (!applied){ try{ if (typeof loadStateFromCloudSilent === 'function') loadStateFromCloudSilent(); }catch{} }
    }catch{}
  }

  function tryAltSubscribe(){
    try{
      if (!window.sb || !currentEventId) return false;
      if (mainChannelActive()) return true;   // kanal utama sudah aktif
      if (altChannelActive()) return true;    // sudah ada kanal alternatif

      // Bersihkan kanal lama jika pindah event
      if (window.__altStateCh && window.__altStateKey !== currentEventId){
        try{ sb.removeChannel(window.__altStateCh); }catch{}
        window.__altStateCh = null;
      }

      const ch = sb.channel(`es-alt:${currentEventId}`);
      ch.on('postgres_changes', {
        event: '*', schema: 'public', table: 'event_states',
        filter: `event_id=eq.${currentEventId}`
      }, handleRowChange);
      ch.subscribe().catch(()=>{});
      window.__altStateCh = ch;
      window.__altStateKey = currentEventId;
      return true;
    }catch{ return false; }
  }

  function ensureAltRealtime(){
    try{
      if (tryAltSubscribe()){
        if (retryTimer){ clearInterval(retryTimer); retryTimer=null; }
      } else if (!retryTimer){
        retryTimer = setInterval(tryAltSubscribe, 3000);
      }
    }catch{}
  }

  function startPollingFallback(){
    if (pollTimer) return;
    pollTimer = setInterval(async ()=>{
      try{
        if (document.hidden) return;
        if (!(typeof isCloudMode === 'function' ? isCloudMode() : !!currentEventId)) return;
        if (!window.sb || !currentEventId) return;
        // Jika kanal utama/alt sudah aktif, tidak perlu polling
        if (mainChannelActive() || altChannelActive()) return;
        if (typeof loadStateFromCloudSilent === 'function') await loadStateFromCloudSilent();
      }catch{}
    }, 8000);
  }

  function boot(){ ensureAltRealtime(); startPollingFallback(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('popstate', ensureAltRealtime);
  window.addEventListener('visibilitychange', ensureAltRealtime);
})();

// --- UI sync hook mirip setPlayerPaid: pastikan setelah applyPayload() UI daftar pemain ter-refresh ---
(function hookApplyPayloadUI(){
  let wrapped = false;
  function wrap(){
    try{
      if (wrapped) return;
      if (typeof window.applyPayload !== 'function') return;
      const orig = window.applyPayload;
      window.applyPayload = function(payload){
        const out = orig.apply(this, arguments);
        try{ renderPlayersList?.(); }catch{}
        try{ renderViewerPlayersList?.(); }catch{}
        try{ renderHeaderChips?.(); }catch{}
        try{ refreshJoinUI?.(); }catch{}
        return out;
      };
      wrapped = true;
    }catch{}
  }
  // Coba segera, ulangi saat DOM siap karena applyPayload didefinisikan di modul lain (sessions.js)
  wrap();
  if (!wrapped) {
    const iv = setInterval(()=>{ wrap(); if (wrapped) clearInterval(iv); }, 150);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrap);
    else setTimeout(wrap, 0);
  }
})();
