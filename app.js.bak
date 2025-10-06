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
  try { if (!dateStr || !timeStr) return null;
    const dt = new Date(`${dateStr}T${timeStr}`);
    return isNaN(dt.getTime()) ? null : dt.toISOString(); } catch { return null; }
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

// ===== Local storage helpers =====
const STORAGE_KEY = 'mixam_sessions_v1';

function readAllSessionsLS() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function writeAllSessionsLS(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

/***** ===== Supabase Cloud Mode Helpers ===== *****/
let currentEventId = null;          // UUID event dari URL
let currentSessionDate = null;      // 'YYYY-MM-DD'
let _serverVersion = 0;             // versi terakhir dari DB
let _forceViewer = false;           // true jika URL memaksa readonly (share link)
let _ownerHintFromUrl = null;       // UUID owner yang dibawa di URL (untuk create oleh viewer)
let _stateRealtimeChannel = null;   // Supabase Realtime channel for event_states

function getUrlParams() {
  const url = new URL(location.href);
  return {
    event: url.searchParams.get('event') || null,
    date:  url.searchParams.get('date')  || null,
    role:  url.searchParams.get('role')  || null,
    view:  url.searchParams.get('view')  || null,
    owner: url.searchParams.get('owner') || null,
    invite: url.searchParams.get('invite') || null,
  };
}

function isUuid(v){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || '');
}

function isCloudMode(){ 
  return !!(window.sb && isUuid(currentEventId));
}

function normalizeDateKey(s){
  // terima '2025-08-26' atau '26/08/2025' → kembalikan 'YYYY-MM-DD'
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

// helper kecil untuk slug
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '-')            // spasi → dash
    .replace(/[^a-z0-9-]/g, '')      // buang non-alfanumerik
    .replace(/-+/g, '-')             // rapikan ganda
    .replace(/^-|-$/g, '') || 'event';
}

async function createEventIfNotExists(name, date) {
  // Gunakan RPC SECURITY DEFINER agar lolos RLS dan mengisi owner_id otomatis di DB
  const { data, error } = await sb.rpc('create_event_if_not_exists', {
    p_title: name,
    p_name: name,
    p_date: date
  });
  if (error) throw error;
  // data bisa berupa array [{id,created}] atau object tergantung PostgREST
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.id, created: !!row.created, title: name };
}

// ===== Util: state & UI for Event/Create/Search button =====
function refreshEventButtonLabel(){
  const btn = byId('btnMakeEventLink');
  if (!btn) return;
  // Sederhanakan: selalu tampil "Buat/Cari Event" agar user paham 2 opsi
  btn.textContent = 'Buat/Cari Event';
}

// ===== Event Location (simple) =====
function ensureEventLocationHeader(){
  try{
    const holder = document.getElementById('eventLocationView');
    // Do not create fallback anymore; chips are primary UI
    return holder || null;
  }catch{ return null; }
}

function renderEventLocation(text, url){
  const el = ensureEventLocationHeader();
  const t = (text||'').trim();
  const u = (url||'').trim();
  if (el){
    if (!t && !u){ el.textContent = ''; el.classList.add('hidden'); }
    else {
      el.classList.remove('hidden');
      const icon = '<svg class="pin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
      if (t && u){
        el.innerHTML = `<div class="event-loc">${icon}<a href="${u}" target="_blank" rel="noopener noreferrer">${escapeHtml(t)}</a></div>`;
      } else if (t){
        el.innerHTML = `<div class="event-loc">${icon}<span>${escapeHtml(t)}</span></div>`;
      } else {
        el.innerHTML = `<div class="event-loc">${icon}<a href="${u}" target="_blank" rel="noopener noreferrer">Lihat lokasi</a></div>`;
      }
    }
  }

  // Also update chipLoc (primary UI)
  try{
    const chip = byId('chipLoc');
    const link = byId('chipLocLink');
    const txt  = byId('chipLocText');
    if (chip){
      const has = !!(t || u);
      chip.classList.toggle('hidden', !has);
      if (u && link){ link.href = u; link.textContent = t || 'Lihat lokasi'; link.classList.remove('hidden'); if (txt) txt.textContent = ''; }
      else if (txt){ txt.textContent = t || ''; if (link) link.removeAttribute('href'); }
    }
  }catch{}
}

function renderHeaderChips(){
  try{
    // Date chip: lengkap + jam, contoh: "Jum, 07 Okt 2025 19.00"
    const rawDate = byId('sessionDate')?.value || '';
    const rawTime = byId('startTime')?.value || '';
    let label = '—';
    if (rawDate){
      let d = new Date(rawDate + (rawTime ? 'T' + rawTime : 'T00:00'));
      if (!isNaN(d)){
        const dt = d.toLocaleDateString('id-ID', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
        const tm = d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', hour12:false });
        label = `${dt} ${tm}`;
      }
    }
    const cd = byId('chipDateText'); if (cd) cd.textContent = label;
  }catch{}
  try{
    // Players count chip
    const n = Array.isArray(players) ? players.length : 0;
    const cc = byId('chipCountText'); if (cc) { const m = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : null; cc.textContent = m ? `${n}/${m} pemain` : `${n} pemain`; }
  }catch{}
}

function openSchedulePanelAndScroll(){
  try{
    const panel = byId('filterPanel');
    if (panel){
      panel.classList.add('open');
      try{ localStorage.setItem('ui.filter.expanded','1'); }catch{}
      setTimeout(()=>{ try{ panel.scrollIntoView({ behavior:'smooth', block:'start' }); }catch{} }, 20);
    }
  }catch{}
}

async function fetchEventMetaFromDB(eventId){
  try{
    showLoading('Memuat info event…');
    const { data, error } = await sb
      .from('events')
      .select('title, location_text, location_url')
      .eq('id', eventId)
      .maybeSingle();
    if (error) return null;
    return data || null;
  }catch{ return null; }
  finally { hideLoading(); }
}

// Show/Hide admin-only buttons based on URL flags and event context
function updateAdminButtonsVisibility(){
  try{
    const p = getUrlParams?.() || {};
    const forceViewer = String(p.view||'') === '1';
    const hasEvent = !!currentEventId;
    const adminFlag = String(p.owner||'').toLowerCase() === 'yes';
    const viewerNow = (typeof isViewer === 'function') ? isViewer() : false;
    const isAdmin = adminFlag && !forceViewer && !viewerNow;
    const btnCreate = byId('btnMakeEventLink');
    const btnSave = byId('btnSave');
    // In any viewer mode (including view=1), hide admin-centric buttons
    if (btnCreate) btnCreate.classList.toggle('hidden', !isAdmin);
    if (btnSave) btnSave.classList.toggle('hidden', viewerNow || ! (isAdmin || hasEvent));
  }catch{}
}

function leaveEventMode(clearLS = true) {
  // 1. Hapus parameter event & date dari URL
  const u = new URL(location.href);
  u.searchParams.delete('event');
  u.searchParams.delete('date');
  history.replaceState({}, '', u);

  // 2. Reset context cloud
  try{ unsubscribeRealtimeForState?.(); }catch{}
  currentEventId = null;
  _serverVersion = 0;

  // 3. Clear localStorage kalau diminta
  if (clearLS) {
    localStorage.removeItem(STORAGE_KEY);
    store = { sessions:{}, lastTs:null };
  }

  // 4. Seed default (pemain & ronde baru)
  seedDefaultIfEmpty();
  renderPlayersList?.();
  renderAll?.();
  validateNames?.();
  setAppTitle('Mix Americano');   // judul default
  startAutoSave();
  // default back to editor when leaving cloud
  setAccessRole('editor');
  // hide Share/Undang & Keluar when no event
  try{ updateEventActionButtons?.(); }catch{}
  try{ refreshJoinUI?.(); }catch{}
}



function setAppTitle(title) {
  const h = byId('appTitle');
  if (h && title) h.textContent = title;
  if (title) document.title = title + ' – Mix Americano';
  try{ ensureTitleEditor(); }catch{}
}

// Ensure document.title uses clean separator regardless of prior encoding
try {
  if (typeof setAppTitle === 'function') {
    const __origSetTitle = setAppTitle;
    setAppTitle = function(title){
      __origSetTitle(title);
      if (title) document.title = title + ' – Mix Americano';
    };
  }
} catch {}

// ======== Title Rename (Editor only) ========
function ensureTitleEditor(){
  const h = byId('appTitle');
  if (!h) return;
  let wrap = byId('titleEditWrap');
  if (!wrap){
    wrap = document.createElement('span');
    wrap.id = 'titleEditWrap';
    wrap.className = 'inline-flex items-center gap-1 ml-2 align-middle';
    const btn = document.createElement('button');
    btn.id = 'btnTitleEdit';
    btn.title = 'Rename Event';
    btn.className = 'px-1.5 py-0.5 text-xs rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700';
    btn.textContent = '✎';
    btn.addEventListener('click', startTitleEdit);
    h.after(wrap);
    wrap.appendChild(btn);
  }
}

function startTitleEdit(){
  if (isViewer && isViewer()) return;
  if (!currentEventId || !isCloudMode()) return;
  const h = byId('appTitle');
  const wrap = byId('titleEditWrap');
  if (!h || !wrap) return;
  // If already editing, focus the existing input
  const existed = byId('titleEditForm');
  if (existed){ const inp = existed.querySelector('input'); try{ inp?.focus(); inp?.select(); }catch{} return; }
  const orig = (h.textContent || '').trim();
  h.classList.add('hidden');
  wrap.classList.add('hidden');
  const edit = document.createElement('span');
  edit.id = 'titleEditForm';
  edit.className = 'inline-flex items-center gap-1 ml-2 align-middle';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = orig;
  // responsive width: cukup nyaman di mobile/desktop
  input.className = 'border rounded px-2 py-1 text-sm bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-400 w-[60vw] max-w-[18rem] sm:max-w-[20rem]';
  input.placeholder = 'Nama event';
  const btnOk = document.createElement('button');
  btnOk.title = 'Simpan';
  btnOk.className = 'px-2 py-1 text-xs rounded bg-emerald-600 text-white';
  btnOk.textContent = '✓';
  const btnCancel = document.createElement('button');
  btnCancel.title = 'Batal';
  btnCancel.className = 'px-2 py-1 text-xs rounded border dark:border-gray-600';
  btnCancel.textContent = '✕';
  edit.append(input, btnOk, btnCancel);
  wrap.after(edit);

  const cleanup = () => { edit.remove(); h.classList.remove('hidden'); wrap.classList.remove('hidden'); };
  btnCancel.addEventListener('click', cleanup);
  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') btnOk.click();
    if (e.key === 'Escape') btnCancel.click();
  });
  btnOk.addEventListener('click', async ()=>{
    const val = (input.value||'').trim();
    if (!val){ showToast?.('Nama event tidak boleh kosong','warn'); return; }
    try{
      showLoading('Menyimpan nama event…');
      const { data, error } = await sb.from('events').update({ title: val }).eq('id', currentEventId).select('id').maybeSingle();
      if (error) throw error;
      setAppTitle(val);
      showToast?.('Nama event disimpan','success');
    }catch(e){ console.error(e); showToast?.('Gagal menyimpan: ' + (e?.message||''), 'error'); }
    finally{ hideLoading(); cleanup(); }
  });
  try{ input.focus(); input.select(); }catch{}
}

// ======== Auth Redirect Helper (GitHub Pages base) ========
// Paksa magic link selalu redirect ke GitHub Pages (bukan localhost)
const APP_BASE_URL = 'https://ferky36.github.io/scoremate';
function getAuthRedirectURL(){
  return APP_BASE_URL + (location.search || '');
}

