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

  console.log('Uploading video to YouTube with title:', title);
  console.log('Sending request to /api/upload-youtube with file:', file.name);

  const res = await fetch('/api/upload-youtube', {
    method: 'POST',
    body: formData,
  });

  console.log('Response status:', res.status);

  if (!res.ok) {
    const error = await res.json();
    console.error('Error response from API:', error);

    if (error.error && error.error.message.includes('exceeded the number of videos')) {
      throw new Error('You have exceeded your YouTube upload quota. Please try again later.');
    }

    throw new Error(error.error || 'Failed to upload video');
  }

  const responseData = await res.json();
  console.log('Response data from API:', responseData);

  return responseData;
}
