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

## Files

| File | Purpose |
|---|---|
| `index.html` | Shell: header, sidebar, view container, script tags |
| `styles.css` | All styling, including the light and dark palettes |
| `app.js` | Engine: routing, progress, XP and badges, markdown renderer, question and boss renderers |
| `diagrams.js` | 19 inline SVG technical diagrams, themed via CSS custom properties |
| `content/w1.js` … `w7.js` | One file per world: lessons, exercises and the boss scenario |

## Authoring new content

A world is a plain object pushed onto `window.SRE_WORLDS`. Lesson bodies use a small markdown subset: `##` and `###` headings, lists, tables, fenced code, `> ` callouts (`> [aws]` and `> [warn]` for variants), `**bold**`, `*italic*`, `` `code` ``, and `[[diagram:key]]` on its own line to embed a diagram.

Diagrams live in `diagrams.js` as inline SVG. Colours must come from the `dg-*` CSS classes rather than literal hex values so both themes work. Keep labels short: text does not wrap in SVG, and anything past the `viewBox` width is silently clipped. Long explanation belongs in the diagram's `caption`, which renders as a `figcaption` and wraps normally.

## Sources

Google *Site Reliability Engineering* (2016) and *The Site Reliability Workbook* (2018); AWS Well-Architected Framework reliability and operational excellence pillars; the Amazon Builders' Library (static stability, shuffle sharding, timeouts and retries); the principles of chaos engineering; and the DORA / *Accelerate* research on delivery performance.
