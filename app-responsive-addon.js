
/**
 * app-responsive-addon.js
 * Add-on to make "tabel ronde" mobile-friendly (card layout on small screens)
 * without modifying existing rendering logic.
 * 
 * Usage: include this file AFTER your existing app.js
 * <script src="app.js"></script>
 * <script src="app-responsive-addon.js"></script>
 */

(function(){
  // Small debounce utility
  function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; }

  // Try to decide whether a table is a "rounds table"
  function isRoundsTable(table){
    const ths = Array.from(table.querySelectorAll('thead th')).map(th => (th.textContent||'').trim().toLowerCase());
    if (!ths.length) return false;
    // Heuristics: contains these labels
    const must = ['player1a','player2a','player1b','player2b'];
    const hasPlayers = must.some(m => ths.includes(m));
    const hasScore = ths.includes('skor a') || ths.includes('score a') || ths.includes('skor');
    return hasPlayers || hasScore;
  }

  function enhanceOneTable(table){
    if (table.dataset.rndEnhanced === '1') return;
    if (!isRoundsTable(table)) return;

    table.classList.add('rnd-table');
    table.dataset.rndEnhanced = '1';

    const labels = Array.from(table.querySelectorAll('thead th')).map(th => (th.textContent||'').trim());

    // Add data-label per td according to header text
    Array.from(table.tBodies || []).forEach(tbody => {
      Array.from(tbody.rows).forEach(tr => {
        // Skip break rows (single cell with big colspan), but mark class
        if (tr.cells.length === 1 && tr.cells[0].hasAttribute('colspan')) {
          tr.classList.add('rnd-break-row');
          return;
        }
        Array.from(tr.cells).forEach((td, idx) => {
          if (!td.dataset.label && labels[idx]) td.dataset.label = labels[idx];
        });
        // Mark special columns by header name when possible
        labels.forEach((txt, idx)=>{
          const low = txt.toLowerCase();
          if (!tr.cells[idx]) return;
          if (low.includes('waktu') || low.includes('time')) tr.cells[idx].classList.add('rnd-col-time');
          if (low.includes('aksi') || low.includes('hitung')) tr.cells[idx].classList.add('rnd-col-actions');
          if (low === '#' || low.includes('no')) tr.cells[idx].classList.add('rnd-col-index');
        });
        // Best-effort: hide drag column on mobile by marking first cell
        if (tr.cells[0]) tr.cells[0].classList.add('rnd-col-drag');
      });
    });
  }

  function enhanceAll(){
    const tables = document.querySelectorAll('table');
    tables.forEach(enhanceOneTable);
  }

  // Observe DOM changes to re-apply automatically after renderAll()
  const apply = debounce(enhanceAll, 50);
  const mo = new MutationObserver(apply);
  mo.observe(document.documentElement, {childList: true, subtree: true});

  // Also run on load & on resize (for safety)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  window.addEventListener('resize', apply);
})();
