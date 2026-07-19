import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getMountainIdForHost,
  getRequestMountainId,
  resolveMountainIdOrNull,
} from '../../src/lib/tenant';
import { getDefaultMountainId, getMountainConfig } from '../../src/utils/config';

// geyang's configured production host (config/mountains/mountains.json → domains).
const GEYANG_HOST = 'geyangsan.mohocats.org';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveMountainIdOrNull — [mountain] segment validation', () => {
  it('accepts a configured mountain id', () => {
    expect(resolveMountainIdOrNull('geyang')).toBe('geyang');
  });

  it('rejects an unknown id', () => {
    expect(resolveMountainIdOrNull('everest')).toBeNull();
  });

  it('rejects meta keys and empty values', () => {
    expect(resolveMountainIdOrNull('_meta')).toBeNull();
    expect(resolveMountainIdOrNull('')).toBeNull();
    expect(resolveMountainIdOrNull(undefined)).toBeNull();
    expect(resolveMountainIdOrNull(null)).toBeNull();
  });
});

describe('getMountainIdForHost — Host header mapping', () => {
  it('maps a configured domain to its mountain', () => {
    expect(getMountainIdForHost(GEYANG_HOST)).toBe('geyang');
  });

  it('ignores port and case', () => {
    expect(getMountainIdForHost(`${GEYANG_HOST.toUpperCase()}:3000`)).toBe('geyang');
  });

  it('falls back to the default tenant for unmapped hosts', () => {
    expect(getMountainIdForHost('localhost:3000')).toBe(getDefaultMountainId());
    expect(getMountainIdForHost('preview-abc123.vercel.app')).toBe(getDefaultMountainId());
  });

  it('falls back to the default tenant when host is absent', () => {
    expect(getMountainIdForHost(null)).toBe(getDefaultMountainId());
    expect(getMountainIdForHost(undefined)).toBe(getDefaultMountainId());
  });

  it('honors the MOUNTAIN_ID env as the fallback tenant', () => {
    vi.stubEnv('MOUNTAIN_ID', 'stub-mountain');
    expect(getMountainIdForHost('unmapped.example.org')).toBe('stub-mountain');
  });
});

describe('getRequestMountainId — API-route resolution', () => {
  it('resolves from the request Host header', () => {
    const request = new Request('https://example.invalid/api/contact', {
      headers: { host: GEYANG_HOST },
    });
    expect(getRequestMountainId(request)).toBe('geyang');
  });

  it('falls back to the default tenant without a mappable host', () => {
    const request = new Request('https://example.invalid/api/contact');
    expect(getRequestMountainId(request)).toBe(getDefaultMountainId());
  });
});

describe('getMountainConfig — explicit-id contract', () => {
  it('returns the configured mountain, with the M2 tenancy fields', () => {
    const config = getMountainConfig('geyang');
    expect(config.id).toBe('geyang');
    expect(config.domains).toContain(GEYANG_HOST);
    expect(config.storagePrefix).toBe('');
  });

  it('throws for unknown mountains and meta keys', () => {
    expect(() => getMountainConfig('everest')).toThrow(/Configuration not found/);
    expect(() => getMountainConfig('_meta')).toThrow(/Configuration not found/);
  });
});
