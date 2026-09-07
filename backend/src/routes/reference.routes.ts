import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const referenceRouter = Router()

referenceRouter.get('/categories', async (_request, response, next) => {
  try { return response.json({ success: true, data: await prisma.category.findMany({ orderBy: { name: 'asc' } }) }) } catch (error) { return next(error) }
})
referenceRouter.get('/facilities', async (_request, response, next) => {
  try { return response.json({ success: true, data: await prisma.facility.findMany({ orderBy: { name: 'asc' } }) }) } catch (error) { return next(error) }
})
