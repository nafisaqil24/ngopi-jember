import { PublicShopResult, SearchResponse } from './search.service.js'
import { getFaqAnswer } from './faq.js'

export const CHAT_RESTING_REPLY = 'Chatbot lagi istirahat, coba lagi nanti ya.'

export function formatShopSummary(shop: PublicShopResult): string {
  const statusText =
    shop.openStatus === 'buka'
      ? '🟢 Sedang Buka'
      : shop.openStatus === 'tutup'
      ? '🔴 Tutup'
      : '⚪ Jam Buka: (Data tidak tersedia)'

  const ratingText = shop.rating ? `⭐ ${shop.rating} (${shop.reviewCount} ulasan)` : '⭐ Belum ada ulasan'
  const distanceText = shop.distanceKm !== undefined ? `📍 Jarak sekitar ${shop.distanceKm} km` : ''
  const priceText = shop.priceRange ? `💰 ${shop.priceRange}` : '💰 Harga tidak diketahui'
  const facilitiesText =
    shop.facilities.length > 0 ? `Fasilitas: ${shop.facilities.join(', ')}` : 'Fasilitas: Belum ada data fasilitas tercatat'

  return `• *${shop.name}* (${shop.district})\n  ${priceText} | ${statusText}\n  ${ratingText} | ${distanceText}\n  ${facilitiesText}\n  Jam: ${shop.openingHours}`
}

export function buildReplyMessage(
  intent: string,
  searchResult?: SearchResponse,
  shopDetail?: PublicShopResult | null,
  faqTopic?: string,
  needsLocation?: boolean
): { reply: string; shops?: PublicShopResult[]; needsLocation?: boolean } {
  if (needsLocation) {
    return {
      reply: 'Untuk rekomendasi terdekat (nearby), mohon aktifkan atau berikan izin akses lokasi GPS Anda terlebih dahulu ya!',
      needsLocation: true,
    }
  }

  if (intent === 'smalltalk') {
    return {
      reply: 'Halo! Ada yang bisa saya bantu seputar pencarian kedai kopi atau kafe di Jember?',
    }
  }

  if (intent === 'out_of_scope') {
    return {
      reply: 'Maaf, saya khusus membantu seputar informasi kedai kopi, kafe, dan fitur di platform Ngopi Jember.',
    }
  }

  if (intent === 'faq') {
    if (faqTopic) {
      return { reply: getFaqAnswer(faqTopic) }
    }
    return {
      reply: 'Ngopi Jember adalah direktori kafe dan kedai kopi di Jember. Ada yang ingin Anda tanyakan tentang cara daftar, owner, verifikasi, atau ulasan?',
    }
  }

  if (intent === 'shop_detail') {
    if (!shopDetail) {
      return {
        reply: 'Maaf, kedai kopi tersebut tidak ditemukan atau belum terverifikasi.',
      }
    }
    const summary = formatShopSummary(shopDetail)
    const reply = `Berikut informasi detail untuk *${shopDetail.name}*:\n\n${summary}\n\nAlamat: ${shopDetail.address}\nDeskripsi: ${shopDetail.description}`
    return {
      reply,
      shops: [shopDetail],
    }
  }

  if (intent === 'search_shops' || intent === 'nearby') {
    if (!searchResult || searchResult.shops.length === 0) {
      return {
        reply: 'Maaf, tidak ditemukan kedai kopi yang sesuai dengan kriteria pencarian Anda. Coba gunakan kata kunci lain atau pilih kecamatan yang berbeda.',
        shops: [],
      }
    }

    const { shops, metadata } = searchResult
    let header = `Ditemukan ${shops.length} kedai kopi:`
    if (metadata.fallbackUsed === 'facility_relaxed') {
      header = `Belum ada kedai dengan fasilitas tersebut di lokasi yang diminta. Berikut rekomendasi kedai di area tersebut (silakan cek fasilitasnya di halaman detail):`
    } else if (metadata.fallbackUsed === 'price_relaxed' || metadata.fallbackUsed === 'both_relaxed') {
      header = `Belum ada kedai dengan kriteria harga tersebut di lokasi yang diminta. Berikut rekomendasi kedai lainnya di area tersebut:`
    }

    const formattedList = shops.map((s) => formatShopSummary(s)).join('\n\n')

    let honestyNote = ''
    if (metadata.totalKedaiTerverifikasi > 0 && metadata.jumlahTanpaDataHarga === metadata.totalKedaiTerverifikasi) {
      honestyNote = ' (Catatan: Saat ini belum ada info harga tercatat untuk kedai-kedai ini).'
    } else if (metadata.jumlahTanpaFasilitas > 0) {
      honestyNote = ` (Catatan: ${metadata.jumlahTanpaFasilitas} dari ${metadata.totalKedaiTerverifikasi} kedai belum mencatat data fasilitas).`
    }

    return {
      reply: `${header}\n\n${formattedList}${honestyNote}`,
      shops,
    }
  }

  return {
    reply: 'Silakan tanyakan rekomendasi kedai kopi di Jember atau informasi seputar Ngopi Jember.',
  }
}
