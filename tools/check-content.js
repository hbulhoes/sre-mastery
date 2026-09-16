#!/usr/bin/env node
/* SRE Track — content validator.
   Checks a locale's track for structural soundness and playability:
   every node reachable, every question answerable, every diagram present,
   and every boss winnable on best play but losable on worst.

   Usage: node tools/check-content.js [--locale de]   (default: every locale)
*/
const { readManifest, loadWorlds, loadDiagrams, loadDiagramText } = require('./lib');

const args = process.argv.slice(2);
const argOf = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const { locales, fallback } = readManifest();
const targets = argOf('--locale') ? [argOf('--locale')] : Object.keys(locales);

const BOSS_START = 80, BOSS_PASS = 50, BOSS_CAP = 100;
let failed = false;

for (const locale of targets) {
  const errs = [];
  let worlds, diagrams, dgText;
  try {
    worlds = loadWorlds(locale).worlds;
    diagrams = loadDiagrams();
    dgText = loadDiagramText(locale).merged;
  } catch (e) {
    failed = true;
    console.log('FAIL ' + locale + ' — ' + e.message + (e.missing ? '\n     (declared in i18n/manifest.js; run tools/import.js or correct the manifest)' : ''));
    continue;
  }
  const ids = new Set();
  let lessons = 0, questions = 0, bossSteps = 0;
  const usedDiagrams = new Set();

  const seeDiagrams = (body, where) => {
    String(body).split('\n').forEach(line => {
      if (line.indexOf('[[diagram:') === -1) return;
      const m = line.trim().match(/^\[\[diagram:([\w-]+)(?:\|.*)?\]\]$/);
      if (!m) { errs.push(where + ': diagram tag is not alone on its line'); return; }
      usedDiagrams.add(m[1]);
      if (!diagrams[m[1]]) errs.push(where + ': references missing diagram "' + m[1] + '"');
    });
  };

  const checkQ = (q, where) => {
    questions++;
    if (['mcq', 'multi', 'num', 'order', 'tf'].indexOf(q.type) === -1) errs.push(where + ': unknown type ' + q.type);
    if (!q.q) errs.push(where + ': missing prompt');
    if (!q.explain) errs.push(where + ': missing explanation');
    if (q.type === 'mcq') {
      if (!Array.isArray(q.choices) || q.choices.length < 2) errs.push(where + ': needs at least two choices');
      else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) errs.push(where + ': answer index out of range');
    }
    if (q.type === 'tf' && q.answer !== 0 && q.answer !== 1) errs.push(where + ': true/false answer must be 0 or 1');
    if (q.type === 'multi') {
      if (!Array.isArray(q.answers) || !q.answers.length) errs.push(where + ': needs answers');
      else q.answers.forEach(a => { if (!(a >= 0 && a < (q.choices || []).length)) errs.push(where + ': answer index out of range'); });
    }
    if (q.type === 'num') {
      if (typeof q.answer !== 'number' || isNaN(q.answer)) errs.push(where + ': needs a numeric answer');
      if (q.tolerance == null) errs.push(where + ': should declare a tolerance');
    }
    if (q.type === 'order' && (!Array.isArray(q.items) || q.items.length < 3)) errs.push(where + ': order needs at least three items');
  };

  worlds.forEach((w, wi) => {
    ['id', 'title', 'subtitle', 'badge', 'intro', 'lessons', 'boss'].forEach(k => { if (!w[k]) errs.push('world ' + (wi + 1) + ': missing ' + k); });
    if (ids.has(w.id)) errs.push('duplicate world id ' + w.id);
    ids.add(w.id);
    seeDiagrams(w.intro, w.id + ' intro');

    w.lessons.forEach(l => {
      lessons++;
      const where = w.id + '/' + l.id;
      ['id', 'title', 'summary', 'body', 'exercises'].forEach(k => { if (!l[k]) errs.push(where + ': missing ' + k); });
      if (ids.has(l.id)) errs.push('duplicate node id ' + l.id);
      ids.add(l.id);
      if (!l.exercises.length) errs.push(where + ': no exercises');
      if (!/>\s*\[aws\]/.test(l.body)) errs.push(where + ': no On AWS callout');
      l.exercises.forEach((q, qi) => checkQ(q, where + ' q' + (qi + 1)));
      seeDiagrams(l.body, where);
    });

    const b = w.boss;
    ['id', 'title', 'tagline', 'intro', 'steps', 'win', 'lose'].forEach(k => { if (!b[k]) errs.push(w.id + ' boss: missing ' + k); });
    if (ids.has(b.id)) errs.push('duplicate node id ' + b.id);
    ids.add(b.id);

    let best = BOSS_START, worst = BOSS_START;
    b.steps.forEach((s, si) => {
      bossSteps++;
      const where = w.id + ' boss step ' + (si + 1);
      if (!s.text) errs.push(where + ': missing text');
      if (!Array.isArray(s.choices) || s.choices.length < 2) errs.push(where + ': needs at least two choices');
      else {
        const ds = s.choices.map(c => c.d);
        if (Math.max.apply(null, ds) <= 0) errs.push(where + ': no choice improves health, so the boss is unwinnable');
        s.choices.forEach((c, ci) => {
          if (typeof c.d !== 'number') errs.push(where + ' choice ' + ci + ': missing health delta');
          if (!c.text) errs.push(where + ' choice ' + ci + ': missing text');
          if (!c.fb) errs.push(where + ' choice ' + ci + ': missing feedback');
        });
        best = Math.max(0, Math.min(BOSS_CAP, best + Math.max.apply(null, ds)));
        worst = Math.max(0, Math.min(BOSS_CAP, worst + Math.min.apply(null, ds)));
      }
    });
    if (best < BOSS_PASS) errs.push(w.id + ' boss: perfect play ends at ' + best + '%, below the ' + BOSS_PASS + '% pass mark');
    if (worst >= BOSS_PASS) errs.push(w.id + ' boss: worst play still passes at ' + worst + '%');
  });

  Object.keys(diagrams).forEach(k => { if (!usedDiagrams.has(k)) errs.push('diagram "' + k + '" is defined but never referenced'); });

  // Every {{placeholder}} in the geometry must resolve for this locale.
  Object.keys(diagrams).forEach(k => {
    const all = (diagrams[k].svg + diagrams[k].caption).match(/\{\{([\w.-]+)\}\}/g) || [];
    all.forEach(tok => {
      const key = tok.slice(2, -2);
      if (dgText[key] === undefined) errs.push('diagram "' + k + '": no text for placeholder ' + tok);
    });
  });

  const nodes = lessons + worlds.length + 1;
  const label = locale + (locale === fallback ? ' (source)' : '');
  if (errs.length) {
    failed = true;
    console.log('FAIL ' + label + ' — ' + errs.length + ' problem(s)');
    errs.forEach(e => console.log('   - ' + e));
  } else {
    console.log('ok   ' + label.padEnd(14) + nodes + ' nodes, ' + lessons + ' lessons, ' + worlds.length + ' bosses (' + bossSteps + ' turns), ' + questions + ' questions, ' + Object.keys(diagrams).length + ' diagrams');
  }
}

process.exit(failed ? 1 : 0);
