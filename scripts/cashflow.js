"use strict";

// Cashflow per event (uang masuk/keluar)
(function(){
  const fmtIDR = (n)=> new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(n||0));
  const byId = (id)=> document.getElementById(id);
  const qs = (s, r=document)=> r.querySelector(s);
  const qsa = (s, r=document)=> Array.from(r.querySelectorAll(s));

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
      tr.innerHTML = `
        <td class="py-2 pr-2">${label}</td>
        <td class="py-2 pr-2 text-right">${fmtIDR(it.amount)}</td>
        <td class="py-2 pr-2 text-right">${Number(it.pax||1)}</td>
        <td class="py-2 pr-2 text-right font-semibold">${fmtIDR(total)}</td>
        <td class="py-2 pr-2 text-right">
          <div class="flex justify-end gap-1">
            <button data-act="edit" class="px-2 py-1 rounded border dark:border-gray-700 text-xs ${!can?'hidden':''}">Edit</button>
            <button data-act="del"  class="px-2 py-1 rounded border dark:border-gray-700 text-xs ${!can?'hidden':''}">Hapus</button>
          </div>
        </td>`;
      tr.dataset.id = it.id;
      return tr;
    }

    cash.masuk.forEach(it => tbodyIn.appendChild(row(it)));
    cash.keluar.forEach(it => tbodyOut.appendChild(row(it)));

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

    // row actions
    qsa('#cashTbodyIn tr,[id="cashTbodyIn"] tr').forEach(tr => tr.addEventListener('click', onRowAction('masuk')));
    qsa('#cashTbodyOut tr,[id="cashTbodyOut"] tr').forEach(tr => tr.addEventListener('click', onRowAction('keluar')));
  }

  // ---------- Export (Excel/PDF) shared for desktop & mobile ----------
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
      [rangeMode.active ? 'Cashflow Range' : 'Cashflow Event', ctx],
      [],
      ['Uang Masuk', sumIn],
      ['Uang Keluar', sumOut],
      ['Sisa', remain]
    ];
    return { masuk, keluar, ringkasan };
  }

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
    }catch(e){ console.error(e); alert('Gagal export Excel.'); }
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
      if (!w){ alert('Popup diblokir. Izinkan popup untuk export PDF.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      w.focus(); setTimeout(()=>{ try{ w.print(); }catch{} }, 200);
    }catch(e){ console.error(e); alert('Gagal export PDF.'); }
  }

  function exportCashflow(format){
    const f = String(format||'excel').toLowerCase();
    if (f==='excel' || f==='xlsx') return exportCashflowExcel();
    if (f==='pdf') return exportCashflowPDF();
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

  async function delRow(id){
    if (rangeMode.active) { alert('Hapus tidak tersedia pada mode rentang.'); return; }
    const can = (typeof isCashAdmin==='function') ? isCashAdmin() : (!!window._isCashAdmin);
    if (!can) { alert('Anda tidak memiliki akses Cashflow untuk event ini.'); return; }
    if (!confirm('Hapus baris ini?')) return;
    try{
      if (isCloudMode() && window.sb && currentEventId){
        await sb.from('event_cashflows').delete().eq('id', id);
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
    }catch(e){ console.error(e); alert('Gagal hapus.'); }
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
    const titleById = new Map((evs||[]).map(e=> [e.id, e.title||'']));
    const { data: cf, error: e2 } = await sb
      .from('event_cashflows')
      .select('id,kind,label,amount,pax,event_id')
      .in('event_id', ids)
      .order('created_at', { ascending: true });
    if (e2) { console.error(e2); cash = {masuk:[],keluar:[]}; return; }
    const masuk = [], keluar = [];
    (cf||[]).forEach(r=>{
      const withTitle = { ...r, eventTitle: titleById.get(r.event_id) || '' };
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
    if (title) title.textContent = row ? (editing.kind==='masuk'?'Edit Uang Masuk':'Edit Uang Keluar') : (editing.kind==='masuk'?'Tambah Uang Masuk':'Tambah Uang Keluar');
    if (labLbl) labLbl.textContent = (editing.kind==='masuk') ? 'Source' : 'Items';
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
    if (!can) { alert('Anda tidak memiliki akses Cashflow untuk event ini.'); return; }
    const payload = {
      event_id: currentEventId || null,
      kind: editing.kind,
      label: (byId('cashLabel')?.value||'').trim(),
      amount: Number(byId('cashAmount')?.value||0),
      pax: Number(byId('cashPax')?.value||1)
    };
    try{
      if (isCloudMode() && window.sb && currentEventId){
        if (editing.id){
          await sb.from('event_cashflows').update(payload).eq('id', editing.id);
        } else {
          await sb.from('event_cashflows').insert(payload);
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
    }catch(err){ console.error(err); alert('Gagal menyimpan.'); }
  }

  async function onOpen(){
    if (!rangeMode.active && !currentEventId){ showToast?.('Buka event dulu.', 'warn'); return; }
    if (!(typeof isCashAdmin==='function' && isCashAdmin())){ alert('Anda tidak memiliki akses Cashflow untuk event ini.'); return; }
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
    }catch(e){ console.error(e); showToast?.('Range hanya tersedia di mode cloud.', 'warn'); cash = {masuk:[],keluar:[]}; }
  }

  async function applyRange(){
    const s = (byId('cashStart')?.value||'').trim();
    const e = (byId('cashEnd')?.value||'').trim();
    if (!s || !e){ alert('Isi tanggal Start dan End.'); return; }
    if (s > e){ alert('Tanggal Start harus <= End.'); return; }
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
