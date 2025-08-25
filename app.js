'use strict';
// Helpers
const pad = (n)=>String(n).padStart(2,'0');
const toHM = (d)=>pad(d.getHours())+':'+pad(d.getMinutes());
const csvEscape=(v)=>{ if(v==null) return ''; const s=String(v); return /[,"\n]/.test(s)? '"'+s.replace(/"/g,'""')+'"' : s; };
const byId=(id)=>document.getElementById(id);
const parsePlayersText=(t)=>(t||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

// State
let activeTab=1, players=[], rounds1=[], rounds2=[], dirty=false, autosaveTimer=null;
let store = { sessions:{}, lastTs:null }; // in-memory, source of truth after load
const THEME_KEY='mix-americano-theme';

// Theme
function applyThemeFromStorage(){ const t=localStorage.getItem(THEME_KEY)||'light'; document.documentElement.classList.toggle('dark', t==='dark'); }
function toggleTheme(){ const dark=document.documentElement.classList.toggle('dark'); localStorage.setItem(THEME_KEY, dark?'dark':'light'); }

// Date/session helpers
function populateDatePicker(){
  const sel=byId('datePicker'); const cur=sel.value;
  sel.innerHTML='<option value="">Pilih tanggal…</option>';
  Object.keys(store.sessions).sort().forEach(d=>{ const o=document.createElement('option'); o.value=d; o.textContent=d; sel.appendChild(o); });
  if (Array.from(sel.options).some(o=>o.value===cur)) sel.value=cur;
}
function currentPayload(){
  return {
    date: byId('sessionDate').value || '',
    startTime: byId('startTime').value,
    minutesPerRound: byId('minutesPerRound').value,
    roundCount: byId('roundCount').value,
    players: players.join('\n'),
    rounds1, rounds2,
    ts: new Date().toISOString()
  };
}
function saveToStore(){
  const d = byId('sessionDate').value || '';
  if (!d){ alert('Isi tanggal dulu ya.'); return false; }
  store.sessions[d] = currentPayload();
  store.lastTs = new Date().toISOString();
  dirty=false; byId('unsavedDot').classList.add('hidden'); byId('lastSaved').textContent='Saved '+new Date().toLocaleTimeString();
  populateDatePicker();
  byId('datePicker').value = d;
  return true;
}
function saveToJSONFile(){
  if (!saveToStore()) return;
  const blob = new Blob([JSON.stringify(store,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='sessions.json'; a.click(); URL.revokeObjectURL(url);
}
function loadJSONFromFile(file){
  const r=new FileReader();
  r.onload=(ev)=>{
    try{
      const data=JSON.parse(ev.target.result);
      if (!data.sessions) throw new Error('Invalid JSON');
      store = data;
      populateDatePicker();
      alert('JSON dimuat. Silakan pilih tanggal lalu klik Load.');
    }catch(err){ console.error(err); alert('File JSON tidak valid.'); }
  };
  r.readAsText(file);
}
function loadSessionByDate(){
  const d = byId('datePicker').value || '';
  if (!d){ alert('Pilih tanggal di dropdown.'); return; }
  const data = store.sessions[d];
  if (!data){ alert('Tidak ada data untuk tanggal tsb.'); return; }
  byId('sessionDate').value = data.date || d;
  byId('startTime').value = data.startTime || '19:00';
  byId('minutesPerRound').value = data.minutesPerRound || '12';
  byId('roundCount').value = data.roundCount || '10';
  rounds1 = Array.isArray(data.rounds1)? data.rounds1 : [];
  rounds2 = Array.isArray(data.rounds2)? data.rounds2 : [];
  players = parsePlayersText(data.players || '');
  renderPlayersList(); renderAll(); markSaved(data.ts);
}
function markDirty(){ dirty=true; byId('unsavedDot').classList.remove('hidden'); }
function markSaved(ts){ dirty=false; byId('unsavedDot').classList.add('hidden'); if(ts) byId('lastSaved').textContent='Saved '+new Date(ts).toLocaleTimeString(); }
function startAutoSave(){ if (autosaveTimer) clearInterval(autosaveTimer); autosaveTimer=setInterval(()=>{ if(dirty) saveToStore(); }, 30000); }

// Players (no dnd)
function renderPlayersList(){
  const ul=byId('playersList'); ul.innerHTML='';
  players.forEach((name, idx)=>{
    const li=document.createElement('li');
    li.className='flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700';
    li.innerHTML="<span class='player-name flex-1'>"+escapeHtml(name)+"</span><button class='del text-red-600 hover:underline text-xs'>hapus</button>";
    li.querySelector('.del').addEventListener('click', ()=>{
      if(!confirm('Hapus '+name+'?')) return;
      players.splice(idx,1); removePlayerFromRounds(name); markDirty(); renderPlayersList(); renderAll(); validateNames();
    });
    ul.appendChild(li);
  });
  byId('globalInfo').textContent = 'Pemain: '+players.length+' | Ronde/lapangan: '+(byId('roundCount').value||10)+' | Menit/ronde: '+(byId('minutesPerRound').value||12);
}
function escapeHtml(s){ return s.replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
function addPlayer(name){ name=(name||'').trim(); if(!name) return; players.push(name); markDirty(); renderPlayersList(); validateNames(); }
function removePlayerFromRounds(name){ [rounds1,rounds2].forEach(arr=> arr.forEach(r=> ['a1','a2','b1','b2'].forEach(k=>{ if(r&&r[k]===name) r[k] = ''; })) ); }
function showTextModal(){ byId('playersText').value = players.join('\n'); byId('textModal').classList.remove('hidden'); }
function hideTextModal(){ byId('textModal').classList.add('hidden'); }

function levenshtein(a,b){ a=a.toLowerCase(); b=b.toLowerCase(); const dp=Array(b.length+1).fill(0).map((_,i)=>[i]); for(let j=0;j<=a.length;j++){ dp[0][j]=j; } for(let i=1;i<=b.length;i++){ for(let j=1;j<=a.length;j++){ dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[j-1]===b[i-1]?0:1)); } } return dp[b.length][a.length]; }
function validateNames(){ const warn=byId('playersWarnings'); warn.innerHTML=''; const map=new Map(); const dups=[]; players.forEach((p,i)=>{ const k=p.trim().toLowerCase(); if(map.has(k)) dups.push([map.get(k),i]); else map.set(k,i); }); const items=[]; if(dups.length){ items.push('<div class="text-amber-600">Duplikat: '+dups.map(([a,b])=>players[a]+' ↔ '+players[b]).join(', ')+'</div>'); } const sugg=[]; for(let i=0;i<players.length;i++){ for(let j=i+1;j<players.length;j++){ const d=levenshtein(players[i],players[j]); if(d>0&&d<=2) sugg.push([players[i],players[j],d]); } } if(sugg.length){ items.push('<div class="text-blue-600">Mirip (cek typo): '+sugg.map(s=>s[0]+' ~ '+s[1]).join(', ')+'</div>'); } warn.innerHTML=items.join(''); }

function initRoundsLength(){ const R=parseInt(byId('roundCount').value||'10',10); while(rounds1.length<R) rounds1.push({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''}); while(rounds2.length<R) rounds2.push({a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''}); if(rounds1.length>R) rounds1=rounds1.slice(0,R); if(rounds2.length>R) rounds2=rounds2.slice(0,R); }

function renderCourt(container, arr){
  const start=byId('startTime').value||'19:00';
  const minutes=parseInt(byId('minutesPerRound').value||'12',10);
  const R=parseInt(byId('roundCount').value||'10',10);
  const [h,m]=start.split(':').map(Number); const base=new Date(); base.setHours(h||19,m||0,0,0);
  container.innerHTML='';
  const table=document.createElement('table'); table.className='min-w-full text-sm dark-table';
  table.innerHTML='<thead><tr class="text-left border-b border-gray-200 dark:border-gray-700"><th class="py-2 pr-4">≡</th><th class="py-2 pr-4">#</th><th class="py-2 pr-4">Waktu</th><th class="py-2 pr-4">Player1A</th><th class="py-2 pr-4">Player2A</th><th class="py-2 pr-4">Player1B</th><th class="py-2 pr-4">Player2B</th><th class="py-2 pr-4">Skor A</th><th class="py-2 pr-4">Skor B</th></tr></thead><tbody></tbody>';
  const tbody=table.querySelector('tbody');
  for(let i=0;i<R;i++){
    const r=arr[i]||{a1:'',a2:'',b1:'',b2:'',scoreA:'',scoreB:''};
    const t0=new Date(base.getTime()+i*minutes*60000);
    const t1=new Date(t0.getTime()+minutes*60000);
    const tr=document.createElement('tr');
    tr.className='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40';
    tr.draggable=true; tr.dataset.index=i;
    tr.addEventListener('dragstart', (e)=>{ tr.classList.add('row-dragging'); e.dataTransfer.setData('text/plain', String(i)); });
    tr.addEventListener('dragend', ()=> tr.classList.remove('row-dragging'));
    tr.addEventListener('dragover', (e)=>{ e.preventDefault(); tr.classList.add('row-drop-target'); });
    tr.addEventListener('dragleave', ()=> tr.classList.remove('row-drop-target'));
    tr.addEventListener('drop', (e)=>{ e.preventDefault(); tr.classList.remove('row-drop-target'); const from=Number(e.dataTransfer.getData('text/plain')); const to=Number(tr.dataset.index); if(isNaN(from)||isNaN(to)||from===to) return; const item=arr.splice(from,1)[0]; arr.splice(to,0,item); markDirty(); renderAll(); });
    const tdHandle=document.createElement('td'); tdHandle.textContent='≡'; tdHandle.className='py-2 pr-4 text-gray-400'; tr.appendChild(tdHandle);
    const tdIdx=document.createElement('td'); tdIdx.textContent='R'+(i+1); tdIdx.className='py-2 pr-4 font-medium'; tr.appendChild(tdIdx);
    const tdTime=document.createElement('td'); tdTime.textContent=toHM(t0)+'–'+toHM(t1); tdTime.className='py-2 pr-4'; tr.appendChild(tdTime);
    function selCell(k){ const td=document.createElement('td'); const sel=document.createElement('select'); sel.className='border rounded-lg px-2 py-1 w-40 sm:w-44 bg-white dark:bg-gray-900 dark:border-gray-700'; sel.appendChild(new Option('—','')); players.forEach(p=>sel.appendChild(new Option(p,p))); sel.value=r[k]||''; sel.addEventListener('change',(e)=>{ arr[i]={...arr[i],[k]:e.target.value}; markDirty(); validateAll(); computeStandings(); }); td.appendChild(sel); return td; }
    function scCell(k){ const td=document.createElement('td'); const inp=document.createElement('input'); inp.className='border rounded-lg px-2 py-1 w-16 sm:w-20 bg-white dark:bg-gray-900 dark:border-gray-700'; inp.inputMode='numeric'; inp.value=r[k]||''; inp.addEventListener('input',(e)=>{ arr[i]={...arr[i],[k]:String(e.target.value).replace(/[^0-9]/g,'')}; markDirty(); validateAll(); computeStandings(); }); td.appendChild(inp); return td; }
    tr.appendChild(selCell('a1')); tr.appendChild(selCell('a2')); tr.appendChild(selCell('b1')); tr.appendChild(selCell('b2')); tr.appendChild(scCell('scoreA')); tr.appendChild(scCell('scoreB'));
    tbody.appendChild(tr);
  }
  container.appendChild(table);
}

function renderAll(){
  initRoundsLength(); renderCourt(byId('court1'),rounds1); renderCourt(byId('court2'),rounds2); validateAll(); computeStandings();
  if(activeTab===1){ byId('court1').classList.remove('hidden'); byId('court2').classList.add('hidden'); byId('tab1').classList.add('tab-active'); byId('tab2').classList.remove('tab-active'); byId('tab2').classList.add('text-gray-500','border-transparent'); byId('tab1').classList.remove('text-gray-500','border-transparent'); } else { byId('court2').classList.remove('hidden'); byId('court1').classList.add('hidden'); byId('tab2').classList.add('tab-active'); byId('tab1').classList.remove('tab-active'); byId('tab1').classList.add('text-gray-500','border-transparent'); byId('tab2').classList.remove('text-gray-500','border-transparent'); }
}



function validateAll(){
  const R=parseInt(byId('roundCount').value||'10',10);
  const problems=[];

  // 1) Tetap cek double-booking antar lapangan pada ronde yang sama
  for(let i=0;i<R;i++){
    const names=[rounds1[i]?.a1,rounds1[i]?.a2,rounds1[i]?.b1,rounds1[i]?.b2,rounds2[i]?.a1,rounds2[i]?.a2,rounds2[i]?.b1,rounds2[i]?.b2].filter(Boolean);
    const set=new Set(names);
    if(set.size!==names.length) problems.push('Bentrok jadwal: R'+(i+1)+' ada pemain di dua lapangan.');
  }

  // 2) Duplikat LAWAN dilarang (di SEMUA lapangan)
  //    Pasangan yang sama diperbolehkan (tidak dicek)
  const teamKey=(p,q)=>[p||'',q||''].sort().join(' & ');
  const matchKeyFromRound=(r)=>{
    if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) return '';
    const tA=teamKey(r.a1,r.a2), tB=teamKey(r.b1,r.b2);
    return [tA,tB].sort().join(' vs ');
  };
  const seenMatch=new Map();
  function scan(arr,label){
    for(let i=0;i<R;i++){
      const r=arr[i];
      if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) continue;
      const key=matchKeyFromRound(r);
      if(seenMatch.has(key)){
        problems.push('Duplikat lawan: '+key+' muncul lagi di '+label+' R'+(i+1)+' (sebelumnya '+seenMatch.get(key)+').');
      } else {
        seenMatch.set(key, label+' R'+(i+1));
      }
    }
  }
  scan(rounds1,'Lap 1');
  scan(rounds2,'Lap 2');

  const box=byId('errors');
  box.innerHTML = problems.length
    ? "<div class='p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm'><div class='font-semibold mb-1'>Validasi:</div><ul class='list-disc pl-5 space-y-1'>"+problems.map(p=>"<li>"+p+"</li>").join("")+"</ul></div>"
    : "<div class='p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm'>Tidak ada masalah penjadwalan.</div>";
  return problems.length===0;
}


  // 2) Cek duplikat pasangan/lawan HANYA di tab/lapangan aktif
  const teamKey=(p,q)=>[p||'',q||''].sort().join(' & ');
  const matchKeyFromRound=(r)=>{
    if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) return '';
    const tA=teamKey(r.a1,r.a2), tB=teamKey(r.b1,r.b2);
    return [tA,tB].sort().join(' vs ');
  };
  const seenMatch=new Map(), seenTeam=new Map();
  const arr = (activeTab===1 ? rounds1 : rounds2);
  const label = (activeTab===1 ? 'Lap 1' : 'Lap 2');
  for(let i=0;i<R;i++){
    const r=arr[i];
    if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) continue;
    const key=matchKeyFromRound(r);
    if(seenMatch.has(key)){
      problems.push('Duplikat lawan (dalam '+label+'): '+key+' muncul lagi di R'+(i+1)+' (sebelumnya '+seenMatch.get(key)+').');
    } else {
      seenMatch.set(key,'R'+(i+1));
    }
    const tA=teamKey(r.a1,r.a2), tB=teamKey(r.b1,r.b2);
    [tA,tB].forEach(t=>{
      if(seenTeam.has(t)){
        problems.push('Duplikat pasangan (dalam '+label+'): '+t+' dimainkan lagi di R'+(i+1)+' (sebelumnya '+seenTeam.get(t)+').');
      } else {
        seenTeam.set(t,'R'+(i+1));
      }
    });
  }

  const box=byId('errors');
  box.innerHTML = problems.length
    ? "<div class='p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm'><div class='font-semibold mb-1'>Validasi:</div><ul class='list-disc pl-5 space-y-1'>"+problems.map(p=>"<li>"+p+"</li>").join("")+"</ul></div>"
    : "<div class='p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm'>Tidak ada masalah penjadwalan.</div>";
  return problems.length===0;
}


