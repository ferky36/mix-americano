"use strict";
const __hT = (k, f)=> (window.__i18n_get ? __i18n_get(k, f) : f);
// Global XSS sanitizer
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
window.escapeHtml = escapeHtml;

// ================== Helpers ================== //
// bisa disesuaikan urutannya
const DEFAULT_PLAYERS_10 = [
  'Della','Rangga','Fai','Gizla','Abdi','Diana',
  'Ichsan','Marchel','Altundri','Ferdi'
];
const pad = (n) => String(n).padStart(2, "0");
const toHM = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
const csvEscape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[,\"\n]/.test(s) ? '"' + s.replace(/\"/g, '""') + '"' : s;
};
const byId = (id) => document.getElementById(id);
// Global loading overlay
let __loadingCount = 0;
function showLoading(text){
  const o = byId('loadingOverlay'); if (!o) return; __loadingCount++;
  const t = byId('loadingText'); if (t && text) t.textContent = text;
  o.classList.remove('hidden');
}
function hideLoading(){
  const o = byId('loadingOverlay'); if (!o) return; __loadingCount = Math.max(0, __loadingCount-1);
  if (__loadingCount === 0) o.classList.add('hidden');
}
const parsePlayersText = (t) =>
  (t || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
function fmtMMSS(ms){
  const total = Math.max(0, Math.floor(ms/1000));
  const mm = String(Math.floor(total/60)).padStart(2,'0');
  const ss = String(total%60).padStart(2,'0');
  return `${mm}:${ss}`;
}
function setScoreModalLocked(locked){
  const scoreButtonsA   = byId('scoreButtonsA');  
  const scoreButtonsB   = byId('scoreButtonsB');  
  const left   = byId('scoreControlsLeft');   // wrap: Start / Set Seri / Reset
  const finish = byId('btnFinishScore');
  const recalc = byId('btnRecalc');
  const start  = byId('btnStartTimer');

  if (scoreButtonsA)   scoreButtonsA.classList.toggle('hidden', locked);
  if (scoreButtonsB)   scoreButtonsB.classList.toggle('hidden', locked);
  if (left)   left.classList.toggle('hidden', locked);
  if (finish) finish.classList.toggle('hidden', locked);
  if (recalc) recalc.classList.toggle('hidden', !locked || (typeof isOwnerNow==='function' ? !isOwnerNow() : !window._isOwnerUser));

  // Start aktif hanya ketika BELUM ada skor (mode unlocked saat fresh open)
  if (start) start.disabled = locked;
}

// Pre-start state: sebelum klik Mulai, sembunyikan tombol +/- dan tampilkan tombol Mulai
function setScoreModalPreStart(pre){
  const scoreButtonsA   = byId('scoreButtonsA');  
  const scoreButtonsB   = byId('scoreButtonsB');  
  const start  = byId('btnStartTimer');
  const reset  = byId('btnResetScore');
  const show = (el)=>{ if(!el) return; el.classList.remove('fade-out'); el.classList.remove('hidden'); el.classList.add('fade-in'); setTimeout(()=>el.classList.remove('fade-in'), 220); };
  const hide = (el)=>{ if(!el) return; el.classList.remove('fade-in'); el.classList.add('fade-out'); setTimeout(()=>{ el.classList.add('hidden'); el.classList.remove('fade-out'); }, 180); };
  if (pre){ hide(scoreButtonsA); hide(scoreButtonsB); show(start); hide(reset); }
  else    { show(scoreButtonsA); show(scoreButtonsB); hide(start); show(reset); }
}
function shuffleInPlace(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
const teamKey=(a,b)=>[a,b].sort().join(' & ');
const vsKey  =(a,b)=>[a,b].sort().join(' vs ');

// Matikan autofill/password prompt pada input non-password agar tidak muncul "use saved password"
(function disablePasswordSuggestions(){
  const apply = ()=>{
    document.querySelectorAll('input').forEach(el=>{
      const t = (el.getAttribute('type')||'').toLowerCase();
      if (t === 'password' || t === 'hidden' || t === 'file') return;
      el.setAttribute('autocomplete','off');
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();

// -------- UI polish for header labels/icons (fix encoding artifacts) --------
// Run once after DOM ready
(function normalizeHeaderUI(){
  function run(){
    try{ const el = byId('btnTheme'); if (el && /[^\w\s]/.test(el.textContent||'')) el.textContent = (window.__i18n_get ? __i18n_get('theme.button','Tema') : 'Tema'); }catch{}
    const labelFix = {
      btnSave: (window.__i18n_get ? __i18n_get('header.save','Save') : 'Save'),
      btnMakeEventLink: (window.__i18n_get ? __i18n_get('event.title','Buat/Cari Event') : 'Buat/Cari Event'),
      btnReport: (window.__i18n_get ? __i18n_get('header.report','Report') : 'Report'),
      btnHdrMenu: (window.__i18n_get ? __i18n_get('header.menu','Menu') : 'Menu'),
      btnLeaveEvent: (window.__i18n_get ? __i18n_get('header.leave','Keluar Event') : 'Keluar Event')
    };
    Object.keys(labelFix).forEach(id=>{
      try{
        const b = byId(id); if (!b) return;
        const t = (b.textContent||'').trim();
        if (!t || /[^\p{L}\p{N}\s\/:,&.-]/u.test(t)) b.textContent = labelFix[id];
      }catch{}
    });
    // Replace title edit button glyph with a clean SVG pencil
    try{
      const e = byId('btnTitleEdit');
      if (e){
        e.className = 'p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 shadow';
        e.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16.862 3.487a2.25 2.25 0 113.182 3.183L7.5 19.214 3 21l1.786-4.5L16.862 3.487z"/></svg>';
      }
    }catch{}

    // Replace left header square with app icon from /icons
    try{
      const logo = document.querySelector('header .grid.place-items-center.shadow');
      if (logo && !logo.dataset.logoEnhanced){
        // If already has an <img>, keep it. Otherwise, inject app icon image.
        if (!logo.querySelector('img')){
          logo.innerHTML = '<img src="icons/icon-192.png" alt="Logo" class="app-logo w-8 h-8 md:w-10 md:h-10" />';
        }
        logo.dataset.logoEnhanced = '1';
      }
    }catch{}

    // (btnLang removed by request)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

// ===== Desktop controls toggle with fluid animation =====
(function desktopControlsToggle(){
  function init(){
    const btn = document.getElementById('btnHdrControlsToggle');
    const wrap = document.getElementById('hdrControlsWrap') || document.getElementById('hdrControls');
    if (!btn || !wrap) return;
    // Start closed on desktop
    if (window.matchMedia('(min-width: 768px)').matches){ wrap.classList.remove('open'); }
    btn.addEventListener('click', ()=>{
      wrap.classList.toggle('open');
    });
    // On resize to desktop, keep it hidden by default
    window.addEventListener('resize', ()=>{
      if (window.matchMedia('(min-width: 768px)').matches){ wrap.classList.remove('open'); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// (width alignment via classes on #hdrControlsWrap)
// Sequential start guard: only allow starting round i when previous finished
function canStartRoundBySequence(courtIdx, roundIdx){
  try{
    const rounds = roundsByCourt[courtIdx] || [];
    if (roundIdx <= 0) return true;
    const prev = rounds[roundIdx-1] || {};
    return !!prev.finishedAt;
  }catch{ return true; }
}
// Update next row button after a round finished (lightweight DOM tweak)
function updateNextStartButton(courtIdx, roundIdx){
  try{
    const nextIdx = roundIdx + 1;
    const rounds = roundsByCourt[courtIdx] || [];
    const next = rounds[nextIdx];
    if (!next) return;
    const row = document.querySelector('.rnd-table tbody tr[data-index="'+nextIdx+'"]');
    if (!row) return;
    const actions = row.querySelector('.rnd-col-actions');
    const btn = actions?.querySelector('button');
    if (!btn) return;
    const allowStart = (typeof canEditScore==='function') ? canEditScore() : !isViewer();
    if (!allowStart || next.startedAt || next.finishedAt) return;
    if (canStartRoundBySequence(courtIdx, nextIdx)){
      btn.textContent = __hT('status.startMatch','Mulai Main');
      btn.disabled = false;
      btn.classList.remove('opacity-50','cursor-not-allowed','hidden');
    }
  }catch{}
}

// Fairness renderer impl based on actual scheduled rounds (via counts)
function __fairnessFromRounds(){
  try{
    let box = byId('fairnessInfo');
    if(!box){
      box = document.createElement('div');
      box.id='fairnessInfo';
      box.className='mt-3 text-xs bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2';
      const toolbar = byId('courtsToolbar') || document.body;
      toolbar.parentNode.insertBefore(box, toolbar.nextSibling);
    }
    const cnt = (typeof countAppearAll==='function') ? countAppearAll(-1) : {};
    const list = Object.keys(cnt)
      .filter(p => (cnt[p]||0) > 0)
      .sort((a,b)=>{ const da=(cnt[a]||0), db=(cnt[b]||0); if(da!==db) return db-da; return String(a).localeCompare(String(b)); });
    const values = list.length ? list.map(p=>cnt[p]||0) : [0];
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const spread = max - min;
    const rows = list.map(p=>{
      const n = cnt[p]||0;
      const mark = (n===min ? '⬇' : (n===max ? '⬆' : '•'));
      const safe = (typeof escapeHtml==='function') ? escapeHtml(p) : String(p);
      // clickable chip to filter by player
      return `<button type="button" class="fi-name inline-flex items-center gap-1 mr-3 mb-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-200 dark:border-blue-800" data-player="${safe}">${mark} <b>${safe}</b>: ${n}</button>`;
    }).join('');
    const active = window.__fairnessFilterName || '';
    const activeHTML = active ? `<div class="mt-1 text-[11px]">${__hT('render.fairness.activeFilter','Filter aktif:')} <b>${(typeof escapeHtml==='function')?escapeHtml(active):active}</b> → <button type="button" class="fi-clear underline">${__hT('render.fairness.reset','Reset')}</button></div>` : '';
    box.innerHTML = `
      <div class="font-semibold mb-1">${__hT('render.fairness.header','Fairness Info (semua lapangan): min={min}, max={max}, selisih={spread}').replace('{min}', min).replace('{max}', max).replace('{spread}', spread)}</div>
      <div class="fi-chipwrap leading-6">${rows}</div>
      ${activeHTML}
      <div class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">${__hT('render.fairness.tips','Tips: jika ada panah naik/turun berjauhan, klik \"Terapkan\" lagi untuk mengacak ulang; sistem mengutamakan pemain yang masih kurang main.')}</div>
    `;

    // bind click handlers once per render
    try{
      box.querySelectorAll('.fi-name').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const enc = btn.getAttribute('data-player') || '';
          let name = '';
          try { name = decodeURIComponent(enc); } catch { name = enc; }
          if (!name){
            try{ const b = btn.querySelector('b'); name = (b && b.textContent) ? b.textContent.trim() : ''; }catch{}
          }
          if (window.__fairnessFilterName === name) window.__fairnessFilterName = '';
          else window.__fairnessFilterName = name;
          __applyFairnessFilter();
          // re-render header to show active filter badge
          __fairnessFromRounds();
        });
      });
      const clear = box.querySelector('.fi-clear');
      if (clear) clear.addEventListener('click', ()=>{ window.__fairnessFilterName=''; __applyFairnessFilter(); __fairnessFromRounds(); });
    }catch{}
  }catch{}
}

// Apply filter to active court table
function __applyFairnessFilter(){
  try{
    const target = String(window.__fairnessFilterName||'').trim();
    const table = document.querySelector('.rnd-table tbody');
    if (!table){ return; }
    const rows = table.querySelectorAll('tr');
    if (!target){ rows.forEach(tr=> { tr.classList.remove('hidden'); tr.classList.remove('fi-hide'); tr.style.display=''; try{ delete tr.dataset.fiPrevDisplay; }catch{} }); return; }
    rows.forEach(tr=>{
      // keep non-match rows hidden if they don't include the player
      const idxStr = tr.getAttribute('data-index');
      const isBreak = tr.classList.contains('rnd-break-row');
      if (isBreak){ tr.classList.add('fi-hide'); try{ if (!tr.dataset.fiPrevDisplay){ tr.dataset.fiPrevDisplay = tr.style.display || ''; } tr.style.display='none'; }catch{} return; }
      const i = Number(idxStr);
      if (!Number.isFinite(i)){ tr.classList.remove('hidden'); tr.classList.remove('fi-hide'); tr.style.display=''; try{ delete tr.dataset.fiPrevDisplay; }catch{} return; }
      // Prefer DOM selected option texts/values when available
      let hit = false;
      try{
        const sels = tr.querySelectorAll('select');
        const vals = Array.from(sels).slice(0,4).map(s=>{
          const v = s.value || '';
          const t = (s.options && s.selectedIndex>=0) ? (s.options[s.selectedIndex]?.text || '') : '';
          return (v || t || '').trim();
        });
        hit = vals.some(x => x === target);
      }catch{}
      if (!hit){
        const round = (Array.isArray(window.roundsByCourt) ? (window.roundsByCourt[window.activeCourt||0]||[])[i] : null) || {};
        hit = [round.a1, round.a2, round.b1, round.b2].some(x => String(x||'') === target);
      }
      if (hit){ tr.classList.remove('hidden'); tr.classList.remove('fi-hide'); tr.style.display=''; try{ delete tr.dataset.fiPrevDisplay; }catch{} }
      else { tr.classList.add('fi-hide'); try{ if (!tr.dataset.fiPrevDisplay){ tr.dataset.fiPrevDisplay = tr.style.display || ''; } tr.style.display='none'; }catch{} }
    });
  }catch{}
}

// ---------- UI Sanitizer (fix garbled placeholders/icons) ----------
(function uiSanitizer(){
  function cleanHeader(){
    try{ const el = byId('chipDateText'); if (el && !el.textContent.trim()) el.textContent = '-'; }catch{}
    try{ const el = byId('btnTheme'); if (el && /[^\w\s]/.test(el.textContent||'')) el.textContent = (window.__i18n_get ? __i18n_get('theme.button','Tema') : 'Tema'); }catch{}
    try{ const el = byId('btnHdrMenu'); if (el) el.textContent = (window.__i18n_get ? __i18n_get('header.menu','Menu') : 'Menu'); }catch{}
    try{ const el = byId('btnSave'); if (el) el.textContent = (window.__i18n_get ? __i18n_get('header.save','Save') : 'Save'); }catch{}
    try{ const el = byId('btnMakeEventLink'); if (el) el.textContent = (window.__i18n_get ? __i18n_get('event.createTitle','Buat/Cari Event') : 'Buat/Cari Event'); }catch{}
    try{ const el = byId('btnReport'); if (el) el.textContent = (window.__i18n_get ? __i18n_get('header.report','Report') : 'Report'); }catch{}
    try{ const el = byId('btnAddCourt'); if (el) el.textContent = (window.__i18n_get ? __i18n_get('controls.addCourt','+ Tambah Lapangan') : '+ Tambah Lapangan'); }catch{}
    try{
      const btn = byId('btnResetActive');
      const span = btn?.querySelector('[data-i18n="controls.resetActive"]');
      if (span && window.__i18n_get) span.textContent = __i18n_get('controls.resetActive','Reset Lapangan Aktif');
    }catch{}
  try{
    const btn = byId('btnClearScoresActive');
    const span = btn?.querySelector('span');
    if (span) span.textContent = 'Clear Score';
  }catch{}
    try{ const el = byId('btnLeaveEvent'); if (el) el.textContent = (window.__i18n_get ? __i18n_get('header.leave','Keluar Event') : 'Keluar Event'); }catch{}
    try{ const el = byId('filterChevron'); if (el){ const open = !!byId('filterPanel')?.classList.contains('open'); el.textContent = open ? 'v' : '^'; } }catch{}
  }
  // // Small badge for Wasit (score-only) in header chips
  // try {
  //   window.renderWasitBadge = function(){
  //     const chips = byId('hdrChips'); if (!chips) return;
  //     let el = byId('chipWasit');
  //     if (!el) {
  //       el = document.createElement('span');
  //       el.id = 'chipWasit';
  //       el.className = 'chip hidden';
  //       // simple whistle-ish icon
  //       el.innerHTML = '<svg class="chip-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"/><path d="M9 12h8a3 3 0 0 1 0 6h-4"/></svg><span>Wasit</span>';
  //       chips.appendChild(el);
  //     }
  //     const isWasit = String(window._memberRole||'').toLowerCase() === 'wasit';
  //     el.classList.toggle('hidden', !isWasit);
  //   };
  // } catch {}
  function overrideFairness(){
    try{
      window.renderFairnessInfo = __fairnessFromRounds;
      // Pastikan override ini yang terakhir (setelah semua script load)
      window.addEventListener('load', ()=>{ try{ window.renderFairnessInfo = __fairnessFromRounds; }catch{} });
    }catch{}
  }
  function ensureFairnessAutoRefresh(){
    try{
      const debounce = (fn, ms=150)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
      const run = debounce(()=>{ try{ if (typeof window.renderFairnessInfo==='function') window.renderFairnessInfo(); __applyFairnessFilter(); }catch{} }, 120);
      const host = byId('courtContainer');
      if (!host) return;
      if (window.__fairnessMO) { try{ window.__fairnessMO.disconnect(); }catch{} }
      const mo = new MutationObserver(()=> run());
      mo.observe(host, { childList:true, subtree:true });
      window.__fairnessMO = mo;
    }catch{}
  }
  function observeFilter(){
    try{
      const panel = byId('filterPanel'); const chev = byId('filterChevron');
      if (!panel || !chev) return;
      const mo = new MutationObserver(()=>{ try{ chev.textContent = panel.classList.contains('open') ? '▾' : '▸'; }catch{} });
      mo.observe(panel, { attributes:true, attributeFilter:['class'] });
    }catch{}
  }
  function sweepSeparators(){
    try{
      const sels = ['.rnd-col-time','[id^="tab-"]','[id^="section-"] h3','[id^="section-"] .text-xs','button','th','td','label','span'];
      document.querySelectorAll(sels.join(',')).forEach(el=>{
        if (!el || (el.children && el.children.length>0)) return;
        const text = String(el.textContent||'');
        if (!text) return;
        const cleaned = text.replace(/\uFFFD+/g, '');
        if (cleaned !== text) el.textContent = cleaned;
      });
    }catch(err){ console.warn('sweepSeparators gagal', err); }
  }
  function ensureFairnessMobileStyles(){
    try{
      if (document.getElementById('fairness-mobile-styles')) return;
      const st = document.createElement('style');
      st.id = 'fairness-mobile-styles';
      st.textContent = `
        @media (max-width: 640px) {
          #fairnessInfo{ overflow-x:auto; -webkit-overflow-scrolling: touch; }
          #fairnessInfo .fi-chipwrap{ display:flex; flex-wrap:nowrap; gap:.35rem; }
          #fairnessInfo .fi-name{ white-space:nowrap; font-size:12px; padding:4px 6px; }
          #fairnessInfo .fi-clear{ font-size:12px; }
        }
        .rnd-table tr.fi-hide{ display:none !important; }
      `;
      document.head.appendChild(st);
    }catch{}
  }
  function ensureFairnessVisibilityObserver(){
    try{
      const jadwal = document.getElementById('section-jadwal') || document.getElementById('toolbarSection');
      if (!jadwal) return;
      if (window.__fairnessVisMO) { try{ window.__fairnessVisMO.disconnect(); }catch{} }
      const mo = new MutationObserver(()=>{ try{ if (!jadwal.classList.contains('hidden')) __applyFairnessFilter(); }catch{} });
      mo.observe(jadwal, { attributes:true, attributeFilter:['class'] });
      window.__fairnessVisMO = mo;
    }catch{}
  }
  function run(){ cleanHeader(); overrideFairness(); observeFilter(); sweepSeparators(); ensureFairnessAutoRefresh(); ensureFairnessMobileStyles(); ensureFairnessVisibilityObserver(); try{ renderWasitBadge?.(); }catch{} }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
// ======= Lightweight shared caches =======
// Cached Supabase auth user to avoid /user being called repeatedly on load.
window.getAuthUserCached = async function(ttlMs = 5000){
  try{
    const now = Date.now();
    const cache = window.__authUserCache || {};
    if (cache.data && (now - (cache.ts||0) < ttlMs)) return cache.data;
    if (cache.promise) return await cache.promise;
    const p = (async()=>{ try{ const { data } = await sb.auth.getUser(); return data||null; }catch{ return null; } })();
    window.__authUserCache = { promise: p };
    const data = await p; window.__authUserCache = { data, ts: now };
    return data;
  }catch{ return null; }
};

// Simple per-event meta cache to dedupe repeated SELECTs on reload.
window.__eventMetaCache = window.__eventMetaCache || {};
window.setEventMetaCache = function(eventId, meta){ try{ if (!eventId) return; window.__eventMetaCache[eventId] = { meta, ts: Date.now() }; }catch{} };
window.getEventMetaCache = function(eventId){ try{ return window.__eventMetaCache[eventId]?.meta || null; }catch{ return null; } };

// Cache per-event membership role to avoid repeated SELECT event_members
window.__memberRoleCache = window.__memberRoleCache || {};
window.getMemberRoleCached = async function(eventId, ttlMs = 5000){
  try{
    if (!eventId || !window.sb) return null;
    const now = Date.now();
    const hit = window.__memberRoleCache[eventId];
    if (hit && (now - (hit.ts||0) < ttlMs)) return hit.role;
    if (hit && hit.promise) return await hit.promise;
    const p = (async()=>{
      try{
        const data = await (window.getAuthUserCached ? getAuthUserCached() : sb.auth.getUser().then(r=>r.data));
        const uid = data?.user?.id || null; if (!uid) return null;
        const { data: mem } = await sb.from('event_members').select('role').eq('event_id', eventId).eq('user_id', uid).maybeSingle();
        return mem?.role || null;
      }catch{ return null; }
    })();
    window.__memberRoleCache[eventId] = { promise: p };
    const role = await p; window.__memberRoleCache[eventId] = { role, ts: now };
    return role;
  }catch{ return null; }
};
