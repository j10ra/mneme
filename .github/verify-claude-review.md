# claude-review pipeline verification

Throwaway file to confirm the CI reviewer can read the diff and post comments
after the read-only gh/git allowlist fix. Safe to delete.

```bash
# Sample snippet with an intentional flaw for the reviewer to flag inline.
process() {
  local dir=$1
  rm -rf $dir/tmp
}
```
