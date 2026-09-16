/* SRE Track — shared helpers for the Node tools.
   The app ships as plain <script> files that assign to `window`, so the tools
   evaluate them against a stub window rather than importing modules. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readManifest() {
  const w = {};
  run(path.join(ROOT, 'i18n/manifest.js'), w);
  return { locales: w.SRE_MANIFEST, fallback: w.SRE_LOCALE_FALLBACK || 'en' };
}

function run(file, w) {
  let code;
  try { code = fs.readFileSync(file, 'utf8'); }
  catch (e) {
    const err = new Error('missing file: ' + path.relative(ROOT, file).replace(/\\/g, '/'));
    err.missing = true;
    throw err;
  }
  const fn = new Function('window', code + '\n//# sourceURL=' + file);
  fn(w);
  return w;
}

function exists(p) { try { fs.accessSync(path.join(ROOT, p)); return true; } catch (e) { return false; } }

/* Loads the world list for a locale, falling back to the fallback locale for
   any world that locale has not translated — exactly what i18n/boot.js does. */
function loadWorlds(locale) {
  const { locales, fallback } = readManifest();
  const entry = locales[locale];
  if (!entry) throw new Error('unknown locale: ' + locale);
  const total = locales[fallback].worlds.length;
  const w = { SRE_WORLDS: [] };
  const usedFallback = [];
  for (let n = 1; n <= total; n++) {
    const has = entry.worlds.indexOf(n) !== -1;
    if (!has) usedFallback.push('w' + n);
    run(path.join(ROOT, 'content', has ? locale : fallback, 'w' + n + '.js'), w);
  }
  return { worlds: w.SRE_WORLDS, usedFallback };
}

/* Loads only the worlds actually authored for this locale (no fallback). */
function loadOwnWorlds(locale) {
  const { locales } = readManifest();
  const w = { SRE_WORLDS: [] };
  locales[locale].worlds.forEach(n => run(path.join(ROOT, 'content', locale, 'w' + n + '.js'), w));
  return w.SRE_WORLDS;
}

function loadDiagrams() {
  const w = {};
  run(path.join(ROOT, 'diagrams.js'), w);
  return w.SRE_DIAGRAMS;
}

function loadDiagramText(locale) {
  const { fallback } = readManifest();
  const w = {};
  run(path.join(ROOT, 'i18n/dg.' + fallback + '.js'), w);
  if (locale !== fallback && exists('i18n/dg.' + locale + '.js')) run(path.join(ROOT, 'i18n/dg.' + locale + '.js'), w);
  const all = w.SRE_DG_ALL || {};
  return { own: all[locale] || {}, merged: Object.assign({}, all[fallback] || {}, all[locale] || {}), fallbackText: all[fallback] || {} };
}

function loadUi(locale) {
  const { fallback } = readManifest();
  const w = {};
  run(path.join(ROOT, 'i18n/ui.' + fallback + '.js'), w);
  if (locale !== fallback && exists('i18n/ui.' + locale + '.js')) run(path.join(ROOT, 'i18n/ui.' + locale + '.js'), w);
  const all = w.SRE_UI_ALL || {};
  return { own: all[locale] || {}, fallbackUi: all[fallback] || {} };
}

/* Walks every translatable string in a world, calling visit(key, value, setter). */
function walkWorld(world, wi, visit) {
  const wk = 'w' + (wi + 1);
  ['title', 'subtitle', 'badge', 'intro'].forEach(k => visit(wk + '.' + k, world[k], v => { world[k] = v; }));
  world.lessons.forEach((l, li) => {
    const lk = wk + '.l' + (li + 1);
    ['title', 'summary', 'body', 'source'].forEach(k => { if (l[k] != null) visit(lk + '.' + k, l[k], v => { l[k] = v; }); });
    l.exercises.forEach((q, qi) => {
      const qk = lk + '.q' + qi;
      ['q', 'explain', 'hint', 'unit', 'placeholder'].forEach(k => { if (q[k] != null) visit(qk + '.' + k, q[k], v => { q[k] = v; }); });
      (q.choices || []).forEach((c, ci) => visit(qk + '.c' + ci, c, v => { q.choices[ci] = v; }));
      (q.items || []).forEach((c, ii) => visit(qk + '.i' + ii, c, v => { q.items[ii] = v; }));
    });
  });
  const b = world.boss, bk = wk + '.boss';
  ['title', 'tagline', 'intro', 'win', 'lose'].forEach(k => visit(bk + '.' + k, b[k], v => { b[k] = v; }));
  b.steps.forEach((s, si) => {
    const sk = bk + '.s' + si;
    if (s.time != null) visit(sk + '.time', s.time, v => { s.time = v; });
    visit(sk + '.text', s.text, v => { s.text = v; });
    s.choices.forEach((c, ci) => {
      visit(sk + '.c' + ci + '.text', c.text, v => { c.text = v; });
      visit(sk + '.c' + ci + '.fb', c.fb, v => { c.fb = v; });
    });
  });
}

module.exports = { ROOT, run, exists, readManifest, loadWorlds, loadOwnWorlds, loadDiagrams, loadDiagramText, loadUi, walkWorld };
