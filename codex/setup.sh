#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target_dir="${CODEX_HOME:-$HOME/.codex}"
target_file="$target_dir/config.toml"

mkdir -p "$target_dir"
if [ -f "$target_file" ]; then
  cp "$target_file" "$target_file.backup.$(date +%Y%m%d%H%M%S)"
fi

cp "$script_dir/config.toml" "$target_file"
printf 'Installed Codex settings to %s\n' "$target_file"
