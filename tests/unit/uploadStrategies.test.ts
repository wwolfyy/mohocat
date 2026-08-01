/**
 * Unit coverage for the injectable upload strategies (complexity-retirement
 * P1.3). The strategies are the lift targets the P2/P3 form migrations swap in,
 * so this pins their contract before any form depends on them: storage paths,
 * request shape, result mapping, and fail-loud error propagation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User } from 'firebase/auth';

const createImageMock = vi.fn();

vi.mock('@/services', () => ({
  getImageService: () => ({ createImage: createImageMock }),
}));

import {
  uploadVideoToYouTube,
  uploadVideoItems,
  uploadImagesWithSignedUrls,
  createUploadProgressTracker,
} from '@/components/forms/uploadStrategies';

const file = (name: string) => new File(['x'], name, { type: 'application/octet-stream' });

/**
 * Stand-in for the signed-in Firebase user the strategies now take: both the
 * YouTube-upload and signed-URL routes are permission-gated, so the strategies
 * attach this user's ID token. Only `getIdToken()` is exercised.
 */
const testUser = { getIdToken: async () => 'test-id-token' } as unknown as User;

/**
 * Stand-in for the browser's XMLHttpRequest, which the byte leg uses (fetch cannot
 * report request upload progress). Tests drive it through the static fields: what to
 * respond with, and which `loaded` values to emit as progress before completing.
 */
class FakeXhr {
  static instances: FakeXhr[] = [];
  static response = { status: 200, statusText: 'OK', responseText: '{"id":"abc"}' };
  /** `loaded` byte values emitted as upload progress before `onload`. */
  static progressEvents: number[] = [];
  /** When set, fail the transport instead of completing. */
  static failWith: 'error' | 'abort' | null = null;

  static reset() {
    FakeXhr.instances = [];
    FakeXhr.response = { status: 200, statusText: 'OK', responseText: '{"id":"abc"}' };
    FakeXhr.progressEvents = [];
    FakeXhr.failWith = null;
  }

  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number }) => void) | null } =
    {
      onprogress: null,
    };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown = null;
  status = 0;
  statusText = '';
  responseText = '';

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  send(body: unknown) {
    this.body = body;
    FakeXhr.instances.push(this);

    queueMicrotask(() => {
      for (const loaded of FakeXhr.progressEvents) {
        this.upload.onprogress?.({ lengthComputable: true, loaded });
      }

      if (FakeXhr.failWith === 'error') return this.onerror?.();
      if (FakeXhr.failWith === 'abort') return this.onabort?.();

      this.status = FakeXhr.response.status;
      this.statusText = FakeXhr.response.statusText;
      this.responseText = FakeXhr.response.responseText;
      this.onload?.();
    });
  }
}

/** A file of a given byte size, so progress fractions are meaningful. */
const sizedFile = (name: string, bytes: number) =>
  new File(['x'.repeat(bytes)], name, { type: 'video/mp4' });

