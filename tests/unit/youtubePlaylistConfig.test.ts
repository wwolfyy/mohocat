/**
 * Playlist filing config (butler-media-separation plan B2).
 *
 * Video filing used to find its playlist by matching the literal title
 * '집사게시판' against everything on the channel — a rename on YouTube stopped
 * filing with no error, and every mountain filed into the same list. It is now
 * config-driven, which puts weight on two things these tests pin:
 *
 * 1. the **missing-vs-empty** contract (a typo throws; an explicit `""` means
 *    "no playlist yet" and returns null), and
 * 2. the `_`-prefix mechanism that keeps `_shared` from ever being mistaken for
 *    a tenant.
 */
import { describe, it, expect } from 'vitest';
import {
  getAdoptionPlaylistId,
  getAllMountains,
  getPublicMountains,
  getYouTubePlaylistId,
} from '../../src/utils/config';
import { resolveMountainIdOrNull } from '../../src/lib/tenant';

describe('getYouTubePlaylistId — the mountain’s own playlist', () => {
  it('returns the configured playlist for each mountain', () => {
    expect(getYouTubePlaylistId('geyang')).toBe('PL3DBzcr-rpCGQtNw2dgC8cJcDTjIEOSxa');
    expect(getYouTubePlaylistId('manisan')).toBe('PLVEAQ-0vlkXw');
  });

  it('gives each mountain a DIFFERENT playlist on the one shared channel', () => {
    // The point of the whole exercise: one channel, per-mountain attribution.
    expect(getYouTubePlaylistId('geyang')).not.toBe(getYouTubePlaylistId('manisan'));
  });

  it('throws for an unknown mountain rather than filing nowhere', () => {
    expect(() => getYouTubePlaylistId('everest')).toThrow(/everest/);
  });
});

describe('getAdoptionPlaylistId — the cross-mountain 입양홍보 playlist', () => {
  it('returns the shared playlist', () => {
    expect(getAdoptionPlaylistId()).toBe('PL3DBzcr-rpCG8QxBiLgcSZtgD9LoXjY58');
  });

  it('is the same playlist no matter which mountain asks (it takes no mountainId)', () => {
    // Encoded in the signature: adoption promotion is platform-wide, so there is
    // no per-mountain variant to get wrong.
    expect(getAdoptionPlaylistId.length).toBe(0);
  });

  it('is not any mountain’s own playlist', () => {
    expect(getAdoptionPlaylistId()).not.toBe(getYouTubePlaylistId('geyang'));
    expect(getAdoptionPlaylistId()).not.toBe(getYouTubePlaylistId('manisan'));
  });
});

describe('_shared is platform config, never a tenant', () => {
  it('is absent from the mountain lists', () => {
    const ids = getAllMountains().map((mountain) => mountain.id);
    expect(ids).not.toContain('_shared');
    expect(ids).not.toContain('_meta');
    expect(getPublicMountains().map((mountain) => mountain.id)).not.toContain('_shared');
  });

  it('is not routable as a [mountain] segment', () => {
    expect(resolveMountainIdOrNull('_shared')).toBeNull();
  });

  it('cannot be read as a mountain config', () => {
    expect(() => getYouTubePlaylistId('_shared')).toThrow(/_shared/);
  });
});
