const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const shops = await prisma.coffeeShop.findMany({
    select: {
      name: true,
      slug: true,
      status: true,
      isVerified: true,
      isFeatured: true,
      latitude: true,
      longitude: true,
      district: true,
    }
  })

  console.log('=== Coffee Shops in Database ===')
  console.log(`Total: ${shops.length}`)
  console.log('')

  shops.forEach((shop, i) => {
    console.log(`${i + 1}. ${shop.name} (${shop.slug})`)
    console.log(`   district: ${shop.district}`)
    console.log(`   status: ${shop.status}`)
    console.log(`   isVerified: ${shop.isVerified}`)
    console.log(`   isFeatured: ${shop.isFeatured}`)
    console.log(`   latitude: ${shop.latitude}`)
    console.log(`   longitude: ${shop.longitude}`)
    console.log('')
  })

  // Check distance from reference point (-8.1724, 113.7010)
  const refLat = -8.1724
  const refLng = 113.7010
  const radius = 25 // km

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  console.log('=== Distance Check (from -8.1724, 113.7010, radius 25km) ===')
  shops.forEach((shop, i) => {
    if (shop.latitude && shop.longitude) {
      const distance = calculateDistance(refLat, refLng, shop.latitude, shop.longitude)
      const within = distance <= radius ? 'DALAM' : 'LUAR'
      console.log(`${i + 1}. ${shop.name}: ${distance.toFixed(2)} km ${within} radius`)
    } else {
      console.log(`${i + 1}. ${shop.name}: KOORDINAT NULL`)
    }
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())