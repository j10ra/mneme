// Server-side LLM prompts. Only digest's two cross-cluster judgments
// live here, both invoked against OpenRouter from
// packages/server/src/llm/providers/openrouter.ts.

// Cluster-merge judgment prompt — used by the digest worker (#30).
// Input is two cluster summaries (each is itself the distilled output of
// a daemon-side dream clustering pass). Output is a same/different
// judgment. Conservative by default: a wrong "merge" is hard to undo
// (members get re-pointed, the loser cluster gets superseded), while a
// wrong "keep separate" is benign and re-evaluated next digest cycle.
export const CLUSTER_MERGE_PROMPT = `You are reviewing two memory clusters to decide if they cover the same underlying topic and should be merged into one.

Each cluster is a distillation of multiple memories. The TITLE names the topic; the SUMMARY explains it.

Return a JSON object: {"same_topic": <bool>, "reason": "<one short sentence>"}.

Mark same_topic = true ONLY if:
- The two clusters describe the same concrete decision, finding, bug, or constraint
- A reader looking up either topic would expect the other's content as part of the answer
- Their information is overlapping rather than complementary

Mark same_topic = false when:
- They are topically adjacent but distinct (e.g., "Cloudflare Tunnel routing" and "Cloudflare R2 storage")
- One is a parent topic and the other is a sub-topic worth keeping separate
- They share keywords or technology but cover different facts

When in doubt, prefer false. Conservative judgment is correct here — re-merging a wrongly-split cluster is cheap; un-merging a wrongly-merged one is much harder.

Output only the JSON object. No prose, no markdown, no commentary.`;

// Supersede detection prompt — used by digest's Op2 (cross-cluster
// supersede pass) to identify which (if any) of a candidate set of
// memories pulled across different clusters are superseded by which.
// Only ever called against a strong model (Sonnet via OpenRouter)
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
