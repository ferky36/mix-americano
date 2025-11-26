"use strict";
const __locT = (k, f)=> (window.__i18n_get ? __i18n_get(k, f) : f);
// ================== Event Location (Editor) ================== //
function ensureLocationFields(){
  let wrap = byId('locationWrap');
  if (wrap) return wrap;
  const rc = byId('roundCount');
  if (!rc || !rc.parentElement || !rc.parentElement.parentElement) return null;
  const parent = rc.parentElement.parentElement; // grid container
  wrap = document.createElement('div');
  wrap.id = 'locationWrap';
  wrap.className = 'filter-field filter-field--full';

  const label1 = document.createElement('label');
  label1.className = 'filter-label block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300';
  label1.textContent = __locT('settings.locText','Lokasi (opsional)');
  const input1 = document.createElement('input');
  input1.id = 'locationTextInput';
  input1.type = 'text';
  input1.placeholder = __locT('settings.locText.placeholder','Mis. Lapangan A, GBK');
  input1.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

  const label2 = document.createElement('label');
  label2.className = 'filter-label mt-3 block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300';
  label2.textContent = __locT('settings.locUrl','Link Maps (opsional)');
  const input2 = document.createElement('input');
  input2.id = 'locationUrlInput';
  input2.type = 'url';
  input2.placeholder = __locT('settings.locUrl.placeholder','https://maps.app.goo.gl/...');
  input2.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

  // Save on blur (best-effort)
  const save = debounce(async ()=>{
    try{
      if (!isCloudMode() || !currentEventId) return;
      const locText = (input1.value||'').trim();
      const locUrl  = (input2.value||'').trim();
      await sb.from('events').update({ location_text: locText || null, location_url: locUrl || null }).eq('id', currentEventId);
      renderEventLocation(locText, locUrl);
    }catch(e){ console.warn('Save location failed', e); }
  }, 300);
  input1.addEventListener('change', save);
  input1.addEventListener('blur', save);
  input2.addEventListener('change', save);
  input2.addEventListener('blur', save);

  wrap.append(label1, input1, label2, input2);
  // insert after maxPlayersWrap if exists, else after rc parent
  const after = byId('maxPlayersWrap')?.nextSibling ? byId('maxPlayersWrap').nextSibling : rc.parentElement.nextSibling;
  if (after) parent.insertBefore(wrap, after); else parent.appendChild(wrap);
  return wrap;
}

async function loadLocationFromDB(){
  try{
    if (!isCloudMode() || !window.sb?.from || !currentEventId) return;
    // Try cached meta first
    let meta = null; try{ meta = window.getEventMetaCache?.(currentEventId) || null; }catch{}
    if (!meta){
      const { data } = await sb.from('events').select('location_text, location_url').eq('id', currentEventId).maybeSingle();
      meta = data || null; try{ if (meta) window.setEventMetaCache?.(currentEventId, { ...(window.getEventMetaCache?.(currentEventId)||{}), ...meta }); }catch{}
    }
    const input1 = byId('locationTextInput');
    const input2 = byId('locationUrlInput');
    if (input1) input1.value = meta?.location_text || '';
    if (input2) input2.value = meta?.location_url || '';
  }catch{}
}

function ensureJoinOpenFields(){
  // Tempat yang benar: selalu di dalam #filterPanel
  const filterPanel = byId('filterPanel');
  if (!filterPanel) {
    // Pantau sampai filterPanel muncul
    if (!window.__joinOpenAnchorObserver) {
      window.__joinOpenAnchorObserver = new MutationObserver(() => {
        const fp = byId('filterPanel');
        if (fp) {
          try { window.__joinOpenAnchorObserver.disconnect(); }catch{}
          window.__joinOpenAnchorObserver = null;
          ensureJoinOpenFields();
        }
      });
      try { window.__joinOpenAnchorObserver.observe(document.body, { childList: true, subtree: true }); } catch {}
    }
    return null;
  }

  const gridParent = filterPanel;

  // --- buat / ambil wrap komponen ---
  let wrap = byId('joinOpenWrap');
  const creating = !wrap;
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'joinOpenWrap';
    wrap.className = 'filter-field filter-field--full';
    wrap.innerHTML = `
      <label class="filter-label block text-[11px] uppercase tracking-wide font-semibold text-gray-600 dark:text-gray-300 mb-1">
        ${__locT('event.joinOpen','Buka Join')}
      </label>
      <div class="join-open-row">
        <input id="joinOpenDateInput" type="date"  class="join-open-input filter-input" />
        <input id="joinOpenTimeInput" type="time"  class="join-open-input filter-input" step="60" />
      </div>
    `;
  }

  // Jika wrap sempat tersisip di tempat lain (mis. di modal), pindahkan ke filterPanel
  if (wrap.parentNode && wrap.closest('#filterPanel') !== filterPanel) {
    try { wrap.parentNode.removeChild(wrap); } catch {}
  }

  // Sisipkan sesudah locationWrap jika ada, selain itu di akhir filterPanel
  const locWrap = byId('locationWrap');
  if (creating || !wrap.parentNode) {
    if (locWrap && locWrap.parentNode === gridParent) {
      gridParent.insertBefore(wrap, locWrap.nextSibling);
    } else {
      gridParent.appendChild(wrap);
    }
  }

  // set nilai awal dari state
  const di = byId('joinOpenDateInput');
  const ti = byId('joinOpenTimeInput');
  if (di) di.value = toLocalDateValue(window.joinOpenAt);
  if (ti) ti.value = toLocalTimeValue(window.joinOpenAt);

  // pasang handler SEKALI (hindari duplikasi)
  if (!wrap.__bound) {
    const onChange = async () => {
      const d = di?.value || '';
      const t = ti?.value || '';
      window.joinOpenAt = combineDateTimeToISO(d, t);
      scheduleJoinOpenTimer();
      try {
        if (currentEventId && window.sb) {
          await sb.from('events').update({ join_open_at: window.joinOpenAt }).eq('id', currentEventId);
          showToast?.(__locT('joinOpen.saved','Waktu buka join disimpan'), 'success');
        }
      } catch (e) { console.warn(e); showToast?.(__locT('joinOpen.failed','Gagal menyimpan waktu buka join'), 'error'); }
      try { refreshJoinUI?.(); } catch {}
    };
    di && di.addEventListener('change', onChange);
    ti && ti.addEventListener('change', onChange);
    wrap.__bound = true;
  }

  // jika nanti wrap dibuang karena re-render, sisipkan ulang otomatis
  if (!window.__joinOpenReinsertObserver) {
    window.__joinOpenReinsertObserver = new MutationObserver(() => {
      const stillThere = byId('joinOpenWrap');
      const inPanel = stillThere && !!stillThere.closest('#filterPanel');
      if (!stillThere || !inPanel) {
        try { window.__joinOpenReinsertObserver.disconnect(); }catch{}
        window.__joinOpenReinsertObserver = null;
        ensureJoinOpenFields();
      }
    });
    try { window.__joinOpenReinsertObserver.observe(gridParent, { childList: true, subtree: true }); } catch {}
  }

  return wrap;
}



