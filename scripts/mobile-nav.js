"use strict";

// Mobile-only bottom navigation that splits existing page sections
// Keeps existing logic and CSS intact; only toggles visibility.
(function(){
  const isMobile = () => window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
  const t = (window.__i18n_get ? __i18n_get : (k,f)=>f);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function byId(id){ return document.getElementById(id); }

  function init(){
    if (!isMobile()) return; // only attach on small screens

    // Avoid double attach
    if (byId('mobileTabbar')) return;

    // Initialize header chips mobile toggle before other DOM moves
    try{ initHdrChipsToggleMobile(); }catch{}

    // Sections (do not change markup, just reference)
    const main = document.querySelector('main');
    if (!main) return;
    const mainSections = [...main.querySelectorAll(':scope > section')];
    // Expecting: [0]=controls, [1]=courts, [2]=standings (but we will re-host them)
    const secControls = mainSections[0] || null;
    const secCourts   = mainSections[1] || null;
    const secTable    = mainSections.find(s=> s.querySelector('#standings')) || mainSections[2] || null;

    // Players panel (lives in header filter)
    const playersPanel = byId('playersPanel');
    const collapseBtn  = byId('btnCollapsePlayers');

    // Add bottom padding so content not hidden by tabbar
    document.body.style.paddingBottom = '84px';

    // Create inline hosts for tab sections with tidy IDs
    const hostJadwal = document.createElement('section');
    hostJadwal.id = 'section-jadwal';
    hostJadwal.className = 'space-y-4';

    const hostPlayers = document.createElement('section');
    hostPlayers.id = 'section-pemain';
    hostPlayers.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hidden';
    hostPlayers.style.marginTop = '0';
    const hostRecap = document.createElement('section');
    hostRecap.id = 'section-recap';
    hostRecap.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hidden';
    hostRecap.style.marginTop = '0';
    const hostInsight = document.createElement('section');
    hostInsight.id = 'section-insight';
    hostInsight.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hidden';
    hostInsight.style.marginTop = '0';
    // Build new structure order in main: Jadwal, Klasemen, Pemain, Recap, Insight
    // 1) Jadwal wrapper placed where controls section sits
    if (secControls){ secControls.before(hostJadwal); hostJadwal.appendChild(secControls); }
    if (secCourts){ hostJadwal.appendChild(secCourts); }
    // 2) Klasemen wrapper
    const hostKlasemen = document.createElement('section');
    hostKlasemen.id = 'section-klasemen';
    hostKlasemen.style.marginTop = '0';
    if (secTable){ secTable.before(hostKlasemen); hostKlasemen.appendChild(secTable); }
    // 3) Pemain, Recap, Insight hosts appended at end (players near top could also be moved after header)
    main.appendChild(hostPlayers);
    main.appendChild(hostRecap);
    main.appendChild(hostInsight);

    // Ensure editor players section (if exists/needed) lives ABOVE section-jadwal
    try{
      const isView = (typeof isViewer==='function') ? isViewer() : false;
      if (!isView) {
        // Move panel out of filter grid into its own section using existing helper
        try{ relocateEditorPlayersPanel?.(); }catch{}
        const ep = document.getElementById('editorPlayersSection');
        if (ep && hostJadwal && ep.nextSibling !== hostJadwal) {
          // place just before Jadwal wrapper to keep it on top
          main.insertBefore(ep, hostJadwal);
        }
      }
    }catch{}

    // Do NOT move editor players list; keep it under #editorPlayersSection (managed by editor-panel.js)
    // Viewer list (#viewerPlayersWrap) is also kept where created by ensureViewerPlayersPanel().

    // Create tabbar
    const bar = document.createElement('nav');
    bar.id = 'mobileTabbar';
    bar.setAttribute('role','tablist');
    // Theme-aware navbar (light: white, dark: previous dark style)
    bar.className = [
      'fixed','left-0','right-0','bottom-0','z-40',
      'bg-white/95','text-gray-800','dark:bg-gray-900/95','dark:text-white','backdrop-blur',
      'border-t','border-gray-200','dark:border-gray-800',
      'shadow-[0_-6px_20px_rgba(0,0,0,0.08)]','dark:shadow-[0_-6px_20px_rgba(0,0,0,0.25)]'
    ].join(' ');

    const wrap = document.createElement('div');
    wrap.className = 'mx-auto max-w-7xl px-2';
    const ul = document.createElement('ul');
    ul.className = 'flex items-start justify-between gap-1 py-2';
    wrap.appendChild(ul); bar.appendChild(wrap);

    const getTabLabel = (key)=>{
      const t = (window.__i18n_get ? __i18n_get : (k,f)=>f);
      switch(key){
        case 'jadwal': return t('mobile.tab.schedule','Jadwal & Pemain');
        case 'klasemen': return t('mobile.tab.standings','Klasemen');
        case 'recap': return t('recap.button','Recap');
        case 'insight': return t('analysis.title','Ulasan');
        case 'kas': return t('cash.title','Cashflow');
        default: return key;
      }
    };

    const tabs = [
      { key:'jadwal',  label:getTabLabel('jadwal'),   icon: calIcon() },
      { key:'klasemen',label:getTabLabel('klasemen'), icon: upIcon() },
      { key:'recap',   label:getTabLabel('recap'),    icon: clockIcon() },
      { key:'insight', label:getTabLabel('insight'),  icon: screenIcon() },
    ];

    // Optional: Cashflow tab (only when allowed like desktop button)
    const aloud = isCashflowAllowed();
    let hostKas = null;
    if (aloud){
      tabs.push({ key:'kas', label:getTabLabel('kas'), icon: moneyIcon() });
      hostKas = document.createElement('section');
      hostKas.id = 'section-kas';
      hostKas.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hidden';
      hostKas.style.marginTop = '0';
      main.appendChild(hostKas);
    }

    tabs.forEach(t => ul.appendChild(tabItem(t.key, t.label, t.icon)));
    document.body.appendChild(bar);
    function refreshTabLabels(){
      tabs.forEach(t=>{
        const span = document.querySelector(`#tab-${t.key} .mobtab-label`);
        if (span) span.textContent = getTabLabel(t.key);
      });
    }
    try{ window.refreshMobileTabLabels = refreshTabLabels; }catch{}

    // Reduce sticky focus/hover artifacts on mobile browsers
    try{
      if (!document.getElementById('mobileTabbarStyles')){
        const st = document.createElement('style');
        st.id = 'mobileTabbarStyles';
        st.textContent = `
          #mobileTabbar button{ -webkit-tap-highlight-color: transparent; outline: none; min-height:78px; }
          #mobileTabbar ul{ align-items: flex-start; }
          #mobileTabbar .mobtab-label{ display:block; text-align:center; line-height:1.25; min-height:28px; }
          #mobileTabbar .mobtab-icon{ display:grid; place-items:center; }
          #mobileTabbar button:focus{ outline: none; box-shadow: none; }
          #mobileTabbar button:focus-visible{ outline: none; box-shadow: none; }
          /* Active state follows theme and beats sticky :hover */
          html:not(.dark) #mobileTabbar button.mobtab-active{ background-color:#e5e7eb !important; color:#111827 !important; }
          html:not(.dark) #mobileTabbar button.mobtab-active:hover{ background-color:#e5e7eb !important; }
          html.dark #mobileTabbar button.mobtab-active{ background-color:#374151 !important; color:#ffffff !important; }
          html.dark #mobileTabbar button.mobtab-active:hover{ background-color:#374151 !important; }
        `;
        document.head.appendChild(st);
      }
    }catch{}

    // Hide Match Recap button on mobile (use the tab instead), keep in DOM for builder reuse
    try{ const rbtn = document.getElementById('btnMatchRecap'); if (rbtn){ const host = rbtn.closest('div')||rbtn; host.style.display='none'; } }catch{}

    // Inject compact Klasemen styles for mobile so it scrolls less
    injectMobileKlasemenStyles();

    // Initial state
    // Default tab: Jadwal & Pemain (combined)
    select('jadwal');
    // Pastikan tiap kali pindah event, tab balik ke Jadwal & Pemain
    watchEventSwitchResetTab();
    // Ensure Kas tab reflects current role after init
    try{ updateMobileCashTab?.(); }catch{}
    setTimeout(()=>{ try{ updateMobileCashTab?.(); }catch{} }, 300);
    // Listen to language changes
    try{
      window.addEventListener('i18n:changed', refreshTabLabels);
      window.addEventListener('i18n:applied', refreshTabLabels);
    }catch{}
    refreshTabLabels();

    // --- helpers ---
    function initHdrChipsToggleMobile(){
      const chips = byId('hdrChips');
      const title = byId('appTitle');
      if (!chips || !title) return;
      const row = title.parentElement || chips.parentElement || title;
      try{ row.classList.add('relative'); }catch{}
      // Add a small toggle button next to title (mobile only)
      let btn = document.getElementById('btnHdrChipsToggle');
      if (!btn){
        btn = document.createElement('button');
        btn.id = 'btnHdrChipsToggle';
        btn.type = 'button';
        // Absolutely align at the right edge of the title row (mobile only)
        btn.className = 'absolute right-0 md:hidden w-9 h-9 grid place-items-center rounded-xl bg-white/20 text-white shadow hover:bg-white/30';
        btn.title = t('mobile.chips.toggle','Tampilkan/sembunyikan info header');
        // append into the same row container so we can position absolute relative to it
        row.appendChild(btn);
      }
      function setIcon(hidden){
        // up = collapse available; down = expand
        const up = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polyline points="18 15 12 9 6 15"/></svg>';
        const down = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><polyline points="6 9 12 15 18 9"/></svg>';
        btn.innerHTML = hidden ? down : up;
        const t = (window.__i18n_get ? __i18n_get : (k,f)=>f);
        btn.setAttribute('aria-label', hidden ? t('mobile.chips.show','Tampilkan info') : t('mobile.chips.hide','Sembunyikan info'));
        btn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
      }
      function alignBtn(){
        try{
          const pr = row.getBoundingClientRect();
          const tr = title.getBoundingClientRect();
          const bh = btn.getBoundingClientRect().height || 36;
          const y = Math.max(0, Math.round((tr.top - pr.top) + ((tr.height - bh)/2)));
          btn.style.top = y + 'px';
        }catch{}
      }
      function apply(){
        const hidden = localStorage.getItem('ui.hdrChips.hidden') === '1';
        const mobile = isMobile();
        chips.classList.toggle('chips-collapsed', hidden && mobile);
        // keep button visible only on mobile, then align it
        btn.classList.toggle('hidden', !mobile);
        setIcon(hidden && mobile);
        if (mobile) alignBtn();
      }
      btn.addEventListener('click', ()=>{
        const prev = localStorage.getItem('ui.hdrChips.hidden') === '1';
        localStorage.setItem('ui.hdrChips.hidden', prev ? '0' : '1');
        apply();
      });
      apply();
      window.addEventListener('resize', apply);
      window.addEventListener('orientationchange', apply);
    }

    function tabItem(key, label, iconSvg){
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = `tab-${key}`;
      btn.className = [
        'flex','flex-col','items-center','justify-start','gap-1','px-3','py-2','rounded-xl','min-w-[60px]','text-center','leading-tight',
        'text-[11px]','font-medium','text-gray-700','dark:text-gray-200','hover:bg-gray-100','dark:hover:bg-gray-700'
      ].join(' ');
      btn.innerHTML = `
        <span class="mobtab-icon w-6 h-6 grid place-items-center">${iconSvg}</span>
        <span class="mt-0.5 mobtab-label">${escapeHtml(label)}</span>`;
      btn.addEventListener('click', () => select(key));
      li.appendChild(btn);
      return li;
    }

    function select(key){
      // Active style
      const all = bar.querySelectorAll('button[id^="tab-"]');
      all.forEach(b => b.classList.remove('mobtab-active'));
      const active = byId(`tab-${key}`);
      if (active) active.classList.add('mobtab-active');
      // Clear focus to avoid sticky focus visuals on mobile
      try{ active?.blur(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch{}

      // Remember current tab for other guards
      try{ window.__mobileTabKey = key; }catch{}
      try{ window.reapplyMobileTab = ()=> select(key); }catch{}

      // Hide/show groups without altering logic
      // Default: show jadwal (controls + courts), hide standings, collapse players panel
      toggle(hostJadwal,  key==='jadwal');
      toggle(hostKlasemen,key==='klasemen');
      // IMPORTANT: Do not toggle editorPlayersSection/viewerPlayersWrap here.
      // Leave visibility and relocation to access-control.js to avoid conflicts.
      try{ /* no-op: managed by access-control */ }catch{}
      toggle(hostRecap,   key==='recap');
      toggle(hostInsight, key==='insight');
      // Handle Kas tab dynamically by presence of tab/host (not by init flag)
      try{
        const hasKas = !!document.getElementById('tab-kas');
        const hostKasNode = document.getElementById('section-kas');
        if (hasKas && hostKasNode){
          toggle(hostKasNode, key==='kas');
          if (key==='kas') mountCashflowInto(hostKasNode); else unmountCashflowToModal();
        }
      }catch{}

      if (key==='klasemen') enhanceStandingsMobile();

      // Ensure focus/scroll prioritize the players list when opening Jadwal & Pemain
      if (key==='jadwal'){
        const viewerWrap = document.getElementById('viewerPlayersWrap');
        const listWrap = document.getElementById('playerListContainer');
        // Prefer editor list; if absent (viewer), try viewer list; else fallback
        const target = listWrap || viewerWrap || hostJadwal;
        if (target){
          target.scrollIntoView({behavior:'smooth', block:'start'});
          // If an input exists for adding players, focus it shortly after scroll
          setTimeout(()=>{ try{ document.getElementById('newPlayer')?.focus(); }catch{} }, 200);
        }
      }

      // Make sure the courts toolbar section follows the active tab visibility,
      // even if it was not rehosted (e.g., before joining/creating an event).
      try{
        const ts = document.getElementById('toolbarSection');
        if (ts) ts.classList.toggle('hidden', key !== 'jadwal');
      }catch{}

      // Recap/Insight: only build jika ada data event
      if (key==='recap') { if (hasEventData()) buildRecapInline(hostRecap); else hostRecap.innerHTML=''; }
      if (key==='insight') { if (hasEventData()) buildInsightInline(hostInsight); else hostInsight.innerHTML=''; }

      // Enforce visibility guard in case other scripts toggle it afterwards
      try{ enforcePlayersSectionVisibility(); }catch{}
    }

  function toggle(el, show){ if (!el) return; el.classList.toggle('hidden', !show); }
  // Dynamic update for Cashflow tab when role/login changes
  function updateMobileCashTab(){
    if (!isMobile()) return;
    const bar = document.getElementById('mobileTabbar'); if (!bar) return;
    const ul = bar.querySelector('ul'); if (!ul) return;
    const hasTab = !!document.getElementById('tab-kas');
    const allowed = isCashflowAllowed();
    let hostKasLocal = document.getElementById('section-kas');
    if (allowed && !hasTab){
      // Ensure host exists
      if (!hostKasLocal){
        hostKasLocal = document.createElement('section');
        hostKasLocal.id = 'section-kas';
        hostKasLocal.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hidden';
        hostKasLocal.style.marginTop = '0';
        try{ document.querySelector('main')?.appendChild(hostKasLocal); }catch{}
      }
      // Append tab item at the end
      ul.appendChild(tabItem('kas','Cashflow', moneyIcon()));
    } else if (!allowed && hasTab){
      // If currently on kas, move away to jadwal first
      const key = (typeof window !== 'undefined' && window.__mobileTabKey) ? window.__mobileTabKey : null;
      if (key==='kas') select('jadwal');
      // Remove/hide tab and unmount content
      try{ document.getElementById('tab-kas')?.parentElement?.remove(); }catch{}
      try{ unmountCashflowToModal(); }catch{}
      if (hostKasLocal) hostKasLocal.classList.add('hidden');
    }
  }
  // Pantau perubahan currentEventId agar tab kembali ke Jadwal saat pindah event
  function watchEventSwitchResetTab(){
    try{
      if (window.__mobileTabEventWatcher) return;
      let lastEvent = getEventId();
      const tick = ()=>{
        const now = getEventId();
        if (now !== lastEvent){
          lastEvent = now;
          select('jadwal');
        }
      };
      window.__mobileTabEventWatcher = setInterval(tick, 900);
    }catch{}
  }
  function getEventId(){
    try{ if (typeof currentEventId !== 'undefined') return currentEventId || null; }catch{}
    try{ return window.currentEventId || null; }catch{ return null; }
  }
  try{ window.updateMobileCashTab = updateMobileCashTab; }catch{}
  function moneyIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="18" y1="14" x2="18" y2="14"/><path d="M2 10h20"/><path d="M2 14h20"/></svg>';
  }
  function isCashflowAllowed(){
    try{
      const loggedIn = !!window.__hasUser;
      const ownerNow = (typeof isOwnerNow==='function') ? isOwnerNow() : !!window._isOwnerUser;
      const cashAdmin = !!window._isCashAdmin;
      const allow = loggedIn && (ownerNow || cashAdmin);
      const inCloud = (typeof isCloudMode==='function' && isCloudMode());
      const hasEvent = (typeof currentEventId!=='undefined' && !!currentEventId);
      return !!(allow && inCloud && hasEvent);
    }catch{ return false; }
  }
  function getCashModal(){ return document.getElementById('cashModal'); }
  function getCashInner(){
    try{
      let el = document.querySelector('#cashModal > .relative');
      if (!el) el = document.querySelector('#cashModal .relative');
      return el || null;
    }catch{ return null; }
  }
  function mountCashflowInto(host, tries=0){
    if (tries > 10) return; // avoid infinite loop
    if (!host) return;
    let inner = getCashInner();
    const modal = getCashModal();
    // If modal content never initialized, trigger open then hijack
    try{
      const visible = modal && !modal.classList.contains('hidden');
      if (!inner || !visible) {
        // Prefer calling public opener (does not depend on hidden header button)
        if (typeof window.openCashflow === 'function') window.openCashflow();
        else document.getElementById('btnCashflow')?.click();
        // Immediately keep overlay hidden to avoid flicker before we hijack content
        try{ const m = getCashModal(); if (m){ m.classList.add('hidden'); m.style.display='none'; m.style.pointerEvents='none'; m.style.visibility='hidden'; } }catch{}
        // wait a bit longer to allow render
        setTimeout(()=> mountCashflowInto(host, tries+1), 120);
        return;
      }
    }catch{}
    // Hide backdrop and move inner into host; also disable modal pointer events
    try{
      const bd = modal.querySelector('[data-cash-act]') || modal.querySelector('.absolute.inset-0');
      if (bd){ bd.classList.add('hidden'); bd.style.display='none'; bd.style.pointerEvents='none'; }
    }catch{}
    try{ modal.classList.add('hidden'); modal.style.display='none'; modal.style.pointerEvents='none'; modal.style.visibility='hidden'; }catch{}
    try{
      host.innerHTML='';
      host.appendChild(inner);
      inner.classList.remove('relative');
      inner.classList.remove('mx-auto','mt-10','w-[95%]','max-w-5xl');
      // Ensure Close button hidden in mobile tab
      try{ const c = document.getElementById('btnCashClose'); if (c) c.classList.add('hidden'); }catch{}
    }catch{}
  }
  function unmountCashflowToModal(){
    const modal = getCashModal(); if (!modal) return;
    const inner = document.querySelector('#section-kas .modal__box')?.parentElement || document.querySelector('#section-kas > .modal__box') || document.querySelector('#section-kas > .relative');
    if (!inner) return;
    try{
      // Restore inner back to modal and keep hidden
      const box = inner; // modal__box wrapper is direct child of inner
      // Create container matching original
      const wrap = document.createElement('div');
      wrap.className = 'relative mx-auto mt-10 w-[95%] max-w-5xl rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow p-4 md:p-6';
      // Move children back under wrap
      while (box.firstChild) wrap.appendChild(box.firstChild);
      // Clear host and append wrap into modal
      inner.parentElement?.appendChild(wrap);
      inner.remove();
      modal.classList.add('hidden');
      modal.style.display=''; modal.style.pointerEvents=''; modal.style.visibility='';
      // Restore Close button visibility for desktop modal
      try{ const c = document.getElementById('btnCashClose'); if (c) c.classList.remove('hidden'); }catch{}
    }catch{}
  }
  }




  // Simple inline icons (tailwind-friendly, no extra CSS required)
  function calIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  }
  function peopleIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  }
  function upIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>';
  }
  function clockIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
  }
  function screenIcon(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M12 20v-2"/></svg>';
  }
})();

