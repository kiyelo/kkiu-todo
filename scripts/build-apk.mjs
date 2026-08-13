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

runPnpm(['run', 'verify:checks'])
runPnpm(['run', 'build:android:verified'])

if (process.platform === 'win32') {
  run('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat', '--no-daemon', 'assembleDebug'], androidRoot)
} else {
  run('./gradlew', ['--no-daemon', 'assembleDebug'], androidRoot)
}

console.log(`APK: ${resolve(androidRoot, 'app/build/outputs/apk/debug/app-debug.apk')}`)
