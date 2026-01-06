"use strict";

// Match Recap: builds a quick summary from current UI/locals (no Supabase fetch)
(function(){
  const t = (k,f)=> (window.__i18n_get ? __i18n_get(k,f) : f);
  function byId(id){ return document.getElementById(id); }

  function ensureRecapButton(){
    const standings = byId('standings');
    if (!standings) return;
    const hostSection = standings.closest('section') || standings.parentElement;
    if (!hostSection) return;

    if (byId('btnMatchRecap')) return; // already inserted

    const wrap = document.createElement('div');
    wrap.className = 'mt-4 flex items-center justify-end';

    const btn = document.createElement('button');
    btn.id = 'btnMatchRecap';
    btn.className = 'recap-btn';
    btn.textContent = t('recap.button','Match Recap');
    btn.addEventListener('click', openRecapModal);
    wrap.appendChild(btn);

    hostSection.appendChild(wrap);
  }

  async function openRecapModal(){
    // Ensure insight templates are loaded before first render
    try { await loadInsightTemplates?.(); } catch {}

    const modal = buildModalShell();
    document.body.appendChild(modal.backdrop);
    modal.backdrop.offsetHeight; // force reflow for animation
    modal.backdrop.classList.add('open');

    const content = buildRecapContent();
    modal.content.innerHTML = '';
    modal.content.appendChild(content);
  }

  function closeRecapModal(){
    const el = byId('matchRecapOverlay');
    if (!el) return;
    el.classList.remove('open');
    setTimeout(()=> el.remove(), 150);
  }

  function buildModalShell(){
    const overlay = document.createElement('div');
    overlay.id = 'matchRecapOverlay';
    overlay.className = 'recap-overlay';

    const panel = document.createElement('div');
    panel.className = 'recap-panel';

    const header = document.createElement('div');
    header.className = 'recap-header';
    const title = document.createElement('div');
    title.className = 'recap-title';
    title.innerHTML = `<div class="text-xs uppercase tracking-wide text-indigo-100 mb-1">${t('recap.summary','Rangkuman')}</div><div class="text-lg font-bold text-white">${t('recap.button','Match Recap')}</div>`;
    const actions = document.createElement('div');
    actions.className = 'recap-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'recap-action';
    saveBtn.innerHTML = `<span>💾</span><span>${t('recap.saveImage','Simpan gambar')}</span>`;
    saveBtn.addEventListener('click', ()=> saveRecapAsImage());
    const copyBtn = document.createElement('button');
    copyBtn.className = 'recap-action';
    copyBtn.innerHTML = `<span>📋</span><span>${t('recap.copyText','Salin teks')}</span>`;
    copyBtn.addEventListener('click', copyRecapText);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'recap-action';
    closeBtn.innerHTML = `<span>✕</span><span>${t('recap.close','Tutup')}</span>`;
    closeBtn.addEventListener('click', closeRecapModal);
    actions.appendChild(saveBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(actions);

    const body = document.createElement('div');
    body.className = 'recap-body';

    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);

    overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closeRecapModal(); });

    return { backdrop: overlay, content: body };
  }

  function textFrom(el){ return (el?.textContent || '').trim(); }

  function buildRecapContent(){
    const root = document.createElement('div');

    // Collect data
    const matches = collectMatches().map(m=>{
      const saN = Number(m.sa||0), sbN = Number(m.sb||0);
      const margin = Math.abs(saN - sbN);
      const winner = saN===sbN ? 'D' : (saN>sbN?'A':'B');
      return {...m, saN, sbN, margin, winner};
    });

    // Standings snapshot (from DOM table)
    const standingsEl = byId('standings');
    const standingRows = [...(standingsEl?.querySelectorAll('tbody tr') || [])];
    const standings = standingRows.map(tr => {
      const t = [...tr.children].map(td => textFrom(td));
      const rank = Number(t[0]||0);
      const player = t[1]||'';
      const pf = Number(t[2]||0);
      const diff = Number(t[3]||0);
      const w = Number(t[4]||0), l = Number(t[5]||0), d = Number(t[6]||0);
      const gp = w+l+d;
      const pa = pf - diff;
      return {rank, player, gp, w, l, pf, pa, diff};
    }).filter(x=>x.player);

    // Header title
    const courtNo = (typeof activeCourt !== 'undefined') ? (Number(activeCourt)+1) : (Number(window.activeCourt||0)+1);
    const headerTitle = t('recap.header','Rekap Pertandingan - Lapangan {court}').replace('{court}', courtNo).replace('{title}', textFrom(byId('appTitle')) || 'Match Recap').replace('{courtNo}', courtNo);
    const hdr = document.createElement('div');
    hdr.className = 'recap-titlebar';
    hdr.textContent = headerTitle;
    root.appendChild(hdr);

    // Stat cards
    const totalMatch = matches.length;
    const totalPoint = matches.reduce((s,m)=>s+m.saN+m.sbN,0);
    const avgMargin = totalMatch ? (matches.reduce((s,m)=>s+m.margin,0)/totalMatch) : 0;
    const tight = matches.length ? matches.slice().sort((a,b)=>a.margin-b.margin || a.round-b.round)[0] : null;
    const cards = document.createElement('div');
    cards.className = 'recap-cards';
    const tightLabel = tight ? t('recap.tightLabel','Match {round} ({teamA} vs {teamB})').replace('{round}', tight.round).replace('{teamA}', tight.teamA).replace('{teamB}', tight.teamB || '-') : t('recap.empty','Belum ada data.');
    cards.innerHTML = `
      ${cardMetric(totalMatch, t('recap.metric.totalMatch','Total Match'), t('recap.metric.totalMatchHint','Berapa banyak laga sudah dimainkan.'))}
      ${cardMetric(totalPoint, t('recap.metric.totalPoint','Total Poin'), t('recap.metric.totalPointHint','Akumulasi poin semua match (A+B).'))}
      ${cardMetric(avgMargin.toFixed(1), t('recap.metric.avgMargin','Rata Selisih'), t('recap.metric.avgMarginHint','Rata-rata margin skor per match.'))}
      ${tight ? cardMetric(`${tight.saN}–${tight.sbN}`, t('recap.metric.tight','Paling Ketat'), t('recap.metric.tightHint','Terketat: {label}').replace('{label}', tightLabel)) : cardMetric('-', t('recap.metric.tight','Paling Ketat'), t('recap.metric.wait','Menunggu skor terisi.'))}
    `;
    root.appendChild(cards);

    // Two-column layout
    const grid = document.createElement('div');
    grid.className = 'recap-grid';

    const left = document.createElement('div');
    left.className = 'recap-col-left';
    left.appendChild(sectionTitle(t('recap.section.matches','Jalannya Pertandingan')));
    const matchWrap = document.createElement('div');
    matchWrap.className = 'recap-match-wrap';

    if (!matches.length){
      const empty = document.createElement('div');
      empty.className = 'recap-empty';
      empty.innerHTML = `<div class="font-semibold mb-1">${t('recap.noScoreTitle','Belum ada skor yang tercatat')}</div><div class="text-sm text-gray-600">${t('recap.noScoreDesc','Masukkan skor dulu agar recap terisi otomatis.')}</div>`;
      matchWrap.appendChild(empty);
    } else {
      matches.forEach(m=> matchWrap.appendChild(matchCard(m)));
    }
    left.appendChild(matchWrap);

    const right = document.createElement('div');
    right.className = 'recap-col-right';
    right.appendChild(sectionTitle(t('recap.section.standings','Klasemen Pemain')));
    right.appendChild(standingsTable(standings));
    right.appendChild(sectionTitle(t('recap.section.rules','Aturan Ranking')));
    right.appendChild(rankingRules());

    grid.appendChild(left);
    grid.appendChild(right);

    root.appendChild(grid);

    // bottom: full-width notes/insight
    root.appendChild(notesFull(matches, avgMargin, standings));

    // footer last updated
    const ft = document.createElement('div');
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    ft.className = 'recap-updated';
    ft.textContent = t('recap.updated','Dihasilkan dari Data Pertandingan', `${hh}:${mm}`);
    root.appendChild(ft);

    return root;
  }

  function cardMetric(value, label){
    return `<div class="recap-card"><div class="recap-card-val">${escapeHtml(String(value))}</div><div class="recap-card-label">${escapeHtml(label)}</div></div>`;
  }

  function sectionTitle(txt){
    const el = document.createElement('div');
    el.className = 'recap-section-title';
    el.textContent = txt;
    return el;
  }

  function matchCard(m){
    const el = document.createElement('div');
    el.className = 'recap-match-card';
    const winnerTxt = m.winner==='A' ? t('recap.winA','Menang: Team A') : m.winner==='B' ? t('recap.winB','Menang: Team B') : t('recap.draw','Seri');
    const badgeClass = m.winner==='A' ? 'badge-a' : m.winner==='B' ? 'badge-b' : 'badge-d';
    const matchLabel = t('recap.matchLabel','Match {round}').replace('{round}', m.round);
    const courtLabel = t('recap.courtLabel','Court {court}').replace('{court}', m.court);
    const timeLabel = escapeHtml(m.time || '');
    const teamALabel = t('recap.teamA','Team A');
    const teamBLabel = t('recap.teamB','Team B');
    const vsLabel = t('recap.vs','vs');
    const marginLabel = t('recap.margin','Margin {value}').replace('{value}', m.margin);

    el.innerHTML = `
      <div class="rmc-top"><span>${escapeHtml(matchLabel)} • ${escapeHtml(courtLabel)}</span><span>${timeLabel}</span></div>
      <div class="rmc-mid">
      <div class="rmc-team-block"><div class="rmc-team-label label-a">${escapeHtml(teamALabel)}</div><div class="rmc-team">${escapeHtml(m.a1)} • ${escapeHtml(m.a2)}</div></div>
      <div class="rmc-vs">${escapeHtml(vsLabel)}</div>
      <div class="rmc-team-block right"><div class="rmc-team-label label-b">${escapeHtml(teamBLabel)}</div><div class="rmc-team">${escapeHtml(m.b1)} • ${escapeHtml(m.b2)}</div></div>
      </div>
      <div class="rmc-score"><div class="rmc-sa">${m.saN}</div><div class="rmc-sb">${m.sbN}</div></div>
      <div class="rmc-tags"><span class="rmc-badge ${badgeClass}">${winnerTxt}</span><span class="rmc-badge neutral">${escapeHtml(marginLabel)}</span></div>
    `;
    return el;
  }

  function standingsTable(rows){
    const wrap = document.createElement('div');
    wrap.className = 'recap-standings';
    const tbl = document.createElement('table');
    tbl.innerHTML = `
      <thead><tr>
        <th>${t('standings.rank','Rank')}</th>
        <th>${t('standings.player','Pemain')}</th>
        <th>${t('standings.total','Total')}</th>
        <th>${t('standings.diff','Selisih')}</th>
        <th>${t('standings.w','W')}</th>
        <th>${t('standings.l','L')}</th>
        <th>${t('standings.d','D')}</th>
        <th>${t('standings.winrate','WinRate')}</th>
      </tr></thead><tbody></tbody>`;
    const tbody = tbl.querySelector('tbody');
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      const diffCls = r.diff>0?'diff-pos':(r.diff<0?'diff-neg':'');
      const wrPct = (()=>{
        const gp = r.w + r.l + (r.d||0);
        return gp? ((r.w/gp)*100).toFixed(1)+'%' : '0.0%';
      })();
      const wrCls = parseFloat(wrPct) >= 70 ? 'wr-high' : (parseFloat(wrPct) <= 30 ? 'wr-low' : '');
      tr.innerHTML = `
        <td>${r.rank}</td>
        <td>${escapeHtml(r.player)}</td>
        <td>${r.pf}</td>
        <td class="${diffCls}">${r.diff}</td>
        <td>${r.w}</td>
        <td>${r.l}</td>
        <td>${r.d||0}</td>
        <td class="${wrCls}">${wrPct}</td>`;
      tbody.appendChild(tr);
    });
    wrap.appendChild(tbl);
    return wrap;
  }

  function rankingRules(){
    const div = document.createElement('div');
    div.className = 'recap-rules cardlike';
    div.innerHTML = `
      <ol>
        <li>${t('recap.rule.total','Total — poin total lebih tinggi berada di peringkat lebih atas.')}</li>
        <li>${t('recap.rule.diff','Selisih — jika Total sama, peringkat ditentukan oleh selisih skor (point for – point against).')}</li>
        <li>${t('recap.rule.win','Menang — jika Total & Selisih sama, dilihat jumlah kemenangan (W).')}</li>
        <li>${t('recap.rule.alphabet','Jika semua sama — diurutkan alfabetis nama pemain.')}</li>
      </ol>`;
    return div;
  }

  function notesFull(matches, avgMargin, standings){
    const wrap = document.createElement('div');
    wrap.className = 'recap-insight-section';

    const hdr = document.createElement('div');
    hdr.className = 'recap-insight-heading';
    const h1 = document.createElement('div');
    h1.className = 'rih-title';
    h1.textContent = t('analysis.title','Ulasan');
    const h2 = document.createElement('div');
    h2.className = 'rih-subtitle';
    h2.textContent = t('recap.subtitle','Analisis Performa & Strategi Pemain');
    hdr.appendChild(h1);
    hdr.appendChild(h2);
    const line = document.createElement('div');
    line.className = 'rih-line';
    hdr.appendChild(line);
    wrap.appendChild(hdr);

    const grid = document.createElement('div');
    grid.className = 'recap-insight-grid';

    grid.appendChild(buildTopRankingCard(standings, matches, avgMargin));
    grid.appendChild(buildPairingCard(standings));
    grid.appendChild(buildPairPerformanceCard(matches));
    grid.appendChild(buildSupportCard(standings));
    grid.appendChild(buildInsightCard(matches, avgMargin, standings));

    wrap.appendChild(grid);
    return wrap;
  }

  function buildTopRankingCard(standings, matches, avgMargin){
    const card = createInsightCard(t('recap.topPerformers','Performa Terbaik'), '🏆');
    const list = document.createElement('div');
    list.className = 'insight-player-list';
    const top = standings.slice().sort((a,b)=> a.rank-b.rank || b.pf-a.pf).slice(0,3);
    if (!top.length){
      list.appendChild(emptyInsightText());
    } else {
      top.forEach((p, idx)=>{
        const row = document.createElement('div');
        row.className = 'insight-player-row';
        if (idx===0) row.classList.add('is-lead');
        if (idx===2) row.classList.add('is-muted');
        const left = document.createElement('div');
        left.className = 'insight-player-info';
        const av = document.createElement('div');
        av.className = 'insight-avatar';
        av.textContent = (p.player||'?').trim().charAt(0).toUpperCase() || '?';
        left.appendChild(av);
        const meta = document.createElement('div');
        const nm = document.createElement('div'); nm.className='p-name'; nm.textContent = p.player;
        const statWin = document.createElement('div'); statWin.className='p-stat'; statWin.textContent = t('recap.winrate','WinRate {value}').replace('{value}', formatWinRate(p));
        const statDiff = document.createElement('div'); statDiff.className='p-stat p-stat-diff'; if (p.diff<0) statDiff.classList.add('neg'); statDiff.textContent = t('recap.diff','Selisih {value}').replace('{value}', `${p.diff>=0?'+':''}${p.diff}`);
        meta.appendChild(nm);
        meta.appendChild(statWin);
        meta.appendChild(statDiff);
        left.appendChild(meta);

        const score = document.createElement('div');
        score.className = 'insight-score';
        const main = document.createElement('div'); main.className='score-main'; main.textContent = p.pf;
        const sub = document.createElement('div'); sub.className='score-sub';
        if (p.diff>0){ sub.textContent = `↑ +${p.diff}`; sub.classList.add('pos'); }
        else if (p.diff<0){ sub.textContent = `↓ ${Math.abs(p.diff)}`; sub.classList.add('neg'); }
        else { sub.textContent = '0'; }
        score.appendChild(main); score.appendChild(sub);

        row.appendChild(left);
        row.appendChild(score);
        list.appendChild(row);
      });
    }
    card.appendChild(list);

    // const bulletWrap = document.createElement('div');
    // bulletWrap.className = 'top-performer-bullet';
    // const bulletIcon = document.createElement('span');
    // bulletIcon.className = 'tpb-icon';
    // bulletIcon.textContent = '✓';
    // const bulletText = document.createElement('span');
    // const bullet = generateInsights(matches||[], avgMargin||0, standings)[0] || 'Kontrol game tinggi. Cocok untuk pairing berat.';
    // bulletText.innerHTML = bullet;
    // bulletWrap.appendChild(bulletIcon);
    // bulletWrap.appendChild(bulletText);
    // card.appendChild(bulletWrap);
    return card;
  }

  function buildPairingCard(standings){
    const card = createInsightCard(t('recap.pair.recommend','Rekomendasi Pasangan'), '🤝');
    const wrap = document.createElement('div');
    wrap.className = 'insight-pairing-wrap';
    const lows = standings.filter(s=>s.diff<0).sort((a,b)=>a.diff-b.diff).slice(0,2);
    const highs = standings.filter(s=>s.diff>0).sort((a,b)=>b.diff-a.diff).slice(0,2);
    if (!lows.length || !highs.length){
      wrap.appendChild(emptyInsightText(t('recap.empty','Belum ada data.')));
    } else {
      lows.forEach((low, idx)=>{
        const high = highs[idx % highs.length];
        const box = document.createElement('div');
        box.className = 'pairing-box insight-pairing';
        const line = document.createElement('div');
        const lowSpan = document.createElement('span'); lowSpan.className='pair-low'; lowSpan.textContent = `${low.player} (WR ${formatWinRate(low)})`;
        const arrow = document.createElement('span'); arrow.className='pair-arrow'; arrow.textContent = t('recap.arrow','→');
        const highSpan = document.createElement('span'); highSpan.className='pair-high'; highSpan.textContent = `${high.player} (WR ${formatWinRate(high)})`;
        const reason = document.createElement('span'); reason.className='reason';
        reason.textContent = t('recap.balance','Menyeimbangkan selisih {low} ke {high}')
          .replace('{low}', low.diff)
          .replace('{high}', `${high.diff>=0?'+':''}${high.diff}`);
        line.appendChild(lowSpan); line.appendChild(arrow); line.appendChild(highSpan); line.appendChild(reason);
        box.appendChild(line);
        wrap.appendChild(box);
      });
    }
    card.appendChild(wrap);
    return card;
  }

  function buildPairPerformanceCard(matches){
    const card = createInsightCard(t('recap.pair.performance','Performa Pasangan'), '🔀');
    const list = document.createElement('div');
    list.className = 'pair-perf-list';
    const agg = aggregatePairs(matches);
    const best = agg.slice().sort((a,b)=> (b.pf - a.pf) || (b.diff - a.diff))[0];
    const worst = agg.slice().sort((a,b)=> (a.diff - b.diff) || (a.pf - b.pf))[0]; // paling buruk: selisih paling negatif, lalu total poin terendah
    if (!agg.length){
      list.appendChild(emptyInsightText(t('recap.empty','Belum ada data.')));
    } else {
      if (best) list.appendChild(pairPerfRow(best, t('recap.pair.best','Best Pairing'), false, 'best'));
      if (worst && worst.name !== best?.name) list.appendChild(pairPerfRow(worst, t('recap.pair.bad','Bad Pairing'), true, 'bad'));
    }
    card.appendChild(list);
    return card;
  }

  function aggregatePairs(matches){
    const map = new Map();
    (matches||[]).forEach(m=>{
      const pA = `${m.a1} – ${m.a2}`;
      const pB = `${m.b1} – ${m.b2}`;
      const keyA = `A:${pA}`;
      const keyB = `B:${pB}`;
      const prevA = map.get(keyA) || { name:pA, pf:0, diff:0, count:0, rounds:[] };
      const prevB = map.get(keyB) || { name:pB, pf:0, diff:0, count:0, rounds:[] };
      prevA.pf += m.saN; prevA.diff += (m.saN - m.sbN); prevA.count += 1;
      prevB.pf += m.sbN; prevB.diff += (m.sbN - m.saN); prevB.count += 1;
      const r = Number(m.round||0);
      if (r){ prevA.rounds.push(r); prevB.rounds.push(r); }
      map.set(keyA, prevA); map.set(keyB, prevB);
    });
    return [...map.values()];
  }

  function pairPerfRow(pair, label, isBad, type){
    const row = document.createElement('div');
    row.className = 'pair-perf-row';
    if (isBad) row.classList.add('is-bad');
    const title = document.createElement('div');
    title.className = 'pair-perf-title';
    title.textContent = label;
    const names = document.createElement('div');
    names.className = 'pair-perf-names';
    names.textContent = pair.name;
    const meta = document.createElement('div');
    meta.className = 'pair-perf-meta';
    const rounds = Array.from(new Set((pair.rounds||[]).filter(Boolean))).sort((a,b)=>a-b);
    let roundLabel = pair.count
      ? t('recap.pair.roundLabel.count','{count} match').replace('{count}', pair.count)
      : t('recap.pair.roundLabel.single','Match');
    if (rounds.length===1) roundLabel = t('recap.pair.roundLabel.one','Match ke {round}').replace('{round}', rounds[0]);
    else if (rounds.length>1 && rounds.length<=3) roundLabel = t('recap.pair.roundLabel.some','Match ke {rounds}').replace('{rounds}', rounds.join(', '));
    else if (rounds.length>3) roundLabel = t('recap.pair.roundLabel.more','Match ke {rounds} +{extra} lagi')
      .replace('{rounds}', rounds.slice(0,3).join(', ')).replace('{extra}', rounds.length-3);
    meta.textContent = `${roundLabel} | ${t('recap.total','Total {value}').replace('{value}', pair.pf)}`;
    if (type==='best') title.classList.add('pair-perf-best');
    if (type==='bad') title.classList.add('pair-perf-bad');
    const score = document.createElement('div');
    score.className = 'pair-perf-score';
    const diff = document.createElement('div');
    diff.className = 'pair-perf-diff';
    if (pair.diff>0){ diff.textContent = `+${pair.diff}`; diff.classList.add('pos'); }
    else if (pair.diff<0){ diff.textContent = `${pair.diff}`; diff.classList.add('neg'); }
    else diff.textContent = '0';
    score.appendChild(diff);
    row.appendChild(title);
    row.appendChild(names);
    row.appendChild(meta);
    row.appendChild(score);
    return row;
  }

  function buildSupportCard(standings){
    const card = createInsightCard(t('recap.support.title','Butuh Penyangga'), '⚠️');
    const needs = standings.filter(s=>{
      const wr = winRateValue(s);
      return s.diff<0 || wr<=25;
    }).sort((a,b)=> a.diff-b.diff).slice(0,4);
    if (!needs.length){
      card.appendChild(emptyInsightText(t('recap.support.safe','Semua pemain aman, tidak ada selisih negatif.')));
      return card;
    }
    needs.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'insight-support-row';
      const name = document.createElement('span'); name.className='p-name'; name.textContent = p.player;
      const pills = document.createElement('div'); pills.className='pill-row';
      const wr = document.createElement('span'); wr.className='pill red'; wr.textContent = t('recap.winrate','WinRate {value}').replace('{value}', formatWinRate(p));
      const diff = document.createElement('span'); diff.className='pill red'; diff.textContent = t('recap.diff','Selisih {value}').replace('{value}', p.diff);
      pills.appendChild(wr); pills.appendChild(diff);
      row.appendChild(name); row.appendChild(pills);
      card.appendChild(row);
    });
    return card;
  }

  function buildInsightCard(matches, avgMargin, standings){
    const card = createInsightCard(t('recap.insight','Insight'), '📈');
    const container = document.createElement('div');
    container.className = 'insight-progress';
    const cand = pickConsistencyCandidate(standings);
    if (cand){
      const label = document.createElement('div');
      label.className = 'progress-label';
      const left = document.createElement('span');
      left.textContent = `${t('recap.consistency','Consistency Watch')}: ${cand.player}`;
      const right = document.createElement('span');
      right.textContent = t('recap.total','Total {value}').replace('{value}', cand.pf);
      label.appendChild(left); label.appendChild(right);
      const bg = document.createElement('div'); bg.className='insight-progress-bg';
      const fill = document.createElement('div'); fill.className='insight-progress-fill';
      const max = Math.max(...standings.map(s=>s.pf||0), cand.pf || 0, 1);
      const width = Math.max(18, Math.min(100, Math.round((cand.pf/max)*100)));
      fill.style.width = `${width}%`;
      bg.appendChild(fill);
      container.appendChild(label);
      container.appendChild(bg);
      const quote = document.createElement('div');
      quote.className = 'insight-quote';
      quote.textContent = t('recap.consistencyNote','Kontribusi bagus, hasil belum stabil.');
      container.appendChild(quote);
    } else {
      container.appendChild(emptyInsightText(t('recap.consistency.empty','Belum ada data konsistensi.')));
    }
    card.appendChild(container);

    const statGrid = document.createElement('div');
    statGrid.className = 'insight-stat-grid';
    const tight = matches.length ? matches.slice().sort((a,b)=>a.margin-b.margin || a.round-b.round)[0] : null;
    const stats = [
      { label: t('recap.card.tight','Match Ketat'), value: tight ? `Match ${tight.round}` : t('recap.empty','Belum ada data.'), sub: tight ? `${tight.saN}–${tight.sbN}` : ''},
      { label: t('recap.card.avgMargin','Rata Margin'), value: avgMargin ? avgMargin.toFixed(1) : '0.0', sub: t('recap.card.avgMarginSub','Skor per match')}
    ];
    stats.forEach(s=>{
      const box = document.createElement('div');
      box.className = 'insight-stat-box';
      const val = document.createElement('span'); val.className='stat-val'; val.textContent = s.value;
      const lbl = document.createElement('span'); lbl.className='stat-lbl'; lbl.textContent = s.label;
      box.appendChild(val); box.appendChild(lbl);
      if (s.sub){
        const sub = document.createElement('span'); sub.className='stat-sub'; sub.textContent = s.sub; box.appendChild(sub);
      }
      statGrid.appendChild(box);
    });
    card.appendChild(statGrid);
    return card;
  }

  function createInsightCard(title, icon){
    const card = document.createElement('div');
    card.className = 'recap-insight-card';
    const head = document.createElement('div');
    head.className = 'insight-card-title';
    const ic = document.createElement('span'); ic.className='insight-icon'; ic.textContent = icon || '';
    const tx = document.createElement('span'); tx.textContent = title;
    head.appendChild(ic); head.appendChild(tx);
    card.appendChild(head);
    return card;
  }

  function emptyInsightText(text){
    const el = document.createElement('div');
    el.className = 'insight-empty';
    el.textContent = text || t('recap.empty','Belum ada data.');
    return el;
  }

  function pickConsistencyCandidate(standings){
    const cand = standings.filter(s=>{
      const wr = winRateValue(s)/100;
      return wr>=0.45 && wr<=0.6;
    }).sort((a,b)=> (b.pf - a.pf) || (b.diff - a.diff))[0];
    return cand || null;
  }

  function winRateValue(p){
    const gp = (p.w||0)+(p.l||0)+(p.d||0);
    return gp ? Math.round((p.w/gp)*100) : 0;
  }
  function formatWinRate(p){ return `${winRateValue(p)}%`; }

  // --- Dynamic insights powered by JSON templates ---
  let INSIGHT_TPL_CACHE = null;
  async function loadInsightTemplates(){
    if (INSIGHT_TPL_CACHE) return INSIGHT_TPL_CACHE;
    try{
      const res = await fetch('scripts/insights-templates.json');
      if (!res.ok) throw new Error('tpl fetch fail');
      INSIGHT_TPL_CACHE = await res.json();
    }catch(err){ INSIGHT_TPL_CACHE = { version:1, templates:[] }; }
    return INSIGHT_TPL_CACHE;
  }

  function basicInsightsFallback(matches, avgMargin, standings){
    // Fallback to previous static bullets if templates not loaded
    const bullets = [];
    const topTotal = standings.slice().sort((a,b)=>b.pf-a.pf).slice(0,3)
      .map(s=>`${escapeHtml(s.player)} (${s.pf})`).join('; ');
    if (topTotal) bullets.push(t('recap.fallback.topTotal','<strong>Peringkat berdasarkan Total:</strong> {list} mengejar.').replace('{list}', topTotal));
    const topDiff = standings.slice().sort((a,b)=>b.diff-a.diff).slice(0,2)
      .map(s=>`${escapeHtml(s.player)} (+${s.diff})`).join(' & ');
    if (topDiff) bullets.push(t('recap.fallback.topDiff','<strong>Selisih terbaik:</strong> {list} menunjukkan kontrol game tinggi.').replace('{list}', topDiff));
    const wrHigh = standings.filter(s=>{ const gp=s.w+s.l+(s.d||0); return gp && (s.w/gp)>=0.7; })
      .map(s=>{ const gp=s.w+s.l+(s.d||0); return `${escapeHtml(s.player)} ${(s.w/gp*100).toFixed(0)}%`; }).join(', ');
    if (wrHigh) bullets.push(t('recap.fallback.wrHigh','<strong>WinRate unggul (>= 70%):</strong> {list} - kandidat kunci untuk pairing berat.').replace('{list}', wrHigh));
    const needs = standings.filter(s=>{ const gp=s.w+s.l+(s.d||0); const wr=gp?(s.w/gp):0; return wr<=0.25 && s.diff<0; })
      .slice(0,4)
      .map(s=>{ const gp=s.w+s.l+(s.d||0); const wr=gp?(s.w/gp*100).toFixed(0):'0'; const diffLabel=`${s.diff>=0?'+':''}${s.diff}`; return `${escapeHtml(s.player)} (${wr}%, ${diffLabel})`; }).join(', ');
    if (needs) bullets.push(t('recap.needsImprove','<strong>Butuh perbaikan:</strong> {list} - coba pairing dengan pemain +/- positif.').replace('{list}', needs));
    const mid = standings.filter(s=>{ const gp=s.w+s.l+(s.d||0); if(!gp) return false; const wr=s.w/gp; return wr>=0.45 && wr<=0.55; })
      .sort((a,b)=>b.pf-a.pf)[0];
    if (mid){ const gp=mid.w+mid.l+(mid.d||0); const wr=((mid.w/gp)*100).toFixed(0); bullets.push(t('recap.consistency.watch','<strong>Consistency watch:</strong> {name} {wr}% namun Total tinggi ({total}) -> kontribusi poin bagus meski hasil belum stabil.').replace('{name}', escapeHtml(mid.player)).replace('{wr}', wr).replace('{total}', mid.pf)); }
    try {
      const counts = new Map();
      matches.forEach(m=>{ [m.a1,m.a2,m.b1,m.b2].forEach(p=>counts.set(p,(counts.get(p)||0)+1)); });
      const vals = [...counts.values()];
      const min = Math.min(...vals), max = Math.max(...vals);
      const spread = (isFinite(min)&&isFinite(max))? (max-min) : 0;
      const spreadTxt = spread===0 ? t('recap.fallback.rotationEven','merata') : t('recap.fallback.rotationGap','selisih {spread}').replace('{spread}', spread);
      bullets.push(t('recap.fallback.rotation','<strong>Rotasi & keseimbangan:</strong> sebaran main {spread}.').replace('{spread}', spreadTxt));
    } catch {}
    const tight = matches.length ? matches.slice().sort((a,b)=>a.margin-b.margin)[0] : null;
    if (tight) bullets.push(t('recap.tightest','Match paling ketat: Match {round} (Skor {score}).').replace('{round}', tight.round).replace('{score}', `${tight.saN}-${tight.sbN}`));
    return bullets;
  }

  function asPct(w,l,d){ const gp=(w||0)+(l||0)+(d||0); return gp? Math.round((w/gp)*100) : 0; }

  function generateInsights(matches, avgMargin, standings){
    // sync/async wrapper
    const ctx = { matches, avgMargin, standings };
    let out = [];
    try {
      // Attempt synchronous use of cached templates; if missing, schedule async load and fallback now
      if (!INSIGHT_TPL_CACHE){ loadInsightTemplates().then(()=>{ /* next open will use cache */ }); return basicInsightsFallback(matches, avgMargin, standings); }
      const tpl = INSIGHT_TPL_CACHE.templates || [];
      out = applyTemplates(tpl, ctx);
      if (!out.length) out = basicInsightsFallback(matches, avgMargin, standings);
      return out;
    } catch { return basicInsightsFallback(matches, avgMargin, standings); }
  }

  function applyTemplates(templates, ctx){
    const bullets=[];
    let langIsEn = false;
    try{ langIsEn = (localStorage.getItem('app.lang')||'id') === 'en'; }catch{}
    const standings = ctx.standings.map(s=>({
      name: s.player,
      pf: s.pf,
      diff: s.diff,
      w: s.w,
      l: s.l,
      d: s.d||0,
      gp: (s.w||0)+(s.l||0)+(s.d||0),
      wr: asPct(s.w,s.l,s.d)
    }));
    const matches = ctx.matches;

    const haveMatches = matches && matches.length>0;
    const tight = haveMatches ? matches.slice().sort((a,b)=>a.margin-b.margin)[0] : null;
    const avgMargin = Number(ctx.avgMargin||0);
    const avgTotal = matches && matches.length ? (matches.reduce((s,m)=> s + (Number(m.saN||m.sa||0)+Number(m.sbN||m.sb||0)), 0) / matches.length) : 0;

    for (const t of templates){
      if (!passesWhen(t.when)) continue;
      const text = buildText(t.build);
      if (text) bullets.push(text);
    }
    return bullets;

    function passesWhen(when){
      if (!when || when.type==='always') return true;
      switch(when.type){
        case 'wr_ge': return standings.some(s=> s.w+s.l+s.d>0 && (s.w/(s.w+s.l+s.d)) >= (when.threshold||0));
        case 'any_wr_le_and_diff_neg': return standings.some(s=>{ const gp=s.w+s.l+s.d; return gp>0 && (s.w/gp)<= (when.threshold||0) && s.diff<0;});
        case 'exists_mid_wr': return standings.some(s=>{ const gp=s.w+s.l+s.d; if(!gp) return false; const wr=s.w/gp; return wr>=(when.min||0) && wr<=(when.max||1); });
        case 'have_matches': return haveMatches;
        case 'avg_margin_le': return avgMargin <= (when.threshold||0);
        case 'avg_margin_ge': return avgMargin >= (when.threshold||0);
        case 'avg_total_le': return avgTotal <= (when.threshold||0);
        case 'avg_total_ge': return avgTotal >= (when.threshold||0);
        default: return false;
      }
    }

    function buildText(build){
      if (!build) return '';
      switch(build.type){
        case 'text':
          return pick(build.label, build.label_en) || '';
        case 'top_list':{
          const src = build.source || 'pf';
          const count = build.count || 3;
          const arr = standings.slice().sort((a,b)=> (b[src]||0)-(a[src]||0)).slice(0,count);
          if (!arr.length) return '';
          const fmt = pick(build.format, build.format_en) || '{name} ({value})';
          const s = arr.map(x=> fmt.replace('{name}', escapeHtml(x.name)).replace('{value}', String(x[src])) ).join(pick(build.join, build.join_en) || '; ');
          const labelVal = pick(build.label, build.label_en);
          const sufVal = pick(build.suffix, build.suffix_en);
          const label = labelVal ? `<strong>${labelVal}:</strong> ` : '';
          const suf = sufVal ? ` ${sufVal}` : '';
          return `${label}${s}${suf}`;
        }
        case 'list_filter':{
          const op = build.op||'>='; const th = build.threshold||0; const src=build.source||'wr';
          const arr = standings.filter(s=> compare( (src==='wr'? (s.w/(s.w+s.l+s.d||1)) : s[src]||0), op, th));
          if (!arr.length) return '';
          const s = arr.map(x=>{
            const pct = asPct(x.w,x.l,x.d);
            return (pick(build.format, build.format_en)||'{name}').replace('{name}', escapeHtml(x.name)).replace('{pct}', String(pct));
          }).join(pick(build.join, build.join_en) || ', ');
          const labelVal = pick(build.label, build.label_en);
          const sufVal = pick(build.suffix, build.suffix_en);
          const label = labelVal ? `<strong>${labelVal}:</strong> ` : '';
          const suf = sufVal ? ` ${sufVal}` : '';
          return `${label}${s}${suf}`;
        }
        case 'needs_improve':{
          const th = build.threshold||0.25; const limit=build.limit||4;
          const arr = standings.filter(s=>{ const gp=s.w+s.l+s.d; const wr=gp? (s.w/gp):0; return wr<=th && s.diff<0; })
            .slice(0,limit).map(s=>{ const gp=s.w+s.l+s.d; const wr=gp? Math.round((s.w/gp)*100):0; const diffLabel=`${s.diff>=0?'+':''}${s.diff}`; return `${escapeHtml(s.name)} (${wr}%, ${diffLabel})`; });
          if (!arr.length) return '';
          return t('recap.needsImprove','<strong>Butuh perbaikan:</strong> {list} - coba pairing dengan pemain +/- positif.').replace('{list}', arr.join(', '));
        }
        case 'consistency':{
          const mn=build.min||0.45, mx=build.max||0.55;
          const cand = standings.filter(s=>{ const gp=s.w+s.l+s.d; if(!gp) return false; const wr=s.w/gp; return wr>=mn && wr<=mx; }).sort((a,b)=>b.pf-a.pf)[0];
          if (!cand) return '';
          const gp=cand.w+cand.l+cand.d; const wr=Math.round((cand.w/gp)*100);
          return t('recap.consistency.watch','<strong>Consistency watch:</strong> {name} {wr}% namun Total tinggi ({total}) -> kontribusi poin bagus meski hasil belum stabil.')
            .replace('{name}', escapeHtml(cand.name)).replace('{wr}', wr).replace('{total}', cand.pf);
        }
        case 'tightest':{
          if (!tight) return '';
          return t('recap.tightest','Match paling ketat: Match {round} (Skor {score}).').replace('{round}', tight.round).replace('{score}', `${tight.saN}-${tight.sbN}`);
        }
        case 'rotation':{
          try{
            const counts = new Map();
            matches.forEach(m=>{ [m.a1,m.a2,m.b1,m.b2].forEach(p=>counts.set(p,(counts.get(p)||0)+1)); });
            const vals=[...counts.values()]; const min=Math.min(...vals), max=Math.max(...vals); const spread=max-min;
            const goodMax = build.good_max ?? 1;
            const msg = spread<=goodMax
              ? t('recap.rotation.msgEven','sebaran main merata')
              : t('recap.rotation.msgGap','sebaran main selisih {spread}').replace('{spread}', spread);
            return `<strong>${t('recap.rotation.title','Rotasi & keseimbangan')}:</strong> ${msg}.`;
          }catch{ return ''; }
        }
        case 'biggest':{
          if (!haveMatches) return '';
          const m = matches.slice().sort((a,b)=>b.margin-a.margin)[0];
          const who = (m.saN>m.sbN) ? `${escapeHtml(m.a1)} & ${escapeHtml(m.a2)}` : `${escapeHtml(m.b1)} & ${escapeHtml(m.b2)}`;
          return t('recap.biggest','Margin terbesar: Match {round} - {team} menang {scoreA}-{scoreB} (margin {margin}).')
            .replace('{round}', m.round).replace('{team}', who).replace('{scoreA}', m.saN).replace('{scoreB}', m.sbN).replace('{margin}', m.margin);
        }
        case 'highest_total':{
          if (!haveMatches) return '';
          const m = matches.slice().sort((a,b)=>((b.saN+b.sbN)-(a.saN+a.sbN)))[0];
          const total = m.saN+m.sbN;
          return t('recap.highestTotal','Skor total tertinggi: Match {round} - {scoreA}-{scoreB} (total {total}).')
            .replace('{round}', m.round).replace('{scoreA}', m.saN).replace('{scoreB}', m.sbN).replace('{total}', total);
        }
        case 'close_count':{
          if (!haveMatches) return '';
          const th = Number(build.threshold||3);
          const n = matches.filter(m=>m.margin<=th).length;
          if (!n) return '';
          return t('recap.closeCount','{count} pertandingan tergolong ketat (margin <= {threshold}).').replace('{count}', n).replace('{threshold}', th);
        }
        case 'best_pairs':{
          if (!haveMatches) return '';
          const count = build.count||3;
          const pair = new Map();
          matches.forEach(m=>{
            const pA = `${m.a1} - ${m.a2}`; const pB = `${m.b1} - ${m.b2}`;
            const keyA = `A:${pA}`; const keyB = `B:${pB}`;
            const prevA = pair.get(keyA) || { name:pA, pf:0, diff:0 };
            const prevB = pair.get(keyB) || { name:pB, pf:0, diff:0 };
            prevA.pf += m.saN; prevA.diff += (m.saN - m.sbN); pair.set(keyA, prevA);
            prevB.pf += m.sbN; prevB.diff += (m.sbN - m.saN); pair.set(keyB, prevB);
          });
          const arr = [...pair.values()].sort((a,b)=> (b.pf - a.pf) || (b.diff - a.diff)).slice(0,count);
          if (!arr.length) return '';
          const s = arr.map(x=> `${escapeHtml(x.name)} (${x.pf}, ${x.diff>=0?'+':''}${x.diff})`).join('; ');
          return t('recap.pair.productive','<strong>Pair produktif:</strong> {list}.').replace('{list}', s);
        }
        default: return '';


      }
    }
    function compare(a,op,b){ if(op==='>=') return a>=b; if(op==='>') return a>b; if(op==='<=') return a<=b; if(op==='<') return a<b; if(op==='==') return a==b; return false; }
    function pick(idVal, enVal){ return langIsEn ? (enVal || idVal) : idVal; }
  }

  function bottomPanels(matches, avgMargin, standings){
    const grid = document.createElement('div');
    grid.className = 'recap-bottom-grid';
    // Rules
    const rulesSec = document.createElement('section');
    rulesSec.appendChild(sectionTitle(t('recap.section.rules','Aturan Ranking')));
    const rules = document.createElement('div');
    rules.className = 'recap-rules cardlike';
    rules.innerHTML = `
      <ol>
        <li>${t('recap.rule.total','Total - poin total lebih tinggi berada di peringkat lebih atas.')}</li>
        <li>${t('recap.rule.diff','Selisih - jika Total sama, peringkat ditentukan oleh selisih skor (point for - point against).')}</li>
        <li>${t('recap.rule.win','Menang - jika Total & Selisih sama, dilihat jumlah kemenangan (W).')}</li>
        <li>${t('recap.rule.alphabet','Jika semua sama - diurutkan alfabetis nama pemain.')}</li>
      </ol>`;
    rulesSec.appendChild(rules);
    // Notes
    const notesSec = document.createElement('section');
    notesSec.appendChild(sectionTitle(t('recap.section.notes','Catatan & Insight')));
    notesSec.appendChild(insightBox(matches, avgMargin, standings));

    grid.appendChild(rulesSec);
    grid.appendChild(notesSec);
    return grid;
  }

  function insightBox(matches, avgMargin, standings){
    const ul = document.createElement('ul');
    ul.className = 'recap-insight';
    const bullets = [];
    // Insight 1: balance of play count
    try {
      const counts = new Map();
      matches.forEach(m=>{ [m.a1,m.a2,m.b1,m.b2].forEach(p=>counts.set(p,(counts.get(p)||0)+1)); });
      const vals = [...counts.values()];
      const min = Math.min(...vals), max = Math.max(...vals);
      const spread = (isFinite(min)&&isFinite(max))? (max-min) : 0;
      bullets.push(spread<=1 ? t('recap.rotation.ok','Rotasi sudah seimbang.') : t('recap.rotation.warn','Sebaran rotasi belum merata (selisih main {spread}).').replace('{spread}', spread));
    } catch {}
    // Insight 2: competitiveness by avg margin
    bullets.push(avgMargin<=6 ? t('recap.margin.low','Selisih rata-rata rendah → pertandingan kompetitif.') : t('recap.margin.high','Selisih rata-rata cukup tinggi → disparitas performa terlihat.'));
    // Insight 3: tightest match
    const tight = matches.length ? matches.slice().sort((a,b)=>a.margin-b.margin)[0] : null;
    if (tight) bullets.push(t('recap.tightest','Match paling ketat: Match {round} (Skor {score}).').replace('{round}', tight.round).replace('{score}', `${tight.saN}–${tight.sbN}`));

    bullets.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); });
    const box = document.createElement('div'); box.className = 'recap-insight-box'; box.appendChild(ul); return box;
  }

  function collectMatches(){
    const arr = [];
    try {
      const RBC = (typeof roundsByCourt !== 'undefined') ? roundsByCourt : (window.roundsByCourt || null);
      if (Array.isArray(RBC)){
        RBC.forEach((courtArr, ci) => {
          (courtArr||[]).forEach((r, ri) => {
            if (!(r && r.a1 && r.a2 && r.b1 && r.b2)) return;
            const hasSa = r.scoreA !== undefined && r.scoreA !== null && r.scoreA !== '';
            const hasSb = r.scoreB !== undefined && r.scoreB !== null && r.scoreB !== '';
            if (!(hasSa || hasSb)) return;
            const timeStr = timeForRoundSafe(ri);
            arr.push({
              court: ci+1, round: ri+1, time: timeStr,
              a1: r.a1||'-', a2: r.a2||'-', b1: r.b1||'-', b2: r.b2||'-',
              sa: String(r.scoreA||0), sb: String(r.scoreB||0)
            });
          });
        });
        return arr;
      }
    } catch {}

    // Fallback: parse visible table (active court only)
    try {
      const rows = document.querySelectorAll('.rnd-table tbody tr');
      rows.forEach((tr, idx) => {
        const sels = tr.querySelectorAll('select');
        const inps = tr.querySelectorAll('input[type="tel"]');
        if (sels.length >= 4 && inps.length >= 2){
          const [a1,a2,b1,b2] = [...sels].map(s => s.value || s.options[s.selectedIndex]?.text || '');
          const [sa,sb] = [...inps].map(i => i.value || '');
          if (a1 && a2 && b1 && b2 && (sa!=='' || sb!=='')){
            const ac = (typeof activeCourt !== 'undefined') ? activeCourt : (window.activeCourt || 0);
            arr.push({ court: Number(ac)+1, round: idx+1, time: timeForRoundSafe(idx), a1,a2,b1,b2, sa:String(sa||0), sb:String(sb||0) });
          }
        }
      });
    } catch {}
    return arr;
  }

  function timeForRoundSafe(i){
    try {
      const rs = (typeof roundStartTime === 'function') ? roundStartTime : window.roundStartTime;
      const re = (typeof roundEndTime === 'function') ? roundEndTime : window.roundEndTime;
      if (typeof rs === 'function' && typeof re === 'function'){
        return `${rs(i)}–${re(i)}`;
      }
    } catch {}
    return '';
  }




  function copyRecapText(){
    const title = (byId('appTitle')?.textContent||'Event').trim();
    const date = (byId('chipDateText')?.textContent||'').trim();
    const matches = collectMatches();
    const standings = [...(byId('standings')?.querySelectorAll('tbody tr')||[])].map(tr=>{
      const t = [...tr.children].map(td=>td.textContent.trim());
      return `${t[0]}. ${t[1]} | Total ${t[2]} | Diff ${t[3]} | W${t[4]}-L${t[5]}-D${t[6]} | ${t[7]}`;
    });
    const header = t('recap.copyHeader','Rekap Pertandingan - {title}').replace('{title}', title);
    let out = `${header}${date?` (${date})`:''}\n\n`;
    if (matches.length){
      out += `${t('recap.copyMatches','Matches ({count})').replace('{count}', matches.length)}\n`;
      matches.forEach(m=>{
        const courtLabel = t('recap.courtLabel','Lap {court}').replace('{court}', m.court);
        const matchLabel = t('recap.matchLabel','Match {round}').replace('{round}', m.round);
        const timePart = m.time ? ` - ${m.time}` : '';
        out += `${courtLabel} - ${matchLabel}${timePart} - ${m.a1} & ${m.a2} vs ${m.b1} & ${m.b2} -> ${m.sa}:${m.sb}\n`;
      });
      out += `\n`;
    }
    if (standings.length){
      out += `${t('recap.copyStandings','Standings')}\n` + standings.join('\n') + `\n`;
    }
    try{ navigator.clipboard.writeText(out); }catch{
      const ta = document.createElement('textarea');
      ta.value = out; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch{} ta.remove();
    }
    try{ window.showToast?.(t('recap.copySuccess','Recap disalin ke clipboard'), 'success'); }catch{}
  }
  async function ensureHtml2Canvas(){
    if (window.html2canvas) return true;
    return new Promise((resolve)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = ()=> resolve(true);
      s.onerror = ()=> resolve(false);
      document.head.appendChild(s);
    });
  }

  async function saveRecapAsImage(){
    const ok = await ensureHtml2Canvas();
    if (!ok) { try{ showToast?.(t('recap.html2canvasFail','Gagal memuat html2canvas'), 'error'); }catch{} return; }
    const panel = document.querySelector('#matchRecapOverlay .recap-panel');
    if (!panel) return;
    const body = panel.querySelector('.recap-body');
    const standingsBox = panel.querySelector('.recap-standings');

    // Temporarily expand scrollable areas so the snapshot includes full content
    const stash = [];
    [body, standingsBox].forEach(el=>{
      if (!el) return;
      stash.push([el, el.style.maxHeight, el.style.overflow]);
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
    });

    // Force reflow
    panel.offsetHeight;

    const canvas = await window.html2canvas(panel, {
      backgroundColor: getComputedStyle(panel).backgroundColor,
      scale: Math.min(2, window.devicePixelRatio||1),
      scrollX: 0, scrollY: 0,
      windowWidth: panel.scrollWidth,
      windowHeight: panel.scrollHeight
    });

    // Restore styles
    stash.forEach(([el, mh, ov])=>{ el.style.maxHeight = mh || ''; el.style.overflow = ov || ''; });

    if (canvas.toBlob) {
      canvas.toBlob((blob)=>{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download='match-recap.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1500);
      });
    } else {
      const a = document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download='match-recap.png'; a.click();
    }
  }

  // Boot
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureRecapButton);
  else ensureRecapButton();
})();
