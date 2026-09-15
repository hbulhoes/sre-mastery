/* SRE Track — lightweight technical diagrams (inline SVG, theme-aware via CSS classes).
   Rule: SVG carries only short labels. Explanation belongs in `caption`, which wraps as real HTML. */
window.SRE_DIAGRAMS = {

  'sre-vs-ops': {
    caption: 'An ops team grows with the service. SRE caps operational work at 50%, so the engineering half compounds into automation and self-healing systems.',
    svg: `<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" font-size="12">
<line x1="60" y1="180" x2="600" y2="180" class="dg-sline" stroke-width="1"/>
<line x1="60" y1="180" x2="60" y2="24" class="dg-sline" stroke-width="1"/>
<text x="330" y="205" text-anchor="middle" class="dg-ink3">service size / traffic →</text>
<text x="18" y="102" transform="rotate(-90 18 102)" text-anchor="middle" class="dg-ink3">headcount →</text>
<polyline points="60,170 600,44" fill="none" class="dg-crit-s" stroke-width="2.5"/>
<polyline points="60,170 200,140 340,126 480,118 600,114" fill="none" class="dg-good-s" stroke-width="2.5"/>
<text x="596" y="34" text-anchor="end" class="dg-crit" font-weight="700">ops team</text>
<text x="596" y="104" text-anchor="end" class="dg-good" font-weight="700">SRE</text>
<line x1="600" y1="50" x2="600" y2="110" class="dg-sline" stroke-width="1" stroke-dasharray="3 3"/>
<text x="470" y="150" text-anchor="middle" class="dg-ink2" font-size="11">gap = work automated away</text>
</svg>`
  },

  'nines': {
    caption: 'Each extra nine cuts allowed downtime by 10×. Above three nines a human cannot reliably detect, decide and act inside the budget, so the response has to be automated.',
    svg: `<svg viewBox="0 0 640 210" xmlns="http://www.w3.org/2000/svg" font-size="12">
<g class="dg-ink3" font-size="11"><text x="20" y="26">availability</text><text x="150" y="26">downtime / 30 days</text><text x="430" y="26">response must be</text></g>
<line x1="20" y1="34" x2="620" y2="34" class="dg-line"/>
<text x="20" y="60" class="dg-ink" font-weight="700">99%</text><rect x="150" y="48" width="240" height="14" class="dg-crit" rx="2"/><text x="396" y="60" class="dg-ink2" font-size="11">7.2 h</text><text x="430" y="60" class="dg-ink3" font-size="11">business hours</text>
<text x="20" y="96" class="dg-ink" font-weight="700">99.9%</text><rect x="150" y="84" width="24" height="14" class="dg-warn" rx="2"/><text x="180" y="96" class="dg-ink2" font-size="11">43 min</text><text x="430" y="96" class="dg-ink3" font-size="11">on-call human</text>
<text x="20" y="132" class="dg-ink" font-weight="700">99.99%</text><rect x="150" y="120" width="3" height="14" class="dg-good" rx="1"/><text x="160" y="132" class="dg-ink2" font-size="11">4.3 min</text><text x="430" y="132" class="dg-ink3" font-size="11">automation</text>
<text x="20" y="168" class="dg-ink" font-weight="700">99.999%</text><rect x="150" y="156" width="1" height="14" class="dg-good"/><text x="160" y="168" class="dg-ink2" font-size="11">26 s</text><text x="430" y="168" class="dg-ink3" font-size="11">automation, multi-region</text>
<text x="20" y="198" class="dg-ink3" font-size="11">bar length ∝ downtime</text>
</svg>`
  },

  'sli-slo-sla': {
    caption: 'The SLI measures, the SLO targets, the SLA promises with consequences. Keep the SLO stricter than the SLA: the buffer absorbs measurement noise and gives you time to react before a contract is breached.',
    svg: `<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="20" width="600" height="150" rx="6" class="dg-box"/>
<text x="36" y="44" class="dg-ink" font-weight="700">SLA</text><text x="80" y="44" class="dg-ink3" font-size="11">contract · consequences · 99.9%</text>
<rect x="60" y="58" width="520" height="98" rx="6" class="dg-box2" stroke-width="1"/>
<text x="76" y="82" class="dg-ink" font-weight="700">SLO</text><text x="120" y="82" class="dg-ink3" font-size="11">internal target · drives alerts · 99.95%</text>
<rect x="100" y="96" width="440" height="46" rx="6" class="dg-soft"/>
<text x="116" y="116" class="dg-ink" font-weight="700">SLI</text><text x="160" y="116" class="dg-ink3" font-size="11">good events ÷ valid events</text>
<text x="160" y="132" class="dg-ink2" font-size="11">2xx/3xx under 300 ms ÷ all valid requests</text>
</svg>`
  },

  'error-budget': {
    caption: 'A 30-day error budget being consumed. Burn rate is how many times faster than the pace that would exhaust the budget exactly at day 30. One incident took 45% of the budget in two hours, a burn rate near 160×.',
    svg: `<svg viewBox="0 0 640 230" xmlns="http://www.w3.org/2000/svg" font-size="12">
<line x1="70" y1="180" x2="600" y2="180" class="dg-sline"/>
<line x1="70" y1="180" x2="70" y2="28" class="dg-sline"/>
<text x="335" y="206" text-anchor="middle" class="dg-ink3" font-size="11">day of 30-day window</text>
<g class="dg-ink3" font-size="11"><text x="70" y="196" text-anchor="middle">0</text><text x="247" y="196" text-anchor="middle">10</text><text x="423" y="196" text-anchor="middle">20</text><text x="600" y="196" text-anchor="middle">30</text></g>
<text x="62" y="34" text-anchor="end" class="dg-ink3" font-size="11">100%</text>
<text x="62" y="184" text-anchor="end" class="dg-ink3" font-size="11">0%</text>
<text x="16" y="105" transform="rotate(-90 16 105)" text-anchor="middle" class="dg-ink3" font-size="11">budget left</text>
<line x1="70" y1="30" x2="600" y2="180" class="dg-line" stroke-dasharray="4 4" stroke-width="1.5"/>
<text x="470" y="132" class="dg-ink3" font-size="11">burn rate 1.0</text>
<polyline points="70,30 152,38 200,42 212,110 264,114 340,120 400,124 480,130 560,136 600,140" fill="none" class="dg-acc-s" stroke-width="2.5"/>
<rect x="200" y="42" width="12" height="68" class="dg-critsoft"/>
<text x="222" y="70" class="dg-crit" font-size="11" font-weight="700">incident: 45% in 2 h</text>
<text x="222" y="86" class="dg-crit" font-size="11">burn rate ≈ 160×</text>
<circle cx="600" cy="140" r="4" class="dg-acc"/>
<text x="596" y="164" text-anchor="end" class="dg-ink2" font-size="11">ends with ~25% left</text>
</svg>`
  },

  'golden-signals': {
    caption: 'The four golden signals, with the CloudWatch metric that usually carries each one. Page on latency and errors, which users feel; use traffic and saturation to explain what you see.',
    svg: `<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="20" width="290" height="85" rx="6" class="dg-box"/>
<text x="34" y="44" class="dg-ink" font-weight="700">Latency</text>
<text x="34" y="62" class="dg-ink2" font-size="11">time to serve · p50 / p95 / p99</text>
<text x="34" y="78" class="dg-ink2" font-size="11">split fast errors from slow successes</text>
<text x="34" y="96" class="dg-ink3" font-size="11">TargetResponseTime p99</text>
<rect x="330" y="20" width="290" height="85" rx="6" class="dg-box"/>
<text x="344" y="44" class="dg-ink" font-weight="700">Traffic</text>
<text x="344" y="62" class="dg-ink2" font-size="11">demand · RPS, sessions, IOPS</text>
<text x="344" y="78" class="dg-ink2" font-size="11">context for every other signal</text>
<text x="344" y="96" class="dg-ink3" font-size="11">RequestCount</text>
<rect x="20" y="120" width="290" height="85" rx="6" class="dg-box"/>
<text x="34" y="144" class="dg-ink" font-weight="700">Errors</text>
<text x="34" y="162" class="dg-ink2" font-size="11">explicit, implicit, or by policy</text>
<text x="34" y="178" class="dg-ink2" font-size="11">a 200 with wrong content counts</text>
<text x="34" y="196" class="dg-ink3" font-size="11">HTTPCode_Target_5XX_Count</text>
<rect x="330" y="120" width="290" height="85" rx="6" class="dg-box"/>
<text x="344" y="144" class="dg-ink" font-weight="700">Saturation</text>
<text x="344" y="162" class="dg-ink2" font-size="11">how full the constrained resource is</text>
<text x="344" y="178" class="dg-ink2" font-size="11">leading indicator of the other three</text>
<text x="344" y="196" class="dg-ink3" font-size="11">CPUUtilization, queue depth</text>
</svg>`
  },

  'burn-rate': {
    caption: 'Multi-window, multi-burn-rate alerting. Each rule fires only when both its windows exceed the threshold: the long window proves the burn is significant, the short window proves it is still happening, so the alert clears soon after a fix. Burn rate is the observed error rate divided by the rate that would spend the whole budget over the 30-day window.',
    svg: `<svg viewBox="0 0 640 175" xmlns="http://www.w3.org/2000/svg" font-size="12">
<g class="dg-ink3" font-size="11"><text x="20" y="26">rule</text><text x="80" y="26">long window</text><text x="200" y="26">short window</text><text x="330" y="26">burn rate</text><text x="430" y="26">budget spent</text><text x="550" y="26">action</text></g>
<line x1="20" y1="34" x2="620" y2="34" class="dg-line"/>
<g class="dg-ink"><text x="20" y="60" font-weight="700">1</text><text x="80" y="60">1 h</text><text x="200" y="60">5 min</text><text x="330" y="60">14.4×</text><text x="430" y="60">2%</text><text x="550" y="60" class="dg-crit" font-weight="700">page</text></g>
<g class="dg-ink"><text x="20" y="90" font-weight="700">2</text><text x="80" y="90">6 h</text><text x="200" y="90">30 min</text><text x="330" y="90">6×</text><text x="430" y="90">5%</text><text x="550" y="90" class="dg-crit" font-weight="700">page</text></g>
<g class="dg-ink"><text x="20" y="120" font-weight="700">3</text><text x="80" y="120">3 d</text><text x="200" y="120">6 h</text><text x="330" y="120">1×</text><text x="430" y="120">10%</text><text x="550" y="120" class="dg-warn" font-weight="700">ticket</text></g>
<line x1="20" y1="134" x2="620" y2="134" class="dg-line"/>
<text x="20" y="158" class="dg-ink3" font-size="11">fire only when BOTH windows exceed the threshold</text>
</svg>`
  },

  'automation-ladder': {
    caption: 'The evolution of automation. Each rung moves the human further from the loop: from running every command by hand, through shared tooling, to systems that detect and fix their own failures, and finally to designs where the failure mode no longer exists.',
    svg: `<svg viewBox="0 0 640 230" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="182" width="600" height="32" rx="4" class="dg-box"/>
<text x="34" y="202" class="dg-ink" font-weight="700">1</text><text x="54" y="202" class="dg-ink2" font-size="11">no automation — a human runs every step</text>
<rect x="56" y="144" width="564" height="32" rx="4" class="dg-box"/>
<text x="70" y="164" class="dg-ink" font-weight="700">2</text><text x="90" y="164" class="dg-ink2" font-size="11">external, system-specific scripts — run by hand</text>
<rect x="92" y="106" width="528" height="32" rx="4" class="dg-box"/>
<text x="106" y="126" class="dg-ink" font-weight="700">3</text><text x="126" y="126" class="dg-ink2" font-size="11">external, generic tooling — SSM documents, Ansible, Terraform</text>
<rect x="128" y="68" width="492" height="32" rx="4" class="dg-soft"/>
<text x="142" y="88" class="dg-ink" font-weight="700">4</text><text x="162" y="88" class="dg-ink2" font-size="11">internal, system-specific — it detects and fixes itself</text>
<rect x="164" y="30" width="456" height="32" rx="4" class="dg-goodsoft"/>
<text x="178" y="50" class="dg-ink" font-weight="700">5</text><text x="198" y="50" class="dg-ink2" font-size="11">no automation needed — the failure mode is gone</text>
</svg>`
  },

  'canary': {
    caption: 'Progressive rollout. Each stage is gated on a bake time plus an SLI comparison between the canary and a concurrently running baseline. Any failed gate rolls back automatically to the previous version.',
    svg: `<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="56" width="110" height="58" rx="6" class="dg-box"/><text x="75" y="80" text-anchor="middle" class="dg-ink" font-weight="700">1 task</text><text x="75" y="98" text-anchor="middle" class="dg-ink3" font-size="11">~1%</text>
<rect x="170" y="56" width="110" height="58" rx="6" class="dg-box"/><text x="225" y="80" text-anchor="middle" class="dg-ink" font-weight="700">1 AZ</text><text x="225" y="98" text-anchor="middle" class="dg-ink3" font-size="11">~10%</text>
<rect x="320" y="56" width="110" height="58" rx="6" class="dg-box"/><text x="375" y="80" text-anchor="middle" class="dg-ink" font-weight="700">1 region</text><text x="375" y="98" text-anchor="middle" class="dg-ink3" font-size="11">~50%</text>
<rect x="470" y="56" width="150" height="58" rx="6" class="dg-goodsoft"/><text x="545" y="80" text-anchor="middle" class="dg-ink" font-weight="700">global</text><text x="545" y="98" text-anchor="middle" class="dg-ink3" font-size="11">100%</text>
<g class="dg-sline" stroke-width="1.5"><line x1="130" y1="85" x2="170" y2="85"/><line x1="280" y1="85" x2="320" y2="85"/><line x1="430" y1="85" x2="470" y2="85"/></g>
<g class="dg-acc"><polygon points="160,85 148,79 148,91"/><polygon points="310,85 298,79 298,91"/><polygon points="460,85 448,79 448,91"/></g>
<g class="dg-ink2" font-size="11" text-anchor="middle"><text x="150" y="44">gate</text><text x="300" y="44">gate</text><text x="450" y="44">gate</text></g>
<text x="320" y="30" text-anchor="middle" class="dg-ink3" font-size="11">bake time + SLI compare vs baseline</text>
<line x1="450" y1="134" x2="80" y2="134" class="dg-crit-s" stroke-width="1.5" stroke-dasharray="4 3"/>
<polygon points="70,134 82,128 82,140" class="dg-crit"/>
<text x="270" y="156" text-anchor="middle" class="dg-crit" font-size="11">failed gate → automatic rollback</text>
</svg>`
  },

  'troubleshooting-loop': {
    caption: 'The hypothetico-deductive troubleshooting loop. Triage stops the bleeding before diagnosis begins; a rejected hypothesis sends you back for more data; a cure ends in a written postmortem or playbook.',
    svg: `<svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="78" width="100" height="44" rx="6" class="dg-box"/><text x="70" y="98" text-anchor="middle" class="dg-ink" font-weight="700" font-size="11">Problem</text><text x="70" y="112" text-anchor="middle" class="dg-ink" font-weight="700" font-size="11">report</text>
<rect x="148" y="78" width="92" height="44" rx="6" class="dg-box"/><text x="194" y="105" text-anchor="middle" class="dg-ink" font-weight="700">Triage</text>
<rect x="268" y="78" width="92" height="44" rx="6" class="dg-soft"/><text x="314" y="105" text-anchor="middle" class="dg-ink" font-weight="700">Examine</text>
<rect x="388" y="78" width="92" height="44" rx="6" class="dg-soft"/><text x="434" y="105" text-anchor="middle" class="dg-ink" font-weight="700">Diagnose</text>
<rect x="508" y="78" width="112" height="44" rx="6" class="dg-soft"/><text x="564" y="105" text-anchor="middle" class="dg-ink" font-weight="700">Test / treat</text>
<g class="dg-sline" stroke-width="1.5"><line x1="120" y1="100" x2="148" y2="100"/><line x1="240" y1="100" x2="268" y2="100"/><line x1="360" y1="100" x2="388" y2="100"/><line x1="480" y1="100" x2="508" y2="100"/></g>
<path d="M564 122 V156 H314 V126" fill="none" class="dg-acc-s" stroke-width="1.5" stroke-dasharray="4 3"/>
<polygon points="314,122 308,134 320,134" class="dg-acc"/>
<text x="440" y="174" text-anchor="middle" class="dg-ink2" font-size="11">hypothesis rejected → more data</text>
<path d="M564 78 V44 H70 V74" fill="none" class="dg-good-s" stroke-width="1.5"/>
<polygon points="70,78 64,66 76,66" class="dg-good"/>
<text x="320" y="34" text-anchor="middle" class="dg-good" font-size="11" font-weight="700">cure → write it down</text>
<text x="194" y="140" text-anchor="middle" class="dg-ink3" font-size="11">stop the bleeding</text>
</svg>`
  },

  'ics': {
    caption: 'Incident command roles. The Incident Commander coordinates and decides but never debugs; if they start debugging, they hand command over first. Roles are not people: one person may hold several early on.',
    svg: `<svg viewBox="0 0 640 210" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="230" y="18" width="180" height="48" rx="6" class="dg-soft"/>
<text x="320" y="38" text-anchor="middle" class="dg-ink" font-weight="700">Incident Commander</text>
<text x="320" y="55" text-anchor="middle" class="dg-ink3" font-size="11">assigns roles · decides</text>
<g class="dg-sline" stroke-width="1.5"><line x1="320" y1="66" x2="320" y2="90"/><line x1="110" y1="90" x2="530" y2="90"/><line x1="110" y1="90" x2="110" y2="114"/><line x1="320" y1="90" x2="320" y2="114"/><line x1="530" y1="90" x2="530" y2="114"/></g>
<rect x="20" y="114" width="180" height="66" rx="6" class="dg-box"/>
<text x="110" y="136" text-anchor="middle" class="dg-ink" font-weight="700">Operations Lead</text>
<text x="110" y="154" text-anchor="middle" class="dg-ink3" font-size="11">makes all system changes</text>
<text x="110" y="170" text-anchor="middle" class="dg-ink3" font-size="11">runs the hands-on team</text>
<rect x="230" y="114" width="180" height="66" rx="6" class="dg-box"/>
<text x="320" y="136" text-anchor="middle" class="dg-ink" font-weight="700">Comms Lead</text>
<text x="320" y="154" text-anchor="middle" class="dg-ink3" font-size="11">status page · stakeholders</text>
<text x="320" y="170" text-anchor="middle" class="dg-ink3" font-size="11">owns the incident doc</text>
<rect x="440" y="114" width="180" height="66" rx="6" class="dg-box"/>
<text x="530" y="136" text-anchor="middle" class="dg-ink" font-weight="700">Planning Lead</text>
<text x="530" y="154" text-anchor="middle" class="dg-ink3" font-size="11">files bugs · tracks changes</text>
<text x="530" y="170" text-anchor="middle" class="dg-ink3" font-size="11">arranges handoffs</text>
</svg>`
  },

  'lb-tiers': {
    caption: 'Load balancing happens at four tiers. Each balances a different unit and sees different information: DNS picks a region, the edge picks a target, the client picks among a subset, and the backend reports how loaded it is.',
    svg: `<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="16" width="600" height="44" rx="6" class="dg-box"/>
<text x="34" y="36" class="dg-ink" font-weight="700" font-size="11">Frontend / global</text>
<text x="34" y="52" class="dg-ink3" font-size="11">Route 53 latency or geo routing · Global Accelerator anycast → picks a region</text>
<rect x="20" y="68" width="600" height="44" rx="6" class="dg-box"/>
<text x="34" y="88" class="dg-ink" font-weight="700" font-size="11">Edge · L4 / L7</text>
<text x="34" y="104" class="dg-ink3" font-size="11">NLB flow hash · ALB round robin or least outstanding → picks a target</text>
<rect x="20" y="120" width="600" height="44" rx="6" class="dg-box"/>
<text x="34" y="140" class="dg-ink" font-weight="700" font-size="11">Client-side / mesh</text>
<text x="34" y="156" class="dg-ink3" font-size="11">subsetting · weighted round robin by reported utilisation · lame duck</text>
<rect x="20" y="172" width="600" height="44" rx="6" class="dg-soft"/>
<text x="34" y="192" class="dg-ink" font-weight="700" font-size="11">Backend task</text>
<text x="34" y="208" class="dg-ink3" font-size="11">healthy / refusing (draining) / unhealthy · reports utilisation upward</text>
</svg>`
  },

  'cascade': {
    caption: 'The cascading-failure feedback loop: one overloaded replica dies, its load shifts to the survivors, clients retry, and the next one dies. Every arrow is a place to break the cycle.',
    svg: `<svg viewBox="0 0 640 230" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="240" y="16" width="160" height="44" rx="6" class="dg-critsoft"/>
<text x="320" y="36" text-anchor="middle" class="dg-ink" font-weight="700" font-size="11">one replica overloaded</text>
<text x="320" y="52" text-anchor="middle" class="dg-ink3" font-size="11">CPU · memory · threads</text>
<rect x="450" y="92" width="170" height="44" rx="6" class="dg-critsoft"/>
<text x="535" y="112" text-anchor="middle" class="dg-ink" font-weight="700" font-size="11">it crashes or stalls</text>
<text x="535" y="128" text-anchor="middle" class="dg-ink3" font-size="11">OOM kill · health check fails</text>
<rect x="240" y="170" width="160" height="44" rx="6" class="dg-critsoft"/>
<text x="320" y="190" text-anchor="middle" class="dg-ink" font-weight="700" font-size="11">load shifts to others</text>
<text x="320" y="206" text-anchor="middle" class="dg-ink3" font-size="11">plus client retries</text>
<rect x="20" y="92" width="170" height="44" rx="6" class="dg-critsoft"/>
<text x="105" y="112" text-anchor="middle" class="dg-ink" font-weight="700" font-size="11">they overload too</text>
<text x="105" y="128" text-anchor="middle" class="dg-ink3" font-size="11">less capacity, more work</text>
<g class="dg-crit-s" stroke-width="2" fill="none"><path d="M400 38 Q470 40 500 88"/><path d="M535 136 Q520 190 404 192"/><path d="M240 192 Q120 190 105 140"/><path d="M105 92 Q120 40 236 38"/></g>
<g class="dg-crit"><polygon points="502,94 490,88 500,80"/><polygon points="398,192 386,186 386,198"/><polygon points="105,140 97,128 113,128"/><polygon points="240,38 228,32 228,44"/></g>
<g class="dg-good" font-size="11" font-weight="700" text-anchor="middle"><text x="320" y="102">break the loop</text><text x="320" y="120">shed load · retry budgets</text><text x="320" y="138">deadlines · headroom</text></g>
</svg>`
  },

  'quorum': {
    caption: 'Majority quorum with five replicas. Any two majorities overlap in at least one node, so two conflicting values can never both be committed. Five replicas tolerate two failures, three tolerate one, and even counts add cost without adding tolerance.',
    svg: `<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" font-size="12">
<circle cx="110" cy="84" r="26" class="dg-goodsoft" stroke-width="2" style="stroke:var(--good)"/><text x="110" y="89" text-anchor="middle" class="dg-ink" font-weight="700">R1</text>
<circle cx="215" cy="84" r="26" class="dg-goodsoft" stroke-width="2" style="stroke:var(--good)"/><text x="215" y="89" text-anchor="middle" class="dg-ink" font-weight="700">R2</text>
<circle cx="320" cy="84" r="26" class="dg-soft" stroke-width="2" style="stroke:var(--accent)"/><text x="320" y="89" text-anchor="middle" class="dg-ink" font-weight="700">R3</text>
<circle cx="425" cy="84" r="26" class="dg-infosoft" stroke-width="2" style="stroke:var(--info)"/><text x="425" y="89" text-anchor="middle" class="dg-ink" font-weight="700">R4</text>
<circle cx="530" cy="84" r="26" class="dg-infosoft" stroke-width="2" style="stroke:var(--info)"/><text x="530" y="89" text-anchor="middle" class="dg-ink" font-weight="700">R5</text>
<path d="M84 124 Q215 154 346 124" fill="none" class="dg-good-s" stroke-width="2"/>
<text x="215" y="172" text-anchor="middle" class="dg-good" font-size="11" font-weight="700">quorum A = R1 R2 R3</text>
<path d="M294 44 Q425 14 556 44" fill="none" class="dg-info-s" stroke-width="2"/>
<text x="425" y="26" text-anchor="middle" class="dg-info" font-size="11" font-weight="700">quorum B = R3 R4 R5</text>
<text x="320" y="146" text-anchor="middle" class="dg-ink2" font-size="11">overlap at R3</text>
</svg>`
  },

  'data-defense': {
    caption: 'Defense in depth for data integrity. Soft deletion catches user and application mistakes, backups catch corruption and region loss, and out-of-band validation shrinks the window between corruption and discovery. Replication is not on this list: it copies corruption faithfully.',
    svg: `<svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="16" width="600" height="52" rx="6" class="dg-goodsoft"/>
<text x="34" y="36" class="dg-ink" font-weight="700" font-size="11">Layer 1 · soft deletion</text>
<text x="34" y="52" class="dg-ink3" font-size="11">mark, hide, purge after N days → catches user error and most app bugs</text>
<rect x="20" y="76" width="600" height="52" rx="6" class="dg-soft"/>
<text x="34" y="96" class="dg-ink" font-weight="700" font-size="11">Layer 2 · backups and their restores</text>
<text x="34" y="112" class="dg-ink3" font-size="11">PITR, snapshots, cross-account copies → only real if restores are tested</text>
<rect x="20" y="136" width="600" height="52" rx="6" class="dg-infosoft"/>
<text x="34" y="156" class="dg-ink" font-weight="700" font-size="11">Layer 3 · early detection</text>
<text x="34" y="172" class="dg-ink3" font-size="11">out-of-band validators, checksums, invariant checks → shrinks the window</text>
</svg>`
  },

  'oncall-balance': {
    caption: 'The on-call arithmetic: cap time on-call at a quarter of the week and incidents at two per shift, so every incident still has time for response, remediation and a postmortem. A third incident is the one that gets no follow-up, which is why it recurs.',
    svg: `<svg viewBox="0 0 640 180" xmlns="http://www.w3.org/2000/svg" font-size="12">
<text x="20" y="28" class="dg-ink" font-weight="700" font-size="11">Time budget</text>
<rect x="20" y="38" width="600" height="20" rx="3" class="dg-box"/>
<rect x="20" y="38" width="150" height="20" rx="3" class="dg-acc"/>
<rect x="170" y="38" width="30" height="20" class="dg-warn"/>
<text x="95" y="52" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--accent-ink)">≤25% on-call</text>
<text x="210" y="52" class="dg-ink2" font-size="11">≤5% other ops · ≥50% engineering</text>
<text x="20" y="96" class="dg-ink" font-weight="700" font-size="11">Per 12-hour shift</text>
<rect x="20" y="106" width="150" height="30" rx="4" class="dg-box"/>
<text x="95" y="125" text-anchor="middle" class="dg-ink2" font-size="11">event 1 · ~6 h</text>
<rect x="180" y="106" width="150" height="30" rx="4" class="dg-box"/>
<text x="255" y="125" text-anchor="middle" class="dg-ink2" font-size="11">event 2 · ~6 h</text>
<rect x="340" y="106" width="280" height="30" rx="4" class="dg-critsoft"/>
<text x="480" y="125" text-anchor="middle" class="dg-crit" font-size="11">3rd event: no time to fix or write up</text>
<text x="20" y="164" class="dg-ink3" font-size="11">fewer than one incident per quarter is also a problem: skills rot</text>
</svg>`
  },

  'test-pyramid': {
    caption: 'Testing for reliability spans traditional pre-production tests and tests that run against production. The higher the tier, the closer to reality and the more expensive each test becomes.',
    svg: `<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" font-size="12">
<polygon points="320,20 540,196 100,196" class="dg-box"/>
<line x1="265" y1="64" x2="375" y2="64" class="dg-line"/>
<line x1="210" y1="108" x2="430" y2="108" class="dg-line"/>
<line x1="155" y1="152" x2="485" y2="152" class="dg-line"/>
<text x="320" y="50" text-anchor="middle" class="dg-ink" font-size="11" font-weight="700">canary</text>
<text x="320" y="92" text-anchor="middle" class="dg-ink" font-size="11" font-weight="700">config + stress</text>
<text x="320" y="136" text-anchor="middle" class="dg-ink" font-size="11" font-weight="700">integration</text>
<text x="320" y="180" text-anchor="middle" class="dg-ink" font-size="11" font-weight="700">unit — many, fast, cheap</text>
<g class="dg-ink3" font-size="11"><text x="620" y="50" text-anchor="end">production</text><text x="620" y="92" text-anchor="end">pre-prod</text><text x="620" y="136" text-anchor="end">CI</text><text x="620" y="180" text-anchor="end">CI</text></g>
<text x="20" y="212" class="dg-ink3" font-size="11">cost and realism rise with height</text>
</svg>`
  },

  'shuffle-sharding': {
    caption: 'Shuffle sharding. With 8 nodes and 2-node shards there are 28 possible pairs, so customer C taking down both of its nodes leaves A and B with a healthy node each, and a retry succeeds. Only a customer assigned the identical pair is fully affected: one in 28.',
    svg: `<svg viewBox="0 0 640 210" xmlns="http://www.w3.org/2000/svg" font-size="12">
<text x="20" y="30" class="dg-ink" font-weight="700" font-size="11">nodes</text>
<g class="dg-box"><rect x="80" y="14" width="50" height="26" rx="4"/><rect x="140" y="14" width="50" height="26" rx="4"/><rect x="260" y="14" width="50" height="26" rx="4"/><rect x="320" y="14" width="50" height="26" rx="4"/><rect x="380" y="14" width="50" height="26" rx="4"/><rect x="500" y="14" width="50" height="26" rx="4"/></g>
<rect x="200" y="14" width="50" height="26" rx="4" class="dg-critsoft" style="stroke:var(--crit);stroke-width:2"/>
<rect x="440" y="14" width="50" height="26" rx="4" class="dg-critsoft" style="stroke:var(--crit);stroke-width:2"/>
<g class="dg-ink" text-anchor="middle" font-size="11"><text x="105" y="31">1</text><text x="165" y="31">2</text><text x="225" y="31">3</text><text x="285" y="31">4</text><text x="345" y="31">5</text><text x="405" y="31">6</text><text x="465" y="31">7</text><text x="525" y="31">8</text></g>
<text x="20" y="84" class="dg-ink2" font-size="11">A → 1, 5</text>
<g class="dg-good-s" stroke-width="2" fill="none"><path d="M110 78 Q105 60 105 44"/><path d="M110 78 Q345 62 345 44"/></g>
<text x="20" y="124" class="dg-ink2" font-size="11">B → 2, 5</text>
<g class="dg-info-s" stroke-width="2" fill="none"><path d="M110 118 Q165 84 165 44"/><path d="M110 118 Q348 84 348 44"/></g>
<text x="20" y="164" class="dg-crit" font-size="11" font-weight="700">C → 3, 7 poison</text>
<g class="dg-crit-s" stroke-width="2" fill="none"><path d="M140 158 Q225 100 225 44"/><path d="M140 158 Q465 100 465 44"/></g>
<text x="20" y="198" class="dg-ink3" font-size="11">A and B each keep a healthy node · only an exact 3+7 shard fails</text>
</svg>`
  },

  'slo-window': {
    caption: 'Rolling versus calendar windows. A calendar window resets the budget on the first of the month, which lines up with business reporting. A rolling window keeps an incident in view for exactly its length, which better reflects what users have recently experienced.',
    svg: `<svg viewBox="0 0 640 165" xmlns="http://www.w3.org/2000/svg" font-size="12">
<line x1="40" y1="62" x2="600" y2="62" class="dg-sline"/>
<g class="dg-ink3" font-size="11"><text x="40" y="82" text-anchor="middle">Jun 1</text><text x="180" y="82" text-anchor="middle">Jun 15</text><text x="320" y="82" text-anchor="middle">Jul 1</text><text x="460" y="82" text-anchor="middle">Jul 15</text><text x="596" y="82" text-anchor="end">Aug 1</text></g>
<rect x="40" y="32" width="276" height="14" rx="2" class="dg-infosoft" style="stroke:var(--info)"/>
<text x="178" y="24" text-anchor="middle" class="dg-info" font-size="11" font-weight="700">calendar: June</text>
<rect x="324" y="32" width="276" height="14" rx="2" class="dg-infosoft" style="stroke:var(--info)"/>
<text x="462" y="24" text-anchor="middle" class="dg-info" font-size="11" font-weight="700">calendar: July</text>
<rect x="230" y="102" width="280" height="14" rx="2" class="dg-soft" style="stroke:var(--accent)"/>
<circle cx="510" cy="109" r="4" class="dg-acc"/>
<text x="370" y="136" text-anchor="middle" class="dg-ink2" font-size="11">rolling 30 d, evaluated Jul 20</text>
<text x="370" y="152" text-anchor="middle" class="dg-ink3" font-size="11">covers Jun 20 → Jul 20</text>
</svg>`
  },

  'static-stability': {
    caption: 'Static stability: the data plane keeps serving with what it already has, because nothing in the request path calls the control plane. The consequence is that you pre-provision enough capacity to survive losing an Availability Zone, since scaling up during the event would need the control plane that is busiest right then.',
    svg: `<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" font-size="12">
<rect x="20" y="16" width="600" height="56" rx="6" class="dg-box"/>
<text x="34" y="38" class="dg-ink" font-weight="700" font-size="11">Control plane</text>
<text x="34" y="56" class="dg-ink3" font-size="11">creates and changes things: RunInstances, scaling, IAM, deployments</text>
<text x="606" y="38" text-anchor="end" class="dg-ink3" font-size="11">complex · fails more</text>
<rect x="20" y="106" width="600" height="56" rx="6" class="dg-goodsoft"/>
<text x="34" y="128" class="dg-ink" font-weight="700" font-size="11">Data plane</text>
<text x="34" y="146" class="dg-ink3" font-size="11">serves with what exists: running tasks, cached config, resolved DNS</text>
<text x="606" y="128" text-anchor="end" class="dg-ink3" font-size="11">simple · fails less</text>
<line x1="320" y1="72" x2="320" y2="106" class="dg-crit-s" stroke-width="2" stroke-dasharray="4 3"/>
<text x="332" y="94" class="dg-crit" font-size="11" font-weight="700">no runtime dependency</text>
</svg>`
  }
};
