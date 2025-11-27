"use strict";
// === Join Open Time (Tanggal & Jam terpisah) =========================
// Menentukan kapan orang boleh mulai "Join" (tidak terkait tanggal/jam event)
window.joinOpenAt = null; // ISO UTC string atau null
let __joinTimer = null;

function toLocalDateValue(iso) {
  try { if (!iso) return ''; const d = new Date(iso);
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`; } catch { return ''; }
}
function toLocalTimeValue(iso) {
  try { if (!iso) return ''; const d = new Date(iso);
    const hh=String(d.getHours()).padStart(2,'0'), mi=String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mi}`; } catch { return ''; }
}
function combineDateTimeToISO(dateStr, timeStr) {
  try {
    if (!dateStr || !timeStr) return null;
    const [hh,mm] = String(timeStr).split(':').map(n=>parseInt(n||'0',10));
    if (![hh,mm].every(Number.isFinite)) return null;
    const hhStr = String(hh).padStart(2,'0');
    const mmStr = String(mm).padStart(2,'0');
    // Simpan dengan offset lokal (mis. +07:00) agar DB timestamptz tahu zona, tapi epoch tetap UTC
    const localDate = new Date(`${dateStr}T${hhStr}:${mmStr}:00`);
    const offsetMinutes = localDate.getTimezoneOffset(); // negatif untuk GMT+
    const sign = offsetMinutes <= 0 ? '+' : '-';
    const offH = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2,'0');
    const offM = String(Math.abs(offsetMinutes) % 60).padStart(2,'0');
    return `${dateStr}T${hhStr}:${mmStr}:00${sign}${offH}:${offM}`;
  } catch { return null; }
}
function isJoinOpen() {
  try { if (!window.joinOpenAt) return true;
    return Date.now() >= new Date(window.joinOpenAt).getTime(); } catch { return true; }
}
function scheduleJoinOpenTimer() {
  try {
    if (__joinTimer) { clearTimeout(__joinTimer); __joinTimer=null; }
    if (!window.joinOpenAt) return;
    const diff = new Date(window.joinOpenAt).getTime() - Date.now();
    if (diff > 0 && diff < 86400000) {
      __joinTimer = setTimeout(()=>{ try{ refreshJoinUI?.(); }catch{} }, diff);
    }
  } catch {}
}

// hitung kemunculan pemain di SEMUA lapangan, dengan opsi exclude court tertentu
function countAppearAll(excludeCourt=-1){
  const cnt=Object.fromEntries(players.map(p=>[p,0]));
  roundsByCourt.forEach((court,ci)=>{
    if(!court || (excludeCourt===ci)) return;
    court.forEach(r=>{
      if(!r) return;
      [r.a1,r.a2,r.b1,r.b2].forEach(x=>{ if(x) cnt[x]=(cnt[x]||0)+1; });
    });
  });
  return cnt;
}

function debounce(fn, wait = 120){
  let t; 
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
// panggilan ringan untuk refresh fairness
const refreshFairness = debounce(() => renderFairnessInfo(), 120);
// Debounce autosave untuk skor live di popup (agar realtime tanpa spam)
const saveLiveScoreDebounced = debounce(() => {
  try{
    if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud();
    else if (typeof saveStateToCloud === 'function' && isCloudMode && isCloudMode()) saveStateToCloud();
  }catch{}
}, 700);
function parseHM(str){ // "19:00" -> minutes since midnight
  const [h,m] = (str||'00:00').split(':').map(n=>parseInt(n||'0',10));
  return (h*60 + m) % (24*60);
}
function fmtHM(mins){ // 1140 -> "19:00"
  mins = ((mins % (24*60)) + (24*60)) % (24*60);
  const h = Math.floor(mins/60), m = mins%60;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
}
// minutes sejak 00:00 untuk start ronde ke-i (termasuk jeda antarronde)
function roundStartMinutes(i){
  const start = parseHM(byId('startTime').value || '19:00');
  const main  = parseInt(byId('minutesPerRound').value || '10', 10);
  const brk   = parseInt(byId('breakPerRound').value   || '0', 10);
  return start + i * (main + brk);
}

// string "HH:MM" untuk start
function roundStartTime(i){
  return fmtHM(roundStartMinutes(i));
}

// string "HH:MM" untuk end = start + durasi MAIN (tanpa jeda)
function roundEndTime(i){
  const main = parseInt(byId('minutesPerRound').value || '10', 10);
  return fmtHM(roundStartMinutes(i) + main);
}
