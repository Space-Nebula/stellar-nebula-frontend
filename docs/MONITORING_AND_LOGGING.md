# Monitoring and Logging Implementation Guide

## Overview

This document describes the comprehensive monitoring, logging, and analytics infrastructure for the Stellar Nebula frontend application. The implementation provides visibility into application runtime behavior, user interactions, performance metrics, and error conditions.

## Architecture

The monitoring and logging system consists of three main components:

### 1. **Structured Logging Service** (`src/services/logging.ts`)

A centralized logging framework with multiple severity levels:

- **Debug**: Detailed diagnostic information
- **Info**: General informational messages
- **Warn**: Warning messages for potentially problematic conditions
- **Error**: Error-level messages for failures and exceptions

#### Usage

```typescript
import { logger, createScopedLogger } from './services/logging'

// Direct logger usage
logger.info('Application started', { version: '1.0.0' })
logger.error('Failed to load data', error, { endpoint: '/api/data' })

// Scoped logger for organization (recommended)
const log = createScopedLogger('MyComponent')
log.info('Component mounted')
log.warn('Deprecated API used', { apiVersion: 'v1' })
```

#### Log Levels

Set the global log level at application startup in `src/main.tsx`:

```typescript
logger.setLogLevel('info') // Only show info, warn, and error logs
```

Log level can also be controlled via environment variable:

```bash
VITE_LOG_LEVEL=debug # Values: debug, info, warn, error
```

### 2. **Monitoring Service** (`src/services/monitoring.ts`)

Integrates multiple monitoring backends for comprehensive observability:

#### Sentry Integration

Sentry provides error tracking, performance monitoring, and session replays (with PII masking).

**Configuration via Environment Variables:**

```bash
VITE_SENTRY_DSN=https://<key>@sentry.io/<project>
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

**Features:**
- Automatic error tracking and exception reporting
- Performance monitoring with distributed tracing
- Session replays (masked for privacy)
- Breadcrumb tracking for user journeys
- Source map support for readable stack traces

#### LogRocket Integration

LogRocket provides advanced session replay with user interactions, console logs, and network activity.

**Setup Steps:**

1. Create a LogRocket account at https://logrocket.com
2. Create a new application and get your App ID
3. Add the LogRocket script to `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- LogRocket snippet should be the first script in head -->
    <script async src="https://cdn.logrocket.io/js/logrocket.js"></script>
    <title>Stellar Nebula</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

4. Set the environment variable:

```bash
VITE_LOGROCKET_APP_ID=your-app-id
```

**Features:**
- Session replay with user interactions
- Console log capture
- Network activity logging
- DOM change tracking
- Privacy-first by default (text masking, media blocking)
- Integration with Sentry for unified error tracking

#### Usage Examples

```typescript
import {
  setMonitoringUser,
  clearMonitoringUser,
  captureMonitoringEvent,
  addMonitoringBreadcrumb,
} from './services/monitoring'

// Set user context after authentication
setMonitoringUser(userPublicKey, email, username)

// Add custom events
captureMonitoringEvent('payment_initiated', {
  amount: 100,
  currency: 'XLM',
})

// Add breadcrumbs for debugging
addMonitoringBreadcrumb('User clicked upgrade button', 'user-action', {
  shipId: '123',
})

// Clear user context on logout
clearMonitoringUser()
```

### 3. **Analytics Service** (`src/services/analytics.ts`)

Tracks user behavior and application events. The `AnalyticsTracker` class manages event collection and batched transmission.

#### Event Types

Pre-defined event types ensure consistent naming:

- `scan_started` - User initiated a scan
- `scan_completed` - Scan operation finished
- `upgrade_started` - User started upgrade process
- `upgrade_confirmed` - Upgrade transaction confirmed
- `upgrade_failed` - Upgrade transaction failed
- `error_reported` - Error event recorded
- `performance_metric` - Performance data collected

#### Configuration

```typescript
import { analytics } from './services/analytics'

// Configure analytics endpoint and batch settings
analytics.configure({
  enabled: true,
  endpoint: 'https://your-analytics-server.com/events',
  batchSize: 10,
  flushIntervalMs: 15000, // Flush every 15 seconds or when batch is full
})

// Track events
analytics.track('scan_started', {
  scanType: 'full',
  duration: 1000,
})

// Opt-in/out handling
analytics.setOptOut(false) // User opts in to analytics
```

#### PII Protection

The analytics service automatically sanitizes payloads to remove PII:

- Drops any keys matching: address, account, email, handle, name, publickey, secret, token, wallet
- Only allows string, number, boolean values
- Example:

```typescript
// This will have 'publicKey' and 'email' removed
analytics.track('user_action', {
  publicKey: '...',      // ❌ DROPPED (PII)
  email: 'user@...',     // ❌ DROPPED (PII)
  actionType: 'upgrade', // ✅ KEPT
  duration: 1000,        // ✅ KEPT
})
```

