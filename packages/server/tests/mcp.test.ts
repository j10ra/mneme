import { describe, expect, mock, test } from "bun:test";

// Mock the embedder before importing the SUT. substituteEmbeds calls
// embedBatch synchronously inside the module — capture every call so we
// can assert what reached the embedder.
const calls: string[][] = [];
mock.module("../src/embedder/index.ts", () => ({
  embedBatch: async (texts: string[]) => {
    calls.push(texts);
    return texts.map(() => Array.from({ length: 4 }, () => 0));
  },
}));

const { substituteEmbeds } = await import("../src/mcp.ts");

describe("substituteEmbeds — secrets scrubbed before embedding", () => {
  test("redacts a JWT in embed()", async () => {
    calls.length = 0;
    await substituteEmbeds(
      "SELECT * FROM memories WHERE embedding <=> embed('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.signaturepartXXXXXXXXX') < 0.1",
    );
    expect(calls).toHaveLength(1);
    const sentToEmbedder = calls[0]!.join(" ");
    expect(sentToEmbedder).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(sentToEmbedder).toContain("[REDACTED:jwt]");
  });

  test("redacts an anthropic key in embed()", async () => {
    calls.length = 0;
    await substituteEmbeds(
      "SELECT 1 FROM memories WHERE embedding <=> embed('see sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd here') < 0.1",
    );
    expect(calls).toHaveLength(1);
    const sentToEmbedder = calls[0]!.join(" ");
    expect(sentToEmbedder).not.toContain("sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd");
    expect(sentToEmbedder).toContain("[REDACTED:anthropic_key]");
  });

  test("benign text passes through unchanged", async () => {
    calls.length = 0;
    await substituteEmbeds(
      "SELECT 1 FROM memories WHERE embedding <=> embed('docker compose up') < 0.1",
    );
    expect(calls[0]).toEqual(["docker compose up"]);
  });

  test("no embed() macro = no embedder call", async () => {
    calls.length = 0;
    const out = await substituteEmbeds("SELECT 1");
    expect(out).toBe("SELECT 1");
    expect(calls).toHaveLength(0);
  });
});
