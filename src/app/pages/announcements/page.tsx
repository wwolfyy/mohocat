import AnnouncementClient from '@/components/AnnouncementClient';

const AnnouncementPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">공지사항</h1>
          <p className="text-gray-600">중요한 공지사항과 안내사항을 확인하세요.</p>
        </div>

        <AnnouncementClient />
      </div>
    </div>
  );
};

export default AnnouncementPage;
