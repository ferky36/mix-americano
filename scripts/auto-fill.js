"use strict";
// ================== AUTO FILL (tab aktif) ================== //
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

  // ambil nama terbaru
  players = Array.from(byId('playersList').querySelectorAll('.player-name'))
            .map(el=>el.textContent.trim()).filter(Boolean);
  if(players.length<4) return;

  const metaOf = p => (playerMeta && playerMeta[p]) ? playerMeta[p] : {};
  // Analisa komposisi level untuk mode lvl_bal: jika jumlah pro != separuh pemain, gunakan mode fleksibel
  const proCount = players.filter(p=> (metaOf(p).level==='pro')).length;
  const half = Math.floor(players.length/2);
  const maleCount = players.filter(p=> (metaOf(p).gender==='M')).length;
  const femaleCount = players.filter(p=> (metaOf(p).gender==='F')).length;
  let effectivePairMode = (pairMode==='lvl_bal' && proCount!==half) ? 'lvl_bal_flex' : pairMode;
  if (pairMode==='mixed' && maleCount!==femaleCount) effectivePairMode = 'mixed_flex';

  const fitsTeamRule=(x,y)=>{
    if (effectivePairMode==='free') return true;
    const mx=metaOf(x), my=metaOf(y);
    if (effectivePairMode==='mixed'){
      if(!mx.gender || !my.gender) return false;
      return mx.gender!==my.gender;
    }
    if (effectivePairMode==='lvl_same'){
      return mx.level && my.level && mx.level===my.level;
    }
    if (effectivePairMode==='lvl_bal'){ return true; } // cek di akhir per-tim
    return true;
  };

  // --- 1) target fairness ----------------------------------------------------
  // base = kemunculan di lapangan lain (karena lapangan aktif akan di-overwrite)
  const base = countAppearAll(activeCourt);
  const totalBase = players.reduce((s,p)=>s+(base[p]||0),0);
  const S = R*4;                                   // slot yang harus diisi di court aktif
  const totalAfter = totalBase + S;
  const minAppear = Math.floor(totalAfter / players.length);
  const remainder = totalAfter % players.length;

  const order = players.slice().sort((a,b)=>{
    const da=(base[a]||0), db=(base[b]||0);
    if(da!==db) return da-db;
    return Math.random()-0.5;                      // tie break acak
  });

  const targetTotal = {};
  order.forEach((p,i)=> targetTotal[p] = minAppear + (i<remainder?1:0));
  const need = Object.fromEntries(players.map(p=>[p,Math.max(0,(targetTotal[p]||0)-(base[p]||0))]));
  // jumlah need dijamin = S

  // --- 2) persiapan jadwal ---------------------------------------------------
  const otherCourts = roundsByCourt.filter((_,i)=>i!==activeCourt);
  const target = new Array(R).fill(null);
  const seenOpp  = new Set(); // hindari lawan sama di court aktif
  const seenMatch= new Set();

  // daftar ronde akan diisi dalam urutan acak
  const roundOrder = shuffleInPlace([...Array(R).keys()]);

  // helper: cari 4 pemain utk ronde i
  // prioritas baru: (1) pairing memungkinkan & minim rematch, (2) fairness (need)
  function pickFourForRound(i){
    const busy = new Set();
    otherCourts.forEach(c=>{ const r=c[i]; if(r) [r.a1,r.a2,r.b1,r.b2].forEach(x=>x&&busy.add(x)); });

    const freeAll = players.filter(p=>!busy.has(p));
    if (freeAll.length<4) return null;

    // Mixed gender handling: try to pick 2M+2F when feasible
    if (effectivePairMode==='mixed' || effectivePairMode==='mixed_flex'){
      const males   = freeAll.filter(p=> (metaOf(p).gender==='M'));
      const females = freeAll.filter(p=> (metaOf(p).gender==='F'));
      if (males.length>=2 && females.length>=2){
        const topN = 4; // limit combinations by need to keep fast
        const sortByNeed = (arr)=> arr.slice().sort((a,b)=> (need[b]||0)-(need[a]||0) || (Math.random()-0.5));
        const mTop = sortByNeed(males).slice(0,topN);
        const fTop = sortByNeed(females).slice(0,topN);
        let bestFour=null, bestScore=-1e9;
        for(let mi=0; mi<mTop.length; mi++)
          for(let mj=mi+1; mj<mTop.length; mj++)
            for(let fi=0; fi<fTop.length; fi++)
              for(let fj=fi+1; fj<fTop.length; fj++){
                const combo=[mTop[mi], mTop[mj], fTop[fi], fTop[fj]];
                const s = bestPairScore(combo);
                if (s>-1e8 && s>bestScore){ bestScore=s; bestFour=combo; }
              }
        if (bestFour) return bestFour;
      }
    }

    // 0) fungsi bantu untuk menilai kemungkinan pairing dan rematch
    function bestPairScore(four){
      const options = [
        {a1:four[0], a2:four[1], b1:four[2], b2:four[3]},
        {a1:four[0], a2:four[2], b1:four[1], b2:four[3]},
        {a1:four[0], a2:four[3], b1:four[1], b2:four[2]},
      ];
      let best=-1e9;
      for(const o of options){
        if(!fitsTeamRule(o.a1,o.a2)) continue;
        if(!fitsTeamRule(o.b1,o.b2)) continue;
        if (effectivePairMode==='lvl_bal'){
          const AB=[metaOf(o.a1).level, metaOf(o.a2).level];
          const CD=[metaOf(o.b1).level, metaOf(o.b2).level];
          const okAB = AB.includes('beg') && AB.includes('pro');
          const okCD = CD.includes('beg') && CD.includes('pro');
          if(!(okAB && okCD)) continue;
        }
        if (effectivePairMode==='mixed'){
          const ABg=[metaOf(o.a1).gender, metaOf(o.a2).gender];
          const BBg=[metaOf(o.b1).gender, metaOf(o.b2).gender];
          const okA = ABg.includes('M') && ABg.includes('F');
          const okB = BBg.includes('M') && BBg.includes('F');
          if(!(okA && okB)) continue;
        }
        const mKey = vsKey(teamKey(o.a1,o.a2), teamKey(o.b1,o.b2));
        let score = 0;
        // pairing terpenuhi = bonus besar
        score += 200;
        // bonus ringan untuk kombinasi campur pada mode fleksibel
        if (effectivePairMode==='lvl_bal_flex' || effectivePairMode==='mixed_flex'){
          const ABg=[metaOf(o.a1).gender, metaOf(o.a2).gender];
          const BBg=[metaOf(o.b1).gender, metaOf(o.b2).gender];
          const okA_g = ABg.includes('M') && ABg.includes('F');
          const okB_g = BBg.includes('M') && BBg.includes('F');
          if (okA_g && okB_g) score += 40;
          const AB=[metaOf(o.a1).level, metaOf(o.a2).level];
          const CD=[metaOf(o.b1).level, metaOf(o.b2).level];
          const okAB = AB.includes('beg') && AB.includes('pro');
          const okCD = CD.includes('beg') && CD.includes('pro');
          if (okAB && okCD) score += 40;
        }
        // bonus ringan untuk kombinasi campur jika lvl_bal fleksibel
        if (effectivePairMode==='lvl_bal_flex'){
          const AB=[metaOf(o.a1).level, metaOf(o.a2).level];
          const CD=[metaOf(o.b1).level, metaOf(o.b2).level];
          const okAB = AB.includes('beg') && AB.includes('pro');
          const okCD = CD.includes('beg') && CD.includes('pro');
          if (okAB && okCD) score += 40;
        }
        // penalti untuk rematch lawan/partai
        if (seenMatch.has(mKey)) score -= 120;
        const oppPairs=[vsKey(o.a1,o.b1),vsKey(o.a1,o.b2),vsKey(o.a2,o.b1),vsKey(o.a2,o.b2)];
        oppPairs.forEach(k=>{ if(seenOpp.has(k)) score -= 30; });
        // fairness sebagai pembeda
        score += (need[o.a1]||0) + (need[o.a2]||0) + (need[o.b1]||0) + (need[o.b2]||0);
        // sedikit acak agar tidak kaku
        score += Math.random();
        if (score>best) best=score;
      }
      return best; // -inf jika tidak ada opsi memenuhi pairing
    }

    // 1) sampling beberapa kombinasi unik dari freeAll dan pilih skor terbaik
    const tried=new Set();
    let bestFour=null, bestScore=-1e9;
    const sampleCount = Math.min(200, freeAll.length*6);
    for(let t=0;t<sampleCount;t++){
      const pool = shuffleInPlace(freeAll.slice());
      const combo=[]; for(const x of pool){ if(!combo.includes(x)) combo.push(x); if(combo.length===4) break; }
      if (combo.length<4) continue;
      const key=combo.slice().sort().join('|'); if(tried.has(key)) continue; tried.add(key);
      const score = bestPairScore(combo);
      if (score>-1e8 && score>bestScore){ bestScore=score; bestFour=combo; }
    }
    if (bestFour) return bestFour;

    // 2) fallback ke fairness kuat (urutan need desc) jika pairing benar2 tidak memungkinkan
    const cand=freeAll.slice().sort((a,b)=>{
      const dv=(need[b]||0)-(need[a]||0);
      if(dv!==0) return dv;
      return Math.random()-0.5;
    });
    return cand.slice(0,4);
  }

  // helper: bentuk 2 tim dari 4 pemain
  function makeMatch(four){
    const opts = shuffleInPlace([
      {a1:four[0], a2:four[1], b1:four[2], b2:four[3]},
      {a1:four[0], a2:four[2], b1:four[1], b2:four[3]},
      {a1:four[0], a2:four[3], b1:four[1], b2:four[2]},
    ]);

    // 2-phase: (A) strict anti-rematch, (B) longgar anti-rematch jika buntu
    for (const phase of [ 'strict', 'loose' ]){
      for(const o of opts){
        if(!fitsTeamRule(o.a1,o.a2)) continue;
        if(!fitsTeamRule(o.b1,o.b2)) continue;

        if (effectivePairMode==='lvl_bal'){
          const AB=[metaOf(o.a1).level, metaOf(o.a2).level];
          const CD=[metaOf(o.b1).level, metaOf(o.b2).level];
          const okAB = AB.includes('beg') && AB.includes('pro');
          const okCD = CD.includes('beg') && CD.includes('pro');
          if(!(okAB && okCD)) continue;
        }
        if (effectivePairMode==='mixed'){
          const ABg=[metaOf(o.a1).gender, metaOf(o.a2).gender];
          const BBg=[metaOf(o.b1).gender, metaOf(o.b2).gender];
          const okA = ABg.includes('M') && ABg.includes('F');
          const okB = BBg.includes('M') && BBg.includes('F');
          if(!(okA && okB)) continue;
        }

        const mKey = vsKey(teamKey(o.a1,o.a2), teamKey(o.b1,o.b2));
        if (seenMatch.has(mKey)) continue;

        const oppPairs=[vsKey(o.a1,o.b1),vsKey(o.a1,o.b2),vsKey(o.a2,o.b1),vsKey(o.a2,o.b2)];
        const hasOppRematch = oppPairs.some(k=>seenOpp.has(k));
        if (phase==='strict' && hasOppRematch) continue;

        return o;
      }
    }
    return null;
  }

  for(const i of roundOrder){
    let four = pickFourForRound(i);
    if(!four){ target[i]={}; continue; }

    // coba beberapa kali agar lolos rule pairing + anti-duplikat lawan
    let picked=null;
    for(let t=0;t<10 && !picked; t++){
      shuffleInPlace(four);
      picked = makeMatch(four);
    }
    if(!picked){
      // fallback terakhir: hormati partner rule saja
      const fallback = shuffleInPlace([
        {a1:four[0], a2:four[1], b1:four[2], b2:four[3]},
        {a1:four[0], a2:four[2], b1:four[1], b2:four[3]},
        {a1:four[0], a2:four[3], b1:four[1], b2:four[2]},
      ]).find(o=>fitsTeamRule(o.a1,o.a2)&&fitsTeamRule(o.b1,o.b2)) || 
        {a1:four[0], a2:four[1], b1:four[2], b2:four[3]};
      picked=fallback;
    }

    target[i] = { ...picked, scoreA:'', scoreB:'' };

    // update fairness tracker
    [picked.a1,picked.a2,picked.b1,picked.b2].forEach(p=>{ if(need[p]>0) need[p]--; });

    // update catatan lawan (hindari rematch selanjutnya)
    [ [picked.a1,picked.b1],[picked.a1,picked.b2],[picked.a2,picked.b1],[picked.a2,picked.b2] ]
      .forEach(([x,y])=>seenOpp.add(vsKey(x,y)));
    seenMatch.add(vsKey(teamKey(picked.a1,picked.a2), teamKey(picked.b1,picked.b2)));
  }

  roundsByCourt[activeCourt]=target;

  markDirty(); renderAll(); computeStandings();
  validateAll();
  renderFairnessInfo(); // panel kecil (opsional)
  try { renderFairnessImbalanceAlert(); } catch {}
}

