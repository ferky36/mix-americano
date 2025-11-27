"use strict";
// Settings popup UI for editor/owner. Non-invasive: does not move existing inputs.
(function(){
  const byId = (id)=>document.getElementById(id);
  const qs = (sel,root=document)=>root.querySelector(sel);

  function isViewer(){ try{ return typeof window.isViewer==='function' ? window.isViewer() : (window.accessRole!=='editor'); }catch{ return true; } }
  function isMobile(){ try{ return window.matchMedia('(max-width: 640px)').matches; } catch { return false; } }
  const debounce = (fn, ms=600)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  // Local HTM persistence (best-effort). No DB coupling.
  function lsKey(){ try{ return 'event.htm.'+(window.currentEventId||'local'); }catch{ return 'event.htm.local'; } }
  function getHTM(){ try{ return localStorage.getItem(lsKey()) || ''; }catch{ return ''; } }
  function setHTM(v){ try{ if (v===''||v===null) localStorage.removeItem(lsKey()); else localStorage.setItem(lsKey(), String(v)); }catch{} }

  function ensureButton(){
    const themeBtn = byId('btnTheme');
    if (!themeBtn) return null;
    let btn = byId('btnSettings');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'btnSettings';
    btn.title = (window.__i18n_get ? window.__i18n_get('settings.title','Pengaturan') : 'Pengaturan');
    btn.className = 'px-2 py-2 rounded-xl bg-white/20 text-white font-semibold shadow hover:bg-white/30';
    btn.textContent = '⚙️';
    themeBtn.insertAdjacentElement('afterend', btn);
    return btn;
  }

  function buildModal(){
    if (byId('settingsPopup')) return byId('settingsPopup');
    const wrap = document.createElement('div');
    wrap.id = 'settingsPopup';
    wrap.className = 'fixed inset-0 bg-black/40 hidden z-50';
    wrap.innerHTML = `
      <div class="absolute inset-0" data-act="close"></div>
      <div class="relative mx-auto ${isMobile()? 'mt-4' : 'mt-10'} w-[95%] max-w-4xl rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow p-3 md:p-6 max-h-[90vh] md:max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg md:text-xl font-semibold" data-i18n="settings.title">Pengaturan</h3>
          <div class="flex items-center gap-2">
            <button id="spSave" data-i18n="settings.save" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold">Simpan</button>
            <button id="spClose" data-i18n="settings.close" class="px-3 py-1.5 rounded-lg border dark:border-gray-700">Tutup</button>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3" id="spGrid">
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.date">Tanggal</label>
            <input id="spDate" type="date" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.start">Mulai</label>
            <input id="spStart" type="time" step="60" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.minutes">Menit / Match</label>
            <input id="spMinutes" type="number" min="1" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.break">Jeda per Match (menit)</label>
            <div class="flex items-center gap-3 p-2 border rounded-xl dark:border-gray-700">
              <input id="spBreak" type="number" min="0" class="border rounded-lg px-3 py-2 w-24 bg-white dark:bg-gray-800 dark:border-gray-700" />
              <!-- Checkbox disembunyikan, selalu aktif -->
              <input id="spShowBreak" type="checkbox" class="hidden" checked />
            </div>
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.rounds">Match / Lapangan</label>
            <input id="spRounds" type="number" min="1" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.maxPlayers">Max Pemain</label>
            <input id="spMaxPlayers" type="number" min="0" step="2" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" data-i18n-placeholder="settings.maxPlayers.placeholder" placeholder="0 = tak terbatas" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.locText">Lokasi (opsional)</label>
            <input id="spLocText" type="text" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" data-i18n-placeholder="settings.locText.placeholder" placeholder="Mis. Lapangan A, GBK" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.locUrl">Link Maps (opsional)</label>
            <input id="spLocUrl" type="url" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" data-i18n-placeholder="settings.locUrl.placeholder" placeholder="https://maps.app.goo.gl/..." />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.joinDate">Buka Join (tanggal)</label>
            <input id="spJoinDate" type="date" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.joinTime">Buka Join (waktu)</label>
            <input id="spJoinTime" type="time" step="60" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300" data-i18n="settings.htm">HTM</label>
            <input id="spHTM" type="number" min="0" step="1000" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" placeholder="0" />
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    // Close handlers (no implicit save on blur)
    qs('#spClose', wrap)?.addEventListener('click', ()=>{ hide(); });
    wrap.addEventListener('click', (e)=>{ if ((e.target).getAttribute && (e.target).getAttribute('data-act')==='close') { hide(); } });
    return wrap;
  }

  async function show(){
    const m = buildModal();
    m.classList.remove('hidden');
    await syncFromSource();
  }
  function hide(){ const m = byId('settingsPopup'); if (m) m.classList.add('hidden'); }

  function setVal(el, v){ if (!el) return; const old=el.value||''; if (String(old)!==String(v||'')) el.value = v||''; }
  function pipe(src, dst){ if (!src||!dst) return; setVal(dst, src.value||''); dst.addEventListener('input', ()=>{ src.value = dst.value||''; src.dispatchEvent(new Event('input',{bubbles:true})); src.dispatchEvent(new Event('change',{bubbles:true})); }); }

  async function syncFromSource(){
    // Ensure dynamic editor fields exist in source panel
    try{ window.ensureMaxPlayersField?.(); }catch{}
    try{ window.ensureLocationFields?.(); }catch{}
    try{ window.ensureJoinOpenFields?.(); }catch{}

    // Selalu tarik meta terbaru dari DB saat popup dibuka agar tidak pakai cache stale antar owner
    try{
      if (window.sb && typeof currentEventId!=='undefined' && currentEventId){
        let meta = null;
        const res = await sb.from('events')
          .select('location_text, location_url, join_open_at, max_players, htm, event_date')
          .eq('id', currentEventId)
          .maybeSingle();
        if (!res.error) meta = res.data || null;
        if (meta){
          try{ setEventMetaCache?.(currentEventId, meta); }catch{}
          try{ const lt = byId('locationTextInput'); if (lt) lt.value = meta.location_text || ''; }catch{}
          try{ const lu = byId('locationUrlInput');  if (lu) lu.value = meta.location_url  || ''; }catch{}
          try{
            const mp = byId('maxPlayersInput');
            if (mp){
              mp.value = (meta.max_players || meta.max_players === 0) ? (meta.max_players||0) : '';
              currentMaxPlayers = (Number.isFinite(meta.max_players) && meta.max_players > 0) ? meta.max_players : null;
            }
          }catch{}
          try{
            const htm = Number(meta.htm||0)||0;
            window.__htmAmount = htm;
            const inp = byId('spHTM'); if (inp) inp.value = htm;
            const sum = document.getElementById('summaryHTM'); if (sum) sum.textContent = 'Rp'+(htm||0).toLocaleString('id-ID');
            try{ setHTM(String(htm)); }catch{}
          }catch{}
          try{
            const rawJo = meta.join_open_at || '';
            // Tampilkan ke user sebagai waktu lokal yang mereka input (hindari jam bergeser +7)
            const dt = rawJo ? new Date(rawJo) : null;
            const isoDate = dt
              ? (typeof toLocalDateValue === 'function' ? toLocalDateValue(dt) : String(rawJo).slice(0,10))
              : '';
            const isoTime = dt
              ? (typeof toLocalTimeValue === 'function' ? toLocalTimeValue(dt) : (String(rawJo).match(/T(\d{2}:\d{2})/)?.[1]||''))
              : '';
            const d = byId('spJoinDate');
            const t = byId('spJoinTime');
            const mainD = byId('joinOpenDateInput');
            const mainT = byId('joinOpenTimeInput');
            if (d) d.value = isoDate;
            if (t) t.value = isoTime;
            if (mainD) mainD.value = isoDate;
            if (mainT) mainT.value = isoTime;
            // Simpan state dengan nilai UTC apa adanya agar gating tetap benar
            window.joinOpenAt = rawJo || null;
          }catch{}
          try{
            const sd = byId('sessionDate');
            if (sd && meta.event_date) sd.value = String(meta.event_date).slice(0,10);
          }catch{}
          try{ renderEventLocation?.(meta.location_text||'', meta.location_url||''); }catch{}
        }
      }
    }catch{}

    // Map modal inputs to source inputs
    const map = [
      ['sessionDate','spDate'],
      ['startTime','spStart'],
      ['minutesPerRound','spMinutes'],
      ['breakPerRound','spBreak'],
      ['roundCount','spRounds'],
      ['maxPlayersInput','spMaxPlayers'],
      ['locationTextInput','spLocText'],
      ['locationUrlInput','spLocUrl'],
      ['joinOpenDateInput','spJoinDate'],
      ['joinOpenTimeInput','spJoinTime']
    ];
    // Only set initial values; do not live-sync back to source (save via spSave only)
    map.forEach(([sid, did])=>{ const s=byId(sid), d=byId(did); if (s&&d){ setVal(d, s.value||''); d.oninput=null; }});

    // Checkbox showBreak: disembunyikan dan selalu aktif
    try{
      const s = byId('showBreakRows');
      const d = byId('spShowBreak');
      if (d) d.checked = true;
      if (s && !s.checked) {
        s.checked = true;
        s.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }catch{}

    // HTM
    try{
      const h = byId('spHTM');
      if (h){
        // Jika sudah diisi dari DB di atas (meta.htm), jangan ditimpa oleh LS kosong
        const existing = h.value || String(window.__htmAmount ?? '');
        const fallback = getHTM();
        h.value = existing || fallback || '';
        // Sinkronkan LS agar tidak lagi kosong ketika sudah ada nilai dari DB
        try{ if (h.value) setHTM(h.value); }catch{}
        h.oninput = ()=>{
          setHTM(h.value||'');
          try{
            const n=Number(h.value||0)||0;
            const s=document.getElementById('summaryHTM'); if(s){ s.textContent='Rp'+n.toLocaleString('id-ID'); }
            window.__htmAmount=n;
          }catch{}
        };
        h.onblur = null; // no direct DB save from popup
      }
    }catch{}
  }

  // Push current popup values to real inputs and persist to cloud
  async function saveAll(){
    try{
      try{ window.ensureMaxPlayersField?.(); }catch{}
      try{ window.ensureLocationFields?.(); }catch{}
      try{ window.ensureJoinOpenFields?.(); }catch{}

      const pairs = [
        ['sessionDate','spDate'],
        ['startTime','spStart'],
        ['minutesPerRound','spMinutes'],
        ['breakPerRound','spBreak'],
        ['roundCount','spRounds'],
        ['maxPlayersInput','spMaxPlayers'],
        ['locationTextInput','spLocText'],
        ['locationUrlInput','spLocUrl'],
        ['joinOpenDateInput','spJoinDate'],
        ['joinOpenTimeInput','spJoinTime']
      ];
      // Set source input values without firing change handlers to avoid side-effects/toasts
      pairs.forEach(([sid,did])=>{ const s=byId(sid), d=byId(did); if (s && d){ s.value = d.value||''; }});

      // Ensure runtime variables mirror popup without relying on input handlers
      try{
        const rawMp = (byId('spMaxPlayers')?.value||'').trim();
        if (rawMp==='') { currentMaxPlayers = null; }
        else {
          const v = parseInt(rawMp,10); currentMaxPlayers = (Number.isFinite(v) && v>0) ? v : null;
        }
        try{ renderHeaderChips?.(); }catch{}
      }catch{}
      try{
        const jd = byId('spJoinDate')?.value||''; const jt = byId('spJoinTime')?.value||'';
        window.joinOpenAt = (jd && jt && typeof combineDateTimeToISO==='function') ? combineDateTimeToISO(jd,jt) : null;
        const joDate = byId('joinOpenDateInput'); if (joDate) joDate.value = jd;
        const joTime = byId('joinOpenTimeInput'); if (joTime) joTime.value = jt;
      }catch{}
      // Use global variable (not window prop) since currentEventId is declared with let
      if (window.sb && (typeof currentEventId !== 'undefined') && currentEventId){
        const locText = (byId('spLocText')?.value||'').trim();
        const locUrl  = (byId('spLocUrl')?.value||'').trim();
        const jd = byId('spJoinDate')?.value||'';
        const jt = byId('spJoinTime')?.value||'';
        let joinAt = null; try{ joinAt = window.joinOpenAt || ((jd && jt && typeof combineDateTimeToISO==='function') ? combineDateTimeToISO(jd,jt) : null); }catch{ joinAt = null; }
        // Read max players directly from popup to avoid stale runtime
        let mp = null; try{
          const rawMp = (byId('spMaxPlayers')?.value||'').trim();
          if (rawMp==='') mp = null; else { const v = parseInt(rawMp,10); mp = (Number.isFinite(v) && v>0) ? v : null; }
          // mirror to runtime
          currentMaxPlayers = mp;
        }catch{ mp = null; }
        let htm = 0; try{ htm = Number(byId('spHTM')?.value ?? window.__htmAmount ?? 0) || 0; }catch{ htm = 0; }
        const updatePayload = {
          location_text: locText || null,
          location_url:  locUrl  || null,
          join_open_at:  joinAt,
          max_players:   mp,
          htm
        };
        try{
          const { error } = await sb.from('events').update(updatePayload).eq('id', currentEventId);
          if (error) throw error;
          try{
            // refresh meta cache to keep header/location in sync after save
            if (typeof setEventMetaCache === 'function') {
              setEventMetaCache(currentEventId, {
                ...(window.getEventMetaCache ? getEventMetaCache(currentEventId) : {}),
                ...updatePayload,
                event_date: (byId('sessionDate')?.value||null)
              });
            }
          }catch{}
        }catch(e){ console.warn('Save events meta failed', e); try{ showToast?.((window.__i18n_get ? __i18n_get('settings.saveMetaFail','Gagal menyimpan ke tabel events') : 'Gagal menyimpan ke tabel events'), 'error'); }catch{} }
      }

      try{ if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(true); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{}
      // Refresh UI across desktop/mobile without reload
    try{ renderHeaderChips?.(); }catch{}
    try{ ensureRoundsLengthForAllCourts?.(); }catch{}
      try{ renderAll?.(); }catch{}
      try{ refreshFairness?.(); }catch{}
      try{ renderFilterSummary?.(); }catch{}
      try{ renderEventLocation?.(byId('spLocText')?.value||'', byId('spLocUrl')?.value||''); }catch{}
      try{ refreshJoinUI?.(); }catch{}
      try{
        const msg = window.__i18n_get ? window.__i18n_get('settings.toastSaved','Pengaturan disimpan') : 'Pengaturan disimpan';
        showToast?.(msg, 'success');
      }catch{}
      try{ hide(); }catch{}
    }catch(e){
      console.warn(e);
      try{
        const msg = window.__i18n_get ? window.__i18n_get('settings.toastFailed','Gagal menyimpan pengaturan') : 'Gagal menyimpan pengaturan';
        showToast?.(msg, 'error');
      }catch{}
    }
  }

  function toggleBtnVisibility(){
    const btn = byId('btnSettings'); if (!btn) return;
    const viewer = isViewer();
    btn.classList.toggle('hidden', viewer);
  }

  function init(){
    const btn = ensureButton();
    buildModal();
    try{ window.__i18n_apply?.(); }catch{}
    btn && btn.addEventListener('click', async (e)=>{ e.preventDefault(); if (!isViewer()) await show(); });
    document.getElementById('spSave')?.addEventListener('click', (e)=>{ e.preventDefault(); if (!isViewer()) saveAll(); });
    // React to role changes via html[data-readonly]
    toggleBtnVisibility();
    try{
      const ro = new MutationObserver(toggleBtnVisibility);
      ro.observe(document.documentElement, { attributes:true, attributeFilter:['data-readonly'] });
    }catch{}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
