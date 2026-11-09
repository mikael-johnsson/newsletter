#!/usr/bin/env bash
# PostToolUse: after Edit/Write of a .ts/.js/.svelte file, run prettier + eslint --fix on it,
# then svelte-check on the project. Exit 2 + stderr feeds problems back to the agent.
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in *.ts|*.js|*.svelte) ;; *) exit 0 ;; esac
[ -f "$file" ] || exit 0
root="$CLAUDE_PROJECT_DIR"; bin="$root/node_modules/.bin"
[ -d "$bin" ] || exit 0
problems=""
[ -x "$bin/prettier" ] && "$bin/prettier" --write --log-level warn "$file" >/dev/null 2>&1
if [ -x "$bin/eslint" ]; then
  out=$(cd "$root" && "$bin/eslint" --fix "$file" 2>&1) || problems+="eslint ($file):\n$out\n\n"
fi
if [ -x "$bin/svelte-check" ]; then
  out=$(cd "$root" && "$bin/svelte-check" --threshold error --output human 2>&1) || problems+="svelte-check:\n$out\n"
fi
[ -n "$problems" ] && { printf '%b' "$problems" >&2; exit 2; }
exit 0
