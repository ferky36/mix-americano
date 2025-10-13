"use strict";
// Lightweight PWA installer (no changes to existing code required to live here).
// To enable: link manifest in <head> and include this script near the end of <body>.
// See usage notes in the PR message.
(function(){
  function byId(id){ return document.getElementById(id); }

  // Register service worker (optional but required for install prompt in Chrome)
  function registerSW(){
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  // UI: floating install prompt button
  function ensureInstallButton(){
    if (byId('pwaInstallBtn')) return;
    const btn = document.createElement('button');
    btn.id='pwaInstallBtn';
    btn.textContent='Install App';
    btn.style.cssText = [
      'position:fixed','right:14px','bottom:16px','z-index:70',
      'padding:10px 14px','border-radius:12px',
      'background:#16a34a','color:#fff','border:none','box-shadow:0 8px 20px rgba(0,0,0,.2)',
      'font-weight:700','cursor:pointer','display:none'
    ].join(';');
    btn.addEventListener('click', async ()=>{
      if (!window.__deferredPrompt) return;
      btn.disabled = true;
      try{
        window.__deferredPrompt.prompt();
        const choice = await window.__deferredPrompt.userChoice;
        if (choice?.outcome !== 'accepted') btn.disabled = false;
        window.__deferredPrompt = null;
        btn.style.display='none';
      }catch{ btn.disabled=false; }
    });
    document.body.appendChild(btn);
    return btn;
  }

  function wireHeaderButton(){
    let hdrBtn = byId('btnInstallAppHdr');
    if (!hdrBtn){
      const chips = byId('hdrChips');
      if (chips){
        // Sanitize any malformed leftover text/markup from previous injections
        try {
          [...chips.childNodes].forEach(n=>{
            if (n && n.nodeType===3 && /Install App/i.test(n.textContent||'')) n.remove();
            if (n && n.nodeType===1 && typeof n.id==='string' && /InstallAppHdr/i.test(n.id) && !/^btnInstallAppHdr$/.test(n.id)) n.remove();
          });
        } catch {}
        hdrBtn = document.createElement('button');
        hdrBtn.id = 'btnInstallAppHdr';
        hdrBtn.className = 'hidden px-3 py-2 rounded-xl bg-white/20 text-white font-semibold shadow hover:bg-white/30';
        hdrBtn.title = 'Install aplikasi ke perangkat';
        hdrBtn.textContent = 'Install App';
        chips.appendChild(hdrBtn);
      }
    }
    if (!hdrBtn) return;
    hdrBtn.addEventListener('click', async ()=>{
      if (!window.__deferredPrompt) return;
      try{
        await window.__deferredPrompt.prompt();
        const choice = await window.__deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') { hdrBtn.classList.add('hidden'); window.__deferredPrompt=null; }
      }catch{}
    });
  }

  // iOS standalone detection
  const isStandalone = () => window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  function showHelpOverlay(){
    const old = byId('pwaHelpOverlay'); if (old) old.remove();
    const wrap = document.createElement('div'); wrap.id='pwaHelpOverlay';
    wrap.style.cssText='position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.45)';
    const panel = document.createElement('div');
    panel.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:520px;width:92%;background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:16px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.3)';
    const ua = (navigator.userAgent||'').toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    let html = '<div style="font-weight:700;margin-bottom:6px">Install ke Perangkat</div>';
    if (isiOS){
      html += '<div>Di iOS Safari: buka ikon <b>Share</b>, lalu pilih <b>Add to Home Screen</b>.</div>';
    } else if (isAndroid){
      html += '<div>Di Chrome Android: buka menu <b>⋮</b>, pilih <b>Install app</b> atau <b>Add to Home screen</b>.</div>';
    } else {
      html += '<div>Buka menu browser dan pilih <b>Install app</b> / <b>Add to Home screen</b>.</div>';
    }
    const btn = document.createElement('button'); btn.textContent='Tutup';
    btn.style.cssText='margin-top:10px;padding:6px 10px;border:1px solid #475569;background:transparent;color:#e5e7eb;border-radius:10px';
    btn.onclick = ()=> wrap.remove();
    panel.innerHTML = html; panel.appendChild(btn); wrap.appendChild(panel); document.body.appendChild(wrap);
  }

  function setupInstallFlow(){
    // Hide in standalone mode
    const btn = ensureInstallButton();
    if (isStandalone()) {
      btn.style.display='none';
      const hb0 = byId('btnInstallAppHdr'); if (hb0) hb0.classList.add('hidden');
      return;
    }

    window.addEventListener('beforeinstallprompt', (e)=>{
      e.preventDefault();
      window.__deferredPrompt = e;
      // Do not show if already installed before
      try{ if (localStorage.getItem('pwaInstalled')==='1') return; }catch{}
      // Show tooltip with actions instead of floating button
      showInstallTooltip();
      const hdrBtn = byId('btnInstallAppHdr'); if (hdrBtn) hdrBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', ()=>{
      const b = byId('pwaInstallBtn'); if (b) b.style.display='none';
      const hb = byId('btnInstallAppHdr'); if (hb) hb.classList.add('hidden');
      window.__deferredPrompt = null;
      try{ localStorage.setItem('pwaInstalled','1'); }catch{}
      try{ byId('pwaInstallTip')?.remove(); }catch{}
    });

    // iOS tip (no beforeinstallprompt). Show a tooltip once.
    try{
      const ua = navigator.userAgent || '';
      const isiOS = /iphone|ipad|ipod/i.test(ua);
      const inSafari = /safari/i.test(ua) && !/crios|fxios/i.test(ua);
      if (isiOS && inSafari && !isStandalone() && !localStorage.getItem('pwaTipShown') && !localStorage.getItem('pwaInstalled')){
        showInstallTooltip(true);
      }
    }catch{}
  }

  // Tooltip with two actions: Install to Device, Not now
  function showInstallTooltip(isIOSHelp){
    try{ byId('pwaInstallTip')?.remove(); }catch{}
    const tip = document.createElement('div');
    tip.id='pwaInstallTip';
    tip.style.cssText = [
      'position:fixed','left:10px','right:10px','bottom:14px','z-index:70',
      'background:#0f172a','color:#e5e7eb','border:1px solid #334155',
      'padding:10px 12px','border-radius:14px','font-size:13px',
      'box-shadow:0 8px 20px rgba(0,0,0,.2)'
    ].join(';');

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:12px;';

    // Left icon
    const ico = document.createElement('div');
    ico.style.cssText = 'width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#34d399,#059669);display:grid;place-items:center;flex:0 0 auto;';
    ico.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="1.5"><circle cx="12" cy="8" r="3.5" fill="#d1fae5"/><path d="M4 20c.8-3.5 4.1-6 8-6s7.2 2.5 8 6" fill="#a7f3d0"/></svg>';

    // Texts
    const texts = document.createElement('div');
    texts.style.cssText = 'flex:1 1 auto; min-width:0;';
    const h = document.createElement('div'); h.style.cssText='font-weight:700;'; h.textContent='Pasang ScoreMate ke perangkat?';
    const p = document.createElement('div'); p.style.cssText='opacity:.9;color:#cbd5e1;'; p.textContent='Akses lebih cepat, hemat data, bisa offline.';
    texts.appendChild(h); texts.appendChild(p);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:8px; align-items:center;';
    const later = document.createElement('button');
    later.textContent = 'Nanti';
    later.style.cssText = 'padding:6px 12px;border-radius:10px;background:transparent;color:#e5e7eb;border:1px solid #475569;font-weight:600';
    const install = document.createElement('button');
    install.textContent = 'Pasang';
    install.style.cssText = 'padding:6px 12px;border-radius:10px;background:#10b981;color:#0b1020;border:1px solid #059669;font-weight:700';

    // Close (top-right micro x)
    const close = document.createElement('button'); close.textContent='×';
    close.style.cssText = 'position:absolute;right:10px;top:2px;border:none;background:transparent;color:#94a3b8;font-size:16px;cursor:pointer';
    close.onclick = ()=>{ try{ localStorage.setItem('pwaTipShown','1'); }catch{} tip.remove(); };

    install.onclick = async ()=>{
      if (window.__deferredPrompt){
        try{
          await window.__deferredPrompt.prompt();
          const choice = await window.__deferredPrompt.userChoice;
          if (choice?.outcome === 'accepted') { window.__deferredPrompt = null; try{ localStorage.setItem('pwaInstalled','1'); }catch{} tip.remove(); }
        }catch{}
      } else {
        // iOS or not available: show help overlay
        showHelpOverlay();
        tip.remove();
      }
    };
    later.onclick = ()=>{ try{ localStorage.setItem('pwaTipShown','1'); }catch{} tip.remove(); };

    actions.appendChild(later); actions.appendChild(install);
    row.appendChild(ico); row.appendChild(texts); row.appendChild(actions);
    tip.appendChild(row); tip.appendChild(close); document.body.appendChild(tip);
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ registerSW(); wireHeaderButton(); setupInstallFlow();
      const hb = byId('btnInstallAppHdr'); if (hb) hb.addEventListener('click', ()=>{ if (!window.__deferredPrompt) showHelpOverlay(); });
    });
  } else { registerSW(); wireHeaderButton(); setupInstallFlow(); const hb = byId('btnInstallAppHdr'); if (hb) { hb.addEventListener('click', ()=>{ if (!window.__deferredPrompt) showHelpOverlay(); }); } }
})();