// Helpers to build inline Recap/Insight using existing match-recap modal builder
async function buildRecapInline(host){
  if (!host) return;
  try{
    buildRecapMobileUI(host);
    return;
  }catch(e){ console.warn('recap mobile UI failed, fallback:', e); }
  // Fallback to clone from modal if our mobile UI fails
  const prevH = host.offsetHeight; host.style.minHeight = (prevH? prevH : 160) + 'px'; host.style.visibility = 'hidden';
  const root = await getRecapRootFromModal();
  if (!root){
    host.style.minHeight = '';
    host.style.visibility = '';
    host.innerHTML = `<div class="text-sm text-red-600">${t('mobile.recap.fail','Gagal membuat recap.')}</div>`;
    return;
  }
  try{
    root.querySelectorAll('.recap-insight-box, .recap-bottom-grid, .recap-notes-full').forEach(n=>n.remove());
    [...root.querySelectorAll('.recap-section-title')]
      .filter(el => /Catatan\s*&\s*Insight/i.test(el.textContent||''))
      .forEach(el=> el.remove());
    root.querySelectorAll('.recap-standings').forEach(n=>n.remove());
    [...root.querySelectorAll('.recap-section-title')]
      .filter(el => /Klasemen\s+Pemain|Aturan\s+Ranking/i.test(el.textContent||''))
      .forEach(el=> el.remove());
    const rightCol = root.querySelector('.recap-col-right');
    if (rightCol) rightCol.remove();
  }catch{}
  host.innerHTML = '';
  host.appendChild(root);
  host.style.minHeight = '';
  host.style.visibility = '';
}