// ========== Auth helpers ==========
async function handleAuthRedirect(){
  try{
    showLoading('Memproses login…');
    const hash = location.hash || '';
    const hasCode = /[?#&](code|access_token)=/.test(location.href) || hash.includes('type=recovery');
    if (hasCode && sb?.auth?.exchangeCodeForSession) {
      await sb.auth.exchangeCodeForSession(window.location.href);
      history.replaceState({}, '', location.pathname + location.search);
    }
  }catch(e){ console.warn('auth redirect handling failed', e); }
  finally { hideLoading(); }
}

async function getCurrentUser(){
  try{ const { data } = await sb.auth.getUser(); return data?.user || null; }catch{ return null; }
}

async function updateAuthUI(){
  const user = await getCurrentUser();
  const loginBtn = byId('btnLogin'); const logoutBtn = byId('btnLogout'); const info = byId('authInfo'); const email = byId('authUserEmail');
  if (user){
    loginBtn?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');
    info?.classList.remove('hidden');
    if (email) email.textContent = user.email || user.id;
  } else {
    loginBtn?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');
    info?.classList.add('hidden');
  }
}

function ensureAuthButtons(){
  const bar = byId('hdrControls'); if (!bar) return;
  if (!byId('authInfo')){
    const span = document.createElement('span'); span.id='authInfo'; span.className='text-xs px-2 py-1 bg-white/10 rounded hidden';
    const se = document.createElement('span'); se.id='authUserEmail'; span.innerHTML = 'Signed in: ';
    span.appendChild(se);
    bar.appendChild(span);
  }
  if (!byId('btnLogin')){
    const b = document.createElement('button'); b.id='btnLogin'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90'; b.textContent='Login';
    bar.appendChild(b);
    b.addEventListener('click', ()=>{
      const m = byId('loginModal'); if (!m) return; m.classList.remove('hidden');
      try{ sb.auth.getUser().then(({data})=>{ if (data?.user?.email) byId('loginEmail').value = data.user.email; }); }catch{}
    });
  }
  if (!byId('btnLogout')){
    const b = document.createElement('button'); b.id='btnLogout'; b.className='px-3 py-2 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-90 hidden'; b.textContent='Logout';
    bar.appendChild(b);
    b.addEventListener('click', async ()=>{ try{ await sb.auth.signOut(); }catch{} location.reload(); });
  }
}

// ===== Join Event (Viewer self-join) =====
function ensureJoinControls(){
  const bar = byId('hdrControls'); if (!bar) return;
  if (!byId('btnJoinEvent')){
    const j = document.createElement('button');
    j.id='btnJoinEvent';
    j.className='px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:opacity-90 hidden';
    j.textContent='Join Event';
    j.addEventListener('click', openJoinFlow);
    bar.appendChild(j);
  }
  if (!byId('joinStatus')){
    const wrap = document.createElement('span');
    wrap.id='joinStatus';
    wrap.className='flex items-center gap-2 text-sm hidden';
    const label = document.createElement('span');
    label.textContent = 'Sudah Join sebagai';
    const name = document.createElement('span'); name.id='joinedPlayerName'; name.className='font-semibold';
    const leave = document.createElement('button');
    leave.id='btnLeaveSelf';
    leave.className='px-2 py-1 rounded-lg border dark:border-gray-700';
    leave.textContent='Leave';
    leave.addEventListener('click', async ()=>{
      if (!currentEventId) return;
      if (!confirm('Keluar dari event (hapus nama Anda dari daftar pemain)?')) return;
      try{
        showLoading('Leaving…');
        const res = await requestLeaveEventRPC();
        if (res && res.promoted) {
          try{ showToast('Slot Anda digantikan oleh '+ res.promoted, 'info'); }catch{}
        }
        await loadStateFromCloud();
        renderPlayersList?.(); renderAll?.();
      }catch(e){ alert('Gagal leave: ' + (e?.message||'')); }
      finally{ hideLoading(); refreshJoinUI(); }
    });
    wrap.appendChild(label); wrap.appendChild(name); wrap.appendChild(leave);
    bar.appendChild(wrap);
  }
}

async function openJoinFlow(){
  if (!currentEventId){ alert('Buka event terlebih dahulu.'); return; }
  try{
    const { data } = await sb.auth.getUser();
    const user = data?.user || null;
    if (!user){ byId('loginModal')?.classList.remove('hidden'); return; }
  }catch{}
  openJoinModal();
}

function ensureJoinModal(){
  if (byId('joinModal')) return;
  const div = document.createElement('div');
  div.id='joinModal';
  div.className='fixed inset-0 z-50 hidden';
  div.innerHTML = `
    <div class="absolute inset-0 bg-black/40" id="joinBackdrop"></div>
    <div class="relative mx-auto mt-16 w-[92%] max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow p-4 md:p-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">Join Event</h3>
        <button id="joinCancelBtn" class="px-3 py-1 rounded-lg border dark:border-gray-700">Tutup</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Nama</label>
          <input id="joinNameInput" type="text" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Gender</label>
            <select id="joinGenderSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              <option value="">-</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Level</label>
            <select id="joinLevelSelect" class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              <option value="">-</option>
              <option value="beg">beg</option>
              <option value="pro">pro</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button id="joinSubmitBtn" class="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold">Join</button>
        </div>
        <div id="joinMsg" class="text-xs"></div>
      </div>
    </div>`;
  document.body.appendChild(div);
  byId('joinBackdrop').addEventListener('click', ()=> byId('joinModal').classList.add('hidden'));
  byId('joinCancelBtn').addEventListener('click', ()=> byId('joinModal').classList.add('hidden'));
  byId('joinSubmitBtn').addEventListener('click', submitJoinForm);
}

async function openJoinModal(){
  ensureJoinModal();
  const m = byId('joinModal'); if (!m) return;
  // Prefill values
  let suggestedName = '';
  let g = '', lv = '';
  try{
    const { data } = await sb.auth.getUser();
    const u = data?.user || null;
    const uid = u?.id || '';
    const found = findJoinedPlayerByUid(uid);
    if (found){ suggestedName = found.name; g = playerMeta[found.name]?.gender||''; lv = playerMeta[found.name]?.level||''; }
    if (!suggestedName){
      const fullName = u?.user_metadata?.full_name || '';
      const email = u?.email || '';
      suggestedName = fullName || (email ? email.split('@')[0] : '');
    }
  }catch{}
  byId('joinNameInput').value = suggestedName || '';
  byId('joinGenderSelect').value = g || '';
  byId('joinLevelSelect').value = lv || '';
  const msg = byId('joinMsg'); if (msg){ msg.textContent=''; msg.className='text-xs'; }
  m.classList.remove('hidden');
}

async function submitJoinForm(){
  // Gate: belum masuk waktu buka join
  if (!isJoinOpen()) {
    const msg = byId('joinMessage') || byId('joinError');
    const t = window.joinOpenAt
      ? `Belum bisa join. Pendaftaran dibuka pada ${toLocalDateValue(window.joinOpenAt)} ${toLocalTimeValue(window.joinOpenAt)}.`
      : 'Belum bisa join. Pendaftaran belum dibuka.';
    if (msg) { msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400'; }
    try{ showToast?.(t, 'info'); }catch{}
    return;
  }

  const name = (byId('joinNameInput').value||'').trim();
  const gender = byId('joinGenderSelect').value||'';
  const level = byId('joinLevelSelect').value||'';
  const msg = byId('joinMsg');
  if (!currentEventId){ msg.textContent='Tidak ada event aktif.'; return; }
  if (!name){ msg.textContent='Nama wajib diisi.'; return; }
  // disallow same name if already in waiting list or players (client-side friendly check)
  try {
    const norm = (s) => String(s || '').trim().toLowerCase();
    const n = norm(name);

    if (Array.isArray(waitingList) && waitingList.some(x => norm(x) === n)) {
      const t = 'Nama sudah ada di waiting list.'; 
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      return;
    }
    if (Array.isArray(players) && players.some(x => norm(x) === n)) {
      const t = 'Nama sudah ada di daftar pemain.';
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      return;
    }
  } catch {}
  // prevent duplicate join
  try{
    const { data } = await sb.auth.getUser();
    const uid = data?.user?.id || '';
    const found = findJoinedPlayerByUid(uid);
    if (found){ msg.textContent='Anda sudah join sebagai '+found.name; return; }
  }catch{}
  try{
    showLoading('Joining…');
    const res = await requestJoinEventRPC({ name, gender, level });
    const status = (res && res.status) || '';
    const joinedName = res?.name || name;
    if (status === 'joined') {
      showToast('Berhasil join sebagai '+ joinedName, 'success');
      const ok = await loadStateFromCloud();
      if (!ok) showToast('Berhasil join, tapi gagal memuat data terbaru.', 'warn');
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      byId('joinModal')?.classList.add('hidden');
    } else if (status === 'already') {
      const nm = res?.name || name;
      const t = 'Anda sudah terdaftar sebagai '+ nm;
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
    } else if (status === 'waitlisted' || status === 'full') {
      const t = 'List sudah penuh, Anda masuk ke waiting list';
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
      const ok = await loadStateFromCloud();
      if (!ok) showToast('Berhasil masuk waiting list, tapi gagal memuat data.', 'warn');
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      byId('joinModal')?.classList.add('hidden');
    } else if (status === 'closed') {
      const t = 'Pendaftaran ditutup. Hanya member yang bisa join.';
      msg.textContent = t; msg.className = 'text-xs text-amber-600 dark:text-amber-400';
      showToast(t, 'warn');
    } else if (status === 'unauthorized') {
      const t = 'Silakan login terlebih dahulu.';
      msg.textContent = t; msg.className = 'text-xs text-red-600 dark:text-red-400';
      showToast(t, 'error');
    } else if (status === 'not_found') {
      const t = 'Event tidak ditemukan.';
      msg.textContent = t; msg.className = 'text-xs text-red-600 dark:text-red-400';
      showToast(t, 'error');
    } else {
      const t = 'Gagal join. Silakan coba lagi.';
      msg.textContent = t; msg.className = 'text-xs text-red-600 dark:text-red-400';
      showToast(t, 'error');
    }
  }catch(e){
    console.error(e);
    const t = 'Gagal join: ' + (e?.message || '');
    msg.textContent = t;
    msg.className = 'text-xs text-red-600 dark:text-red-400';
    showToast(t, 'error');
  } finally { hideLoading(); refreshJoinUI(); }
}

function findJoinedPlayerByUid(uid){
  if (!uid) return null;
  try{
    const names = ([]).concat(players||[], waitingList||[]);
    for (const n of names){
      const meta = playerMeta?.[n] || {};
      if (meta.uid && meta.uid === uid) return { name: n, meta };
    }
  }catch{}
  return null;
}

async function requestJoinEventRPC({ name, gender, level }){
  const d = byId('sessionDate')?.value || currentSessionDate || new Date().toISOString().slice(0,10);
  const { data, error } = await sb.rpc('request_join_event', {
    p_event_id: currentEventId,
    p_session_date: d,
    p_name: name,
    p_gender: gender || null,
    p_level: level || null
  });
  if (error) throw error;
  return data;
}

async function requestLeaveEventRPC(){
  const d = byId('sessionDate')?.value || currentSessionDate || new Date().toISOString().slice(0,10);
  const { data, error } = await sb.rpc('request_leave_event', {
    p_event_id: currentEventId,
    p_session_date: d
  });
  if (error) throw error;
  return data;
}

// ============== Toast helper ==============
function showToast(message, type='info'){
  try{
    let host = byId('toastHost');
    if (!host){
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'fixed inset-x-0 top-3 z-[60] flex justify-center pointer-events-none';
      document.body.appendChild(host);
    }
    const box = document.createElement('div');
    const base = 'pointer-events-auto max-w-md mx-2 px-3 py-2 rounded-lg shadow text-sm';
    const kind = type==='success' ? 'bg-emerald-600 text-white' : type==='error' ? 'bg-red-600 text-white' : type==='warn' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white';
    box.className = base + ' ' + kind;
    box.textContent = String(message||'');
    host.appendChild(box);
    setTimeout(()=>{ box.style.opacity='0'; box.style.transition='opacity .3s'; }, 2200);
    setTimeout(()=>{ box.remove(); }, 2600);
  }catch{}
}

async function refreshJoinUI(){
  try{
    const hasEvent = !!currentEventId;
    const joinBtn = byId('btnJoinEvent');
    const statusWrap = byId('joinStatus');
    const nameEl = byId('joinedPlayerName');
    if (!hasEvent || !isViewer()){
      joinBtn && joinBtn.classList.add('hidden');
      statusWrap && statusWrap.classList.add('hidden');
      return;
    }
    let user=null; try{ const { data } = await sb.auth.getUser(); user = data?.user || null; }catch{}
    if (!user){
      if (joinBtn) { joinBtn.classList.remove('hidden'); joinBtn.disabled=false; }
      statusWrap && statusWrap.classList.add('hidden');
      return;
    }
    const found = findJoinedPlayerByUid(user.id);
    if (found){
      if (nameEl) nameEl.textContent = found.name;
      statusWrap && statusWrap.classList.remove('hidden');
      joinBtn && joinBtn.classList.add('hidden');
    } else {
      statusWrap && statusWrap.classList.add('hidden');
      joinBtn && joinBtn.classList.remove('hidden');
    }
  }catch{}
  // UNTUK BONUS: disable tombol Join jika belum waktunya buka pendaftaran
  // try{
  //   const joinBtn = byId('btnJoinEvent') || byId('joinSubmitBtn');
  //   const nameInp = byId('joinNameInput');
  //   const open = isJoinOpen();
  //   if (joinBtn) {
  //     joinBtn.disabled = !open;
  //     joinBtn.title = (!open && window.joinOpenAt)
  //       ? ('Pendaftaran dibuka: '+toLocalDateValue(window.joinOpenAt)+' '+toLocalTimeValue(window.joinOpenAt))
  //       : '';
  //   }
  //   if (nameInp) nameInp.disabled = !open;
  // } catch {}

}
// Fetch role from Supabase based on current user and event membership
async function loadAccessRoleFromCloud(){
  try{
    showLoading('Memuat akses…');
    if (!isCloudMode() || !window.sb?.auth || !currentEventId) { setAccessRole('editor'); return; }
    const { data: userData } = await sb.auth.getUser();
    const uid = userData?.user?.id || null;
    if (!uid){ setAccessRole('viewer'); return; }

    // 1) event owner shortcut (optional)
    try{
      const { data: ev } = await sb.from('events').select('owner_id').eq('id', currentEventId).maybeSingle();
      _isOwnerUser = !!(ev?.owner_id && ev.owner_id === uid);
      if (_isOwnerUser) { setAccessRole('editor'); return; }
    }catch{}

    // 2) membership check
    const { data: mem } = await sb
      .from('event_members')
      .select('role')
      .eq('event_id', currentEventId)
      .eq('user_id', uid)
      .maybeSingle();
    const role = (mem?.role === 'editor') ? 'editor' : 'viewer';
    setAccessRole(role);
    // Load event settings (max_players, location) once role known
    try{ ensureMaxPlayersField(); await loadMaxPlayersFromDB(); }catch{}
    try{ ensureLocationFields(); await loadLocationFromDB(); }catch{}
    try{ ensureJoinOpenFields();  await loadJoinOpenFromDB(); }catch{}
    try{ getPaidChannel(); }catch{}
  }catch{ setAccessRole('viewer'); }
  finally { hideLoading(); }
}

async function fetchEventTitleFromDB(eventId){
  try{
    showLoading('Memuat judul event…');
    const { data, error } = await sb
      .from('events')
      .select('title')
      .eq('id', eventId)
      .maybeSingle(); // jangan pakai .single() agar tidak PGRST116 ketika 0 row (bukan owner/member)
    if (error) return null;      
    return data?.title || null;
  }catch{ return null; }
  finally { hideLoading(); }
}





// Load state (JSONB) sekali saat buka/refresh
async function loadStateFromCloud() {
  showLoading('Memuat data dari Cloud…');
  const { data, error } = await sb.from('event_states')
    .select('state, version, updated_at')
    .eq('event_id', currentEventId)
    .eq('session_date', currentSessionDate)
    .maybeSingle();

  if (error) { console.error(error); hideLoading(); return false; }

  if (data && data.state) {
    console.log('Loaded state from Cloud, version', data);
    _serverVersion = data.version || 0;
    applyPayload(data.state);               // ← fungsi kamu yg sudah ada
    // kalau belum sempat set judul dari DB, pakai yang di payload
    if (data.state.eventTitle) setAppTitle(data.state.eventTitle);
    markSaved?.(data.updated_at);
    try{ refreshJoinUI?.(); }catch{}
    hideLoading();
    return true;
  }
  hideLoading();
  return false;
}

// Save (upsert) dengan optimistic concurrency
async function saveStateToCloud() {
  try {
    const payload = currentPayload();       // ← fungsi kamu yg sudah ada
    // Gunakan waitingList lokal apa adanya (lokal otoritatif).
    const { data, error } = await sb.from('event_states')
      .upsert({
        event_id: currentEventId,                 // UUID
        session_date: currentSessionDate,         // 'YYYY-MM-DD'
        state: payload,                            // JSONB
        version: (_serverVersion || 0) + 1
      }, { onConflict: 'event_id,session_date' })
      .select('version, updated_at')
      .single();

    if (error) throw error;
    // Sinkronkan kolom events.max_players saat Save (bukan onchange)
    try {
      if (isCloudMode() && window.sb?.from && currentEventId) {
        const mp = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : null;
        await sb.from('events').update({ max_players: mp }).eq('id', currentEventId);
      }
    } catch {}
    
    _serverVersion = data.version;
    markSaved?.(data.updated_at);
    return true;
  } catch (e) {
    console.error(e);
    const msg = String(e?.message||'');
    if (msg.includes('event_states_event_id_fkey') || msg.includes('Key is not present in table "events"') || e?.code==='23503'){
      showToast?.('Event tidak ditemukan / sudah dihapus. Keluar dari mode event.', 'error');
      try{ leaveEventMode?.(true); }catch{}
      try{ openSearchEventModal?.(); }catch{}
      return false;
    }
    alert('Gagal menyimpan ke Cloud. Coba lagi.');
    return false;
  }
}

// Realtime subscribe untuk row event+date aktif
function subscribeRealtimeForState(){
  if (!isCloudMode()) return;
  // Pastikan kanal lama dibersihkan agar tidak dobel callback
  try{ if (_stateRealtimeChannel){ _stateRealtimeChannel.unsubscribe?.(); try{ sb.removeChannel?.(_stateRealtimeChannel); }catch{} _stateRealtimeChannel=null; } }catch{}

  _stateRealtimeChannel = sb.channel(`es:${currentEventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_states',
      filter: `event_id=eq.${currentEventId}`
    }, (payload) => {
      const row = payload.new || payload.old || {};
      // Be robust: row.session_date may be undefined or a Date-like value
      const raw = (row && (row.session_date ?? row.sessionDate)) ?? null;
      if (raw) {
        let key = '';
        try {
          if (typeof raw === 'string') {
            // normalize 'YYYY-MM-DD' or full ISO; keep only date part
            key = normalizeDateKey(raw.slice(0, 10));
          } else {
            const dt = new Date(raw);
            key = isNaN(dt.getTime()) ? String(raw).slice(0, 10) : dt.toISOString().slice(0, 10);
          }
        } catch { key = String(raw).slice(0, 10); }
        if (key && key !== currentSessionDate) return;
      }

      // Snapshot sebelum reload untuk mendeteksi auto-promote dari server
      const prevPlayers = (Array.isArray(players) ? players.slice() : []);
      const prevWaiting = (Array.isArray(waitingList) ? waitingList.slice() : []);

      (async () => {
        try{
          // Guard ringan: jika perubahan hanya skor/startedAt/finishedAt 1 match, terapkan delta tanpa full reload
          try{
            if (payload?.new?.state){
              const applied = applyMinorRoundDelta(payload.new.state);
              if (applied) return; // cukup update ringan
            }
          }catch{}
          // Guard untuk perubahan list pemain saja (tanpa full reload)
          try{
            if (payload?.new?.state){
              const applied2 = applyMinorPlayersDelta(payload.new.state);
              if (applied2) return;
            }
          }catch{}

          const ok = await loadStateFromCloudSilent();
          if (!ok) return;
          // Deteksi hanya untuk editor (viewer tidak perlu notifikasi ini)
          if (isViewer && isViewer()) return;
          const norm = s => String(s||'').trim().toLowerCase();
          const nowPlayers = Array.isArray(players) ? players : [];
          const nowWaiting = Array.isArray(waitingList) ? waitingList : [];
          const added = nowPlayers.filter(p => !prevPlayers.some(x => norm(x) === norm(p)));
          const removedPlayers = prevPlayers.filter(p => !nowPlayers.some(x => norm(x) === norm(p)));
          const waitingDelta = (prevWaiting.length - nowWaiting.length); // >0 means waiting reduced
          const playersDelta = (nowPlayers.length - prevPlayers.length);

          // Kandidat paling mungkin yang dipromosikan: nama yang hilang dari waiting list
          const removedFromWaiting = prevWaiting.filter(n => !nowWaiting.some(x => norm(x) === norm(n)));
          const candidate = removedFromWaiting.length > 0 ? removedFromWaiting[0] : (added[0] || null);

          // Heuristik auto-promote (lebih longgar dan deterministik):
          // - waiting berkurang (>=1) DAN
          //   (ada 1 nama baru di players ATAU ada 1 nama keluar dari players → netral (leave+promote))
          if (waitingDelta >= 1 && (added.length >= 1 || removedPlayers.length >= 1)) {
            const promotedName = candidate || added[0];
            if (promotedName) {
              try{ showToast(`Auto-promote: ${promotedName} masuk dari waiting list`, 'info'); }catch{}
              try{ highlightPlayer(promotedName); }catch{}
            } else {
              try{ showToast('Auto-promote: 1 pemain masuk dari waiting list', 'info'); }catch{}
            }
          }
        }catch(e){ /* noop */ }
      })();
    })
    .subscribe();
}

// Versi tanpa overlay/loading untuk panggilan realtime agar tidak "flash" satu halaman
async function loadStateFromCloudSilent() {
  const { data, error } = await sb.from('event_states')
    .select('state, version, updated_at')
    .eq('event_id', currentEventId)
    .eq('session_date', currentSessionDate)
    .maybeSingle();
  if (error) { console.error(error); return false; }
  if (data && data.state) {
    _serverVersion = data.version || 0;
    applyPayload(data.state);
    if (data.state.eventTitle) setAppTitle(data.state.eventTitle);
    markSaved?.(data.updated_at);
    try{ refreshJoinUI?.(); }catch{}
    return true;
  }
  return false;
}

function unsubscribeRealtimeForState(){
  try{
    if (_stateRealtimeChannel){
      _stateRealtimeChannel.unsubscribe?.();
      try{ sb.removeChannel?.(_stateRealtimeChannel); }catch{}
      _stateRealtimeChannel = null;
    }
  }catch{}
}

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


// === SAVE (silent) untuk autosave/aksi internal ===
function saveToStoreSilent() {
  const d = byId("sessionDate").value || "";
  if (!d) return false; // skip tanpa alert
  store.sessions[d] = currentPayload();
  store.lastTs = new Date().toISOString();
  markSaved(store.lastTs);
  return true;
}
function randomSlug(len = 6){
  const s = Math.random().toString(36).slice(2, 2+len);
  return 'EV' + s.toUpperCase();             // contoh: EV3F9QK
}

function buildEventUrl(eventId, dateStr){
  // Bangun URL dari APP_BASE_URL agar bersih dari param lain (owner, view, role, invite)
  const base = (typeof APP_BASE_URL === 'string' && APP_BASE_URL) ? APP_BASE_URL : (location.origin + location.pathname);
  const u = new URL(base);
  u.searchParams.set('event', eventId);
  if (dateStr) u.searchParams.set('date', dateStr);
  return u.toString();
}

function buildViewerUrl(eventId, dateStr){
  // Viewer dengan aturan khusus (view=1) untuk hitung skor saja
  const u = new URL(buildEventUrl(eventId, dateStr));
  u.searchParams.set('view', '1');
  return u.toString();
}

function buildPublicViewerUrl(eventId, dateStr){
  // Link viewer standar tanpa parameter owner/view/role/invite
  // Hanya event dan date agar clean
  return buildEventUrl(eventId, dateStr);
}

function buildInviteUrl(eventId, dateStr, token){
  const u = new URL(buildEventUrl(eventId, dateStr));
  if (token) u.searchParams.set('invite', token);
  return u.toString();
}

function randomToken(len = 24){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for(let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

async function copyToClipboard(text){
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e){
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}








// ================== State ================== //
let activeCourt = 0;                      // index lapangan aktif
let roundsByCourt = [ [] ];               // array of courts, masing2 array rounds
let players = [];
let currentMaxPlayers = null; // null = unlimited; otherwise positive integer
let dirty=false, autosaveTimer=null;
let store = { sessions:{}, lastTs:null };
const THEME_KEY='mix-americano-theme';
let playerMeta = {}; // { "Nama": { gender:"M"|"F"|"", level:"beg"|"pro"|"" }, ... }
const SCORE_MAXLEN = 2; // ubah ke 3 kalau perlu
let scoreCtx = {
  court: 0,
  round: 0,
  a: 0,
  b: 0,
  timerId: null,      // ⬅️ baru
  remainMs: 0,        // ⬅️ baru (millisecond)
  running: false      // ⬅️ baru
};

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



// ================== Access Control ================== //
// role: 'editor' (full access) | 'viewer' (read-only)
let accessRole = 'editor';
// flag owner event (true jika user saat ini adalah owner dari event aktif)
let _isOwnerUser = false;
// waiting list container (shared) – ensure single shared array reference
if (!Array.isArray(window.waitingList)) window.waitingList = [];
var waitingList = window.waitingList;
function isViewer(){ return accessRole !== 'editor'; }
function isScoreOnlyMode(){ return !!window._viewerScoreOnly; }
function canEditScore(){ return !isViewer() || isScoreOnlyMode(); }
function isOwnerNow(){
  try{
    const p = (typeof getUrlParams === 'function') ? getUrlParams() : {};
    if (String(p.owner||'').toLowerCase() === 'yes') return true;
  }catch{}
  return !!window._isOwnerUser;
}
function setAccessRole(role){ accessRole = (role === 'viewer') ? 'viewer' : 'editor'; applyAccessMode(); renderAll?.(); renderPlayersList?.(); renderViewerPlayersList?.(); }
function applyAccessMode(){
  document.documentElement.setAttribute('data-readonly', String(isViewer()));
  const disableIds = ['btnAddCourt','btnMakeEventLink','btnShareEvent','btnApplyPlayersActive','btnResetActive','btnClearScoresActive','btnClearScoresAll'];
  disableIds.forEach(id=>{ const el = byId(id); if (el) el.disabled = isViewer(); });

  // Kontrol skor: boleh aktif jika editor ATAU viewer score-only
  const scoreIds = ['btnStartTimer','btnFinishScore','btnResetScore','btnAPlus','btnAMinus','btnBPlus','btnBMinus'];
  scoreIds.forEach(id=>{ const el = byId(id); if (el) el.disabled = !canEditScore(); });

  // Hide edit-centric UI in viewer mode
  // 1) Non-score editor UI: selalu disembunyikan untuk viewer (termasuk view=1)
  const hideGeneralIds = [
    'playersPanel',           // panel daftar pemain
    'btnCollapsePlayers',     // tombol collapsible pemain
    'btnPasteText',           // tools pemain
    'btnApplyPlayerTemplate', // tools pemain
    'btnClearPlayers',        // tools pemain
    'btnAddPlayer',           // tambah pemain
    'btnSave',                // tombol save lokal
    'btnMakeEventLink',       // buat link event
    'btnShareEvent',          // share & undang
    'btnLeaveEvent',          // keluar event
    'btnFilterToggle',        // toggle filter
    'filterPanel',            // panel filter input tanggal/waktu/durasi
    'globalInfo',             // ringkasan global pemain/match
    'btnApplyPlayersActive',
    'pairMode',
    'btnResetActive',
    'btnClearScoresActive',
    'btnClearScoresAll'
  ];
  hideGeneralIds.forEach(id=>{ const el = byId(id); if (el) el.classList.toggle('hidden', isViewer()); });

  // 2) Score controls container: sembunyikan untuk viewer biasa, TAPI tampilkan untuk view=1
  const hideScoreIds = [ 'scoreControlsLeft', 'btnFinishScore', 'btnRecalc', 'scoreButtonsA', 'scoreButtonsB' ];
  hideScoreIds.forEach(id=>{ const el = byId(id); if (el) el.classList.toggle('hidden', isViewer() && !isScoreOnlyMode()); });

  // 3) Khusus tombol Recalc di modal: hanya pemilik event yang boleh melihat
  try{ const rbtn = byId('btnRecalc'); if (rbtn) rbtn.classList.toggle('hidden', !isOwnerNow()); }catch{}

  // courts toolbar: hide add-court button if exists
  const addBtn = byId('btnAddCourt'); if (addBtn) addBtn.classList.toggle('hidden', isViewer());

  // fairness info box (if present): hide in viewer
  // const fair = byId('fairnessInfo'); if (fair) fair.classList.toggle('hidden', isViewer());

  // Filter summary labels in viewer mode
  try {
    if (isViewer()) renderFilterSummary();
    const sum = byId('filterSummary');
    if (sum) sum.classList.toggle('hidden', !isViewer());
  } catch {}

  // Viewer-only players panel visibility and render
  try {
    if (typeof ensureViewerPlayersPanel === 'function') ensureViewerPlayersPanel();
    const vp = byId('viewerPlayersWrap');
    if (vp) vp.classList.toggle('hidden', !isViewer());
    if (isViewer() && typeof renderViewerPlayersList === 'function') renderViewerPlayersList();
  } catch {}

  // Toggle editor-only Max Players field
  try {
    ensureMaxPlayersField();
    const maxEl = byId('maxPlayersInput');
    if (maxEl) maxEl.toggleAttribute('disabled', isViewer());
    const wrap = byId('maxPlayersWrap');
    if (wrap) wrap.classList.toggle('hidden', isViewer());
  } catch {}

  // Toggle editor-only Location fields
  try {
    ensureLocationFields();
    const lt = byId('locationTextInput');
    const lu = byId('locationUrlInput');
    if (lt) lt.toggleAttribute('disabled', isViewer());
    if (lu) lu.toggleAttribute('disabled', isViewer());
    const lw = byId('locationWrap');
    if (lw) lw.classList.toggle('hidden', isViewer());
  } catch {}

  // Auth UI
  updateAuthUI?.();
  // Refresh Join/Leave controls visibility when role changes
  try{ refreshJoinUI?.(); }catch{}

  // Title editor (rename) visibility: only in cloud mode, only for editor
  try {
    ensureTitleEditor();
    const wrap = byId('titleEditWrap');
    if (wrap) wrap.classList.toggle('hidden', isViewer() || !currentEventId || !isCloudMode());
  } catch {}

  // Move editor players panel out of filter grid into its own section
  try {
    if (!isViewer()) relocateEditorPlayersPanel();
    const host = document.getElementById('editorPlayersSection');
    if (host) host.classList.toggle('hidden', isViewer());
  } catch {}
}


function onlyDigits(str){ return String(str||'').replace(/[^\d]/g,''); }
function allowKey(e){
  // izinkan kontrol umum
  if (['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'].includes(e.key)) return true;
  // izinkan Cmd/Ctrl + (A/C/V/X/Z/Y)
  if ((e.ctrlKey||e.metaKey) && /^[acvxyz]$/i.test(e.key)) return true;
  // izinkan angka 0-9
  if (/^\d$/.test(e.key)) return true;
  return false;
}

// ================== Theme ================== //
// Ikon sun & moon (SVG) + updater tombol
function __themeSunSVG(){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.657-6.343 1.414-1.414M4.929 19.071l1.414-1.414m0-11.314L4.93 4.93m14.142 14.142-1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>';
}
function __themeMoonSVG(){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
}
function updateThemeToggleIcon(){
  const btn = byId('btnTheme'); if (!btn) return;
  const isDark = document.documentElement.classList.contains('dark');
  btn.innerHTML = isDark ? __themeMoonSVG() : __themeSunSVG();
  const label = isDark ? 'Dark mode' : 'Light mode';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
}

function applyThemeFromStorage() {
  const t = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.classList.toggle("dark", t === "dark"); try{ updateThemeToggleIcon(); }catch{}
}
function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); try{ updateThemeToggleIcon(); }catch{}
}

// ================== Sessions ================== //
// removed: populateDatePicker (deprecated)
function currentPayload(){
  return {
    date: byId('sessionDate').value || '',
    startTime: byId('startTime').value,
    minutesPerRound: byId('minutesPerRound').value,
    roundCount: byId('roundCount').value,
    players: players.join('\n'),
    waitingList: (Array.isArray(waitingList) ? waitingList : []).join('\n'),
    playerMeta,             // <<< tambahkan ini
    // simpan limit pemain dalam state juga (null = tak terbatas)
    maxPlayers: (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : null,

    // 🔹 format baru
    roundsByCourt,

    // 🔹 kompat: tetap tulis 2 lapangan pertama agar JSON lama tetap kebaca
    rounds1: roundsByCourt[0] || [],
    rounds2: roundsByCourt[1] || [],
    breakPerRound: byId('breakPerRound').value,
    showBreakRows: !!byId('showBreakRows').checked,
    eventTitle: byId('appTitle')?.textContent || 'Mix Americano',

    ts: new Date().toISOString()
  };
}


// Build a read-only summary of filter/schedule for viewer mode
function renderFilterSummary(){
  const panel = byId('filterPanel');
  if (!panel) return;
  // ensure container exists (after filterPanel)
  let box = byId('filterSummary');
  if (!box){
    box = document.createElement('div');
    box.id = 'filterSummary';
    box.className = 'max-w-7xl mx-auto px-4 pb-4';
    panel.parentNode.insertBefore(box, panel.nextSibling);
  }

  // Ensure panel and summary are mutually exclusive to avoid flicker
  const viewerMode = (typeof isViewer === 'function') ? isViewer() : false;
  panel.classList.toggle('hidden', viewerMode);
  box.classList.toggle('hidden', !viewerMode);
  box.setAttribute('aria-hidden', viewerMode ? 'false' : 'true');
  if (!viewerMode){ box.innerHTML = ''; return; }

  const date = byId('sessionDate')?.value || '';
  const t = byId('startTime')?.value || '';
  const m = byId('minutesPerRound')?.value || '';
  const br = byId('breakPerRound')?.value || '0';
  const showBr = !!byId('showBreakRows')?.checked;
  const r = byId('roundCount')?.value || '';

  function fmtDateLabel(iso){
    if (!iso) return '-';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return `${m[3]} / ${m[2]} / ${m[1]}`;
  }

  box.innerHTML = `
    <div class="px-0">
      <button id="filterSummaryToggle" class="w-full md:w-auto px-3 py-2 rounded-xl bg-white/20 dark:bg-gray-700
            text-gray-900 dark:text-white font-semibold shadow hover:bg-white/30 flex items-center gap-2">
        <span id="filterSummaryChevron">▲</span>
        <span>Jadwal</span>
      </button>
      <div id="filterSummaryBody" class="mt-3">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Tanggal</div>
            <div class="mt-1 font-medium">${fmtDateLabel(date)}</div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Mulai</div>
            <div class="mt-1 font-medium">${t || '-'}</div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Menit/Match</div>
            <div class="mt-1 font-medium">${m || '-'}</div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Jeda/Match (menit)</div>
            <div class="mt-1 font-medium">${br} &nbsp; <span class="text-xs text-gray-500">${showBr ? '(Tampilkan baris jeda)' : ''}</span></div>
          </div>
          <div>
            <div class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Match/Lapangan</div>
            <div class="mt-1 font-medium">${r || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  // already toggled above with viewerMode guard

  // summary toggle
  try {
    const btn = byId('filterSummaryToggle');
    const chevron = byId('filterSummaryChevron');
    const body = byId('filterSummaryBody');
    if (btn && body && chevron) {
      btn.onclick = () => {
        const hidden = body.classList.toggle('hidden');
        chevron.textContent = hidden ? '▼' : '▲';
      };
    }
  } catch {}
}


let _autoSaveTimer = null;

// Wrapper util untuk menampilkan loading saat menyimpan ke Cloud
async function saveStateToCloudWithLoading(){
  showLoading('Menyimpan ke Cloud…');
  try{ return await saveStateToCloud(); }
  finally{ hideLoading(); }
}

// Autosave helper: save to cloud if enabled; else save to local storage silently
// useLoading=true will show overlay (for big changes like Apply Teks)
function maybeAutoSaveCloud(useLoading=false){
  try{
    if (isCloudMode()) {
      if (useLoading) return saveStateToCloudWithLoading();
      return saveStateToCloud(); // silent
    } else {
      return saveToStoreSilent?.();
    }
  }catch(e){ console.warn('Auto-save failed', e); }
}

function initCloudFromUrl() {
  const p = getUrlParams();           // fungsi yang sudah kamu punya
  if (p.event) {
    currentEventId = p.event;
  }
  if (p.date) {
    currentSessionDate = p.date;
    const el = byId('sessionDate');
    if (el) el.value = p.date;        // sinkron ke input tanggal
  }
  // Force viewer from link (?view=1 or role=viewer)
  _forceViewer = (String(p.view||'') === '1') || (String(p.role||'').toLowerCase() === 'viewer');
  // Mode khusus: viewer boleh hitung skor jika ?view=1
  window._viewerScoreOnly = (String(p.view||'') === '1');
  if (_forceViewer) setAccessRole('viewer');

  // Load access role if in cloud mode (skip elevation if forced viewer)
  if (currentEventId && !_forceViewer) {
    (async ()=>{ const ok = await ensureEventExistsOrReset(); if (ok) loadAccessRoleFromCloud?.(); else applyAccessMode(); })();
  } else {
    applyAccessMode();
  }
  try{ updateAdminButtonsVisibility?.(); }catch{}

  // Load event title + location for header (viewer/editor)
  if (currentEventId){
    (async ()=>{
      try{
        const meta = await fetchEventMetaFromDB(currentEventId);
        if (meta?.title) setAppTitle(meta.title);
        renderEventLocation(meta?.location_text || '', meta?.location_url || '');
        try{ ensureLocationFields(); await loadLocationFromDB(); }catch{}
        try{ renderHeaderChips(); }catch{}
      }catch{}
    })();
  }

  // Jika link undangan (invite=token) dibuka: terima undangan setelah login
  if (p.invite && currentEventId){
    (async () => {
      try{
        const { data: ud } = await sb.auth.getUser();
        const email = ud?.user?.email || null;
        if (!email) return; // user belum login

        // 1) Coba pakai RPC SECURITY DEFINER jika tersedia (lebih aman terhadap RLS)
        try{
          const { data: accData, error: accErr } = await sb.rpc('accept_event_invite', { p_token: p.invite });
          if (!accErr && accData){
            // Jika RPC mengembalikan event_id/role, sinkronkan lokal
            if (accData.event_id && !currentEventId) currentEventId = accData.event_id;
            loadAccessRoleFromCloud?.();
            return; // selesai
          }
        }catch{}

        // 2) Fallback tanpa RPC: validasi token lalu UPSERT membership (upgrade ke editor bila perlu)
        const { data: inv, error } = await sb.from('event_invites')
          .select('event_id, email, role')
          .eq('token', p.invite)
          .maybeSingle();
        if (error || !inv) return;
        if (String(inv.email).toLowerCase() !== String(email).toLowerCase()) return;

        // gunakan event_id dari undangan untuk berjaga-jaga
        const eid = inv.event_id || currentEventId;
        if (!currentEventId) currentEventId = eid;

        // UPSERT agar jika sudah ada row (viewer) akan di-upgrade ke editor
        const uid = ud.user.id;
        const up = await sb.from('event_members')
          .upsert({ event_id: eid, user_id: uid, role: inv.role }, { onConflict: 'event_id,user_id' });
        if (up?.error) { console.warn('membership upsert failed', up.error); return; }

        // tandai accepted (best effort)
        try{ await sb.from('event_invites').update({ accepted_at: new Date().toISOString() }).eq('token', p.invite); }catch{}

        // refresh akses
        loadAccessRoleFromCloud?.();
      }catch(e){ console.warn('accept-invite failed', e); }
    })();
  }
}


function markDirty() {
  dirty = true;
  byId("unsavedDot")?.classList.remove("hidden");

  // autosave debounce → benar-benar menulis ke localStorage
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(saveToLocalSilent, 600);
}
function saveToLocalSilent() {
  const raw = byId("sessionDate").value || "";
  const d = normalizeDateKey(raw);
  if (!d) return;

  const payload = currentPayload();  // <- sudah ada di kode kamu
  const all = readAllSessionsLS();
  all[d] = payload;
  all.__lastTs = new Date().toISOString();
  writeAllSessionsLS(all);
}

function markSaved(ts) {
  dirty = false;
  byId("unsavedDot")?.classList.add("hidden");
  if (ts){
    const t = new Date(ts).toLocaleTimeString().replace(/:/g, '.');
    const el = byId("lastSaved");
    if (el) el.textContent = "Saved " + t;
  }
}
function saveToStore() {
  const raw = byId("sessionDate").value || new Date().toISOString().slice(0,10);
  if (!raw) { alert("Isi tanggal dulu ya."); return false; }

  const d = normalizeDateKey(raw);
  const payload = currentPayload();

  // simpan ke objek store lama (jika kamu masih pakai)
  store.sessions[d] = payload;
  store.lastTs = new Date().toISOString();

  // simpan ke localStorage (persist)
  const all = readAllSessionsLS();
  all[d] = payload;
  all.__lastTs = store.lastTs;
  writeAllSessionsLS(all);

  markSaved(store.lastTs);
  // removed: datePicker UI update
  return true;
}

function applyPayload(payload) {
  if (!payload) return;

  // Keep previous players/waiting for diff-based handling (e.g., viewer leave + auto-promote)
  const prevPlayers = Array.isArray(players) ? players.slice() : [];
  const prevWaitingCopy = Array.isArray(window.waitingList) ? window.waitingList.slice() : [];

  // 1) Inputs dasar
  if (byId('sessionDate'))      byId('sessionDate').value      = payload.date || '';
  if (byId('startTime'))        byId('startTime').value        = payload.startTime || '19:00';
  if (byId('minutesPerRound'))  byId('minutesPerRound').value  = payload.minutesPerRound ?? 12;
  if (byId('roundCount'))       byId('roundCount').value       = payload.roundCount ?? 10;
  if (byId('breakPerRound'))    byId('breakPerRound').value    = payload.breakPerRound ?? 0;
  if (byId('showBreakRows'))    byId('showBreakRows').checked  = !!payload.showBreakRows;

  // 2) Pemain & meta
  const list = (payload.players || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  players.splice(0, players.length, ...list);   // overwrite players array
  // waiting list
  try{
    const wait = (payload.waitingList || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (Array.isArray(wait)) {
      if (typeof waitingList === 'undefined') { window.waitingList = []; }
      waitingList.splice(0, waitingList.length, ...wait);
    }
  }catch{}
  // asumsi playerMeta adalah object { [nama]: {gender,level,...} }
  if (payload.playerMeta && typeof payload.playerMeta === 'object') {
    // copy aman
    Object.keys(playerMeta).forEach(k => delete playerMeta[k]);
    Object.assign(playerMeta, payload.playerMeta);
  }

  // 3) Rounds per court (format baru)
  let restored = [];
  if (Array.isArray(payload.roundsByCourt) && payload.roundsByCourt.length) {
    restored = payload.roundsByCourt.map(c => (c || []).map(r => ({ ...r })));
  } else {
    // Fallback dari JSON lama
    const r1 = Array.isArray(payload.rounds1) ? payload.rounds1.map(r=>({...r})) : [];
    const r2 = Array.isArray(payload.rounds2) ? payload.rounds2.map(r=>({...r})) : [];
    restored = [r1, r2];
  }

  // 4) Terapkan ke roundsByCourt global milik app
  roundsByCourt.splice(0, roundsByCourt.length, ...restored);

  // 4b) Max pemain dari payload (jika ada)
  try {
    if (payload.maxPlayers === null || payload.maxPlayers === undefined || payload.maxPlayers === '') {
      currentMaxPlayers = null;
    } else {
      const mp = parseInt(payload.maxPlayers, 10);
      currentMaxPlayers = (Number.isFinite(mp) && mp > 0) ? mp : null;
    }
    const maxEl = byId('maxPlayersInput');
    if (maxEl) maxEl.value = currentMaxPlayers ? String(currentMaxPlayers) : '';
  } catch {}

  // 5) Render & hitung
  renderAll?.();
  validateAll?.();
  computeStandings?.();
  refreshFairness?.();

  // 5b) If exactly one player left and exactly one promoted from waiting joined,
  // replace old name with new in all rounds to keep schedule consistent.
  try{
    const added = players.filter(p => !prevPlayers.includes(p));
    const removed = prevPlayers.filter(p => !players.includes(p));
    if (added.length === 1 && removed.length === 1) {
      const wasInWaiting = prevWaitingCopy.includes(added[0]);
      const nowInWaiting = (Array.isArray(waitingList) ? waitingList : []).includes(added[0]);
      if (wasInWaiting && !nowInWaiting && typeof replaceNameInRounds === 'function') {
        replaceNameInRounds(removed[0], added[0]);
        // Re-render after replacement
        renderAll?.();
        validateAll?.();
        computeStandings?.();
      }
    }
  }catch{}

  // 6) Tandai saved
  if (payload.ts) markSaved(payload.ts);
  else byId("unsavedDot")?.classList.add("hidden");

  // 7) Judul event
  if (payload.eventTitle) setAppTitle(payload.eventTitle);
  try{ renderHeaderChips(); }catch{}
}


function saveToJSONFile(){
  if(!saveToStore()) return;

  const date = byId('sessionDate').value || new Date().toISOString().slice(0,10);
  const safeDate = date.replace(/\//g,'-'); // kalau formatnya dd/mm/yyyy → diganti strip

  const blob = new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);

  const a=document.createElement('a');
  a.href=url;
  a.download = `session_${safeDate}.json`;   // 🔹 nama file = session_YYYY-MM-DD.json
  a.click();
  URL.revokeObjectURL(url);
}

function loadJSONFromFile(file){
  const r = new FileReader();
  r.onload = (ev)=>{
    try{
      const raw = JSON.parse(ev.target.result);

      // 🔹 dukung dua bentuk file:
      //    A) { sessions: { "YYYY-MM-DD": payload, ... }, lastTs: ... }
      //    B) { "YYYY-MM-DD": payload, ... }  (tanpa wrapper 'sessions')
      let incoming = raw;
      if (!incoming.sessions) {
        // bentuk B → bungkus jadi bentuk A
        incoming = { sessions: raw, lastTs: new Date().toISOString() };
      }

      // 🔹 normalisasi tiap payload
      Object.keys(incoming.sessions).forEach(dateKey=>{
        incoming.sessions[dateKey] = normalizeLoadedSession(incoming.sessions[dateKey]);
      });

      store = incoming;
      // removed: populateDatePicker UI
      alert('JSON dimuat.');
    }catch(e){
      console.error(e);
      alert('File JSON tidak valid.');
    }
  };
  r.readAsText(file);
}

function loadSessionByDate(){
  // removed: no UI to pick arbitrary local dates
  alert('Fitur muat berdasarkan tanggal lokal dinonaktifkan.');
  return;

  let data = store.sessions[d];
  if(!data){ alert('Tidak ada data untuk tanggal tsb.'); return; }
  if (byId('breakPerRound'))  byId('breakPerRound').value  = data.breakPerRound ?? '1';
  if (byId('showBreakRows'))  byId('showBreakRows').checked = !!data.showBreakRows;


  // 🔹 normalisasi jika yang masuk masih format lama
  data = normalizeLoadedSession(data);

  // 🔹 isi UI
  byId('sessionDate').value    = data.date || d;
  byId('startTime').value      = data.startTime || '19:00';
  byId('minutesPerRound').value= data.minutesPerRound || '12';
  byId('roundCount').value     = data.roundCount || '10';

  players        = parsePlayersText(data.players || '');
  roundsByCourt  = (data.roundsByCourt || []).map(arr => Array.isArray(arr) ? arr : []);
  playerMeta    = data.playerMeta || {}; // <<< tambahkan ini

  // fallback: minimal 1 lapangan
  if (roundsByCourt.length === 0) roundsByCourt = [[]];

  // 🔹 reset ke Lapangan 1, panjang ronde disesuaikan
  activeCourt = 0;
  ensureRoundsLengthForAllCourts();

  renderPlayersList();
  renderAll();
  markSaved(data.ts);
  refreshFairness();
}

// Pastikan panjang tiap lapangan sesuai 'roundCount'
function ensureRoundsLengthForAllCourts(){
  const R = parseInt(byId('roundCount').value || '10', 10);
  roundsByCourt.forEach((arr, ci)=>{
    while(arr.length < R) arr.push({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''});
    if(arr.length > R) roundsByCourt[ci] = arr.slice(0, R);
  });
}

// Konversi JSON lama -> struktur baru
function normalizeLoadedSession(data){
  // Kalau sudah ada roundsByCourt: pakai itu
  if (Array.isArray(data.roundsByCourt)) return data;

  // JSON lama: hanya rounds1/rounds2
  const rc = [];
  if (Array.isArray(data.rounds1)) rc.push(data.rounds1);
  if (Array.isArray(data.rounds2)) rc.push(data.rounds2);
  if (rc.length === 0) rc.push([]); // minimal 1 lapangan

  data.roundsByCourt = rc;
  return data;
}


function startAutoSave() {
  clearInterval(window._autosaveTick);
  window._autosaveTick = setInterval(async () => {
    if (!dirty) return;
    if (isCloudMode()) {
      // Autosave tanpa overlay/loading
      await saveStateToCloud();
    } else {
      saveToStoreSilent();
    }
  }, 1800000); // 30 menit
}


// ================== PLAYERS UI ================== //
function escapeHtml(s) {
  return s.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[
        c
      ])
  );
}
function renderPlayersList() {
  const ul = byId("playersList");
  ul.innerHTML = "";
  players.forEach((name, idx) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700";
    li.innerHTML =
      "<span class='player-name flex-1'>" +
      escapeHtml(name) +
      "</span><button class='del text-red-600 hover:underline text-xs'>hapus</button>";
      // === meta mini controls (gender + level)
      const meta = playerMeta[name] || { gender:'', level:'' };

      // gender select
      const gSel = document.createElement('select');
      gSel.className = 'player-meta border rounded px-1 py-0.5 text-xs dark:bg-gray-900 dark:border-gray-700';
      ['','M','F'].forEach(v => gSel.appendChild(new Option(v || '-Pilih Gender-', v)));
      gSel.value = meta.gender || '';
      gSel.disabled = isViewer();
      gSel.onchange = () => {
        playerMeta[name] = { ...playerMeta[name], gender: gSel.value };
        markDirty();
        validateNames();    // << tambah ini
      };

      // level select
      const lSel = document.createElement('select');
      lSel.className = 'player-meta border rounded px-1 py-0.5 text-xs dark:bg-gray-900 dark:border-gray-700';
      [['','-Pilih Level-'], ['beg','Beginner'], ['pro','Pro']]
        .forEach(([v,t]) => lSel.add(new Option(t, v)));
      lSel.value = meta.level || '';
      lSel.disabled = isViewer();
      lSel.onchange = () => {
        playerMeta[name] = { ...playerMeta[name], level: lSel.value };
        markDirty();
        validateNames();    // << tambah ini
      };

      // sisipkan di antara nama & tombol hapus
      const nameSpan = li.querySelector('.player-name');
      const delBtn   = li.querySelector('.del');
      if (isViewer()) delBtn.style.display = 'none';
      // Tombol toggle "Paid" (khusus editor)
      const pBtn = document.createElement('button');
      function _refreshPaidBtn(){
        const paid = isPlayerPaid(name);
        pBtn.className = 'px-2 py-0.5 text-xs rounded border flex items-center gap-1 ' +
                        (paid ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-transparent border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300');
        pBtn.title = paid ? 'Tandai belum bayar' : 'Tandai sudah bayar';
        pBtn.innerHTML = (paid ? '✓ ' : '') + 'Paid';
      }
      pBtn.addEventListener('click', () => {
        if (isViewer()) return;              // safety
        togglePlayerPaid(name);
        _refreshPaidBtn();
      });
      if (isViewer()) pBtn.style.display = 'none';
      _refreshPaidBtn();

      nameSpan.after(gSel, lSel, pBtn);


    li.querySelector(".del").addEventListener("click", () => {
      if (!confirm("Hapus " + name + "?")) return;
      players.splice(idx, 1);
      removePlayerFromRounds(name);
      delete playerMeta[name];
      try{
        const promoted = autoPromoteIfSlot?.();
        if (promoted) replaceNameInRounds(name, promoted);
      }catch{}
      markDirty();
      renderPlayersList();
      renderAll();
      validateNames();
      try{ maybeAutoSaveCloud(); }catch{}
    });
    ul.appendChild(li);
  });
  byId("globalInfo").textContent =
    "Pemain: " +
    players.length +
    " | Match/lapangan: " +
    (byId("roundCount").value || 10) +
    " | Menit/ronde: " +
    (byId("minutesPerRound").value || 12);
  try { if (isViewer()) renderViewerPlayersList?.(); } catch {}
  try{ renderHeaderChips(); }catch{}
  // render waiting list (editor panel)
  try {
    let wrap = byId('waitingListWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'waitingListWrap';
      wrap.className = 'mt-3';
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-1';
      const h = document.createElement('div');
      h.className = 'text-xs font-semibold text-gray-600 dark:text-gray-300';
      h.textContent = 'Waiting List';
      const btnAll = document.createElement('button');
      btnAll.id = 'btnPromoteAllWL';
      btnAll.className = 'px-2 py-0.5 text-xs rounded bg-emerald-600 text-white hidden';
      btnAll.textContent = 'Promote semua';
      btnAll.addEventListener('click', promoteAllFromWaiting);
      header.append(h, btnAll);
      const ulw = document.createElement('ul');
      ulw.id = 'waitingList';
      ulw.className = 'min-h-[32px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2';
      wrap.append(header, ulw);
      const container = byId('playerListContainer')?.parentElement || byId('playersPanel');
      container && container.appendChild(wrap);
    }
    // toggle button visibility for editor only
    const btnAll = byId('btnPromoteAllWL');
    if (btnAll) btnAll.classList.toggle('hidden', isViewer());
    const ulw = byId('waitingList');
    if (ulw) {
      ulw.innerHTML = '';
      (waitingList||[]).forEach((name) => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700';
        const meta = playerMeta[name] || { gender:'', level:'' };
        const badge = (txt, cls) => `<span class="text-[10px] px-1.5 py-0.5 rounded ${cls}">${escapeHtml(String(txt))}</span>`;
        const g = meta.gender||''; const lv = meta.level||'';
        const badges = [ g?badge(g,'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'):'' , lv?badge(lv,'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'):'' ].filter(Boolean).join('');
        li.innerHTML = `<span class='flex-1'>${escapeHtml(name)}</span><span class='flex gap-1'>${badges}</span>`;
        if (!isViewer()){
          const promote = document.createElement('button');
          promote.className = 'px-2 py-0.5 text-xs rounded bg-emerald-600 text-white flex items-center gap-1';
          promote.title = 'Promote dari waiting list';
          promote.innerHTML = `
            <span class="sm:hidden" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M5 15l7-7 7 7" />
              </svg>
            </span>
            <span class="hidden sm:inline">Promote</span>`;
          promote.addEventListener('click', ()=> promoteFromWaiting(name));
          const del = document.createElement('button');
          del.className = 'px-2 py-0.5 text-xs rounded border dark:border-gray-700 flex items-center gap-1';
          del.title = 'Hapus dari waiting list';
          del.innerHTML = `
            <span class="sm:hidden" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 10v8M14 10v8" />
              </svg>
            </span>
            <span class="hidden sm:inline">hapus</span>`;
          del.addEventListener('click', ()=> removeFromWaiting(name));
          li.appendChild(promote);
          li.appendChild(del);
        }
        ulw.appendChild(li);
      });
    }
  } catch {}
}
// Ensure a viewer-only players panel exists; return wrapper element
function ensureViewerPlayersPanel(){
  let wrap = byId('viewerPlayersWrap');
  if (wrap) return wrap;
  const globalInfo = byId('globalInfo');
  const parent = globalInfo ? globalInfo.parentElement : document.querySelector('main section');
  if (!parent) return null;
  wrap = document.createElement('div');
  wrap.id = 'viewerPlayersWrap';
  wrap.className = 'mt-4 hidden';
  const h3 = document.createElement('h3');
  h3.className = 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2';
  h3.textContent = 'Daftar Pemain';
  const ul = document.createElement('ul');
  ul.id = 'viewerPlayersList';
  ul.className = 'min-h-[44px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2';
  // waiting list holder (created later if needed)
  wrap.append(h3, ul);
  parent.appendChild(wrap);
  return wrap;
}

// ================== Editor Players Panel Relocation ================== //
function ensureEditorPlayersSection(){
  let host = document.getElementById('editorPlayersSection');
  if (host) return host;
  const main = document.querySelector('main');
  if (!main) return null;
  host = document.createElement('section');
  host.id = 'editorPlayersSection';
  host.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow';
  // place at top of main
  if (main.firstElementChild) main.insertBefore(host, main.firstElementChild);
  else main.appendChild(host);
  return host;
}

function relocateEditorPlayersPanel(){
  const pp = document.getElementById('playersPanel');
  if (!pp) return;
  const box = pp.parentElement; // the rounded border box containing header and panel
  if (!box) return;
  const host = ensureEditorPlayersSection();
  if (!host) return;
  // Clean up spacing from original context
  try { box.classList.remove('mt-2'); box.classList.add('mt-0'); } catch {}
  if (!host.contains(box)) host.appendChild(box);
  // Remove the empty grid cell container to avoid gap in filter grid
  try {
    const gridCell = box.parentElement; // col-span-2 md:col-span-6
    if (gridCell && gridCell !== host && gridCell.parentElement && gridCell.id !== 'editorPlayersSection') {
      gridCell.remove();
    }
  } catch {}
  try{ setupPlayersToolbarUI?.(); }catch{}
}

// Replace players toolbar texts with icon+label; labels hidden on mobile portrait via CSS
function setupPlayersToolbarUI(){
  try{
    const collapse = byId('btnCollapsePlayers');
    if (collapse && !collapse.dataset.iconified){
      collapse.dataset.iconified = '1';
      collapse.classList.add('icon-btn');
      collapse.innerHTML = '<svg class="icon inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg><span class="btn-label">Pemain</span>';
      const hint = collapse.parentElement?.querySelector('span');
      if (hint) hint.classList.add('helper-hint');
    }
    const map = [
      ['btnPasteText', '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>', 'Edit sebagai teks'],
      ['btnApplyPlayerTemplate', '<path d="M5 12l5 5L20 7"/>', 'Apply Template'],
      ['btnClearPlayers', '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 10v8M14 10v8"/><path d="M8 6V4h8v2"/>', 'Kosongkan']
    ];
    map.forEach(([id, svgPath, label])=>{
      const btn = byId(id);
      if (!btn || btn.dataset.iconified) return;
      btn.dataset.iconified = '1';
      btn.classList.add('icon-btn');
      btn.innerHTML = `<svg class="icon inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg><span class="btn-label">${label}</span>`;
    });
  }catch{}
}

// Render players for viewer mode into the viewer-only panel
function renderViewerPlayersList(){
  const wrap = ensureViewerPlayersPanel();
  if (!wrap) return;
  const ul = byId('viewerPlayersList');
  if (!ul) return;
  ul.innerHTML = '';
  (players || []).forEach((name) => {
    const li = document.createElement('li');
    const paid = isPlayerPaid(name);
    li.className = 'flex items-center gap-2 px-3 py-2 rounded-lg border ' +
    (paid
      ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-500'
      : 'bg-white dark:bg-gray-900 dark:border-gray-700');
    const meta = (playerMeta && playerMeta[name]) ? playerMeta[name] : {};
    const g = meta.gender || '';
    const lv = meta.level || '';
    const badge = (txt, cls) => `<span class="text-[10px] px-1.5 py-0.5 rounded ${cls}">${escapeHtml(String(txt))}</span>`;
    const badges = [
      g ? badge(g, 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200') : '',
      lv ? badge(lv, 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200') : ''
    ].filter(Boolean).join('');
    li.innerHTML = `<span class='flex-1'>${escapeHtml(name)}</span><span class='flex gap-1'>${badges}</span>`;
    ul.appendChild(li);
  });
  // waiting list for viewer
  try {
    let wwrap = byId('viewerWaitingWrap');
    if (!wwrap){
      wwrap = document.createElement('div');
      wwrap.id = 'viewerWaitingWrap';
      wwrap.className = 'mt-3';
      const h = document.createElement('div'); h.className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1'; h.textContent='Waiting List';
      const ulw = document.createElement('ul'); ulw.id='viewerWaitingList'; ulw.className='min-h-[32px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2';
      wwrap.append(h, ulw);
      wrap.appendChild(wwrap);
    }
    const ulw = byId('viewerWaitingList');
    if (ulw){
      ulw.innerHTML = '';
      (waitingList || []).forEach((name)=>{
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700';
        const meta = (playerMeta && playerMeta[name]) ? playerMeta[name] : {};
        const g = meta.gender || ''; const lv = meta.level || '';
        const badge = (txt, cls) => `<span class="text-[10px] px-1.5 py-0.5 rounded ${cls}">${escapeHtml(String(txt))}</span>`;
        const badges = [ g?badge(g,'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'):'' , lv?badge(lv,'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'):'' ].filter(Boolean).join('');
        li.innerHTML = `<span class='flex-1'>${escapeHtml(name)}</span><span class='flex gap-1'>${badges}</span>`;
        ulw.appendChild(li);
      });
    }
  } catch {}
}

// ================== Max Players (Editor) ================== //
function ensureMaxPlayersField(){
  let wrap = byId('maxPlayersWrap');
  if (wrap) return wrap;
  const rc = byId('roundCount');
  if (!rc || !rc.parentElement || !rc.parentElement.parentElement) return null;
  const parent = rc.parentElement.parentElement; // grid container
  wrap = document.createElement('div');
  wrap.id = 'maxPlayersWrap';
  wrap.className = 'filter-field';
  const label = document.createElement('label');
  label.className = 'filter-label block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300';
  label.textContent = 'Max Pemain';
  const input = document.createElement('input');
  input.id = 'maxPlayersInput';
  input.type = 'number';
  input.min = '1';
  input.placeholder = 'Tak terbatas';
  input.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';
  input.value = currentMaxPlayers ? String(currentMaxPlayers) : '';
  input.addEventListener('input', (e)=>{
    // update nilai lokal + tandai dirty; simpan ke state saat Save
    const raw = String(e.target.value||'').trim();
    if (raw === '') { currentMaxPlayers = null; markDirty(); try{ renderHeaderChips?.(); }catch{} return; }
    const v = parseInt(raw, 10);
    if (Number.isFinite(v) && v > 0) { currentMaxPlayers = v; markDirty(); try{ renderHeaderChips?.(); }catch{} }
  });
  wrap.append(label, input);
  // insert right after the roundCount container
  if (rc.parentElement.nextSibling) {
    parent.insertBefore(wrap, rc.parentElement.nextSibling);
  } else {
    parent.appendChild(wrap);
  }
  return wrap;
}

// ================== Event Location (Editor) ================== //
function ensureLocationFields(){
  let wrap = byId('locationWrap');
  if (wrap) return wrap;
  const rc = byId('roundCount');
  if (!rc || !rc.parentElement || !rc.parentElement.parentElement) return null;
  const parent = rc.parentElement.parentElement; // grid container
  wrap = document.createElement('div');
  wrap.id = 'locationWrap';
  wrap.className = 'filter-field filter-field--full';

  const label1 = document.createElement('label');
  label1.className = 'filter-label block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300';
  label1.textContent = 'Lokasi (opsional)';
  const input1 = document.createElement('input');
  input1.id = 'locationTextInput';
  input1.type = 'text';
  input1.placeholder = 'Mis. Lapangan A, GBK';
  input1.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

  const label2 = document.createElement('label');
  label2.className = 'filter-label mt-3 block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300';
  label2.textContent = 'Link Maps (opsional)';
  const input2 = document.createElement('input');
  input2.id = 'locationUrlInput';
  input2.type = 'url';
  input2.placeholder = 'https://maps.app.goo.gl/...';
  input2.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

  // Save on blur (best-effort)
  const save = debounce(async ()=>{
    try{
      if (!isCloudMode() || !currentEventId) return;
      const locText = (input1.value||'').trim();
      const locUrl  = (input2.value||'').trim();
      await sb.from('events').update({ location_text: locText || null, location_url: locUrl || null }).eq('id', currentEventId);
      renderEventLocation(locText, locUrl);
    }catch(e){ console.warn('Save location failed', e); }
  }, 300);
  input1.addEventListener('change', save);
  input1.addEventListener('blur', save);
  input2.addEventListener('change', save);
  input2.addEventListener('blur', save);

  wrap.append(label1, input1, label2, input2);
  // insert after maxPlayersWrap if exists, else after rc parent
  const after = byId('maxPlayersWrap')?.nextSibling ? byId('maxPlayersWrap').nextSibling : rc.parentElement.nextSibling;
  if (after) parent.insertBefore(wrap, after); else parent.appendChild(wrap);
  return wrap;
}

async function loadLocationFromDB(){
  try{
    if (!isCloudMode() || !window.sb?.from || !currentEventId) return;
    const { data, error } = await sb.from('events').select('location_text, location_url').eq('id', currentEventId).maybeSingle();
    if (error) return;
    const input1 = byId('locationTextInput');
    const input2 = byId('locationUrlInput');
    if (input1) input1.value = data?.location_text || '';
    if (input2) input2.value = data?.location_url || '';
  }catch{}
}

function ensureJoinOpenFields(){
  // --- cari anchor lokasi dengan beberapa kemungkinan id/selector ---
  const findAnchor = () =>
    byId('locationTextInput') ||
    byId('locationInput') ||
    document.querySelector('[data-role="location"], input[name="location"], input[placeholder*="Lokasi"], input[placeholder*="Lapangan"]');

  let anchor = findAnchor();
  if (!anchor) {
    // Anchor belum ada (UI editor belum dirender). Pantau sampai muncul.
    if (!window.__joinOpenAnchorObserver) {
      window.__joinOpenAnchorObserver = new MutationObserver(() => {
        const a = findAnchor();
        if (a) {
          try { window.__joinOpenAnchorObserver.disconnect(); }catch{}
          window.__joinOpenAnchorObserver = null;
          ensureJoinOpenFields();
        }
      });
      try { window.__joinOpenAnchorObserver.observe(document.body, { childList: true, subtree: true }); } catch {}
    }
    return null;
  }

  // --- tentukan parent grid yang tepat agar rapi di desktop/mobile ---
  const gridParent =
    anchor.closest('[data-settings-grid], .settings-grid, .grid, .grid-cols-12') ||
    anchor.parentElement?.closest('.grid, .grid-cols-12') ||
    anchor.parentElement?.parentElement ||
    anchor.parentElement;

  if (!gridParent) return null;

  // --- buat / ambil wrap komponen ---
  let wrap = byId('joinOpenWrap');
  const creating = !wrap;
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'joinOpenWrap';
    wrap.className = 'filter-field filter-field--full';
    wrap.innerHTML = `
      <label class="filter-label block text-[11px] uppercase tracking-wide font-semibold text-gray-600 dark:text-gray-300 mb-1">
        Buka Join
      </label>
      <div class="join-open-row">
        <input id="joinOpenDateInput" type="date"  class="join-open-input filter-input" />
        <input id="joinOpenTimeInput" type="time"  class="join-open-input filter-input" step="60" />
      </div>
    `;
  }

  // sisip sebagai saudara komponen Lokasi (di grid yang sama)
  if (creating || !wrap.parentNode) gridParent.appendChild(wrap);

  // set nilai awal dari state
  const di = byId('joinOpenDateInput');
  const ti = byId('joinOpenTimeInput');
  if (di) di.value = toLocalDateValue(window.joinOpenAt);
  if (ti) ti.value = toLocalTimeValue(window.joinOpenAt);

  // pasang handler SEKALI (hindari duplikasi)
  if (!wrap.__bound) {
    const onChange = async () => {
      const d = di?.value || '';
      const t = ti?.value || '';
      window.joinOpenAt = combineDateTimeToISO(d, t);
      scheduleJoinOpenTimer();
      try {
        if (currentEventId && window.sb) {
          await sb.from('events').update({ join_open_at: window.joinOpenAt }).eq('id', currentEventId);
          showToast?.('Waktu buka join disimpan', 'success');
        }
      } catch (e) { console.warn(e); showToast?.('Gagal menyimpan waktu buka join', 'error'); }
      try { refreshJoinUI?.(); } catch {}
    };
    di && di.addEventListener('change', onChange);
    ti && ti.addEventListener('change', onChange);
    wrap.__bound = true;
  }

  // jika nanti wrap dibuang karena re-render, sisipkan ulang otomatis
  if (!window.__joinOpenReinsertObserver) {
    window.__joinOpenReinsertObserver = new MutationObserver(() => {
      const stillThere = byId('joinOpenWrap');
      const nowAnchor  = findAnchor();
      if (!stillThere && nowAnchor) {
        try { window.__joinOpenReinsertObserver.disconnect(); }catch{}
        window.__joinOpenReinsertObserver = null;
        ensureJoinOpenFields();
      }
    });
    try { window.__joinOpenReinsertObserver.observe(gridParent, { childList: true }); } catch {}
  }

  return wrap;
}



async function loadJoinOpenFromDB(){
  try{
    if (!isCloudMode() || !window.sb?.from || !currentEventId) return;
    const { data } = await sb.from('events').select('join_open_at').eq('id', currentEventId).maybeSingle();
    window.joinOpenAt = data?.join_open_at || null;
    const di = byId('joinOpenDateInput'), ti = byId('joinOpenTimeInput');
    if (di) di.value = toLocalDateValue(window.joinOpenAt);
    if (ti) ti.value = toLocalTimeValue(window.joinOpenAt);
    scheduleJoinOpenTimer();
    try{ refreshJoinUI?.(); }catch{}
  }catch{}
}


async function loadMaxPlayersFromDB(){
  try{
    if (!isCloudMode() || !window.sb?.from || !currentEventId) return;
    const { data, error } = await sb.from('events').select('max_players').eq('id', currentEventId).maybeSingle();
    if (error) return;
    currentMaxPlayers = Number.isInteger(data?.max_players) ? data.max_players : null;
    const input = byId('maxPlayersInput');
    if (input) input.value = currentMaxPlayers ? String(currentMaxPlayers) : ''; try{ renderHeaderChips?.(); }catch{}
  }catch{}
}
function addPlayer(name) {
  if (isViewer()) return false;
  name = (name || '').trim();
  if (!name) return false;

  const norm = s => String(s||'').trim().toLowerCase();
  if ((players||[]).some(n => norm(n) === norm(name))) {
    showToast('Nama sudah ada di daftar pemain', 'info');
    return false;
  }
  if ((waitingList||[]).some(n => norm(n) === norm(name))) {
    showToast('Nama sudah ada di waiting list', 'info');
    return false;
  }

  if (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0 && players.length >= currentMaxPlayers) {
    waitingList.push(name);
    showToast('List sudah penuh, Pemain masuk ke waiting list', 'warn');
  } else {
    players.push(name);
  }

  renderPlayersList?.();
  renderAll?.();
  markDirty();
  return true;
}


function removePlayerFromRounds(name) {
  roundsByCourt.forEach(arr => {
    arr.forEach(r => {
      ["a1", "a2", "b1", "b2"].forEach(k => {
        if (r && r[k] === name) r[k] = "";
      });
    });
  });
}

// Gantikan nama pemain di semua match (semua lapangan & ronde)
function replaceNameInRounds(oldName, newName){
  if (!oldName || !newName) return;
  roundsByCourt.forEach(arr => {
    arr.forEach(r => {
      ["a1","a2","b1","b2"].forEach(k=>{ if (r && r[k] === oldName) r[k] = newName; });
    });
  });
}

// === Americano 32-point: Rotasi Servis + Badge di Score Modal =======
function __getOrder4(round){
  return [round?.a1 ?? '', round?.a2 ?? '', round?.b1 ?? '', round?.b2 ?? ''];
}
function __normOffset(round){
  let off = Number(round?.server_offset ?? 0);
  if (!Number.isInteger(off) || off < 0) off = 0;
  round.server_offset = off % 4; // 0:a1, 1:a2, 2:b1, 3:b2
  return round.server_offset;
}
// point 1..∞ -> index server 0..3 (pindah tiap 2 poin)
function serverIndexForPoint(point, server_offset){
  const grp = Math.floor((Math.max(1, point) - 1) / 2);
  return (grp + (server_offset || 0)) % 4;
}
// Ambil info server untuk poin tertentu
function getServerForPoint(round, point){
  const idx = serverIndexForPoint(point, __normOffset(round));
  const order = __getOrder4(round);
  const name = order[idx] || '';
  const team = (idx < 2) ? 'A' : 'B';
  const slot = (idx === 0) ? 'a1' : (idx === 1) ? 'a2' : (idx === 2) ? 'b1' : 'b2';
  return { name, idx, team, slot };
}

function renderServeBadgeInModal(){
  try{
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
    if (!r) return;

    // tentukan server untuk rally berikutnya (format 32 poin, pindah tiap 2 poin)
    const total = Number(scoreCtx.a || 0) + Number(scoreCtx.b || 0);
    const point = Math.min(64, Math.max(1, total + 1));
    const sv = getServerForPoint(r, point); // {slot: 'a1'|'a2'|'b1'|'b2'}

    // builder chip: ikon bola + NAMA di dalamnya
    const chipName = (name) => {
      const safe = escapeHtml(name || '-');
      return `
        <span class="serve-chip serve-chip--name" title="Sedang servis" aria-label="Sedang servis">
          <svg class="serve-ball" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M4.5 9.5c3.2-.9 6 0 7.9 1.9 1.9 1.9 2.8 4.7 1.9 7.9"/>
            <path d="M19.5 14.5c-3.2.9-6 0-7.9-1.9-1.9-1.9-2.8-4.7-1.9-7.9"/>
          </svg>
          <span class="serve-text">${safe}</span>
        </span>`;
    };

    // jika slot ini yang serve → tampilkan chip berisi namanya
    function renderName(name, slot){
      const safe = escapeHtml(name || '-');
      return (sv && sv.slot === slot) ? chipName(name) : safe;
    }

    const aEl = byId('scoreTeamA');
    const bEl = byId('scoreTeamB');
    if (aEl) aEl.innerHTML = renderName(r.a1,'a1') + ' & ' + renderName(r.a2,'a2');
    if (bEl) bEl.innerHTML = renderName(r.b1,'b1') + ' & ' + renderName(r.b2,'b2');
  }catch{}
}




// ===== Rename helpers (robust mapping for multi-rename) =====
function _normName(s){ return String(s||'').trim().toLowerCase(); }
function _lev(a,b){
  a = String(a||''); b = String(b||'');
  const m=a.length, n=b.length; if (m===0) return n; if (n===0) return m;
  const dp=new Array(n+1); for(let j=0;j<=n;j++) dp[j]=j;
  for(let i=1;i<=m;i++){
    let prev=dp[0]; dp[0]=i;
    for(let j=1;j<=n;j++){
      const tmp=dp[j];
      dp[j]=Math.min(
        dp[j]+1,
        dp[j-1]+1,
        prev + (a[i-1]===b[j-1]?0:1)
      );
      prev=tmp;
    }
  }
  return dp[n];
}
function _normalizedLev(a,b){
  const d=_lev(a,b); const L=Math.max(String(a||'').length, String(b||'').length) || 1;
  return d / L;
}
// Compute robust rename pairs between two active lists
function computeRenamePairs(oldActive, newActive){
  const pairs=[];
  const oldN = oldActive.map(_normName);
  const newN = newActive.map(_normName);
  const oldSet = new Set(oldN), newSet = new Set(newN);

  // Pair same position but different casing/value
  const usedNewIdx = new Set();
  const usedOldIdx = new Set();
  for(let i=0;i<Math.min(oldActive.length,newActive.length);i++){
    if (oldN[i]===newN[i] && oldActive[i] !== newActive[i]){
      pairs.push([oldActive[i], newActive[i]]);
      usedOldIdx.add(i); usedNewIdx.add(i);
    }
  }

  // Candidates: present only on one side
  const oldCandIdx=[]; const newCandIdx=[];
  for(let i=0;i<oldActive.length;i++) if(!usedOldIdx.has(i) && !newSet.has(oldN[i])) oldCandIdx.push(i);
  for(let j=0;j<newActive.length;j++) if(!usedNewIdx.has(j) && !oldSet.has(newN[j])) newCandIdx.push(j);

  // Greedy match by minimal normalized Levenshtein (threshold 0.45)
  const takenNew=new Set();
  for(const oi of oldCandIdx){
    let bestJ=-1, bestScore=1e9;
    for(const nj of newCandIdx){ if(takenNew.has(nj)) continue;
      const s=_normalizedLev(oldActive[oi], newActive[nj]);
      if (s<bestScore){ bestScore=s; bestJ=nj; }
    }
    if (bestJ>=0 && bestScore<=0.45){ pairs.push([oldActive[oi], newActive[bestJ]]); takenNew.add(bestJ); }
  }
  return pairs;
}

// Pastikan event masih ada. Jika sudah dihapus/tidak ada, reset ke mode lokal dan buka modal Cari Event.
async function ensureEventExistsOrReset(){
  try{
    if (!isCloudMode() || !currentEventId) return true;
    const { data, error } = await sb.from('events').select('id').eq('id', currentEventId).maybeSingle();
    if (error || !data?.id){
      showToast?.('Event tidak ditemukan atau sudah dihapus.', 'warn');
      try{ leaveEventMode?.(true); }catch{}
      try{ openSearchEventModal?.(); }catch{}
      return false;
    }
    return true;
  }catch(e){ console.warn('ensureEventExistsOrReset failed', e); return true; }
}

// Jika ada slot kosong dan waiting list berisi, otomatis promosikan 1 teratas
function autoPromoteIfSlot(){
  const cap = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : Infinity;
  if (players.length >= cap) return;
  if (!Array.isArray(waitingList) || waitingList.length === 0) return;
  const nm = waitingList.shift();
  if (!players.includes(nm)) players.push(nm);
  showToast('Memindahkan '+ nm +' dari waiting list', 'info');
  return nm;
}

// Promote sebanyak slot kosong yang tersedia
function promoteAllFromWaiting(){
  const cap = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : Infinity;
  let moved = 0;
  while (waitingList.length > 0 && players.length < cap){
    const nm = waitingList.shift();
    if (!players.includes(nm)){
      players.push(nm);
      moved++;
    }
  }
  if (moved > 0){
    showToast('Promote '+moved+' pemain dari waiting list', 'success');
    markDirty();
    renderPlayersList();
    renderAll?.();
  } else {
    if (players.length >= cap) showToast('List aktif penuh. Hapus/geser pemain dulu.', 'warn');
    else showToast('Tidak ada pemain di waiting list.', 'info');
  }
}

function promoteFromWaiting(name){
  const cap = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : Infinity;
  if (players.includes(name)) return;
  if (players.length >= cap){ showToast('List aktif penuh. Hapus/geser pemain dulu.', 'warn'); return; }
  const idx = (waitingList||[]).indexOf(name);
  if (idx >= 0) waitingList.splice(idx,1);
  players.push(name);
  markDirty();
  renderPlayersList();
  renderAll?.();
  try{ maybeAutoSaveCloud(); }catch{}
}

function removeFromWaiting(name){
  const target = String(name||'').trim().toLowerCase();
  if (!confirm('Hapus '+name+' dari waiting list?')) return;
  if (!Array.isArray(waitingList)) waitingList = [];
  for (let i = waitingList.length - 1; i >= 0; i--) {
    if (String(waitingList[i]||'').trim().toLowerCase() === target) {
      waitingList.splice(i, 1);
    }
  }
  window.waitingList = waitingList;
  // Hapus meta hanya jika meta tidak dipakai di daftar active
  try{
    if (!players.some(n => String(n||'').trim().toLowerCase() === target))
      delete playerMeta[name];
  }catch{}
  markDirty();
  renderPlayersList();
  try{ maybeAutoSaveCloud(); }catch{}
}

function upsertPlayerMeta(name, key, value) {
  if (!playerMeta[name]) playerMeta[name] = {};
  playerMeta[name][key] = value || '';
  markDirty();                 // ← penting: trigger autosave
}

// di dalam pembuatan elemen list pemain:
const selGender = document.createElement('select');
selGender.addEventListener('change', (e) => {
  upsertPlayerMeta(name, 'gender', e.target.value);
});

const selLevel = document.createElement('select');
selLevel.addEventListener('change', (e) => {
  upsertPlayerMeta(name, 'level', e.target.value);
});


function showTextModal() {
  byId("playersText").value = players.join("\n");
  byId("textModal").classList.remove("hidden");
  byId("playerListContainer").classList.add("hidden");
}
function hideTextModal() {
  byId("textModal").classList.add("hidden");
  byId("playerListContainer").classList.remove("hidden");
}
function levenshtein(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const dp = Array(b.length + 1)
    .fill(0)
    .map((_, i) => [i]);
  for (let j = 0; j <= a.length; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
      );
    }
  }
  return dp[b.length][a.length];
}
function validateNames(){
  const warn = byId('playersWarnings');
  const items = [];
  warn.innerHTML = '';

  // --- existing: cek duplikat nama ---
  const map = new Map();
  const dups = [];
  players.forEach((p,i)=>{
    const k = p.trim().toLowerCase();
    if(map.has(k)) dups.push([map.get(k), i]);
    else map.set(k, i);
  });
  if (dups.length){
    items.push(
      "<div class='text-amber-600'>Duplikat nama: " +
      dups.map(([a,b])=> players[a] + " ↔ " + players[b]).join(', ') +
      "</div>"
    );
  }

  // Normalize duplicate-name message (replace any garbled output)
  (function(){
    const map2 = new Map();
    const dups2 = [];
    players.forEach((p,i)=>{
      const k=p.trim().toLowerCase();
      if(map2.has(k)) dups2.push([map2.get(k), i]); else map2.set(k,i);
    });
    if (dups2.length){
      const filtered = items.filter(s => !s.startsWith("<div class='text-amber-600'>Duplikat nama:"));
      const fixed = "<div class='text-amber-600'>Duplikat nama: " +
                    dups2.map(([a,b])=> players[a] + " & " + players[b]).join(', ') +
                    "</div>";
      items.length = 0; items.push(...filtered, fixed);
    }
  })();

  // --- existing: saran typo (Levenshtein <= 2) ---
  const sugg=[];
  for(let i=0;i<players.length;i++){
    for(let j=i+1;j<players.length;j++){
      const d=levenshtein(players[i],players[j]);
      if(d>0 && d<=2) sugg.push([players[i],players[j],d]);
    }
  }
  if (sugg.length){
    items.push(
      "<div class='text-blue-600'>Mirip (cek typo): " +
      sugg.map(([a,b])=> a + " ~ " + b).join(', ') +
      "</div>"
    );
  }

  // --- NEW: pairing meta check sesuai mode ---
  const pm = byId('pairMode') ? byId('pairMode').value : 'free';
  if (pm !== 'free'){
    const missingGender = [];
    const missingLevel  = [];

    players.forEach(p=>{
      const m = (typeof playerMeta === 'object' && playerMeta[p]) ? playerMeta[p] : {};
      if (pm === 'mixed'){
        if (!m.gender) missingGender.push(p);
      } else if (pm === 'lvl_bal' || pm === 'lvl_same'){
        if (!m.level)  missingLevel.push(p);
      }
    });

    if (pm === 'mixed' && missingGender.length){
      items.push(
        "<div class='text-rose-600'>Mode Mixed: " +
        "Lengkapi <b>Gender</b> untuk: " + missingGender.join(', ') + ".</div>"
      );
    }
    if ((pm === 'lvl_bal' || pm === 'lvl_same') && missingLevel.length){
      items.push(
        "<div class='text-rose-600'>Mode Level: " +
        "Lengkapi <b>Level</b> (beg/pro) untuk: " + missingLevel.join(', ') + ".</div>"
      );
    }

    // Hint kecil untuk mengarahkan user
    if ((pm==='mixed' && missingGender.length) || ((pm==='lvl_bal'||pm==='lvl_same') && missingLevel.length)){
      items.push("<div class='text-xs text-gray-500 mt-1'>Atur di list pemain (dropdown kecil di tiap nama).</div>");
    }
  }

  warn.innerHTML = items.join('');
  return items.length === 0; // opsional kalau mau dipakai sebagai boolean
}


// ================== COURT ================== //
function renderCourt(container, arr) {
  const start = byId("startTime").value || "19:00";
  const minutes = parseInt(byId("minutesPerRound").value || "12", 10);
  const R = parseInt(byId("roundCount").value || "10", 10);
  const [h, m] = start.split(":").map(Number);
  const base = new Date();
  base.setHours(h || 19, m || 0, 0, 0);

  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "court-wrapper overflow-x-auto";

  const table = document.createElement("table");
  table.className = "min-w-full text-sm dark-table";
  table.classList.add("rnd-table"); // ⬅️ aktifkan card-mode di HP
  table.innerHTML = `
    <thead>
      <tr class="border-b border-gray-200 dark:border-gray-700">
        <th class="py-2 pr-4"></th>
        <th class="py-2 pr-4">Jadwal</th>
        <th class="py-2 pr-4">Waktu</th>
        <th class="py-2 pr-4">Player1A</th>
        <th class="py-2 pr-4">Player2A</th>
        <th class="py-2 pr-4">Player1B</th>
        <th class="py-2 pr-4">Player2B</th>
        <th class="py-2 pr-4">Skor Tim A</th>
        <th class="py-2 pr-4">Skor Tim B</th>
        <th class="py-2 pr-4">Action</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  const tbody = table.querySelector("tbody");

  for (let i = 0; i < R; i++) {
    const r = arr[i] || {
      a1: "", a2: "", b1: "", b2: "", scoreA: "", scoreB: ""
    };
    const t0 = new Date(base.getTime() + i * minutes * 60000);
    const t1 = new Date(t0.getTime() + minutes * 60000);

    const tr = document.createElement("tr");
    tr.className =
      "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40";
    tr.draggable = !isViewer();
    tr.dataset.index = i;
    tr.addEventListener("dragstart", (e) => {
      if (isViewer()) { e.preventDefault(); return; }
      tr.classList.add("row-dragging");
      e.dataTransfer.setData("text/plain", String(i));
    });
    tr.addEventListener("dragend", () => tr.classList.remove("row-dragging"));
    tr.addEventListener("dragover", (e) => {
      if (isViewer()) { e.preventDefault(); return; }
      e.preventDefault();
      tr.classList.add("row-drop-target");
    });
    tr.addEventListener("dragleave", () =>
      tr.classList.remove("row-drop-target")
    );
    tr.addEventListener("drop", (e) => {
      if (isViewer()) { e.preventDefault(); return; }
      e.preventDefault();
      tr.classList.remove("row-drop-target");
      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = Number(tr.dataset.index);
      if (isNaN(from) || isNaN(to) || from === to) return;
      const item = arr.splice(from, 1)[0];
      arr.splice(to, 0, item);
      markDirty();
      renderAll();
    });

    // === handle / index
    const tdHandle = document.createElement("td");
    tdHandle.textContent = "≡";
    tdHandle.className = "py-2 pr-4 text-gray-400 rnd-col-drag";
    // Clean handle icon override
    try { tdHandle.textContent = "☰"; } catch {}
    tdHandle.style.cursor = "grab";
    tr.appendChild(tdHandle);

    const tdIdx = document.createElement("td");
    tdIdx.textContent = "Match " + (i + 1);
    tdIdx.className = "py-2 pr-4 font-medium"; 
    tdIdx.classList.add("rnd-col-round", "text-center");
    tdIdx.dataset.label = "Match";
    tr.appendChild(tdIdx);

    // === Waktu (Start–End)
    const tdTime = document.createElement("td");
    tdTime.textContent = `${roundStartTime(i)}–${roundEndTime(i)}`;
    tdTime.className = "py-2 pr-4";
    tdTime.classList.add("rnd-col-time", "text-center");
    tdTime.dataset.label = "Waktu";
    // Override time separator to en dash
    try { tdTime.textContent = `${roundStartTime(i)}–${roundEndTime(i)}`; } catch {}
    tr.appendChild(tdTime);

    // helper: select pemain
    function selCell(k, label, extraClass) {
      const td = document.createElement("td");
      td.dataset.label = label;
      if (extraClass) td.classList.add(extraClass);

      const sel = document.createElement("select");
      sel.className =
        "border rounded-lg px-2 py-1 min-w-[6rem] max-w-[7rem] sm:max-w-[10rem] bg-white dark:bg-gray-900 dark:border-gray-700";
      // Reset placeholder option to a clean dash
      try { sel.innerHTML = ''; sel.appendChild(new Option('-', '')); } catch {}
      sel.appendChild(new Option("—", ""));
      players.forEach((p) => sel.appendChild(new Option(p, p)));
      sel.value = r[k] || "";
      sel.disabled = isViewer();
      sel.addEventListener("change", (e) => {
        arr[i] = { ...arr[i], [k]: e.target.value };
        markDirty();
        validateAll();
        computeStandings();
        refreshFairness();
      });
      td.appendChild(sel);
      return td;
    }

    // helper: input skor (tetap dikunci; isi dari modal hitung)
    function scCell(k, label, cls){
      const td = document.createElement('td');
      td.dataset.label = label;
      if (cls) td.classList.add(cls);

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.autocomplete = 'off';
      inp.pattern = '[0-9]*';
      inp.maxLength = (typeof SCORE_MAXLEN!=='undefined' ? SCORE_MAXLEN : 3);
      inp.className = 'border rounded-lg px-2 py-1 w-[3.5rem] sm:w-[4.5rem] bg-white dark:bg-gray-900 dark:border-gray-700';
      inp.disabled = true;                       // ⬅️ hanya dari modal
      inp.value = onlyDigits(r[k] || '');

      inp.addEventListener('keydown', (e)=>{ if (!allowKey(e)) e.preventDefault(); });
      inp.addEventListener('input', (e)=>{
        const clean = onlyDigits(e.target.value).slice(0, inp.maxLength);
        if (e.target.value !== clean) e.target.value = clean;
        arr[i] = { ...arr[i], [k]: clean };
        markDirty(); validateAll(); computeStandings();
      });
      inp.addEventListener('paste', (e)=>{
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const clean = onlyDigits(text).slice(0, inp.maxLength);
        document.execCommand('insertText', false, clean);
      });
      inp.addEventListener('drop', (e)=> e.preventDefault());
      inp.addEventListener('blur', ()=>{
        if (inp.value === '') inp.value = '0';
        arr[i] = { ...arr[i], [k]: inp.value };
        markDirty(); validateAll(); computeStandings();
      });

      td.appendChild(inp);
      return td;
    }

    // === Tim A | Tim B (urut: A1 | B1, A2 | B2)
    const tdA1 = selCell("a1", "TIM A", "rnd-teamA-1");
    const tdA2 = selCell("a2", " ", "rnd-teamA-2");
    const tdB1 = selCell("b1", "TIM B", "rnd-teamB-1");
    const tdB2 = selCell("b2", " ", "rnd-teamB-2");

    tr.appendChild(tdA1);
    tr.appendChild(tdA2);
    tr.appendChild(tdB1);
    tr.appendChild(tdB2);

    // === Skor Tim A | Tim B
    const tdSA = scCell("scoreA","Skor"); tdSA.classList.add("rnd-scoreA");
    const tdSB = scCell("scoreB","Skor"); tdSB.classList.add("rnd-scoreB");

    tr.appendChild(tdSA);
    tr.appendChild(tdSB);

    // Viewer mode: tampilkan kolom indikator (Live/Selesai) saja, tanpa tombol aksi
    if (isViewer() && !isScoreOnlyMode()) {
      const tdCalcV = document.createElement('td');
      tdCalcV.dataset.label = 'Aksi';
      tdCalcV.className = 'rnd-col-actions';
      // badge Live
      const liveV = document.createElement('span');
      liveV.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white live-badge';
      liveV.textContent = 'Live';
      if (!(r.startedAt && !r.finishedAt)) liveV.classList.add('hidden');
      tdCalcV.appendChild(liveV);
      // badge Selesai
      const doneV = document.createElement('span');
      doneV.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-gray-600 text-white done-badge';
      doneV.textContent = 'Selesai';
      if (!r.finishedAt) doneV.classList.add('hidden');
      tdCalcV.appendChild(doneV);

      tr.appendChild(tdCalcV);
      tbody.appendChild(tr);
      // Tambahkan baris jeda juga di mode viewer (agar waktu jeda terlihat)
      const _showBreakEl = byId('showBreakRows');
      const showBreak = true; // paksa tampil di viewer
      const brkMin = parseInt(byId('breakPerRound').value || '0', 10);
      if (showBreak && brkMin > 0 && i < R-1) {
        const trBreak = document.createElement('tr');
        trBreak.className = 'text-xs text-gray-500 dark:text-gray-400 rnd-break-row';
        const tdBreak = document.createElement('td');
        const fullCols = table.querySelector('thead tr').children.length;
        tdBreak.colSpan = fullCols;
        tdBreak.className = 'py-1 text-center opacity-80';
        try { tdBreak.textContent = `Jeda ${brkMin}:00 - Next ${roundStartTime(i+1)}`; } catch {}
        tdBreak.textContent = `Jeda ${brkMin}:00 - Next ${roundStartTime(i+1)}`;
        trBreak.appendChild(tdBreak);
        try { tdBreak.textContent = `Jeda ${brkMin}:00 - Next ${roundStartTime(i+1)}`; } catch {}
        tbody.appendChild(trBreak);
      }
      // lanjut ke ronde berikutnya tanpa tombol aksi
      continue;
    }


    // === tombol Hitung (aksi)
    const tdCalc = document.createElement('td');
    tdCalc.dataset.label = 'Aksi';
    tdCalc.className = 'rnd-col-actions';
    // Live & Done badges
    const live = document.createElement('span');
    live.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white live-badge';
    live.textContent = 'Live';
    if (!(r.startedAt && !r.finishedAt)) live.classList.add('hidden');
    tdCalc.appendChild(live);
    const done = document.createElement('span');
    done.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-gray-600 text-white done-badge';
    done.textContent = 'Selesai';
    if (!r.finishedAt) done.classList.add('hidden');
    tdCalc.appendChild(done);
    const btnCalc = document.createElement('button');
    btnCalc.className = 'px-3 py-1.5 rounded-lg border dark:border-gray-700 text-sm w-full sm:w-auto';
    btnCalc.textContent = (r.scoreA || r.scoreB) ? '🔁 Hitung Ulang' : '🧮 Mulai Main';
    btnCalc.addEventListener('click', ()=> openScoreModal(activeCourt, i));
    // Clean label override
    try { btnCalc.textContent = (r.scoreA || r.scoreB) ? 'Hitung Ulang' : 'Mulai Main'; } catch {}
    tdCalc.appendChild(btnCalc);
    tr.appendChild(tdCalc);
    // Override visibility/label for table action button based on role and view mode
    try {
      const hasScore = (r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '') || (r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '');
      const allowStart = (typeof canEditScore === 'function') ? canEditScore() : !isViewer();
      const allowRecalc = (typeof isOwnerNow==="function") ? isOwnerNow() : !!window._isOwnerUser; // only owner can recalc
      if (hasScore) {
        btnCalc.textContent = 'Hitung Ulang';
        if (!allowRecalc) btnCalc.classList.add('hidden');
      } else {
        const started = !!r.startedAt;
        if (!allowStart || started) {
          btnCalc.classList.add('hidden');
        } else if (canStartRoundBySequence(activeCourt, i)) {
          btnCalc.textContent = 'Mulai Main';
          btnCalc.disabled = false;
          btnCalc.classList.remove('opacity-50','cursor-not-allowed');
        } else {
          btnCalc.textContent = 'Incoming Match';
          btnCalc.disabled = true;
          btnCalc.classList.add('opacity-50','cursor-not-allowed');
          btnCalc.classList.remove('hidden');
        }
      }
    } catch {}

    tbody.appendChild(tr);

    // === Baris jeda (opsional)
    // Viewer: paksa tampil (abaikan toggle) agar jeda tetap terlihat sesuai setelan menit/jeda
    const _showBreakEl = byId('showBreakRows');
    const showBreak = isViewer() ? true : (_showBreakEl?.checked);
    const brkMin = parseInt(byId('breakPerRound').value || '0', 10);
    if (showBreak && brkMin > 0 && i < R-1) {
      const trBreak = document.createElement('tr');
      trBreak.className = 'text-xs text-gray-500 dark:text-gray-400 rnd-break-row';
      const tdBreak = document.createElement('td');
      const fullCols = table.querySelector('thead tr').children.length;
      tdBreak.colSpan = fullCols;
      tdBreak.className = 'py-1 text-center opacity-80';
      // Clean break text override
      try { tdBreak.textContent = `Jeda ${brkMin}:00 • Next ${roundStartTime(i+1)}`; } catch {}
      tdBreak.textContent = `🕒 Jeda ${brkMin}:00 • Next ${roundStartTime(i+1)}`;
      trBreak.appendChild(tdBreak);
      // Force clean break text (override any garbled replacements)
      try { tdBreak.textContent = `Jeda ${brkMin}:00 • Next ${roundStartTime(i+1)}`; } catch {}
      tbody.appendChild(trBreak);
    }
  }

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}


function renderCourtActive(){
  ensureRoundsLengthForAllCourts();
  const container = byId('courtContainer');
  container.innerHTML = '';
  const arr = roundsByCourt[activeCourt] || [];
  renderCourt(container, arr);  // gunakan fungsi renderCourt Anda yang sudah ada
}


// ===============  RENDER + VALIDATION + STANDINGS ================ //
function renderAll(){
  ensureRoundsLengthForAllCourts();
  renderCourtsToolbar();
  renderCourtActive();
  validateAll();
  computeStandings();
}

function renderFairnessInfo(){
  // buat container kalau belum ada
  let box = byId('fairnessInfo');
  if(!box){
    box = document.createElement('div');
    box.id='fairnessInfo';
    box.className='mt-3 text-xs bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2';
    const toolbar = byId('courtsToolbar') || document.body;
    toolbar.parentNode.insertBefore(box, toolbar.nextSibling);
  }

  // hitung total setelah penjadwalan (SEMUA lapangan, termasuk court aktif)
  const cnt = countAppearAll(-1); // tidak exclude apa pun
  const list = players.slice().sort((a,b)=>{
    const da=(cnt[a]||0), db=(cnt[b]||0);
    if(da!==db) return db-da; // desc biar kelihatan ekstrem
    return a.localeCompare(b);
  });
  const min = Math.min(...list.map(p=>cnt[p]||0));
  const max = Math.max(...list.map(p=>cnt[p]||0));
  const spread = max-min;

  const rows = list.map(p=>{
    const n = cnt[p]||0;
    const mark = (n===min?'⬇️':(n===max?'⬆️':'•'));
    return `<span class="inline-block mr-3">${mark} <b>${p}</b>: ${n}</span>`;
  }).join('');

  box.innerHTML = `
    <div class="font-semibold mb-1">Fairness Info (semua lapangan): min=${min}, max=${max}, selisih=${spread}</div>
    <div class="leading-6">${rows}</div>
    <div class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
      Tips: jika ada ⬆️ dan ⬇️ berjauhan, klik "Terapkan" lagi untuk mengacak ulang; 
      sistem mengutamakan pemain yang masih kurang main.
    </div>
  `;
}


// Override fairness renderer with a clean version (icons/text)
try {
  window.renderFairnessInfo = function(){
    let box = byId('fairnessInfo');
    if(!box){
      box = document.createElement('div');
      box.id='fairnessInfo';
      box.className='mt-3 text-xs bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2';
      const toolbar = byId('courtsToolbar') || document.body;
      toolbar.parentNode.insertBefore(box, toolbar.nextSibling);
    }
    const cnt = countAppearAll(-1);
    const list = players.slice().sort((a,b)=>{
      const da=(cnt[a]||0), db=(cnt[b]||0);
      if(da!==db) return db-da; return a.localeCompare(b);
    });
    const min = Math.min(...list.map(p=>cnt[p]||0));
    const max = Math.max(...list.map(p=>cnt[p]||0));
    const spread = max-min;
    const rows = list.map(p=>{
      const n = cnt[p]||0;
      const mark = (n===min ? '↓' : (n===max ? '↑' : '•'));
      return `<span class="inline-block mr-3">${mark} <b>${escapeHtml(p)}</b>: ${n}</span>`;
    }).join('');
    box.innerHTML = `
      <div class="font-semibold mb-1">Fairness Info (semua lapangan): min=${min}, max=${max}, selisih=${spread}</div>
      <div class="leading-6">${rows}</div>
      <div class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Tips: jika ada ↑ dan ↓ berjauhan, klik "Terapkan" lagi untuk mengacak ulang; sistem mengutamakan pemain yang masih kurang main.</div>
    `;
  };
} catch {}

function clearScoresActive(){
  const arr = roundsByCourt[activeCourt] || [];
  if (arr.length && arr.some(r => r && (r.scoreA || r.scoreB))) {
    if (!confirm('Hapus skor di lapangan aktif?')) return;
  }
  arr.forEach(r => { if (r) { r.scoreA = ''; r.scoreB = ''; } });
  markDirty(); renderAll(); computeStandings();
}

function clearScoresAll(){
  const hasAny = roundsByCourt.some(c => (c||[]).some(r => r && (r.scoreA || r.scoreB)));
  if (hasAny) {
    if (!confirm('Hapus skor di SEMUA lapangan?')) return;
  }
  roundsByCourt.forEach(courtArr => {
    courtArr.forEach(r => { if (r) { r.scoreA = ''; r.scoreB = ''; } });
  });
  markDirty(); renderAll(); computeStandings();
}


function renderCourtsToolbar(){
  const bar = byId('courtsToolbar');
  const addBtn = byId('btnAddCourt');
  if (addBtn) addBtn.disabled = isViewer();

  // simpan posisi scroll sebelum kita rebuild
  const prevScroll = bar.scrollLeft;

  // styling anti-wrap (kalau belum ada di HTML)
  bar.classList.add('overflow-x-auto','whitespace-nowrap','flex','items-center','gap-2');

  // bersihkan semua tab (jangan hapus tombol add)
  [...bar.querySelectorAll('.court-tab, .court-close-wrap, .court-holder')].forEach(el => el.remove());

  roundsByCourt.forEach((_, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'court-tab court-holder text-sm border-b-2 px-3 py-1.5 rounded-t-lg ' +
                    (idx===activeCourt ? 'active' : 'text-gray-500 border-transparent');
    btn.textContent = 'Lapangan ' + (idx+1);
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      // simpan posisi scroll saat ini agar tidak geser ketika re-render
      const keep = byId('courtsToolbar').scrollLeft;
      activeCourt = idx;
      renderAll();
      byId('courtsToolbar').scrollLeft = keep;
    });

    const wrap = document.createElement('span');
    wrap.className = 'court-close-wrap inline-flex items-center';
    if (idx > 0 && !isViewer()) {
      const del = document.createElement('button');
      del.className = 'court-close text-xs px-1';
      del.title = 'Hapus Lapangan';
      // Clean close icon
      try { del.textContent = '✕'; } catch {}
      del.textContent = '🗑️';
      del.addEventListener('click', (e)=>{
        e.stopPropagation();
        const keep = byId('courtsToolbar').scrollLeft;
        if (!confirm('Hapus Lapangan '+(idx+1)+'? Data ronde di lapangan ini akan hilang.')) return;
        roundsByCourt.splice(idx,1);
        if (activeCourt >= roundsByCourt.length) activeCourt = roundsByCourt.length-1;
        markDirty();
        renderAll();
        byId('courtsToolbar').scrollLeft = keep;
      });
      wrap.appendChild(del);
    } else {
      const ph = document.createElement('span'); ph.style.width='0.5rem'; wrap.appendChild(ph);
    }

    const holder = document.createElement('span');
    holder.className = 'court-holder inline-flex items-center gap-1';
    holder.appendChild(btn);
    holder.appendChild(wrap);

    bar.insertBefore(holder, addBtn);
  });

  // kembalikan posisi scroll setelah rebuild
  bar.scrollLeft = prevScroll;
}



// Validasi: pasangan boleh sama; duplikat lawan dicek PER lapangan; double-booking tetap dicek
function validateAll(){
  const R = parseInt(byId('roundCount').value || '10', 10);
  const problems = [];

  // 1) Double-booking per ronde lintas semua lapangan
  for(let i=0;i<R;i++){
    const names = [];
    roundsByCourt.forEach(courtArr=>{
      const r=courtArr[i];
      if(r){ names.push(r.a1, r.a2, r.b1, r.b2); }
    });
    const filtered = names.filter(Boolean);
    const set = new Set(filtered);
    if(set.size !== filtered.length){
      problems.push('Bentrok jadwal: Match '+(i+1)+' ada pemain di dua lapangan.');
    }
  }

  // 2) Duplikat lawan PER lapangan (partners boleh sama)
  const teamKey = (p,q)=>[p||'',q||''].sort().join(' & ');
  const matchKey = (r)=>{ if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) return ''; const tA=teamKey(r.a1,r.a2), tB=teamKey(r.b1,r.b2); return [tA,tB].sort().join(' vs '); };

  roundsByCourt.forEach((courtArr, ci)=>{
    const seen = new Map();
    for(let i=0;i<R;i++){
      const r=courtArr[i];
      if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) continue;
      const key = matchKey(r);
      if(seen.has(key)){
        problems.push('Duplikat lawan (Lap '+(ci+1)+'): '+key+' muncul lagi di Match '+(i+1)+' (sebelumnya '+seen.get(key)+').');
      } else {
        seen.set(key, 'Match '+(i+1));
      }
    }
  });

  const box = byId('errors');
  box.innerHTML = problems.length
    ? `<div class="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
         <div class="font-semibold mb-1">Validasi:</div>
         <ul class="list-disc pl-5 space-y-1">${problems.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>
       </div>`
    : `<div class="p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm">Tidak ada masalah penjadwalan.</div>`;
  return problems.length===0;
}

function applyDefaultPlayersTemplate() {
  players.splice(0, players.length, ...DEFAULT_PLAYERS_10);

  // reset meta yang tidak ada di template
  Object.keys(playerMeta).forEach(n => { if (!DEFAULT_PLAYERS_10.includes(n)) delete playerMeta[n]; });

  // bersihkan ronde dari nama yang tak ada di template
  const set = new Set(DEFAULT_PLAYERS_10);
  (roundsByCourt || []).forEach(court =>
    (court || []).forEach(r =>
      ['a1','a2','b1','b2'].forEach(k => { if (r && r[k] && !set.has(r[k])) r[k] = ''; })
    )
  );

  renderPlayersList?.();
  renderAll?.();
  computeStandings?.();
  markDirty();                 // ← simpan otomatis
}

function computeStandings(){
  const data={}; players.forEach(p=>data[p]={total:0,diff:0,win:0,lose:0,draw:0});
  const applyRound = (r)=>{
    const a=Number(r?.scoreA||0), b=Number(r?.scoreB||0);
    if(!(r?.a1&&r?.a2&&r?.b1&&r?.b2)) return;
    [r.a1,r.a2].forEach(p=>{ if(data[p]){ data[p].total+=a; data[p].diff+=(a-b); }});
    [r.b1,r.b2].forEach(p=>{ if(data[p]){ data[p].total+=b; data[p].diff+=(b-a); }});
    if(a>0||b>0){
      if(a>b){ [r.a1,r.a2].forEach(p=>data[p]&&data[p].win++); [r.b1,r.b2].forEach(p=>data[p]&&data[p].lose++); }
      else if(a<b){ [r.b1,r.b2].forEach(p=>data[p]&&data[p].win++); [r.a1,r.a2].forEach(p=>data[p]&&data[p].lose++); }
      else { [r.a1,r.a2,r.b1,r.b2].forEach(p=>{ if(data[p]) data[p].draw++; }); }
    }
  };
  roundsByCourt.forEach(arr => arr.forEach(applyRound));

  let arr=Object.entries(data).map(([player,v])=>{
    const gp=v.win+v.lose+v.draw;
    return {player,...v,winRate:gp? v.win/gp:0};
  });
  arr.sort((p,q)=>(q.total-p.total)||(q.diff-p.diff)||(q.win-p.win)||p.player.localeCompare(q.player));
  let rank=1; arr.forEach((s,i)=>{ if(i>0){ const pv=arr[i-1]; const tie=(s.total===pv.total&&s.diff===pv.diff&&s.win===pv.win); rank=tie?rank:(i+1);} s.rank=rank; });

  const tbody=byId('standings').querySelector('tbody'); tbody.innerHTML='';
  arr.forEach(s=>{
    const tr=document.createElement('tr');
    tr.className = s.rank===1?'rank-1': s.rank===2?'rank-2': s.rank===3?'rank-3':'';
    tr.innerHTML = `<td class="py-2 pr-4 font-semibold">${s.rank}</td>
                    <td class="py-2 pr-4 font-medium">${s.player}</td>
                    <td class="py-2 pr-4">${s.total}</td>
                    <td class="py-2 pr-4">${s.diff}</td>
                    <td class="py-2 pr-4">${s.win}</td>
                    <td class="py-2 pr-4">${s.lose}</td>
                    <td class="py-2 pr-4">${s.draw}</td>
                    <td class="py-2 pr-4">${(s.winRate*100).toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });
}


// --- util: normalisasi tanggal "YYYY-MM-DD" ---
function fmtDate(d){ return d; } // sessions.json sudah simpan "YYYY-MM-DD"

// --- hitung stats dari 1 sesi (pakai aturan yang sama) ---
function statsFromSession(session, whichCourt='both'){
  const data = {}; // {player:{total,diff,win,lose,draw,games}}
  function ensure(p){ if(!data[p]) data[p]={total:0,diff:0,win:0,lose:0,draw:0,games:0}; }
  function applyRound(r){
    const a=Number(r?.scoreA||0), b=Number(r?.scoreB||0);
    if(!(r?.a1&&r?.a2&&r?.b1&&r?.b2)) return;
    [r.a1,r.a2,r.b1,r.b2].forEach(ensure);
    // total & selisih
    [r.a1,r.a2].forEach(p=>{ data[p].total+=a; data[p].diff+=(a-b); data[p].games++; });
    [r.b1,r.b2].forEach(p=>{ data[p].total+=b; data[p].diff+=(b-a); data[p].games++; });
    // W/L/D
    if(a>b){ [r.a1,r.a2].forEach(p=>data[p].win++); [r.b1,r.b2].forEach(p=>data[p].lose++); }
    else if(a<b){ [r.b1,r.b2].forEach(p=>data[p].win++); [r.a1,r.a2].forEach(p=>data[p].lose++); }
    else { [r.a1,r.a2,r.b1,r.b2].forEach(p=>data[p].draw++); }
  }
  if(whichCourt==='both' || whichCourt==='1') (session.rounds1||[]).forEach(applyRound);
  if(whichCourt==='both' || whichCourt==='2') (session.rounds2||[]).forEach(applyRound);
  return data;
}

// --- gabung beberapa sesi ---
function aggregateStats(sessionsArr, whichCourt='both'){
  const agg={}; // player -> totals
  sessionsArr.forEach(s=>{
    const one=statsFromSession(s, whichCourt);
    Object.entries(one).forEach(([p,v])=>{
      if(!agg[p]) agg[p]={total:0,diff:0,win:0,lose:0,draw:0,games:0};
      agg[p].total+=v.total; agg[p].diff+=v.diff;
      agg[p].win+=v.win; agg[p].lose+=v.lose; agg[p].draw+=v.draw; agg[p].games+=v.games;
    });
  });
  // urutkan
  let arr=Object.entries(agg).map(([player,v])=>{
    const gp=v.win+v.lose+v.draw; // atau v.games/2 tergantung definisi
    return {player,...v,winRate: gp ? v.win/gp : 0};
  });
  arr.sort((a,b)=>(b.total-a.total)||(b.diff-a.diff)||(b.win-a.win)||a.player.localeCompare(b.player));
  // ranking
  let rank=1; arr.forEach((s,i)=>{ if(i>0){ const pv=arr[i-1]; const tie=(s.total===pv.total&&s.diff===pv.diff&&s.win===pv.win); rank=tie?rank:(i+1);} s.rank=rank; });
  return arr;
}

// --- tampilkan report ---
function openReportModal(){ byId('reportModal').classList.remove('hidden'); }
function closeReportModal(){ byId('reportModal').classList.add('hidden'); }

function runReport(){
  const from = byId('repFrom').value || '0000-01-01';
  const to   = byId('repTo').value   || '9999-12-31';
  const court= byId('repCourt').value; // 'both' | '1' | '2'

  const sessionsArr = Object.values(store.sessions || {}).filter(s=>{
    const d = s.date || '';
    return d >= from && d <= to;
  });

  const arr = aggregateStats(sessionsArr, court);

  // ================ SUMMARY ================ //
  const totalDates = new Set(sessionsArr.map(s=>s.date)).size;
  const totalGames = sessionsArr.reduce((sum,s)=>{
    const r1 = (court==='both'||court==='1') ? (s.rounds1||[]).filter(r=>r.a1&&r.a2&&r.b1&&r.b2).length : 0;
    const r2 = (court==='both'||court==='2') ? (s.rounds2||[]).filter(r=>r.a1&&r.a2&&r.b1&&r.b2).length : 0;
    return sum + r1 + r2;
  },0);
  const uniquePlayers = new Set(arr.map(x=>x.player)).size;
  byId('reportSummary').textContent =
    `Rentang: ${from} → ${to} • Tanggal: ${totalDates} • Game: ${totalGames} • Pemain: ${uniquePlayers}`;

  // Normalize report summary text (clean separators)
  try {
    byId('reportSummary').textContent = `Rentang: ${from} - ${to} | Tanggal: ${totalDates} | Game: ${totalGames} | Pemain: ${uniquePlayers}`;
  } catch {}

  // table
  const tbody = byId('reportTable').querySelector('tbody');
  tbody.innerHTML='';
  arr.forEach(s=>{
    const tr=document.createElement('tr');
    tr.className = s.rank===1?'rank-1': s.rank===2?'rank-2': s.rank===3?'rank-3':'';
    tr.innerHTML = `
      <td class="py-2 pr-4 font-semibold">${s.rank}</td>
      <td class="py-2 pr-4 font-medium">${escapeHtml(s.player)}</td>
      <td class="py-2 pr-4">${s.games}</td>
      <td class="py-2 pr-4">${s.total}</td>
      <td class="py-2 pr-4">${s.diff}</td>
      <td class="py-2 pr-4">${s.win}</td>
      <td class="py-2 pr-4">${s.lose}</td>
      <td class="py-2 pr-4">${s.draw}</td>
      <td class="py-2 pr-4">${(s.winRate*100).toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });

  // ======================= export Excel ======================= //
  byId('btnExportReportExcel').onclick = ()=>{
    // Data yang sudah dihitung sebelumnya
    // arr: hasil aggregateStats(...) berisi {player,games,total,diff,win,lose,draw,winRate,rank}
    const from = byId('repFrom').value || '0000-01-01';
    const to   = byId('repTo').value   || '9999-12-31';
    const court= byId('repCourt').value; // 'both' | '1' | '2'
    const title = `Report ${from} to ${to} (Lap: ${court})`;

    // Header + rows
    const wsData = [
      [title],
      [],
      ['Rank','Pemain','Main','Total','Selisih','Menang','Kalah','Seri','WinRate']
    ];

    arr.forEach(s=>{
      wsData.push([
        s.rank,
        s.player,
        s.games,
        s.total,
        s.diff,
        s.win,
        s.lose,
        s.draw,
        (s.winRate*100).toFixed(1) + '%'
      ]);
    });

    // Buat workbook & sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto width kolom sederhana
    const colWidths = [
      { wch: 6 },  // Rank
      { wch: 18 }, // Pemain
      { wch: 6 },  // Main
      { wch: 8 },  // Total
      { wch: 8 },  // Selisih
      { wch: 7 },  // W
      { wch: 7 },  // L
      { wch: 7 },  // D
      { wch: 9 }   // WinRate
    ];
    ws['!cols'] = colWidths;

    // Bold untuk header
    const headerRow = 3; // baris ke-3 (1-based) berisi header
    const headerRange = XLSX.utils.encode_range({ s:{r:headerRow-1,c:0}, e:{r:headerRow-1,c:8} });
    const headerCells = XLSX.utils.decode_range(headerRange);
    for(let C = headerCells.s.c; C <= headerCells.e.c; C++){
      const cellAddr = XLSX.utils.encode_cell({r:headerRow-1, c:C});
      if(ws[cellAddr]) ws[cellAddr].s = { font: { bold: true } };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Klasemen');
    const fname = `report_${from}_to_${to}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

}


// ================== AUTO FILL (tab aktif) ================== //
function autoFillActiveTab() {
  const R = parseInt(byId("roundCount").value || "10", 10);
  players = Array.from(byId("playersList").querySelectorAll(".player-name"))
    .map((el) => el.textContent.trim())
    .filter(Boolean);
  if (players.length < 4) return;

  const other = activeTab === 1 ? rounds2 : rounds1;
  let target = activeTab === 1 ? rounds1 : rounds2;
  target = [];

  const seenAppear = Object.fromEntries(players.map((p) => [p, 0]));
  function chooseFour(i) {
    const busy = new Set();
    const o = other[i] || {};
    [o?.a1, o?.a2, o?.b1, o?.b2].forEach((x) => x && busy.add(x));
    const cand = players.filter((p) => !busy.has(p));
    cand.sort((a, b) => seenAppear[a] - seenAppear[b] || a.localeCompare(b));
    if (cand.length < 4) return null;
    return [cand[0], cand[1], cand[2], cand[3]];
  }

  for (let i = 0; i < R; i++) {
    let four = chooseFour(i);
    if (!four) {
      const busy = new Set();
      const o = other[i] || {};
      [o?.a1, o?.a2, o?.b1, o?.b2].forEach((x) => x && busy.add(x));
      four = players.filter((p) => !busy.has(p)).slice(0, 4);
      if (four.length < 4) {
        target.push({});
        continue;
      }
    }
    const [A, B, C, D] = four;
    // pasangan boleh sama; cek lawan dilakukan di validateAll per lapangan
    target.push({ a1: A, a2: B, b1: C, b2: D, scoreA: "", scoreB: "" });
    seenAppear[A]++;
    seenAppear[B]++;
    seenAppear[C]++;
    seenAppear[D]++;
  }

  if (activeTab === 1) rounds1 = target;
  else rounds2 = target;
}

function autoFillActiveCourt(){
  const R = parseInt(byId('roundCount').value || '10', 10);
  const pairMode = byId('pairMode') ? byId('pairMode').value : 'free';

  // ambil nama terbaru
  players = Array.from(byId('playersList').querySelectorAll('.player-name'))
            .map(el=>el.textContent.trim()).filter(Boolean);
  if(players.length<4) return;

  const metaOf = p => (playerMeta && playerMeta[p]) ? playerMeta[p] : {};
  const fitsTeamRule=(x,y)=>{
    if (pairMode==='free') return true;
    const mx=metaOf(x), my=metaOf(y);
    if (pairMode==='mixed'){
      if(!mx.gender || !my.gender) return false;
      return mx.gender!==my.gender;
    }
    if (pairMode==='lvl_same'){
      return mx.level && my.level && mx.level===my.level;
    }
    if (pairMode==='lvl_bal'){ return true; } // cek di akhir per-tim
    return true;
  };

  // --- 1) target fairness ----------------------------------------------------
  // base = kemunculan di lapangan lain (karena lapangan aktif akan di-overwrite)
  const base = countAppearAll(activeCourt);
  const totalBase = players.reduce((s,p)=>s+(base[p]||0),0);
  const S = R*4;                                   // slot yang harus diisi di court aktif
  const totalAfter = totalBase + S;
  const minAppear = Math.floor(totalAfter / players.length);
  const remainder = totalAfter % players.length;

  const order = players.slice().sort((a,b)=>{
    const da=(base[a]||0), db=(base[b]||0);
    if(da!==db) return da-db;
    return Math.random()-0.5;                      // tie break acak
  });

  const targetTotal = {};
  order.forEach((p,i)=> targetTotal[p] = minAppear + (i<remainder?1:0));
  const need = Object.fromEntries(players.map(p=>[p,Math.max(0,(targetTotal[p]||0)-(base[p]||0))]));
  // jumlah need dijamin = S

  // --- 2) persiapan jadwal ---------------------------------------------------
  const otherCourts = roundsByCourt.filter((_,i)=>i!==activeCourt);
  const target = new Array(R).fill(null);
  const seenOpp  = new Set(); // hindari lawan sama di court aktif
  const seenMatch= new Set();

  // daftar ronde akan diisi dalam urutan acak
  const roundOrder = shuffleInPlace([...Array(R).keys()]);

  // helper: cari 4 pemain utk ronde i (utamakan yang need besar & tidak bentrok)
  function pickFourForRound(i){
    const busy = new Set();
    otherCourts.forEach(c=>{ const r=c[i]; if(r) [r.a1,r.a2,r.b1,r.b2].forEach(x=>x&&busy.add(x)); });

    const freeAll = players.filter(p=>!busy.has(p));
    if (freeAll.length<4) return null;

    // buat pool dengan bobot "need" agar yang butuh lebih sering terambil
    let pool=[];
    freeAll.forEach(p=>{
      const w=Math.max(1,need[p]);
      for(let k=0;k<w;k++) pool.push(p);
    });
    // sampling beberapa kombinasi unik berbobot need
    const tried=new Set();
    for(let t=0;t<120;t++){
      shuffleInPlace(pool);
      const combo=[];
      for(const x of pool){ if(!combo.includes(x)) combo.push(x); if(combo.length===4) break; }
      if(combo.length<4) break;
      const key=combo.slice().sort().join('|');
      if(tried.has(key)) continue;
      tried.add(key);

      // minimal 3 dari 4 harus "need>0" agar fairness kuat
      const needCount = combo.filter(p=>need[p]>0).length;
      if(needCount>=3) return combo;
    }
    // fallback deterministik: urut by need desc lalu random kecil
    const cand=freeAll.slice().sort((a,b)=>{
      const dv=need[b]-need[a];
      if(dv!==0) return dv;
      return Math.random()-0.5;
    });
    return cand.slice(0,4);
  }

  // helper: bentuk 2 tim dari 4 pemain
  function makeMatch(four){
    const opts = shuffleInPlace([
      {a1:four[0], a2:four[1], b1:four[2], b2:four[3]},
      {a1:four[0], a2:four[2], b1:four[1], b2:four[3]},
      {a1:four[0], a2:four[3], b1:four[1], b2:four[2]},
    ]);

    // 2-phase: (A) strict anti-rematch, (B) longgar anti-rematch jika buntu
    for (const phase of [ 'strict', 'loose' ]){
      for(const o of opts){
        if(!fitsTeamRule(o.a1,o.a2)) continue;
        if(!fitsTeamRule(o.b1,o.b2)) continue;

        if (pairMode==='lvl_bal'){
          const AB=[metaOf(o.a1).level, metaOf(o.a2).level];
          const CD=[metaOf(o.b1).level, metaOf(o.b2).level];
          const okAB = AB.includes('beg') && AB.includes('pro');
          const okCD = CD.includes('beg') && CD.includes('pro');
          if(!(okAB && okCD)) continue;
        }

        const mKey = vsKey(teamKey(o.a1,o.a2), teamKey(o.b1,o.b2));
        if (seenMatch.has(mKey)) continue;

        const oppPairs=[vsKey(o.a1,o.b1),vsKey(o.a1,o.b2),vsKey(o.a2,o.b1),vsKey(o.a2,o.b2)];
        const hasOppRematch = oppPairs.some(k=>seenOpp.has(k));
        if (phase==='strict' && hasOppRematch) continue;

        return o;
      }
    }
    return null;
  }

  for(const i of roundOrder){
    let four = pickFourForRound(i);
    if(!four){ target[i]={}; continue; }

    // coba beberapa kali agar lolos rule pairing + anti-duplikat lawan
    let picked=null;
    for(let t=0;t<10 && !picked; t++){
      shuffleInPlace(four);
      picked = makeMatch(four);
    }
    if(!picked){
      // fallback terakhir: hormati partner rule saja
      const fallback = shuffleInPlace([
        {a1:four[0], a2:four[1], b1:four[2], b2:four[3]},
        {a1:four[0], a2:four[2], b1:four[1], b2:four[3]},
        {a1:four[0], a2:four[3], b1:four[1], b2:four[2]},
      ]).find(o=>fitsTeamRule(o.a1,o.a2)&&fitsTeamRule(o.b1,o.b2)) || 
        {a1:four[0], a2:four[1], b1:four[2], b2:four[3]};
      picked=fallback;
    }

    target[i] = { ...picked, scoreA:'', scoreB:'' };

    // update fairness tracker
    [picked.a1,picked.a2,picked.b1,picked.b2].forEach(p=>{ if(need[p]>0) need[p]--; });

    // update catatan lawan (hindari rematch selanjutnya)
    [ [picked.a1,picked.b1],[picked.a1,picked.b2],[picked.a2,picked.b1],[picked.a2,picked.b2] ]
      .forEach(([x,y])=>seenOpp.add(vsKey(x,y)));
    seenMatch.add(vsKey(teamKey(picked.a1,picked.a2), teamKey(picked.b1,picked.b2)));
  }

  roundsByCourt[activeCourt]=target;

  markDirty(); renderAll(); computeStandings();
  validateAll();
  renderFairnessInfo(); // panel kecil (opsional)
}


// ================== SCORE MODAL ================== //
function openScoreModal(courtIdx, roundIdx){
  scoreCtx.court = courtIdx;
  scoreCtx.round = roundIdx;

  const r = (roundsByCourt[courtIdx] || [])[roundIdx] || {};
  // Sequential validation: only allow opening for start when previous match finished
  try{
    const hasScoreGuard = (r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '') || (r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '');
    if (!r.startedAt && !r.finishedAt && !hasScoreGuard && !canStartRoundBySequence(courtIdx, roundIdx)){
      showToast?.('Belum waktunya match ini. Selesaikan match sebelumnya dahulu.', 'info');
      return;
    }
  }catch{}
  scoreCtx.a = Number(r.scoreA || 0);
  scoreCtx.b = Number(r.scoreB || 0);

  byId('scoreTeamA').textContent = [r.a1||'-', r.a2||'-'].join(' & ');
  byId('scoreTeamB').textContent = [r.b1||'-', r.b2||'-'].join(' & ');
  byId('scoreRoundTitle').textContent = `Lap ${courtIdx+1} • Match ${roundIdx+1}`;
  byId('scoreAVal').textContent = scoreCtx.a;
  byId('scoreBVal').textContent = scoreCtx.b;
  renderServeBadgeInModal();

    const ready = r.a1 && r.a2 && r.b1 && r.b2;
  if (!ready){ alert('Pemain di ronde ini belum lengkap. Lengkapi dulu ya.'); return; }

  // matikan timer yang tersisa
  if (scoreCtx.timerId){ clearInterval(scoreCtx.timerId); scoreCtx.timerId = null; }
  scoreCtx.running = false;

  // ✅ DETEKSI SKOR DENGAN BENAR (jangan pakai truthy)
  const hasA = r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '';
  const hasB = r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '';
  const alreadyScored = hasA || hasB;

  const timerEl = byId('scoreTimer');

  if (alreadyScored){
    // mode hasil final: kunci tombol, timer = "Permainan Selesai"
    setScoreModalLocked(true);
    if (timerEl) timerEl.textContent = 'Permainan Selesai';
  } else {
    // mode main: tombol aktif & timer mm:ss dari Menit/Ronde
    const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
    scoreCtx.remainMs = minutes * 60 * 1000;
    if (timerEl) timerEl.textContent = fmtMMSS(scoreCtx.remainMs);
    setScoreModalLocked(false); // Start enabled
    // Sembunyikan +/- sampai Mulai ditekan, kecuali jika sudah r.startedAt
    setScoreModalPreStart(!r.startedAt);
  }

  // Read-only mode: selalu terkunci
  if (isViewer() && !isScoreOnlyMode()) setScoreModalLocked(true);

  // Jika match sudah pernah dimulai (flag pada round), sembunyikan tombol Start dan beritahu pengguna
  try{
    const startBtn = byId('btnStartTimer');
    const alreadyStarted = !!r.startedAt;
    if (startBtn) startBtn.classList.toggle('hidden', alreadyStarted);
    if (alreadyStarted){
      // Tampilkan tombol +/- jika sudah mulai
      setScoreModalPreStart(false);
    }
    if (alreadyStarted){ try{ showToast('Permainan sudah dimulai untuk match ini', 'info'); }catch{} }
  }catch{}

  byId('scoreModal').classList.remove('hidden');
}


function closeScoreModal(){
  if (scoreCtx.timerId){ clearInterval(scoreCtx.timerId); scoreCtx.timerId=null; }
  scoreCtx.running = false;
  byId('scoreModal').classList.add('hidden');
  try{ byId('scoreTimer')?.classList.remove('timer-running'); }catch{}
}

// Handler dengan konfirmasi: bila match sudah dimulai namun belum selesai,
// tutup = batalkan permainan (hapus startedAt) dan kembalikan tombol Mulai.
function onCloseScoreClick(){
  try{
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
    const isStarted = !!r.startedAt;
    const isFinished = !!r.finishedAt;
    if (isStarted && !isFinished){
      const ok = confirm('Permainan untuk match ini sedang berjalan. Menutup akan membatalkan permainan. Lanjutkan?');
      if (!ok) return; // batal menutup
      try{ delete r.startedAt; }catch{}
      // pulihkan skor semula jika ada cadangan
      try{
        const hadPrev = (typeof r._prevScoreA !== 'undefined') || (typeof r._prevScoreB !== 'undefined');
        if (hadPrev){
          r.scoreA = (typeof r._prevScoreA !== 'undefined') ? r._prevScoreA : '';
          r.scoreB = (typeof r._prevScoreB !== 'undefined') ? r._prevScoreB : '';
          try{ delete r._prevScoreA; delete r._prevScoreB; }catch{}
          // sinkronkan tampilan popup & tabel
          scoreCtx.a = Number(r.scoreA || 0);
          scoreCtx.b = Number(r.scoreB || 0);
          try{
            const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
            const aInp = row?.querySelector('.rnd-scoreA input');
            const bInp = row?.querySelector('.rnd-scoreB input');
            if (aInp) aInp.value = String(r.scoreA || '');
            if (bInp) bInp.value = String(r.scoreB || '');
          }catch{}
        }
      }catch{}
      // reset timer state agar siap mulai lagi
      try{
        const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
        scoreCtx.remainMs = minutes * 60 * 1000;
        const t = byId('scoreTimer'); if (t) t.textContent = fmtMMSS(scoreCtx.remainMs);
      }catch{}
      // update UI baris tabel: sembunyikan badge Live, tampilkan tombol Mulai jika boleh
      try{
        const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
        const actions = row?.querySelector('.rnd-col-actions');
        const live = actions?.querySelector('.live-badge'); if (live) live.classList.add('hidden');
        const btn = actions?.querySelector('button');
        const allowStart = (typeof canEditScore === 'function') ? canEditScore() : !isViewer();
        if (btn){
          btn.textContent = 'Mulai Main';
          if (allowStart) btn.classList.remove('hidden');
        }
      }catch{}
      try{ showToast('Permainan dibatalkan. Skor direset.', 'warn'); }catch{}
      // simpan pembatalan ke Cloud (realtime)
      markDirty();
      try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
    }
  }catch{}
  closeScoreModal();
}

function startScoreTimer(){
  if (!canEditScore()) return;
  if (scoreCtx.running) return;
  // jika sudah 0: reset ke durasi default lagi
  if (scoreCtx.remainMs <= 0){
    const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
    scoreCtx.remainMs = minutes * 60 * 1000;
  }
  // Set started flag once (and persist) to lock others realtime
  try {
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
    if (r.startedAt){ showToast?.("Permainan sudah dimulai untuk match ini", "warn"); const _btn=byId("btnStartTimer"); if(_btn) _btn.classList.add("hidden"); return; }
    // backup skor awal untuk pemulihan jika dibatalkan
    if (typeof r._prevScoreA === "undefined") r._prevScoreA = (typeof r.scoreA !== "undefined") ? r.scoreA : "";
    if (typeof r._prevScoreB === "undefined") r._prevScoreB = (typeof r.scoreB !== "undefined") ? r.scoreB : "";
    r.startedAt = new Date().toISOString();
    // Saat mulai: tampilkan +/- dan sembunyikan tombol Mulai (di modal)
    try{ setScoreModalPreStart(false); }catch{}
    try{ const sBtn = byId('btnStartTimer'); if (sBtn) sBtn.classList.add('hidden'); }catch{}
    // Update live badge and action button inline
    try{
      const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
      const actions = row?.querySelector('.rnd-col-actions');
      const live = actions?.querySelector('.live-badge');
      if (live){ live.classList.remove('hidden'); live.classList.add('fade-in'); setTimeout(()=>live.classList.remove('fade-in'),200); }
      const startBtn = actions?.querySelector('button');
      if (startBtn && /mulai/i.test(startBtn.textContent||'')) { startBtn.classList.add('fade-out'); setTimeout(()=>{ startBtn.classList.add('hidden'); startBtn.classList.remove('fade-out'); },150); }
    }catch{}
    // persist startedAt to Cloud
    markDirty();
    try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
  } catch {}

  scoreCtx.running = true;
  const btn = byId('btnStartTimer'); if (btn) btn.disabled = true;
  try{ byId('scoreTimer')?.classList.add('timer-running'); }catch{}

  const startedAt = Date.now();
  let last = startedAt;

  scoreCtx.timerId = setInterval(()=>{
    const now = Date.now();
    const delta = now - last;
    last = now;

    scoreCtx.remainMs -= delta;
    if (scoreCtx.remainMs < 0) scoreCtx.remainMs = 0;

    byId('scoreTimer').textContent = fmtMMSS(scoreCtx.remainMs);

    if (scoreCtx.remainMs <= 0){
      clearInterval(scoreCtx.timerId); scoreCtx.timerId=null; scoreCtx.running=false;
      const msg = 'Waktu habis untuk ronde ini.\nKlik OK untuk menyimpan skor saat ini.';
      // Tanpa alert; langsung tampilkan status selesai di UI
      const __t = byId('scoreTimer'); if (__t) __t.textContent = 'Permainan Selesai';
      setScoreModalLocked(true);
      // auto commit skor → sama seperti Finish tapi TANPA konfirmasi tambahan
      {
        const zero = (Number(scoreCtx.a)===0 && Number(scoreCtx.b)===0);
        if (zero){
          alert('Skor masih 0-0. Skor tidak akan disimpan.');
          try{ const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {}; delete r.startedAt; delete r.finishedAt; }catch{}
          try{ setScoreModalPreStart(true); }catch{}
          try{
            const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
            const actions = row?.querySelector('.rnd-col-actions');
            const live = actions?.querySelector('.live-badge'); if (live){ live.classList.add('fade-out'); setTimeout(()=>{ live.classList.add('hidden'); live.classList.remove('fade-out'); },150); }
            const done = actions?.querySelector('.done-badge'); if (done){ done.classList.add('fade-out'); setTimeout(()=>{ done.classList.add('hidden'); done.classList.remove('fade-out'); },150); }
            const startBtn = actions?.querySelector('button'); if (startBtn){ startBtn.textContent='Mulai Main'; startBtn.classList.remove('hidden'); startBtn.classList.add('fade-in'); setTimeout(()=>startBtn.classList.remove('fade-in'),200); }
          }catch{}
          markDirty();
          try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
          closeScoreModal();
        } else {
          commitScoreToRound(/*auto*/true);
        }
      }
      // Jangan tutup modal; biarkan pengguna melihat status dan klik "Hitung Ulang"
    }
  }, 250);
}

function commitScoreToRound(auto=false){
  const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round];
  if(!r){ alert('Match tidak ditemukan.'); return; }

  if (!auto){
    const msg = `Simpan skor untuk Lap ${scoreCtx.court+1} • Match ${scoreCtx.round+1}\n`+
                `A (${r.a1} & ${r.a2}) : ${scoreCtx.a}\n`+
                `B (${r.b1} & ${r.b2}) : ${scoreCtx.b}`;
    if(!confirm(msg)) return;
  }
  r.scoreA = String(scoreCtx.a);
  r.scoreB = String(scoreCtx.b);
  try{ r.finishedAt = new Date().toISOString(); }catch{}

  markDirty();
  renderAll();
  computeStandings();

  // Auto-simpan ke Cloud setelah skor dimasukkan (Finish atau waktu habis)
  try {
    if (typeof isCloudMode === 'function' && isCloudMode()) {
      // simpan tanpa overlay agar cepat
      if (typeof maybeAutoSaveCloud === 'function') {
        maybeAutoSaveCloud();
      } else if (typeof saveStateToCloud === 'function') {
        // fallback langsung
        saveStateToCloud();
      }
    }
  } catch (e) {
    console.warn('Autosave cloud setelah commit skor gagal:', e);
  }

  // Inline update badges for quick feedback
  try{
    const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
    const actions = row?.querySelector('.rnd-col-actions');
    const live = actions?.querySelector('.live-badge');
    const done = actions?.querySelector('.done-badge');
    if (live){ live.classList.add('fade-out'); setTimeout(()=>{ live.classList.add('hidden'); live.classList.remove('fade-out'); },150); }
    if (done){ done.classList.remove('hidden'); done.classList.add('fade-in'); setTimeout(()=>done.classList.remove('fade-in'),200); }
  }catch{}
}


function updateScoreDisplay(){
  byId('scoreAVal').textContent = scoreCtx.a;
  byId('scoreBVal').textContent = scoreCtx.b;
  renderServeBadgeInModal();

  // Sinkronkan skor ke state ronde yang sedang dibuka agar tabel match ikut terupdate
  try{
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round];
    if (r){
      r.scoreA = String(scoreCtx.a);
      r.scoreB = String(scoreCtx.b);
      markDirty();

      // Update tampilan skor di tabel secara langsung tanpa renderAll
      try{
        const row = document.querySelector(`.rnd-table tbody tr[data-index="${scoreCtx.round}"]`);
        const aInp = row?.querySelector('.rnd-scoreA input');
        const bInp = row?.querySelector('.rnd-scoreB input');
        if (aInp) aInp.value = String(scoreCtx.a);
        if (bInp) bInp.value = String(scoreCtx.b);
      }catch{}

      // Autosave debounced ke Cloud supaya viewer lain melihat realtime
      saveLiveScoreDebounced();
    }
  }catch{}
}

// EVENTS
byId("btnTheme").addEventListener("click", toggleTheme);

// Manual Save: tunjukkan loading & sukses di tombol
byId('btnSave')?.addEventListener('click', async ()=>{
  const btn = byId('btnSave'); if (!btn) return;
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = 'Saving...';
  try{
    let ok = false;
    if (isCloudMode()) ok = await saveStateToCloudWithLoading();
    else ok = saveToStore();
    if (ok !== false){
      btn.textContent = 'Saved ✓';
      setTimeout(()=>{ btn.textContent = old || 'Save'; btn.disabled = false; }, 1200);
    } else {
      btn.textContent = old || 'Save'; btn.disabled = false;
    }
  }catch(e){
    console.error(e);
    btn.textContent = old || 'Save'; btn.disabled = false;
    alert('Gagal menyimpan.');
  }
});

// Header menu toggle (HP)
const btnHdrMenu = document.getElementById("btnHdrMenu");
if (btnHdrMenu) {
  btnHdrMenu.addEventListener("click", () => {
    const panel = document.getElementById("hdrControls");
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) panel.classList.add("hdr-slide");
    setTimeout(() => panel.classList.remove("hdr-slide"), 220);
  });
  window.addEventListener("resize", () => {
    const panel = document.getElementById("hdrControls");
    if (window.innerWidth >= 768) panel.classList.remove("hidden");
  });
}

// Filter panel toggle (HP)
const btnFilter = document.getElementById("btnFilter");
if (btnFilter) {
  btnFilter.addEventListener("click", () => {
    try { if (typeof isViewer === 'function' && isViewer()) return; } catch {}
    const panel = document.getElementById("filterPanel");
    const willShow = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    btnFilter.textContent = willShow
      ? "🔎 Sembunyikan Filter"
      : "🔎 Filter / Jadwal";
    if (willShow) panel.classList.add("filter-slide");
    setTimeout(() => panel.classList.remove("filter-slide"), 220);
  });
  window.addEventListener("resize", () => {
    const panel = document.getElementById("filterPanel");
    try {
      if (window.innerWidth >= 768 && !(typeof isViewer === 'function' && isViewer())) {
        panel.classList.remove("hidden");
      }
    } catch {}
  });
}

byId("btnCollapsePlayers").addEventListener("click", () =>
  byId("playersPanel").classList.toggle("hidden")
);

byId('btnResetActive').addEventListener('click', ()=>{
  const arr = roundsByCourt[activeCourt] || [];
  const has = arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB));
  if(has && !confirm('Data pada lapangan aktif akan dihapus. Lanjutkan?')) return;
  roundsByCourt[activeCourt] = [];
  markDirty(); renderAll();refreshFairness();
});

