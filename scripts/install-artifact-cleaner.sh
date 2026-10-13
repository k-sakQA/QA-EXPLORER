#!/bin/sh
# .playwright-mcp/・test-runs/*-html/・.explore-scratch/ の古いものを、1日1回自動で消す launchd ジョブを登録する。
# 毎日 12:00(とログイン後)に scripts/clean-artifacts.mjs を実行する。保持日数は clean-artifacts.mjs の既定値。
#
#   sh scripts/install-artifact-cleaner.sh              登録(登録済みなら入れ直す)
#   sh scripts/install-artifact-cleaner.sh --uninstall  登録を外す
#
# ログ: ~/Library/Logs/qa-explorer-artifact-cleaner.log
set -eu

LABEL=com.qa-explorer.artifact-cleaner
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "$DOMAIN" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "登録を外しました: $LABEL"
  exit 0
fi

REPO=$(cd "$(dirname "$0")/.." && pwd)
NODE=$(command -v node)
LOG="$HOME/Library/Logs/qa-explorer-artifact-cleaner.log"

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$REPO/scripts/clean-artifacts.mjs</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>12</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "$DOMAIN" "$PLIST" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"
echo "登録しました: $LABEL (毎日 12:00 に、.playwright-mcp/ は14日・test-runs/*-html/ は30日・.explore-scratch/ は7日たったものを削除)"
echo "ログ: $LOG"