## Environment Configuration

### Required Variables for Production

```bash
# Sentry Configuration (Error Tracking)
VITE_SENTRY_DSN=https://<key>@sentry.io/<project>

# LogRocket Configuration (Session Replay)
VITE_LOGROCKET_APP_ID=your-logrocket-app-id

# Analytics Configuration
VITE_ANALYTICS_ENDPOINT=https://your-analytics-backend.com/events

# General Monitoring
VITE_ENABLE_MONITORING=true
VITE_LOG_LEVEL=info
```

### Optional Variables

```bash
# Application Info (for monitoring context)
VITE_APP_NAME=Stellar Nebula
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

### Environment-Specific Recommendations

#### Development

```bash
VITE_ENABLE_MONITORING=true        # Keep enabled to catch issues early
VITE_LOG_LEVEL=debug               # Verbose logging
VITE_SENTRY_DSN=                   # Optional (can use local Sentry)
VITE_LOGROCKET_APP_ID=             # Usually disabled in dev
VITE_ANALYTICS_ENDPOINT=           # Usually disabled in dev
```

#### Staging

```bash
VITE_ENABLE_MONITORING=true
VITE_LOG_LEVEL=info
VITE_SENTRY_DSN=<your-staging-dsn>
VITE_LOGROCKET_APP_ID=<staging-id>
VITE_ANALYTICS_ENDPOINT=<staging-endpoint>
```

#### Production

```bash
VITE_ENABLE_MONITORING=true
VITE_LOG_LEVEL=warn                # Only warnings and errors in prod
VITE_SENTRY_DSN=<your-prod-dsn>
VITE_LOGROCKET_APP_ID=<prod-id>
VITE_ANALYTICS_ENDPOINT=<prod-endpoint>
```

## Dashboard Setup

### Sentry Dashboard

1. **Access**: https://sentry.io/organizations/your-org/issues/
2. **Key Metrics**:
   - Error rate and frequency
   - Affected users
   - Performance metrics (page load time, transaction performance)
   - Session replays linked to errors
3. **Alerts**: Configure alerts for:
   - Error rate threshold exceeded
   - New errors introduced
   - Performance degradation

### LogRocket Dashboard

1. **Access**: https://app.logrocket.com
2. **Key Features**:
   - Session replay browser with timeline
   - User journey analysis
   - Crash analytics
   - Performance insights
3. **Usage**:
   - Search sessions by user ID
   - Replay specific user actions
   - Correlate errors with session replays

### Custom Analytics Dashboard

Implement a custom dashboard to display:

- User engagement metrics (sessions, page views)
- Feature adoption (scan completion rate)
- Conversion funnels (upgrade attempts vs. completions)
- Error trends

**Expected Analytics Endpoint Format:**

```json
{
  "events": [
    {
      "id": "event-uuid",
      "name": "scan_started",
      "payload": {
        "scanType": "full",
        "version": "1.0.0"
      },
      "timestamp": "2024-05-29T10:30:00.000Z"
    }
  ]
}
```

## Instrumented Events and Flows

### Application Startup

```
main.tsx
├─ Log level initialized
├─ App version and environment logged
├─ Monitoring services initialized
│  ├─ Sentry initialized
│  └─ LogRocket initialized
└─ App mounted and ready
```

**Log Output:**
```
[2024-05-29T10:30:00Z] INFO Application starting {environment: "production", version: "1.0.0", appName: "Stellar Nebula"}
[2024-05-29T10:30:00Z] INFO Sentry initialized {environment: "production", release: "1.0.0"}
[2024-05-29T10:30:00Z] INFO LogRocket initialized successfully
[2024-05-29T10:30:00Z] INFO Monitoring and logging initialized
```

### Page Navigation

```
src/routes/index.tsx (RouteChangeTracker)
├─ Route change detected
├─ Page view logged
├─ Breadcrumb added to monitoring
└─ Analytics event tracked
```

**Example:**
```
[2024-05-29T10:30:10Z] INFO [Routes] Page view: /dashboard
              Breadcrumb: Navigation: /dashboard (page-view)
              Analytics: scan_started { page: "/dashboard" }
```

### API Request/Response

```
src/services/api.ts
├─ Request initiated (DEBUG)
├─ Request completed (DEBUG or WARN)
│  ├─ Success: Log status 200
│  ├─ Error: Log status and error
│  └─ Timeout: Log 408 timeout
├─ Breadcrumb added
└─ Request duration captured
```

**Examples:**
```
[2024-05-29T10:30:15Z] DEBUG [API] GET /api/ships
[2024-05-29T10:30:15Z] DEBUG [API] GET /api/ships 200 {duration: 145}

[2024-05-29T10:30:20Z] WARN [API] POST /api/transactions 409 {duration: 200}

