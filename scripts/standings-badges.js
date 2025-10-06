"use strict";
// Add rank badges (gold/silver/bronze) next to player names in #standings
(function(){
  function applyBadges(){
    const tbl = document.getElementById('standings');
    const body = tbl?.tBodies?.[0];
    if (!body) return;
    Array.from(body.rows).forEach((tr)=>{
      const cells = tr.cells || [];
      if (cells.length < 2) return;
      const rank = String(cells[0].textContent||'').trim();
      const nameCell = cells[1];
      // cleanup old badge to avoid duplicates
      nameCell.querySelectorAll('.standing-medal').forEach(el=>el.remove());
      let cls = '';
      if (rank === '1') cls = 'gold';
      else if (rank === '2') cls = 'silver';
      else if (rank === '3') cls = 'bronze';
      if (!cls) return;
      const badge = document.createElement('span');
      badge.className = `standing-medal ${cls}`;
      badge.textContent = rank; // show rank number on the badge
      nameCell.appendChild(badge);
    });
  }

  // initial + observe changes to standings
  const boot = ()=>{ try{ applyBadges(); }catch{} };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  try{
    new MutationObserver(()=>applyBadges()).observe(document.body, { childList:true, subtree:true });
  }catch{}
})();

