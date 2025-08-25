'use strict';
// Helpers
const pad = (n)=>String(n).padStart(2,'0');
const toHM = (d)=>pad(d.getHours())+':'+pad(d.getMinutes());
const csvEscape=(v)=>{ if(v==null) return ''; const s=String(v); return /[,\"\n]/.test(s)? '"'+s.replace(/\"/g,'""')+'"' : s; };
const byId=(id)=>document.getElementById(id);
const parsePlayersText=(t)=>(t||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

// State
let activeTab=1, players=[], rounds1=[], rounds2=[], dirty=false, autosaveTimer=null;
let store = { sessions:{}, lastTs:null };
const THEME_KEY='mix-americano-theme';

// Theme
function applyThemeFromStorage(){ const t=localStorage.getItem(THEME_KEY)||'light'; document.documentElement.classList.toggle('dark', t==='dark'); }
function toggleTheme(){ const dark=document.documentElement.classList.toggle('dark'); localStorage.setItem(THEME_KEY, dark?'dark':'light'); }

// Sessions
function populateDatePicker(){
  const sel=byId('datePicker'); const cur=sel.value;
  sel.innerHTML='<option value=\"\">Pilih tanggal…</option>';
  Object.keys(store.sessions).sort().forEach(d=>{
    const o=document.createElement('option'); o.value=d; o.textContent=d; sel.appendChild(o);
  });
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
function markDirty(){ dirty=true; byId('unsavedDot').classList.remove('hidden'); }
function markSaved(ts){ dirty=false; byId('unsavedDot').classList.add('hidden'); if(ts) byId('lastSaved').textContent='Saved '+new Date(ts).toLocaleTimeString(); }
function saveToStore(){
  const d=byId('sessionDate').value||'';
  if(!d){ alert('Isi tanggal dulu ya.'); return false; }
  store.sessions[d]=currentPayload();
  store.lastTs=new Date().toISOString();
  markSaved(store.lastTs);
  populateDatePicker(); byId('datePicker').value=d;
  return true;
}
function saveToJSONFile(){
  if(!saveToStore()) return;
  const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='sessions.json'; a.click(); URL.revokeObjectURL(url);
}
function loadJSONFromFile(file){
  const r=new FileReader();
  r.onload=(ev)=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(!data.sessions) throw new Error('Invalid JSON');
      store=data; populateDatePicker();
      alert('JSON dimuat. Pilih tanggal lalu klik Load.');
    }catch(e){ console.error(e); alert('File JSON tidak valid.'); }
  };
  r.readAsText(file);
}
function loadSessionByDate(){
  const d=byId('datePicker').value||'';
  if(!d){ alert('Pilih tanggal dulu.'); return; }
  const data=store.sessions[d];
  if(!data){ alert('Tidak ada data untuk tanggal tsb.'); return; }
  byId('sessionDate').value=data.date||d;
  byId('startTime').value=data.startTime||'19:00';
  byId('minutesPerRound').value=data.minutesPerRound||'12';
  byId('roundCount').value=data.roundCount||'10';
  rounds1=Array.isArray(data.rounds1)?data.rounds1:[];
  rounds2=Array.isArray(data.rounds2)?data.rounds2:[];
  players=parsePlayersText(data.players||'');
  renderPlayersList(); renderAll(); markSaved(data.ts);
}
function startAutoSave(){ if(autosaveTimer) clearInterval(autosaveTimer); autosaveTimer=setInterval(()=>{ if(dirty) saveToStore(); }, 30000); }

// VALIDATION: pasangan boleh sama, lawan tidak boleh sama (lintas lapangan)
function validateAll(){
  const R=parseInt(byId('roundCount').value||'10',10);
  const problems=[];

  // Double booking
  for(let i=0;i<R;i++){
    const names=[rounds1[i]?.a1,rounds1[i]?.a2,rounds1[i]?.b1,rounds1[i]?.b2, rounds2[i]?.a1,rounds2[i]?.a2,rounds2[i]?.b1,rounds2[i]?.b2].filter(Boolean);
    const set=new Set(names);
    if(set.size!==names.length) problems.push('Bentrok jadwal: R'+(i+1)+' ada pemain di dua lapangan.');
  }

  const teamKey=(p,q)=>[p||'',q||''].sort().join(' & ');
  const matchKey=(r)=>{ if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) return ''; const tA=teamKey(r.a1,r.a2), tB=teamKey(r.b1,r.b2); return [tA,tB].sort().join(' vs '); };
  const seenMatch=new Map();
  function scan(arr,label){
    for(let i=0;i<R;i++){
      const r=arr[i]; if(!(r&&r.a1&&r.a2&&r.b1&&r.b2)) continue;
      const key=matchKey(r);
      if(seenMatch.has(key)) problems.push(label+' R'+(i+1)+': Duplikat lawan '+key+' (sebelumnya '+seenMatch.get(key)+')');
      else seenMatch.set(key,label+' R'+(i+1));
    }
  }
  scan(rounds1,'Lap 1'); scan(rounds2,'Lap 2');

  const box=byId('errors');
  const okHTML = `<div class="p-3 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm">Tidak ada masalah penjadwalan.</div>`;
  const errHTML = `<div class="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm"><div class="font-semibold mb-1">Validasi:</div><ul class="list-disc pl-5 space-y-1">${problems.map(p=>`<li>${p}</li>`).join('')}</ul></div>`;
  box.innerHTML = problems.length ? errHTML : okHTML;
  return problems.length===0;
}