async function loadJoinOpenFromDB(){
  try{
    if (!isCloudMode() || !window.sb?.from || !currentEventId) return;
    const { data } = await sb.from('events').select('join_open_at').eq('id', currentEventId).maybeSingle();
    window.joinOpenAt = data?.join_open_at || null;
    const di = byId('joinOpenDateInput'), ti = byId('joinOpenTimeInput');
    if (di) di.value = toLocalDateValue(window.joinOpenAt);
    if (ti) ti.value = toLocalTimeValue(window.joinOpenAt);
    scheduleJoinOpenTimer();
    try{ refreshJoinUI?.(); }catch{}
  }catch{}
}


async function loadMaxPlayersFromDB(){
  try{
    if (!isCloudMode() || !window.sb?.from || !currentEventId) return;
    // Use cached meta if available
    let meta = null; try{ meta = window.getEventMetaCache?.(currentEventId) || null; }catch{}
    if (!meta){
      const { data } = await sb.from('events').select('max_players').eq('id', currentEventId).maybeSingle();
      meta = data || null; try{ if (meta) window.setEventMetaCache?.(currentEventId, { ...(window.getEventMetaCache?.(currentEventId)||{}), ...meta }); }catch{}
    }
    currentMaxPlayers = Number.isInteger(meta?.max_players) ? meta.max_players : null;
    const input = byId('maxPlayersInput');
    if (input) input.value = currentMaxPlayers ? String(currentMaxPlayers) : ''; try{ renderHeaderChips?.(); }catch{}
  }catch{}
}
function addPlayer(name) {
  if (isViewer()) return false;
  name = (name || '').trim();
  if (!name) return false;

  const norm = s => String(s||'').trim().toLowerCase();
  if ((players||[]).some(n => norm(n) === norm(name))) {
    showToast(__locT('join.nameUsed','Nama sudah ada di daftar pemain'), 'info');
    return false;
  }
  if ((waitingList||[]).some(n => norm(n) === norm(name))) {
    showToast(__locT('join.waitingDuplicate','Nama sudah ada di waiting list'), 'info');
    return false;
  }

  if (Number.isInteger(currentMaxPlayers) && currentMaxPlayers > 0 && players.length >= currentMaxPlayers) {
    waitingList.push(name);
    showToast(__locT('join.waitlistFull','List sudah penuh, Pemain masuk ke waiting list'), 'warn');
  } else {
    players.push(name);
  }

  renderPlayersList?.();
  renderAll?.();
  markDirty();
  return true;
}


function removePlayerFromRounds(name) {
  const norm = s => String(s||'').trim().toLowerCase();
  const target = norm(name);
  roundsByCourt.forEach(arr => {
    arr.forEach(r => {
      ["a1", "a2", "b1", "b2"].forEach(k => {
        if (r && norm(r[k]) === target) r[k] = "";
      });
    });
  });
}

// Gantikan nama pemain di semua match (semua lapangan & ronde)
function replaceNameInRounds(oldName, newName){
  if (!oldName || !newName) return;
  const norm = s => String(s||'').trim().toLowerCase();
  const from = norm(oldName);
  roundsByCourt.forEach(arr => {
    arr.forEach(r => {
      ["a1","a2","b1","b2"].forEach(k=>{
        if (r && norm(r[k]) === from) r[k] = newName;
      });
    });
  });
}
