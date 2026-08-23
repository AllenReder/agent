#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# Herdr uses %APPDATA% on Windows and the XDG configuration directory on
# Linux/macOS. APPDATA is also available when this script is run via Git Bash.
if [ -n "${APPDATA:-}" ]; then
  target_dir="$APPDATA/herdr"
else
  target_dir="${XDG_CONFIG_HOME:-$HOME/.config}/herdr"
fi
target_file="$target_dir/config.toml"

mkdir -p "$target_dir"
if [ -f "$target_file" ]; then
  cp "$target_file" "$target_file.backup.$(date +%Y%m%d%H%M%S)"
fi

cp "$script_dir/config.toml" "$target_file"
printf 'Installed Herdr settings to %s\n' "$target_file"
