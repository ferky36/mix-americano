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
    const hostRecap = document.createElement('section');
    hostRecap.id = 'section-recap';
    hostRecap.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hidden';
    const hostInsight = document.createElement('section');
    hostInsight.id = 'section-insight';
    hostInsight.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hidden';
    // Build new structure order in main: Jadwal, Klasemen, Pemain, Recap, Insight
    // 1) Jadwal wrapper placed where controls section sits
    if (secControls){ secControls.before(hostJadwal); hostJadwal.appendChild(secControls); }
    if (secCourts){ hostJadwal.appendChild(secCourts); }
    // 2) Klasemen wrapper
    const hostKlasemen = document.createElement('section');
    hostKlasemen.id = 'section-klasemen';
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
    ul.className = 'flex items-end justify-between gap-1 py-2';
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
          #mobileTabbar button{ -webkit-tap-highlight-color: transparent; outline: none; }
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
        'flex','flex-col','items-center','justify-center','px-3','py-2','rounded-xl','min-w-[60px]',
        'text-[11px]','font-medium','text-gray-700','dark:text-gray-200','hover:bg-gray-100','dark:hover:bg-gray-700'
      ].join(' ');
      btn.innerHTML = `
        <span class="w-6 h-6 grid place-items-center">${iconSvg}</span>
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

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
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

// Build redesigned mobile recap with filters
function buildRecapMobileUI(host){
  const data = collectMatchesMobile();
  const courts = Array.from(new Set(data.map(m=> m.court))).sort((a,b)=>a-b);

  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'space-y-4';

  // Header card
  const card = document.createElement('div');
  card.className = 'rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-3 md:p-4';
  const title = document.createElement('div');
  title.className = 'flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100';
  title.innerHTML = `<span>📍</span><span>${t('mobile.recap.title','Match Recap — {event}').replace('{event}', escapeHtml((document.getElementById('appTitle')?.textContent||'').trim()||'Event'))}</span>`;
  const sub = document.createElement('div');
  sub.className = 'mt-1 text-sm text-gray-600 dark:text-gray-300';
  const loc = (document.getElementById('chipLocText')?.textContent||'').trim();
  const dat = (document.getElementById('chipDateText')?.textContent||'').trim();
  sub.textContent = [loc, dat].filter(Boolean).join(', ');
  card.appendChild(title); card.appendChild(sub);

  // Search + filters
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = t('mobile.recap.search','Cari pemain / skor...');
  search.className = 'mt-3 filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100';
  search.id = 'recapSearch';

  const row = document.createElement('div');
  row.className = 'mt-3 grid grid-cols-2 gap-2';

  const selCourt = document.createElement('select');
  selCourt.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100';
  selCourt.id = 'recapSelCourt';
  selCourt.appendChild(new Option(t('mobile.recap.allCourts','Semua Lapangan'),'all'));
  courts.forEach(c=> selCourt.appendChild(new Option((window.__i18n_get ? __i18n_get('render.court','Lapangan') : 'Lapangan')+' '+c, String(c))));

  const selRes = document.createElement('select');
  selRes.className = 'filter-input border rounded-xl px-3 py-2 w-full bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100';
  selRes.id = 'recapSelResult';
  [
    ['all', t('mobile.recap.result.all','Semua Hasil')],
    ['win', t('mobile.recap.result.win','Menang')],
    ['lose', t('mobile.recap.result.lose','Kalah')],
    ['draw', t('mobile.recap.result.draw','Seri')]
  ].forEach(([v,label])=> selRes.appendChild(new Option(label, v)));

  row.appendChild(selCourt); row.appendChild(selRes);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'mt-3 grid grid-cols-2 gap-2';
  const stat1 = statBox(t('recap.metric.totalMatch','Total Match'),'0');
  const stat2 = statBox(t('recap.metric.totalPoint','Total Poin'),'0');
  const stat3 = statBox(t('recap.metric.avgMargin','Rata Selisih'),'0');
  const stat4 = statBox(t('stats.tight','Skor Paling Ketat'),'-');
  stats.appendChild(stat1.wrap); stats.appendChild(stat2.wrap);
  stats.appendChild(stat3.wrap); stats.appendChild(stat4.wrap);

  card.appendChild(search);
  card.appendChild(row);
  card.appendChild(stats);
  wrap.appendChild(card);

  // Section title
  const sec = document.createElement('div');
  sec.className = 'rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-3 md:p-4';
  const secTitle = document.createElement('div');
  secTitle.className = 'font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2';
  secTitle.innerHTML = `<span>🎞️</span><span>${t('mobile.recap.section','Rekap Pertandingan')}</span>`;
  const list = document.createElement('div');
  list.className = 'space-y-2';
  sec.appendChild(secTitle); sec.appendChild(list);
  wrap.appendChild(sec);

  host.appendChild(wrap);

  // Render function with filters
  function apply(){
    const q = (search.value||'').trim().toLowerCase();
    const fc = selCourt.value;
    const fr = selRes.value; // 'all' | 'win' | 'lose' | 'draw'
    const hasQuery = q.length > 0;

    const rows = data.filter(m => {
      if (fc !== 'all' && String(m.court) !== fc) return false;

      // text filter must hit somewhere (names or score) when query exists
      if (hasQuery){
        const hay = `${m.a1} ${m.a2} ${m.b1} ${m.b2} ${m.saN}-${m.sbN}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // result filter linked to searched name
      if (fr !== 'all'){
        if (!hasQuery) return true; // ignore result filter if no name typed
        const playerHit = (m.a1||'').toLowerCase().includes(q) || (m.a2||'').toLowerCase().includes(q) || (m.b1||'').toLowerCase().includes(q) || (m.b2||'').toLowerCase().includes(q);
        if (!playerHit) return false; // require name match for win/lose/draw
        if (fr === 'draw') return m.winner === 'D';
        const side = querySide(m, q);
        if (!side) return false; // ambiguous which team
        if (fr === 'win') return m.winner === side;
        if (fr === 'lose') return m.winner !== 'D' && m.winner !== side;
      }
      return true;
    });
    stat1.val.textContent = String(rows.length);
    const tp = rows.reduce((s,m)=> s + m.saN + m.sbN, 0);
    stat2.val.textContent = String(tp);
    // Rata selisih & skor paling ketat
    const avg = rows.length ? (rows.reduce((s,m)=> s + Math.abs(m.saN - m.sbN), 0) / rows.length) : 0;
    stat3.val.textContent = rows.length ? avg.toFixed(1) : '0';
    if (rows.length){
      const tight = rows.slice().sort((a,b)=>{
        const da = Math.abs(a.saN-a.sbN), db = Math.abs(b.saN-b.sbN);
        return da - db || a.round - b.round;
      })[0];
      stat4.val.textContent = `${tight.saN}–${tight.sbN}`;
      if (stat4.label) stat4.label.textContent = `${(window.__i18n_get ? __i18n_get('stats.tight','Skor Paling Ketat') : 'Skor Paling Ketat')} (Match ${tight.round})`;
    } else {
      stat4.val.textContent = '-';
      if (stat4.label) stat4.label.textContent = (window.__i18n_get ? __i18n_get('stats.tight','Skor Paling Ketat') : 'Skor Paling Ketat');
    }
    list.innerHTML = '';
    if (!rows.length){
      const empty = document.createElement('div');
      empty.className = 'text-sm text-gray-600 dark:text-gray-300';
      empty.textContent = (window.__i18n_get ? __i18n_get('stats.noMatch','Tidak ada match untuk filter ini.') : 'Tidak ada match untuk filter ini.');
      list.appendChild(empty);
      return;
    }
    rows.forEach(m => list.appendChild(matchCardMobile(m)));
  }

  [search, selCourt, selRes].forEach(el=> el.addEventListener('input', apply));
  selCourt.addEventListener('change', apply); selRes.addEventListener('change', apply);
  apply();

  // Install light observers to refresh when data changes while staying on Recap
  try{ setupRecapAutoRefresh(host); }catch{}

  function statBox(label, value){
    const w = document.createElement('div');
    w.className = 'rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 p-3';
    const l = document.createElement('div'); l.className='text-xs text-gray-600 dark:text-gray-300 mb-1'; l.textContent = label;
    const v = document.createElement('div'); v.className='text-2xl font-bold'; v.textContent=value;
    w.appendChild(l); w.appendChild(v);
    return {wrap:w, val:v, label:l};
  }
}

