import { describe, expect, test } from "bun:test";
import { scrub, scrubData } from "../src/scrub.ts";

describe("scrub - <private> tags", () => {
  test("strips a basic block", () => {
    expect(scrub("before <private>shh</private> after")).toBe("before [private redacted] after");
  });

  test("strips multiline blocks", () => {
    const input = "x\n<private>line one\nline two</private>\ny";
    expect(scrub(input)).toBe("x\n[private redacted]\ny");
  });

  test("strips multiple blocks", () => {
    expect(scrub("a <private>1</private> b <private>2</private> c")).toBe(
      "a [private redacted] b [private redacted] c",
    );
  });

  test("case-insensitive on tag", () => {
    expect(scrub("<PRIVATE>x</PRIVATE>")).toBe("[private redacted]");
  });
});

describe("scrub - secret patterns", () => {
  test("AWS access key", () => {
    expect(scrub("key: AKIAIOSFODNN7EXAMPLE")).toBe("key: [REDACTED:aws_access_key]");
  });

  test("GitHub PAT (classic)", () => {
    const t = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789";
    expect(scrub(`token=${t}`)).toBe("token=[REDACTED:github_pat_classic]");
  });

  test("GitHub PAT (fine-grained)", () => {
    const t = "github_pat_" + "A".repeat(82);
    expect(scrub(t)).toBe("[REDACTED:github_pat_fine]");
  });

  test("OpenAI key", () => {
    const t = "sk-" + "a".repeat(48);
    expect(scrub(`OPENAI=${t}`)).toBe("OPENAI=[REDACTED:openai_key]");
  });

  test("Anthropic key", () => {
    const t = "sk-ant-api03-" + "a".repeat(93);
    expect(scrub(t)).toBe("[REDACTED:anthropic_key]");
  });

  test("Groq key", () => {
    const t = "gsk_" + "a".repeat(52);
    expect(scrub(`GROQ=${t}`)).toBe("GROQ=[REDACTED:groq_key]");
  });

  test("Voyage key", () => {
    const t = "pa-" + "abcDEF123_-".repeat(4) + "xyz";
    expect(scrub(`VOYAGE=${t}`)).toBe("VOYAGE=[REDACTED:voyage_key]");
  });

  test("Slack token", () => {
    expect(scrub("xoxb-1234567890-abcdefghijklmnop")).toBe("[REDACTED:slack_token]");
  });

  test("JWT", () => {
    const j =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QifQ." +
      "abc123def456";
    expect(scrub(`Authorization: Bearer ${j}`)).toContain("[REDACTED:");
    expect(scrub(j)).toBe("[REDACTED:jwt]");
  });

  test("Bearer header", () => {
    expect(scrub("Authorization: Bearer mneme_pat_test_abcdefghij1234567890abc")).toBe(
      "Authorization: [REDACTED:bearer_header]",
    );
  });

  test("URL userinfo (https with user:token)", () => {
    expect(scrub("https://alice:supersecrettoken@github.com/x/y.git")).toBe(
      "https://[REDACTED:url_userinfo]@github.com/x/y.git",
    );
  });

  test("URL userinfo preserves scheme + host", () => {
    expect(scrub("clone from https://user:pat_abcdef@example.org/repo.git ok")).toBe(
      "clone from https://[REDACTED:url_userinfo]@example.org/repo.git ok",
    );
  });

  test("URL without userinfo untouched", () => {
    const s = "see https://github.com/owner/repo for details";
    expect(scrub(s)).toBe(s);
  });

  test("SSH private key block", () => {
    const block = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBNiPaLs/Mf8...
-----END OPENSSH PRIVATE KEY-----`;
    expect(scrub(`pre\n${block}\npost`)).toBe("pre\n[REDACTED:ssh_private_key]\npost");
  });
});

describe("scrub - benign strings", () => {
  test("plain prose untouched", () => {
    const s = "we should refactor the auth middleware tomorrow";
    expect(scrub(s)).toBe(s);
  });

  test("short tokens not greedy", () => {
    // "sk-foo" is too short to match openai_key (requires 40+ chars after sk-)
    expect(scrub("see sk-foo")).toBe("see sk-foo");
  });

  test("empty string", () => {
    expect(scrub("")).toBe("");
  });
});

describe("scrubData - nested values", () => {
  test("scrubs strings inside objects", () => {
    const r = scrubData({
      content: "Bearer mneme_pat_test_abcdefghij1234567890abc",
      meta: { ok: true },
    }) as { content: string; meta: { ok: boolean } };
    expect(r.content).toBe("[REDACTED:bearer_header]");
    expect(r.meta.ok).toBe(true);
  });

  test("scrubs strings inside arrays", () => {
    const r = scrubData(["plain", "AKIAIOSFODNN7EXAMPLE", 42]) as unknown[];
    expect(r[0]).toBe("plain");
    expect(r[1]).toBe("[REDACTED:aws_access_key]");
    expect(r[2]).toBe(42);
  });

  test("non-string values pass through", () => {
    expect(scrubData(42)).toBe(42);
    expect(scrubData(null)).toBe(null);
    expect(scrubData(true)).toBe(true);
  });

  test("scrubs strings inside nested objects + arrays", () => {
    const r = scrubData({
      a: [{ b: "<private>oops</private>" }, "ok"],
    }) as { a: [{ b: string }, string] };
    expect(r.a[0].b).toBe("[private redacted]");
    expect(r.a[1]).toBe("ok");
  });
});

describe("scrubData - binary content blocks", () => {
  test("redacts base64 image source data while preserving shape", () => {
    const big = "A".repeat(60_000);
    const block = {
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: big },
    };
    const r = scrubData(block) as {
      type: string;
      source: { type: string; media_type: string; data: string };
    };
    expect(r.type).toBe("image");
    expect(r.source.type).toBe("base64");
    expect(r.source.media_type).toBe("image/jpeg");
    expect(r.source.data).toBe("[redacted: 60000 base64 chars]");
  });

  test("redacts document content blocks the same way", () => {
    const block = {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: "JVBE...".repeat(2000),
      },
    };
    const r = scrubData(block) as { source: { data: string } };
    expect(r.source.data.startsWith("[redacted:")).toBe(true);
  });

  test("idempotent — does not re-redact an already-redacted block", () => {
    const once = scrubData({
      type: "image",
      source: { type: "base64", data: "BASE64BLOB" },
    }) as { source: { data: string } };
    const twice = scrubData(once) as { source: { data: string } };
    expect(twice.source.data).toBe(once.source.data);
  });

  test("leaves non-binary image-typed shapes alone", () => {
    // `type: "image"` without a base64 source (e.g., a URL-source content
    // block or unrelated key-value pair) should pass through.
    const r = scrubData({
      type: "image",
      source: { type: "url", url: "https://example.com/x.jpg" },
    }) as { source: Record<string, string> };
    expect(r.source.url).toBe("https://example.com/x.jpg");
  });

  test("redacts deeply nested image blocks inside a tool_result payload", () => {
    const payload = {
      tool: "mcp__preview_screenshot",
      result: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: "X".repeat(50_000),
          },
        },
      ],
    };
    const r = scrubData(payload) as {
      result: { source: { data: string } }[];
    };
    const first = r.result[0];
    expect(first).toBeDefined();
    expect(first?.source.data).toBe("[redacted: 50000 base64 chars]");
  });
});