function computeStandings(){
  const data={}; players.forEach(p=>data[p]={total:0,diff:0,win:0,lose:0,draw:0});
  const apply=(arr)=>arr.forEach(r=>{ const a=Number(r?.scoreA||0), b=Number(r?.scoreB||0); if(!(r?.a1&&r?.a2&&r?.b1&&r?.b2)) return; [r.a1,r.a2].forEach(p=>{ if(data[p]){ data[p].total+=a; data[p].diff+=(a-b); }}); [r.b1,r.b2].forEach(p=>{ if(data[p]){ data[p].total+=b; data[p].diff+=(b-a); }}); if(a>0||b>0){ if(a>b){ [r.a1,r.a2].forEach(p=>data[p]&&data[p].win++); [r.b1,r.b2].forEach(p=>data[p]&&data[p].lose++);} else if(a<b){ [r.b1,r.b2].forEach(p=>data[p]&&data[p].win++); [r.a1,r.a2].forEach(p=>data[p]&&data[p].lose++);} else { [r.a1,r.a2,r.b1,r.b2].forEach(p=>{ if(data[p]) data[p].draw++; }); } }});
  apply(rounds1); apply(rounds2);
  let arr=Object.entries(data).map(([player,v])=>{ const gp=v.win+v.lose+v.draw; return {player,...v,winRate:gp? v.win/gp:0}; });
  arr.sort((p,q)=>(q.total-p.total)||(q.diff-p.diff)||(q.win-p.win)||p.player.localeCompare(q.player));
  let rank=1; arr.forEach((s,i)=>{ if(i>0){ const pv=arr[i-1]; const tie=(s.total===pv.total&&s.diff===pv.diff&&s.win===pv.win); rank=tie?rank:(i+1);} s.rank=rank; });
  const tbody=byId('standings').querySelector('tbody'); tbody.innerHTML='';
  arr.forEach(s=>{ const tr=document.createElement('tr'); tr.className = s.rank===1?'rank-1': s.rank===2?'rank-2': s.rank===3?'rank-3':''; tr.innerHTML = `<td class="py-2 pr-4 font-semibold">${s.rank}</td><td class="py-2 pr-4 font-medium">${s.player}</td><td class="py-2 pr-4">${s.total}</td><td class="py-2 pr-4">${s.diff}</td><td class="py-2 pr-4">${s.win}</td><td class="py-2 pr-4">${s.lose}</td><td class="py-2 pr-4">${s.draw}</td><td class="py-2 pr-4">${(s.winRate*100).toFixed(1)}%</td>`; tbody.appendChild(tr); });
}

