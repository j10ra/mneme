# Posting threaded replies to GitHub PR review comments

Loaded on demand by the `responding-to-reviews` skill when you're about to post the first reply.

## The API surface

`gh pr review` does NOT support threaded replies to inline comments. Must use the REST API:

```bash
POST /repos/{owner}/{repo}/pulls/{pull_number}/comments
```

With body:

```json
{
  "body": "<your reply text>",
  "in_reply_to": <original-comment-id-number>
}
```

The `in_reply_to` field is what makes it a threaded reply rather than a new top-level inline comment. Numeric (not string).

## The escaping problem

Reply bodies often contain code fences, backticks, and indentation. Naïve heredocs break in three places: shell expansion of `$`, JSON escaping of `"`, and quoting of nested backticks.

**Recipe that works:** write the body to a temp file, then `jq` it into the API payload.

```bash
# 1. Write the reply body verbatim to a temp file
cat > /tmp/reply.md <<'EOF'
Fixed in commit `<sha>`. The new function does X:

```ts
function example() { return 42; }
```

Tests cover the abort-mid-batch case.
EOF

# 2. Wrap with jq into a JSON object with in_reply_to
jq -Rs --arg in_reply_to "<original-comment-id>" \
   '{body: ., in_reply_to: ($in_reply_to | tonumber)}' < /tmp/reply.md | \
  gh api -X POST repos/<owner>/<repo>/pulls/<n>/comments --input - \
    --jq '{id, in_reply_to_id, html_url}'

# 3. Clean up
rm /tmp/reply.md
```

The `--input -` flag tells `gh api` to read the JSON body from stdin. The `--jq` at the end extracts just the fields you want from the response — usually you want `html_url` to show the user.

## Verifying the thread

After posting, the response includes `in_reply_to_id`. Confirm it matches the original comment's id:

```bash
# Expected: in_reply_to_id == the id you passed
```

Or list all comments and check the thread:

```bash
gh api repos/<owner>/<repo>/pulls/<n>/comments \
  --jq '.[] | {id, in_reply_to_id, body: .body[0:80]}'
```

A correctly-threaded reply will show up with `in_reply_to_id` pointing at the original. A misfire (e.g., `in_reply_to` omitted) lands as a new top-level inline comment on the same line — visually adjacent but structurally not a thread.

## What if the original was a review-submission body, not an inline comment?

Some reviewers leave their findings in the review submission's `body` field rather than as separate inline comments. There's no `in_reply_to` for review bodies — you have two options:

1. **Top-level issue comment** (not threaded, but visible):
   ```bash
   gh api repos/<owner>/<repo>/issues/<n>/comments \
     -f body="$(cat /tmp/reply.md)"
   ```
2. **New inline comment on the relevant line**, citing the review body:
   ```bash
   gh api -X POST repos/<owner>/<repo>/pulls/<n>/reviews \
     --input '{"event":"COMMENT","comments":[{"path":"...","line":N,"body":"..."}]}'
   ```

Prefer (2) when the finding is line-specific — it shows up in the diff view where the reviewer expects engagement.

## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| `Resource not accessible by integration` | Wrong scope on the gh token | `gh auth refresh -s repo` |
| Reply lands as new top-level comment | Forgot `in_reply_to` (or passed it as a string) | Pass numeric: `($id | tonumber)` |
| `Invalid request. "base", "head" weren't supplied` | Used `pr create` API params on the comment endpoint | Use `gh pr create` for PRs; this endpoint is comments-only |
| Body shows literal `@/tmp/reply.md` | Used `-f body=@file` (which doesn't expand `@file` for `body` field) | Use the `jq -Rs` recipe above instead |
| Backticks render as code instead of literals | GitHub interpreted them; that's the desired behavior | If you wanted literal backticks: use `\`\`\`` in the source markdown |

## The full per-reply pseudocode

```text
For each inline comment to reply to:
  1. Quote the original to the user
  2. Draft the reply (link to commit SHA, quote new code if relevant)
  3. Ask: post / skip / edit:<text>
  4. If post:
     - cat > /tmp/reply.md <<EOF ... EOF
     - jq -Rs ... | gh api -X POST .../pulls/N/comments --input -
     - rm /tmp/reply.md
     - Confirm: discussion_r<id> URL returned
  5. If skip: note silently, move on
  6. If edit:<text>: substitute text, return to step 3
```

The loop is per-comment, not bulk. Each reply is its own user decision.
