import { describe, it, expect } from 'vitest'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

describe('Environment Guard Test', () => {
  it('should run in test environment and use test database host', () => {
    expect(process.env.NODE_ENV).toBe('test')

    const dbUrl = process.env.DATABASE_URL
    expect(dbUrl).toBeDefined()

    const matchTest = dbUrl!.match(/@([^:/?]+)/)
    const testHost = matchTest ? matchTest[1].replace(/-pooler$/, '') : ''

    const envMainPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envMainPath)) {
      const mainConfig = dotenv.parse(fs.readFileSync(envMainPath, 'utf-8'))
      if (mainConfig.DATABASE_URL) {
        const matchMain = mainConfig.DATABASE_URL.match(/@([^:/?]+)/)
        const mainHost = matchMain ? matchMain[1].replace(/-pooler$/, '') : ''
        if (mainHost) {
          expect(testHost).not.toBe(mainHost)
        }
      }
    }
  })
})
