import { PrismaClient, SubscriptionPlan, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const shops = [
  ['Ruang Senja','ruang-senja','Sumbersari'],['Titik Temu Coffee','titik-temu-coffee','Kaliwates'],['Kopi Pagi','kopi-pagi','Patrang'],['Teras Kopi','teras-kopi','Sumbersari'],['Sudut Rasa','sudut-rasa','Kaliwates'],['Kawan Kopi','kawan-kopi','Patrang'],['Kopi Pelan','kopi-pelan','Sumbersari'],['Rintik Coffee','rintik-coffee','Arjasa'],['Pohon Teduh','pohon-teduh','Ajung'],['Kelana Brew','kelana-brew','Sumbersari'],
] as const

async function main() {
  const demoPassword = await bcrypt.hash('DemoOwner123!', 12)
  const owner = await prisma.user.upsert({ where:{email:'owner.demo@ngopijember.test'}, update:{password:demoPassword}, create:{name:'Owner Demo',email:'owner.demo@ngopijember.test',password:demoPassword,role:UserRole.OWNER} })
  const categories = await Promise.all(['Coffee Shop','Kedai Kopi','Rooftop'].map(name=>prisma.category.upsert({where:{slug:name.toLowerCase().replaceAll(' ','-')},update:{},create:{name,slug:name.toLowerCase().replaceAll(' ','-')}})))
  const facilities = await Promise.all(['Wi-Fi','Colokan','Outdoor','Parkir','AC'].map(name=>prisma.facility.upsert({where:{slug:name.toLowerCase().replaceAll(' ','-')},update:{},create:{name,slug:name.toLowerCase().replaceAll(' ','-')}})))
  for (const [name,slug,district] of shops) {
    const shop = await prisma.coffeeShop.upsert({ where:{slug}, update:{}, create:{ownerId:owner.id,name,slug,description:`Profil dummy ${name} untuk pengembangan Ngopi Jember. Bukan data coffee shop nyata.`,address:`Alamat dummy, ${district}, Jember`,district,priceRange:'Rp15.000 - Rp40.000',openingHours:'09.00 - 22.00',isVerified:true,isFeatured:slug==='ruang-senja'||slug==='titik-temu-coffee'} })
    await prisma.coffeeShopCategory.upsert({where:{coffeeShopId_categoryId:{coffeeShopId:shop.id,categoryId:categories[0].id}},update:{},create:{coffeeShopId:shop.id,categoryId:categories[0].id}})
    for (const facility of facilities.slice(0,3)) await prisma.coffeeShopFacility.upsert({where:{coffeeShopId_facilityId:{coffeeShopId:shop.id,facilityId:facility.id}},update:{},create:{coffeeShopId:shop.id,facilityId:facility.id}})
    await prisma.menu.upsert({where:{id:`${shop.id}-es-kopi-susu`},update:{},create:{id:`${shop.id}-es-kopi-susu`,coffeeShopId:shop.id,name:'Es Kopi Susu (dummy)',price:18000}})
    await prisma.subscription.upsert({where:{coffeeShopId:shop.id},update:{},create:{coffeeShopId:shop.id,plan:slug==='ruang-senja'?SubscriptionPlan.FEATURED:SubscriptionPlan.FREE,startDate:new Date()}})
  }
}
main().then(()=>console.log('Seed dummy selesai')).catch(error=>{console.error(error);process.exit(1)}).finally(()=>prisma.$disconnect())
