"use strict";
// ======== Title Rename (Editor only) ========
function ensureTitleEditor(){
  const h = byId('appTitle');
  if (!h) return;
  let wrap = byId('titleEditWrap');
  if (!wrap){
    wrap = document.createElement('span');
    wrap.id = 'titleEditWrap';
    wrap.className = 'inline-flex items-center gap-1 ml-2 align-middle';
    const btn = document.createElement('button');
    btn.id = 'btnTitleEdit';
    btn.title = 'Rename Event';
    btn.className = 'px-1.5 py-0.5 text-xs rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700';
    btn.textContent = '✎';
    btn.addEventListener('click', startTitleEdit);
    h.after(wrap);
    wrap.appendChild(btn);
  }
}

function startTitleEdit(){
  if (isViewer && isViewer()) return;
  if (!currentEventId || !isCloudMode()) return;
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
  input.placeholder = 'Nama event';
  const btnOk = document.createElement('button');
  btnOk.title = 'Simpan';
  btnOk.className = 'px-2 py-1 text-xs rounded bg-emerald-600 text-white';
  btnOk.textContent = '✓';
  const btnCancel = document.createElement('button');
  btnCancel.title = 'Batal';
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
    if (!val){ showToast?.('Nama event tidak boleh kosong','warn'); return; }
    try{
      showLoading('Menyimpan nama event…');
      const { data, error } = await sb.from('events').update({ title: val }).eq('id', currentEventId).select('id').maybeSingle();
      if (error) throw error;
      setAppTitle(val);
      showToast?.('Nama event disimpan','success');
    }catch(e){ console.error(e); showToast?.('Gagal menyimpan: ' + (e?.message||''), 'error'); }
    finally{ hideLoading(); cleanup(); }
  });
  try{ input.focus(); input.select(); }catch{}
}
