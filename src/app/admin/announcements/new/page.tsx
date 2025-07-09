import NewAnnouncementForm from "@/components/NewAnnouncementForm";

const NewAnnouncementPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            새 공지사항 작성
          </h1>
          <p className="text-gray-600">
            새로운 공지사항을 작성하세요.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <NewAnnouncementForm />
        </div>
      </div>
    </div>
  );
};

export default NewAnnouncementPage;
