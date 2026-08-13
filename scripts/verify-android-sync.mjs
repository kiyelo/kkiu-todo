import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const webRoot = resolve(root, 'dist')
const androidWebRoot = resolve(root, 'android/app/src/main/assets/public')
const allowedGeneratedFiles = new Set(['cordova.js', 'cordova_plugins.js'])

const fail = (message) => {
  console.error(message)
  process.exitCode = 1
}

if (!existsSync(webRoot) || !existsSync(androidWebRoot)) {
  fail('Android assets are missing. Run pnpm build:android before verification.')
} else {
  const collect = (directory) => {
    const files = new Map()
    const visit = (current) => {
      for (const entry of readdirSync(current)) {
        const absolute = resolve(current, entry)
        if (statSync(absolute).isDirectory()) visit(absolute)
        else {
          const name = relative(directory, absolute).replaceAll('\\', '/')
          const hash = createHash('sha256').update(readFileSync(absolute)).digest('hex')
          files.set(name, hash)
        }
      }
    }
    visit(directory)
    return files
  }

  const webFiles = collect(webRoot)
  const androidFiles = collect(androidWebRoot)
  const missing = [...webFiles.keys()].filter((name) => !androidFiles.has(name))
  const changed = [...webFiles.keys()].filter((name) => androidFiles.has(name) && webFiles.get(name) !== androidFiles.get(name))
  const unexpected = [...androidFiles.keys()].filter((name) => !webFiles.has(name) && !allowedGeneratedFiles.has(name))

  if (missing.length) fail(`Files missing from Android assets: ${missing.join(', ')}`)
  if (changed.length) fail(`Android assets differ from the web build: ${changed.join(', ')}`)
  if (unexpected.length) fail(`Unexpected Android web assets: ${unexpected.join(', ')}`)

  if (!process.exitCode) {
    const manifestHash = createHash('sha256')
      .update([...webFiles].sort(([left], [right]) => left.localeCompare(right)).map(([name, hash]) => `${name}:${hash}`).join('\n'))
      .digest('hex')
    console.log(JSON.stringify({ pass: true, files: webFiles.size, manifestHash }, null, 2))
  }
}
