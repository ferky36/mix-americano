"use strict";
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
      btn.textContent = 'Mulai Main';
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
    const activeHTML = active ? `<div class="mt-1 text-[11px]">Filter aktif: <b>${(typeof escapeHtml==='function')?escapeHtml(active):active}</b> · <button type="button" class="fi-clear underline">Reset</button></div>` : '';
    box.innerHTML = `
      <div class="font-semibold mb-1">Fairness Info (semua lapangan): min=${min}, max=${max}, selisih=${spread}</div>
      <div class="fi-chipwrap leading-6">${rows}</div>
      ${activeHTML}
      <div class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Tips: jika ada ⬆ dan ⬇ berjauhan, klik \"Terapkan\" lagi untuk mengacak ulang; sistem mengutamakan pemain yang masih kurang main.</div>
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
    try{ const el = byId('btnTheme'); if (el && /[^\w\s]/.test(el.textContent||'')) el.textContent = 'Tema'; }catch{}
    try{ const el = byId('btnHdrMenu'); if (el) el.textContent = 'Menu'; }catch{}
    try{ const el = byId('btnSave'); if (el) el.textContent = 'Save'; }catch{}
    try{ const el = byId('btnMakeEventLink'); if (el) el.textContent = 'Buat Link Event'; }catch{}
    try{ const el = byId('btnReport'); if (el) el.textContent = 'Report'; }catch{}
    try{ const el = byId('btnAddCourt'); if (el) el.textContent = '＋ Tambah Lapangan'; }catch{}
    try{ const el = byId('btnResetActive'); if (el) el.textContent = 'Reset Lapangan Aktif'; }catch{}
    try{ const el = byId('btnClearScoresActive'); if (el) el.textContent = 'Clear Skor (Lapangan Aktif)'; }catch{}
    try{ const el = byId('btnClearScoresAll'); if (el) el.textContent = 'Clear Skor (Semua Lapangan)'; }catch{}
    try{ const el = byId('btnLeaveEvent'); if (el) el.textContent = 'Keluar Event'; }catch{}
    try{ const el = byId('filterChevron'); if (el){ const open = !!byId('filterPanel')?.classList.contains('open'); el.textContent = open ? '▾' : '▸'; } }catch{}
  }
  // Small badge for Wasit (score-only) in header chips
  try {
    window.renderWasitBadge = function(){
      const chips = byId('hdrChips'); if (!chips) return;
      let el = byId('chipWasit');
      if (!el) {
        el = document.createElement('span');
        el.id = 'chipWasit';
        el.className = 'chip hidden';
        // simple whistle-ish icon
        el.innerHTML = '<svg class="chip-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"/><path d="M9 12h8a3 3 0 0 1 0 6h-4"/></svg><span>Wasit</span>';
        chips.appendChild(el);
      }
      const isWasit = String(window._memberRole||'').toLowerCase() === 'wasit';
      el.classList.toggle('hidden', !isWasit);
    };
  } catch {}
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
        if (!el || el.children && el.children.length>0) return;
        let t = String(el.textContent||'');
        if (!t) return;
        const orig = t;
        t = t.replace(/�?"/g,'–').replace(/�?�/g,'·');
        if (t !== orig) el.textContent = t;
      });
    }catch{}
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