async function buildInsightInline(host){
  if (!host) return;
  const prevH = host.offsetHeight; host.style.minHeight = (prevH? prevH : 140) + 'px'; host.style.visibility = 'hidden';
  const root = await getRecapRootFromModal();
  if (!root){ host.innerHTML = `<div class="text-sm text-red-600">${t('mobile.insight.fail','Gagal membuat insight.')}</div>`; return; }
  // Pick only the insight section (new layout)
  const insightSection = root.querySelector('.recap-insight-section');
  if (insightSection){
    const shell = document.createElement('div');
    shell.className = 'recap-inline-shell';
    shell.appendChild(insightSection.cloneNode(true));
    host.innerHTML = '';
    host.appendChild(shell);
  } else {
    // Fallback to legacy insight box
    const title = [...root.querySelectorAll('.recap-section-title')]
                    .find(el => /Catatan\s*&\s*Insight/i.test(el.textContent||''));
    const insight = root.querySelector('.recap-insight-box');
    const wrap = document.createElement('div');
    if (title) wrap.appendChild(title.cloneNode(true));
    if (insight) wrap.appendChild(insight.cloneNode(true));
    host.innerHTML = '';
    host.appendChild(wrap);
  }
  host.style.minHeight = '';
  host.style.visibility = '';
}

