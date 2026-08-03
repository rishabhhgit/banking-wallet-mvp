import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { logger } from './logger'

const SENTRY_DSN = process.env.SENTRY_DSN
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development'

let isSentryInitialized = false

export const initSentry = () => {
  if (!SENTRY_DSN) {
    logger.warn('SENTRY_DSN not configured - error tracking disabled (errors will be logged locally)')
    return
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1.0,
      profilesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.data) {
          const data = event.request.data as Record<string, any>
          delete data.password
          delete data.token
          delete data.refreshToken
        }
        return event
      },
    })

    isSentryInitialized = true
    logger.info(`Sentry initialized (environment=${SENTRY_ENVIRONMENT})`)
  } catch (error) {
    logger.error('Failed to initialize Sentry - error tracking disabled')
    isSentryInitialized = false
  }
}

export const captureException = (error: Error, context?: Record<string, any>) => {
  if (isSentryInitialized) {
    try {
      Sentry.withScope((scope) => {
        if (context) {
          // Filter sensitive data from context
          const filteredContext = { ...context }
          delete filteredContext.password
          delete filteredContext.token
          delete filteredContext.refreshToken
          
          Object.entries(filteredContext).forEach(([key, value]) => {
            scope.setExtra(key, value)
          })
        }
        Sentry.captureException(error)
      })
    } catch (sentryError) {
      // Fallback to local logging if Sentry fails
      logger.error({ err: error, context }, 'Sentry capture failed, logged locally')
    }
  } else {
    // Log locally when Sentry is not available
    logger.error({ err: error, context }, 'Error (Sentry not available)')
  }
}

export const captureMessage = (message: string, level: 'error' | 'warning' | 'info' | 'debug' = 'info') => {
  if (isSentryInitialized) {
    try {
      Sentry.captureMessage(message, level)
    } catch (error) {
      logger.warn(`Sentry captureMessage failed: ${message}`)
    }
  } else {
    if (level === 'error') logger.error(`[LOCAL] ${message}`)
    else if (level === 'warning') logger.warn(`[LOCAL] ${message}`)
    else if (level === 'debug') logger.debug(`[LOCAL] ${message}`)
    else logger.info(`[LOCAL] ${message}`)
  }
}

export const setUser = (user: { id: string; email?: string }) => {
  if (isSentryInitialized) {
    try {
      Sentry.setUser(user)
    } catch (error) {
      // Silently fail - don't break the app for Sentry user tracking
    }
  }
}

export const addBreadcrumb = (message: string, data?: Record<string, any>) => {
  if (isSentryInitialized) {
    try {
      Sentry.addBreadcrumb({
        message,
        data,
        level: 'info',
      })
    } catch (error) {
      // Silently fail - breadcrumbs are nice-to-have
    }
  }
}

export const flushSentry = async (timeoutMs = 2000): Promise<void> => {
  if (isSentryInitialized) {
    try {
      await Sentry.flush(timeoutMs)
    } catch (error) {
      logger.warn('Sentry flush failed')
    }
  }
}
