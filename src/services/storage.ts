import { encrypt, decrypt, type EncryptedData } from '@/utils/crypto'
import { logger } from './logging'

const ENCRYPTION_KEY_STORAGE = '__app_encrypt_key__'

function generateEncryptionKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let key = ''
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

function getOrCreateEncryptionKey(): string {
  try {
    const existing = sessionStorage.getItem(ENCRYPTION_KEY_STORAGE)
    if (existing) return existing

    const newKey = generateEncryptionKey()
    sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, newKey)
    return newKey
  } catch (error) {
    logger.error(
      'Failed to manage encryption key',
      error instanceof Error ? error : new Error(String(error))
    )
    return generateEncryptionKey()
  }
}

export async function encryptAndStore(key: string, value: string): Promise<void> {
  try {
    const encryptionKey = getOrCreateEncryptionKey()
    const encrypted = await encrypt(value, encryptionKey)
    localStorage.setItem(key, JSON.stringify(encrypted))
  } catch (error) {
    logger.error('Failed to encrypt and store data', error as Error)
    localStorage.setItem(key, value)
  }
}

export async function retrieveAndDecrypt(key: string): Promise<string | null> {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    let data: EncryptedData
    try {
      data = JSON.parse(stored)
      if (!data.iv || !data.tag || !data.ciphertext || !data.salt) {
        return stored
      }
    } catch {
      return stored
    }

    const encryptionKey = getOrCreateEncryptionKey()
    return await decrypt(data, encryptionKey)
  } catch (error) {
    logger.error('Failed to retrieve and decrypt data', error as Error)
    const fallback = localStorage.getItem(key)
    return fallback
  }
}

export function clearEncryptionKey(): void {
  try {
    sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE)
  } catch {
    // Ignore
  }
}
