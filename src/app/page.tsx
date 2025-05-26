import MountainViewer from '@/components/MountainViewer';

export default function Home() {
  return (
    <main className="min-h-screen pt-0 px-4 pb-4 md:pt-0 md:px-8 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* <h1 className="text-3xl font-bold mb-8">Mountain Cats</h1> */}
        <MountainViewer />
      </div>
    </main>
  );
}