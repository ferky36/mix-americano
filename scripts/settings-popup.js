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
          <button id="spClose" class="px-3 py-1.5 rounded-lg border dark:border-gray-700">Tutup</button>
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
    // Close handlers
    qs('#spClose', wrap)?.addEventListener('click', ()=>{ try{ byId('spHTM')?.dispatchEvent(new Event('blur',{bubbles:true})); }catch{} hide(); });
    wrap.addEventListener('click', (e)=>{ if ((e.target).getAttribute && (e.target).getAttribute('data-act')==='close') { try{ byId('spHTM')?.dispatchEvent(new Event('blur',{bubbles:true})); }catch{} hide(); } });
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
    map.forEach(([sid, did])=>{ const s=byId(sid), d=byId(did); if (s&&d){ setVal(d, s.value||''); d.oninput=null; pipe(s,d); }});

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
        const saveDB = async (val)=>{
          try{
            if(!window.sb || !window.currentEventId || !window.isCloudMode || !isCloudMode()) return;
            const n = Number(val||0)||0;
            const { error } = await sb.from('events').update({ htm:n }).eq('id', currentEventId);
            if (!error) { try{ showToast?.('HTM tersimpan', 'success'); }catch{} }
            else { try{ showToast?.('Gagal menyimpan HTM', 'error'); }catch{} }
          }catch{ try{ showToast?.('Gagal menyimpan HTM', 'error'); }catch{} }
        };
        const debSave = debounce((v)=> saveDB(v), 600);
        h.oninput = ()=>{
          setHTM(h.value||'');
          try{
            const n=Number(h.value||0)||0;
            const s=document.getElementById('summaryHTM'); if(s){ s.textContent='Rp'+n.toLocaleString('id-ID'); }
            window.__htmAmount=n;
          }catch{}
          debSave(h.value||'');
        };
        // Pastikan flush ketika keluar input / menutup modal
        h.onblur = ()=> saveDB(h.value||'');
      }
    }catch{}
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
    // React to role changes via html[data-readonly]
    toggleBtnVisibility();
    try{
      const ro = new MutationObserver(toggleBtnVisibility);
      ro.observe(document.documentElement, { attributes:true, attributeFilter:['data-readonly'] });
    }catch{}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();