describe('uploadVideoToYouTube (shared YouTube strategy — resumable, direct-to-Google)', () => {
  const fetchMock = vi.fn();
  const SESSION_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=xyz';

  beforeEach(() => {
    fetchMock.mockReset();
    FakeXhr.reset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Our two API legs: open the session, then record the result. The middle leg (the
   * bytes) goes to Google over `FakeXhr`, never through fetch.
   */
  const mockApi = (videoUrl = 'https://youtu.be/abc') => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/upload-youtube') {
        return { ok: true, json: async () => ({ sessionUrl: SESSION_URL }) };
      }
      return { ok: true, json: async () => ({ videoUrl }) };
    });
  };

  const bodyOf = (callIndex: number) =>
    JSON.parse(fetchMock.mock.calls[callIndex][1].body as string);

  it('opens a session with the metadata, then returns the video URL', async () => {
    mockApi();

    const url = await uploadVideoToYouTube(file('v.mp4'), {
      title: '공지사항 동영상',
      description: '설명',
      tags: '공지사항',
      user: testUser,
    });

    expect(url).toBe('https://youtu.be/abc');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [url0, init0] = fetchMock.mock.calls[0];
    expect(url0).toBe('/api/upload-youtube');
    expect(init0.method).toBe('POST');
    expect(init0.headers).toMatchObject({ Authorization: 'Bearer test-id-token' });
    expect(bodyOf(0)).toMatchObject({
      fileName: 'v.mp4',
      fileSize: 1,
      mimeType: 'application/octet-stream',
      title: '공지사항 동영상',
      description: '설명',
      tags: '공지사항',
    });
  });

  /**
   * The regression that matters: a 48 MB video used to be POSTed through our own API
   * and rejected by Vercel's 4.5 MB body cap before the handler ran. The file must go
   * to Google's session URL and nowhere else.
   */
  it('PUTs the file itself to the Google session URL, never through our API', async () => {
    const video = sizedFile('big.mp4', 12);
    mockApi();

    await uploadVideoToYouTube(video, { title: 't', description: 'd', user: testUser });

    expect(FakeXhr.instances).toHaveLength(1);
    const xhr = FakeXhr.instances[0];
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe(SESSION_URL);
    expect(xhr.body).toBe(video);
    // No ID token is handed to Google — the session URI is the capability.
    expect(xhr.headers).toEqual({ 'Content-Type': 'video/mp4' });

    // Our own API only ever receives JSON metadata.
    for (const call of fetchMock.mock.calls) {
      expect(typeof call[1].body).toBe('string');
    }
  });

  it('records the upload with the new video id and its playlists', async () => {
    mockApi('https://youtu.be/xyz');
    FakeXhr.response = { status: 200, statusText: 'OK', responseText: '{"id":"xyz"}' };

    await uploadVideoToYouTube(file('v.mp4'), {
      title: 't',
      description: 'd',
      createdTime: '2026-02-01',
      playlistIds: ['PLmountain', 'PLadoption'],
      user: testUser,
    });

    const [url1, init1] = fetchMock.mock.calls[1];
    expect(url1).toBe('/api/upload-youtube/complete');
    expect(init1.headers).toMatchObject({ Authorization: 'Bearer test-id-token' });
    expect(bodyOf(1)).toMatchObject({
      videoId: 'xyz',
      fileName: 'v.mp4',
      createdTime: '2026-02-01',
      // 입양홍보 files into two: its mountain's playlist and the shared one.
      playlistIds: ['PLmountain', 'PLadoption'],
    });
  });

  it('sends an empty playlist list when the mountain has no playlist yet', async () => {
    mockApi();

    await uploadVideoToYouTube(file('v.mp4'), {
      title: 't',
      description: 'd',
      playlistIds: [],
      user: testUser,
    });

    expect(bodyOf(1).playlistIds).toEqual([]);
  });

  it('reports byte progress for its own file, settling on the full size', async () => {
    mockApi();
    FakeXhr.progressEvents = [25, 50];
    const seen: number[] = [];

    await uploadVideoToYouTube(sizedFile('v.mp4', 100), {
      title: 't',
      description: 'd',
      user: testUser,
      onBytesUploaded: (loaded) => seen.push(loaded),
    });

    // The trailing 100 is the settle-on-complete step: the last progress event can
    // arrive before the request finishes, which would leave a bar stuck short.
    expect(seen).toEqual([25, 50, 100]);
  });

  it('throws with statusText + response body when opening the session fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      text: async () => 'quota exceeded',
    });

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('Failed to upload video: Internal Server Error - quota exceeded');
  });

  it('throws when Google rejects the bytes, without calling the complete route', async () => {
    mockApi();
    FakeXhr.response = { status: 413, statusText: 'Payload Too Large', responseText: 'too big' };

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('Failed to upload video: Payload Too Large - too big');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * A transport failure is status 0 and nothing more: it cannot distinguish bytes
   * that never arrived from bytes that arrived behind a response the browser was
   * not allowed to read. The message must not claim the upload failed outright —
   * that wording sent the 2026-07-29 CORS diagnosis looking at the network first.
   */
  it('throws without claiming the upload failed when the transport gives no answer', async () => {
    mockApi();
    FakeXhr.failWith = 'error';

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('may still have been uploaded');
  });

  it('throws when the session route responds ok but without a session URL', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('No upload session returned from upload');
  });

  it('throws when Google accepts the bytes but returns no video id', async () => {
    mockApi();
    FakeXhr.response = { status: 200, statusText: 'OK', responseText: '{}' };

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('No video ID returned from upload');
  });

  it('throws when the complete route responds ok but without a videoUrl (P3 guard)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/upload-youtube') {
        return { ok: true, json: async () => ({ sessionUrl: SESSION_URL }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    await expect(
      uploadVideoToYouTube(file('v.mp4'), { title: 't', description: 'd', user: testUser })
    ).rejects.toThrow('No video URL returned from upload');
  });
});

