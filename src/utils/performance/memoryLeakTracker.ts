export type ManagedResourceType =
  | 'geometry'
  | 'texture'
  | 'material'
  | 'animationFrame'
  | 'eventListener'

interface ManagedResource {
  type: ManagedResourceType
  id: string
  cleanup: () => void
}

export function createResourceTracker() {
  const resources = new Map<string, ManagedResource>()

  const makeKey = (type: ManagedResourceType, id: string) => `${type}:${id}`

  const trackResource = (type: ManagedResourceType, id: string, cleanup: () => void) => {
    const key = makeKey(type, id)

    if (resources.has(key)) {
      resources.get(key)?.cleanup()
    }

    resources.set(key, { type, id, cleanup })
    return key
  }

  const releaseResource = (type: ManagedResourceType, id: string) => {
    const key = makeKey(type, id)
    const resource = resources.get(key)

    if (!resource) return

    resource.cleanup()
    resources.delete(key)
  }

  const dispose = () => {
    resources.forEach((resource) => resource.cleanup())
    resources.clear()
  }

  const hasLeaks = () => resources.size > 0

  const leakCount = () => resources.size

  const leakReport = () => {
    return Array.from(resources.values()).reduce<Record<string, number>>((report, resource) => {
      report[resource.type] = (report[resource.type] ?? 0) + 1
      return report
    }, {})
  }

  const trackAnimationFrame = (frameId: number) => {
    return trackResource('animationFrame', String(frameId), () => cancelAnimationFrame(frameId))
  }

  const trackEventListener = (
    target: EventTarget,
    event: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    const listenerId = `${event}:${listener.toString()}`
    target.addEventListener(event, listener, options)

    return trackResource('eventListener', listenerId, () =>
      target.removeEventListener(event, listener, options)
    )
  }

  return {
    trackResource,
    releaseResource,
    trackAnimationFrame,
    trackEventListener,
    dispose,
    hasLeaks,
    leakCount,
    leakReport,
  }
}
