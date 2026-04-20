// DEBUG=devtask で詳細ログを出力（仕様書 7.7）
const enabled = process.env.DEBUG === 'devtask'

export function debug(...args) {
  if (enabled) {
    console.error('[devtask:debug]', ...args)
  }
}
