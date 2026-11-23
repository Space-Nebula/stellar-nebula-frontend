const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12
const TAG_LENGTH = 128

export interface EncryptedData {
  iv: string
  tag: string
  ciphertext: string
  salt: string
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH
  )

  return window.crypto.subtle.importKey('raw', derivedBits, ALGORITHM, false, ['encrypt', 'decrypt'])
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
}

function base64ToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedData> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    data
  )

  const encryptedArray = new Uint8Array(encrypted)
  const tagStart = encryptedArray.length - TAG_LENGTH / 8
  const ciphertext = encryptedArray.slice(0, tagStart)
  const tag = encryptedArray.slice(tagStart)

  return {
    iv: uint8ArrayToBase64(iv),
    tag: uint8ArrayToBase64(tag),
    ciphertext: uint8ArrayToBase64(ciphertext),
    salt: uint8ArrayToBase64(salt),
  }
}

export async function decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
  const salt = base64ToUint8Array(encryptedData.salt)
  const iv = base64ToUint8Array(encryptedData.iv)
  const tag = base64ToUint8Array(encryptedData.tag)
  const ciphertext = base64ToUint8Array(encryptedData.ciphertext)

  const key = await deriveKey(password, salt)
  const encrypted = new Uint8Array([...ciphertext, ...tag])

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encrypted
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}