async function getRecapRootFromModal(){
  // Ensure recap button exists; the script inserts it after DOM ready inside standings section
  const ensureButton = () => !!document.getElementById('btnMatchRecap');
  if (!ensureButton()){
    // Small wait if match-recap.js has not inserted yet
    await waitMs(80);
  }
  const btn = document.getElementById('btnMatchRecap');
  if (!btn) return null;
  // Close any previous overlay to ensure fresh data
  document.getElementById('matchRecapOverlay')?.remove();
  // Suppress overlay flicker by temporarily hiding overlay via inline style
  let tempStyle = document.getElementById('tmp-hide-recap-overlay');
  if (!tempStyle){
    tempStyle = document.createElement('style');
    tempStyle.id = 'tmp-hide-recap-overlay';
    tempStyle.textContent = '#matchRecapOverlay{display:none !important;}';
    document.head.appendChild(tempStyle);
  }
  btn.click();
  const overlay = await waitFor(()=> document.getElementById('matchRecapOverlay'), 800);
  if (!overlay) return null;
  const body = overlay.querySelector('.recap-body');
  const first = body && body.firstElementChild ? body.firstElementChild : null;
  if (!first){ overlay.remove(); return null; }
  const clone = first.cloneNode(true);
  overlay.remove();
  try{ tempStyle?.remove(); }catch{}
  return clone;
}

function waitMs(ms){ return new Promise(r=> setTimeout(r, ms)); }
async function waitFor(fn, timeout=1000, step=50){
  const start = Date.now();
  while (Date.now()-start < timeout){
    try { const v = fn(); if (v) return v; } catch {}
    await waitMs(step);
  }
  return null;
}