// Pairing autofill (active tab only)
function autoFillActiveTab(){
  const R=parseInt(byId('roundCount').value||'10',10);
  players = Array.from(byId('playersList').querySelectorAll('.player-name')).map(el=>el.textContent.trim()).filter(Boolean);
  if(players.length<4) return;
  const other=(activeTab===1)? rounds2: rounds1; let target=(activeTab===1)? rounds1: rounds2; target=[];
  const seenTeam=new Set(), seenMatch=new Set();
  const teamKey=(a,b)=>[a,b].sort().join(' & ');
  const matchKey=(a1,a2,b1,b2)=>{ const tA=teamKey(a1,a2), tB=teamKey(b1,b2); return [tA,tB].sort().join(' vs '); };
  for(let i=0;i<R;i++){ const r=other[i]; if(r&&r.a1&&r.a2&&r.b1&&r.b2){ seenTeam.add(teamKey(r.a1,r.a2)); seenTeam.add(teamKey(r.b1,r.b2)); seenMatch.add(matchKey(r.a1,r.a2,r.b1,r.b2)); } }
  const seenAppear=Object.fromEntries(players.map(p=>[p,0]));
  function chooseFour(i){ const busy=new Set(); const o=other[i]||{}; [o?.a1,o?.a2,o?.b1,o?.b2].forEach(x=>x&&busy.add(x)); const cand=players.filter(p=>!busy.has(p)); cand.sort((a,b)=>(seenAppear[a]-seenAppear[b])||a.localeCompare(b)); if(cand.length<4) return null; return [cand[0],cand[1],cand[2],cand[3]]; }
  for(let i=0;i<R;i++){ let chosen=null; for(let attempt=0;attempt<200;attempt++){ let four=chooseFour(i); if(!four){ const busy=new Set(); const o=other[i]||{}; [o?.a1,o?.a2,o?.b1,o?.b2].forEach(x=>x&&busy.add(x)); four=players.filter(p=>!busy.has(p)).slice(0,4); if(four.length<4) break; } const [A,B,C,D]=four; const options=[[A,B,C,D],[A,C,B,D],[A,D,B,C]]; const ok=options.filter(o=>{ const [a1,a2,b1,b2]=o; const tA=teamKey(a1,a2), tB=teamKey(b1,b2); const mk=matchKey(a1,a2,b1,b2); return !seenTeam.has(tA)&&!seenTeam.has(tB)&&!seenMatch.has(mk); }); const pick=(ok.length?ok:options)[0]; chosen=pick; if(chosen) break; } if(!chosen){ const four=chooseFour(i)||players.filter(p=>!(other[i]&&[other[i].a1,other[i].a2,other[i].b1,other[i].b2].includes(p))).slice(0,4); if(!four||four.length<4){ target.push({}); continue; } chosen=[four[0],four[1],four[2],four[3]]; } const [a1,a2,b1,b2]=chosen; target.push({a1,a2,b1,b2,scoreA:'',scoreB:''}); seenTeam.add(teamKey(a1,a2)); seenTeam.add(teamKey(b1,b2)); seenMatch.add(matchKey(a1,a2,b1,b2)); seenAppear[a1]++; seenAppear[a2]++; seenAppear[b1]++; seenAppear[b2]++; }
  if(activeTab===1) rounds1=target; else rounds2=target;
}

