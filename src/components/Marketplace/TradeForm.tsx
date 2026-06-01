import React, { useState } from 'react'
import type { Asset } from './types'

interface TradeFormProps {
  baseAsset: Asset
  quoteAsset: Asset
  currentPrice: number
  onSubmit: (type: 'buy' | 'sell', price: number, amount: number) => void
}

export const TradeForm: React.FC<TradeFormProps> = ({
  baseAsset,
  quoteAsset,
  currentPrice,
  onSubmit,
}) => {
  const [type, setType] = useState<'buy' | 'sell'>('buy')
  const [price, setPrice] = useState<string>(currentPrice.toString())
  const [amount, setAmount] = useState<string>('')

  const total = (parseFloat(price || '0') * parseFloat(amount || '0')).toFixed(4)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!price || !amount) return
    onSubmit(type, parseFloat(price), parseFloat(amount))
    setAmount('')
  }

  return (
    <div className="bg-space-900 border border-space-800 rounded-xl p-4">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setType('buy')}
          className={`flex-1 py-2 rounded font-bold transition-colors ${type === 'buy' ? 'bg-green-600 text-white' : 'bg-space-800 text-space-100 hover:bg-space-700'}`}
        >
          Buy {baseAsset.code}
        </button>
        <button
          onClick={() => setType('sell')}
          className={`flex-1 py-2 rounded font-bold transition-colors ${type === 'sell' ? 'bg-red-600 text-white' : 'bg-space-800 text-space-100 hover:bg-space-700'}`}
        >
          Sell {baseAsset.code}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-space-100 mb-1">Price ({quoteAsset.code})</label>
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-space-950 border border-space-700 rounded p-2 text-white focus:border-cosmic-cyan outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-space-100 mb-1">Amount ({baseAsset.code})</label>
          <div className="relative flex items-center">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-space-950 border border-space-700 rounded p-2 text-white focus:border-cosmic-cyan outline-none"
              required
            />
            <button
              type="button"
              className="absolute right-2 text-xs text-cosmic-cyan hover:text-white"
              onClick={() => setAmount('100')} // Mock max amount
            >
              MAX
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-space-800">
          <div className="flex justify-between text-sm mb-4">
            <span className="text-space-100">Total</span>
            <span className="text-white font-mono">
              {total} {quoteAsset.code}
            </span>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded font-bold text-white transition-colors ${type === 'buy' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
          >
            {type === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
