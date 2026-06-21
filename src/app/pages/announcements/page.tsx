import AnnouncementClient from '@/components/AnnouncementClient';

const AnnouncementPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">공지사항</h1>
          <div className="mt-2 mb-3 h-1 w-12 rounded-full bg-brand" />
          <p className="text-gray-600">중요한 공지사항과 안내사항을 확인하세요.</p>
        </div>

        <AnnouncementClient />
      </div>
    </div>
  );
};

export default AnnouncementPage;
