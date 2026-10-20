# Production Performance Monitoring & Web Vitals

This document details the Real User Monitoring (RUM) architecture, Core Web Vitals telemetry, Sentry dashboard configurations, and regression alerting implemented for the Stellar Nebula application (#365).

## Overview

The application utilizes native browser `PerformanceObserver` APIs to track Core Web Vitals and performance benchmarks in production. Metrics are captured automatically on page load and user interaction, categorized into standard health ratings, and streamed directly to Sentry and LogRocket.

## Tracked Metrics & Google Thresholds

| Metric | Full Name | Good | Needs Improvement | Poor | Reporting Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FCP** | First Contentful Paint | $\le 1800\text{ms}$ | $1801 - 3000\text{ms}$ | $> 3000\text{ms}$ | After first DOM paint |
| **LCP** | Largest Contentful Paint | $\le 2500\text{ms}$ | $2501 - 4000\text{ms}$ | $> 4000\text{ms}$ | On largest element render |
| **CLS** | Cumulative Layout Shift | $\le 0.1$ | $0.11 - 0.25$ | $> 0.25$ | Layout shift events (unprompted) |
| **FID** | First Input Delay | $\le 100\text{ms}$ | $101 - 300\text{ms}$ | $> 300\text{ms}$ | First user input interaction |
| **TTFB** | Time to First Byte | $\le 800\text{ms}$ | $801 - 1800\text{ms}$ | $> 1800\text{ms}$ | Navigation timing response start |

## Implementation Details

### 1. `trackWebVital` Service (`src/services/monitoring.ts`)
- Dispatches metrics to Sentry via `Sentry.setMeasurement(metric.name, value, unit)`.
- Tags transactions with `vital.<metric_name>` for filtering in Sentry Performance dashboards.
- Adds structured breadcrumbs to user session context.
- Dispatches performance alerts if any metric violates the "poor" threshold.

### 2. `useWebVitals` & `initWebVitalsMonitoring` (`src/hooks/useWebVitals.ts`)
- **Imperative Initialization**: `initWebVitalsMonitoring()` attaches non-blocking `PerformanceObserver` listeners during application startup in `src/main.tsx`.
- **React Hook**: `useWebVitals()` provides reactive access to live Web Vitals inside diagnostic and debug overlays.

### 3. Application Bootstrap (`src/main.tsx`)
Web Vitals monitoring is initialized before application render, ensuring immediate capture of navigation timing (TTFB) and early paints (FCP).

## Privacy Controls (LogRocket & Sentry) (#486)

Session replay and error tracking must not capture wallet addresses, secret keys or transaction
amounts. The redaction helpers live in `src/utils/sanitization.ts`, and `src/services/monitoring.ts`
applies them at every point where data leaves the app.

| Setting | Location | Effect |
| :--- | :--- | :--- |
| `shouldCaptureIP: false` | LogRocket `init` | IP addresses are not stored with sessions |
| `dom.textSanitizer: true`, `dom.inputSanitizer: true` | LogRocket `init` | Rendered text and form inputs are masked in replays |
| `requestSanitizer` | LogRocket `init` | Strips `Authorization`, `X-API-Key` and `Cookie` headers. Redacts public keys in URLs and bodies. |
| `responseSanitizer` | LogRocket `init` | Drops response bodies from Stellar hosts (`*.stellar.org`) |
| `beforeBreadcrumb` | Sentry `init` | Sanitizes every breadcrumb before it is stored |
| `beforeSend` | Sentry `init` | Sanitizes `extra`, `contexts` and the request URL |
| Shortened user ID | `setMonitoringUser()` | Sends `GABCD…WXYZ` to Sentry and LogRocket instead of the full public key |

Redaction rules:

- Stellar public keys (`G` + 55 base32 characters) are shortened to `GABCD…WXYZ`.
- Stellar secret seeds (`S` + 55 base32 characters) are replaced with `[REDACTED]`.
- Values under keys such as `token`, `password`, `secret`, `authorization` and `cookie` are replaced with `[REDACTED]`.
- Numbers and strings under keys such as `amount`, `balance`, `price`, `fee` and `cost` are replaced with `[AMOUNT]`.

When you add a new `captureMonitoringEvent` or `addMonitoringBreadcrumb` call, pass data through
these helpers rather than sending raw values. See [PRIVACY.md](./PRIVACY.md) for the policy and the open
GDPR items.

## Sentry DSN Exposure (#484)

The Sentry DSN (`VITE_SENTRY_DSN`) is **public by design**. Vite embeds it in the client bundle,
and the browser sends events to it directly. That is how Sentry browser SDKs work, so it is not a
secret. The DSN only allows sending events to this project. It does not allow reading events,
changing settings, or accessing the Sentry account. Never put a Sentry auth token in a `VITE_*`
variable, because those values ship to every visitor.

Because the DSN is public, the protection comes from Sentry project settings and from scrubbing
data in the app before it is sent.

### Code controls

- `sendDefaultPii: false` in `Sentry.init` (`src/services/monitoring.ts`). The SDK does not attach
  IP addresses, cookies or user identifiers by default.
- `beforeBreadcrumb` and `beforeSend` redact wallet addresses, secrets and amounts (see the table above).
- `replayIntegration` masks all text and media.

### Sentry project settings to confirm

These settings live in the Sentry UI, not in the repository. Confirm them for the production project
and record the date in the release checklist.

- **Rate limiting:** Project Settings → Client Keys (DSN) → the key's rate limit. Set a per-minute
  limit so a loop or a hostile page cannot flood the project. Turn on spike protection.
- **Allowed domains:** Client Keys → the key's allowed domains. Limit it to the production and
  preview hostnames so the DSN does not accept events from unrelated sites.
- **Data scrubbing:** Project Settings → Security & Privacy. Turn on the default data scrubber and
  add sensitive field names such as `secret`, `seed`, `token` and `password`.
- **IP storage:** Project Settings → Security & Privacy → disable storing IP addresses.

### Verifying the setup

1. Set `VITE_SENTRY_DSN` to a test project and load the app.
2. Confirm that an error event arrives without an IP address or user identifier.
3. Trigger a test error that includes a fake secret seed, and confirm the seed is redacted in Sentry.

## Performance Dashboards & Regressions

### Sentry Performance Dashboard Configuration
1. **Navigate to**: Sentry -> Performance -> Web Vitals.
2. **Key Widgets**:
   - 75th percentile (p75) LCP by route (`/`, `/nebula`, `/ship`, `/marketplace`).
   - Average CLS by device category (mobile vs desktop).
   - TTFB distribution by geographic region and CDN edge.
   - Poor FCP occurrences correlated with release version tags.

### Regression Alert Rules
Alert rules are configured to trigger team notifications via Slack/PagerDuty:
- **Condition**: P75 LCP exceeds 2500ms over a 15-minute sliding window.
- **Condition**: P75 CLS exceeds 0.1 over a 15-minute sliding window.
- **Condition**: Any incoming `[Performance Alert] Poor <Metric>` event rate surges > 5% of total sessions.
