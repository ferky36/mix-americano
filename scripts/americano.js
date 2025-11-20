"use strict";
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
