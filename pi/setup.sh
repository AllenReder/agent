#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target_dir="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"

mkdir -p "$target_dir"

install_file() {
  src=$1
  dst=$2
  if [ ! -f "$src" ]; then
    return 0
  fi
  if [ -f "$dst" ]; then
    cp "$dst" "$dst.backup.$(date +%Y%m%d%H%M%S)"
  fi
  cp "$src" "$dst"
  printf 'Installed Pi config to %s\n' "$dst"
}

install_file "$script_dir/settings.json" "$target_dir/settings.json"
install_file "$script_dir/models.json" "$target_dir/models.json"
install_file "$script_dir/web-search.json" "$target_dir/web-search.json"
install_file "$script_dir/fusion-models.json" "$target_dir/fusion-models.json"
install_file "$script_dir/claude-code-style.json" "$target_dir/claude-code-style.json"
install_file "$script_dir/pi-fff.json" "$target_dir/pi-fff.json"

printf '\nAPI keys are intentionally not versioned. After install, make the custom\n'
printf 'providers usable by running /login inside Pi (or passing --api-key), and add\n'
printf 'exaApiKey / tavilyApiKey / anysearchApiKey back into %s\n' "$target_dir/web-search.json"
printf 'if you want those search providers.\n'