import { getAdminFeedingSpotsService } from "@/services/feeding-spots-admin-service";
import NewPostForm from "@/components/NewPostForm";

interface BasicFeedingSpot {
  id: number;
  name: string;
}

const NewPostPage = async () => {
  // Fetch basic feeding spots at build time using the service directly
  // This avoids HTTP calls to self during build which fails in Docker
  let feedingSpots: BasicFeedingSpot[] = [];

  try {
    const feedingSpotsService = getAdminFeedingSpotsService();
    feedingSpots = await feedingSpotsService.getBasicFeedingSpots();
  } catch (error) {
    console.error('Error fetching feeding spots at build time:', error);
  }

  return (
    <div className="p-4" data-oid="qvvqsgw">
      <h1 className="text-center text-2xl font-bold mb-4" data-oid="01xkqxf">
        새글 작성
      </h1>
      <NewPostForm feedingSpots={feedingSpots} data-oid="i9344cf" />
    </div>
  );
};

export default NewPostPage;
