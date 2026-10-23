#!/usr/bin/env node
// Claude Code の PreToolUse フック。Android まわりの操作を、中身まで見て止めるか承認を求める。
//
// 1. Bash: コマンド全体を見る。permission の Bash ルールではなくフックにしているのは、Bash ルールが先頭一致で、
//    端末を明示する形(`adb -s <端末ID> install ...`)や、環境変数・cd を前に付けた形を取りこぼすため
// 2. mobile-mcp の mobile_batch_commands: 中に並んだ各ステップのツール名を見る。
//    batch はほかのツールを中で呼べるので、ツール単位の permission(.claude/settings.json)を素通りしてしまう
//
// ただし AI が書いたスクリプトの中から adb を呼ぶ経路は、ここからは見えない(docs/android-support-plan.md「制限と、その効き方」)。
//
//   deny … 未リリースのアプリをクラウドへ送る経路(mobilecli の直接実行)と、テレメトリ停止を通らない Mobilewright の起動
//   ask  … アプリの入れ替え・データ消去・再起動など、端末の状態を戻せない操作
import fs from 'node:fs';

// コマンドの区切り(; & | 改行)をまたがない範囲で、adb の後ろに続く引数を見る
const ADB = String.raw`\badb\b[^;&|\n]*`;
// コマンドの先頭(行頭・区切りの直後。環境変数の前置きと npx / npm exec は飛ばす)にあるときだけ当てる。
// 単語がどこかに出てくるだけで止めると、`ls node_modules/mobilecli` や `grep mobilewright` まで止めてしまう
const AT_COMMAND = String.raw`(?:^|[;&|(]\s*|\n\s*)(?:\w+=\S*\s+)*(?:(?:npx|npm\s+exec)\s+(?:(?:--no-install|-y|--yes|--)\s+)*)?(?:\S*[\\/])?`;

const RULES = [
  {
    decision: 'deny',
    pattern: new RegExp(String.raw`${AT_COMMAND}mobilecli(?=\s|$)`),
    reason:
      'mobilecli の直接実行は禁止です(クラウド端末へのログイン・接続の経路になるため)。端末の操作は mobile-mcp か npm run test:android を使ってください',
  },
  {
    decision: 'deny',
    // CLI の本体を node で直接実行する形も止める(grep などでファイルを読むだけのコマンドは止めない)
    pattern: new RegExp(String.raw`${AT_COMMAND}mobilewright(?=\s|$)|${AT_COMMAND}node(?:\.exe)?\s+(?:-\S+\s+)*\S*mobilewright[\\/]dist[\\/]cli\.js`),
    reason:
      'Mobilewright の直接起動は禁止です(テレメトリ停止と、対象・端末の確認を通らないため)。npm run test:android -- <target-slug> / android:doctor / android:inspect / android:codegen を使ってください',
  },
  {
    decision: 'ask',
    pattern: new RegExp(String.raw`${ADB}\s(?:install(?:-multiple)?|uninstall)\b`),
    reason: 'アプリのインストール・削除です。対象の端末とアプリが正しいか確認してください',
  },
  {
    decision: 'ask',
    pattern: new RegExp(String.raw`${ADB}\bshell\b[^;&|\n]*\b(?:pm|cmd\s+package)\s+(?:clear|uninstall|install|disable(?:-user)?|reset-permissions)\b`),
    reason: 'アプリのデータ消去・削除・無効化です。端末上のログイン状態などが消えます',
  },
  {
    decision: 'ask',
    pattern: new RegExp(String.raw`${ADB}\s(?:reboot|root|remount|sideload)\b|${ADB}\bshell\b[^;&|\n]*\b(?:rm|reboot)\b|MASTER_CLEAR`),
    reason: '端末の再起動・ファイル削除・初期化につながる操作です',
  },
];

// .claude/settings.json の permissions と同じ分け方。batch の中に並んだときにも同じ扱いにする
const BATCH_RULES = [
  {
    decision: 'deny',
    tools: ['mobile_login_to_cloud_provider', 'mobile_list_remote_devices', 'mobile_allocate_remote_device', 'mobile_release_remote_device'],
    reason: 'クラウド端末のツールは禁止です(未リリースのアプリを外部の端末へ送る経路になるため)。端末がつながっていなければ、止まって人に接続を頼んでください',
  },
  {
    decision: 'ask',
    tools: ['mobile_install_app', 'mobile_uninstall_app'],
    reason: 'アプリのインストール・削除です。対象の端末とアプリが正しいか確認してください',
  },
];

let input;
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}

// deny を ask より先に評価する(同じ操作に両方当たったら止める方を取る)
let hit;
if (input?.tool_name === 'Bash') {
  const command = input?.tool_input?.command ?? '';
  hit = RULES.find((r) => r.pattern.test(command));
} else if (input?.tool_name === 'mcp__mobile-mcp__mobile_batch_commands') {
  const steps = (input?.tool_input?.steps ?? []).map((s) => s?.name);
  hit = BATCH_RULES.find((r) => steps.some((n) => r.tools.includes(n)));
}
if (!hit) process.exit(0);

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: hit.decision,
      permissionDecisionReason: `[guard-android] ${hit.reason}`,
    },
  }),
);
