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
| `sendDefaultPii: false` | Sentry `init` | No IP addresses, cookies or user identity are attached by default (#484) |
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

`VITE_SENTRY_DSN` is compiled into the client bundle. This is expected: a Sentry DSN is a public ingest key. It lets a browser send events to one project and does not grant read access to issues, releases or project settings. Anyone can already see it in the page source, so hiding it does not protect the project.

Protection therefore comes from Sentry-side settings and from scrubbing data before it leaves the app:

| Control | Where | Status |
| :--- | :--- | :--- |
| Public DSN, no secret tokens in `VITE_*` variables | `.env.example`, `.env.production` | Documented |
| Client-side PII off (`sendDefaultPii: false`) | `src/services/monitoring.ts` | Enforced in code |
| Wallet addresses, secrets and amounts redacted | `beforeBreadcrumb`, `beforeSend` | Enforced in code (#486) |
| Noise filtering (`ResizeObserver`, network errors) | `beforeSend` | Enforced in code |
| Rate limiting of accepted events per project | Sentry → Project Settings → Client Keys (DSN) → Rate Limits | Dashboard setting. Must be configured in Sentry; not enforced by this repo |
| Inbound data filters (browser extensions, legacy browsers) | Sentry → Project Settings → Inbound Filters | Dashboard setting. Recommended: enable the defaults |
| Allowed domains for the DSN | Sentry → Project Settings → Client Keys (DSN) → Allowed Domains | Dashboard setting. Recommended: restrict to the production and staging hosts |

Rules for contributors:

- Never add a token, auth key or private credential as a `VITE_*` variable. Anything prefixed `VITE_` is public.
- The Sentry auth token used to upload source maps is a CI secret and must never reach the client bundle.
- If the DSN is ever rotated or leaked, the impact is limited to spam events. Rotate it in Sentry and update the CI secret; no code change is needed.

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
