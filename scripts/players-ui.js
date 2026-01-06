"use strict";
// ================== PLAYERS UI ================== //
const t = (k,f)=> (window.__i18n_get ? __i18n_get(k,f) : f);
async function askYN(msg){
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

function renderPlayersList() {
  const ul = byId("playersList");
  ul.innerHTML = "";
  players.forEach((name, idx) => {
    const li = document.createElement("li");
    const __paidInit = isPlayerPaid(name);
    li.className =
      "relative flex items-center justify-between gap-2 px-3 py-3 rounded-2xl border " +
      (__paidInit ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-500'
                  : 'bg-white dark:bg-gray-900 dark:border-gray-700');
    li.innerHTML =
      "<span class='player-name flex-1'>" +
      escapeHtml(name) +
      "</span><button class='del px-2 py-0.5 text-xs rounded border flex items-center gap-1 bg-emerald-600 text-white border-red-600'>"+t('players.deleteBtn','hapus')+"</button>";
      // === meta mini controls (gender + level)
      const meta = playerMeta[name] || { gender:'', level:'' };

      // gender select
      const gSel = document.createElement('select');
      gSel.className = 'player-meta border rounded px-1 py-0.5 text-xs dark:bg-gray-900 dark:border-gray-700';
      ['','M','F'].forEach(v => gSel.appendChild(new Option(v || t('players.gender.placeholder','-Pilih Gender-'), v)));
      gSel.value = meta.gender || '';
      gSel.disabled = isViewer();
      gSel.onchange = () => {
        playerMeta[name] = { ...playerMeta[name], gender: gSel.value };
        markDirty();
        validateNames();    // << tambah ini
      };

      // level select
      const lSel = document.createElement('select');
      lSel.className = 'player-meta border rounded px-1 py-0.5 text-xs dark:bg-gray-900 dark:border-gray-700';
      [['', t('players.level.beginner','Beginner')], ['beg', t('players.level.beginner','Beginner')], ['pro', t('players.level.pro','Pro')]]
        .forEach(([v,txt]) => lSel.add(new Option(txt, v)));
      lSel.value = meta.level || '';
      lSel.disabled = isViewer();
      lSel.onchange = () => {
        playerMeta[name] = { ...playerMeta[name], level: lSel.value };
        markDirty();
        validateNames();    // << tambah ini
      };

      // sisipkan di antara nama & tombol hapus
      const nameSpan = li.querySelector('.player-name');
      const delBtn   = li.querySelector('.del');
      if (!isViewer()){
        const editBtn = document.createElement('button');
        editBtn.className = 'px-2 py-0.5 text-xs rounded border dark:border-gray-700 flex items-center gap-1';
        editBtn.textContent = t('players.edit','edit');
        editBtn.title = t('players.editTitle','Rename pemain');
        editBtn.addEventListener('click', (e)=>{
          e.preventDefault(); e.stopPropagation();
          if (typeof openPlayerNameEditModal === 'function') openPlayerNameEditModal(name);
        });
        nameSpan.after(editBtn);
        nameSpan.classList.add('mr-2');
      }
      if (isViewer()) delBtn.style.display = 'none';
      // Tombol toggle "Paid" (khusus editor) — akan disembunyikan, kita gunakan klik kartu
      const pBtn = document.createElement('button');
      function _refreshPaidBtn(){
        const paid = isPlayerPaid(name);
        pBtn.className = 'px-2 py-0.5 text-xs rounded border flex items-center gap-1 ' +
                        (paid ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-transparent border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300');
        pBtn.title = paid ? t('players.markUnpaid','Tandai belum bayar') : t('players.markPaid','Tandai sudah bayar');
        pBtn.innerHTML = (paid ? '✓ ' : '') + t('players.paid','Paid');
      }
      pBtn.addEventListener('click', () => {
        // Allow editor OR cash-admin (owner/admin)
        const allow = (!isViewer()) || (typeof isCashAdmin==='function' && isCashAdmin());
        if (!allow) return;              // safety
        togglePlayerPaid(name);
        _refreshPaidBtn();
        try{ __updatePaidCardStyle(); }catch{}
      });
      // Editor/Owner: tombol Paid tampil. Viewer disembunyikan.
      if (!isViewer()) { pBtn.style.display = ''; } else { pBtn.style.display = 'none'; }
      _refreshPaidBtn();

      if (!isViewer()){
        const editBtn = nameSpan.nextElementSibling && nameSpan.nextElementSibling.textContent === 'edit'
          ? nameSpan.nextElementSibling
          : null;
        if (editBtn) editBtn.after(gSel, lSel, pBtn);
        else nameSpan.after(gSel, lSel, pBtn);
      } else {
        nameSpan.after(gSel, lSel, pBtn);
      }

      // Badge Paid (bottom-right)
      const paidBadge = document.createElement('span');
      paidBadge.className = 'absolute -bottom-3 right-3 px-2 py-0.5 text-[11px] rounded-full bg-emerald-600 text-white shadow hidden';
      paidBadge.textContent = t('players.paid','Paid');
      if (isViewer()) li.appendChild(paidBadge);

      function __updatePaidCardStyle(){
        const paid = isPlayerPaid(name);
        li.className = 'relative flex items-center justify-between gap-2 px-3 py-3 rounded-2xl border ' +
          (paid ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-500'
                : 'bg-white dark:bg-gray-900 dark:border-gray-700');
        paidBadge.classList.toggle('hidden', !paid);
      }
      function __pulse(){ try{ li.classList.add('pay-pulse'); setTimeout(()=> li.classList.remove('pay-pulse'), 650); }catch{} }
      __updatePaidCardStyle();

      

      // Toggle paid by clicking the whole card for admin/editor
      const __canToggleCard = (typeof isViewer==='function' && isViewer()) && (String(window._memberRole||'').toLowerCase()==='admin');
      if (__canToggleCard){
        li.classList.add('cursor-pointer');
        li.addEventListener('click', (e)=>{
          const tg = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
          if (['BUTTON','SELECT','OPTION','INPUT','TEXTAREA','A','SVG','PATH'].includes(tg)) return;
          togglePlayerPaid(name);
          _refreshPaidBtn();
          __updatePaidCardStyle();
        });
      }
      // Ensure initial style reflects paid state
      try { __updatePaidCardStyle(); } catch {}


    li.querySelector(".del").addEventListener("click", async () => {
      const ok = await askYN(t('players.deleteConfirm','Hapus') + " " + name + "?");
      if (!ok) { showToast?.(t('players.deleteCancelled','Hapus dibatalkan'), 'info'); return; }
      players.splice(idx, 1);
      removePlayerFromRounds(name);
      delete playerMeta[name];
      try{
        const promoted = autoPromoteIfSlot?.();
        if (promoted) replaceNameInRounds(name, promoted);
      }catch{}
      markDirty();
      renderPlayersList();
      renderAll();
      validateNames();
      try{ maybeAutoSaveCloud(); }catch{}
    });
    ul.appendChild(li);
  });
      byId("globalInfo").textContent = t(
        'players.summary',
        'Pemain: {count} | Match/lapangan: {round} | Menit/ronde: {minutes}'
      )
      .replace('{count}', players.length)
      .replace('{round}', (byId("roundCount").value || 10))
      .replace('{minutes}', (byId("minutesPerRound").value || 12));
  try { if (isViewer()) renderViewerPlayersList?.(); } catch {}
  try{ renderHeaderChips(); }catch{}
  // render waiting list (editor panel)
  try {
    let wrap = byId('waitingListWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'waitingListWrap';
      wrap.className = 'mt-3';
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-1';
      const h = document.createElement('div');
      h.className = 'text-xs font-semibold text-gray-600 dark:text-gray-300';
      h.textContent = t('players.waitingList','Waiting List');
      const btnAll = document.createElement('button');
      btnAll.id = 'btnPromoteAllWL';
      btnAll.className = 'px-2 py-0.5 text-xs rounded bg-emerald-600 text-white hidden';
      btnAll.textContent = t('players.promoteAll','Promote semua');
      btnAll.addEventListener('click', promoteAllFromWaiting);
      header.append(h, btnAll);
      const ulw = document.createElement('ul');
      ulw.id = 'waitingList';
      ulw.className = 'min-h-[32px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2';
      wrap.append(header, ulw);
      const container = byId('playerListContainer')?.parentElement || byId('playersPanel');
      container && container.appendChild(wrap);
    }
    // toggle button visibility for editor only
    const btnAll = byId('btnPromoteAllWL');
    if (btnAll) btnAll.classList.toggle('hidden', isViewer());
    const ulw = byId('waitingList');
    if (ulw) {
      ulw.innerHTML = '';
      (waitingList||[]).forEach((name) => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700';
        const meta = playerMeta[name] || { gender:'', level:'' };
        const badge = (txt, cls) => `<span class="text-[10px] px-1.5 py-0.5 rounded ${cls}">${escapeHtml(String(txt))}</span>`;
        const g = meta.gender||''; const lv = meta.level||'';
        const badges = [ g?badge(g,'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'):'' , lv?badge(lv,'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'):'' ].filter(Boolean).join('');
        li.innerHTML = `<span class='flex-1'>${escapeHtml(name)}</span><span class='flex gap-1'>${badges}</span>`;
        if (!isViewer()){
          const promote = document.createElement('button');
          promote.className = 'px-2 py-0.5 text-xs rounded bg-emerald-600 text-white flex items-center gap-1';
          promote.title = t('players.waiting.promoteTitle','Promote dari waiting list');
          promote.innerHTML = `
            <span class="sm:hidden" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M5 15l7-7 7 7" />
              </svg>
            </span>
            <span class="hidden sm:inline">Promote</span>`;
          promote.addEventListener('click', ()=> promoteFromWaiting(name));
          const del = document.createElement('button');
          del.className = 'px-2 py-0.5 text-xs rounded border dark:border-gray-700 flex items-center gap-1';
          del.title = t('players.waiting.remove','Hapus dari waiting list');
          del.innerHTML = `
            <span class="sm:hidden" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 10v8M14 10v8" />
              </svg>
            </span>
            <span class="hidden sm:inline">${t('players.deleteBtn','hapus')}</span>`;
          del.addEventListener('click', ()=> removeFromWaiting(name));
          li.appendChild(promote);
          li.appendChild(del);
        }
        ulw.appendChild(li);
      });
    }
  } catch {}
}
// Ensure a viewer-only players panel exists; return wrapper element
function ensureViewerPlayersPanel(){
  let wrap = byId('viewerPlayersWrap');
  if (wrap) return wrap;
  const globalInfo = byId('globalInfo');
  const parent = globalInfo ? globalInfo.parentElement : document.querySelector('main section');
  if (!parent) return null;
  wrap = document.createElement('div');
  wrap.id = 'viewerPlayersWrap';
  wrap.className = 'mt-4 hidden';
  const h3 = document.createElement('h3');
  h3.className = 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2';
  h3.textContent = t('players.heading','Daftar Pemain');
  const ul = document.createElement('ul');
  ul.id = 'viewerPlayersList';
  ul.className = 'min-h-[44px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2';
  // waiting list holder (created later if needed)
  wrap.append(h3, ul);
  parent.appendChild(wrap);
  return wrap;
}
