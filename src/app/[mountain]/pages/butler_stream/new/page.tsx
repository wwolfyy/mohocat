import { getAdminFeedingSpotsService } from '@/services/feeding-spots-admin-service';
import NewPostForm from '@/components/NewPostForm';
import PermissionGate from '@/components/PermissionGate';

interface BasicFeedingSpot {
  id: number;
  name: string;
}

const NewPostPage = async () => {
  // Fetch basic feeding spots at build time using the service directly
  // This avoids unreliable HTTP calls to self during the static build
  let feedingSpots: BasicFeedingSpot[] = [];

  try {
    const feedingSpotsService = getAdminFeedingSpotsService();
    feedingSpots = await feedingSpotsService.getBasicFeedingSpots();
  } catch (error) {
    console.error('Error fetching feeding spots at build time:', error);
  }

  return (
    <PermissionGate
      permissions={['manage-posts', 'write-own-post-feeding']}
      deniedMessage="급식현황에 글을 쓰려면 현장 집사 권한이 필요해요."
    >
      <div className="p-4">
        <h1 className="text-center text-2xl font-bold mb-4">새글 작성</h1>
        <NewPostForm feedingSpots={feedingSpots} />
      </div>
    </PermissionGate>
  );
};

export default NewPostPage;
