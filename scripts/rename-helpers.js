"use strict";
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
      showToast?.('Event tidak ditemukan atau sudah dihapus.', 'warn');
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
  showToast('Memindahkan '+ nm +' dari waiting list', 'info');
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
    showToast('Promote '+moved+' pemain dari waiting list', 'success');
    markDirty();
    renderPlayersList();
    renderAll?.();
  } else {
    if (players.length >= cap) showToast('List aktif penuh. Hapus/geser pemain dulu.', 'warn');
    else showToast('Tidak ada pemain di waiting list.', 'info');
  }
}

function promoteFromWaiting(name){
  const cap = (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0) ? currentMaxPlayers : Infinity;
  if (players.includes(name)) return;
  if (players.length >= cap){ showToast('List aktif penuh. Hapus/geser pemain dulu.', 'warn'); return; }
  const idx = (waitingList||[]).indexOf(name);
  if (idx >= 0) waitingList.splice(idx,1);
  players.push(name);
  markDirty();
  renderPlayersList();
  renderAll?.();
  try{ maybeAutoSaveCloud(); }catch{}
}

function removeFromWaiting(name){
  const target = String(name||'').trim().toLowerCase();
  if (!confirm('Hapus '+name+' dari waiting list?')) return;
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
      dups.map(([a,b])=> players[a] + " ↔ " + players[b]).join(', ') +
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
                    dups2.map(([a,b])=> players[a] + " & " + players[b]).join(', ') +
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
      "<div class='text-blue-600'>Mirip (cek typo): " +
      sugg.map(([a,b])=> a + " ~ " + b).join(', ') +
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
        "<div class='text-rose-600'>Mode Mixed: " +
        "Lengkapi <b>Gender</b> untuk: " + missingGender.join(', ') + ".</div>"
      );
    }
    if ((pm === 'lvl_bal' || pm === 'lvl_same') && missingLevel.length){
      items.push(
        "<div class='text-rose-600'>Mode Level: " +
        "Lengkapi <b>Level</b> (beg/pro) untuk: " + missingLevel.join(', ') + ".</div>"
      );
    }

    // Hint kecil untuk mengarahkan user
    if ((pm==='mixed' && missingGender.length) || ((pm==='lvl_bal'||pm==='lvl_same') && missingLevel.length)){
      items.push("<div class='text-xs text-gray-500 mt-1'>Atur di list pemain (dropdown kecil di tiap nama).</div>");
    }
  }

  warn.innerHTML = items.join('');
  return items.length === 0; // opsional kalau mau dipakai sebagai boolean
}
