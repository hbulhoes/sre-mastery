/* World 2 — Observability for Reliability */
window.SRE_WORLDS = window.SRE_WORLDS || [];
window.SRE_WORLDS.push({
  id: 'w2',
  title: 'Monitoring and Alerting',
  subtitle: 'Seeing the system, and deciding which of the things you see is worth waking a human for.',
  badge: 'Signal Keeper',
  intro: `You already know what metrics, logs and traces are. This world is about the SRE-specific opinions layered on top: symptoms over causes, the four golden signals, the rule that every page must be actionable, and the workbook's burn-rate alerting method that connects alerts directly to the SLO. Sources: SRE book chapters 6 and 10, the alerting philosophy appendix, and workbook chapters 4 and 5.

The boss is an alert-storm cleanup: you inherit a rotation with 40 pages a week and have to decide, alert by alert, what stays.`,

  lessons: [
    {
      id: 'w2l1', title: 'Monitoring distributed systems', minutes: 10, source: 'SRE book ch.6',
      summary: 'Why we monitor, symptoms vs causes, the four golden signals, and the tail.',
      body: `## Vocabulary the book fixes

- **Monitoring:** collecting, processing, aggregating and displaying real-time quantitative data about a system.
- **White-box monitoring:** metrics exposed by the internals of the system (logs, JVM stats, instrumented handlers).
- **Black-box monitoring:** testing externally visible behaviour as a user would see it (probes, synthetic checks).
- **Alert:** a notification intended to be read by a human, pushed to a bug tracker (ticket), an alias (email) or a pager (page).
- **Root cause:** a defect that, if corrected, prevents the event from recurring in the same way. An incident can have several.

## Why monitor

The book lists: analysing long-term trends, comparing over time or experiment groups, alerting, building dashboards, conducting ad hoc retrospective analysis (debugging). Of these, **alerting is special** because it costs human attention. Everything in this world flows from that.

## Symptoms versus causes

"What's broken?" is the symptom. "Why?" is the cause. Monitoring must answer both, but **pages should be driven by symptoms**. Causes are numerous, change with every deploy, and often turn out to be harmless. Symptoms map directly to user pain and to the SLO.

| Symptom (page on this) | Possible cause (dashboards, not pages) |
|---|---|
| Serving 500s | Database refusing connections |
| p99 latency doubled | Disk saturated on one shard; GC pauses |
| Users in one region can't log in | Bad config push to that region's auth cluster |

Cause-based alerts have their place only when a cause is (a) inevitable to become a symptom and (b) detected far enough in advance to prevent it: a disk that will fill in 4 hours, a certificate expiring in 7 days.

## The four golden signals

If you can only measure four things about a user-facing system, measure these:

[[diagram:golden-signals]]

1. **Latency:** time to service a request. Distinguish the latency of successes from failures.
2. **Traffic:** demand, in a system-specific unit (HTTP RPS, transactions per second, sessions).
3. **Errors:** the rate of failed requests, whether explicit (500), implicit (200 with wrong content) or by policy (too slow to count).
4. **Saturation:** how "full" the service is, focused on the most constrained resource. Often a leading indicator; also covers "predicted to saturate in N hours".

## Worry about the tail

Averages lie. A system with a 100 ms median and a 5-second p99 is broken for one user in a hundred, and those users are often the ones with the most data (your most valuable customers). Use histograms and percentile buckets, and alert on the fraction of requests above a threshold rather than the mean.

## Resolution and cost

Match measurement frequency to what you will do with it. Per-second CPU sampling is useful for debugging spikes and useless for capacity planning; a 1-minute SLI resolution is fine for a 30-day SLO. Aggregate in the collector: record per-second locally, export per-minute distributions.

## Keep it simple

The book's Bigtable story: an SRE team with an over-alerting culture was paged constantly on causes. The fix was to relax the SLO temporarily, delete most cause-based alerts, and page only on the SLO. Rules the book distills:

- The rules that catch real incidents should be as simple, predictable and reliable as possible.
- Data collection that is rarely exercised should be removed.
- Signals collected but not displayed or alerted on are candidates for removal.

Design monitoring for the long run: every alert you add has a recurring cost in attention and maintenance, and the on-call team pays it.

> [aws]**On AWS.** White-box: CloudWatch metrics from the application (Embedded Metric Format or the CloudWatch agent), plus service metrics such as ALB, SQS and DynamoDB. Black-box: CloudWatch Synthetics canaries running a scripted user journey from outside your VPC, and Route 53 health checks. The four golden signals for a typical HTTP service on ALB: <<TargetResponseTime>> (latency), <<RequestCount>> (traffic), <<HTTPCode_Target_5XX_Count>> (errors), and a saturation signal you must pick deliberately: ECS CPU/memory reservation, RDS <<DatabaseConnections>>, SQS <<ApproximateAgeOfOldestMessage>>. Tail latency needs percentile statistics (<<p99>>) or CloudWatch histogram-based metrics; the <<Average>> statistic is the exact anti-pattern the book warns about.`,
      exercises: [
        { type: 'mcq', q: 'Which alert best follows the "page on symptoms" principle?', choices: ['Database connection pool at 90% utilisation', 'Checkout error rate above 1% for 5 minutes', 'A deploy just started', 'Node CPU above 80%'], answer: 1, explain: 'Error rate is what users experience and maps to the SLO. Pool utilisation, deploys and CPU are causes; useful on a dashboard, poor reasons to wake someone.' },
        { type: 'mcq', q: 'A service reports 120 ms average latency but users complain it is slow. What is the most likely explanation from a monitoring standpoint?', choices: ['The users are wrong', 'The average hides a long tail; a small fraction of requests are very slow', 'CloudWatch is delayed', 'Latency is not a golden signal'], answer: 1, explain: 'Averages compress the distribution. Look at p95/p99 and at the fraction of requests over your threshold.' },
        { type: 'multi', q: 'Which of these are the four golden signals? Select all that apply.', choices: ['Latency', 'Traffic', 'Errors', 'Saturation', 'Cost', 'Deployment frequency'], answers: [0, 1, 2, 3], explain: 'Latency, traffic, errors, saturation. Cost and deployment frequency are important but not golden signals.' },
        { type: 'mcq', q: 'When is a cause-based alert justified as a page, according to the book?', choices: ['Whenever the cause is easy to measure', 'When the cause will inevitably become a user-visible symptom and is detected early enough to prevent it', 'Never; only symptoms may page', 'When the on-call engineer prefers it'], answer: 1, explain: 'The classic examples are "disk full in 4 hours" and "certificate expires in 7 days": inevitable, preventable, and early.' },
        { type: 'mcq', q: 'On AWS, which is the most appropriate saturation signal for a queue-consuming worker fleet?', choices: ['ALB request count', 'SQS ApproximateAgeOfOldestMessage or ApproximateNumberOfMessagesVisible', 'Route 53 health-check status', 'S3 bucket size'], answer: 1, explain: 'Queue age and depth show how far behind the workers are: the constrained resource for that fleet. Request count is traffic; the others are unrelated.' }
      ]
    },

    {
      id: 'w2l2', title: 'Alerting philosophy: pages, tickets and noise', minutes: 9, source: 'SRE book ch.6 and appendix (Rob Ewaschuk)',
      summary: 'What deserves a page, what deserves a ticket, and how to keep the pager sane.',
      body: `## Every page costs something

A page interrupts sleep, focus or a family dinner. It also spends the team's most limited resource: the ability to react to a genuine emergency. Alert fatigue is not a personality flaw; it is the rational response to a pager that mostly cries wolf. The book therefore treats the set of paging alerts as something to be designed and pruned with the same care as production code.

## Questions to ask before adding a page

From chapter 6:
- Does this rule detect an otherwise undetected condition that is **urgent, actionable and actively or imminently user-visible**?
- Will I ever be able to ignore this alert, knowing it is benign? When and why? How can I avoid that scenario?
- Does this alert definitely indicate users are being negatively affected? Are there cases that should be filtered out (drained traffic, test deployments)?
- Can I take action in response? Is the action urgent, or could it wait until morning? Could the action be automated?
- Are other people getting paged for the same underlying issue?

## Pages, tickets, logs

| Channel | Use when | Expectation |
|---|---|---|
| **Page** | Users are hurt now or will be within hours, and a human must act | Acknowledge in minutes, any hour |
| **Ticket** | Something needs a human within days (disk 70% full, budget burn slow, cert in 30 days) | Handled during working hours |
| **Log / dashboard** | Useful for debugging, no action by itself | Nobody is notified |

Sub-critical pages (ones that would wait until morning) belong in tickets. Sending them to the pager trains people to ignore the pager.

## Rules from the alerting philosophy appendix

- **Pages should be urgent, important, actionable and real.** Every one should require intelligence to resolve; if the response is a rote procedure, automate it.
- **Symptom-based paging.** Cause-based alerts drift out of date and multiply.
- **Playbooks for every page.** The alert links to a document that says what the alert means, how to confirm it, what to check, and who to escalate to. Playbooks halve the mean time to resolution in the book's experience.
- **Avoid the "N alerts for one outage" problem.** If a database dies, one page should fire, not one per dependent service and one per metric.
- **Alert on the SLO, at a threshold users would notice.** Alerting at a 0.01% error rate when the SLO allows 0.1% just pages you for nothing.
- **Track the pager.** Count pages per shift, categorise them, and fix the top sources. A shift with more than two pages leaves no time to fix root causes.

## The noise budget

Treat the paging load like an error budget in reverse: aim for a specific ceiling (for example, no more than two pages per 12-hour shift, and a majority of pages requiring real action). When the ceiling is exceeded, tuning alerts becomes the highest-priority engineering work, above features. This is the mechanism that stops a rotation from decaying.

> [aws]**On AWS.** CloudWatch alarms have three states: <<OK>>, <<ALARM>> and <<INSUFFICIENT_DATA>>. Decide explicitly how to treat missing data (<<TreatMissingData>>): a low-traffic service that reports no data at 3 a.m. should not page. Use **composite alarms** to collapse many signals into one page ("error rate high AND not in a deployment window"). Route pages via SNS to a paging service and tickets via a different SNS topic to your ticketing tool; never send both to the same place. Alarm descriptions should link to the playbook. Use <<DatapointsToAlarm>> out of <<EvaluationPeriods>> (for example 3 of 5) rather than a single datapoint, so one noisy minute does not page.

## Signs your alerting is unhealthy

- Pages are acknowledged and closed with no action.
- The same alert fires every deploy.
- On-call engineers keep a mental list of "ignore these".
- More than a handful of alerts have no linked playbook.
- Nobody can say how many pages last week were actionable.`,
      exercises: [
        { type: 'mcq', q: 'An alert fires when disk usage on a log volume exceeds 70%. At current growth it would fill in about 9 days. Which channel should it use?', choices: ['Page, because disks filling up cause outages', 'Ticket, because action is needed but not urgently', 'Neither; log it', 'Page only at night'], answer: 1, explain: 'Nine days of headroom is a working-hours problem. Reserve pages for conditions that need action within hours.' },
        { type: 'multi', q: 'Which properties must a paging alert have according to the alerting philosophy? Select all that apply.', choices: ['Urgent', 'Actionable', 'Indicates real user impact (or imminent impact)', 'Requires human judgement rather than a rote procedure', 'Fires on every possible cause of an outage'], answers: [0, 1, 2, 3], explain: 'Urgent, actionable, real, requiring intelligence. Firing on every cause is the anti-pattern that produces alert storms.' },
        { type: 'mcq', q: 'During a database outage, twelve services each page their on-call engineer with a "downstream errors" alert. What is the recommended fix?', choices: ['Add more on-call engineers', 'Consolidate: one symptom-based page for the actual failure, with dependents suppressed or routed to the incident channel', 'Lower each service\'s threshold so they fire earlier', 'Remove all alerts on the dependents'], answer: 1, explain: 'The book calls this the N-alerts-for-one-outage problem. Dependents should still know they are affected, but not twelve separate pages.' },
        { type: 'mcq', q: 'On CloudWatch, a low-traffic API stops emitting data overnight and its 5xx alarm flips to INSUFFICIENT_DATA and pages. What is the right configuration change?', choices: ['Set TreatMissingData to notBreaching for that alarm', 'Increase the alarm threshold', 'Send the alarm to email instead', 'Disable the alarm at night'], answer: 0, explain: 'Missing data on a low-traffic service is not an error condition. Configure how the alarm treats missing data rather than hacking around it.' },
        { type: 'tf', q: 'True or false: a page whose resolution is always the same three-step procedure is a good candidate for automation rather than a pager.', answer: 0, explain: 'True. Every page should require intelligence; a rote fix belongs in an auto-remediation runbook.' }
      ]
    },

    {
      id: 'w2l3', title: 'Alerting on SLOs: burn-rate alerts', minutes: 12, source: 'SRE workbook ch.5',
      summary: 'The six-step evolution from naive threshold alerts to multi-window, multi-burn-rate alerts.',
      body: `## What we want from an alert

The workbook evaluates alerting rules on four properties:
- **Precision:** proportion of alerts that correspond to significant events.
- **Recall:** proportion of significant events that produce an alert.
- **Detection time:** how long before the alert fires.
- **Reset time:** how long the alert keeps firing after the problem is fixed.

"Significant" is defined by the SLO: an event that consumes a meaningful fraction of error budget. Everything below is the search for a rule that scores well on all four.

## Iteration 1: error rate above SLO threshold

Alert if the error rate over the last 10 minutes exceeds 0.1% (for a 99.9% SLO). Detection is fast, but precision is terrible: a 10-minute blip at 0.1% consumes 0.02% of a 30-day budget. You page for events that do not matter.

## Iteration 2: a longer window

Alert if the error rate over the last 36 hours exceeds 0.1%. Now the alert corresponds to about 5% of budget, so precision improves, but detection and reset are slow: a total outage takes a long time to register, and the alert keeps firing for 36 hours after recovery.

## Iteration 3: alert duration

Add "for 10 minutes" conditions. Reduces flapping but hurts recall: a 100% outage lasting 9 minutes never alerts, while a 0.1% drizzle lasting 10 minutes does.

## Iteration 4: alert on burn rate

Burn rate = observed error rate ÷ allowed error rate. For a 30-day SLO, a burn rate of 1 exhausts the budget in exactly 30 days. Alert when a burn rate over a window implies a chosen fraction of budget consumed:

budget consumed = burn rate × window ÷ SLO window

A burn rate of 14.4 over a 1-hour window consumes 2% of a 30-day budget (14.4 × 1 h ÷ 720 h). Detection is fast for big outages, precision is good, but a slow burn (say 1.5× for days) never trips it.

## Iteration 5: multiple burn rates

Use several rules at different sensitivities:

| Budget consumed | Window | Burn rate | Notify |
|---|---|---|---|
| 2% | 1 h | 14.4 | page |
| 5% | 6 h | 6 | page |
| 10% | 3 d | 1 | ticket |

Now fast burns page in minutes, and slow burns become tickets. Remaining problem: the 3-day rule keeps firing for up to 3 days after a fix, and the rules can overlap.

## Iteration 6: multi-window, multi-burn-rate

Pair each long window with a short window (1/12th the length) and require **both** to exceed the burn rate. The long window proves the event is significant; the short window proves it is still happening, so the alert resets within minutes of a fix.

[[diagram:burn-rate]]

This is the workbook's recommended configuration for services with enough traffic. It gives good precision, good recall, fast detection for severe events, and fast reset.

## Low-traffic services

If a service serves few requests, one failed request can look like a huge burn rate. Options: generate synthetic traffic so the denominator is stable; combine several small services into one SLO; lengthen the windows; or accept a slower detection time explicitly.

## Dependencies and extreme availability

If your SLO is stricter than 99.99%, the budget is so small that even the 1-hour window is too slow to be useful; you need automated response rather than human paging. And if a dependency's failure counts against your SLO, alert on your own SLI rather than on the dependency's status: what matters is user impact.

> [aws]**On AWS.** CloudWatch Application Signals implements burn-rate alarms directly: define the SLO (availability or latency, period-based or request-based), then create alarms on the burn-rate metric with a look-back window. To build it by hand, use metric math: <<burn = (errors / requests) / (1 − slo)>> over two periods (for example 60 minutes and 5 minutes), then a **composite alarm** that is in ALARM only when both child alarms are. For the 3-day rule, route to a ticket topic instead of the pager. Keep the SLO target and windows as parameters in the same stack as the alarms, so alerting is derived from the SLO and not maintained separately.

## Reference maths

For a 30-day (720 h) window and error budget fraction *e*:
- burn rate for consuming fraction *f* of budget in *t* hours: **b = f × 720 ÷ t**
- error-rate threshold for that rule: **b × e**

Example: 99.9% SLO (e = 0.001), page on 2% in 1 h → b = 0.02 × 720 ÷ 1 = 14.4 → error-rate threshold = 1.44%.`,
      exercises: [
        { type: 'num', q: 'For a 30-day SLO window, what burn rate consumes 5% of the error budget in 6 hours?', answer: 6, tolerance: 0.1, unit: '×', hint: 'b = f × 720 ÷ t', explain: '0.05 × 720 ÷ 6 = 6.' },
        { type: 'num', q: 'SLO is 99.9% availability over 30 days. What error-rate threshold (as a percentage) corresponds to the 14.4× burn-rate rule?', answer: 1.44, tolerance: 0.02, unit: '%', explain: '14.4 × 0.001 = 0.0144 = 1.44%.' },
        { type: 'mcq', q: 'Why does the workbook pair each long window with a short window in the final alerting design?', choices: ['To double the number of alerts', 'So the alert resets quickly once the problem is fixed, while the long window still guarantees the event is significant', 'To reduce CloudWatch costs', 'Because short windows are more accurate'], answer: 1, explain: 'The long window filters insignificant blips; the short window confirms the burn is ongoing so the alert stops promptly after recovery.' },
        { type: 'mcq', q: 'A service handles 30 requests per hour. One failed request produces a 3.3% error rate and pages the team. What is the most sensible remedy?', choices: ['Lower the SLO to 90%', 'Add synthetic traffic or lengthen the windows so a single failure does not dominate the SLI', 'Remove the alert', 'Page only during business hours'], answer: 1, explain: 'Low-traffic services need a stable denominator: synthetic requests, aggregation with sibling services, or longer windows, chosen explicitly.' },
        { type: 'mcq', q: 'Which alerting property does a rule with a 36-hour window and no short window score worst on?', choices: ['Precision', 'Recall', 'Reset time', 'Cost'], answer: 2, explain: 'Once the error rate over 36 hours exceeds the threshold, it keeps exceeding it long after the fix. Reset time is the casualty; precision is actually decent.' }
      ]
    },

    {
      id: 'w2l4', title: 'Practical observability: dashboards, debugging and the monitoring stack', minutes: 10, source: 'SRE book ch.10, workbook ch.4',
      summary: 'Designing dashboards that answer questions, keeping the pipeline healthy, and the AWS stack.',
      body: `## Lessons from Borgmon

Google's original monitoring system, Borgmon, introduced ideas now standard in Prometheus and every cloud metrics service: white-box metrics exported by the binary over HTTP; time series stored in memory and labelled with dimensions; rules that compute new series from old ones; alerting rules evaluated over the same data. Two durable lessons:

- **Instrumentation is a first-class feature of the service.** Every handler exports counters for requests, errors and latency histograms, with labels for method and status. Monitoring "from the outside" cannot tell you why.
- **Aggregation happens in the monitoring system, not in the exporter.** Export raw counters and let the rules compute rates and ratios. Counters survive restarts and missed scrapes better than pre-computed rates.

## Workbook guidance on the stack

Desirable features of a monitoring system: speed (fresh data, fast queries), calculations (rates, aggregations, percentiles across dimensions), interfaces (dashboards and an API), and alerts that can be managed as code. The workbook also warns: choose between metrics and logs deliberately (metrics for the fast questions, logs for the detailed ones), and keep the monitoring system simpler and more reliable than what it monitors.

## Sources of monitoring data

- **Metrics:** cheap, fast, aggregated. Answer "how much" and "how often". Backbone of SLIs and alerts.
- **Logs:** detailed, expensive, delayed. Answer "what exactly happened to this request".
- **Traces:** structured, per-request timing across services. Answer "where did the time go".
- **Synthetic probes:** external, black-box. Answer "can a user do X right now".

Alert on metrics and probes; debug with logs and traces.

## Dashboards that answer questions

A dashboard is a tool for a specific person asking a specific question, not a gallery of every metric. The workbook recommends:

- A **top-level dashboard** per service showing the SLIs and error-budget burn, so anyone can answer "are we OK?" in five seconds.
- **Debugging dashboards** organised by the failure mode or component, with the golden signals broken down by dimension (region, AZ, version, customer tier).
- Consistent layouts across services, so on-call engineers can read a dashboard for a service they have never seen.
- Deploy markers and annotations, so a change in a graph can be correlated with the change that caused it.

The USE method (utilisation, saturation, errors) works for resources; RED (rate, errors, duration) works for request-driven services; both are subsets of the golden signals.

## Retention and cardinality

High-cardinality labels (user ID, request ID) belong in logs or traces, not in metrics. Choose retention by use: seconds-level for a few days for debugging, minute-level for months for capacity planning. Downsample rather than deleting.

## Monitoring the monitoring

If the metrics pipeline breaks, alerts go silent and that silence looks like health. Alert on the absence of data: heartbeat metrics, "no data received from N% of hosts", and a dead-man's switch that pages if the alerting system stops evaluating.

> [aws]**On AWS.** A typical stack: CloudWatch metrics and Embedded Metric Format for application metrics; CloudWatch Logs with Logs Insights for queries, plus metric filters to turn log patterns into metrics; AWS X-Ray or OpenTelemetry via the AWS Distro for OpenTelemetry (ADOT) for traces; Amazon Managed Service for Prometheus and Amazon Managed Grafana if your teams prefer PromQL and Grafana dashboards; CloudWatch Synthetics for black-box probes; Contributor Insights for "which key is causing this" questions without blowing up metric cardinality. Add deployment annotations from CodeDeploy or your pipeline to dashboards. For a dead-man's switch, a scheduled EventBridge rule that expects a heartbeat metric and alarms on missing data covers the "monitoring is down" case. Alarms and dashboards belong in CloudFormation or CDK, next to the service they monitor.

## A debugging habit worth building

When a graph moves, ask in order: what changed (deploy, config, traffic, dependency)? Which dimension isolates it (one AZ, one version, one customer)? Is it a symptom or a cause? Only then form a hypothesis. World 4 makes this loop formal.`,
      exercises: [
        { type: 'mcq', q: 'Which piece of data belongs in logs or traces rather than as a metric label?', choices: ['HTTP status class', 'Region', 'Customer ID', 'Service version'], answer: 2, explain: 'Customer ID is high-cardinality: millions of distinct values would explode the metric store. Status, region and version are bounded.' },
        { type: 'mcq', q: 'What does a "dead-man\'s switch" protect against in a monitoring system?', choices: ['Excessive alert volume', 'The alerting pipeline itself failing silently, so no alerts fire during an outage', 'Engineers ignoring pages', 'Dashboards loading slowly'], answer: 1, explain: 'A missing heartbeat pages someone; silence is never allowed to look like health.' },
        { type: 'mcq', q: 'Why does Borgmon-style monitoring prefer exporting raw counters over pre-computed rates?', choices: ['Counters use less memory', 'Counters survive restarts and missed scrapes; the monitoring system can compute rates over any window it likes', 'Rates cannot be graphed', 'Counters are required by CloudWatch'], answer: 1, explain: 'A counter that resets is easy to handle; a pre-computed rate that missed a scrape is lost information. Aggregation belongs in the monitoring system.' },
        { type: 'multi', q: 'Which elements does the workbook recommend for a service\'s top-level dashboard? Select all that apply.', choices: ['The SLIs', 'Error-budget burn', 'Every JVM metric available', 'Deploy annotations', 'A consistent layout shared with other services'], answers: [0, 1, 3, 4], explain: 'Top-level dashboards answer "are we OK" fast. Exhaustive metric galleries belong in debugging dashboards, if anywhere.' },
        { type: 'mcq', q: 'On AWS, which tool is designed to answer "which single key is responsible for most of this traffic or error volume" without creating high-cardinality metrics?', choices: ['CloudWatch Contributor Insights', 'AWS Config', 'CloudWatch Synthetics', 'Route 53 Resolver logs'], answer: 0, explain: 'Contributor Insights computes top-N contributors from logs on the fly, so you do not need a metric dimension per user.' }
      ]
    }
  ],

  boss: {
    id: 'w2boss', title: 'Alert Storm', tagline: 'Forty pages a week. Two engineers about to quit. One week to fix it.',
    intro: `You take over the **Orders** platform rotation (API on ECS, SQS workers, DynamoDB, Aurora for reporting). Last week the pager fired **41 times**. Six pages were real. The on-call engineer slept through a genuine outage on Thursday because they had silenced their phone.

The SLO: 99.9% of order submissions succeed within 1 s, and 99% of orders are processed (visible in the dashboard) within 5 minutes, both over 30 days.

Each turn presents alerts or decisions. Keep service health above 50%.`,
    steps: [
      { time: 'Monday', text: `You export last week's pages and categorise them. Top sources:

\`\`\`
14  ECS CPU > 80% (any task, 1 datapoint)
 9  Aurora reporting replica lag > 30 s
 7  SQS queue depth > 1000
 5  Orders 5xx rate > 0.01% (1 minute)
 3  Nightly batch job "started late"
 3  Actual incidents (orders failing)
\`\`\`

Where do you start?`,
        choices: [
          { text: 'Set a target for the rotation (no more than 2 pages per shift, majority actionable), then rewrite the alerts from the SLO outward: symptom-based pages first, then decide what happens to each cause-based alert.', d: 15, fb: 'Right. Start from what users experience and the SLO, agree a noise budget, and treat everything else as a candidate for ticket, dashboard or deletion.' },
          { text: 'Raise all the thresholds by 20% to cut volume quickly.', d: -20, fb: 'You keep every cause-based alert and make each slightly less sensitive. Volume drops a little; the structure that produced the storm remains.' },
          { text: 'Add a second on-call engineer so the load is shared.', d: -25, fb: 'Now two people are being trained to ignore the pager. Headcount does not fix alert design.' }
        ] },
      { time: 'Tuesday', text: `The ECS CPU alert: any task over 80% CPU for one datapoint pages. Tasks routinely spike during deploys and cache warmups. CPU has never been the cause of an SLO breach.`,
        choices: [
          { text: 'Delete the page. Keep CPU on the debugging dashboard and, if useful, add a ticket-level alert when average CPU across the service stays above 70% for an hour (capacity signal).', d: 15, fb: 'CPU is a cause, and here not even a reliable one. As a saturation trend it deserves a ticket; as a page it was pure noise.' },
          { text: 'Change it to 3 of 5 datapoints over 90%.', d: 0, fb: 'Less noisy, still a cause-based page with no linked user impact. Half measure.' },
          { text: 'Keep it; high CPU could precede an outage.', d: -20, fb: 'Fourteen pages last week, zero outages. The SLO-based alerts will catch the outage if it ever comes.' }
        ] },
      { time: 'Tuesday', text: `The Orders 5xx alert: pages when the 1-minute error rate exceeds 0.01%. The SLO allows 0.1%. Most fires last one or two minutes and resolve alone.`,
        choices: [
          { text: 'Replace it with multi-window burn-rate alerts: page at 14.4× over 1 h / 5 min and 6× over 6 h / 30 min; ticket at 1× over 3 d / 6 h.', d: 15, fb: 'This connects paging to budget consumption. A one-minute blip at 0.05% no longer pages; a real outage pages within a couple of minutes.' },
          { text: 'Raise the threshold to 0.1% for 1 minute.', d: -5, fb: 'Better precision than before but still a single short window: a 0.1% blip for 60 seconds pages, and a 0.08% burn for a day never does.' },
          { text: 'Change it to 0.1% for 30 minutes.', d: -10, fb: 'Now a total outage lasting 25 minutes never pages. Recall collapsed.' }
        ] },
      { time: 'Wednesday', text: `Aurora reporting replica lag pages nine times a week. The reporting replica feeds an internal analytics dashboard used by the finance team during office hours. It is not in the order path.`,
        choices: [
          { text: 'Convert to a ticket-level alert (lag > 10 min sustained) routed to the data team, and add a freshness SLI for the finance dashboard if they want a guarantee.', d: 12, fb: 'No user impact on the SLO, office-hours consumers, clear owner elsewhere. A ticket with an explicit freshness expectation is the right shape.' },
          { text: 'Keep the page but only during business hours.', d: -5, fb: 'Closer, but it is still not something the Orders on-call engineer can act on at any hour. Route it to the people who own the data pipeline.' },
          { text: 'Delete it entirely.', d: -12, fb: 'Somebody does care about that lag. Deleting the alert silences a real consumer instead of routing it correctly.' }
        ] },
      { time: 'Thursday', text: `SQS queue depth > 1000 pages seven times a week, usually during the evening peak when the workers are simply busy. The processing SLO is "99% of orders visible within 5 minutes".`,
        choices: [
          { text: 'Page on the symptom instead: ApproximateAgeOfOldestMessage above 3 minutes for 5 minutes (a leading indicator of the 5-minute SLO), and put depth on the dashboard. Add a burn-rate alert on the freshness SLI itself.', d: 15, fb: 'Age of the oldest message maps directly to the user-visible freshness; depth alone is context-free. The SLI burn-rate alert catches what the leading indicator misses.' },
          { text: 'Raise the depth threshold to 5000.', d: -8, fb: 'Depth still says nothing about whether orders are late. A depth of 5000 with fast workers is fine; 800 with a stuck worker is an outage.' },
          { text: 'Autoscale workers on queue depth and keep the page.', d: 0, fb: 'Autoscaling on depth is good engineering, but the page stays cause-based and will keep firing on every peak.' }
        ] },
      { time: 'Friday', text: `You now have: two burn-rate pages per SLO, one freshness page, tickets for replica lag and CPU trends, and everything else on dashboards. The team asks what else the rollout needs before it goes live.`,
        choices: [
          { text: 'A playbook linked from every remaining page, a dead-man\'s switch on the alert pipeline, composite alarms so one outage yields one page, and a weekly pager review that tracks pages per shift against the target.', d: 15, fb: 'Those are the durable pieces: playbooks cut resolution time, the dead-man\'s switch guards against silent monitoring failure, composition prevents storms, and the review keeps the rotation from decaying again.' },
          { text: 'Nothing; the alert count is down.', d: -15, fb: 'Count is a lagging indicator. Without playbooks and a review loop the noise creeps back within a quarter.' },
          { text: 'Re-add a few of the old cause-based pages as a safety net.', d: -20, fb: 'The safety net is the SLO alerts. Re-adding cause pages reintroduces exactly the noise that caused Thursday\'s missed outage.' }
        ] }
    ],
    win: `The rotation went from 41 pages to a handful, each tied to an SLO and each with a playbook. The trick was never the thresholds; it was the structure: symptom-based, budget-aware, routed to the right people, with a review loop.

**Takeaway:** an alert is a claim that a human must act now. Every claim you cannot defend is a page you should delete.`,
    lose: `The pager stayed noisy or, worse, went quiet in the wrong places. Typical failure paths: raising thresholds instead of redesigning, adding people instead of fixing signals, deleting alerts that had a legitimate owner, and lengthening windows until real outages slipped through.

Revisit lessons 2.2 and 2.3 and retry.`
  }
});
