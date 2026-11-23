import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  normalizeAmountString,
  MIN_STELLAR_TRADE_AMOUNT,
  STELLAR_MAX_DECIMALS,
} from '@/utils/validation'

export interface UseTradeValidationOptions {
  price?: string | number
  amount?: string | number
  availableBalance: number
  assetCode?: string
  minTradeAmount?: number
  maxDecimalsLimit?: number
}

export interface UseTradeValidationReturn {
  price: string
  amount: string
  priceError: string | null
  amountError: string | null
  isValid: boolean
  setPrice: (val: string) => void
  setAmount: (val: string) => void
  validateAmount: (val?: string) => string | null
  validatePrice: (val?: string) => string | null
  validateAll: () => boolean
}

/**
 * Hook providing real-time validation for Stellar DEX trades (#552).
 * Enforces positive numbers, balance limits, 7 decimal places, minimum trade amounts,
 * and safe handling of scientific notation.
 */
export function useTradeValidation(options: UseTradeValidationOptions): UseTradeValidationReturn {
  const {
    price: initialPrice = '',
    amount: initialAmount = '',
    availableBalance,
    assetCode = 'XLM',
    minTradeAmount = MIN_STELLAR_TRADE_AMOUNT,
    maxDecimalsLimit = STELLAR_MAX_DECIMALS,
  } = options

  const [price, setPrice] = useState<string>(String(initialPrice ?? ''))
  const [amount, setAmount] = useState<string>(String(initialAmount ?? ''))
  const [priceTouched, setPriceTouched] = useState<boolean>(false)
  const [amountTouched, setAmountTouched] = useState<boolean>(false)

  const validatePrice = useCallback((val?: string): string | null => {
    const valueToTest = (val !== undefined ? val : price).trim()
    if (!valueToTest) {
      return 'Enter a price'
    }

    const normalized = normalizeAmountString(valueToTest)
    const num = Number(normalized)
    if (!Number.isFinite(num)) {
      return 'Price must be a number'
    }
    if (num <= 0) {
      return 'Price must be greater than zero'
    }

    const [, decimals = ''] = normalized.split('.')
    if (decimals.length > maxDecimalsLimit) {
      return `Price supports up to ${maxDecimalsLimit} decimal places`
    }

    return null
  }, [price, maxDecimalsLimit])

  const validateAmount = useCallback((val?: string): string | null => {
    const valueToTest = (val !== undefined ? val : amount).trim()
    if (!valueToTest) {
      return 'Enter an amount'
    }

    const normalized = normalizeAmountString(valueToTest)
    const num = Number(normalized)
    if (!Number.isFinite(num)) {
      return 'Amount must be a number'
    }
    if (num <= 0) {
      return 'Amount must be greater than zero'
    }
    if (num < minTradeAmount) {
      return `Minimum trade amount is ${minTradeAmount} ${assetCode}`
    }
    if (num > availableBalance) {
      return `Amount cannot exceed your balance of ${availableBalance} ${assetCode}`
    }

    const [, decimals = ''] = normalized.split('.')
    if (decimals.length > maxDecimalsLimit) {
      return `Amount supports up to ${maxDecimalsLimit} decimal places`
    }

    return null
  }, [amount, availableBalance, assetCode, minTradeAmount, maxDecimalsLimit])

  const priceError = useMemo(() => {
    return priceTouched ? validatePrice(price) : null
  }, [priceTouched, price, validatePrice])

  const amountError = useMemo(() => {
    return amountTouched ? validateAmount(amount) : null
  }, [amountTouched, amount, validateAmount])

  const isValid = useMemo(() => {
    return validatePrice(price) === null && validateAmount(amount) === null
  }, [price, amount, validatePrice, validateAmount])

  const handleSetPrice = useCallback((val: string) => {
    setPrice(val)
    setPriceTouched(true)
  }, [])

  const handleSetAmount = useCallback((val: string) => {
    setAmount(val)
    setAmountTouched(true)
  }, [])

  const validateAll = useCallback((): boolean => {
    setPriceTouched(true)
    setAmountTouched(true)
    return validatePrice(price) === null && validateAmount(amount) === null
  }, [price, amount, validatePrice, validateAmount])

  return {
    price,
    amount,
    priceError,
    amountError,
    isValid,
    setPrice: handleSetPrice,
    setAmount: handleSetAmount,
    validateAmount,
    validatePrice,
    validateAll,
  }
}

export default useTradeValidation
