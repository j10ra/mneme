import { describe, expect, test } from "bun:test";
import { normalizeRepo } from "../src/lib/normalize-repo.ts";

describe("normalizeRepo - empties", () => {
  test("null stays null", () => {
    expect(normalizeRepo(null)).toBeNull();
  });

  test("empty string becomes null", () => {
    expect(normalizeRepo("")).toBeNull();
  });

  test("whitespace becomes null", () => {
    expect(normalizeRepo("   ")).toBeNull();
  });
});

describe("normalizeRepo - already canonical", () => {
  test("clean host/path is unchanged", () => {
    expect(normalizeRepo("github.com/owner/repo")).toBe("github.com/owner/repo");
  });

  test("nested path is preserved", () => {
    expect(normalizeRepo("gitlab.com/group/sub/repo")).toBe("gitlab.com/group/sub/repo");
  });
});

describe("normalizeRepo - credential stripping", () => {
  test("user:token@host (canonicalRepo's schemeless leak form) drops credentials", () => {
    expect(
      normalizeRepo("jalipalo-bc:ghp_secret123@github.com/blockchain/service-superapp-web-wallet"),
    ).toBe("github.com/blockchain/service-superapp-web-wallet");
  });

  test("user@host drops the user", () => {
    expect(normalizeRepo("git@github.com/owner/repo")).toBe("github.com/owner/repo");
  });

  test("credential and clean forms collapse to one identity", () => {
    expect(normalizeRepo("user:tok@github.com/blockchain/wallet")).toBe(
      normalizeRepo("github.com/blockchain/wallet"),
    );
  });
});

describe("normalizeRepo - raw remote URLs that bypass canonicalRepo", () => {
  test("https URL strips scheme and .git", () => {
    expect(normalizeRepo("https://github.com/owner/repo.git")).toBe("github.com/owner/repo");
  });

  test("https URL with embedded credentials", () => {
    expect(normalizeRepo("https://user:tok@github.com/owner/repo")).toBe("github.com/owner/repo");
  });

  test("ssh scp-style URL", () => {
    expect(normalizeRepo("git@github.com:owner/repo.git")).toBe("github.com/owner/repo");
  });
});

describe("normalizeRepo - suffix and case", () => {
  test(".git suffix removed", () => {
    expect(normalizeRepo("github.com/owner/repo.git")).toBe("github.com/owner/repo");
  });

  test("trailing slash removed", () => {
    expect(normalizeRepo("github.com/owner/repo/")).toBe("github.com/owner/repo");
  });

  test("host lowercased, path case preserved", () => {
    expect(normalizeRepo("GitHub.com/Owner/Repo")).toBe("github.com/Owner/Repo");
  });
});

describe("normalizeRepo - dir fallback is left intact", () => {
  test("dir: identity is not mangled", () => {
    expect(normalizeRepo("dir:Pinnacle")).toBe("dir:Pinnacle");
  });

  test("dir: with trailing slash trimmed only", () => {
    expect(normalizeRepo("dir:agent-abc123/")).toBe("dir:agent-abc123");
  });
});
