import { adminStrings } from '@/constants/adminStrings';

export default function MigrationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{adminStrings.migration.title}</h1>
      <div className="mb-6 h-1 w-12 rounded-full bg-brand" />
      <p className="text-gray-600">{adminStrings.migration.body}</p>
    </div>
  );
}
