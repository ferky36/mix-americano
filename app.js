"use strict";
// Helpers
const pad = (n) => String(n).padStart(2, "0");
const toHM = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
const csvEscape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[,\"\n]/.test(s) ? '"' + s.replace(/\"/g, '""') + '"' : s;
};
const byId = (id) => document.getElementById(id);
const parsePlayersText = (t) =>
  (t || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

// State
let activeCourt = 0;                      // index lapangan aktif
let roundsByCourt = [ [] ];               // array of courts, masing2 array rounds
let players = [];
let dirty=false, autosaveTimer=null;
let store = { sessions:{}, lastTs:null };
const THEME_KEY='mix-americano-theme';
let playerMeta = {}; // { "Nama": { gender:"M"|"F"|"", level:"beg"|"pro"|"" }, ... }



// Theme
function applyThemeFromStorage() {
  const t = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.classList.toggle("dark", t === "dark");
}
function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
}

// Sessions
function populateDatePicker() {
  const sel = byId("datePicker");
  const cur = sel.value;
  sel.innerHTML = '<option value="">Pilih tanggal…</option>';
  Object.keys(store.sessions)
    .sort()
    .forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      sel.appendChild(o);
    });
  if (Array.from(sel.options).some((o) => o.value === cur)) sel.value = cur;
}
function currentPayload(){
  return {
    date: byId('sessionDate').value || '',
    startTime: byId('startTime').value,
    minutesPerRound: byId('minutesPerRound').value,
    roundCount: byId('roundCount').value,
    players: players.join('\n'),
    playerMeta,             // <<< tambahkan ini

    // 🔹 format baru
    roundsByCourt,

    // 🔹 kompat: tetap tulis 2 lapangan pertama agar JSON lama tetap kebaca
    rounds1: roundsByCourt[0] || [],
    rounds2: roundsByCourt[1] || [],

    ts: new Date().toISOString()
  };
}


function markDirty() {
  dirty = true;
  byId("unsavedDot").classList.remove("hidden");
}
function markSaved(ts) {
  dirty = false;
  byId("unsavedDot").classList.add("hidden");
  if (ts)
    byId("lastSaved").textContent =
      "Saved " + new Date(ts).toLocaleTimeString();
}
function saveToStore() {
  const d = byId("sessionDate").value || "";
  if (!d) {
    alert("Isi tanggal dulu ya.");
    return false;
  }
  store.sessions[d] = currentPayload();
  store.lastTs = new Date().toISOString();
  markSaved(store.lastTs);
  populateDatePicker();
  byId("datePicker").value = d;
  return true;
}
function saveToJSONFile(){
  if(!saveToStore()) return;

  const date = byId('sessionDate').value || new Date().toISOString().slice(0,10);
  const safeDate = date.replace(/\//g,'-'); // kalau formatnya dd/mm/yyyy → diganti strip

  const blob = new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);

  const a=document.createElement('a');
  a.href=url;
  a.download = `session_${safeDate}.json`;   // 🔹 nama file = session_YYYY-MM-DD.json
  a.click();
  URL.revokeObjectURL(url);
}

function loadJSONFromFile(file){
  const r = new FileReader();
  r.onload = (ev)=>{
    try{
      const raw = JSON.parse(ev.target.result);

      // 🔹 dukung dua bentuk file:
      //    A) { sessions: { "YYYY-MM-DD": payload, ... }, lastTs: ... }
      //    B) { "YYYY-MM-DD": payload, ... }  (tanpa wrapper 'sessions')
      let incoming = raw;
      if (!incoming.sessions) {
        // bentuk B → bungkus jadi bentuk A
        incoming = { sessions: raw, lastTs: new Date().toISOString() };
      }

      // 🔹 normalisasi tiap payload
      Object.keys(incoming.sessions).forEach(dateKey=>{
        incoming.sessions[dateKey] = normalizeLoadedSession(incoming.sessions[dateKey]);
      });

      store = incoming;
      populateDatePicker();

      alert('JSON dimuat. Pilih tanggal lalu klik Load.');
    }catch(e){
      console.error(e);
      alert('File JSON tidak valid.');
    }
  };
  r.readAsText(file);
}

function loadSessionByDate(){
  const d = byId('datePicker').value || '';
  if(!d){ alert('Pilih tanggal dulu.'); return; }

  let data = store.sessions[d];
  if(!data){ alert('Tidak ada data untuk tanggal tsb.'); return; }

  // 🔹 normalisasi jika yang masuk masih format lama
  data = normalizeLoadedSession(data);

  // 🔹 isi UI
  byId('sessionDate').value    = data.date || d;
  byId('startTime').value      = data.startTime || '19:00';
  byId('minutesPerRound').value= data.minutesPerRound || '12';
  byId('roundCount').value     = data.roundCount || '10';

  players        = parsePlayersText(data.players || '');
  roundsByCourt  = (data.roundsByCourt || []).map(arr => Array.isArray(arr) ? arr : []);
  playerMeta    = data.playerMeta || {}; // <<< tambahkan ini

  // fallback: minimal 1 lapangan
  if (roundsByCourt.length === 0) roundsByCourt = [[]];

  // 🔹 reset ke Lapangan 1, panjang ronde disesuaikan
  activeCourt = 0;
  ensureRoundsLengthForAllCourts();

  renderPlayersList();
  renderAll();
  markSaved(data.ts);
}

