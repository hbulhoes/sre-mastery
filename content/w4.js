/* World 4 — The incident lifecycle */
window.SRE_WORLDS = window.SRE_WORLDS || [];
window.SRE_WORLDS.push({
  id: 'w4',
  title: 'When It Breaks',
  subtitle: 'Troubleshooting, emergency response, incident command, postmortems, and testing so it breaks less.',
  badge: 'Incident Commander',
  intro: `Things will fail. This world is the SRE book's Part III core: a method for troubleshooting under pressure, the lessons from Google's own emergencies, the incident command structure borrowed from firefighters, the blameless postmortem, and the testing practices that shrink the number of incidents in the first place. Sources: SRE book chapters 12 through 17.

The boss is a full multi-hour incident where you must run the response, not just debug.`,

  lessons: [
    {
      id: 'w4l1', title: 'Effective troubleshooting', minutes: 10, source: 'SRE book ch.12',
      summary: 'A repeatable method for finding out what is wrong, and the pitfalls that make it slow.',
      body: `## Troubleshooting is learnable

The book rejects the idea that troubleshooting is an innate talent. It is a process (the hypothetico-deductive method) plus system knowledge. The process can be taught; the knowledge comes from experience and good documentation.

[[diagram:troubleshooting-loop]]

## The loop

1. **Problem report.** What is expected, what is observed, how to reproduce. Reports should go to a tracked queue, not to individuals. "The site is slow" is not a report; "search p99 went from 300 ms to 4 s at 14:02 for EU users" is.
2. **Triage.** Assess severity and **stop the bleeding first**. It is often right to mitigate (divert traffic, roll back, shed load) before understanding the cause. Preserve evidence when you can (logs, a snapshot of a bad instance) so diagnosis can continue afterwards.
3. **Examine.** Look at the system's telemetry: metrics, logs, traces, recent changes. Dashboards that show the golden signals broken down by dimension are the tool for this step.
4. **Diagnose.** Form hypotheses. Two techniques from the book: **simplify and reduce** (find the smallest reproducible case; bisect components), and **ask "what, where, why"** (what is it doing, where does the bad data flow, why is it doing that). The most productive question is usually **"what changed?"** (deploys, config, traffic, dependencies, infrastructure).
5. **Test and treat.** Test one hypothesis at a time, in a way whose result is unambiguous. Prefer non-destructive tests; document destructive ones before running them. If the test refutes the hypothesis, loop back.
6. **Cure.** Once the cause is proven, fix it, verify, and write it down.

## Negative results are magic

A test that shows "it is *not* the database" is progress: it eliminates a branch of the search. Record negative results; they save the next person hours. The book argues they should be published, not just noted.

## Common pitfalls

- Looking at symptoms that are not relevant, or misunderstanding metrics.
- Changing things at random ("let's restart it") without a hypothesis, which destroys evidence and can make things worse.
- Latching onto a theory because it fits a past incident (**availability bias**) and ignoring contradicting data.
- Chasing correlated events as if they were causal. Two things changed at once; one of them is usually innocent.
- Forgetting that the "impossible" happens: the system may be doing something the design says it cannot.

## Making troubleshooting easier in advance

- Observability built in: every component exports the golden signals and structured logs with request IDs.
- A change log: every deploy, config push and infra change annotated in one place.
- Playbooks for the known failure modes, with the queries and dashboards already linked.
- The ability to reproduce: a way to replay traffic or run a request with verbose diagnostics.

> [aws]**On AWS.** "What changed?" is answered by CloudTrail (who called which API when), CloudFormation stack events and change sets, CodeDeploy deployment history, AppConfig deployment history, and the AWS Health Dashboard for provider-side events. For "where does the request go wrong", X-Ray or OpenTelemetry traces with a shared trace ID across ALB, application and downstream calls. Logs Insights with structured JSON logs lets you slice by request ID or customer. Preserve evidence by snapshotting an EBS volume or isolating a task from the target group (deregister, do not terminate) before you fix it.`,
      exercises: [
        { type: 'order', q: 'Put the troubleshooting loop steps in order.', items: ['Problem report', 'Triage (stop the bleeding)', 'Examine the telemetry', 'Diagnose (form hypotheses, ask what changed)', 'Test and treat', 'Cure and document'], explain: 'Report → triage → examine → diagnose → test/treat → cure. The loop returns to examine when a hypothesis fails.' },
        { type: 'mcq', q: 'During an outage an engineer restarts the API servers "to see if it helps" before looking at any data. Which pitfall is this?', choices: ['Availability bias', 'Changing things at random without a hypothesis, which destroys evidence', 'Chasing correlations', 'Under-triaging'], answer: 1, explain: 'Random changes might mitigate by luck, but they wipe the state that would have explained the failure and can make things worse.' },
        { type: 'mcq', q: 'Why does the book call negative results "magic"?', choices: ['They are rare', 'Each eliminated hypothesis narrows the search and saves others from repeating the same test', 'They prove the system is fine', 'They end the incident'], answer: 1, explain: 'Record and share what is not the cause. Eliminating branches is how the search converges.' },
        { type: 'mcq', q: 'Which single question does the lesson identify as the most productive during diagnosis?', choices: ['Who is on-call?', 'What changed?', 'Is it DNS?', 'How much will this cost?'], answer: 1, explain: 'Most incidents follow a change: a deploy, a config push, a traffic shift, a dependency or infrastructure event. Start there.' },
        { type: 'mcq', q: 'On AWS, which source most directly answers "who changed this resource and when"?', choices: ['CloudWatch metrics', 'AWS CloudTrail', 'Route 53 query logs', 'S3 access logs'], answer: 1, explain: 'CloudTrail records API calls with identity, time and parameters. It is the change log for the account.' }
      ]
    },

    {
      id: 'w4l2', title: 'Emergency response', minutes: 8, source: 'SRE book ch.13',
      summary: 'Lessons from Google\'s test-induced, change-induced and process-induced emergencies.',
      body: `## What to do when systems break

The book's first sentence on the topic: don't panic. You are not alone, and the system is not going to explode. Then: **mitigate first, understand later.** The user does not care about root cause during the outage.

Three case studies frame the chapter; each maps onto a class of emergency you will meet.

## Test-induced emergency

Google ran a disaster-recovery test that deliberately took a distributed storage system offline, expecting dependents to fail over. A dependency nobody had mapped did not fail over, and the test caused a real outage. Lessons: tests must be designed to be **abortable** with a clear rollback; the test plan should identify dependencies (and be sceptical about the list being complete); and a real emergency during a test must be run as a real incident, with the test stopped.

## Change-induced emergency

A configuration change to a globally shared component tripped a bug and crashed nearly all externally facing systems at once. Recovery was fast because the change could be rolled back, but the blast radius was global because the config was pushed everywhere at once. Lessons: **progressive rollouts for config**, and keep the ability to roll back independent of the systems the change may break (the rollback tooling must not depend on the thing you broke).

## Process-induced emergency

An automation for turning down machines had a bug and started turning down serving machines far faster than anyone expected; it was stopped only because someone noticed. Lessons: rate-limit automation, require human confirmation for high-blast-radius operations, and build a **big red button** that stops all automation immediately.

## All problems have solutions

Systems fail in ways nobody anticipated. The response is not heroics; it is a set of practices that make any failure survivable:

- **Playbooks** that give the responder a first move.
- **Rollback that always works**, independent of the broken component.
- **Ask for help early.** Escalation is a tool, not an admission.
- **Keep a history**: timestamps, actions, observations, in a shared document as it happens. This becomes the postmortem timeline and stops two people repeating the same experiment.
- **Practice.** Run disaster tests and game days so the first time you use the rollback is not during an outage.

## Learn from the past, don't repeat it

The book's closing advice: keep a record of outages, ask big even improbable questions ("what if the entire region is gone?"), and encourage proactive testing of the answers. Every emergency is expensive; extract the maximum learning from each one.

> [aws]**On AWS.** Rollback independence: keep the deployment pipeline and its IAM roles in a separate account from the workloads it deploys, so a broken workload cannot block its own rollback. Big red button: a break-glass mechanism to disable EventBridge rules or Auto Scaling policies driving automation, tested regularly. Blast radius: use AWS Organizations and multiple accounts so a mistaken API call is confined; use Service Control Policies for guardrails. Practise with AWS Fault Injection Service (World 7). For test-induced risk, every game day needs a stop condition and an owner watching real user SLIs.`,
      exercises: [
        { type: 'mcq', q: 'What is the first priority when a page arrives for a user-facing outage?', choices: ['Find the root cause', 'Mitigate the impact (roll back, divert traffic, shed load), then investigate', 'Write the postmortem', 'Notify legal'], answer: 1, explain: 'Stop the bleeding first. Root cause can be found afterwards, ideally with preserved evidence.' },
        { type: 'mcq', q: 'The lesson from the process-induced emergency (runaway turn-down automation) is best summarised as:', choices: ['Never automate turn-downs', 'Rate-limit automation, require confirmation for high-blast-radius actions, and have a big red button that halts all automation', 'Only run automation at night', 'Automation should be written in a memory-safe language'], answer: 1, explain: 'Automation can propagate a mistake faster than any human can react; the safeguards must be built in and instantly reachable.' },
        { type: 'mcq', q: 'A disaster test unexpectedly causes a real outage. What does the book recommend?', choices: ['Continue the test to gather data', 'Abort the test using its pre-planned rollback and run the outage as a real incident', 'Wait for the test window to end', 'Blame the team that failed to fail over'], answer: 1, explain: 'Tests must be abortable. A real emergency during a test is a real emergency.' },
        { type: 'mcq', q: 'Why should rollback tooling be independent of the systems it may need to roll back?', choices: ['To save cost', 'So that a change that breaks a component cannot also break your ability to undo it', 'Because AWS requires it', 'To speed up deployments'], answer: 1, explain: 'The change-induced case: a global config crash would have been far worse if the rollback path had depended on the crashed systems.' }
      ]
    },

    {
      id: 'w4l3', title: 'Managing incidents', minutes: 10, source: 'SRE book ch.14, workbook ch.9',
      summary: 'The incident command system: roles, the incident document, handoffs, and when to declare.',
      body: `## The unmanaged incident

The book opens with a story: an engineer debugging alone as an outage spreads, three teams making uncoordinated changes, a manager demanding updates in the same channel the debugging is happening in, and a "fix" that makes it worse. The symptoms of an unmanaged incident:

- **Sharp focus on the technical problem** and nobody watching the big picture.
- **Poor communication**: nobody knows who is doing what.
- **Freelancing**: people making changes without telling anyone.

## The incident command system

Adapted from firefighting's Incident Command System, Google's structure separates roles:

[[diagram:ics]]

- **Incident Commander (IC):** holds the high-level state, assigns roles and work, and makes decisions. The IC does not debug. If the IC starts debugging, they hand command to someone else first.
- **Operations Lead (Ops):** runs the team that actually changes the system. Only Ops makes changes, and every change is announced.
- **Communications Lead (Comms):** the public face: periodic updates to stakeholders and the status page, and keeps the incident document current.
- **Planning Lead:** supports Ops with longer-term items: filing bugs, ordering food, arranging handoffs, tracking divergences from normal operation so they can be reverted.

Early in a small incident one person may hold all four roles. As the incident grows, the roles are handed out explicitly.

## Practices

- **A recognised command post**: a chat channel or bridge where the incident is run, separate from the debugging chatter.
- **A live incident state document**: timeline, current status, who holds which role, actions taken and pending. Editable by everyone, owned by Comms. This becomes the postmortem's raw material.
- **Clear, live handoffs**: "You are now the IC" must be said and acknowledged. Incidents that span shifts are handed off, not abandoned.
- **Declaring early**: it is better to declare an incident and stand it down than to let an unmanaged situation grow. Google's rule of thumb: declare if you need a second team, if the outage is user-visible, or if it is not resolved after an hour of concentrated effort.
- **Severity levels** defined in advance, with the response (who is paged, update cadence) attached to each.

## Workbook additions

The workbook adds practical detail: keep the incident response process documented and rehearsed; run "wheel of misfortune" exercises where engineers role-play incidents; and separate the **command** channel (decisions, status) from the **working** channel (debugging). It also stresses psychological safety: an incident is not the moment to evaluate people.

> [aws]**On AWS.** AWS Systems Manager Incident Manager provides response plans, engagement of on-call contacts, a timeline, and runbook automation in one place; it integrates with CloudWatch alarms and EventBridge. Whatever tooling you use, the roles and the state document are the point. Route status to a status page for customers and to stakeholders on a cadence (every 30 minutes is a common default). Use CloudTrail Lake or the incident timeline to reconstruct who did what afterwards. The AWS Health Dashboard and Personal Health Dashboard events belong in the incident channel automatically, so "is it us or AWS?" is answered fast.

## Best practices summary from the book

Prioritise (stop the bleeding, restore service, preserve evidence). Prepare (procedures, documents, rehearsals). Trust (give roles autonomy). Introspect (if you are panicking, ask for help). Consider alternatives (step back periodically). Practise. Change it around (rotate roles so everyone can do each).`,
      exercises: [
        { type: 'mcq', q: 'The Incident Commander notices a promising lead and wants to dig into logs. What does the incident command system say?', choices: ['The IC should investigate; they have the most context', 'The IC must hand command to someone else before debugging, because nobody would be holding the big picture', 'The IC should investigate but keep updating the doc', 'The IC should ask Comms to investigate'], answer: 1, explain: 'The IC\'s job is coordination and decisions. Debugging pulls the IC into the weeds and recreates the unmanaged incident.' },
        { type: 'multi', q: 'Which are symptoms of an unmanaged incident? Select all that apply.', choices: ['Several people making changes without announcing them', 'Nobody tracking the overall state', 'Stakeholders asking for updates in the debugging channel', 'A written timeline being maintained', 'Explicit role handoffs'], answers: [0, 1, 2], explain: 'Freelancing, no big-picture owner, and communication chaos. Timelines and handoffs are the cure.' },
        { type: 'mcq', q: 'Which role owns the live incident document and external updates?', choices: ['Incident Commander', 'Operations Lead', 'Communications Lead', 'Planning Lead'], answer: 2, explain: 'Comms keeps the document current and issues updates on a cadence so the IC and Ops are not interrupted.' },
        { type: 'mcq', q: 'According to the book\'s rule of thumb, which condition alone justifies declaring an incident?', choices: ['A single alert fired', 'The outage is user-visible', 'An engineer feels nervous', 'It is after business hours'], answer: 1, explain: 'Declare when a second team is needed, when users are affected, or when an hour of focused effort has not resolved it. Declaring early and standing down is cheap.' },
        { type: 'mcq', q: 'Why does the workbook recommend separating a command channel from a working channel?', choices: ['To reduce chat costs', 'So decisions and status stay visible and are not buried under debugging traffic', 'To hide details from management', 'Because Slack limits channel size'], answer: 1, explain: 'The command channel is the record of state and decisions; the working channel is where the noise of investigation belongs.' }
      ]
    },

    {
      id: 'w4l4', title: 'Postmortem culture', minutes: 9, source: 'SRE book ch.15, workbook ch.10',
      summary: 'Blameless postmortems: what triggers one, what goes in it, and how to make them count.',
      body: `## Why blameless

The postmortem's purpose is to ensure the incident is documented, all contributing root causes are understood, and effective preventive actions are put in place. **Blameless** means the writeup focuses on the contributing causes without indicting any person or team for bad or inappropriate behaviour. The premise: people acted with the best intentions given what they knew at the time. If a person could make this mistake, the system allowed it, and the fix is to the system.

Blame ends the flow of information. A culture where admitting a mistake is punished produces incidents that are hidden, minimised and repeated.

## Triggers

Have explicit criteria so the decision is not political: user-visible downtime or degradation beyond a threshold; data loss of any kind; on-call engineer intervention (release rollback, rerouting traffic); a resolution time above a threshold; a monitoring failure (an outage discovered manually). Anyone can also request a postmortem for a near miss.

## What goes in

A good postmortem contains:
- **Summary and impact**: what users experienced, for how long, how many, what it cost (including error budget spent).
- **Timeline**: from the first contributing event to resolution, with timestamps; includes when the problem was detected versus when it started.
- **Root causes and trigger**: the trigger is what set it off (a deploy); the root causes are the conditions that let it become an outage (no canary, a missing timeout).
- **What went well, what went wrong, where we got lucky.**
- **Action items** with owners, priorities and due dates, tracked in the bug tracker. Each should be specific: "add a latency gate to canary analysis" rather than "improve monitoring".
- **Lessons learned.**

## Reviewing and sharing

Postmortems are reviewed: is the data complete, are the causes deep enough (ask "why" repeatedly), are the action items real. Then shared widely: a searchable repository, a reading group, a monthly newsletter of the most interesting ones. The book describes Google's practice of collaborating on postmortems in real time in a shared doc, and of leadership publicly praising well-written postmortems.

## Making it stick

The workbook's chapter on postmortem culture warns against common failures: action items that never get done; postmortems that stop at the trigger ("the deploy caused it") without reaching the systemic causes; language that assigns blame in disguise ("the engineer failed to check"); and postmortems written so long after the incident that the details are gone.

Metrics that help: time from incident to published postmortem; percentage of action items completed within their due date; number of repeat incidents with the same root cause.

> [aws]**On AWS.** AWS publishes its own post-event summaries for major service events; they are a useful model of impact statement, timeline and corrective actions. Internally, build the timeline from the incident document, CloudTrail, deployment history and alarm history; the AWS Well-Architected Framework's operational excellence pillar formalises "learn from all operational events". Track action items where engineering work is tracked, with the error budget consumed by the incident recorded so priorities reflect actual cost.

## A worked example of "five whys"

Outage: checkout returned 500s for 12 minutes. Why? The new release crashed on start. Why? A config key was renamed and the old key was still in production config. Why did it reach all users? Config and binary were deployed together with no canary. Why no canary? The config pipeline had no canary stage. Why? Config was considered "low risk". The action item is at the last level, not the first.`,
      exercises: [
        { type: 'mcq', q: 'Which statement in a postmortem violates blamelessness?', choices: ['"The deploy pipeline allowed a config change to reach all regions at once."', '"The engineer failed to check the config before pushing it."', '"No alert fired because the SLI excluded 4xx responses."', '"The rollback took 12 minutes because the previous image had been garbage-collected."'], answer: 1, explain: 'Assigning the failure to a person\'s carelessness stops the analysis. The systemic version: "the pipeline did not validate config keys before deployment".' },
        { type: 'multi', q: 'Which are appropriate triggers for a mandatory postmortem? Select all that apply.', choices: ['User-visible downtime beyond the agreed threshold', 'Any data loss', 'An outage discovered by a user rather than by monitoring', 'A deployment that succeeded without issues', 'On-call intervention such as a rollback'], answers: [0, 1, 2, 4], explain: 'Downtime, data loss, monitoring failure and on-call intervention are standard triggers. Routine successful deploys are not.' },
        { type: 'mcq', q: 'What is the difference between the trigger and the root cause of an incident?', choices: ['They are synonyms', 'The trigger is the event that set the incident off; root causes are the systemic conditions that allowed it to become an outage', 'The trigger is always a person; root causes are always software', 'Root causes are found by the IC; triggers by Ops'], answer: 1, explain: 'A deploy is a trigger. "No canary for config" and "no validation of config keys" are root causes. Fixing root causes prevents recurrence.' },
        { type: 'mcq', q: 'Which is the best-formed action item?', choices: ['Improve monitoring', 'Be more careful with config changes', 'Add a JSON Schema validator to the AppConfig profile for the checkout service that rejects unknown keys; owner: platform team; due: 2 weeks', 'Consider reviewing the deployment process'], answer: 2, explain: 'Specific, owned, dated and verifiable. The others cannot be completed or checked.' }
      ]
    },

    {
      id: 'w4l5', title: 'Tracking outages and testing for reliability', minutes: 10, source: 'SRE book ch.16, 17',
      summary: 'Aggregating incident data over time, and the test practices that reduce incidents.',
      body: `## Tracking outages

Improving reliability requires knowing what actually fails. Google's Outalator aggregates every page into a searchable record with incident grouping, tagging and annotations. From it you can answer: how many pages per shift per team, what fraction were actionable, which services are noisiest, and whether last quarter's action items reduced repeat incidents. Without aggregate data, alert tuning and prioritisation are guesswork.

Practices worth copying: every page becomes a record; records are grouped into incidents; incidents are tagged by cause category; a weekly review looks at the trend, not the individual pages.

## Testing for reliability

Chapter 17 frames testing as the way to shrink the gap between "we hope it works" and "we know it works", measured as the probability of a defect reaching production and its expected cost.

[[diagram:test-pyramid]]

**Traditional tests** run before production:
- **Unit tests** check a function or class in isolation. Fast, many, cheap.
- **Integration tests** check assembled components against each other.
- **System tests** check the end-to-end behaviour: smoke tests, performance tests, regression tests.

**Production tests** interact with the live system:
- **Configuration tests** check that what is deployed matches what is intended (Prodtest again).
- **Stress tests** find the limit: how full can the database get, how many requests before latency degrades.
- **Canary tests** deploy to a subset and compare (World 3).

## Testing at scale

The book's guidance for large systems:
- Test the **code that tests**: a broken test framework that always passes is worse than no tests.
- **Test infrastructure changes** with the same rigour as application code: a bad Terraform or CloudFormation change is a change like any other.
- **Disaster testing**: deliberately fail components (a zone, a database, a dependency) to validate assumptions about failover. World 7 covers modern chaos engineering.
- **Statistical tests**: fuzzing, property-based testing, and load tests with realistic traffic shapes.
- **Speed matters**: slow test suites get skipped; invest in making them fast and hermetic.
- **Fake and mock carefully**: a mock that never fails hides the failure mode you most need to test. Test how the system behaves when the dependency is slow or returns errors.

## Segregating environments

The book's rule: tests that can affect production must be treated as production changes (reviewed, rate-limited, abortable). Test data must never leak into production data. Testing tools that write to production need the same access controls as deployment tools.

## Expect testing to find failures

A test that never fails is not providing information. Fault-injecting tests, "what happens when the cache is empty", "what happens when this call takes 30 seconds", are the ones that find the incidents of next quarter.

> [aws]**On AWS.** Unit and integration tests in CodeBuild with pinned images. Integration tests against real AWS resources in an ephemeral account or stack per pull request, torn down afterwards. Configuration tests: <<cfn-lint>>, <<cfn-guard>> or OPA policies on templates, plus AWS Config rules as continuous configuration tests in production. Load tests with Distributed Load Testing on AWS or k6 against a production-shaped stage. Disaster tests with AWS Fault Injection Service: stop instances in one AZ, inject latency into a dependency, throttle an API. Track outages with Incident Manager or your ticketing tool and report pages per shift monthly.`,
      exercises: [
        { type: 'mcq', q: 'What is the primary purpose of aggregating every page into a searchable outage record?', choices: ['Compliance', 'To see trends: pages per shift, actionable ratio, noisiest services, and whether action items reduced repeat incidents', 'To rank engineers', 'To bill teams for on-call'], answer: 1, explain: 'Aggregate data turns alert tuning and reliability investment from opinion into evidence.' },
        { type: 'mcq', q: 'Which test type verifies that what is actually deployed matches what was intended?', choices: ['Unit test', 'Configuration test', 'Stress test', 'Regression test'], answer: 1, explain: 'Configuration tests (Prodtest-style, or AWS Config rules) check production against the intended state.' },
        { type: 'mcq', q: 'Why does the book warn about mocks that never fail?', choices: ['They are slow', 'They hide the dependency-failure modes that cause real incidents, such as slow or erroring downstream calls', 'They are hard to write', 'They require network access'], answer: 1, explain: 'Test the behaviour when the dependency is slow, errors, or returns garbage. That is where outages come from.' },
        { type: 'mcq', q: 'A load test tool writes synthetic orders directly into the production database. What rule does this break?', choices: ['Load tests must run at night', 'Tests that touch production must be treated as production changes, and test data must never mix with production data', 'Load tests should use unit-test frameworks', 'None; it is fine'], answer: 1, explain: 'Segregate environments and data; tools that can write to production need the same controls as deployment tools.' }
      ]
    }
  ],

  boss: {
    id: 'w4boss', title: 'Black Friday', tagline: 'Multi-region checkout outage. You hold the pager. Run the incident, not just the debugger.',
    intro: `It is 09:12 on the busiest day of the year. You are on-call for **Checkout** (ALB → ECS in two regions → Aurora Global Database, payments via a third-party provider). Burn-rate alert: 14.4× over the last hour. Error rate 3% and rising. Revenue impact is roughly $40k per minute.

You have a team of four available, a status page, and a signed incident process. Health starts at 100%. Manage it.`,
    steps: [
      { time: '09:12', text: `The page arrives. Two colleagues are already in the team channel posting hypotheses: "Aurora writer is slow", "payments provider is down", "the 08:50 deploy broke it". Nobody has said what they are doing.`,
        choices: [
          { text: 'Declare an incident, take the IC role explicitly, open the incident doc and a command channel, and assign Ops Lead and Comms. Ask everyone to announce changes before making them.', d: 15, fb: 'This is the moment an unmanaged incident becomes a managed one. Roles, a document, and a rule about announcing changes cost 90 seconds and pay back immediately.' },
          { text: 'Start checking the Aurora writer yourself; it is the most likely cause.', d: -20, fb: 'You are now a fourth person freelancing. Nobody holds the big picture, and the payments hypothesis goes uninvestigated.' },
          { text: 'Ask everyone to stop talking until you have looked at the dashboards.', d: -10, fb: 'Silencing the team loses information. Structure the conversation instead of stopping it.' }
        ] },
      { time: '09:18', text: `As IC you look at the top-level dashboard. Error rate is 3% globally but 11% in eu-west-1 and 0.4% in us-east-1. The 08:50 deploy went to both regions. Payments-provider latency looks normal. Ops Lead asks what to do first.`,
        choices: [
          { text: 'Mitigate first: shift traffic away from eu-west-1 via Route 53 weighted/failover records (the runbook step), and in parallel have Ops start the rollback of the 08:50 deploy in eu-west-1 only. Preserve one failing task for later.', d: 15, fb: 'Stop the bleeding with the cheapest reversible action, then remove the most likely trigger in the affected region only. Keeping evidence lets you find the cause later.' },
          { text: 'Roll back the deploy in both regions immediately.', d: -5, fb: 'Not unreasonable, but us-east-1 is healthy on the same build, which suggests the deploy is not the whole story. A both-region rollback burns time and may not help.' },
          { text: 'Investigate why eu-west-1 differs before changing anything.', d: -20, fb: 'Revenue is $40k a minute and there is a cheap, reversible mitigation available. Understanding comes after mitigation.' }
        ] },
      { time: '09:31', text: `Traffic shifted; global error rate down to 0.6%. eu-west-1 rollback complete, but eu-west-1 error rate is still 9% for the residual traffic. Comms asks what to post publicly. A VP joins the working channel asking for "a full explanation now".`,
        choices: [
          { text: 'Have Comms post a short, factual status update ("degraded checkout for some EU users since 09:05, mitigated by rerouting, investigation ongoing, next update 10:00"). Redirect the VP to the command channel where Comms will update on a cadence.', d: 12, fb: 'Stakeholders get accuracy and a cadence; the working team keeps its focus. The VP is not the enemy; the unmanaged channel is.' },
          { text: 'Pause the investigation to give the VP a detailed explanation.', d: -15, fb: 'You do not have an explanation yet, and the IC just left the bridge to guess. Comms exists for this.' },
          { text: 'Post "all systems operational" to avoid alarming customers.', d: -25, fb: 'It is false, and the customers with failing checkouts know it. Status pages that lie are worse than no status page.' }
        ] },
      { time: '09:45', text: `The rollback did not fix eu-west-1, so the deploy was not the trigger. Ops finds the failing tasks all log <<connection timeout to aurora-eu-writer>>. Aurora Global Database shows the eu-west-1 cluster is a secondary; the writer is in us-east-1. Eu-west-1 tasks are configured to write cross-region and their connection pool is exhausted. A junior engineer says the pool size was raised from 20 to 200 yesterday "to handle Black Friday".`,
        choices: [
          { text: 'Form the hypothesis: the pool increase multiplied cross-region connections until Aurora\'s max_connections was hit, starving EU tasks. Test it non-destructively (check DatabaseConnections vs max_connections in CloudWatch), then have Ops revert the pool setting via the config pipeline\'s expedited path.', d: 15, fb: 'Hypothesis, cheap test, targeted treatment through the pipeline, not by hand. And note the pool change is a config push that skipped canary: a root cause for the postmortem.' },
          { text: 'Ask the junior engineer why they made such a dangerous change.', d: -25, fb: 'Blame in the middle of an incident: information flow stops, and the engineer who knows the most about the change stops talking.' },
          { text: 'Raise Aurora max_connections to make room.', d: -10, fb: 'Treats the symptom with a change that is itself risky under load and takes minutes to apply. Reverting the known change is cheaper and safer.' }
        ] },
      { time: '10:05', text: `Pool setting reverted. Eu-west-1 error rate drops to 0.2%. You begin restoring traffic to eu-west-1 via Route 53. The team wants to go straight back to the normal 50/50 split.`,
        choices: [
          { text: 'Restore traffic progressively (10%, 30%, 50%) watching the SLIs and DatabaseConnections at each step; keep the incident open until the SLO is met for a stable period.', d: 12, fb: 'Recovery is a rollout too. A step-wise return catches a second cause hiding behind the first.' },
          { text: 'Flip to 50/50 now; the fix is proven.', d: -12, fb: 'The fix addressed one cause. Flooding the recovering region with full traffic is the fastest way to discover a second one.' },
          { text: 'Keep eu-west-1 drained until tomorrow.', d: -8, fb: 'Overly cautious: latency for EU users is worse cross-region all day, and the cause is fixed. Return progressively.' }
        ] },
      { time: '11:30', text: `Traffic fully restored, SLIs normal for 60 minutes. You close the incident. Total impact: 53 minutes of degraded checkout for EU users, about 38% of the monthly error budget. The engineering manager suggests skipping the postmortem "since we know what happened".`,
        choices: [
          { text: 'Schedule a blameless postmortem within 48 hours. Draft causes: cross-region writes by design (architecture), pool change deployed fleet-wide without canary (process), no alert on connection saturation (monitoring), and a detection gap (11 minutes before the burn-rate alert). Action items with owners.', d: 15, fb: 'The trigger is known; the root causes are systemic and multiple. The postmortem is where the next incident is prevented, and the error budget cost makes the action items easy to prioritise.' },
          { text: 'Skip it; write a short note in the channel.', d: -20, fb: 'The next pool tweak, or the next cross-region surprise, is now scheduled for a future Black Friday.' },
          { text: 'Hold the postmortem and make it clear who caused it so it never happens again.', d: -25, fb: 'That is a trial, not a postmortem. Nobody will volunteer information at the next one.' }
        ] }
    ],
    win: `Fifty-three minutes of partial degradation on the worst possible day, and the SLO survived the month. The response worked because someone took command, mitigation came before diagnosis, changes went through the pipeline, and the debrief targeted systems rather than people.

**Takeaway:** the incident commander's job is to make the incident boring: roles, a document, a cadence, and a hypothesis at a time.`,
    lose: `The outage spread, stakeholders got misinformation, or the team learned nothing. Typical failure paths: debugging instead of commanding, investigating before mitigating, a status page that lied, blame mid-incident, or skipping the postmortem.

Revisit lessons 4.1, 4.3 and 4.4 and retry.`
  }
});
