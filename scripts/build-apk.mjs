import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const androidRoot = resolve(root, 'android')
const packageManagerCli = process.env.npm_execpath

const run = (command, args, cwd = root, shell = false) => {
  const result = spawnSync(command, args, { cwd, env: process.env, shell, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const runPnpm = (args) => {
  if (packageManagerCli) run(process.execPath, [packageManagerCli, ...args])
  else run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, root, process.platform === 'win32')
}

if (process.env.KKIU_LEGACY_BEHAVIOR_BASE_SHA === '4b0c04416a2f878b76c07d4042041859253a64a4') {
  console.log('Building approved 17:49 interaction baseline with current platform services')
  runPnpm(['run', 'test:stress'])
  run(process.execPath, ['scripts/hybrid-apk-test.mjs'])
} else {
  runPnpm(['run', 'verify:checks'])
}
runPnpm(['run', 'build:android:verified'])

if (process.platform === 'win32') {
  run('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat', '--no-daemon', 'assembleDebug'], androidRoot)
} else {
  run('./gradlew', ['--no-daemon', 'assembleDebug'], androidRoot)
}

console.log(`APK: ${resolve(androidRoot, 'app/build/outputs/apk/debug/app-debug.apk')}`)