// Apply recap-like coloring to standings table on mobile
function enhanceStandingsMobile(){
  const table = document.getElementById('standings');
  if (!table) return;
  // Wrap with recap-standings container once
  let wrap = table.closest('.recap-standings');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.className = 'recap-standings';
    if (table.parentElement) {
      table.parentElement.insertBefore(wrap, table);
      wrap.appendChild(table);
    }
  }
  // Color cells for diff and winrate
  try{
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      const tds = tr.children; if (!tds || tds.length < 8) return;
      // Diff at index 3
      const diffTd = tds[3];
      const diffVal = Number(String(diffTd.textContent||'').replace(/[^\-\d]/g,''));
      diffTd.classList.remove('diff-pos','diff-neg');
      if (isFinite(diffVal)) diffTd.classList.add(diffVal>=0 ? 'diff-pos' : 'diff-neg');
      // WinRate at index 7 (value like 75%)
      const wrTd = tds[7];
      const wrVal = Number(String(wrTd.textContent||'').replace(/[^\d]/g,''));
      wrTd.classList.remove('wr-high','wr-low');
      if (isFinite(wrVal)) wrTd.classList.add(wrVal>=60 ? 'wr-high' : 'wr-low');
    });
  }catch{}
}

function injectMobileKlasemenStyles(){
  if (document.getElementById('mobile-klasemen-compact')) return;
  const s = document.createElement('style');
  s.id = 'mobile-klasemen-compact';
  s.textContent = `@media(max-width:640px){
    #section-klasemen .recap-standings table{min-width:520px;width:520px}
    #section-klasemen .recap-standings th, #section-klasemen .recap-standings td{padding:.45rem .5rem;font-size:.85rem}
  }`;
  document.head.appendChild(s);
}

