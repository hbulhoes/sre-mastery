/* SRE Track — masking of spans that must survive translation untouched.
   Each protected span becomes %N% (1-based, in order of appearance) so an MT
   engine treats it as opaque. import.js restores them by index, and fails if a
   marker was dropped, duplicated or invented. */
const fs = require('fs');
const path = require('path');

const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'glossary.json'), 'utf8'));
// Longest first so "error budgets" wins over "error budget".
const TERMS = G.terms.slice().sort((a, b) => b.length - a.length);

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Structural spans are masked before glossary terms so a term inside code is
// masked once, not twice.
const STRUCTURAL = [
  /```[\s\S]*?```/g,           // fenced code
  /`[^`\n]+`/g,                // inline code
  /<<[^>\n]+>>/g,              // the <<code>> shorthand
  /\[\[diagram:[\w-]+(?:\|[^\]]*)?\]\]/g,
  /\{\{[\w.-]+\}\}/g,          // diagram placeholders
  /\{\w+\}/g                   // UI interpolation slots
];
const TERM_RE = new RegExp('(?<![\\w-])(' + TERMS.map(esc).join('|') + ')(?![\\w-])', 'g');

function protect(text) {
  if (typeof text !== 'string') return { text, parts: [] };
  const parts = [];
  let out = text;

  const take = (re) => {
    out = out.replace(re, m => {
      // Do not re-mask something already inside a marker.
      parts.push(m);
      return '%' + parts.length + '%';
    });
  };
  STRUCTURAL.forEach(take);
  take(TERM_RE);
  return { text: out, parts };
}

function restore(text, parts) {
  const problems = [];
  const used = new Set();
  const out = String(text).replace(/%(\d+)%/g, (m, n) => {
    const i = Number(n) - 1;
    if (i < 0 || i >= parts.length) { problems.push('unknown marker ' + m); return m; }
    if (used.has(i)) problems.push('duplicated marker ' + m);
    used.add(i);
    return parts[i];
  });
  for (let i = 0; i < parts.length; i++) if (!used.has(i)) problems.push('missing marker %' + (i + 1) + '% (' + JSON.stringify(parts[i].slice(0, 30)) + ')');
  return { text: out, problems };
}

module.exports = { protect, restore, TERMS };
