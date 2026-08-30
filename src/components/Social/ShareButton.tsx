import { useState } from 'react'
import html2canvas from 'html2canvas'
import { analytics } from '@/services/analytics'
import { useAchievementStore } from '@/store'

type ShareSubject = 'achievement' | 'scan' | 'leaderboard'

interface ShareButtonProps {
  title?: string
  description?: string
  achievementTitle?: string
  achievementDescription?: string
  subject?: ShareSubject
  playerStats?: {
    scans?: number
    upgrades?: number
    resources?: number
    rank?: number
    score?: number
  }
  variant?: 'icon' | 'full'
}

interface GeneratedImage {
  dataUrl: string
  blob: Blob
}

const SUBJECT_LABELS: Record<ShareSubject, string> = {
  achievement: 'Achievement Unlocked',
  scan: 'Nebula Scan Complete',
  leaderboard: 'Leaderboard Result',
}

function createStat(label: string, value: number): HTMLDivElement {
  const stat = document.createElement('div')
  stat.style.cssText = `
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
  `

  const valueNode = document.createElement('div')
  valueNode.textContent = value.toLocaleString()
  valueNode.style.cssText = `
    font-size: 46px;
    font-weight: 800;
    color: #32d6a5;
    margin-bottom: 8px;
  `

  const labelNode = document.createElement('div')
  labelNode.textContent = label
  labelNode.style.cssText = `
    font-size: 17px;
    color: #aabbd3;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  `

  stat.append(valueNode, labelNode)
  return stat
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Unable to generate share image'))
      }
    }, 'image/png')
  })
}

