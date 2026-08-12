#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
target_file="$target_dir/opencode.json"

mkdir -p "$target_dir"
if [ -f "$target_file" ]; then
  cp "$target_file" "$target_file.backup.$(date +%Y%m%d%H%M%S)"
fi

cp "$script_dir/opencode.json" "$target_file"
printf 'Installed OpenCode settings to %s\n' "$target_file"
