"use strict";
// ================== Editor Players Panel Relocation ================== //
function ensureEditorPlayersSection(){
  let host = document.getElementById('editorPlayersSection');
  if (host) return host;
  const main = document.querySelector('main');
  if (!main) return null;
  host = document.createElement('section');
  host.id = 'editorPlayersSection';
  host.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow';
  // place at top of main
  if (main.firstElementChild) main.insertBefore(host, main.firstElementChild);
  else main.appendChild(host);
  return host;
}

function relocateEditorPlayersPanel(){
  const pp = document.getElementById('playersPanel');
  if (!pp) return;
  const box = pp.parentElement; // the rounded border box containing header and panel
  if (!box) return;
  const host = ensureEditorPlayersSection();
  if (!host) return;
  // Clean up spacing from original context
  try { box.classList.remove('mt-2'); box.classList.add('mt-0'); } catch {}
  if (!host.contains(box)) host.appendChild(box);
  // Remove the empty grid cell container to avoid gap in filter grid
  try {
    const gridCell = box.parentElement; // col-span-2 md:col-span-6
    if (gridCell && gridCell !== host && gridCell.parentElement && gridCell.id !== 'editorPlayersSection') {
      gridCell.remove();
    }
  } catch {}
  try{ setupPlayersToolbarUI?.(); }catch{}
}

// Replace players toolbar texts with icon+label; labels hidden on mobile portrait via CSS
function setupPlayersToolbarUI(){
  try{
    const collapse = byId('btnCollapsePlayers');
    if (collapse && !collapse.dataset.iconified){
      collapse.dataset.iconified = '1';
      collapse.classList.add('icon-btn');
      collapse.innerHTML = '<svg class="icon inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg><span class="btn-label">Pemain</span>';
      const hint = collapse.parentElement?.querySelector('span');
      if (hint) hint.classList.add('helper-hint');
    }
    const map = [
      ['btnPasteText', '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>', 'Edit sebagai teks'],
      ['btnApplyPlayerTemplate', '<path d="M5 12l5 5L20 7"/>', 'Apply Template'],
      ['btnClearPlayers', '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 10v8M14 10v8"/><path d="M8 6V4h8v2"/>', 'Kosongkan']
    ];
    map.forEach(([id, svgPath, label])=>{
      const btn = byId(id);
      if (!btn || btn.dataset.iconified) return;
      btn.dataset.iconified = '1';
      btn.classList.add('icon-btn');
      btn.innerHTML = `<svg class="icon inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg><span class="btn-label">${label}</span>`;
    });
  }catch{}
}

// Render players for viewer mode into the viewer-only panel
function renderViewerPlayersList(){
  const wrap = ensureViewerPlayersPanel();
  if (!wrap) return;
  const ul = byId('viewerPlayersList');
  if (!ul) return;
  ul.innerHTML = '';
  (players || []).forEach((name) => {
    const li = document.createElement('li');
    const paid = isPlayerPaid(name);
    li.className = 'flex items-center gap-2 px-3 py-2 rounded-lg border ' +
    (paid
      ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-500'
      : 'bg-white dark:bg-gray-900 dark:border-gray-700');
    const meta = (playerMeta && playerMeta[name]) ? playerMeta[name] : {};
    const g = meta.gender || '';
    const lv = meta.level || '';
    const badge = (txt, cls) => `<span class="text-[10px] px-1.5 py-0.5 rounded ${cls}">${escapeHtml(String(txt))}</span>`;
    const badges = [
      g ? badge(g, 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200') : '',
      lv ? badge(lv, 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200') : ''
    ].filter(Boolean).join('');
    li.innerHTML = `<span class='flex-1'>${escapeHtml(name)}</span><span class='flex gap-1'>${badges}</span>`;
    ul.appendChild(li);
  });
  // waiting list for viewer
  try {
    let wwrap = byId('viewerWaitingWrap');
    if (!wwrap){
      wwrap = document.createElement('div');
      wwrap.id = 'viewerWaitingWrap';
      wwrap.className = 'mt-3';
      const h = document.createElement('div'); h.className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1'; h.textContent='Waiting List';
      const ulw = document.createElement('ul'); ulw.id='viewerWaitingList'; ulw.className='min-h-[32px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2';
      wwrap.append(h, ulw);
      wrap.appendChild(wwrap);
    }
    const ulw = byId('viewerWaitingList');
    if (ulw){
      ulw.innerHTML = '';
      (waitingList || []).forEach((name)=>{
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-700';
        const meta = (playerMeta && playerMeta[name]) ? playerMeta[name] : {};
        const g = meta.gender || ''; const lv = meta.level || '';
        const badge = (txt, cls) => `<span class="text-[10px] px-1.5 py-0.5 rounded ${cls}">${escapeHtml(String(txt))}</span>`;
        const badges = [ g?badge(g,'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'):'' , lv?badge(lv,'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'):'' ].filter(Boolean).join('');
        li.innerHTML = `<span class='flex-1'>${escapeHtml(name)}</span><span class='flex gap-1'>${badges}</span>`;
        ulw.appendChild(li);
      });
    }
  } catch {}
}
