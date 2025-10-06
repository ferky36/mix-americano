"use strict";
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
function isCashAdmin(){
  try { if (typeof isOwnerNow === 'function' && isOwnerNow()) return true; } catch {}
  return !!window._isCashAdmin;
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
  // Show viewer-only search button
  try{ const vb = byId('btnViewerSearchEvent'); if (vb) vb.classList.toggle('hidden', !isViewer()); }catch{}

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
  // Viewer "Cari Event" button visibility
  try{ const vb = byId('btnViewerSearchEvent'); if (vb) vb.classList.toggle('hidden', !isViewer()); }catch{}

  // Title editor (rename) visibility: only in cloud mode, only for editor
  try {
    ensureTitleEditor();
    const wrap = byId('titleEditWrap');
    if (wrap) wrap.classList.toggle('hidden', isViewer() || !currentEventId || !isCloudMode());
  } catch {}

  // Cashflow button visibility: only owner or cash-admin
  try {
    const cb = byId('btnCashflow');
    const known = (typeof window._isCashAdmin !== 'undefined');
    const allow = (isOwnerNow()) || (!!window._isCashAdmin);
    if (cb) {
      if (known) cb.classList.toggle('hidden', !(allow && currentEventId && isCloudMode()));
      // If not known yet, ask background to compute it; don't toggle to avoid flicker
      if (!known) { try{ ensureCashAdminFlag?.(); }catch{} }
    }
  } catch {}

  // Move editor players panel out of filter grid into its own section
  try {
    if (!isViewer()) relocateEditorPlayersPanel();
    const host = document.getElementById('editorPlayersSection');
    if (host) host.classList.toggle('hidden', isViewer());
  } catch {}

  // As a safety, recompute cash-admin flag after mode changes
  try{ ensureCashAdminFlag?.(); }catch{}
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
