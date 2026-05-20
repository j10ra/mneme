// Claude provider tests.
//
// The pure helpers (auth detection, prompt building, response parsing)
// are tested deterministically. The actual subprocess call to `claude`
// is only run when MNEME_RUN_LIVE=1 since it consumes the user's Claude
// Max quota and requires the CLI to be installed and logged in.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  buildExtractPrompt,
  buildSupersedePrompt,
  detectAuthMode,
  parseExtractResponse,
  parseSupersedeResponse,
} from "../src/agents/claude.ts";
import { claudeProvider } from "../src/agents/claude.ts";
import type { Capture, SupersedeCandidate } from "../src/agents/types.ts";

const ENV_KEYS = [
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "MNEME_CREDENTIALS_PATH",
] as const;
const RUN_LIVE = process.env.MNEME_RUN_LIVE === "1";

let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = {};
  for (const k of ENV_KEYS) {
    originalEnv[k] = process.env[k];
    delete process.env[k];
  }
  // Point auth.ts at a non-existent credentials file so detectAuthMode
  // tests aren't perturbed by a real ~/.claude/.credentials.json on the
  // dev box. Individual tests can override to assert the credentials path.
  process.env.MNEME_CREDENTIALS_PATH = "/tmp/mneme-test-nonexistent-credentials.json";
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
});

const sampleCapture: Capture = {
  content: "Decided to use Postgres advisory locks for dream coordination.",
  source: "claude_code:user_prompt_submit",
  hostname: "macbook-pro",
  repo: "github.com/j10ra/mneme",
  harness: "claude-code",
  agent: "main",
  session_id: "abc123",
  topics: [],
  private: false,
  raw_meta: {},
};

