/**
 * Mountain Configuration Management
 *
 * Two concerns, deliberately separated (multi-mountain plan M2):
 *
 * 1. **Tenant config** — per-mountain public settings from
 *    `config/mountains/mountains.json` (branding, about, theme, features, map,
 *    social, domains, storagePrefix). Every accessor takes an **explicit
 *    `mountainId`** — there is no ambient "current mountain" on the server.
 * 2. **Deployment secrets** — env-sourced credentials (Firebase, service
 *    account, YouTube, OAuth). One Firebase project serves every mountain
 *    (plan §0 Q5), so these are deployment-global and take no mountainId.
 *
 * `getDefaultMountainId()` is only the *fallback* tenant (unmapped hosts, build
 * scripts, dev); request-scoped tenant resolution lives in `src/lib/tenant.ts`.
 */

import mountainsConfig from '../../config/mountains/mountains.json';

export interface MountainFeatures {
  videoAlbum: boolean;
  photoAlbum: boolean;
  advancedFiltering: boolean;
  adminPanel: boolean;
}

export interface MountainSocial {
  youtubeChannelId: string;
  instagramHandle: string;
  facebookPage: string;
  /**
   * The mountain's own playlist on the shared YouTube channel. Every video
   * uploaded for this mountain is filed into it, which is what makes a video
   * attributable to one mountain **on the YouTube side** (Firestore already has
   * `cat_videos.mountainId`). See `getYouTubePlaylistId`.
   */
  youtubePlaylistId: string;
}

export interface MapImageConfig {
  /** Public path to the map image (served from `public/`). */
  url: string;
  width: number;
  height: number;
}

export interface MountainMapConfig {
  /**
   * Whether the mobile map clusters nearby feeding points. `true` (default) →
   * points within `maxClusterRadius` collapse into a tap-to-expand cluster badge;
   * `false` → every point renders as its own pin (they may overlap where points
   * are close). Desktop is always un-clustered, so this only affects mobile.
   */
  clustering: boolean;
  /**
   * Marker-clustering distance for the mobile map, in **screen pixels** at the
   * fill/default view: points within this radius of each other collapse into one
   * cluster (used by the static clusterer in `utils/mapClustering` — the grouping
   * is computed once and never re-clustered on zoom). Larger = collapses points
   * that are farther apart; smaller = keeps them separate longer. Ignored when
   * `clustering` is `false`.
   */
  maxClusterRadius: number;
  /**
   * Per-mountain map imagery for the Leaflet host (desktop/landscape and the
   * 90°-CW-rotated portrait variant). No default — a mountain that renders the
   * map must declare both; the map host fails loud if they are missing.
   */
  landscapeImage?: MapImageConfig;
  portraitImage?: MapImageConfig;
}

/** Fallback used when a mountain config omits the `map` section (or a field). */
export const DEFAULT_MAP_CONFIG: MountainMapConfig = {
  clustering: true,
  maxClusterRadius: 50,
};

export interface OAuthProviderConfig {
  google?: {
    clientId: string;
    clientSecret?: string;
    enabled: boolean;
  };
  kakao?: {
    clientId: string;
    clientSecret?: string;
    enabled: boolean;
  };
}

/**
 * ⚠️ There is deliberately **no `about`** here. A mountain's 소개 lives in
 * Firestore (`about_content/{mountainId}`), written through the admin CMS, and
 * that record is the only copy. This block used to hold a second one, which
 * shadowed the CMS for the 대표 사진 and stood in for it before a mountain was
 * filled in — so config and CMS could disagree about what the page said. Adding
 * it back re-creates that split; provision a new mountain's 소개 in the CMS.
 */
export interface MountainConfig {
  id: string;
  name: string;
  description: string;
  adminEmail: string;
  /**
   * Hosts that resolve to this mountain (no scheme/port), e.g.
   * `geyangsan.mohocats.org`. Consumed by `src/lib/tenant.ts` host mapping.
   */
  domains: string[];
  /**
   * Firebase Storage path prefix for this mountain's uploads. `''` for geyang
   * (legacy flat layout — objects stay where they are); `mountains/{id}/` for
   * every new mountain (plan §0 sub-decision 3).
   */
  storagePrefix: string;
  features: MountainFeatures;
  social: MountainSocial;
  map?: MountainMapConfig;
  /**
   * When true, the mountain is a real, routable tenant (`/{id}` resolves, it can
   * be seeded and tested) but is **not** advertised in the public
   * `MountainSelector` — used for a preparatory stub tenant that exists in config
   * before the mountain goes live (plan Q8). Omitted/false = publicly listed.
   */
  hidden?: boolean;
}

