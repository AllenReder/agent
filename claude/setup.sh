#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
target_file="$target_dir/settings.json"

mkdir -p "$target_dir"
if [ -f "$target_file" ]; then
  cp "$target_file" "$target_file.backup.$(date +%Y%m%d%H%M%S)"
fi

cp "$script_dir/settings.json" "$target_file"
printf 'Installed Claude Code settings to %s\n' "$target_file"
