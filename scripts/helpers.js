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
