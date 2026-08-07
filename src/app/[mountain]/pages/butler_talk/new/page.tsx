import React from 'react';
import NewButlerTalkForm from '@/components/NewButlerTalkForm';
import PermissionGate from '@/components/PermissionGate';

const NewButlerTalkPage = async () => {
  return (
    <PermissionGate
      permissions={['manage-posts', 'write-own-post-butler']}
      deniedMessage="집사톡에 글을 쓰려면 집사 등록이 필요해요."
    >
      <div className="p-4">
        <h1 className="text-center text-2xl font-bold mb-4">새글 작성</h1>
        <NewButlerTalkForm />
      </div>
    </PermissionGate>
  );
};

export default NewButlerTalkPage;