// Pastikan panjang tiap lapangan sesuai 'roundCount'
function ensureRoundsLengthForAllCourts(){
  const R = parseInt(byId('roundCount').value || '10', 10);
  roundsByCourt.forEach((arr, ci)=>{
    while(arr.length < R) arr.push({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''});
    if(arr.length > R) roundsByCourt[ci] = arr.slice(0, R);
  });
}

// Konversi JSON lama -> struktur baru
function normalizeLoadedSession(data){
  // Kalau sudah ada roundsByCourt: pakai itu
  if (Array.isArray(data.roundsByCourt)) return data;

  // JSON lama: hanya rounds1/rounds2
  const rc = [];
  if (Array.isArray(data.rounds1)) rc.push(data.rounds1);
  if (Array.isArray(data.rounds2)) rc.push(data.rounds2);
  if (rc.length === 0) rc.push([]); // minimal 1 lapangan

  data.roundsByCourt = rc;
  return data;
}


function startAutoSave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(() => {
    if (dirty) saveToStore();
  }, 30000);
}


// PLAYERS UI
function escapeHtml(s) {
  return s.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[
        c
      ])
  );
}
function renderPlayersList() {
  const ul = byId("playersList");
  ul.innerHTML = "";
  players.forEach((name, idx) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700";
    li.innerHTML =
      "<span class='player-name flex-1'>" +
      escapeHtml(name) +
      "</span><button class='del text-red-600 hover:underline text-xs'>hapus</button>";
      // === meta mini controls (gender + level)
      const meta = playerMeta[name] || { gender:'', level:'' };

      // gender select
      const gSel = document.createElement('select');
      gSel.className = 'player-meta border rounded px-1 py-0.5 text-xs dark:bg-gray-900 dark:border-gray-700';
      ['','M','F'].forEach(v => gSel.appendChild(new Option(v || '–', v)));
      gSel.value = meta.gender || '';
      gSel.onchange = () => {
        playerMeta[name] = { ...playerMeta[name], gender: gSel.value };
        markDirty();
      };

      // level select
      const lSel = document.createElement('select');
      lSel.className = 'player-meta border rounded px-1 py-0.5 text-xs dark:bg-gray-900 dark:border-gray-700';
      [['','–'], ['beg','Beginner'], ['pro','Pro']]
        .forEach(([v,t]) => lSel.add(new Option(t, v)));
      lSel.value = meta.level || '';
      lSel.onchange = () => {
        playerMeta[name] = { ...playerMeta[name], level: lSel.value };
        markDirty();
      };

      // sisipkan di antara nama & tombol hapus
      const nameSpan = li.querySelector('.player-name');
      const delBtn   = li.querySelector('.del');
      nameSpan.after(gSel, lSel);

    li.querySelector(".del").addEventListener("click", () => {
      if (!confirm("Hapus " + name + "?")) return;
      players.splice(idx, 1);
      removePlayerFromRounds(name);
      delete playerMeta[name];
      markDirty();
      renderPlayersList();
      renderAll();
      validateNames();
    });
    ul.appendChild(li);
  });
  byId("globalInfo").textContent =
    "Pemain: " +
    players.length +
    " | Ronde/lapangan: " +
    (byId("roundCount").value || 10) +
    " | Menit/ronde: " +
    (byId("minutesPerRound").value || 12);
}
function addPlayer(name) {
  name = (name || "").trim();
  if (!name) return;
  players.push(name);
  markDirty();
  renderPlayersList();
  validateNames();
}
function removePlayerFromRounds(name) {
  [rounds1, rounds2].forEach((arr) =>
    arr.forEach((r) =>
      ["a1", "a2", "b1", "b2"].forEach((k) => {
        if (r && r[k] === name) r[k] = "";
      })
    )
  );
}
function showTextModal() {
  byId("playersText").value = players.join("\n");
  byId("textModal").classList.remove("hidden");
}
function hideTextModal() {
  byId("textModal").classList.add("hidden");
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
function validateNames() {
  const warn = byId("playersWarnings");
  warn.innerHTML = "";
  const map = new Map();
  const dups = [];
  players.forEach((p, i) => {
    const k = p.trim().toLowerCase();
    if (map.has(k)) dups.push([map.get(k), i]);
    else map.set(k, i);
  });
  const items = [];
  if (dups.length) {
    items.push(
      "<div class='text-amber-600'>Duplikat: " +
        dups.map(([a, b]) => players[a] + " ↔ " + players[b]).join(", ") +
        "</div>"
    );
  }
  const sugg = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const d = levenshtein(players[i], players[j]);
      if (d > 0 && d <= 2) sugg.push([players[i], players[j], d]);
    }
  }
  if (sugg.length) {
    items.push(
      "<div class='text-blue-600'>Mirip (cek typo): " +
        sugg.map((s) => s[0] + " ~ " + s[1]).join(", ") +
        "</div>"
    );
  }
  warn.innerHTML = items.join("");
}

