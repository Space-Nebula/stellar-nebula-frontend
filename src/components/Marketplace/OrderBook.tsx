import React from 'react'
import type { Order } from './types'

interface OrderBookProps {
  bids: Order[] // Buy orders
  asks: Order[] // Sell orders
}

export const OrderBook: React.FC<OrderBookProps> = ({ bids, asks }) => {
  // Sort bids descending, asks ascending
  const sortedBids = [...bids].sort((a, b) => b.price - a.price).slice(0, 10)
  const sortedAsks = [...asks].sort((a, b) => a.price - b.price).slice(0, 10)

  const maxTotal = Math.max(...sortedBids.map((o) => o.total), ...sortedAsks.map((o) => o.total))

  const renderRow = (order: Order, type: 'bid' | 'ask') => {
    const depthPercentage = (order.total / maxTotal) * 100
    const isBid = type === 'bid'

    return (
      <div
        key={order.id}
        className="relative flex justify-between text-sm py-1 px-2 hover:bg-space-800 transition-colors group cursor-pointer"
      >
        {/* Depth visualization */}
        <div
          className={`absolute right-0 top-0 bottom-0 opacity-10 ${isBid ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${depthPercentage}%` }}
        />
        <span className={`z-10 font-mono ${isBid ? 'text-green-400' : 'text-red-400'}`}>
          {order.price.toFixed(4)}
        </span>
        <span className="z-10 font-mono text-space-100">{order.amount.toFixed(2)}</span>
        <span className="z-10 font-mono text-white">{order.total.toFixed(2)}</span>
      </div>
    )
  }

  return (
    <div className="bg-space-900 border border-space-800 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-space-800">
        <h3 className="font-bold text-white">Order Book</h3>
      </div>

      <div className="flex justify-between px-4 py-2 text-xs text-space-100 border-b border-space-800">
        <span>Price</span>
        <span>Amount</span>
        <span>Total</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col p-2">
        {/* Asks (Sell Orders) - Displayed at the top */}
        <div className="flex flex-col-reverse mb-2">
          {sortedAsks.map((ask) => renderRow(ask, 'ask'))}
        </div>

        {/* Current Price spread indicator */}
        <div className="py-2 border-y border-space-800 flex justify-center items-center gap-2">
          <span className="text-xl font-bold text-green-400">
            {sortedAsks[0]?.price.toFixed(4) || '0.0000'}
          </span>
          <span className="text-space-100 text-xs">
            Spread: {((sortedAsks[0]?.price || 0) - (sortedBids[0]?.price || 0)).toFixed(4)}
          </span>
        </div>

        {/* Bids (Buy Orders) - Displayed at the bottom */}
        <div className="mt-2">{sortedBids.map((bid) => renderRow(bid, 'bid'))}</div>
      </div>
    </div>
  )
}
