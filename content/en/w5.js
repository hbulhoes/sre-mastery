/* World 5 — Systems at scale */
window.SRE_WORLDS = window.SRE_WORLDS || [];
window.SRE_WORLDS.push({
  id: 'w5',
  title: 'Systems at Scale',
  subtitle: 'Load balancing, overload, cascading failures, consensus, pipelines, data integrity and capacity.',
  badge: 'Systems Whisperer',
  intro: `The longest world, covering the technical core of the SRE book's Part III: how traffic is distributed, how services survive more load than they can handle, why failures cascade and how to stop them, when you need distributed consensus, how to run cron and pipelines at scale, how to keep data intact, and how to plan capacity. Sources: SRE book chapters 18 through 26.

The boss is a retry storm: a cascading failure you must contain while the pressure to "just add capacity" builds.`,

  lessons: [
    {
      id: 'w5l1', title: 'Load balancing, from DNS to the backend task', minutes: 11, source: 'SRE book ch.19, 20',
      summary: 'Global and in-datacenter balancing, subsetting, weighted round robin, and lame ducks.',
      body: `## Balancing at multiple tiers

"Which backend should handle this request" is answered several times as a request travels, and each tier has different information and different goals.

[[diagram:lb-tiers]]

## Frontend (global) load balancing

- **DNS.** Simple but blunt: the resolver caches answers, clients ignore TTLs, and the balancer only sees the resolver's address, not the user's. Geo-aware DNS gets users to a nearby region; it cannot react quickly to a region failing.
- **Virtual IP with anycast or a load-balancer tier.** A single address advertised from many locations; the network routes to the nearest. Connection-level balancing (with consistent hashing so a backend change does not reset every connection) makes this robust.

Goal at this tier: pick the closest location with capacity. Health checks and capacity signals must feed back into it, or DNS will happily send users to a dead region.

## In-datacenter load balancing

Once inside a location, the client (or a proxy or mesh) chooses among backend tasks.

- **Health states.** A backend is healthy, **refusing** (lame duck: still connected, but asking clients to stop sending it work while it drains, so shutdowns and deploys are invisible), or unhealthy. Lame-duck state is what makes graceful restarts possible.
- **Subsetting.** A client should not connect to every backend: with thousands of clients and backends, that is millions of connections. Each client picks a subset. **Deterministic subsetting** (shuffle and partition by client index) spreads load evenly; naive random subsetting does not.
- **Policies.** Simple round robin ignores that requests and backends differ. **Least-loaded round robin** tracks outstanding requests per backend, but active-request count is a poor proxy for load when backends have different capacity or when some backends are failing fast (they look idle). **Weighted round robin** uses backend-reported utilisation (CPU, queue depth, custom) to weight the choice, and is the book's recommendation.

## The health check trap

A health check that only says "process is alive" will keep sending traffic to a backend that is deadlocked or out of memory. A health check that is too deep (checks the database) will mark every backend unhealthy when the database hiccups, removing all capacity at once. Shallow checks for liveness, deeper checks for readiness, and never let a shared dependency's failure remove every backend from rotation.

> [aws]**On AWS.** Frontend tier: Route 53 with latency-based or geolocation routing plus health checks, or AWS Global Accelerator (anycast IPs, fast failover, no DNS caching problems). Edge tier: Network Load Balancer (L4, flow-hash, static IPs) or Application Load Balancer (L7, round robin or least-outstanding-requests, weighted target groups, slow start for warming new targets, connection draining as the lame-duck equivalent). In-datacenter/client-side: App Mesh or a service mesh sidecar for subsetting, outlier detection and weighted routing; ECS service discovery via Cloud Map. Health checks: ALB target-group health checks should hit a readiness endpoint that reflects the task's ability to serve, but not fail on a shared dependency's blip.`,
      exercises: [
        { type: 'mcq', q: 'Why is DNS alone a weak mechanism for frontend load balancing?', choices: ['It is too expensive', 'Resolvers cache answers, clients ignore TTLs, and the balancer sees the resolver rather than the user, so it reacts slowly and imprecisely', 'DNS does not support multiple records', 'DNS only works inside a VPC'], answer: 1, explain: 'DNS gets users roughly to the right place; fast failover needs anycast or a load-balancer tier with health-aware routing.' },
        { type: 'mcq', q: 'What is a "lame duck" backend?', choices: ['A backend with high latency', 'A backend that is still connected but asks clients to stop sending it new work while it drains, enabling graceful shutdown', 'A backend that failed its health check', 'A backend in a different region'], answer: 1, explain: 'Lame-duck state (ALB connection draining is the analogue) makes deploys and restarts invisible to users.' },
        { type: 'mcq', q: 'Why does the book recommend weighted round robin using backend-reported utilisation over least-loaded (active-request) round robin?', choices: ['It is simpler to implement', 'Active-request counts misrepresent load: backends have different capacity, and a backend failing fast looks idle and attracts more traffic', 'Weighted round robin needs no health checks', 'Least-loaded is deprecated'], answer: 1, explain: 'Utilisation-weighted balancing reflects the backend\'s actual capacity and state; request counts do not.' },
        { type: 'mcq', q: 'An ALB health check endpoint queries the primary database. During a 30-second database failover, what happens?', choices: ['Nothing; the ALB retries', 'Every target fails the check at once and the ALB has no healthy targets, turning a database blip into a full outage', 'Only the slowest target is removed', 'The ALB switches to round robin'], answer: 1, explain: 'A shared dependency in the health check removes all capacity simultaneously. Keep readiness checks local to the task.' }
      ]
    },

    {
      id: 'w5l2', title: 'Handling overload', minutes: 11, source: 'SRE book ch.21',
      summary: 'Per-customer quotas, client-side throttling, criticality, utilisation signals and retry discipline.',
      body: `## The goal

Avoiding overload entirely is impossible; a service must instead degrade gracefully and keep serving the requests that matter when demand exceeds capacity. The book's core observations: model capacity in a meaningful unit (CPU-seconds or "requests of typical cost", not raw QPS, because requests differ), give every layer a way to say no cheaply, and make clients behave.

## Per-customer limits

Each customer (or calling service) gets a quota; when the whole service is overloaded, customers over quota are throttled first. This keeps one misbehaving client from taking down everyone. Quotas are in the capacity unit, not raw requests.

## Client-side throttling

A client that keeps hammering an overloaded backend wastes both sides' resources. **Adaptive throttling**: each client tracks requests sent and requests accepted over a window, and locally rejects new requests with probability

max(0, (requests − K × accepts) ÷ (requests + 1))

With K = 2, a client keeps sending twice as many requests as are being accepted, probing for recovery without piling on. Rejected-locally requests cost the backend nothing.

## Criticality

Attach a criticality to each request and propagate it downstream: CRITICAL_PLUS (user-visible, no degradation acceptable), CRITICAL (default for user-facing), SHEDDABLE_PLUS (partial unavailability tolerable: batch), SHEDDABLE (retry later is fine). Quotas and load shedding operate per criticality, so overload sheds batch work before it sheds checkout.

## Utilisation signals

The backend decides it is overloaded using a signal that reflects its real constraint: CPU utilisation, memory pressure, thread-pool or queue occupancy, or an "executor load average". The signal should be quick to react and stable enough not to flap.

## Handling overload errors

When a backend rejects a request:
- If the whole datacenter is overloaded, the client should not retry there; go to another location.
- If only some tasks are overloaded, an immediate retry to another task is fine, subject to limits.

## Retry discipline

Retries are how a small overload becomes a large one. The book's rules:
1. **Per-request retry budget**: at most, say, three attempts.
2. **Per-client retry budget**: retries may not exceed about 10% of requests; beyond that, fail fast.
3. **Retry only at one layer**: if every layer retries three times, a single request becomes 27 at the bottom. Propagate a "do not retry, already overloaded" signal upward.
4. **Exponential backoff with jitter**, always.

## Load from connections

Keeping many idle connections has a cost; bursts of connection establishment (a client fleet restarting) can overload a backend before any request is served. Batch proxies and connection limits address this.

> [aws]**On AWS.** API Gateway usage plans implement per-customer quotas and throttling. Application-level shedding needs code: read a utilisation signal (ECS CPU, an in-process queue) and return 503 or 429 cheaply, before doing work. SQS-based designs naturally absorb bursts, and Lambda reserved/provisioned concurrency caps consumption of a shared downstream. For retries, AWS SDKs implement exponential backoff with jitter and a **retry quota** (the adaptive retry mode) which is the per-client retry budget in practice; do not wrap SDK calls in another retry loop. Propagate criticality as a header and honour it at the ALB (path-based routing to separate target groups for batch vs interactive) or in the application.

## Recognising overload in the wild

Latency rising with traffic, then errors; CPU pinned; queue depth growing faster than it drains; retry ratio climbing. The cure at the moment is shedding, not scaling: scaling takes minutes, shedding takes milliseconds.`,
      exercises: [
        { type: 'num', q: 'Using adaptive throttling with K = 2, a client has sent 900 requests in the window and 300 were accepted. What is the probability (as a percentage, whole number) that the next request is rejected locally?', answer: 33, tolerance: 1, unit: '%', hint: 'max(0, (requests − K×accepts) ÷ (requests + 1))', explain: '(900 − 600) ÷ 901 = 0.333 → 33%.' },
        { type: 'mcq', q: 'Why does the book insist capacity be modelled in CPU-seconds or a "typical request" unit rather than raw QPS?', choices: ['QPS is hard to measure', 'Requests differ in cost; a quota in QPS lets one client consume far more capacity than another with the same number of requests', 'CloudWatch does not report QPS', 'Because of billing'], answer: 1, explain: 'Quotas and shedding must operate on the actual constrained resource, not the count of requests.' },
        { type: 'mcq', q: 'A request passes through four layers, each of which retries up to 3 times on failure. In the worst case, how many attempts does the bottom layer see for one user request?', choices: ['3', '4', '12', '81'], answer: 3, explain: '3⁴ = 81. Retry at one layer only, and propagate an "overloaded, do not retry" signal upward.' },
        { type: 'mcq', q: 'During overload, which requests should be shed first?', choices: ['The most recent ones', 'Requests marked SHEDDABLE (batch, retry-later), before anything user-facing', 'Requests from the largest customer', 'Random requests'], answer: 1, explain: 'Criticality propagated with the request lets shedding preserve the work that matters.' },
        { type: 'mcq', q: 'On AWS, what does the SDK\'s adaptive retry mode provide that maps to the book\'s retry discipline?', choices: ['Infinite retries', 'Exponential backoff with jitter plus a client-side retry quota, so retries cannot exceed a fraction of requests', 'Retries at every layer', 'Retries only for GET requests'], answer: 1, explain: 'The retry quota is the per-client retry budget. Wrapping SDK calls in another retry loop breaks it.' }
      ]
    },

    {
      id: 'w5l3', title: 'Addressing cascading failures', minutes: 12, source: 'SRE book ch.22',
      summary: 'How one overloaded replica takes down a fleet, and every place you can break the loop.',
      body: `## The shape of a cascade

A cascading failure is a failure that grows over time as a result of positive feedback. One replica is overloaded and dies; its load shifts to the others; they are now closer to their limit; clients retry; the next one dies. It is the failure mode that turns a small capacity shortfall into a total outage.

[[diagram:cascade]]

## Causes

- **Server overload**: the most common trigger. Two datacenters at 60% each; one fails; the other now takes 120%.
- **Resource exhaustion**: CPU (slower requests, longer queues, more in-flight, more memory), memory (dying tasks, cache eviction, GC storms), threads (deadlock, starvation), file descriptors, dependencies' resources.
- **Service unavailability**: crashes reduce capacity, which increases load per survivor, which increases crashes.

## Preventing server overload

The book's list, in rough priority:
1. **Load test** to find the real breaking point, and measure what happens past it (does the service degrade gracefully or fall over).
2. **Serve degraded results**: partial data, cached data, smaller responses. A search that returns the first page from a cache beats a 500.
3. **Load shedding**: reject cheaply when the queue is too long (a bounded queue with a short length is the simplest shedder). Prefer to reject the newest or the least critical work.
4. **Instrument** to know when you are overloaded (lesson 5.2's utilisation signal).
5. **Reduce retry amplification** (retry budgets, retry at one layer).
6. **Deadlines and deadline propagation**: every request carries a deadline; a server does no work on a request whose deadline has passed; downstream calls inherit the remaining time. Without this, a server does expensive work whose result nobody will read.
7. **Bimodal latency is dangerous**: a request that is either fast or very slow (waiting on a dead backend) consumes threads unpredictably. Fail fast on unreachable backends.

## Slow start and cold caches

A restarted fleet with empty caches has far less capacity than a warm one. Bringing all of it back into rotation at once re-triggers the overload. Fix with slow start (ramp traffic per new task), cache warming, and keeping enough headroom that a cold fleet can serve.

## Queue management

Queues absorb bursts but add latency and delay the signal that you are overloaded. Keep queues short (the book suggests thread-pool size or smaller), and use techniques like CoDel or LIFO under overload so that the requests you do serve are fresh rather than already-timed-out.

## Immediate steps to address cascades

When it is happening: **increase resources** if that is fast (it usually is not); **stop health-check failures** from removing capacity (health checks that fail under load remove the servers you need most); **restart servers** only if they are in a bad state (deadlock, leaked memory), otherwise you make it worse; **drop traffic** at the edge (rate-limit by client or by region) to let the fleet recover; **enter degraded mode**; **eliminate batch load**; **eliminate bad traffic** (a single abusive query pattern).

## Capacity planning and cascades

Provision for N+2 at the datacenter level, and test that a datacenter can be taken out without pushing the rest past their breaking point. The relationship is not linear: a service that handles 100% at 60% CPU will not necessarily handle 150% at 90%.

> [aws]**On AWS.** Load shedding lives in your code or at the ALB (return 503 from a lightweight middleware when in-flight requests exceed a bound). Deadlines: propagate a timeout header and use short SDK timeouts (the defaults are often far too long for a request-path call). Slow start: ALB target-group <<slow_start>> setting ramps traffic to new targets. Cold caches: ElastiCache with warm-up jobs; ECS <<minimumHealthyPercent>> and deployment circuit breaker to avoid replacing the whole fleet at once. Health checks: keep them cheap so they pass under load. Static stability (World 7) says pre-provision for AZ loss instead of relying on Auto Scaling to react during it. Emergency levers: WAF rate-based rules by IP or key, API Gateway throttling, and reducing the desired count of batch workers.

## The mental model

Every arrow in the cascade diagram is a place to intervene. The best interventions (shedding, deadlines, retry budgets, headroom) are built before the incident. The worst (restarting everything, raising health-check sensitivity) make the loop tighter.`,
      exercises: [
        { type: 'mcq', q: 'Two regions each run at 60% capacity. One fails and all traffic shifts to the other. Why is this the classic cascade trigger?', choices: ['Because 60% is a magic number', 'The survivor receives 120% of its capacity; without shedding, it degrades, clients retry, and it collapses too', 'Because DNS takes too long', 'Because both regions share a database'], answer: 1, explain: 'N+1 at 60% is not enough headroom for a full failover. Load shedding or more headroom prevents the survivor from collapsing.' },
        { type: 'mcq', q: 'What does deadline propagation prevent?', choices: ['Clock skew', 'Servers doing expensive work on requests whose caller has already given up, which wastes capacity during overload', 'Retries', 'DNS timeouts'], answer: 1, explain: 'A request carries its remaining time budget downstream; anything past deadline is dropped instead of processed.' },
        { type: 'multi', q: 'Which actions are appropriate during an active cascading failure? Select all that apply.', choices: ['Drop or rate-limit traffic at the edge so the fleet can recover', 'Make health checks more sensitive so bad servers are removed faster', 'Eliminate batch and low-criticality load', 'Restart every server to clear state', 'Enter a degraded mode serving cached or partial results'], answers: [0, 2, 4], explain: 'Shed, degrade, cut batch load. Sensitive health checks remove capacity under load; mass restarts create a cold-cache fleet that cannot serve.' },
        { type: 'mcq', q: 'Why does the book warn about bimodal latency (requests that are either fast or very slow)?', choices: ['It confuses dashboards', 'Slow requests waiting on a dead backend tie up threads unpredictably, so the service runs out of capacity while looking lightly loaded', 'Because averages become meaningless', 'It triggers autoscaling'], answer: 1, explain: 'Fail fast on unreachable backends; tie latency to a tight deadline so threads are freed.' },
        { type: 'mcq', q: 'Which ALB feature directly addresses the cold-start problem of a new target being sent full traffic before its caches are warm?', choices: ['Connection draining', 'Slow start mode on the target group', 'Sticky sessions', 'Cross-zone load balancing'], answer: 1, explain: 'Slow start ramps a new target\'s share of requests over a configured period.' }
      ]
    },

    {
      id: 'w5l4', title: 'Managing critical state: distributed consensus', minutes: 11, source: 'SRE book ch.23',
      summary: 'When you need consensus, how Paxos-family systems work, and how to deploy them without fooling yourself.',
      body: `## The problem

Any time several processes must agree on something (who is the leader, what the configuration is, whether a lock is held, what order operations happened in) in the presence of failures and network partitions, you need distributed consensus. Ad hoc approaches (heartbeats and timeouts, "the one with the lowest IP wins") produce **split brain**: two nodes both believe they are the leader, and both write.

The book's framing: the CAP theorem says under partition you choose consistency or availability; for critical state, consensus algorithms give you consistency with as much availability as the failure pattern allows.

## What consensus gives you

Paxos, Raft, Zab and their relatives provide a replicated log or state machine: a majority of replicas agree on each value in order, and a value once agreed is never lost or contradicted. Key properties:

- **Majority quorum.** With 2f + 1 replicas you tolerate f failures. Three replicas tolerate one; five tolerate two. Even numbers add cost, not tolerance.
- **Leader-based operation.** Most implementations elect a leader that proposes values; followers accept. Leader failure triggers an election, during which writes pause (seconds, typically).
- **Reads need care.** A follower may lag; a "read from the leader" is only safe if the leader confirms it still holds leadership (a lease or a quorum round).

[[diagram:quorum]]

## Patterns built on consensus

- **Reliable replicated state machines** (the general form).
- **Reliable replicated datastores and configuration stores** (Chubby, ZooKeeper, etcd).
- **Leader election** as a service: the elected leader does the work; consensus only decides who.
- **Distributed coordination and locking**: barriers, locks, group membership.
- **Reliable distributed queues and messaging**: the queue's metadata under consensus; payloads elsewhere.

## Performance realities

Consensus costs round trips. Multi-Paxos or Raft with a stable leader needs one round trip per commit within a region; cross-region deployments pay WAN latency per write. Techniques: batch proposals; pipeline them; use reads-from-lease; place replicas so that a quorum is close to the leader. Disk fsync on the critical path matters: consensus is often bound by log-write latency.

## Deploying consensus systems

The book's practical rules:
- **Number and placement of replicas.** Enough to tolerate the failure domains you care about: three across three zones tolerates one zone; five across three regions tolerates a region and a node. Placing a quorum in one failure domain defeats the purpose.
- **Capacity and load balancing.** Leaders take more load; a leader in a small zone is a bottleneck.
- **Monitoring.** Number of members running, persistently lagging replicas, leader changes per hour, proposal latency and throughput, disk-write latency. Leader flapping is a loud early warning.
- **Never a quorum of two.** Two nodes cannot tolerate any failure without losing majority; a "2-node HA pair" is a consistency hazard, not an HA design.

> [aws]**On AWS.** You will mostly consume consensus rather than run it: DynamoDB, Aurora's storage layer, and the control planes of most services use Paxos-family protocols internally. When you run your own, Amazon MSK (Kafka with KRaft or ZooKeeper), self-managed etcd for Kubernetes, or Amazon Keyspaces are the common cases. Placement rules translate to AZs: three brokers in three AZs; five etcd members if you need to survive an AZ loss plus a node failure. Leader election for your own services: use DynamoDB conditional writes with a lease TTL (a simple, correct lock when used with fencing tokens), rather than home-grown heartbeats. Monitor leader changes and replication lag as first-class alerts.

## The takeaway

If two nodes ever disagree about who is in charge, you have already lost. Use a real consensus implementation, deploy an odd number across failure domains, and monitor the things that precede split brain.`,
      exercises: [
        { type: 'num', q: 'A consensus group must tolerate two simultaneous replica failures while still committing writes. What is the minimum number of replicas?', answer: 5, tolerance: 0, unit: 'replicas', explain: '2f + 1 with f = 2 gives 5.' },
        { type: 'mcq', q: 'Why is a two-node "HA pair" using heartbeats a consistency hazard?', choices: ['Two nodes are too slow', 'A partition lets each node believe the other is dead; both become leader and both write (split brain)', 'Heartbeats use too much bandwidth', 'Two nodes cannot replicate'], answer: 1, explain: 'No majority exists with two nodes. Consensus needs 2f + 1 replicas, and a failure of the network looks exactly like a failure of the peer.' },
        { type: 'mcq', q: 'Three replicas of a configuration store are placed in the same availability zone. What failure-domain property is lost?', choices: ['Read performance', 'Tolerance to loss of that zone: a quorum in one domain means the domain\'s failure removes the majority', 'Nothing; three is enough', 'Write throughput'], answer: 1, explain: 'Place replicas so that any single failure domain you care about cannot contain a majority.' },
        { type: 'mcq', q: 'Which metric is the most useful early warning that a consensus cluster is unhealthy?', choices: ['Total disk usage', 'Leader changes per hour (leader flapping)', 'Number of client connections', 'Network bytes out'], answer: 1, explain: 'Frequent elections mean replicas are timing out on each other: partitions, overload or slow disks. Split brain follows if the implementation is flawed.' },
        { type: 'mcq', q: 'On AWS, which is a sound way for a fleet of workers to elect one leader without running your own consensus cluster?', choices: ['Lowest instance ID wins', 'A DynamoDB conditional write acquiring a lease with a TTL, plus a fencing token', 'Each worker pings the others and the fastest wins', 'Store the leader name in an S3 object'], answer: 1, explain: 'Conditional writes are linearisable; a lease with TTL handles leader death; the fencing token prevents a stale leader from acting after losing the lease.' }
      ]
    },

    {
      id: 'w5l5', title: 'Distributed cron and data-processing pipelines', minutes: 9, source: 'SRE book ch.24, 25',
      summary: 'Scheduling at scale with correctness guarantees, and why periodic pipelines break.',
      body: `## Cron at scale

A single-machine cron is trivial. A datacenter-wide cron that must survive machine failure raises questions the book works through:

- **Idempotency of jobs.** Some jobs are safe to run twice (a report); some are not (send emails, charge a card). Cron's failure-mode decision differs: for idempotent jobs, run again if unsure; for non-idempotent jobs, skip if unsure. The book's stance: skipping a launch is often better than double-launching, so the system must let the job owner choose.
- **State.** The scheduler must remember which launches happened. Store this small state with distributed consensus (Paxos in Google's case) so a scheduler failover does not forget or repeat launches. Keep the state tiny: launch records, not job output.
- **Leader election.** One scheduler leader launches jobs; followers track state and take over when the leader dies. The handover window is where double-launch risk lives; the new leader must reconcile with the datacenter scheduler ("is this job already running?").
- **Thundering herd.** Thousands of jobs at 00:00 overload shared systems. Google added random jitter to the schedule syntax, and jitter is now standard advice.
- **Large-scale deployment.** Cron jobs are scheduled onto the cluster like any other work, subject to quota and priority, and may be killed. Make jobs restartable.

## Data-processing pipelines

The classic design is a periodic pipeline: an ETL job runs hourly or daily, reads inputs, produces outputs. It works until:

- **Data grows past the period.** A job that takes 25 hours daily never catches up.
- **Uneven work distribution** ("hanging shards"): a few large keys take hours while everything else finishes in minutes.
- **Thundering herds** of workers hammering a storage system at the period boundary.
- **Moiré effects**: several pipelines with different periods occasionally aligning and overloading a shared resource.
- **Monitoring blind spots**: a periodic job has no signal between runs; you discover a problem one period late.

The book's response (Workflow) is a **continuous, leader-follower pipeline with checkpointing**: a master holds a small amount of state (which shards are done) under consensus; workers lease shards, checkpoint progress, and the system tolerates worker failure without restarting from scratch. Properties to demand from any pipeline system: at-least-once processing with idempotent or deduplicated outputs, per-stage progress visible as metrics, backpressure, and the ability to reprocess a range of inputs.

## SLOs for pipelines

Freshness (age of the newest processed input), correctness (validated outputs), and coverage (fraction of input processed). Alert on freshness burn rate the same way you alert on availability.

> [aws]**On AWS.** Scheduling: EventBridge Scheduler (with flexible time windows for jitter) triggering Lambda, ECS tasks or Step Functions; Step Functions provides the state machine with retries, idempotency tokens and the "is it already running" check via execution names. Periodic-to-continuous: replace hourly batch with streaming (Kinesis Data Streams or MSK consumers, Kinesis Data Analytics/Flink) or with SQS-driven workers that checkpoint. AWS Glue and EMR handle large batch with retries and bookmarks (checkpointing). Hanging shards: monitor per-partition lag (Kinesis <<IteratorAgeMilliseconds>>, MSK consumer lag). Freshness SLI: emit "latest processed event timestamp" as a metric and alarm on its age.`,
      exercises: [
        { type: 'mcq', q: 'A distributed cron scheduler fails over mid-launch and is unsure whether the "send monthly invoices" job started. What should it do?', choices: ['Launch it again to be safe', 'Skip or reconcile first, because the job is not idempotent and a double launch is worse than a delayed one', 'Launch it on both old and new leaders', 'Delete the job'], answer: 1, explain: 'Non-idempotent jobs must not be double-launched; the scheduler reconciles with the cluster state before acting.' },
        { type: 'mcq', q: 'Why do periodic pipelines suffer from "hanging shards"?', choices: ['Network partitions', 'Uneven key distribution: a few large keys take far longer, so the whole period waits on them', 'Cron runs too often', 'Workers are underpowered'], answer: 1, explain: 'Skewed data makes a handful of shards dominate runtime. Continuous pipelines with leased shards and checkpointing handle it better.' },
        { type: 'multi', q: 'Which SLIs does the lesson recommend for a data pipeline? Select all that apply.', choices: ['Freshness', 'Correctness', 'Coverage', 'CPU utilisation of workers', 'Number of workers'], answers: [0, 1, 2], explain: 'Freshness, correctness and coverage describe what consumers of the data experience. Worker metrics are causes.' },
        { type: 'mcq', q: 'What is the purpose of adding jitter to scheduled job start times?', choices: ['To make logs harder to read', 'To avoid thundering herds when many jobs would otherwise start at the same instant', 'To satisfy time-zone rules', 'To reduce cost'], answer: 1, explain: 'Spreading starts over a window protects shared resources at period boundaries.' }
      ]
    },

    {
      id: 'w5l6', title: 'Data integrity', minutes: 11, source: 'SRE book ch.26',
      summary: 'Backups are not the goal; restores are. Defense in depth against the 24 failure combinations.',
      body: `## Redefining the goal

Users do not want backups; they want their data back. The book's framing: **data integrity is the measure of the accessibility and accuracy of the data over its lifetime**, and the mean time to recovery is what users experience. A backup that has never been restored is a hypothesis.

## The 24 combinations

Three factors multiply into 24 kinds of data-loss scenario:
- **Root cause**: user action, operator error, application bug, infrastructure defect, hardware failure, site disaster.
- **Scope**: wide (everything) or narrow (one user, one row).
- **Rate**: big bang (one event) or slow and steady (creeping corruption noticed months later).

Slow, narrow corruption from an application bug is the hardest: replication faithfully copies the corruption everywhere, and by the time it is noticed the good copies have aged out. That is why "we replicate to three AZs" is not a data-integrity strategy.

## Defense in depth

[[diagram:data-defense]]

- **Soft deletion.** Deleted data is marked and hidden, then purged after a grace period. Handles the most common case (user or operator mistake) at almost no cost. Google uses two stages: soft deletion visible to the user (trash) and lazy deletion invisible to the user but recoverable by support.
- **Backups and archives.** Backups exist to be restored; archives exist for compliance. Design backups for the restore: how fast, how granular (one user's data without restoring everything), how far back. Diversify: different storage system, different location, different failure modes; ideally an offline or immutable copy so an attacker or a bug that deletes the primary cannot delete the backup.
- **Early detection.** Out-of-band validators that check invariants across data (row counts, referential checks, checksums, business rules). The sooner corruption is detected, the more likely a clean copy still exists.

## The restore is the product

Test restores continuously and automatically. Measure restore time and verify restored data. Google's rule: a backup pipeline that is not exercised by regular restores is assumed broken. Plan for restoring at scale: restoring one user is a different problem from restoring everyone, and the time to restore petabytes is dominated by bandwidth, not by the backup format.

## Case study: Gmail, 2011

A software bug deleted a fraction of users' mailboxes and the deletion replicated. Recovery relied on tape backups, restored in parallel over days, with the team prioritising and staging restores. Lessons: layered defenses worked; recovery took longer than anyone expected; the ability to restore was the outcome of years of testing it.

## Principles the book leaves you with

- Users' expectations of integrity are absolute; recovery must be reliable, not just possible.
- Apply defense in depth: soft delete, backups, validation.
- Test recovery regularly; measure it as an SLO.
- Assume any single system can fail completely and take its replicas with it.

> [aws]**On AWS.** Soft delete: S3 versioning with lifecycle rules; DynamoDB with a tombstone attribute and TTL; application-level trash. Backups: AWS Backup with vault lock (immutable, compliance mode), cross-region and cross-account copies so an attacker with production credentials cannot destroy them; RDS/Aurora point-in-time recovery and snapshots; DynamoDB PITR and on-demand backups; S3 Object Lock. Restore testing: AWS Backup restore testing plans run scheduled restores and validate them; do the same for Aurora clones. Early detection: scheduled validators (Lambda or Glue jobs checking invariants) with alarms; S3 checksums; Macie for unexpected data patterns. Measure and alarm on "age of last successful tested restore" as a freshness SLI.`,
      exercises: [
        { type: 'mcq', q: 'Why is replication to multiple availability zones not a data-integrity strategy on its own?', choices: ['It is too expensive', 'Replication faithfully copies corruption and deletions to every replica; it protects against hardware loss, not against bugs or mistakes', 'Availability zones share hardware', 'Replication is asynchronous'], answer: 1, explain: 'Replication is for availability. Integrity requires soft delete, restorable backups and validation.' },
        { type: 'mcq', q: 'Which data-loss scenario does the book identify as hardest to recover from?', choices: ['Big-bang, wide-scope hardware failure', 'Slow, narrow corruption from an application bug, noticed months later', 'User deletes a file yesterday', 'Site disaster'], answer: 1, explain: 'By the time slow corruption is noticed, backups within the retention window may all contain it. Early detection is the defense.' },
        { type: 'multi', q: 'Which properties make a backup useful against a malicious actor holding production credentials? Select all that apply.', choices: ['Stored in a different account', 'Immutable (vault lock or object lock)', 'Stored on the same volume as the primary', 'Restorable and regularly tested', 'Deletable by the same role that writes production data'], answers: [0, 1, 3], explain: 'Separate account, immutability and tested restores. Same-volume or same-role backups fall with the primary.' },
        { type: 'mcq', q: 'What does the book say about a backup pipeline whose restores are never exercised?', choices: ['It is acceptable if backups complete successfully', 'It should be assumed broken', 'It only needs an annual test', 'It is fine for non-critical data'], answer: 1, explain: 'Restores are the product. Untested restore paths fail when needed, as many organisations have learned.' },
        { type: 'mcq', q: 'Which AWS feature gives an automated, scheduled proof that backups can actually be restored?', choices: ['AWS Backup restore testing plans', 'S3 versioning', 'CloudTrail', 'EBS snapshots'], answer: 0, explain: 'Restore testing plans perform scheduled restores and validation, turning "we have backups" into "we have verified restores".' }
      ]
    },

    {
      id: 'w5l7', title: 'Capacity planning and software engineering in SRE', minutes: 9, source: 'SRE book ch.18, workbook ch.11',
      summary: 'From demand forecasts to intent-based planning, and why SREs must ship software.',
      body: `## Traditional capacity planning

Collect demand forecasts (organic growth plus launches), turn them into resource requirements per location, order or reserve, and allocate. The book's critique: it is brittle (a plan is out of date the moment a launch slips), labour-intensive (spreadsheets, meetings), and it encodes decisions as raw resource numbers ("50 more servers in EU") that lose the reasoning behind them.

## Intent-based capacity planning

Google's Auxon system moves the planning up a level: teams state **intent** ("serve 10k QPS with N+2 redundancy at under 100 ms in Europe and Asia"), along with dependencies and constraints; a solver produces the allocation. When a forecast or a constraint changes, re-run the solver. The ladder from resources to intent:

1. "I want 50 cores in cluster X" (a resource)
2. "I want 50 cores in any cluster in region Y" (a location preference)
3. "I want to serve demand D with N+2 redundancy" (the actual requirement)
4. "I want to run this service at 5 nines" (the intent; the solver derives the rest)

Most teams can climb to level 3; that is enough to make planning both faster and more honest.

## What to plan for

- Organic growth (trend), inorganic growth (launches, marketing), and the redundancy policy (N+1 per zone, N+2 per region: the cascade lesson).
- Efficiency: capacity per unit of resource is a reliability lever (a 20% efficiency gain is 20% more headroom for free).
- Lead time: ordering hardware takes months; on cloud, quota and reserved commitments have their own lead times.

## Software engineering in SRE

Chapter 18's other message: SREs must build software, and Auxon is the example. Reasons: SREs see cross-cutting problems nobody else sees; building tools converts operational knowledge into leverage; and engineering work is what keeps the 50% cap meaningful. Practices for SRE software projects: treat internal users as customers, ship a minimal version early, get product-management input, and staff the project so it does not die when the on-call load spikes.

## Workbook: managing load and capacity on cloud

Autoscaling is a capacity-planning tool with its own failure modes: it scales on lagging signals, it needs headroom to cover the scaling delay, it can amplify a cascade (scale-in during a partial outage), and it depends on the provider's control plane being available. Plan a floor of pre-provisioned capacity for the failures you must survive, and let autoscaling handle the growth above that.

> [aws]**On AWS.** Forecasting: CloudWatch anomaly detection and metric forecasting; Compute Optimizer for right-sizing; Cost Explorer and Savings Plans/Reserved Instances for the commitment side of the plan. Redundancy policy: N+1 across at least three AZs with the floor of capacity set so that losing an AZ leaves the rest under their load-tested limit. Quotas are the cloud version of lead time: request Service Quotas increases ahead of launches, and monitor usage against quota with the Service Quotas CloudWatch metrics. Autoscaling: target tracking on a meaningful utilisation metric, scale-out aggressively, scale-in slowly, and disable scale-in during incidents. Warm pools cover the EC2 launch delay. Note the control-plane dependency: an Auto Scaling action needs the EC2 API to be healthy, which is the static-stability argument in World 7.`,
      exercises: [
        { type: 'mcq', q: 'What is the central idea of intent-based capacity planning?', choices: ['Order hardware earlier', 'Teams state requirements (demand, redundancy, latency, location constraints) and a solver derives the resource allocation, so plans update when inputs change', 'Every team gets the same capacity', 'Use spreadsheets with better formulas'], answer: 1, explain: 'Encoding the "why" (intent and constraints) instead of the "what" (raw resource counts) makes plans reproducible and adaptable.' },
        { type: 'mcq', q: 'Why should a fleet keep a floor of pre-provisioned capacity rather than relying entirely on autoscaling for AZ failure?', choices: ['Autoscaling is expensive', 'Scaling reacts to lagging signals, takes minutes, and depends on the provider control plane, which may be impaired during the same event', 'Autoscaling only works in one AZ', 'Pre-provisioned capacity is faster to bill'], answer: 1, explain: 'Static stability: survive the failure with what is already running, and let autoscaling handle growth, not disaster recovery.' },
        { type: 'mcq', q: 'Which statement reflects the book\'s argument for SREs doing software engineering?', choices: ['SREs should replace developers', 'SREs see cross-cutting operational problems and converting that knowledge into tools produces leverage the organisation cannot get otherwise', 'Software is more fun than operations', 'It reduces the need for monitoring'], answer: 1, explain: 'Auxon is the example: an SRE-built tool that changed how the whole company planned capacity.' },
        { type: 'mcq', q: 'On AWS, what is the closest analogue to hardware lead time in capacity planning?', choices: ['AMI build time', 'Service quotas and reserved-capacity commitments that must be arranged ahead of demand', 'CloudFormation stack creation', 'DNS TTL'], answer: 1, explain: 'A launch that hits a quota ceiling is an outage that capacity planning should have prevented.' }
      ]
    }
  ],

  boss: {
    id: 'w5boss', title: 'Retry Storm', tagline: 'One slow dependency. Ten thousand impatient clients. Contain the cascade.',
    intro: `You are on-call for **Catalog**, a read-heavy product API (ALB → ECS, 60 tasks across 3 AZs → ElastiCache → Aurora). Mobile clients call it directly; the checkout and search services call it too. SLO: 99.9% success within 300 ms.

At 18:40, one AZ's ElastiCache node begins failing over. Catalog tasks in that AZ start returning slowly. The mobile app retries failed calls up to 5 times with no backoff. Error rate is 4% and climbing; CPU on all tasks is at 95%. Health starts at 100%.`,
    steps: [
      { time: '18:42', text: `Dashboards: in-flight requests per task at 8× normal; p99 latency 6 s; retries from the mobile app account for 70% of incoming traffic; Aurora connections at 90% of max. Two tasks have just been killed by the ECS health check and replaced with cold ones. First move?`,
        choices: [
          { text: 'Shed load at the edge: enable a WAF rate-based rule (or API throttling) that caps per-client request rate, so retry traffic is rejected cheaply before it reaches the tasks. Announce it.', d: 15, fb: 'Shedding takes seconds and removes the amplification. Scaling would take minutes and add cold tasks to a fleet that is drowning in retries.' },
          { text: 'Double the ECS desired count.', d: -15, fb: 'New tasks arrive cold in minutes, immediately receive full traffic (no slow start), and Aurora connections are already at 90%. You added capacity to the wrong bottleneck.' },
          { text: 'Restart all tasks to clear the backlog.', d: -30, fb: 'You just replaced the entire fleet with cold caches while retry traffic is at 70%. This is how a partial outage becomes total.' }
        ] },
      { time: '18:48', text: `Rate limiting is in place; incoming traffic dropped 45%. Latency is improving in two AZs but the AZ with the failing cache node is still bad, and the ECS health check keeps killing tasks there (the check queries the cache).`,
        choices: [
          { text: 'Stop the health-check-driven capacity loss: relax the check (or temporarily switch it to a liveness-only endpoint) so tasks that are slow but working are not replaced, and drain the affected AZ at the ALB.', d: 15, fb: 'Health checks that fail under load remove the servers you need most. Keeping degraded-but-serving tasks while draining the bad AZ preserves capacity.' },
          { text: 'Make the health check stricter so bad tasks are replaced faster.', d: -25, fb: 'Faster replacement of slow tasks means faster loss of capacity and more cold starts. You tightened the cascade loop.' },
          { text: 'Ignore it; ECS will stabilise on its own.', d: -10, fb: 'It will not while the cache node is failing; each replacement task is cold and fails the check again.' }
        ] },
      { time: '18:55', text: `The affected AZ is drained; the cache failover completes. The mobile team asks whether they should push a hotfix to the app that removes retries entirely.`,
        choices: [
          { text: 'No: keep retries but fix them: exponential backoff with jitter, a retry budget (retries capped at ~10% of requests), no retry on 429/503 responses that carry a "do not retry" signal, and a tight deadline. Ship it via staged rollout.', d: 12, fb: 'Retries are useful when disciplined. Removing them makes every transient failure user-visible; making them budgeted and backed-off removes the amplification.' },
          { text: 'Yes, remove retries entirely.', d: -8, fb: 'Now every transient blip fails the user. The problem was undisciplined retries, not retries.' },
          { text: 'Keep them as-is; the cache was the real problem.', d: -20, fb: 'The cache failover was the trigger. Five immediate retries per client turned a one-node blip into a fleet-wide overload. It will happen again.' }
        ] },
      { time: '19:05', text: `Service is recovering; you start returning the drained AZ to service. Aurora connections are still at 80% because each task holds a large pool. Ops asks whether to bring the AZ back all at once.`,
        choices: [
          { text: 'Return it progressively with ALB slow start enabled so the cold tasks warm up, and watch Aurora connections and p99 at each step.', d: 12, fb: 'Cold caches and connection pools are capacity you do not have yet. Ramp, observe, ramp.' },
          { text: 'Bring it all back now; the cache is healthy.', d: -15, fb: 'Twenty cold tasks at full share hit Aurora with new connections and empty caches. Enjoy round two.' },
          { text: 'Leave the AZ drained permanently and run on two.', d: -12, fb: 'Two AZs at 60% each is the textbook cascade setup for the next AZ event.' }
        ] },
      { time: '19:30', text: `Fully recovered. In the debrief, a director asks for the single change that "prevents this class of incident". The team debates.`,
        choices: [
          { text: 'There is no single change; propose the layered set: retry budgets in clients, load shedding in the service based on in-flight requests, deadline propagation, health checks decoupled from shared dependencies, slow start on target groups, and a load test that exercises a cache-node failure.', d: 15, fb: 'Every arrow in the cascade loop is a defense; one intervention is one point of failure. The load test proves the set works before the next AZ event.' },
          { text: 'Triple the fleet size so overload cannot happen.', d: -15, fb: 'Headroom helps, but retries at 5× per client can overwhelm any fixed capacity, and the cost is permanent. Shedding and retry budgets are cheaper and more robust.' },
          { text: 'Move to a single AZ so cross-AZ failover complexity disappears.', d: -30, fb: 'You have eliminated partial outages by guaranteeing total ones.' }
        ] },
      { time: 'Next week', text: `The load test is built: it kills one cache node under production-shaped traffic in staging. First run: with shedding and retry budgets, error rate peaks at 0.8% for 90 seconds, then recovers. The product owner asks whether 0.8% is acceptable or whether more work is needed before calling it done.`,
        choices: [
          { text: 'Compute it against the budget: 90 s at 0.8% is roughly 0.03% of a 30-day budget at 99.9%. Acceptable; document the result as the service\'s tested failure envelope and put the test in the regular game-day schedule.', d: 12, fb: 'Decisions come from the budget arithmetic, not from a feeling about the number. A repeatable test with a known envelope is the durable output.' },
          { text: 'Not acceptable; keep engineering until the error rate is zero.', d: -10, fb: 'Zero errors during a node failure is a 100% target with its cost curve. The budget says 0.8% for 90 seconds is noise.' },
          { text: 'Acceptable; no need to keep running the test.', d: -8, fb: 'Untested resilience decays. The game-day schedule is what keeps the envelope true next year.' }
        ] }
    ],
    win: `A cache-node failover became a 15-minute partial degradation instead of a total outage. The moves that mattered: shedding before scaling, stopping health checks from eating capacity, disciplining retries rather than removing them, returning capacity progressively, and building the layered defenses plus a test that proves them.

**Takeaway:** in a cascade, the fastest lever is always "do less work", never "add more machines".`,
    lose: `The cascade completed. Typical failure paths: scaling into a retry storm, restarting the fleet cold, tightening health checks, bringing a drained AZ back all at once, or believing a single change ends the class of failure.

Revisit lessons 5.2 and 5.3 and retry.`
  }
});
