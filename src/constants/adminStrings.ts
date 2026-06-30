/**
 * Centralized admin-facing copy (Korean) — the admin mirror of
 * `src/constants/strings.ts` (handoff-16 §4, unified design + Korean workstream).
 *
 * Convention:
 * - Admin user-facing strings live here, not inline in JSX, so the Korean voice
 *   stays consistent and copy edits happen in one place. Reference as
 *   `adminStrings.<area>.<key>`.
 * - Organized by area (`common`, `nav`, plus one area per admin surface); each
 *   area is populated as its surface is re-skinned + localized.
 * - Voice: warm, friendly-polite Korean (해요체) to match the public side — e.g.
 *   "불러오는 중이에요" over a clipped "로딩". Admin is now under the public brand.
 * - No i18n library — this is a single Korean-locale app.
 */

export const adminStrings = {
  /** Shared labels reused across admin surfaces. */
  common: {
    save: '저장',
    saving: '저장 중...',
    saved: '저장됐어요',
    cancel: '취소',
    delete: '삭제',
    edit: '수정',
    add: '추가',
    close: '닫기',
    confirm: '확인',
    back: '뒤로',
    loading: '불러오는 중...',
    refresh: '새로고침',
    retry: '다시 시도',
    search: '검색',
    none: '없음',
    comingSoon: '준비 중이에요',
    saveChanges: '변경사항 저장',
    error: (msg: string) => `오류: ${msg}`,
    unknownError: '알 수 없는 오류가 발생했어요.',
    loginRequired: '로그인해 주세요.',
  },

  /** Human-readable Korean labels for role keys (shared across role/permission UIs). */
  roleLabels: {
    admin: '관리자',
    'butler-ground': '집사 (현장)',
    'butler-internet': '집사 (온라인)',
    viewer: '방문자',
  } as Record<string, string>,

  /** Top admin navigation (src/app/admin/layout.tsx). */
  nav: {
    dashboard: '대쉬보드',
    appManagement: '앱관리',
    cats: '고양이 관리',
    feedingStations: '급식소 관리',
    winterHouses: '겨울집 관리',
    photos: '사진 관리',
    videos: '동영상 관리',
    posts: '게시물 관리',
    members: '사용자 관리',
    /** Disabled-feature notice (alert on click). */
    notImplemented: (feature: string) => `${feature} 기능은 아직 준비 중이에요.`,
  },

  /** 게시물 관리 (src/app/admin/posts/page.tsx). */
  posts: {
    title: '게시물 관리',
    tabs: {
      feedingStatus: '급식현황',
      butlerTalk: '집사톡',
      announcements: '공지사항',
      adoptionPromotion: '입양홍보',
    },
    adoptionComingSoon: '입양홍보 탭은 준비 중이에요.',
  },

  /** 새 공지사항 작성 (src/app/admin/announcements/new/page.tsx). */
  announcementNew: {
    title: '새 공지사항 작성',
    subtitle: '새로운 공지사항을 작성해 보세요.',
  },

  /** 데이터 마이그레이션 (src/app/admin/migration/page.tsx). */
  migration: {
    title: '데이터 마이그레이션',
    body: '이 페이지는 아직 준비 중이에요. 데이터 마이그레이션은 고양이 관리 페이지에서 할 수 있어요.',
  },

  /** 고양이 관리 (src/app/admin/cats/page.tsx) — copy-heavy CMS surface. */
  cats: {
    title: '고양이 관리',
    subtitle: '고양이 정보를 Firestore에서 바로 관리해요. 변경하면 곧바로 저장돼요.',
    tabs: { card: '카드 편집기', grid: '스프레드시트' },
    searchPlaceholder: '고양이 검색...',
    filtersToggle: '필터',
    addNew: '새 고양이 추가',
    filters: {
      status: '상태로 필터',
      location: '위치로 필터',
      gender: '성별로 필터',
      birthYear: '출생연도로 필터',
      neutering: '중성화로 필터',
      adoptable: '입양 가능 여부로 필터',
      allStatuses: '전체 상태',
      allLocations: '전체 위치',
      allGenders: '전체 성별',
      allYears: '전체 연도',
      all: '전체',
      adoptableYes: '입양 가능',
      adoptableNo: '입양 대상 아님',
      clear: '필터 초기화',
    },
    stats: { total: '전체 고양이', mountain: '산냥이', filtered: '필터 결과' },
    form: {
      editTitle: '고양이 수정',
      addTitle: '새 고양이 추가',
      selectPlaceholder: '선택...',
      name: '이름',
      altName: '다른 이름',
      sex: '성별',
      status: '상태',
      birthYear: '출생연도',
      birthYearPlaceholder: '예: 2020',
      birthYearCertainty: '출생연도 확실성',
      certain: '확실',
      uncertain: '불확실',
      thumbnailUrl: '썸네일 URL',
      currentDwelling: '현재 거주지',
      previousDwelling: '이전 거주지',
      dwellingPlaceholder: '목록에서 선택하거나 새 거주지를 입력해요...',
      noMatches: '일치하는 항목이 없어요',
      description: '설명',
      character: '성격',
      sickness: '건강/질병 메모',
      parents: '부모/어미',
      offspring: '자식',
      neutering: '중성화 여부',
      neuteringUnknown: '? (모름)',
      neuteringYes: 'O (중성화 완료)',
      neuteringNo: 'X (중성화 안 함)',
      adoptableLabel: '입양 가능 (입양홍보 갤러리에 표시)',
      note: '특이사항',
      notePlaceholder: '이 고양이에 대한 특이사항이나 메모를 적어요...',
      saveCat: '저장',
    },
    table: {
      cat: '고양이',
      details: '상세',
      location: '거주지',
      status: '상태',
      actions: '관리',
      current: '현재',
      previous: '이전',
      unknownStatus: '정보 없음',
      bornSuffix: '년 생',
      neuteringPrefix: '중성화',
      emptyFiltered: '필터에 맞는 고양이가 없어요.',
      empty: '고양이가 없어요.',
    },
    delete: {
      title: '삭제 확인',
      body: '이 고양이를 삭제할까요? 되돌릴 수 없어요.',
      confirm: '삭제',
    },
    errors: {
      loadFailed: (msg: string) => `고양이 목록을 불러오지 못했어요: ${msg}`,
      saveFailed: (msg: string) => `고양이를 저장하지 못했어요: ${msg}`,
      deleteFailed: (msg: string) => `고양이를 삭제하지 못했어요: ${msg}`,
    },
  },

  /** 사용자 관리 page chrome (src/app/admin/members/page.tsx). */
  members: {
    title: '사용자 관리',
    tabs: {
      users: '사용자',
      roles: '역할',
      permissions: '권한',
      debug: '권한 디버그',
      contacts: '문의',
    },
    debugToolTitle: '권한 디버그 도구',
  },

  /** 사용자(역할) 관리 (src/components/admin/RoleManagement.tsx). */
  roleManagement: {
    heading: '사용자 관리',
    loadingUsers: '사용자를 불러오는 중...',
    sections: {
      admin: { desc: '모든 기능을 관리할 수 있는 최고 권한이에요.', empty: '관리자가 없어요.' },
      ground: {
        desc: '현장에서 고양이를 돌봐요. 고양이와 게시물을 관리할 수 있어요.',
        empty: '현장 집사가 없어요.',
      },
      internet: {
        desc: '온라인 콘텐츠를 관리해요. 게시물 관리와 통계 열람을 할 수 있어요.',
        empty: '온라인 집사가 없어요.',
      },
      viewer: { desc: '공개 콘텐츠를 볼 수만 있어요.', empty: '방문자가 없어요.' },
    },
    copyId: '전체 ID 복사',
    messages: {
      loadingAll: '모든 사용자를 불러오는 중...',
      loaded: (n: number) => `${n}명의 사용자를 불러왔어요.`,
      loadError: (msg: string) => `사용자를 불러오지 못했어요: ${msg}`,
      assigning: (role: string) => `${role} 역할을 지정하는 중...`,
      assigned: (role: string) => `${role} 역할을 지정했어요!`,
      assignFailed: '역할 지정에 실패했어요. 콘솔을 확인해 주세요.',
    },
  },

  /** 권한 매트릭스 (src/components/admin/RolePermissionConfig.tsx). */
  roleMatrix: {
    title: '권한 매트릭스',
    subtitle: '역할별로 어떤 권한을 가질지 설정해요.',
    loading: '설정을 불러오는 중...',
    permissionHeader: '권한',
    saved: '설정을 저장했어요!',
    saveFailed: '설정을 저장하지 못했어요.',
  },

  /** 리소스 접근 권한 (src/components/admin/ResourcePermissionConfig.tsx). */
  resourceMatrix: {
    title: '리소스 접근 권한',
    subtitle: '각 페이지에 접근하는 데 필요한 권한을 설정해요.',
    loading: '리소스 설정을 불러오는 중...',
    resourceHeader: '페이지 / 리소스',
    saved: '리소스 권한을 저장했어요!',
    saveFailed: '설정을 저장하지 못했어요.',
    requiresTitle: (resource: string, perm: string) => `${resource}에는 ${perm} 권한이 필요해요`,
  },
} as const;
