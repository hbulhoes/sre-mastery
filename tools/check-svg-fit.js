#!/usr/bin/env node
/* SRE Track — SVG label fit checker.

   SVG <text> does not wrap and does not clip visibly: a label wider than its
   viewBox is simply cut off, which is easy to ship by accident. This measures
   every label's rendered width for a locale and reports overflow, plus how much
   expansion headroom the ones that fit still have.

   Usage: node tools/check-svg-fit.js [--locale de] [--headroom]
*/
const { readManifest, loadDiagrams, loadDiagramText } = require('./lib');

const args = process.argv.slice(2);
const argOf = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const showHeadroom = args.indexOf('--headroom') !== -1;
const { locales } = readManifest();
const targets = argOf('--locale') ? [argOf('--locale')] : Object.keys(locales);

// IBM Plex Mono advances 0.6em per character; the diagrams use it throughout.
const ADV = 0.6;
const MARGIN = 2;   // viewBox units of slack at each edge

let failed = false;

for (const locale of targets) {
  const diagrams = loadDiagrams();
  const { merged: text } = loadDiagramText(locale);
  const over = [];
  const rows = [];

  for (const [key, d] of Object.entries(diagrams)) {
    const vb = d.svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    if (!vb) { console.log('FAIL ' + locale + ' — diagram "' + key + '" has no viewBox'); failed = true; continue; }
    const VW = +vb[1];
    const rootFS = +((d.svg.match(/<svg[^>]*font-size="(\d+)"/) || [0, 12])[1]);

    const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(d.svg))) {
      const attrs = m[1];
      const label = m[2].replace(/\{\{([\w.-]+)\}\}/g, (t, k) => (text[k] !== undefined ? text[k] : k)).replace(/<[^>]+>/g, '');
      if (!label.trim()) continue;
      if (/rotate\(/.test(attrs)) continue;   // rotated axis labels run along the other dimension

      // Nearest enclosing <g font-size>, then the element's own, then the root.
      const before = d.svg.slice(0, m.index);
      const stack = [];
      const gre = /<g\b([^>]*)>|<\/g>/g;
      let g;
      while ((g = gre.exec(before))) { if (g[0] === '</g>') stack.pop(); else stack.push(g[1]); }
      let gFS = null;
      for (let i = stack.length - 1; i >= 0; i--) { const f = stack[i].match(/font-size="(\d+)"/); if (f) { gFS = +f[1]; break; } }
      const own = attrs.match(/font-size="(\d+)"/);
      const fs = own ? +own[1] : (gFS != null ? gFS : rootFS);

      const x = parseFloat((attrs.match(/\bx="(-?[\d.]+)"/) || [0, 0])[1]);
      const dx = parseFloat((attrs.match(/\bdx="(-?[\d.]+)"/) || [0, 0])[1]);
      const anchor = (attrs.match(/text-anchor="(\w+)"/) || [0, 'start'])[1];

      const cw = fs * ADV;
      const w = label.length * cw;
      let left = x + dx;
      if (anchor === 'middle') left -= w / 2;
      else if (anchor === 'end') left -= w;
      const right = left + w;

      let avail;
      if (anchor === 'start') avail = (VW - MARGIN - (x + dx)) / cw;
      else if (anchor === 'end') avail = ((x + dx) - MARGIN) / cw;
      else avail = Math.min((x + dx) - MARGIN, VW - MARGIN - (x + dx)) * 2 / cw;

      if (right > VW - MARGIN || left < MARGIN) {
        over.push({ key, label, left: Math.round(left), right: Math.round(right), VW, max: Math.floor(avail) });
      } else {
        rows.push({ key, label, pct: Math.round((avail / label.length - 1) * 100) });
      }
    }
  }

  if (over.length) {
    failed = true;
    console.log('FAIL ' + locale + ' — ' + over.length + ' label(s) overflow the viewBox and would be clipped:');
    over.forEach(o => {
      console.log('   ' + o.key.padEnd(20) + JSON.stringify(o.label));
      console.log('   ' + ' '.repeat(20) + 'spans ' + o.left + '..' + o.right + ' of 0..' + o.VW + ' — shorten to about ' + o.max + ' characters');
    });
  } else {
    rows.sort((a, b) => a.pct - b.pct);
    const tight = rows.filter(r => r.pct < 20).length;
    console.log('ok   ' + locale.padEnd(8) + rows.length + ' labels fit' + (tight ? ', ' + tight + ' with under 20% headroom' : ''));
    if (showHeadroom) rows.slice(0, 12).forEach(r => console.log('      +' + String(r.pct).padStart(4) + '%  ' + r.key.padEnd(20) + JSON.stringify(r.label.slice(0, 48))));
  }
}

process.exit(failed ? 1 : 0);
