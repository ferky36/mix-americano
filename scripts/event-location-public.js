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