// COURT
function initRoundsLength() {
  const R = parseInt(byId("roundCount").value || "10", 10);
  while (rounds1.length < R)
    rounds1.push({ a1: "", a2: "", b1: "", b2: "", scoreA: "", scoreB: "" });
  while (rounds2.length < R)
    rounds2.push({ a1: "", a2: "", b1: "", b2: "", scoreA: "", scoreB: "" });
  if (rounds1.length > R) rounds1 = rounds1.slice(0, R);
  if (rounds2.length > R) rounds2 = rounds2.slice(0, R);
}
function renderCourt(container, arr) {
  const start = byId("startTime").value || "19:00";
  const minutes = parseInt(byId("minutesPerRound").value || "12", 10);
  const R = parseInt(byId("roundCount").value || "10", 10);
  const [h, m] = start.split(":").map(Number);
  const base = new Date();
  base.setHours(h || 19, m || 0, 0, 0);

  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "court-wrapper overflow-x-auto";

  const table = document.createElement("table");
  table.className = "min-w-full text-sm dark-table";
  table.innerHTML = `
    <thead>
      <tr class="text-left border-b border-gray-200 dark:border-gray-700">
        <th class="py-2 pr-4">≡</th>
        <th class="py-2 pr-4">#</th>
        <th class="py-2 pr-4">Waktu</th>
        <th class="py-2 pr-4">Player1A</th>
        <th class="py-2 pr-4">Player2A</th>
        <th class="py-2 pr-4">Player1B</th>
        <th class="py-2 pr-4">Player2B</th>
        <th class="py-2 pr-4">Skor A</th>
        <th class="py-2 pr-4">Skor B</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  const tbody = table.querySelector("tbody");

  for (let i = 0; i < R; i++) {
    const r = arr[i] || {
      a1: "",
      a2: "",
      b1: "",
      b2: "",
      scoreA: "",
      scoreB: "",
    };
    const t0 = new Date(base.getTime() + i * minutes * 60000);
    const t1 = new Date(t0.getTime() + minutes * 60000);

    const tr = document.createElement("tr");
    tr.className =
      "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40";
    tr.draggable = true;
    tr.dataset.index = i;
    tr.addEventListener("dragstart", (e) => {
      tr.classList.add("row-dragging");
      e.dataTransfer.setData("text/plain", String(i));
    });
    tr.addEventListener("dragend", () => tr.classList.remove("row-dragging"));
    tr.addEventListener("dragover", (e) => {
      e.preventDefault();
      tr.classList.add("row-drop-target");
    });
    tr.addEventListener("dragleave", () =>
      tr.classList.remove("row-drop-target")
    );
    tr.addEventListener("drop", (e) => {
      e.preventDefault();
      tr.classList.remove("row-drop-target");
      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = Number(tr.dataset.index);
      if (isNaN(from) || isNaN(to) || from === to) return;
      const item = arr.splice(from, 1)[0];
      arr.splice(to, 0, item);
      markDirty();
      renderAll();
    });

    const tdHandle = document.createElement("td");
    tdHandle.textContent = "≡";
    tdHandle.className = "py-2 pr-4 text-gray-400";
    tdHandle.style.cursor = "grab";
    tr.appendChild(tdHandle);
    const tdIdx = document.createElement("td");
    tdIdx.textContent = "R" + (i + 1);
    tdIdx.className = "py-2 pr-4 font-medium";
    tr.appendChild(tdIdx);
    const tdTime = document.createElement("td");
    tdTime.textContent = toHM(t0) + "–" + toHM(t1);
    tdTime.className = "py-2 pr-4";
    tr.appendChild(tdTime);

    function selCell(k) {
      const td = document.createElement("td");
      const sel = document.createElement("select");
      sel.className =
        "border rounded-lg px-2 py-1 min-w-[6rem] max-w-[7rem] sm:max-w-[10rem] bg-white dark:bg-gray-900 dark:border-gray-700";
      sel.appendChild(new Option("—", ""));
      players.forEach((p) => sel.appendChild(new Option(p, p)));
      sel.value = r[k] || "";
      sel.addEventListener("change", (e) => {
        arr[i] = { ...arr[i], [k]: e.target.value };
        markDirty();
        validateAll();
        computeStandings();
      });
      td.appendChild(sel);
      return td;
    }
    function scCell(k) {
      const td = document.createElement("td");
      const inp = document.createElement("input");
      inp.className =
        "border rounded-lg px-2 py-1 w-[3.5rem] sm:w-[4.5rem] bg-white dark:bg-gray-900 dark:border-gray-700";
      inp.inputMode = "numeric";
      inp.value = r[k] || "";
      inp.addEventListener("input", (e) => {
        arr[i] = {
          ...arr[i],
          [k]: String(e.target.value).replace(/[^0-9]/g, ""),
        };
        markDirty();
        validateAll();
        computeStandings();
      });
      td.appendChild(inp);
      return td;
    }
    tr.appendChild(selCell("a1"));
    tr.appendChild(selCell("a2"));
    tr.appendChild(selCell("b1"));
    tr.appendChild(selCell("b2"));
    tr.appendChild(scCell("scoreA"));
    tr.appendChild(scCell("scoreB"));
    tbody.appendChild(tr);
  }

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

function renderCourtActive(){
  ensureRoundsLengthForAllCourts();
  const container = byId('courtContainer');
  container.innerHTML = '';
  const arr = roundsByCourt[activeCourt] || [];
  renderCourt(container, arr);  // gunakan fungsi renderCourt Anda yang sudah ada
}


// RENDER + VALIDATION + STANDINGS
function renderAll(){
  ensureRoundsLengthForAllCourts();
  renderCourtsToolbar();
  renderCourtActive();
  validateAll();
  computeStandings();
}

function renderCourtsToolbar(){
  const bar = byId('courtsToolbar');
  const addBtn = byId('btnAddCourt');

  // simpan posisi scroll sebelum kita rebuild
  const prevScroll = bar.scrollLeft;

  // styling anti-wrap (kalau belum ada di HTML)
  bar.classList.add('overflow-x-auto','whitespace-nowrap','flex','items-center','gap-2');

  // bersihkan semua tab (jangan hapus tombol add)
  [...bar.querySelectorAll('.court-tab, .court-close-wrap, .court-holder')].forEach(el => el.remove());

  roundsByCourt.forEach((_, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'court-tab court-holder text-sm border-b-2 px-3 py-1.5 rounded-t-lg ' +
                    (idx===activeCourt ? 'active' : 'text-gray-500 border-transparent');
    btn.textContent = 'Lapangan ' + (idx+1);
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      // simpan posisi scroll saat ini agar tidak geser ketika re-render
      const keep = byId('courtsToolbar').scrollLeft;
      activeCourt = idx;
      renderAll();
      byId('courtsToolbar').scrollLeft = keep;
    });

    const wrap = document.createElement('span');
    wrap.className = 'court-close-wrap inline-flex items-center';
    if (idx > 0) {
      const del = document.createElement('button');
      del.className = 'court-close text-xs px-1';
      del.title = 'Hapus Lapangan';
      del.textContent = '🗑️';
      del.addEventListener('click', (e)=>{
        e.stopPropagation();
        const keep = byId('courtsToolbar').scrollLeft;
        if (!confirm('Hapus Lapangan '+(idx+1)+'? Data ronde di lapangan ini akan hilang.')) return;
        roundsByCourt.splice(idx,1);
        if (activeCourt >= roundsByCourt.length) activeCourt = roundsByCourt.length-1;
        markDirty();
        renderAll();
        byId('courtsToolbar').scrollLeft = keep;
      });
      wrap.appendChild(del);
    } else {
      const ph = document.createElement('span'); ph.style.width='0.5rem'; wrap.appendChild(ph);
    }

    const holder = document.createElement('span');
    holder.className = 'court-holder inline-flex items-center gap-1';
    holder.appendChild(btn);
    holder.appendChild(wrap);

    bar.insertBefore(holder, addBtn);
  });

  // kembalikan posisi scroll setelah rebuild
  bar.scrollLeft = prevScroll;
}



// Validasi: pasangan boleh sama; duplikat lawan dicek PER lapangan; double-booking tetap dicek
function validateAll(){
  const R = parseInt(byId('roundCount').value || '10', 10);
  const problems = [];

  // 1) Double-booking per ronde lintas semua lapangan
  for(let i=0;i<R;i++){
    const names = [];
    roundsByCourt.forEach(courtArr=>{
      const r=courtArr[i];
      if(r){ names.push(r.a1, r.a2, r.b1, r.b2); }
    });
    const filtered = names.filter(Boolean);
    const set = new Set(filtered);
    if(set.size !== filtered.length){
      problems.push('Bentrok jadwal: R'+(i+1)+' ada pemain di dua lapangan.');
    }
  }

  // 2) Duplikat lawan PER lapangan (partners boleh sama)
  const teamKey = (p,q)=>[p||'',q||''].sort().join(' & ');
  const matchKey = (r)=>{ if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) return ''; const tA=teamKey(r.a1,r.a2), tB=teamKey(r.b1,r.b2); return [tA,tB].sort().join(' vs '); };

  roundsByCourt.forEach((courtArr, ci)=>{
    const seen = new Map();
    for(let i=0;i<R;i++){
      const r=courtArr[i];
      if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) continue;
      const key = matchKey(r);
      if(seen.has(key)){
        problems.push('Duplikat lawan (Lap '+(ci+1)+'): '+key+' muncul lagi di R'+(i+1)+' (sebelumnya '+seen.get(key)+').');
      } else {
        seen.set(key, 'R'+(i+1));
      }
    }
  });

  const box = byId('errors');
  box.innerHTML = problems.length
    ? `<div class="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
         <div class="font-semibold mb-1">Validasi:</div>
         <ul class="list-disc pl-5 space-y-1">${problems.map(p=>`<li>${p}</li>`).join('')}</ul>
       </div>`
    : `<div class="p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm">Tidak ada masalah penjadwalan.</div>`;
  return problems.length===0;
}


function computeStandings(){
  const data={}; players.forEach(p=>data[p]={total:0,diff:0,win:0,lose:0,draw:0});
  const applyRound = (r)=>{
    const a=Number(r?.scoreA||0), b=Number(r?.scoreB||0);
    if(!(r?.a1&&r?.a2&&r?.b1&&r?.b2)) return;
    [r.a1,r.a2].forEach(p=>{ if(data[p]){ data[p].total+=a; data[p].diff+=(a-b); }});
    [r.b1,r.b2].forEach(p=>{ if(data[p]){ data[p].total+=b; data[p].diff+=(b-a); }});
    if(a>0||b>0){
      if(a>b){ [r.a1,r.a2].forEach(p=>data[p]&&data[p].win++); [r.b1,r.b2].forEach(p=>data[p]&&data[p].lose++); }
      else if(a<b){ [r.b1,r.b2].forEach(p=>data[p]&&data[p].win++); [r.a1,r.a2].forEach(p=>data[p]&&data[p].lose++); }
      else { [r.a1,r.a2,r.b1,r.b2].forEach(p=>{ if(data[p]) data[p].draw++; }); }
    }
  };
  roundsByCourt.forEach(arr => arr.forEach(applyRound));

  let arr=Object.entries(data).map(([player,v])=>{
    const gp=v.win+v.lose+v.draw;
    return {player,...v,winRate:gp? v.win/gp:0};
  });
  arr.sort((p,q)=>(q.total-p.total)||(q.diff-p.diff)||(q.win-p.win)||p.player.localeCompare(q.player));
  let rank=1; arr.forEach((s,i)=>{ if(i>0){ const pv=arr[i-1]; const tie=(s.total===pv.total&&s.diff===pv.diff&&s.win===pv.win); rank=tie?rank:(i+1);} s.rank=rank; });

  const tbody=byId('standings').querySelector('tbody'); tbody.innerHTML='';
  arr.forEach(s=>{
    const tr=document.createElement('tr');
    tr.className = s.rank===1?'rank-1': s.rank===2?'rank-2': s.rank===3?'rank-3':'';
    tr.innerHTML = `<td class="py-2 pr-4 font-semibold">${s.rank}</td>
                    <td class="py-2 pr-4 font-medium">${s.player}</td>
                    <td class="py-2 pr-4">${s.total}</td>
                    <td class="py-2 pr-4">${s.diff}</td>
                    <td class="py-2 pr-4">${s.win}</td>
                    <td class="py-2 pr-4">${s.lose}</td>
                    <td class="py-2 pr-4">${s.draw}</td>
                    <td class="py-2 pr-4">${(s.winRate*100).toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });
}


