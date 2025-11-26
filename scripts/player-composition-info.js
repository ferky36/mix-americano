"use strict";
(function(){
  function byId(id){ return document.getElementById(id); }

  function computeCounts(){
    try{
      const meta = window.playerMeta || {};
      const container = byId('playersList');
      const nameEls = container ? container.querySelectorAll('.player-name') : [];
      let pro=0, beg=0, male=0, female=0, total=0;
      nameEls.forEach(span=>{
        const name = (span.textContent||'').trim(); if(!name) return;
        total++;
        let m = meta[name] || {};
        // Fallback: read from sibling selects if meta belum terset
        if ((!m.gender || !m.level)){
          try{
            const li = span.closest('li');
            const sels = li ? li.querySelectorAll('select.player-meta') : null;
            if (sels && sels.length>=2){
              const gVal = sels[0].value; const lVal = sels[1].value;
              m = { gender: m.gender || gVal, level: m.level || lVal };
            }
          }catch{}
        }
        if (m.level==='pro') pro++; else if (m.level==='beg') beg++;
        if (m.gender==='M') male++; else if (m.gender==='F') female++;
      });
      return {pro,beg,male,female,total};
    }catch{ return {pro:0,beg:0,male:0,female:0,total:0}; }
  }

  function ensureBox(){
    let box = byId('playerCompInfo');
    if (box) return box;
    // place right under players list
    const listEl = byId('playersList');
    if (!listEl) return null;
    box = document.createElement('div');
    box.id='playerCompInfo';
    box.className = 'mt-2 text-xs rounded-lg border bg-indigo-50/60 border-indigo-200 px-3 py-2 dark:bg-indigo-900/30 dark:border-indigo-800';
    const parent = listEl.parentElement || listEl;
    parent.insertAdjacentElement('afterend', box);
    return box;
  }

  function render(){
    const box = ensureBox(); if (!box) return;
    const {pro,beg,male,female,total} = computeCounts();
    box.innerHTML = `
      <div><b>${(window.__i18n_get ? __i18n_get('players.composition.title','Komposisi Pemain') : 'Komposisi Pemain')}</b> — ${(window.__i18n_get ? __i18n_get('players.composition.total','Total {count}') : 'Total {count}').replace('{count}', total)}</div>
      <div class="mt-0.5">PRO: <b>${pro}</b> • BEG: <b>${beg}</b> • M: <b>${male}</b> • F: <b>${female}</b></div>
    `;
  }

  // Observe players list changes to keep it in sync without touching existing logic
  function initObserver(){
    const listEl = byId('playersList'); if (!listEl) return;
    const mo = new MutationObserver(()=>{ try{ render(); }catch{} });
    mo.observe(listEl, { childList:true, subtree:true, characterData:true });
    // also refresh on general interactions (meta might change without DOM mutations)
    document.addEventListener('change', ()=>render(), true);
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ render(); initObserver(); });
  } else { render(); initObserver(); }
})();