// Inline SVG icons (lucide-like) for recap template
function recapIconActivity(cls='w-4 h-4'){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
}
function recapIconHistory(cls='w-4 h-4'){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>`;
}
function recapIconUsers(cls='w-4 h-4'){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function recapIconTrophy(cls='w-4 h-4'){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
}
function recapIconFilter(cls='w-4 h-4'){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`;
}
function recapIconSearch(cls='w-4 h-4'){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
}
function recapIconMedal(cls='w-4 h-4'){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><polygon points="12 15 8.5 21 7 21 12 11 17 21 15.5 21 12 15"/><path d="M18 10a6 6 0 1 0-12 0"/></svg>`;
}

// Build redesigned mobile recap with filters


function buildRecapMobileUI(host){
  const t = (window.__i18n_get ? __i18n_get : (k,f)=>f);
  const players = getStandingsSnapshot();
  const matches = collectMatchesMobile();
  const partnerData = (typeof window !== 'undefined' && window.partnerInsights) ? window.partnerInsights : {};
  let selected = players.length ? players[0].name : null;

  host.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6';
  host.appendChild(root);

  // Left column: filter + list
  const filterCol = document.createElement('div');
  filterCol.className = 'md:col-span-4';
  const filterCard = document.createElement('div');
  filterCard.className = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3';
  const filterHead = document.createElement('div');
  filterHead.className = 'flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-100';
  filterHead.innerHTML = `${recapIconFilter('w-4 h-4')}<span>${t('mobile.recap.filter','Filter Pemain')}</span>`;
  filterCard.appendChild(filterHead);

  const sel = document.createElement('select');
  sel.className = 'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100';
  players.forEach(p=> sel.appendChild(new Option(`${p.rank}. ${p.name}`, p.name)));
  sel.addEventListener('change', ()=>{ selected = sel.value; renderDetail(); });
  filterCard.appendChild(sel);
  filterCol.appendChild(filterCard);
  root.appendChild(filterCol);

  // Right column: detail + matches
  const detailCol = document.createElement('div');
  detailCol.className = 'md:col-span-8 space-y-4';
  const detailWrap = document.createElement('div');
  const historyWrap = document.createElement('div');
  detailCol.appendChild(detailWrap);
  detailCol.appendChild(historyWrap);
  root.appendChild(detailCol);

  function statusLabel(p){
    if (!p) return { text:'-', class:'text-slate-600' };
    if (p.diff > 20) return { text:'ON FIRE', class:'text-emerald-700' };
    if (p.winRate < 30) return { text:'STRUGGLING', class:'text-rose-600' };
    return { text:'STABLE', class:'text-blue-700' };
  }

  function renderDetail(){
    detailWrap.innerHTML = '';
    historyWrap.innerHTML = '';
    const player = players.find(p=> p.name===selected);
    if (!player){
      detailWrap.textContent = t('mobile.recap.noPlayer','Tidak ada data pemain.');
      return;
    }

    const status = statusLabel(player);
    const playerMatches = buildPlayerMatches(player.name, matches);
    const partnerStats = partnerStatsFor(player.name, playerMatches);
    const topPlayer = players.reduce((acc,p)=>{
      if (!acc) return p;
      if (p.total === acc.total) return (p.diff>acc.diff) ? p : acc;
      return p.total>acc.total ? p : acc;
    }, null);
    const bottomPlayer = players.reduce((acc,p)=>{
      if (!acc) return p;
      if (p.total === acc.total) return (p.diff<acc.diff) ? p : acc;
      return p.total<acc.total ? p : acc;
    }, null);
    const isTopSelected = topPlayer && topPlayer.name === player.name;
    const isBottomSelected = bottomPlayer && bottomPlayer.name === player.name;
    const pi = partnerData[player.name];
    const headCard = document.createElement('div');
    headCard.className = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden';
    headCard.innerHTML = `
      <div class="flex justify-between items-start p-4 text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        <div>
          <div class="text-2xl font-bold">${escapeHtml(player.name)}</div>
          <div class="text-sm text-white/80 flex items-center gap-2">${recapIconMedal('w-4 h-4')}<span>${t('mobile.recap.rank','Peringkat')} ${player.rank} • ${player.role||'Balanced'}</span></div>
        </div>
        <div class="text-right">
          <div class="text-3xl font-bold">${player.winRate}%</div>
          <div class="text-[11px] uppercase tracking-wide text-white/80">${t('mobile.recap.winrate','Win Rate')}</div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white dark:bg-slate-900">
        ${statTile(t('recap.metric.totalPoint','Total Poin'), player.total, 'text-slate-800')}
        ${statTile(t('recap.metric.diff','Selisih (Diff)'), `${player.diff>=0?'+':''}${player.diff}`, player.diff>=0?'text-emerald-600':'text-rose-600')}
        ${statTile(t('recap.metric.record','Rekor'), `${player.w}W - ${player.l}L`, 'text-slate-800')}
        ${statTile(t('recap.metric.status','Status'), status.text, status.class)}
      </div>`;
    detailWrap.appendChild(headCard);

    // Partner insight (aktif kembali, berbasis filter pemain)
    const insightCard = document.createElement('div');
    insightCard.className = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3';
    const hasStats = partnerStats.length > 0;
    const hasInsight = !!pi || hasStats;
    const bestStat = partnerStats[0] || null;
    const worstStat = [...partnerStats].sort((a,b)=>
      // Partner terburuk: WR paling rendah, jika sama pilih selisih poin paling negatif, lalu jumlah main terbanyak
      a.winRate - b.winRate || a.diff - b.diff || b.played - a.played
    )[0] || null;
    const bestPartner = pi?.best || bestStat?.partner || '-';
    const bestRecord = bestStat ? `${bestStat.win}W-${bestStat.lose}L${bestStat.draw?`-${bestStat.draw}D`:''}` : '-';
    const fmtDiff = (n)=> `${n>=0?'+':''}${n}`;
    const fill = (str, ctx={})=> (str||'').replace(/\{(\w+)\}/g, (_m,k)=> (ctx[k]!==undefined ? ctx[k] : _m));
    const bestCtx = {
      player: player.name,
      partner: bestPartner,
      wr: bestStat?.winRate ?? 0,
      diff: fmtDiff(bestStat?.diff ?? 0),
      record: bestRecord,
      played: bestStat?.played ?? 0
    };
    const bestSentence = bestStat
      ? fill(
          t(
            'mobile.recap.partnerBestSentence',
            '{partner} adalah partner terbaik {player} saat ini: {played} pertandingan ({record}, WR {wr}%, selisih poin {diff}).'
          ),
          bestCtx
        )
      : '';
    const bestRecency = fill(
      t('mobile.recap.partnerRecency','Rekomendasi ini dihitung dari riwayat pertandingan terbaru {player} bersama semua partner.'),
      bestCtx
    );
    const bestNote = pi?.note || '';
    const synergyLabel = pi?.synergy || (bestStat ? `${bestStat.winRate}% WR` : t('mobile.recap.partnerSynergy','Skor Sinergi'));
    insightCard.innerHTML = `
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-100">${recapIconUsers('w-4 h-4')}<span>${t('mobile.recap.partner','Analisis Pasangan')}</span></div>`;

    if (!hasInsight){
      const empty = document.createElement('div');
      empty.className = 'text-sm text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl p-3';
      empty.textContent = t('mobile.recap.noPartner','Data sinergi spesifik belum tersedia untuk pemain ini.');
      insightCard.appendChild(empty);
    } else {
      const highlight = document.createElement('div');
      highlight.className = 'bg-indigo-50 dark:bg-slate-800/70 rounded-xl border border-indigo-100 dark:border-slate-700 p-3 flex items-start justify-between gap-3';
      highlight.innerHTML = `
        <div>
          <div class="text-[11px] uppercase tracking-wide text-indigo-700 dark:text-indigo-200 font-semibold">${t('recap.pair.best','Pasangan Terbaik')}</div>
          <div class="text-lg font-bold text-slate-900 dark:text-white">${escapeHtml(bestPartner)}</div>
          <ul class="mt-1 list-disc pl-4 space-y-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ${bestSentence ? `<li>${escapeHtml(bestSentence)}</li>` : ''}
            ${bestRecency ? `<li>${escapeHtml(bestRecency)}</li>` : ''}
            ${bestNote ? `<li>${escapeHtml(bestNote)}</li>` : ''}
          </ul>
        </div>
        <div class="text-right">
          <div class="text-xs bg-white/60 dark:bg-slate-900/60 text-indigo-800 dark:text-indigo-100 px-2 py-1 rounded-full inline-flex items-center gap-1 font-semibold">${synergyLabel}</div>
        </div>`;
      insightCard.appendChild(highlight);

      if (hasStats){
        const list = document.createElement('div');
        list.className = 'space-y-2';
        partnerStats.slice(0,4).forEach(stat=>{
          const row = document.createElement('div');
          row.className = 'flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700';
          row.innerHTML = `
            <div>
              <div class="font-semibold text-slate-900 dark:text-white">${escapeHtml(player.name)} + ${escapeHtml(stat.partner||'-')}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">WR ${stat.winRate}% | ${stat.win}W-${stat.lose}L${stat.draw?`-${stat.draw}D`:''} | ${stat.played} ${t('mobile.recap.partnerMatches','Match bersama')}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold ${stat.diff>=0?'text-emerald-600':'text-rose-600'}">${stat.diff>=0?'+':''}${stat.diff}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">${t('mobile.recap.partnerDiff','Selisih poin')}</div>
            </div>`;
          list.appendChild(row);
        });
        insightCard.appendChild(list);

        const hasLosses = (player.l && player.l>0) || playerMatches.some(m=> m.result==='L');
        if (hasLosses && worstStat && worstStat.partner && worstStat.partner !== bestPartner){
          const warn = document.createElement('div');
          warn.className = 'pt-2 text-xs text-rose-600 dark:text-rose-300 border-t border-slate-200 dark:border-slate-700';
          warn.textContent = `${t('mobile.recap.partnerAvoid','Hindari pasangan dengan')} ${worstStat.partner} (${worstStat.played}x, WR ${worstStat.winRate}%, ${t('mobile.recap.partnerDiffShort','selisih')} ${worstStat.diff>=0?'+':''}${worstStat.diff})`;
          insightCard.appendChild(warn);
        }
      } else {
        const note = document.createElement('div');
        note.className = 'text-sm text-slate-500 dark:text-slate-300';
        note.textContent = pi?.note || t('mobile.recap.partnerAutoNote','Dihitung dari performa terbaru pemain yang dipilih.');
        insightCard.appendChild(note);
      }
    }
    detailWrap.appendChild(insightCard);

    // Match history
    const historyCard = document.createElement('div');
    historyCard.className = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm';
    const count = playerMatches.length;
    historyCard.innerHTML = `
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">${recapIconHistory('w-4 h-4')}<span>${t('mobile.recap.history','Riwayat Pertandingan')}</span></div>
        <span class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 px-2 py-1 rounded-full">${count} ${t('recap.metric.totalMatch','Match')}</span>
      </div>`;
    const list = document.createElement('div');
    list.className = 'divide-y divide-slate-100 dark:divide-slate-800';
    if (!count){
      const empty = document.createElement('div');
      empty.className = 'p-6 text-center text-slate-500';
      empty.textContent = t('mobile.recap.noMatch','Belum ada data match tersimpan.');
      list.appendChild(empty);
    } else {
      playerMatches.forEach(m=> list.appendChild(renderMatchRow(player.name, m, t)));
    }
    historyCard.appendChild(list);
    historyWrap.appendChild(historyCard);
  }

  function statTile(label, value, cls){
    return `<div class="text-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
      <div class="text-xs text-slate-500 dark:text-slate-300">${label}</div>
      <div class="text-lg font-bold ${cls||''} dark:text-slate-100">${value}</div>
    </div>`;
  }

  function buildPlayerMatches(name, data){
    return data.map(m=>{
      const inA = [m.a1,m.a2].includes(name);
      const inB = [m.b1,m.b2].includes(name);
      if (!inA && !inB) return null;
      const myScore = inA ? m.saN : m.sbN;
      const opScore = inA ? m.sbN : m.saN;
      const partner = inA ? (name===m.a1 ? m.a2 : m.a1) : (name===m.b1 ? m.b2 : m.b1);
      const opponentTeam = inA ? [m.b1, m.b2] : [m.a1, m.a2];
      const result = m.winner === 'D' ? 'D' : (m.winner === (inA ? 'A' : 'B') ? 'W' : 'L');
      return {
        id: m.round,
        myScore,
        opponentScore: opScore,
        partner,
        opponentTeam,
        result,
        court: m.court
      };
    }).filter(Boolean);
  }

  function partnerStatsFor(name, matchList){
    const map = {};
    (matchList||[]).forEach(m=>{
      const p = m.partner || '';
      if (!p) return;
      if (!map[p]) map[p] = { partner:p, played:0, win:0, lose:0, draw:0, scoreFor:0, scoreAg:0 };
      const s = map[p];
      s.played += 1;
      s.scoreFor += Number(m.myScore)||0;
      s.scoreAg += Number(m.opponentScore)||0;
      if (m.result === 'W') s.win += 1;
      else if (m.result === 'L') s.lose += 1;
      else s.draw += 1;
    });
    return Object.values(map).map(s=>({
      ...s,
      winRate: s.played ? Math.round((s.win/s.played)*100) : 0,
      diff: s.scoreFor - s.scoreAg
    })).sort((a,b)=> b.winRate - a.winRate || b.diff - a.diff || b.played - a.played);
  }

  renderDetail();
}