// --- util: normalisasi tanggal "YYYY-MM-DD" ---
function fmtDate(d){ return d; } // sessions.json sudah simpan "YYYY-MM-DD"

// --- hitung stats dari 1 sesi (pakai aturan yang sama) ---
function statsFromSession(session, whichCourt='both'){
  const data = {}; // {player:{total,diff,win,lose,draw,games}}
  function ensure(p){ if(!data[p]) data[p]={total:0,diff:0,win:0,lose:0,draw:0,games:0}; }
  function applyRound(r){
    const a=Number(r?.scoreA||0), b=Number(r?.scoreB||0);
    if(!(r?.a1&&r?.a2&&r?.b1&&r?.b2)) return;
    [r.a1,r.a2,r.b1,r.b2].forEach(ensure);
    // total & selisih
    [r.a1,r.a2].forEach(p=>{ data[p].total+=a; data[p].diff+=(a-b); data[p].games++; });
    [r.b1,r.b2].forEach(p=>{ data[p].total+=b; data[p].diff+=(b-a); data[p].games++; });
    // W/L/D
    if(a>b){ [r.a1,r.a2].forEach(p=>data[p].win++); [r.b1,r.b2].forEach(p=>data[p].lose++); }
    else if(a<b){ [r.b1,r.b2].forEach(p=>data[p].win++); [r.a1,r.a2].forEach(p=>data[p].lose++); }
    else { [r.a1,r.a2,r.b1,r.b2].forEach(p=>data[p].draw++); }
  }
  if(whichCourt==='both' || whichCourt==='1') (session.rounds1||[]).forEach(applyRound);
  if(whichCourt==='both' || whichCourt==='2') (session.rounds2||[]).forEach(applyRound);
  return data;
}