// ---------------------------------------------------------------------------
// Tenant config (per-mountain; explicit mountainId)
// ---------------------------------------------------------------------------

/**
 * The fallback mountain ID, from env. This is NOT "the current mountain" —
 * it is the tenant used when no request-scoped resolution applies: unmapped
 * hosts (localhost, Vercel previews), build scripts, and the e2e harness.
 */
export function getDefaultMountainId(): string {
  return process.env.MOUNTAIN_ID || process.env.NEXT_PUBLIC_MOUNTAIN_ID || 'geyang';
}

/**
 * Get a mountain's public configuration by explicit ID.
 */
export function getMountainConfig(mountainId: string): MountainConfig {
  const publicConfig = mountainsConfig[mountainId as keyof typeof mountainsConfig];
  if (mountainId.startsWith('_') || !publicConfig || typeof publicConfig !== 'object') {
    throw new Error(`Configuration not found for mountain: ${mountainId}`);
  }
  return publicConfig as unknown as MountainConfig;
}

/**
 * Get map configuration for a mountain, falling back to `DEFAULT_MAP_CONFIG`
 * when the `map` section (or a field) is omitted.
 */
export function getMapConfig(mountainId: string): MountainMapConfig {
  const config = getMountainConfig(mountainId);
  return { ...DEFAULT_MAP_CONFIG, ...config.map };
}

/**
 * Check if a feature is enabled for a mountain
 */
export function isFeatureEnabled(feature: keyof MountainFeatures, mountainId: string): boolean {
  const config = getMountainConfig(mountainId);
  return config.features[feature];
}

/**
 * Get mountain name for display
 */
export function getMountainName(mountainId: string): string {
  const config = getMountainConfig(mountainId);
  return config.name;
}

/**
 * Get mountain description
 */
export function getMountainDescription(mountainId: string): string {
  const config = getMountainConfig(mountainId);
  return config.description;
}

/**
 * Get YouTube channel ID for a mountain
 */
export function getYouTubeChannelId(mountainId: string): string {
  const config = getMountainConfig(mountainId);
  return config.social.youtubeChannelId;
}

/**
 * The mountain's playlist on the shared YouTube channel, or `null` when the
 * mountain deliberately has none yet.
 *
 * ⚠️ **A missing key and an empty value mean different things**, and conflating
 * them is the bug this replaced: filing used to find its playlist by matching
 * the literal title `'집사게시판'`, so renaming the playlist on YouTube stopped
 * filing silently. Here:
 *
 * - key **absent** → `throw`. A typo or an unprovisioned mountain must be loud.
 * - value `''` → `null`. An explicit, reviewable "no playlist yet"; the caller
 *   skips filing and logs that it did.
 * - value set → file into it.
 *
 * All three playlists are configured today, so the `null` branch is defensive:
 * it exists so adding a mountain and creating its playlist need not be one
 * atomic chore.
 */
export function getYouTubePlaylistId(mountainId: string): string | null {
  const config = getMountainConfig(mountainId);
  const playlistId = config.social.youtubePlaylistId;
  if (playlistId === undefined || playlistId === null) {
    throw new Error(
      `social.youtubePlaylistId is not configured for mountain: ${mountainId} ` +
        `(use "" to declare that it deliberately has no playlist yet)`
    );
  }
  return playlistId.trim() || null;
}

/**
 * The one cross-mountain 입양홍보 playlist (owner decision, 2026-07-27).
 *
 * Adoption promotion is platform-wide, so this is **not** a tenant knob — hence
 * no `mountainId` parameter and a home in the `_shared` block rather than in a
 * mountain. An 입양홍보 video is filed into *both* this and its own mountain's
 * playlist, so per-mountain attribution survives.
 *
 * Same missing-vs-empty contract as `getYouTubePlaylistId`.
 */
export function getAdoptionPlaylistId(): string | null {
  const shared = (mountainsConfig as Record<string, unknown>)._shared as
    | { youtube?: { adoptionPlaylistId?: string } }
    | undefined;
  const playlistId = shared?.youtube?.adoptionPlaylistId;
  if (playlistId === undefined || playlistId === null) {
    throw new Error(
      '_shared.youtube.adoptionPlaylistId is not configured ' +
        '(use "" to declare that there is deliberately no 입양홍보 playlist yet)'
    );
  }
  return playlistId.trim() || null;
}

