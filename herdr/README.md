# Herdr configuration

`config.toml` is the version-controlled Herdr user configuration. Run
`./setup.sh` from this directory to install it. The script backs up an existing
configuration first.

Install destinations:

- Windows: `%APPDATA%\\herdr\\config.toml`
- Linux/macOS: `${XDG_CONFIG_HOME:-~/.config}/herdr/config.toml`

After changing an installed configuration, reload it with `herdr server
reload-config` or restart Herdr.
