#!/usr/bin/env node
// Mobilewright を呼ぶ唯一の入口。npm スクリプトから使う。
//
//   npm run test:android -- <target-slug> [ファイル名の一部...] [--device <端末ID>] [--reporter list]
//   npm run android:doctor
//   npm run android:inspect
//   npm run android:codegen
//
// ここを通すのは、次の3つを人の注意に頼らず毎回そろえるため。
//   1. テレメトリを止める環境変数を付ける(npm スクリプトに `VAR=1 コマンド` と書く形は Windows で動かない)
//   2. 実行する spec は対象スラッグのフォルダだけにし、パッケージ名もスラッグから決める
//   3. 端末を1台に決め、その端末に対象アプリが入っていることを確かめてから実行する
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ANDROID_SPEC_ROOT, ROOT, isInstalled, packageFromSlug, resolveDevice } from './android-common.mjs';

const TELEMETRY_OFF = { MOBILEWRIGHT_DISABLE_TELEMETRY: '1', MOBILEMCP_DISABLE_TELEMETRY: '1' };

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

/** mobilewright の CLI を node で直接起動する(npx や .cmd を介さないので Mac と Windows で同じに動く) */
function runMobilewright(args, extraEnv = {}) {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'mobilewright', 'package.json'), 'utf8'));
  const cli = path.join(ROOT, 'node_modules', 'mobilewright', pkgJson.bin.mobilewright);
  const r = spawnSync(process.execPath, [cli, ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...TELEMETRY_OFF, ...extraEnv },
  });
  return r.status ?? 1;
}

/**
 * 失敗時のスクショとビューツリーを、失敗したテストのフォルダ(動画と同じ場所)にファイルとして書き出す。
 * Mobilewright はこの2つをレポートの中にしか残さないので、エビデンスとして reports/ にコピーできるようにする
 */
function extractFailureAttachments() {
  const file = path.join(ROOT, 'test-results-android', 'results.json');
  if (!fs.existsSync(file)) return;
  const ext = { 'image/png': 'png', 'application/json': 'json' };
  const dirs = [];
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const result of spec.tests.flatMap((t) => t.results)) {
        const context = result.attachments.find((a) => a.name === 'error-context' && a.path);
        if (!context) continue;
        const dir = path.dirname(context.path);
        for (const a of result.attachments) {
          if (a.body && ext[a.contentType]) {
            fs.writeFileSync(path.join(dir, `${a.name}.${ext[a.contentType]}`), Buffer.from(a.body, 'base64'));
          }
        }
        dirs.push(dir);
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of JSON.parse(fs.readFileSync(file, 'utf8')).suites ?? []) visit(suite);
  if (dirs.length) {
    console.log('\n📎 失敗時のエビデンス(スクショ・ビューツリー・動画)。次の実行で消えるので、残すものは reports/<target-slug>/evidence/ へ:');
    for (const d of dirs) console.log(`  ${path.relative(ROOT, d)}`);
  }
}

function takeOption(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (!value || value.startsWith('--')) fail(`${name} の値がありません`);
  args.splice(i, 2);
  return value;
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'test': {
    const args = [...rest];
    const device = takeOption(args, '--device');
    const target = args.shift();
    if (!target || target.startsWith('--')) {
      fail('対象スラッグを指定してください。例: npm run test:android -- android-com-example-shop\n   (全対象をまとめて実行する手段はありません。別案件の spec を取り違えて走らせないため)');
    }

    let pkg, serial;
    try {
      pkg = packageFromSlug(target);
      const dir = path.join(ANDROID_SPEC_ROOT, target);
      if (!fs.existsSync(dir)) throw new Error(`spec のフォルダがありません: ${path.relative(ROOT, dir)}`);
      serial = resolveDevice(device);
      if (!isInstalled(serial, pkg)) throw new Error(`端末 ${serial} に ${pkg} が入っていません(対象スラッグ ${target})`);
    } catch (e) {
      fail(e.message);
    }

    console.log(`▶ 対象 ${target} (${pkg}) / 端末 ${serial}`);
    const status = runMobilewright(['test', ...args], {
      QA_ANDROID_TARGET: target,
      QA_ANDROID_PACKAGE: pkg,
      QA_ANDROID_SERIAL: serial,
      ANDROID_SERIAL: serial,
    });
    // --reporter を指定すると設定の json レポートが外れるので、そのときは書き出せない
    extractFailureAttachments();
    process.exit(status);
  }
  case 'doctor':
  case 'inspect':
  case 'codegen':
    process.exit(runMobilewright([command, ...rest]));
  default:
    fail(`使い方: node scripts/run-android.mjs <test|doctor|inspect|codegen> ...(受け取った値: ${command ?? '(なし)'})`);
}
