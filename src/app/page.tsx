import MountainViewer from '@/components/MountainViewer';

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mountain Cats</h1>
        <MountainViewer />
      </div>
    </main>
  );
}