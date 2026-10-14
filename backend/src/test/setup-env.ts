import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const envTestPath = path.resolve(process.cwd(), '.env.test')
const envMainPath = path.resolve(process.cwd(), '.env')

if (!fs.existsSync(envTestPath)) {
  throw new Error("TEST DIBLOKIR: File backend/.env.test tidak ditemukan. Buat backend/.env.test dengan Neon branch 'test'.")
}

const testConfig = dotenv.parse(fs.readFileSync(envTestPath, 'utf-8'))
if (!testConfig.DATABASE_URL || !testConfig.DIRECT_URL) {
  throw new Error("TEST DIBLOKIR: DATABASE_URL atau DIRECT_URL tidak lengkap di backend/.env.test.")
}

// Load .env.test into process.env with override
dotenv.config({ path: envTestPath, override: true })
process.env.NODE_ENV = 'test'

// Read main .env without loading into process.env
let mainDbHost = ''
let mainDirectHost = ''
if (fs.existsSync(envMainPath)) {
  const mainConfig = dotenv.parse(fs.readFileSync(envMainPath, 'utf-8'))
  if (mainConfig.DATABASE_URL) {
    const match = mainConfig.DATABASE_URL.match(/@([^:/?]+)/)
    if (match) mainDbHost = match[1].replace(/-pooler$/, '')
  }
  if (mainConfig.DIRECT_URL) {
    const match = mainConfig.DIRECT_URL.match(/@([^:/?]+)/)
    if (match) mainDirectHost = match[1].replace(/-pooler$/, '')
  }
}

const getHostWithoutPooler = (url: string) => {
  const match = url.match(/@([^:/?]+)/)
  if (!match) return ''
  return match[1].replace(/-pooler$/, '')
}

const testDbHost = getHostWithoutPooler(testConfig.DATABASE_URL)
const testDirectHost = getHostWithoutPooler(testConfig.DIRECT_URL)

if (!testDbHost || !testDirectHost) {
  throw new Error("TEST DIBLOKIR: Format DATABASE_URL atau DIRECT_URL tidak valid di backend/.env.test.")
}

if (mainDbHost && testDbHost === mainDbHost) {
  throw new Error("TEST DIBLOKIR: DATABASE_URL menunjuk ke DB utama. Isi backend/.env.test dengan Neon branch 'test'.")
}
if (mainDirectHost && testDirectHost === mainDirectHost) {
  throw new Error("TEST DIBLOKIR: DIRECT_URL menunjuk ke DB utama. Isi backend/.env.test dengan Neon branch 'test'.")
}

console.log(`[test-env] DB host: ${testDbHost}`)
