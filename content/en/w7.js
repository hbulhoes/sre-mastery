/* World 7 — Modern reliability practice on cloud */
window.SRE_WORLDS = window.SRE_WORLDS || [];
window.SRE_WORLDS.push({
  id: 'w7',
  title: 'Reliability in the Cloud Era',
  subtitle: 'Static stability, cells, shuffle sharding, chaos engineering and multi-region survival.',
  badge: 'Principal SRE',
  intro: `The SRE book was written from inside Google's own infrastructure. This world covers the practices that the industry (and AWS in particular) developed for the same problems on rented infrastructure: static stability and the control-plane/data-plane split, cell-based architecture and shuffle sharding for blast-radius reduction, chaos engineering as a discipline, multi-region disaster recovery with honest recovery objectives, and the measurement practices that connect reliability to delivery performance.

Sources here are the AWS Well-Architected reliability pillar, the Amazon Builders' Library, the DORA research programme, and the workbook's cloud chapters, alongside the book's own material.

The final boss is a region impairment: everything from all seven worlds, at once.`,

  lessons: [
    {
      id: 'w7l1', title: 'Static stability and the control plane', minutes: 10, source: 'Amazon Builders\' Library; Well-Architected reliability pillar',
      summary: 'Why systems should keep working without making new decisions, and what that costs.',
      body: `## The split

Every cloud system has two planes:

- The **control plane** creates and changes things: launching instances, changing a load balancer's targets, updating DNS records, modifying IAM. It is low-volume, complex, and correspondingly more likely to be impaired.
- The **data plane** does the recurring work: routing packets, serving requests from running instances, resolving already-published DNS answers, reading objects.

Data planes are generally far more reliable than control planes, because they are simpler and because they are designed to keep doing what they were last told. AWS designs services this way deliberately, and publishes the distinction so that customers can build on it.

[[diagram:static-stability]]

## The principle

**Static stability** means a system continues to operate correctly during a failure without needing to make changes, and therefore without needing the control plane. The classic formulation: the system keeps working with the resources it already has, even if it cannot provision, modify or discover anything new.

The consequences are concrete and often uncomfortable:

- **Pre-provision for failure.** If you run three Availability Zones and must survive losing one, run enough capacity in all three that the remaining two can serve 100% of traffic *right now*, without waiting for Auto Scaling. That means running at roughly 50 to 66% utilisation in normal operation and paying for it.
- **Do not depend on scaling as a disaster response.** Scaling up during an AZ event requires the EC2 control plane at exactly the moment it is busiest, and takes minutes you do not have.
- **Cache what you must look up.** A request path that calls a discovery service, a configuration API or an IAM endpoint on every request inherits that dependency's availability. Cache with a long enough TTL that the dependency can be down for a while without user impact, and fail open to the last known value.
- **Prefer pre-created resources.** Pre-warmed connection pools, pre-created queues, pre-published DNS records with health-check-based failover rather than records created during the event.

## The bimodal-behaviour warning

The Builders' Library makes a related point: systems that behave one way normally and a different way during failure are dangerous, because the failure mode is rarely exercised. A failover path that only runs during a disaster is a path you have never tested at load. Static stability reduces the number of modes: ideally the system does the same thing during an AZ failure as it does on a Tuesday, just with fewer machines.

## Where it conflicts with cost

The honest trade-off: static stability costs idle capacity. The counter-argument is the error budget. If surviving an AZ loss is worth more than the idle capacity costs, pre-provision; if not, accept the exposure explicitly and write it down. What is not acceptable is assuming Auto Scaling will save you and never testing it.

> [aws]**On AWS.** Practical rules: set Auto Scaling group minimum capacity so that the surviving AZs can carry full load, not just the desired capacity you would need on a normal day. Use ALB with cross-zone load balancing so an AZ's loss redistributes automatically. Prefer Route 53 health checks with pre-created failover records over DNS changes made during an incident. For Aurora, understand that a failover is a control-plane action with a real duration; for DynamoDB global tables, writes continue in the surviving region without a promotion step. Cache IAM and configuration lookups. Use EC2 warm pools if launch time matters. And check the dependency you forgot: if your instances fetch a configuration file from S3 at boot, a boot during an S3 event is a boot that fails.`,
      exercises: [
        { type: 'mcq', q: 'What does "static stability" mean for a system running across three Availability Zones?', choices: ['The system never changes its configuration', 'The system survives the loss of one AZ using capacity it is already running, without needing the control plane to provision anything', 'The system uses static IP addresses', 'The system scales automatically when an AZ fails'], answer: 1, explain: 'Static stability is the ability to keep operating correctly without making new decisions or new resources during the failure.' },
        { type: 'num', q: 'A service runs across 3 AZs and must serve 100% of traffic after losing any one AZ, using only already-running capacity. What is the maximum average utilisation per AZ in normal operation, as a percentage? (Whole number.)', answer: 67, tolerance: 2, unit: '%', hint: 'Two of three AZs must carry all the load.', explain: 'Two AZs must carry 100%, so each AZ runs at most 50% of total load, meaning the fleet as a whole runs at about 2/3 (67%) of its capacity.' },
        { type: 'mcq', q: 'Why is relying on Auto Scaling as the primary response to an AZ failure risky?', choices: ['Auto Scaling is expensive', 'It depends on the EC2 control plane at the moment it is most stressed, and takes minutes during which the surviving AZs are overloaded', 'Auto Scaling cannot span AZs', 'Auto Scaling requires manual approval'], answer: 1, explain: 'Scaling is a control-plane action with latency. Pre-provisioned capacity is the statically stable answer; scaling handles growth, not disasters.' },
        { type: 'mcq', q: 'Which design detail would violate static stability for a request path?', choices: ['Reading a cached configuration value from memory', 'Calling a service-discovery API on every incoming request', 'Serving from an already-running instance', 'Using a pre-created Route 53 failover record'], answer: 1, explain: 'A per-request control-plane call inherits that plane\'s availability. Cache it, with a TTL long enough to ride out an impairment.' },
        { type: 'tf', q: 'True or false: a failover path that only executes during a disaster is safer than one exercised in normal operation, because it is simpler.', answer: 1, explain: 'False. Bimodal behaviour means the disaster path is the least-tested code in the system. Prefer designs where failure changes the scale of operation, not its mode.' }
      ]
    },

    {
      id: 'w7l2', title: 'Blast radius: cells and shuffle sharding', minutes: 11, source: 'Amazon Builders\' Library; Well-Architected',
      summary: 'Partitioning a service so that a failure affects a fraction of customers rather than all of them.',
      body: `## The problem with one big fleet

A single fleet serving all customers has a single blast radius: any poison input, memory leak, bad deploy or noisy neighbour affects everyone. Redundancy within the fleet does not help, because every replica runs the same code against the same workload.

## Cell-based architecture

A **cell** is a complete, independent instance of the service stack: its own compute, its own data store, its own capacity. Customers (or partitions of the workload) are assigned to a cell. A thin routing layer maps a request to its cell.

Properties this buys:

- **Bounded blast radius.** A failure inside a cell affects that cell's customers only. With 10 cells, the default impact of a cell-level failure is 10% of customers instead of 100%.
- **Bounded scale.** Each cell is a known size, tested at that size. You scale by adding cells, so you never discover a new scaling limit in production.
- **Safer deployments.** Deploy cell by cell, which is a canary with a naturally bounded population and a natural rollback unit.
- **Testable capacity.** You can load-test one cell to destruction and know what the whole system does.

The costs: the routing layer becomes critical (keep it thin, simple and statically stable), per-cell overhead multiplies fixed costs, and cross-cell operations (a customer moving, or a query spanning cells) need explicit design. Cells work best when the workload partitions naturally by tenant.

## Shuffle sharding

Shuffle sharding refines the assignment. Instead of giving each customer one cell, give each customer a random *combination* of nodes or cells.

[[diagram:shuffle-sharding]]

With 8 nodes and a shard size of 2, there are 28 possible pairs. A customer sending poison traffic degrades only its own two nodes. Every other customer shares at most one node with them, so with a retry to the healthy node, most customers see no failure at all. The chance that another customer has exactly the same pair is 1 in 28.

The arithmetic generalises: with *n* nodes and shard size *k*, there are "n choose k" shards. Eight nodes and shard size 2 gives 28; 100 nodes with shard size 5 gives over 75 million. The fraction of customers sharing a complete shard with a victim becomes vanishingly small, while each customer still only uses *k* nodes' worth of resources.

Requirements for it to work: the client must retry across the nodes in its shard, the workload must be partitionable per customer, and the shard assignment must be stable (usually a hash of the customer ID).

## Choosing a partition key

Cells and shards are only as good as the key. Common choices: customer or tenant ID, account ID, or a geographic region. Bad choices create hot cells (a key where one value dominates) or make routing stateful. Plan for rebalancing, and for the one customer who outgrows a cell.

> [aws]**On AWS.** Cell routing can be as simple as Route 53 records per cell plus a lookup service, or an ALB with host-based routing. Amazon's own services use both patterns extensively: Route 53's infrastructure uses shuffle sharding across its name servers, and many AWS services are internally cell-based per Availability Zone or per region partition. For your own workloads, the natural cell boundary is often an AWS account plus a VPC per cell, which gives you quota isolation and IAM isolation for free. Keep the routing layer's data plane statically stable: a cached mapping that survives the lookup service being down.

## When not to cellularise

If the workload does not partition (a global leaderboard, a single shared graph), cells add complexity without bounding the blast radius. If you have ten customers, the arithmetic does not help. Start with AZ-level and region-level isolation, and reach for cells when tenant count and the cost of a full outage both justify it.`,
      exercises: [
        { type: 'mcq', q: 'What is the defining property of a cell in cell-based architecture?', choices: ['A cell is a single server', 'A cell is a complete, independent instance of the service stack serving an assigned subset of customers', 'A cell is a database shard shared by all application servers', 'A cell is an availability zone'], answer: 1, explain: 'Independence is the point: its own compute and data, so a failure inside it cannot reach other cells.' },
        { type: 'num', q: 'With 9 nodes and a shuffle-shard size of 2, how many distinct shards (node pairs) are possible?', answer: 36, tolerance: 0, unit: 'shards', hint: 'n choose k = n(n−1)/2 for k = 2', explain: '9 × 8 ÷ 2 = 36 possible pairs.' },
        { type: 'mcq', q: 'A customer sends poison traffic that crashes both nodes in their shuffle shard. Why do most other customers see little or no impact?', choices: ['The poison traffic is filtered', 'Each other customer shares at most one of those two nodes, so a retry reaches their healthy node; only a customer with the identical pair is fully affected', 'Other customers are on different regions', 'The load balancer detects poison traffic'], answer: 1, explain: 'Overlap is partial for almost everyone, and client retry across the shard converts partial overlap into no user-visible failure.' },
        { type: 'multi', q: 'Which are genuine costs or requirements of cell-based architecture? Select all that apply.', choices: ['A routing layer that must be kept thin and highly available', 'Multiplied per-cell fixed overhead', 'Explicit design for cross-cell operations and customer migration', 'It removes the need for canary deployments', 'A workload that partitions naturally by tenant'], answers: [0, 1, 2, 4], explain: 'Cells make deployment safer but do not remove the need for staged rollout; they give it a natural unit.' },
        { type: 'mcq', q: 'Which workload is the poorest fit for cell-based partitioning?', choices: ['A multi-tenant SaaS API with 50,000 customers', 'A per-account document store', 'A single global leaderboard that every user reads and writes', 'A regional order-processing service'], answer: 2, explain: 'A globally shared mutable structure does not partition, so cells add complexity without bounding the blast radius.' }
      ]
    },

    {
      id: 'w7l3', title: 'Chaos engineering and game days', minutes: 10, source: 'Principles of Chaos Engineering; SRE book ch.17; AWS FIS',
      summary: 'Running experiments on production systems to find the failures before they find you.',
      body: `## The discipline

Chaos engineering is the practice of running deliberate experiments on a system to build confidence in its ability to withstand turbulent conditions. It is not "randomly break things"; it is a scientific method with a safety envelope.

The canonical loop:

1. **Define steady state** as a measurable output that indicates normal behaviour. Use the SLIs: success rate, latency percentile, order-completion rate. "The service is up" is not a steady-state definition.
2. **Hypothesise** that steady state will continue during the injected condition. State it explicitly: "when one AZ's instances are terminated, success rate stays above 99.9% and p99 stays below 400 ms".
3. **Inject a realistic fault**: instance termination, AZ impairment, dependency latency, API throttling, disk pressure, certificate expiry, clock skew.
4. **Try to disprove the hypothesis** by measuring the steady-state metrics during the experiment.
5. **Stop** automatically if the blast radius exceeds the agreed limit.

## The rules that keep it safe

- **Minimise blast radius.** Start in a test environment, then a single cell or a small percentage of production traffic. Expand only after the small experiment passes.
- **Define stop conditions before starting**, wired to automation, not to a human watching a dashboard. An experiment that cannot abort itself is an outage waiting for permission.
- **Run during business hours** with the owning team present. Chaos at 3 a.m. teaches you about your pager, not your system.
- **Announce it.** An unannounced experiment that causes a real incident burns the trust the practice needs.
- **Prefer production**, carefully. Staging does not have production's traffic, data volume or dependency graph, which is where the interesting failures live. Reaching production is the goal, not the starting point.

## Game days

A game day is the human-scale version: a scheduled exercise where a team responds to an injected or simulated failure, practising the incident process from World 4 as well as the technical response. The value is in the second-order findings: the playbook that was out of date, the dashboard nobody could find, the escalation path that pointed at someone who left.

The **wheel of misfortune** variant is a tabletop exercise: a facilitator narrates a past incident, and the on-call engineer talks through what they would check and do. It costs an hour and no production risk, and is the cheapest way to fix operational underload.

## What to test first

Order the candidates by "how confident are we, and how bad would it be": loss of one AZ, a dependency returning errors, a dependency becoming slow (far more dangerous than down), a cache failing empty, a database failover, a certificate expiring, a quota being reached, the deployment pipeline being unavailable during an incident, and the restore path for your most important data.

Slow dependencies deserve special attention: World 5's cascade lesson is mostly about them, and a dependency that returns errors quickly is usually survivable while one that hangs is not.

> [aws]**On AWS.** AWS Fault Injection Service runs experiments as code: stop or terminate instances, inject CPU or memory pressure, add latency or packet loss, throttle API calls to a service, fail over an RDS or Aurora cluster, interrupt Spot instances, and (with the AZ availability-power-interruption action) simulate an AZ impairment. Every experiment template carries **stop conditions** bound to CloudWatch alarms, which is the mechanism that makes production experiments defensible. Combine with Resilience Hub to define resilience policies with RTO/RPO targets and assess whether an architecture meets them. Keep experiment templates in version control next to the service they test, and run them on a schedule so resilience does not decay silently.`,
      exercises: [
        { type: 'order', q: 'Put the chaos engineering experiment loop in order.', items: ['Define steady state as a measurable output (the SLIs)', 'Hypothesise that steady state continues during the injected condition', 'Inject a realistic fault with a bounded blast radius', 'Measure whether the hypothesis is disproved', 'Stop automatically if the blast radius exceeds the limit, then act on findings'], explain: 'Steady state, hypothesis, injection, measurement, with automated stop conditions throughout. Without a defined steady state there is nothing to disprove.' },
        { type: 'mcq', q: 'Why does the lesson call a slow dependency more dangerous than one that is down?', choices: ['Slow dependencies are harder to monitor', 'A fast failure frees the caller\'s resources; a hanging call ties up threads and connections until the caller collapses', 'Down dependencies trigger alarms', 'Slow dependencies cost more'], answer: 1, explain: 'This is the bimodal latency problem from World 5. Tight deadlines and fail-fast behaviour convert a dangerous failure mode into a survivable one.' },
        { type: 'mcq', q: 'What makes a production chaos experiment defensible rather than reckless?', choices: ['Running it at night when traffic is low', 'A bounded blast radius, automated stop conditions wired to alarms, the owning team present, and prior announcement', 'Getting a manager\'s verbal approval', 'Running it without telling anyone so the response is realistic'], answer: 1, explain: 'The safety envelope is what separates the discipline from an outage. Unannounced experiments destroy the trust the practice depends on.' },
        { type: 'mcq', q: 'What is the main value of a "wheel of misfortune" tabletop exercise?', choices: ['It finds new software bugs', 'It gives on-call engineers realistic practice and exposes stale playbooks and broken escalation paths at almost no risk', 'It replaces postmortems', 'It measures system capacity'], answer: 1, explain: 'It is the cheapest remedy for operational underload, and the second-order findings (stale docs, wrong contacts) are usually the valuable part.' },
        { type: 'mcq', q: 'Which AWS Fault Injection Service feature most directly enforces the blast-radius rule?', choices: ['Experiment templates', 'Stop conditions bound to CloudWatch alarms that abort the experiment automatically', 'IAM roles', 'Spot interruption actions'], answer: 1, explain: 'Automated abort on an alarm is what lets an experiment run against production traffic without betting the SLO on a human watching a graph.' }
      ]
    },

    {
      id: 'w7l4', title: 'Multi-region strategy, RTO and RPO', minutes: 11, source: 'Well-Architected reliability pillar; AWS disaster recovery whitepaper',
      summary: 'Four DR strategies, what they actually cost, and the dependencies people forget.',
      body: `## Two numbers first

- **RTO (Recovery Time Objective):** how long the service may be unavailable before the impact is unacceptable.
- **RPO (Recovery Point Objective):** how much recent data you may lose, expressed as time.

Both are business decisions with costs attached, exactly like an SLO. Stating them honestly is more than half the work: "RTO zero, RPO zero" is not a requirement, it is a refusal to choose.

## The four strategies

| Strategy | Typical RTO | Typical RPO | What runs in the second region |
|---|---|---|---|
| Backup and restore | Hours to a day | Hours | Nothing; backups are copied |
| Pilot light | Tens of minutes to hours | Minutes | Data replicated, core services off or minimal |
| Warm standby | Minutes | Seconds to minutes | A scaled-down but working copy serving nothing (or a trickle) |
| Multi-site active/active | Near zero | Near zero to seconds | Full capacity serving live traffic |

Cost rises with each row, and so does operational complexity. The key insight from the failure-mode literature: **the only failover you can trust is one you use routinely.** Active/active is expensive but continuously exercised; warm standby is cheaper but its promotion path is bimodal (see lesson 7.1) unless you fail over on a schedule.

## Data is the hard part

Compute is easy to duplicate; state is not.

- **Asynchronous replication** gives a non-zero RPO by definition. Know the replication lag and monitor it as an SLI, because RPO is only as good as the lag at the moment of failure.
- **Synchronous replication** across regions costs write latency on every request, all the time, to protect against a rare event. Usually the wrong trade for cross-region; often the right one within a region.
- **Multi-writer designs** (DynamoDB global tables) trade conflict resolution for availability: last-writer-wins is fine for some data and silently wrong for other data (counters, balances, inventory).
- **Failback** is the step people forget: after the primary region returns, how does data written in the secondary get reconciled? Design and test this, not just the failover.

## The dependencies people forget

- **DNS TTLs** that are too long to fail over quickly, and resolvers that ignore them anyway.
- **Certificates, secrets and KMS keys** that exist only in the primary region. A KMS key is regional; data encrypted with it cannot be read elsewhere without a multi-region key or a re-encrypt step.
- **The deployment pipeline** living in the failed region, so you cannot ship the fix.
- **Identity**: if your IdP, or the IAM path your automation depends on, is impaired.
- **Third parties** that are themselves single-region.
- **Quotas in the standby region** that were never raised because nothing ever ran there at full scale.
- **Observability**: dashboards and alarms scoped to the primary region, leaving you blind exactly when you need to see.

## Deciding

Work backwards from the error budget and the business impact, not from the architecture diagram. A service with a 99.9% SLO has 43 minutes of budget a month; a four-hour RTO means a single regional event consumes six months of budget. That arithmetic, not an opinion about resilience, is the argument for spending on warm standby.

> [aws]**On AWS.** Route 53 health checks with failover records, or Global Accelerator for faster, DNS-independent failover. Aurora Global Database gives cross-region replication with typical lag under a second and a managed promotion (RPO seconds, RTO minutes); DynamoDB global tables give active/active with last-writer-wins. S3 Cross-Region Replication with replication time control provides a measurable RPO for objects. AWS Backup copies vaults across regions and accounts. Use multi-region KMS keys for anything you must decrypt elsewhere. AWS Resilience Hub evaluates an architecture against stated RTO/RPO targets and flags the gaps. And practise: a scheduled regional failover exercise is the only evidence that the numbers in the table are real.`,
      exercises: [
        { type: 'mcq', q: 'What does RPO measure?', choices: ['How long recovery takes', 'How much recent data may be lost, expressed as a time window', 'How many replicas exist', 'The probability of a regional failure'], answer: 1, explain: 'RTO is time to recover; RPO is the acceptable amount of data loss measured in time. Asynchronous replication makes RPO equal to the replication lag at the moment of failure.' },
        { type: 'mcq', q: 'Which DR strategy keeps a scaled-down but fully functional copy of the workload running in the second region?', choices: ['Backup and restore', 'Pilot light', 'Warm standby', 'Multi-site active/active'], answer: 2, explain: 'Pilot light keeps data replicated with services off or minimal; warm standby runs a working, scaled-down copy that can be scaled up and cut over in minutes.' },
        { type: 'num', q: 'A service has a 99.9% availability SLO over a 30-day window. A regional event causes a full outage lasting the full 4-hour RTO. How many months of error budget does that single event consume? (Round to a whole number.)', answer: 6, tolerance: 0.5, unit: 'months', hint: 'Monthly budget is 43.2 minutes.', explain: '240 minutes ÷ 43.2 minutes ≈ 5.6, so about 6 months of budget in one event. That arithmetic is the business case for a shorter RTO.' },
        { type: 'multi', q: 'Which of these are commonly forgotten cross-region dependencies? Select all that apply.', choices: ['KMS keys that exist only in the primary region', 'The deployment pipeline running in the failed region', 'Service quotas never raised in the standby region', 'Dashboards and alarms scoped only to the primary region', 'The number of Availability Zones in the standby region'], answers: [0, 1, 2, 3], explain: 'Keys, pipelines, quotas and observability are the classic gaps found during a real failover. AZ count is a design input, not a forgotten dependency.' },
        { type: 'mcq', q: 'Why does the lesson argue that a warm standby\'s failover path is riskier than active/active, beyond capacity?', choices: ['Warm standby costs more', 'The promotion path is bimodal: it only runs during disasters, so it is the least-exercised code in the system', 'Warm standby cannot replicate data', 'Route 53 does not support it'], answer: 1, explain: 'Static stability\'s bimodal warning applies to DR directly. Either run active/active, or fail over on a schedule so the path is routine.' }
      ]
    },

    {
      id: 'w7l5', title: 'Measuring the practice: SLOs, DORA and reliability economics', minutes: 9, source: 'DORA / Accelerate; workbook ch.11; Well-Architected',
      summary: 'Connecting reliability to delivery performance, and arguing for reliability work in the language of the business.',
      body: `## Two families of metric

SRE supplies **reliability outcomes**: SLI attainment, error budget consumption, pages per shift, time to detect, time to restore, postmortem action-item closure. The DORA research programme supplies **delivery performance**:

- **Deployment frequency** — how often you ship to production.
- **Lead time for changes** — commit to running in production.
- **Change failure rate** — the fraction of deployments causing degraded service requiring remediation.
- **Failed deployment recovery time** — how long to restore service after a failed change.

The important finding, repeated across years of the research, is that these are **not in tension**. Teams that deploy more frequently, in smaller batches, with automated testing and progressive delivery, also have lower change failure rates and recover faster. Speed and stability rise together, and the practices that produce both are the ones in Worlds 3 and 4: small changes, staged rollout, fast rollback, good telemetry.

This is the empirical backing for the error budget argument. Slowing down is not the reliable choice; shipping small, reversible changes with good signals is.

## Using the numbers together

A useful quarterly picture per service:

| Question | Metric |
|---|---|
| Are users getting what we promised? | SLI attainment vs SLO, budget remaining |
| Are we spending the budget deliberately? | Budget consumed by incidents vs by launches |
| Is on-call sustainable? | Pages per shift, actionable ratio, incidents per shift |
| Are we learning? | Action-item closure rate, repeat-cause incidents |
| Can we change the system safely? | Deployment frequency, change failure rate, recovery time |

Report trends, not absolutes, and never rank teams against each other with them: a team with a hard problem will look worse than a team with an easy one, and the metrics will start being managed rather than measured.

## The economics argument

Reliability work competes with features for the same engineers. The argument that wins is arithmetic, not principle:

- Cost of the incident class: minutes of outage × revenue or cost per minute, plus the error budget consumed, plus the engineering hours spent responding.
- Cost of the fix: engineering time, plus any permanent infrastructure cost (the idle capacity of static stability, the second region).
- Probability and frequency, taken from your own incident history rather than from intuition.

Presented this way, "add a second region" and "fix the retry budget" can be compared honestly, and the cheap fixes usually win by a wide margin. Most of the highest-value reliability work in this track (retry budgets, load shedding, deadlines, canary gates, tested restores) costs engineering time and almost no recurring infrastructure.

## What good looks like after all seven worlds

A service with: an SLO derived from user need, alerting derived from the SLO, a signed error budget policy, a paved-road deployment with canary and one-click rollback, load shedding and retry discipline, a bounded blast radius, tested restores, a rehearsed incident process, blameless postmortems with closed action items, and a rotation that fires about twice a shift and leaves time to fix things.

None of that is exotic. It is the accumulation of the decisions in this track, each one cheap on its own.

> [aws]**On AWS.** The measurement stack: CloudWatch Application Signals for SLO attainment and burn rate; DevOps Guru for anomaly surfacing; deployment metrics from CodePipeline and CodeDeploy (or your CI) for DORA's four; Incident Manager or your ticketing system for incident counts and time to restore; Cost Explorer for the infrastructure side of the trade-off. Well-Architected Tool reviews on a schedule turn the reliability pillar into tracked findings with owners, which is the same shape as postmortem action items.`,
      exercises: [
        { type: 'multi', q: 'Which are the four DORA delivery performance metrics? Select all that apply.', choices: ['Deployment frequency', 'Lead time for changes', 'Change failure rate', 'Failed deployment recovery time', 'Error budget remaining'], answers: [0, 1, 2, 3], explain: 'Error budget is an SRE reliability metric rather than a DORA delivery metric, though the two families are designed to be read together.' },
        { type: 'mcq', q: 'What does the DORA research find about the relationship between delivery speed and stability?', choices: ['They trade off: faster delivery necessarily means lower stability', 'They rise together: teams shipping small changes frequently with automation also have lower change failure rates and recover faster', 'There is no measurable relationship', 'Stability improves only when deployment frequency falls'], answer: 1, explain: 'This is the empirical basis for the error budget argument: the answer to instability is smaller, safer, more frequent changes, not fewer of them.' },
        { type: 'mcq', q: 'Why does the lesson warn against ranking teams against each other using these metrics?', choices: ['The metrics are inaccurate', 'A team with a harder problem will look worse, and ranked metrics get managed rather than measured', 'Ranking is against DORA licensing', 'The metrics change too slowly'], answer: 1, explain: 'Comparative ranking creates an incentive to game the numbers, which destroys the signal. Report trends per service instead.' },
        { type: 'mcq', q: 'Which framing is most likely to win engineering time for reliability work?', choices: ['Reliability is a professional obligation', 'Cost of the incident class (outage minutes × cost per minute, budget consumed, response hours) compared against the cost of the fix, using your own incident history for frequency', 'Other companies do this', 'The SRE book recommends it'], answer: 1, explain: 'Arithmetic using the organisation\'s own numbers is the argument that survives a prioritisation meeting. It also correctly ranks the cheap fixes first.' }
      ]
    }
  ],

  boss: {
    id: 'w7boss', title: 'Region Down', tagline: 'Everything you learned, on the worst day of the year, with the clock running.',
    intro: `You are the incident commander for **Ledger**, a payments platform. Architecture: active in eu-west-1, warm standby in eu-central-1. Aurora Global Database (replication lag normally under 1 s), DynamoDB global tables for session state, S3 with cross-region replication, Route 53 failover records with a 60-second TTL.

Stated objectives: **RTO 15 minutes, RPO 5 seconds**. The failover has been tested once, nine months ago.

At 08:12 on a weekday, eu-west-1 begins showing elevated API error rates across several AWS services. The AWS Health Dashboard shows an investigation opened for one service in that region. Your error rate is 22% and climbing. Health starts at 100%; this is the final boss.`,
    steps: [
      { time: '08:14', text: `Pages are firing. The team channel has four hypotheses. Your monitoring dashboards are themselves hosted with resources scoped to eu-west-1, and two panels are not loading.

First move?`,
        choices: [
          { text: 'Declare the incident, take IC, assign Ops and Comms, open the incident doc, and immediately establish what you can still observe: use the standby region\'s dashboards and the AWS Health Dashboard to separate "our problem" from "provider event".', d: 15, fb: 'Command first, then establish observability. Knowing whether this is a provider event changes every subsequent decision, and you need a picture you can trust before choosing a mitigation.' },
          { text: 'Start the regional failover immediately; error rate is 22%.', d: -12, fb: 'Failover is a large, partly untested action with an RPO cost. Twenty-two percent is bad but you have not yet established whether it is a provider event, whether it is worsening, or whether a cheaper mitigation exists.' },
          { text: 'Debug the failing service in eu-west-1 to find the root cause.', d: -25, fb: 'Root-causing a provider impairment is not available to you, and you are the IC. Mitigate and coordinate.' }
        ] },
      { time: '08:21', text: `Confirmed: AWS has acknowledged a service impairment in eu-west-1 affecting the service your compute layer depends on. Your error rate is now 41%. Aurora replication lag to eu-central-1 reads 0.8 s. Comms asks what to tell customers; the CTO asks whether to fail over.`,
        choices: [
          { text: 'Decide on the arithmetic: at 41% errors the budget burn is extreme, the impairment is provider-side with no ETA, replication lag is within RPO, so fail over. Have Comms post a factual update with a next-update time while Ops executes the runbook.', d: 15, fb: 'The decision criteria were pre-agreed: provider event, no ETA, lag within RPO, burn far above what the budget can absorb. Deciding explicitly and communicating on a cadence is the IC\'s job.' },
          { text: 'Wait for AWS to provide an ETA before deciding.', d: -25, fb: 'Provider ETAs during an active investigation are rarely available and rarely accurate. You are burning a month of error budget every few minutes while waiting for someone else to decide for you.' },
          { text: 'Fail over, and post "we are experiencing issues with a third-party provider" to the status page.', d: -8, fb: 'The failover call is right, but the message deflects blame instead of telling customers what they need: what is broken, what you are doing, and when the next update comes.' }
        ] },
      { time: '08:26', text: `Ops begins the runbook. Step 3 fails: promoting the Aurora global cluster requires a KMS key that was created as a single-region key in eu-west-1, and the encrypted snapshots in eu-central-1 cannot be read. Someone suggests restoring from the nightly backup in the standby region instead, which is 9 hours old.`,
        choices: [
          { text: 'Check whether the Aurora global secondary is itself readable (global databases replicate to a cluster encrypted with a regional key in the target region) before reaching for a 9-hour-old backup; escalate to AWS Support in parallel. A 9-hour RPO against a 5-second objective is a last resort, not a next step.', d: 15, fb: 'Correct sequencing: verify the replicated path before abandoning it, escalate in parallel, and treat a 6,000× RPO miss as the last option. The KMS gap itself is a top postmortem finding.' },
          { text: 'Restore from the 9-hour-old backup immediately to get service back fast.', d: -30, fb: 'You would meet RTO by destroying RPO: nine hours of payments data gone, which for a ledger is worse than being down. Down is recoverable; silently wrong balances are not.' },
          { text: 'Halt the failover and wait for eu-west-1 to recover.', d: -15, fb: 'Abandoning the failover on the first obstacle leaves you fully down with no plan and no ETA.' }
        ] },
      { time: '08:34', text: `The global secondary is readable and promotes successfully; data loss is about 2 seconds. Route 53 failover records shift traffic. But eu-central-1 was sized as a warm standby at 30% of production capacity, and Auto Scaling is now trying to add capacity. Error rate in the standby is 18% and latency is climbing.`,
        choices: [
          { text: 'Shed load immediately while capacity grows: enable rate limiting at the edge, disable batch and non-critical workloads, and serve degraded (read-only or queued) responses for the least critical operations. Scaling is minutes away; shedding is seconds away.', d: 15, fb: 'World 5\'s lesson under real conditions. You cannot scale your way out of the next four minutes, and letting the standby cascade would turn a partial recovery into a total outage.' },
          { text: 'Wait for Auto Scaling to catch up; capacity is on the way.', d: -22, fb: 'Four minutes of 18% errors and rising, with retries amplifying. The standby follows eu-west-1 into a cascade and you have nowhere left to go.' },
          { text: 'Fail back to eu-west-1 since the standby cannot cope.', d: -30, fb: 'Failing back into an actively impaired region, after a promotion, with a now-diverged database. This is how a bad day becomes a data-integrity incident.' }
        ] },
      { time: '08:52', text: `Shedding worked; capacity caught up; error rate is 0.4% and falling. Total impact so far: 38 minutes of degradation, RTO missed by 23 minutes, RPO met at 2 seconds. Ops asks about the batch settlement job that was mid-run in eu-west-1 when the impairment began. Its status is unknown.`,
        choices: [
          { text: 'Do not restart it blind. Establish idempotency first: check the job\'s checkpoint or ledger entries to determine what completed, and only then reprocess the remaining range. Assign it to Planning to track as a divergence from normal operation.', d: 15, fb: 'A settlement job is the least idempotent thing you own. World 5\'s cron lesson: when in doubt about a non-idempotent job, reconcile before acting, and track the divergence so it is not forgotten at handoff.' },
          { text: 'Restart the job in eu-central-1 to catch up.', d: -28, fb: 'Double-settling payments. The financial and trust cost of that exceeds the entire outage.' },
          { text: 'Leave it until after the incident and deal with it tomorrow.', d: -12, fb: 'Untracked divergences are how incidents produce second incidents. Track it now, even if you act on it later.' }
        ] },
      { time: '12:00', text: `AWS reports eu-west-1 recovered. The CTO wants to fail back this afternoon "to get back to normal". Traffic is stable in eu-central-1, which is now scaled to full capacity.`,
        choices: [
          { text: 'Do not fail back under time pressure on the same day. Schedule it as a planned, rehearsed change once the data reconciliation is complete and eu-west-1 has been stable for an agreed period, using the same progressive approach.', d: 12, fb: 'Failback is a second failover with a diverged dataset, performed by an exhausted team. There is no operational reason it must happen today; "back to normal" is a feeling, not a requirement.' },
          { text: 'Fail back this afternoon while the team still has context.', d: -20, fb: 'A tired team, an untested reverse path, and unreconciled data. The failback becomes the second incident.' },
          { text: 'Stay in eu-central-1 permanently and make eu-west-1 the new standby.', d: 0, fb: 'Defensible in principle and worth discussing, but it is an architecture decision made mid-incident by an exhausted team. Decide it in the postmortem.' }
        ] },
      { time: 'Postmortem', text: `You are writing it up. Impact: 38 minutes degraded, 2 seconds of data loss, RTO missed. The room wants to focus on the KMS key that was created single-region eighteen months ago by someone who has since left.`,
        choices: [
          { text: 'Name the systemic causes: DR runbook untested for 9 months, standby sized at 30% with no load test, dashboards scoped to the primary region, no automated check that DR prerequisites (keys, quotas, pipeline) are valid, and no scheduled failover exercise. Action items with owners and dates, plus a standing game-day schedule.', d: 15, fb: 'Every one of those would have surfaced the KMS gap before the incident. The postmortem\'s job is to find the process that let a latent failure survive eighteen months, not the commit that created it.' },
          { text: 'Focus the postmortem on the KMS key configuration and how it was approved.', d: -25, fb: 'Blame directed at an absent engineer, and a single fix that leaves every other untested DR assumption in place. The next failover finds the next gap.' },
          { text: 'Conclude that the provider impairment was the root cause and the response worked as designed.', d: -20, fb: 'The response missed RTO by 150% because of your own untested assumptions. Attributing everything to the provider discards the entire learning opportunity.' }
        ] }
    ],
    win: `Ledger survived a regional impairment with 38 minutes of degradation and 2 seconds of data loss, and came out with a DR practice that is tested rather than assumed.

Every world showed up: incident command and blameless analysis (World 4), load shedding and non-idempotent job discipline (World 5), budget arithmetic driving the failover decision (World 1), honest status communication (World 6), and the static-stability and RTO/RPO reasoning of this world. The failure that nearly sank you was not the provider event; it was a latent assumption nobody had exercised in nine months.

**Takeaway:** disaster recovery is not an architecture. It is a rehearsal schedule.`,
    lose: `The regional event became a data-integrity incident, a cascade in the standby, or a team that learned nothing. Typical failure paths: failing over before establishing the picture, waiting on a provider ETA, restoring a 9-hour-old backup against a 5-second RPO, scaling instead of shedding, restarting a non-idempotent settlement job, failing back the same day, or ending with a postmortem aimed at an absent engineer.

Revisit lessons 7.1, 7.3 and 7.4, plus World 5 lesson 3, and retry.`
  }
});
