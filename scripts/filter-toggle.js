"use strict";
// ===== Expand/Collapse "Filter / Jadwal" =====
(function(){
  const t = (k,f)=> (window.__i18n_get ? __i18n_get(k,f) : f);
  const KEY = 'ui.filter.expanded';
  const btn = document.getElementById('btnFilterToggle');
  const chevron = document.getElementById('filterChevron');
  const panel = document.getElementById('filterPanel');
  const CHEVRON_OPEN = '▲';   // chevron saat panel terbuka
  const CHEVRON_CLOSED = '▼'; // chevron saat panel tertutup

  if(!btn || !panel) return;

  // state awal: dari localStorage (default: expanded)
  let open = localStorage.getItem(KEY);
  if (open === null) {
    // kalau device pendek-lanskap -> start collapsed
    const isShortLandscape = window.matchMedia('(orientation: landscape) and (max-height: 480px)').matches;
    open = 0;
  }
  open = open === '1';
  if (open) panel.classList.add('open'); else panel.classList.remove('open');
  chevron.textContent = open ? CHEVRON_OPEN : CHEVRON_CLOSED;

  btn.addEventListener('click', ()=>{
    panel.classList.toggle('open');
    const nowOpen = panel.classList.contains('open');
    chevron.textContent = nowOpen ? CHEVRON_OPEN : CHEVRON_CLOSED;
    localStorage.setItem(KEY, nowOpen ? '1' : '0');
  });
})();

// Fallback: sebelum keluar/refresh, commit autosave
window.addEventListener('beforeunload', saveToLocalSilent);

// Enhance collapsible behavior for Filter/Jadwal panel without touching existing handlers
(function fixFilterPanelCollapsible(){
  const panel = document.getElementById('filterPanel');
  const chevron = document.getElementById('filterChevron');
  const CHEVRON_PANEL_OPEN = '▲';
  const CHEVRON_PANEL_CLOSED = '▼';
  if (!panel) return;

  function refresh(){
    if (panel.classList.contains('open')){
      try{ panel.style.maxHeight = (panel.scrollHeight + 24) + 'px'; panel.style.opacity = '1'; }catch{}
      try{ if (chevron) chevron.textContent = CHEVRON_PANEL_OPEN; }catch{}
    } else {
      try{ panel.style.maxHeight = '0px'; panel.style.opacity = '0'; }catch{}
      try{ if (chevron) chevron.textContent = CHEVRON_PANEL_CLOSED; }catch{}
    }
  }

  // Initial
  refresh();
  // When panel visibility toggles, keep inline styles in sync
  try{
    const observer = new MutationObserver(refresh);
    observer.observe(panel, { attributes:true, attributeFilter:['class'] });
    window.addEventListener('beforeunload', ()=>{ try{ observer.disconnect(); }catch(e){ console.warn('Filter panel observer cleanup failed', e); } });
  }catch(e){ console.warn('Filter panel observer init failed', e); }
  window.addEventListener('resize', refresh);
  try{ panel.addEventListener('transitionend', refresh); }catch(e){ console.warn('Filter panel transition hook failed', e); }
})();


// Helper konfirmasi Yes/No (pakai modal askYesNo jika tersedia)
async function __askYesNo(msg){
  try{ if (typeof askYesNo === 'function') return await askYesNo(msg); }catch{}
  if (!window.__ynModal){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);';
    const panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;padding:16px 18px;border-radius:12px;max-width:340px;width:92%;box-shadow:0 12px 28px rgba(0,0,0,0.25);';
    const txt = document.createElement('div'); txt.style.cssText='font-weight:600;margin-bottom:12px;color:#111;white-space:pre-line;'; panel.appendChild(txt);
    const row = document.createElement('div'); row.style.cssText='display:flex;gap:10px;justify-content:flex-end;'; panel.appendChild(row);
    const bNo = document.createElement('button'); bNo.textContent='Tidak'; bNo.style.cssText='padding:8px 12px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#111;';
    const bYes = document.createElement('button'); bYes.textContent='Ya'; bYes.style.cssText='padding:8px 12px;border-radius:10px;background:#2563eb;color:#fff;border:0;';
    row.append(bNo,bYes); overlay.appendChild(panel); document.body.appendChild(overlay);
    window.__ynModal = { overlay, txt, bNo, bYes };
  }
  const { overlay, txt, bNo, bYes } = window.__ynModal;
  return new Promise(res=>{
    txt.textContent = msg;
    overlay.style.display = 'flex';
    const cleanup = (v)=>{ overlay.style.display='none'; bNo.onclick=bYes.onclick=null; res(v); };
    bYes.onclick = ()=> cleanup(true);
    bNo.onclick  = ()=> cleanup(false);
    overlay.onclick = (e)=>{ if (e.target===overlay) cleanup(false); };
  });
}

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

