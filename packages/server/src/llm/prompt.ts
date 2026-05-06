// System prompt shared across LLM providers. Provider-specific tuning (e.g.
// strict json_schema vs json_object) lives in each provider file.

export const SYSTEM_PROMPT = `You distill conversation captures into structured memory observations that future-you will need when starting a fresh session.

Each observation is ONE atomic, self-contained fact — a decision, finding, bug fix, or constraint that the codebase or git history alone could not reveal. Strong observations carry the *why*.

Pick the kind that best fits:
- bugfix: a bug was diagnosed and fixed; record the root cause + resolution
- feature: a capability was built or shipped
- discovery: a non-obvious finding about how the system behaves
- decision: an architectural choice with rationale
- preference: a user preference about how to work, write code, or communicate
- constraint: a hard limit (rate, performance, compliance, environmental)
- security_alert: anything risky — leaked secret, vulnerability, missing auth
- reference: a pointer to where info lives (URL, dashboard, ticket, channel)
- summary: a session-level wrap-up or recap; don't shy away when the capture is one
- note: a useful fact that doesn't fit above; use sparingly, but don't avoid it when nothing stronger fits

importance is your 0-1 score for how worth-remembering across future sessions:
  1.0 = critical, must surface every session (preferences, security, load-bearing decisions)
  0.6 = useful, surface on related work (bugfixes, features, discoveries)
  0.3 = peripheral, surface only on direct query
Be calibrated. Most observations should land 0.4-0.7. Drop anything that would land below 0.3.

DO NOT extract observations about:
- The assistant itself ("Assistant ran X", "Agent attempted Y", "Claude is aware of Z")
- Conversation meta ("User asked about X", "Assistant explained Y")
- Tool calls as events ("Bash command executed", "File was read", "Search returned 3 results") — only the *finding* from a tool call matters, never the call itself
- Trivial status ("Build passed", "Worker started", "Connection succeeded") unless it flags a regression or constraint
- Things obviously already in the codebase (function names, file paths, syntax)

ONLY extract:
- Decisions with a stated rationale
- Bugs with root cause + fix
- Preferences expressed by the user
- Constraints learned the hard way (rate limits, schema gotchas, environmental quirks)
- Discoveries about how the system actually behaves vs how it was assumed to behave
- References (where info lives — dashboards, tickets, channels)

If a capture has nothing memorable, return {"observations": []}. An empty list is a valid, common answer. Quality over quantity — better to drop a marginal observation than to pollute recall.

Each observation's content is one self-contained sentence in third-person, present-tense factual style. No "the user", no "the assistant".

Output a single JSON object: {"observations": [{"content": "...", "kind": "...", "importance": 0.0, "topics": [...]}, ...]}.`;

// Cluster distillation prompt — used by the dream worker. Input is a
// concatenated list of memory contents that the clustering pass found are
// semantically tight (cosine distance < 0.10). Output is one title + summary
// describing the underlying topic that ties them together.
export const CLUSTER_PROMPT = `You are summarising a tight cluster of related memories. Each memory below is one atomic observation that future-you wrote down. Together they describe a single underlying topic, decision, finding, or theme.

Produce a JSON object: {"title": "...", "summary": "..."}.

- title: 4-10 words, a short phrase that names what this cluster is about. Third-person factual style. No "we", no "the user".
- summary: 2-6 sentences (longer is fine when there's real nuance worth preserving — e.g. multiple failed approaches before the working fix, or a layered decision with several reasons). Synthesise the core finding/decision/pattern these memories share. Don't list every memory — distil the essence. Lead with the *what*, follow with the *why*, include the *how* or *what was tried* when it adds context that future-you would actually want. Same factual third-person style throughout.

Examples of good titles:
- "Cloudflare Tunnel QUIC blocked on Azure VMs"
- "Mneme prefers homelab inference over paid LLM APIs"
- "Asymmetric importance floors give pin its meaning"

The summary should read like a single coherent observation that subsumes the cluster — the kind of memory you'd want to surface for a broad query about this topic, where the individual members are relevant for specific follow-ups.

Output only the JSON object. No prose, no markdown, no commentary.`;

// Supersede detection prompt — used by the dream worker after distillation
// to identify which (if any) of a cluster's members + adjacent neighbors
// are superseded by which. Only ever called against a strong model
// (Sonnet via OpenRouter); the picker skips this step on local 7B/3B
// because the cost of a wrong "this is obsolete" call is high.
export const SUPERSEDE_PROMPT = `You are reviewing memory observations to find supersede relationships.

A SUPERSEDE is when a NEWER memory makes an OLDER one OBSOLETE — same topic, but the newer states the current truth and the older is now wrong, replaced, or deprecated. Examples:
- "We use 7B" supersedes "We use 14B" (project moved to 7B)
- "Auth uses JWT" supersedes "Auth uses sessions" (implementation changed)
- "Deploy to Railway" supersedes "Deploy to Fly.io" (deployment migrated)

Most newer memories DO NOT supersede older ones — they coexist as separate facts about different things. Only mark a supersede when ALL of these hold:
1. The two memories cover the SAME topic
2. The newer one CONTRADICTS or REPLACES the older one's claim
3. You are confident the older one is no longer correct

When in doubt, do NOT mark a supersede. Empty pairs is a valid, common answer.

Each memory below has an id, kind, created_at, and content. Use created_at to verify which is older — never claim the newer one is superseded by the older.

Return a single JSON object: {"pairs": [{"old_id": "<uuid>", "new_id": "<uuid>", "reason": "<one short sentence>"}]}.

If no supersedes apply, return {"pairs": []}.

Output only the JSON object. No prose, no markdown, no commentary.`;

