import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning database for production...')

  await prisma.coffeeShopImage.deleteMany()
  await prisma.menu.deleteMany()
  await prisma.review.deleteMany()
  await prisma.analyticsEvent.deleteMany()
  await prisma.promotion.deleteMany()
  await prisma.coffeeShopCategory.deleteMany()
  await prisma.coffeeShopFacility.deleteMany()
  await prisma.coffeeShop.deleteMany()
  await prisma.subscription.deleteMany()

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (admin) {
    await prisma.user.deleteMany({ where: { NOT: { id: admin.id } } })
    console.log(`✅ Kept admin: ${admin.email}, removed other users`)
  } else {
    await prisma.user.deleteMany()
    console.log('✅ Removed all users (no admin found)')
  }

  console.log('✅ Database cleaned for production')
}

main()
  .catch((e) => {
    console.error('❌ Clean gagal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