byId('btnClearScoresActive').addEventListener('click', clearScoresActive);
byId('btnClearScoresAll').addEventListener('click', clearScoresAll);
// save ke cloud atau local storage
byId('btnSave')?.addEventListener('click', async () => {
  console.log(isCloudMode());
  if (isCloudMode()) {
    console.log('Menyimpan ke cloud...');
    const ok = await saveStateToCloudWithLoading();
    if (!ok) alert('Gagal menyimpan ke Cloud. Coba lagi.');
  } else {
    const ok = saveToStore?.();
    console.log('Menyimpan ke json...');
    if (!ok) alert('Gagal menyimpan ke Local Storage.');
  }
});
// byId("btnLoadByDate").addEventListener("click", loadSessionByDate);
// byId("btnImportJSON").addEventListener("click", () =>
//   byId("fileInputJSON").click()
// );
// byId("fileInputJSON").addEventListener("change", (e) => {
//   if (e.target.files && e.target.files[0]) loadJSONFromFile(e.target.files[0]);
//   e.target.value = "";
// });

byId("startTime").addEventListener("change", () => {
  markDirty();
  renderAll();
  try{ renderFilterSummary(); }catch{}
});
byId("minutesPerRound").addEventListener("input", () => {
  markDirty();
  renderAll();
  try{ renderFilterSummary(); }catch{}
});
byId("roundCount").addEventListener("input", () => {
  markDirty();
  renderAll();
  try{ renderFilterSummary(); }catch{}
});

