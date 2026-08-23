#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"

mkdir -p "$target_dir"
mkdir -p "$target_dir/plugins"

# 1. Install opencode.json (model/provider configs)
if [ -f "$script_dir/opencode.json" ]; then
  if [ -f "$target_dir/opencode.json" ]; then
    cp "$target_dir/opencode.json" "$target_dir/opencode.json.backup.$(date +%Y%m%d%H%M%S)"
  fi
  cp "$script_dir/opencode.json" "$target_dir/opencode.json"
  printf 'Installed OpenCode config to %s\n' "$target_dir/opencode.json"
fi

# 2. Install tui.jsonc (UI & plugin registrations)
if [ -f "$script_dir/tui.jsonc" ]; then
  if [ -f "$target_dir/tui.jsonc" ]; then
    cp "$target_dir/tui.jsonc" "$target_dir/tui.jsonc.backup.$(date +%Y%m%d%H%M%S)"
  fi
  cp "$script_dir/tui.jsonc" "$target_dir/tui.jsonc"
  printf 'Installed OpenCode TUI config to %s\n' "$target_dir/tui.jsonc"
fi

# 3. Install plugins (copy plugins/ directory and files)
if [ -d "$script_dir/plugins" ]; then
  # If running in git repo, make sure submodules are initialized
  if [ -d "$script_dir/../../.git" ] || [ -f "$script_dir/../../.git" ]; then
    (cd "$script_dir/../.." && git submodule update --init --recursive 2>/dev/null || true)
  fi
  cp -r "$script_dir/plugins/." "$target_dir/plugins/"
  printf 'Installed plugins from %s/plugins/ to %s/plugins/\n' "$script_dir" "$target_dir"
fi

printf 'All OpenCode configurations and plugins installed successfully.\n'
