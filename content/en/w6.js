/* World 6 — The human side */
window.SRE_WORLDS = window.SRE_WORLDS || [];
window.SRE_WORLDS.push({
  id: 'w6',
  title: 'The Human System',
  subtitle: 'On-call that people survive, launches that land, and an SRE practice an organisation actually adopts.',
  badge: 'People Keeper',
  intro: `The technical practices in the previous worlds all fail the same way: a team too exhausted, too siloed or too politically weak to run them. This world covers the SRE book's Part II and Part IV: on-call design, the psychology of operational load, collaboration between SRE and product teams, launch coordination, the engagement model, and how SRE arrives in an organisation that does not have it yet. Sources: SRE book chapters 11, 28 through 33; workbook chapters 8, 11, 19, 20 and 21.

The boss is an organisational one: you are the first SRE hire at a company that thinks it wants SRE.`,

  lessons: [
    {
      id: 'w6l1', title: 'Being on-call', minutes: 11, source: 'SRE book ch.11, workbook ch.8',
      summary: 'Rotation arithmetic, operational overload, and the psychology of the pager.',
      body: `## What on-call buys

On-call is the mechanism by which a service gets a guaranteed human response within a defined time. Everything about its design follows from two constraints: the response must be fast enough to protect the SLO, and the duty must be sustainable for the people carrying it.

[[diagram:oncall-balance]]

## The arithmetic

- **Time on-call ≤ 25%** of an engineer's time in a multi-site team (two sites, 12-hour shifts), or up to 33% at a single site. Google's target: no more than 25% on-call plus 25% other operational work, leaving at least 50% for engineering.
- **Team size.** To cover a 24×7 single-site rotation at 25% duty you need roughly 8 engineers; a follow-the-sun pair of sites needs about 6 per site with 12-hour shifts. Smaller than that and the rotation either burns people or leaves gaps.
- **Two engineers per shift** in many teams: a primary who takes pages and a secondary who acts as backup and handles non-urgent flow. The secondary is also the escalation path if the primary does not acknowledge.
- **Maximum two incidents per 12-hour shift.** Each incident needs time to respond, mitigate, root-cause and write up. A third leaves no time to learn, which means the same incident returns.
- **At least one incident per quarter** is a *lower* bound worth watching: a rotation that never fires produces engineers who cannot respond when it does. The fix is not to break production; it is training, game days and wheel-of-misfortune exercises.

## Compensation and fairness

Google compensates on-call with time off in lieu or cash, capped at a proportion of salary so managers cannot buy unlimited availability and so engineers are not incentivised to stay permanently on-call. The cap is a reliability control, not an HR detail: the incentive to reduce pages must stay stronger than the incentive to collect on-call pay.

## Feeling safe

The book is explicit that stress hormones change how people respond. Under pressure, engineers fall back on intuition and act fast; a calm engineer reasons deliberately. The practices that keep responders in the deliberate mode:

- **Clear escalation paths** and an explicit expectation that asking for help is correct behaviour.
- **Well-tested playbooks** so the first move is never improvised. The book reports roughly a 3× improvement in mean time to repair when responders use playbooks.
- **Blameless postmortems**, so an engineer's mistake during a response is a system finding rather than a career event.
- **Practice**: drills, disaster role-play, and shadowing before a first solo shift.

The two failure modes to watch: **operational overload** (too many pages, no time to engineer) and **operational underload** (so few incidents that skills and confidence rot).

## Operational overload and the escape valve

When the pager load exceeds the team's engineering capacity, the book prescribes a sequence, not heroism:

1. Establish the data: pages per shift, actionable ratio, top sources.
2. Temporarily assign SREs to work full-time on the top sources, protected from interrupts.
3. If load stays above the cap, hand the excess back: the development team takes pages, or SREs formally hand back operational responsibility for the service.

The last step sounds drastic and is the point. An SRE team with no engineering time is an ops team, and the model has already failed.

## Shift hygiene

Handoffs are explicit and written: open incidents, ongoing risks, changes in flight, anything deliberately deferred. A shift that ends by dropping the pager is how incidents get lost between rotations.

> [aws]**On AWS.** AWS Systems Manager Incident Manager holds on-call schedules, escalation plans and contact channels, and can engage responders automatically from a CloudWatch alarm; PagerDuty and Opsgenie serve the same role. Whatever the tool, encode the escalation path (primary → secondary → manager) in it rather than in people's heads, and route pages and tickets to separate destinations as in World 2. Keep playbooks next to the alarm definitions in the same repository as the infrastructure code, so a new alarm without a playbook is visible in review.`,
      exercises: [
        { type: 'mcq', q: 'A single-site team wants a 24×7 rotation where each engineer is on-call no more than about 25% of the time. Roughly how many engineers does that require?', choices: ['3', '5', '8', '20'], answer: 2, explain: 'A 24×7 single-site rotation at roughly 25% duty needs about 8 engineers. Multi-site follow-the-sun needs about 6 per site with 12-hour shifts.' },
        { type: 'mcq', q: 'Why does the book cap incidents at about two per 12-hour shift?', choices: ['Engineers get bored otherwise', 'Each incident needs time to respond, mitigate, root-cause and write up; beyond two there is no time to learn, so the same incidents recur', 'Pager systems cannot handle more', 'It matches the SLA'], answer: 1, explain: 'The cap protects the learning loop, not just the engineer. Without follow-up time, incidents repeat indefinitely.' },
        { type: 'mcq', q: 'A rotation has fired twice in the last eight months. What does the lesson identify as the risk?', choices: ['Nothing; low page volume is the goal', 'Operational underload: responders lose skills and confidence, so the next real incident is handled badly', 'The SLO is too strict', 'The monitoring is over-tuned'], answer: 1, explain: 'Low page volume is good; zero practice is not. Game days, drills and wheel-of-misfortune exercises supply the missing reps.' },
        { type: 'multi', q: 'Which practices help keep responders in deliberate rather than reactive thinking? Select all that apply.', choices: ['Tested playbooks linked from every alert', 'Explicit permission and paths to escalate', 'Blameless postmortems', 'Publicly ranking engineers by incident count', 'Pre-shift drills and shadowing'], answers: [0, 1, 2, 4], explain: 'Ranking responders adds exactly the stress the other practices remove, and suppresses the information postmortems depend on.' },
        { type: 'mcq', q: 'An SRE team is at 80% operational load for a third consecutive month after tuning alerts. What does the book prescribe as the escape valve?', choices: ['Hire contractors', 'Temporarily assign SREs to fix the top sources full-time, and if load stays above the cap, hand operational responsibility (or the pager) back to the development team', 'Lower the SLO until pages stop', 'Extend shifts to 24 hours'], answer: 1, explain: 'Handing load back is the mechanism that keeps the 50% cap real. A team with no engineering time has stopped being an SRE team.' }
      ]
    },

    {
      id: 'w6l2', title: 'Communication, collaboration and the engagement model', minutes: 10, source: 'SRE book ch.31, 32',
      summary: 'How SRE teams work with developers, and the production readiness review.',
      body: `## The relationship is the product

SRE is structurally an outsider: a team with the power to influence another team's release velocity. The book spends a full chapter on making that relationship work, because an SRE team that is resented is an SRE team that is routed around.

Mechanisms Google uses:
- **Production meetings.** A regular, structured review of a service's recent performance: outages, paging load, SLO status, upcoming launches, capacity changes. Attended by SRE and product development together. The agenda is fixed so the meeting cannot drift into status theatre.
- **Shared ownership of the SLO.** As in World 1, a single number both teams are accountable for.
- **Embedding.** An SRE joins the development team for a quarter or two, sits with them, and works on reliability from inside. The book's guidance for the embedded SRE: start by reading the design and the postmortems, find the gap between the service's needs and its instrumentation, and teach rather than fix everything personally.
- **Design consultation early.** SRE involvement at design time is cheap; SRE involvement at launch time is a negotiation.

## The engagement model: how SRE takes on a service

Not every service gets SRE support. The book describes the **Production Readiness Review** (PRR) as the gate, with several models:

1. **Simple PRR.** SRE reviews a service and takes on the pager once it meets the standard.
2. **Early engagement.** SRE joins during design, shaping the architecture before it is expensive to change. The book prefers this: the highest-leverage reliability decisions are architectural.
3. **Frameworks and platform.** Rather than reviewing every service, SRE provides a platform with reliability built in (standard serving stack, standard deployment, standard monitoring). Services that adopt it inherit the practices. This is the model that scales, and it is the direct ancestor of modern platform engineering.

## The production readiness review

A typical PRR checks:
- SLIs and SLOs defined, measured, and alerting derived from them.
- Monitoring and dashboards that answer "are we OK" and "where does it hurt".
- Playbooks for every page, and an escalation path.
- Capacity plan, including the redundancy policy and load-test results.
- Deployment: staged rollout, tested rollback, config handled as code.
- Dependencies documented with their SLOs, timeouts and fallbacks.
- Data integrity: backups, tested restores, soft deletion.
- Failure modes reviewed and the biggest ones exercised.

The output is a list of required work with owners, not a pass/fail verdict delivered at launch minus one week.

## Disengagement

The book also describes SRE *leaving* a service: if a service becomes low-risk and boring, SRE hands it back and moves to higher-leverage work. Making this explicit keeps SRE capacity aimed at where it matters and removes the assumption that SRE ownership is permanent.

> [aws]**On AWS.** The "frameworks" model translates directly to a paved road: a shared CDK or Terraform module set that provisions a service with ALB, ECS or Lambda, the standard alarms and dashboards, deployment pipeline with canary and rollback, log and trace wiring, and backup policy already attached. A team adopting the module inherits the PRR answers for free; the review then covers only what is unusual about the service. The AWS Well-Architected Framework review (operational excellence and reliability pillars) is a reasonable skeleton for a PRR if you do not want to invent one, and Well-Architected Tool tracks the findings.`,
      exercises: [
        { type: 'mcq', q: 'Which SRE engagement model does the lesson identify as the one that scales across many services?', choices: ['A production readiness review for every service before launch', 'Embedding an SRE in each development team', 'Providing a platform or framework with reliability practices built in, which services inherit by adopting it', 'Requiring SRE approval for every deploy'], answer: 2, explain: 'Review and embedding are per-service and bounded by SRE headcount. A paved-road platform distributes the practices without a per-service transaction, and is the ancestor of platform engineering.' },
        { type: 'multi', q: 'Which items belong in a production readiness review? Select all that apply.', choices: ['SLIs and SLOs with alerting derived from them', 'Playbooks for every paging alert', 'Tested rollback and staged deployment', 'Backups with tested restores', 'Lines of code written per engineer'], answers: [0, 1, 2, 3], explain: 'A PRR checks whether the service can be operated safely. Productivity metrics have no place in it.' },
        { type: 'mcq', q: 'Why does the book prefer early engagement over reviewing a service shortly before launch?', choices: ['It is less work for SRE', 'The highest-leverage reliability decisions are architectural, and changing architecture at launch minus one week is expensive or impossible', 'Launch dates are usually wrong', 'Developers prefer it'], answer: 1, explain: 'A late review can only ask for cheap changes. Design-time involvement can change the failure modes themselves.' },
        { type: 'mcq', q: 'What is the purpose of a regular production meeting between SRE and product development?', choices: ['To approve deployments', 'To review recent outages, paging load, SLO status, upcoming launches and capacity on a fixed agenda, so both teams share one picture of the service', 'To assign blame for incidents', 'To replace the postmortem process'], answer: 1, explain: 'A fixed agenda keeps the meeting from decaying into status theatre, and the shared picture is what makes shared ownership real.' },
        { type: 'tf', q: 'True or false: once an SRE team takes on a service, that ownership is permanent by design.', answer: 1, explain: 'False. The book describes deliberate disengagement: a service that has become low-risk is handed back so SRE capacity moves to higher-leverage work.' }
      ]
    },

    {
      id: 'w6l3', title: 'Launch coordination and reliable product launches', minutes: 9, source: 'SRE book ch.27',
      summary: 'The launch checklist, the coordination engineer, and why launches deserve their own process.',
      body: `## Why launches are special

A launch changes several things at once: new code, new traffic shape, new dependencies, and often a marketing event that removes your ability to choose the timing. Google's Launch Coordination Engineering (LCE) exists because the failure modes of launches are consistent enough to be checklisted.

## The launch checklist

The book's checklist is the artefact worth stealing. Representative questions:

- **Architecture and dependencies.** What is the request flow? Which dependencies are in the critical path, what are their SLOs, and what happens when each is slow or down?
- **Capacity.** What is the expected traffic, and where does the number come from? Has the service been load-tested to that level and beyond? What is the plan if traffic is 10× the estimate?
- **Failure modes.** What are the single points of failure? What happens when a dependency is unavailable? Is there a degraded mode?
- **Client behaviour.** Do clients retry? With backoff? Can you turn features off without a client release?
- **Process and automation.** Are manual steps required for the launch? Are they documented and tested?
- **Development process.** Is the code in version control with staged rollout and tested rollback?
- **External dependencies.** Third parties, quotas, certificates, DNS changes with long TTLs.
- **Rollout plan.** Staged by percentage or region, with a defined rollback trigger and a named person who can pull it.

## Techniques the chapter emphasises

- **Feature flags / gradual ramp-up.** Decouple the code deploy from the feature launch, so the launch is a config change that can be reversed in seconds.
- **The "dark launch"**: send production traffic to the new path without showing users the results, to measure capacity and correctness under real load before the user-visible launch.
- **Kill switches** for every new feature and every expensive code path.
- **Load testing against the real dependency graph**, not against mocks that never fail.
- **Emergency contacts and a defined command structure** for launch day, because launch day incidents are incidents.

## The LCE role

A small team of launch coordinators reviews launches across the company, maintains the checklist, and carries the institutional memory of how launches fail. The value is not the gate; it is the accumulated pattern library. Where a full team is not justified, the same function can be a rotating role plus a maintained checklist.

> [aws]**On AWS.** Launch-specific items that bite: Service Quotas (Lambda concurrency, EC2 instance limits, API Gateway throttles, SES sending limits) requested well in advance; DNS TTLs lowered before a cutover and raised afterwards; ALB and NLB pre-warming considerations for extreme step changes in traffic; provisioned concurrency for Lambda so the launch spike does not arrive on cold starts; DynamoDB on-demand mode or pre-scaled provisioned capacity; and CloudFront cache behaviour verified for the new paths. Dark launch maps to shadow traffic (duplicate requests to the new stack, discard responses) or to a Lambda alias receiving mirrored events. Kill switches belong in AppConfig feature flags, evaluated with a safe default as in World 3.`,
      exercises: [
        { type: 'mcq', q: 'What is a "dark launch"?', choices: ['Launching at night to limit blast radius', 'Sending real production traffic through the new code path without exposing results to users, to validate capacity and correctness under real load', 'Launching without telling the SRE team', 'A launch with no monitoring'], answer: 1, explain: 'Dark launches separate "does it work at production scale" from "do users see it", so the risky question is answered first.' },
        { type: 'mcq', q: 'Why does the lesson recommend decoupling the code deploy from the feature launch using flags?', choices: ['It reduces build times', 'The launch becomes a config change that can be reversed in seconds, rather than a deploy that must be rolled back', 'Flags remove the need for canaries', 'It avoids the need for load testing'], answer: 1, explain: 'A flag flip is the fastest rollback available. The code can be in production, dormant and tested, before the feature is on.' },
        { type: 'multi', q: 'Which questions belong on a launch checklist? Select all that apply.', choices: ['What happens if traffic is 10× the estimate?', 'Which dependencies are in the critical path and what happens when each is down?', 'Who can trigger a rollback and what triggers it?', 'Which engineer wrote the most code for this feature?', 'Do clients retry, and with backoff?'], answers: [0, 1, 2, 4], explain: 'Traffic assumptions, dependency failure modes, rollback authority and client behaviour are the recurring launch failure modes.' },
        { type: 'mcq', q: 'On AWS, which launch-day risk is best mitigated weeks in advance rather than on the day?', choices: ['Service Quotas such as Lambda concurrency or EC2 instance limits', 'Dashboard layout', 'Log retention settings', 'Alarm descriptions'], answer: 0, explain: 'Quota increases are requests with lead time. Hitting a quota ceiling during a launch spike is an outage the checklist exists to prevent.' }
      ]
    },

    {
      id: 'w6l4', title: 'Adopting SRE in an organisation', minutes: 10, source: 'Workbook ch.19, 20, 21',
      summary: 'Where to start, how to sequence, and the cultural changes that make it stick.',
      body: `## The starting position

Most organisations adopting SRE already have operations, alerts, incidents and unhappy engineers. The workbook's advice is to start where the pain and the leverage overlap, not to reproduce Google's org chart.

## A sequence that works

1. **Pick one service that matters** and that has a team willing to try. Reliability work on an unimportant service teaches nobody anything.
2. **Define one or two SLIs and an SLO** for it, measured from the user's side. Publish the measurement before arguing about the target.
3. **Derive the alerting from the SLO** and delete the alerts that do not survive that test. This is usually the moment the team notices the difference.
4. **Write the error budget policy** and get it signed by someone who can enforce it. Without this, step 2 is a dashboard.
5. **Introduce blameless postmortems** with explicit triggers, and share them widely.
6. **Measure toil** and give the team protected time to remove the largest source.
7. **Then** generalise: a second service, a paved-road platform, a production readiness review.

The ordering matters. SLOs before alerts, alerts before automation, postmortems before process, and executive backing before any of it can survive contact with a launch deadline.

## Structural choices

- **Where SRE reports.** An SRE function inside the product organisation is close to the work but easy to override; one reporting into a separate engineering function has the independence to enforce a budget policy but risks becoming an outsider. The workbook's practical answer is that independence matters most for the error budget policy specifically.
- **Team topology.** Options: a central SRE team serving many services; embedded SREs inside product teams; a platform team providing the paved road; or a hybrid that starts central and spins out. Most organisations end up with a platform plus a small central group.
- **Who carries the pager.** The most common modern answer, and the one the workbook supports, is that the team that writes a service also operates it, with SRE providing the platform, the standards and help during large incidents. "You build it, you run it" with SRE support scales better than a separate team receiving other people's software.

## Culture

The workbook is blunt that the cultural changes are harder than the technical ones:

- **Blamelessness has to be demonstrated by leadership**, first time it is costly. One public search for a culprit undoes a year of postmortems.
- **Reliability work must be prioritised visibly**, with the error budget as the argument. A backlog where reliability items are always below features tells the team what is actually valued.
- **Data over opinion.** Every reliability argument should be reducible to an SLI, a budget number or a page count.
- **Psychological safety** is the precondition for honest incident reporting; the workbook ties it directly to reliability outcomes.

## Measuring the adoption

Useful indicators: percentage of services with a defined and measured SLO; percentage of pages tied to an SLO; pages per shift; postmortem completion and action-item closure rate; toil percentage; time to restore (a DORA metric that overlaps neatly with SRE goals). Track the trend, not the absolute.

> [aws]**On AWS.** The paved road is the highest-leverage artefact: shared infrastructure modules that emit the standard SLIs, create the burn-rate alarms, wire the deployment pipeline with canary and rollback, attach a backup plan, and register the service in your catalogue. CloudWatch Application Signals can define the SLOs for services that adopt the standard instrumentation, which makes "does this service have an SLO" a query rather than a survey. Use AWS Organizations and account boundaries to make the blast radius of a team's mistakes their own.`,
      exercises: [
        { type: 'order', q: 'Put this SRE adoption sequence in the order the workbook recommends.', items: ['Pick one service that matters, with a willing team', 'Define and measure one or two SLIs and an SLO', 'Derive alerting from the SLO and delete the rest', 'Write and get sign-off on the error budget policy', 'Introduce blameless postmortems with explicit triggers', 'Measure toil and protect time to remove the largest source'], explain: 'Measurement before targets, targets before alerts, policy before it is tested by a launch, then learning and toil reduction. Generalising to a platform comes after this loop works once.' },
        { type: 'mcq', q: 'Which statement best reflects the workbook\'s position on who should carry the pager for a service?', choices: ['A dedicated SRE team should receive the pager for all services', 'The team that writes a service should operate it, with SRE providing the platform, standards and support during large incidents', 'Pager duty should rotate randomly across the engineering organisation', 'Only managers should be paged'], answer: 1, explain: '"You build it, you run it" with SRE support scales; handing software to a separate team to operate reproduces the dev/ops split SRE exists to remove.' },
        { type: 'mcq', q: 'Why does the workbook argue that independence matters most specifically for the error budget policy?', choices: ['Because budgets are a finance function', 'Because enforcing a launch freeze requires the ability to say no to the organisation that owns the launch', 'Because SLOs are confidential', 'Because independence improves monitoring quality'], answer: 1, explain: 'Everything else in SRE can be done collaboratively. The freeze is the one moment where organisational position determines whether the policy is real.' },
        { type: 'multi', q: 'Which indicators usefully measure SRE adoption? Select all that apply.', choices: ['Percentage of services with a measured SLO', 'Percentage of pages tied to an SLO', 'Pages per shift', 'Postmortem action-item closure rate', 'Number of SRE job titles created'], answers: [0, 1, 2, 3], explain: 'Renaming roles is the classic false signal. The rest measure whether the practices are actually operating.' },
        { type: 'mcq', q: 'A leadership team responds to a costly incident by asking who approved the change. What is the likely effect?', choices: ['Faster resolution of similar incidents', 'Engineers reduce what they volunteer in future postmortems, and incidents become less visible rather than less frequent', 'Improved action-item completion', 'No effect if the postmortem document stays blameless'], answer: 1, explain: 'Blamelessness is demonstrated by leadership under cost, or it is not real. The information flow is the asset being protected.' }
      ]
    }
  ],

  boss: {
    id: 'w6boss', title: 'First SRE Hire', tagline: 'Six months to prove the model at a company that wants the title, not the practice.',
    intro: `You are the first SRE at a 120-person company running a B2B SaaS platform on AWS. Twelve product teams, no SLOs, an ops team of three that receives every alert, and a VP of Engineering who read the SRE book on holiday and wants "SRE by Q3".

Current state: about 60 pages a week across the ops team, two of whom are interviewing elsewhere. Deploys are weekly and manual. Postmortems exist as a wiki page nobody updates. You have six months and no authority over the product teams.

Health tracks both reliability outcomes and organisational credibility. Keep it above 50%.`,
    steps: [
      { time: 'Week 1', text: `The VP asks for your plan. Their proposal: rename the ops team to "SRE", give them the SRE book, and have every team file reliability tickets to them.

What do you propose instead?`,
        choices: [
          { text: 'Start with one important service and one willing team: measure two user-facing SLIs, publish the numbers before arguing about targets, and use what you learn to design the wider rollout.', d: 15, fb: 'Narrow, real and demonstrable. A measured SLI on a service that matters produces an argument nobody can wave away, and gives you a reference implementation.' },
          { text: 'Accept the rename and start writing standards for all twelve teams.', d: -25, fb: 'Renaming an ops team without changing hiring, the 50% cap or shared SLOs is the canonical anti-pattern. Standards written before you have measured anything have no evidence behind them.' },
          { text: 'Insist on hiring five more SREs before anything starts.', d: -15, fb: 'Headcount before a working model just scales the ops team. You have not yet shown what the model does.' }
        ] },
      { time: 'Week 4', text: `You pick **Reports**, the service customers complain about most, and its team agrees. You measure from the ALB: 97.9% of report requests succeed within 5 s over the last 30 days. The team lead says "so our SLO is 97.9%?"`,
        choices: [
          { text: 'No: the measurement is the starting point, not the target. Ask what customers actually need, look at the complaints and the contract, then set the SLO from that and treat the gap as work.', d: 12, fb: 'Setting the target to current performance guarantees the SLO never drives anything. The gap between need and reality is the entire value of the exercise.' },
          { text: 'Yes, 97.9% is a fair starting SLO since it reflects reality.', d: -12, fb: 'An SLO that is always met by definition is a dashboard. Nobody will ever act on it.' },
          { text: 'Set it at 99.99% to be ambitious.', d: -20, fb: 'A target with no path to it and no business justification gets abandoned in month two, taking the credibility of the practice with it.' }
        ] },
      { time: 'Week 8', text: `SLO agreed at 99.5% within 5 s. You build burn-rate alerts. The Reports team now has 3 alerts instead of 19, and the ops team asks whether they should still receive the other 16 for that service.`,
        choices: [
          { text: 'Route the SLO pages to the Reports team itself, move the rest to tickets or dashboards, and have the ops team support rather than absorb. Document the change as the template for other services.', d: 15, fb: 'This is the pivot from "ops receives other people\'s alerts" to "you build it, you run it with support". Doing it on one service first makes it a demonstration rather than a decree.' },
          { text: 'Keep all alerts with the ops team so product teams are not disrupted.', d: -25, fb: 'You have preserved the exact structure that produced 60 pages a week and two resignations.' },
          { text: 'Delete the other 16 alerts entirely.', d: -10, fb: 'Some of those signals have legitimate consumers. Route them; do not silence them.' }
        ] },
      { time: 'Week 14', text: `Reports has a bad month: an incident burns 70% of the budget. The Reports team proposes a fix but also has a committed customer feature. The VP asks you to decide.

There is no written error budget policy yet.`,
        choices: [
          { text: 'Use the incident as the forcing function: draft the error budget policy now, get the VP to sign it, and apply it to this decision. Reliability work takes priority while the budget is this low, with the feature scheduled immediately after.', d: 15, fb: 'The policy is worth more than this one decision. Writing it during a real trade-off, with leadership signing, is how it acquires authority for every future one.' },
          { text: 'Rule that the feature ships; you have no authority to block it.', d: -20, fb: 'You had the one moment where a policy could have been written with evidence behind it, and used it to establish that reliability loses by default.' },
          { text: 'Block the feature on your own authority.', d: -25, fb: 'You do not have that authority, and exercising it without a signed policy makes SRE the department of no. The next escalation removes you from the decision entirely.' }
        ] },
      { time: 'Week 20', text: `Reports is stable, the policy is signed, and four other teams now want SLOs. You are one person. The ops team has two people left.`,
        choices: [
          { text: 'Build the paved road: shared infrastructure modules that emit standard SLIs, create burn-rate alarms, wire a canary pipeline with rollback and attach backups. Teams adopting the module inherit the practices; you consult rather than implement.', d: 15, fb: 'This is the frameworks model, the only one that scales past your headcount. Each adoption also answers most of a production readiness review for free.' },
          { text: 'Run a hands-on SLO project with each of the four teams sequentially.', d: -8, fb: 'Four quarters of your time for four services, and nothing reusable at the end. Do one more if you must, then build the road.' },
          { text: 'Write a standards document and require every team to comply.', d: -18, fb: 'A document with no implementation behind it converts into a compliance exercise that teams resent and route around.' }
        ] },
      { time: 'Month 6', text: `Review with the VP. They want a single metric to report to the board as proof that "SRE works", and suggest "number of incidents", targeting zero.`,
        choices: [
          { text: 'Offer a small set instead: percentage of services with a measured SLO, pages per shift, postmortem action-item closure, and time to restore. Explain that zero incidents would mean either hidden incidents or a service too slow to change.', d: 12, fb: 'A target of zero incidents rewards concealment and stalls delivery. A small basket of adoption and outcome measures, reported as trends, is defensible and cannot be gamed by silence.' },
          { text: 'Accept "number of incidents" as the metric; it is simple and the trend is down.', d: -20, fb: 'You have just given every team a reason not to declare incidents. Within two quarters the number looks excellent and you know nothing.' },
          { text: 'Report error budget consumption across all services as the single number.', d: -5, fb: 'Better than incident count, but only five services have SLOs, so the aggregate is mostly noise, and it says nothing about adoption or the learning loop.' }
        ] }
    ],
    win: `Six months in: one service with a real SLO and a signed budget policy, alerting that halved the pager load, a paved road four teams are adopting, and a set of metrics that measure the practice rather than the title. The ops team is doing platform work instead of receiving everyone's alerts.

**Takeaway:** SRE adoption is a sequence, not a reorganisation. Measure one thing that matters, derive the alerts from it, get the policy signed while the evidence is fresh, then build the road so the next ten teams do not need you.`,
    lose: `The title arrived and the practice did not. Typical failure paths: renaming the ops team, setting the SLO to current performance, keeping all alerts centralised, missing the moment to write the budget policy, or accepting a board metric that rewards hiding incidents.

Revisit lessons 6.1 and 6.4 and retry.`
  }
});
