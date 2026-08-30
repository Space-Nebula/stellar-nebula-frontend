import '@testing-library/jest-dom'

// happy-dom's localStorage may be unavailable or incomplete depending on the
// --localstorage-file flag. Provide a reliable in-memory shim for all tests.
const localStorageStore: Record<string, string> = {}
const localStorageMock: Storage = {
  get length() {
    return Object.keys(localStorageStore).length
  },
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
