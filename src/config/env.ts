import type { StellarNetwork } from './stellar'

export type Environment = 'development' | 'staging' | 'production'

export interface EnvConfig {
  NODE_ENV: Environment
  APP_NAME: string
  APP_VERSION: string

  STELLAR_NETWORK: StellarNetwork
  STELLAR_RPC_URL: string
  STELLAR_HORIZON_URL: string
  STELLAR_PASSPHRASE: string

  NEBULA_CONTRACT_ID: string
  TOKEN_CONTRACT_ID: string

  API_BASE_URL: string
  API_TIMEOUT_MS: number

  ENABLE_DEV_TOOLS: boolean
  ENABLE_FPS_COUNTER: boolean

  // Monitoring and Logging
  SENTRY_DSN: string | null
  LOGROCKET_APP_ID: string | null
  ENABLE_MONITORING: boolean
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
  ANALYTICS_ENDPOINT: string | null
}

const REQUIRED_VARS = [
  'VITE_STELLAR_RPC_URL',
  'VITE_STELLAR_HORIZON_URL',
  'VITE_STELLAR_PASSPHRASE',
  'VITE_NEBULA_CONTRACT_ID',
  'VITE_TOKEN_CONTRACT_ID',
  'VITE_API_BASE_URL',
] as const

/**
 * Validate that required environment variables are present.
 * Throws if any are missing.
 */
function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !import.meta.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nSee .env.example for reference.`
    )
  }
}

/**
 * Read and validate all environment variables.
 * Returns a typed EnvConfig object.
 */
function getEnv(): EnvConfig {
  validateEnv()

  const nodeEnv = (import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE) as Environment

  return {
    NODE_ENV: nodeEnv,
    APP_NAME: import.meta.env.VITE_APP_NAME ?? 'Stellar Nebula',
    APP_VERSION: import.meta.env.VITE_APP_VERSION ?? '0.0.0',

    STELLAR_NETWORK: (import.meta.env.VITE_STELLAR_NETWORK ??
      'testnet') as EnvConfig['STELLAR_NETWORK'],
    STELLAR_RPC_URL: import.meta.env.VITE_STELLAR_RPC_URL,
    STELLAR_HORIZON_URL: import.meta.env.VITE_STELLAR_HORIZON_URL,
    STELLAR_PASSPHRASE: import.meta.env.VITE_STELLAR_PASSPHRASE,

    NEBULA_CONTRACT_ID: import.meta.env.VITE_NEBULA_CONTRACT_ID,
    TOKEN_CONTRACT_ID: import.meta.env.VITE_TOKEN_CONTRACT_ID,

    API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    API_TIMEOUT_MS: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10000),

    ENABLE_DEV_TOOLS: import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true',
    ENABLE_FPS_COUNTER: import.meta.env.VITE_ENABLE_FPS_COUNTER === 'true',

    // Monitoring and Logging
    SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN ?? null,
    LOGROCKET_APP_ID: import.meta.env.VITE_LOGROCKET_APP_ID ?? null,
    ENABLE_MONITORING: import.meta.env.VITE_ENABLE_MONITORING !== 'false',
    LOG_LEVEL: (import.meta.env.VITE_LOG_LEVEL ?? 'info') as EnvConfig['LOG_LEVEL'],
    ANALYTICS_ENDPOINT: import.meta.env.VITE_ANALYTICS_ENDPOINT ?? null,
  }
}

export const env = getEnv()

export const isDev = env.NODE_ENV === 'development'
export const isStaging = env.NODE_ENV === 'staging'
export const isProd = env.NODE_ENV === 'production'