// tanggal sesi diubah
byId('sessionDate')?.addEventListener('change', async (e) => {
  currentSessionDate = normalizeDateKey(e.target.value);
  const url = new URL(location.href);
  url.searchParams.set('date', currentSessionDate);
  history.replaceState({}, "", url);

  if (isCloudMode()) {
    // const ok = await loadStateFromCloud();
    if (!ok) {
      seedDefaultIfEmpty?.();
      renderAll?.();
      // await saveStateToCloud();
    } else {
      renderAll?.();
    }
  } else {
    // fallback lokal
    const all = readAllSessionsLS?.() || {};
    if (all[currentSessionDate]) {
      applyPayload(all[currentSessionDate]);
    } else {
      seedDefaultIfEmpty?.();
      saveToStoreSilent?.();
    }
    renderAll?.();
  }
  try{ renderFilterSummary(); }catch{}
});


// removed: btnLoadByDate handler (deprecated)


byId("btnAddPlayer").addEventListener("click", () => {
  const v = byId("newPlayer").value;
  const changed = addPlayer(v);
  if (changed) { try { maybeAutoSaveCloud(true); } catch {} }
});
byId("newPlayer").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    byId("btnAddPlayer").click();
  }
});
byId("btnClearPlayers").addEventListener("click", () => {
  if (!confirm("Kosongkan semua pemain dan waiting list?")) return;
  players = [];
  try{
    if (!Array.isArray(waitingList)) waitingList = [];
    waitingList.splice(0, waitingList.length);
    window.waitingList = waitingList;
  }catch{}
  try{ Object.keys(playerMeta||{}).forEach(k => delete playerMeta[k]); }catch{}
  markDirty();
  renderPlayersList?.();
  try{ renderViewerPlayersList?.(); }catch{}
  validateNames?.();
  showToast?.('Semua pemain dan waiting list telah dikosongkan','success');
  try{ maybeAutoSaveCloud(); }catch{}
});
byId("btnPasteText").addEventListener("click", () => {
  showTextModal();
  byId("playersText").focus();
});
byId("btnApplyText").addEventListener("click", () => {
  const newList = parsePlayersText(byId("playersText").value);
  const oldActive = Array.isArray(players) ? players.slice() : [];
  const cap = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : Infinity;
  const newActive = newList.slice(0, cap);
  const overflow = newList.slice(newActive.length);
  // start from existing waitingList, drop those that moved to active
  let newWaiting = Array.isArray(waitingList) ? waitingList.slice() : [];
  newWaiting = newWaiting.filter(n => !newActive.includes(n));
  // append overflow that aren't already in active or waiting
  for (const n of overflow){
    if (!newActive.includes(n) && !newWaiting.includes(n)) newWaiting.push(n);
  }
  // Robust multi-rename detection (LVS-based)
  try{
    const pairs = computeRenamePairs(oldActive, newActive) || [];
    if (typeof replaceNameInRounds === 'function'){
      pairs.forEach(([o,n])=>{ if (o && n) replaceNameInRounds(o,n); });
    }
  }catch{}
  players = newActive;
  if (!Array.isArray(waitingList)) waitingList = [];
  waitingList.splice(0, waitingList.length, ...newWaiting);
  window.waitingList = waitingList;
  if (overflow.length > 0 && cap !== Infinity) {
    showToast('Beberapa nama masuk waiting list karena list penuh', 'warn');
  }
  hideTextModal();
  markDirty();
  renderPlayersList();
  renderAll?.();
  validateNames();
  try{ maybeAutoSaveCloud(); }catch{}
});
byId("btnCancelText").addEventListener("click", hideTextModal);

