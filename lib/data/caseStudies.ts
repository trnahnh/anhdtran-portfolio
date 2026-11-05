/**
 * Case studies: Problem → What I built → Results → Lessons.
 *
 * Every number here is traced to the project's own repo (docs/METRICS.md and
 * friends), and each one carries the conditions it was measured under. Where
 * a project loses, or a headline number does not hold up, the study says so:
 * the reader is an engineer who will click through to the repo.
 *
 * A private repo has no link, so its study says where the numbers come from
 * instead (sourceNote): the reader should know they cannot check them.
 */

export interface CaseStudy {
  slug: string;
  title: string;
  /** One sentence under the title. */
  summary: string;
  repo?: string;
  /** Shown in place of the source link when the repo is private. */
  sourceNote?: string;
  live?: string;
  problem: string[];
  /** The path a request (or an order) takes, one box per step. */
  flow: { label: string; detail: string }[];
  built: string[];
  /** Alternatives considered, and why not. */
  rejected: { option: string; reason: string }[];
  results: { value: string; label: string; context: string }[];
  resultNotes: string[];
  lessons: string[];
  next: string;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "kiln",
    title: "Kiln-IDP",
    summary:
      "An internal developer platform: a request goes in, a hardened resource comes out, and a cost-aware scheduler keeps latency-critical work off capacity that can vanish.",
    repo: "https://github.com/trnahnh/kiln",
    live: "https://kiln-idp.vercel.app/",
    problem: [
      "Without a platform layer, a team gets infrastructure one of two ways. They file a ticket with a platform engineer, which takes hours to days and waits on a person being free. Or they write the Terraform and kubectl themselves, which is fast and inherits every way there is to get security, cost and reliability wrong.",
      "Neither path leaves a real audit trail for when compliance asks who provisioned what. And neither knows that a latency-sensitive service should never land on spot capacity, which is cheap precisely because the provider can take it back at any moment.",
    ],
    flow: [
      { label: "API", detail: "Spring Boot · RS256 JWT, role check" },
      { label: "Policy gate", detail: "Kyverno at admission, fail-closed" },
      { label: "Provision", detail: "Crossplane v2 + ArgoCD + operator" },
      { label: "Schedule", detail: "kiln-scheduler CostAware plugin" },
      { label: "Deliver", detail: "Istio canary, sequential-test rollback" },
      { label: "Audit", detail: "Kafka → Postgres hash chain" },
    ],
    built: [
      "Every request is authenticated, checked against policy before anything is composed, provisioned through GitOps, and traced end to end as a single OpenTelemetry trace. Every subsystem publishes to one Kafka audit topic, and only the audit service can write the table, which is a hash chain, so a missing or edited row shows.",
      "The scheduler is a kube-scheduler plugin. A pod's workload class comes from a label: latency-sensitive, standard or batch. The guarantee is a Filter, not a score: a latency-sensitive pod sees spot nodes as unschedulable, so no weighting can trade it away. Only then does scoring run: 50% cost, 30% packing (with a penalty for stranding GPUs), 20% preemption risk.",
      "Both defaults fail safe. A pod with no class is treated as latency-sensitive. A node with no pricing is treated as on-demand at the highest known cost.",
      "Around it: a canary controller that decides with a Wald sequential probability ratio test and CUSUM change detection instead of a fixed per-window threshold, and a chaos controller whose faults are held by a lease, so a crashed controller cannot leave a fault running.",
    ],
    rejected: [
      {
        option: "Karpenter",
        reason: "decides which nodes exist, not which node a pod lands on",
      },
      {
        option: "Affinity and taints",
        reason: "can only filter; there is no cost term to optimize",
      },
      {
        option: "Argo Rollouts / Flagger",
        reason: "judge each window against a threshold rather than accumulating evidence",
      },
      {
        option: "Chaos Mesh / Litmus",
        reason: "no lease, so a fault outlives a crashed controller",
      },
    ],
    results: [
      {
        value: "0",
        label: "latency-class tasks on spot",
        context:
          "57,012 replayed placements (521 latency-class) on 12,477 machines from the public Google 2011 cluster trace, at every spot fraction. The default scheduling model put 138–384 there.",
      },
      {
        value: "11s",
        label: "p50 self-service provisioning",
        context: "16s p95, n=10, on a kind cluster in CI.",
      },
      {
        value: "2.8%",
        label: "worst false-rollback rate",
        context: "1,000 simulated canary rollouts per traffic class.",
      },
      {
        value: "3m58s",
        label: "1,000 rollouts promoted",
        context:
          "Previously hit a 12-minute timeout, until the controller-runtime 20 qps / 30 burst client limit was lifted.",
      },
    ],
    resultNotes: [
      "The cost result is the one to read carefully. On an empty cluster kiln billed 91.8% less, but the trace's cluster is already 92% full, and there the saving is 0%. The empty-cluster figure is an upper bound, not a result. The guarantee is the headline, not the savings.",
      "The 57,012-placement replay exercises the scoring model. The real kube-scheduler binary with the plugin was run on the same trace against an empty cluster only (0 latency-class on spot, against 257 for the default); the full-cluster binary run did not finish.",
      "The trace has no prices. Half the machines were labelled spot at synthetic prices, and priority 9 and above was mapped to latency-sensitive.",
    ],
    lessons: [
      "Make the safety property a filter, not a weight. Anything that can be scored can be outscored.",
      "Report the number that holds under realistic conditions. The 91.8% looked like the headline until the replay ran against the cluster as it really was.",
      "Write down where the system loses. The canary controller's own report lists 7.5% false rollbacks on retry storms and 27.9% missed regressions on heavy-tailed latency.",
    ],
    next:
      "An Ed25519-signed external anchor for the audit hash chain, and running the GKE configuration that is written but has never been applied.",
  },
  {
    slug: "commma",
    title: "Commma",
    summary:
      "A coding-activity tracker with 600+ downloads, and the concurrency and crash tests that showed its totals could be counted twice or lost, until an advisory lock and an outbox made them exact.",
    sourceNote:
      "The source is private. Every number here comes from its architecture decision records, its metrics doc and the saved output of the tests described below.",
    live: "https://commma.dev/",
    problem: [
      "Commma's numbers are its product. Coding time drives the streaks, the leaderboards and the weekly recap, and people compare them with each other. A total that is wrong in either direction is the bug users notice and take personally.",
      "A VS Code extension sends activity in batches. Every five minutes an aggregator on the API turns finished stretches of it into sessions and adds their seconds to a Redis leaderboard. The design record called that aggregator idempotent. It was, for one run at a time. Nothing had checked two runs at once, or a crash halfway through.",
    ],
    flow: [
      { label: "Capture", detail: "VS Code extension · key labels, never content" },
      { label: "Ingest", detail: "Hono + Zod · rate cap, privacy enforced" },
      { label: "Events", detail: "Postgres hot table, drained as it is used" },
      { label: "Aggregate", detail: "every 5 min · 15-min idle gap ends a session" },
      { label: "Finalize", detail: "advisory lock per user, one transaction" },
      { label: "Leaderboard", detail: "outbox → absolute ZADD in Redis" },
    ],
    built: [
      "The extension counts keystrokes by label (a letter, a digit, a modifier) and never records what was typed. The API enforces each user's privacy mode at ingest, so a user on the summary mode never has file paths or key counts stored, whatever a client sends. Raw events land in a Postgres table that is emptied as they become sessions, so it stays bounded.",
      "Aggregation runs inside the API process on a five-minute interval, not through a queue. A session ends after 15 idle minutes, and only ended sessions are finalized: one transaction per user writes the session, its languages, files, heatmap and streak, and deletes the events it used.",
      "Each user's finalize now starts with pg_try_advisory_xact_lock on a hash of the user id and re-reads that user's events inside the transaction. A second scanner that cannot take the lock skips the user this cycle instead of waiting; the holder finishes it.",
      "The leaderboard sits behind an outbox. A session is inserted with leaderboard_pending set, in the same transaction. At the end of each cycle the scanner recomputes each affected user's total for the period from Postgres, writes that absolute value to Redis, and clears the flag. Replayed after a crash, it writes the same number again instead of adding it twice.",
    ],
    rejected: [
      {
        option: "BullMQ",
        reason:
          "an idle worker polls Redis nonstop, enough to spend the free tier's ~500K monthly commands before a single job runs",
      },
      {
        option: "ZINCRBY inside the transaction",
        reason: "a crash after the Redis write and before the commit double-counts on retry",
      },
      {
        option: "A blocking advisory lock",
        reason: "also correct, but stacks scanners behind one slow user; skipping never waits",
      },
      {
        option: "Rebuilding the leaderboard on a schedule",
        reason: "scans every session ever written, so its cost grows with history",
      },
    ],
    results: [
      {
        value: "0 of 50",
        label: "trials with duplicate sessions",
        context:
          "Two and then four concurrent scanners, 400 users, 1,220 expected sessions. Before the lock: 2,390 written, 1,170 of them duplicates, in all 50 trials.",
      },
      {
        value: "0 of 40",
        label: "crash trials with leaderboard drift",
        context:
          "The aggregator killed with SIGKILL mid-run, 20 users per trial. Before the outbox: 35 of 40 drifted, losing 91,841 seconds of coding time between them.",
      },
      {
        value: "-70%",
        label: "privacy lookup per ingest",
        context:
          "42 ms to 13 ms p50, measured server-side on prod, by serving each user's mode from Redis instead of reading Postgres on every request.",
      },
      {
        value: "0",
        label: "server errors under load",
        context:
          "4,500 ingest requests carrying 271,200 events against the live API on a t4g.small, then reads at about 155 ms p95 server-side.",
      },
    ],
    resultNotes: [
      "Both correctness numbers come from integration tests against Postgres and Redis, run before and after each fix. The concurrency test runs 50 trials of 400 users. The crash test kills the process at a different point in each of 40 trials, then checks every user's leaderboard score against the sum of their sessions.",
      "Even before the fix, the crash test never lost or duplicated a session in Postgres: each user's finalize is one transaction. All the drift was in Redis, where ZINCRBY ran after the commit, and it only ever lost time. The outbox closes that gap, and because the write is an absolute total, a retry cannot overshoot either.",
      "The cache had a race of its own. A read that started before a privacy change could finish after it and put the old mode back for up to 60 seconds. Writing the new value on change, and filling the cache only when the key is empty, took that window to 0 in the test written for it.",
      "The load test is the weakest number here. It ran from my laptop, so its latencies include about 100 ms of network. Ingest levelled off near 95 requests a second, which looked like the server's ceiling, but it was my upload bandwidth: smaller batches reached about 340 a second, and the server never went above 25% CPU. Raising the database pool from 10 to 25 connections gave 2.3x the throughput when every query crossed the internet, and nothing on the real server, which sits in the same region as its database. The real ceiling is still unmeasured.",
      "Two smaller checks. The extension adds about 0.6 µs per keystroke (p99 about 2 µs over 200,000 keystrokes) and activates in about 40 ms. A property test planted a secret in 9,000 random editing sessions, 361,455 edits in all, and no outgoing request ever contained it.",
    ],
    lessons: [
      "Idempotent for one run is not idempotent. The design record said re-runs were safe; nothing had run two at once until a test did, and every trial failed.",
      "Two stores and one commit need an outbox. Any write that happens after the commit can be lost by a crash between them, and making the write absolute instead of incremental is what makes the retry safe.",
      "A cache fill can race its own invalidation. Deleting the key on change was not enough while a slower read was still in flight.",
      "Find out what the load generator is measuring before calling anything a ceiling. Two of my numbers, a throughput cap and a pool-size win, were properties of my laptop.",
    ],
    next:
      "An in-region load generator to find the real ingest ceiling, a leaderboard drift check that runs in production and not only in tests, and aggregation in its own worker once more than one API instance runs.",
  },
  {
    slug: "ferrox",
    title: "Ferrox",
    summary:
      "An LMAX-inspired order matching engine in Rust, built one phase at a time with a benchmark proving each optimization, then ported in part to C++20 to measure what memory ordering really costs.",
    repo: "https://github.com/trnahnh/ferrox",
    live: "https://ferrox-engine.vercel.app/",
    problem: [
      "A matching engine sits at the core of every exchange, and its microseconds translate directly into money. The common ways to make one slow are well known: floating-point prices, a heap allocation on every order, lock-based concurrency, and naive structures like a HashMap of queues.",
      "The goal was to fix each one in its own phase, with a benchmark before and after, against a stated target: sub-50µs P99 at more than 1M orders a second, with zero allocation on the hot path.",
    ],
    flow: [
      { label: "Decode", detail: "TCP · fixed-size binary messages" },
      { label: "Ring", detail: "lock-free SPSC, Disruptor-style" },
      { label: "WAL", detail: "mmap append + CRC32, before matching" },
      { label: "Match", detail: "price-time FIFO order book" },
      { label: "Publish", detail: "UDP multicast, sequenced reports" },
    ],
    built: [
      "Two threads. One decodes fixed-size little-endian messages (a new order is 40 bytes, a cancel 16) and pushes them through a lock-free single-producer ring buffer. The other appends each command to a memory-mapped write-ahead log, then matches, then publishes a 48-byte execution report with a sequence number so subscribers can detect gaps. A snapshot every 10,000 commands bounds replay time.",
      "Prices are i64 ticks. Orders live in a pre-allocated arena of one million 64-byte, cache-line-aligned nodes, linked into an intrusive list per price level, so a cancel is an O(1) unlink. Price levels sit in a BTreeMap with the best bid and ask cached, so finding the next best price after a cancel is O(log n) instead of a scan.",
      "The ring buffer was then ported line for line to C++20 with the same compile-time switches, to measure each design choice in both languages: the memory ordering, whether the two cursors share a cache line, whether each side caches the other's cursor, and the bounds check.",
    ],
    rejected: [
      { option: "f64 prices", reason: "rounding in a system that must be exact; i64 ticks instead" },
      {
        option: "HashMap + VecDeque book",
        reason: "O(n) cancels and an O(n) best-price recompute",
      },
      { option: "SeqCst ordering", reason: "5.4–6.0x slower, for a guarantee SPSC does not need" },
      {
        option: "Removing the bounds check",
        reason: "costs nothing measurable across threads, so it stays",
      },
    ],
    results: [
      {
        value: "4.7M",
        label: "simulated orders/sec",
        context: "63% filled / 37% resting, on a Ryzen 7 7735HS laptop.",
      },
      {
        value: "1.06µs",
        label: "worst P99 per order",
        context:
          "P50 130–210 ns, P99 832–1,062 ns, P99.9 1.4–1.7 µs over 990K orders, TSC clock. The target was 50 µs.",
      },
      {
        value: "-85%",
        label: "worst-case cancel latency",
        context: "cancel_best_level, −82% to −85% from the HashMap-to-BTreeMap swap.",
      },
      {
        value: "5",
        label: "allocations per 990K orders",
        context: "1,936 bytes in all, every one a BTreeMap node for a new price level.",
      },
    ],
    resultNotes: [
      "Memory ordering: Acquire/Release compiles to a plain mov on x86 in both languages; SeqCst becomes an xchg and is 5.4x slower in Rust and 6.0x in C++. Two cursors on one cache line cost 2x. The bounds check costs 10–25% in a single-threaded loop and nothing measurable across threads.",
      "Rust against C++: Rust is 10–17% faster on 48-byte cross-thread transfers (p ≤ 0.003) and ties on u64. C++ was 1.35–1.7x faster single-threaded. The cause was Arc's drop taking &mut self out of line, which stopped LLVM keeping the cursors in registers. Holding the Arc in a ManuallyDrop took push+pop from 2.752 ns to 1.610 ns (p = 1.4e-14, n = 40).",
      "Durability: a WAL append costs 56 ns; recovery takes 1.4 ms. Crash-fault injection (3,362 injected faults, 12 process kills) found two real defects, both fixed.",
    ],
    lessons: [
      "A gap between languages is a question, not an answer. The single-threaded gap looked like Rust's bounds checks; it was one out-of-line drop.",
      "Say where it stops. One instrument only, no fsync (so no durability against power loss), gaps detected but never retransmitted, and no benchmark yet on a quiet, pinned Linux machine.",
    ],
    next:
      "Kernel-bypass networking (AF_XDP or DPDK), multiple instruments, a FIX gateway, and hot-hot failover.",
  },
  {
    slug: "draft-thinker",
    title: "Draft-Thinker",
    summary:
      "A Go gateway that answers with a cheap model and escalates when that model's own token entropy says it is unsure, and the evaluation that showed where the savings really come from.",
    repo: "https://github.com/trnahnh/draft-thinker",
    live: "https://draft-thinker.vercel.app/",
    problem: [
      "Most applications send every request to a frontier model, whatever the request. That costs money (most queries could be answered by a model 10 to 50 times cheaper), it spends rate limit, and it widens the blast radius when one provider goes down.",
      "The hard part is knowing when the cheap model is good enough. A classifier on the prompt breaks when the traffic shifts. The bet here was to ask the cheap model itself: read its uncertainty token by token while it writes, and escalate only when it wavers.",
    ],
    flow: [
      { label: "Ingress", detail: "OpenAI-compatible, model: \"auto\"" },
      { label: "Cache", detail: "Qdrant semantic match, cosine ≥ 0.95" },
      { label: "Draft", detail: "gpt-4.1-nano, streamed, top-5 logprobs" },
      { label: "Entropy", detail: "10-token window against T = 2.0 bits" },
      { label: "Route", detail: "accept, or escalate to gpt-4.1" },
      { label: "Observe", detail: "decision header, Prometheus, Grafana" },
    ],
    built: [
      "A drop-in OpenAI-compatible gateway in Go. A request for model \"auto\" is checked against a semantic cache, then drafted by gpt-4.1-nano with the top five log-probabilities streamed for every token. The gateway computes the Shannon entropy of each token's renormalized top-5 distribution (at most log2 5, about 2.32 bits) and escalates to gpt-4.1 if any of the first ten tokens, or the ten-token window's mean, crosses 2.0 bits. That threshold came from a sweep from 1.0 to 2.5.",
      "Failures fall back in both directions: a drafter failure goes to the heavyweight, a heavyweight failure re-runs the drafter. Every response says how it was routed in a header, and the decision is exported to Prometheus.",
      "Around the gateway sits the part that turned out to matter most: a benchmark harness with an oracle, an always-drafter and an always-heavyweight baseline, random escalation at the same rate as the router, bootstrapped confidence intervals, held-out public benchmarks, and offline learned routers (logistic regression and gradient boosting) to test whether a better rule existed.",
    ],
    rejected: [
      {
        option: "Prompt classifiers",
        reason: "decide before the model has said anything, and break under distribution shift",
      },
      {
        option: "Python / LangGraph orchestration",
        reason: "replaced by a single Go service on the request path",
      },
      {
        option: "Streaming the draft to the client",
        reason: "an escalation would retract text the user had already read",
      },
      {
        option: "Speculative execution",
        reason: "fires on 70–89% of requests; cancelled calls could cost 80–88% of the all-heavyweight bill",
      },
    ],
    results: [
      {
        value: "-82.9%",
        label: "inference cost",
        context:
          "95% CI 79.6–86.0%, at 98.1% judged accuracy, on 519 prompts against sending everything to gpt-4.1.",
      },
      {
        value: "-83.9%",
        label: "random escalation, same rate",
        context:
          "Also 98.1% accurate. The savings are real, but the cheap drafter earns them, not the routing decision.",
      },
      {
        value: "0.45–0.57",
        label: "AUROC on public benchmarks",
        context:
          "How well token entropy flags a wrong draft on GSM8K, MMLU and ARC-Challenge; 0.5 is a coin flip.",
      },
      {
        value: "61.7%",
        label: "baseline ceiling, explained",
        context:
          "A confidence-threshold baseline could not save more. Traced to how the OpenAI API reports logprobs on 72 of 110 creative prompts; an open model shows no ceiling.",
      },
    ],
    resultNotes: [
      "The 98.1% is an LLM-as-judge score on 519 prompts I wrote, with gpt-4.1 grading drafts against its own answers. It says the cheap model's answers were judged equivalent, not that they were checked against ground truth.",
      "On 500 held-out prompts per public benchmark, the router scores 90.4% on GSM8K at an 81.9% cost cut, 78.2% on MMLU at 73.7%, and 93.0% on ARC-Challenge at 79.0%. On all three it is 0.2 to 1.0 points below random escalation at the same rate. The learned routers beat random by 0.8 to 3.0 points but do no better than the mean entropy of the whole answer.",
      "The semantic cache hit 0% of the project set and GSM8K and 1% of MMLU, where one of three hits served a wrong answer. Its lookup costs about 200 ms at p50, so on this traffic it adds latency rather than saving money.",
    ],
    lessons: [
      "Put a random baseline at the same operating point next to every headline. Without it, 82.9% read as a routing result.",
      "An uncertainty signal cannot route around errors it cannot see. All 11 bad drafts in the project set were written with low entropy: the model was confidently wrong.",
      "A ceiling can belong to the instrument. The baseline's 61.7% cap came from the API's logprob encoding, not from the method, and disappeared on a model served locally.",
    ],
    next:
      "A router over the whole trace instead of a prefix, calibration per route, measuring what cancelled calls are actually billed, and a cache hit rate taken from real traffic.",
  },
  {
    slug: "inyeon",
    title: "Inyeon (인연)",
    summary:
      "An agentic Git CLI that splits a working tree into commits, writes the messages, reviews the change and drafts the PR, and its first evaluation, which found four bugs that 245 passing tests had missed. All four are fixed.",
    repo: "https://github.com/suka712/inyeon-upstream",
    live: "https://inyeon-upstream.vercel.app/",
    problem: [
      "Every change ends in the same chores: cutting a messy working tree into commits that each do one thing, writing a message for each, reviewing the diff, and describing the pull request. None of it is hard, all of it is repetitive, and it is exactly the part that gets rushed.",
      "Inyeon runs that whole loop from the terminal in one command, with the model of your choice: a hosted one, or a local one for code that should not leave the machine.",
    ],
    flow: [
      { label: "CLI", detail: "Typer + Rich, diff cut at file boundaries" },
      { label: "Engine", detail: "hosted FastAPI backend, or in-process" },
      { label: "Pipeline", detail: "split → commit → review → PR" },
      { label: "Agents", detail: "LangGraph state graphs with error nodes" },
      { label: "Context", detail: "ChromaDB retrieval over the repo" },
      { label: "Models", detail: "OpenAI, Gemini or Ollama, streamed" },
    ],
    built: [
      "Seven agents, each a LangGraph state graph with conditional edges and its own error node: split, commit, review, PR, conflict resolution, changelog, and an orchestrator that routes a free-form request to the right one. The commit agent can ask to read files for context; those reads are sandboxed to the repository.",
      "Splitting has four strategies. Directory groups hunks by folder. Semantic embeds each hunk and clusters them (agglomerative, cosine distance, threshold 0.5). Conventional asks the model to classify each file by commit type. Hybrid, the default, groups by directory first and sub-clusters any group larger than three hunks.",
      "The same pipeline runs against a hosted backend or entirely in-process, behind one interface. It skips steps that cannot pay for themselves (no split for a single file, no review for a diff under 500 characters), and a failed review or PR step is skipped rather than failing the run.",
    ],
    rejected: [
      {
        option: "Remote-only execution",
        reason: "one pipeline interface now runs against the hosted backend or in-process",
      },
      {
        option: "Retrying on error-message text",
        reason: "replaced with retries keyed on status codes",
      },
      {
        option: "Failing the run when review or PR fails",
        reason: "those steps degrade to skipped, so the commit still lands",
      },
      {
        option: "Eager imports in the local engine",
        reason: "made lazy, so the CLI starts without loading every model client",
      },
    ],
    results: [
      {
        value: "93.3%",
        label: "valid Conventional Commits",
        context:
          "28 of 30 real commits, gpt-4.1-mini. My own messages on the same commits: 66.7%.",
      },
      {
        value: "65%",
        label: "commit type matches mine",
        context:
          "13 of 20 commits that had a conventional message. Always guessing feat scores 45%.",
      },
      {
        value: "2",
        label: "LLM calls per commit message",
        context:
          "3,552 input and 306 output tokens on average; 3.1 s p50, 5.2 s p95.",
      },
      {
        value: "0.525",
        label: "split agreement (ARI)",
        context:
          "The default strategy, on 12 held-out cases from repos the threshold was not tuned on. One group per file scores 0.352; the gap's 95% CI, +0.02 to +0.35, only just clears zero.",
      },
    ],
    resultNotes: [
      "The eval found four bugs. The one-command pipeline read the key message while the commit agent returns commit_message, so the generated message came back empty in 10 of 10 runs. Each step after the first lost its first model call to a connection error, because every step ran in a fresh event loop while reusing one cached client. Semantic splitting never ran at all: the retriever was built with an argument its constructor does not take, and the TypeError was caught and turned into None. And the pinned embedding model, text-embedding-004, had been retired.",
      "All four are fixed. On the same runs afterwards, the commit message came back 10 times out of 10, none of 34 model calls failed, and PR descriptions came back 5 times out of 5 (2 before). Seven regression tests now pin the fixes, and every one fails on the old code. The original tests had passed because their mocks returned a response shape no backend actually produces.",
      "Fixing semantic splitting exposed a fifth problem: on the replacement embedding model, the old 0.5 similarity threshold put every hunk in one group. I recalibrated it to 0.75 on three repos and tested on the other two. Semantic alone scores 0.513, against 0.352 for one group per file, but its interval includes zero. The default strategy is only just better than the baselines, and semantic on its own is not yet shown to be.",
      "Scope: one run per configuration, 30 split and 30 commit cases (12 held out for the threshold), gpt-4.1-mini only, the in-process engine only, and only one split case interleaves edits within a file. The suite now stands at 251 passed, 2 skipped.",
    ],
    lessons: [
      "Passing tests are not a working product. Each agent had tests, but their mocks agreed with the bug instead of with the backend, and nothing tested the hand-off between agents, which is where the output was lost.",
      "A swallowed exception can switch a headline feature off without a trace. One except-and-return-None made semantic splitting a silent no-op.",
      "Start from the dumbest baseline. One commit per file landed inside the confidence interval of every strategy.",
      "Hosted models expire. A pinned embedding model and a threshold tuned to it both quietly went stale.",
    ],
    next:
      "Tune the default strategy's threshold on its own rather than inheriting semantic's, grow the held-out set past 12 cases, test edits interleaved within a file, and add an eval for review quality.",
  },
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((c) => c.slug === slug);
}