// --- gabung beberapa sesi ---
function aggregateStats(sessionsArr, whichCourt='both'){
  const agg={}; // player -> totals
  sessionsArr.forEach(s=>{
    const one=statsFromSession(s, whichCourt);
    Object.entries(one).forEach(([p,v])=>{
      if(!agg[p]) agg[p]={total:0,diff:0,win:0,lose:0,draw:0,games:0};
      agg[p].total+=v.total; agg[p].diff+=v.diff;
      agg[p].win+=v.win; agg[p].lose+=v.lose; agg[p].draw+=v.draw; agg[p].games+=v.games;
    });
  });
  // urutkan
  let arr=Object.entries(agg).map(([player,v])=>{
    const gp=v.win+v.lose+v.draw; // atau v.games/2 tergantung definisi
    return {player,...v,winRate: gp ? v.win/gp : 0};
  });
  arr.sort((a,b)=>(b.total-a.total)||(b.diff-a.diff)||(b.win-a.win)||a.player.localeCompare(b.player));
  // ranking
  let rank=1; arr.forEach((s,i)=>{ if(i>0){ const pv=arr[i-1]; const tie=(s.total===pv.total&&s.diff===pv.diff&&s.win===pv.win); rank=tie?rank:(i+1);} s.rank=rank; });
  return arr;
}

// --- tampilkan report ---
function openReportModal(){ byId('reportModal').classList.remove('hidden'); }
function closeReportModal(){ byId('reportModal').classList.add('hidden'); }

