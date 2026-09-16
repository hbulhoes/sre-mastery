#!/usr/bin/env node
/* SRE Track — structural parity between each locale and the source language.

   A translation must never change the shape of the track. This is the guard
   that protects quiz correctness: choices are answered by index, and an `order`
   question's correct answer IS the position of each item in its array, so a
   translator who reorders a list silently inverts the right answer.

   Usage: node tools/check-locales.js [--locale de]
*/
const fs = require('fs');
const path = require('path');
const { ROOT, readManifest, loadOwnWorlds, loadUi, loadDiagramText, loadDiagrams, walkWorld } = require('./lib');

const args = process.argv.slice(2);
const argOf = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const { locales, fallback } = readManifest();
const targets = (argOf('--locale') ? [argOf('--locale')] : Object.keys(locales)).filter(l => l !== fallback);

const enWorlds = loadOwnWorlds(fallback);
const { fallbackUi } = loadUi(fallback);
const { fallbackText: enDg } = loadDiagramText(fallback);
const ALLOWED_TAGS = /<(?!\/?(b|em|strong|i)>)[^>]+>/;

// Counts of things that must survive translation one-for-one.
const spans = s => ({
  code: (String(s).match(/`[^`\n]+`/g) || []).length,
  shorthand: (String(s).match(/<<[^>\n]+>>/g) || []).length,
  diagram: (String(s).match(/\[\[diagram:[\w-]+/g) || []).length,
  slots: (String(s).match(/\{\w+\}/g) || []).length
});

let failed = false;

for (const locale of targets) {
  const errs = [];
  const entry = locales[locale];

  // ---- content ----
  let locWorlds;
  try { locWorlds = loadOwnWorlds(locale); }
  catch (e) {
    failed = true;
    console.log('FAIL ' + locale + ' — ' + e.message + (e.missing ? ' (declared in i18n/manifest.js but not generated yet)' : ''));
    continue;
  }
  const declared = entry.worlds;
  if (locWorlds.length !== declared.length) errs.push('manifest declares ' + declared.length + ' world(s) but ' + locWorlds.length + ' loaded');

  declared.forEach((n, i) => {
    const en = enWorlds[n - 1], loc = locWorlds[i];
    if (!loc) { errs.push('w' + n + ': missing'); return; }
    const p = (m) => errs.push('w' + n + ': ' + m);

    if (loc.id !== en.id) p('world id changed (' + en.id + ' -> ' + loc.id + ')');
    if (loc.lessons.length !== en.lessons.length) { p('lesson count changed'); return; }

    en.lessons.forEach((eL, li) => {
      const lL = loc.lessons[li];
      const lp = (m) => errs.push('w' + n + '/' + eL.id + ': ' + m);
      if (lL.id !== eL.id) lp('node id changed (' + eL.id + ' -> ' + lL.id + ')');
      if (lL.minutes !== eL.minutes) lp('minutes changed');
      if (lL.exercises.length !== eL.exercises.length) { lp('exercise count changed'); return; }
      eL.exercises.forEach((eQ, qi) => {
        const lQ = lL.exercises[qi];
        const qp = (m) => errs.push('w' + n + '/' + eL.id + ' q' + (qi + 1) + ': ' + m);
        if (lQ.type !== eQ.type) qp('type changed (' + eQ.type + ' -> ' + lQ.type + ')');
        if (lQ.answer !== eQ.answer) qp('answer index changed (' + eQ.answer + ' -> ' + lQ.answer + ')');
        if (lQ.tolerance !== eQ.tolerance) qp('tolerance changed');
        if (JSON.stringify(lQ.answers) !== JSON.stringify(eQ.answers)) qp('answers changed');
        if ((lQ.choices || []).length !== (eQ.choices || []).length) qp('choice count changed');
        if ((lQ.items || []).length !== (eQ.items || []).length) qp('item count changed');
        // An order question's correctness is positional, so an empty or
        // duplicated item would make the intended sequence unreachable.
        if (eQ.type === 'order') {
          const seen = new Set();
          (lQ.items || []).forEach((it, ii) => {
            if (!String(it).trim()) qp('order item ' + ii + ' is empty');
            if (seen.has(it)) qp('order item ' + ii + ' duplicates another, making the sequence ambiguous');
            seen.add(it);
          });
        }
      });
    });

    const eB = en.boss, lB = loc.boss;
    if (lB.id !== eB.id) p('boss id changed');
    if (lB.steps.length !== eB.steps.length) p('boss step count changed');
    else eB.steps.forEach((eS, si) => {
      const lS = lB.steps[si];
      if (lS.choices.length !== eS.choices.length) p('boss step ' + (si + 1) + ': choice count changed');
      else eS.choices.forEach((eC, ci) => {
        if (lS.choices[ci].d !== eC.d) p('boss step ' + (si + 1) + ' choice ' + ci + ': health delta changed (' + eC.d + ' -> ' + lS.choices[ci].d + ')');
      });
    });

    // Protected spans and empty strings.
    const enStr = {}, locStr = {};
    walkWorld(en, n - 1, (k, v) => { enStr[k] = v; });
    walkWorld(loc, n - 1, (k, v) => { locStr[k] = v; });
    Object.keys(enStr).forEach(k => {
      if (locStr[k] === undefined) { errs.push(k + ': missing in ' + locale); return; }
      if (!String(locStr[k]).trim()) { errs.push(k + ': empty'); return; }
      const a = spans(enStr[k]), b = spans(locStr[k]);
      Object.keys(a).forEach(kind => {
        if (a[kind] !== b[kind]) errs.push(k + ': ' + kind + ' span count ' + a[kind] + ' -> ' + b[kind]);
      });
      if (/%\d+%/.test(locStr[k])) errs.push(k + ': still contains an unrestored %N% marker');
    });
  });

  // ---- UI catalog ----
  const { own: locUi } = loadUi(locale);
  if (!Object.keys(locUi).length) errs.push('no UI catalog (i18n/ui.' + locale + '.js)');
  else Object.keys(fallbackUi).forEach(k => {
    const e = fallbackUi[k], l = locUi[k];
    if (l === undefined) { errs.push('ui ' + k + ': missing'); return; }
    if (typeof e === 'object') {
      if (typeof l !== 'object') { errs.push('ui ' + k + ': should be plural forms'); return; }
      if (l.other === undefined) errs.push('ui ' + k + ': plural forms need an "other" case');
      Object.keys(l).forEach(form => {
        if (spans(e.other || '').slots !== spans(l[form]).slots) errs.push('ui ' + k + '#' + form + ': placeholder count differs from English');
      });
    } else {
      if (!String(l).trim()) { errs.push('ui ' + k + ': empty'); return; }
      if (spans(e).slots !== spans(l).slots) errs.push('ui ' + k + ': placeholder count ' + spans(e).slots + ' -> ' + spans(l).slots);
      if (ALLOWED_TAGS.test(l)) errs.push('ui ' + k + ': contains markup other than <b>/<em>/<strong>');
      if (/%\d+%/.test(l)) errs.push('ui ' + k + ': still contains an unrestored %N% marker');
    }
  });

  // ---- diagram labels ----
  const { own: locDg } = loadDiagramText(locale);
  if (entry.diagrams) {
    if (!Object.keys(locDg).length) errs.push('manifest says diagrams are translated but i18n/dg.' + locale + '.js is empty');
    else Object.keys(enDg).forEach(k => {
      if (locDg[k] === undefined) errs.push('dg ' + k + ': missing');
      else if (!String(locDg[k]).trim()) errs.push('dg ' + k + ': empty');
      else if (/%\d+%/.test(locDg[k])) errs.push('dg ' + k + ': still contains an unrestored %N% marker');
    });
  }
  Object.keys(locDg).forEach(k => { if (enDg[k] === undefined) errs.push('dg ' + k + ': not a key in the source locale'); });

  if (errs.length) {
    failed = true;
    console.log('FAIL ' + locale + ' — ' + errs.length + ' structural difference(s) from ' + fallback + ':');
    errs.slice(0, 40).forEach(e => console.log('   - ' + e));
    if (errs.length > 40) console.log('   ... and ' + (errs.length - 40) + ' more');
  } else {
    console.log('ok   ' + locale.padEnd(8) + 'structure matches ' + fallback + ' (' + entry.worlds.length + ' world(s) translated)');
  }
}

if (!targets.length) console.log('no target locales besides ' + fallback);
process.exit(failed ? 1 : 0);
