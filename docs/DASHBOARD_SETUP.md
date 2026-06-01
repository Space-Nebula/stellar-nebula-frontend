# Dashboard Setup Guide

This document provides step-by-step instructions for setting up monitoring dashboards for the Stellar Nebula frontend application.

## Overview

The application uses multiple monitoring services that each provide their own dashboards:

1. **Sentry** - Error tracking, performance monitoring, and session replays
2. **LogRocket** - Advanced session replay and user analytics
3. **Custom Analytics** - Optional custom analytics backend

## Sentry Dashboard Setup

### 1. Create a Sentry Account

1. Visit [https://sentry.io](https://sentry.io)
2. Sign up for a free account or log in
3. Create a new organization (or use existing)

### 2. Create a Project

1. Click "Projects" in the left sidebar
2. Click "Create Project"
3. Select platform: **React**
4. Set alert frequency: **On every new issue** (recommended for production)
5. Name your project: `stellar-nebula-frontend`
6. Click "Create Project"

### 3. Get Your DSN

After creating the project, Sentry will display your DSN (Data Source Name). It looks like:

```
https://examplePublicKey@oXXXXX.ingest.us.sentry.io/XXXXX
```

Copy this DSN and add it to your environment variables:

```bash
# .env.production
VITE_SENTRY_DSN=https://your-actual-dsn-here
```

### 4. Configure Sentry Dashboard

#### Error Tracking Dashboard

1. Navigate to **Issues** in the left sidebar
2. Configure filters:
   - Environment: `production` or `staging`
   - Time range: Last 24 hours (or custom)
3. Pin important searches for quick access

**Recommended Saved Searches:**
- High-priority errors: `is:unresolved priority:high`
- New errors: `is:unresolved age:-24h`
- Frequent errors: `is:unresolved times_seen:>100`

#### Performance Dashboard

1. Navigate to **Performance** in the left sidebar
2. View key metrics:
   - **Apdex Score** - Application performance index
   - **Throughput** - Requests per minute
   - **P50/P75/P95 Duration** - Response time percentiles
   - **Failure Rate** - Percentage of failed transactions

3. Create custom queries:
   - Click "Create Query"
   - Filter by transaction name (e.g., page routes)
   - Set thresholds for alerts

**Key Transactions to Monitor:**
- `/` - Home page load time
- `/nebula` - 3D canvas initialization
- `/dashboard` - Dashboard load time
- `/marketplace` - Marketplace load time
- API calls (automatically tracked)

#### Session Replay Dashboard

1. Navigate to **Replays** in the left sidebar
2. Filter replays by:
   - Errors: `error.type:*` - Sessions with errors
   - Duration: `duration:>60s` - Long sessions
   - User: `user.id:specific-user` - Specific user sessions

3. Watch replays to understand user behavior and debug issues

### 5. Set Up Alerts

1. Navigate to **Alerts** in the left sidebar
2. Click "Create Alert"

**Recommended Alerts:**

#### High Error Rate Alert
- **Alert Type**: Issues
- **Condition**: When the issue is first seen
- **Filter**: `level:error`
- **Action**: Send notification to Slack/Email

#### Performance Degradation Alert
- **Alert Type**: Metric
- **Condition**: When transaction duration exceeds threshold
- **Threshold**: P95 > 3000ms
- **Action**: Send notification to team

#### New Release Issues Alert
- **Alert Type**: Issues
- **Condition**: When new issues appear in a release
- **Action**: Send notification to release manager

### 6. Source Maps Configuration

For readable stack traces in production, configure source maps:

1. Install Sentry Vite plugin (already installed in package.json)
2. The plugin is configured in `vite.config.ts` (if not, add it)
3. Source maps are automatically uploaded during build

## LogRocket Dashboard Setup

### 1. Create a LogRocket Account

1. Visit [https://logrocket.com](https://logrocket.com)
2. Sign up for a free trial or log in
3. Create a new application

### 2. Get Your App ID

1. After creating the application, LogRocket will display your App ID
2. It looks like: `your-org/your-app`

Add it to your environment variables:

```bash
# .env.production
VITE_LOGROCKET_APP_ID=your-org/your-app
```

### 3. Configure LogRocket Dashboard

#### Session Browser

1. Navigate to **Sessions** in the left sidebar
2. Use filters to find specific sessions:
   - **User ID**: Filter by wallet public key
   - **Errors**: Sessions with JavaScript errors
   - **Rage Clicks**: Users clicking repeatedly (frustration indicator)
   - **Dead Clicks**: Clicks that don't trigger actions
   - **Custom Events**: Filter by tracked events

**Useful Filters:**
- `hasError:true` - Sessions with errors
- `duration:>300` - Sessions longer than 5 minutes
- `page:/nebula` - Sessions that visited the nebula page

#### Performance Insights

1. Navigate to **Performance** in the left sidebar
2. View metrics:
   - **Page Load Time** - Time to interactive
   - **Network Requests** - API call performance
   - **CPU Usage** - Client-side performance
   - **Memory Usage** - Memory leaks detection

#### Funnel Analysis

1. Navigate to **Funnels** in the left sidebar
2. Create a funnel to track user conversion:

**Example Funnel: Wallet Connection to Transaction**
1. Step 1: Page view `/`
2. Step 2: Wallet connected
3. Step 3: Page view `/nebula`
4. Step 4: Transaction signed
5. Step 5: Transaction confirmed

This helps identify where users drop off in the flow.

#### Error Tracking

1. Navigate to **Errors** in the left sidebar
2. View JavaScript errors with:
   - Error message and stack trace
   - Session replay showing what led to the error
   - Network activity at the time of error
   - Console logs

### 4. Integrate with Sentry

LogRocket automatically integrates with Sentry (configured in `src/services/monitoring.ts`):

1. When an error occurs in Sentry, it includes a LogRocket session URL
2. Click the LogRocket link in Sentry to watch the session replay
3. This provides full context for debugging

## Custom Analytics Dashboard (Optional)

If you're using a custom analytics backend, set up your dashboard based on the events tracked:

### Tracked Events

The application tracks the following events (see `src/services/analytics.ts`):

1. **scan_started** - User initiated a scan or page view
2. **scan_completed** - Scan operation finished
3. **upgrade_started** - User started upgrade process
4. **upgrade_confirmed** - Upgrade transaction confirmed
5. **upgrade_failed** - Upgrade transaction failed
6. **error_reported** - Error event recorded
7. **performance_metric** - Performance data collected

### Dashboard Widgets

Create the following widgets in your analytics dashboard:

#### 1. User Engagement
- **Total Sessions**: Count of unique sessions
- **Active Users**: Daily/Weekly/Monthly active users
- **Session Duration**: Average time spent in app
- **Page Views**: Most visited pages

#### 2. Feature Adoption
- **Wallet Connections**: Count of wallet connect events
- **Scans Completed**: Success rate of scan operations
- **Upgrades**: Count of upgrade attempts vs. completions
- **Marketplace Activity**: Trades initiated and completed

#### 3. Error Tracking
- **Error Rate**: Percentage of sessions with errors
- **Top Errors**: Most common error messages
- **Error Trends**: Error rate over time

#### 4. Performance Metrics
- **API Response Time**: Average duration of API calls
- **Page Load Time**: Time to interactive for each page
- **Transaction Time**: Time to complete blockchain transactions

### Example Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Stellar Nebula - Analytics Dashboard                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Active Users │  │   Sessions   │  │  Error Rate  │ │
│  │    1,234     │  │    5,678     │  │     0.5%     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         User Engagement Over Time               │  │
│  │  [Line chart showing daily active users]        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │  Top Pages           │  │  Feature Adoption    │   │
│  │  1. /nebula (45%)    │  │  Wallet: 89%         │   │
│  │  2. /dashboard (30%) │  │  Scans: 76%          │   │
│  │  3. / (15%)          │  │  Upgrades: 34%       │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         Error Trends                            │  │
│  │  [Bar chart showing errors by type]             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Dashboard Access and Permissions

### Sentry

**Roles:**
- **Owner**: Full access, billing, and settings
- **Manager**: Manage projects and team members
- **Admin**: Full project access
- **Member**: View and resolve issues
- **Billing**: Billing and subscription management

**Recommended Setup:**
- Developers: **Member** role
- Team Leads: **Admin** role
- DevOps: **Manager** role

### LogRocket

**Roles:**
- **Admin**: Full access to all features
- **Member**: View sessions and errors
- **Billing**: Billing management only

**Recommended Setup:**
- Developers: **Member** role
- Product Managers: **Member** role
- DevOps: **Admin** role

## Monitoring Best Practices

### 1. Set Up Alerts

Configure alerts for critical issues:
- Error rate exceeds 1%
- Performance degradation (P95 > 3s)
- New errors in production
- High memory usage

### 2. Regular Review

Schedule regular dashboard reviews:
- **Daily**: Check error rate and new issues
- **Weekly**: Review performance trends and user behavior
- **Monthly**: Analyze feature adoption and conversion funnels

### 3. Incident Response

When an alert fires:
1. Check Sentry for error details and stack trace
2. Find related LogRocket session to see user context
3. Reproduce the issue locally if possible
4. Fix and deploy
5. Monitor to confirm resolution

### 4. Performance Budgets

Set performance budgets and monitor:
- Page load time < 2s
- API response time < 500ms
- Bundle size < 500KB
- First Contentful Paint < 1s

### 5. Privacy and Compliance

Ensure monitoring complies with privacy regulations:
- **PII Masking**: LogRocket masks text by default
- **Data Retention**: Configure retention periods in settings
- **User Consent**: Implement analytics opt-out (already in code)
- **GDPR Compliance**: Enable data deletion on user request

## Troubleshooting

### Sentry Not Receiving Events

1. Check DSN is correct in environment variables
2. Verify `VITE_ENABLE_MONITORING=true`
3. Check browser console for Sentry errors
4. Verify network requests to `sentry.io` are not blocked

### LogRocket Not Recording Sessions

1. Check App ID is correct
2. Verify LogRocket script loaded (check Network tab)
3. Ensure third-party cookies are enabled
4. Check browser console for LogRocket errors

### Analytics Events Not Arriving

1. Verify `VITE_ANALYTICS_ENDPOINT` is set
2. Check CORS configuration on backend
3. Verify backend is receiving POST requests
4. Check browser console for failed requests

## Cost Optimization

### Sentry

- Use sampling rates to reduce event volume:
  - `sentrySampleRate: 0.1` (10% of transactions)
  - `replaysSessionSampleRate: 0.1` (10% of sessions)
- Filter out noisy errors in `beforeSend` hook
- Set appropriate data retention periods

### LogRocket

- Limit session recording to production only
- Use conditional recording based on user segments
- Set session limits per month
- Archive old sessions regularly

## Related Documentation

- [Monitoring and Logging Implementation](./MONITORING_AND_LOGGING.md)
- [Performance Testing](./performance-testing.md)
- [Sentry Documentation](https://docs.sentry.io/)
- [LogRocket Documentation](https://docs.logrocket.com/)
