#!/usr/bin/env node
// 端末設定の記録と復元。テストで変えうる設定を、セッション開始時に PC 側へ記録し、終了時に戻す。
//
//   node scripts/android-device-state.mjs begin  <端末ID>   セッション開始時。前回の記録が残っていれば先に戻してから、今の値を記録する
//   node scripts/android-device-state.mjs end    <端末ID>   セッション終了時。記録した値に戻し、記録を消す
//   node scripts/android-device-state.mjs status [端末ID]   戻していない記録が残っているかを表示する(残っていれば exit 1)
//
// 変更のたびに記録するのではなく開始時にまとめて記録するのは、mobile-mcp の画面回転のように
// このスクリプトを通らない経路で変えられた設定も、終了時に戻せるようにするため。
// 記録ファイル(.android-state/)が残っていること自体が「前回戻せなかった」印になり、
// scripts/check-setup.mjs がセッション開始時にこれを見て知らせる。
//
// 記録の対象(SETTINGS)に無い設定はテストで変えない。増やすときは Android 固有の観点を足すときに一緒に足す。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, adb, resolveDevice } from './android-common.mjs';

const STATE_DIR = path.join(ROOT, '.android-state');

/** 記録の対象。get は adb で読んだ生の値、set はその値に戻すための adb 引数 */
const SETTINGS = [
  {
    key: 'wm-size',
    label: '画面サイズ',
    get: (s) => /Override size:\s*(\S+)/.exec(adb(['shell', 'wm', 'size'], { serial: s }))?.[1] ?? 'reset',
    set: (v) => ['shell', 'wm', 'size', v],
  },
  {
    key: 'wm-density',
    label: '表示密度',
    get: (s) => /Override density:\s*(\S+)/.exec(adb(['shell', 'wm', 'density'], { serial: s }))?.[1] ?? 'reset',
    set: (v) => ['shell', 'wm', 'density', v],
  },
  ...[
    ['system', 'font_scale', 'フォントサイズ'],
    ['system', 'accelerometer_rotation', '自動回転'],
    ['system', 'user_rotation', '画面の向き'],
    ['global', 'window_animation_scale', 'ウィンドウ アニメスケール'],
    ['global', 'transition_animation_scale', 'トランジション アニメスケール'],
    ['global', 'animator_duration_scale', 'Animator 再生時間スケール'],
  ].map(([ns, name, label]) => ({
    key: `${ns}/${name}`,
    label,
    get: (s) => adb(['shell', 'settings', 'get', ns, name], { serial: s }).trim(),
    // 記録時に未設定(null)だったものは、値を入れずに消して戻す(既定値の扱いを端末に任せる)
    set: (v) => (v === 'null' ? ['shell', 'settings', 'delete', ns, name] : ['shell', 'settings', 'put', ns, name, v]),
  })),
];

// 無線 adb の端末ID(192.168.0.5:5555 など)に含まれる ':' は Windows のファイル名に使えないので置き換える
const stateFile = (serial) => path.join(STATE_DIR, `${serial.replace(/[^A-Za-z0-9._-]/g, '_')}.json`);

function leftovers() {
  if (!fs.existsSync(STATE_DIR)) return [];
  return fs
    .readdirSync(STATE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(STATE_DIR, f), 'utf8')));
}

function save(serial) {
  const values = Object.fromEntries(SETTINGS.map((d) => [d.key, d.get(serial)]));
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFile(serial), JSON.stringify({ serial, savedAt: new Date().toISOString(), values }, null, 2));
  console.log(`📝 端末 ${serial} の設定を記録しました(${SETTINGS.length} 項目)`);
}

/** 記録した値に戻す。1つでも戻せなければ記録を残す(次回も気づけるように) */
function restore(serial) {
  const file = stateFile(serial);
  if (!fs.existsSync(file)) {
    console.log(`端末 ${serial} の記録はありません(戻すものはありません)`);
    return true;
  }
  const { values, savedAt } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const changed = [];
  const errors = [];
  for (const d of SETTINGS) {
    if (!(d.key in values)) continue;
    try {
      const now = d.get(serial);
      if (now === values[d.key]) continue;
      adb(d.set(values[d.key]), { serial });
      changed.push(`${d.label}: ${now} → ${values[d.key]}`);
    } catch (e) {
      errors.push(`${d.label}: ${e.message}`);
    }
  }
  if (errors.length) {
    console.error(`❌ 端末 ${serial} の設定を戻せませんでした(記録は残します: ${path.relative(ROOT, file)})`);
    for (const e of errors) console.error(`  ${e}`);
    return false;
  }
  fs.rmSync(file);
  if (changed.length) {
    console.log(`↩️  端末 ${serial} の設定を ${savedAt} 時点に戻しました`);
    for (const c of changed) console.log(`  ${c}`);
  } else {
    console.log(`✅ 端末 ${serial} の設定は変わっていませんでした`);
  }
  return true;
}

function main() {
  const [command, explicit] = process.argv.slice(2);
  try {
    switch (command) {
      case 'begin': {
        const serial = resolveDevice(explicit);
        // 残っている記録を上書きしない。上書きすると、戻っていない値を「元の値」として記録してしまう
        if (fs.existsSync(stateFile(serial))) {
          console.log(`⚠️  端末 ${serial} に前回のセッションで戻していない設定があります。先に戻します`);
          if (!restore(serial)) process.exit(1);
        }
        save(serial);
        break;
      }
      case 'end':
        process.exit(restore(resolveDevice(explicit)) ? 0 : 1);
        break;
      case 'status': {
        const rest = leftovers().filter((l) => !explicit || l.serial === explicit);
        if (!rest.length) {
          console.log('✅ 戻していない端末設定の記録はありません');
          break;
        }
        for (const l of rest) console.log(`⚠️  端末 ${l.serial}: ${l.savedAt} の記録が残っています`);
        process.exit(1);
        break;
      }
      default:
        console.error('使い方: node scripts/android-device-state.mjs <begin|end|status> [端末ID]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

main();
