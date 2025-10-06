"use strict";
// ===============  RENDER + VALIDATION + STANDINGS ================ //
function renderAll(){
  ensureRoundsLengthForAllCourts();
  renderCourtsToolbar();
  renderCourtActive();
  validateAll();
  computeStandings();
}

function renderFairnessInfo(){
  // buat container kalau belum ada
  let box = byId('fairnessInfo');
  if(!box){
    box = document.createElement('div');
    box.id='fairnessInfo';
    box.className='mt-3 text-xs bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2';
    const toolbar = byId('courtsToolbar') || document.body;
    toolbar.parentNode.insertBefore(box, toolbar.nextSibling);
  }

  // hitung total setelah penjadwalan (SEMUA lapangan, termasuk court aktif)
  const cnt = countAppearAll(-1); // tidak exclude apa pun
  const list = players.slice().sort((a,b)=>{
    const da=(cnt[a]||0), db=(cnt[b]||0);
    if(da!==db) return db-da; // desc biar kelihatan ekstrem
    return a.localeCompare(b);
  });
  const min = Math.min(...list.map(p=>cnt[p]||0));
  const max = Math.max(...list.map(p=>cnt[p]||0));
  const spread = max-min;

  const rows = list.map(p=>{
    const n = cnt[p]||0;
    const mark = (n===min?'⬇️':(n===max?'⬆️':'•'));
    return `<span class="inline-block mr-3">${mark} <b>${p}</b>: ${n}</span>`;
  }).join('');

  box.innerHTML = `
    <div class="font-semibold mb-1">Fairness Info (semua lapangan): min=${min}, max=${max}, selisih=${spread}</div>
    <div class="leading-6">${rows}</div>
    <div class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
      Tips: jika ada ⬆️ dan ⬇️ berjauhan, klik "Terapkan" lagi untuk mengacak ulang; 
      sistem mengutamakan pemain yang masih kurang main.
    </div>
  `;
}


// Override fairness renderer with a clean version (icons/text)
try {
  window.renderFairnessInfo = function(){
    let box = byId('fairnessInfo');
    if(!box){
      box = document.createElement('div');
      box.id='fairnessInfo';
      box.className='mt-3 text-xs bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2';
      const toolbar = byId('courtsToolbar') || document.body;
      toolbar.parentNode.insertBefore(box, toolbar.nextSibling);
    }
    const cnt = countAppearAll(-1);
    const list = players.slice().sort((a,b)=>{
      const da=(cnt[a]||0), db=(cnt[b]||0);
      if(da!==db) return db-da; return a.localeCompare(b);
    });
    const min = Math.min(...list.map(p=>cnt[p]||0));
    const max = Math.max(...list.map(p=>cnt[p]||0));
    const spread = max-min;
    const rows = list.map(p=>{
      const n = cnt[p]||0;
      const mark = (n===min ? '↓' : (n===max ? '↑' : '•'));
      return `<span class="inline-block mr-3">${mark} <b>${escapeHtml(p)}</b>: ${n}</span>`;
    }).join('');
    box.innerHTML = `
      <div class="font-semibold mb-1">Fairness Info (semua lapangan): min=${min}, max=${max}, selisih=${spread}</div>
      <div class="leading-6">${rows}</div>
      <div class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Tips: jika ada ↑ dan ↓ berjauhan, klik "Terapkan" lagi untuk mengacak ulang; sistem mengutamakan pemain yang masih kurang main.</div>
    `;
  };
} catch {}

function clearScoresActive(){
  const arr = roundsByCourt[activeCourt] || [];
  if (arr.length && arr.some(r => r && (r.scoreA || r.scoreB))) {
    if (!confirm('Hapus skor di lapangan aktif?')) return;
  }
  arr.forEach(r => { if (r) { r.scoreA = ''; r.scoreB = ''; } });
  markDirty(); renderAll(); computeStandings();
}

function clearScoresAll(){
  const hasAny = roundsByCourt.some(c => (c||[]).some(r => r && (r.scoreA || r.scoreB)));
  if (hasAny) {
    if (!confirm('Hapus skor di SEMUA lapangan?')) return;
  }
  roundsByCourt.forEach(courtArr => {
    courtArr.forEach(r => { if (r) { r.scoreA = ''; r.scoreB = ''; } });
  });
  markDirty(); renderAll(); computeStandings();
}


function renderCourtsToolbar(){
  const bar = byId('courtsToolbar');
  const addBtn = byId('btnAddCourt');
  if (addBtn) addBtn.disabled = isViewer();

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
    if (idx > 0 && !isViewer()) {
      const del = document.createElement('button');
      del.className = 'court-close text-xs px-1';
      del.title = 'Hapus Lapangan';
      // Clean close icon
      try { del.textContent = '✕'; } catch {}
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
      problems.push('Bentrok jadwal: Match '+(i+1)+' ada pemain di dua lapangan.');
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
        problems.push('Duplikat lawan (Lap '+(ci+1)+'): '+key+' muncul lagi di Match '+(i+1)+' (sebelumnya '+seen.get(key)+').');
      } else {
        seen.set(key, 'Match '+(i+1));
      }
    }
  });

  const box = byId('errors');
  // In viewer mode, hide validation details entirely
  try { if (typeof isViewer==='function' && isViewer()) { box.innerHTML=''; return true; } } catch {}
  box.innerHTML = problems.length
    ? `<div class="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
         <div class="font-semibold mb-1">Validasi:</div>
         <ul class="list-disc pl-5 space-y-1">${problems.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul>
       </div>`
    : `<div class="p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm">Tidak ada masalah penjadwalan.</div>`;
  try { if (typeof renderFairnessImbalanceAlert==='function') renderFairnessImbalanceAlert(); } catch {}
  return problems.length===0;
}

