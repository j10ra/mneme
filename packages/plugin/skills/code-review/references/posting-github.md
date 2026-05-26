# Posting an inline review to GitHub

Load when: about to publish a review with comments anchored to specific lines.

## The recipe

```bash
gh api -X POST /repos/<owner>/<repo>/pulls/<n>/reviews --input payload.json
```

Where `payload.json`:

```json
{
  "event": "COMMENT",
  "body": "Top-level summary that anchors the review.",
  "comments": [
    {
      "path": "packages/foo/bar.ts",
      "line": 670,
      "side": "RIGHT",
      "body": "Specific finding with concrete failure scenario.\n\nFix:\n```ts\nif (s.aborted) return;\n```"
    }
  ]
}
```

`event` options:
- `"COMMENT"` — default; neutral review
- `"APPROVE"` — only if user explicitly told you to approve
- `"REQUEST_CHANGES"` — only if user explicitly told you to block

`side`:
- `"RIGHT"` — line in the new file (added or context-after-add). Almost all findings.
- `"LEFT"` — line in the old file (deleted code). Use when commenting on removed behavior in the original.

Body fields support full GitHub-flavored markdown — code fences, inline links, headings, the lot.

---

## The hunk-line gotcha

`line` MUST fall inside a diff hunk or the API rejects with:

```json
{"message":"Unprocessable Entity","errors":["Line could not be resolved"],"status":"422"}
```

Enumerate valid hunk ranges before assembling the payload:

```bash
gh pr diff <n> --repo <owner>/<repo> | grep -E "^(diff|@@|\+\+\+)"
```

Output looks like:

```
diff --git a/packages/server/src/routes/dream.ts ...
+++ b/packages/server/src/routes/dream.ts
@@ -640,6 +640,14 @@ ...
@@ -659,6 +667,7 @@ ...
@@ -680,12 +689,7 @@ ...
```

Each `@@ -OLD,m +NEW,n @@` header tells you: the new-side hunk covers lines `NEW` through `NEW + n - 1`. From the above:

- Hunk 1: new lines `640..(640+14-1)` = 640–653
- Hunk 2: new lines `667..(667+7-1)` = 667–673
- Hunk 3: new lines `689..(689+7-1)` = 689–695

If a finding's natural anchor is **outside** any hunk:
- Anchor on the closest in-hunk line and reference the out-of-hunk line number in the body (e.g. *"...at line 697 below..."*).
- Or move that finding into the top-level `body` field instead of `comments[]`.

For multi-line comments, use `start_line` + `start_side` alongside `line` + `side`. Both must still be inside hunks.

---

## Supersede an earlier review

GitHub does NOT allow deleting a submitted review.

- `DELETE /pulls/{n}/reviews/{id}` returns 404 for non-pending reviews.
- Dismissal (`PUT /reviews/{id}/dismissals`) only works on `APPROVED` / `REQUEST_CHANGES` reviews AND requires admin permission on the repo.

Pattern: post a **new** review whose top-level `body` opens with something like *"Inline review (supersedes the prior top-level comment)."*. The earlier review stays on the timeline; the new one is clearly authoritative.

---

## Verifying the post

```bash
gh pr view <n> --repo <owner>/<repo> --json reviews \
  --jq '.reviews[-1] | {state, author: .author.login, url: .html_url, body: .body[:200]}'
```

Print the `html_url` for the user. Confirm count of inline comments matches what you posted.

---

## Common failure modes

| Error | Cause | Fix |
|---|---|---|
| `Line could not be resolved` | `line` outside any hunk | Pick an in-hunk anchor; see "hunk-line gotcha" above |
| `path is invalid` | File not in the PR diff (e.g. renamed) | Check `gh pr diff` for the exact `+++ b/...` path |
| `pull request review thread line must be part of the diff` | Same as line-could-not-be-resolved, different phrasing | Same fix |
| `Validation Failed` with no detail | Usually a missing required field (`event` or `comments[].path`) | Validate JSON against the schema above |
| 403 / 404 on delete | Submitted review, not pending | Supersede with a new review (see above) |
