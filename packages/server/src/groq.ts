import { mnemeFn } from "@mneme/core";

// Groq's OpenAI-compatible endpoint. Only openai/gpt-oss-{20b,120b} support
// strict json_schema mode on Groq (Llama models only do json_object). 20b
// gets us higher free-tier TPM headroom; swap to 120b for quality if you've
// upgraded to the dev tier.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "openai/gpt-oss-20b";

/** Thrown when Groq returns 429. Carries the retry hint so the worker
 *  can sleep instead of hammering. */
export class GroqRateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "GroqRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(body: string): number {
  // "Please try again in 33.7575s" — scrape the seconds out, default 30s.
  const m = body.match(/try again in\s+([\d.]+)s/i);
  if (!m) return 30_000;
  const secs = Number.parseFloat(m[1]!);
  return Math.min(120_000, Math.ceil(secs * 1000) + 500);
}

export const KINDS = [
  "note",
  "bugfix",
  "feature",
  "discovery",
  "decision",
  "preference",
  "constraint",
  "security_alert",
  "reference",
  "summary",
] as const;
export type Kind = (typeof KINDS)[number];

export type Observation = {
  content: string;
  kind: Kind;
  importance: number;
  topics: string[];
};

const SYSTEM_PROMPT = `You distill conversation captures into structured memory observations that future-you will need when starting a fresh session.

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
- summary: a session-level wrap-up
- note: a useful fact that doesn't fit above (use sparingly)

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

Each observation's content is one self-contained sentence in third-person, present-tense factual style. No "the user", no "the assistant".`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string", minLength: 1 },
          kind: { type: "string", enum: KINDS as unknown as string[] },
          importance: { type: "number", minimum: 0, maximum: 1 },
          topics: {
            type: "array",
            items: { type: "string" },
            maxItems: 6,
          },
        },
        required: ["content", "kind", "importance", "topics"],
        additionalProperties: false,
      },
    },
  },
  required: ["observations"],
  additionalProperties: false,
} as const;

type GroqResponse = {
  choices: Array<{ message: { content: string }; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

/** Extract observations from a chunk of capture content. Returns [] on empty/noise. */
export const extractObservations = mnemeFn(
  "groq.extract",
  async (captureText: string): Promise<Observation[]> => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not set");
    if (!captureText.trim()) return [];

    const resp = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_completion_tokens: 2048,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "extract_observations",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: captureText },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      if (resp.status === 429) {
        throw new GroqRateLimitError(
          `groq 429: ${err.slice(0, 200)}`,
          parseRetryAfter(err),
        );
      }
      throw new Error(`groq extract failed: ${resp.status} ${err.slice(0, 300)}`);
    }
    const data = (await resp.json()) as GroqResponse;
    const raw = data.choices[0]?.message.content;
    if (!raw) throw new Error("groq extract: empty response");

    const parsed = JSON.parse(raw) as { observations: Observation[] };
    return parsed.observations.filter(
      (o) =>
        typeof o.content === "string" &&
        o.content.trim().length > 0 &&
        (KINDS as readonly string[]).includes(o.kind),
    );
  },
);