function renderMatchRow(playerName, match, t){
  const row = document.createElement('div');
  row.className = 'relative px-4 py-4 space-y-2';

  const labelText = `${t('mobile.recap.match','Match #{round}').replace('{round}', match.id)}`;

  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide leading-none';
  const tag = document.createElement('span');
  tag.className = 'text-[11px] font-semibold px-2 py-1 rounded-full inline-block shadow-sm';
  if (match.result === 'W'){ tag.className += ' bg-emerald-100 text-emerald-700'; tag.textContent = t('mobile.recap.result.win','Win'); }
  else if (match.result === 'L'){ tag.className += ' bg-rose-100 text-rose-700'; tag.textContent = t('mobile.recap.result.lose','Loss'); }
  else { tag.className += ' bg-amber-100 text-amber-700'; tag.textContent = t('mobile.recap.result.draw','Draw'); }
  header.appendChild(tag);

  const matchLabel = document.createElement('div');
  matchLabel.className = 'absolute right-4 top-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-none';
  matchLabel.innerHTML = labelText;

  const body = document.createElement('div');
  body.className = 'flex items-start gap-3';

  const left = document.createElement('div');
  left.className = 'flex-1 min-w-0 text-left pt-4';
  const names = document.createElement('div');
  names.className = 'text-[13px] leading-tight text-slate-800 dark:text-slate-100';
  names.innerHTML = `<span class="font-bold">${escapeHtml(playerName)}</span> + ${escapeHtml(match.partner||'-')}`;
  left.appendChild(names);

  const scoreWrap = document.createElement('div');
  scoreWrap.className = 'flex-shrink-0 self-center';
  const score = document.createElement('div');
  score.className = 'text-lg font-extrabold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md min-w-[76px] text-center';
  score.textContent = `${match.myScore} - ${match.opponentScore}`;
  scoreWrap.appendChild(score);

  const right = document.createElement('div');
  right.className = 'flex-1 min-w-0 text-right pt-4';
  const opp = document.createElement('div');
  opp.className = 'text-[13px] leading-tight text-slate-600 dark:text-slate-300 whitespace-normal break-words text-right';
  opp.textContent = `${match.opponentTeam.join(' & ')}`;
  right.appendChild(opp);

  body.appendChild(left);
  body.appendChild(scoreWrap);
  body.appendChild(right);

  row.appendChild(header);
  row.appendChild(matchLabel);
  row.appendChild(body);
  return row;
}