// Boot
// (function boot() {
//   applyThemeFromStorage();
//   if (!byId("sessionDate").value) {
//     const d = new Date();
//     const s =
//       d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
//     byId("sessionDate").value = s;
//   }
//   players = [
//     "Della",
//     "Rangga",
//     "Fai",
//     "Gizla",
//     "Abdi",
//     "Diana",
//     "Kris",
//     "Ichsan",
//     "Marchel",
//     "Altundri",
//     "Ferdi",
//     "Tyas",
//   ];
//   renderPlayersList();
//   renderAll();
//   validateNames();
//   startAutoSave();
// })();

async function boot() {
  applyThemeFromStorage?.();

  // Set tanggal default di input (hari ini) kalau kosong
  if (!byId("sessionDate").value) {
    byId("sessionDate").value = new Date().toISOString().slice(0,10);
  }

  const params = getUrlParams();
  currentSessionDate = normalizeDateKey(params.date || byId("sessionDate").value);
  byId("sessionDate").value = currentSessionDate;

  // ⬇️ Mode Cloud hanya jika ada event UUID valid di URL
  currentEventId = (params.event && isUuid(params.event)) ? params.event : null;

  if (isCloudMode()) {
    // --- CLOUD MODE ---
    const t = await fetchEventTitleFromDB(currentEventId); // optional (judul)
    if (t) setAppTitle(t);

    const ok = await loadStateFromCloud();
    if (!ok) {
      seedDefaultIfEmpty?.();
      renderPlayersList?.(); renderAll?.(); validateNames?.();
      await saveStateToCloud();
    } else {
      renderPlayersList?.(); renderAll?.(); validateNames?.();
    }
    subscribeRealtimeForState?.();
    startAutoSave?.();
    return;
  }

  // --- LOCAL MODE (tanpa ?event=) ---
  setAppTitle('Mix Americano'); // default judul lokal
  const all = readAllSessionsLS?.() || {};
  if (all[currentSessionDate]) {
    applyPayload(all[currentSessionDate]);
    markSaved?.(all.__lastTs || new Date().toISOString());
  } else {
    seedDefaultIfEmpty?.();
    // simpan seed pertama agar konsisten
    const payload = currentPayload();
    all[currentSessionDate] = payload;
    all.__lastTs = payload.ts;
    writeAllSessionsLS(all);
    markSaved?.(payload.ts);
  }
  renderPlayersList?.();
  renderAll?.();
  validateNames?.();
  startAutoSave?.();
}





