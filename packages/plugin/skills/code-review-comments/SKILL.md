---
name: code-review-comments
description: Use when addressing review comments on a pull request — either a PR explicitly provided by the user, or the PR mapped to the current branch when no argument is given. Triggers on "check the review comments", "address the review", "fix the findings", "respond to PR feedback", "the reviewer flagged X", or a PR URL/number with action intent on existing comments.
---

# Addressing PR Review Comments

This is the **inbound** half of the review cycle. The outbound half — generating review comments on someone else's PR — lives in the `/code-review` skill. Use that one if the user is reviewing, not being reviewed.

Two phases plus a hand-off in the middle. References load on demand.

## Resolve the PR first

If the user gave a PR number, URL, or branch name → use that. Otherwise infer from the current branch:

```bash
gh pr view --json number,headRefName,url,state \
  --jq '{number, head: .headRefName, url, state}'
```

If `gh pr view` errors with "no pull requests found" the current branch isn't mapped to an open PR — ask the user to specify one or open a PR first.

## When to use (and when not)

Use it when there's an open PR with review comments and the user wants findings **addressed**.

Skip when:
- The user just wants the review summarised in chat (`gh pr view` is enough).
- The PR has no comments yet (the user wants outbound review — `/code-review`).
- The user wants to ignore the review.

The differentiator: this skill drives a **per-comment reply loop** with explicit user permission before each reply lands (`post` / `skip` / `edit:<text>`). No bulk posting.

---

## Phase 1 · Gather every review surface

Comments live in three places. Pull all three:

```bash
# Top-level PR comments (issue-level, not anchored to diff)
gh api repos/<owner>/<repo>/issues/<n>/comments \
  --jq '.[] | {id, author: .user.login, at: .created_at, body}'

# Inline review comments (anchored to a file + line in the diff)
gh api repos/<owner>/<repo>/pulls/<n>/comments \
  --jq '.[] | {id, author: .user.login, path, line, in_reply_to_id, body}'

# Review submissions (the wrapper around inline comments; may carry body text)
gh api repos/<owner>/<repo>/pulls/<n>/reviews \
  --jq '.[] | {id, author: .user.login, state, submitted_at, body}'
```

A typical reviewer pass: one review submission (`COMMENTED` / `APPROVED` / `CHANGES_REQUESTED`) plus N inline comments. A summary may live in the submission's `body`; granular findings live in the inline comments. **Save each inline comment's id** — needed as `in_reply_to` to thread the reply.

---

## Phase 2 · Apply code fixes (hand-off, not in this skill)

For each finding that calls for a code change: apply it through your normal coding workflow. Use whatever judgment + tools you'd use to fix any other bug — this skill doesn't re-litigate triage.

Mechanical rules that matter for the reply phase:

- **One focused commit per independent finding** so each reply can cite a clean SHA (`Fixed in commit <sha>`).
- Run typecheck + targeted tests + full suite **before push**. The reply text will reference the SHA, so don't commit work that the next push will rewrite.
- If a finding needs no code change (disagree, already done, deferred), still flag it for the reply phase — silent skips look like neglect.

If the user wants outbound code-review on the *fix itself* before pushing, that's `/code-review` territory.

---

## Phase 3 · Per-comment reply loop

For each inline comment, present to the user:

1. **Quote the original comment** verbatim (keeps them grounded).
2. **Draft the reply** — describe what changed, link to commit SHA, quote any relevant new code.
3. **Ask permission** with three options:
   - `post` — publish the threaded reply
   - `skip` — don't reply to this one (silent)
   - `edit: <text>` — use a different reply
4. **Post via `gh api`** with `in_reply_to` set to the original comment id.

Full command syntax, escaping for code-fence bodies, and verification: [`references/posting-replies.md`](./references/posting-replies.md). Load it when ready to post the first reply.

**Don't bulk-post.** Each reply is its own user decision. Drift between fix and reply ("I posted before you said skip") is exactly the failure mode this loop prevents.

---

## End state

- Each addressed finding has a commit linked in its reply.
- Each inline comment thread either has a threaded reply (`post`) or was explicitly skipped by the user.
- If the reviewer's bottom line was "fix X and I'd approve," surface that to the user after the loop completes so they can request a re-review.