function getStandingsSnapshot(){
  const rows = document.querySelectorAll('#standings tbody tr');
  const out = [];
  rows.forEach(tr=>{
    const tds = [...tr.children].map(td => (td.textContent||'').trim());
    if (tds.length < 8) return;
    const rank = Number(tds[0])||0;
    const name = tds[1]||'';
    const total = Number(tds[2])||0;
    const diff = Number(tds[3])||0;
    const w = Number(tds[4])||0; const l = Number(tds[5])||0; const d = Number(tds[6])||0;
    const gp = w+l+d;
    const winRate = gp ? Math.round((w/gp)*100) : 0;
    out.push({ rank, name, total, diff, w, l, d, winRate, role: gp>0 ? (winRate>=60?'Balanced':'Underdog') : 'Balanced' });
  });
  return out;
}
function collectMatchesMobile(){
  const out = [];
  try{
    const RBC = (typeof roundsByCourt !== 'undefined') ? roundsByCourt : (window.roundsByCourt || null);
    if (Array.isArray(RBC)){
      RBC.forEach((courtArr, ci) => {
        (courtArr||[]).forEach((r, ri) => {
          if (!(r && r.a1 && r.a2 && r.b1 && r.b2)) return;
          const hasSa = r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '';
          const hasSb = r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '';
          if (!(hasSa || hasSb)) return;
          const saN = Number(r.scoreA||0), sbN = Number(r.scoreB||0);
          const winner = saN===sbN ? 'D' : (saN>sbN ? 'A' : 'B');
          out.push({ court: ci+1, round: ri+1, time: timeForRoundMobile(ri), a1:r.a1||'-', a2:r.a2||'-', b1:r.b1||'-', b2:r.b2||'-', sa:String(r.scoreA||0), sb:String(r.scoreB||0), saN, sbN, winner });
        });
      });
      return out;
    }
  }catch{}

  // Fallback: parse visible table (active court only)
  try{
    const rows = document.querySelectorAll('.rnd-table tbody tr');
    rows.forEach((tr, idx) => {
      const sels = tr.querySelectorAll('select');
      const inps = tr.querySelectorAll('input[type="tel"]');
      if (sels.length >= 4 && inps.length >= 2){
        const [a1,a2,b1,b2] = [...sels].map(s => s.value || s.options[s.selectedIndex]?.text || '');
        const [sa,sb] = [...inps].map(i => i.value || '');
        if (a1 && a2 && b1 && b2 && (sa!=='' || sb!=='')){
          const ac = (typeof activeCourt !== 'undefined') ? activeCourt : (window.activeCourt || 0);
          const saN = Number(sa||0), sbN = Number(sb||0);
          const winner = saN===sbN ? 'D' : (saN>sbN ? 'A' : 'B');
          out.push({ court: Number(ac)+1, round: idx+1, time: timeForRoundMobile(idx), a1,a2,b1,b2, sa:String(sa||0), sb:String(sb||0), saN, sbN, winner });
        }
      }
    });
  }catch{}
  return out;
}

function timeForRoundMobile(i){
  try{
    const rs = (typeof roundStartTime === 'function') ? roundStartTime : window.roundStartTime;
    const re = (typeof roundEndTime === 'function') ? roundEndTime : window.roundEndTime;
    if (typeof rs === 'function' && typeof re === 'function') return `${rs(i)}–${re(i)}`;
  }catch{}
  return '';
}

function querySide(m, qlc){
  // Map query (lowercase) to which team it matches; prefer exact token hit within names
  const inA = (m.a1||'').toLowerCase().includes(qlc) || (m.a2||'').toLowerCase().includes(qlc);
  const inB = (m.b1||'').toLowerCase().includes(qlc) || (m.b2||'').toLowerCase().includes(qlc);
  if (inA && !inB) return 'A';
  if (inB && !inA) return 'B';
  return null; // ambiguous or not a player hit
}

// Ensure editor/viewer players sections follow current tab visibility
function enforcePlayersSectionVisibility(){
  const key = (typeof window !== 'undefined' && window.__mobileTabKey) ? window.__mobileTabKey : null;
  const isView = (typeof isViewer==='function') ? isViewer() : false;
  const shouldShowEditor = (key === 'jadwal') && !isView;
  const ep = document.getElementById('editorPlayersSection');
  if (ep) ep.classList.toggle('hidden', !shouldShowEditor);
  const vp = document.getElementById('viewerPlayersWrap');
  const shouldShowViewer = (key === 'jadwal') && isView;
  if (vp) vp.classList.toggle('hidden', !shouldShowViewer);
}

// Cek minimal apakah ada data event untuk menampilkan konten recap/insight
function hasEventData(){
  try{ if (typeof currentEventId !== 'undefined' && currentEventId) return true; }catch{}
  try{ if (Array.isArray(window.players) && window.players.length>0) return true; }catch{}
  try{ const cc = document.getElementById('courtContainer'); if (cc && cc.children.length>0) return true; }catch{}
  try{ const sb = document.querySelector('#standings tbody'); if (sb && sb.children.length>0) return true; }catch{}
  return false;
}

// Debounced refresh of recap when courts/standings DOM mutate (switch event)
function setupRecapAutoRefresh(host){
  // Avoid duplicate observers
  try{ window.__recapObservers?.forEach(o=>o.disconnect()); }catch{}
  window.__recapObservers = [];

  const debounce = (fn, ms=200)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const rebuild = debounce(()=>{
    if (host.classList.contains('hidden')) return;
    const prev = {
      q: document.getElementById('recapSearch')?.value || '',
      c: document.getElementById('recapSelCourt')?.value || 'all',
      r: document.getElementById('recapSelResult')?.value || 'all',
      y: window.scrollY
    };
    try{ buildRecapMobileUI(host); }catch{return;}
    try{
      const s = document.getElementById('recapSearch'); if (s) s.value = prev.q;
      const sc = document.getElementById('recapSelCourt'); if (sc && [...sc.options].some(o=>o.value===prev.c)) sc.value = prev.c;
      const sr = document.getElementById('recapSelResult'); if (sr && [...sr.options].some(o=>o.value===prev.r)) sr.value = prev.r;
      // trigger apply
      s?.dispatchEvent(new Event('input')); sc?.dispatchEvent(new Event('change')); sr?.dispatchEvent(new Event('change'));
      // keep approximate scroll position
      window.scrollTo({ top: prev.y, behavior: 'instant' });
    }catch{}
  }, 250);

  const addObs = (target)=>{
    if (!target) return; const mo = new MutationObserver(()=> rebuild()); mo.observe(target, {childList:true, subtree:true}); window.__recapObservers.push(mo);
  };
  addObs(document.getElementById('courtContainer'));
  const st = document.getElementById('standings'); addObs(st?.querySelector('tbody') || st);
  // Guard: if other scripts unhide editorPlayersSection while in Recap, hide it back
  const ep = document.getElementById('editorPlayersSection');
  if (ep){ const mo = new MutationObserver(()=> enforcePlayersSectionVisibility()); mo.observe(ep, { attributes:true, attributeFilter:['class'] }); window.__recapObservers.push(mo); }
  const vp = document.getElementById('viewerPlayersWrap');
  if (vp){ const mo2 = new MutationObserver(()=> enforcePlayersSectionVisibility()); mo2.observe(vp, { attributes:true, attributeFilter:['class'] }); window.__recapObservers.push(mo2); }
}

// (layout for filter grid is now handled statically by field creators)
    // Mobile-only toggle to hide header chips (hdrChips) without touching other logic
    try{ initHdrChipsToggleMobile(); }catch{}
