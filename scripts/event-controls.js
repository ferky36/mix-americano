"use strict";
// ===== Util: state & UI for Event/Create/Search button =====
function refreshEventButtonLabel(){
  const btn = byId('btnMakeEventLink');
  if (!btn) return;
  // Sederhanakan: selalu tampil "Buat/Cari Event" agar user paham 2 opsi
  btn.textContent = 'Buat/Cari Event';
}
