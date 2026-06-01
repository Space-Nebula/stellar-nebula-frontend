/**
 * Structured Logging Service
 *
 * Provides structured logging with multiple levels and context support.
 * Logs are formatted consistently and can be extended to support various backends.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: string | number | boolean | null | undefined
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Centralized logger instance.
 * All logging should go through this singleton to ensure consistent formatting
 * and centralized control over log levels.
 */
class Logger {
  private minLevel: LogLevel = 'info'
  private isDev: boolean = import.meta.env.DEV

  constructor(minLevel?: LogLevel) {
    if (minLevel) {
      this.minLevel = minLevel
    }
  }

  setLogLevel(level: LogLevel): void {
    this.minLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.minLevel]
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp
    const level = entry.level.toUpperCase().padEnd(5)
    const message = entry.message

    let contextStr = ''
    if (entry.context && Object.keys(entry.context).length > 0) {
      contextStr = ` ${JSON.stringify(entry.context)}`
    }

    let errorStr = ''
    if (entry.error) {
      errorStr = `\n  Error: ${entry.error.name}: ${entry.error.message}`
      if (entry.error.stack) {
        errorStr += `\n  Stack: ${entry.error.stack}`
      }
    }

    return `[${timestamp}] ${level} ${message}${contextStr}${errorStr}`
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: this.isDev ? error.stack : undefined,
          }
        : undefined,
    }
  }

  private outputLog(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry)

    // Use appropriate console method based on level
    switch (entry.level) {
      case 'error':
        console.error(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'debug':
        console.debug(formatted)
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return
    const entry = this.createLogEntry('debug', message, context)
    this.outputLog(entry)
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return
    const entry = this.createLogEntry('info', message, context)
    this.outputLog(entry)
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog('warn')) return
    const entry = this.createLogEntry('warn', message, context, error)
    this.outputLog(entry)
  }

  error(message: string, error: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return
    const entry = this.createLogEntry('error', message, context, error)
    this.outputLog(entry)
  }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Create a scoped logger with a specific namespace/component name.
 * This helps organize logs by area of the application.
 */
export function createScopedLogger(namespace: string) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(`[${namespace}] ${message}`, context),
    info: (message: string, context?: LogContext) =>
      logger.info(`[${namespace}] ${message}`, context),
    warn: (message: string, context?: LogContext, error?: Error) =>
      logger.warn(`[${namespace}] ${message}`, context, error),
    error: (message: string, error: Error, context?: LogContext) =>
      logger.error(`[${namespace}] ${message}`, error, context),
  }
}
