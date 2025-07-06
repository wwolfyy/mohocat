import MountainViewer from "@/components/MountainViewer";
import { getAllPoints } from "@/lib/static-data";

export default async function Home() {
  const points = await getAllPoints();

  return (
    <main
      className="min-h-screen pt-[3.5rem] pb-4 md:pt-0 md:pb-8
                   px-4 md:px-6 lg:px-8"
      data-oid="j:1oinn"
    >
      {/*
           Mobile top padding: pt-[3.5rem], Desktop top padding: md:pt-0.
           Bottom padding: pb-4, Desktop bottom padding: md:pb-8.
           Horizontal padding aligned with header: px-4 (base), md:px-6, lg:px-8.
          */}
      <div data-oid="f4ymkec">
        {/* <h1 className="text-3xl font-bold mb-8">Mountain Cats</h1> */}
        <MountainViewer points={points} data-oid="gs09x5x" />
      </div>
    </main>
  );
}
