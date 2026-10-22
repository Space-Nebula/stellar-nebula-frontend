import { useState } from 'react'
import { useMultiSig } from '@/hooks/useMultiSig'
import { useSanitizedInput } from '@/hooks/useSanitizedInput'

export function MultiSigBuilder() {
  const {
    transaction,
    error,
    initializeTransaction,
    addSignature,
    isReady,
    getProgress,
    getRemainingCount,
    exportTransaction,
    resetTransaction,
  } = useMultiSig()

  const [transactionXdr, setTransactionXdr] = useState('')
  const [threshold, setThreshold] = useState('2')
  // #491: signer addresses are free text the user pastes and later renders and
  // exports, so they are sanitized on every change. The XDR and signature
  // fields below are base64 payloads validated by the Stellar SDK downstream
  // (sanitizing them as HTML text would corrupt legitimate base64).
  const signersInput = useSanitizedInput('')
  const currentSignerInput = useSanitizedInput('', { maxLength: 64 })
  const [currentSignature, setCurrentSignature] = useState('')

  const handleInitialize = () => {
    const signersList = signersInput.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!transactionXdr.trim()) {
      alert('Transaction XDR is required')
      return
    }

    if (!threshold || parseInt(threshold) < 1) {
      alert('Threshold must be at least 1')
      return
    }

    if (signersList.length === 0) {
      alert('At least one signer is required')
      return
    }

    initializeTransaction(transactionXdr, parseInt(threshold), signersList)
  }

  const handleAddSignature = () => {
    if (!currentSignerInput.value.trim() || !currentSignature.trim()) {
      alert('Both signer and signature are required')
      return
    }

    addSignature(currentSignerInput.value, currentSignature)
    currentSignerInput.setValue('')
    setCurrentSignature('')
  }

  const handleExport = () => {
    const exported = exportTransaction()
    if (exported) {
      const blob = new Blob([exported], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'multisig-transaction.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const progress = transaction ? getProgress() : null
  const remainingCount = transaction ? getRemainingCount() : 0
  const readyToExecute = isReady()

  return (
    <div className="p-6 max-w-4xl mx-auto bg-slate-950 rounded-lg border border-slate-800">
      <h2 className="text-2xl font-bold mb-6 text-cyan-400">Multi-Signature Transaction Builder</h2>

      {error && <div className="mb-4 p-3 bg-red-900 text-red-100 rounded">{error}</div>}

      {!transaction ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Transaction XDR</label>
            <textarea
              value={transactionXdr}
              onChange={(e) => setTransactionXdr(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
              rows={4}
              placeholder="Paste transaction XDR here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Threshold</label>
              <input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Signers (one per line)
            </label>
            <textarea
              value={signersInput.value}
              onChange={signersInput.onChange}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
              rows={4}
              placeholder="G..."
            />
          </div>

          <button
            onClick={handleInitialize}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded"
          >
            Initialize Transaction
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 rounded border border-slate-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">Transaction Details</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <span className="font-medium">Threshold:</span> {transaction.threshold} of{' '}
                {transaction.signers.length}
              </p>
              <p>
                <span className="font-medium">Signers:</span>
              </p>
              <ul className="ml-4 space-y-1">
                {transaction.signers.map((signer) => (
                  <li key={signer} className="font-mono text-xs">
                    {signer}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {progress && (
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Signature Progress</h3>
              <div className="mb-2 text-sm text-slate-300">
                {progress.current} of {progress.required} signatures
                {remainingCount > 0 && ` (${remainingCount} more needed)`}
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {!readyToExecute && (
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Add Signature</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Signer Address
                  </label>
                  <input
                    type="text"
                    value={currentSignerInput.value}
                    onChange={currentSignerInput.onChange}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                    placeholder="G..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Signature</label>
                  <textarea
                    value={currentSignature}
                    onChange={(e) => setCurrentSignature(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                    rows={2}
                    placeholder="Paste signature here..."
                  />
                </div>
                <button
                  onClick={handleAddSignature}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded"
                >
                  Add Signature
                </button>
              </div>
            </div>
          )}

          {readyToExecute && (
            <div className="p-4 bg-green-900 rounded border border-green-700">
              <p className="text-green-100 font-semibold mb-3">
                Ready to execute - all signatures collected
              </p>
              <button
                onClick={handleExport}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded mb-2"
              >
                Export for Execution
              </button>
            </div>
          )}

          <button
            onClick={resetTransaction}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