// helper kecil: seed default jika players kosong
function seedDefaultIfEmpty(){
  if (!Array.isArray(window.players) || window.players.length === 0) {
    window.players = [
      "Della","Rangga","Fai","Gizla","Abdi","Diana",
      "Kris","Ichsan","Marchel","Altundri","Ferdi","Tyas",
    ];
  }
  window.playerMeta = window.playerMeta || {};
  window.waitingList = window.waitingList || [];
  if (!Array.isArray(window.roundsByCourt) || window.roundsByCourt.length === 0) {
    const R = parseInt(byId('roundCount')?.value || '10', 10);
    window.roundsByCourt = [
      Array.from({length:R}, () => ({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''}))
    ];
  }
  // kalau kamu pakai courts[], samakan juga:
  if (!Array.isArray(window.courts) || window.courts.length === 0) {
    window.courts = roundsByCourt.map((rounds,i)=>({ name:`Lapangan ${i+1}`, rounds }));
  }
}


// Report events (temporarily hidden/inactive)
const _btnReport = byId('btnReport');
if (_btnReport) _btnReport.classList.add('hidden');
byId('btnReport').addEventListener('click', ()=>{
  const keys = Object.keys(store.sessions||{}).sort();
  byId('repFrom').value = keys[0] || byId('sessionDate').value;
  byId('repTo').value   = keys[keys.length-1] || byId('sessionDate').value;
  openReportModal();
  runReport();
});
byId('btnReportClose').addEventListener('click', closeReportModal);
byId('btnRunReport').addEventListener('click', runReport);

