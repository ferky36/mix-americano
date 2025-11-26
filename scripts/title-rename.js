"use strict";
// ======== Title Rename (Editor only) ========
const __trT = (k,f)=> (window.__i18n_get ? __i18n_get(k,f) : f);
function ensureTitleEditor(){
  const h = byId('appTitle');
  if (!h) return;
  try{
    if (typeof isViewer === 'function' && isViewer()) return;
    if (typeof isOwnerNow === 'function' && !isOwnerNow()) return;
  }catch{}
  let wrap = byId('titleEditWrap');
  if (!wrap){
    wrap = document.createElement('span');
    wrap.id = 'titleEditWrap';
    wrap.className = 'inline-flex items-center gap-1 ml-2 align-middle';
    const btn = document.createElement('button');
    btn.id = 'btnTitleEdit';
    btn.title = __trT('title.rename','Rename Event');
    btn.className = 'px-1.5 py-0.5 text-xs rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700';
    btn.textContent = '✎';
    btn.addEventListener('click', startTitleEdit);
    h.after(wrap);
    wrap.appendChild(btn);
  }
}

function startTitleEdit(){
  try{ if (typeof isViewer==='function' && isViewer()) return; }catch{}
  const h = byId('appTitle');
  const wrap = byId('titleEditWrap');
  if (!h || !wrap) return;
  // If already editing, focus the existing input
  const existed = byId('titleEditForm');
  if (existed){ const inp = existed.querySelector('input'); try{ inp?.focus(); inp?.select(); }catch{} return; }
  const orig = (h.textContent || '').trim();
  h.classList.add('hidden');
  wrap.classList.add('hidden');
  const edit = document.createElement('span');
  edit.id = 'titleEditForm';
  edit.className = 'inline-flex items-center gap-1 ml-2 align-middle';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = orig;
  // responsive width: cukup nyaman di mobile/desktop
  input.className = 'border rounded px-2 py-1 text-sm bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-400 w-[60vw] max-w-[18rem] sm:max-w-[20rem]';
  input.placeholder = __trT('title.placeholder','Nama event');
  const btnOk = document.createElement('button');
  btnOk.title = __trT('title.save','Simpan');
  btnOk.className = 'px-2 py-1 text-xs rounded bg-emerald-600 text-white';
  btnOk.textContent = '✓';
  const btnCancel = document.createElement('button');
  btnCancel.title = __trT('title.cancel','Batal');
  btnCancel.className = 'px-2 py-1 text-xs rounded border dark:border-gray-600';
  btnCancel.textContent = '✕';
  edit.append(input, btnOk, btnCancel);
  wrap.after(edit);

  const cleanup = () => { edit.remove(); h.classList.remove('hidden'); wrap.classList.remove('hidden'); };
  btnCancel.addEventListener('click', cleanup);
  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') btnOk.click();
    if (e.key === 'Escape') btnCancel.click();
  });
  btnOk.addEventListener('click', async ()=>{
    const val = (input.value||'').trim();
    if (!val){ try{ showToast?.(__trT('title.empty','Nama event tidak boleh kosong'),'warn'); }catch{} return; }
    try{
      // Cloud mode: simpan ke DB, lainnya: set local saja
      const inCloud = (typeof isCloudMode==='function' && isCloudMode() && !!window.currentEventId);
      if (inCloud){
        showLoading?.(__trT('title.saving','Menyimpan nama event…'));
        const { error } = await sb.from('events').update({ title: val }).eq('id', currentEventId);
        if (error) throw error;
        setAppTitle(val);
        try{ showToast?.(__trT('title.saved','Nama event disimpan'),'success'); }catch{}
        try{ await maybeAutoSaveCloud?.(); }catch{}
      } else {
        setAppTitle(val);
        try{ markDirty?.(); }catch{}
        try{ showToast?.(__trT('title.changed','Nama event diubah'),'success'); }catch{}
      }
    }catch(e){ console.error(e); try{ showToast?.(__trT('title.saveFail','Gagal menyimpan: {msg}').replace('{msg}', (e?.message||'')), 'error'); }catch{} }
    finally{ hideLoading?.(); cleanup(); }
  });
  try{ input.focus(); input.select(); }catch{}
}

// Ensure document.title uses clean separator regardless of prior encoding
try{
  if (typeof setAppTitle === 'function'){
    const _orig = setAppTitle;
    setAppTitle = function(title){
      _orig(title);
      if (title) document.title = title + ' – Mix Americano';
    };
  }
}catch{}

// Ensure editor button exists after DOM ready (in case other scripts didn't call it)
(function ensureTitleBoot(){
  function boot(){ try{ ensureTitleEditor(); }catch{} }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
