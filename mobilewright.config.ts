import { defineConfig } from 'mobilewright';

/**
 * Android ネイティブアプリの spec の実行設定。`npm run test:android -- <target-slug>` から使う。
 *
 * 対象・パッケージ名・端末は scripts/run-android.mjs が決めて環境変数で渡す。
 * ここで既定値を持たせないのは、指定し忘れたときに別案件のアプリや別の端末で黙って走るのを防ぐため。
 * 環境変数が無いとき(直接起動されたとき)は、存在しないフォルダを指して1本も実行しない。
 */
const target = process.env.QA_ANDROID_TARGET;
const bundleId = process.env.QA_ANDROID_PACKAGE;
const deviceId = process.env.QA_ANDROID_SERIAL;
const ready = Boolean(target && bundleId && deviceId);

if (!ready) {
  console.error('[mobilewright.config] 対象と端末が決まっていません。npm run test:android -- <target-slug> で実行してください');
}

export default defineConfig({
  platform: 'android',
  bundleId,
  deviceId,
  testDir: `./tests/generated/android/${ready ? target : '__run-via-npm-run-test-android__'}`,
  testMatch: '**/*.android.spec.ts',
  outputDir: './test-results-android',
  // 失敗時のビューツリー(画面の文言と要素の一覧)は、スクショでは読めない「名前の無い要素」の根拠になる
  viewTree: 'on-failure',
  // 1台の端末を順番に使う。並列にすると同じ端末を取り合う
  workers: 1,
  // 失敗はまず実装側のバグを疑う(CLAUDE.md)。リトライで通ると、たまに起きる欠陥を見逃す
  retries: 0,
  // json は scripts/run-android.mjs が読み、失敗時のスクショとビューツリーをファイルに書き出す
  // (この2つはレポートの中にしか残らず、エビデンスとしてコピーできないため)
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results-android/results.json' }]],
  use: {
    // MobilewrightUseOptions の型には無いが、Playwright Test の video オプションとしてそのまま効く
    ...({ video: 'retain-on-failure' } as object),
  },
});
