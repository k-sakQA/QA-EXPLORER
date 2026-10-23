// Android 対応のスクリプト(run-android / android-device-state)で共通に使う、adb と対象スラッグの扱い。
// Node 組み込みモジュールのみ使用(Mac と Windows の両方で、シェルを介さずに動かすため)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ANDROID_SPEC_ROOT = path.join(ROOT, 'tests', 'generated', 'android');

/**
 * adb の実行ファイル。ANDROID_HOME があればその platform-tools を優先する。
 * PATH の先頭にある adb を使わないのは、Homebrew やメーカーの管理ソフトが入れた別の版の adb を拾うと、
 * 「adb server version doesn't match」で接続が切れるため
 */
export function adbPath() {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (home) {
    const exe = path.join(home, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
    if (fs.existsSync(exe)) return exe;
  }
  return 'adb';
}

/** adb を実行して stdout を返す。失敗したら例外(呼び出し側でメッセージを付けて止める) */
export function adb(args, { serial } = {}) {
  const full = serial ? ['-s', serial, ...args] : args;
  const r = spawnSync(adbPath(), full, { encoding: 'utf8' });
  if (r.error) throw new Error(`adb を起動できません (${r.error.code ?? r.error.message})。Android SDK の platform-tools を PATH に入れてください`);
  if (r.status !== 0) throw new Error(`adb ${full.join(' ')} が失敗しました: ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.replace(/\r\n/g, '\n');
}

/** 接続中の端末。state が device 以外(unauthorized / offline)も含めて返す */
export function listDevices() {
  return adb(['devices'])
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state)
    .map(([serial, state]) => ({ serial, state }));
}

/**
 * 操作する端末を1台に決める。
 * 複数台つながっていて指定が無いときに「最初の1台」を選ばないのは、
 * 別の案件の端末を黙って操作してしまうのを防ぐため
 */
export function resolveDevice(explicit) {
  const wanted = explicit || process.env.ANDROID_SERIAL || '';
  const devices = listDevices();
  const ready = devices.filter((d) => d.state === 'device');
  const describe = () => devices.map((d) => `  ${d.serial}  ${d.state}`).join('\n') || '  (なし)';

  if (wanted) {
    const hit = devices.find((d) => d.serial === wanted);
    if (!hit) throw new Error(`端末 ${wanted} がつながっていません。接続中の端末:\n${describe()}`);
    if (hit.state !== 'device') throw new Error(`端末 ${wanted} が ${hit.state} です(unauthorized なら端末側で USB デバッグを許可する)`);
    return wanted;
  }
  if (ready.length === 1) return ready[0].serial;
  if (ready.length === 0) throw new Error(`操作できる端末がありません。接続中の端末:\n${describe()}`);
  throw new Error(`端末が ${ready.length} 台つながっています。--device <端末ID> で指定してください:\n${describe()}`);
}

/** パッケージ名 → 対象スラッグ。例: com.example.shop → android-com-example-shop */
export function slugFromPackage(pkg) {
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(pkg)) {
    throw new Error(`パッケージ名として正しくありません: ${pkg}`);
  }
  return `android-${pkg.replace(/\./g, '-')}`;
}

/**
 * 対象スラッグ → パッケージ名。パッケージ名にはハイフンを使えないので、逆に戻せる。
 * スラッグからパッケージ名を導くのは、spec の置き場所と実行対象のアプリを別々に指定させると、
 * 食い違ったとき(A社の spec を B社のアプリに対して走らせる)に気づけないため
 */
export function packageFromSlug(slug) {
  const m = /^android-([A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z][A-Za-z0-9_]*)+)$/.exec(slug ?? '');
  if (!m) throw new Error(`Android の対象スラッグではありません: ${slug ?? '(未指定)'}(例: android-com-example-shop)`);
  return m[1].replace(/-/g, '.');
}

/** 端末に対象アプリが入っているか */
export function isInstalled(serial, pkg) {
  return adb(['shell', 'pm', 'path', pkg], { serial }).trim().startsWith('package:');
}
