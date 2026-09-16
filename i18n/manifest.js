/* SRE Track — locale manifest.
   `name` is the endonym, shown in the language switcher in its own language.
   `worlds` lists the world numbers translated for that locale. Any world not
   listed falls back to English, so the track is always complete and playable.
   `diagrams: true` means i18n/dg.<loc>.js exists. */
window.SRE_MANIFEST = {
  en:      { name: 'English',        worlds: [1, 2, 3, 4, 5, 6, 7], diagrams: true },
  de:      { name: 'Deutsch',        worlds: [1],                   diagrams: true },
  'pt-BR': { name: 'Português (BR)', worlds: [],                    diagrams: true },
  es:      { name: 'Español',        worlds: [],                    diagrams: true },
  fr:      { name: 'Français',       worlds: [],                    diagrams: true }
};
window.SRE_LOCALE_FALLBACK = 'en';
