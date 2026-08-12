#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target_dir="${XDG_CONFIG_HOME:-$HOME/.config}/ccstatusline"
target_file="$target_dir/settings.json"
package_version='2.2.27'

if ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' 'npm is required to install ccstatusline.' >&2
  exit 1
fi

npm install --global "ccstatusline@$package_version"

mkdir -p "$target_dir"
if [ -f "$target_file" ]; then
  cp "$target_file" "$target_file.backup.$(date +%Y%m%d%H%M%S)"
fi

cp "$script_dir/settings.json" "$target_file"
printf 'Installed ccstatusline %s and settings to %s\n' "$package_version" "$target_file"
