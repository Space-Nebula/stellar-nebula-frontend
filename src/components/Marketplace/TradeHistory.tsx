import React from 'react'
import type { Trade } from './types'

interface TradeHistoryProps {
  trades: Trade[]
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
  return (
    <div className="bg-space-900 border border-space-800 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-space-800">
        <h3 className="font-bold text-white">Market Trades</h3>
      </div>

      <div className="flex justify-between px-4 py-2 text-xs text-space-100 border-b border-space-800">
        <span>Price</span>
        <span>Amount</span>
        <span>Time</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {trades.map((trade) => {
          const isBuy = trade.type === 'buy'
          const time = new Date(trade.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })

          return (
            <div
              key={trade.id}
              className="flex justify-between text-sm py-1 px-2 hover:bg-space-800 transition-colors"
            >
              <span className={`font-mono ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                {trade.price.toFixed(4)}
              </span>
              <span className="font-mono text-white">{trade.amount.toFixed(2)}</span>
              <span className="text-space-100">{time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
