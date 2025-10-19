"use strict";
// Tennis/Padel Scoreboard overlay adapted from enhancement/tennis-score.html
// This file creates a full-screen overlay with the scoreboard UI, brings over
// all logic (timer, rally/tennis modes, server rotation, modals), and exposes
// openScoreModal(courtIdx, roundIdx) so existing app buttons can open it.

(function(){
  // Internal context to link overlay with app rounds
  const tsCtx = { court: null, round: null, initialized: false };

  // Build overlay HTML (copied and adapted from enhancement/tennis-score.html body)
  const overlayHtml = `
    <div id="tsOverlay" class="fixed inset-0 z-50 hidden items-center justify-center p-3">
      <div class="absolute inset-0 bg-black/50" data-ts-close></div>
      <div class="relative w-full max-w-3xl bg-white shadow-2xl rounded-xl p-4 md:p-8 border border-gray-100 overflow-auto max-h-[95vh]">
        <div class="flex items-start justify-between mb-2">
          <h1 id="tsTitle" class="text-2xl md:text-3xl font-extrabold text-gray-800">Penghitung Skor</h1>
          <button id="tsCloseBtn" class="px-3 py-1.5 rounded-lg border text-sm">Tutup</button>
        </div>
        <p id="tsSchedule" class="text-sm text-gray-500 mb-3 hidden">Waktu Main Terjadwal: -</p>

        <div class="mb-4 flex flex-col md:flex-row justify-center items-center gap-2 md:gap-3 p-3 rounded-xl border border-indigo-200">
          <label for="mode-selector" class="text-sm font-semibold text-indigo-700">Pilih Metode Skor:</label>
          <select id="mode-selector" class="py-1 px-3 border border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm w-full md:w-auto transition duration-150">
            <option value="TENNIS">Tennis/Padel Score (0, 15, 30, 40)</option>
            <option value="RALLY">Rally Score (Poin Berlanjut)</option>
          </select>
        </div>

        <div id="timer-display" class="text-3xl font-extrabold text-center text-gray-700 mb-4 p-2 bg-yellow-100 rounded-lg shadow-inner transition duration-300 ease-in-out">11:00</div>
        <button id="start-match-btn" class="w-full py-3 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/50 transition duration-150 ease-in-out">
          Mulai Pertandingan (11 Menit)
        </button>

        <div id="game-score-display" class="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-8 mb-4 p-3 bg-gray-100 rounded-xl border">
          <p id="set-score-label" class="text-base font-bold text-gray-700 text-center w-full sm:w-auto">Games Dimenangkan (Set):</p>
          <div class="flex justify-center space-x-4 md:space-x-6">
            <div class="text-lg font-bold text-blue-700">Tim A: <span id="games-t1" class="text-2xl font-extrabold">0</span></div>
            <div class="text-lg font-bold text-red-700">Tim B: <span id="games-t2" class="text-2xl font-extrabold">0</span></div>
          </div>
        </div>

        <div id="status-message" class="text-center text-gray-500 mt-2 text-sm h-6 mb-4 transition duration-300 ease-in-out">Pilih mode skor dan tekan Mulai Pertandingan.</div>

        <div class="flex flex-col md:flex-row justify-between items-stretch gap-4">
          <div class="flex-1 p-4 bg-blue-50/70 border border-blue-100 rounded-lg flex flex-col items-center">
            <h2 class="text-lg md:text-xl font-extrabold text-blue-800 tracking-wider mb-2">Tim A</h2>
            <div class="text-xs text-gray-600 mb-2 flex justify-center gap-2 w-full md:text-sm md:gap-4">
              <p id="player-1-name" data-player-id="1" class="player-name transition duration-150 text-gray-600">P1</p>
              <p id="player-2-name" data-player-id="2" class="player-name transition duration-150 text-gray-600">P2</p>
            </div>
            <div class="text-5xl md:text-7xl font-black text-blue-700 tracking-wider" id="score-t1">0</div>
            <div class="mt-4 w-full flex gap-3">
              <button class="score-btn flex-1 py-3 md:py-3.5 bg-white border border-blue-600 text-blue-600 font-semibold rounded-2xl shadow" data-team="1" data-delta="-1">-</button>
              <button class="score-btn flex-1 py-3 md:py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30" data-team="1" data-delta="1">+</button>
            </div>
          </div>
          <div class="flex-1 p-4 bg-red-50/70 border border-red-100 rounded-lg flex flex-col items-center">
            <h2 class="text-lg md:text-xl font-extrabold text-red-800 tracking-wider mb-2">Tim B</h2>
            <div class="text-xs text-gray-600 mb-2 flex justify-center gap-2 w-full md:text-sm md:gap-4">
              <p id="player-3-name" data-player-id="3" class="player-name transition duration-150 text-gray-600">P3</p>
              <p id="player-4-name" data-player-id="4" class="player-name transition duration-150 text-gray-600">P4</p>
            </div>
            <div class="text-5xl md:text-7xl font-black text-red-700 tracking-wider" id="score-t2">0</div>
            <div class="mt-4 w-full flex gap-3">
              <button class="score-btn flex-1 py-3 md:py-3.5 bg-white border border-red-600 text-red-600 font-semibold rounded-2xl shadow" data-team="2" data-delta="-1">-</button>
              <button class="score-btn flex-1 py-3 md:py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-lg shadow-red-500/30" data-team="2" data-delta="1">+</button>
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <button id="finish-match-btn" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">Selesai & Lihat Hasil Pertandingan</button>
          <button id="force-reset-btn" class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg">Reset Skor (0–0)</button>
        </div>

        <!-- Modal Game Won -->
        <div id="game-won-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center p-4">
          <div class="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center transform scale-100 transition-all duration-300">
            <svg class="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3 class="text-2xl font-bold text-gray-900 mt-3">GAME DIMENANGKAN!</h3>
            <p class="text-lg text-gray-700 mt-2">Pemenang: <span id="winner-text" class="font-extrabold text-green-600"></span></p>
            <p class="text-sm text-gray-500 mt-1">Skor game saat ini akan direset. Server berikutnya adalah <span id="next-server-text" class="font-bold text-indigo-600"></span>.</p>
            <button id="start-new-game-btn" class="mt-5 w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">Mulai Game Berikutnya</button>
          </div>
        </div>

        <!-- Modal Match Results -->
        <div id="match-results-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center p-4">
          <div class="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
            <h3 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">HASIL AKHIR PERTANDINGAN</h3>
            <div class="border-t border-b py-4 mb-4">
              <p class="text-xl text-gray-600 font-medium"><span id="final-score-label">Total Games</span>:</p>
              <p id="final-score-text" class="text-5xl font-black text-indigo-600 mt-2">0 - 0</p>
            </div>
            <p class="text-xl text-gray-700 font-semibold mt-4">Pemenang Pertandingan:</p>
            <p id="match-winner-text" class="text-2xl font-extrabold text-green-700 mt-1"></p>
            <p id="match-winner-names" class="text-lg text-gray-600 mt-1 hidden"></p>
            <div id="next-match-info" class="mt-6 hidden">
              <div class="mx-auto max-w-sm rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-center">
                <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Pertandingan Selanjutnya</p>
                <p id="next-match-players" class="mt-2 text-base font-semibold text-gray-700"></p>
                <p id="next-match-time" class="mt-1 text-xs text-gray-500"></p>
              </div>
            </div>
            <p id="event-finished-note" class="mt-4 text-sm text-gray-500 hidden">Permainan di event ini sudah selesai.</p>
            <button id="new-match-btn" class="mt-6 w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg">Mulai Pertandingan Baru</button>
          </div>
        </div>

        <!-- Modal Confirmation -->
        <div id="action-confirm-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 items-center justify-center p-4">
          <div class="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center">
            <svg class="mx-auto h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h3 id="confirm-modal-title" class="text-xl font-bold text-gray-900 mt-3"></h3>
            <p id="confirm-modal-desc" class="text-sm text-gray-500 mt-2">Tindakan ini akan mengakhiri atau mereset skor pertandingan saat ini.</p>
            <div class="mt-5 flex justify-between gap-3">
              <button id="cancel-action-btn" class="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition duration-150">Batal</button>
              <button id="confirm-action-btn" class="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition duration-150">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>

        <!-- Toast Notification -->
        <div id="toast-notification" class="fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white font-semibold transition-opacity duration-300 opacity-0 pointer-events-none z-50"><p id="toast-message"></p></div>
      </div>
    </div>`;

  const styleCss = `
    .score-btn{ transition: all 0.1s; touch-action: manipulation; user-select: none; }
    .score-btn:active{ transform: scale(0.98); }
    .serving-player{ border-bottom:2px solid #f97316; padding-bottom:1px; }
    .disabled-select{ cursor:not-allowed; opacity:0.7; }
  `;

  function ensureOverlay(){
    if (tsCtx.initialized) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = overlayHtml;
    document.body.appendChild(wrap.firstElementChild);
    const style = document.createElement('style');
    style.textContent = styleCss;
    document.head.appendChild(style);
    bindElements();
    tsCtx.initialized = true;
  }

  // Court scoring mode persistence (match 1 decides for the court)
  function getCourtScoringMode(cIdx){
    try{
      const court = roundsByCourt?.[cIdx];
      if (!court) return null;
      return court.__scoringMode || (court[0] && court[0].__scoringMode) || null;
    }catch{ return null; }
  }
  function setCourtScoringMode(cIdx, mode){
    try{
      if (!roundsByCourt[cIdx]) roundsByCourt[cIdx] = [];
      roundsByCourt[cIdx].__scoringMode = mode;
      if (!roundsByCourt[cIdx][0]) roundsByCourt[cIdx][0] = { a1:'', a2:'', b1:'', b2:'', scoreA:'', scoreB:'', server_offset:0 };
      roundsByCourt[cIdx][0].__scoringMode = mode;
    }catch{}
  }

  function getRoundMinutes(){
    try { return Math.max(1, parseInt(byId('minutesPerRound').value || '11', 10)); } catch { return 11; }
  }
  function setStartButtonLabel(){
    try { const m = getRoundMinutes(); if (startMatchBtn) startMatchBtn.textContent = `Mulai Pertandingan (${m} Menit)`; } catch {}
  }

  // ===== State and refs ===== //
  const playerDetails = { 1:{name:"Pemain 1 (P1)",team:1}, 2:{name:"Pemain 2 (P2)",team:1}, 3:{name:"Pemain 3 (P3)",team:2}, 4:{name:"Pemain 4 (P4)",team:2} };
  const state = {
    scoreT1:0, scoreT2:0, gamesT1:0, gamesT2:0,
    displayScores:["0","15","30","40"],
    isDeuce:false, isAdvantageT1:false, isAdvantageT2:false,
    currentPlayerServer:1, isMatchFinished:false, isMatchRunning:false,
    timerSeconds:660, timerInterval:null, scoringMode:'TENNIS',
    gameWinPending:false,
    isRecalcMode:false,
    pendingClearScore:false
  };

  // DOM refs
  let $ = (id)=>document.getElementById(id);
  let scoreDisplayT1, scoreDisplayT2, statusMessage, gameWonModal,
      gamesDisplayContainer, gamesDisplayT1, gamesDisplayT2, matchResultsModal, timerDisplayEl, startMatchBtn,
      player1NameEl, player2NameEl, player3NameEl, player4NameEl, modeSelectorEl, setScoreLabelEl,
      actionConfirmModal, confirmActionBtn, confirmModalTitle, confirmModalDesc, currentPendingAction, tsTitleEl,
      tsScheduleEl, matchWinnerNamesEl, nextMatchInfoEl, nextMatchPlayersEl, nextMatchTimeEl,
      finishBtnEl, forceResetBtnEl;
  let pendingCloseAfterReset = false; // if reset came from close request

  function bindElements(){
    scoreDisplayT1 = $("score-t1");
    scoreDisplayT2 = $("score-t2");
    statusMessage = $("status-message");
    gameWonModal = $("game-won-modal");
    gamesDisplayContainer = $("game-score-display");
    gamesDisplayT1 = $("games-t1");
    gamesDisplayT2 = $("games-t2");
    matchResultsModal = $("match-results-modal");
    timerDisplayEl = $("timer-display");
    startMatchBtn = $("start-match-btn");
    modeSelectorEl = $("mode-selector");
    setScoreLabelEl = $("set-score-label");
    player1NameEl = $("player-1-name");
    player2NameEl = $("player-2-name");
    player3NameEl = $("player-3-name");
    player4NameEl = $("player-4-name");
    actionConfirmModal = $("action-confirm-modal");
    confirmActionBtn = $("confirm-action-btn");
    confirmModalTitle = $("confirm-modal-title");
    confirmModalDesc = $("confirm-modal-desc");
    tsTitleEl = $("tsTitle");
    tsScheduleEl = $("tsSchedule");
    matchWinnerNamesEl = $("match-winner-names");
    nextMatchInfoEl = $("next-match-info");
    nextMatchPlayersEl = $("next-match-players");
    nextMatchTimeEl = $("next-match-time");
    finishBtnEl = $("finish-match-btn");
    forceResetBtnEl = $("force-reset-btn");

    // Event wires
    // Close handlers: behave like Reset when a match is running/started
    const requestClose = ()=>{
      try{
        const r = (roundsByCourt?.[tsCtx.court]||[])[tsCtx.round] || {};
        const started = !!r.startedAt; const finished = !!r.finishedAt;
        if (state.isMatchRunning || (started && !finished)){
          pendingCloseAfterReset = true;
          showConfirmationModal('reset', { closeAfter: true });
          return;
        }
      }catch{}
      hideOverlay();
    };
    $("tsCloseBtn").addEventListener('click', requestClose);
    document.querySelector('#tsOverlay [data-ts-close]').addEventListener('click', requestClose);
    startMatchBtn.addEventListener('click', toggleMatchState);
    modeSelectorEl.addEventListener('change', (e)=>changeScoringMode(e.target));
    // Prevent accidental double increment on first tap/click
    let lastScoreTs = 0;
    document.querySelectorAll('#tsOverlay .score-btn').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        const now = Date.now();
        if (now - lastScoreTs < 220) return; // ignore rapid double firing
        lastScoreTs = now;
        const team = Number(btn.getAttribute('data-team'));
        const delta = parseInt(btn.getAttribute('data-delta')||'1',10) || 1;
        scorePoint(team, delta);
      }, { passive: false });
    });
    $("finish-match-btn").addEventListener('click', ()=>finishMatch(false,false));
    $("force-reset-btn").addEventListener('click', ()=>{
      // Always show confirmation modal for clear-reset (recalc-focused)
      showConfirmationModal('reset-clear');
    });
    $("start-new-game-btn").addEventListener('click', startNewGame);
    $("new-match-btn").addEventListener('click', async ()=>{
      try{
        if (typeof loadStateFromCloudSilent === 'function'){
          await loadStateFromCloudSilent();
        }
      }catch{}
      try{
        // After refreshing, if Match 1 is finished, persist its scoring mode for the court
        const c = tsCtx.court;
        if (c!=null){
          const r0 = (roundsByCourt?.[c]||[])[0] || {};
          if (r0 && r0.finishedAt){
            const mode = (r0.__scoringMode || state.scoringMode || 'RALLY');
            try{ setCourtScoringMode(c, mode); }catch{}
          }
        }
      }catch{}
      resetMatch(true,true);
      hideOverlay();
    });
    $("cancel-action-btn").addEventListener('click', cancelAction);
    confirmActionBtn.addEventListener('click', confirmAction);
  }

  function changeScoringMode(selectElement){
    const newMode = selectElement.value;
    if (newMode !== state.scoringMode){
      state.scoringMode = newMode;
      resetMatch(true, true);
    }
  }
  function formatTime(totalSeconds){
    const minutes = Math.floor(totalSeconds/60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  }
  function formatTeamNames(teamId){
    const ids = teamId===1 ? [1,2] : teamId===2 ? [3,4] : [];
    const names = ids.map(id => (playerDetails[id]?.name || '').trim()).filter(Boolean);
    if (!names.length) return teamId===1 ? 'Tim A' : teamId===2 ? 'Tim B' : 'Tim';
    return names.join(' & ');
  }
  function computeScheduledWindow(roundIdx){
    try{
      const startInput = byId('startTime');
      if (!startInput || !startInput.value) return null;
      const parts = startInput.value.split(':').map(v=>parseInt(v,10));
      if (parts.length < 2 || parts.some(v=>Number.isNaN(v))) return null;
      const baseMinutes = parts[0]*60 + parts[1];
      const perRound = getRoundMinutes();
      const rawBreak = parseInt(byId('breakPerRound')?.value || '0', 10);
      const breakMinutes = Number.isFinite(rawBreak) ? Math.max(0, rawBreak) : 0;
      const index = Math.max(0, Number(roundIdx||0));
      const offset = index * (perRound + breakMinutes);
      const startTotal = baseMinutes + offset;
      const endTotal = startTotal + perRound;
      const fmt = (total)=>{
        const dayMinutes = 24*60;
        const normalized = ((total % dayMinutes) + dayMinutes) % dayMinutes;
        const h = Math.floor(normalized/60);
        const m = normalized % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      };
      return { start: fmt(startTotal), end: fmt(endTotal) };
    }catch{ return null; }
  }
  function updateScheduledLabel(roundIdx){
    if (!tsScheduleEl) return;
    const slot = computeScheduledWindow(roundIdx);
    if (slot){
      tsScheduleEl.textContent = `Waktu Main Terjadwal: ${slot.start} - ${slot.end}`;
      tsScheduleEl.classList.remove('hidden');
    } else {
      tsScheduleEl.textContent = '';
      tsScheduleEl.classList.add('hidden');
    }
  }
  function updateNextMatchInfo(cIdx = tsCtx.court, roundIdx = tsCtx.round, nextOverride = null){
    if (!nextMatchInfoEl || !nextMatchPlayersEl) return;
    if (cIdx == null || roundIdx == null){
      nextMatchInfoEl.classList.add('hidden');
      nextMatchPlayersEl.textContent = '';
      if (nextMatchTimeEl){ nextMatchTimeEl.textContent=''; nextMatchTimeEl.classList.add('hidden'); }
      return;
    }
    const nextRoundIdx = (roundIdx ?? -1) + 1;
    let nextRound = nextOverride;
    if (!nextRound) nextRound = (window.roundsByCourt?.[cIdx]||[])[nextRoundIdx];
    if (!nextRound){
      // Fallback: deduce from active court table (only one rendered at a time)
      try{
        const row = document.querySelector(`.rnd-table tbody tr[data-index="${nextRoundIdx}"]`);
        if (row){
          nextRound = {
            a1: row.querySelector('.rnd-teamA-1 select')?.value || '',
            a2: row.querySelector('.rnd-teamA-2 select')?.value || '',
            b1: row.querySelector('.rnd-teamB-1 select')?.value || '',
            b2: row.querySelector('.rnd-teamB-2 select')?.value || ''
          };
        }
      }catch{}
    }
    if (!nextRound || (!nextRound.a1 && !nextRound.a2 && !nextRound.b1 && !nextRound.b2)){
      nextMatchInfoEl.classList.add('hidden');
      nextMatchPlayersEl.textContent = '';
      if (nextMatchTimeEl){ nextMatchTimeEl.textContent=''; nextMatchTimeEl.classList.add('hidden'); }
      return;
    }
    const getTeamNames = (team)=>{
      const base = team===1
        ? [nextRound.a1, nextRound.a2]
        : [nextRound.b1, nextRound.b2];
      let names = base.map(s => (s || '').trim()).filter(Boolean);
      if (names.length === 0){
        try{
          const row = document.querySelector(`.rnd-table tbody tr[data-index="${nextRoundIdx}"]`);
          if (row){
            const cls = team===1 ? ['.rnd-teamA-1 select','.rnd-teamA-2 select'] : ['.rnd-teamB-1 select','.rnd-teamB-2 select'];
            names = cls.map(sel => (row.querySelector(sel)?.value || '').trim()).filter(Boolean);
          }
        }catch{}
      }
      return names;
    };
    const teamANames = getTeamNames(1);
    const teamBNames = getTeamNames(2);
    const safeTeamA = teamANames.length ? teamANames.join(' & ') : 'Tim A';
    const safeTeamB = teamBNames.length ? teamBNames.join(' & ') : 'Tim B';
    const hasPlayers = teamANames.length || teamBNames.length;
    const html = hasPlayers
      ? `<div class="flex flex-col items-center text-gray-700 text-sm md:text-base gap-1">
          <span>${safeTeamA}</span>
          <span class="text-xs uppercase tracking-wide text-indigo-500">vs</span>
          <span>${safeTeamB}</span>
        </div>`
      : '<div class="text-gray-500 text-sm">Pemain belum ditentukan</div>';
    try{
      nextMatchPlayersEl.innerHTML = html;
    }catch{
      nextMatchPlayersEl.textContent = hasPlayers ? `${safeTeamA} vs ${safeTeamB}` : 'Pemain belum ditentukan';
    }
    if (nextMatchTimeEl){
      const slot = computeScheduledWindow(nextRoundIdx);
      if (slot){
        nextMatchTimeEl.textContent = `Terjadwal: ${slot.start} - ${slot.end}`;
        nextMatchTimeEl.classList.remove('hidden');
      } else {
        nextMatchTimeEl.textContent = '';
        nextMatchTimeEl.classList.add('hidden');
      }
    }
    nextMatchInfoEl.classList.remove('hidden');
  }
  function rotateServer(){
    switch(state.currentPlayerServer){
      case 1: state.currentPlayerServer=3; break;
      case 3: state.currentPlayerServer=2; break;
      case 2: state.currentPlayerServer=4; break;
      case 4: state.currentPlayerServer=1; break;
    }
  }
  function tsShowToast(message, type='warning'){
    const toastEl = $("toast-notification");
    const toastMessageEl = $("toast-message");
    if (!toastEl || !toastMessageEl) return;
    toastEl.classList.remove('bg-red-500','bg-yellow-500','bg-green-500');
    if (type==='error') toastEl.classList.add('bg-red-500');
    else if (type==='success') toastEl.classList.add('bg-green-500');
    else toastEl.classList.add('bg-yellow-500');
    toastMessageEl.textContent = message;
    toastEl.classList.remove('opacity-0','pointer-events-none');
    toastEl.classList.add('opacity-100');
    setTimeout(()=>{
      toastEl.classList.remove('opacity-100');
      toastEl.classList.add('opacity-0','pointer-events-none');
    }, 3000);
  }

function showConfirmationModal(actionType, opts){
    currentPendingAction = actionType;
    pendingCloseAfterReset = !!(opts && opts.closeAfter);
    let titleText = ""; let buttonText = "";
    if (actionType==='reset'){
      if (pendingCloseAfterReset){
        titleText = 'Tutup & Batalkan Pertandingan?';
        buttonText = 'Ya, Batalkan & Tutup';
        if (confirmModalDesc) confirmModalDesc.textContent = 'Menutup popup akan membatalkan pertandingan yang sedang berlangsung dan mengosongkan skor.';
      } else {
        titleText = 'Yakin Ingin Me-Reset Pertandingan?';
        buttonText = 'Ya, Reset Sekarang';
        if (confirmModalDesc) confirmModalDesc.textContent = 'Tindakan ini akan mereset skor pertandingan saat ini.';
      }
    }
    else if (actionType==='reset-clear'){
      titleText = 'Yakin Ingin Me-Reset Pertandingan?';
      buttonText = 'Ya, Reset Sekarang';
      if (confirmModalDesc) confirmModalDesc.textContent = 'Tindakan ini akan mereset skor pertandingan saat ini menjadi kosong (0–0).';
    }
    else if (actionType==='finish'){
      titleText = 'Yakin Ingin Menyelesaikan Pertandingan?';
      buttonText = 'Ya, Selesaikan Sekarang';
      if (confirmModalDesc) confirmModalDesc.textContent = 'Skor saat ini akan disimpan sebagai hasil akhir pertandingan.';
    }
    else return;
    if (confirmModalTitle) confirmModalTitle.textContent = titleText;
    if (confirmActionBtn) confirmActionBtn.textContent = buttonText;
    if (actionConfirmModal){ actionConfirmModal.classList.remove('hidden'); actionConfirmModal.classList.add('flex'); }
  }
  function confirmAction(){
    if (actionConfirmModal) actionConfirmModal.classList.add('hidden');
    if (currentPendingAction==='reset') { performMatchReset(); if (pendingCloseAfterReset) hideOverlay(); }
    else if (currentPendingAction==='reset-clear') { clearRoundScoreImmediate(); }
    else if (currentPendingAction==='finish') finishMatch(false,true);
    currentPendingAction = null; updateDisplay();
  }
  function cancelAction(){ if (actionConfirmModal) actionConfirmModal.classList.add('hidden'); currentPendingAction=null; updateDisplay(); }

  function clearRoundScoreImmediate(){
    let hasRoundContext = false;
    try{
      if (tsCtx.court==null || tsCtx.round==null) return;
      const courtRounds = (roundsByCourt?.[tsCtx.court]||[]);
      const r = courtRounds[tsCtx.round] || null;
      if (!r) return;
      hasRoundContext = true;
      r.scoreA = '';
      r.scoreB = '';
      try{ delete r.startedAt; delete r.finishedAt; }catch{}
      if (typeof markDirty==='function') markDirty();
      if (typeof renderAll==='function') renderAll();
      if (typeof computeStandings==='function') computeStandings();
      // Inline table sync
      try{
        document.querySelectorAll(`.rnd-table tbody tr[data-index="${tsCtx.round}"]`).forEach(row=>{
          const aInp = row.querySelector('.rnd-scoreA input');
          const bInp = row.querySelector('.rnd-scoreB input');
          if (aInp) aInp.value = '';
          if (bInp) bInp.value = '';
          const actions = row.querySelector('.rnd-col-actions');
          const live = actions?.querySelector('.live-badge');
          const done = actions?.querySelector('.done-badge');
          if (live) live.classList.add('hidden');
          if (done) done.classList.add('hidden');
          const btn = actions?.querySelector('button');
          if (btn){ btn.textContent='Mulai Main'; btn.classList.remove('hidden'); }
        });
      }catch{}
      // Save to Cloud immediately
      (async ()=>{ try{ if (typeof maybeAutoSaveCloud==='function') await maybeAutoSaveCloud(); else if (typeof saveStateToCloud==='function') await saveStateToCloud(); }catch{} })();
    }catch{}
    if (hasRoundContext) transitionToLiveModeAfterForceReset();
  }

  function transitionToLiveModeAfterForceReset(){
    state.pendingClearScore = false;
    state.isRecalcMode = false;
    state.isMatchFinished = false;
    state.isMatchRunning = false;
    if (state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval=null; }
    try{ if (forceResetBtnEl) forceResetBtnEl.classList.add('hidden'); }catch{}
    try{
      if (startMatchBtn){
        startMatchBtn.classList.remove('hidden');
        startMatchBtn.disabled = false;
      }
    }catch{}
    resetMatch(true,true);
    setStartButtonLabel();
    try{ if (statusMessage) statusMessage.classList.remove('hidden'); }catch{}
    try{ if (finishBtnEl) finishBtnEl.textContent = 'Selesai & Lihat Hasil Pertandingan'; }catch{}
    try{ document.querySelectorAll('#tsOverlay button[data-delta="-1"]').forEach(b=>b.classList.add('hidden')); }catch{}
  }

  function toggleMatchState(){
    if (state.isMatchRunning) showConfirmationModal('reset'); else startMatch();
    updateDisplay();
  }
  function performMatchReset(){
    if (state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval=null; }
    state.isMatchRunning=false; resetMatch(true,true);
    setStartButtonLabel();
    startMatchBtn.classList.remove('bg-red-600','hover:bg-red-700','shadow-red-500/50');
    startMatchBtn.classList.add('bg-indigo-600','hover:bg-indigo-700','shadow-indigo-500/50');
    statusMessage.textContent = 'Pertandingan direset, siap dimulai.';
    statusMessage.className = 'text-center text-indigo-600 font-bold mt-2 text-md';
    // Total reset untuk ronde aktif: set skor kosong (tabel), hapus started/finished, dan simpan ke Cloud
    try{
      if (tsCtx.court!=null && tsCtx.round!=null){
        const r = (roundsByCourt?.[tsCtx.court]||[])[tsCtx.round] || null;
        if (r){
          // kosongkan skor di DB/tabel, hapus status live/done dan cadangan
          r.scoreA = '';
          r.scoreB = '';
          try{ delete r._prevScoreA; delete r._prevScoreB; }catch{}
          try{ delete r.startedAt; }catch{}
          try{ delete r.finishedAt; }catch{}
          // Sinkronkan tabel & tombol
          try{
            document.querySelectorAll(`.rnd-table tbody tr[data-index="${tsCtx.round}"]`).forEach(row=>{
              const actions = row.querySelector('.rnd-col-actions');
              const live = actions?.querySelector('.live-badge');
              const done = actions?.querySelector('.done-badge');
              if (live){ live.classList.add('hidden'); }
              if (done){ done.classList.add('hidden'); }
              const btn = actions?.querySelector('button');
              if (btn){ btn.textContent='Mulai Main'; btn.classList.remove('hidden'); }
              const aInp = row.querySelector('.rnd-scoreA input');
              const bInp = row.querySelector('.rnd-scoreB input');
              if (aInp) aInp.value = '';
              if (bInp) bInp.value = '';
            });
          }catch{}
          if (typeof markDirty==='function') markDirty();
          try{
            if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud();
            else if (typeof saveStateToCloud==='function') saveStateToCloud();
          }catch{}
        }
      }
    }catch{}
  }
  function startMatch(){
    if (state.timerInterval || state.isMatchFinished) return;
    // Validasi: pastikan nama pemain di ronde ini sudah lengkap sebelum mulai
    try{
      const r = (roundsByCourt?.[tsCtx.court]||[])[tsCtx.round] || {};
      const ready = !!(r.a1 && r.a2 && r.b1 && r.b2);
      if (!ready){
        tsShowToast('Nama pemain belum lengkap untuk ronde ini. Lengkapi Tim A dan Tim B terlebih dahulu.', 'error');
        return;
      }
    }catch{}
    resetMatch(true,false);
    state.timerSeconds = getRoundMinutes()*60;
    state.isMatchRunning = true;
    startMatchBtn.textContent = 'Reset Pertandingan';
    startMatchBtn.classList.remove('bg-indigo-600','hover:bg-indigo-700','shadow-indigo-500/50');
    startMatchBtn.classList.add('bg-red-600','hover:bg-red-700','shadow-red-500/50');

    // Mark startedAt on round if available
    try{
      if (tsCtx.court!=null && tsCtx.round!=null){
        const courts = roundsByCourt;
        const arr = courts[tsCtx.court] || (courts[tsCtx.court] = []);
        if (!arr[tsCtx.round]) arr[tsCtx.round] = { a1:'', a2:'', b1:'', b2:'', scoreA:'', scoreB:'', server_offset: 0 };
        const r0 = arr[tsCtx.round];
        if (typeof r0._prevScoreA === 'undefined') r0._prevScoreA = (typeof r0.scoreA !== 'undefined') ? r0.scoreA : '';
        if (typeof r0._prevScoreB === 'undefined') r0._prevScoreB = (typeof r0.scoreB !== 'undefined') ? r0.scoreB : '';
        r0.startedAt = new Date().toISOString();
        // Persist court scoring mode from match 1 (round 0)
        try{ if (tsCtx.round === 0) setCourtScoringMode(tsCtx.court, state.scoringMode); }catch{}
        if (typeof markDirty==='function') markDirty();
        if (typeof renderAll==='function') renderAll();
        // Inline toggle UI on table row: show Live badge and hide start button
        try{
          const row = document.querySelector(`.rnd-table tbody tr[data-index="${tsCtx.round}"]`);
          const actions = row?.querySelector('.rnd-col-actions');
          const live = actions?.querySelector('.live-badge');
          const done = actions?.querySelector('.done-badge');
          if (live){ live.classList.remove('hidden'); live.classList.add('fade-in'); setTimeout(()=>live.classList.remove('fade-in'),200); }
          if (done){ done.classList.add('hidden'); }
          const btn = actions?.querySelector('button');
          if (btn){ btn.classList.add('hidden'); }
        }catch{}
        // Persist startedAt to Cloud quickly so viewers see Live
        try{
          if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud();
          else if (typeof saveStateToCloud==='function') saveStateToCloud();
        }catch{}
      }
    }catch{}

    state.timerInterval = setInterval(()=>{
      state.timerSeconds--;
      if (state.timerSeconds <= 0){
        clearInterval(state.timerInterval); state.timerInterval=null; state.isMatchRunning=false;
        (async ()=>{ try{ await finishMatch(true); }catch{} })();
      }
      updateDisplay();
    }, 1000);
    updateDisplay();
  }

  function updateDisplay(){
    // Lock mode selector when: recalc, running, or court mode already decided for rounds after Match 1
    if (modeSelectorEl){
      let dis = false;
      try{
    const saved = getCourtScoringMode?.(tsCtx.court);
        const isSubsequent = (tsCtx.round||0) > 0;
        dis = state.isMatchRunning || state.isRecalcMode || (saved && isSubsequent);
      }catch{ dis = state.isMatchRunning || state.isRecalcMode; }
      modeSelectorEl.disabled = dis;
      modeSelectorEl.classList.toggle('disabled-select', dis);
    }
    if (state.isMatchFinished){ statusMessage.textContent='PERTANDINGAN SELESAI!'; statusMessage.className='text-center text-red-600 font-bold mt-2 text-md'; if (state.isRecalcMode && statusMessage) statusMessage.classList.add('hidden'); return; }
    state.isDeuce=false; state.isAdvantageT1=false; state.isAdvantageT2=false;
    let scoreTextT1, scoreTextT2;
    if (state.scoringMode==='RALLY'){
      gamesDisplayContainer.classList.add('hidden');
      setScoreLabelEl.textContent = 'Total Poin Dimenangkan:';
      scoreTextT1 = String(state.gamesT1); scoreTextT2 = String(state.gamesT2);
      if (state.isMatchRunning){
        const totalPoints = state.gamesT1 + state.gamesT2;
        if (totalPoints===0 || totalPoints % 2 !== 0){
          statusMessage.textContent = 'Mode RALLY: Poin diakumulasikan hingga waktu habis.';
          statusMessage.className = 'text-center text-gray-500 mt-2 text-sm';
        }
      }
    } else {
      gamesDisplayContainer.classList.remove('hidden');
      // Trigger game win exactly once until next game starts
      if (!state.gameWinPending) {
        if (state.scoreT1>=4 && state.scoreT1>=state.scoreT2+2){ handleGameWin(1); return; }
        if (state.scoreT2>=4 && state.scoreT2>=state.scoreT1+2){ handleGameWin(2); return; }
      }
      scoreTextT1 = state.displayScores[Math.min(state.scoreT1,3)];
      scoreTextT2 = state.displayScores[Math.min(state.scoreT2,3)];
      if (state.scoreT1>=3 && state.scoreT2>=3){
        if (state.scoreT1===state.scoreT2){ state.isDeuce = true; }
        else if (state.scoreT1===state.scoreT2+1){ state.isAdvantageT1=true; state.isAdvantageT2=false; scoreTextT1='Adv'; scoreTextT2='40'; }
        else if (state.scoreT2===state.scoreT1+1){ state.isAdvantageT2=true; state.isAdvantageT1=false; scoreTextT1='40'; scoreTextT2='Adv'; }
      }
      setScoreLabelEl.textContent = 'Games Dimenangkan (Set):';
      gamesDisplayT1.textContent = state.gamesT1;
      gamesDisplayT2.textContent = state.gamesT2;
      if (state.isRecalcMode){ if (statusMessage) statusMessage.classList.add('hidden'); }
      else if (state.isMatchRunning){
        if (state.isDeuce){ statusMessage.textContent='Status: DEUCE (40-40)'; statusMessage.className='text-center text-yellow-600 font-bold mt-2 text-lg'; }
        else if (state.isAdvantageT1){ statusMessage.textContent='Status: ADVANTAGE Tim A'; statusMessage.className='text-center text-green-600 font-bold mt-2 text-lg'; }
        else if (state.isAdvantageT2){ statusMessage.textContent='Status: ADVANTAGE Tim B'; statusMessage.className='text-center text-red-600 font-bold mt-2 text-lg'; }
        else { statusMessage.textContent='Permainan sedang berlangsung...'; statusMessage.className='text-center text-gray-500 mt-2 text-sm'; }
      } else if (!state.isMatchFinished){
        if (!state.isRecalcMode){ statusMessage.textContent = 'Pilih mode skor dan tekan Mulai Pertandingan.'; statusMessage.className = 'text-center text-gray-500 mt-2 text-sm'; }
        else if (statusMessage) statusMessage.classList.add('hidden');
      }
    }
    scoreDisplayT1.textContent = scoreTextT1;
    scoreDisplayT2.textContent = scoreTextT2;
    [player1NameEl,player2NameEl,player3NameEl,player4NameEl].forEach(el=>{
      if (!el) return; const playerId = parseInt(el.getAttribute('data-player-id')); const isServing = state.currentPlayerServer===playerId;
      el.classList.toggle('text-orange-600', isServing);
      el.classList.toggle('font-bold', isServing);
      el.classList.toggle('serving-player', isServing);
      el.classList.toggle('text-gray-600', !isServing);
    });
    if (timerDisplayEl){
      // In recalc mode, keep finished text; otherwise show ticking time
      if (state.isRecalcMode) timerDisplayEl.textContent = 'Permainan Selesai';
      else timerDisplayEl.textContent = formatTime(state.timerSeconds);
      timerDisplayEl.classList.remove('bg-yellow-100','text-gray-700','bg-red-100','text-red-600','bg-green-100','text-green-800');
      if (state.timerInterval){
        if (state.timerSeconds<=60) timerDisplayEl.classList.add('bg-red-100','text-red-600');
        else timerDisplayEl.classList.add('bg-green-100','text-green-800');
      } else {
        timerDisplayEl.classList.add('bg-yellow-100','text-gray-700');
      }
    }
  }

  function scorePoint(team, delta){
    const d = (typeof delta==='number' && !isNaN(delta)) ? delta : 1;
    if (!state.isRecalcMode && (state.isMatchFinished || !state.isMatchRunning || (gameWonModal && !gameWonModal.classList.contains('hidden')))){
      statusMessage.textContent = 'Mulai pertandingan terlebih dahulu!';
      statusMessage.className = 'text-center text-orange-600 font-bold mt-2 text-md';
      return;
    }
    if (state.scoringMode==='RALLY'){
      if (team===1) state.gamesT1 = Math.max(0, state.gamesT1 + d); else state.gamesT2 = Math.max(0, state.gamesT2 + d);
      const totalPoints = state.gamesT1 + state.gamesT2;
      if (!state.isRecalcMode && totalPoints>0 && totalPoints % 2 === 0){
        rotateServer();
        statusMessage.textContent = `Server berotasi ke ${playerDetails[state.currentPlayerServer].name} (Setiap 2 poin).`;
        statusMessage.className = 'text-center text-orange-600 font-bold mt-2 text-md';
      }
      // Realtime: tulis langsung ke state ronde agar ikut terserialisasi & terkirim ke Cloud
      try{
        if (tsCtx.court!=null && tsCtx.round!=null){
          const courts = roundsByCourt;
          const arr = courts[tsCtx.court] || (courts[tsCtx.court] = []);
          if (!arr[tsCtx.round]) arr[tsCtx.round] = { a1:'', a2:'', b1:'', b2:'', scoreA:'', scoreB:'', server_offset: 0 };
          const r = arr[tsCtx.round];
          if (r){
            if (!state.isRecalcMode) r.scoreA = String(state.gamesT1);
            if (!state.isRecalcMode) r.scoreB = String(state.gamesT2);
            if (!state.isRecalcMode && typeof markDirty==='function') markDirty();
            // Sinkronkan tampilan input di tabel
            try{
              const row = document.querySelector(`.rnd-table tbody tr[data-index="${tsCtx.round}"]`);
              const aInp = row?.querySelector('.rnd-scoreA input');
              const bInp = row?.querySelector('.rnd-scoreB input');
              if (!state.isRecalcMode && aInp) aInp.value = String(state.gamesT1);
              if (!state.isRecalcMode && bInp) bInp.value = String(state.gamesT2);
            }catch{}
            // Autosave ringan supaya viewer lain ikut realtime (skip in recalc mode)
            try{
              if (!state.isRecalcMode){
                if (typeof saveLiveScoreDebounced==='function') saveLiveScoreDebounced();
                else if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud();
                else if (typeof saveStateToCloud==='function') saveStateToCloud();
              }
            }catch{}
          }
        }
      }catch{}
    } else {
      // TENNIS mode: hanya update state poin game berjalan; JANGAN update DB/tabel sampai game dimenangkan
      if (team===1) state.scoreT1 = Math.max(0, state.scoreT1 + d); else state.scoreT2 = Math.max(0, state.scoreT2 + d);
    }
    updateDisplay();
  }
  function handleGameWin(winningTeam){
    if (state.scoringMode!=='TENNIS') return;
    if (state.gameWinPending) return; // safety guard
    state.gameWinPending = true;
    if (winningTeam===1) state.gamesT1++; else state.gamesT2++;
    const winnerName = winningTeam===1 ? 'Tim A' : 'Tim B';
    $("winner-text").textContent = winnerName;
    let nextServerId; switch(state.currentPlayerServer){case 1: nextServerId=3; break; case 3: nextServerId=2; break; case 2: nextServerId=4; break; case 4: nextServerId=1; break; }
    const nextServerEl = $("next-server-text"); if (nextServerEl) nextServerEl.textContent = playerDetails[nextServerId]?.name || '';
    if (gameWonModal){ gameWonModal.classList.remove('hidden'); gameWonModal.classList.add('flex'); }

    // Persist total games ke ronde (DB/tabel) hanya ketika game dimenangkan
    try{
      if (tsCtx.court!=null && tsCtx.round!=null){
        const r = (roundsByCourt?.[tsCtx.court]||[])[tsCtx.round];
        if (r){
          r.scoreA = String(state.gamesT1);
          r.scoreB = String(state.gamesT2);
          if (typeof markDirty==='function') markDirty();
          // Sinkronkan tampilan input tabel
          try{
            const row = document.querySelector(`.rnd-table tbody tr[data-index="${tsCtx.round}"]`);
            const aInp = row?.querySelector('.rnd-scoreA input');
            const bInp = row?.querySelector('.rnd-scoreB input');
            if (aInp) aInp.value = String(state.gamesT1);
            if (bInp) bInp.value = String(state.gamesT2);
          }catch{}
          // Simpan ringan ke Cloud agar viewer lain melihat segera
          try{ if (typeof saveLiveScoreDebounced==='function') saveLiveScoreDebounced(); else if (typeof maybeAutoSaveCloud==='function') maybeAutoSaveCloud(); }catch{}
        }
      }
    }catch{}
  }
  function startNewGame(){
    if (!state.isMatchRunning){ statusMessage.textContent='Mulai pertandingan terlebih dahulu!'; statusMessage.className='text-center text-orange-600 font-bold mt-2 text-md'; return; }
    if (state.scoringMode==='TENNIS'){
      state.scoreT1=0; state.scoreT2=0; state.isDeuce=false; state.isAdvantageT1=false; state.isAdvantageT2=false; rotateServer();
    }
    state.gameWinPending = false;
    if (gameWonModal){ gameWonModal.classList.add('hidden'); gameWonModal.classList.remove('flex'); }
    updateDisplay();
  }
  async function finishMatch(fromTimer=false, confirmed=false){
    if (state.isMatchRunning && !fromTimer && !confirmed){
      const totalScore = state.gamesT1 + state.gamesT2;
      if (totalScore===0){ tsShowToast('PERINGATAN: Skor masih 0-0. Tidak ada hasil untuk diselesaikan.', 'error'); return; }
      showConfirmationModal('finish'); return;
    }
    const totalScore = state.gamesT1 + state.gamesT2;
    if (!fromTimer && totalScore===0){ tsShowToast('PERINGATAN: Skor masih 0-0. Hasil kosong tidak disimpan.', 'error'); return; }
    state.isMatchFinished=true; state.isMatchRunning=false; state.gameWinPending=false;
    if (state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval=null; setStartButtonLabel(); startMatchBtn.classList.remove('bg-red-600','hover:bg-red-700','shadow-red-500/50'); startMatchBtn.classList.add('bg-indigo-600','hover:bg-indigo-700','shadow-indigo-500/50'); if (!fromTimer) state.timerSeconds=0; }
    if (gameWonModal) gameWonModal.classList.add('hidden');
    let matchWinner; const scoreLabel = state.scoringMode==='RALLY' ? 'Total Poin' : 'Total Games';
    let winnerTeam = 0;
    if (state.gamesT1>state.gamesT2) { matchWinner='Tim A'; winnerTeam = 1; }
    else if (state.gamesT2>state.gamesT1) { matchWinner='Tim B'; winnerTeam = 2; }
    else matchWinner=`Seri/Tidak ditentukan (${scoreLabel} sama)`;
    $("final-score-text").textContent = `${state.gamesT1} - ${state.gamesT2}`;
    $("match-winner-text").textContent = matchWinner; $("final-score-label").textContent = scoreLabel;
    const winnerNamesTarget = matchWinnerNamesEl || $("match-winner-names");
    if (winnerNamesTarget){
      if (winnerTeam){
        const names = formatTeamNames(winnerTeam);
        if (names){ winnerNamesTarget.textContent = names; winnerNamesTarget.classList.remove('hidden'); }
        else { winnerNamesTarget.textContent=''; winnerNamesTarget.classList.add('hidden'); }
      } else {
        winnerNamesTarget.textContent='';
        winnerNamesTarget.classList.add('hidden');
      }
    }
    try{
      const courtArrForNext = (window.roundsByCourt?.[tsCtx.court] || []);
      const nextData = courtArrForNext[(tsCtx.round ?? -1) + 1] || null;
      updateNextMatchInfo(tsCtx.court, tsCtx.round, nextData);
    }catch{}
    if (matchResultsModal){ matchResultsModal.classList.remove('hidden'); matchResultsModal.classList.add('flex'); }
    // Persist back to round if available
    try{
      if (tsCtx.court!=null && tsCtx.round!=null){
        const r = (roundsByCourt?.[tsCtx.court]||[])[tsCtx.round];
        if (r){
          try{ r.__scoringMode = state.scoringMode; }catch{}
          if (state.isRecalcMode && state.pendingClearScore){
            r.scoreA = '';
            r.scoreB = '';
            try{ delete r.finishedAt; delete r.startedAt; }catch{}
          } else {
            r.scoreA = String(state.gamesT1);
            r.scoreB = String(state.gamesT2);
            if (!state.isRecalcMode) r.finishedAt = new Date().toISOString();
          }
          // If finishing Match 1, ensure scoring mode is saved for the court
          try{ if (!state.isRecalcMode && tsCtx.round === 0) setCourtScoringMode(tsCtx.court, state.scoringMode); }catch{}
        }
        if (typeof markDirty==='function') markDirty();
        if (typeof renderAll==='function') renderAll();
        if (typeof computeStandings==='function') computeStandings();
        try{ window.__suppressCloudUntil = Date.now() + 2500; }catch{}
        try{
          if (typeof maybeAutoSaveCloud==='function') await maybeAutoSaveCloud();
          else if (typeof saveStateToCloud==='function') await saveStateToCloud();
        }catch{}

        // Inline update current table row fields without waiting for full re-render
        try {
          document.querySelectorAll(`.rnd-table tbody tr[data-index="${tsCtx.round}"]`).forEach(row=>{
            const aInp = row.querySelector('.rnd-scoreA input');
            const bInp = row.querySelector('.rnd-scoreB input');
            if (state.isRecalcMode && state.pendingClearScore){
              if (aInp) aInp.value = '';
              if (bInp) bInp.value = '';
            } else {
              if (aInp) aInp.value = String(state.gamesT1);
              if (bInp) bInp.value = String(state.gamesT2);
            }
            const actions = row.querySelector('.rnd-col-actions');
            const live = actions?.querySelector('.live-badge');
            const done = actions?.querySelector('.done-badge');
            if (state.isRecalcMode && state.pendingClearScore){
              if (live) live.classList.add('hidden');
              if (done) done.classList.add('hidden');
              const btn = actions?.querySelector('button');
              if (btn){ btn.textContent='Mulai Main'; btn.classList.remove('hidden'); }
            } else {
              if (live) { live.classList.add('fade-out'); setTimeout(()=>{ live.classList.add('hidden'); live.classList.remove('fade-out'); },150); }
              if (done) { done.classList.remove('hidden'); done.classList.add('fade-in'); setTimeout(()=>done.classList.remove('fade-in'),200); }
              const btn = actions?.querySelector('button');
              if (btn){ btn.textContent='Hitung Ulang'; btn.classList.remove('hidden'); }
            }
            // Show "Hitung Ulang" for owner only after finished
            const btn = actions?.querySelector('button');
            const allowRecalc = (typeof window.isOwnerNow === 'function') ? window.isOwnerNow() : !!window._isOwnerUser;
            if (btn){
              btn.textContent = 'Hitung Ulang';
              btn.disabled = false;
              btn.classList.remove('opacity-50','cursor-not-allowed');
              btn.classList.toggle('hidden', !allowRecalc);
            }
          });
        } catch {}
        // Post-finish actions: add Next Match button (normal mode only) and restyle close button
        try {
          if (!state.isRecalcMode && matchResultsModal){
            const modalBox = matchResultsModal.querySelector('.bg-white.rounded-xl');
            const closeBtn = modalBox?.querySelector('#new-match-btn');
            // Ensure next button exists and wired
            let nextBtn = modalBox?.querySelector('#next-match-btn');
            if (!nextBtn){
              nextBtn = document.createElement('button');
              nextBtn.id = 'next-match-btn';
              nextBtn.className = 'w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg';
              nextBtn.textContent = 'Lanjut ke Match Berikutnya';
              if (closeBtn && closeBtn.parentNode){
                closeBtn.parentNode.insertBefore(nextBtn, closeBtn);
                const spacer = document.createElement('div'); spacer.className = 'h-3'; closeBtn.parentNode.insertBefore(spacer, closeBtn);
              } else if (modalBox){
                modalBox.appendChild(nextBtn);
              }
              nextBtn.addEventListener('click', async ()=>{
                try{ if (typeof loadStateFromCloudSilent==='function') await loadStateFromCloudSilent(); }catch{}
                try{
                  const c = tsCtx.court||0; const next = (tsCtx.round||0)+1;
                  const courtArr = roundsByCourt?.[c]||[];
                  if (!courtArr[next]){ tsShowToast('Tidak ada match berikutnya di lapangan ini', 'warning'); return; }
                  if (matchResultsModal) { matchResultsModal.classList.add('hidden'); matchResultsModal.classList.remove('flex'); }
                  openScoreModal(c, next);
                }catch{}
              });
            }
            // Restyle close button to gray + label
            if (closeBtn){
              // Determine if there is a next match; if none, show only a single close button
              const c = tsCtx.court||0; const next = (tsCtx.round||0)+1;
              const courtArr = roundsByCourt?.[c]||[];
              const hasNext = !!courtArr[next];
              const nb = modalBox?.querySelector('#next-match-btn');
              const note = modalBox?.querySelector('#event-finished-note');
              if (!hasNext){
                if (nb) nb.classList.add('hidden');
                closeBtn.textContent = 'Tutup';
                closeBtn.className = 'w-full py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg';
                if (note) note.classList.remove('hidden');
              } else {
                if (nb) nb.classList.remove('hidden');
                closeBtn.textContent = 'Tidak, nanti dulu';
                closeBtn.className = 'w-full py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg';
                if (note) note.classList.add('hidden');
              }
            }
          }
        } catch {}
      }
    }catch{}
    updateDisplay();
  }
  function resetMatch(hideModals=true, fullReset=false){
    if (fullReset){ if (state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval=null; } state.timerSeconds=getRoundMinutes()*60; state.isMatchRunning=false; }
    state.scoreT1=0; state.scoreT2=0; state.gamesT1=0; state.gamesT2=0; state.isDeuce=false; state.isAdvantageT1=false; state.isAdvantageT2=false; state.currentPlayerServer=1; state.isMatchFinished=false;
    state.gameWinPending=false;
    if (fullReset){ setStartButtonLabel(); startMatchBtn.classList.remove('bg-red-600','hover:bg-red-700','shadow-red-500/50'); startMatchBtn.classList.add('bg-indigo-600','hover:bg-indigo-700','shadow-indigo-500/50'); }
    if (hideModals){ $("game-won-modal").classList.add('hidden'); $("match-results-modal").classList.add('hidden'); $("action-confirm-modal").classList.add('hidden'); }
    if (matchWinnerNamesEl){ matchWinnerNamesEl.textContent=''; matchWinnerNamesEl.classList.add('hidden'); }
    if (nextMatchInfoEl) nextMatchInfoEl.classList.add('hidden');
    if (nextMatchPlayersEl) nextMatchPlayersEl.textContent='';
    if (nextMatchTimeEl){ nextMatchTimeEl.textContent=''; nextMatchTimeEl.classList.add('hidden'); }
    if (!state.isMatchRunning && !state.isMatchFinished){ statusMessage.textContent='Pilih mode skor dan tekan Mulai Pertandingan.'; statusMessage.className='text-center text-gray-500 mt-2 text-sm'; }
    updateDisplay();
  }

  function showOverlay(){ ensureOverlay(); document.getElementById('tsOverlay').classList.remove('hidden'); document.getElementById('tsOverlay').classList.add('flex'); }
  function hideOverlay(){ const o=document.getElementById('tsOverlay'); if (!o) return; o.classList.add('hidden'); o.classList.remove('flex'); }

  function fillPlayersFromRound(courtIdx, roundIdx){
    let p1='P1', p2='P2', p3='P3', p4='P4';
    try{
      const r = (window.roundsByCourt?.[courtIdx]||[])[roundIdx] || {};
      p1 = r.a1 || p1; p2 = r.a2 || p2; p3 = r.b1 || p3; p4 = r.b2 || p4;
    }catch{}
    // Fallback: read from visible court table row if present
    try{
      const row = document.querySelector(`.rnd-table tbody tr[data-index="${roundIdx}"]`);
      if (row){
        const selA1 = row.querySelector('.rnd-teamA-1 select');
        const selA2 = row.querySelector('.rnd-teamA-2 select');
        const selB1 = row.querySelector('.rnd-teamB-1 select');
        const selB2 = row.querySelector('.rnd-teamB-2 select');
        if (selA1 && selA1.value) p1 = selA1.value;
        if (selA2 && selA2.value) p2 = selA2.value;
        if (selB1 && selB1.value) p3 = selB1.value;
        if (selB2 && selB2.value) p4 = selB2.value;
      }
    }catch{}
    // Apply to overlay UI and server mapping (Team A = P1/P2, Team B = P3/P4)
    try{
      if (player1NameEl) player1NameEl.textContent = p1 || '-';
      if (player2NameEl) player2NameEl.textContent = p2 || '-';
      if (player3NameEl) player3NameEl.textContent = p3 || '-';
      if (player4NameEl) player4NameEl.textContent = p4 || '-';
      playerDetails[1].name = p1 || 'P1';
      playerDetails[2].name = p2 || 'P2';
      playerDetails[3].name = p3 || 'P3';
      playerDetails[4].name = p4 || 'P4';
    }catch{}
  }

  // ===== Public API (shim old name) ===== //
  window.openScoreModal = function(courtIdx, roundIdx){
    tsCtx.court = courtIdx; tsCtx.round = roundIdx; ensureOverlay(); resetMatch(true,true);
    // Use saved scoring mode if desired; default stays as current
    if (modeSelectorEl) modeSelectorEl.value = state.scoringMode;
    try{ if (tsTitleEl) tsTitleEl.textContent = `Lapangan ${String((courtIdx||0)+1)} • Match ${String((roundIdx||0)+1)}`; }catch{}
    try{ updateScheduledLabel(roundIdx); }catch{}
    try{
      if (matchWinnerNamesEl){ matchWinnerNamesEl.textContent=''; matchWinnerNamesEl.classList.add('hidden'); }
      if (nextMatchInfoEl) nextMatchInfoEl.classList.add('hidden');
      if (nextMatchPlayersEl) nextMatchPlayersEl.textContent='';
      if (nextMatchTimeEl){ nextMatchTimeEl.textContent=''; nextMatchTimeEl.classList.add('hidden'); }
    }catch{}
    try{ if (timerDisplayEl) timerDisplayEl.textContent = formatTime(getRoundMinutes()*60); }catch{}
    setStartButtonLabel();
    // Detect recalc (finished/have score) and prefill totals from court
    try{
      const r = (roundsByCourt?.[courtIdx]||[])[roundIdx] || {};
      const hasScore = (r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '') || (r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '');
      const isFinished = !!r.finishedAt;
      if (hasScore || isFinished){
        // Open in recalc mode: no timer, edit totals only
        state.isRecalcMode = true;
        state.isMatchRunning = false; state.isMatchFinished = false; state.gameWinPending = false;
        const savedMode = getCourtScoringMode?.(courtIdx) || r.__scoringMode || state.scoringMode || 'RALLY';
        state.scoringMode = savedMode;
        if (modeSelectorEl){ modeSelectorEl.value = savedMode; modeSelectorEl.disabled = true; modeSelectorEl.classList.add('disabled-select'); }
        state.gamesT1 = Number(r.scoreA || 0); state.gamesT2 = Number(r.scoreB || 0); state.pendingClearScore = false;
        // Hide start button and set timer text
        if (startMatchBtn) startMatchBtn.classList.add('hidden');
        if (timerDisplayEl) timerDisplayEl.textContent = 'Permainan Selesai';
        if (finishBtnEl) finishBtnEl.textContent = 'Simpan Perubahan';
        try{ if (statusMessage) statusMessage.classList.add('hidden'); }catch{}
        try{ document.querySelectorAll('#tsOverlay button[data-delta="-1"]').forEach(b=>b.classList.remove('hidden')); }catch{}
        try{ if (forceResetBtnEl) forceResetBtnEl.classList.remove('hidden'); }catch{}
      } else {
        // Normal mode: allow start (but lock mode for match > 1)
        state.isRecalcMode = false;
        // Enforce court scoring mode from Match 1 on subsequent matches
        try{
          const isSubsequent = (roundIdx||0) > 0;
          const savedCourt = getCourtScoringMode(courtIdx);
          const roundSaved = r.__scoringMode || null;
          if (isSubsequent){
            const mode = savedCourt || roundSaved || state.scoringMode;
            state.scoringMode = mode;
            if (modeSelectorEl){ modeSelectorEl.value = mode; modeSelectorEl.disabled = true; modeSelectorEl.classList.add('disabled-select'); }
          } else {
            // Match 1: if sudah ditentukan sebelumnya, pakai mode tersebut
            const mode = savedCourt || roundSaved;
            if (mode){
              state.scoringMode = mode;
              if (modeSelectorEl){ modeSelectorEl.value = mode; modeSelectorEl.disabled = true; modeSelectorEl.classList.add('disabled-select'); }
            } else {
              if (modeSelectorEl){ modeSelectorEl.disabled = false; modeSelectorEl.classList.remove('disabled-select'); }
            }
          }
        }catch{}
        if (startMatchBtn) startMatchBtn.classList.remove('hidden');
        if (finishBtnEl) finishBtnEl.textContent = 'Selesai & Lihat Hasil Pertandingan';
        try{ if (statusMessage) statusMessage.classList.remove('hidden'); }catch{}
        try{ document.querySelectorAll('#tsOverlay button[data-delta="-1"]').forEach(b=>b.classList.add('hidden')); }catch{}
        try{ if (forceResetBtnEl) forceResetBtnEl.classList.add('hidden'); }catch{}
      }
    }catch{}
    fillPlayersFromRound(courtIdx, roundIdx);
    showOverlay(); updateDisplay();
  };
  window.closeScoreModal = function(){ hideOverlay(); };
})();