/**
 * The per-item batch strategy every composer uses. Its whole reason to exist is
 * that each video carries its OWN title and description — the shape it replaced
 * took `File[]` plus one shared pair, so a post with three videos put the same
 * title on all three.
 */
describe('uploadVideoItems (per-item batch upload)', () => {
  const fetchMock = vi.fn();
  const SESSION_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=xyz';

  beforeEach(() => {
    fetchMock.mockReset();
    FakeXhr.reset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockApi = (videoUrl = 'https://youtu.be/abc') => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/upload-youtube') {
        return { ok: true, json: async () => ({ sessionUrl: SESSION_URL }) };
      }
      return { ok: true, json: async () => ({ videoUrl }) };
    });
  };

  /** Metadata sent to the session route, one entry per uploaded video, in order. */
  const sessionBodies = () =>
    fetchMock.mock.calls
      .filter(([url]) => url === '/api/upload-youtube')
      .map(([, init]) => JSON.parse(init.body as string));

  const item = (name: string, title = '', description = '') => ({
    file: file(name),
    title,
    description,
  });

  it('maps several items to their URLs in order', async () => {
    fetchMock.mockImplementation(async (url: string, init: { body: unknown }) => {
      const { fileName } = JSON.parse(init.body as string);
      if (url === '/api/upload-youtube') {
        return { ok: true, json: async () => ({ sessionUrl: SESSION_URL }) };
      }
      return { ok: true, json: async () => ({ videoUrl: `https://youtu.be/${fileName}` }) };
    });

    const urls = await uploadVideoItems([item('1.mp4'), item('2.mp4')], {
      fallbackTitle: 't',
      user: testUser,
    });

    expect(urls).toEqual(['https://youtu.be/1.mp4', 'https://youtu.be/2.mp4']);
  });

  it('gives each video its OWN title and description', async () => {
    mockApi();

    await uploadVideoItems(
      [item('1.mp4', '산책하는 냥이', '첫 번째'), item('2.mp4', '밥 먹는 냥이', '두 번째')],
      { fallbackTitle: '글 제목', user: testUser }
    );

    expect(sessionBodies().map((body) => [body.title, body.description])).toEqual([
      ['산책하는 냥이', '첫 번째'],
      ['밥 먹는 냥이', '두 번째'],
    ]);
  });

  /**
   * Only the untitled ones get numbered. Numbering every video would rename the
   * titles someone deliberately typed.
   */
  it('numbers only the untitled videos, leaving typed titles verbatim', async () => {
    mockApi();

    await uploadVideoItems([item('1.mp4', '내가 쓴 제목'), item('2.mp4'), item('3.mp4')], {
      fallbackTitle: '글 제목',
      user: testUser,
    });

    expect(sessionBodies().map((body) => body.title)).toEqual([
      '내가 쓴 제목',
      '글 제목 (Part 1)',
      '글 제목 (Part 2)',
    ]);
  });

  it('a lone untitled video takes the fallback with no Part suffix', async () => {
    mockApi();

    await uploadVideoItems([item('1.mp4', '내가 쓴 제목'), item('2.mp4')], {
      fallbackTitle: '글 제목',
      user: testUser,
    });

    expect(sessionBodies().map((body) => body.title)).toEqual(['내가 쓴 제목', '글 제목']);
  });

  it('treats a whitespace-only title as untitled', async () => {
    mockApi();

    await uploadVideoItems([item('1.mp4', '   ')], { fallbackTitle: '글 제목', user: testUser });

    expect(sessionBodies()[0].title).toBe('글 제목');
  });

  /**
   * The batch runs its uploads in parallel, so progress has to be tracked per file
   * and re-summed. Accumulating a running total would count each event on top of the
   * previous one and race past 100%.
   */
  it('aggregates progress across files as one fraction', async () => {
    mockApi();
    FakeXhr.progressEvents = [50];
    const fractions: number[] = [];

    await uploadVideoItems(
      [
        { file: sizedFile('1.mp4', 100), title: '', description: '' },
        { file: sizedFile('2.mp4', 100), title: '', description: '' },
      ],
      {
        fallbackTitle: 't',
        user: testUser,
        onProgress: (fraction: number) => fractions.push(fraction),
      }
    );

    // Two 100-byte files: each reports 50 then settles at 100, over a 200-byte total.
    expect(fractions[fractions.length - 1]).toBe(1);
    expect(Math.max(...fractions)).toBe(1);
    expect(fractions.every((fraction) => fraction > 0 && fraction <= 1)).toBe(true);
  });
});

