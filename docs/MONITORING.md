# Monitoring & Analytics Strategy

This document outlines the strategy for monitoring traffic, user behavior, and app health across Web, Android, and iOS platforms.

---

## 1. Unified Analytics Strategy

We utilize a **combined Firebase Analytics + Google Analytics 4 (GA4)** approach. This provides a single source of truth for user data across all platforms.

| Platform | Integration Method |
|----------|-------------------|
| **Web** | Firebase JavaScript SDK + GA4 Sync |
| **Android** | Firebase Android SDK |
| **iOS** | Firebase iOS SDK |

### Why this approach?
- **Unified User View**: Track users as they move between web and mobile (if signed in).
- **Free Tier**: Generous limits suitable for our scale.
- **Deep Integration**: Works seamlessly with our existing Firebase backend (Auth, Firestore).
- **Mobile First**: Firebase offers best-in-class mobile tracking (Active Users, Retention).
- **Web Power**: GA4 offers powerful web-centric analysis (Traffic Sources, SEO).

---

## 2. Setup Guide

### Web Application (`src/services/firebase.ts`)
Add the following initialization to enable automatic page view tracking:

```typescript
import { getAnalytics } from 'firebase/analytics';

// ... existing firebase init ...

// Initialize Analytics only on the client-side
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
```

### Mobile Apps
Add the respective Firebase SDKs during build. Firebase will automatically collect core metrics (installs, sessions, screen views).

### Firebase Console Configuration
1. Go to **Firebase Console** → **Analytics** → **Dashboard**.
2. Click **Link to Google Analytics**.
3. Select (or create) a GA4 property.
4. Data will now flow from Firebase to GA4.

---

## 3. Monitoring Interfaces

We use two primary interfaces depending on the goal:

| Interface | Best For | Key Metrics |
|-----------|----------|-------------|
| **[Firebase Console](https://console.firebase.google.com)** | **Daily Health Check** <br> Mobile App Focus | • Active Users (DAU/MAU) <br> • Crash-free users % <br> • Retention Cohorts <br> • Realtime StreamView |
| **[Google Analytics 4](https://analytics.google.com)** | **Deep Dive Analysis** <br> Web Traffic Focus | • Traffic Acquisition (SEO/Social) <br> • User Engagement <br> • Exploration Reports (Funnels) <br> • Demographics |

---

## 4. Server & Infrastructure Monitoring

For the backend (Cloud Run), we rely on Google Cloud's built-in observability.

- **Dashboard**: [Cloud Run Console](https://console.cloud.google.com/run) → Your Service → **Metrics** tab.
- **Key Metrics to Watch**:
    - **Request Count**: Total traffic volume.
    - **Container Instance Count**: Auto-scaling behavior (0 → N).
    - **Latencies**: 50th, 95th, and 99th percentile response times.
    - **Container CPU/Memory Utilization**: Resource health.

---

## 5. Custom Events (Optional)

To track specific user actions beyond page views, use `logEvent`:

```typescript
import { logEvent } from 'firebase/analytics';
import { analytics } from '@/services/firebase';

if (analytics) {
  logEvent(analytics, 'view_cat_profile', {
    cat_name: 'Geyang',
    source: 'map_pin'
  });
}
```
