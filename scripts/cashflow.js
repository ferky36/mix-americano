"use strict";

// Cashflow per event (uang masuk/keluar)
(function(){
  const fmtIDR = (n)=> new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(n||0));
  const byId = (id)=> document.getElementById(id);
  const qs = (s, r=document)=> r.querySelector(s);
  const qsa = (s, r=document)=> Array.from(r.querySelectorAll(s));

  const __c = (k, f)=> (window.__i18n_get ? __i18n_get(k, f) : f);
  const fmtDateID = (raw)=>{
    try{
      if (!raw) return '';
      let s = String(raw).trim();
      // Accept DD/MM/YYYY or YYYY-MM-DD or ISO
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)){
        const [d,m,y] = s.split('/'); s = `${y}-${m}-${d}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)){
        // already ISO date
      } else if (!isNaN(Date.parse(s))){
        const d = new Date(s); s = d.toISOString().slice(0,10);
      }
      return new Date(s+'T00:00:00').toLocaleDateString('id-ID',{ weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    }catch{ return String(raw||''); }
  };

  let cash = { masuk: [], keluar: [] };
  let editing = { id: null, kind: 'masuk' };
  let rangeMode = { active:false, start:null, end:null };

  function sum(list){ return list.reduce((s, it)=> s + (Number(it.amount||0) * Number(it.pax||1)), 0); }

  function ensureButtonsAccess(){
    try{
      const can = (typeof isCashAdmin==='function') ? isCashAdmin() : false;
      const addIn  = byId('btnCashAddIn');
      const addOut = byId('btnCashAddOut');
      // In range mode, disable add/edit/delete entirely
      const allow = can && !rangeMode.active;
      if (addIn)  addIn.classList.toggle('hidden', !allow);
      if (addOut) addOut.classList.toggle('hidden', !allow);
      // also hide edit/delete actions in rows later in render
    }catch{}
  }

  function render(){
    const tbodyIn = byId('cashTbodyIn');
    const tbodyOut = byId('cashTbodyOut');
    if (!tbodyIn || !tbodyOut) return;
    tbodyIn.innerHTML = '';
    tbodyOut.innerHTML = '';

    // Disable row actions in range mode (read-only)
    const can = (!rangeMode.active) && ((typeof isCashAdmin==='function') ? isCashAdmin() : false);

    function row(it){
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-200 dark:border-gray-700';
      const total = Number(it.amount||0) * Number(it.pax||1);
      const baseLabel = it.label || '-';
      const label = rangeMode.active && it.eventTitle ? (`[${it.eventTitle}] ` + baseLabel) : baseLabel;
      const safeLabel = escapeHtml(label);
      tr.innerHTML = `
        <td class="py-2 pr-2">${safeLabel}</td>
        <td class="py-2 pr-2 text-right">${fmtIDR(it.amount)}</td>
        <td class="py-2 pr-2 text-right">${Number(it.pax||1)}</td>
        <td class="py-2 pr-2 text-right font-semibold">${fmtIDR(total)}</td>
        <td class="py-2 pr-2 text-right">
          <div class="flex justify-end gap-1">
            <button data-act="edit" class="px-2 py-1 rounded border dark:border-gray-700 text-xs ${!can?'hidden':''}">${__c('cash.edit','Edit')}</button>
            <button data-act="del"  class="px-2 py-1 rounded border dark:border-gray-700 text-xs ${!can?'hidden':''}">${__c('cash.delete','Hapus')}</button>
          </div>
        </td>`;
      tr.dataset.id = it.id;
      return tr;
    }

    // Range mode layout: event cards with two tables inside each card
    const secIn = tbodyIn.closest('section');
    const secOut = tbodyOut.closest('section');
    const gridWrap = secIn ? secIn.parentElement : null; // the 2-column grid wrapper

    if (rangeMode.active){
      if (gridWrap) gridWrap.style.display = 'none';
      let host = byId('cashRangeWrap');
      if (!host){ host = document.createElement('div'); host.id = 'cashRangeWrap'; host.className = 'space-y-4'; gridWrap?.after(host); }
      host.innerHTML = '';

      // Build map of events from both lists
      const map = new Map();
      const add = (it)=>{
        const id = it.event_id || it.eventId || `${it.eventTitle}|${it.eventDate}`;
        if (!map.has(id)) map.set(id, { title: it.eventTitle||'', date: it.eventDate||'', masuk:[], keluar:[] });
        const ent = map.get(id); (it.kind==='keluar' ? ent.keluar : ent.masuk).push(it);
      };
      (cash.masuk||[]).forEach(add); (cash.keluar||[]).forEach(add);
      // Sort by date asc
      const events = [...map.values()].sort((a,b)=> String(a.date).localeCompare(String(b.date)));
      let gIn = 0, gOut = 0;
      events.forEach(ev =>{
        const sumIn = ev.masuk.reduce((s,x)=> s + Number(x.amount||0)*Number(x.pax||1), 0);
        const sumOut= ev.keluar.reduce((s,x)=> s + Number(x.amount||0)*Number(x.pax||1), 0);
        const bal = sumIn - sumOut; gIn += sumIn; gOut += sumOut;
        const card = document.createElement('section');
        card.className = 'rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-3 md:p-4';
        const dateText = fmtDateID(ev.date);
        const safeDate = escapeHtml(dateText || '');
        const safeTitle = escapeHtml((ev.title||'').trim()||'Event');
        card.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              ${dateText ? `<span class=\"rounded-full border border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 text-xs px-2.5 py-1\">${safeDate}</span>` : ''}
              <span class="rounded-full border border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 text-xs px-2.5 py-1">${safeTitle}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-emerald-500 font-semibold px-3 py-1 text-sm">Masuk: ${fmtIDR(sumIn)}</span>
              <span class="rounded-full border border-red-200 bg-red-50 text-red-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-red-500 font-semibold px-3 py-1 text-sm">Keluar: ${fmtIDR(sumOut)}</span>
              <span class="rounded-full border border-sky-200 bg-sky-50 text-sky-600 dark:border-gray-700 dark:bg-gray-800/70 ${bal>=0?'dark:text-sky-400':'dark:text-red-400'} font-semibold px-3 py-1 text-sm">Sisa: ${fmtIDR(bal)}</span>
            </div>
          </div>`;
        const grid = document.createElement('div');
        grid.className = 'grid md:grid-cols-2 gap-3';
        function tableFor(kind, items){
          const wrap = document.createElement('div');
          const tbl = document.createElement('table');
          tbl.className = 'min-w-full text-sm dark-table rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden';
          const isMasuk = (kind==='masuk');
          const head = document.createElement('thead');
          head.innerHTML = `<tr class="text-left border-b border-gray-200 dark:border-gray-700 uppercase tracking-wider text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40">
              <th class="py-2 pr-2">${isMasuk?'Uang Masuk':'Uang Keluar'}</th>
              <th class="py-2 pr-2 text-right">Amount</th>
              <th class="py-2 pr-2 text-right">Pax</th>
              <th class="py-2 pr-2 text-right">Total</th>
            </tr>`;
          const body = document.createElement('tbody');
          items.forEach(it =>{
            const tr = document.createElement('tr');
            const total = Number(it.amount||0)*Number(it.pax||1);
            const labelSafe = escapeHtml(it.label||'-');
            tr.innerHTML = `
              <td class="py-2 pr-2">${labelSafe}</td>
              <td class="py-2 pr-2 text-right text-gray-700 dark:text-gray-300">${fmtIDR(it.amount)}</td>
              <td class="py-2 pr-2 text-right text-gray-700 dark:text-gray-300">${Number(it.pax||1)}</td>
              <td class="py-2 pr-2 text-right font-semibold">${fmtIDR(total)}</td>`;
            body.appendChild(tr);
          });
          tbl.appendChild(head); tbl.appendChild(body); wrap.appendChild(tbl);
          const sum = items.reduce((s,x)=> s + Number(x.amount||0)*Number(x.pax||1), 0);
          const tot = document.createElement('div');
          tot.className = 'flex justify-end gap-3 pt-2 px-1 text-gray-700 dark:text-gray-300';
          tot.innerHTML = `<span class="rounded-full px-3 py-1 ${isMasuk?
              'border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-emerald-500':
              'border border-red-200 bg-red-50 text-red-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-red-500'
            }">Total ${isMasuk?'Masuk':'Keluar'}: <b>${fmtIDR(sum)}</b></span>`;
          wrap.appendChild(tot);
          return wrap;
        }
        grid.appendChild(tableFor('masuk', ev.masuk));
        grid.appendChild(tableFor('keluar', ev.keluar));
        card.appendChild(grid);
        host.appendChild(card);
      });
      // Bottom grand totals bar
      const cont = document.createElement('div');
      cont.className = 'rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 md:p-4 flex items-center justify-between flex-wrap gap-2';
      const balAll = gIn - gOut;
      cont.innerHTML = `
        <div class="font-bold">Total Keseluruhan</div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-emerald-500 font-semibold px-3 py-1 text-sm">Masuk: ${fmtIDR(gIn)}</span>
          <span class="rounded-full border border-red-200 bg-red-50 text-red-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-red-500 font-semibold px-3 py-1 text-sm">Keluar: ${fmtIDR(gOut)}</span>
          <span class="rounded-full border border-sky-200 bg-sky-50 text-sky-600 dark:border-gray-700 dark:bg-gray-800/70 ${balAll>=0?'dark:text-sky-400':'dark:text-red-400'} font-semibold px-3 py-1 text-sm">Sisa: ${fmtIDR(balAll)}</span>
        </div>`;
      host.appendChild(cont);
    } else {
      // Normal tables
      const rc = byId('cashRangeWrap'); if (rc){ rc.remove(); }
      if (gridWrap) gridWrap.style.display = '';
      cash.masuk.forEach(it => tbodyIn.appendChild(row(it)));
      cash.keluar.forEach(it => tbodyOut.appendChild(row(it)));
    }

    const sumIn = sum(cash.masuk);
    const sumOut = sum(cash.keluar);
    const remain = sumIn - sumOut;
    const eIn = byId('cashSumIn'), eOut = byId('cashSumOut'), eRem = byId('cashSumRemain');
    if (eIn)  eIn.textContent = fmtIDR(sumIn);
    if (eOut) eOut.textContent = fmtIDR(sumOut);
    if (eRem){ eRem.textContent = fmtIDR(remain); eRem.style.color = remain>=0 ? 'rgb(5 150 105)' : 'rgb(239 68 68)'; }
    const cIn = byId('cashCountIn'), cOut = byId('cashCountOut');
    if (cIn) cIn.textContent = `${cash.masuk.length} baris`;
    if (cOut) cOut.textContent = `${cash.keluar.length} baris`;

    // row actions (only on normal tables)
    if (!rangeMode.active){
      qsa('#cashTbodyIn tr,[id="cashTbodyIn"] tr').forEach(tr => tr.addEventListener('click', onRowAction('masuk')));
      qsa('#cashTbodyOut tr,[id="cashTbodyOut"] tr').forEach(tr => tr.addEventListener('click', onRowAction('keluar')));
    }
  }

  // ---------- Export (Excel/PDF) shared for desktop & mobile ----------
  // Use ExcelJS to generate a formatted workbook that mirrors the Excel layout
  let __exceljsLoading = null;
  function ensureExcelJS(){
    if (window.ExcelJS) return Promise.resolve();
    if (__exceljsLoading) return __exceljsLoading;
    __exceljsLoading = new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.async = true;
      s.onload = ()=> resolve();
      s.onerror = ()=> reject(new Error('Gagal memuat ExcelJS'));
      document.head.appendChild(s);
    });
    return __exceljsLoading;
  }

  // PDF export using pdfmake (loaded via CDN)
  let __pdfmakeLoading = null;
  function ensurePdfMake(){
    if (window.pdfMake && window.pdfMake.vfs) return Promise.resolve();
    if (__pdfmakeLoading) return __pdfmakeLoading;
    __pdfmakeLoading = new Promise((resolve, reject)=>{
      const s1 = document.createElement('script');
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
      s1.async = true;
      s1.onload = ()=>{
        const s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js';
        s2.async = true;
        s2.onload = ()=> resolve();
        s2.onerror = ()=> reject(new Error('Gagal memuat font pdfmake'));
        document.head.appendChild(s2);
      };
      s1.onerror = ()=> reject(new Error('Gagal memuat pdfmake'));
      document.head.appendChild(s1);
    });
    return __pdfmakeLoading;
  }

  function cashAoA(){
    const head = ['Keterangan','Amount','Pax','Total'];
    const masuk = [head, ...cash.masuk.map(it=>{
      const amt = Number(it.amount||0), pax = Number(it.pax||1);
      const lbl = (rangeMode.active && it.eventTitle) ? (`[${it.eventTitle}] ` + (it.label||'-')) : (it.label||'-');
      return [lbl, amt, pax, amt*pax];
    })];
    const keluar = [head, ...cash.keluar.map(it=>{
      const amt = Number(it.amount||0), pax = Number(it.pax||1);
      const lbl = (rangeMode.active && it.eventTitle) ? (`[${it.eventTitle}] ` + (it.label||'-')) : (it.label||'-');
      return [lbl, amt, pax, amt*pax];
    })];
    const sumIn = sum(cash.masuk), sumOut = sum(cash.keluar), remain = sumIn - sumOut;
    const ctx = (byId('cashEventInfo')?.textContent||'').trim();
    const ringkasan = [
      [rangeMode.active ? __c('cash.titleRange','Cashflow Range') : __c('cash.title','Cashflow Event'), ctx],
      [],
      ['Uang Masuk', sumIn],
      ['Uang Keluar', sumOut],
      ['Sisa', remain]
    ];
    return { masuk, keluar, ringkasan };
  }

  // Formatted Excel export: Laporan Cashflow Padel NBC
  async function exportCashflowExcelNBC(){
    try{
      await ensureExcelJS();

      function groupEvents(){
        if (rangeMode.active){
          const map = new Map();
          const add = (it)=>{
            const key = it.event_id || it.eventId || `${it.eventTitle||''}|${it.eventDate||''}`;
            if (!map.has(key)) map.set(key, { title: it.eventTitle||'', date: it.eventDate||'', masuk:[], keluar:[] });
            const ent = map.get(key); (it.kind==='keluar'? ent.keluar : ent.masuk).push(it);
          };
          (cash.masuk||[]).forEach(add); (cash.keluar||[]).forEach(add);
          return [...map.values()].sort((a,b)=> String(a.date).localeCompare(String(b.date)));
        }
        const title = (byId('appTitle')?.textContent||'').trim();
        let date = '';
        try{ date = (typeof currentSessionDate!=='undefined' && currentSessionDate) ? currentSessionDate : (byId('chipDateText')?.textContent||''); }catch{}
        return [{ title, date, masuk: cash.masuk||[], keluar: cash.keluar||[] }];
      }

      const events = groupEvents();

      // Attempt using provided Excel template first; fallback to generated workbook
      async function __tryExportTemplate(evts){
        try{
          const res = await fetch('enhancement/____final_cashflow.xlsx', { cache:'no-store' });
          if (!res.ok) throw new Error('Template not reachable');
          const ab = await res.arrayBuffer();
          const wbT = new ExcelJS.Workbook();
          await wbT.xlsx.load(ab);
          const wsT = wbT.getWorksheet('Cashflow') || wbT.worksheets[0];
          if (!wsT) throw new Error('Sheet not found');
          const get = (r,c)=> wsT.getCell(r,c);
          const clone = (s)=> JSON.parse(JSON.stringify(s||{}));
          // Ambil style dari template final_cashflow.xlsx
          const findStyle = (text, col)=> {
            for (let r=1; r<=wsT.rowCount; r++){
              for (let c=1; c<=wsT.columnCount; c++){
                const v = wsT.getCell(r,c).value;
                if (v === text && (col ? c===col : true)) return wsT.getCell(r,c).style;
              }
            }
            return {};
          };
          const S = {
            headLeft: clone(get(3,1).style), chipIn: clone(get(3,7).style), chipOut: clone(get(3,8).style), chipBal: clone(get(3,10).style),
            secMasuk: clone(get(4,1).style), secKeluar: clone(get(4,7).style),
            thB: clone(get(5,1).style), thC: clone(get(5,2).style), thD: clone(get(5,3).style), thE: clone(get(5,4).style),
            thH: clone(get(5,7).style), thI: clone(get(5,8).style), thJ: clone(get(5,9).style), thK: clone(get(5,10).style),
            tdB: clone(get(6,1).style), tdC: clone(get(6,2).style), tdD: clone(get(6,3).style), tdE: clone(get(6,4).style),
            tdH: clone(get(6,7).style), tdI: clone(get(6,8).style), tdJ: clone(get(6,9).style), tdK: clone(get(6,10).style),
            tlMasuk: clone(findStyle('Total Masuk:', 1)), tvMasuk: clone(findStyle('Total Masuk:', 1)), // value style reuse; formula style below
            tlKeluar: clone(findStyle('Total Keluar:', 7)), tvKeluar: clone(findStyle('Total Keluar:', 7)),
            gtTitle: clone(findStyle('Total Keseluruhan', 1)), inLbl: clone(findStyle('Masuk:', 1)), inVal: clone(findStyle('Masuk:', 4)), outLbl: clone(findStyle('Keluar:', 1)), outVal: clone(findStyle('Keluar:', 4)), balLbl: clone(findStyle('Sisa:', 1)), balVal: clone(findStyle('Sisa:', 4))
          };
          // Title dan periode dibiarkan seperti template (sudah berisi judul); hanya perbarui periode
          let period = '';
          if (rangeMode.active){ const d1 = evts[0]?.date||rangeMode.start||''; const d2 = evts[evts.length-1]?.date||rangeMode.end||''; period = (d1||d2)? `${d1} s/d ${d2}` : ''; }
          else { period = (byId('cashEventInfo')?.textContent||'').trim(); }
          try{ get(2,1).value = `Periode: ${period}`; }catch{}

          // Bersihkan konten lama setelah baris template awal (mulai row3)
          if (wsT.rowCount>5) wsT.spliceRows(3, wsT.rowCount-2);
          let r0 = 3; const nf = new Intl.NumberFormat('id-ID',{maximumFractionDigits:0});
          const leftTotals=[]; const rightTotals=[];
          const fmtDate = (d)=>{ try{ return new Date(String(d||'').slice(0,10)+'T00:00:00').toLocaleDateString('id-ID',{ weekday:'long', day:'2-digit', month:'long', year:'numeric' }); }catch{ return String(d||''); } };

          for (const ev of evts){
            const sIn = (ev.masuk||[]).reduce((a,x)=> a+Number(x.amount||0)*Number(x.pax||1),0);
            const sOut= (ev.keluar||[]).reduce((a,x)=> a+Number(x.amount||0)*Number(x.pax||1),0);
            const bal = sIn - sOut;
            const rowsIn = (ev.masuk||[]).filter(r=>{
              if (!r) return false;
              const hasLabel = String(r.label||'').trim().length>0;
              const hasValue = Number(r.amount||0)!==0 || Number(r.pax||0)!==0;
              return hasLabel || hasValue;
            });
            const rowsOut = (ev.keluar||[]).filter(r=>{
              if (!r) return false;
              const hasLabel = String(r.label||'').trim().length>0;
              const hasValue = Number(r.amount||0)!==0 || Number(r.pax||0)!==0;
              return hasLabel || hasValue;
            });
            // Header (row r0)
            get(r0,1).value = `${fmtDate(ev.date||'')}     ${ev.title||''}`; get(r0,1).style = S.headLeft;
            get(r0,7).value = `Masuk: ${nf.format(sIn)}`;   get(r0,7).style = S.chipIn;
            get(r0,8).value = `Keluar: ${nf.format(sOut)}`; get(r0,8).style = S.chipOut;
            get(r0,10).value= `Sisa: ${nf.format(bal)}`;    get(r0,10).style= S.chipBal;
            r0 += 1;
            // Section titles
            get(r0,1).value='UANG MASUK'; get(r0,1).style=S.secMasuk;
            get(r0,7).value='UANG KELUAR'; get(r0,7).style=S.secKeluar;
            r0 +=1;
            // Column headers
            get(r0,1).value='ITEM';   get(r0,1).style=S.thB; get(r0,2).value='AMOUNT'; get(r0,2).style=S.thC; get(r0,3).value='PAX'; get(r0,3).style=S.thD; get(r0,4).value='TOTAL'; get(r0,4).style=S.thE;
            get(r0,7).value='ITEM';   get(r0,7).style=S.thH; get(r0,8).value='AMOUNT'; get(r0,8).style=S.thI; get(r0,9).value='PAX'; get(r0,9).style=S.thJ; get(r0,10).value='TOTAL'; get(r0,10).style=S.thK;
            // Data rows
            let r = r0+1; const max = Math.max(rowsIn.length||0, rowsOut.length||0);
            for(let i=0;i<max;i++){
              const m = rowsIn[i]; const k = rowsOut[i];
              get(r,1).value = m ? (m.label||'-') : null; get(r,1).style=S.tdB;
              get(r,2).value = m ? Number(m.amount||0) : null; get(r,2).style=S.tdC;
              get(r,3).value = m ? Number(m.pax||1) : null; get(r,3).style=S.tdD;
              get(r,4).value = m ? { formula: `B${r}*C${r}` } : null; get(r,4).style=S.tdE;
              get(r,7).value = k ? (k.label||'-') : null; get(r,7).style=S.tdH;
              get(r,8).value = k ? Number(k.amount||0) : null; get(r,8).style=S.tdI;
              get(r,9).value = k ? Number(k.pax||1) : null; get(r,9).style=S.tdJ;
              get(r,10).value= k ? { formula: `H${r}*I${r}` } : null; get(r,10).style=S.tdK;
              r++;
            }
            // Totals per event
            get(r,1).value='Total Masuk:'; get(r,1).style=S.tlMasuk; get(r,4).value = { formula: `SUM(D${r0+1}:D${r-1})` }; get(r,4).style=S.tvMasuk; leftTotals.push(`D${r}`);
            get(r,7).value='Total Keluar:'; get(r,7).style=S.tlKeluar; get(r,10).value= { formula: `SUM(J${r0+1}:J${r-1})` }; get(r,10).style=S.tvKeluar; rightTotals.push(`J${r}`);
            r0 = r + 2; // spasi antar event
          }
          // Grand totals
          get(r0,1).value='Total Keseluruhan'; get(r0,1).style=S.gtTitle; r0++;
          get(r0,1).value='Masuk:'; get(r0,1).style=S.inLbl; get(r0,4).value = leftTotals.length? { formula: `SUM(${leftTotals.join(',')})` } : 0; get(r0,4).style=S.inVal;
          get(r0,7).value='Keluar:'; get(r0,7).style=S.outLbl; get(r0,10).value= rightTotals.length? { formula: `SUM(${rightTotals.join(',')})` } : 0; get(r0,10).style=S.outVal; r0++;
          get(r0,1).value='Sisa:'; get(r0,1).style=S.balLbl; get(r0,4).value = { formula: `D${r0-1}-J${r0-1}` }; get(r0,4).style=S.balVal;

          const out = await wbT.xlsx.writeBuffer();
          const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = __c('cash.exportFile','Laporan Cashflow Padel NBC.xlsx'); a.click(); setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
          return true;
        }catch(e){ console.warn('Template export failed:', e); return false; }
      }

      // Try template via fetch only when running over http(s). Skip on file://
      if (location.protocol !== 'file:'){
        if (await __tryExportTemplate(events)) return;
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Cashflow');
      const safeMerge = (r1,c1,r2,c2)=>{ try{ ws.mergeCells(r1,c1,r2,c2); }catch(e){} };

      // Columns layout: A-E (Masuk), F gap, G-K (Keluar)
      ws.columns = [
        {key:'A', width: 24}, {key:'B', width: 14}, {key:'C', width: 10}, {key:'D', width: 16}, {key:'E', width: 4},
        {key:'F', width: 2},
        {key:'G', width: 24}, {key:'H', width: 14}, {key:'I', width: 10}, {key:'J', width: 16}, {key:'K', width: 14}
      ];

      const fmtMoney = "[$Rp-421] #,##0;[Red]-[$Rp-421] #,##0";
      const titleFont = { name: 'Calibri', size: 18, bold: true, color: {argb:'FF000000'} };
      const headerFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF3F4F6'} };
      const borderThin = { top:{style:'thin', color:{argb:'FFDDDDDD'}}, left:{style:'thin', color:{argb:'FFDDDDDD'}}, bottom:{style:'thin', color:{argb:'FFDDDDDD'}}, right:{style:'thin', color:{argb:'FFDDDDDD'}} };
      const greenFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFE6F4EA'} };
      const redFill   = { type:'pattern', pattern:'solid', fgColor:{argb:'FFFCE8E6'} };
      const titleFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF9AE66A'} };
      const skyFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFE8F4FC'} };

      let r = 1;
      safeMerge(r,1,r,11);
      const headerTitle = ws.getCell(r,1);
      headerTitle.value = __c('cash.exportTitle','Laporan Cashflow Padel NBC');
      headerTitle.font = titleFont;
      headerTitle.fill = titleFill;
      headerTitle.alignment = { horizontal:'center', vertical:'middle' };
      try{ ws.getRow(r).height = 26; }catch{}
      r+=2;

      let periodText = '';
      if (rangeMode.active){
        if (events.length){
          const d1 = events[0].date||rangeMode.start||''; const d2 = events[events.length-1].date||rangeMode.end||'';
          if (d1||d2) periodText = `Periode: ${d1||''} s/d ${d2||''}`;
        }
      } else {
        periodText = (byId('cashEventInfo')?.textContent||'').trim();
        if (periodText) periodText = `Periode: ${periodText}`;
      }
      if (periodText){ safeMerge(r,2,r,10); const c = ws.getCell(r,2); c.value = periodText; c.alignment = { horizontal:'center' }; r+=2; }

      function putTable(anchorRow, isMasuk, items){
        const startCol = isMasuk ? 1 : 7;
        safeMerge(anchorRow, startCol, anchorRow, startCol+3);
        const cTitle = ws.getCell(anchorRow, startCol);
        cTitle.value = isMasuk ? 'UANG MASUK' : 'UANG KELUAR';
        cTitle.font = { bold:true, color:{argb:'FF111827'} };
        cTitle.alignment = { horizontal:'center' };
        cTitle.fill = isMasuk ? greenFill : redFill;
        const heads = ['ITEM','AMOUNT','PAX','TOTAL'];
        for (let i=0;i<heads.length;i++){
          const c = ws.getCell(anchorRow+1, startCol+i);
          c.value = heads[i]; c.fill = headerFill; c.font = { bold:true };
          c.alignment = { horizontal: i===0?'left':'right' }; c.border = borderThin;
        }
        let rowPtr = anchorRow+2;
        items.forEach(it=>{
          const amt = Number(it.amount||0); const pax = Number(it.pax||1); const tot = amt*pax;
          const vals = [it.label||'-', amt, pax, tot];
          for (let i=0;i<4;i++){
            const c = ws.getCell(rowPtr, startCol+i);
            c.value = vals[i]; c.alignment = { horizontal: i===0?'left':'right' }; c.border = borderThin;
            if (i===1 || i===3){ c.numFmt = fmtMoney; }
            if (i===2){ c.numFmt = '#,##0'; }
          }
          rowPtr++;
        });
        // Total row with SUM formula over TOTAL column
        ws.mergeCells(rowPtr, startCol, rowPtr, startCol+2);
        const tl = ws.getCell(rowPtr, startCol); tl.value = `Total ${isMasuk?'Masuk':'Keluar'}:`; tl.font = { bold:true }; tl.fill = isMasuk? greenFill : redFill; tl.border = borderThin;
        const tv = ws.getCell(rowPtr, startCol+3);
        if (rowPtr > (anchorRow+2)){
          const a = ws.getCell(anchorRow+2, startCol+3).address;
          const b = ws.getCell(rowPtr-1,   startCol+3).address;
          tv.value = { formula: `SUM(${a}:${b})` };
        } else {
          tv.value = 0;
        }
        tv.font = { bold:true }; tv.numFmt = fmtMoney; tv.fill = isMasuk? greenFill : redFill; tv.border = borderThin; tv.alignment = { horizontal:'right' };
        return { last: rowPtr, totalCell: ws.getCell(rowPtr, startCol+3).address };
      }

      function fmtDateIDStr(d){
        if (!d) return '';
        try { return new Date(String(d).slice(0,10)+'T00:00:00').toLocaleDateString('id-ID',{ weekday:'long', day:'2-digit', month:'long', year:'numeric' }); } catch { return String(d); }
      }

      let grandIn = 0, grandOut = 0;
      const totalsLeft = [], totalsRight = [];
      for (const ev of events){
        const sumIn = (ev.masuk||[]).reduce((s,x)=> s + Number(x.amount||0)*Number(x.pax||1), 0);
        const sumOut = (ev.keluar||[]).reduce((s,x)=> s + Number(x.amount||0)*Number(x.pax||1), 0);
        grandIn += sumIn; grandOut += sumOut; const bal = sumIn - sumOut;

        safeMerge(r,1,r,5); const hLeft = ws.getCell(r,1);
        const dText = fmtDateIDStr(ev.date||'');
        hLeft.value = dText ? `${dText}   ${ev.title? '  '+ev.title : ''}` : (ev.title||'');
        hLeft.fill = headerFill; hLeft.font = { bold:true, color:{argb:'FF374151'} };
        safeMerge(r,7,r,8); const cIn = ws.getCell(r,7); cIn.value = `Masuk: ${new Intl.NumberFormat('id-ID').format(sumIn)}`; cIn.font = { bold:true, color:{argb:'FF059669'} }; cIn.alignment = { horizontal:'center' }; cIn.fill = greenFill;
        safeMerge(r,9,r,10); const cOut = ws.getCell(r,9); cOut.value = `Keluar: ${new Intl.NumberFormat('id-ID').format(sumOut)}`; cOut.font = { bold:true, color:{argb:'FFDC2626'} }; cOut.alignment = { horizontal:'center' }; cOut.fill = redFill;
        const sCell = ws.getCell(r,11);
        sCell.value = `Sisa: ${new Intl.NumberFormat('id-ID').format(bal)}`;
        sCell.font = { bold:true, color:{argb: bal>=0? 'FF0EA5E9':'FFDC2626'} };
        sCell.fill = skyFill; sCell.alignment = { horizontal:'center' };
        r += 2;

        const endMasuk = putTable(r, true, ev.masuk||[]);
        const endKeluar = putTable(r, false, ev.keluar||[]);
        if (endMasuk && endMasuk.totalCell) totalsLeft.push(endMasuk.totalCell);
        if (endKeluar && endKeluar.totalCell) totalsRight.push(endKeluar.totalCell);
        r = Math.max(Number(endMasuk && endMasuk.last || 0), Number(endKeluar && endKeluar.last || 0)) + 2;
        r = Number.isFinite(r) && r>0 ? Math.trunc(r) : 1;
      }

      const balanceAll = grandIn - grandOut;
      safeMerge(r,1,r,5); const gTitle = ws.getCell(r,1); gTitle.value = 'Total Keseluruhan'; gTitle.font = { bold:true }; r++;
      safeMerge(r,1,r,3); const gIn = ws.getCell(r,1); gIn.value = 'Masuk:'; gIn.font = { bold:true, color:{argb:'FF059669'} }; gIn.fill = greenFill; gIn.border = borderThin;
      ws.getCell(r,4).value = totalsLeft.length ? { formula: `SUM(${totalsLeft.join(',')})` } : 0; ws.getCell(r,4).numFmt = fmtMoney; ws.getCell(r,4).font = { bold:true, color:{argb:'FF059669'} }; ws.getCell(r,4).fill = greenFill; ws.getCell(r,4).alignment = { horizontal:'right' }; ws.getCell(r,4).border = borderThin;
      safeMerge(r,7,r,9); const gOut = ws.getCell(r,7); gOut.value = 'Keluar:'; gOut.font = { bold:true, color:{argb:'FFDC2626'} }; gOut.fill = redFill; gOut.border = borderThin;
      ws.getCell(r,10).value = totalsRight.length ? { formula: `SUM(${totalsRight.join(',')})` } : 0; ws.getCell(r,10).numFmt = fmtMoney; ws.getCell(r,10).font = { bold:true, color:{argb:'FFDC2626'} }; ws.getCell(r,10).fill = redFill; ws.getCell(r,10).alignment = { horizontal:'right' }; ws.getCell(r,10).border = borderThin;
      r++;
      safeMerge(r,1,r,3); const gBal = ws.getCell(r,1); gBal.value = 'Sisa:'; gBal.font = { bold:true, color:{argb:'FF0EA5E9'} }; gBal.border = borderThin;
      ws.getCell(r,4).value = { formula: `D${r-1}-J${r-1}` }; ws.getCell(r,4).numFmt = fmtMoney; ws.getCell(r,4).font = { bold:true, color:{argb:'FF0EA5E9'} }; ws.getCell(r,4).alignment = { horizontal:'right' }; ws.getCell(r,4).border = borderThin;

      const name = __c('cash.exportFile','Laporan Cashflow Padel NBC.xlsx');
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
    }catch(e){ console.error(e); showToast?.(__c('cash.exportExcelFail','Gagal export Excel.'), 'error'); }
  }
  // New PDF export that mirrors the Excel layout using pdfmake
  async function exportCashflowPDFNBC(){
    try{
      await ensurePdfMake();
      function groupEvents(){
        if (rangeMode.active){
          const map = new Map();
          const add = (it)=>{
            const key = it.event_id || it.eventId || `${it.eventTitle||''}|${it.eventDate||''}`;
            if (!map.has(key)) map.set(key, { title: it.eventTitle||'', date: it.eventDate||'', masuk:[], keluar:[] });
            const ent = map.get(key); (it.kind==='keluar'? ent.keluar : ent.masuk).push(it);
          };
          (cash.masuk||[]).forEach(add); (cash.keluar||[]).forEach(add);
          return [...map.values()].sort((a,b)=> String(a.date).localeCompare(String(b.date)));
        }
        const title = (byId('appTitle')?.textContent||'').trim();
        let date = '';
        try{ date = (typeof currentSessionDate!=='undefined' && currentSessionDate) ? currentSessionDate : (byId('chipDateText')?.textContent||''); }catch{}
        return [{ title, date, masuk: cash.masuk||[], keluar: cash.keluar||[] }];
      }
      const events = groupEvents();
      const money = (n)=> new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(n||0));
      const fmtDate = (d)=>{ try{ return new Date(String(d||'').slice(0,10)+'T00:00:00').toLocaleDateString('id-ID',{ weekday:'long', day:'2-digit', month:'long', year:'numeric' }); }catch{ return String(d||''); } };
      let periodText = '';
      if (rangeMode.active){
        const d1 = events[0]?.date || rangeMode.start || ''; const d2 = events[events.length-1]?.date || rangeMode.end || '';
        if (d1||d2) periodText = `Periode: ${d1} s/d ${d2}`;
      } else {
        const info = (byId('cashEventInfo')?.textContent||'').trim();
        if (info) periodText = `Periode: ${info}`;
      }
      function tableBody(items, isMasuk){
        const head = [
          { text:'ITEM', fillColor:'#F3F4F6', bold:true },
          { text:'AMOUNT', alignment:'right', fillColor:'#F3F4F6', bold:true },
          { text:'PAX', alignment:'right', fillColor:'#F3F4F6', bold:true },
          { text:'TOTAL', alignment:'right', fillColor:'#F3F4F6', bold:true }
        ];
        const rows = (items||[]).map(it=>{
          const amt = Number(it.amount||0); const pax = Number(it.pax||1); const tot = amt*pax;
          return [ {text: it.label||'-'}, {text: money(amt), alignment:'right'}, {text: money(pax), alignment:'right'}, {text: money(tot), alignment:'right', bold:true} ];
        });
        const sum = (items||[]).reduce((s,x)=> s + Number(x.amount||0)*Number(x.pax||1), 0);
        const totalRow = [ {text:`Total ${isMasuk?'Masuk':'Keluar'}:`, colSpan:3, fillColor: isMasuk?'#E6F4EA':'#FCE8E6', bold:true}, {}, {}, {text: money(sum), alignment:'right', fillColor: isMasuk?'#E6F4EA':'#FCE8E6', bold:true} ];
        return [head, ...rows, totalRow];
      }
      const content = [];
      content.push({ text:__c('cash.exportTitle','Laporan Cashflow Padel NBC'), alignment:'center', fontSize:18, bold:true, margin:[0,0,0,8] });
      if (periodText) content.push({ text: periodText, alignment:'center', margin:[0,0,0,16] });
      let grandIn=0, grandOut=0;
      events.forEach(ev=>{
        const sumIn=(ev.masuk||[]).reduce((s,x)=>s+Number(x.amount||0)*Number(x.pax||1),0);
        const sumOut=(ev.keluar||[]).reduce((s,x)=>s+Number(x.amount||0)*Number(x.pax||1),0);
        grandIn+=sumIn; grandOut+=sumOut; const bal=sumIn-sumOut;
        content.push({ table:{ widths:['*','auto','auto','auto'], body:[[ {text:`${fmtDate(ev.date||'')}   ${ev.title||''}`, fillColor:'#EEF2F7', margin:[6,4,6,4]}, {text:`Masuk: Rp ${money(sumIn)}`, color:'#059669', fillColor:'#E6F4EA', margin:[6,4,6,4]}, {text:`Keluar: Rp ${money(sumOut)}`, color:'#DC2626', fillColor:'#FCE8E6', margin:[6,4,6,4]}, {text:`Sisa: Rp ${money(bal)}`, color: bal>=0?'#0EA5E9':'#DC2626', fillColor:'#E8F4FC', margin:[6,4,6,4]} ]]}, layout:'noBorders', margin:[0,0,0,6] });
        content.push({ columns:[ {width:'48%', stack:[ {text:'UANG MASUK', alignment:'center', bold:true, margin:[0,4,0,2]}, {table:{headerRows:1, widths:['*',70,40,80], body: tableBody(ev.masuk,true)}, layout:{hLineColor:'#E5E7EB', vLineColor:'#E5E7EB'}} ]}, {width:8, text:''}, {width:'48%', stack:[ {text:'UANG KELUAR', alignment:'center', bold:true, margin:[0,4,0,2]}, {table:{headerRows:1, widths:['*',70,40,80], body: tableBody(ev.keluar,false)}, layout:{hLineColor:'#E5E7EB', vLineColor:'#E5E7EB'}} ]} ], columnGap:8, margin:[0,0,0,12] });
      });
      const balAll=grandIn-grandOut;
      content.push({ text:'Total Keseluruhan', bold:true, alignment:'center', margin:[0,0,0,6] });
      content.push({ columns:[ {width:'48%', table:{ widths:['*',100], body:[ [ {text:'Masuk:', fillColor:'#E6F4EA', color:'#059669', bold:true}, {text:`Rp ${money(grandIn)}`, alignment:'right', fillColor:'#E6F4EA', color:'#059669', bold:true} ], [ {text:'Sisa:', color: balAll>=0?'#0EA5E9':'#DC2626', bold:true}, {text:`Rp ${money(balAll)}`, alignment:'right', color: balAll>=0?'#0EA5E9':'#DC2626', bold:true} ] ]}, layout:{hLineColor:'#E5E7EB', vLineColor:'#E5E7EB'} }, {width:8, text:''}, {width:'48%', table:{ widths:['*',100], body:[ [ {text:'Keluar:', fillColor:'#FCE8E6', color:'#DC2626', bold:true}, {text:`Rp ${money(grandOut)}`, alignment:'right', fillColor:'#FCE8E6', color:'#DC2626', bold:true} ] ]}, layout:{hLineColor:'#E5E7EB', vLineColor:'#E5E7EB'} } ], columnGap:8 });
      const docDef={ pageSize:'A4', pageOrientation:'landscape', pageMargins:[20,24,20,28], defaultStyle:{ font:'Roboto', fontSize:10 }, content };
      pdfMake.createPdf(docDef).download(__c('cash.exportFilePdf','Laporan Cashflow Padel NBC.pdf'));
    }catch(e){ console.error(e); showToast?.(__c('cash.exportPDFFail','Gagal export PDF.'), 'error'); }
  }
  // Route any legacy calls to the new exporter
  try{ exportCashflowExcel = exportCashflowExcelNBC; }catch{}
  async function exportCashflowExcel(){
    try{
      await ensureXLSX();
      const { masuk, keluar, ringkasan } = cashAoA();
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet(ringkasan);
      const ws2 = XLSX.utils.aoa_to_sheet(masuk);
      const ws3 = XLSX.utils.aoa_to_sheet(keluar);
      // basic column widths
      ws2['!cols'] = [{wch:28},{wch:12},{wch:8},{wch:14}];
      ws3['!cols'] = [{wch:28},{wch:12},{wch:8},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
      XLSX.utils.book_append_sheet(wb, ws2, 'Masuk');
      XLSX.utils.book_append_sheet(wb, ws3, 'Keluar');
      const title = (byId('appTitle')?.textContent||'Event').trim().replace(/[^\w\- ]+/g,'');
      const info = (byId('cashEventInfo')?.textContent||'').trim().replace(/[\\/:*?"<>|]+/g,'');
      const name = `${title||'Event'}_Cashflow_${info||new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, name);
    }catch(e){ console.error(e); showToast?.(__c('cash.exportExcelFail','Gagal export Excel.'), 'error'); }
  }

  function buildCashflowHTML(){
    const { masuk, keluar, ringkasan } = cashAoA();
    function tbl(aoa){
      const rows = aoa.map((row,i)=>{
        const tag = i===0 ? 'th' : 'td';
        const cells = row.map((c,ci)=>`<${tag} style="border:1px solid #ddd; padding:6px 8px; text-align:${ci>0?'right':'left'}">${(typeof c==='number')? c : String(c)}</${tag}>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0"><thead>${rows.split('</tr>').shift()}</thead><tbody>${rows.split('</tr>').slice(1).join('</tr>')}</tbody></table>`;
    }
    const title = (byId('appTitle')?.textContent||'Event');
    const info = (byId('cashEventInfo')?.textContent||'');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>${title} - Cashflow ${info}</title>
      <style>
        body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin:24px; }
        h2{ margin:0 0 12px; }
        h3{ margin:16px 0 6px; }
        thead th{ background:#f3f4f6; }
        tr:nth-child(even) td{ background:#fafafa; }
        @media print { body{ margin:8mm; } }
      </style></head><body>
      <h2>${title}  Cashflow (${info})</h2>
      <h3>Ringkasan</h3>
      ${tbl([['Keterangan','Nilai'], ...ringkasan.filter(r=>r.length).map(r=>[r[0], r[1]])])}
      <h3>Uang Masuk</h3>
      ${tbl([['Keterangan','Amount','Pax','Total'], ...cash.masuk.map(it=>[it.label||'-', Number(it.amount||0), Number(it.pax||1), Number(it.amount||0)*Number(it.pax||1)])])}
      <h3>Uang Keluar</h3>
      ${tbl([['Keterangan','Amount','Pax','Total'], ...cash.keluar.map(it=>[it.label||'-', Number(it.amount||0), Number(it.pax||1), Number(it.amount||0)*Number(it.pax||1)])])}
    </body></html>`;
    return html;
  }

  function exportCashflowPDF(){
    try{
      // Rebuild simple printable HTML to avoid any stray characters
      const { masuk, keluar, ringkasan } = cashAoA();
      const title = (byId('appTitle')?.textContent||'Event');
      const info = (byId('cashEventInfo')?.textContent||'');
      const tbl = (aoa)=>{
        const head = aoa[0]||[]; const body = aoa.slice(1);
        const th = '<tr>' + head.map((h,i)=>`<th style="border:1px solid #ddd; padding:6px 8px; text-align:${i>0?'right':'left'}">${h}</th>`).join('') + '</tr>';
        const trs = body.map(r=> '<tr>' + r.map((c,i)=>`<td style="border:1px solid #ddd; padding:6px 8px; text-align:${i>0?'right':'left'}">${(typeof c==='number')? c : String(c)}</td>`).join('') + '</tr>').join('');
        return `<table style="width:100%; border-collapse:collapse; font-size:12px; margin:8px 0"><thead>${th}</thead><tbody>${trs}</tbody></table>`;
      };
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <title>${title} - Cashflow ${info}</title>
        <style>
          body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin:24px; }
          h2{ margin:0 0 12px; }
          h3{ margin:16px 0 6px; }
          thead th{ background:#f3f4f6; }
          tr:nth-child(even) td{ background:#fafafa; }
          @media print { body{ margin:8mm; } }
        </style></head><body>
        <h2>${title} – Cashflow (${info})</h2>
        <h3>Ringkasan</h3>
        ${tbl([['Keterangan','Nilai'], ...ringkasan.filter(r=>r.length).map(r=>[r[0], r[1]])])}
        <h3>Uang Masuk</h3>
        ${tbl([['Keterangan','Amount','Pax','Total'], ...cash.masuk.map(it=>[(rangeMode.active&&it.eventTitle?`[${it.eventTitle}] `:'') + (it.label||'-'), Number(it.amount||0), Number(it.pax||1), Number(it.amount||0)*Number(it.pax||1)])])}
        <h3>Uang Keluar</h3>
        ${tbl([['Keterangan','Amount','Pax','Total'], ...cash.keluar.map(it=>[(rangeMode.active&&it.eventTitle?`[${it.eventTitle}] `:'') + (it.label||'-'), Number(it.amount||0), Number(it.pax||1), Number(it.amount||0)*Number(it.pax||1)])])}
      </body></html>`;
      const w = window.open('', '_blank');
      if (!w){ showToast?.(__c('cash.popupBlocked','Popup diblokir. Izinkan popup untuk export PDF.'), 'warn'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      w.focus(); setTimeout(()=>{ try{ w.print(); }catch{} }, 200);
    }catch(e){ console.error(e); showToast?.(__c('cash.exportPDFFail','Gagal export PDF.'), 'error'); }
  }

  function exportCashflow(format){
    const f = String(format||'excel').toLowerCase();
    if (f==='excel' || f==='xlsx') return exportCashflowExcelNBC();
    if (f==='pdf') return exportCashflowPDFNBC();
  }

  try{ window.exportCashflow = exportCashflow; }catch{}

  function onRowAction(kind){
    return (e)=>{
      const btn = e.target?.closest('button');
      if (!btn) return;
      const id = e.currentTarget?.dataset?.id;
      if (!id) return;
      if (btn.dataset.act === 'edit') openForm(kind, cash[kind].find(x=>x.id===id));
      if (btn.dataset.act === 'del') delRow(id);
    };
  }

  async function askYesNoLocal(msg){
    try{ if (typeof askYesNo === 'function') return await askYesNo(msg); }catch{}
    if (!window.__ynModal){
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);';
      const panel = document.createElement('div');
      panel.style.cssText = 'background:#fff;padding:16px 18px;border-radius:12px;max-width:340px;width:92%;box-shadow:0 12px 28px rgba(0,0,0,0.25);';
      const txt = document.createElement('div'); txt.style.cssText='font-weight:600;margin-bottom:12px;color:#111;white-space:pre-line;'; panel.appendChild(txt);
      const row = document.createElement('div'); row.style.cssText='display:flex;gap:10px;justify-content:flex-end;'; panel.appendChild(row);
      const bNo = document.createElement('button'); bNo.textContent='Tidak'; bNo.style.cssText='padding:8px 12px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#111;';
      const bYes = document.createElement('button'); bYes.textContent='Ya'; bYes.style.cssText='padding:8px 12px;border-radius:10px;background:#2563eb;color:#fff;border:0;';
      row.append(bNo,bYes); overlay.appendChild(panel); document.body.appendChild(overlay);
      window.__ynModal = { overlay, txt, bNo, bYes };
    }
    const { overlay, txt, bNo, bYes } = window.__ynModal;
    return new Promise(res=>{
      txt.textContent = msg;
      overlay.style.display = 'flex';
      const cleanup = (v)=>{ overlay.style.display='none'; bNo.onclick=bYes.onclick=null; res(v); };
      bYes.onclick = ()=> cleanup(true);
      bNo.onclick  = ()=> cleanup(false);
      overlay.onclick = (e)=>{ if (e.target===overlay) cleanup(false); };
    });
  }

  async function delRow(id){
    if (rangeMode.active) { showToast?.(__c('cash.rangeDeleteNA','Hapus tidak tersedia pada mode rentang.'), 'warn'); return; }
    const can = (typeof isCashAdmin==='function') ? isCashAdmin() : (!!window._isCashAdmin);
    if (!can) { showToast?.(__c('cash.accessDenied','Anda tidak memiliki akses Cashflow untuk event ini.'), 'warn'); return; }
    const ok = await askYesNoLocal(__c('cash.deleteConfirm','Hapus baris ini?'));
    if (!ok) { showToast?.(__c('cash.deleteCancelled','Aksi hapus dibatalkan.'), 'info'); return; }
    try{
      if (isCloudMode() && window.sb && currentEventId){
        // Prefer RPC (security definer) to bypass RLS visibility issues
        try{
          const { error: rpcErr } = await sb.rpc('delete_cashflow', { p_event_id: currentEventId, p_id: id });
          if (rpcErr) throw rpcErr;
      }catch(e){
          // Fallback to direct delete (policy must allow)
          await sb.from('event_cashflows').delete().eq('id', id);
        }
        await loadFromCloud();
      } else {
        // local fallback per event
        const key = 'cash:'+ (currentEventId||'local');
        const obj = readLocal(key);
        ['masuk','keluar'].forEach(k=> obj[k] = (obj[k]||[]).filter(x=>x.id!==id));
        writeLocal(key, obj);
        cash = obj;
      }
      render();
    }catch(e){ console.error(e); showToast?.(__c('cash.deleteFail','Gagal hapus.'), 'error'); }
  }

  function readLocal(key){ try{ return JSON.parse(localStorage.getItem(key)||'{"masuk":[],"keluar":[]}'); }catch{ return {masuk:[],keluar:[]}; } }
  function writeLocal(key, v){ localStorage.setItem(key, JSON.stringify(v)); }

  async function loadFromCloud(){
    if (!isCloudMode() || !window.sb || !currentEventId){
      const key = 'cash:'+ (currentEventId||'local');
      cash = readLocal(key);
      return;
    }
    const { data, error } = await sb
      .from('event_cashflows')
      .select('id,kind,label,amount,pax')
      .eq('event_id', currentEventId)
      .order('created_at', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) { console.error(error); cash = {masuk:[],keluar:[]}; return; }
    const masuk = [], keluar = [];
    (data||[]).forEach(r=>{ (r.kind==='keluar' ? keluar : masuk).push(r); });
    cash = { masuk, keluar };
  }

  async function loadRangeFromCloud(start, end){
    // Expect ISO date (YYYY-MM-DD)
    if (!isCloudMode() || !window.sb){ throw new Error('Range hanya tersedia di mode cloud.'); }
    if (!start || !end) { cash = {masuk:[],keluar:[]}; return; }
    const { data: evs, error: e1 } = await sb
      .from('events')
      .select('id,title,event_date')
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date', { ascending: true });
    if (e1) { console.error(e1); cash = {masuk:[],keluar:[]}; return; }
    const ids = (evs||[]).map(e=> e.id);
    if (!ids.length){ cash = {masuk:[],keluar:[]}; return; }
    const metaById = new Map((evs||[]).map(e=> {
      const d = e && e.event_date ? String(e.event_date) : '';
      const iso = d ? (d.includes('T') ? d.slice(0,10) : d) : '';
      return [e.id, { title: e.title||'', date: iso }];
    }));
    const { data: cf, error: e2 } = await sb
      .from('event_cashflows')
      .select('id,kind,label,amount,pax,event_id')
      .in('event_id', ids)
      .order('created_at', { ascending: true });
    if (e2) { console.error(e2); cash = {masuk:[],keluar:[]}; return; }
    const masuk = [], keluar = [];
    (cf||[]).forEach(r=>{
      const meta = metaById.get(r.event_id) || { title:'', date:'' };
      const withTitle = { ...r, eventTitle: meta.title, eventDate: meta.date };
      (r.kind==='keluar' ? keluar : masuk).push(withTitle);
    });
    cash = { masuk, keluar };
  }

  function isMobileNow(){ try { return window.matchMedia && window.matchMedia('(max-width: 640px)').matches; } catch { return false; } }
  function openModal(){
    const m = byId('cashModal');
    if (m) m.classList.remove('hidden');
    // Hide Close button on mobile view
    try{ const c = byId('btnCashClose'); if (c) c.classList.toggle('hidden', isMobileNow()); }catch{}
  }
  function closeModal(){ const m = byId('cashModal'); if (m) m.classList.add('hidden'); }

  function openForm(kind, row){
    editing.kind = (kind==='keluar') ? 'keluar' : 'masuk';
    editing.id = row?.id || null;
    const fm = byId('cashFormModal');
    const title = byId('cashFormTitle');
    const labLbl = byId('cashLabelLabel');
    const date = null; // removed
    const lab = byId('cashLabel');
    const amt = byId('cashAmount');
    const pax = byId('cashPax');
    const tot = byId('cashTotal');
    if (title) title.textContent = row
      ? (editing.kind==='masuk'
          ? __c('cash.form.title.editIn', 'Edit Uang Masuk')
          : __c('cash.form.title.editOut', 'Edit Uang Keluar'))
      : (editing.kind==='masuk'
          ? __c('cash.form.title.addIn', 'Tambah Uang Masuk')
          : __c('cash.form.title.addOut', 'Tambah Uang Keluar'));
    if (labLbl) labLbl.textContent = (editing.kind==='masuk')
      ? __c('cash.form.label.in', 'Source')
      : __c('cash.form.label.out', 'Items');
    // date removed from UI
    if (lab) lab.value = row?.label || '';
    if (amt) amt.value = Number(row?.amount||0);
    if (pax) pax.value = Number(row?.pax||1);
    if (tot) tot.textContent = fmtIDR(Number(amt.value||0)*Number(pax.value||1));
    if (fm) fm.classList.remove('hidden');
  }
  function closeForm(){ const fm = byId('cashFormModal'); if (fm) fm.classList.add('hidden'); editing.id=null; }

  function updateFormTotal(){
    const amt = Number(byId('cashAmount')?.value||0);
    const pax = Number(byId('cashPax')?.value||1);
    const tot = byId('cashTotal');
    if (tot) tot.textContent = fmtIDR(amt*pax);
  }

  async function submitForm(e){
    e.preventDefault();
    const can = (typeof isCashAdmin==='function') ? isCashAdmin() : (!!window._isCashAdmin);
    if (!can) { showToast?.(__c('cash.accessDenied','Anda tidak memiliki akses Cashflow untuk event ini.'), 'warn'); return; }
    const payload = {
      event_id: currentEventId || null,
      kind: editing.kind,
      label: (byId('cashLabel')?.value||'').trim(),
      amount: Number(byId('cashAmount')?.value||0),
      pax: Number(byId('cashPax')?.value||1)
    };
    try{
      if (isCloudMode() && window.sb && currentEventId){
        try{
          const { error: rpcErr } = await sb.rpc('upsert_cashflow', {
            p_event_id: currentEventId,
            p_kind: payload.kind,
            p_label: payload.label,
            p_amount: payload.amount,
            p_pax: payload.pax,
            p_id: editing.id || null
          });
          if (rpcErr) throw rpcErr;
        }catch(e){
          // Fallback to direct table op
          if (editing.id){
            await sb.from('event_cashflows').update(payload).eq('id', editing.id);
          } else {
            await sb.from('event_cashflows').insert(payload);
          }
        }
        await loadFromCloud();
      } else {
        const key = 'cash:'+ (currentEventId||'local');
        const obj = readLocal(key);
        if (editing.id){
          const arr = obj[payload.kind]||[];
          const idx = arr.findIndex(x=>x.id===editing.id);
          if (idx>-1) arr[idx] = { ...arr[idx], ...payload };
        } else {
          const id = Math.random().toString(36).slice(2);
          obj[payload.kind] = (obj[payload.kind]||[]);
          obj[payload.kind].push({ id, ...payload });
        }
        writeLocal(key, obj);
        cash = obj;
      }
      render();
      closeForm();
    }catch(err){ console.error(err); showToast?.(__c('cash.saveFail','Gagal menyimpan.'), 'error'); }
  }

  async function onOpen(){
    if (!rangeMode.active && !currentEventId){ showToast?.(__c('cash.toast.openEvent','Buka event dulu.'), 'warn'); return; }
    if (!(typeof isCashAdmin==='function' && isCashAdmin())){ showToast?.(__c('cash.accessDenied','Anda tidak memiliki akses Cashflow untuk event ini.'), 'warn'); return; }
    showLoading?.('Memuat kas…');
    try{
      if (rangeMode.active){ await loadRangeSafe(); } else { await loadFromCloud(); }
    } finally { hideLoading?.(); }
    ensureButtonsAccess();
    try{ await setEventInfo(); }catch{}
    render();
    openModal();
  }

  async function setEventInfo(){
    const span = byId('cashEventInfo');
    if (!span) return;
    if (rangeMode.active && rangeMode.start && rangeMode.end){
      span.textContent = `Range ${rangeMode.start} s/d ${rangeMode.end}`;
      return;
    }
    let title = '';
    let date = '';
    try{
      if (isCloudMode() && window.sb && currentEventId){
        const { data } = await sb.from('events').select('title,event_date').eq('id', currentEventId).maybeSingle();
        title = data?.title || '';
        date = (data?.event_date ? String(data.event_date).slice(0,10) : '') || '';
      }
    }catch{}
    if (!title){ try{ title = (byId('appTitle')?.textContent||'').trim(); }catch{} }
    if (!date){ try{ date = (typeof currentSessionDate!=='undefined' && currentSessionDate) ? currentSessionDate : (byId('chipDateText')?.textContent||''); }catch{} }
    const parts = [];
    if (title) parts.push(title);
    if (date) parts.push(date);
    span.textContent = parts.join(' – ');
  }

  async function loadRangeSafe(){
    try{
      await loadRangeFromCloud(rangeMode.start, rangeMode.end);
    }catch(e){ console.error(e); showToast?.(__c('cash.toast.rangeCloudOnly','Range hanya tersedia di mode cloud.'), 'warn'); cash = {masuk:[],keluar:[]}; }
  }

  async function applyRange(){
    const s = (byId('cashStart')?.value||'').trim();
    const e = (byId('cashEnd')?.value||'').trim();
    if (!s || !e){ showToast?.(__c('cash.rangeRequired','Isi tanggal Start dan End.'), 'warn'); return; }
    if (s > e){ showToast?.(__c('cash.rangeInvalid','Tanggal Start harus <= End.'), 'warn'); return; }
    rangeMode = { active:true, start:s, end:e };
    showLoading?.('Memuat kas (range)…');
    try{ await loadRangeSafe(); } finally { hideLoading?.(); }
    ensureButtonsAccess();
    try{ await setEventInfo(); }catch{}
    render();
  }

  async function clearRange(){
    rangeMode = { active:false, start:null, end:null };
    showLoading?.('Memuat kas…');
    try{ await loadFromCloud(); } finally { hideLoading?.(); }
    ensureButtonsAccess();
    try{ await setEventInfo(); }catch{}
    render();
  }

  function bind(){
    const openBtn = byId('btnCashflow');
    if (openBtn) openBtn.addEventListener('click', onOpen);
    try { window.openCashflow = onOpen; } catch {}
    const closeBtn = byId('btnCashClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const modal = byId('cashModal');
    if (modal) modal.addEventListener('click', (e)=>{ if (e.target?.dataset?.cashAct==='close') closeModal(); });
    const fmModal = byId('cashFormModal');
    if (fmModal) fmModal.addEventListener('click', (e)=>{ if (e.target?.dataset?.cashformAct==='close') closeForm(); });
    const cancel = byId('cashCancel'); if (cancel) cancel.addEventListener('click', closeForm);
    const f = byId('cashForm'); if (f) f.addEventListener('submit', submitForm);
    const a = byId('cashAmount'); const p = byId('cashPax');
    if (a) a.addEventListener('input', updateFormTotal);
    if (p) p.addEventListener('input', updateFormTotal);
    const addIn = byId('btnCashAddIn'); if (addIn) addIn.addEventListener('click', ()=> openForm('masuk'));
    const addOut= byId('btnCashAddOut'); if (addOut) addOut.addEventListener('click', ()=> openForm('keluar'));
    const exl = byId('btnCashExportExcel'); if (exl) exl.addEventListener('click', ()=> exportCashflow('excel'));
    const pdf = byId('btnCashExportPDF'); if (pdf) pdf.addEventListener('click', ()=> exportCashflow('pdf'));
    const apR = byId('btnCashApplyRange'); if (apR) apR.addEventListener('click', applyRange);
    const clR = byId('btnCashClearRange'); if (clR) clR.addEventListener('click', clearRange);
  }

  // init after DOM ready
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
