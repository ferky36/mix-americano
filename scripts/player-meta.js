"use strict";
// === Paid flag (playerMeta) + realtime =================================
function isPlayerPaid(name){
  try { return !!(playerMeta && playerMeta[name] && playerMeta[name].paid); } catch { return false; }
}

// opts: { silent?:true, noBroadcast?:true }  -> dipakai saat terima dari broadcast agar tidak memicu save & re-broadcast
function setPlayerPaid(name, val, opts){
  if (!name) return;
  if (!playerMeta || typeof playerMeta !== 'object') window.playerMeta = {};
  playerMeta[name] = playerMeta[name] || {};
  playerMeta[name].paid = !!val;

  // Selalu refresh UI lokal
  try { renderPlayersList?.(); renderViewerPlayersList?.(); refreshJoinUI?.(); } catch {}

  // Simpan + broadcast hanya jika bukan update "silent" (datang dari broadcast)
  if (!opts || !opts.silent) {
    markDirty?.();
    try { maybeAutoSaveCloud?.(true); } catch {}
    if (!(opts && opts.noBroadcast)) {
      try {
        const ch = getPaidChannel();
        ch && ch.send({ type: 'broadcast', event: 'paid', payload: { name, paid: !!val } });
      } catch {}
    }
  }
}
function togglePlayerPaid(name){ setPlayerPaid(name, !isPlayerPaid(name)); }

/* --- Realtime channel untuk flag paid --- */
function getPaidChannel(){
  try{
    if (!window.sb || !currentEventId) return null;
    const key = 'paid:'+currentEventId;
    if (!window.__paidCh || window.__paidChKey !== key) {
      // ganti channel lama bila pindah event
      if (window.__paidCh) { try { sb.removeChannel(window.__paidCh); } catch{} }

      const ch = sb.channel('event-'+currentEventId);
      ch.on('broadcast', { event: 'paid' }, (msg) => {
        try {
          const { name, paid } = (msg && msg.payload) || {};
          if (!name) return;
          // Update lokal tanpa save ulang & tanpa re-broadcast
          setPlayerPaid(name, !!paid, { silent: true, noBroadcast: true });
        } catch {}
      });
      ch.subscribe().catch?.(()=>{});
      window.__paidCh = ch;
      window.__paidChKey = key;
    }
    return window.__paidCh;
  }catch{ return null; }
}
