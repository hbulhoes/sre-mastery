# SRE Track

A linear, gamified courseware experience for mastering Site Reliability Engineering. Built on the Google SRE book and SRE workbook, extended with the AWS Well-Architected reliability pillar, the Amazon Builders' Library and the DORA research.

Runs entirely in the browser. No build step, no dependencies, no network calls except the Google Fonts stylesheet.

## Running it

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8777
```

Then visit `http://localhost:8777`. A `.claude/launch.json` is included so the editor's preview can start the same server.

## Structure of the track

Seven worlds, 35 lessons, 7 scenario boss fights and a final mastery exam: 43 nodes in total, roughly two hours of reading plus the interactive work. Nodes unlock strictly in order.

| World | Title | Covers |
|---|---|---|
| 1 | Foundations | What SRE is, embracing risk, SLIs and SLOs, error budgets, toil |
| 2 | Monitoring and Alerting | Golden signals, alerting philosophy, burn-rate alerts, the observability stack |
| 3 | Change Without Fear | Automation hierarchy, release engineering, simplicity, canarying, configuration |
| 4 | When It Breaks | Troubleshooting, emergency response, incident command, postmortems, testing |
| 5 | Systems at Scale | Load balancing, overload, cascading failures, consensus, pipelines, data integrity, capacity |
| 6 | The Human System | On-call, collaboration and engagement, launch coordination, organisational adoption |
| 7 | Reliability in the Cloud Era | Static stability, cells and shuffle sharding, chaos engineering, multi-region DR, measurement |

Every lesson ends with an **On AWS** section that translates the concept into concrete services and settings. The player is assumed to know basic observability and AWS already.

## How the game works

**Lessons** end in a checkpoint. Every question must be answered correctly to clear the node; a wrong answer explains why and lets you retry. Answering correctly on the first attempt earns bonus XP.

**Boss fights** are multi-turn incident scenarios. Each decision moves a service-health meter that starts at 80%. Finish at 50% or above to clear the world and earn its badge. Two wrong calls out of six still clears; four or more fails.

**The mastery exam** unlocks after the last boss. It draws 20 questions at random from the whole track and needs 80% to pass, which awards the SRE Master rank.

Progress, XP, ranks and badges are stored in `localStorage` under `sre-track-progress-v1`. The Badges dialog exports the save as text so it can be moved to another browser, and resets progress.

## Question types

`mcq` single choice, `tf` true/false, `multi` multiple select (exact match required), `num` numeric with a tolerance, and `order` sequencing. The exam excludes `order` questions.

## Languages

The interface and diagrams ship in English, German, Brazilian Portuguese, Spanish and French. World 1 is additionally translated into German. Any world a language has not translated falls back to English and is marked with an `EN` chip, so the track is always complete and playable.

Pick a language from the header. The choice is remembered per browser, and **progress survives a language change**: XP, ranks, badges and unlocked nodes are keyed by locale-independent node IDs.

SRE and AWS vocabulary deliberately stays in English (SLI, SLO, error budget, toil, burn rate, CloudWatch, and so on) while the surrounding prose is translated, which is how most non-English engineering teams actually speak. `tools/glossary.json` is the enforced list.

| File | Purpose |
|---|---|
| `i18n/manifest.js` | Which locales exist, their endonyms, and which worlds each has translated |
| `i18n/boot.js` | Resolves the locale, then loads catalogs, content and the engine in order |
| `i18n/ui.<loc>.js` | UI string catalog, with plural forms selected via `Intl.PluralRules` |
| `i18n/dg.<loc>.js` | Diagram label catalog, keyed to `{{placeholders}}` in `diagrams.js` |
| `i18n/source/` | Extracted English source for translators (generated) |
| `i18n/target/<loc>/` | Translated JSON, the only files a translator edits |

### Adding or extending a language

```bash
node tools/extract.js
```

Copy the JSON you need from `i18n/source/` into `i18n/target/<locale>/`, translate the **values** only, and leave every `%N%` marker intact. Those markers mask code spans, AWS names and glossary terms so machine translation cannot mangle them. Then:

```bash
node tools/import.js --locale de --domain w2
```

The importer regenerates the locale's JavaScript from the English object with only strings substituted, so answer indices, question types, health deltas and node IDs cannot drift. Update `worlds` in `i18n/manifest.js` when a new world is ready, and re-run the checks.

## Deploying

The site is hosted as static files in a private S3 bucket behind CloudFront, on a subdomain, with an ACM certificate validated through Route 53. One CloudFormation stack defines all of it.

```bash
node tools/deploy.js
```

That gates on the three checks below, refuses to publish if any fails, then syncs and invalidates. See [infra/README.md](infra/README.md) for the one-time stack creation, the caching design, the Content Security Policy and rollback.

## Checks

```bash
node tools/check-content.js && node tools/check-locales.js && node tools/check-svg-fit.js
```

- **`check-content.js`** validates every locale's track: 43 nodes, 161 questions, 19 diagrams, and that each boss is winnable on best play and losable on worst.
- **`check-locales.js`** enforces structural parity with English. This is what protects quiz correctness: a changed answer index, choice count, question type, boss health delta or reordered `order` question fails the build.
- **`check-svg-fit.js`** measures every diagram label against its `viewBox`. SVG text does not wrap and overflow is clipped *silently*, so this is the check most likely to fail on a new language. German is the worst case; it already caught two French labels during translation.

## Files

| File | Purpose |
|---|---|
| `index.html` | Shell: header, sidebar, view container, loader |
| `styles.css` | All styling, including the light and dark palettes |
| `app.js` | Engine: routing, progress, XP and badges, markdown renderer, question and boss renderers, `t()` and locale-aware number handling |
| `diagrams.js` | 19 inline SVG diagrams: geometry only, text via `{{placeholders}}` |
| `content/<loc>/w1.js` … `w7.js` | One file per world: lessons, exercises and the boss scenario |
| `tools/` | Extraction, import, the three validators and the deploy script |
| `infra/site.yaml` | CloudFormation stack: S3, CloudFront, ACM, Route 53, alarm |

## Authoring new content

Author new content in English under `content/en/`. A world is a plain object pushed onto `window.SRE_WORLDS`. Lesson bodies use a small markdown subset: `##` and `###` headings, lists, tables, fenced code, `> ` callouts (`> [aws]` and `> [warn]` for variants), `**bold**`, `*italic*`, `` `code` ``, `<<code>>` as a shorthand, and `[[diagram:key]]` on its own line to embed a diagram.

Diagram geometry lives in `diagrams.js`; the words live in `i18n/dg.<loc>.js` behind `{{key}}` placeholders. Colours must come from the `dg-*` CSS classes rather than literal hex values so both themes work. Keep labels short: text does not wrap in SVG, and anything past the `viewBox` width is silently clipped. Long explanation belongs in the diagram's `caption`, which renders as a `figcaption` and wraps normally.

New user-facing strings in `app.js` go through `t('some.key')` and must be added to `i18n/ui.en.js`. Never concatenate translated fragments; use a single key with `{placeholders}`.

## Sources

Google *Site Reliability Engineering* (2016) and *The Site Reliability Workbook* (2018); AWS Well-Architected Framework reliability and operational excellence pillars; the Amazon Builders' Library (static stability, shuffle sharding, timeouts and retries); the principles of chaos engineering; and the DORA / *Accelerate* research on delivery performance.
