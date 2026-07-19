import AnnouncementClient from '@/components/AnnouncementClient';

const AnnouncementPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">공지사항</h1>
          <div className="mt-1.5 mb-2 h-0.5 w-8 rounded-full bg-brand" />
          <p className="text-sm text-gray-500">중요한 공지사항과 안내사항을 확인하세요.</p>
        </div>

        <AnnouncementClient />
      </div>
    </div>
  );
};

export default AnnouncementPage;
