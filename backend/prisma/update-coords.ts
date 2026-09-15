import { prisma } from '../src/lib/prisma'

async function run() {
  const districtCoords: Record<string, { lat: number; lng: number }> = {
    'Sumbersari': { lat: -8.1721, lng: 113.7008 },
    'Kaliwates': { lat: -8.1685, lng: 113.6703 },
    'Patrang': { lat: -8.1581, lng: 113.6934 },
    'Ajung': { lat: -8.2145, lng: 113.7231 },
    'Arjasa': { lat: -8.1182, lng: 113.7251 },
  }

  const shops = await prisma.coffeeShop.findMany()
  let count = 0
  for (const shop of shops) {
    const coords = districtCoords[shop.district] || { lat: -8.1721, lng: 113.7008 }
    const offset = (shop.id.charCodeAt(0) % 10) * 0.001
    await prisma.coffeeShop.update({
      where: { id: shop.id },
      data: {
        latitude: coords.lat + offset,
        longitude: coords.lng + offset,
      },
    })
    count++
  }
  console.log(`Berhasil mengupdate koordinat untuk ${count} coffee shop.`)
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