// tampilkan alert merah jika ada pemain bermain lebih banyak dari lainnya (spread > 1)
function renderFairnessImbalanceAlert(){
  try { if (typeof isViewer==='function' && isViewer()) return; } catch {}
  const cnt = typeof countAppearAll==='function' ? countAppearAll(-1) : {};
  if (!cnt) return;
  const list = (players||[]).slice(); if (!list.length) return;
  const nums = list.map(p=>cnt[p]||0);
  const min = Math.min(...nums), max = Math.max(...nums);
  const spread = max-min;
  const host = byId('errors'); if (!host) return;
  const id='fairnessOverAlert'; const prev=byId(id);
  // threshold bisa dipersonalisasi via window.FAIRNESS_SPREAD_THRESHOLD (default 1)
  const SPREAD_TH = (typeof window!=='undefined' && typeof window.FAIRNESS_SPREAD_THRESHOLD!=='undefined')
    ? Number(window.FAIRNESS_SPREAD_THRESHOLD) : 1;
  if (spread<=SPREAD_TH){ if(prev) prev.remove(); return; }

  // daftar pemain over dan under
  const over = list.filter(p=>(cnt[p]||0)===max);
  const under = list.filter(p=>(cnt[p]||0)===min);

  const buildItems = (arr)=> arr.map(p=>{
    const locs=[];
    (roundsByCourt||[]).forEach((courtArr,ci)=>{
      (courtArr||[]).forEach((r,ri)=>{
        if (!r) return;
        if ([r.a1,r.a2,r.b1,r.b2].includes(p)) locs.push(`<span data-i18n-fairness="lap-match" data-court="${ci+1}" data-round="${ri+1}">${(window.__i18n_get ? __i18n_get('fairness.lapMatch','Lap {court}/Match {round}') : 'Lap {court}/Match {round}').replace('{court}', ci+1).replace('{round}', ri+1)}</span>`);
      });
    });
    const n = cnt[p]||0;
    const label = (window.__i18n_get ? __i18n_get('fairness.playCount','main {count}x:') : 'main {count}x:').replace('{count}', n);
    return `<li><b>${escapeHtml(p)}</b> <span data-i18n-fairness="play-count" data-count="${n}">${label}</span> ${locs.join(', ')||'-'}</li>`;
  }).join('');

  const overHtml = buildItems(over);
  const underHtml = buildItems(under);

  const html = `
    <div id="${id}" class="mt-2 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm dark:bg-red-900/30 dark:text-red-100 dark:border-red-800">
      <div class="font-semibold mb-1" data-i18n-fairness="alert-title">${(window.__i18n_get ? __i18n_get('fairness.alert.title','Fairness Alert') : 'Fairness Alert')}</div>
      <div class="mb-1" data-i18n-fairness="alert-spread" data-spread="${spread}">${(window.__i18n_get ? __i18n_get('fairness.alert.spread','Ada selisih kesempatan bermain ({spread}).') : 'Ada selisih kesempatan bermain ({spread}).').replace('{spread}', spread)}</div>
      <div class="mb-1"><b data-i18n-fairness="alert-over" data-count="${max}">${(window.__i18n_get ? __i18n_get('fairness.alert.over','Pemain lebih banyak main ({count}x):') : 'Pemain lebih banyak main ({count}x):').replace('{count}', max)}</b></div>
      <ul class="list-disc pl-5 space-y-1 mb-2">${overHtml}</ul>
      <div class="mb-1"><b data-i18n-fairness="alert-under" data-count="${min}">${(window.__i18n_get ? __i18n_get('fairness.alert.under','Pemain kurang main ({count}x):') : 'Pemain kurang main ({count}x):').replace('{count}', min)}</b></div>
      <ul class="list-disc pl-5 space-y-1 mb-2">${underHtml}</ul>
      <div class="mt-2">
        <button id="btnImproveFairness" class="px-3 py-1.5 rounded-lg border text-sm bg-white dark:bg-transparent dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-800/40" data-i18n-fairness="alert-button">${(window.__i18n_get ? __i18n_get('fairness.alert.button','Improve Fairness') : 'Improve Fairness')}</button>
      </div>
    </div>`;
  if (prev) prev.outerHTML = html; else host.insertAdjacentHTML('beforeend', html);

  // attach action
  const btn = byId('btnImproveFairness');
  if (btn) btn.onclick = ()=> improveFairness();
}

