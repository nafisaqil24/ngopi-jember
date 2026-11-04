import fs from 'fs'
import path from 'path'
import { isLlmEnabled } from '../chat/llm.client.js'
import { LlmError } from '../chat/llm.errors.js'
import type { ParsedIntent } from '../chat/schema.js'
import {
  scorePrediction,
  validateIntentDataset,
  type IntentDatasetEntry,
  type IntentExpectation,
} from './intent-scoring.js'

const DEFAULT_DELAY_MS = 2500
const RATE_LIMIT_WAIT_MS = 15000

type IntentDatasetName = 'tuning' | 'heldout'

const DATASET_FILES: Record<IntentDatasetName, string> = {
  tuning: 'src/eval/intent-dataset.json',
  heldout: 'src/eval/intent-dataset-heldout.json',
}

interface CliOptions {
  dry: boolean
  json: boolean
  delayMs: number
  set: IntentDatasetName
}

interface EvalItemResult {
  id: string
  category: string
  text: string
  expected: IntentExpectation
  actual: ParsedIntent | null
  intentCorrect: boolean
  fullCorrect: boolean
  failures: string[]
  fallbackReason: string | null
  handledByFallback: boolean
  errorKind: string | null
}

interface CategoryStats {
  total: number
  intentCorrect: number
  fullCorrect: number
  intentAccuracy: number
  fullAccuracy: number
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dry: false, json: false, delayMs: DEFAULT_DELAY_MS, set: 'tuning' }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry') {
      options.dry = true
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--set') {
      options.set = parseDatasetName(argv[i + 1])
      i += 1
    } else if (arg.startsWith('--set=')) {
      options.set = parseDatasetName(arg.slice('--set='.length))
    } else if (arg === '--delay') {
      const value = Number(argv[i + 1])
      if (!Number.isFinite(value) || value < 0) throw new Error('--delay harus berupa angka >= 0')
      options.delayMs = value
      i += 1
    } else if (arg.startsWith('--delay=')) {
      const value = Number(arg.slice('--delay='.length))
      if (!Number.isFinite(value) || value < 0) throw new Error('--delay harus berupa angka >= 0')
      options.delayMs = value
    } else {
      throw new Error(`Argumen tidak dikenal: ${arg}`)
    }
  }
  return options
}

