import MountainViewer from '@/components/MountainViewer';
import { getAllPoints, getAllCats } from '@/lib/static-data';

export default async function Home() {
  const [points, cats] = await Promise.all([
    getAllPoints(),
    getAllCats()
  ]);

  return (
    <main className="min-h-screen pt-[3.5rem] pb-4 md:pt-0 md:pb-8 
                   px-4 sm:px-6 lg:px-8"> 
                   {/* 
                     Mobile top padding: pt-[3.5rem], Desktop top padding: md:pt-0.
                     Bottom padding: pb-4, Desktop bottom padding: md:pb-8.
                     Horizontal padding aligned with header: px-4 (base), sm:px-6, lg:px-8.
                   */}
      <div> 
        {/* <h1 className="text-3xl font-bold mb-8">Mountain Cats</h1> */}
        <MountainViewer points={points} cats={cats} />
      </div>
    </main>
  );
}