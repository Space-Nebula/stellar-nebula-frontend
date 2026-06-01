import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { analytics } from '@/services/analytics'

interface ShareButtonProps {
  achievementTitle: string
  achievementDescription: string
  playerStats?: {
    scans?: number
    upgrades?: number
    resources?: number
  }
  variant?: 'icon' | 'full'
}

export function ShareButton({
  achievementTitle,
  achievementDescription,
  playerStats,
  variant = 'full',
}: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const generateShareImage = async (): Promise<string> => {
    // Create a temporary card element for image generation
    const tempCard = document.createElement('div')
    tempCard.style.cssText = `
      position: fixed;
      left: -9999px;
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #0a1020 0%, #1a1a2e 100%);
      padding: 60px;
      font-family: Inter, sans-serif;
      color: white;
    `

    tempCard.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        border: 2px solid rgba(50, 214, 165, 0.3);
        border-radius: 24px;
        padding: 48px;
        background: radial-gradient(circle at top right, rgba(50, 214, 165, 0.15), transparent 60%),
                    radial-gradient(circle at bottom left, rgba(157, 76, 237, 0.15), transparent 60%);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      ">
        <div>
          <div style="
            display: inline-block;
            background: rgba(50, 214, 165, 0.2);
            color: #32d6a5;
            padding: 8px 20px;
            border-radius: 999px;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 32px;
          ">
            🏆 Achievement Unlocked
          </div>
          
          <h1 style="
            font-size: 64px;
            font-weight: 800;
            margin: 0 0 24px 0;
            line-height: 1.1;
            background: linear-gradient(135deg, #32d6a5, #9d4edd);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          ">
            ${achievementTitle}
          </h1>
          
          <p style="
            font-size: 28px;
            color: #c8d4e6;
            margin: 0;
            line-height: 1.4;
          ">
            ${achievementDescription}
          </p>
        </div>

        ${
          playerStats
            ? `
        <div style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        ">
          ${
            playerStats.scans !== undefined
              ? `
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
          ">
            <div style="font-size: 48px; font-weight: 800; color: #32d6a5; margin-bottom: 8px;">
              ${playerStats.scans}
            </div>
            <div style="font-size: 18px; color: #aabbd3; text-transform: uppercase; letter-spacing: 0.05em;">
              Scans
            </div>
          </div>
          `
              : ''
          }
          ${
            playerStats.upgrades !== undefined
              ? `
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
          ">
            <div style="font-size: 48px; font-weight: 800; color: #9d4edd; margin-bottom: 8px;">
              ${playerStats.upgrades}
            </div>
            <div style="font-size: 18px; color: #aabbd3; text-transform: uppercase; letter-spacing: 0.05em;">
              Upgrades
            </div>
          </div>
          `
              : ''
          }
          ${
            playerStats.resources !== undefined
              ? `
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
          ">
            <div style="font-size: 48px; font-weight: 800; color: #60a5fa; margin-bottom: 8px;">
              ${playerStats.resources}
            </div>
            <div style="font-size: 18px; color: #aabbd3; text-transform: uppercase; letter-spacing: 0.05em;">
              Resources
            </div>
          </div>
          `
              : ''
          }
        </div>
        `
            : ''
        }

        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 48px;
          padding-top: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="
            font-size: 32px;
            font-weight: 800;
            color: #f8fbff;
            display: flex;
            align-items: center;
            gap: 12px;
          ">
            <span style="
              width: 12px;
              height: 12px;
              background: #32d6a5;
              border-radius: 50%;
              box-shadow: 0 0 0 6px rgba(50, 214, 165, 0.2);
            "></span>
            Nebula Nomad
          </div>
          <div style="
            font-size: 20px;
            color: #aabbd3;
          ">
            nebula-nomad.vercel.app
          </div>
        </div>
      </div>
    `

    document.body.appendChild(tempCard)

    try {
      const canvas = await html2canvas(tempCard, {
        backgroundColor: null,
        scale: 2,
      })
      const dataUrl = canvas.toDataURL('image/png')
      return dataUrl
    } finally {
      document.body.removeChild(tempCard)
    }
  }

  const shareToTwitter = async () => {
    setIsGenerating(true)
    try {
      const text = `🚀 Just unlocked "${achievementTitle}" in Nebula Nomad!\n\n${achievementDescription}\n\nJoin me in exploring the cosmos on Stellar blockchain! 🌌\n\n#NebulaNomad #StellarBlockchain #Web3Gaming`
      const url = 'https://nebula-nomad.vercel.app'
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

      window.open(twitterUrl, '_blank', 'width=550,height=420')

      analytics.track('achievement_shared' as any, {
        platform: 'twitter',
        achievement: achievementTitle,
      })
    } finally {
      setIsGenerating(false)
      setShowMenu(false)
    }
  }

  const downloadImage = async () => {
    setIsGenerating(true)
    try {
      const dataUrl = await generateShareImage()
      const link = document.createElement('a')
      link.download = `nebula-nomad-${achievementTitle.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = dataUrl
      link.click()

      analytics.track('achievement_shared' as any, {
        platform: 'download',
        achievement: achievementTitle,
      })
    } finally {
      setIsGenerating(false)
      setShowMenu(false)
    }
  }

  const copyToClipboard = async () => {
    const text = `🚀 Just unlocked "${achievementTitle}" in Nebula Nomad!\n\n${achievementDescription}\n\nJoin me: https://nebula-nomad.vercel.app`

    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')

      analytics.track('achievement_shared' as any, {
        platform: 'clipboard',
        achievement: achievementTitle,
      })
    } catch (err) {
      console.error('Failed to copy:', err)
    }
    setShowMenu(false)
  }

  if (variant === 'icon') {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={iconButtonStyle}
          disabled={isGenerating}
          aria-label="Share achievement"
        >
          {isGenerating ? '⏳' : '🔗'}
        </button>

        {showMenu && (
          <div style={menuStyle}>
            <button onClick={shareToTwitter} style={menuItemStyle}>
              🐦 Share on Twitter/X
            </button>
            <button onClick={downloadImage} style={menuItemStyle}>
              💾 Download Image
            </button>
            <button onClick={copyToClipboard} style={menuItemStyle}>
              📋 Copy Text
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={fullButtonStyle}
        disabled={isGenerating}
      >
        {isGenerating ? '⏳ Generating...' : '🔗 Share Achievement'}
      </button>

      {showMenu && (
        <div style={menuStyle}>
          <button onClick={shareToTwitter} style={menuItemStyle}>
            🐦 Share on Twitter/X
          </button>
          <button onClick={downloadImage} style={menuItemStyle}>
            💾 Download Image
          </button>
          <button onClick={copyToClipboard} style={menuItemStyle}>
            📋 Copy Text
          </button>
        </div>
      )}
    </div>
  )
}

// Styles
const iconButtonStyle: React.CSSProperties = {
  background: 'rgba(50, 214, 165, 0.15)',
  border: '1px solid rgba(50, 214, 165, 0.3)',
  borderRadius: '50%',
  width: '2.5rem',
  height: '2.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '1.2rem',
  transition: 'all 0.2s',
}

const fullButtonStyle: React.CSSProperties = {
  background: 'rgba(50, 214, 165, 0.15)',
  border: '1px solid rgba(50, 214, 165, 0.3)',
  borderRadius: '999px',
  padding: '0.75rem 1.5rem',
  color: '#32d6a5',
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: 600,
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 0.5rem)',
  right: 0,
  zIndex: 50,
  background: 'rgba(10, 16, 32, 0.98)',
  border: '1px solid rgba(210, 222, 255, 0.2)',
  borderRadius: '1rem',
  padding: '0.5rem',
  minWidth: '200px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '0.75rem 1rem',
  color: '#f8fbff',
  cursor: 'pointer',
  fontSize: '0.9rem',
  textAlign: 'left',
  borderRadius: '0.5rem',
  transition: 'background 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}
