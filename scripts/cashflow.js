"use strict";

// Cashflow per event (uang masuk/keluar)
(function(){
  const fmtIDR = (n)=> new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(n||0));
  const byId = (id)=> document.getElementById(id);
  const qs = (s, r=document)=> r.querySelector(s);
  const qsa = (s, r=document)=> Array.from(r.querySelectorAll(s));

  let cash = { masuk: [], keluar: [] };
  let editing = { id: null, kind: 'masuk' };

  function sum(list){ return list.reduce((s, it)=> s + (Number(it.amount||0) * Number(it.pax||1)), 0); }

  function ensureButtonsAccess(){
    try{
      const can = (typeof isCashAdmin==='function') ? isCashAdmin() : false;
      const addIn  = byId('btnCashAddIn');
      const addOut = byId('btnCashAddOut');
      if (addIn)  addIn.classList.toggle('hidden', !can);
      if (addOut) addOut.classList.toggle('hidden', !can);
      // also hide edit/delete actions in rows later in render
    }catch{}
  }

  function render(){
    const tbodyIn = byId('cashTbodyIn');
    const tbodyOut = byId('cashTbodyOut');
    if (!tbodyIn || !tbodyOut) return;
    tbodyIn.innerHTML = '';
    tbodyOut.innerHTML = '';

    const can = (typeof isCashAdmin==='function') ? isCashAdmin() : false;

    function row(it){
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-200 dark:border-gray-700';
      const total = Number(it.amount||0) * Number(it.pax||1);
      const label = it.label || '-';
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
    if (!currentEventId){ showToast?.('Buka event dulu.', 'warn'); return; }
    if (!(typeof isCashAdmin==='function' && isCashAdmin())){ alert('Anda tidak memiliki akses Cashflow untuk event ini.'); return; }
    showLoading?.('Memuat kas…');
    try{ await loadFromCloud(); } finally { hideLoading?.(); }
    ensureButtonsAccess();
    try{ await setEventInfo(); }catch{}
    render();
    openModal();
  }

  async function setEventInfo(){
    const span = byId('cashEventInfo');
    if (!span) return;
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
    span.textContent = parts.join(' — ');
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
  }

  // init after DOM ready
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
