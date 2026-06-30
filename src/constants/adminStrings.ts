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
  },

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
} as const;