function applyDefaultPlayersTemplate() {
  players.splice(0, players.length, ...DEFAULT_PLAYERS_10);

  // reset meta yang tidak ada di template
  Object.keys(playerMeta).forEach(n => { if (!DEFAULT_PLAYERS_10.includes(n)) delete playerMeta[n]; });

  // bersihkan ronde dari nama yang tak ada di template
  const set = new Set(DEFAULT_PLAYERS_10);
  (roundsByCourt || []).forEach(court =>
    (court || []).forEach(r =>
      ['a1','a2','b1','b2'].forEach(k => { if (r && r[k] && !set.has(r[k])) r[k] = ''; })
    )
  );

  renderPlayersList?.();
  renderAll?.();
  computeStandings?.();
  markDirty();                 // ← simpan otomatis
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

  // ================ SUMMARY ================ //
  const totalDates = new Set(sessionsArr.map(s=>s.date)).size;
  const totalGames = sessionsArr.reduce((sum,s)=>{
    const r1 = (court==='both'||court==='1') ? (s.rounds1||[]).filter(r=>r.a1&&r.a2&&r.b1&&r.b2).length : 0;
    const r2 = (court==='both'||court==='2') ? (s.rounds2||[]).filter(r=>r.a1&&r.a2&&r.b1&&r.b2).length : 0;
    return sum + r1 + r2;
  },0);
  const uniquePlayers = new Set(arr.map(x=>x.player)).size;
  byId('reportSummary').textContent =
    `Rentang: ${from} → ${to} • Tanggal: ${totalDates} • Game: ${totalGames} • Pemain: ${uniquePlayers}`;

  // Normalize report summary text (clean separators)
  try {
    byId('reportSummary').textContent = `Rentang: ${from} - ${to} | Tanggal: ${totalDates} | Game: ${totalGames} | Pemain: ${uniquePlayers}`;
  } catch {}

  // table
  const tbody = byId('reportTable').querySelector('tbody');
  tbody.innerHTML='';
  arr.forEach(s=>{
    const tr=document.createElement('tr');
    tr.className = s.rank===1?'rank-1': s.rank===2?'rank-2': s.rank===3?'rank-3':'';
    tr.innerHTML = `
      <td class="py-2 pr-4 font-semibold">${s.rank}</td>
      <td class="py-2 pr-4 font-medium">${escapeHtml(s.player)}</td>
      <td class="py-2 pr-4">${s.games}</td>
      <td class="py-2 pr-4">${s.total}</td>
      <td class="py-2 pr-4">${s.diff}</td>
      <td class="py-2 pr-4">${s.win}</td>
      <td class="py-2 pr-4">${s.lose}</td>
      <td class="py-2 pr-4">${s.draw}</td>
      <td class="py-2 pr-4">${(s.winRate*100).toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });

  // ======================= export Excel ======================= //
  byId('btnExportReportExcel').onclick = ()=>{
    // Data yang sudah dihitung sebelumnya
    // arr: hasil aggregateStats(...) berisi {player,games,total,diff,win,lose,draw,winRate,rank}
    const from = byId('repFrom').value || '0000-01-01';
    const to   = byId('repTo').value   || '9999-12-31';
    const court= byId('repCourt').value; // 'both' | '1' | '2'
    const title = `Report ${from} to ${to} (Lap: ${court})`;

    // Header + rows
    const wsData = [
      [title],
      [],
      ['Rank','Pemain','Main','Total','Selisih','Menang','Kalah','Seri','WinRate']
    ];

    arr.forEach(s=>{
      wsData.push([
        s.rank,
        s.player,
        s.games,
        s.total,
        s.diff,
        s.win,
        s.lose,
        s.draw,
        (s.winRate*100).toFixed(1) + '%'
      ]);
    });

    // Buat workbook & sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto width kolom sederhana
    const colWidths = [
      { wch: 6 },  // Rank
      { wch: 18 }, // Pemain
      { wch: 6 },  // Main
      { wch: 8 },  // Total
      { wch: 8 },  // Selisih
      { wch: 7 },  // W
      { wch: 7 },  // L
      { wch: 7 },  // D
      { wch: 9 }   // WinRate
    ];
    ws['!cols'] = colWidths;

    // Bold untuk header
    const headerRow = 3; // baris ke-3 (1-based) berisi header
    const headerRange = XLSX.utils.encode_range({ s:{r:headerRow-1,c:0}, e:{r:headerRow-1,c:8} });
    const headerCells = XLSX.utils.decode_range(headerRange);
    for(let C = headerCells.s.c; C <= headerCells.e.c; C++){
      const cellAddr = XLSX.utils.encode_cell({r:headerRow-1, c:C});
      if(ws[cellAddr]) ws[cellAddr].s = { font: { bold: true } };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Klasemen');
    const fname = `report_${from}_to_${to}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

}
