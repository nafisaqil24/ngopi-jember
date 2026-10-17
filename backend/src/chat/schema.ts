import { z } from 'zod'

export const faqTopicsEnum = z.enum([
  'apa_itu',
  'cara_daftar',
  'daftar_owner',
  'tambah_kedai',
  'verifikasi',
  'ulasan',
  'gps',
])

export const intentEnum = z.enum([
  'search_shops',
  'shop_detail',
  'nearby',
  'faq',
  'smalltalk',
  'out_of_scope',
])

export const chatFiltersSchema = z
  .object({
    district: z.string().max(80).trim().optional(),
    facilitySlugs: z.array(z.string().max(50)).optional(),
    maxPrice: z.number().min(0).max(1000000).optional(),
    openNow: z.boolean().optional(),
  })
  .strict()

export const parsedIntentSchema = z
  .object({
    intent: intentEnum,
    filters: chatFiltersSchema.optional(),
    shopQuery: z.string().max(100).trim().optional(),
    faqTopic: faqTopicsEnum.optional(),
  })
  .strict()

export type ParsedIntent = z.infer<typeof parsedIntentSchema>
