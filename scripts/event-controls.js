"use strict";
// ===== Util: state & UI for Event/Create/Search button =====
function refreshEventButtonLabel(){
  const btn = byId('btnMakeEventLink');
  if (!btn) return;
  // Sederhanakan: selalu tampil "Buat/Cari Event" agar user paham 2 opsi
  const t = (window.__i18n_get ? __i18n_get : (k,f)=>f);
  btn.textContent = t('event.title', 'Buat/Cari Event');
}
