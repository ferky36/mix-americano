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
    btn.title = 'Pengaturan (Filter/Jadwal)';
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
          <h3 class="text-lg md:text-xl font-semibold">Pengaturan</h3>
          <div class="flex items-center gap-2">
            <button id="spSave" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold">Simpan</button>
            <button id="spClose" class="px-3 py-1.5 rounded-lg border dark:border-gray-700">Tutup</button>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3" id="spGrid">
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Tanggal</label>
            <input id="spDate" type="date" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Mulai</label>
            <input id="spStart" type="time" step="60" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Menit / Match</label>
            <input id="spMinutes" type="number" min="1" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Jeda per Match (menit)</label>
            <div class="flex items-center gap-3 p-2 border rounded-xl dark:border-gray-700">
              <input id="spBreak" type="number" min="0" class="border rounded-lg px-3 py-2 w-24 bg-white dark:bg-gray-800 dark:border-gray-700" />
              <!-- Checkbox disembunyikan, selalu aktif -->
              <input id="spShowBreak" type="checkbox" class="hidden" checked />
            </div>
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Match / Lapangan</label>
            <input id="spRounds" type="number" min="1" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Max Pemain</label>
            <input id="spMaxPlayers" type="number" min="0" step="2" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" placeholder="0 = tak terbatas" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Lokasi (opsional)</label>
            <input id="spLocText" type="text" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" placeholder="Mis. Lapangan A, GBK" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Link Maps (opsional)</label>
            <input id="spLocUrl" type="url" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" placeholder="https://maps.app.goo.gl/..." />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Buka Join (tanggal)</label>
            <input id="spJoinDate" type="date" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">Buka Join (waktu)</label>
            <input id="spJoinTime" type="time" step="60" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label class="block text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-300">HTM</label>
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

  function show(){ const m = buildModal(); m.classList.remove('hidden'); syncFromSource(); }
  function hide(){ const m = byId('settingsPopup'); if (m) m.classList.add('hidden'); }

  function setVal(el, v){ if (!el) return; const old=el.value||''; if (String(old)!==String(v||'')) el.value = v||''; }
  function pipe(src, dst){ if (!src||!dst) return; setVal(dst, src.value||''); dst.addEventListener('input', ()=>{ src.value = dst.value||''; src.dispatchEvent(new Event('input',{bubbles:true})); src.dispatchEvent(new Event('change',{bubbles:true})); }); }

  function syncFromSource(){
    // Ensure dynamic editor fields exist in source panel
    try{ window.ensureMaxPlayersField?.(); }catch{}
    try{ window.ensureLocationFields?.(); }catch{}
    try{ window.ensureJoinOpenFields?.(); }catch{}

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
        h.value = getHTM();
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
      }catch{}
      // Use global variable (not window prop) since currentEventId is declared with let
      if (window.sb && (typeof currentEventId !== 'undefined') && currentEventId){
        const locText = (byId('spLocText')?.value||'').trim();
        const locUrl  = (byId('spLocUrl')?.value||'').trim();
        const jd = byId('spJoinDate')?.value||'';
        const jt = byId('spJoinTime')?.value||'';
        let joinAt = null; try{ joinAt = (jd && jt && typeof combineDateTimeToISO==='function') ? combineDateTimeToISO(jd,jt) : null; }catch{ joinAt = null; }
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
        }catch(e){ console.warn('Save events meta failed', e); try{ showToast?.('Gagal menyimpan ke tabel events', 'error'); }catch{} }
      }

      try{ if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(true); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{}
      try{ showToast?.('Pengaturan disimpan', 'success'); }catch{}
      try{ renderEventLocation?.(byId('spLocText')?.value||'', byId('spLocUrl')?.value||''); }catch{}
      try{ hide(); }catch{}
    }catch(e){ console.warn(e); try{ showToast?.('Gagal menyimpan pengaturan', 'error'); }catch{} }
  }

  function toggleBtnVisibility(){
    const btn = byId('btnSettings'); if (!btn) return;
    const viewer = isViewer();
    btn.classList.toggle('hidden', viewer);
  }

  function init(){
    const btn = ensureButton();
    buildModal();
    btn && btn.addEventListener('click', (e)=>{ e.preventDefault(); if (!isViewer()) show(); });
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
