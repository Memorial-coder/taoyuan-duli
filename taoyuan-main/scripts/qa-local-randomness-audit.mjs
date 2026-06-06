/* global console */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

const AUDIT_TARGETS = [
  {
    file: 'src/stores/useAnimalStore.ts',
    expectedCount: 14,
    domain: 'animal daily events, rare finds, sickness, production bonus'
  },
  {
    file: 'src/stores/useFarmStore.ts',
    expectedCount: 10,
    domain: 'farm day rollover, hazards, tree fruit, special crop events'
  },
  {
    file: 'src/stores/useBreedingStore.ts',
    expectedCount: 14,
    domain: 'breeding chance, trait drift, mutation and failed cross outcomes'
  }
]

const randomCallPattern = /Math\.random\s*\(/g

function lineNumberAt(source, index) {
  let line = 1
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1
  }
  return line
}

function nearestScope(lines, lineIndex) {
  for (let i = lineIndex; i >= 0; i -= 1) {
    const line = lines[i]?.trim() ?? ''
    const fnMatch = line.match(/^(?:async\s+)?(?:function\s+)?([A-Za-z0-9_$]+)\s*\(/)
    if (fnMatch?.[1]) return fnMatch[1]

    const constMatch = line.match(/^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/)
    if (constMatch?.[1]) return constMatch[1]
  }
  return 'unknown'
}

function classifyRandomLine(line) {
  if (/Math\.floor|pool|length|target|randomStat|source|rumorPool/.test(line)) return 'selection'
  if (/chance|Chance|rate|Rate|Math\.random\(\)\s*[<>]/.test(line)) return 'probability'
  if (/mutation|Mutat|jump|direction|drift|sweetness|yield|resistance/.test(line)) return 'mutation-or-stat-drift'
  if (/fruit|peach|produce|rareFind|sick|cure|pest|weed/.test(line)) return 'daily-event'
  return 'runtime-random'
}

async function auditFile(target) {
  const absolutePath = path.join(ROOT, target.file)
  const source = await readFile(absolutePath, 'utf8')
  const lines = source.split(/\r?\n/)
  const calls = []

  for (const match of source.matchAll(randomCallPattern)) {
    const line = lineNumberAt(source, match.index ?? 0)
    const text = lines[line - 1]?.trim() ?? ''
    calls.push({
      line,
      scope: nearestScope(lines, line - 1),
      category: classifyRandomLine(text),
      text
    })
  }

  return {
    file: target.file,
    domain: target.domain,
    expectedCount: target.expectedCount,
    actualCount: calls.length,
    calls
  }
}

const reports = await Promise.all(AUDIT_TARGETS.map(auditFile))
const mismatches = reports.filter((report) => report.actualCount !== report.expectedCount)
const total = reports.reduce((sum, report) => sum + report.actualCount, 0)
const expectedTotal = reports.reduce((sum, report) => sum + report.expectedCount, 0)

const summary = {
  task: 'V11 local Math.random audit',
  verdict: mismatches.length === 0 ? 'pass' : 'fail',
  expectedTotal,
  actualTotal: total,
  reports
}

console.log(JSON.stringify(summary, null, 2))

if (mismatches.length > 0) {
  const details = mismatches
    .map((report) => `${report.file}: expected ${report.expectedCount}, got ${report.actualCount}`)
    .join('; ')
  throw new Error(`V11 Math.random baseline changed: ${details}`)
}