byId('btnApplyPlayerTemplate')?.addEventListener('click', async () => {
  const ok = await __askYesNo(t('players.template.confirm','Terapkan template pemain 10 orang? Daftar sekarang akan diganti.'));
  if (!ok) { showToast?.(t('players.template.cancel','Batal menerapkan template.'), 'info'); return; }
  applyDefaultPlayersTemplate();
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
  const viewerMode = (typeof isViewer==='function' && isViewer());
  const ownerMode  = (typeof isOwnerNow==='function' && isOwnerNow());
  // Only owners may create; editors non-owner and viewers are search-only
  const canCreate  = (!viewerMode) && ownerMode;
  const isCreate   = canCreate && (mode !== "search");
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
  const titleEl = document.querySelector('#eventModal h3');
  if (!canCreate){
    // Non-owner (viewer or editor non-owner): hide both tabs, show Search content
    if (tCreate) tCreate.classList.add('hidden');
    if (tSearch) tSearch.classList.add('hidden');
    if (fCreate) fCreate.classList.add('hidden');
    if (titleEl) titleEl.textContent = t('event.searchTitle','Cari Event');
  } else {
    if (tCreate) tCreate.classList.remove('hidden');
    if (tSearch) tSearch.classList.remove('hidden');
    if (titleEl) titleEl.textContent = t('event.createTitle','Buat/Cari Event');
  }
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
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">${t('event.locLabel','Lokasi (opsional)')}</label>
            <input id="eventLocationInput" type="text" placeholder="${t('event.locPlaceholder','Mis. Lapangan A, GBK')}"
                  class="mt-1 border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
          </div>
          <div>
            <label class="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300">${t('event.locUrlLabel','Link Maps (opsional)')}</label>
            <input id="eventLocationUrlInput" type="url" placeholder="${t('event.locUrlPlaceholder','https://maps.app.goo.gl/...')}"
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
  setEventModalTab("create");
  const today = byId('sessionDate')?.value || new Date().toISOString().slice(0,10);
  try{ byId('eventDateInput').value = today; }catch{}
  try{ byId('eventNameInput').value = ''; }catch{}
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
    showLoading((window.__i18n_get ? __i18n_get('event.loadingList','Memuat daftar event…') : 'Memuat daftar event…'));
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

function ensureSearchDateInput(){
  const host = byId('eventSearchForm'); if (!host) return;
  const oldSel = byId('searchDateSelect');
  let inp = byId('searchDateInput');
  if (!inp){
    inp = document.createElement('input');
    inp.type = 'date';
    inp.id = 'searchDateInput';
    inp.className = 'hidden';
    if (oldSel && oldSel.parentElement){ oldSel.parentElement.insertBefore(inp, oldSel); }
    else { host.prepend(inp); }
  }
  if (oldSel) oldSel.classList.add('hidden');
  // Bind change once after created
  if (!inp.dataset.bound){
    inp.addEventListener('change', async ()=>{
      const d = getSearchDateValue() || '';
      await loadSearchEventsForDate(d);
      const delBtn = byId('deleteEventBtn'); if (delBtn) delBtn.disabled = true;
      // Re-render calendar selection state when date changes via input
      try{ renderSearchCalendarFor(d); }catch{}
    });
    inp.dataset.bound = '1';
  }
  // Ensure custom calendar exists
  ensureSearchCalendar(inp);
}

function getSearchDateValue(){
  const v = byId('searchDateInput')?.value || '';
  if (v) return v;
  return byId('searchDateSelect')?.value || '';
}

async function loadSearchDates(){
  ensureSearchDateInput();
  const inp = byId('searchDateInput'); if (!inp) return;
  // Viewer hanya melihat tanggal event yang pernah diikuti; owner/editor/admin melihat semua
  const allowAll = (function(){
    try{
      if (typeof isViewer === 'function' && !isViewer()) return true;
      if (typeof isOwnerNow === 'function' && isOwnerNow()) return true;
      if (window._isCashAdmin) return true; // admin mode
    }catch{}
    return false;
  })();
  let ids = [];
  if (!allowAll){ ids = await getMyEventIds(); }
  try{
    showLoading((window.__i18n_get ? __i18n_get('event.loadingDates','Memuat tanggal…') : 'Memuat tanggal…'));
    let rows;
    if (allowAll){
      const r = await sb.from('events')
        .select('event_date')
        .not('event_date','is',null)
        .order('event_date', { ascending: false });
      rows = r.data;
    } else {
      if (!ids.length){ rows = []; }
      else {
        const r = await sb.from('events')
          .select('event_date')
          .in('id', ids)
          .not('event_date','is',null)
          .order('event_date', { ascending: false });
        rows = r.data;
      }
    }
    const seen = Array.from(new Set((rows||[]).map(r=>r.event_date).filter(Boolean)));
    window._searchEventDates = seen;
    // Choose default date: current if exists, else latest available
    const curPref = normalizeDateKey(byId('sessionDate')?.value || currentSessionDate || '');
    let pick = '';
    if (curPref && seen.includes(curPref)) pick = curPref;
    else if (seen.length > 0) pick = seen[0];
    else pick = curPref || new Date().toISOString().slice(0,10);
    inp.value = pick;
    // Render calendar for the month containing pick
    try{ renderSearchCalendarFor(pick); }catch{}
    // Fetch events for selected date immediately
    await loadSearchEventsForDate(pick);
  }catch{ /* noop */ }
  finally{ hideLoading(); }
}

// removed: legacy hints under date input (chips)

// ===== Custom Calendar (with event highlights) =====
function ensureSearchCalendar(anchorEl){
  const host = anchorEl?.parentElement || byId('eventSearchForm'); if (!host) return;
  if (byId('searchCalendar')) return;
  const cal = document.createElement('div');
  cal.id = 'searchCalendar';
  cal.className = 'mt-2 border rounded-xl p-2 dark:border-gray-700';
  cal.innerHTML = `
    <div class="flex items-center justify-between mb-2 gap-2">
      <div class="flex items-center gap-1">
        <button id="calPrevYear" class="px-2 py-1 rounded-lg border dark:border-gray-700">«</button>
        <button id="calPrev" class="px-2 py-1 rounded-lg border dark:border-gray-700">‹</button>
      </div>
      <div id="calTitle" class="font-semibold"></div>
      <div class="flex items-center gap-1">
        <button id="calNext" class="px-2 py-1 rounded-lg border dark:border-gray-700">›</button>
        <button id="calNextYear" class="px-2 py-1 rounded-lg border dark:border-gray-700">»</button>
      </div>
    </div>
    <div class="grid grid-cols-7 text-center text-xs text-gray-500 dark:text-gray-300 mb-1">
      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
    </div>
    <div id="calGrid" class="grid grid-cols-7 gap-1"></div>
  `;
  host.appendChild(cal);
  byId('calPrev').addEventListener('click', ()=> navMonth(-1));
  byId('calNext').addEventListener('click', ()=> navMonth(+1));
  byId('calPrevYear').addEventListener('click', ()=> navMonth(-12));
  byId('calNextYear').addEventListener('click', ()=> navMonth(+12));
}

function pad2(n){ return String(n).padStart(2,'0'); }
function isoLocal(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function parseISODate(s){ const m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; return new Date(Number(m[1]), Number(m[2])-1, Number(m[3])); }

function getCalView(){
  if (!window._searchCalViewYM){
    const inp = byId('searchDateInput');
    const base = (inp?.value && parseISODate(inp.value)) || new Date();
    window._searchCalViewYM = { y: base.getFullYear(), m: base.getMonth() };
  }
  return window._searchCalViewYM;
}
function setCalView(y,m){ window._searchCalViewYM = { y, m }; renderSearchCalendar(); }

function navMonth(delta){
  const v = getCalView();
  let y = v.y, m = v.m + delta;
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  setCalView(y, m);
}

function renderSearchCalendarFor(dateStr){
  const d = parseISODate(dateStr) || new Date();
  setCalView(d.getFullYear(), d.getMonth());
}

function renderSearchCalendar(){
  const grid = byId('calGrid'); const title = byId('calTitle'); if (!grid || !title) return;
  const v = getCalView();
  const year = v.y; const month = v.m;
  const first = new Date(year, month, 1);
  const startIdx = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  title.textContent = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  grid.innerHTML = '';
  const highlight = new Set((window._searchEventDates||[]));
  const selected = (byId('searchDateInput')?.value)||'';
  // Render 42 cells (6 weeks)
  for (let i=0; i<42; i++){
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'h-9 rounded-lg text-sm flex items-center justify-center border dark:border-gray-700';
    let dayNum, dMonth = month, dYear = year, inMonth = true;
    if (i < startIdx){
      dayNum = prevMonthDays - startIdx + 1 + i; dMonth = month-1; inMonth = false; cell.classList.add('opacity-40');
      if (dMonth < 0) { dMonth = 11; dYear = year - 1; }
    } else if (i >= startIdx + daysInMonth){
      dayNum = i - (startIdx + daysInMonth) + 1; dMonth = month+1; inMonth = false; cell.classList.add('opacity-40');
      if (dMonth > 11) { dMonth = 0; dYear = year + 1; }
    } else {
      dayNum = i - startIdx + 1; inMonth = true;
    }
    const d = new Date(dYear, dMonth, dayNum);
    const iso = isoLocal(d);
    cell.dataset.date = iso;
    cell.textContent = String(dayNum);
    // highlight if has event
    if (highlight.has(iso)) cell.className += ' bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    // today ring
    const today = new Date(); const todayIso = today.toISOString().slice(0,10);
    if (iso === todayIso) cell.className += ' ring-1 ring-indigo-300';
    // selected
    if (selected && iso === selected) cell.className += ' ring-2 ring-indigo-500';
    cell.addEventListener('click', ()=>{
      const inp = byId('searchDateInput'); if (inp){ inp.value = iso; inp.dispatchEvent(new Event('change')); }
    });
    grid.appendChild(cell);
  }
}

async function loadSearchEventsForDate(dateStr){
  const evSel = byId('searchEventSelect'); const btnOpen = byId('openEventBtn');
  if (!evSel) return;
  evSel.innerHTML = '<option value="">Memuat…</option>';
  btnOpen && (btnOpen.disabled = true);
  const delBtn = byId('deleteEventBtn'); if (delBtn) delBtn.disabled = true;
  // Viewer hanya melihat event yang pernah diikuti; owner/editor/admin lihat semua
  const allowAll = (function(){
    try{
      if (typeof isViewer === 'function' && !isViewer()) return true;
      if (typeof isOwnerNow === 'function' && isOwnerNow()) return true;
      if (window._isCashAdmin) return true;
    }catch{}
    return false;
  })();
  const ids = allowAll ? [] : await getMyEventIds();
  if ((!allowAll && !ids.length) || !dateStr){ evSel.innerHTML = '<option value="">— Tidak ada —</option>'; return; }
  try{
    showLoading((window.__i18n_get ? __i18n_get('event.loading','Memuat event…') : 'Memuat event…'));
    let evs;
    if (allowAll) {
      const r = await sb.from('events')
        .select('id,title')
        .eq('event_date', dateStr)
        .order('created_at', { ascending: false });
      evs = r.data;
    } else {
      const r = await sb.from('events')
        .select('id,title')
        .eq('event_date', dateStr)
        .in('id', ids)
        .order('created_at', { ascending: false });
      evs = r.data;
    }
    const list = (evs||[]).map(r=>({ id: r.id, title: r.title }));
    if (!list.length){
      // Jika kalender masih menandai tanggal ini (hijau) namun daftar event kosong,
      // sinkronkan highlight agar tidak menyesatkan.
      try{
        if (Array.isArray(window._searchEventDates) && window._searchEventDates.includes(dateStr)){
          window._searchEventDates = window._searchEventDates.filter(d=> d !== dateStr);
          try{ renderSearchCalendarFor(dateStr); }catch{}
        }
      }catch{}
      evSel.innerHTML = '<option value="">— Tidak ada —</option>';
      return;
    }
    evSel.innerHTML = '';
    list.forEach(row=>{
      const o = document.createElement('option'); o.value = row.id; o.textContent = row.title || row.id; evSel.appendChild(o);
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
    showLoading((window.__i18n_get ? __i18n_get('event.opening','Membuka event…') : 'Membuka event…'));
    // Putuskan channel realtime sebelumnya bila ada
    try{ unsubscribeRealtimeForState?.(); }catch{}
    currentEventId = eventId;
    currentSessionDate = normalizeDateKey(dateStr);
    _serverVersion = 0;
    const dateInput = byId('sessionDate'); if (dateInput) dateInput.value = currentSessionDate;
    const url = new URL(location.href);
    url.searchParams.set('event', eventId);
    url.searchParams.set('date', currentSessionDate);
    history.replaceState({}, '', url);

    // Ambil meta agar judul/lokasi/htm/max players & locked date tersinkron
    try{ renderEventLocation('', ''); }catch{} // clear chip while loading baru
    const meta = await fetchEventMetaFromDB(eventId);
    if (meta?.title) setAppTitle(meta.title);
    renderEventLocation(meta?.location_text || '', meta?.location_url || '');
    try{
      window.__htmAmount = Number(meta?.htm||0)||0;
      const s = document.getElementById('summaryHTM'); if (s) s.textContent = 'Rp'+(window.__htmAmount||0).toLocaleString('id-ID');
    }catch{}
    try{
      if (!window.__lockedEventDateKey && currentSessionDate) window.__lockedEventDateKey = currentSessionDate;
    }catch{}

    // Clear local state snapshot to avoid bleed from previous event before loading new state
    try{
      players = [];
      waitingList = [];
      window.waitingList = waitingList;
      playerMeta = {};
      roundsByCourt = [[]];
      courts = [];
      currentMaxPlayers = meta?.max_players ?? null;
      markDirty?.();
      renderPlayersList?.(); renderViewerPlayersList?.(); renderAll?.(); validateNames?.();
    }catch{}

    // Load state for target event/date
    let ok = false;
    try{ ok = await loadStateFromCloud(); }catch{}
    if (!ok){ seedDefaultIfEmpty?.(); }
    renderPlayersList?.(); renderAll?.(); validateNames?.(); refreshJoinUI?.();

    // Re-subscribe and restart autosave/access
    subscribeRealtimeForState?.();
    startAutoSave?.();
    loadAccessRoleFromCloud?.();
    refreshEventButtonLabel?.();
    updateEventActionButtons?.();
    updateMobileCashTab?.();
    try{ renderHeaderChips?.(); }catch{}
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
  // For non-owner (viewer or editor non-owner): show only Search tab
  try{
    const viewer = (typeof isViewer==='function' && isViewer());
    const owner  = (typeof isOwnerNow==='function' && isOwnerNow());
    const canCreate = (!viewer) && owner;
    if (!canCreate){
      byId('tabCreateEvent')?.classList.add('hidden');
      byId('tabSearchEvent')?.classList.add('hidden');
      byId('eventForm')?.classList.add('hidden');
      const titleEl = m.querySelector('h3'); if (titleEl) titleEl.textContent = t('event.searchTitle','Cari Event');
    } else {
      byId('tabCreateEvent')?.classList.remove('hidden');
      byId('tabSearchEvent')?.classList.remove('hidden');
      const titleEl = m.querySelector('h3'); if (titleEl) titleEl.textContent = t('event.createTitle','Buat/Cari Event');
    }
  }catch{}
  // load dates then events for initial selection
  (async ()=>{
    await loadSearchDates();
  })();
}

// Unified click behavior for header button
byId('btnMakeEventLink')?.addEventListener('click', async () => {
  const user = await getCurrentUser();
  // jika sudah login, buka tab Cari agar langsung bisa memilih
  if (user) openSearchEventModal(); else openCreateEventModal();
});
// Basic email validator for invite workflows
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Send invite link via mail client (mailto)
async function sendInviteEmailLink(targetEmail, inviteLink, role, msgEl, btnEl){
  if (!targetEmail || !EMAIL_REGEX.test(targetEmail)){
    if (msgEl) msgEl.textContent = t('auth.emailInvalid','Email tidak valid.');
    return false;
  }
  if (!inviteLink){
    if (msgEl) msgEl.textContent = t('invite.createFirst','Buat link undangan dulu.');
    return false;
  }
  const prev = btnEl?.textContent;
  if (btnEl){ btnEl.disabled = true; btnEl.textContent = t('invite.emailSending','Sending...'); }
  if (msgEl) msgEl.textContent = t('invite.emailClientOpening','Membuka email client...');
  try{
    const subject = encodeURIComponent(`Undangan ${role} event`);
    const bodyText = encodeURIComponent(`Halo,\n\nBerikut link undangan sebagai ${role}:\n${inviteLink}\n\nTerima kasih.`);
    window.open(`mailto:${encodeURIComponent(targetEmail)}?subject=${subject}&body=${bodyText}`, '_blank');
    if (msgEl) msgEl.textContent = t('invite.emailClientSend','Silakan kirim email undangan dari client Anda.');
    return true;
  }catch(err){
    console.error('sendInviteEmailLink fatal', err);
    const detail = err?.message || err?.error_description || '';
    if (msgEl) msgEl.textContent = t('invite.emailClientFailed','Gagal membuka email client') + (detail ? ': ' + detail : '');
    return false;
  }finally{
    if (btnEl){ btnEl.disabled = false; btnEl.textContent = prev || t('invite.sendEmail','Send To Email'); }
  }
}

// Open Share/Invite for current event anytime
function openShareEventModal(){
  if (!isCloudMode() || !currentEventId){ openCreateEventModal(); return; }
  const m = byId('eventModal'); if (!m) return;
  // show modal
  m.classList.remove('hidden');
  // adjust header/title and hide Buat/Cari tabs for share-only view
  const titleEl = m.querySelector('h3'); if (titleEl) titleEl.textContent = t('header.share','Share / Undang');
  const tabs = byId('eventTabs'); if (tabs) tabs.classList.add('hidden');
  // show success panel, hide form
  byId('eventForm')?.classList.add('hidden');
  byId('eventSearchForm')?.classList.add('hidden');
  byId('eventSuccess')?.classList.remove('hidden');
  // neutralize success info text for share context
  (function tweakShareInfo(){
    const sb = byId('eventSuccess');
    const info = sb?.querySelector('.p-3');
    if (info) info.textContent = t('share.info','Bagikan Link Event');
  })();
  // ensure viewer link (public viewer, clean params)
  const d = byId('sessionDate')?.value || currentSessionDate || new Date().toISOString().slice(0,10);
  const viewerLink = buildPublicViewerUrl(currentEventId, d);
  const out = byId('eventLinkOutput'); if (out) out.value = viewerLink;

  // remove deprecated score-viewer link row if exists
  try{ byId('eventViewerCalcRow')?.remove(); }catch{}
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
      <div class="text-sm font-semibold">${t('invite.title','Invite Anggota')}</div>
      <div class="text-xs text-gray-500 dark:text-gray-300">${t('invite.desc','Masukkan email Supabase user (yang digunakan login), pilih role, lalu buat link undangan.')}</div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input id="inviteEmail" type="email" placeholder="email@example.com" class="flex-1 border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
        <select id="inviteRole" class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">\n          <option value="editor">editor</option>\n          <option value="wasit">wasit</option>\n          <option value="admin">admin</option>\n        </select>
        <button id="btnInviteMember" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm">${t('invite.button','Buat Link Undangan')}</button>
      </div>
      <div class="flex items-center gap-2 hidden" id="inviteLinkRow">
        <input id="inviteLinkOut" readonly class="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
        <button id="btnCopyInvite" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">${t('invite.linkCopy','Copy Link')}</button>
        <button id="btnSendInviteEmail" class="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm">${t('invite.sendEmail','Send To Email')}</button>
      </div>
      <div id="inviteMsg" class="text-xs"></div>`;
    successBox.appendChild(box);
    byId('btnInviteMember').addEventListener('click', async ()=>{
      const btn = byId('btnInviteMember');
      const email = (byId('inviteEmail').value||'').trim();
      const role = byId('inviteRole').value||'editor';
      const msg = byId('inviteMsg'); msg.textContent='';
      if (!email || !EMAIL_REGEX.test(email)) { msg.textContent=t('auth.emailInvalid','Email tidak valid.'); return; }
      if (!isCloudMode() || !currentEventId){ msg.textContent=t('invite.cloudOff','Mode Cloud belum aktif. Buat event dulu.'); return; }
      try{
        if (btn){ btn.disabled = true; btn.textContent = t('invite.creating','Membuat…'); }
        const { data:ud } = await sb.auth.getUser();
        if (!ud?.user){ msg.textContent=t('invite.loginRequired','Silakan login terlebih dahulu.'); return; }
        const { data: token, error } = await sb.rpc('create_event_invite', { p_event_id: currentEventId, p_email: email, p_role: role });
        if (error) throw error;
        const link = buildInviteUrl(currentEventId, byId('sessionDate').value || '', token);
        const row = byId('inviteLinkRow'); const out = byId('inviteLinkOut'); const cp = byId('btnCopyInvite'); const send = byId('btnSendInviteEmail');
        if (row && out){ row.classList.remove('hidden'); out.value = link; msg.textContent=t('invite.created','Link undangan dibuat. Kirimkan ke email terkait.'); }
        if (cp && out){ cp.onclick = async ()=>{ try{ await navigator.clipboard.writeText(out.value); cp.textContent=t('invite.copySuccess','Copied!'); setTimeout(()=>cp.textContent=t('invite.linkCopy','Copy Link'),1200);}catch{} }; }
        if (send && out){ send.onclick = () => sendInviteEmailLink((byId('inviteEmail').value||'').trim(), out.value, byId('inviteRole')?.value || role, msg, send); }
      }catch(e){ console.error(e); msg.textContent = t('invite.createFail','Gagal membuat link undangan') + (e?.message? ': '+e.message : ''); }
      finally { if (btn){ btn.disabled = false; btn.textContent = t('invite.button','Buat Link Undangan'); } hideLoading(); }
    });
  })();
}
byId('btnShareEvent')?.addEventListener('click', openShareEventModal);
// Enhance players toolbar icons on startup
try{ setupPlayersToolbarUI?.(); }catch{}
// Tab handlers for Event modal
byId('tabCreateEvent')?.addEventListener('click', ()=>{ setEventModalTab('create'); });
byId('tabSearchEvent')?.addEventListener('click', async ()=>{ setEventModalTab('search'); await loadSearchDates(); });
byId('eventCancelBtn')?.addEventListener('click', () => {
  byId('eventModal').classList.add('hidden');
});

// Reset seluruh state lokal sebelum menyimpan event baru agar payload tidak mewarisi event sebelumnya
function __resetStateForNewEvent(date, title){
  try{
    players = [];
    waitingList = [];
    window.waitingList = waitingList;
    playerMeta = {};
    // kosongkan jadwal/rounds & courts
    roundsByCourt = [[]];
    courts = [];
    currentMaxPlayers = null;
    window.__htmAmount = 0;
    // reset form fields
    const setVal = (id, val)=>{
      const el = byId(id);
      if (!el) return;
      if (typeof val === 'boolean' && 'checked' in el) el.checked = val;
      else el.value = val;
    };
    setVal('startTime','');
    setVal('minutesPerRound','');
    setVal('breakPerRound','0');
    setVal('roundCount','');
    setVal('showBreakRows', false);
    setVal('sessionDate', date || byId('sessionDate')?.value || '');
    if (title) setAppTitle(title);
    markDirty?.();
    renderPlayersList?.(); renderViewerPlayersList?.(); renderAll?.(); validateNames?.();
  }catch(e){ console.warn('reset state for new event failed', e); }
}

// Klik Create Event
byId('eventCreateBtn')?.addEventListener('click', async () => {
  const btnCreate = byId('eventCreateBtn');
  const oldText = btnCreate?.textContent;
  if (btnCreate) { btnCreate.disabled = true; btnCreate.textContent = t('event.creating','Creating...'); }
  const name = (byId('eventNameInput').value || '').trim();
  const date = normalizeDateKey(byId('eventDateInput').value || '');
  if (!name || !date) { showToast?.(t('event.required','Nama event dan tanggal wajib diisi.'), 'warn'); return; }

  try {
    // pastikan user login
    const { data: ud } = await sb.auth.getUser();
    if (!ud?.user) { byId('eventModal')?.classList.add('hidden'); byId('loginModal')?.classList.remove('hidden'); return; }

    const { id, created } = await createEventIfNotExists(name, date);
    if (!created) {
      showToast?.(t('event.exists','Event dengan nama itu di tanggal tersebut sudah ada.\nSilakan pilih nama lain atau tanggal lain.'), 'warn');
      return;
    }

    __resetStateForNewEvent(date, name);
    window.__lockedEventDateKey = date;
    // Defaults for new event
    try{
      const mr = byId('minutesPerRound'); if (mr) mr.value = '11';
      const spMr = byId('spMinutes'); if (spMr) spMr.value = '11';
    }catch{}
    try{
      ensureMaxPlayersField?.();
      const mp = byId('maxPlayersInput'); if (mp) mp.value = '10';
      const spMp = byId('spMaxPlayers'); if (spMp) spMp.value = '10';
      currentMaxPlayers = 10;
    }catch{}
    try{
      const sbreak = byId('spBreak'); if (sbreak) sbreak.value = '1';
      const sstart = byId('spStart'); if (sstart) sstart.value = '19:00';
      const srounds = byId('spRounds'); if (srounds) srounds.value = '10';
      const sjd = byId('spJoinDate'); if (sjd) sjd.value = date;
      const sjt = byId('spJoinTime'); if (sjt) sjt.value = '15:00';
      const mainJd = byId('joinOpenDateInput'); if (mainJd) mainJd.value = date;
      const mainJt = byId('joinOpenTimeInput'); if (mainJt) mainJt.value = '15:00';
      try{ window.joinOpenAt = combineDateTimeToISO?.(date, '15:00') || `${date}T15:00:00`; }catch{}
    }catch{}

    // update title
    setAppTitle(name);
    try{
      window._isOwnerUser = true;
      setAccessRole?.('editor');
    }catch{}
    currentEventId = id;
    currentSessionDate = date;
    byId('sessionDate').value = date;

    // save optional location & default join_open_at to events table
    try{
      const locText = (byId('eventLocationInput')?.value || '').trim();
      const locUrl  = (byId('eventLocationUrlInput')?.value || '').trim();
      const joinAt = window.joinOpenAt || (combineDateTimeToISO?.(date, '15:00') || `${date}T15:00:00`);
      await sb.from('events')
        .update({
          location_text: locText || null,
          location_url: locUrl || null,
          join_open_at: joinAt
        })
        .eq('id', id);
      renderEventLocation(locText, locUrl);
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
    try{ ensureCashAdminFlag?.(); applyAccessMode?.(); updateMobileCashTab?.(); }catch{}

    // tampilkan UI success: share link default = viewer (readonly) + embed owner
    const link = buildPublicViewerUrl(id, date);
    byId('eventForm').classList.add('hidden');
    byId('eventSuccess').classList.remove('hidden');
    // reset info text to creation success wording in create flow
    (function tweakCreateInfo(){
      const sb = byId('eventSuccess');
      const info = sb?.querySelector('.p-3');
      if (info) info.textContent = t('share.createInfo','Event berhasil dibuat! Bagikan link berikut:');
    })();
    byId('eventLinkOutput').value = link;
    // Deprecated: score-viewer link row no longer used
    try{ byId('eventViewerCalcRow')?.remove(); }catch{}

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
          <select id="inviteRole" class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">\n          <option value="editor">editor</option>\n          <option value="wasit">wasit</option>\n          <option value="admin">admin</option>\n        </select>
          <button id="btnInviteMember" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm">Buat Link Undangan</button>
        </div>
        <div class="flex items-center gap-2 hidden" id="inviteLinkRow">
          <input id="inviteLinkOut" readonly class="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100" />
          <button id="btnCopyInvite" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">Copy Link</button>
          <button id="btnSendInviteEmail" class="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm">Send To Email</button>
        </div>
        <div id="inviteMsg" class="text-xs"></div>`;
      successBox.appendChild(box);
      byId('btnInviteMember').addEventListener('click', async ()=>{
        const btn = byId('btnInviteMember');
        const email = (byId('inviteEmail').value||'').trim();
        const role = byId('inviteRole').value||'editor';
        const msg = byId('inviteMsg'); msg.textContent='';
        if (!email || !EMAIL_REGEX.test(email)) { msg.textContent=t('auth.emailInvalid','Email tidak valid.'); return; }
        if (!isCloudMode() || !currentEventId){ msg.textContent=t('invite.cloudOff','Mode Cloud belum aktif. Buat event dulu.'); return; }
        try{
          if (btn){ btn.disabled = true; btn.textContent = 'Membuat…'; }
          // Pastikan user login
          const { data:ud } = await sb.auth.getUser();
          if (!ud?.user){ msg.textContent=t('invite.loginRequired','Silakan login terlebih dahulu.'); return; }

          // Panggil RPC SECURITY DEFINER agar lolos RLS dengan validasi owner/editor di sisi DB
          const { data: token, error } = await sb.rpc('create_event_invite', {
            p_event_id: currentEventId,
            p_email: email,
            p_role: role
          });
          if (error) throw error;

          const link = buildInviteUrl(currentEventId, byId('sessionDate').value || '', token);
          const row = byId('inviteLinkRow'); const out = byId('inviteLinkOut'); const cp = byId('btnCopyInvite'); const send = byId('btnSendInviteEmail');
        if (row && out){ row.classList.remove('hidden'); out.value = link; msg.textContent=t('invite.created','Link undangan dibuat. Kirimkan ke email terkait.'); }
        if (cp && out){
          cp.onclick = async ()=>{ try{ await navigator.clipboard.writeText(out.value); cp.textContent=t('invite.copySuccess','Copied!'); setTimeout(()=>cp.textContent=t('invite.linkCopy','Copy Link'),1200);}catch{} };
        }
        if (send && out){ send.onclick = () => sendInviteEmailLink((byId('inviteEmail').value||'').trim(), out.value, byId('inviteRole')?.value || role, msg, send); }
      }catch(e){ console.error(e); msg.textContent = t('invite.createFail','Gagal membuat link undangan') + (e?.message? ': '+e.message : ''); }
      finally { if (btn){ btn.disabled = false; btn.textContent = t('invite.button','Buat Link Undangan'); } }
      });
  })();


    } catch (err) {
    console.error(err);
    showToast?.(t('event.failed','Gagal membuat event. Coba lagi.'), 'error');
  } finally {
    if (btnCreate) { btnCreate.disabled = false; btnCreate.textContent = oldText || t('event.create','Create & Buat Link'); }
  }
  try{ updateAdminButtonsVisibility?.(); }catch{}
});

// Klik Copy Link
byId('eventCopyBtn')?.addEventListener('click', async () => {
  // Salin apa adanya dari field viewer publik (tanpa owner/view)
  const link = byId('eventLinkOutput').value;
  try {
    await navigator.clipboard.writeText(link);
    byId('eventCopyBtn').textContent = t('invite.copySuccess','Copied!');
    setTimeout(()=> byId('eventCopyBtn').textContent = t('invite.copyLabel','Copy'), 2000);
  } catch {
    showToast?.(t('invite.copyFail','Gagal menyalin link, salin manual:') + ' ' + link, 'error');
  }
});

// Search Event modal bindings
byId('searchCancelBtn')?.addEventListener('click', ()=> byId('eventModal')?.classList.add('hidden'));
byId('searchDateInput')?.addEventListener('change', async ()=>{
  const d = getSearchDateValue() || '';
  await loadSearchEventsForDate(d);
  const delBtn = byId('deleteEventBtn'); if (delBtn) delBtn.disabled = true;
});
byId('searchDateSelect')?.addEventListener('change', async ()=>{
  const d = getSearchDateValue() || '';
  await loadSearchEventsForDate(d);
  const delBtn = byId('deleteEventBtn'); if (delBtn) delBtn.disabled = true;
});
byId('openEventBtn')?.addEventListener('click', async ()=>{
  const d = getSearchDateValue() || '';
  const ev = byId('searchEventSelect')?.value || '';
  if (!d || !ev) { showToast?.(t('event.required','Nama event dan tanggal wajib diisi.'), 'warn'); return; }
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
  // Viewer tidak boleh menghapus event: sembunyikan tombol jika ada dan jangan buat baru
  try{
    const viewer = (typeof isViewer==='function' && isViewer());
    const owner  = (typeof isOwnerNow==='function' && isOwnerNow());
    if (viewer || !owner){
      const ex = byId('deleteEventBtn'); if (ex) ex.classList.add('hidden');
      return;
    }
  }catch{}
  // Only owner reaches here; show existing button or create
  if (byId('deleteEventBtn')) { byId('deleteEventBtn').classList.remove('hidden'); return; }
  const openBtn = byId('openEventBtn');
  const del = document.createElement('button');
  del.id = 'deleteEventBtn';
  del.textContent = t('event.delete','Hapus Event');
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
  const d = getSearchDateValue() || '';
  const ev = byId('searchEventSelect')?.value || '';
  if (!d || !ev) return;
  const ok = await __askYesNo(t('event.deleteConfirm','Hapus event ini secara permanen? Tindakan ini tidak bisa dibatalkan.'));
  if (!ok) { showToast?.(t('event.deleteCancelled','Hapus event dibatalkan.'), 'info'); return; }
  try{
    showLoading(t('event.deleting','Menghapus event…'));
    const { data: ud } = await sb.auth.getUser();
    if (!ud?.user){ showToast?.(t('invite.loginRequired','Silakan login terlebih dahulu.'), 'warn'); return; }
    const { data, error } = await sb.rpc('delete_event', { p_event_id: ev });
    if (error) throw error;
    const status = (data && data.status) || '';
    if (status !== 'deleted'){
      const msg = status==='forbidden'
        ? t('event.deleteForbidden','Anda bukan owner event ini.')
        : status==='not_found'
          ? t('event.notFound','Event tidak ditemukan.')
          : t('event.deleteFailed','Gagal menghapus event.');
      showToast?.(msg, 'error');
      return;
    }
    showToast?.(t('event.deleted','Event dihapus.'), 'success');
    // Reload penuh agar UI bersih dari sisa state
    try{ leaveEventMode?.(true); }catch{}
    window.location.reload();
  }catch(e){ console.error(e); showToast?.(t('event.deleteError','Gagal menghapus event: {msg}').replace('{msg}', (e?.message||'')), 'error'); }
  finally { hideLoading(); }
}

byId('btnLeaveEvent')?.addEventListener('click', async ()=>{
  const ok = await __askYesNo('Keluar event dan hapus data lokal?');
  if (!ok) { showToast?.('Batal keluar event.', 'info'); return; }
  leaveEventMode(true);   // true = clear localStorage
  roundsByCourt[activeCourt] = [];
  markDirty(); renderAll();refreshFairness();
  window.location.reload(true);
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
  try{ ensureViewerSearchButton?.(); }catch{}

});

// Guarded boot hook: only attach if a global boot() exists
try {
  if (typeof boot === 'function') {
    document.addEventListener('DOMContentLoaded', boot);
  }
} catch {}

// Viewer-only quick access button to open Search modal
function ensureViewerSearchButton(){
  const bar = byId('hdrControls'); if (!bar) return;
  if (!byId('btnViewerSearchEvent')){
    const b = document.createElement('button');
    b.id = 'btnViewerSearchEvent';
    b.className = 'px-3 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:opacity-90 hidden';
    b.textContent = t('event.searchTitle','Cari Event');
    b.addEventListener('click', ()=>{ openSearchEventModal(); });
    bar.appendChild(b);
  }
  try{
    const btn = byId('btnViewerSearchEvent');
    if (btn){
      const viewer = (typeof isViewer==='function') ? isViewer() : false;
      const owner  = (typeof isOwnerNow==='function') ? isOwnerNow() : false;
      const show   = viewer || (!viewer && !owner); // viewer OR editor-non-owner
      btn.classList.toggle('hidden', !show);
    }
  }catch{}
}


