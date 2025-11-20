"use strict";

// Match Recap: builds a quick summary from current UI/locals (no Supabase fetch)
(function(){
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
    btn.textContent = 'Match Recap';
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
    title.textContent = 'Match Recap';
    const actions = document.createElement('div');
    actions.className = 'recap-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'recap-action';
    saveBtn.textContent = 'Save as Image';
    saveBtn.addEventListener('click', ()=> saveRecapAsImage());
    const closeBtn = document.createElement('button');
    closeBtn.className = 'recap-action';
    closeBtn.textContent = 'Tutup';
    closeBtn.addEventListener('click', closeRecapModal);
    actions.appendChild(saveBtn);
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
    const headerTitle = `${textFrom(byId('appTitle')) || 'Match Recap'} — Court ${courtNo}`;
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
    cards.innerHTML = `
      ${cardMetric(totalMatch, 'Total Match')}
      ${cardMetric(totalPoint, 'Total Poin')}
      ${cardMetric(avgMargin.toFixed(1), 'Rata Selisih')}
      ${tight ? cardMetric(`${tight.saN}–${tight.sbN}`, `Skor Paling Ketat (Match ${tight.round})`) : cardMetric('-', 'Skor Paling Ketat')}
    `;
    root.appendChild(cards);

    // Two-column layout
    const grid = document.createElement('div');
    grid.className = 'recap-grid';

    const left = document.createElement('div');
    left.className = 'recap-col-left';
    left.appendChild(sectionTitle('Rekap Pertandingan'));
    const matchWrap = document.createElement('div');
    matchWrap.className = 'recap-match-wrap';

    if (!matches.length){
      const empty = document.createElement('div');
      empty.className = 'recap-empty';
      empty.textContent = 'Belum ada skor yang tercatat.';
      matchWrap.appendChild(empty);
    } else {
      matches.forEach(m=> matchWrap.appendChild(matchCard(m)));
    }
    left.appendChild(matchWrap);

    const right = document.createElement('div');
    right.className = 'recap-col-right';
    right.appendChild(sectionTitle('Klasemen Pemain'));
    right.appendChild(standingsTable(standings));
    right.appendChild(sectionTitle('Aturan Ranking'));
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
    ft.textContent = `Terakhir diperbarui ${hh}:${mm}`;
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
    const winnerTxt = m.winner==='A' ? 'Menang: Team A' : m.winner==='B' ? 'Menang: Team B' : 'Seri';
    const badgeClass = m.winner==='A' ? 'badge-a' : m.winner==='B' ? 'badge-b' : 'badge-d';
    el.innerHTML = `
      <div class="rmc-top"><span>Match ${m.round} • Court ${m.court}</span><span>${escapeHtml(m.time||'')}</span></div>
      <div class="rmc-mid">
        <div class="rmc-team-block"><div class="rmc-team-label label-a">TEAM A</div><div class="rmc-team">${escapeHtml(m.a1)} • ${escapeHtml(m.a2)}</div></div>
        <div class="rmc-vs">vs</div>
        <div class="rmc-team-block right"><div class="rmc-team-label label-b">TEAM B</div><div class="rmc-team">${escapeHtml(m.b1)} • ${escapeHtml(m.b2)}</div></div>
      </div>
      <div class="rmc-score"><div class="rmc-sa">${m.saN}</div><div class="rmc-sb">${m.sbN}</div></div>
      <div class="rmc-tags"><span class="rmc-badge ${badgeClass}">${winnerTxt}</span><span class="rmc-badge neutral">Margin ${m.margin}</span></div>
    `;
    return el;
  }

  function standingsTable(rows){
    const wrap = document.createElement('div');
    wrap.className = 'recap-standings';
    const tbl = document.createElement('table');
    tbl.innerHTML = `
      <thead><tr>
        <th>Rank</th>
        <th>Pemain</th>
        <th>Total</th>
        <th>Selisih</th>
        <th>W</th>
        <th>L</th>
        <th>D</th>
        <th>WinRate</th>
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
        <li><strong>Total</strong> — poin total lebih tinggi berada di peringkat lebih atas.</li>
        <li><strong>Selisih</strong> — jika Total sama, peringkat ditentukan oleh selisih skor (point for − point against).</li>
        <li><strong>Menang</strong> — jika Total & Selisih sama, dilihat jumlah kemenangan (W).</li>
        <li>Jika semua sama — diurutkan alfabetis nama pemain.</li>
      </ol>`;
    return div;
  }

  function notesFull(matches, avgMargin, standings){
    const wrap = document.createElement('div');
    wrap.appendChild(sectionTitle('Catatan & Insight'));
    const box = document.createElement('div');
    box.className = 'recap-insight-box cardlike recap-notes-full';
    const ul = document.createElement('ul');
    ul.className = 'recap-insight';
    generateInsights(matches, avgMargin, standings).forEach(t=>{
      const li = document.createElement('li'); li.innerHTML = t; ul.appendChild(li);
    });
    box.appendChild(ul);
    wrap.appendChild(box);
    return wrap;
  }

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
    if (topTotal) bullets.push(`<strong>Peringkat berdasarkan Total:</strong> ${topTotal} mengejar.`);
    const topDiff = standings.slice().sort((a,b)=>b.diff-a.diff).slice(0,2)
      .map(s=>`${escapeHtml(s.player)} (+${s.diff})`).join(' & ');
    if (topDiff) bullets.push(`<strong>Selisih terbaik:</strong> ${topDiff} menunjukkan kontrol game tinggi.`);
    const wrHigh = standings.filter(s=>{ const gp=s.w+s.l+(s.d||0); return gp && (s.w/gp)>=0.7; })
      .map(s=>{ const gp=s.w+s.l+(s.d||0); return `${escapeHtml(s.player)} ${(s.w/gp*100).toFixed(0)}%`; }).join(', ');
    if (wrHigh) bullets.push(`<strong>WinRate unggul (≥ 70%):</strong> ${wrHigh} — kandidat kunci untuk pairing berat.`);
    const needs = standings.filter(s=>{ const gp=s.w+s.l+(s.d||0); const wr=gp?(s.w/gp):0; return wr<=0.25 && s.diff<0; })
      .slice(0,4)
      .map(s=>{ const gp=s.w+s.l+(s.d||0); const wr=gp?(s.w/gp*100).toFixed(0):'0'; return `${escapeHtml(s.player)} (${wr}%, ±${s.diff})`; }).join(', ');
    if (needs) bullets.push(`<strong>Butuh perbaikan:</strong> ${needs} — coba pairing dengan pemain ± positif.`);
    const mid = standings.filter(s=>{ const gp=s.w+s.l+(s.d||0); if(!gp) return false; const wr=s.w/gp; return wr>=0.45 && wr<=0.55; })
      .sort((a,b)=>b.pf-a.pf)[0];
    if (mid){ const gp=mid.w+mid.l+(mid.d||0); const wr=((mid.w/gp)*100).toFixed(0); bullets.push(`<strong>Consistency watch:</strong> ${escapeHtml(mid.player)} ${wr}% namun Total tinggi (${mid.pf}) → kontribusi poin bagus meski hasil belum stabil.`); }
    try {
      const counts = new Map();
      matches.forEach(m=>{ [m.a1,m.a2,m.b1,m.b2].forEach(p=>counts.set(p,(counts.get(p)||0)+1)); });
      const vals = [...counts.values()];
      const min = Math.min(...vals), max = Math.max(...vals);
      const spread = (isFinite(min)&&isFinite(max))? (max-min) : 0;
      bullets.push(`<strong>Rotasi & keseimbangan:</strong> sebaran main ${spread===0?'merata':`selisih ${spread}`}.`);
    } catch {}
    const tight = matches.length ? matches.slice().sort((a,b)=>a.margin-b.margin)[0] : null;
    if (tight) bullets.push(`Match paling ketat: Match ${tight.round} (Skor ${tight.saN}–${tight.sbN}).`);
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
          return build.label || '';
        case 'top_list':{
          const src = build.source || 'pf';
          const count = build.count || 3;
          const arr = standings.slice().sort((a,b)=> (b[src]||0)-(a[src]||0)).slice(0,count);
          if (!arr.length) return '';
          const fmt = build.format || '{name} ({value})';
          const s = arr.map(x=> fmt.replace('{name}', escapeHtml(x.name)).replace('{value}', String(x[src])) ).join(build.join||'; ');
          const label = build.label ? `<strong>${build.label}:</strong> ` : '';
          const suf = build.suffix ? ` ${build.suffix}` : '';
          return `${label}${s}${suf}`;
        }
        case 'list_filter':{
          const op = build.op||'>='; const th = build.threshold||0; const src=build.source||'wr';
          const arr = standings.filter(s=> compare( (src==='wr'? (s.w/(s.w+s.l+s.d||1)) : s[src]||0), op, th));
          if (!arr.length) return '';
          const s = arr.map(x=>{
            const pct = asPct(x.w,x.l,x.d);
            return (build.format||'{name}').replace('{name}', escapeHtml(x.name)).replace('{pct}', String(pct));
          }).join(build.join||', ');
          const label = build.label ? `<strong>${build.label}:</strong> ` : '';
          const suf = build.suffix ? ` ${build.suffix}` : '';
          return `${label}${s}${suf}`;
        }
        case 'needs_improve':{
          const th = build.threshold||0.25; const limit=build.limit||4;
          const arr = standings.filter(s=>{ const gp=s.w+s.l+s.d; const wr=gp? (s.w/gp):0; return wr<=th && s.diff<0; })
            .slice(0,limit).map(s=>{ const gp=s.w+s.l+s.d; const wr=gp? Math.round((s.w/gp)*100):0; return `${escapeHtml(s.name)} (${wr}%, ±${s.diff})`; });
          if (!arr.length) return '';
          return `<strong>Butuh perbaikan:</strong> ${arr.join(', ')} — coba pairing dengan pemain ± positif.`;
        }
        case 'consistency':{
          const mn=build.min||0.45, mx=build.max||0.55;
          const cand = standings.filter(s=>{ const gp=s.w+s.l+s.d; if(!gp) return false; const wr=s.w/gp; return wr>=mn && wr<=mx; }).sort((a,b)=>b.pf-a.pf)[0];
          if (!cand) return '';
          const gp=cand.w+cand.l+cand.d; const wr=Math.round((cand.w/gp)*100);
          return `<strong>Consistency watch:</strong> ${escapeHtml(cand.name)} ${wr}% namun Total tinggi (${cand.pf}) → kontribusi poin bagus meski hasil belum stabil.`;
        }
        case 'tightest':{
          if (!tight) return '';
          return `Match paling ketat: Match ${tight.round} (Skor ${tight.saN}–${tight.sbN}).`;
        }
        case 'rotation':{
          try{
            const counts = new Map();
            matches.forEach(m=>{ [m.a1,m.a2,m.b1,m.b2].forEach(p=>counts.set(p,(counts.get(p)||0)+1)); });
            const vals=[...counts.values()]; const min=Math.min(...vals), max=Math.max(...vals); const spread=max-min;
            const goodMax = build.good_max ?? 1;
            const msg = spread<=goodMax ? 'sebaran main merata' : `sebaran main selisih ${spread}`;
            return `<strong>Rotasi & keseimbangan:</strong> ${msg}.`;
          }catch{ return ''; }
        }
        case 'biggest':{
          if (!haveMatches) return '';
          const m = matches.slice().sort((a,b)=>b.margin-a.margin)[0];
          const who = (m.saN>m.sbN) ? `${escapeHtml(m.a1)} & ${escapeHtml(m.a2)}` : `${escapeHtml(m.b1)} & ${escapeHtml(m.b2)}`;
          return `Margin terbesar: Match ${m.round} — ${who} menang ${m.saN}–${m.sbN} (margin ${m.margin}).`;
        }
        case 'highest_total':{
          if (!haveMatches) return '';
          const m = matches.slice().sort((a,b)=>((b.saN+b.sbN)-(a.saN+a.sbN)))[0];
          const total = m.saN+m.sbN;
          return `Skor total tertinggi: Match ${m.round} — ${m.saN}–${m.sbN} (total ${total}).`;
        }
        case 'close_count':{
          if (!haveMatches) return '';
          const th = Number(build.threshold||3);
          const n = matches.filter(m=>m.margin<=th).length;
          if (!n) return '';
          return `${n} pertandingan tergolong ketat (margin ≤ ${th}).`;
        }
        case 'best_pairs':{
          if (!haveMatches) return '';
          const count = build.count||3;
          const pair = new Map();
          matches.forEach(m=>{
            const pA = `${m.a1} • ${m.a2}`; const pB = `${m.b1} • ${m.b2}`;
            const keyA = `A:${pA}`; const keyB = `B:${pB}`;
            const prevA = pair.get(keyA) || { name:pA, pf:0, diff:0 };
            const prevB = pair.get(keyB) || { name:pB, pf:0, diff:0 };
            prevA.pf += m.saN; prevA.diff += (m.saN - m.sbN); pair.set(keyA, prevA);
            prevB.pf += m.sbN; prevB.diff += (m.sbN - m.saN); pair.set(keyB, prevB);
          });
          const arr = [...pair.values()].sort((a,b)=> (b.pf - a.pf) || (b.diff - a.diff)).slice(0,count);
          if (!arr.length) return '';
          const s = arr.map(x=> `${escapeHtml(x.name)} (${x.pf}, ±${x.diff})`).join('; ');
          return `<strong>Pair produktif:</strong> ${s}.`;
        }
        default: return '';
      }
    }
    function compare(a,op,b){ if(op==='>=') return a>=b; if(op==='>') return a>b; if(op==='<=') return a<=b; if(op==='<') return a<b; if(op==='==') return a==b; return false; }
  }

  function bottomPanels(matches, avgMargin, standings){
    const grid = document.createElement('div');
    grid.className = 'recap-bottom-grid';
    // Rules
    const rulesSec = document.createElement('section');
    rulesSec.appendChild(sectionTitle('Aturan Ranking'));
    const rules = document.createElement('div');
    rules.className = 'recap-rules cardlike';
    rules.innerHTML = `
      <ol>
        <li><strong>Total</strong> — poin total lebih tinggi berada di peringkat lebih atas.</li>
        <li><strong>Selisih</strong> — jika Total sama, peringkat ditentukan oleh selisih skor (point for − point against).</li>
        <li><strong>Menang</strong> — jika Total & Selisih sama, dilihat jumlah kemenangan (W).</li>
        <li>Jika semua sama — diurutkan alfabetis nama pemain.</li>
      </ol>`;
    rulesSec.appendChild(rules);
    // Notes
    const notesSec = document.createElement('section');
    notesSec.appendChild(sectionTitle('Catatan & Insight'));
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
      bullets.push(spread<=1 ? 'Rotasi sudah seimbang.' : `Sebaran rotasi belum merata (selisih main ${spread}).`);
    } catch {}
    // Insight 2: competitiveness by avg margin
    bullets.push(avgMargin<=6 ? 'Selisih rata-rata rendah → pertandingan kompetitif.' : 'Selisih rata-rata cukup tinggi → disparitas performa terlihat.');
    // Insight 3: tightest match
    const tight = matches.length ? matches.slice().sort((a,b)=>a.margin-b.margin)[0] : null;
    if (tight) bullets.push(`Match paling ketat: Match ${tight.round} (Skor ${tight.saN}–${tight.sbN}).`);

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

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  function copyRecapText(){
    const title = (byId('appTitle')?.textContent||'Event').trim();
    const date = (byId('chipDateText')?.textContent||'').trim();
    const matches = collectMatches();
    const standings = [...(byId('standings')?.querySelectorAll('tbody tr')||[])].map(tr=>{
      const t = [...tr.children].map(td=>td.textContent.trim());
      return `${t[0]}. ${t[1]} | Total ${t[2]} | Δ${t[3]} | W${t[4]}-L${t[5]}-D${t[6]} | ${t[7]}`;
    });
    let out = `Match Recap — ${title}${date?` (${date})`:''}\n\n`;
    if (matches.length){
      out += `Matches (${matches.length})\n`;
      matches.forEach(m=>{ out += `Lap ${m.court} • Match ${m.round}${m.time?` • ${m.time}`:''} — ${m.a1} & ${m.a2} vs ${m.b1} & ${m.b2} → ${m.sa}:${m.sb}\n`; });
      out += `\n`;
    }
    if (standings.length){
      out += `Standings\n` + standings.join('\n') + `\n`;
    }
    try{ navigator.clipboard.writeText(out); }catch{
      const ta = document.createElement('textarea');
      ta.value = out; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch{} ta.remove();
    }
    try{ window.showToast?.('Recap disalin ke clipboard', 'success'); }catch{}
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
    if (!ok) { try{ showToast?.('Gagal memuat html2canvas', 'error'); }catch{} return; }
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
