import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { chatMinuteLimiter, chatHourLimiter, checkAndIncrementDailyLimit } from './limits.js'
import { isLlmEnabled } from './llm.client.js'
import { parseUserIntent } from './intent.js'
import { searchShops, getShopBySlugOrName } from './search.service.js'
import { buildReplyMessage, CHAT_RESTING_REPLY } from './templates.js'
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
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(300).trim(),
      })
    )
    .max(4)
    .optional(),
})

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

      const parsedIntent = await parseUserIntent(message, history || [])
      intentName = parsedIntent.intent

      let searchResult = undefined
      let shopDetail = undefined
      let needsLocation = false

      if (parsedIntent.intent === 'search_shops') {
        const filters = parsedIntent.filters || {}
        searchResult = await searchShops({
          district: filters.district,
          facilitySlugs: filters.facilitySlugs,
          maxPrice: filters.maxPrice,
          openNow: filters.openNow,
        })
      } else if (parsedIntent.intent === 'nearby') {
        if (!userLocation) {
          needsLocation = true
        } else {
          searchResult = await searchShops({}, { lat: userLocation.lat, lng: userLocation.lng, radiusKm: 25 })
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
      status = 500
      const duration = Date.now() - startTime
      console.error(`[Chat] error intent=${intentName} status=${status} duration=${duration}ms msg=${error.message}`)
      return next(error)
    }
  }
)
