---
name: responding-to-reviews
description: Use when a pull request has review comments to address and reply to. Triggers on "check the review comments", "address the review", "fix the findings", "respond to PR feedback", "the reviewer flagged X", or a PR URL with action intent on existing comments.
---

# Responding to PR Reviews: triage, fix, reply

Three phases. References load on demand — don't read them up front.

## When to use (and when not)

Use it when there's an open PR with review comments and the user wants findings **addressed in code + replied to on the PR**.

Skip when:
- The user just wants the review summarised in chat (`gh pr view` is enough).
- The PR has no comments yet (use the `reviewing-prs` skill first).
- The user wants to ignore the review.

The differentiator: this skill drives a **per-finding reply loop** with explicit user permission before posting each reply (`post` / `skip` / `edit:<text>`). No bulk posting.

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

# Review submissions (the wrapper around inline comments; may have body text too)
gh api repos/<owner>/<repo>/pulls/<n>/reviews \
  --jq '.[] | {id, author: .user.login, state, submitted_at, body}'
```

A typical reviewer pass: one review submission (state `COMMENTED` / `APPROVED` / `CHANGES_REQUESTED`) plus N inline comments. A summary may live in the submission's `body`; granular findings live in the inline comments. **Save each inline comment's id** — you need it as `in_reply_to` to thread the reply.

---

## Phase 2 · Triage and fix

For each finding, decide:

| Type | Action |
|---|---|
| **Correctness bug** | Code fix required + reply required |
| **Real but minor (style, naming, docs)** | Fix if cheap; reply either way |
| **Test gap** | New test required + reply |
| **Disagree** | No code change; reply must explain the technical reason |
| **Already done elsewhere** | No code change; reply pointing at the commit/line |

Group fixes into **one focused commit per finding** when they're independent — makes reply linking clean (`Fixed in commit <sha>`). Otherwise one combined commit whose body lists each finding it covers. Run typecheck + targeted tests + full suite before push; the reply text will cite the SHA.

---

## Phase 3 · Per-comment reply loop

For each inline comment, present to the user:

1. **Quote the original comment** (keep them grounded in what's being addressed)
2. **Draft the reply** — describe what changed, link to commit SHA, quote any new code
3. **Ask permission** with three options:
   - `post` — publish the threaded reply
   - `skip` — don't reply to this one (silent)
   - `edit: <text>` — use a different reply
4. **Post via `gh api`** with `in_reply_to` set to the original comment id

Full command syntax, escaping for code-fence bodies, and verification: [`references/posting-replies.md`](./references/posting-replies.md). Load it when you're ready to post the first reply.

**Don't bulk-post.** Each reply is its own user decision. Drift between fix and reply ("I posted before you said skip") is exactly the failure mode this loop prevents.

---

## End state

- Each addressed finding has a commit linked in the reply.
- Each inline comment thread has at least one threaded reply (`post`) OR was explicitly skipped.
- No code-only fixes without explanation, and no replies promising code that wasn't pushed.

If the reviewer's bottom line was "fix X and I'd approve," surface that to the user explicitly after the loop completes — they may want to request a re-review.
