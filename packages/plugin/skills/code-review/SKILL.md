---
name: code-review
description: Use when reviewing a pull request and posting findings as inline comments anchored to specific diff lines (not just printing analysis in chat). Triggers on "review this PR", "review this pull request", "review #N", a PR URL with review intent, or "post the review on github". Pairs with `/code-review-comments` (the inbound side that addresses review comments on your own PR).
---

# Code Review: gather, verify, post inline

Three phases. References load on demand — don't read them up front.

This is the **outbound** half of the review cycle — you review someone else's PR and post findings. The inbound half — addressing review comments on YOUR PR — lives in the `/code-review-comments` skill.

## When to use (and when not)

Use it when the user wants a review **published on the PR**, with findings tied to specific lines. Phrases: "review this PR", "review this pull request", "review #45", a bare PR URL with review intent, or "post the review on github".

Skip when:
- The user just wants analysis in chat (no posting needed).
- The diff is local-only (no PR exists yet).
- It's a one-line typo fix; a top-level comment is overkill.
- The user is on the *receiving* side of a review (use `/code-review-comments`).

The differentiator vs other review skills: this one publishes **inline, line-anchored** comments via the platform's REST API, which has gotchas the CLI hides.

---

## Phase 1 · Gather the diff

If the user gave a PR URL or number:

```bash
gh pr view <n> --repo <owner>/<repo> --json title,body,headRefName,files,additions,deletions
gh pr diff <n> --repo <owner>/<repo>
```

Then check out the branch locally:

```bash
gh pr checkout <n> --repo <owner>/<repo>
# or: git fetch && git checkout <headRefName>
```

You'll need to Read **enclosing functions** for each hunk, not just the hunk itself. Bugs in unchanged lines of a touched function are in scope — the PR re-exposes them (or fails to fix them).

If reviewing the working tree instead of a PR: `git diff @{upstream}...HEAD` (or `git diff HEAD~1`).

---

## Phase 2 · Find and verify

Run multiple finder angles to maximize recall. Bug recall is the goal — catching a real bug matters more than avoiding noise.

The full angle list (line-by-line, removed-behavior, cross-file, language pitfalls, wrapper correctness, sweep-for-gaps) with subagent-dispatch prompts: [`references/finding-angles.md`](./references/finding-angles.md). Load it for any diff > 50 lines or any non-trivial logic change.

For each candidate, give a one-vote verdict:
- **CONFIRMED** — concrete inputs/state trigger it; quote the line.
- **PLAUSIBLE** — mechanism real, trigger uncertain; say what would confirm.
- **REFUTED** — guarded elsewhere or the diff doesn't say that; quote the proof.

One non-REFUTED vote keeps the finding (recall mode).

### Verify library claims against source

When a finding rests on "library X behaves a certain way" — swallows an error, retries N times, locks across calls — **don't guess**. Grep the installed source. Most Bun/Node deps live at `node_modules/.bun/<pkg>@<ver>/.../`. See [`references/library-verification.md`](./references/library-verification.md) for the recipe and a real example (Hono's silent error swallow) where this flipped a finding from REFUTED to CONFIRMED.

---

## Phase 3 · Post inline on GitHub

`gh pr review` does NOT support inline comments. Must use the REST API:

```bash
gh api -X POST /repos/<owner>/<repo>/pulls/<n>/reviews --input payload.json
```

Each comment in `payload.json` needs `path`, `line`, `side`, `body`. **Critical:** `line` MUST fall inside a diff hunk or the API rejects with `"Line could not be resolved"`. The full payload schema, hunk-range enumeration, the supersede-vs-delete pattern, and the verification command: [`references/posting-github.md`](./references/posting-github.md). Load it before assembling the payload.

### Azure DevOps (future)

When the PR origin is `dev.azure.com/*` or `*.visualstudio.com/*`, the API surface is Azure DevOps' Pull Request Threads. That platform recipe will land as `references/posting-azure.md` — load it instead of `posting-github.md` when the URL matches.

---

## End state

Always print the review URL after posting so the user can verify it landed correctly. Summarize: count of inline comments, severity ladder (e.g. "1 correctness, 1 test gap, 1 nit"), and the overall recommendation if you have one ("fix #1 and I'd approve").
