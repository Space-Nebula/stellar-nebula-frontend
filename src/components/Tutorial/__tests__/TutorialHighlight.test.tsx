import { describe, it, expect, afterEach } from 'vitest'
import { render } from '../../../test/utils'
import { TutorialHighlight } from '../TutorialHighlight'

describe('TutorialHighlight', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders nothing when not visible', () => {
    const { container } = render(<TutorialHighlight selector=".test-element" visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when selector is null', () => {
    const { container } = render(<TutorialHighlight selector={null} visible={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when element is not found', () => {
    const { container } = render(
      <TutorialHighlight selector=".nonexistent-element" visible={true} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('creates overlay when element exists', () => {
    const div = document.createElement('div')
    div.className = 'highlight-target'
    document.body.appendChild(div)

    render(<TutorialHighlight selector=".highlight-target" visible={true} />)

    const overlay = document.body.querySelector('div[style*="z-index"]')
    expect(overlay).not.toBeNull()
  })
})
