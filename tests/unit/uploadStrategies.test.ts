/**
 * Unit coverage for the injectable upload strategies (complexity-retirement
 * P1.3). The strategies are the lift targets the P2/P3 form migrations swap in,
 * so this pins their contract before any form depends on them: storage paths,
 * request shape, result mapping, and fail-loud error propagation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User } from 'firebase/auth';

const uploadFileMock = vi.fn();
const createImageMock = vi.fn();

vi.mock('@/services', () => ({
  getStorageService: () => ({ uploadFile: uploadFileMock }),
  getImageService: () => ({ createImage: createImageMock }),
}));

import {
  uploadImagesToStorage,
  uploadVideoToYouTube,
  uploadVideosToYouTube,
  uploadImagesWithSignedUrls,
} from '@/components/forms/uploadStrategies';

const file = (name: string) => new File(['x'], name, { type: 'application/octet-stream' });

/**
 * Stand-in for the signed-in Firebase user the strategies now take: both the
 * YouTube-upload and signed-URL routes are permission-gated, so the strategies
 * attach this user's ID token. Only `getIdToken()` is exercised.
 */
const testUser = { getIdToken: async () => 'test-id-token' } as unknown as User;

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

  it('prepends the tenant storagePrefix to the object path (multi-tenant M6)', async () => {
    uploadFileMock.mockImplementation(async (_f: File, path: string) => `https://cdn/${path}`);

    await uploadImagesToStorage([file('a.jpg')], 'announcements/images', 'mountains/manisan/');

    const path = uploadFileMock.mock.calls[0][1] as string;
    expect(path).toMatch(/^mountains\/manisan\/announcements\/images\/\d+_a\.jpg$/);
  });

  it('an empty storagePrefix (geyang) leaves the flat path unchanged', async () => {
    uploadFileMock.mockImplementation(async (_f: File, path: string) => `https://cdn/${path}`);

    await uploadImagesToStorage([file('a.jpg')], 'announcements/images', '');

    const path = uploadFileMock.mock.calls[0][1] as string;
    expect(path).toMatch(/^announcements\/images\/\d+_a\.jpg$/);
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
      user: testUser,
    });

    expect(url).toBe('https://youtu.be/abc');
    expect(fetchMock).toHaveBeenCalledWith('/api/upload-youtube', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-id-token' },
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
      user: testUser,
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
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('Failed to upload video: Internal Server Error - quota exceeded');
  });

  it('throws when the API responds ok but without a videoUrl (P3 guard)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('No video URL returned from upload');
  });

  it('uploadVideosToYouTube maps several files to their URLs in order', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse('https://youtu.be/one'))
      .mockResolvedValueOnce(okResponse('https://youtu.be/two'));

    const urls = await uploadVideosToYouTube([file('1.mp4'), file('2.mp4')], {
      title: 't',
      description: 'd',
      user: testUser,
    });

    expect(urls).toEqual(['https://youtu.be/one', 'https://youtu.be/two']);
  });
});

describe('uploadImagesWithSignedUrls (signed-URL strategy, Family A)', () => {
  const fetchMock = vi.fn();

  const context = {
    mountainId: 'geyang',
    tags: ['테스트냥이이'],
    createdTime: '2026-02-01',
    uploadedBy: 'admin@example.com',
    description: '본문',
    user: testUser,
  };

  beforeEach(() => {
    fetchMock.mockReset();
    createImageMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const signedUrlResponse = (n: number) => ({
    ok: true,
    json: async () => ({ signedUrl: `https://signed/${n}`, publicUrl: `https://public/${n}` }),
  });

  it('requests a signed URL, PUTs the file, records a cat_images entry, returns public URLs', async () => {
    fetchMock
      .mockResolvedValueOnce(signedUrlResponse(1)) // signed-url request
      .mockResolvedValueOnce({ ok: true }); // PUT upload
    createImageMock.mockResolvedValue('img-id');

    const urls = await uploadImagesWithSignedUrls([file('a.jpg')], context);

    expect(urls).toEqual(['https://public/1']);
    // Canonical route contract: POST /api/generate-signed-url with name+type.
    expect(fetchMock.mock.calls[0][0]).toBe('/api/generate-signed-url');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      fileName: 'a.jpg',
      fileType: 'application/octet-stream',
    });
    // The route is permission-gated, so the caller's ID token rides along.
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-id-token',
    });
    // The PUT goes to the signedUrl with the file body.
    expect(fetchMock.mock.calls[1][0]).toBe('https://signed/1');
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    // The Firestore entry carries the injected context.
    expect(createImageMock).toHaveBeenCalledTimes(1);
    const entry = createImageMock.mock.calls[0][0];
    expect(entry.imageUrl).toBe('https://public/1');
    expect(entry.tags).toEqual(['테스트냥이이']);
    expect(entry.uploadedBy).toBe('admin@example.com');
    expect(entry.description).toBe('본문');
  });

  it('throws when the signed-URL request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Forbidden' });

    await expect(uploadImagesWithSignedUrls([file('a.jpg')], context)).rejects.toThrow(
      'Failed to get signed URL: Forbidden'
    );
  });

  it('throws when the PUT upload fails (adopted ok-check)', async () => {
    fetchMock
      .mockResolvedValueOnce(signedUrlResponse(1))
      .mockResolvedValueOnce({ ok: false, statusText: 'Bad Gateway' });

    await expect(uploadImagesWithSignedUrls([file('a.jpg')], context)).rejects.toThrow(
      'Failed to upload file: Bad Gateway'
    );
    expect(createImageMock).not.toHaveBeenCalled();
  });

  it('a failed cat_images entry is non-fatal (pre-existing behavior): URL still returned', async () => {
    fetchMock.mockResolvedValueOnce(signedUrlResponse(1)).mockResolvedValueOnce({ ok: true });
    createImageMock.mockRejectedValue(new Error('rules denied'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const urls = await uploadImagesWithSignedUrls([file('a.jpg')], context);

    expect(urls).toEqual(['https://public/1']);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
