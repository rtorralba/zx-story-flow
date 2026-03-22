import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const LANG_DIR = path.resolve(process.cwd(), 'lang')

function loadJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), 'utf8'))
}

function flatten(obj, prefix = '') {
  const keys = []
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, key))
    } else {
      keys.push(key)
    }
  }
  return keys
}

describe('Language files', () => {
  const files = fs.readdirSync(LANG_DIR).filter((f) => f.endsWith('.json'))

  it('all language JSON files parse', () => {
    for (const f of files) {
      const content = fs.readFileSync(path.join(LANG_DIR, f), 'utf8')
      expect(() => JSON.parse(content)).not.toThrow()
    }
  })

  it('all languages contain the same translation keys as en.json', () => {
    const base = loadJSON('en.json')
    const baseKeys = flatten(base).sort()
    const baseSet = new Set(baseKeys)

    for (const f of files) {
      if (f === 'en.json') continue
      const obj = loadJSON(f)
      const keys = flatten(obj).sort()
      const keySet = new Set(keys)

      const missing = baseKeys.filter((k) => !keySet.has(k))
      const extra = keys.filter((k) => !baseSet.has(k))

      expect(missing).toEqual([])
      expect(extra).toEqual([])
    }
  })

  it('all translation keys used in source are present in each language file', () => {
    const repoRoot = process.cwd()
    const ignoreDirs = ['node_modules', 'dist', 'examples', 'tests', '.git']

    function walk(dir) {
      let out = []
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) {
          if (ignoreDirs.includes(name)) continue
          out = out.concat(walk(full))
        } else {
          out.push(full)
        }
      }
      return out
    }

    const filesList = walk(repoRoot).filter((f) => /\.(js|html|htm)$/.test(f))

    const keyRegex1 = /data-i18n\s*=\s*['\"]([^'\"]+)['\"]/g
    const keyRegex2 = /\bt\(\s*['\"]([^'\"]+)['\"]\s*\)/g
    const keyRegex3 = /\bi18n\.t\(\s*['\"]([^'\"]+)['\"]\s*\)/g

    const used = new Set()

    for (const f of filesList) {
      const content = fs.readFileSync(f, 'utf8')
      let m
      while ((m = keyRegex1.exec(content))) used.add(m[1])
      while ((m = keyRegex2.exec(content))) used.add(m[1])
      while ((m = keyRegex3.exec(content))) used.add(m[1])
    }

    const base = loadJSON('en.json')
    const baseKeys = new Set(flatten(base))
    const filesLang = files.map((f) => ({ name: f, obj: loadJSON(f), keys: new Set(flatten(loadJSON(f))) }))

    const missingInBase = [...used].filter((k) => !baseKeys.has(k))
    expect(missingInBase).toEqual([])

    for (const lang of filesLang) {
      const missing = [...used].filter((k) => !lang.keys.has(k))
      expect(missing, `Missing translations in ${lang.name}: ${missing.join(', ')}`).toEqual([])
    }
  })
})
