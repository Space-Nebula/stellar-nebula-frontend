/**
 * Ambient typing for vite-plugin-pwa's virtual register module (issue #325).
 * Mirrors `vite-plugin-pwa/client`'s public shape; the project doesn't
 * reference that package's types elsewhere, so this is declared locally.
 */
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegisteredSW?: (
      swUrl: string,
      registration: ServiceWorkerRegistration | undefined
    ) => void
    onRegisterError?: (error: unknown) => void
  }

  /** Call with `true` to skip waiting and reload with the new service worker. */
  export function registerSW(
    options?: RegisterSWOptions
  ): (reloadPage?: boolean) => Promise<void>
}