[2024-05-29T10:30:25Z] WARN [API] DELETE /api/resources timeout {duration: 10000, timeout: 10000}
```

### Error Tracking

```
ErrorBoundary / Sentry.ErrorBoundary
├─ Error caught
├─ Error logged with context
├─ Sentry captures exception
├─ Breadcrumb trail added
└─ User sees fallback UI
```

**Error Logging:**
```
[2024-05-29T10:31:00Z] ERROR [App] Failed to load resources
  Error: NetworkError: Failed to fetch
  Stack: at fetchResources (resources.ts:45)
         at useResources (useResources.ts:20)
```

## Performance Monitoring

The system captures performance metrics at key points:

1. **Page Load Time**: Sentry captures with `browserTracingIntegration()`
2. **API Request Duration**: Captured and logged with every API call
3. **Route Transition**: Tracked via breadcrumbs
4. **Custom Performance Marks**: Add via `performance.mark()` and captured in Sentry

### Adding Custom Performance Monitoring

```typescript
import { performance } from './monitoring'

const startTime = performance.now()
// ... perform operation
const duration = performance.now() - startTime

addMonitoringBreadcrumb(`Operation completed`, 'performance', {
  duration,
  operation: 'complexCalculation',
})
```

## Best Practices

### 1. Logging

✅ **DO:**
- Use scoped loggers for organization: `createScopedLogger('ComponentName')`
- Include relevant context: `log.info('Action completed', { userId, duration })`
- Use appropriate levels: info for normal flow, warn for recoverable issues, error for failures
- Sanitize sensitive data before logging

❌ **DON'T:**
- Log PII (personal identifiable information)
- Use console.log directly; use the logger service
- Spam debug logs in production (use environment-based log levels)
- Log entire objects if not needed; extract relevant fields

### 2. Error Handling

✅ **DO:**
- Capture errors with context: `captureError(error, { userId, action })`
- Set user context after authentication: `setMonitoringUser(userId)`
- Add breadcrumbs for user journey: `addMonitoringBreadcrumb(description, category)`

❌ **DON'T:**
- Ignore errors silently
- Capture same error multiple times
- Log errors before Sentry is initialized

### 3. Analytics

✅ **DO:**
- Track user actions that matter: page views, feature usage, conversion events
- Use predefined event types for consistency
- Let the service handle PII sanitization
- Wait for user consent before tracking (implement consent UI)

❌ **DON'T:**
- Track every click (be selective)
- Include PII in event payloads
- Make analytics calls blocking (they're async)
- Track during development (use environment check)

### 4. Performance

✅ **DO:**
- Monitor API request durations (already instrumented)
- Track critical user flows
- Use Sentry's transaction sampling to avoid overhead
- Monitor bundle size impact

❌ **DON'T:**
- Capture all transactions (use sampling rates)
- Send large payloads with events
- Initialize monitoring synchronously if it blocks rendering

## Disabling Monitoring

For local development or testing, disable monitoring:

```bash
# Disable all monitoring
VITE_ENABLE_MONITORING=false

# Or disable specific backends
VITE_SENTRY_DSN=         # Sentry disabled
VITE_LOGROCKET_APP_ID=   # LogRocket disabled
VITE_ANALYTICS_ENDPOINT= # Analytics disabled
```

## Troubleshooting

### Sentry Not Capturing Errors

1. Check DSN is set: `echo $VITE_SENTRY_DSN`
2. Verify environment is not filtered in Sentry settings
3. Check browser console for Sentry initialization errors
4. Ensure error happens after Sentry initialization

### LogRocket Session Not Showing

1. Verify App ID is correct: `echo $VITE_LOGROCKET_APP_ID`
2. Check LogRocket script loaded in HTML (should appear in Network tab)
3. LogRocket may not initialize if third-party cookies are disabled
4. For local development, use incognito/private mode

### Analytics Events Not Arriving

1. Check endpoint URL: `echo $VITE_ANALYTICS_ENDPOINT`
2. Verify CORS configuration on backend
3. Check browser console Network tab for failed requests
4. Verify events are enabled: `analytics.isEnabled()`

### High Log Volume in Development

Reduce log verbosity:
```bash
VITE_LOG_LEVEL=warn  # Only show warnings and errors
```

## Future Enhancements

1. **Session Recording**: Extend LogRocket to capture more types of user interactions
2. **Custom Dashboards**: Build React-based dashboards for real-time metrics
3. **Alert Automation**: Set up automated alerts for error thresholds
4. **A/B Testing Integration**: Track feature flags and experiment results
5. **Performance Budgets**: Automated alerts when metrics exceed thresholds
6. **User Cohort Analysis**: Segment users by behavior and characteristics
7. **Funnel Analysis**: Track conversion rates through key user journeys

## Related Documentation

- [Sentry Documentation](https://docs.sentry.io/)
- [LogRocket Documentation](https://docs.logrocket.com/)
- [Error Tracking Implementation](./docs/error-tracking.md)
- [Performance Testing](./docs/performance-testing.md)
