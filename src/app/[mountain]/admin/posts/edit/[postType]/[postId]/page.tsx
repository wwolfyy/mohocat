import EditPostForm, { EditablePostType } from '@/components/EditPostForm';

const EDITABLE_POST_TYPES: EditablePostType[] = [
  'butler_stream',
  'butler_talk',
  'announcements',
  'adoption_promotion',
];

const EditPostPage = ({ params }: { params: { postType: string; postId: string } }) => {
  const postType = params.postType as EditablePostType;
  const isValidType = EDITABLE_POST_TYPES.includes(postType);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">게시물 수정</h1>
          <div className="mb-3 h-1 w-12 rounded-full bg-brand" />
          <p className="text-gray-600">게시물의 제목·내용과 미디어 링크를 수정해 보세요.</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {isValidType ? (
            <EditPostForm postType={postType} postId={params.postId} />
          ) : (
            <p className="text-gray-600">지원하지 않는 게시물 종류예요.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPostPage;
