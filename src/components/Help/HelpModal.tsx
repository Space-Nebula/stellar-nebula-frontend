import { useEffect, useMemo, useState } from 'react'

export interface HelpFaqItem {
  id: string
  category: 'Game Mechanics' | 'Wallet' | 'Troubleshooting'
  question: string
  answer: string
}

const BASE_FAQ_ITEMS: HelpFaqItem[] = [
  {
    id: 'getting-started',
    category: 'Game Mechanics',
    question: 'How do I start exploring Stellar Nebula?',
    answer:
      'Connect your wallet, visit the Nebula route, and use the ship controls to scan sectors and discover anomalies.',
  },
  {
    id: 'wallet-required',
    category: 'Wallet',
    question: 'Do I need a wallet to play?',
    answer:
      'You can browse the interface without a wallet, but wallet connection is required to access on-chain game actions.',
  },
  {
    id: 'scanner-loop',
    category: 'Game Mechanics',
    question: 'How does scanning and discovery work?',
    answer:
      'Open the scanner, target nearby points, and run scans. New sectors unlock as scans complete and resource signatures appear.',
  },
  {
    id: 'wallet-connection-fails',
    category: 'Troubleshooting',
    question: 'My wallet does not connect. What should I do?',
    answer:
      'Refresh once, unlock your wallet extension, and confirm you are on the right network. If needed, disconnect and reconnect from the wallet panel.',
  },
]

const FAQ_CATEGORIES: Array<HelpFaqItem['category']> = ['Game Mechanics', 'Wallet', 'Troubleshooting']

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return BASE_FAQ_ITEMS

    return BASE_FAQ_ITEMS.filter((item) => {
      const haystack = `${item.question} ${item.answer} ${item.category}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [normalizedQuery])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="help-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Help and frequently asked questions"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="help-modal-header">
          <h2>Help Center</h2>
          <button type="button" className="help-modal-close" onClick={onClose} aria-label="Close help">
            Close
          </button>
        </header>

        <p className="help-modal-intro">
          Explore game basics and wallet guidance to get unstuck quickly.
        </p>

        <label className="help-search" htmlFor="help-search-input">
          <span>Search FAQ</span>
          <input
            id="help-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search game mechanics, wallet, troubleshooting..."
          />
        </label>

        <div className="help-modal-faq" role="list">
          {FAQ_CATEGORIES.map((category) => (
            <article key={category} className="help-faq-category">
              <h3 className="help-faq-category-title">{category}</h3>
              {filteredItems
                .filter((item) => item.category === category)
                .map((item) => (
                <details key={item.id} className="help-faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
                ))}
            </article>
          ))}
          {filteredItems.length === 0 && (
            <p className="help-faq-empty">No FAQ entries match your search yet.</p>
          )}
        </div>

        <section className="help-wallet-section" aria-label="Wallet help">
          <h3>Wallet Help</h3>
          <ul>
            <li>Keep your wallet unlocked before opening game actions.</li>
            <li>Approve network requests from your wallet extension prompt.</li>
            <li>If signing fails, reconnect your wallet from the profile section.</li>
          </ul>
        </section>

        <section className="help-links" aria-label="External documentation">
          <h3>Documentation</h3>
          <a href="https://developers.stellar.org/" target="_blank" rel="noreferrer noopener">
            Stellar developer docs
          </a>
          <a href="https://developers.stellar.org/docs/tools/wallets/" target="_blank" rel="noreferrer noopener">
            Wallet tools and guides
          </a>
        </section>
      </section>
    </div>
  )
}