function parseDatasetName(value: string | undefined): IntentDatasetName {
  if (value === 'tuning' || value === 'heldout') return value
  throw new Error(`--set tidak valid: ${String(value)} (pilih: tuning, heldout)`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadDataset(setName: IntentDatasetName): unknown {
  const datasetPath = path.resolve(process.cwd(), DATASET_FILES[setName])
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset tidak ditemukan: ${datasetPath}`)
  }
  return JSON.parse(fs.readFileSync(datasetPath, 'utf-8'))
}

// Memakai ulang guard yang sama dengan test (backend/src/test/setup-env.ts)
// tanpa mengubah file itu. Output log-nya dibungkam agar tidak mengotori JSON.
async function runTestEnvGuard(): Promise<void> {
  const previousLog = console.log
  console.log = () => {}
  try {
    await import('../test/setup-env.js')
  } finally {
    console.log = previousLog
  }
}

async function captureIntentLogs<T>(
  fn: () => Promise<T>
): Promise<{ result?: T; error?: unknown; logs: string[] }> {
  const logs: string[] = []
  const originalWarn = console.warn
  const originalError = console.error

  const wrap = (original: (...args: any[]) => void) =>
    (...args: any[]) => {
      const line = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ')
      if (line.includes('[Intent]')) logs.push(line)
      original(...args)
    }

  console.warn = wrap(originalWarn) as typeof console.warn
  console.error = wrap(originalError) as typeof console.error
  try {
    return { result: await fn(), logs }
  } catch (error) {
    return { error, logs }
  } finally {
    console.warn = originalWarn
    console.error = originalError
  }
}

function extractFallbackReason(logs: string[]): string | null {
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const match = logs[i].match(/reason=([a-z_]+)/)
    if (match) return match[1]
  }
  return null
}

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10
}

function aggregate(results: EvalItemResult[]): {
  byCategory: Record<string, CategoryStats>
  fallbackReasons: Record<string, number>
} {
  const byCategory: Record<string, CategoryStats> = {}
  const fallbackReasons: Record<string, number> = {
    llm_disabled: 0,
    zod_invalid: 0,
    json_validate_failed: 0,
    unexpected_error: 0,
    smalltalk_no_fallback: 0,
  }

  for (const result of results) {
    const stats = byCategory[result.category] ?? {
      total: 0,
      intentCorrect: 0,
      fullCorrect: 0,
      intentAccuracy: 0,
      fullAccuracy: 0,
    }
    stats.total += 1
    if (result.intentCorrect) stats.intentCorrect += 1
    if (result.fullCorrect) stats.fullCorrect += 1
    byCategory[result.category] = stats

    if (result.fallbackReason) {
      fallbackReasons[result.fallbackReason] = (fallbackReasons[result.fallbackReason] ?? 0) + 1
    } else if (result.actual?.intent === 'smalltalk') {
      fallbackReasons.smalltalk_no_fallback += 1
    }
  }

  for (const stats of Object.values(byCategory)) {
    stats.intentAccuracy = percent(stats.intentCorrect, stats.total)
    stats.fullAccuracy = percent(stats.fullCorrect, stats.total)
  }

  return { byCategory, fallbackReasons }
}

function printHumanReport(results: EvalItemResult[], stoppedReason: string | null): void {
  const total = results.length
  const intentCorrect = results.filter((result) => result.intentCorrect).length
  const fullCorrect = results.filter((result) => result.fullCorrect).length
  const handledByFallback = results.filter((result) => result.handledByFallback).length
  const { byCategory, fallbackReasons } = aggregate(results)

  console.log('')
  console.log('=== Evaluasi Akurasi Intent Chatbot ===')
  console.log(`Total kalimat dieksekusi : ${total}`)
  console.log(`Akurasi intent (ketat)   : ${percent(intentCorrect, total)}% (${intentCorrect}/${total})`)
  console.log(`Akurasi penuh            : ${percent(fullCorrect, total)}% (${fullCorrect}/${total})`)
  console.log(`Tertangani fallback aman : ${handledByFallback} item (handled_by_fallback)`)
  if (stoppedReason) console.log(`Dihentikan karena        : ${stoppedReason}`)
  console.log('')
  console.log('Per kategori:')
  console.log('kategori              total  intent%  full%')
  for (const [category, stats] of Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(
      `${category.padEnd(20)} ${String(stats.total).padStart(5)} ${String(stats.intentAccuracy).padStart(7)} ${String(stats.fullAccuracy).padStart(6)}`
    )
  }
  console.log('')
  console.log('Fallback per alasan:')
  for (const [reason, count] of Object.entries(fallbackReasons)) {
    console.log(`- ${reason}: ${count}`)
  }

  const failures = results.filter((result) => !result.fullCorrect)
  console.log('')
  console.log(`DAFTAR KESALAHAN (${failures.length}):`)
  for (const failure of failures) {
    console.log(`- [${failure.id}] "${failure.text}"`)
    console.log(`  expected : ${JSON.stringify(failure.expected)}`)
    console.log(`  actual   : ${failure.actual ? JSON.stringify(failure.actual) : 'null'}`)
    console.log(`  gagal    : ${failure.failures.join('; ') || '-'}`)
    console.log(`  fallback : ${failure.fallbackReason ?? '(tidak ada log [Intent])'}`)
    if (failure.handledByFallback) {
      console.log(`  status   : handled_by_fallback (fallback aman ke out_of_scope)`)
    }
  }
}

function buildJsonReport(results: EvalItemResult[], stoppedReason: string | null) {
  const total = results.length
  const intentCorrect = results.filter((result) => result.intentCorrect).length
  const fullCorrect = results.filter((result) => result.fullCorrect).length
  const handledByFallback = results.filter((result) => result.handledByFallback).length
  const { byCategory, fallbackReasons } = aggregate(results)

  return {
    meta: {
      total,
      intentCorrect,
      fullCorrect,
      handledByFallback,
      intentAccuracy: percent(intentCorrect, total),
      fullAccuracy: percent(fullCorrect, total),
      stoppedReason,
    },
    byCategory,
    fallbackReasons,
    errors: results.filter((result) => !result.fullCorrect),
    results,
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  const previousLog = console.log
  if (options.json) {
    // Jaga stdout tetap JSON murni; log lain dialihkan ke stderr.
    console.log = (...args: any[]) => console.error(...args)
  }

  try {
    await runTestEnvGuard()

    const rawDataset = loadDataset(options.set)
    const validation = validateIntentDataset(rawDataset)

    if (!validation.ok) {
      console.error('Dataset tidak valid:')
      for (const error of validation.errors) console.error(`- ${error}`)
      process.exitCode = 1
      return
    }

    if (options.dry) {
      if (options.json) {
        process.stdout.write(
          JSON.stringify(
            {
              mode: 'dry',
              total: validation.total,
              countsByCategory: validation.countsByCategory,
              errors: validation.errors,
            },
            null,
            2
          ) + '\n'
        )
      } else {
        console.log('=== Dry-run validasi dataset intent ===')
        console.log(`Total kalimat: ${validation.total}`)
        console.log('Jumlah per kategori:')
        for (const [category, count] of Object.entries(validation.countsByCategory).sort(([a], [b]) => a.localeCompare(b))) {
          console.log(`- ${category}: ${count}`)
        }
        console.log('Dataset valid. Tidak memanggil LLM maupun database.')
      }
      return
    }

    if (!isLlmEnabled()) {
      console.error(
        'LLM tidak aktif: isi LLM_API_KEY dan LLM_MODEL di backend/.env.test lalu jalankan lagi.'
      )
      process.exitCode = 1
      return
    }

    const dataset = rawDataset as IntentDatasetEntry[]
    const { parseUserIntent } = await import('../chat/intent.js')
    const { prisma } = await import('../lib/prisma.js')

    const results: EvalItemResult[] = []
    let stoppedReason: string | null = null

    try {
      for (let i = 0; i < dataset.length; i += 1) {
        const item = dataset[i]
        console.error(`[eval] ${i + 1}/${dataset.length} ${item.id}`)

        let outcome = await captureIntentLogs(() => parseUserIntent(item.text, []))

        if (outcome.error instanceof LlmError && outcome.error.kind === 'rate_limit') {
          console.error(`[eval] rate_limit pada ${item.id}; menunggu 15 detik lalu mencoba sekali lagi...`)
          await sleep(RATE_LIMIT_WAIT_MS)
          const retried = await captureIntentLogs(() => parseUserIntent(item.text, []))
          outcome = { ...retried, logs: [...outcome.logs, ...retried.logs] }
        }

        if (outcome.error instanceof LlmError && ['auth', 'quota'].includes(outcome.error.kind)) {
          stoppedReason = outcome.error.kind
          console.error(`[eval] Berhenti: error provider ${outcome.error.kind}. Menampilkan hasil sebagian.`)
          break
        }

        const fallbackReason = extractFallbackReason(outcome.logs)
        const handledByFallback = fallbackReason === 'json_validate_failed'
        if (outcome.result) {
          const score = scorePrediction(item.expect, outcome.result)
          const failures = [...score.failures]
          let intentCorrect = score.intentCorrect
          let fullCorrect = score.fullCorrect
          if (handledByFallback) {
            // Fallback aman bukan hasil klasifikasi nyata: tetap dihitung salah
            // di akurasi ketat, tetapi ditandai agar bisa dibedakan.
            intentCorrect = false
            fullCorrect = false
            failures.push('handled_by_fallback: json_validate_failed')
          }
          results.push({
            id: item.id,
            category: item.category,
            text: item.text,
            expected: item.expect,
            actual: outcome.result,
            intentCorrect,
            fullCorrect,
            failures,
            fallbackReason,
            handledByFallback,
            errorKind: null,
          })
        } else {
          const errorKind = outcome.error instanceof LlmError ? outcome.error.kind : 'unexpected'
          results.push({
            id: item.id,
            category: item.category,
            text: item.text,
            expected: item.expect,
            actual: null,
            intentCorrect: false,
            fullCorrect: false,
            failures: [`error: ${errorKind}`],
            fallbackReason,
            handledByFallback,
            errorKind,
          })
        }

        if (i < dataset.length - 1) await sleep(options.delayMs)
      }
    } finally {
      await prisma.$disconnect().catch(() => {})
    }

    if (options.json) {
      process.stdout.write(JSON.stringify(buildJsonReport(results, stoppedReason), null, 2) + '\n')
    } else {
      printHumanReport(results, stoppedReason)
    }
  } finally {
    if (options.json) console.log = previousLog
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[eval] Gagal: ${message}`)
  process.exitCode = 1
})