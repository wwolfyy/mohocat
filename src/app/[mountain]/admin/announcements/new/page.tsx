import NewAnnouncementForm from '@/components/NewAnnouncementForm';
import { adminStrings } from '@/constants/adminStrings';

const NewAnnouncementPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {adminStrings.announcementNew.title}
          </h1>
          <div className="mb-3 h-1 w-12 rounded-full bg-brand" />
          <p className="text-gray-600">{adminStrings.announcementNew.subtitle}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <NewAnnouncementForm />
        </div>
      </div>
    </div>
  );
};

export default NewAnnouncementPage;
