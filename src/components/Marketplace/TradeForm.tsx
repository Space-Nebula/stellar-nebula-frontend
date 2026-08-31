import React, { useMemo } from 'react'
import type { Asset } from './types'
import { useFormValidation } from '../../hooks/useFormValidation'
import {
  isNumber,
  max,
  maxDecimals,
  positive,
  required,
  validateValues,
} from '../../utils/validation'

interface TradeFormProps {
  baseAsset: Asset
  quoteAsset: Asset
  currentPrice: number
  /** Maximum amount the trader can spend/sell, used for the MAX shortcut and bounds. */
  maxAmount?: number
  onSubmit: (type: 'buy' | 'sell', price: number, amount: number) => void
}

interface TradeFormValues {
  price: string
  amount: string
  [key: string]: string
}

export const TradeForm: React.FC<TradeFormProps> = ({
  baseAsset,
  quoteAsset,
  currentPrice,
  maxAmount = 100,
  onSubmit,
}) => {
  const [type, setType] = React.useState<'buy' | 'sell'>('buy')

  const schema = useMemo(
    () => ({
      price: [
        required('Enter a price'),
        isNumber('Price must be a number'),
        positive('Price must be greater than zero'),
        maxDecimals(7, 'Price supports up to 7 decimal places'),
      ],
      amount: [
        required('Enter an amount'),
        isNumber('Amount must be a number'),
        positive('Amount must be greater than zero'),
        maxDecimals(7, 'Amount supports up to 7 decimal places'),
        max(maxAmount, `Amount cannot exceed your balance of ${maxAmount} ${baseAsset.code}`),
      ],
    }),
    [baseAsset.code, maxAmount]
  )

  const { values, errors, touched, handleChange, handleBlur, setValue, validateAll, reset } =
    useFormValidation<TradeFormValues>({ price: currentPrice.toString(), amount: '' }, schema)

  const total = (parseFloat(values.price || '0') * parseFloat(values.amount || '0')).toFixed(4)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAll()) {
      const found = validateValues(values, schema)
      const firstInvalid = found.price ? 'trade-price' : found.amount ? 'trade-amount' : null
      if (firstInvalid) document.getElementById(firstInvalid)?.focus()
      return
    }
    onSubmit(type, parseFloat(values.price), parseFloat(values.amount))
    reset({ price: values.price, amount: '' })
  }

  const priceError = touched.price ? errors.price : undefined
  const amountError = touched.amount ? errors.amount : undefined

  return (
    <div className="trade-form bg-space-900 border border-space-800 rounded-xl p-4">
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setType('buy')}
          className={`flex-1 py-2 rounded font-bold transition-colors ${type === 'buy' ? 'bg-green-600 text-white' : 'bg-space-800 text-space-100 hover:bg-space-700'}`}
        >
          Buy {baseAsset.code}
        </button>
        <button
          type="button"
          onClick={() => setType('sell')}
          className={`flex-1 py-2 rounded font-bold transition-colors ${type === 'sell' ? 'bg-red-600 text-white' : 'bg-space-800 text-space-100 hover:bg-space-700'}`}
        >
          Sell {baseAsset.code}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="trade-price" className="block text-sm text-space-100 mb-1">
            Price ({quoteAsset.code})
          </label>
          <div className="relative">
            <input
              id="trade-price"
              type="number"
              step="0.0001"
              min="0"
              inputMode="decimal"
              value={values.price}
              onChange={handleChange('price')}
              onBlur={handleBlur('price')}
              aria-invalid={priceError ? 'true' : 'false'}
              aria-describedby={priceError ? 'trade-price-error' : undefined}
              className={`w-full bg-space-950 border rounded p-2 text-white outline-none ${
                priceError
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-space-700 focus:border-cosmic-cyan'
              }`}
            />
          </div>
          {priceError && (
            <p id="trade-price-error" role="alert" className="mt-1 text-xs text-rose-400">
              {priceError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="trade-amount" className="block text-sm text-space-100 mb-1">
            Amount ({baseAsset.code})
          </label>
          <div className="relative flex items-center">
            <input
              id="trade-amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={values.amount}
              onChange={handleChange('amount')}
              onBlur={handleBlur('amount')}
              aria-invalid={amountError ? 'true' : 'false'}
              aria-describedby={amountError ? 'trade-amount-error' : undefined}
              className={`w-full bg-space-950 border rounded p-2 text-white outline-none ${
                amountError
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-space-700 focus:border-cosmic-cyan'
              }`}
            />
            <button
              type="button"
              className="absolute right-2 text-xs text-cosmic-cyan hover:text-white"
              onClick={() => setValue('amount', String(maxAmount))}
            >
              MAX
            </button>
          </div>
          {amountError && (
            <p id="trade-amount-error" role="alert" className="mt-1 text-xs text-rose-400">
              {amountError}
            </p>
          )}
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