describe("detectAuthMode", () => {
  test("returns 'oauth-token' when CLAUDE_CODE_OAUTH_TOKEN is set (no credentials.json)", () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-fake";
    expect(detectAuthMode()).toBe("oauth-token");
  });

  test("returns 'api-key' when only ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-api03-fake";
    expect(detectAuthMode()).toBe("api-key");
  });

  test("prefers oauth-token over api-key when both are set", () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-fake";
    process.env.ANTHROPIC_API_KEY = "sk-ant-api03-fake";
    expect(detectAuthMode()).toBe("oauth-token");
  });

  test("falls back to 'subprocess' when no env credentials are present", () => {
    expect(detectAuthMode()).toBe("subprocess");
  });

  test("returns 'credentials' when a valid ~/.claude/.credentials.json exists, even if env var is set", () => {
    const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
    const { join: joinPath } = require("node:path");
    const { tmpdir } = require("node:os");
    const dir = mkdtempSync(joinPath(tmpdir(), "mneme-creds-"));
    const path = joinPath(dir, "credentials.json");
    writeFileSync(
      path,
      JSON.stringify({
        claudeAiOauth: {
          accessToken: "sk-ant-fresh-from-credentials",
          // 1h in the future — comfortably past the validity margin
          expiresAt: Date.now() + 60 * 60_000,
        },
      }),
    );
    process.env.MNEME_CREDENTIALS_PATH = path;
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-stale-from-env";
    try {
      expect(detectAuthMode()).toBe("credentials");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("ignores an expired credentials.json and falls back to env var", () => {
    const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
    const { join: joinPath } = require("node:path");
    const { tmpdir } = require("node:os");
    const dir = mkdtempSync(joinPath(tmpdir(), "mneme-creds-"));
    const path = joinPath(dir, "credentials.json");
    writeFileSync(
      path,
      JSON.stringify({
        claudeAiOauth: {
          accessToken: "sk-ant-expired",
          expiresAt: Date.now() - 60_000,
        },
      }),
    );
    process.env.MNEME_CREDENTIALS_PATH = path;
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-fake";
    try {
      expect(detectAuthMode()).toBe("oauth-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("buildExtractPrompt", () => {
  test("includes every capture's content in the user message", () => {
    const prompt = buildExtractPrompt([
      sampleCapture,
      { ...sampleCapture, content: "Second capture about TEI." },
    ]);
    expect(prompt).toContain("Postgres advisory locks");
    expect(prompt).toContain("TEI");
  });

  test("instructs the model to return JSON observations", () => {
    const prompt = buildExtractPrompt([sampleCapture]);
    expect(prompt).toMatch(/observations/i);
    expect(prompt).toMatch(/json/i);
  });
});

describe("parseExtractResponse", () => {
  test("returns the observations array from a clean JSON response", () => {
    const response = JSON.stringify({
      observations: [
        {
          content: "Use advisory locks for dream coordination.",
          kind: "decision",
          importance: 0.8,
          topics: ["dream", "coordination"],
        },
      ],
    });
    const memories = parseExtractResponse(response);
    expect(memories).toHaveLength(1);
    expect(memories[0]!.content).toContain("advisory locks");
    expect(memories[0]!.kind).toBe("decision");
    expect(memories[0]!.importance).toBeCloseTo(0.8, 5);
  });

  test("strips markdown code fences from the response", () => {
    const wrapped =
      "```json\n" +
      JSON.stringify({
        observations: [{ content: "x", kind: "note", importance: 0.5, topics: [] }],
      }) +
      "\n```";
    const memories = parseExtractResponse(wrapped);
    expect(memories).toHaveLength(1);
  });

  test("extracts JSON when the model trails prose after the fenced block", () => {
    // Real shape Haiku returned in production: fenced JSON followed by
    // an explanation paragraph. The original strict-anchor regex missed
    // this and dropped real observations.
    const wrapped =
      "```json\n" +
      JSON.stringify({
        observations: [
          {
            content: "Use Postgres advisory locks for dream coordination.",
            kind: "decision",
            importance: 0.7,
            topics: [],
          },
        ],
      }) +
      "\n```\n\nThese captures contain enough decisions worth carrying forward.";
    const memories = parseExtractResponse(wrapped);
    expect(memories).toHaveLength(1);
    expect(memories[0]!.content).toContain("advisory locks");
  });

  test("extracts JSON when there's no fence and prose surrounds the object", () => {
    const wrapped =
      "Here are the observations I extracted:\n\n" +
      JSON.stringify({
        observations: [{ content: "a useful fact", kind: "note", importance: 0.4, topics: [] }],
      }) +
      "\n\nLet me know if you need more.";
    const memories = parseExtractResponse(wrapped);
    expect(memories).toHaveLength(1);
    expect(memories[0]!.content).toBe("a useful fact");
  });

  test("returns an empty array when observations is empty", () => {
    const response = JSON.stringify({ observations: [] });
    expect(parseExtractResponse(response)).toEqual([]);
  });

  test("returns an empty array when the response is unparseable", () => {
    expect(parseExtractResponse("not json at all")).toEqual([]);
  });

  test("clamps importance into the 0.1-1.0 range", () => {
    const response = JSON.stringify({
      observations: [
        { content: "low", kind: "note", importance: -5, topics: [] },
        { content: "high", kind: "note", importance: 99, topics: [] },
      ],
    });
    const memories = parseExtractResponse(response);
    expect(memories[0]!.importance).toBeCloseTo(0.1, 5);
    expect(memories[1]!.importance).toBeCloseTo(1.0, 5);
  });

  test("defaults missing topics to an empty array", () => {
    const response = JSON.stringify({
      observations: [{ content: "x", kind: "note", importance: 0.5 }],
    });
    const memories = parseExtractResponse(response);
    expect(memories[0]!.topics).toEqual([]);
  });

  test("filters observations missing required fields", () => {
    const response = JSON.stringify({
      observations: [
        { content: "valid", kind: "note", importance: 0.5, topics: [] },
        { kind: "note", importance: 0.5, topics: [] }, // no content
        { content: "no kind", importance: 0.5, topics: [] },
      ],
    });
    const memories = parseExtractResponse(response);
    expect(memories).toHaveLength(1);
    expect(memories[0]!.content).toBe("valid");
  });
});

describe("claudeProvider.isAvailable", () => {
  test("reports available with detail when subprocess is the active mode", async () => {
    const status = await claudeProvider.isAvailable();
    // We don't actually invoke `claude` here; just verify the shape and
    // that the detail mentions the auth mode.
    expect(status).toHaveProperty("available");
    expect(status).toHaveProperty("detail");
    expect(typeof status.available).toBe("boolean");
    expect(status.detail).toMatch(/subprocess|oauth|api/i);
  });
});

describe("claudeProvider.supportsDream", () => {
  test("returns true (Claude is suitable for the distill + supersede pass)", () => {
    expect(claudeProvider.supportsDream()).toBe(true);
  });
});

describe("buildSupersedePrompt", () => {
  test("includes id, kind, created_at, and content for each candidate", () => {
    const cands: SupersedeCandidate[] = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        content: "We use 14B model.",
        kind: "decision",
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        content: "We use 7B model now.",
        kind: "decision",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const prompt = buildSupersedePrompt(cands);
    expect(prompt).toContain("11111111");
    expect(prompt).toContain("22222222");
    expect(prompt).toContain("14B");
    expect(prompt).toContain("7B");
    expect(prompt).toMatch(/json/i);
  });
});

describe("parseSupersedeResponse", () => {
  test("returns the validated pairs from clean JSON", () => {
    const response = JSON.stringify({
      pairs: [
        {
          old_id: "11111111-1111-1111-1111-111111111111",
          new_id: "22222222-2222-2222-2222-222222222222",
          reason: "Project moved to 7B.",
        },
      ],
    });
    const pairs = parseSupersedeResponse(response);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.old_id).toContain("11111111");
    expect(pairs[0]!.reason).toContain("7B");
  });

  test("returns empty array on missing or empty pairs", () => {
    expect(parseSupersedeResponse(JSON.stringify({ pairs: [] }))).toEqual([]);
    expect(parseSupersedeResponse("not json")).toEqual([]);
  });

  test("filters self-supersede entries (old_id === new_id)", () => {
    const same = "33333333-3333-3333-3333-333333333333";
    const response = JSON.stringify({
      pairs: [{ old_id: same, new_id: same, reason: "bogus" }],
    });
    expect(parseSupersedeResponse(response)).toEqual([]);
  });

  test("drops malformed pairs (missing fields)", () => {
    const response = JSON.stringify({
      pairs: [
        {
          old_id: "11111111-1111-1111-1111-111111111111",
          new_id: "22222222-2222-2222-2222-222222222222",
        }, // no reason
        { new_id: "22222222-2222-2222-2222-222222222222", reason: "x" }, // no old_id
        {
          old_id: "11111111-1111-1111-1111-111111111111",
          new_id: "22222222-2222-2222-2222-222222222222",
          reason: "valid",
        },
      ],
    });
    const pairs = parseSupersedeResponse(response);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.reason).toBe("valid");
  });
});

describe("claudeProvider.extract (live)", () => {
  test.skipIf(!RUN_LIVE)(
    "extracts at least one observation from a meaningful capture",
    async () => {
      const result = await claudeProvider.extract({
        captures: [sampleCapture],
      });
      expect(Array.isArray(result)).toBe(true);
      // No strict assertion on count — Claude may legitimately decide
      // the capture has nothing to extract. We just want to verify the
      // pipeline runs without error.
      for (const m of result) {
        expect(typeof m.content).toBe("string");
        expect(typeof m.kind).toBe("string");
      }
    },
    120_000,
  );
});