describe('createUploadProgressTracker', () => {
  it('sums concurrent per-file byte counts rather than accumulating them', () => {
    const fractions: number[] = [];
    const reporterFor = createUploadProgressTracker(
      [sizedFile('a.mp4', 100), sizedFile('b.mp4', 300)],
      (fraction) => fractions.push(fraction)
    );

    const a = reporterFor(0)!;
    const b = reporterFor(1)!;

    a(50); // 50 / 400
    b(100); // (50 + 100) / 400
    a(100); // (100 + 100) / 400 — replaces a's 50, does not add to it
    b(300); // (100 + 300) / 400

    expect(fractions).toEqual([0.125, 0.375, 0.5, 1]);
  });

  it('asks for no progress events when there is no callback or nothing to measure', () => {
    expect(createUploadProgressTracker([sizedFile('a.mp4', 10)])(0)).toBeUndefined();
    // A zero-byte total would divide by zero.
    expect(createUploadProgressTracker([], () => {})(0)).toBeUndefined();
  });
});

describe('uploadImagesWithSignedUrls (signed-URL strategy, Family A)', () => {
  const fetchMock = vi.fn();

  const context = {
    mountainId: 'geyang',
    tags: ['테스트냥이이'],
    createdTime: '2026-02-01',
    uploadedBy: 'admin@example.com',
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

    const urls = await uploadImagesWithSignedUrls(
      [{ file: file('a.jpg'), description: '본문' }],
      context
    );

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

  // 촬영일 must never be invented. 공지사항 / 입양홍보 have no 촬영일 field at all and
  // send '' (useSimpleContentForm), which used to fall through to the upload moment —
  // recording every photo as having been taken the day it was uploaded. Worse than the
  // video equivalent, because `cat_images` has no upstream to correct it: nothing ever
  // overwrites a wrong date here. See DEBUG_LOG 2026-08-02.
  it('stores no 촬영일 when none is known, rather than the upload moment', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === '/api/generate-signed-url' ? signedUrlResponse(1) : { ok: true }
    );
    createImageMock.mockResolvedValue('img-id');

    await uploadImagesWithSignedUrls([{ file: file('IMG_1234.HEIC'), description: '' }], {
      ...context,
      createdTime: '', // exactly what the two composers without a date field send
    });

    expect(createImageMock.mock.calls[0][0].createdTime).toBeNull();
  });

  it('stores a supplied 촬영일 as UTC midnight of that calendar day', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === '/api/generate-signed-url' ? signedUrlResponse(1) : { ok: true }
    );
    createImageMock.mockResolvedValue('img-id');

    await uploadImagesWithSignedUrls([{ file: file('a.jpg'), description: '' }], {
      ...context,
      createdTime: '2026-03-15',
    });

    // Calendar date in, calendar date out — no KST shift (DEBUG_LOG 2026-07-27).
    const stored = createImageMock.mock.calls[0][0].createdTime as Date;
    expect(stored.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('gives each photo its OWN description, not one shared caption', async () => {
    // Uploads run in Promise.all, so both signed-URL requests fire before either
    // PUT — key the mock on the URL rather than on call order.
    let issued = 0;
    fetchMock.mockImplementation(async (url: string) =>
      url === '/api/generate-signed-url' ? signedUrlResponse((issued += 1)) : { ok: true }
    );
    createImageMock.mockResolvedValue('img-id');

    await uploadImagesWithSignedUrls(
      [
        { file: file('a.jpg'), description: '첫 번째 사진' },
        // Left empty on purpose: saved empty rather than inheriting anything.
        { file: file('b.jpg'), description: '' },
      ],
      context
    );

    const descriptions = createImageMock.mock.calls.map((call) => call[0].description);
    expect(descriptions).toEqual(['첫 번째 사진', '']);
  });

  /**
   * Overwrite protection (2026-07-30). The object path is the filename verbatim, so
   * a repeated name used to replace the earlier post's photo in place. Two rejections
   * mean the same thing to the user and both must say so in Korean: 409 from our
   * route's `exists()` check, and 412 from GCS when a concurrent upload wins the race
   * between that check and the PUT.
   */
  it('surfaces the route’s Korean message when the file name is already taken (409)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'DUPLICATE_FILE_NAME',
        fileName: 'a.jpg',
        message: '이미 "a.jpg"과 같은 이름의 파일이 있어요. 파일 이름을 바꿔서 다시 올려주세요.',
      }),
    });

    await expect(
      uploadImagesWithSignedUrls([{ file: file('a.jpg'), description: '본문' }], context)
    ).rejects.toThrow('이미 "a.jpg"과 같은 이름의 파일이 있어요');
    // Nothing was written: no PUT, no cat_images entry.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createImageMock).not.toHaveBeenCalled();
  });

  /**
   * 🔒 **Regression guard, 2026-07-30.** The PUT goes cross-origin to the bucket, so
   * any header that is not CORS-safelisted turns it into a preflighted request —
   * answered from the bucket's own CORS `responseHeader` allow-list, which code
   * cannot influence. Sending `x-goog-if-generation-match` here (the atomic
   * duplicate-name precondition) blocked **every** image upload from every deployed
   * origin. If a future change adds a header to this request, this test should fail
   * before a deploy does.
   */
  it('sends only Content-Type on the PUT, so the upload is never preflighted', async () => {
    fetchMock.mockResolvedValueOnce(signedUrlResponse(1)).mockResolvedValueOnce({ ok: true });
    createImageMock.mockResolvedValue('img-id');

    await uploadImagesWithSignedUrls([{ file: file('a.jpg'), description: '본문' }], context);

    expect(Object.keys(fetchMock.mock.calls[1][1].headers)).toEqual(['Content-Type']);
  });

  it('throws when the signed-URL request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Forbidden' });

    await expect(
      uploadImagesWithSignedUrls([{ file: file('a.jpg'), description: '본문' }], context)
    ).rejects.toThrow('Failed to get signed URL: Forbidden');
  });

  it('throws when the PUT upload fails (adopted ok-check)', async () => {
    fetchMock
      .mockResolvedValueOnce(signedUrlResponse(1))
      .mockResolvedValueOnce({ ok: false, statusText: 'Bad Gateway' });

    await expect(
      uploadImagesWithSignedUrls([{ file: file('a.jpg'), description: '본문' }], context)
    ).rejects.toThrow('Failed to upload file: Bad Gateway');
    expect(createImageMock).not.toHaveBeenCalled();
  });

  it('a failed cat_images entry is non-fatal (pre-existing behavior): URL still returned', async () => {
    fetchMock.mockResolvedValueOnce(signedUrlResponse(1)).mockResolvedValueOnce({ ok: true });
    createImageMock.mockRejectedValue(new Error('rules denied'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const urls = await uploadImagesWithSignedUrls(
      [{ file: file('a.jpg'), description: '본문' }],
      context
    );

    expect(urls).toEqual(['https://public/1']);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