// Refresh fairness alert text on language switch without changing logic
try{
  window.addEventListener('i18n:changed', ()=>{ try{ renderFairnessImbalanceAlert(); }catch{} });
}catch{}

// ====== ${(window.__i18n_get ? __i18n_get('fairness.alert.button','Improve Fairness') : 'Improve Fairness')}: reshuffle targeted rounds only ======
function improveFairness(){
  try{
    const pairMode = byId('pairMode') ? byId('pairMode').value : 'free';
    const metaOf = p => (playerMeta && playerMeta[p]) ? playerMeta[p] : {};
    const allPlayers = (players||[]).slice();
    const proCount = allPlayers.filter(p=> (metaOf(p).level==='pro')).length;
    const half = Math.floor(allPlayers.length/2);
    const maleCount = allPlayers.filter(p=> (metaOf(p).gender==='M')).length;
    const femaleCount = allPlayers.filter(p=> (metaOf(p).gender==='F')).length;
    let effectivePairMode = (pairMode==='lvl_bal' && proCount!==half) ? 'lvl_bal_flex' : pairMode;
    if (pairMode==='mixed' && maleCount!==femaleCount) effectivePairMode = 'mixed_flex';
    const fitsTeamRule=(x,y)=>{
      if (effectivePairMode==='free') return true;
      const mx=metaOf(x), my=metaOf(y);
      if (effectivePairMode==='mixed'){ if(!mx.gender||!my.gender) return false; return mx.gender!==my.gender; }
      if (effectivePairMode==='lvl_same'){ return mx.level && my.level && mx.level===my.level; }
      if (effectivePairMode==='lvl_bal'){ return true; }
      return true;
    };

    const cnt = countAppearAll(-1);
    const vals = allPlayers.map(p=>cnt[p]||0); if(!vals.length) return;
    const min = Math.min(...vals), max=Math.max(...vals);
    const SPREAD_TH = (typeof window!=='undefined' && typeof window.FAIRNESS_SPREAD_THRESHOLD!=='undefined')
      ? Number(window.FAIRNESS_SPREAD_THRESHOLD) : 1;
    if ((max-min)<=SPREAD_TH) { showToast?.((window.__i18n_get ? __i18n_get('fairness.toast.ok','Fairness sudah cukup merata') : 'Fairness sudah cukup merata'), 'info'); return; }

    const over = new Set(allPlayers.filter(p=>(cnt[p]||0)===max));
    const under = new Set(allPlayers.filter(p=>(cnt[p]||0)===min));

    let changed=false;
    const R = parseInt(byId('roundCount').value||'10',10);

    function busyInRound(idx){
      const s=new Set();
      roundsByCourt.forEach(c=>{ const r=c[idx]; if(r) [r.a1,r.a2,r.b1,r.b2].forEach(x=>x&&s.add(x)); });
      return s;
    }

    function canPlaceSwap(match, replaceName, newName){
      if (!replaceName || !newName) return false;
      const m = {...match};
      if (m.a1===replaceName) m.a1=newName; else if (m.a2===replaceName) m.a2=newName;
      else if (m.b1===replaceName) m.b1=newName; else if (m.b2===replaceName) m.b2=newName; else return false;
      // team rule
      if (!fitsTeamRule(m.a1,m.a2)) return false;
      if (!fitsTeamRule(m.b1,m.b2)) return false;
      if (effectivePairMode==='lvl_bal'){
        const AB=[metaOf(m.a1).level, metaOf(m.a2).level];
        const CD=[metaOf(m.b1).level, metaOf(m.b2).level];
        const okAB = AB.includes('beg') && AB.includes('pro');
        const okCD = CD.includes('beg') && CD.includes('pro');
        if(!(okAB && okCD)) return false;
      }
      if (effectivePairMode==='mixed'){
        const ABg=[metaOf(m.a1).gender, metaOf(m.a2).gender];
        const BBg=[metaOf(m.b1).gender, metaOf(m.b2).gender];
        const okA = ABg.includes('M') && ABg.includes('F');
        const okB = BBg.includes('M') && BBg.includes('F');
        if(!(okA && okB)) return false;
      }
      return true;
    }

    // Try to reduce spread by swapping over player with under player in rounds where over appears
    outer:
    for(let pass=0; pass<2; pass++){
      for(let ri=0; ri<R; ri++){
        const busy = busyInRound(ri);
        const aUnder = [...under].filter(u=>!busy.has(u));
        if (!aUnder.length) continue;
        for(let ci=0; ci<roundsByCourt.length; ci++){
          const r = (roundsByCourt[ci]||[])[ri];
          if(!(r && r.a1 && r.a2 && r.b1 && r.b2)) continue;
          const names=[r.a1,r.a2,r.b1,r.b2];
          const overIn = names.filter(n=>over.has(n));
          if(!overIn.length) continue;
          for(const victim of overIn){
            for(const cand of aUnder){
              if (canPlaceSwap(r, victim, cand)){
                // apply swap
                if (r.a1===victim) r.a1=cand; else if (r.a2===victim) r.a2=cand; else if (r.b1===victim) r.b1=cand; else r.b2=cand;
                cnt[victim]=(cnt[victim]||0)-1; cnt[cand]=(cnt[cand]||0)+1;
                if ((cnt[victim]-min)<=SPREAD_TH) over.delete(victim);
                if ((max-cnt[cand])<=SPREAD_TH) under.delete(cand);
                changed=true;
                // move on to next round to avoid multiple edits in same round
                continue outer;
              }
            }
          }
        }
      }
    }

    if (changed){
      markDirty(); renderAll(); computeStandings(); validateAll(); renderFairnessInfo(); renderFairnessImbalanceAlert();
      showToast?.((window.__i18n_get ? __i18n_get('fairness.toast.fixed','Fairness diperbaiki pada beberapa ronde') : 'Fairness diperbaiki pada beberapa ronde'), 'success');
    } else {
      showToast?.((window.__i18n_get ? __i18n_get('fairness.toast.none','Tidak ada perombakan minimal yang aman untuk fairness.') : 'Tidak ada perombakan minimal yang aman untuk fairness.'), 'warn');
    }
  }catch(err){ console.error(err); }
}


