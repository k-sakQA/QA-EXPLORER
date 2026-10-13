#!/bin/sh
# storage/ の認証ファイルを、ログインから8時間たったら自動で消す launchd ジョブを登録する。
# 30分ごと(とログイン・スリープ復帰後)に scripts/clear-auth.mjs --expired を実行する。
#
#   sh scripts/install-auth-cleaner.sh              登録(登録済みなら入れ直す)
#   sh scripts/install-auth-cleaner.sh --uninstall  登録を外す
#
# ログ: ~/Library/Logs/qa-explorer-auth-cleaner.log
set -eu

LABEL=com.qa-explorer.auth-cleaner
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
LOG="$HOME/Library/Logs/qa-explorer-auth-cleaner.log"

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
    <string>$REPO/scripts/clear-auth.mjs</string>
    <string>--expired</string>
  </array>
  <key>StartInterval</key><integer>1800</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "$DOMAIN" "$PLIST" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"
echo "登録しました: $LABEL (30分ごとに、ログインから8時間たった認証ファイルを削除)"
echo "ログ: $LOG"
