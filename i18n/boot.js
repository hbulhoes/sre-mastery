/* SRE Track — locale-aware loader.
   Resolves the active locale, then injects the content, catalog and engine
   scripts in order. Dynamically created scripts default to async, which would
   let them execute out of order, so every one is forced to async = false. */
(function () {
  'use strict';
  var LANG_KEY = 'sre-track-lang';
  var M = window.SRE_MANIFEST, FALLBACK = window.SRE_LOCALE_FALLBACK || 'en';

  function stored() {
    try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; }
  }
  function negotiate() {
    var saved = stored();
    if (saved && M[saved]) return saved;
    var prefs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < prefs.length; i++) {
      var tag = String(prefs[i]);
      if (M[tag]) return tag;                       // exact, e.g. pt-BR
      var base = tag.split('-')[0];
      if (M[base]) return base;                     // de-AT -> de
      for (var k in M) {                            // pt -> pt-BR
        if (k.split('-')[0] === base) return k;
      }
    }
    return FALLBACK;
  }

  var locale = negotiate();
  var entry = M[locale] || M[FALLBACK];
  var fb = M[FALLBACK];

  window.SRE_LOCALE = locale;
  window.SRE_SET_LOCALE = function (next) {
    if (!M[next]) return;
    try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* storage unavailable */ }
    // Progress is keyed by locale-independent node ids, so a reload keeps it.
    location.reload();
  };

  // Which worlds are shown in English because this locale has not translated them.
  var fallbackWorlds = [];
  var srcs = [];

  srcs.push('i18n/ui.' + FALLBACK + '.js');
  if (locale !== FALLBACK) srcs.push('i18n/ui.' + locale + '.js');

  for (var n = 1; n <= fb.worlds.length; n++) {
    var has = entry.worlds.indexOf(n) !== -1;
    if (!has) fallbackWorlds.push('w' + n);
    srcs.push('content/' + (has ? locale : FALLBACK) + '/w' + n + '.js');
  }

  srcs.push('diagrams.js');
  srcs.push('i18n/dg.' + FALLBACK + '.js');
  if (locale !== FALLBACK && entry.diagrams) srcs.push('i18n/dg.' + locale + '.js');

  srcs.push('app.js');

  window.SRE_FALLBACK_WORLDS = fallbackWorlds;
  document.documentElement.lang = locale;

  var head = document.head || document.getElementsByTagName('head')[0];
  srcs.forEach(function (src) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;   // preserve execution order
    head.appendChild(s);
  });
})();
