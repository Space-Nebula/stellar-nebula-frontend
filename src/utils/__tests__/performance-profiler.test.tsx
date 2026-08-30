/**
 * Tests for React Profiler monitoring
 * Issue #260
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import {
  ProfiledComponent,
  getProfilerStats,
  clearProfilerData,
  getAllProfilerData,
} from '../performance-profiler'

describe('Performance Profiler', () => {
  beforeEach(() => {
    clearProfilerData()
  })

  it('should render ProfiledComponent', () => {
    const { container } = render(
      <ProfiledComponent id="test-component">
        <div>Test Content</div>
      </ProfiledComponent>
    )

    expect(container.textContent).toBe('Test Content')
  })

  it('should collect profiler data', () => {
    render(
      <ProfiledComponent id="test-profiled">
        <div>Profiled Content</div>
      </ProfiledComponent>
    )

    const data = getAllProfilerData()
    expect(data.length).toBeGreaterThan(0)
  })

  it('should calculate stats for component', () => {
    render(
      <ProfiledComponent id="stats-test">
        <div>Stats Test</div>
      </ProfiledComponent>
    )

    const stats = getProfilerStats('stats-test')
    expect(stats).toBeDefined()
    if (stats) {
      expect(stats.componentId).toBe('stats-test')
      expect(stats.renderCount).toBeGreaterThan(0)
    }
  })

  it('should return null for unknown component', () => {
    const stats = getProfilerStats('non-existent')
    expect(stats).toBeNull()
  })

  it('should clear profiler data', () => {
    render(
      <ProfiledComponent id="clear-test">
        <div>Clear Test</div>
      </ProfiledComponent>
    )

    expect(getAllProfilerData().length).toBeGreaterThan(0)
    clearProfilerData()
    expect(getAllProfilerData().length).toBe(0)
  })
})
