"use strict";
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

// Role chip in header chips row
function renderRoleChip(){
  try{
    const chip = byId('chipRole'); const txt = byId('chipRoleText'); if (!chip || !txt) return;
    const role = String(window._memberRole||'').toLowerCase();
    const owner = (typeof isOwnerNow==='function') ? isOwnerNow() : !!window._isOwnerUser;
    const viewer = (typeof isViewer==='function') ? isViewer() : true;
    const isAdmin = !!window._isCashAdmin;
    // Decide label priority
    let label = 'Viewer';
    if (owner) label = 'Owner';
    else if (role==='editor') label = 'Editor';
    else if (role==='wasit') label = 'Wasit';
    else if (isAdmin) label = 'Admin';
    else label = viewer ? 'Viewer' : 'Editor';

    txt.textContent = label;
    chip.classList.remove('hidden');
    // color cue: owner/admin -> green; editor -> indigo; wasit -> amber; viewer -> gray
    const map = {
      'Owner':   'bg-emerald-100/60 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
      'Admin':   'bg-emerald-100/60 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
      'Editor':  'bg-indigo-100/60 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
      'Wasit':   'bg-amber-100/60 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
      'Viewer':  'bg-gray-100/60 text-gray-900 dark:bg-gray-800/60 dark:text-gray-200'
    };
    // base chip already styled; add hint color by toggling inline class
    chip.dataset.role = label;
    chip.className = 'chip ' + (map[label]||'');
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
    // Memoize to avoid duplicate SELECTs on reload
    const cached = (window.getEventMetaCache ? getEventMetaCache(eventId) : null);
    if (cached) return cached;
    showLoading('Memuat info event…');
    const { data, error } = await sb
      .from('events')
      .select('title, location_text, location_url, htm, max_players, join_open_at, owner_id')
      .eq('id', eventId)
      .maybeSingle();
    if (error) return null;
    try{ window.setEventMetaCache?.(eventId, data||null); }catch{}
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

