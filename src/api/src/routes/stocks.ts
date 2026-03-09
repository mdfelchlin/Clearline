import { Router, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { AuthenticatedRequest } from '../types'
import { logger } from '../lib/logger'

const router = Router()

const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000

const stockSchema = z.object({
  ticker_symbol: z.string().min(1).max(10).toUpperCase(),
  company_name: z.string().max(200).optional(),
})

async function fetchStockPrice(symbol: string): Promise<number | null> {
  const cached = priceCache.get(symbol)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price
  }

  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
    const res = await fetch(url)
    const data = await res.json() as { c?: number }
    const price = data?.c ?? null

    if (price !== null) {
      priceCache.set(symbol, { price, timestamp: Date.now() })
    }

    return price
  } catch (err) {
    logger.error({ err }, 'Finnhub fetch error')
    return null
  }
}

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('stocks')
      .select('id, ticker_symbol, company_name, created_at')
      .eq('account_id', req.user!.accountId)
      .order('ticker_symbol')

    if (error) { res.status(500).json({ error: 'Failed to get stocks' }); return }
    res.json({ stocks: data ?? [] })
  } catch (err) {
    logger.error({ err }, 'Get stocks error')
    res.status(500).json({ error: 'Failed to get stocks' })
  }
})

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stockData = stockSchema.parse(req.body)

    const { data, error } = await supabase
      .from('stocks')
      .insert({ ...stockData, account_id: req.user!.accountId })
      .select('id, ticker_symbol, company_name')
      .single()

    if (error || !data) { res.status(500).json({ error: 'Failed to add stock' }); return }
    res.status(201).json({ stock: data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid stock data', details: err.errors }); return }
    logger.error({ err }, 'Create stock error')
    res.status(500).json({ error: 'Failed to add stock' })
  }
})

router.get('/:id/price', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: stock } = await supabase
      .from('stocks')
      .select('ticker_symbol')
      .eq('id', req.params.id)
      .eq('account_id', req.user!.accountId)
      .single()

    if (!stock) { res.status(404).json({ error: 'Stock not found' }); return }

    const price = await fetchStockPrice(stock.ticker_symbol)

    res.json({
      ticker: stock.ticker_symbol,
      price,
      cached: priceCache.has(stock.ticker_symbol),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    logger.error({ err }, 'Get stock price error')
    res.status(500).json({ error: 'Failed to get stock price' })
  }
})

export default router
