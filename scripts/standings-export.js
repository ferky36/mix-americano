"use strict";
// Export Standings (Excel/PDF) — UI-agnostic, parses table #standings

(function(){
  function getStandingsAoA(){
    const tbl = document.getElementById('standings');
    if (!tbl) return [];
    const aoa = [];
    try{
      const head = tbl.tHead; const body = tbl.tBodies && tbl.tBodies[0];
      if (head && head.rows && head.rows[0]){
        const ths = Array.from(head.rows[0].cells).map(c => (c.textContent||'').trim());
        aoa.push(ths);
      }
      if (body){
        Array.from(body.rows).forEach(tr => {
          const row = Array.from(tr.cells).map(td => (td.textContent||'').trim());
          aoa.push(row);
        });
      }
    }catch{}
    return aoa;
  }

  // Lazy load SheetJS only when needed
  let __xlsxLoading = null;
  function ensureXLSX(){
    if (window.XLSX && XLSX.utils) return Promise.resolve();
    if (__xlsxLoading) return __xlsxLoading;
    __xlsxLoading = new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
      s.async = true;
      s.onload = ()=> resolve();
      s.onerror = ()=> reject(new Error('Gagal memuat library Excel'));
      document.head.appendChild(s);
    });
    return __xlsxLoading;
  }

  // Export to Excel via SheetJS (lazy)
  window.exportStandingsToExcel = async function(){
    try{
      await ensureXLSX();
      const data = getStandingsAoA();
      if (!data.length){ alert('Tabel klasemen belum tersedia.'); return; }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      // Set column widths (best-effort)
      const colw = (data[0]||[]).map((h,i)=>({ wch: Math.min(24, Math.max(6, String(h||'').length + (i===1?8:2))) }));
      ws['!cols'] = colw;
      XLSX.utils.book_append_sheet(wb, ws, 'Standings');
      const date = (document.getElementById('sessionDate')?.value || new Date().toISOString().slice(0,10));
      const title = (document.getElementById('appTitle')?.textContent || 'Event');
      const name = `${title.replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'_')}_Standings_${date}.xlsx`;
      XLSX.writeFile(wb, name);
    }catch(e){ console.error(e); alert('Gagal export Excel.'); }
  };

  // Export to PDF via Print (open a new window and print). Users can Save as PDF.
  window.exportStandingsToPDF = function(){
    try{
      const tbl = document.getElementById('standings');
      if (!tbl){ alert('Tabel klasemen belum tersedia.'); return; }
      const date = (document.getElementById('sessionDate')?.value || new Date().toISOString().slice(0,10));
      const title = (document.getElementById('appTitle')?.textContent || 'Event');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <title>${title} - Standings ${date}</title>
        <style>
          body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin:24px; }
          h2{ margin:0 0 12px; }
          table{ width:100%; border-collapse:collapse; font-size:12px; }
          th,td{ border:1px solid #ddd; padding:6px 8px; text-align:left; }
          thead th{ background:#f3f4f6; }
          tr:nth-child(even) td{ background:#fafafa; }
          @media print { body{ margin:8mm; } }
        </style></head><body>
        <h2>${title} — Klasemen (${date})</h2>
        ${tbl.outerHTML}
      </body></html>`;
      const w = window.open('', '_blank');
      if (!w){ alert('Popup diblokir. Izinkan popup untuk export PDF.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      w.focus();
      setTimeout(()=>{ try{ w.print(); }catch{} }, 200);
    }catch(e){ console.error(e); alert('Gagal export PDF.'); }
  };

  // Insert buttons above/right of standings table
  function ensureButtons(){
    try{
      const tbl = document.getElementById('standings');
      if (!tbl || document.getElementById('standingsActions')) return;
      const host = tbl.closest('section') || tbl.parentElement;
      if (!host) return;
      const bar = document.createElement('div');
      bar.id = 'standingsActions';
      bar.className = 'flex items-center gap-2 justify-end mb-2';
      bar.innerHTML = `
        <button id="btnExportExcel" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:opacity-90">Export Excel</button>
        <button id="btnExportPDF" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:opacity-90">Export PDF</button>`;
      // Insert before the table wrapper (.overflow-x-auto) if exists; else before table; else append
      const wrapper = tbl.closest('.overflow-x-auto');
      if (wrapper && wrapper.parentElement === host){
        host.insertBefore(bar, wrapper);
      } else if (tbl.parentElement === host){
        host.insertBefore(bar, tbl);
      } else {
        host.appendChild(bar);
      }
      document.getElementById('btnExportExcel').addEventListener('click', exportStandingsToExcel);
      document.getElementById('btnExportPDF').addEventListener('click', exportStandingsToPDF);
    }catch{}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureButtons);
  else ensureButtons();
  // if standings render later, observe and attach once
  try{
    new MutationObserver(()=>ensureButtons()).observe(document.body, {childList:true, subtree:true});
  }catch{}
})();
