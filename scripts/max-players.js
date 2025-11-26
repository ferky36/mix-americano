"use strict";
const __mT = (k, f)=> (window.__i18n_get ? __i18n_get(k, f) : f);
// ================== Max Players (Editor) ================== //
function ensureMaxPlayersField(){
  let wrap = byId('maxPlayersWrap');
  if (wrap) return wrap;
  const rc = byId('roundCount');
  if (!rc || !rc.parentElement || !rc.parentElement.parentElement) return null;
  const parent = rc.parentElement.parentElement; // grid container
  wrap = document.createElement('div');
  wrap.id = 'maxPlayersWrap';
  wrap.className = 'filter-field';
  const label = document.createElement('label');
  label.className = 'filter-label block text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-300';
  label.textContent = __mT('settings.maxPlayers','Max Pemain');
  const input = document.createElement('input');
  input.id = 'maxPlayersInput';
  input.type = 'number';
  input.min = '1';
  input.placeholder = __mT('settings.maxPlayers.placeholder','Tak terbatas');
  input.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';
  input.value = currentMaxPlayers ? String(currentMaxPlayers) : '';
  input.addEventListener('input', (e)=>{
    // update nilai lokal + tandai dirty; simpan ke state saat Save
    const raw = String(e.target.value||'').trim();
    if (raw === '') { currentMaxPlayers = null; markDirty(); try{ renderHeaderChips?.(); }catch{} return; }
    const v = parseInt(raw, 10);
    if (Number.isFinite(v) && v > 0) { currentMaxPlayers = v; markDirty(); try{ renderHeaderChips?.(); }catch{} }
  });
  wrap.append(label, input);
  // insert right after the roundCount container
  if (rc.parentElement.nextSibling) {
    parent.insertBefore(wrap, rc.parentElement.nextSibling);
  } else {
    parent.appendChild(wrap);
  }
  return wrap;
}
