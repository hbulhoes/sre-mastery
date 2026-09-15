/* World 1 — Foundations */
window.SRE_WORLDS = window.SRE_WORLDS || [];
window.SRE_WORLDS.push({
  id: 'w1',
  title: 'Foundations',
  subtitle: 'What SRE is, how risk is priced, and the three numbers everything else hangs on.',
  badge: 'Budget Keeper',
  intro: `This world covers Part I and the start of Part II of the Google SRE book: the definition of the discipline, the economics of reliability, and the SLI → SLO → error budget chain. Everything later in the track (alerting, on-call, release policy, capacity) is derived from these ideas, so the checkpoints here are deliberately strict.

> **How to read this world.** Each lesson ends with an *On AWS* section that maps the idea onto services you already know. The boss at the end drops you into a product-launch negotiation where the error budget is the only argument you have.`,

  lessons: [
    {
      id: 'w1l1', title: 'What Site Reliability Engineering is', minutes: 9, source: 'SRE book ch.1',
      summary: 'The definition, the 50% rule, and how SRE relates to DevOps.',
      body: `## The one-sentence definition

Site Reliability Engineering is **what happens when you ask a software engineer to design an operations team**. Google's Ben Treynor Sloss coined the term in 2003. The premise: the people running production should have the skills and the mandate to replace manual work with software.

The historical alternative is the sysadmin model. Developers write features, operators run them, and the two groups have opposite incentives: dev wants change, ops wants stability. Costs grow linearly with traffic because every new service needs more human hands.

[[diagram:sre-vs-ops]]

## The rules that make it work

- **The 50% cap.** SREs spend at most half their time on operational work: tickets, on-call, manual actions. The rest is engineering that reduces future operational work. If ops load exceeds 50% for a team, the overflow is redirected back to the product developers, or the developers join the on-call rotation.
- **Hiring.** SREs are software engineers, or people with equivalent skills plus systems expertise (networking, Unix internals). They are expected to get bored doing things by hand and automate them.
- **Shared ownership.** SRE and product development share a service's SLO and an error budget (next lessons). This turns "reliability vs velocity" from a political fight into arithmetic.
- **Blamelessness and data.** Decisions about launches, rollbacks and priorities are made with measured reliability, not opinion.

## Tenets of SRE

The book lists what an SRE team is responsible for: availability, latency, performance, efficiency, change management, monitoring, emergency response and capacity planning. Every one of these is later given a concrete practice in this track.

## SRE and DevOps

DevOps is a set of principles: reduce organisational silos, accept failure as normal, implement gradual change, leverage tooling and automation, measure everything. SRE is a concrete implementation of those principles with opinionated specifics (SLOs, error budgets, the 50% cap, blameless postmortems). The workbook's phrasing: *class SRE implements interface DevOps*.

> [aws]**On AWS.** The equivalent of "asking a software engineer to run operations" is treating your account as code: infrastructure in CloudFormation, CDK or Terraform, changes via pipelines, operational actions as SSM Automation documents or Lambda functions rather than console clicks. A team that resolves incidents by clicking in the console is doing ops; a team that turns each incident into a runbook document, then into an EventBridge-triggered automation, is doing SRE.

## Anti-patterns to recognise

- Renaming the ops team "SRE" without changing hiring, the 50% cap or shared SLOs.
- SREs as gatekeepers who approve every deploy by hand (that is toil, not reliability).
- Measuring SRE success by the number of tickets closed.`,
      exercises: [
        { type: 'mcq', q: 'An SRE team reports that operational work consumed 70% of its time last quarter. According to the SRE model, what should happen?', choices: ['The team hires more SREs to absorb the load', 'The overflow work is redirected to the product development team, which may also join on-call', 'The team stops doing engineering projects until the backlog clears', 'The SLO is lowered so fewer pages fire'], answer: 1, explain: 'The 50% cap is enforced by pushing excess operational load back to the developers who own the service. Hiring more SREs just scales the ops team linearly, which is the model SRE exists to replace.' },
        { type: 'multi', q: 'Which of the following are defining characteristics of SRE as opposed to a traditional operations team? Select all that apply.', choices: ['Operational work is capped at 50% of time', 'Engineers are hired for software skills and expected to automate', 'Reliability targets are shared with product development via SLOs and error budgets', 'Every production change requires manual SRE approval', 'Success is measured by the number of tickets resolved'], answers: [0, 1, 2], explain: 'Manual approval gates and ticket counts are ops-team symptoms. SRE caps ops work, automates, and shares numeric targets with developers.' },
        { type: 'mcq', q: 'How does the SRE workbook describe the relationship between SRE and DevOps?', choices: ['They are competing methodologies; a company picks one', 'DevOps is the Google-internal name for SRE', 'SRE is a concrete implementation of the DevOps principles, with specific opinions', 'DevOps applies to developers, SRE applies to operators'], answer: 2, explain: '"class SRE implements interface DevOps": DevOps states the principles, SRE supplies specific practices such as SLOs, error budgets and blameless postmortems.' },
        { type: 'tf', q: 'True or false: in the SRE model, the cost of running a service is expected to grow roughly linearly with its traffic.', answer: 1, explain: 'False. That linear growth is the sysadmin model. SRE aims for sublinear growth by automating away the work that would otherwise need more hands.' }
      ]
    },

    {
      id: 'w1l2', title: 'Embracing risk and the cost of nines', minutes: 10, source: 'SRE book ch.3',
      summary: 'Reliability is a product decision with a price; how to measure and pick a target.',
      body: `## 100% is the wrong target

Beyond a certain point, users cannot tell the difference between your service and the network, phone or Wi-Fi in front of it. Each extra nine costs roughly an order of magnitude more in engineering, redundancy and slowed velocity, and returns almost nothing users notice. The SRE stance: **reliability is a feature with a cost, and the product decides how much to buy.**

Risk is managed, not eliminated. Unreliability is spent deliberately, on launches, experiments, and simpler architectures, rather than leaked accidentally.

## Two ways to measure availability

**Time-based:** availability = uptime ÷ (uptime + downtime). Simple, but a globally distributed service is never fully "down", so the concept blurs.

**Aggregate (request-based):** availability = successful requests ÷ total requests. This works for any system that processes discrete units of work and lets you compute it per region, per customer, or per API method.

[[diagram:nines]]

| Target | Downtime per year | Per 30 days | Per day |
|---|---|---|---|
| 99% | 3.65 days | 7.2 h | 14.4 min |
| 99.9% | 8.76 h | 43.2 min | 1.44 min |
| 99.95% | 4.38 h | 21.6 min | 43 s |
| 99.99% | 52.6 min | 4.32 min | 8.6 s |
| 99.999% | 5.26 min | 26 s | 0.86 s |

The formula for the 30-day numbers: 30 × 24 × 60 × (1 − target). Memorise 99.9% ≈ 43 minutes a month; derive the rest by factors of ten.

## Picking a target

Questions from the book for consumer services:
- What level of availability do users expect? (Are they paying? Is there an alternative?)
- Does this service tie directly to revenue?
- Is it free or paid? Are there competitors offering more?
- What happens to user experience if it fails: broken UI, or lost money?

For infrastructure services the trick is to **offer multiple tiers** with different reliability and cost, instead of trying to satisfy the strictest consumer for everyone. The book's example is a storage layer offering low-latency and high-throughput tiers.

## Risk tolerance is asymmetric

Some failures are far worse than the availability number suggests: a 0.01% failure that loses user data, or that hits every request from one large customer, is not "four nines fine". Note the failure *shape* as well as its rate. Later lessons introduce per-customer SLIs and data-integrity practices for exactly this reason.

> [aws]**On AWS.** AWS publishes per-service SLAs (for example 99.99% for a multi-AZ Amazon RDS deployment, 99.99% for Amazon EC2 per region, 99.999999999% durability for S3 objects). Your service's achievable availability is bounded by the product of its serial dependencies: a single-AZ EC2 instance behind a single-AZ database cannot credibly promise 99.99%. Use these numbers as inputs to your target, and remember an AWS SLA credit does not make your users whole.

## Cost, illustrated

Moving a service from 99.9% to 99.99% typically means: multi-AZ everywhere, automated failover that is regularly exercised, canary deploys with automatic rollback, no human in the response loop for common failures, and a large cut in release frequency risk. If the product cannot articulate the revenue that protects, the extra nine is a bad purchase.`,
      exercises: [
        { type: 'num', q: 'A service has a 99.9% availability SLO measured over a 30-day window. How many minutes of complete downtime can it afford in that window?', answer: 43.2, tolerance: 0.6, unit: 'minutes', hint: '30 days × 24 h × 60 min × (1 − 0.999)', explain: '43,200 minutes in 30 days × 0.001 = 43.2 minutes.' },
        { type: 'num', q: 'Over the last 30 days a service handled 120,000,000 requests, of which 84,000 failed. What is its request-based availability, as a percentage? (Give at least two decimals.)', answer: 99.93, tolerance: 0.006, unit: '%', explain: '(120,000,000 − 84,000) ÷ 120,000,000 = 0.9993 = 99.93%.' },
        { type: 'mcq', q: 'A product manager asks for 99.999% availability for a free, ad-supported news site. What is the strongest SRE objection?', choices: ['It is impossible to achieve on AWS', 'Users cannot distinguish it from lower targets because their own network is less reliable, so the cost buys nothing', 'Availability cannot be measured beyond four nines', 'Free services should not have SLOs at all'], answer: 1, explain: 'The marginal nine costs roughly 10× and is invisible behind the user\'s own connectivity. Every product deserves an SLO, but the target should match what users can perceive and what the business earns.' },
        { type: 'mcq', q: 'Why does the SRE book prefer request-based (aggregate) availability over time-based availability for large services?', choices: ['It always produces a higher number', 'Globally distributed services are rarely fully down, so "uptime" is ambiguous, while success ÷ total works for any discrete unit of work', 'Time-based availability is impossible to compute from monitoring data', 'Aggregate availability ignores partial outages'], answer: 1, explain: 'Request-based availability is meaningful for partial outages and can be sliced per region, customer or method. It does not ignore partial outages; it captures them precisely.' },
        { type: 'mcq', q: 'A storage platform serves both a latency-sensitive checkout service and a bulk analytics job. Which approach does the book recommend?', choices: ['Run the platform at the strictest requirement for everyone', 'Offer tiers with explicitly different reliability and cost, and let consumers choose', 'Tell the analytics job to build its own storage', 'Average the two requirements'], answer: 1, explain: 'Infrastructure services should expose reliability tiers, so cost tracks the actual need instead of the most demanding client.' }
      ]
    },

    {
      id: 'w1l3', title: 'SLIs and SLOs', minutes: 12, source: 'SRE book ch.4, workbook ch.2',
      summary: 'Choosing what to measure, where to measure it, and how to state a target that means something.',
      body: `## Three terms, three jobs

- **SLI (Service Level Indicator):** a carefully defined quantitative measure of some aspect of the service. Almost always a ratio: **good events ÷ valid events**, expressed as a percentage.
- **SLO (Service Level Objective):** a target value or range for an SLI over a window. "99.9% of valid requests succeed, measured over a rolling 30 days."
- **SLA (Service Level Agreement):** a contract with consequences (credits, penalties) if an SLO is missed. SREs are rarely involved in writing SLAs, but they must keep the internal SLO stricter than any external SLA.

[[diagram:sli-slo-sla]]

## Choosing SLIs

The workbook's rule: pick the few indicators that best describe the **user's experience**, not everything you can measure. Typical menu by service type:

| Service type | SLIs that matter |
|---|---|
| Request/response (API, web) | availability (success ratio), latency (fraction under a threshold), quality (degraded responses) |
| Data processing / pipeline | freshness (age of latest output), correctness, coverage, throughput |
| Storage | durability, availability, latency |

Notes on getting this right:
- Define **valid** events. Exclude what the service cannot be blamed for (malformed requests, 4xx caused by clients) or your SLO will measure your users.
- **Latency as a ratio, not an average.** "Fraction of requests served under 300 ms" is an SLI; "average latency" is not, because averages hide the tail that users actually feel. Be careful with percentiles too: track p50 and p99 separately, because a slow tail can hide behind a fast median.
- **Fast errors are still errors.** A 500 returned in 2 ms makes latency look great. Compute latency only over successful responses, or count errors as slow.
- Aggregate at the right place. Client-side or load-balancer measurement captures what users see; server-side measurement misses requests that never arrived.

## Where to measure

Options, from closest-to-user to cheapest: synthetic probes and real-user monitoring → load balancer logs and metrics → application metrics → server logs. The book's guidance: prefer the measurement point that reflects user experience, and accept the trade-off in cost and complexity.

## Writing an SLO

A complete SLO statement has: the SLI, the threshold that makes an event "good", the target percentage, and the window.

> 99.95% of valid HTTP requests to the checkout API return a non-5xx response within 400 ms, measured at the load balancer, over a rolling 28-day window.

Window choice matters:

[[diagram:slo-window]]

Rolling windows keep the recent past continuously in view; calendar windows match quarterly planning but "reset" abruptly. Google generally uses rolling windows for alerting and calendar-aligned reporting for business review. Four-week windows avoid the month-length problem.

## Rules of thumb from the book

- Don't pick a target based on current performance; pick it from user needs, then treat the gap as work.
- Keep it simple: few SLIs, few SLOs.
- Avoid absolutes ("always available", "infinitely scalable").
- Have as few SLOs as possible, and defend the ones you have. If nobody would act when an SLO is breached, it is not an SLO.
- Publish a **buffer**: run internal targets tighter than external promises.
- Don't over-achieve. Users will depend on the reliability you actually deliver, so if you consistently beat the SLO, you have lost the freedom to take risk. Google's Chubby lock service famously injects planned outages to keep dependents honest.

> [aws]**On AWS.** Load-balancer metrics are the natural SLI source for request-driven services: ALB gives <<RequestCount>>, <<HTTPCode_Target_5XX_Count>> and <<TargetResponseTime>> (with percentile statistics such as p99). A success-ratio SLI is a CloudWatch metric math expression such as <<1 − (5XX ÷ RequestCount)>>. For latency SLIs, avoid <<Average>>; use percentile statistics or, better, define a CloudWatch Contributor Insights rule or a log-derived metric that counts requests over the threshold. Application Signals can define SLOs directly on top of these metrics. For pipelines, freshness is the age of the last successful run, easily emitted as a custom metric from the job.

## Common mistakes

- An SLI computed from server-side averages that looks fine while the tail is on fire.
- An SLO on every metric on the dashboard; nobody can defend forty objectives.
- An SLO on an internal component (CPU, queue depth) rather than user-facing behaviour.
- Treating a met SLO as "nothing to do": the freedom to take risk is the whole point.`,
      exercises: [
        { type: 'mcq', q: 'Which of these is a correctly formed SLI according to the workbook definition (good events ÷ valid events)?', choices: ['Average response time of the API over the last hour', 'Proportion of valid requests served successfully in under 250 ms', 'CPU utilisation of the fleet stays below 70%', 'Number of 5xx errors per minute'], answer: 1, explain: 'An SLI is a ratio of good events to valid events. Averages hide the tail; CPU is an internal cause, not user experience; a raw error count has no denominator.' },
        { type: 'mcq', q: 'A team measures latency SLIs across all responses, including errors. Their backend starts throwing fast 500s. What happens to the SLI?', choices: ['The latency SLI worsens, correctly reflecting the outage', 'The latency SLI improves, masking the outage', 'Nothing changes; errors are excluded automatically', 'The SLI becomes undefined'], answer: 1, explain: 'Fast errors pull the latency distribution down. Compute latency over successful responses only, or count errors as slow, so an outage never makes latency look better.' },
        { type: 'multi', q: 'Which of these belong in a complete SLO statement? Select all that apply.', choices: ['The SLI being measured', 'The threshold that defines a "good" event', 'The target percentage', 'The measurement window', 'The name of the on-call engineer'], answers: [0, 1, 2, 3], explain: 'SLI + good/bad threshold + target + window. Ownership is important but belongs in the error-budget policy, not the SLO statement.' },
        { type: 'mcq', q: 'Why does the SRE book warn against consistently over-achieving an SLO?', choices: ['It wastes CloudWatch budget', 'Users come to depend on the delivered reliability, so you lose the freedom to take risks that the SLO was supposed to buy', 'Over-achieving makes the SLA legally binding', 'It causes alert fatigue'], answer: 1, explain: 'Delivered reliability becomes the de facto expectation. Google\'s Chubby injects planned outages to stop dependents from assuming more than the SLO.' },
        { type: 'mcq', q: 'For a request-driven web service on AWS, which measurement point best reflects what users experience while staying cheap to operate?', choices: ['CPU metrics from the EC2 instances', 'Application Load Balancer request, error and percentile latency metrics', 'Log lines written by the application after it finishes handling a request', 'RDS connection counts'], answer: 1, explain: 'The load balancer sees every request that reached your edge, including those the application never handled. Server-side logs and resource metrics miss those and measure causes, not symptoms.' }
      ]
    },

    {
      id: 'w1l4', title: 'Error budgets and the error budget policy', minutes: 10, source: 'SRE book ch.3, workbook ch.2',
      summary: 'Turning the gap between the SLO and perfection into a shared currency.',
      body: `## The budget

If the SLO is 99.9%, then 0.1% of events are allowed to fail. That 0.1% is the **error budget**. It is not a failure allowance to be hidden; it is a resource to be spent on things that create value and risk: launches, experiments, infrastructure migrations, planned maintenance.

Error budget remaining = allowed bad events − actual bad events (or the time equivalent). Over a 30-day window at 99.9%, the budget is about 43 minutes of full outage, or the equivalent in partial degradation.

[[diagram:error-budget]]

## Why it resolves the dev/ops conflict

Developers want to ship; operators want stability. With an error budget:

- While budget remains, developers can launch as fast as they like. SRE does not veto releases.
- When the budget is exhausted, launches stop (except fixes that improve reliability) until the SLO is back within target.
- Both sides now argue about the same number, and both are incentivised to keep it healthy: developers because they want to keep launching, SRE because it is the job.

The book's phrase: the error budget lets the team **manage risk instead of arguing about it**.

## The error budget policy

The workbook insists the policy is written down, agreed by product, development and SRE leadership, and applied consistently. A typical policy:

1. While budget remains, releases proceed normally.
2. If the budget for the window is exhausted, feature releases freeze until the SLI has been within SLO for a defined period (say, 7 days).
3. If a single incident consumes more than X% of budget, a postmortem is mandatory and its action items are prioritised over features.
4. Repeated exhaustion escalates: the development team joins the on-call rotation, or engineers are reassigned to reliability work.
5. The policy states who can grant exceptions and how they are recorded.

Without a policy, the budget is just a chart. With one, it is an executive-backed decision procedure.

## Burn rate

Burn rate is the speed at which budget is consumed relative to the SLO's own pace. Burn rate 1 means "exactly exhaust the budget at the end of the window". Burn rate 10 means "exhaust it in a tenth of the window": for a 30-day window, in 3 days.

For an availability SLO with allowed error fraction *e*, and an observed error fraction *x* over some period, burn rate = *x* ÷ *e*. Example: SLO 99.9% (e = 0.001), current error rate 1.44% → burn rate 14.4. This number becomes the basis of the alerting in World 2.

## What to spend the budget on

- Risky launches and A/B experiments.
- Planned maintenance (rebooting, migrations) that is cheaper without full redundancy.
- Relaxing gates: deploying more frequently, with less bake time.
- Intentional outages to test dependent systems' resilience.

> [aws]**On AWS.** CloudWatch Application Signals SLOs expose remaining error budget and burn-rate metrics that you can alarm on and chart. If you build your own, store the SLO target and window as parameters, compute the bad-event count with metric math over the window, and publish <<error_budget_remaining>> as a custom metric. Wire the policy into the pipeline: a CodePipeline manual-approval stage (or a Lambda gate) that reads the budget metric and blocks feature deployments when it is negative is the most literal implementation of "launch freeze".

## Pitfalls

- Budget without a policy: nobody stops shipping.
- Policy without executive backing: the first big launch overrides it, and the budget becomes fiction.
- Counting dependency outages against the wrong team; decide up front whether the budget includes them (it usually should, from the user's point of view).
- Measuring the budget over a calendar month and forgetting that a bad first week leaves three weeks of freeze.`,
      exercises: [
        { type: 'num', q: 'A service has a 99.95% availability SLO over 30 days. A single incident caused a full outage for 9 minutes. What percentage of the 30-day error budget did that incident consume? (Round to a whole number.)', answer: 42, tolerance: 1.5, unit: '%', hint: 'Budget = 43,200 min × 0.0005', explain: 'Budget = 43,200 × 0.0005 = 21.6 minutes. 9 ÷ 21.6 = 41.7% ≈ 42%.' },
        { type: 'num', q: 'SLO is 99.9% availability. Over the last hour the service returned errors for 0.6% of requests. What is the burn rate?', answer: 6, tolerance: 0.1, unit: '×', explain: 'Burn rate = observed error fraction ÷ allowed error fraction = 0.006 ÷ 0.001 = 6.' },
        { type: 'mcq', q: 'The error budget is exhausted with 12 days left in the window. The product team wants to ship a new feature that does not touch reliability. What does a functioning error budget policy say?', choices: ['Ship it, since the feature does not affect reliability', 'Feature launches freeze until the SLI is back within SLO for the agreed period; only reliability improvements ship', 'Ship it but double the on-call staffing', 'Raise the SLO target to make the budget positive again'], answer: 1, explain: 'The policy exists precisely for this conversation. Any feature change carries risk; the freeze holds until the service recovers. Changing the SLO to dodge the freeze destroys the policy\'s credibility.' },
        { type: 'multi', q: 'Which of these are legitimate ways to "spend" error budget? Select all that apply.', choices: ['Running a risky migration with reduced redundancy', 'Launching an experimental feature to 10% of users', 'Skipping the postmortem for a small incident', 'Deploying more frequently with shorter canary bake times', 'Reporting a lower error count than measured'], answers: [0, 1, 3], explain: 'Budget buys risk-taking that creates value. Skipping learning or falsifying data are not spending; they are cheating.' },
        { type: 'mcq', q: 'What is the essential ingredient that turns an error budget from a chart into a decision mechanism?', choices: ['A dashboard visible to everyone', 'A written policy agreed by product, development and SRE leadership, with consequences and exception rules', 'An automated alert on the budget', 'A monthly reliability meeting'], answer: 1, explain: 'Dashboards and alerts inform; the policy decides. Without leadership agreement, the first important launch overrides the freeze and the budget loses meaning.' }
      ]
    },

    {
      id: 'w1l5', title: 'Toil', minutes: 8, source: 'SRE book ch.5, workbook ch.6',
      summary: 'What toil is, why it is corrosive, and how to measure and eliminate it.',
      body: `## Definition

Toil is not simply "work I don't enjoy". The book gives it a precise shape. Toil is operational work tied to running a production service that is:

- **Manual** – a human runs it, even if it is just running a script by hand.
- **Repetitive** – done over and over; not a novel problem.
- **Automatable** – a machine could do it as well as a human, if you built the machine.
- **Tactical** – interrupt-driven and reactive rather than strategy-driven.
- **Devoid of enduring value** – the service is in the same state after the work as before.
- **O(n) with service growth** – scales linearly with users, traffic or size.

Work that meets several of these is toil. Overhead (meetings, reviews, HR paperwork) is not toil; it is not tied to running the service. Engineering work that permanently improves the service is the opposite of toil.

## Why it matters

Google targets **less than 50%** of each SRE's time on toil. The reasons are practical: toil crowds out the engineering that reduces future toil, it does not scale, it burns people out, it slows the team's career growth, and it sets a bad precedent (other teams will hand you their toil too).

A little toil is fine; some people even find predictable, low-risk tasks calming. The problem is when it dominates.

## Where toil comes from

Typical sources: manual releases, hand-applied config changes, quota and capacity requests, restarting things, rotating credentials by hand, responding to alerts that need no judgement, onboarding new tenants by copying a template, "please run this query for me".

## Measuring it

The workbook recommends tracking toil explicitly: survey the team, tag tickets, or sample time. Rank sources by hours per month × frequency, and pick the largest that is cheapest to automate. Ask for each: could the system detect the condition itself? Could it fix it itself? Could the requester self-serve?

## Eliminating it

Tactics in rough order of leverage:
1. **Remove the need** – change the design so the task never occurs (e.g. autoscaling instead of manual capacity adds).
2. **Self-service** – hand the task to the requester with guardrails (a form, an API, a pull request).
3. **Automate fully** – the system detects and acts (auto-remediation).
4. **Automate partially** – a one-command tool a human triggers; still toil, but faster and safer.
5. **Batch and schedule** – if it must be manual, do it in bulk at planned times, not on interrupt.

> [aws]**On AWS.** The canonical AWS toil-killers: Auto Scaling groups instead of manual instance adds; Systems Manager Automation runbooks triggered by CloudWatch alarms or EventBridge rules for auto-remediation; Secrets Manager rotation instead of hand-rotated credentials; Service Catalog or account-vending automation for self-service provisioning; AWS Config rules with remediation actions for drift. A useful test: if an on-call engineer has run the same SSM document by hand three times, the fourth run should be an EventBridge target.

## The trap

Automating toil is engineering work, so it competes with feature requests and rarely feels urgent. That is why the 50% cap is a rule and not a suggestion: it forces the trade-off to be made explicitly, with data, instead of by whoever shouts loudest.`,
      exercises: [
        { type: 'multi', q: 'Which of the following activities count as toil under the SRE book\'s definition? Select all that apply.', choices: ['Manually adding EC2 capacity every Monday ahead of the weekly traffic peak', 'Designing an autoscaling policy so capacity adds happen automatically', 'Restarting a stuck worker process in response to the same alert, twice a week', 'Attending the quarterly planning meeting', 'Approving each new tenant by hand-editing a config file and deploying it'], answers: [0, 2, 4], explain: 'Manual, repetitive, automatable, no enduring value: capacity adds, alert-driven restarts and hand-onboarding are toil. Designing autoscaling is engineering; planning meetings are overhead.' },
        { type: 'mcq', q: 'What is the ceiling Google sets for the fraction of an SRE\'s time spent on toil?', choices: ['10%', '25%', '50%', '75%'], answer: 2, explain: 'The 50% cap applies to all operational work, of which toil is the largest component. Consistently exceeding it triggers redistribution of work to the development team.' },
        { type: 'mcq', q: 'Which elimination tactic has the highest leverage according to the ordering in this lesson?', choices: ['Write a script the on-call engineer runs on demand', 'Change the design so the task no longer needs to happen', 'Batch the manual task into a weekly session', 'Assign the task to a junior engineer'], answer: 1, explain: 'Removing the need beats self-service, which beats full automation, which beats partial automation. Reassigning toil does not reduce it.' },
        { type: 'tf', q: 'True or false: work that is unpleasant but requires genuine engineering judgement each time (for example, debugging a novel performance regression) is toil.', answer: 1, explain: 'False. Toil is repetitive and automatable. Novel, judgement-heavy work is engineering, however unpleasant.' }
      ]
    }
  ],

  boss: {
    id: 'w1boss', title: 'The Launch Dilemma', tagline: 'Product wants to ship. The budget says otherwise. You have the numbers; use them.',
    intro: `You are the SRE for **Checkout**, a payment API on AWS (ALB → ECS → Aurora). The SLO: 99.9% of valid requests succeed within 500 ms, rolling 30 days. The error-budget policy is signed by the VP of Engineering.

It is day 22 of the window. Two incidents this month (a bad deploy, and an Aurora failover that took longer than expected) consumed **81%** of the budget. Product wants to launch "One-Click Reorder" on day 24, ahead of a marketing campaign.

Your service-health meter tracks both reliability and the credibility of the SRE function. Keep it above 50% to clear the world.`,
    steps: [
      { time: 'Day 22, 10:00', text: `The product lead opens with: "We've been at 99.9% or better the whole month except for two blips. Those were SRE issues, not ours. Why should our launch pay for them?"

Current numbers: budget remaining 19%, burn rate over the last 7 days 0.4×.`,
        choices: [
          { text: 'Explain that the budget is shared and blameless by design: whose fault the incidents were is irrelevant to how much risk the service can absorb now. Show the 19% and the policy.', d: 12, fb: 'Correct framing. The budget measures the service\'s remaining tolerance for risk from the user\'s point of view; attribution belongs in the postmortem, not in the launch decision.' },
          { text: 'Concede the point since the incidents were infrastructure-related, and agree to exclude them from the budget calculation.', d: -30, fb: 'You just made the budget negotiable. Once exclusions are granted case by case, the policy no longer constrains anyone.' },
          { text: 'Refuse the launch flatly and end the meeting.', d: -15, fb: 'The budget is not exhausted. A flat refusal is not what the policy says, and it costs you credibility for the day the policy does require a freeze.' }
        ] },
      { time: 'Day 22, 11:30', text: `You look at the launch plan. The feature adds a new dependency: a call to a recommendations service (owned by another team) inside the checkout request path, with a 2-second timeout and no fallback. Its SLO is 99.5%.

What is your first concern?`,
        choices: [
          { text: 'A 99.5% dependency in the serial request path caps Checkout below its own 99.9% SLO; the design needs a fallback and a much shorter timeout so recommendation failures do not become checkout failures.', d: 15, fb: 'Exactly. Serial dependencies multiply. With a fallback (skip recommendations) and a tight timeout, the dependency degrades quality instead of availability.' },
          { text: 'The 2-second timeout is fine because the ALB idle timeout is 60 seconds.', d: -25, fb: 'A 2-second stall inside a 500 ms latency SLO turns every recommendations slowdown into an SLO violation. The ALB timeout is irrelevant.' },
          { text: 'Ask the recommendations team to raise their SLO to 99.9%.', d: -5, fb: 'That is a months-long conversation; it does not fix this launch. Design the caller to tolerate the dependency you actually have.' }
        ] },
      { time: 'Day 23', text: `The dev team implements a 150 ms timeout with a fallback that skips recommendations. Product now asks: "So can we launch to 100% on day 24?"

Budget remaining: 19%. Projected campaign traffic: +40%.`,
        choices: [
          { text: 'Yes, but as a progressive rollout: 1% → 10% → 50% → 100% over 48 hours, each stage gated on the SLI, with automatic rollback. The remaining budget can absorb a canary failure; it cannot absorb a full-fleet failure.', d: 15, fb: 'This is spending the budget deliberately. A 1% canary that fails costs a sliver of budget; a 100% failure would exhaust it within minutes.' },
          { text: 'Yes, to 100%, since there is budget left.', d: -25, fb: 'Nineteen percent of budget is about 8 minutes of full outage. A bad full-fleet deploy would blow through it before the rollback finished.' },
          { text: 'No. Wait until the window rolls over on day 30.', d: -10, fb: 'Overly conservative: the policy does not require a freeze while budget remains, and a rolling window does not "reset" on day 30 anyway.' }
        ] },
      { time: 'Day 24, 14:00', text: `Canary at 10%. CloudWatch shows p99 latency on canary tasks at 620 ms vs 310 ms on baseline; error rate unchanged. The marketing email goes out in two hours.`,
        choices: [
          { text: 'Halt the rollout at 10% and roll the canary back. The latency SLI is part of the SLO; a doubled p99 at 10% would breach it at 100%.', d: 12, fb: 'Right call. Latency violations count against the same budget as errors. Investigate (the fallback path is probably not the only thing that changed), fix, re-canary.' },
          { text: 'Proceed to 50% because the error rate is fine.', d: -30, fb: 'The SLO includes a 500 ms threshold. You just scaled a known SLO violation to half the fleet, two hours before a traffic spike.' },
          { text: 'Hold at 10% and wait for the marketing spike to see if it gets worse.', d: -15, fb: 'Holding a known-bad canary in front of 10% of users during a campaign is spending budget for no information you did not already have.' }
        ] },
      { time: 'Day 25', text: `Root cause: the new code path made an extra synchronous Aurora query per request. Fixed, re-canaried, rolled out to 100% successfully. Budget remaining: 15%.

Product now proposes a second launch, "Gift Wrapping", on day 27. It is a small UI change with no backend impact.`,
        choices: [
          { text: 'Agree, with the standard progressive rollout. Fifteen percent of budget is enough to absorb a canary-scale failure, and a UI-only change is low risk. Note it in the launch log.', d: 10, fb: 'Consistent with the policy: budget remains, risk is proportionate, and the launch is recorded. This is what "SRE does not veto releases" looks like in practice.' },
          { text: 'Refuse: the budget is too low for any launch.', d: -12, fb: 'The policy freezes launches at zero budget, not at 15%. Inventing a stricter threshold on the spot is as corrosive as ignoring the policy.' },
          { text: 'Agree, and skip the canary because it is UI-only.', d: -20, fb: '"No backend impact" is what every UI change says until it triples an API call count. The canary is cheap; the budget is not.' }
        ] },
      { time: 'Day 29', text: `Gift Wrapping shipped without incident. The postmortem for the day-24 latency regression is drafted. The dev lead asks to skip the review meeting because "we already fixed it".`,
        choices: [
          { text: 'Hold the review. The fix addressed the symptom; the action items (a load test in the pipeline that catches added DB queries per request, and a latency gate in the canary analysis) are what stop the next one.', d: 12, fb: 'The postmortem\'s value is in the action items and the shared learning, not in the fix. Review it, assign owners, track completion.' },
          { text: 'Skip the review; the fix is in.', d: -20, fb: 'You just traded the only durable output of the incident for an hour. The same class of regression returns next quarter.' },
          { text: 'Hold the review, and identify who wrote the extra query so it does not happen again.', d: -25, fb: 'Blame ends the flow of honest information. The next engineer who spots a risky change will stay quiet.' }
        ] }
    ],
    win: `Checkout finished the window inside its SLO with budget to spare, two features shipped, and the policy held without becoming a weapon. The key moves: refusing to make the budget negotiable, fixing the dependency design before launch, spending budget in canary-sized pieces, and treating latency as a first-class SLO component.

**Takeaway:** the error budget only works when SRE says *yes, and here is how* at least as often as it says *not yet*.`,
    lose: `Checkout breached its SLO, or the SRE function lost the credibility it needs to enforce the policy next time. Common failure paths in this scenario: excluding incidents from the budget on request, letting a serial 99.5% dependency into a 99.9% path without a fallback, rolling a known latency regression forward, or over-freezing while budget remained.

Re-read lessons 1.3 and 1.4, then retry.`
  }
});