function matchCardMobile(m){
  const card = document.createElement('div');
  card.className = 'rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-3';
  const top = document.createElement('div');
  top.className = 'text-xs text-gray-600 dark:text-gray-300 mb-2';
  const time = m.time ? ` • ${m.time}` : '';
  top.textContent = `${t('mobile.recap.match','Match #{round}').replace('{round}', m.round)} • ${t('render.court','Lapangan')} ${m.court}${time}`;
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-5 gap-1 items-center';
    const a = teamBox((window.__i18n_get ? __i18n_get('tennis.teamA','Tim A') : 'TEAM A'), `${m.a1} & ${m.a2}`, m.winner==='A', m.winner==='D');
    const b = teamBox((window.__i18n_get ? __i18n_get('tennis.teamB','Tim B') : 'TEAM B'), `${m.b1} & ${m.b2}`, m.winner==='B', m.winner==='D');
  const score = document.createElement('div');
  score.className='col-span-1 text-center text font-extrabold leading-none select-none';
  score.textContent=`${m.saN}–${m.sbN}`;
  grid.appendChild(a); grid.appendChild(score); grid.appendChild(b);
  card.appendChild(top); card.appendChild(grid);
  return card;
}

function teamBox(label, names, win, draw){
  const box = document.createElement('div');
  const clsWin  = 'bg-emerald-700/20 dark:bg-emerald-900/30 border-emerald-700/40';
  const clsLose = 'bg-red-700/20 dark:bg-red-900/30 border-red-700/40';
  const clsDraw = 'bg-gray-100 dark:bg-gray-900 border-gray-700';
  const surf = win ? clsWin : (draw ? clsDraw : clsLose);
  box.className = 'col-span-2 min-w-0 rounded-xl border p-2.5 ' + surf;
  const head = document.createElement('div');
  head.className = 'flex items-center gap-1 text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-0.5';
  const lab = document.createElement('span'); lab.textContent = label;
  head.appendChild(lab);
  if (win){
    const cup = document.createElement('span');
    cup.className = 'ml-1 text-amber-400';
    cup.textContent = '🏆';
    head.appendChild(cup);
  }
  const nm = document.createElement('div');
  nm.className='text-[12px] sm:text-[13px] whitespace-nowrap overflow-hidden text-ellipsis';
  nm.textContent = names;
  box.appendChild(head); box.appendChild(nm); return box;
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
