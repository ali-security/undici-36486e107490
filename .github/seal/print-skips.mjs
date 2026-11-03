// SEAL: reporting only. node:test prints a bare "# SKIP" for tests whose
// `skip` option is a boolean, so the CI log never says WHY a test skipped.
// This lists every upstream skip declaration under test/ with its condition
// (resolving `{ skip }` / `skip: someVar` to the variable's definition), so
// each "# SKIP" line in the test output above can be matched to its reason.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const files = []
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (p === join('test', 'web-platform-tests') || p === join('test', 'fixtures')) continue; const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(c|m)?js$/.test(n)) files.push(p) } }
walk('test')
console.log('=== Upstream skip declarations (each "# SKIP" in this leg maps to one of these; the condition is the reason) ===')
console.log(`platform=${process.platform} node=${process.version}`)
const re = /\b(it|test|describe)\.skip\(|\bskip\s*:|\{\s*skip\s*[,}]|\bthis\.skip\(\)|\bt\.skip\(/
for (const f of files.sort()) {
  const lines = readFileSync(f, 'utf8').split('\n')
  lines.forEach((l, i) => {
    if (!re.test(l)) return
    const tag = /\b(it|test|describe)\.skip\(/.test(l) ? ' [UNCONDITIONAL: upstream marks this test .skip (not implemented / placeholder)]' : ''
    const out = [`${f.replace(/\\/g, '/')}:${i + 1}: ${l.trim()}${tag}`]
    if (/^\s*skip\s*:/.test(l) || /this\.skip\(\)/.test(l)) out.push(...lines.slice(Math.max(0, i - 3), i).map(x => '    context: ' + x.trim()))
    const ids = new Set()
    for (const m of l.matchAll(/\bskip\s*:\s*!?\s*([A-Za-z_$][\w$]*)\b(?![.(])/g)) ids.add(m[1])
    if (/\{\s*skip\s*[,}]/.test(l)) ids.add('skip')
    for (const m of l.matchAll(/\|\|\s*!?([A-Za-z_$][\w$]*)\b(?![.(])/g)) ids.add(m[1])
    for (const id of ids) {
      const def = lines.find(x => new RegExp(`^\\s*(const|let|var)\\s+${id.replace('$', '\\$')}\\s*=`).test(x))
      if (def) out.push(`    where: ${def.trim()}`)
    }
    console.log(out.join('\n'))
  })
}
