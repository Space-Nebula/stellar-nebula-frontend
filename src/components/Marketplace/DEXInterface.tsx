import React, { useState, useEffect } from 'react'
import type { Asset, Order, Trade } from './types'
import { SUPPORTED_ASSETS } from './types'
import { OrderBook } from './OrderBook'
import { TradeForm } from './TradeForm'
import { TradeHistory } from './TradeHistory'

// Mock data generators
const generateMockOrders = (type: 'buy' | 'sell', basePrice: number): Order[] => {
  return Array.from({ length: 20 }, (_, i) => {
    const priceVariance = Math.random() * 0.05 * (type === 'buy' ? -1 : 1)
    const price = basePrice * (1 + priceVariance + i * 0.005 * (type === 'buy' ? -1 : 1))
    const amount = Math.random() * 1000 + 100

    return {
      id: `order_${Math.random().toString(36).substr(2, 9)}`,
      price,
      amount,
      total: price * amount,
      type,
      maker: `G${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      timestamp: new Date().toISOString(),
    }
  })
}

const generateMockTrades = (basePrice: number): Trade[] => {
  return Array.from({ length: 30 }, (_, i) => {
    const type = (Math.random() > 0.5 ? 'buy' : 'sell') as 'buy' | 'sell'
    const priceVariance = Math.random() * 0.02 - 0.01

    return {
      id: `trade_${Math.random().toString(36).substr(2, 9)}`,
      price: basePrice * (1 + priceVariance),
      amount: Math.random() * 500 + 50,
      total: 0, // Calculated later
      type,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    }
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export const DEXInterface: React.FC = () => {
  const [baseAsset, setBaseAsset] = useState<Asset>(SUPPORTED_ASSETS[1]) // Default to DUST
  const [quoteAsset, setQuoteAsset] = useState<Asset>(SUPPORTED_ASSETS[0]) // Default to XLM

  const [bids, setBids] = useState<Order[]>([])
  const [asks, setAsks] = useState<Order[]>([])
  const [trades, setTrades] = useState<Trade[]>([])

  const [currentPrice, setCurrentPrice] = useState<number>(0.0542)
  const [loading, setLoading] = useState<boolean>(true)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  useEffect(() => {
    // Simulate fetching market data
    const fetchMarketData = async () => {
      setLoading(true)
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 600))

      const newPrice =
        baseAsset.code === 'DUST'
          ? 0.0542
          : baseAsset.code === 'CRYS'
            ? 1.24
            : baseAsset.code === 'DARK'
              ? 5.89
              : 1.0

      setCurrentPrice(newPrice)
      setBids(generateMockOrders('buy', newPrice))
      setAsks(generateMockOrders('sell', newPrice))
      setTrades(generateMockTrades(newPrice))

      setLoading(false)
    }

    fetchMarketData()

    // Setup polling for real-time updates
    const interval = setInterval(() => {
      // Slightly adjust price and add new trades to simulate active market
      setCurrentPrice((prev) => prev * (1 + (Math.random() * 0.002 - 0.001)))
    }, 10000)

    return () => clearInterval(interval)
  }, [baseAsset, quoteAsset])

  const handleTradeSubmit = (type: 'buy' | 'sell', price: number, amount: number) => {
    // Simulate order placement
    setNotification({
      message: `Successfully placed ${type} order for ${amount} ${baseAsset.code} at ${price} ${quoteAsset.code}`,
      type: 'success',
    })

    // Auto-dismiss notification
    setTimeout(() => setNotification(null), 3000)
  }

  return (
    <div className="bg-space-950 p-4 md:p-6 rounded-xl border border-space-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Stellar Exchange</h2>
          <p className="text-space-100 text-sm">Trade resources directly on the Stellar network.</p>
        </div>

        <div className="flex items-center gap-2 bg-space-900 p-2 rounded-lg border border-space-800">
          <select
            value={baseAsset.code}
            onChange={(e) =>
              setBaseAsset(
                SUPPORTED_ASSETS.find((a) => a.code === e.target.value) || SUPPORTED_ASSETS[1]
              )
            }
            className="bg-transparent text-white font-bold outline-none cursor-pointer"
          >
            {SUPPORTED_ASSETS.filter((a) => a.type !== 'native').map((asset) => (
              <option key={asset.code} value={asset.code} className="bg-space-900">
                {asset.code} - {asset.name}
              </option>
            ))}
          </select>
          <span className="text-space-100 px-2">/</span>
          <span className="text-white font-bold">{quoteAsset.code}</span>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 mb-6 rounded-lg border ${notification.type === 'success' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}
        >
          {notification.message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cosmic-cyan"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart Placeholder & Trade Form */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-space-900 border border-space-800 rounded-xl p-4 h-64 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwTTAgMjBoNDBNMCAzMGg0ME0xMCAwdjQwTTIwIDB2NDBNMzAgMHY0MCIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>

              <svg className="w-full h-full absolute inset-0 opacity-50" preserveAspectRatio="none">
                <path
                  d="M0 200 Q 100 150 200 180 T 400 120 T 600 160 T 800 80 T 1000 100"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2"
                />
                <path
                  d="M0 200 Q 100 150 200 180 T 400 120 T 600 160 T 800 80 T 1000 100 L 1000 300 L 0 300 Z"
                  fill="url(#gradient)"
                  opacity="0.2"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="z-10 text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  {baseAsset.code} / {quoteAsset.code} Chart
                </h3>
                <p className="text-space-100 text-sm">
                  Interactive TradingView chart will be rendered here
                </p>
                <div className="mt-4 inline-flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-cosmic-cyan">
                    {currentPrice.toFixed(4)}
                  </span>
                  <span className="text-sm text-green-400">+2.4% (24h)</span>
                </div>
              </div>
            </div>

            <TradeForm
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
              currentPrice={currentPrice}
              onSubmit={handleTradeSubmit}
            />
          </div>

          {/* Order Book & Trade History */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-[800px]">
            <div className="h-1/2">
              <OrderBook bids={bids} asks={asks} />
            </div>
            <div className="h-1/2">
              <TradeHistory trades={trades} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
