#!/usr/bin/env node
/* SRE Track — extract translatable strings.

   Writes i18n/source/<domain>.json   : flat key -> English, protected spans masked as %N%
          i18n/source/<domain>.parts.json : the masked originals, used on import

   The source is locale-independent. Translators (or an MT engine) copy a
   <domain>.json into i18n/target/<locale>/ and translate the values only.

   Usage: node tools/extract.js [--domain ui|dg|w1..w7|all]
*/
const fs = require('fs');
const path = require('path');
const { ROOT, readManifest, loadOwnWorlds, walkWorld, run } = require('./lib');
const { protect } = require('./protect');

const args = process.argv.slice(2);
const argOf = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const only = argOf('--domain') || 'all';

const { fallback } = readManifest();
const SRC = path.join(ROOT, 'i18n/source');
fs.mkdirSync(SRC, { recursive: true });

function write(domain, strings) {
  const out = {}, parts = {};
  Object.keys(strings).forEach(k => {
    const r = protect(strings[k]);
    out[k] = r.text;
    if (r.parts.length) parts[k] = r.parts;
  });
  fs.writeFileSync(path.join(SRC, domain + '.json'), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(SRC, domain + '.parts.json'), JSON.stringify(parts, null, 2) + '\n');
  const chars = Object.values(strings).reduce((a, s) => a + String(s).length, 0);
  console.log(String(domain).padEnd(6), String(Object.keys(out).length).padStart(5), 'strings', String(chars).padStart(7), 'chars');
}

const want = d => only === 'all' || only === d;

// ---- UI ----
if (want('ui')) {
  const w = {};
  run(path.join(ROOT, 'i18n/ui.' + fallback + '.js'), w);
  const cat = w.SRE_UI_ALL[fallback];
  const flat = {};
  Object.keys(cat).forEach(k => {
    const v = cat[k];
    if (v && typeof v === 'object') Object.keys(v).forEach(c => { flat[k + '#' + c] = v[c]; });
    else flat[k] = v;
  });
  write('ui', flat);
}

// ---- diagram labels ----
if (want('dg')) {
  const w = {};
  run(path.join(ROOT, 'i18n/dg.' + fallback + '.js'), w);
  write('dg', w.SRE_DG_ALL[fallback]);
}

// ---- content, one domain per world ----
const worlds = loadOwnWorlds(fallback);
worlds.forEach((world, wi) => {
  const domain = 'w' + (wi + 1);
  if (!want(domain)) return;
  const strings = {};
  walkWorld(world, wi, (key, value) => { strings[key] = value; });
  write(domain, strings);
});

console.log('\nsource written to i18n/source/');
console.log('translate the values in a copy under i18n/target/<locale>/, keep %N% markers intact, then run tools/import.js');