// Export CSV
function exportRoundsCSV(){ const header=['Tanggal','Lapangan','Time','Player1A','Player2A','Player1B','Player2B','SkorA','SkorB']; const start=byId('startTime').value||'19:00'; const minutes=parseInt(byId('minutesPerRound').value||'12',10); const R=parseInt(byId('roundCount').value||'10',10); const date=byId('sessionDate').value||''; const [h,m]=start.split(':').map(Number); const base=new Date(); base.setHours(h||19,m||0,0,0); const rowsFor=(label,arr)=>{ const rows=[]; for(let i=0;i<R;i++){ const t0=new Date(base.getTime()+i*minutes*60000); const t1=new Date(t0.getTime()+minutes*60000); const r=arr[i]||{}; rows.push([date,label,toHM(t0)+'–'+toHM(t1),r.a1||'',r.a2||'',r.b1||'',r.b2||'',r.scoreA||'',r.scoreB||'']); } return rows; }; const rows=[header,...rowsFor('Lap 1',rounds1),...rowsFor('Lap 2',rounds2)]; const csv=rows.map(r=>r.map(csvEscape).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='rounds_2lapangan.csv'; a.click(); URL.revokeObjectURL(url); }
function exportStandingsCSV(){ const data={}; players.forEach(p=>data[p]={total:0,diff:0,win:0,lose:0,draw:0}); const apply=arr=>arr.forEach(r=>{ const a=Number(r?.scoreA||0), b=Number(r?.scoreB||0); if(!(r?.a1&&r?.a2&&r?.b1&&r?.b2)) return; [r.a1,r.a2].forEach(p=>{ if(data[p]){ data[p].total+=a; data[p].diff+=(a-b); }}); [r.b1,r.b2].forEach(p=>{ if(data[p]){ data[p].total+=b; data[p].diff+=(b-a); }}); if(a>0||b>0){ if(a>b){ [r.a1,r.a2].forEach(p=>data[p]&&data[p].win++); [r.b1,r.b2].forEach(p=>data[p]&&data[p].lose++);} else if(a<b){ [r.b1,r.b2].forEach(p=>data[p]&&data[p].win++); [r.a1,r.a2].forEach(p=>data[p]&&data[p].lose++);} else { [r.a1,r.a2,r.b1,r.b2].forEach(p=>{ if(data[p]) data[p].draw++; }); } }}); apply(rounds1); apply(rounds2); let arr=Object.entries(data).map(([player,v])=>{ const gp=v.win+v.lose+v.draw; return [player,v.total,v.diff,v.win,v.lose,v.draw,(gp?(v.win/gp*100):0).toFixed(1)+'%']; }); arr.sort((a,b)=>(b[1]-a[1])||(b[2]-a[2])||(b[3]-a[3])||a[0].localeCompare(b[0])); const header=['Tanggal','Player','Total','Selisih','Menang','Kalah','Seri','WinRate']; const date=byId('sessionDate').value||''; const rows=[header,...arr.map(r=>[date,...r])]; const csv=rows.map(r=>r.map(csvEscape).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='standings_2lapangan.csv'; a.click(); URL.revokeObjectURL(url); }

// Events
byId('btnTheme').addEventListener('click', toggleTheme);
byId('uiScale').addEventListener('input', (e)=>{ document.documentElement.style.setProperty('--ui-zoom', e.target.value+'%'); });
byId('btnCollapsePlayers').addEventListener('click', ()=> byId('playersPanel').classList.toggle('hidden'));
byId('btnApplyPlayersActive').addEventListener('click', ()=>{ const arr = (activeTab===1? rounds1: rounds2); const has = arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB)); if(has && !confirm('Menerapkan pemain akan menghapus pairing+skor pada tab aktif. Lanjutkan?')) return; autoFillActiveTab(); markDirty(); renderAll(); computeStandings(); });
byId('btnResetActive').addEventListener('click', ()=>{ const arr=(activeTab===1?rounds1:rounds2); const has=arr.some(r=>r&&(r.a1||r.a2||r.b1||r.b2||r.scoreA||r.scoreB)); if(has&&!confirm('Data pada tab aktif akan dihapus. Lanjutkan?')) return; if(activeTab===1) rounds1=[]; else rounds2=[]; markDirty(); renderAll(); });
byId('btnClearScores').addEventListener('click', ()=>{ rounds1.forEach(r=>{r.scoreA=''; r.scoreB=''}); rounds2.forEach(r=>{r.scoreA=''; r.scoreB=''}); markDirty(); renderAll(); });
byId('btnExportRounds').addEventListener('click', exportRoundsCSV);
byId('btnExportStandings').addEventListener('click', exportStandingsCSV);
byId('btnSave').addEventListener('click', saveToJSONFile);
byId('btnLoadByDate').addEventListener('click', loadSessionByDate);
byId('btnImportJSON').addEventListener('click', ()=> byId('fileInputJSON').click());
byId('fileInputJSON').addEventListener('change', (e)=>{ if(e.target.files && e.target.files[0]) loadJSONFromFile(e.target.files[0]); e.target.value=''; });