byId('btnAddCourt').addEventListener('click', ()=>{
  const R = parseInt(byId('roundCount').value || '10', 10);
  const arr = Array.from({length:R}, ()=>({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''}));
  roundsByCourt.push(arr);
  activeCourt = roundsByCourt.length - 1;
  markDirty();
  renderAll();
});
byId('pairMode').addEventListener('change', ()=>{
  markDirty();
  validateNames();
});
byId('btnApplyPlayersActive').addEventListener('click', ()=>{
  const ok = validateNames(); // jalankan dulu
  const pm = byId('pairMode') ? byId('pairMode').value : 'free';
  if (!ok && pm !== 'free'){
    const proceed = confirm('Beberapa pemain belum melengkapi data sesuai mode pairing. Tetap lanjutkan?');
    if (!proceed) return;
  }
  const arr = roundsByCourt[activeCourt] || [];
  const has = arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB));
  if(has && !confirm('Menerapkan pemain akan reset pairing+skor pada lapangan aktif. Lanjutkan?')) return;
  autoFillActiveCourt(); markDirty(); renderAll(); computeStandings();refreshFairness();
  markDirty();
  renderPlayersList();
});
// Modal Hitung Skor
byId('btnCloseScore').addEventListener('click', onCloseScoreClick);

byId('btnAPlus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.a = Math.min(999, scoreCtx.a + 1); updateScoreDisplay(); });
byId('btnAMinus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.a = Math.max(0,   scoreCtx.a - 1); updateScoreDisplay(); });
byId('btnBPlus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.b = Math.min(999, scoreCtx.b + 1); updateScoreDisplay(); });
byId('btnBMinus').addEventListener('click', ()=>{ if (!canEditScore()) return; scoreCtx.b = Math.max(0,   scoreCtx.b - 1); updateScoreDisplay(); });
// Set skor seri (rata-rata, dibulatkan ke bawah)
// byId('btnTie').addEventListener('click', ()=>{
//   const avg = Math.max(scoreCtx.a, scoreCtx.b);
//   scoreCtx.a = avg; scoreCtx.b = avg;
//   updateScoreDisplay();
// });

// tutup modal jika klik backdrop
byId('scoreModal').addEventListener('click', (e)=>{ if(e.target.id === 'scoreModal') onCloseScoreClick(); });
// Start timer
byId('btnStartTimer').addEventListener('click', startScoreTimer);

// Finish manual (tetap dengan konfirmasi)
byId('btnFinishScore').addEventListener('click', ()=>{
  if (!canEditScore()) return;
  // Blokir finish jika skor 0-0
  if (Number(scoreCtx.a)===0 && Number(scoreCtx.b)===0){
    alert('Skor masih 0-0. Skor belum disimpan.');
    return;
  }
  // Konfirmasi di sini agar Cancel tidak menutup popup
  try{
    const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
    const msg = 'Simpan skor untuk Lap '+(scoreCtx.court+1)+' - Match '+(scoreCtx.round+1)+'\n'
      + 'A ('+(r.a1||'-')+' & '+(r.a2||'-')+') : '+scoreCtx.a+'\n'
      + 'B ('+(r.b1||'-')+' & '+(r.b2||'-')+') : '+scoreCtx.b;
    if (!confirm(msg)) return; // jangan tutup popup jika batal
  }catch{}
  // Simpan tanpa prompt lagi, lalu tutup
  commitScoreToRound(/*auto*/true);
  closeScoreModal();
});

byId('btnRecalc').addEventListener('click', ()=>{
  if (!canEditScore()) return;
  setScoreModalLocked(false);                  // munculkan semua kontrol
  const start = byId('btnStartTimer'); if (start) start.disabled = true;   // tidak boleh start ulang
  const t = byId('scoreTimer');     if (t)     t.textContent = 'Permainan Selesai';
});

// Reset skor & timer (tapi tidak menghapus skor di ronde)
byId('btnResetScore').addEventListener('click', ()=>{
  if (!canEditScore()) return;
  const r = (roundsByCourt[scoreCtx.court] || [])[scoreCtx.round] || {};
  // Pulihkan skor ke awal jika ada cadangan; jika tidak, set 0
  const prevA = (typeof r._prevScoreA !== 'undefined') ? r._prevScoreA : '';
  const prevB = (typeof r._prevScoreB !== 'undefined') ? r._prevScoreB : '';
  scoreCtx.a = Number(prevA || 0);
  scoreCtx.b = Number(prevB || 0);
  try{ delete r._prevScoreA; delete r._prevScoreB; }catch{}
  // Update tampilan skor di modal saja, lalu kosongkan nilai di data ronde supaya tidak dianggap selesai (0-0 bukan skor final)
  updateScoreDisplay();
  try{ r.scoreA = ''; r.scoreB = ''; }catch{}
  try{
    const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
    const aInp = row?.querySelector('.rnd-scoreA input');
    const bInp = row?.querySelector('.rnd-scoreB input');
    if (aInp) aInp.value = '';
    if (bInp) bInp.value = '';
  }catch{}
  // Hapus startedAt agar kembali ke pra-mulai
  try{ delete r.startedAt; }catch{}
  try{ delete r.finishedAt; }catch{}
  setScoreModalPreStart(true); // sembunyikan +/- , tampilkan Mulai
  // reset timer tampilan juga
  const minutes = parseInt(byId('minutesPerRound').value || '12', 10);
  scoreCtx.remainMs = minutes * 60 * 1000;
  byId('scoreTimer').textContent = fmtMMSS(scoreCtx.remainMs);
  // hentikan timer jika sedang berjalan
  if (scoreCtx.timerId){ try{ clearInterval(scoreCtx.timerId); }catch{} scoreCtx.timerId = null; }
  scoreCtx.running = false;
  try{ const btn = byId('btnStartTimer'); if (btn){ btn.disabled = false; btn.classList.remove('hidden'); } }catch{}
  // Update table UI badges/tombol
  try{
    const row = document.querySelector('.rnd-table tbody tr[data-index="'+scoreCtx.round+'"]');
    const actions = row?.querySelector('.rnd-col-actions');
    const live = actions?.querySelector('.live-badge'); if (live){ live.classList.add('fade-out'); setTimeout(()=>{ live.classList.add('hidden'); live.classList.remove('fade-out'); },150); }
    const done = actions?.querySelector('.done-badge'); if (done){ done.classList.add('fade-out'); setTimeout(()=>{ done.classList.add('hidden'); done.classList.remove('fade-out'); },150); }
    const btn = actions?.querySelector('button'); if (btn){ btn.textContent='Mulai Main'; btn.classList.remove('hidden'); btn.classList.add('fade-in'); setTimeout(()=>btn.classList.remove('fade-in'),200); }
  }catch{}
  // Persist ke Cloud
  markDirty();
  try{ if (typeof maybeAutoSaveCloud === 'function') maybeAutoSaveCloud(); else if (typeof saveStateToCloud === 'function') saveStateToCloud(); }catch{}
});
['minutesPerRound','breakPerRound','showBreakRows','startTime'].forEach(id=>{
  const el = byId(id);
  if(!el) return;
  el.addEventListener('change', ()=>{
    markDirty();
    renderAll();          // waktu & baris jeda ikut update
    validateAll();
    try{ renderHeaderChips(); }catch{}
  });
});
// Update chips on date change as well
try{ byId('sessionDate')?.addEventListener('change', ()=>{ try{ renderHeaderChips(); }catch{} }); }catch{}
// ===== Expand/Collapse "Filter / Jadwal" =====
(function(){
  const KEY = 'ui.filter.expanded';
  const btn = document.getElementById('btnFilterToggle');
  const chevron = document.getElementById('filterChevron');
  const panel = document.getElementById('filterPanel');

  if(!btn || !panel) return;

  // state awal: dari localStorage (default: expanded)
  let open = localStorage.getItem(KEY);
  if (open === null) {
    // kalau device pendek-lanskap -> start collapsed
    const isShortLandscape = window.matchMedia('(orientation: landscape) and (max-height: 480px)').matches;
    open = isShortLandscape ? '0' : '1';
  }
  open = open === '1';
  if (open) panel.classList.add('open'); else panel.classList.remove('open');
  chevron.textContent = open ? '▴' : '▾';

  btn.addEventListener('click', ()=>{
    panel.classList.toggle('open');
    const nowOpen = panel.classList.contains('open');
    chevron.textContent = nowOpen ? '▴' : '▾';
    localStorage.setItem(KEY, nowOpen ? '1' : '0');
  });
})();

// Fallback: sebelum keluar/refresh, commit autosave
window.addEventListener('beforeunload', saveToLocalSilent);


// Ketika ganti tanggal → simpan dulu yang lama, lalu load tanggal baru
// byId('sessionDate')?.addEventListener('change', () => {
//   saveToLocalSilent();
//   const d = normalizeDateKey(byId('sessionDate').value || '');
//   const all = readAllSessionsLS();
//   if (all[d]) applyPayload(all[d]);
//   else {
//     // tidak ada data tanggal tsb → kosongkan view sesuai setting sekarang
//     renderAll?.();
//     byId("unsavedDot")?.classList.add("hidden");
//   }
// });

byId('btnApplyPlayerTemplate')?.addEventListener('click', () => {
  if (confirm('Terapkan template pemain 10 orang? Daftar sekarang akan diganti.')) {
    applyDefaultPlayersTemplate();
  }
});




function fitPlayersScroll() {
  const panel = document.getElementById('playersPanel');
  const sc    = document.getElementById('playerListContainer');
  if (!panel || !sc || panel.classList.contains('hidden')) return;

  const rect = panel.getBoundingClientRect();
  const vh   = window.innerHeight || document.documentElement.clientHeight;

  // Tinggi sisa viewport dari atas panel sampai bawah, minus sedikit padding
  const h = Math.max(220, vh - rect.top - 12);
  sc.style.maxHeight = h + 'px';
}

// Panggil saat awal, saat resize/orientasi berubah, dan ketika panel dibuka
window.addEventListener('resize', fitPlayersScroll);
window.addEventListener('orientationchange', fitPlayersScroll);
document.addEventListener('DOMContentLoaded', fitPlayersScroll);

// Jika kamu punya tombol collapse pemain, ukur ulang setelah transisi
document.getElementById('btnCollapsePlayers')?.addEventListener('click', () => {
  setTimeout(fitPlayersScroll, 180);
});

// Setelah renderPlayersList selesai, ukur ulang juga
const _renderPlayersList = window.renderPlayersList;
window.renderPlayersList = function(...args){
  const r = _renderPlayersList?.apply(this, args);
  requestAnimationFrame(fitPlayersScroll);
  return r;
};

// Buka modal
// Open Create Event modal (extracted)
function setEventModalTab(mode){
  const isCreate = mode !== "search";
  const tCreate = document.getElementById("tabCreateEvent");
  const tSearch = document.getElementById("tabSearchEvent");
  const fCreate = document.getElementById("eventForm");
  const fSearch = document.getElementById("eventSearchForm");
  if (fCreate) fCreate.classList.toggle("hidden", !isCreate);
  if (fSearch) fSearch.classList.toggle("hidden", isCreate);
  const succ = document.getElementById("eventSuccess"); if (succ) succ.classList.add("hidden");
  if (tCreate){ tCreate.classList.toggle("bg-indigo-600", isCreate); tCreate.classList.toggle("text-white", isCreate); }
  if (tSearch){ tSearch.classList.toggle("bg-indigo-600", !isCreate); tSearch.classList.toggle("text-white", !isCreate); }
  // Ensure tabs are visible and title set for Create/Search context
  const tabs = document.getElementById('eventTabs'); if (tabs) tabs.classList.remove('hidden');
  const titleEl = document.querySelector('#eventModal h3'); if (titleEl) titleEl.textContent = 'Buat/Cari Event';
  // If editor link row exists from previous share, show it back in create/search context
  const ed = document.getElementById('eventEditorLinkOutput');
  if (ed && ed.parentElement) ed.parentElement.classList.remove('hidden');

  // When switching to Create tab, ensure optional location inputs exist
  if (isCreate) {
    try{
      const form = byId('eventForm');
      if (form && !byId('eventLocationInput')){
        const wrap = document.createElement('div');
        wrap.innerHTML = `
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Lokasi (opsional)</label>
            <input id="eventLocationInput" type="text" placeholder="Mis. Lapangan A, GBK"
                  class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
          </div>
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Link Maps (opsional)</label>
            <input id="eventLocationUrlInput" type="url" placeholder="https://maps.app.goo.gl/..."
                  class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
          </div>`;
        const btn = byId('eventCreateBtn');
        if (btn) form.insertBefore(wrap, btn);
        else form.appendChild(wrap);
      }
    }catch{}
  }
}
function openCreateEventModal(){
  setEventModalTab("create"); byId('eventDateInput').value = byId('sessionDate').value || new Date().toISOString().slice(0,10);
  byId('eventNameInput').value = document.querySelector('h1')?.textContent?.trim() || '';
  byId('eventModal').classList.remove('hidden');
  // Ensure optional location fields exist in form
  try{
    const form = byId('eventForm');
    if (form && !byId('eventLocationInput')){
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Lokasi (opsional)</label>
          <input id="eventLocationInput" type="text" placeholder="Mis. Lapangan A, GBK"
                class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
        </div>
        <div>
          <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">Link Maps (opsional)</label>
          <input id="eventLocationUrlInput" type="url" placeholder="https://maps.app.goo.gl/..."
                class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
        </div>`;
      // insert before create button
      const btn = byId('eventCreateBtn');
      if (btn) form.insertBefore(wrap, btn);
      else form.appendChild(wrap);
    }
  }catch{}
}

// Helpers for Search Event modal
async function getMyEventIds(){
  try{
    showLoading('Memuat daftar event…');
    const { data: ud } = await sb.auth.getUser();
    const uid = ud?.user?.id || null;
    if (!uid) { hideLoading(); return []; }
    const out = new Set();
    // owned events
    try{
      const { data: owned } = await sb.from('events').select('id').eq('owner_id', uid);
      (owned||[]).forEach(r=> out.add(r.id));
    }catch{}
    // member events
    try{
      const { data: mems } = await sb.from('event_members').select('event_id').eq('user_id', uid);
      (mems||[]).forEach(r=> out.add(r.event_id));
    }catch{}
    hideLoading();
    return Array.from(out);
  }catch{ hideLoading(); return []; }
}

async function loadSearchDates(){
  const sel = byId('searchDateSelect'); if (!sel) return;
  sel.innerHTML = '<option value="">Pilih tanggal…</option>';
  const ids = await getMyEventIds();
  if (!ids.length) return;
  try{
    showLoading('Memuat tanggal…');
    const { data: rows } = await sb.from('event_states')
      .select('session_date')
      .in('event_id', ids)
      .order('session_date', { ascending: false });
    const seen = new Set();
    (rows||[]).forEach(r=>{ if (r.session_date && !seen.has(r.session_date)) { seen.add(r.session_date); const o=document.createElement('option'); o.value=r.session_date; o.textContent=r.session_date; sel.appendChild(o);} });
    // preselect current date if exists; otherwise select latest (first option)
    const cur = normalizeDateKey(byId('sessionDate')?.value || '');
    if (cur && seen.has(cur)) {
      sel.value = cur;
    } else {
      const first = sel.querySelector('option[value]:not([value=""])');
      if (first) sel.value = first.value;
    }
  }catch{}
  finally { hideLoading(); }
}

async function loadSearchEventsForDate(dateStr){
  const evSel = byId('searchEventSelect'); const btnOpen = byId('openEventBtn');
  if (!evSel) return;
  evSel.innerHTML = '<option value="">Memuat…</option>';
  btnOpen && (btnOpen.disabled = true);
  const delBtn = byId('deleteEventBtn'); if (delBtn) delBtn.disabled = true;
  const ids = await getMyEventIds();
  if (!ids.length || !dateStr){ evSel.innerHTML = '<option value="">– Tidak ada –</option>'; return; }
  try{
    showLoading('Memuat event…');
    const { data: states } = await sb.from('event_states')
      .select('event_id, updated_at')
      .eq('session_date', dateStr)
      .in('event_id', ids)
      .order('updated_at', { ascending: false });
    const eids = Array.from(new Set((states||[]).map(r=>r.event_id).filter(Boolean)));
    if (!eids.length){ evSel.innerHTML = '<option value="">– Tidak ada –</option>'; return; }
    const { data: evs } = await sb.from('events').select('id,title').in('id', eids);
    const titleMap = new Map((evs||[]).map(r=>[r.id, r.title || r.id]));
    evSel.innerHTML = '';
    eids.forEach(id=>{
      const o = document.createElement('option'); o.value = id; o.textContent = titleMap.get(id) || id; evSel.appendChild(o);
    });
    // Pastikan ada yang terseleksi (default ke pertama)
    if (!evSel.value && evSel.options.length > 0) evSel.value = evSel.options[0].value;
    btnOpen && (btnOpen.disabled = false);
    if (delBtn) delBtn.disabled = !(evSel.value && evSel.value.length > 0);
    try{ evSel.dispatchEvent(new Event('change')); }catch{}
  }catch{
    evSel.innerHTML = '<option value="">- Gagal memuat -</option>';
  } finally { hideLoading(); }
}

async function switchToEvent(eventId, dateStr){
  try{
    showLoading('Membuka event…');
    // Putuskan channel realtime sebelumnya bila ada
    try{ unsubscribeRealtimeForState?.(); }catch{}
    currentEventId = eventId; currentSessionDate = normalizeDateKey(dateStr);
    const url = new URL(location.href); url.searchParams.set('event', eventId); url.searchParams.set('date', currentSessionDate); history.replaceState({}, '', url);
    const meta = await fetchEventMetaFromDB(eventId);
    if (meta?.title) setAppTitle(meta.title);
    renderEventLocation(meta?.location_text || '', meta?.location_url || '');
    try{ ensureLocationFields(); await loadLocationFromDB(); }catch{}
    const ok = await loadStateFromCloud();
    if (!ok){ seedDefaultIfEmpty?.(); }
    renderPlayersList?.(); renderAll?.(); validateNames?.();
    subscribeRealtimeForState?.();
    startAutoSave?.();
    loadAccessRoleFromCloud?.();
    refreshEventButtonLabel?.();
    updateEventActionButtons?.();
    refreshJoinUI?.();
  }catch(e){ console.warn('switchToEvent failed', e); }
  finally { hideLoading(); }
}

function openSearchEventModal(){ setEventModalTab('search');
  const m = byId('eventModal'); if (!m) return;
  m.classList.remove('hidden');
  // reset
  const evSel = byId('searchEventSelect'); if (evSel) { evSel.innerHTML = '<option value="">- Pilih tanggal dulu -</option>'; }
  const btn = byId('openEventBtn'); if (btn) btn.disabled = true;
  ensureDeleteEventButton();
  // load dates then events for initial selection
  (async ()=>{
    await loadSearchDates();
    const d = byId('searchDateSelect')?.value || '';
    if (d) await loadSearchEventsForDate(d);
  })();
}

// Unified click behavior for header button
byId('btnMakeEventLink')?.addEventListener('click', async () => {
  const user = await getCurrentUser();
  // jika sudah login, buka tab Cari agar langsung bisa memilih
  if (user) openSearchEventModal(); else openCreateEventModal();
});
// Open Share/Invite for current event anytime
function openShareEventModal(){
  if (!isCloudMode() || !currentEventId){ openCreateEventModal(); return; }
  const m = byId('eventModal'); if (!m) return;
  // show modal
  m.classList.remove('hidden');
  // adjust header/title and hide Buat/Cari tabs for share-only view
  const titleEl = m.querySelector('h3'); if (titleEl) titleEl.textContent = 'Share / Undang';
  const tabs = byId('eventTabs'); if (tabs) tabs.classList.add('hidden');
  // show success panel, hide form
  byId('eventForm')?.classList.add('hidden');
  byId('eventSearchForm')?.classList.add('hidden');
  byId('eventSuccess')?.classList.remove('hidden');
  // neutralize success info text for share context
  (function tweakShareInfo(){
    const sb = byId('eventSuccess');
    const info = sb?.querySelector('.p-3');
    if (info) info.textContent = 'Bagikan Link Event';
  })();
  // ensure viewer link (public viewer, clean params)
  const d = byId('sessionDate')?.value || currentSessionDate || new Date().toISOString().slice(0,10);
  const viewerLink = buildPublicViewerUrl(currentEventId, d);
  const out = byId('eventLinkOutput'); if (out) out.value = viewerLink;

  // ensure extra field: Viewer (Hitung Skor) dengan ?view=1
  (function ensureScoreViewerField(){
    const successBox = byId('eventSuccess'); if (!successBox) return;
    let row = byId('eventViewerCalcRow');
    if (!row){
      row = document.createElement('div');
      row.id = 'eventViewerCalcRow';
      row.className = 'space-y-1';
      row.innerHTML = `
        <div class="text-xs text-gray-600 dark:text-gray-300">Link Viewer (boleh hitung skor)</div>
        <div class="flex items-center gap-2">
          <input id="eventViewerCalcLinkOutput" readonly class="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
          <button id="eventViewerCalcCopyBtn" class="px-3 py-2 rounded-lg bg-green-600 text-white text-sm">Copy</button>
        </div>`;
      successBox.appendChild(row);
      try{
        byId('eventViewerCalcCopyBtn').addEventListener('click', async ()=>{
          const v = byId('eventViewerCalcLinkOutput')?.value || '';
          await copyToClipboard(v);
          const btn = byId('eventViewerCalcCopyBtn'); if (btn){ btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy', 1200); }
        });
      }catch{}
    }
    const v2 = buildViewerUrl(currentEventId, d);
    const o2 = byId('eventViewerCalcLinkOutput'); if (o2) o2.value = v2;
  })();
  // hide editor link row in Share view to keep only viewer link and Invite
  (function hideEditorLinkInShare(){
    const inp = byId('eventEditorLinkOutput');
    if (inp && inp.parentElement) inp.parentElement.classList.add('hidden');
  })();
  // ensure invite form
  (function ensureInviteForm(){
    const successBox = byId('eventSuccess'); if (!successBox) return;
    if (byId('btnInviteMember')) return;
    const box = document.createElement('div');
    box.className = 'border-t dark:border-gray-700 pt-3 space-y-2';
    box.innerHTML = `
      <div class="text-sm font-semibold">Invite Anggota</div>
      <div class="text-xs text-gray-500 dark:text-gray-300">Masukkan email Supabase user (yang digunakan login), pilih role, lalu buat link undangan.</div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input id="inviteEmail" type="email" placeholder="email@example.com" class="flex-1 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
        <select id="inviteRole" class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
          <option value="editor">editor</option>
        </select>
        <button id="btnInviteMember" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm">Buat Link Undangan</button>
      </div>
      <div class="flex items-center gap-2 hidden" id="inviteLinkRow">
        <input id="inviteLinkOut" readonly class="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
        <button id="btnCopyInvite" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">Copy Link</button>
      </div>
      <div id="inviteMsg" class="text-xs"></div>`;
    successBox.appendChild(box);
    byId('btnInviteMember').addEventListener('click', async ()=>{
      const btn = byId('btnInviteMember');
      const email = (byId('inviteEmail').value||'').trim();
      const role = byId('inviteRole').value||'editor';
      const msg = byId('inviteMsg'); msg.textContent='';
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent='Email tidak valid.'; return; }
      if (!isCloudMode() || !currentEventId){ msg.textContent='Mode Cloud belum aktif. Buat event dulu.'; return; }
      try{
        if (btn){ btn.disabled = true; btn.textContent = 'Membuat…'; }
        const { data:ud } = await sb.auth.getUser();
        if (!ud?.user){ msg.textContent='Silakan login terlebih dahulu.'; return; }
        const { data: token, error } = await sb.rpc('create_event_invite', { p_event_id: currentEventId, p_email: email, p_role: role });
        if (error) throw error;
        const link = buildInviteUrl(currentEventId, byId('sessionDate').value || '', token);
        const row = byId('inviteLinkRow'); const out = byId('inviteLinkOut'); const cp = byId('btnCopyInvite');
        if (row && out && cp){ row.classList.remove('hidden'); out.value = link; msg.textContent='Link undangan dibuat. Kirimkan ke email terkait.'; cp.onclick = async ()=>{ try{ await navigator.clipboard.writeText(out.value); cp.textContent='Copied!'; setTimeout(()=>cp.textContent='Copy Link',1200);}catch{} }; }
      }catch(e){ console.error(e); msg.textContent = 'Gagal membuat link undangan' + (e?.message? ': '+e.message : ''); }
      finally { if (btn){ btn.disabled = false; btn.textContent = 'Buat Link Undangan'; } hideLoading(); }
    });
  })();
}
byId('btnShareEvent')?.addEventListener('click', openShareEventModal);
// Enhance players toolbar icons on startup
try{ setupPlayersToolbarUI?.(); }catch{}
// Tab handlers for Event modal
byId('tabCreateEvent')?.addEventListener('click', ()=>{ setEventModalTab('create'); });
byId('tabSearchEvent')?.addEventListener('click', async ()=>{ setEventModalTab('search'); await loadSearchDates(); const d = byId('searchDateSelect')?.value || ''; if (d) await loadSearchEventsForDate(d); });
byId('eventCancelBtn')?.addEventListener('click', () => {
  byId('eventModal').classList.add('hidden');
});

// Klik Create Event
byId('eventCreateBtn')?.addEventListener('click', async () => {
  const btnCreate = byId('eventCreateBtn');
  const oldText = btnCreate?.textContent;
  if (btnCreate) { btnCreate.disabled = true; btnCreate.textContent = 'Creating...'; }
  const name = (byId('eventNameInput').value || '').trim();
  const date = normalizeDateKey(byId('eventDateInput').value || '');
  if (!name || !date) { alert('Nama event dan tanggal wajib diisi.'); return; }

  try {
    // pastikan user login
    const { data: ud } = await sb.auth.getUser();
    if (!ud?.user) { byId('eventModal')?.classList.add('hidden'); byId('loginModal')?.classList.remove('hidden'); return; }

    const { id, created } = await createEventIfNotExists(name, date);
    if (!created) {
      alert('Event dengan nama itu di tanggal tersebut sudah ada.\nSilakan pilih nama lain atau tanggal lain.');
      return;
    }

    // update title
    setAppTitle(name);
    currentEventId = id;
    currentSessionDate = date;
    byId('sessionDate').value = date;

    // save optional location to events table
    try{
      const locText = (byId('eventLocationInput')?.value || '').trim();
      const locUrl  = (byId('eventLocationUrlInput')?.value || '').trim();
      if (locText || locUrl){
        await sb.from('events').update({ location_text: locText || null, location_url: locUrl || null }).eq('id', id);
        renderEventLocation(locText, locUrl);
      } else {
        renderEventLocation('', '');
      }
    }catch(e){ console.warn('Gagal menyimpan lokasi event:', e); }

    const url = new URL(location.href);
    url.searchParams.set('event', id);
    url.searchParams.set('date', date);
    history.replaceState({}, '', url);

    await saveStateToCloudWithLoading();
    subscribeRealtimeForState();
    startAutoSave();
    refreshEventButtonLabel?.();
    updateEventActionButtons?.();

    // tampilkan UI success: share link default = viewer (readonly) + embed owner
    const link = buildPublicViewerUrl(id, date);
    byId('eventForm').classList.add('hidden');
    byId('eventSuccess').classList.remove('hidden');
    // reset info text to creation success wording in create flow
    (function tweakCreateInfo(){
      const sb = byId('eventSuccess');
      const info = sb?.querySelector('.p-3');
      if (info) info.textContent = 'Event berhasil dibuat! Bagikan link berikut:';
    })();
    byId('eventLinkOutput').value = link;
    // Set also the score-only viewer link
    try{
      (function ensureScoreViewerField(){
        const successBox = byId('eventSuccess'); if (!successBox) return;
        let row = byId('eventViewerCalcRow');
        if (!row){
          row = document.createElement('div'); row.id='eventViewerCalcRow'; row.className='space-y-1';
          row.innerHTML = `
            <div class="text-xs text-gray-600 dark:text-gray-300">Link Viewer (boleh hitung skor)</div>
            <div class="flex items-center gap-2">
              <input id="eventViewerCalcLinkOutput" readonly class="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
              <button id="eventViewerCalcCopyBtn" class="px-3 py-2 rounded-lg bg-green-600 text-white text-sm">Copy</button>
            </div>`;
          successBox.appendChild(row);
          byId('eventViewerCalcCopyBtn').addEventListener('click', async ()=>{
            const v = byId('eventViewerCalcLinkOutput')?.value || '';
            await copyToClipboard(v);
            const btn = byId('eventViewerCalcCopyBtn'); if (btn){ btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy', 1200); }
          });
        }
        const v2 = buildViewerUrl(id, date);
        const o2 = byId('eventViewerCalcLinkOutput'); if (o2) o2.value = v2;
      })();
    }catch{}

    // HAPUS: tidak ada lagi editor link copy

    // tambahkan form invite sederhana bila belum ada
    (function ensureInviteForm(){
      const successBox = byId('eventSuccess'); if (!successBox) return;
      if (byId('btnInviteMember')) return;
      const box = document.createElement('div');
      box.className = 'border-t dark:border-gray-700 pt-3 space-y-2';
      box.innerHTML = `
        <div class="text-sm font-semibold">Invite Anggota</div>
        <div class="text-xs text-gray-500 dark:text-gray-300">Masukkan email Supabase user (yang digunakan login), pilih role, lalu buat link undangan.</div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input id="inviteEmail" type="email" placeholder="email@example.com" class="flex-1 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
          <select id="inviteRole" class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
            <option value="editor">editor</option>
          </select>
          <button id="btnInviteMember" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm">Buat Link Undangan</button>
        </div>
        <div class="flex items-center gap-2 hidden" id="inviteLinkRow">
          <input id="inviteLinkOut" readonly class="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
          <button id="btnCopyInvite" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">Copy Link</button>
        </div>
        <div id="inviteMsg" class="text-xs"></div>`;
      successBox.appendChild(box);
      byId('btnInviteMember').addEventListener('click', async ()=>{
        const btn = byId('btnInviteMember');
        const email = (byId('inviteEmail').value||'').trim();
        const role = byId('inviteRole').value||'editor';
        const msg = byId('inviteMsg'); msg.textContent='';
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent='Email tidak valid.'; return; }
        if (!isCloudMode() || !currentEventId){ msg.textContent='Mode Cloud belum aktif. Buat event dulu.'; return; }
        try{
          if (btn){ btn.disabled = true; btn.textContent = 'Membuat…'; }
          // Pastikan user login
          const { data:ud } = await sb.auth.getUser();
          if (!ud?.user){ msg.textContent='Silakan login terlebih dahulu.'; return; }

          // Panggil RPC SECURITY DEFINER agar lolos RLS dengan validasi owner/editor di sisi DB
          const { data: token, error } = await sb.rpc('create_event_invite', {
            p_event_id: currentEventId,
            p_email: email,
            p_role: role
          });
          if (error) throw error;

          const link = buildInviteUrl(currentEventId, byId('sessionDate').value || '', token);
          const row = byId('inviteLinkRow'); const out = byId('inviteLinkOut'); const cp = byId('btnCopyInvite');
          if (row && out && cp){ row.classList.remove('hidden'); out.value = link; msg.textContent='Link undangan dibuat. Kirimkan ke email terkait.';
            cp.onclick = async ()=>{ try{ await navigator.clipboard.writeText(out.value); cp.textContent='Copied!'; setTimeout(()=>cp.textContent='Copy Link',1200);}catch{} };
          }
        }catch(e){ console.error(e); msg.textContent = 'Gagal membuat link undangan' + (e?.message? ': '+e.message : ''); }
        finally { if (btn){ btn.disabled = false; btn.textContent = 'Buat Link Undangan'; } }
      });
  })();


  } catch (err) {
    console.error(err);
    alert('Gagal membuat event. Coba lagi.');
  } finally {
    if (btnCreate) { btnCreate.disabled = false; btnCreate.textContent = oldText || 'Create & Buat Link'; }
  }
  try{ updateAdminButtonsVisibility?.(); }catch{}
});

// Klik Copy Link
byId('eventCopyBtn')?.addEventListener('click', async () => {
  // Salin apa adanya dari field viewer publik (tanpa owner/view)
  const link = byId('eventLinkOutput').value;
  try {
    await navigator.clipboard.writeText(link);
    byId('eventCopyBtn').textContent = 'Copied!';
    setTimeout(()=> byId('eventCopyBtn').textContent = 'Copy', 2000);
  } catch {
    alert('Gagal menyalin link, salin manual: ' + link);
  }
});

// Search Event modal bindings
byId('searchCancelBtn')?.addEventListener('click', ()=> byId('eventModal')?.classList.add('hidden'));
byId('searchDateSelect')?.addEventListener('change', async ()=>{
  const d = byId('searchDateSelect')?.value || '';
  await loadSearchEventsForDate(d);
  const delBtn = byId('deleteEventBtn'); if (delBtn) delBtn.disabled = true;
});
byId('openEventBtn')?.addEventListener('click', async ()=>{
  const d = byId('searchDateSelect')?.value || '';
  const ev = byId('searchEventSelect')?.value || '';
  if (!d || !ev) { alert('Pilih tanggal dan event.'); return; }
  byId('eventModal')?.classList.add('hidden');
  await switchToEvent(ev, d);
});

// Enable delete button on select change
byId('searchEventSelect')?.addEventListener('change', ()=>{
  const ev = byId('searchEventSelect')?.value || '';
  const delBtn = byId('deleteEventBtn'); if (delBtn) delBtn.disabled = !ev;
});

// Ensure Delete Event button exists under Open button in Search tab
function ensureDeleteEventButton(){
  const container = byId('eventSearchForm') || byId('eventModal');
  if (!container) return;
  if (byId('deleteEventBtn')) return;
  const openBtn = byId('openEventBtn');
  const del = document.createElement('button');
  del.id = 'deleteEventBtn';
  del.textContent = 'Hapus Event';
  del.className = 'mt-2 w-full px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50';
  del.disabled = true;
  if (openBtn && openBtn.parentElement){
    openBtn.parentElement.appendChild(del);
  } else {
    container.appendChild(del);
  }
  del.addEventListener('click', onDeleteSelectedEvent);
}

async function onDeleteSelectedEvent(){
  const d = byId('searchDateSelect')?.value || '';
  const ev = byId('searchEventSelect')?.value || '';
  if (!d || !ev) return;
  if (!confirm('Hapus event ini secara permanen? Tindakan ini tidak bisa dibatalkan.')) return;
  try{
    showLoading('Menghapus event…');
    const { data: ud } = await sb.auth.getUser();
    if (!ud?.user){ alert('Silakan login terlebih dahulu.'); return; }
    const { data, error } = await sb.rpc('delete_event', { p_event_id: ev });
    if (error) throw error;
    const status = (data && data.status) || '';
    if (status !== 'deleted'){
      const msg = status==='forbidden' ? 'Anda bukan owner event ini.' : status==='not_found' ? 'Event tidak ditemukan.' : 'Gagal menghapus event.';
      showToast?.(msg, 'error');
      return;
    }
    showToast?.('Event dihapus.', 'success');
    // Reload penuh agar UI bersih dari sisa state
    try{ leaveEventMode?.(true); }catch{}
    window.location.reload();
  }catch(e){ console.error(e); showToast?.('Gagal menghapus event: ' + (e?.message||''), 'error'); }
  finally { hideLoading(); }
}

byId('btnLeaveEvent')?.addEventListener('click', ()=>{
  if (confirm('Keluar event dan hapus data lokal?')) {
    leaveEventMode(true);   // true = clear localStorage
    roundsByCourt[activeCourt] = [];
    markDirty(); renderAll();refreshFairness();
    window.location.reload(true);

  }
});

// Toggle visibility of Share/Undang and Keluar buttons based on event presence
function updateEventActionButtons(){
  const hasEvent = !!currentEventId;
  ['btnShareEvent','btnLeaveEvent'].forEach(id=>{
    const el = byId(id);
    if (el) el.classList.toggle('hidden', !hasEvent || isViewer());
  });
}



// Pastikan inisialisasi mode Cloud + Access selalu dipanggil saat load
document.addEventListener('DOMContentLoaded', async ()=>{
  try{ await handleAuthRedirect(); }catch{}
  try{ initCloudFromUrl?.(); }catch(e){ console.warn('initCloudFromUrl error', e); }
  try{ updateAuthUI?.(); }catch{}
  try{ ensureAuthButtons?.(); updateAuthUI?.(); }catch{}
  try{ refreshEventButtonLabel?.(); }catch{}
  try{ updateEventActionButtons?.(); }catch{}
  try{ renderFilterSummary?.(); }catch{}
  try{ ensureJoinControls?.(); refreshJoinUI?.(); }catch{}
  try{ ensureJoinOpenFields(); }catch{}
  try{ if (currentEventId) getPaidChannel(); }catch{}
  try{ if (currentEventId && window.sb) await loadJoinOpenFromDB(); }catch{}
  try{ refreshJoinUI?.(); }catch{}

});

document.addEventListener('DOMContentLoaded', boot);

// ========== Auth UI bindings ==========
byId('btnLogin')?.addEventListener('click', ()=>{
  const m = byId('loginModal'); if (!m) return; m.classList.remove('hidden');
  const user = null; try{ sb.auth.getUser().then(({data})=>{ if (data?.user?.email) byId('loginEmail').value = data.user.email; }); }catch{}
});
byId('loginBackdrop')?.addEventListener('click', ()=> byId('loginModal').classList.add('hidden'));
byId('loginCancelBtn')?.addEventListener('click', ()=> { byId('loginModal').classList.add('hidden'); const b=byId('loginSendBtn'); if (b) b.textContent='Kirim Link Login'; const m=byId('loginMsg'); if(m) m.textContent=''; });
// Login OTP sederhana (tanpa Edge Function)
byId('loginSendBtn')?.addEventListener('click', async ()=>{
  const email = (byId('loginEmail').value||'').trim();
  const msg = byId('loginMsg'); const btn = byId('loginSendBtn');
  msg.textContent=''; msg.className = 'text-xs text-gray-500 dark:text-gray-300';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.textContent='Email tidak valid.'; return; }
  btn.disabled = true; btn.textContent='Mengirim…';
  try{
    await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: getAuthRedirectURL(), shouldCreateUser: true } });
    msg.textContent='Cek email Anda untuk magic link.';
    msg.className='text-xs text-green-600 dark:text-green-400';
  }catch(e){ console.error(e); msg.textContent='Gagal mengirim link.'; msg.className='text-xs text-red-600 dark:text-red-400'; }
  finally{ btn.disabled=false; btn.textContent='Kirim Link Login'; }
});
byId('btnLogout')?.addEventListener('click', async ()=>{
  try{ await sb.auth.signOut(); }catch{}
  location.reload();
});
