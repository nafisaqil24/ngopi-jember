import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { chatMinuteLimiter, chatHourLimiter, checkAndIncrementDailyLimit } from './limits.js'
import { isLlmEnabled } from './llm.client.js'
import { parseUserIntent } from './intent.js'
import { searchShops, getShopBySlugOrName, type SearchFilters } from './search.service.js'
import { sanitizeHistory } from './history.js'
import type { ParsedIntent } from './schema.js'
import { buildReplyMessage, CHAT_RESTING_REPLY } from './templates.js'
import { LlmError } from './llm.errors.js'
import { isWithinJember } from './geo.js'

export const chatRouter = Router()

const chatInputSchema = z.object({
  message: z.string().min(1).max(300).trim(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  // History mentah diterima apa adanya lalu disanitasi di server
  // (lihat sanitizeHistory): hanya role "user" yang boleh sampai ke LLM.
  history: z.unknown().optional(),
})

// Argumen pencarian yang sama dipakai jalur search_shops maupun nearby,
// supaya filter intent (fasilitas, harga, buka sekarang, dll.) tidak hilang.
function buildSearchFilters(parsedIntent: ParsedIntent): SearchFilters {
  const filters = parsedIntent.filters || {}
  return {
    district: filters.district,
    facilitySlugs: filters.facilitySlugs,
    maxPrice: filters.maxPrice,
    openNow: filters.openNow,
    priorities: parsedIntent.priorities,
  }
}

chatRouter.post(
  '/',
  chatMinuteLimiter,
  chatHourLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()
    let intentName = 'unknown'
    let status = 200

    try {
      const parsed = chatInputSchema.safeParse(req.body)
      if (!parsed.success) {
        status = 400
        return res.status(400).json({
          success: false,
          message: 'Format pesan tidak valid (maks 300 karakter, history maks 4)',
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const { message, location, history } = parsed.data

      // Validate location is within Jember if provided
      let userLocation: { lat: number; lng: number } | undefined = undefined
      if (location) {
        if (!isWithinJember(location.lat, location.lng)) {
          status = 400
          return res.status(400).json({
            success: false,
            message: 'Lokasi Anda berada di luar wilayah Jember.',
          })
        }
        userLocation = location
      }

      if (!isLlmEnabled()) {
        status = 200
        const restDuration = Date.now() - startTime
        console.log(`[Chat] status=${status} reason=llm_disabled duration=${restDuration}ms`)
        return res.json({
          success: true,
          data: {
            reply: CHAT_RESTING_REPLY,
          },
        })
      }

      // Check daily limit before calling LLM
      if (!checkAndIncrementDailyLimit()) {
        status = 200
        const restDuration = Date.now() - startTime
        console.log(`[Chat] status=${status} reason=daily_quota duration=${restDuration}ms`)
        return res.json({
          success: true,
          data: {
            reply: CHAT_RESTING_REPLY,
          },
        })
      }

      const parsedIntent = await parseUserIntent(message, sanitizeHistory(history))
      intentName = parsedIntent.intent

      let searchResult = undefined
      let shopDetail = undefined
      let needsLocation = false

      if (parsedIntent.intent === 'search_shops') {
        searchResult = await searchShops(
          buildSearchFilters(parsedIntent),
          userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined
        )
      } else if (parsedIntent.intent === 'nearby') {
        if (!userLocation) {
          needsLocation = true
        } else {
          searchResult = await searchShops(
            buildSearchFilters(parsedIntent),
            { lat: userLocation.lat, lng: userLocation.lng, radiusKm: 25 }
          )
        }
      } else if (parsedIntent.intent === 'shop_detail' && parsedIntent.shopQuery) {
        shopDetail = await getShopBySlugOrName(parsedIntent.shopQuery)
      }

      const { reply, shops } = buildReplyMessage(
        parsedIntent.intent,
        searchResult,
        shopDetail,
        parsedIntent.faqTopic,
        needsLocation
      )

      const duration = Date.now() - startTime
      console.log(`[Chat] intent=${intentName} status=${status} duration=${duration}ms`)

      return res.json({
        success: true,
        data: {
          reply,
          shops: shops || undefined,
          needsLocation: needsLocation || undefined,
        },
      })
    } catch (error: any) {
      // Error provider LLM: kirim pesan ramah & spesifik sesuai jenis error
      // dengan status 5xx yang sesuai. Jangan fallback ke smalltalk.
      if (error instanceof LlmError) {
        status = error.httpStatus
        const duration = Date.now() - startTime
        console.error(`[Chat] reason=llm_${error.kind} intent=${intentName} status=${status} duration=${duration}ms`)
        return res.status(error.httpStatus).json({
          success: false,
          message: error.userMessage,
          code: error.kind,
        })
      }

      status = 500
      const duration = Date.now() - startTime
      // Detail error tetap dicatat di server, tetapi TIDAK diteruskan ke klien
      // (path file/nama tabel/potongan query Prisma bisa membocorkan internal).
      console.error(`[Chat] error intent=${intentName} status=${status} duration=${duration}ms msg=${error.message}`)
      return res.status(status).json({
        success: false,
        message: 'Maaf, ada gangguan di server. Coba lagi sebentar ya.',
        code: 'internal_error',
      })
    }
  }
)
