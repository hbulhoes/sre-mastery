/* SRE Track — engine */
(function () {
  'use strict';
  const WORLDS = window.SRE_WORLDS || [];
  const DIAGRAMS = window.SRE_DIAGRAMS || {};
  const KEY = 'sre-track-progress-v1';

  const RANKS = [
    [0, 'Pager Rookie'], [300, 'Toil Slayer'], [800, 'Budget Keeper'], [1500, 'Incident Commander'],
    [2500, 'Systems Whisperer'], [3600, 'Principal SRE'], [5000, 'SRE Master']
  ];
  const BADGES = [
    ...WORLDS.map((w, i) => ({ id: 'w' + (i + 1), ic: 'W' + (i + 1), name: w.badge, desc: 'Cleared boss: ' + w.boss.title })),
    { id: 'flawless5', ic: '5★', name: 'Flawless ×5', desc: 'Five checkpoints with every question right first try' },
    { id: 'streak15', ic: '15', name: 'Hot Streak', desc: '15 correct answers in a row' },
    { id: 'halfway', ic: '½', name: 'Halfway There', desc: 'Half of the track cleared' },
    { id: 'master', ic: '★', name: 'SRE Master', desc: 'Passed the final mastery exam' }
  ];

  // ---------- state ----------
  const fresh = () => ({ xp: 0, done: {}, flawless: 0, streak: 0, bestStreak: 0, badges: [], answered: 0, correct: 0, last: null, examBest: 0 });
  let S = load() || fresh();
  function load() { try { const r = localStorage.getItem(KEY); return r ? Object.assign(fresh(), JSON.parse(r)) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

  // ---------- linear node list ----------
  const NODES = [];
  WORLDS.forEach((w, wi) => {
    w.lessons.forEach((l, li) => NODES.push({ kind: 'lesson', id: l.id, world: w, wi, li, item: l, label: (wi + 1) + '.' + (li + 1) }));
    NODES.push({ kind: 'boss', id: w.boss.id, world: w, wi, item: w.boss, label: 'BOSS' });
  });
  NODES.push({ kind: 'exam', id: 'final-exam', label: 'EXAM', item: { title: 'Mastery Exam' } });
  const idx = id => NODES.findIndex(n => n.id === id);
  const unlocked = i => i === 0 || !!S.done[NODES[i - 1].id];
  const nextNode = () => NODES.find((n, i) => unlocked(i) && !S.done[n.id]) || null;

  // ---------- helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, attrs, html) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rank = xp => RANKS.reduce((r, x) => xp >= x[0] ? x : r, RANKS[0]);
  const nextRank = xp => RANKS.find(x => x[0] > xp) || null;

  function toast(ic, msg) {
    const t = el('div', { class: 'toast' }, '<span class="ic">' + esc(ic) + '</span><span>' + msg + '</span>');
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
  }
  function addXp(n) {
    const before = rank(S.xp)[1]; S.xp += n; const after = rank(S.xp)[1];
    if (after !== before) toast('▲', 'Rank up: <b>' + esc(after) + '</b>');
    save(); renderTop();
  }
  function award(id) {
    if (S.badges.includes(id)) return; const b = BADGES.find(x => x.id === id); if (!b) return;
    S.badges.push(id); save(); toast('★', 'Badge earned: <b>' + esc(b.name) + '</b>');
  }
  function recordAnswer(ok) {
    S.answered++; if (ok) { S.correct++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); if (S.streak === 15) award('streak15'); } else S.streak = 0;
    save(); renderTop();
  }

  // ---------- markdown-lite ----------
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/&lt;&lt;(.+?)&gt;&gt;/g, '<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return s;
  }
  function md(src) {
    const L = src.split('\n'); const out = []; let i = 0;
    const take = pred => { const b = []; while (i < L.length && pred(L[i])) b.push(L[i++]); return b; };
    while (i < L.length) {
      const l = L[i];
      if (l.startsWith('```')) { i++; const b = take(x => !x.startsWith('```')); i++; out.push('<pre><code>' + esc(b.join('\n')) + '</code></pre>'); continue; }
      if (l.startsWith('### ')) { out.push('<h4>' + inline(l.slice(4)) + '</h4>'); i++; continue; }
      if (l.startsWith('## ')) { out.push('<h3>' + inline(l.slice(3)) + '</h3>'); i++; continue; }
      const dm = l.match(/^\[\[diagram:([\w-]+)(?:\|(.*))?\]\]$/);
      if (dm) { const d = DIAGRAMS[dm[1]]; out.push('<figure class="diagram">' + (d ? d.svg : '<p>(diagram missing: ' + esc(dm[1]) + ')</p>') + (d && d.caption ? '<figcaption>' + esc(d.caption) + '</figcaption>' : '') + '</figure>'); i++; continue; }
      if (l.startsWith('- ')) { const b = take(x => x.startsWith('- ')); out.push('<ul>' + b.map(x => '<li>' + inline(x.slice(2)) + '</li>').join('') + '</ul>'); continue; }
      if (/^\d+\. /.test(l)) { const b = take(x => /^\d+\. /.test(x)); out.push('<ol>' + b.map(x => '<li>' + inline(x.replace(/^\d+\. /, '')) + '</li>').join('') + '</ol>'); continue; }
      if (l.startsWith('> ')) {
        const b = take(x => x.startsWith('> ') || x === '>').map(x => x.slice(2));
        let cls = 'callout'; if (b[0] && b[0].startsWith('[aws]')) { cls += ' aws'; b[0] = b[0].slice(5); } else if (b[0] && b[0].startsWith('[warn]')) { cls += ' warn'; b[0] = b[0].slice(6); }
        out.push('<aside class="' + cls + '">' + md(b.join('\n')) + '</aside>'); continue;
      }
      if (l.startsWith('|')) {
        const rows = take(x => x.startsWith('|')).filter(x => !/^\|\s*-+/.test(x)).map(x => x.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
        const h = rows.shift();
        out.push('<div class="tablewrap"><table><thead><tr>' + h.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'); continue;
      }
      if (l.trim() === '') { i++; continue; }
      const b = take(x => x.trim() !== '' && !/^(## |### |- |\d+\. |> |\||```|\[\[)/.test(x));
      if (!b.length) { i++; continue; }
      out.push('<p>' + inline(b.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  // ---------- top bar ----------
  function renderTop() {
    const r = rank(S.xp), nr = nextRank(S.xp);
    $('#stRank').textContent = r[1];
    $('#stXp').textContent = S.xp + ' XP' + (nr ? ' / ' + nr[0] : '');
    $('#xpFill').style.width = nr ? Math.round(((S.xp - r[0]) / (nr[0] - r[0])) * 100) + '%' : '100%';
    $('#stStreak').textContent = S.streak;
    $('#stAcc').textContent = S.answered ? Math.round((S.correct / S.answered) * 100) + '%' : '–';
  }

  // ---------- sidebar ----------
  function renderSidebar(activeId) {
    const sb = $('#sidebar'); sb.innerHTML = '';
    const doneCount = NODES.filter(n => S.done[n.id]).length;
    sb.appendChild(el('div', { class: 'track-head' }, '<span class="eyebrow">Track map</span><span class="pct">' + doneCount + '/' + NODES.length + ' cleared</span>'));
    WORLDS.forEach((w, wi) => {
      const first = idx(w.lessons[0].id);
      const wUnlocked = unlocked(first);
      const wNodes = NODES.filter(n => n.wi === wi);
      const wDone = wNodes.filter(n => S.done[n.id]).length;
      const wrap = el('section', { class: 'world' + (wUnlocked ? '' : ' locked') + (wDone === wNodes.length ? ' done' : '') });
      wrap.appendChild(el('button', { class: 'wh', onclick: () => go('world', w.id) }, '<span class="wnum">' + (wDone === wNodes.length ? '✓' : String(wi + 1).padStart(2, '0')) + '</span><span class="wtitle">' + esc(w.title) + '</span><span class="wprog">' + wDone + '/' + wNodes.length + '</span>'));
      const ul = el('ul', { class: 'nodes' });
      wNodes.forEach(n => {
        const i = idx(n.id), u = unlocked(i), d = !!S.done[n.id];
        const li = el('li', { class: 'node' + (n.kind === 'boss' ? ' boss' : '') + (d ? ' done' : u ? (n.id === activeId ? ' current' : '') : ' locked') + (n.id === activeId ? ' active' : '') });
        const mins = n.kind === 'boss' ? 'boss' : (n.item.minutes || 8) + ' min';
        const b = el('button', { disabled: u ? null : 'disabled', onclick: () => go(n.kind, n.id) }, '<span class="dot"></span><span>' + esc(n.kind === 'boss' ? 'Boss: ' + n.item.title : n.item.title) + '</span><span class="min">' + (u ? mins : '🔒') + '</span>');
        if (!u) b.disabled = true;
        li.appendChild(b); ul.appendChild(li);
      });
      wrap.appendChild(ul); sb.appendChild(wrap);
    });
    const ex = NODES[NODES.length - 1]; const exU = unlocked(NODES.length - 1);
    const exWrap = el('section', { class: 'world' + (exU ? '' : ' locked') + (S.done[ex.id] ? ' done' : '') });
    const exBtn = el('button', { class: 'wh', onclick: () => go('exam', ex.id) }, '<span class="wnum">' + (S.done[ex.id] ? '✓' : '★') + '</span><span class="wtitle">Mastery Exam</span><span class="wprog">' + (exU ? (S.examBest ? S.examBest + '%' : 'open') : '🔒') + '</span>');
    if (!exU) exBtn.disabled = true;
    exWrap.appendChild(exBtn); sb.appendChild(exWrap);
  }

  // ---------- routing ----------
  function go(kind, id, opts) {
    closeSidebar();
    S.last = { kind, id }; save();
    const v = $('#view'); v.innerHTML = ''; window.scrollTo(0, 0);
    if (kind === 'home') renderHome(v);
    else if (kind === 'world') renderWorld(v, WORLDS.find(w => w.id === id));
    else if (kind === 'lesson') renderLesson(v, NODES[idx(id)], opts);
    else if (kind === 'boss') renderBoss(v, NODES[idx(id)]);
    else if (kind === 'exam') renderExam(v);
    renderSidebar(id);
  }
  function closeSidebar() { $('#sidebar').classList.remove('open'); }
  function continueBtn() {
    const n = nextNode();
    if (!n) return el('span', { class: 'xpgain' }, 'Track complete.');
    return el('button', { class: 'btn primary', onclick: () => go(n.kind, n.id) }, 'Continue → ' + esc(n.kind === 'boss' ? 'Boss: ' + n.item.title : n.item.title));
  }

  // ---------- home ----------
  function renderHome(v) {
    const n = nextNode();
    const h = el('section', { class: 'hero' });
    h.innerHTML = '<div class="eyebrow">Linear track · ' + WORLDS.length + ' worlds · ' + NODES.length + ' nodes</div><h1>Master Site Reliability Engineering, one node at a time.</h1>' +
      '<p>Built on the Google SRE book and workbook, extended with modern practice. Each world ends in a scenario boss fight. Nodes unlock in order: read the lesson, clear the checkpoint, move on. Progress, XP and badges save in this browser.</p>' +
      '<p>Assumed background: basic observability and AWS. Every lesson includes an <em>On AWS</em> translation of the concept.</p>';
    const act = el('div', { class: 'actions' });
    act.appendChild(n ? el('button', { class: 'btn primary', onclick: () => go(n.kind, n.id) }, (S.xp ? 'Resume → ' : 'Start → ') + esc(n.kind === 'boss' ? 'Boss: ' + n.item.title : n.item.title)) : el('span', { class: 'xpgain' }, 'You have cleared the entire track.'));
    h.appendChild(act);
    v.appendChild(h);
    v.appendChild(el('div', { class: 'howto' },
      '<div class="tile"><div class="k">Lessons</div><div class="v">Read, then clear the checkpoint</div><p>Every question must be answered correctly to pass. First-try answers earn bonus XP.</p></div>' +
      '<div class="tile"><div class="k">Boss fights</div><div class="v">Run an incident scenario</div><p>Decisions move a service-health meter. Finish above 50% to clear the world and earn its badge.</p></div>' +
      '<div class="tile"><div class="k">Mastery exam</div><div class="v">20 questions across all worlds</div><p>Unlocks after the last boss. Score 80% or more to earn the SRE Master rank.</p></div>'));
    const cards = el('div', { class: 'worldcards' });
    WORLDS.forEach((w, wi) => {
      const wNodes = NODES.filter(x => x.wi === wi); const d = wNodes.filter(x => S.done[x.id]).length; const u = unlocked(idx(w.lessons[0].id));
      const b = el('button', { class: 'wcard', onclick: () => go('world', w.id) }, '<span class="n">' + String(wi + 1).padStart(2, '0') + '</span><span><div class="t">' + esc(w.title) + '</div><div class="s">' + esc(w.subtitle) + '</div></span><span class="p">' + d + '/' + wNodes.length + '<div class="miniprog"><i style="width:' + Math.round(d / wNodes.length * 100) + '%"></i></div></span>');
      if (!u) b.disabled = true; cards.appendChild(b);
    });
    v.appendChild(cards);
  }

  // ---------- world overview ----------
  function renderWorld(v, w) {
    const wi = WORLDS.indexOf(w);
    v.appendChild(el('div', { class: 'lesson-head' }, '<div class="eyebrow">World ' + (wi + 1) + '</div><h1>' + esc(w.title) + '</h1><p style="margin:0;color:var(--ink-2)">' + esc(w.subtitle) + '</p>'));
    v.appendChild(el('div', { class: 'body' }, md(w.intro)));
    const cards = el('div', { class: 'worldcards' });
    NODES.filter(n => n.wi === wi).forEach(n => {
      const i = idx(n.id), u = unlocked(i), d = !!S.done[n.id];
      const b = el('button', { class: 'wcard', onclick: () => go(n.kind, n.id) }, '<span class="n">' + (n.kind === 'boss' ? '◆' : n.label) + '</span><span><div class="t">' + esc(n.kind === 'boss' ? 'Boss: ' + n.item.title : n.item.title) + '</div><div class="s">' + esc(n.item.summary || '') + '</div></span><span class="p">' + (d ? 'cleared' : u ? 'open' : 'locked') + '</span>');
      if (!u) b.disabled = true; cards.appendChild(b);
    });
    v.appendChild(cards);
  }

  // ---------- lesson ----------
  function renderLesson(v, n, opts) {
    const l = n.item, w = n.world;
    v.appendChild(el('div', { class: 'lesson-head' }, '<div class="eyebrow">World ' + (n.wi + 1) + ' · ' + esc(w.title) + ' · Lesson ' + n.label + '</div><h1>' + esc(l.title) + '</h1><div class="meta"><span>~' + (l.minutes || 8) + ' min read</span><span>' + l.exercises.length + ' checkpoint questions</span>' + (l.source ? '<span>Source: ' + esc(l.source) + '</span>' : '') + (S.done[l.id] ? '<span style="color:var(--good)">✓ cleared</span>' : '') + '</div>'));
    v.appendChild(el('div', { class: 'body' }, md(l.body)));
    const cp = el('section', { class: 'checkpoint' });
    v.appendChild(cp);
    if (opts && opts.startCheckpoint) runCheckpoint(cp, n); else {
      cp.appendChild(el('div', { class: 'cp-head' }, '<h2>Checkpoint</h2><span class="cp-prog">' + l.exercises.length + ' questions · answer all correctly to clear</span>'));
      const a = el('div', { class: 'actions' });
      a.appendChild(el('button', { class: 'btn primary', onclick: () => { cp.innerHTML = ''; runCheckpoint(cp, n); cp.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, S.done[l.id] ? 'Replay checkpoint' : 'Start checkpoint →'));
      if (S.done[l.id]) a.appendChild(continueBtn());
      cp.appendChild(a);
    }
  }

  function runCheckpoint(cp, n) {
    const l = n.item; const qs = l.exercises; let qi = 0; let firstTry = 0; let sessionXp = 0; const already = !!S.done[l.id];
    const head = el('div', { class: 'cp-head' }, '<h2>Checkpoint</h2><span class="cp-prog" id="cpProg"></span>');
    cp.appendChild(head); const slot = el('div'); cp.appendChild(slot);
    const next = () => {
      slot.innerHTML = ''; $('#cpProg').textContent = 'Question ' + (qi + 1) + ' of ' + qs.length;
      if (qi >= qs.length) return finish();
      renderQuestion(slot, qs[qi], (ok, first) => {
        if (ok && first) { firstTry++; const g = already ? 2 : 10; sessionXp += g; addXp(g); }
        if (ok) { qi++; }
      }, () => next());
    };
    const finish = () => {
      $('#cpProg').textContent = 'Complete';
      const flawless = firstTry === qs.length;
      let gain = 0;
      if (!already) { gain = 50 + (flawless ? 25 : 0); addXp(gain); S.done[l.id] = { at: Date.now(), flawless }; if (flawless) { S.flawless++; if (S.flawless >= 5) award('flawless5'); } save(); checkHalfway(); }
      const r = el('div', { class: 'result' });
      r.innerHTML = '<div class="eyebrow">Checkpoint cleared</div><h2>' + (flawless ? 'Flawless.' : 'Cleared.') + '</h2><div class="grid3"><div class="tile"><div class="k">First-try</div><div class="v">' + firstTry + '/' + qs.length + '</div></div><div class="tile"><div class="k">XP this run</div><div class="v">+' + (sessionXp + gain) + '</div></div><div class="tile"><div class="k">Rank</div><div class="v" style="font-size:.9rem">' + esc(rank(S.xp)[1]) + '</div></div></div>' + (already ? '<p style="color:var(--ink-3);font-size:.85rem">Replay: reduced XP, lesson already cleared.</p>' : '');
      const a = el('div', { class: 'actions' }); a.appendChild(continueBtn()); a.appendChild(el('button', { class: 'btn ghost', onclick: () => go('world', n.world.id) }, 'World overview')); r.appendChild(a);
      slot.appendChild(r); renderSidebar(n.id);
    };
    next();
  }
  function checkHalfway() { const d = NODES.filter(n => S.done[n.id]).length; if (d >= Math.ceil(NODES.length / 2)) award('halfway'); }

  // ---------- question renderers ----------
  // onResult(ok, firstTry) is called on each check; onNext() when user proceeds after a correct answer
  function renderQuestion(slot, q, onResult, onNext, quiet) {
    let attempts = 0;
    const card = el('div', { class: 'qcard' });
    const label = { mcq: 'Single choice', multi: 'Multiple select', num: 'Calculate', order: 'Put in order', tf: 'True or false' }[q.type] || q.type;
    card.appendChild(el('span', { class: 'qtype' }, label));
    card.appendChild(el('p', { class: 'q' }, inline(q.q)));
    const body = el('div'); card.appendChild(body);
    const foot = el('div', { class: 'qfoot' }); const fb = el('div'); card.appendChild(fb); card.appendChild(foot);
    slot.appendChild(card);

    const finishQ = (ok, msg) => {
      attempts++;
      if (!quiet) recordAnswer(ok);
      fb.innerHTML = '';
      fb.appendChild(el('div', { class: 'feedback ' + (ok ? 'ok' : 'bad') }, '<b>' + (ok ? 'Correct' : 'Not quite') + '</b>' + inline(msg || q.explain || '')));
      onResult(ok, attempts === 1);
      foot.innerHTML = '';
      if (ok) {
        foot.appendChild(el('span', { class: 'xpgain' }, attempts === 1 && !quiet ? '+10 XP first try' : ''));
        foot.appendChild(el('button', { class: 'btn primary', onclick: onNext }, 'Next →'));
      } else if (quiet) {
        foot.appendChild(el('span')); foot.appendChild(el('button', { class: 'btn primary', onclick: onNext }, 'Next →'));
      } else {
        foot.appendChild(el('span', { class: 'xpgain', style: 'color:var(--crit)' }, 'Streak reset'));
        foot.appendChild(el('button', { class: 'btn', onclick: () => { fb.innerHTML = ''; foot.innerHTML = ''; build(); } }, 'Try again'));
      }
    };

    function build() {
      body.innerHTML = '';
      if (q.type === 'mcq' || q.type === 'tf') {
        const choices = q.type === 'tf' ? ['True', 'False'] : q.choices;
        const order = q.type === 'tf' || q.fixed ? choices.map((_, i) => i) : shuffle(choices.map((_, i) => i));
        const ul = el('ul', { class: 'choices' });
        order.forEach((ci, k) => {
          const b = el('button', { class: 'choice', 'data-key': String.fromCharCode(65 + k) }, inline(choices[ci]));
          b.dataset.ci = ci;
          b.addEventListener('click', () => {
            ul.querySelectorAll('.choice').forEach(x => x.disabled = true);
            const ok = ci === q.answer; b.classList.add(ok ? 'ok' : 'bad');
            if (!ok && quiet) { const right = ul.querySelector('.choice[data-ci="' + q.answer + '"]'); if (right) right.classList.add('ok'); }
            finishQ(ok);
          });
          const li = el('li'); li.appendChild(b); ul.appendChild(li);
        });
        body.appendChild(ul);
      } else if (q.type === 'multi') {
        const order = shuffle(q.choices.map((_, i) => i)); const sel = new Set();
        const ul = el('ul', { class: 'choices' });
        order.forEach((ci, k) => {
          const b = el('button', { class: 'choice', 'data-key': String.fromCharCode(65 + k) }, inline(q.choices[ci]));
          b.addEventListener('click', () => { if (sel.has(ci)) { sel.delete(ci); b.classList.remove('sel'); } else { sel.add(ci); b.classList.add('sel'); } });
          b.dataset.ci = ci; ul.appendChild(el('li')).appendChild(b);
        });
        body.appendChild(ul);
        body.appendChild(el('div', { class: 'actions', style: 'margin-top:12px' })).appendChild(el('button', { class: 'btn', onclick: () => {
          const want = new Set(q.answers); const ok = want.size === sel.size && [...sel].every(x => want.has(x));
          ul.querySelectorAll('.choice').forEach(x => { x.disabled = true; const ci = +x.dataset.ci; if (sel.has(ci)) x.classList.add(want.has(ci) ? 'ok' : 'bad'); else if (!ok && quiet && want.has(ci)) x.classList.add('ok'); });
          finishQ(ok, ok ? null : (q.explain || '') + (sel.size !== want.size ? ' (Select exactly ' + want.size + '.)' : ''));
        } }, 'Check answer'));
      } else if (q.type === 'num') {
        const row = el('div', { class: 'numrow' });
        const inp = el('input', { type: 'text', inputmode: 'decimal', id: 'num-' + Math.random().toString(36).slice(2, 8), placeholder: q.placeholder || 'value' });
        row.appendChild(inp); if (q.unit) row.appendChild(el('span', { class: 'unit' }, esc(q.unit)));
        const check = () => { const val = parseFloat(String(inp.value).replace(/,/g, '').replace(/%$/, '')); if (isNaN(val)) return; inp.disabled = true; const tol = q.tolerance != null ? q.tolerance : Math.abs(q.answer) * 0.02; const ok = Math.abs(val - q.answer) <= tol; finishQ(ok, ok ? q.explain : 'Expected ' + q.answer + (q.unit ? ' ' + q.unit : '') + '. ' + (q.explain || '')); };
        row.appendChild(el('button', { class: 'btn', onclick: check }, 'Check'));
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        body.appendChild(row); if (q.hint) body.appendChild(el('p', { style: 'font-size:.82rem;color:var(--ink-3);margin:8px 0 0' }, 'Hint: ' + inline(q.hint)));
        setTimeout(() => inp.focus(), 50);
      } else if (q.type === 'order') {
        const pool = shuffle(q.items.map((_, i) => i)); const seq = [];
        const wrap = el('div', { class: 'order-wrap' });
        const poolBox = el('div'); const seqBox = el('div');
        wrap.appendChild(seqBox); wrap.appendChild(poolBox); body.appendChild(wrap);
        const draw = () => {
          seqBox.innerHTML = '<div class="order-lbl">Your sequence (click to remove)</div>'; poolBox.innerHTML = '<div class="order-lbl">Available steps (click to add)</div>';
          const s = el('div', { class: 'order-seq' }); seq.forEach((ii, k) => { const c = el('button', { class: 'chip', onclick: () => { seq.splice(k, 1); draw(); } }, '<span class="n">' + (k + 1) + '</span><span>' + inline(q.items[ii]) + '</span>'); s.appendChild(c); });
          if (!seq.length) s.appendChild(el('span', { style: 'font-size:.8rem;color:var(--ink-3)' }, 'Nothing yet.'));
          seqBox.appendChild(s);
          const p = el('div', { class: 'order-pool' }); pool.filter(x => !seq.includes(x)).forEach(ii => p.appendChild(el('button', { class: 'chip', onclick: () => { seq.push(ii); draw(); } }, '<span class="n">·</span><span>' + inline(q.items[ii]) + '</span>')));
          poolBox.appendChild(p);
          if (seq.length === q.items.length) {
            const a = el('div', { class: 'actions', style: 'margin-top:4px' });
            a.appendChild(el('button', { class: 'btn', onclick: () => {
              const ok = seq.every((x, k) => x === k);
              s.querySelectorAll('.chip').forEach((c, k) => { c.disabled = true; c.classList.add(seq[k] === k ? 'ok' : 'bad'); });
              poolBox.innerHTML = ''; finishQ(ok);
            } }, 'Check order'));
            seqBox.appendChild(a);
          }
        };
        draw();
      }
    }
    build();
  }

  // ---------- boss ----------
  function renderBoss(v, n) {
    const START = 80;
    const b = n.item, w = n.world; let health = START; let si = 0; let log = [];
    const banner = el('div', { class: 'boss-banner' });
    banner.innerHTML = '<div><div class="eyebrow">World ' + (n.wi + 1) + ' boss · ' + esc(w.title) + '</div><h1>' + esc(b.title) + '</h1><p>' + esc(b.tagline || '') + '</p></div><div class="health"><div class="row"><span>Service health</span><span id="hv">' + START + '%</span></div><div class="hbar"><i id="hb" style="width:' + START + '%"></i></div></div>';
    v.appendChild(banner);
    const scene = el('div', { class: 'scene' }); v.appendChild(scene);
    const setHealth = d => { health = Math.max(0, Math.min(100, health + d)); const i = $('#hb'); i.style.width = health + '%'; i.className = health < 35 ? 'crit' : health < 65 ? 'warn' : ''; $('#hv').textContent = health + '%'; };
    const intro = () => {
      scene.innerHTML = '<div class="t">Briefing</div>' + md(b.intro);
      const a = el('div', { class: 'actions' }); a.appendChild(el('button', { class: 'btn primary', onclick: step }, 'Take the pager →')); scene.appendChild(a);
    };
    const step = () => {
      if (si >= b.steps.length) return end();
      const st = b.steps[si];
      scene.innerHTML = '<div class="t">Turn ' + (si + 1) + ' of ' + b.steps.length + (st.time ? ' · ' + esc(st.time) : '') + '</div>' + '<div class="narr">' + md(st.text) + '</div>';
      const ul = el('ul', { class: 'choices' }); const order = shuffle(st.choices.map((_, i) => i));
      order.forEach((ci, k) => {
        const c = st.choices[ci];
        const btn = el('button', { class: 'choice', 'data-key': String.fromCharCode(65 + k) }, inline(c.text));
        btn.addEventListener('click', () => {
          ul.querySelectorAll('.choice').forEach(x => x.disabled = true);
          const best = c.d >= 0; btn.classList.add(best ? 'ok' : 'bad'); setHealth(c.d); log.push({ turn: si + 1, d: c.d, best: c.d === Math.max(...st.choices.map(x => x.d)) });
          recordAnswer(c.d >= 0);
          const f = el('div', { class: 'feedback ' + (best ? 'ok' : 'bad') }, '<b>Outcome <span class="delta ' + (c.d > 0 ? 'up' : c.d < 0 ? 'down' : 'flat') + '">' + (c.d > 0 ? '+' : '') + c.d + ' health</span></b>' + inline(c.fb));
          scene.appendChild(f);
          const a = el('div', { class: 'actions' }); a.appendChild(el('button', { class: 'btn primary', onclick: () => { si++; step(); } }, si + 1 < b.steps.length ? 'Next turn →' : 'See the outcome →')); scene.appendChild(a);
        });
        ul.appendChild(el('li')).appendChild(btn);
      });
      scene.appendChild(ul);
    };
    const end = () => {
      const win = health >= 50; const already = !!S.done[b.id]; let gain = 0;
      if (win) { gain = already ? Math.round(health / 2) : 100 + health; addXp(gain); if (!already) { S.done[b.id] = { at: Date.now(), health }; award('w' + (n.wi + 1)); save(); checkHalfway(); } }
      scene.innerHTML = '<div class="t">Debrief</div><h2 style="font-size:1.5rem;font-weight:800;margin-bottom:8px">' + (win ? (health >= 85 ? 'Textbook response.' : 'Service survived.') : 'The service went down.') + '</h2>' + md(win ? b.win : b.lose) +
        '<div class="grid3"><div class="tile"><div class="k">Final health</div><div class="v">' + health + '%</div></div><div class="tile"><div class="k">Best calls</div><div class="v">' + log.filter(x => x.best).length + '/' + b.steps.length + '</div></div><div class="tile"><div class="k">XP</div><div class="v">+' + gain + '</div></div></div>';
      const a = el('div', { class: 'actions' });
      if (win) a.appendChild(continueBtn()); a.appendChild(el('button', { class: 'btn' + (win ? ' ghost' : ' primary'), onclick: () => { health = START; si = 0; log = []; setHealth(0); intro(); } }, win ? 'Replay boss' : 'Retry boss'));
      scene.appendChild(a); renderSidebar(b.id);
    };
    intro();
  }

  // ---------- exam ----------
  function renderExam(v) {
    const pool = []; WORLDS.forEach(w => w.lessons.forEach(l => l.exercises.forEach(q => { if (q.type !== 'order') pool.push(q); })));
    const N = Math.min(20, pool.length);
    v.appendChild(el('div', { class: 'lesson-head' }, '<div class="eyebrow">Final node</div><h1>Mastery Exam</h1><div class="meta"><span>' + N + ' questions drawn at random from ' + pool.length + '</span><span>pass mark 80%</span>' + (S.examBest ? '<span>best: ' + S.examBest + '%</span>' : '') + '</div>'));
    const slot = el('div'); v.appendChild(slot);
    const start = () => {
      const qs = shuffle(pool).slice(0, N); let qi = 0, right = 0; slot.innerHTML = '';
      const head = el('div', { class: 'cp-head' }, '<h2>Exam</h2><span class="cp-prog" id="exProg"></span>'); slot.appendChild(head); const s = el('div'); slot.appendChild(s);
      const next = () => {
        s.innerHTML = ''; if (qi >= qs.length) return done();
        $('#exProg').textContent = 'Question ' + (qi + 1) + ' of ' + qs.length + ' · ' + right + ' correct';
        renderQuestion(s, qs[qi], ok => { if (ok) right++; qi++; }, next, true);
      };
      const done = () => {
        const pct = Math.round(right / qs.length * 100); const pass = pct >= 80; const already = !!S.done['final-exam'];
        S.examBest = Math.max(S.examBest || 0, pct); let gain = 0;
        if (pass) { gain = already ? 50 : 500; addXp(gain); if (!already) { S.done['final-exam'] = { at: Date.now(), pct }; award('master'); } }
        save();
        const r = el('div', { class: 'result' }, '<div class="eyebrow">Exam result</div><h2>' + (pass ? 'Mastery confirmed.' : 'Not yet.') + '</h2><div class="big">' + pct + '%</div><div class="grid3"><div class="tile"><div class="k">Correct</div><div class="v">' + right + '/' + qs.length + '</div></div><div class="tile"><div class="k">XP</div><div class="v">+' + gain + '</div></div><div class="tile"><div class="k">Rank</div><div class="v" style="font-size:.9rem">' + esc(rank(S.xp)[1]) + '</div></div></div>' + (pass ? '<p>You have cleared every node in the track. Revisit any lesson from the map; replays still earn reduced XP.</p>' : '<p>Review the worlds where you missed questions and try again. The exam draws a fresh random set each run.</p>'));
        const a = el('div', { class: 'actions' }); a.appendChild(el('button', { class: 'btn primary', onclick: start }, 'Take it again')); a.appendChild(el('button', { class: 'btn ghost', onclick: () => go('home') }, 'Track overview')); r.appendChild(a);
        s.appendChild(r); renderSidebar('final-exam');
      };
      next();
    };
    const a = el('div', { class: 'actions' }); a.appendChild(el('button', { class: 'btn primary', onclick: start }, 'Begin exam →')); slot.appendChild(a);
  }

  // ---------- profile modal ----------
  function openProfile() {
    const bg = el('div', { class: 'modal-bg', onclick: e => { if (e.target === bg) bg.remove(); } });
    const m = el('div', { class: 'modal' });
    const r = rank(S.xp);
    m.innerHTML = '<div class="eyebrow">Player</div><h2>' + esc(r[1]) + ' · ' + S.xp + ' XP</h2><div class="grid3"><div class="tile"><div class="k">Nodes cleared</div><div class="v">' + NODES.filter(n => S.done[n.id]).length + '/' + NODES.length + '</div></div><div class="tile"><div class="k">Accuracy</div><div class="v">' + (S.answered ? Math.round(S.correct / S.answered * 100) + '%' : '–') + '</div></div><div class="tile"><div class="k">Best streak</div><div class="v">' + S.bestStreak + '</div></div><div class="tile"><div class="k">Flawless</div><div class="v">' + S.flawless + '</div></div></div>' +
      '<h3>Badges</h3><div class="badges">' + BADGES.map(b => '<div class="badge' + (S.badges.includes(b.id) ? '' : ' off') + '"><span class="ic">' + esc(b.ic) + '</span><span><div class="bn">' + esc(b.name) + '</div><div class="bd">' + esc(b.desc) + '</div></span></div>').join('') + '</div>' +
      '<h3>Ranks</h3><ul class="ranks">' + RANKS.map(x => '<li class="' + (x[1] === r[1] ? 'cur' : x[0] > S.xp ? 'off' : '') + '"><span>' + esc(x[1]) + '</span><span>' + x[0] + ' XP</span></li>').join('') + '</ul>' +
      '<h3>Save data</h3><p style="font-size:.82rem;color:var(--ink-2);margin:0 0 6px">Progress lives in this browser. Copy this text to move it to another device, or paste a saved copy and import it.</p>';
    const ta = el('textarea', { class: 'export', id: 'saveData' }); ta.value = JSON.stringify(S); m.appendChild(ta);
    const a = el('div', { class: 'actions', style: 'margin-top:10px' });
    a.appendChild(el('button', { class: 'btn small', onclick: () => { try { const d = JSON.parse(ta.value); S = Object.assign(fresh(), d); save(); bg.remove(); renderTop(); go('home'); toast('✓', 'Progress imported'); } catch (e) { toast('!', 'That text is not a valid save.'); } } }, 'Import from text'));
    a.appendChild(el('button', { class: 'btn small ghost', onclick: () => { if (confirm('Reset all progress, XP and badges?')) { S = fresh(); save(); bg.remove(); renderTop(); go('home'); } } }, 'Reset progress'));
    a.appendChild(el('button', { class: 'btn small primary', onclick: () => bg.remove(), style: 'margin-left:auto' }, 'Close'));
    m.appendChild(a); bg.appendChild(m); document.body.appendChild(bg);
  }

  // ---------- boot ----------
  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#homeBtn').addEventListener('click', () => go('home'));
  $('#profileBtn').addEventListener('click', openProfile);
  document.addEventListener('click', e => { if (window.innerWidth <= 900 && !e.target.closest('#sidebar') && !e.target.closest('#menuBtn')) closeSidebar(); });
  renderTop();
  go('home');
})();
