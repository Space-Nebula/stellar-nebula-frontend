import { env } from '../config'
import { createScopedLogger } from './logging'
import { addMonitoringBreadcrumb } from './monitoring'

const log = createScopedLogger('API')

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  status: number
}

export interface ApiError {
  message: string
  status: number
  code?: string
}

export interface ApiRequestConfig extends RequestInit {
  url: string
  retries?: number
}

type RequestInterceptor = (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>

type ResponseInterceptor = (response: Response) => Response | Promise<Response>

const requestInterceptors: RequestInterceptor[] = []
const responseInterceptors: ResponseInterceptor[] = []

/**
 * Register a request interceptor that runs before every outgoing API call.
 * Returns a cleanup function to remove the interceptor.
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
  requestInterceptors.push(interceptor)
  return () => {
    const index = requestInterceptors.indexOf(interceptor)
    if (index >= 0) {
      requestInterceptors.splice(index, 1)
    }
  }
}

/**
 * Register a response interceptor that runs on every incoming API response.
 * Returns a cleanup function to remove the interceptor.
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
  responseInterceptors.push(interceptor)
  return () => {
    const index = responseInterceptors.indexOf(interceptor)
    if (index >= 0) {
      responseInterceptors.splice(index, 1)
    }
  }
}

function buildUrl(path: string): string {
  const base = env.API_BASE_URL.replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')
  return `${base}/${cleanPath}`
}

async function executeFetch(
  url: string,
  config: ApiRequestConfig,
  retries: number,
  signal: AbortSignal
): Promise<Response> {
  let lastError: Error | null = null
  let delay = 1000

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2
    }

    try {
      const response = await fetch(url, { ...config, signal })
      return response
    } catch (error) {
      if (signal.aborted) throw error
      lastError = error instanceof Error ? error : new Error('Network request failed')
    }
  }

  throw lastError ?? new Error('Request failed after retries')
}

/**
 * Base request handler with retry logic, timeout, and interceptor support.
 *
 * @param path   - API endpoint path (e.g. "/users")
 * @param options- Fetch options (method, headers, body)
 * @param retries- Number of retry attempts on failure (default 2)
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  retries = 2
): Promise<ApiResponse<T>> {
  let config: ApiRequestConfig = { ...options, url: path, retries }
  const method = options.method || 'GET'
  const startTime = performance.now()

  log.debug(`${method} ${path}`)

  for (const interceptor of requestInterceptors) {
    const result = interceptor(config)
    config = result instanceof Promise ? await result : result
  }

  const finalUrl = config.url

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT_MS)

  try {
    let response = await executeFetch(buildUrl(finalUrl), config, retries, controller.signal)

    for (const interceptor of responseInterceptors) {
      response = await interceptor(response)
    }

    let data: T | null = null
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = (await response.json()) as T
    }

    const duration = Math.round(performance.now() - startTime)

    if (!response.ok) {
      log.warn(`${method} ${path} ${response.status}`, { duration })
      addMonitoringBreadcrumb(`API Error: ${method} ${path}`, 'api-error', {
        status: response.status,
        duration,
      })
      return {
        data: null,
        error: {
          message:
            (data as Record<string, string> | null)?.message ??
            `Request failed with status ${response.status}`,
          status: response.status,
          code: String(response.status),
        },
        status: response.status,
      }
    }

    log.debug(`${method} ${path} ${response.status}`, { duration })
    addMonitoringBreadcrumb(`API Success: ${method} ${path}`, 'api-success', {
      status: response.status,
      duration,
    })

    return { data, error: null, status: response.status }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    if (error instanceof DOMException && error.name === 'AbortError') {
      log.warn(`${method} ${path} timeout`, { duration, timeout: env.API_TIMEOUT_MS })
      addMonitoringBreadcrumb(`API Timeout: ${method} ${path}`, 'api-error', {
        duration,
        timeout: env.API_TIMEOUT_MS,
      })
      return {
        data: null,
        error: { message: 'Request timed out', status: 408, code: 'TIMEOUT' },
        status: 408,
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Network error'
    log.error(`${method} ${path} network error`, error instanceof Error ? error : new Error(errorMessage), {
      duration,
    })
    addMonitoringBreadcrumb(`API Network Error: ${method} ${path}`, 'api-error', {
      duration,
      error: errorMessage,
    })

    return {
      data: null,
      error: {
        message: errorMessage,
        status: 0,
        code: 'NETWORK_ERROR',
      },
      status: 0,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Perform an HTTP GET request.
 *
 * @example
 * const { data, error } = await get<User[]>('/users')
 */
export function get<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  return request<T>(path, { ...options, method: 'GET' })
}

/**
 * Perform an HTTP POST request with a JSON body.
 *
 * @example
 * const { data } = await post<User>('/users', { name: 'Alice' })
 */
export function post<T>(
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return request<T>(path, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers } as HeadersInit,
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

/**
 * Perform an HTTP PUT request with a JSON body.
 *
 * @example
 * const { data } = await put<User>('/users/1', { name: 'Bob' })
 */
export function put<T>(
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  return request<T>(path, {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...options?.headers } as HeadersInit,
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

/**
 * Perform an HTTP DELETE request.
 *
 * @example
 * const { error } = await del('/users/1')
 */
export function del<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  return request<T>(path, { ...options, method: 'DELETE' })
}
