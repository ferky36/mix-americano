"use strict";
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