export function ShareButton({
  title,
  description,
  achievementTitle,
  achievementDescription,
  subject = 'achievement',
  playerStats,
  variant = 'full',
}: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const recordShareCreated = useAchievementStore((state) => state.recordShareCreated)
  const shareTitle = title ?? achievementTitle ?? 'Stellar Nebula Progress'
  const shareDescription =
    description ?? achievementDescription ?? 'New progress logged in Stellar Nebula.'

  const reportShare = (channel: string) => {
    recordShareCreated({ channel, subject })
    analytics.track('share_created', {
      channel,
      subject,
    })
  }

  const generateShareImage = async (): Promise<GeneratedImage> => {
    const tempCard = document.createElement('div')
    tempCard.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 1200px;
      min-height: 630px;
      background: linear-gradient(135deg, #07111f 0%, #13233d 100%);
      padding: 60px;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      color: white;
    `

    const frame = document.createElement('div')
    frame.style.cssText = `
      width: 100%;
      min-height: 510px;
      border: 2px solid rgba(50, 214, 165, 0.32);
      border-radius: 24px;
      padding: 48px;
      background:
        radial-gradient(circle at top right, rgba(50, 214, 165, 0.16), transparent 56%),
        radial-gradient(circle at bottom left, rgba(159, 216, 255, 0.16), transparent 54%),
        rgba(7, 17, 31, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 42px;
    `

    const content = document.createElement('div')
    const badge = document.createElement('div')
    badge.textContent = SUBJECT_LABELS[subject]
    badge.style.cssText = `
      display: inline-block;
      background: rgba(50, 214, 165, 0.18);
      color: #7ff0c8;
      padding: 8px 20px;
      border-radius: 999px;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 32px;
    `

    const heading = document.createElement('h1')
    heading.textContent = shareTitle
    heading.style.cssText = `
      font-size: 62px;
      font-weight: 800;
      margin: 0 0 24px;
      line-height: 1.08;
      color: #f8fbff;
    `

    const copy = document.createElement('p')
    copy.textContent = shareDescription
    copy.style.cssText = `
      font-size: 28px;
      color: #c8d4e6;
      margin: 0;
      line-height: 1.4;
    `

    content.append(badge, heading, copy)
    frame.append(content)

    if (playerStats) {
      const stats = document.createElement('div')
      stats.style.cssText = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      `

      if (playerStats.rank !== undefined) stats.append(createStat('Rank', playerStats.rank))
      if (playerStats.score !== undefined) stats.append(createStat('Score', playerStats.score))
      if (playerStats.scans !== undefined) stats.append(createStat('Scans', playerStats.scans))
      if (playerStats.upgrades !== undefined) {
        stats.append(createStat('Upgrades', playerStats.upgrades))
      }
      if (playerStats.resources !== undefined) {
        stats.append(createStat('Resources', playerStats.resources))
      }

      frame.append(stats)
    }

    const footer = document.createElement('div')
    footer.textContent = 'Stellar Nebula'
    footer.style.cssText = `
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 26px;
      color: #f8fbff;
      font-size: 30px;
      font-weight: 800;
    `
    frame.append(footer)
    tempCard.append(frame)
    document.body.appendChild(tempCard)

    try {
      const canvas = await html2canvas(tempCard, {
        backgroundColor: null,
        scale: 2,
      })

      return {
        dataUrl: canvas.toDataURL('image/png'),
        blob: await canvasToBlob(canvas),
      }
    } finally {
      document.body.removeChild(tempCard)
    }
  }

  const shareText = `Logged "${shareTitle}" in Stellar Nebula.\n\n${shareDescription}\n\nhttps://nebula-nomad.vercel.app`

  const shareToX = async () => {
    setIsGenerating(true)
    try {
      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
      window.open(xUrl, '_blank', 'width=550,height=520')
      reportShare('x')
    } finally {
      setIsGenerating(false)
      setShowMenu(false)
    }
  }

  const openDiscord = async () => {
    setIsGenerating(true)
    try {
      await navigator.clipboard?.writeText(shareText)
      window.open('https://discord.com/channels/@me', '_blank', 'noopener,noreferrer')
      reportShare('discord')
    } finally {
      setIsGenerating(false)
      setShowMenu(false)
    }
  }

  const downloadImage = async () => {
    setIsGenerating(true)
    try {
      const image = await generateShareImage()
      const link = document.createElement('a')
      link.download = `stellar-nebula-${shareTitle.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = image.dataUrl
      link.click()
      reportShare('download')
    } finally {
      setIsGenerating(false)
      setShowMenu(false)
    }
  }

  const copyImageToClipboard = async () => {
    setIsGenerating(true)
    try {
      const image = await generateShareImage()

      if ('ClipboardItem' in window && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': image.blob })])
      } else {
        await navigator.clipboard?.writeText(shareText)
      }

      reportShare('clipboard')
    } finally {
      setIsGenerating(false)
      setShowMenu(false)
    }
  }

  const buttonStyle = variant === 'icon' ? iconButtonStyle : fullButtonStyle
  const buttonLabel = variant === 'icon' ? 'Share' : isGenerating ? 'Generating...' : 'Share'

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        style={buttonStyle}
        disabled={isGenerating}
        aria-label={`Share ${subject}`}
      >
        {buttonLabel}
      </button>

      {showMenu && (
        <div style={menuStyle}>
          <button
            type="button"
            onClick={shareToX}
            style={menuItemStyle}
            aria-label="Share to X (Twitter)"
          >
            Share on X
          </button>
          <button
            type="button"
            onClick={openDiscord}
            style={menuItemStyle}
            aria-label="Share to Discord"
          >
            Open Discord
          </button>
          <button
            type="button"
            onClick={copyImageToClipboard}
            style={menuItemStyle}
            aria-label="Copy image to clipboard"
          >
            Copy image
          </button>
          <button
            type="button"
            onClick={downloadImage}
            style={menuItemStyle}
            aria-label="Download share image"
          >
            Download image
          </button>
        </div>
      )}
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  background: 'rgba(50, 214, 165, 0.15)',
  border: '1px solid rgba(50, 214, 165, 0.3)',
  borderRadius: '999px',
  minWidth: '2.75rem',
  minHeight: '2.25rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#7ff0c8',
  fontSize: '0.82rem',
  fontWeight: 800,
}

const fullButtonStyle: React.CSSProperties = {
  background: 'rgba(50, 214, 165, 0.15)',
  border: '1px solid rgba(50, 214, 165, 0.3)',
  borderRadius: '999px',
  padding: '0.75rem 1rem',
  color: '#7ff0c8',
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 0.5rem)',
  right: 0,
  zIndex: 50,
  background: 'rgba(10, 16, 32, 0.98)',
  border: '1px solid rgba(210, 222, 255, 0.2)',
  borderRadius: '0.75rem',
  padding: '0.5rem',
  minWidth: '180px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '0.7rem 0.85rem',
  color: '#f8fbff',
  cursor: 'pointer',
  fontSize: '0.9rem',
  textAlign: 'left',
  borderRadius: '0.45rem',
}
