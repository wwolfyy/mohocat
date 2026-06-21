# Production Domain Setup Checklist

When deploying to a production domain (e.g., `https://mcathcat.org`), you must update white-lists and configuration in various external services.

---

## 1. Firebase Console

**Location**: Authentication → Settings → Authorized domains

- [ ] Add your domain (`mcathcat.org`)

## 2. Google Cloud Console (OAuth & APIs)

**Location**: APIs & Services → Credentials

### OAuth 2.0 Client ID (for Google Login)

- [ ] **Authorized JavaScript Origins**: Add `https://mcathcat.org`
- [ ] **Authorized Redirect URIs**: Add `https://mcathcat.org/__/auth/handler` (Standard for Firebase Auth -- verify exact path used in code)

### API Keys (YouTube/Maps)

- [ ] **HTTP Referrers (for websites)**: If your keys are restricted, which should be, add
      `https://mcathcat.org/*`
      `https://mcathcat.org`
      `https://*.mcathcat.org`
      `https://mcathcat.org/*`

### API Keys (Android Apps)

- [ ] **Android apps**: Select this restriction type.
- [ ] **Package name**: Add your package name (e.g., `com.mohocats.app`)
- [ ] **SHA-1 fingerprint**: Add the SHA-1 fingerprint of your signing certificate

### API Keys (iOS Apps)

- [ ] **iOS apps**: Select this restriction type.
- [ ] **Bundle ID**: Add your Bundle Identifier (e.g., `org.mohocats.ios`)

## 3. Kakao Developers Console

### Platform key

**Location**: [My App] → 엡 → 플랫폼키
https://developers.kakao.com/console/app/1338934/config/platform-key

- [ ] **Redirect URI (REST API key)**: Add `https://mcathcat.org/__/auth/handler` (Standard for Firebase Auth -- verify exact path used in code)
- [ ] **Redirect URI (JavaScript key) (if using Kakao SDK)**: Add `https://mcathcat.org/__/auth/handler` (Standard for Firebase Auth -- verify exact path used in code)
- [ ] **Redirect URI (Native App key) (for mobile app)**: Set up as necessary

### Kakao Login:

**Location**: [My App] → 엡 → 제품링크관리
https://developers.kakao.com/console/app/1338934/config/product-link

- [ ] **웹도메인 (for web app)**: Add `https://mcathcat.org`
- [ ] **네이티브앱 스킴 (for mobile app)**: Automatically populated from Native App key above

## 4. Environment Variables

**Location**: Your production `.env` file (on server or in GitHub Secrets)

- [ ] Update `NEXT_PUBLIC_BASE_URL` to `https://mcathcat.org`
- [ ] Update `YOUTUBE_REDIRECT_URI` to `https://mcathcat.org/oauth/callback`

## 5. Deployment

- [ ] **Rebuild Container**: After changing `NEXT_PUBLIC_BASE_URL` or other env vars, you **must rebuild** the Docker container for changes to take effect.
