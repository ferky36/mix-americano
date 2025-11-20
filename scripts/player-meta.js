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

  // Sinkronkan ke Cashflow (owner/admin saja)
  try{ syncPaidToCashflow?.(name, !!val); }catch{}

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

// === Integrasi Paid -> Cashflow ======================================
async function syncPaidToCashflow(name, paid){
  try{
    // Hanya owner atau admin kas
    const allow = (typeof isCashAdmin==='function') ? isCashAdmin() : (!!window._isCashAdmin || !!window._isOwnerUser);
    if (!allow) return;
    if (!isCloudMode || !isCloudMode() || !window.sb || !currentEventId) return;

    // Ambil nominal HTM (localStorage berbasis event)
    function readHTM(){
      try{
        const sp = document.getElementById('spHTM');
        if (sp && sp.value) return Number(sp.value)||0;
      }catch{}
      try{
        if (typeof window.__htmAmount !== 'undefined') return Number(window.__htmAmount)||0;
      }catch{}
      try { return Number(localStorage.getItem('event.htm.'+(currentEventId||'local'))||0) || 0; } catch { return 0; }
    }
    const amount = readHTM();

    if (paid){
      // Try RPC (SECURITY DEFINER) first for RLS-safe upsert
      let ok = false;
      try{
        const { error: rpcErr } = await sb.rpc('add_paid_income', { p_event_id: currentEventId, p_label: name, p_amount: amount>0?amount:0, p_pax: 1 });
        if (!rpcErr) ok = true; else console.warn('add_paid_income RPC error', rpcErr);
      }catch{}
      if (!ok){
        // Fallback direct upsert via client if policy allows
        const { data: existing } = await sb
          .from('event_cashflows')
          .select('id')
          .eq('event_id', currentEventId)
          .eq('kind','masuk')
          .eq('label', name)
          .maybeSingle();
        const payload = { event_id: currentEventId, kind:'masuk', label: name, amount: amount>0?amount:0, pax: 1 };
        if (existing && existing.id){
          await sb.from('event_cashflows').update(payload).eq('id', existing.id);
        } else {
          await sb.from('event_cashflows').insert(payload);
        }
      }
    } else {
      // Hapus via RPC; fallback direct
      let ok = false;
      try{
        const { error: rpcErr } = await sb.rpc('remove_paid_income', { p_event_id: currentEventId, p_label: name });
        if (!rpcErr) ok = true; else console.warn('remove_paid_income RPC error', rpcErr);
      }catch{}
      if (!ok){
        await sb.from('event_cashflows')
          .delete()
          .eq('event_id', currentEventId)
          .eq('kind','masuk')
          .eq('label', name);
      }
    }
  }catch(e){ console.warn('syncPaidToCashflow failed', e); }
}
