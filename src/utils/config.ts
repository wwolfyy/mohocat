/**
 * Mountain Configuration Management
 *
 * This module provides a unified way to access mountain-specific configuration
 * while maintaining backward compatibility with the current single-mountain setup.
 */

import mountainsConfig from '../../config/mountains/mountains.json';

export interface MountainTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

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
}

export interface MountainSecrets {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  youtubeApiKey: string;
  youtubeOAuth?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    redirectUri?: string;
  };
  serviceAccount?: any;
}

export interface AboutSection {
  title: string;
  content: string;
}

export interface AboutMainPhoto {
  filename: string;
  caption: string;
  altText: string;
}

export interface MountainAbout {
  title: string;
  subtitle: string;
  mainContent: string;
  mainPhoto?: AboutMainPhoto;
  sections: AboutSection[];
}

export interface MountainConfig {
  id: string;
  name: string;
  description: string;
  adminEmail: string;
  about: MountainAbout;
  theme: MountainTheme;
  features: MountainFeatures;
  social: MountainSocial;
  secrets?: MountainSecrets;
}

/**
 * Get the current mountain ID
 */
export function getCurrentMountainId(): string {
  return process.env.MOUNTAIN_ID || process.env.NEXT_PUBLIC_MOUNTAIN_ID || 'geyang';
}

/**
 * Get the current mountain configuration
 *
 * In single-mountain mode (current): Returns geyang config with current env variables
 * In multi-mountain mode (future): Returns config based on MOUNTAIN_ID env variable
 */
export function getMountainConfig(): MountainConfig {
  // Get mountain ID from environment variable, fallback to 'geyang' for backward compatibility
  const mountainId = process.env.MOUNTAIN_ID || process.env.NEXT_PUBLIC_MOUNTAIN_ID || 'geyang';

  // Load public configuration
  const publicConfig = mountainsConfig[mountainId as keyof typeof mountainsConfig];
  if (!publicConfig || typeof publicConfig !== 'object' || 'centralUserService' in publicConfig) {
    throw new Error(`Configuration not found for mountain: ${mountainId}`);
  }

  // Load secret configuration from environment variables
  // This maintains backward compatibility with existing environment variables
  const secretConfig: MountainSecrets = {
    firebase: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    },
    youtubeApiKey: process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '',
  };

  // Add YouTube OAuth credentials if available
  if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN) {
    secretConfig.youtubeOAuth = {
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
      redirectUri: process.env.YOUTUBE_REDIRECT_URI,
    };
  }

  // In the future, when we have multi-mountain setup, we can also parse:
  // FIREBASE_CONFIG and SERVICE_ACCOUNT_KEY environment variables
  if (process.env.FIREBASE_CONFIG) {
    try {
      const firebaseFromEnv = JSON.parse(process.env.FIREBASE_CONFIG);
      secretConfig.firebase = { ...secretConfig.firebase, ...firebaseFromEnv };
    } catch (error) {
      console.warn('Failed to parse FIREBASE_CONFIG environment variable:', error);
    }
  }

  if (process.env.SERVICE_ACCOUNT_KEY) {
    try {
      secretConfig.serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
    } catch (error) {
      console.warn('Failed to parse SERVICE_ACCOUNT_KEY environment variable:', error);
    }
  }

  return {
    ...(publicConfig as any),
    secrets: secretConfig
  };
}

/**
 * Get Firebase configuration for the current mountain
 */
export function getFirebaseConfig() {
  const config = getMountainConfig();
  return config.secrets?.firebase;
}

/**
 * Get YouTube API key for the current mountain
 */
export function getYouTubeApiKey(): string {
  const config = getMountainConfig();
  return config.secrets?.youtubeApiKey || '';
}

/**
 * Get theme configuration for the current mountain
 */
export function getMountainTheme(): MountainTheme {
  const config = getMountainConfig();
  return config.theme;
}

/**
 * Check if a feature is enabled for the current mountain
 */
export function isFeatureEnabled(feature: keyof MountainFeatures): boolean {
  const config = getMountainConfig();
  return config.features[feature];
}

/**
 * Get mountain name for display
 */
export function getMountainName(): string {
  const config = getMountainConfig();
  return config.name;
}

/**
 * Get YouTube OAuth configuration for the current mountain
 */
export function getYouTubeOAuthConfig() {
  const config = getMountainConfig();
  return config.secrets?.youtubeOAuth;
}

/**
 * Get mountain description
 */
export function getMountainDescription(): string {
  const config = getMountainConfig();
  return config.description;
}

/**
 * Get YouTube channel ID for the current mountain
 */
export function getYouTubeChannelId(): string {
  const config = getMountainConfig();
  return config.social.youtubeChannelId;
}

/**
 * Get about page configuration for the current mountain
 */
export function getMountainAbout(): MountainAbout {
  const config = getMountainConfig();
  return config.about;
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
