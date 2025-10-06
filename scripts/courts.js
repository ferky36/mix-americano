"use strict";
// ================== COURT ================== //
function renderCourt(container, arr) {
  const start = byId("startTime").value || "19:00";
  const minutes = parseInt(byId("minutesPerRound").value || "12", 10);
  const R = parseInt(byId("roundCount").value || "10", 10);
  const [h, m] = start.split(":").map(Number);
  const base = new Date();
  base.setHours(h || 19, m || 0, 0, 0);

  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "court-wrapper overflow-x-auto";

  const table = document.createElement("table");
  table.className = "min-w-full text-sm dark-table";
  table.classList.add("rnd-table"); // ⬅️ aktifkan card-mode di HP
  table.innerHTML = `
    <thead>
      <tr class="border-b border-gray-200 dark:border-gray-700">
        <th class="py-2 pr-4"></th>
        <th class="py-2 pr-4">Jadwal</th>
        <th class="py-2 pr-4">Waktu</th>
        <th class="py-2 pr-4">Player1A</th>
        <th class="py-2 pr-4">Player2A</th>
        <th class="py-2 pr-4">Player1B</th>
        <th class="py-2 pr-4">Player2B</th>
        <th class="py-2 pr-4">Skor Tim A</th>
        <th class="py-2 pr-4">Skor Tim B</th>
        <th class="py-2 pr-4">Action</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  const tbody = table.querySelector("tbody");

  for (let i = 0; i < R; i++) {
    const r = arr[i] || {
      a1: "", a2: "", b1: "", b2: "", scoreA: "", scoreB: ""
    };
    const t0 = new Date(base.getTime() + i * minutes * 60000);
    const t1 = new Date(t0.getTime() + minutes * 60000);

    const tr = document.createElement("tr");
    tr.className =
      "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40";
    tr.draggable = !isViewer();
    tr.dataset.index = i;
    tr.addEventListener("dragstart", (e) => {
      if (isViewer()) { e.preventDefault(); return; }
      tr.classList.add("row-dragging");
      e.dataTransfer.setData("text/plain", String(i));
    });
    tr.addEventListener("dragend", () => tr.classList.remove("row-dragging"));
    tr.addEventListener("dragover", (e) => {
      if (isViewer()) { e.preventDefault(); return; }
      e.preventDefault();
      tr.classList.add("row-drop-target");
    });
    tr.addEventListener("dragleave", () =>
      tr.classList.remove("row-drop-target")
    );
    tr.addEventListener("drop", (e) => {
      if (isViewer()) { e.preventDefault(); return; }
      e.preventDefault();
      tr.classList.remove("row-drop-target");
      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = Number(tr.dataset.index);
      if (isNaN(from) || isNaN(to) || from === to) return;
      const item = arr.splice(from, 1)[0];
      arr.splice(to, 0, item);
      markDirty();
      renderAll();
    });

    // === handle / index
    const tdHandle = document.createElement("td");
    tdHandle.textContent = "≡";
    tdHandle.className = "py-2 pr-4 text-gray-400 rnd-col-drag";
    // Clean handle icon override
    try { tdHandle.textContent = "☰"; } catch {}
    tdHandle.style.cursor = "grab";
    tr.appendChild(tdHandle);

    const tdIdx = document.createElement("td");
    tdIdx.textContent = "Match " + (i + 1);
    tdIdx.className = "py-2 pr-4 font-medium"; 
    tdIdx.classList.add("rnd-col-round", "text-center");
    tdIdx.dataset.label = "Match";
    tr.appendChild(tdIdx);

    // === Waktu (Start–End)
    const tdTime = document.createElement("td");
    tdTime.textContent = `${roundStartTime(i)}–${roundEndTime(i)}`;
    tdTime.className = "py-2 pr-4";
    tdTime.classList.add("rnd-col-time", "text-center");
    tdTime.dataset.label = "Waktu";
    // Override time separator to en dash
    try { tdTime.textContent = `${roundStartTime(i)}–${roundEndTime(i)}`; } catch {}
    tr.appendChild(tdTime);

    // helper: select pemain
    function selCell(k, label, extraClass) {
      const td = document.createElement("td");
      td.dataset.label = label;
      if (extraClass) td.classList.add(extraClass);

      const sel = document.createElement("select");
      sel.className =
        "border rounded-lg px-2 py-1 min-w-[6rem] max-w-[7rem] sm:max-w-[10rem] bg-white dark:bg-gray-900 dark:border-gray-700";
      // Reset placeholder option to a clean dash
      try { sel.innerHTML = ''; sel.appendChild(new Option('-', '')); } catch {}
      sel.appendChild(new Option("—", ""));
      players.forEach((p) => sel.appendChild(new Option(p, p)));
      sel.value = r[k] || "";
      sel.disabled = isViewer();
      sel.addEventListener("change", (e) => {
        arr[i] = { ...arr[i], [k]: e.target.value };
        markDirty();
        validateAll();
        computeStandings();
        refreshFairness();
      });
      td.appendChild(sel);
      return td;
    }

    // helper: input skor (tetap dikunci; isi dari modal hitung)
    function scCell(k, label, cls){
      const td = document.createElement('td');
      td.dataset.label = label;
      if (cls) td.classList.add(cls);

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.autocomplete = 'off';
      inp.pattern = '[0-9]*';
      inp.maxLength = (typeof SCORE_MAXLEN!=='undefined' ? SCORE_MAXLEN : 3);
      inp.className = 'border rounded-lg px-2 py-1 w-[3.5rem] sm:w-[4.5rem] bg-white dark:bg-gray-900 dark:border-gray-700';
      inp.disabled = true;                       // ⬅️ hanya dari modal
      inp.value = onlyDigits(r[k] || '');

      inp.addEventListener('keydown', (e)=>{ if (!allowKey(e)) e.preventDefault(); });
      inp.addEventListener('input', (e)=>{
        const clean = onlyDigits(e.target.value).slice(0, inp.maxLength);
        if (e.target.value !== clean) e.target.value = clean;
        arr[i] = { ...arr[i], [k]: clean };
        markDirty(); validateAll(); computeStandings();
      });
      inp.addEventListener('paste', (e)=>{
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const clean = onlyDigits(text).slice(0, inp.maxLength);
        document.execCommand('insertText', false, clean);
      });
      inp.addEventListener('drop', (e)=> e.preventDefault());
      inp.addEventListener('blur', ()=>{
        if (inp.value === '') inp.value = '0';
        arr[i] = { ...arr[i], [k]: inp.value };
        markDirty(); validateAll(); computeStandings();
      });

      td.appendChild(inp);
      return td;
    }

    // === Tim A | Tim B (urut: A1 | B1, A2 | B2)
    const tdA1 = selCell("a1", "TIM A", "rnd-teamA-1");
    const tdA2 = selCell("a2", " ", "rnd-teamA-2");
    const tdB1 = selCell("b1", "TIM B", "rnd-teamB-1");
    const tdB2 = selCell("b2", " ", "rnd-teamB-2");

    tr.appendChild(tdA1);
    tr.appendChild(tdA2);
    tr.appendChild(tdB1);
    tr.appendChild(tdB2);

    // === Skor Tim A | Tim B
    const tdSA = scCell("scoreA","Skor"); tdSA.classList.add("rnd-scoreA");
    const tdSB = scCell("scoreB","Skor"); tdSB.classList.add("rnd-scoreB");

    tr.appendChild(tdSA);
    tr.appendChild(tdSB);

    // Viewer mode: tampilkan kolom indikator (Live/Selesai) saja, tanpa tombol aksi
    if (isViewer() && !isScoreOnlyMode()) {
      const tdCalcV = document.createElement('td');
      tdCalcV.dataset.label = 'Aksi';
      tdCalcV.className = 'rnd-col-actions';
      // badge Live
      const liveV = document.createElement('span');
      liveV.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white live-badge';
      liveV.textContent = 'Live';
      if (!(r.startedAt && !r.finishedAt)) liveV.classList.add('hidden');
      tdCalcV.appendChild(liveV);
      // badge Selesai
      const doneV = document.createElement('span');
      doneV.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-gray-600 text-white done-badge';
      doneV.textContent = 'Selesai';
      if (!r.finishedAt) doneV.classList.add('hidden');
      tdCalcV.appendChild(doneV);

      tr.appendChild(tdCalcV);
      tbody.appendChild(tr);
      // Tambahkan baris jeda juga di mode viewer (agar waktu jeda terlihat)
      const _showBreakEl = byId('showBreakRows');
      const showBreak = true; // paksa tampil di viewer
      const brkMin = parseInt(byId('breakPerRound').value || '0', 10);
      if (showBreak && brkMin > 0 && i < R-1) {
        const trBreak = document.createElement('tr');
        trBreak.className = 'text-xs text-gray-500 dark:text-gray-400 rnd-break-row';
        const tdBreak = document.createElement('td');
        const fullCols = table.querySelector('thead tr').children.length;
        tdBreak.colSpan = fullCols;
        tdBreak.className = 'py-1 text-center opacity-80';
        try { tdBreak.textContent = `Jeda ${brkMin}:00 - Next ${roundStartTime(i+1)}`; } catch {}
        tdBreak.textContent = `Jeda ${brkMin}:00 - Next ${roundStartTime(i+1)}`;
        trBreak.appendChild(tdBreak);
        try { tdBreak.textContent = `Jeda ${brkMin}:00 - Next ${roundStartTime(i+1)}`; } catch {}
        tbody.appendChild(trBreak);
      }
      // lanjut ke ronde berikutnya tanpa tombol aksi
      continue;
    }


    // === tombol Hitung (aksi)
    const tdCalc = document.createElement('td');
    tdCalc.dataset.label = 'Aksi';
    tdCalc.className = 'rnd-col-actions';
    // Live & Done badges
    const live = document.createElement('span');
    live.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white live-badge';
    live.textContent = 'Live';
    if (!(r.startedAt && !r.finishedAt)) live.classList.add('hidden');
    tdCalc.appendChild(live);
    const done = document.createElement('span');
    done.className = 'inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs bg-gray-600 text-white done-badge';
    done.textContent = 'Selesai';
    if (!r.finishedAt) done.classList.add('hidden');
    tdCalc.appendChild(done);
    const btnCalc = document.createElement('button');
    btnCalc.className = 'px-3 py-1.5 rounded-lg border dark:border-gray-700 text-sm w-full sm:w-auto';
    btnCalc.textContent = (r.scoreA || r.scoreB) ? '🔁 Hitung Ulang' : '🧮 Mulai Main';
    btnCalc.addEventListener('click', ()=> openScoreModal(activeCourt, i));
    // Clean label override
    try { btnCalc.textContent = (r.scoreA || r.scoreB) ? 'Hitung Ulang' : 'Mulai Main'; } catch {}
    tdCalc.appendChild(btnCalc);
    tr.appendChild(tdCalc);
    // Override visibility/label for table action button based on role and view mode
    try {
      const hasScore = (r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '') || (r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '');
      const allowStart = (typeof canEditScore === 'function') ? canEditScore() : !isViewer();
      const allowRecalc = (typeof isOwnerNow==="function") ? isOwnerNow() : !!window._isOwnerUser; // only owner can recalc
      if (hasScore) {
        btnCalc.textContent = 'Hitung Ulang';
        if (!allowRecalc) btnCalc.classList.add('hidden');
      } else {
        const started = !!r.startedAt;
        if (!allowStart || started) {
          btnCalc.classList.add('hidden');
        } else if (canStartRoundBySequence(activeCourt, i)) {
          btnCalc.textContent = 'Mulai Main';
          btnCalc.disabled = false;
          btnCalc.classList.remove('opacity-50','cursor-not-allowed');
        } else {
          btnCalc.textContent = 'Incoming Match';
          btnCalc.disabled = true;
          btnCalc.classList.add('opacity-50','cursor-not-allowed');
          btnCalc.classList.remove('hidden');
        }
      }
    } catch {}

    tbody.appendChild(tr);

    // === Baris jeda (opsional)
    // Viewer: paksa tampil (abaikan toggle) agar jeda tetap terlihat sesuai setelan menit/jeda
    const _showBreakEl = byId('showBreakRows');
    const showBreak = isViewer() ? true : (_showBreakEl?.checked);
    const brkMin = parseInt(byId('breakPerRound').value || '0', 10);
    if (showBreak && brkMin > 0 && i < R-1) {
      const trBreak = document.createElement('tr');
      trBreak.className = 'text-xs text-gray-500 dark:text-gray-400 rnd-break-row';
      const tdBreak = document.createElement('td');
      const fullCols = table.querySelector('thead tr').children.length;
      tdBreak.colSpan = fullCols;
      tdBreak.className = 'py-1 text-center opacity-80';
      // Clean break text override
      try { tdBreak.textContent = `Jeda ${brkMin}:00 • Next ${roundStartTime(i+1)}`; } catch {}
      tdBreak.textContent = `🕒 Jeda ${brkMin}:00 • Next ${roundStartTime(i+1)}`;
      trBreak.appendChild(tdBreak);
      // Force clean break text (override any garbled replacements)
      try { tdBreak.textContent = `Jeda ${brkMin}:00 • Next ${roundStartTime(i+1)}`; } catch {}
      tbody.appendChild(trBreak);
    }
  }

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}


function renderCourtActive(){
  ensureRoundsLengthForAllCourts();
  const container = byId('courtContainer');
  container.innerHTML = '';
  const arr = roundsByCourt[activeCourt] || [];
  renderCourt(container, arr);  // gunakan fungsi renderCourt Anda yang sudah ada
}
