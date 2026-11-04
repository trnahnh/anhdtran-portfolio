/**
 * Case studies: Problem → What I built → Results → Lessons.
 *
 * Every number here is traced to the project's own repo (docs/METRICS.md and
 * friends), and each one carries the conditions it was measured under. Where
 * a project loses, or a headline number does not hold up, the study says so:
 * the reader is an engineer who will click through to the repo.
 */

export interface CaseStudy {
  slug: string;
  title: string;
  /** One sentence under the title. */
  summary: string;
  repo: string;
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
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((c) => c.slug === slug);
}
