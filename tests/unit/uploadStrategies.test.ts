/**
 * Unit coverage for the injectable upload strategies (complexity-retirement
 * P1.3). The strategies are the lift targets the P2/P3 form migrations swap in,
 * so this pins their contract before any form depends on them: storage paths,
 * request shape, result mapping, and fail-loud error propagation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const uploadFileMock = vi.fn();

vi.mock('@/services', () => ({
  getStorageService: () => ({ uploadFile: uploadFileMock }),
}));

import {
  uploadImagesToStorage,
  uploadVideoToYouTube,
  uploadVideosToYouTube,
} from '@/components/forms/uploadStrategies';

const file = (name: string) => new File(['x'], name, { type: 'application/octet-stream' });

beforeEach(() => {
  uploadFileMock.mockReset();
});

describe('uploadImagesToStorage (direct-storage strategy, Family B)', () => {
  it('uploads every file under the given prefix and returns the URLs in order', async () => {
    uploadFileMock.mockImplementation(async (_f: File, path: string) => `https://cdn/${path}`);

    const urls = await uploadImagesToStorage([file('a.jpg'), file('b.jpg')], 'adoption/images');

    expect(uploadFileMock).toHaveBeenCalledTimes(2);
    // Path contract from NewAnnouncementForm: `<prefix>/<Date.now()>_<fileName>`.
    const paths = uploadFileMock.mock.calls.map((c) => c[1] as string);
    expect(paths[0]).toMatch(/^adoption\/images\/\d+_a\.jpg$/);
    expect(paths[1]).toMatch(/^adoption\/images\/\d+_b\.jpg$/);
    expect(urls).toEqual([`https://cdn/${paths[0]}`, `https://cdn/${paths[1]}`]);
  });

  it('re-throws a failed upload instead of swallowing it', async () => {
    uploadFileMock.mockRejectedValue(new Error('storage down'));
    await expect(uploadImagesToStorage([file('a.jpg')], 'p')).rejects.toThrow('storage down');
  });
});

describe('uploadVideoToYouTube (shared YouTube strategy)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const okResponse = (videoUrl: string) => ({
    ok: true,
    json: async () => ({ videoUrl }),
  });

  it('POSTs the video with its metadata and returns the video URL', async () => {
    fetchMock.mockResolvedValue(okResponse('https://youtu.be/abc'));

    const url = await uploadVideoToYouTube(file('v.mp4'), {
      title: '공지사항 동영상',
      description: '설명',
      tags: '공지사항',
    });

    expect(url).toBe('https://youtu.be/abc');
    expect(fetchMock).toHaveBeenCalledWith('/api/upload-youtube', {
      method: 'POST',
      body: expect.any(FormData),
    });
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect((body.get('video') as File).name).toBe('v.mp4');
    expect(body.get('title')).toBe('공지사항 동영상');
    expect(body.get('description')).toBe('설명');
    expect(body.get('tags')).toBe('공지사항');
    // Family-A-only fields stay absent unless provided.
    expect(body.get('createdTime')).toBeNull();
    expect(body.get('playlistId')).toBeNull();
  });

  it('appends optional Family-A fields (createdTime/playlistId) when provided and omits empty tags', async () => {
    fetchMock.mockResolvedValue(okResponse('https://youtu.be/abc'));

    await uploadVideoToYouTube(file('v.mp4'), {
      title: 't',
      description: 'd',
      tags: '',
      createdTime: '2026-02-01',
      playlistId: 'PL123',
    });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('tags')).toBeNull();
    expect(body.get('createdTime')).toBe('2026-02-01');
    expect(body.get('playlistId')).toBe('PL123');
  });

  it('throws with statusText + response body when the API rejects', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      text: async () => 'quota exceeded',
    });

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd' })
    ).rejects.toThrow('Failed to upload video: Internal Server Error - quota exceeded');
  });

  it('uploadVideosToYouTube maps several files to their URLs in order', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse('https://youtu.be/one'))
      .mockResolvedValueOnce(okResponse('https://youtu.be/two'));

    const urls = await uploadVideosToYouTube([file('1.mp4'), file('2.mp4')], {
      title: 't',
      description: 'd',
    });

    expect(urls).toEqual(['https://youtu.be/one', 'https://youtu.be/two']);
  });
});