function runReport(){
  const from = byId('repFrom').value || '0000-01-01';
  const to   = byId('repTo').value   || '9999-12-31';
  const court= byId('repCourt').value; // 'both' | '1' | '2'

  const sessionsArr = Object.values(store.sessions || {}).filter(s=>{
    const d = s.date || '';
    return d >= from && d <= to;
  });

  const arr = aggregateStats(sessionsArr, court);

  // summary
  const totalDates = new Set(sessionsArr.map(s=>s.date)).size;
  const totalGames = sessionsArr.reduce((sum,s)=>{
    const r1 = (court==='both'||court==='1') ? (s.rounds1||[]).filter(r=>r.a1&&r.a2&&r.b1&&r.b2).length : 0;
    const r2 = (court==='both'||court==='2') ? (s.rounds2||[]).filter(r=>r.a1&&r.a2&&r.b1&&r.b2).length : 0;
    return sum + r1 + r2;
  },0);
  const uniquePlayers = new Set(arr.map(x=>x.player)).size;
  byId('reportSummary').textContent =
    `Rentang: ${from} → ${to} • Tanggal: ${totalDates} • Game: ${totalGames} • Pemain: ${uniquePlayers}`;

  // table
  const tbody = byId('reportTable').querySelector('tbody');
  tbody.innerHTML='';
  arr.forEach(s=>{
    const tr=document.createElement('tr');
    tr.className = s.rank===1?'rank-1': s.rank===2?'rank-2': s.rank===3?'rank-3':'';
    tr.innerHTML = `
      <td class="py-2 pr-4 font-semibold">${s.rank}</td>
      <td class="py-2 pr-4 font-medium">${s.player}</td>
      <td class="py-2 pr-4">${s.games}</td>
      <td class="py-2 pr-4">${s.total}</td>
      <td class="py-2 pr-4">${s.diff}</td>
      <td class="py-2 pr-4">${s.win}</td>
      <td class="py-2 pr-4">${s.lose}</td>
      <td class="py-2 pr-4">${s.draw}</td>
      <td class="py-2 pr-4">${(s.winRate*100).toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });

  // export CSV
  byId('btnExportReportCSV').onclick = ()=>{
    const header=['Player','Games','Total','Selisih','Menang','Kalah','Seri','WinRate'];
    const rows=[header, ...arr.map(s=>[
      s.player, s.games, s.total, s.diff, s.win, s.lose, s.draw, (s.winRate*100).toFixed(1)+'%'
    ])];
    const csv=rows.map(r=>r.map(csvEscape).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`report_${from}_to_${to}.csv`; a.click(); URL.revokeObjectURL(url);
  };
}


// AUTO FILL (tab aktif)
function autoFillActiveTab() {
  const R = parseInt(byId("roundCount").value || "10", 10);
  players = Array.from(byId("playersList").querySelectorAll(".player-name"))
    .map((el) => el.textContent.trim())
    .filter(Boolean);
  if (players.length < 4) return;

  const other = activeTab === 1 ? rounds2 : rounds1;
  let target = activeTab === 1 ? rounds1 : rounds2;
  target = [];

  const seenAppear = Object.fromEntries(players.map((p) => [p, 0]));
  function chooseFour(i) {
    const busy = new Set();
    const o = other[i] || {};
    [o?.a1, o?.a2, o?.b1, o?.b2].forEach((x) => x && busy.add(x));
    const cand = players.filter((p) => !busy.has(p));
    cand.sort((a, b) => seenAppear[a] - seenAppear[b] || a.localeCompare(b));
    if (cand.length < 4) return null;
    return [cand[0], cand[1], cand[2], cand[3]];
  }

  for (let i = 0; i < R; i++) {
    let four = chooseFour(i);
    if (!four) {
      const busy = new Set();
      const o = other[i] || {};
      [o?.a1, o?.a2, o?.b1, o?.b2].forEach((x) => x && busy.add(x));
      four = players.filter((p) => !busy.has(p)).slice(0, 4);
      if (four.length < 4) {
        target.push({});
        continue;
      }
    }
    const [A, B, C, D] = four;
    // pasangan boleh sama; cek lawan dilakukan di validateAll per lapangan
    target.push({ a1: A, a2: B, b1: C, b2: D, scoreA: "", scoreB: "" });
    seenAppear[A]++;
    seenAppear[B]++;
    seenAppear[C]++;
    seenAppear[D]++;
  }

  if (activeTab === 1) rounds1 = target;
  else rounds2 = target;
}

function autoFillActiveCourt(){
  const R = parseInt(byId('roundCount').value || '10', 10);
  const pairMode = byId('pairMode') ? byId('pairMode').value : 'free';

  // list pemain final dari UI (pastikan sinkron)
  players = Array.from(byId('playersList').querySelectorAll('.player-name'))
            .map(el=>el.textContent.trim()).filter(Boolean);
  if (players.length < 4) return;

  const metaOf = (p)=> playerMeta[p] || {};
  const teamKey = (a,b)=>[a,b].sort().join(' & ');
  const matchKey = (a1,a2,b1,b2)=>[teamKey(a1,a2), teamKey(b1,b2)].sort().join(' vs ');

  const seenMatch = new Set(); // lawan unik per lapangan aktif
  const appear = Object.fromEntries(players.map(p=>[p,0]));
  const otherCourts = roundsByCourt.filter((_,i)=>i!==activeCourt);
  const target = [];

  // rule partner
  const fitsTeamRule = (x,y) => {
    if (pairMode==='free') return true;
    const mx = metaOf(x), my = metaOf(y);

    if (pairMode==='mixed') {
      if(!mx.gender || !my.gender) return false; // butuh set gender
      return mx.gender !== my.gender;            // beda gender
    }
    if (pairMode==='lvl_same') {
      return mx.level && my.level && mx.level === my.level;
    }
    if (pairMode==='lvl_bal') {
      // validasi akhir dilakukan saat pick (tiap tim harus beg+pro)
      return true;
    }
    return true;
  };

  function chooseFour(i){
    // yang busy di lapangan lain pada ronde i
    const busy = new Set();
    otherCourts.forEach(c=>{
      const r=c[i]; if(r) [r.a1,r.a2,r.b1,r.b2].forEach(z=>z&&busy.add(z));
    });

    const cand = players.filter(p=>!busy.has(p));
    cand.sort((a,b)=>(appear[a]-appear[b])||a.localeCompare(b));

    // cari kombinasi 4 yang memungkinkan aturan
    for(let a=0;a<cand.length;a++){
      for(let b=a+1;b<cand.length;b++){
        for(let c=b+1;c<cand.length;c++){
          for(let d=c+1;d<cand.length;d++){
            const A=cand[a], B=cand[b], C=cand[c], D=cand[d];

            if (pairMode==='lvl_bal'){
              const lv=[A,B,C,D].map(p=>metaOf(p).level||'');
              const cntBeg = lv.filter(x=>x==='beg').length;
              const cntPro = lv.filter(x=>x==='pro').length;
              if (!(cntBeg>=2 && cntPro>=2)) continue;
            }
            return [A,B,C,D];
          }
        }
      }
    }
    return null;
  }

  function pickNonDuplicate(A,B,C,D){
    const opts = [
      {a1:A,a2:B,b1:C,b2:D},
      {a1:A,a2:C,b1:B,b2:D},
      {a1:A,a2:D,b1:B,b2:C},
    ].filter(o=>{
      if(!fitsTeamRule(o.a1,o.a2)) return false;
      if(!fitsTeamRule(o.b1,o.b2)) return false;

      if (pairMode==='lvl_bal'){
        const AB=[metaOf(o.a1).level, metaOf(o.a2).level];
        const CD=[metaOf(o.b1).level, metaOf(o.b2).level];
        const okAB = AB.includes('beg') && AB.includes('pro');
        const okCD = CD.includes('beg') && CD.includes('pro');
        if (!(okAB && okCD)) return false;
      }
      return !seenMatch.has(matchKey(o.a1,o.a2,o.b1,o.b2));
    });
    return opts[0] || null;
  }

  for(let i=0;i<R;i++){
    const four = chooseFour(i);
    if(!four){ target.push({}); continue; }

    const [A,B,C,D] = four;
    let picked = pickNonDuplicate(A,B,C,D);
    if(!picked) picked = {a1:A,a2:B,b1:C,b2:D}; // fallback, validasi bisa warning

    target.push({...picked, scoreA:'', scoreB:''});
    [picked.a1,picked.a2,picked.b1,picked.b2].forEach(p=>appear[p]++);
    seenMatch.add(matchKey(picked.a1,picked.a2,picked.b1,picked.b2));
  }

  roundsByCourt[activeCourt] = target;
}

// EXPORTS
function exportRoundsCSV() {
  const header = [
    "Tanggal",
    "Lapangan",
    "Time",
    "Player1A",
    "Player2A",
    "Player1B",
    "Player2B",
    "SkorA",
    "SkorB",
  ];
  const start = byId("startTime").value || "19:00";
  const minutes = parseInt(byId("minutesPerRound").value || "12", 10);
  const R = parseInt(byId("roundCount").value || "10", 10);
  const date = byId("sessionDate").value || "";
  const [h, m] = start.split(":").map(Number);
  const base = new Date();
  base.setHours(h || 19, m || 0, 0, 0);
  const rowsFor = (label, arr) => {
    const rows = [];
    for (let i = 0; i < R; i++) {
      const t0 = new Date(base.getTime() + i * minutes * 60000);
      const t1 = new Date(t0.getTime() + minutes * 60000);
      const r = arr[i] || {};
      rows.push([
        date,
        label,
        toHM(t0) + "–" + toHM(t1),
        r.a1 || "",
        r.a2 || "",
        r.b1 || "",
        r.b2 || "",
        r.scoreA || "",
        r.scoreB || "",
      ]);
    }
    return rows;
  };
  const rows = [
    header,
    ...rowsFor("Lap 1", rounds1),
    ...rowsFor("Lap 2", rounds2),
  ];
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rounds_2lapangan.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function exportStandingsCSV() {
  const data = {};
  players.forEach(
    (p) => (data[p] = { total: 0, diff: 0, win: 0, lose: 0, draw: 0 })
  );
  const apply = (arr) =>
    arr.forEach((r) => {
      const a = Number(r?.scoreA || 0),
        b = Number(r?.scoreB || 0);
      if (!(r?.a1 && r?.a2 && r?.b1 && r?.b2)) return;
      [r.a1, r.a2].forEach((p) => {
        if (data[p]) {
          data[p].total += a;
          data[p].diff += a - b;
        }
      });
      [r.b1, r.b2].forEach((p) => {
        if (data[p]) {
          data[p].total += b;
          data[p].diff += b - a;
        }
      });
      if (a > 0 || b > 0) {
        if (a > b) {
          [r.a1, r.a2].forEach((p) => data[p] && data[p].win++);
          [r.b1, r.b2].forEach((p) => data[p] && data[p].lose++);
        } else if (a < b) {
          [r.b1, r.b2].forEach((p) => data[p] && data[p].win++);
          [r.a1, r.a2].forEach((p) => data[p] && data[p].lose++);
        } else {
          [r.a1, r.a2, r.b1, r.b2].forEach((p) => {
            if (data[p]) data[p].draw++;
          });
        }
      }
    });
  apply(rounds1);
  apply(rounds2);
  let arr = Object.entries(data).map(([player, v]) => {
    const gp = v.win + v.lose + v.draw;
    return [
      player,
      v.total,
      v.diff,
      v.win,
      v.lose,
      v.draw,
      (gp ? (v.win / gp) * 100 : 0).toFixed(1) + "%",
    ];
  });
  arr.sort(
    (a, b) =>
      b[1] - a[1] || b[2] - a[2] || b[3] - a[3] || a[0].localeCompare(b[0])
  );
  const header = [
    "Tanggal",
    "Player",
    "Total",
    "Selisih",
    "Menang",
    "Kalah",
    "Seri",
    "WinRate",
  ];
  const date = byId("sessionDate").value || "";
  const rows = [header, ...arr.map((r) => [date, ...r])];
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "standings_2lapangan.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// EVENTS
byId("btnTheme").addEventListener("click", toggleTheme);

// Header menu toggle (HP)
const btnHdrMenu = document.getElementById("btnHdrMenu");
if (btnHdrMenu) {
  btnHdrMenu.addEventListener("click", () => {
    const panel = document.getElementById("hdrControls");
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) panel.classList.add("hdr-slide");
    setTimeout(() => panel.classList.remove("hdr-slide"), 220);
  });
  window.addEventListener("resize", () => {
    const panel = document.getElementById("hdrControls");
    if (window.innerWidth >= 768) panel.classList.remove("hidden");
  });
}

// Filter panel toggle (HP)
const btnFilter = document.getElementById("btnFilter");
if (btnFilter) {
  btnFilter.addEventListener("click", () => {
    const panel = document.getElementById("filterPanel");
    const willShow = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    btnFilter.textContent = willShow
      ? "🔎 Sembunyikan Filter"
      : "🔎 Filter / Jadwal";
    if (willShow) panel.classList.add("filter-slide");
    setTimeout(() => panel.classList.remove("filter-slide"), 220);
  });
  window.addEventListener("resize", () => {
    const panel = document.getElementById("filterPanel");
    if (window.innerWidth >= 768) panel.classList.remove("hidden");
  });
}

byId("btnCollapsePlayers").addEventListener("click", () =>
  byId("playersPanel").classList.toggle("hidden")
);
byId('btnApplyPlayersActive').addEventListener('click', ()=>{
  const arr = roundsByCourt[activeCourt] || [];
  const has = arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB));
  if(has && !confirm('Menerapkan pemain akan menghapus pairing+skor pada lapangan aktif. Lanjutkan?')) return;
  autoFillActiveCourt(); markDirty(); renderAll(); computeStandings();
});

byId('btnResetActive').addEventListener('click', ()=>{
  const arr = roundsByCourt[activeCourt] || [];
  const has = arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB));
  if(has && !confirm('Data pada lapangan aktif akan dihapus. Lanjutkan?')) return;
  roundsByCourt[activeCourt] = [];
  markDirty(); renderAll();
});

byId("btnClearScores").addEventListener("click", () => {
  rounds1.forEach((r) => {
    r.scoreA = "";
    r.scoreB = "";
  });
  rounds2.forEach((r) => {
    r.scoreA = "";
    r.scoreB = "";
  });
  markDirty();
  renderAll();
});
byId("btnExportRounds").addEventListener("click", exportRoundsCSV);
byId("btnExportStandings").addEventListener("click", exportStandingsCSV);
byId("btnSave").addEventListener("click", saveToJSONFile);
byId("btnLoadByDate").addEventListener("click", loadSessionByDate);
byId("btnImportJSON").addEventListener("click", () =>
  byId("fileInputJSON").click()
);
byId("fileInputJSON").addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) loadJSONFromFile(e.target.files[0]);
  e.target.value = "";
});

byId("startTime").addEventListener("change", () => {
  markDirty();
  renderAll();
});
byId("minutesPerRound").addEventListener("input", () => {
  markDirty();
  renderAll();
});
byId("roundCount").addEventListener("input", () => {
  markDirty();
  renderAll();
});

// byId("tab1").addEventListener("click", () => {
//   activeTab = 1;
//   renderAll();
// });
// byId("tab2").addEventListener("click", () => {
//   activeTab = 2;
//   renderAll();
// });

byId("btnAddPlayer").addEventListener("click", () => {
  const v = byId("newPlayer").value;
  byId("newPlayer").value = "";
  addPlayer(v);
});
byId("newPlayer").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    byId("btnAddPlayer").click();
  }
});
byId("btnClearPlayers").addEventListener("click", () => {
  if (!confirm("Kosongkan semua pemain?")) return;
  players = [];
  markDirty();
  renderPlayersList();
  validateNames();
});
byId("btnPasteText").addEventListener("click", () => {
  showTextModal();
  byId("playersText").focus();
});
byId("btnApplyText").addEventListener("click", () => {
  players = parsePlayersText(byId("playersText").value);
  hideTextModal();
  markDirty();
  renderPlayersList();
  validateNames();
});
byId("btnCancelText").addEventListener("click", hideTextModal);

// Boot
(function boot() {
  applyThemeFromStorage();
  if (!byId("sessionDate").value) {
    const d = new Date();
    const s =
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    byId("sessionDate").value = s;
  }
  players = [
    "Della",
    "Rangga",
    "Fai",
    "Gizla",
    "Abdi",
    "Diana",
    "Kris",
    "Ichsan",
    "Marchel",
    "Altundri",
  ];
  renderPlayersList();
  renderAll();
  validateNames();
  startAutoSave();
})();

// Report events
byId('btnReport').addEventListener('click', ()=>{
  const keys = Object.keys(store.sessions||{}).sort();
  byId('repFrom').value = keys[0] || byId('sessionDate').value;
  byId('repTo').value   = keys[keys.length-1] || byId('sessionDate').value;
  openReportModal();
  runReport();
});
byId('btnReportClose').addEventListener('click', closeReportModal);
byId('btnRunReport').addEventListener('click', runReport);

byId('btnAddCourt').addEventListener('click', ()=>{
  const R = parseInt(byId('roundCount').value || '10', 10);
  const arr = Array.from({length:R}, ()=>({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''}));
  roundsByCourt.push(arr);
  activeCourt = roundsByCourt.length - 1;
  markDirty();
  renderAll();
});

