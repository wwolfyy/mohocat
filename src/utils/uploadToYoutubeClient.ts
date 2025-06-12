// Client-side utility to upload a video to the server-side YouTube upload API
export async function uploadVideoToYoutubeClient(
  file: File,
  title: string,
  description: string
): Promise<{ videoId: string }> {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('title', title);
  formData.append('description', description);

  const res = await fetch('/api/upload-youtube', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to upload video');
  }

  return res.json();
}
