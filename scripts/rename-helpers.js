"use strict";
const __renameT = (k,f)=> (window.__i18n_get ? __i18n_get(k,f) : f);
const __renameEscape = (s)=> String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
        showToast?.(__renameT('rename.eventMissing','Event tidak ditemukan atau sudah dihapus.'), 'warn');
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
  showToast(__renameT('rename.waitingMove','Memindahkan {name} dari waiting list').replace('{name}', nm), 'info');
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
    showToast(__renameT('rename.promote','Promote {count} pemain dari waiting list').replace('{count}', moved), 'success');
    markDirty();
    renderPlayersList();
    renderAll?.();
  } else {
    if (players.length >= cap) showToast(__renameT('rename.listFull','List aktif penuh. Hapus/geser pemain dulu.'), 'warn');
    else showToast(__renameT('rename.waitingEmpty','Tidak ada pemain di waiting list.'), 'info');
  }
}

function promoteFromWaiting(name){
  const cap = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : Infinity;
  if (players.includes(name)) return;
  if (players.length >= cap){ showToast(__renameT('rename.listFull','List aktif penuh. Hapus/geser pemain dulu.'), 'warn'); return; }
  const idx = (waitingList||[]).indexOf(name);
  if (idx >= 0) waitingList.splice(idx,1);
  players.push(name);
  markDirty();
  renderPlayersList();
  renderAll?.();
  try{ maybeAutoSaveCloud(); }catch{}
}

async function removeFromWaiting(name){
  const target = String(name||'').trim().toLowerCase();
  let ok = false;
  try{
    if (typeof askYesNo === 'function') ok = await askYesNo(__renameT('rename.waitingRemoveConfirm','Hapus {name} dari waiting list?').replace('{name}', name));
    else {
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
      ok = await new Promise(res=>{
        txt.textContent = __renameT('rename.waitingRemoveConfirm','Hapus {name} dari waiting list?').replace('{name}', name);
        overlay.style.display = 'flex';
        const cleanup = (v)=>{ overlay.style.display='none'; bNo.onclick=bYes.onclick=null; res(v); };
        bYes.onclick = ()=> cleanup(true);
        bNo.onclick  = ()=> cleanup(false);
        overlay.onclick = (e)=>{ if (e.target===overlay) cleanup(false); };
      });
    }
  }catch{
    ok = false;
  }
  if (!ok) { showToast?.(__renameT('rename.waitingRemoveCancelled','Batal hapus {name} dari waiting list.').replace('{name}', name), 'info'); return; }
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
      dups.map(([a,b])=> __renameEscape(players[a]) + " & " + __renameEscape(players[b])).join(", ") +
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
                    dups2.map(([a,b])=> __renameEscape(players[a]) + " & " + __renameEscape(players[b])).join(", ") +
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
      "<div class='text-blue-600'>" +
      __renameT('rename.similar','Mirip (cek typo): {pairs}')
        .replace('{pairs}', sugg.map(([a,b])=> __renameEscape(a) + " ~ " + __renameEscape(b)).join(", ")) +
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
        "<div class='text-rose-600'>" +
        __renameT('rename.mixedMissing','Mode Mixed: Lengkapi <b>Gender</b> untuk: {names}.')
          .replace('{names}', missingGender.map(__renameEscape).join(", ")) +
        "</div>"
      );
    }
    if ((pm === 'lvl_bal' || pm === 'lvl_same') && missingLevel.length){
      items.push(
        "<div class='text-rose-600'>" +
        __renameT('rename.levelMissing','Mode Level: Lengkapi <b>Level</b> (beg/pro) untuk: {names}.')
          .replace('{names}', missingLevel.map(__renameEscape).join(", ")) +
        "</div>"
      );
    }

    // Hint kecil untuk mengarahkan user
    if ((pm==='mixed' && missingGender.length) || ((pm==='lvl_bal'||pm==='lvl_same') && missingLevel.length)){
      items.push(
        "<div class='text-xs text-gray-500 mt-1'>" +
        __renameT('rename.hintMeta','Atur di list pemain (dropdown kecil di tiap nama).') +
        "</div>"
      );
    }
  }

  warn.innerHTML = items.join('');
  return items.length === 0; // opsional kalau mau dipakai sebagai boolean
}