byId('startTime').addEventListener('change', ()=>{ markDirty(); renderAll(); });
byId('minutesPerRound').addEventListener('input', ()=>{ markDirty(); renderAll(); });
byId('roundCount').addEventListener('input', ()=>{ markDirty(); renderAll(); });

byId('tab1').addEventListener('click', ()=>{ activeTab=1; renderAll(); });
byId('tab2').addEventListener('click', ()=>{ activeTab=2; renderAll(); });

byId('btnAddPlayer').addEventListener('click', ()=>{ const v=byId('newPlayer').value; byId('newPlayer').value=''; addPlayer(v); });
byId('newPlayer').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); byId('btnAddPlayer').click(); } });
byId('btnClearPlayers').addEventListener('click', ()=>{ if(!confirm('Kosongkan semua pemain?')) return; players=[]; markDirty(); renderPlayersList(); validateNames(); });
byId('btnPasteText').addEventListener('click', ()=>{ showTextModal(); byId('playersText').focus(); });
byId('btnApplyText').addEventListener('click', ()=>{ players=parsePlayersText(byId('playersText').value); hideTextModal(); markDirty(); renderPlayersList(); validateNames(); });
byId('btnCancelText').addEventListener('click', hideTextModal);

// Boot
(function boot(){
  applyThemeFromStorage();
  if(!byId('sessionDate').value){ const d=new Date(); const s=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); byId('sessionDate').value=s; }
  players=['Della','Rangga','Fai','Gizla','Abdi','Diana','Kris','Ichsan','Marchel','Altundri'];
  renderPlayersList(); renderAll(); validateNames(); startAutoSave();
})();