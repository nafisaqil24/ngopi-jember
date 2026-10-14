import { prisma } from '../lib/prisma.js'
import { hashPassword } from '../utils/password.js'

const TEST_EMAIL_SUFFIXES = ['@test.com', '@ngopijember.test']

export function isTestEmail(email: string): boolean {
  const normalized = email.toLowerCase()
  return TEST_EMAIL_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
}

export async function createTestAdmin(): Promise<{ id: string; email: string; password: string }> {
  const email = `admin-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ngopijember.test`
  const password = 'AdminTest123!'
  const user = await prisma.user.create({
    data: {
      name: 'Test Admin',
      email,
      password: await hashPassword(password),
      role: 'ADMIN',
    },
    select: { id: true, email: true },
  })
  return { id: user.id, email: user.email, password }
}

export async function deleteTestUser(email: string): Promise<void> {
  if (!isTestEmail(email)) {
    throw new Error(`Refusing to delete non-test user: ${email}`)
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return
  await prisma.user.delete({ where: { id: user.id } })
}

export async function deleteTestUsers(emails: string[]): Promise<void> {
  for (const email of emails) {
    await deleteTestUser(email)
  }
}