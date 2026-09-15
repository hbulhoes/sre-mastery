/* World 3 — Change: automation, release engineering, simplicity */
window.SRE_WORLDS = window.SRE_WORLDS || [];
window.SRE_WORLDS.push({
  id: 'w3',
  title: 'Change Without Fear',
  subtitle: 'Automation, release engineering, canarying and configuration: most outages start with a change.',
  badge: 'Release Captain',
  intro: `Roughly 70% of outages are triggered by a change to a running system (the SRE book's oft-quoted figure). This world is about making change safe rather than rare: the hierarchy of automation, hermetic and self-service releases, progressive rollouts with real canary analysis, and the surprisingly dangerous topic of configuration. Sources: SRE book chapters 7, 8 and 9; workbook chapters 14, 15 and 16.

The boss is a bad push: a config change that looks harmless until it isn't.`,

  lessons: [
    {
      id: 'w3l1', title: 'The evolution of automation', minutes: 9, source: 'SRE book ch.7',
      summary: 'Why automate, the five-level hierarchy, and how automation itself can hurt you.',
      body: `## The value of automation

The book lists benefits beyond "saves time": **consistency** (humans make different mistakes each time; scripts make the same one, which is fixable), **a platform** (automation can be extended, measured and reused), **faster repairs** (a system that fixes itself has lower MTTR), **faster action** (machines act in milliseconds), and **time savings** (the obvious one, and the least important).

The subtle point: the value of automation compounds. A team that automates turn-up can then automate turn-down, then failover, then capacity moves. A team that does everything by hand cannot get to any of those.

## The hierarchy

[[diagram:automation-ladder]]

Google's history follows this ladder: from operators running commands, to shared scripts, to generic tooling like Prodtest (a unit-test framework for datacenter configuration) and turn-up automation, to Borg (the cluster manager) making most of the earlier automation unnecessary. The target is the top rung: a system designed so that the failure mode does not exist, so nothing needs to be automated.

## Case study: cluster turn-up

Turning up a new cluster used to be a hundreds-of-steps checklist. Google's path: encode each step as a test (Prodtest, "does this config match reality?"), then make the tests fix what they find (idempotent turn-up), then have the cluster manager provision from a specification. Each stage removed a class of human action and a class of human error.

## Case study: the Diskerase incident

An automation that erased disks in preparation for reinstall was given an empty list of machines because of a bug in a query. The automation interpreted "no machines listed" as "all machines" and wiped a serving cluster. Lessons the book draws:

- Automation must **fail safe**: an empty target list should abort, not broaden scope.
- Rate limits and blast-radius checks belong in the tool, not in the operator's head.
- Automation propagates errors as fast as it propagates fixes.

## Reliability is the fundamental feature

When automation becomes the mechanism by which the system operates (self-healing, autoscaling), a bug in it is an outage. Treat automation as production software: tests, reviews, canaries, rollbacks. The book's warning about "automation-induced skill atrophy" is also real: if operators never do the manual procedure, they cannot do it when the automation fails. Keep the manual path documented and exercised.

> [aws]**On AWS.** The ladder maps directly: console clicks (1) → team shell scripts (2) → SSM Automation documents and Ansible/Terraform (3) → EventBridge rules invoking SSM Automation or Lambda when a CloudWatch alarm fires, Auto Scaling, AWS Config auto-remediation (4) → managed services that eliminate the failure mode (RDS Multi-AZ failover, Aurora Serverless, S3 durability) (5). Guardrails for the Diskerase lesson: require explicit resource lists, use IAM conditions to restrict what automation may touch, tag-scoped permissions, and dry-run modes. Test automation in a sandbox account with the same IAM boundaries as production.

## When not to automate

- The task is genuinely one-off and cheap.
- The system is about to be replaced.
- The automation would be more complex than the manual task and used rarely (keep a documented procedure instead).
- You cannot make it fail safe. Then, automate the check but leave the action to a human.`,
      exercises: [
        { type: 'order', q: 'Arrange the levels of the automation hierarchy from lowest (least automated) to highest.', items: ['No automation: a human performs every step', 'Externally maintained, system-specific scripts', 'Externally maintained, generic tooling', 'Internally maintained, system-specific automation', 'Systems that do not need automation'], explain: 'The ladder climbs from manual work through shared tooling to systems where the failure mode no longer exists.' },
        { type: 'mcq', q: 'What is the primary lesson of the Diskerase incident?', choices: ['Never automate disk operations', 'Automation must fail safe: ambiguous or empty inputs should abort, and blast-radius limits belong in the tool', 'Queries should be written in SQL', 'Only senior engineers should run automation'], answer: 1, explain: 'An empty target list was interpreted as "everything". Scope checks and rate limits inside the tool prevent that class of error.' },
        { type: 'mcq', q: 'Which of these is the least important benefit of automation according to the book\'s discussion?', choices: ['Consistency', 'Faster repairs', 'A platform to build on', 'Raw time savings'], answer: 3, explain: 'Time saved is the obvious benefit, but consistency, speed of repair and the compounding platform effect matter more.' },
        { type: 'mcq', q: 'An AWS team has a CloudWatch alarm that triggers an EventBridge rule, which runs an SSM Automation document to replace an unhealthy instance. Which rung of the ladder is that?', choices: ['Level 2: externally maintained, system-specific scripts', 'Level 3: externally maintained, generic tooling', 'Level 4: internally maintained, system-specific automation', 'Level 5: no automation needed'], answer: 2, explain: 'The system detects and acts on its own condition without a human. Level 5 would be a managed service where unhealthy instances are not your problem at all.' }
      ]
    },

    {
      id: 'w3l2', title: 'Release engineering', minutes: 9, source: 'SRE book ch.8',
      summary: 'Hermetic builds, self-service pipelines, policy enforcement and why releases are a discipline.',
      body: `## A discipline, not a chore

Google treats release engineering as a specialty: people who understand build systems, packaging, configuration management, deployment and the interaction of all four. The book's philosophy has four parts.

- **Self-service.** Product teams control and run their own releases. Release engineering builds the tooling and policy; it does not push buttons for other teams. Anything else becomes a bottleneck and a source of toil.
- **High velocity.** Frequent releases mean fewer changes per release, which makes testing and troubleshooting easier and rollbacks cheaper. "Push on green" (deploy every build that passes tests) is a valid strategy for many services.
- **Hermetic builds.** A build is insensitive to the libraries and tools installed on the build machine. Same source revision, same output, on any machine, at any time. This is what makes a rollback trustworthy and a cherry-pick reproducible.
- **Enforcement of policies and procedures.** Who may release, what must be reviewed, which tests gate which stage. Enforced by the pipeline, visible in an audit trail, not by convention.

## The pipeline in the book

Google's Rapid system: branch from a known-good revision (never build releases from head for long-lived services), build hermetically, run the test suite, package into a versioned, immutable artifact (MPM packages, signed and labelled), then deploy through canaries to full fleet. Cherry-picks go onto the release branch, and each is a new build with a new version.

Key properties to copy regardless of tooling:
- **Immutable, versioned artifacts.** You deploy the thing you tested, byte for byte.
- **A single path to production.** Emergency fixes go through the same pipeline, perhaps with fewer bake-time gates, not through an SSH session.
- **Rollback as a first-class action.** Rolling back is deploying a previous artifact, with the same automation and the same monitoring.

## Configuration management

The book distinguishes four ways to handle configuration: alongside the binary in the same package; in a separate package deployed together; as a separate versioned package; or read from an external store at runtime. Each is legitimate; what matters is that config changes are versioned, reviewed, rolled out progressively and revertible exactly like code. Lesson 3.5 covers this in depth.

## Start early

The book's advice to product teams: involve release engineering at the design stage. Budgeting for release tooling after launch produces a service that can only be deployed by its original authors.

> [aws]**On AWS.** A hermetic pipeline: CodeBuild (or GitHub Actions) building in a pinned container image, producing an immutable artifact (a container image in ECR with an immutable tag, an AMI via EC2 Image Builder, or a Lambda zip in S3 with a version). CodePipeline enforces stages and approvals; CodeDeploy performs blue/green or canary deployments to ECS, Lambda or EC2 with automatic rollback on alarm. Sign images (ECR image signing with Signer) and restrict deployment IAM roles so nothing reaches production outside the pipeline. Treat CloudFormation change sets as the review artifact for infrastructure changes. "Rollback" means "deploy the previous image tag", never "fix forward in the console".

## Smells

- Builds that pass on one machine and fail on another.
- A release that requires a specific person.
- Hotfixes applied by hand and then "backported" to source later.
- Config edited in place in production with no version.
- Rollback untested until the day it is needed.`,
      exercises: [
        { type: 'mcq', q: 'What does "hermetic build" mean?', choices: ['A build performed in a sealed datacenter', 'A build whose output depends only on the source revision and pinned toolchain, not on the state of the build machine', 'A build with no tests', 'A build produced by the release engineering team rather than developers'], answer: 1, explain: 'Hermeticity makes builds reproducible, which is the foundation for trustworthy rollbacks and cherry-picks.' },
        { type: 'multi', q: 'Which practices align with the book\'s release philosophy? Select all that apply.', choices: ['Product teams run their own releases with tooling built by release engineering', 'Deploying the exact artifact that passed testing', 'Emergency fixes applied via SSH and backported later', 'Frequent small releases rather than rare large ones', 'Policies enforced by the pipeline rather than by convention'], answers: [0, 1, 3, 4], explain: 'Self-service, immutable artifacts, high velocity and enforced policy. SSH hotfixes bypass the single path to production.' },
        { type: 'mcq', q: 'Why does the book advise branching a release from a known-good revision rather than building from head?', choices: ['Head is slower to build', 'Cherry-picking fixes onto a stable branch keeps unrelated in-flight changes out of the release, making it reproducible and easier to reason about', 'Git does not support building from head', 'Head is not covered by tests'], answer: 1, explain: 'A release branch isolates the release from the ongoing churn on the main line; fixes are added deliberately as new versioned builds.' },
        { type: 'mcq', q: 'On AWS, which practice most directly implements "rollback as a first-class action"?', choices: ['Keeping the previous container image in ECR and having CodeDeploy roll back automatically to it when a CloudWatch alarm fires during deployment', 'Taking an AMI snapshot before each deploy', 'Documenting the manual rollback steps in a wiki', 'Giving on-call engineers console access to fix forward'], answer: 0, explain: 'Rollback should be the same mechanism as deploy, automated and triggered by monitoring. Snapshots and wikis are not a mechanism.' }
      ]
    },

    {
      id: 'w3l3', title: 'Simplicity', minutes: 7, source: 'SRE book ch.9',
      summary: 'Boring is good, code is a liability, and APIs should be small.',
      body: `## Stability versus agility

The book frames the tension plainly: SRE works to keep a system stable and agile at the same time, and simplicity is what makes both possible. A simple system is easier to reason about when it breaks (stability) and easier to change (agility). Complexity is where these two goals start fighting.

## The virtue of boring

Boring is a feature. Surprises in production are bad; production software should behave predictably. The book distinguishes **essential complexity** (inherent in the problem: a web server needs to serve pages fast) from **accidental complexity** (introduced by the solution: a garbage-collection pause that could be engineered away). SREs push back on accidental complexity and expect a justification for anything added to the system they support.

## "I won't give up my code!"

Unused code, dead feature flags and speculative abstractions are liabilities: they must be read, built, tested and understood. The book's suggestion of a **negative lines of code** metric is only half a joke. Deleting code is engineering; the review for a deletion should be as celebrated as the review for a feature.

## Minimal APIs

Antoine de Saint-Exupéry via the book: perfection is reached not when there is nothing left to add, but when there is nothing left to take away. A small, well-defined API with few methods and arguments is easier to keep reliable, easier to monitor, and easier to change. Every optional parameter is a code path you must test and a behaviour you must preserve forever.

## Modularity

Loose coupling between binaries, and between binary and configuration, lets teams change parts independently. Versioned APIs let clients migrate on their own schedule. The book's point: modularity in the *system* is what allows small, frequent, safe releases at the *process* level.

## Release simplicity

Small releases are easier to measure, roll back and reason about. If a release with 100 changes causes a regression, finding it means bisecting 100 changes. If it has one, the search is over. Simplicity in the release process is the same virtue as simplicity in the code.

> [aws]**On AWS.** Accidental complexity accumulates in the account, not just the code: unused security groups, forgotten Lambda versions, three ways to deploy the same service, five overlapping IAM roles. Periodic deletion is reliability work. Prefer fewer, boring services you understand deeply over many novel ones. When a design review proposes a new component, the question is not "is it cool" but "which failure mode does it add, and who gets paged for it".

## A simplicity checklist for design reviews

- Which part of this is essential, and which is accidental?
- What is the smallest API that solves the problem?
- What can be deleted to make room for this?
- Can this be released in pieces?
- Who will understand this at 3 a.m.?`,
      exercises: [
        { type: 'mcq', q: 'What distinguishes essential from accidental complexity?', choices: ['Essential complexity is in the code; accidental is in the infrastructure', 'Essential complexity is inherent in the problem; accidental complexity is introduced by a particular solution and can be engineered away', 'Essential complexity is what SREs handle; accidental is for developers', 'There is no difference'], answer: 1, explain: 'SREs should expect a justification for accidental complexity and push to remove it.' },
        { type: 'mcq', q: 'Why does the book treat unused code as a liability rather than a harmless asset?', choices: ['It slows compilation', 'It must still be read, built, tested and understood, and it may contain paths that misbehave in production', 'It uses disk space', 'Auditors require its removal'], answer: 1, explain: 'Every line has a maintenance cost and a potential failure mode. Deletion is engineering work.' },
        { type: 'mcq', q: 'A release contains 80 unrelated changes and causes a latency regression. What simplicity principle would have made this cheaper to resolve?', choices: ['Minimal APIs', 'Release simplicity: smaller, more frequent releases make regressions easy to attribute and roll back', 'Modularity of binaries', 'Boring technology choices'], answer: 1, explain: 'Bisecting 80 changes is expensive; a release with one change is self-attributing.' },
        { type: 'tf', q: 'True or false: adding optional parameters to an API is a low-cost way to add flexibility, since callers who do not need them are unaffected.', answer: 1, explain: 'False. Every optional parameter is a code path to test, monitor and preserve indefinitely. Minimal APIs are more reliable.' }
      ]
    },

    {
      id: 'w3l4', title: 'Canarying releases', minutes: 11, source: 'SRE workbook ch.16',
      summary: 'Progressive rollouts, canary populations, metric selection and the analysis that decides go or no-go.',
      body: `## Why canary

A canary is a partial, time-limited deployment of a change, observed to decide whether the change is safe for everyone. It reduces the blast radius of a bad change from "all users" to "a small, deliberately chosen fraction of users for a short time". The workbook treats canarying as a **process**, not a feature of the deployment tool: it needs a plan, metrics, a decision rule and a rollback path.

[[diagram:canary]]

## Separate what changes at different rates

Components that change at different rates should be deployed and canaried separately: binaries, configuration, data (ML models, catalogues), and infrastructure. Bundling a config change with a binary release makes canary analysis ambiguous: which change caused the regression?

## The canary process

1. **Choose the canary population.** Large enough to produce statistically meaningful metrics, small enough that a failure stays within error budget. Representative of the whole (not just one region or one customer type). Typical progression: 1 task → 1 AZ → 1 region → global.
2. **Set the duration.** Long enough to see the effects the change could plausibly have: a memory leak needs hours; a latency regression shows in minutes. Cover at least one traffic cycle for changes that interact with load.
3. **Pick the metrics.** The workbook's criteria: the metric must **indicate problems**, be **representative and attributable** to the change, and be **sensitive** (react to a small population's problems) while not being so noisy that it fires on nothing. SLIs are the natural starting point; add resource metrics (memory, CPU, error logs) as leading indicators.
4. **Compare against a control.** Compare canary tasks against baseline tasks running the old version under the same traffic and the same time window, not against last week. Without a control, a traffic surge looks like a regression.
5. **Decide.** A pre-agreed rule: if canary error rate exceeds control by more than X, or p99 latency by more than Y, roll back automatically. Humans review borderline cases.

## Dependencies and isolation

If the canary shares dependencies with the baseline (a database, a cache), a bad canary can hurt the baseline population through those dependencies. Rate-limit what a canary may do to shared resources; watch dependency metrics during the canary too.

## Non-interactive systems

Batch jobs and pipelines cannot be canaried by traffic percentage. Options: run the new version on a fraction of the input and compare outputs; run both and diff; canary in a staging environment with production data. The decision rule is the same.

## Requirements on monitoring

Canary analysis needs metrics that are labelled by version so canary and control can be separated, at a resolution fine enough to see the canary period, with low enough latency to make the rollback decision quickly. Without version labels, canarying is guesswork.

> [aws]**On AWS.** CodeDeploy provides canary and linear deployment configurations for ECS and Lambda (for example <<Canary10Percent5Minutes>>, or custom percentages), with automatic rollback when specified CloudWatch alarms enter ALARM during the deployment. For ECS with an ALB, blue/green uses two target groups with weighted routing, which gives you a clean control population. Lambda aliases route a weight of traffic to a new version. For metric attribution, tag ECS tasks or Lambda versions and include the version as a metric dimension. Use a **CloudWatch composite alarm** over the canary's SLIs as the rollback trigger. For infrastructure changes, deploy stacks to one region or one AZ first (a cellular layout makes this natural; see World 7).

## Anti-patterns

- Canarying to 50% first: half your users are not a canary.
- No control group, so time-of-day effects masquerade as regressions.
- Judging by "no alerts fired" instead of comparing metrics.
- Bake time of 30 seconds for a change that leaks memory over hours.
- Canary in a region with no real users.`,
      exercises: [
        { type: 'mcq', q: 'Why compare canary metrics against a concurrently running control population rather than against last week\'s numbers?', choices: ['Last week\'s data is deleted', 'Traffic, time of day and dependency behaviour differ over time; a concurrent control isolates the effect of the change', 'Controls are cheaper', 'CloudWatch requires it'], answer: 1, explain: 'A concurrent control under the same traffic removes confounders. Comparing to history confuses "the change is bad" with "today is different".' },
        { type: 'multi', q: 'Which metric properties does the workbook require for canary analysis? Select all that apply.', choices: ['Indicates problems', 'Representative and attributable to the change', 'Sensitive enough to react to a small canary population', 'Available only after the deployment completes', 'Aggregated across all versions'], answers: [0, 1, 2], explain: 'Metrics must be problem-indicating, attributable and sensitive. They must also be labelled by version and available during the canary, not after.' },
        { type: 'mcq', q: 'A team bundles a configuration change with a binary release and canaries both together. The canary shows a latency regression. What is the process problem?', choices: ['Nothing; the canary worked', 'Components that change at different rates were bundled, so the regression cannot be attributed to one change without another cycle', 'Configuration should never be canaried', 'The canary was too small'], answer: 1, explain: 'Separate binaries, configuration and data into separate canaries so each result is attributable.' },
        { type: 'mcq', q: 'How long should a canary last for a change suspected of introducing a slow memory leak?', choices: ['Thirty seconds, to keep velocity high', 'Long enough for the leak to become visible in memory metrics, potentially hours, and ideally across a traffic cycle', 'Until the next release', 'One request'], answer: 1, explain: 'Duration must cover the effects the change could plausibly have. A leak needs hours; a routing change needs minutes.' },
        { type: 'mcq', q: 'On AWS, which mechanism gives a clean control population for an ECS service behind an ALB during a canary?', choices: ['Blue/green deployment with two target groups and weighted routing', 'Restarting all tasks at once', 'Deploying to a separate account', 'Using the Average latency statistic'], answer: 0, explain: 'Two target groups serving the same traffic mix let you compare old and new under identical conditions, with rollback as a weight change.' }
      ]
    },

    {
      id: 'w3l5', title: 'Configuration: design and safe rollout', minutes: 10, source: 'SRE workbook ch.14, 15',
      summary: 'Config is code that lies about being data. Design it, validate it, roll it out like a binary.',
      body: `## Why configuration is dangerous

Configuration changes bypass most of the safeguards built for code: they often skip tests, they can be applied instantly fleet-wide, and they are frequently edited under time pressure during incidents. A large share of the outages in the workbook's case studies are config pushes. Two chapters address it: how to design configuration, and how to deploy it.

## Configuration philosophy (workbook ch.14)

- **Configuration asks questions of the user.** Every knob is a question the operator must answer. Minimise the questions; make the defaults right for most users; distinguish **mandatory** questions (what must be set) from **optional** tuning.
- **Optimise for the reader**, not the writer. Config will be read during outages far more often than written.
- **Separate config from code**, but keep it versioned, reviewed and testable like code. A change to a config file should have a diff, a reviewer, and a rollout.
- **Ownership.** Each config value has an owner who understands its effect. Orphaned settings are a hazard.
- **Guard against the "everything is a knob" design.** Exposing internals as tunables invites operators to work around bugs instead of fixing them, and creates combinations nobody tested.

## Configuration specifics (workbook ch.15)

- **Validate before applying.** Syntax, schema, and semantic checks (does this reference an existing resource; is this timeout shorter than the caller's deadline).
- **Test configuration.** Unit tests for config (the Prodtest idea from lesson 3.1), and integration tests that load the config into the real binary.
- **Roll out progressively**, exactly like a binary: canary, observe, expand, with rollback. "It's just a config change" is the most expensive sentence in operations.
- **Make it revertible**: keep the previous version, and make rollback a one-step action.
- **Version-pin what the config references** (image tags, schema versions) so a config rollback is coherent.
- **Beware of config that changes behaviour in a loop**: a config-driven autoscaler pushed fleet-wide can amplify a mistake instantly.

## Feature flags

Flags are config with a shorter lifetime. The same rules apply, plus: flags must have an owner and a removal date; long-lived flags become undocumented configuration; flag evaluation must be cheap and fail safe (a missing flag service should not take the site down: default to the last known value).

> [aws]**On AWS.** AWS AppConfig exists for this problem: it stores configuration and feature flags with **validators** (JSON Schema or Lambda), and deploys them using **deployment strategies** (percentage of targets over a bake time) with automatic rollback when a CloudWatch alarm fires during the deployment. Parameter Store and Secrets Manager handle simpler values and secrets, with versioning. For infrastructure config, CloudFormation change sets give a diff before apply, and stack policies limit what a change may touch. Never edit a running task definition, Lambda environment variable or security group by hand in production; that is an unversioned config push.

## A config change checklist

1. Is there a diff, and has someone else read it?
2. Was it validated against a schema and loaded by the binary in a test?
3. Does the rollout go to a canary first, with a bake time and a decision rule?
4. Is the previous version one action away?
5. Who owns this value, and is the effect documented where the on-call engineer will find it?`,
      exercises: [
        { type: 'mcq', q: 'Why does the workbook argue that configuration changes deserve the same rollout discipline as binary changes?', choices: ['Because config files are larger than binaries', 'Because config changes can alter behaviour fleet-wide instantly while bypassing tests and review, which makes them a leading cause of outages', 'Because compliance requires it', 'Because config cannot be rolled back'], answer: 1, explain: 'Config skips most safeguards by default. Canarying, validation and one-step rollback restore them.' },
        { type: 'multi', q: 'Which of these are recommended practices for configuration? Select all that apply.', choices: ['Validate against a schema and semantic checks before applying', 'Expose every internal tunable so operators can adapt quickly', 'Optimise the format for readers rather than writers', 'Give each value an owner', 'Roll out progressively with rollback'], answers: [0, 2, 3, 4], explain: 'Everything-is-a-knob creates untested combinations and invites working around bugs. The rest are the workbook\'s core recommendations.' },
        { type: 'mcq', q: 'A feature-flag service becomes unreachable. What is the fail-safe behaviour for the application?', choices: ['Crash, so the outage is visible', 'Treat all flags as enabled', 'Use the last known flag values (or the compiled-in defaults) and continue serving', 'Stop serving until the flag service returns'], answer: 2, explain: 'Flag evaluation must be cheap and fail safe. A configuration dependency should never be able to take the site down.' },
        { type: 'mcq', q: 'Which AWS service provides validators plus percentage-based deployment strategies with alarm-triggered rollback specifically for configuration and feature flags?', choices: ['AWS AppConfig', 'AWS Config', 'AWS Systems Manager Parameter Store', 'Amazon EventBridge'], answer: 0, explain: 'AppConfig is built for progressive, validated configuration rollout. AWS Config (a different service) audits resource compliance; Parameter Store stores values but does not roll them out progressively.' }
      ]
    }
  ],

  boss: {
    id: 'w3boss', title: 'The Bad Push', tagline: 'A one-line config change. What could go wrong.',
    intro: `You are on-call for **Search**, a query API on ECS behind an ALB, with an Elasticsearch-compatible cluster behind it. SLO: 99.9% of queries succeed within 800 ms, 30-day window. Budget remaining: 62%.

A developer wants to ship a change to the query timeout config: from 2000 ms down to 400 ms, "to stop slow queries from hogging threads". Configuration is stored in AppConfig and deployed by a pipeline. Play the change through.`,
    steps: [
      { time: '14:05', text: `The pull request changes a single value in the config JSON: <<"backend_timeout_ms": 2000 → 400>>. The description says "low risk, config only". The pipeline's config stage currently deploys to 100% of tasks immediately, no bake time.`,
        choices: [
          { text: 'Before approving, ask what fraction of successful queries currently take longer than 400 ms (from the latency histogram), and require the change to go through a canary deployment strategy with a bake time.', d: 15, fb: 'Correct: a timeout is a policy that turns slow successes into failures. Check the histogram first; a 400 ms timeout with a p95 of 600 ms would fail 5% of queries. Then treat it as a real rollout.' },
          { text: 'Approve. It is a one-line config change with an obvious intent.', d: -25, fb: '"Config only" is the most expensive sentence in operations. Fleet-wide, instantly, untested.' },
          { text: 'Reject: timeouts should never be changed.', d: -10, fb: 'The intent (protect threads from slow queries) is legitimate. The job is to make the change safe, not to block it.' }
        ] },
      { time: '14:30', text: `The histogram shows about 1.8% of successful queries take over 400 ms, mostly complex facet queries from one enterprise customer. The developer proposes 400 ms anyway: "those queries are abusive".`,
        choices: [
          { text: 'Point out that 1.8% failures would be 18× the error budget rate; propose a timeout around p99.5 (roughly 900 ms) plus a separate per-customer concurrency limit for the heavy tenant, and validate the value against the caller\'s own deadline.', d: 15, fb: 'Timeouts must be set from data, and the per-tenant problem is a per-tenant control (quotas or a separate pool), not a global timeout that breaks everyone with legitimate slow queries.' },
          { text: 'Agree to 400 ms because the customer is being abusive.', d: -25, fb: 'You just planned an SLO breach. 1.8% errors against a 0.1% budget exhausts 30 days of budget in under two days.' },
          { text: 'Set it to 400 ms but only for that customer.', d: 0, fb: 'Closer to a per-tenant control, but a per-customer timeout still converts their legitimate slow queries into errors that count against your SLO. Concurrency limits or a separate pool are cleaner.' }
        ] },
      { time: '15:10', text: `Agreed: timeout 900 ms, and a tenant concurrency limit later. You configure the AppConfig deployment strategy. Options on the table.`,
        choices: [
          { text: 'Deploy to 10% of tasks with a 20-minute bake, monitored by a composite alarm on the SLIs (error rate and p99 latency, canary vs baseline), with automatic rollback if the alarm fires. Then 50%, then 100%.', d: 15, fb: 'A real canary: small population, meaningful bake time, SLI-based decision rule, automated rollback. Version-labelled metrics make the comparison possible.' },
          { text: 'Deploy to 100% with a 5-minute bake and watch the dashboard.', d: -20, fb: 'A 100% deployment is not a canary, and "watch the dashboard" is not a decision rule.' },
          { text: 'Deploy to 1 task and watch for 1 minute, then go to 100%.', d: -10, fb: 'One task for one minute produces almost no signal on a 0.1% budget, and the jump to 100% skips the stages that would catch a partial problem.' }
        ] },
      { time: '15:35', text: `Canary at 10%. The composite alarm shows: error rate canary 0.04% vs baseline 0.03%; p99 latency canary 720 ms vs baseline 1450 ms. Thread-pool saturation on canary tasks dropped from 85% to 40%.`,
        choices: [
          { text: 'Proceed to 50%: error rate is within noise of baseline, latency improved as intended, and the saturation signal confirms the mechanism. Keep the bake time for the next stage.', d: 12, fb: 'The data supports the change on all chosen metrics and the effect is explained. Continue the staged rollout without skipping bake times.' },
          { text: 'Roll back: the error rate went up.', d: -8, fb: '0.04% vs 0.03% on a 10% canary over 20 minutes is noise; the decision rule should have a threshold well above that. Rolling back on noise trains people to ignore the rule.' },
          { text: 'Jump straight to 100%; the canary looks great.', d: -15, fb: 'The 50% stage exists to catch effects that only appear at scale (shared dependency load, cache behaviour). Skipping it discards the cheapest information you have.' }
        ] },
      { time: '16:40', text: `At 50%, the ALB shows a small spike in 5xx from a single AZ for two minutes, then it recovers. The composite alarm did not fire. A developer says: "Unrelated; that AZ had a node replacement. Push to 100%."`,
        choices: [
          { text: 'Pause the rollout, verify the spike correlates with the node replacement event (and not the config version dimension) before proceeding, and note it in the change log.', d: 12, fb: 'Attribution is the whole point of canary analysis. Five minutes to check the version dimension against the AZ event keeps the rollout decision evidence-based.' },
          { text: 'Push to 100% on the developer\'s word.', d: -15, fb: 'Maybe it was the node replacement. Or maybe the timeout interacts with that AZ\'s slower storage. You will not know until 100% of users find out.' },
          { text: 'Roll back to 0% immediately.', d: -5, fb: 'Defensible but expensive: the alarm did not fire and there is a plausible explanation to verify first. Pause, check, then decide.' }
        ] },
      { time: '17:20', text: `Verified: the spike was the node replacement (same spike on baseline tasks in that AZ). Rollout completes to 100%. The developer now wants to change the AppConfig deployment strategy back to "100%, no bake" for future config changes "because most changes are trivial".`,
        choices: [
          { text: 'Keep the staged strategy as the default for all config, with a documented expedited path (smaller bake, still canaried) for emergencies. Add a validator so out-of-range timeouts are rejected before deployment.', d: 15, fb: 'The safe path must be the default path. Validators catch the next fat-finger; the expedited path keeps emergencies from bypassing the process entirely.' },
          { text: 'Agree: staged rollouts for config are overhead.', d: -25, fb: 'You have just re-armed the exact failure mode this scenario was about, for every future config change.' },
          { text: 'Require manual SRE approval for every config change instead.', d: -10, fb: 'That is a human gate that becomes toil and a bottleneck. Automated validation and staged rollout scale; approvals do not.' }
        ] }
    ],
    win: `The timeout change shipped, cut thread-pool saturation in half, and cost no error budget. The difference between this and an outage was treating a one-line config change as a change: data before deciding the value, a canary with a decision rule, attribution before proceeding, and a safe default path for the next one.

**Takeaway:** the question is never "is this change small"; it is "how fast can it hurt everyone, and how fast can I undo it".`,
    lose: `The "harmless" config push breached the SLO or left the pipeline unsafe for the next one. Typical failure paths: approving on "config only", setting a timeout from opinion instead of the latency histogram, deploying fleet-wide, skipping stages, or reverting the pipeline to instant 100% rollouts.

Revisit lessons 3.4 and 3.5 and retry.`
  }
});