/**
 * Get all available mountains (excluding meta entries)
 */
export function getAllMountains(): Array<{ id: string; name: string; description: string }> {
  return Object.entries(mountainsConfig)
    .filter(([key]) => !key.startsWith('_'))
    .map(([id, config]) => ({
      id,
      name: (config as any).name,
      description: (config as any).description,
    }));
}

/**
 * Public (selectable) mountains — `getAllMountains()` minus any flagged `hidden`
 * in config. The visitor-facing `MountainSelector` uses this; routing,
 * `generateStaticParams`, and `resolveMountainIdOrNull` keep using
 * `getAllMountains()` so a hidden stub tenant stays reachable by URL.
 */
export function getPublicMountains(): Array<{ id: string; name: string; description: string }> {
  return getAllMountains().filter((mountain) => !getMountainConfig(mountain.id).hidden);
}

// ---------------------------------------------------------------------------
// Deployment secrets (env-sourced; shared by every mountain — no mountainId)
// ---------------------------------------------------------------------------

/**
 * Firebase web-app configuration for the single shared Firebase project.
 */
export function getFirebaseConfig() {
  const firebase = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    // measurementId intentionally omitted: analytics is decoupled from the Firebase
    // app (multi-mountain plan M7 §2.7) and driven by NEXT_PUBLIC_GA_MEASUREMENT_ID
    // via gtag.js, so the Firebase config no longer needs it.
  };

  if (process.env.FIREBASE_CONFIG) {
    try {
      return { ...firebase, ...JSON.parse(process.env.FIREBASE_CONFIG) };
    } catch (error) {
      console.warn('Failed to parse FIREBASE_CONFIG environment variable:', error);
    }
  }

  return firebase;
}

/**
 * Get YouTube API key
 */
export function getYouTubeApiKey(): string {
  return process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
}

// getYouTubeOAuthConfig() lived here until 2026-07-26. It required all three of
// YOUTUBE_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN before returning anything, which made
// an env-only credential the only one any route could see. The OAuth credential now
// lives in `src/lib/youtube/credentials.ts`, which reads the freshest refresh token
// from Firestore and keeps client identity separate from it.

/**
 * Get Firebase Admin Service Account configuration for admin operations
 * Uses Firebase Admin SDK service account with elevated privileges
 * Note: This function should only be called in server-side contexts (API routes, etc.)
 * This function is intentionally not available in client-side code
 */
export function getFirebaseAdminServiceAccount() {
  try {
    if (process.env.SERVICE_ACCOUNT_KEY) {
      let rawStr = process.env.SERVICE_ACCOUNT_KEY;
      rawStr = rawStr.replace(/'/g, '"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      return JSON.parse(rawStr);
    }

    return null;
  } catch (error) {
    console.error('Failed to parse Firebase Admin service account:', error);
    return null;
  }
}

/**
 * Get OAuth provider configuration
 */
export function getOAuthProvidersConfig(): OAuthProviderConfig | undefined {
  const oauthProviders: OAuthProviderConfig = {};

  // Google OAuth
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    oauthProviders.google = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || undefined,
      enabled: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true',
    };
  }

  // Kakaotalk OAuth
  if (process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID) {
    oauthProviders.kakao = {
      clientId: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_KAKAO_CLIENT_SECRET || undefined,
      enabled: process.env.NEXT_PUBLIC_KAKAO_OAUTH_ENABLED === 'true',
    };
  }

  return Object.keys(oauthProviders).length > 0 ? oauthProviders : undefined;
}

/**
 * Get Google OAuth configuration
 */
export function getGoogleOAuthConfig() {
  const oauthConfig = getOAuthProvidersConfig();
  return oauthConfig?.google;
}

/**
 * Get Kakaotalk OAuth configuration
 */
export function getKakaoOAuthConfig() {
  const oauthConfig = getOAuthProvidersConfig();
  return oauthConfig?.kakao;
}

/**
 * Check if Google OAuth is enabled
 */
export function isGoogleOAuthEnabled(): boolean {
  const config = getGoogleOAuthConfig();
  return config?.enabled === true;
}

/**
 * Check if Kakaotalk OAuth is enabled
 */
export function isKakaoOAuthEnabled(): boolean {
  const config = getKakaoOAuthConfig();
  return config?.enabled === true;
}
