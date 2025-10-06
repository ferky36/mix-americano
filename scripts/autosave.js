"use strict";
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
