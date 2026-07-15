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
  },

  /** 새 공지사항 작성 (src/app/admin/announcements/new/page.tsx). */
  announcementNew: {
    title: '새 공지사항 작성',
    subtitle: '새로운 공지사항을 작성해 보세요.',
  },

  /** 새 입양홍보 작성 (src/app/admin/adoption/new/page.tsx). */
  adoptionNew: {
    title: '새 입양홍보 작성',
    subtitle: '새로 입양 가능한 냥이 소식을 올려 보세요.',
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
      nameOrigin: '작명 사유',
      nameOriginPlaceholder: '이름을 어떻게 짓게 되었는지 적어요...',
      character: '성격',
      sickness: '건강/질병 메모',
      parents: '부모/어미',
      offspring: '자식',
      neutering: '중성화 여부',
      neuteringUnknown: '? (모름)',
      neuteringYes: 'O (중성화 완료)',
      neuteringNo: 'X (중성화 안 함)',
      adoptableLabel: '입양 가능 (입양홍보 갤러리에 표시)',
      adoptionInfo: '입양정보',
      adoptionInfoPlaceholder: '입양 조건, 성격, 건강, 연락 방법 등 입양에 필요한 정보를 적어요...',
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

  /** 급식소 관리 (src/app/admin/points/page.tsx) — feeding-station pins (points collection). */
  points: {
    title: '급식소 관리',
    subtitle: '지도에 표시되는 급식소 위치를 관리해요. 변경하면 곧바로 저장돼요.',
    addNew: '새 급식소 추가',
    picker: {
      label: '위치',
      hint: '지도를 눌러 위치를 정하거나 핀을 끌어서 옮겨요. 아래에 좌표(%)를 직접 입력할 수도 있어요.',
      coords: (x: number, y: number) => `가로 ${x.toFixed(1)}% · 세로 ${y.toFixed(1)}%`,
      xLabel: '가로(%)',
      yLabel: '세로(%)',
    },
    form: {
      editTitle: '급식소 수정',
      addTitle: '새 급식소 추가',
      titleLabel: '제목',
      titlePlaceholder: '예: 정상, 헬기장…',
      description: '설명',
      descriptionPlaceholder: '이 급식소에 대한 메모를 적어요...',
      labelSideHeading: '라벨 위치',
      labelSideHint:
        '핀 제목을 아바타 위/아래 중 어디에 표시할지 기기별로 정해요. 자동이면 화면 가장자리에서 알아서 뒤집혀요.',
      labelSideMobile: '모바일',
      labelSideDesktop: '데스크탑',
      labelAuto: '자동',
      labelAbove: '위',
      labelBelow: '아래',
      save: '저장',
    },
    table: {
      titleCol: '제목',
      position: '위치',
      labelSide: '라벨',
      actions: '관리',
      autoBadge: '자동',
      empty: '등록된 급식소가 없어요.',
    },
    delete: {
      title: '삭제 확인',
      body: '이 급식소를 삭제할까요? 되돌릴 수 없어요.',
      confirm: '삭제',
      /** Blocked because cats still reference this point (dwelling/prev_dwelling). */
      blockedTitle: '삭제할 수 없어요',
      blockedBody: (names: string) =>
        `이 급식소를 거주지로 둔 고양이가 있어 삭제할 수 없어요. 먼저 아래 고양이의 거주지를 바꿔 주세요: ${names}`,
    },
    errors: {
      loadFailed: (msg: string) => `급식소 목록을 불러오지 못했어요: ${msg}`,
      saveFailed: (msg: string) => `급식소를 저장하지 못했어요: ${msg}`,
      deleteFailed: (msg: string) => `급식소를 삭제하지 못했어요: ${msg}`,
      noPosition: '위치를 먼저 지도에서 정해 주세요.',
      noTitle: '제목을 입력해 주세요.',
    },
  },

  /** 사용자 관리 page chrome (src/app/admin/members/page.tsx). */
  members: {
    title: '사용자 관리',
    tabs: {
      users: '사용자',
      roles: '역할',
      permissions: '권한',
      contacts: '문의',
    },
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

  /** 스프레드시트 그리드 (src/components/admin/cat-grid/CatGrid.tsx). */
  catGrid: {
    loadFailed: (msg: string) => `고양이 데이터를 불러오지 못했어요: ${msg}`,
    saveFailed: (msg: string) => `저장하지 못했어요: ${msg}`,
    saved: (n: number) => `${n}마리의 정보를 저장했어요.`,
    noChanges: '변경사항이 없어요.',
    fixFirst: '아래 항목을 먼저 수정해 주세요 (빨간 칸):',
    editHintPre: '셀을 직접 수정한 뒤 ',
    saveAll: '전체 저장',
    editHintPost: '을 누르면 변경된 칸만 저장돼요.',
    unsavedRows: (n: number) => `미저장 ${n}행`,
    discard: '되돌리기',
    searchPlaceholder: '고양이 검색...',
    filterToggle: '필터',
    count: (shown: number, total: number) => `${shown} / ${total}마리`,
    clearFilters: '필터 초기화',
    all: '전체',
    selectRow: '행 선택',
    selectAll: '전체 선택',
    sortHint: '클릭해서 정렬',
    /** Mandatory-field blank messages (red-cell validation). */
    mandatory: {
      dobBlank: '출생연도는 비워둘 수 없어요',
      neuteredBlank: '중성화 여부는 비워둘 수 없어요',
    },
    /** Filter dropdown labels + option text. */
    filters: {
      status: '상태',
      location: '거주지',
      gender: '성별',
      birthYear: '출생연도',
      neutered: '중성화',
      adoptable: '입양가능',
      male: '남 (M)',
      female: '여 (F)',
      yearLabel: (y: number | string) => `${y}년`,
      neuteredYes: 'O (중성화됨)',
      neuteredNo: 'X (중성화 안됨)',
      neuteredUnknown: '? (알 수 없음)',
      adoptableYes: '입양 가능',
      adoptableNo: '입양 대상 아님',
    },
    /** Column-select option labels for the grid's enumerated fields. */
    options: {
      certain: '확실',
      uncertain: '불확실',
    },
    /** Bulk-edit toolbar. */
    bulk: {
      selected: (n: number) => `선택 ${n}개`,
      field: '필드',
      value: '값',
      apply: '적용',
      deselect: '선택 해제',
      selectPlaceholder: '선택...',
      yearPlaceholder: '예: 2020',
      locationPlaceholder: '거주지 입력/선택',
    },
  },

  /** 사진 태깅 (src/app/admin/tag-images/page.tsx). */
  tagImages: {
    title: '사진 태깅',
    loading: '사진을 불러오는 중...',
    serviceBox: {
      title: '서비스 레이어 설정',
      imagesLabel: '사진:',
      imagesValue: '✅ 이미지 서비스 추상화 사용 중',
      operationsLabel: '작업:',
      operationsValue: '✅ 서비스 레이어를 통한 CRUD',
      note: '모든 데이터베이스 작업은 유지보수성과 멀티테넌트 지원을 위해 서비스 레이어를 거쳐요.',
    },
    actions: {
      sync: 'Storage와 동기화',
      syncing: '동기화 중...',
      refresh: '사진 새로고침',
      refreshing: '불러오는 중...',
      autoDateParse: '자동 날짜 인식',
      parsing: '인식 중...',
    },
    stats: {
      total: '전체 사진',
      untagged: '태그 없는 사진',
      tagged: '태그된 사진',
      needDateParse: '날짜 인식 필요',
      processing: (n: number) => `📅 처리 중: ${n}`,
    },
    filters: {
      title: '사진 필터',
      showTagged: (n: number) => `태그된 사진 보기 (${n})`,
      showUntagged: (n: number) => `태그 없는 사진 보기 (${n})`,
      byCreatedDate: '촬영일로 필터',
      showWithoutTimestamp: (n: number) => `촬영일 없는 사진 보기 (${n})`,
      applyDateRange: '날짜 범위 필터 적용',
      from: '시작:',
      to: '끝:',
      selectionDisplay: '선택 및 표시',
      selectAll: '전체 선택',
      clearSelection: (n: number) => `선택 해제 (${n})`,
      sortBy: '정렬:',
      sortCreated: '촬영일',
      sortUploaded: '업로드일',
      newestFirst: '최신순',
      oldestFirst: '오래된순',
      perPage: '페이지당 사진:',
      showingRange: (a: number, b: number, total: number) => `${total}개 중 ${a}-${b} 표시`,
    },
    batch: {
      title: (n: number) => `일괄 작업 (${n}개 선택됨)`,
      tags: '🏷️ 태그',
      clickToSelect: '클릭해서 고양이 선택...',
      saveTags: '태그 저장',
      addsToExisting: '⚠️ 기존 태그에 추가돼요',
      creationDate: '📅 촬영일',
      saveDate: '날짜 저장',
      overwritesDate: '⚠️ 기존 날짜를 덮어써요',
      cancel: '취소',
      saving: '저장 중...',
    },
    grid: {
      noMatch: '현재 필터 조건에 맞는 사진이 없어요.',
      parsingDate: '📅 날짜 인식 중...',
      tagged: '태그됨',
      untagged: '태그 없음',
      uploaded: (d: string) => `업로드: ${d}`,
      created: (d: string) => `촬영: ${d}`,
      invalidDate: '날짜 오류',
      moreCount: (n: number) => `+${n}개 더`,
      previous: '이전',
      next: '다음',
    },
    form: {
      fullSize: '🔍 원본 크기',
      viewFullSize: '원본 크기로 보기',
      uploaded: '업로드:',
      created: '촬영:',
      storage: 'Storage: ',
      unknown: '알 수 없음',
      invalidDate: '날짜 오류',
      nullDate: '없음',
      tags: '태그',
      addMoreCats: '클릭해서 고양이 더 추가',
      selectCats: '클릭해서 고양이 선택',
      selectCatsBtn: '🐱 고양이 선택',
      description: '설명',
      descriptionPlaceholder: '설명을 입력해요...',
      createdDate: '촬영일',
      createdDateHelp: '사진을 원래 촬영/생성한 날짜',
      parseFromFilename: '📅 파일명에서 날짜 인식',
      saveChanges: '변경사항 저장',
      saving: '저장 중...',
      delete: '삭제',
      emptyPrompt: '그리드에서 사진을 선택하면 태깅을 시작할 수 있어요.',
    },
    dateParsing: {
      title: '🤖 자동 날짜 인식',
      supportedFormats: '지원하는 날짜 형식:',
      featureStatus: '기능 상태:',
      statusIndividual: '✅ 개별 날짜 인식 (편집 폼)',
      statusBatch: '✅ 일괄 자동 날짜 인식 (버튼)',
      statusService: '✅ 서비스 레이어 연동',
      readyCount: (n: number) => `📊 ${n}개 사진이 날짜 인식 준비됨`,
    },
    catSelector: {
      title: (batch: boolean) => `고양이 선택 ${batch ? '(일괄 태깅)' : '(개별 사진)'}`,
      search: '고양이 검색...',
      noneInDb: '데이터베이스에 고양이가 없어요',
      noMatch: '검색 결과가 없어요',
      clearAll: '전체 해제',
      done: (n: number) => `완료 (${n}개 선택됨)`,
    },
    lightbox: {
      close: '닫기',
      uploaded: '업로드:',
      created: '촬영:',
      tags: '태그:',
      description: '설명:',
      invalidDate: '날짜 오류',
    },
    alerts: {
      saved: '사진 정보를 저장했어요!',
      saveFailed: (msg: string) => `사진 정보를 저장하지 못했어요: ${msg}`,
      deleteConfirm: '이 사진의 메타데이터를 삭제할까요? (Storage 파일은 그대로 남아요)',
      deleted: '사진 메타데이터를 삭제했어요!',
      deleteFailed: (msg: string) => `사진을 삭제하지 못했어요: ${msg}`,
      batchUpdated: (n: number) => `${n}개 사진을 업데이트했어요!`,
      batchUpdateFailed: (msg: string) => `사진을 업데이트하지 못했어요: ${msg}`,
      tagsUpdated: (n: number) => `${n}개 사진의 태그를 업데이트했어요!`,
      tagsUpdateFailed: (msg: string) => `태그를 업데이트하지 못했어요: ${msg}`,
      dateUpdated: (n: number) => `${n}개 사진의 촬영일을 업데이트했어요!`,
      dateUpdateFailed: (msg: string) => `촬영일을 업데이트하지 못했어요: ${msg}`,
      syncConfirm: '메타데이터를 Storage 파일과 동기화할까요?',
      synced: '동기화를 완료했어요!',
      syncFailed: (msg: string) => `동기화하지 못했어요: ${msg}`,
      loadFailed: (msg: string) => `사진을 불러오지 못했어요: ${msg}`,
      parsedFromFilename: (d: string) => `✅ 파일명에서 날짜를 인식했어요: ${d}`,
      parseFromFilenameFailed: '❌ 파일명에서 날짜를 인식하지 못했어요',
      noImagesNeedParsing:
        '❌ 날짜 인식이 필요한 사진이 없어요.\n\n모든 사진에 이미 촬영일이 있거나, 파일명에 인식 가능한 날짜 패턴이 없어요.',
      autoParseConfirm: (n: number) =>
        `🤖 자동 날짜 인식\n\n사진 파일명에서 촬영일을 인식해 업데이트해요.\n\n인식 가능한 사진 ${n}개를 찾았어요.\n\n⚠️ 데이터베이스가 변경되고 시간이 걸릴 수 있어요.\n\n계속할까요?`,
      parseFailed: (msg: string) => `날짜를 인식하지 못했어요: ${msg}`,
      doneHeader: '🎉 자동 날짜 인식 완료!',
      successLine: (n: number) => `✅ 성공: ${n}개`,
      failLine: (n: number) => `❌ 실패: ${n}개`,
      detailsHeader: '\n📋 상세 결과:\n',
    },
  },

  /** 동영상 태깅 (src/app/admin/tag-videos/page.tsx). */
  tagVideos: {
    title: '동영상 태깅',
    loading: '동영상을 불러오는 중...',
    serviceBox: {
      title: '서비스 레이어 설정',
      videosLabel: '동영상:',
      videosValue: '✅ 비디오 서비스 추상화 사용 중',
      operationsLabel: '작업:',
      operationsValue: '✅ 서비스 레이어를 통한 CRUD',
      note: '모든 데이터베이스 작업은 유지보수성과 멀티테넌트 지원을 위해 서비스 레이어를 거쳐요.',
    },
    actions: {
      sync: 'YouTube와 동기화',
      syncing: '동기화 중...',
      refresh: '동영상 새로고침',
      refreshing: '불러오는 중...',
      autoDateParse: '자동 날짜 인식',
      parsing: '날짜 인식 중...',
    },
    stats: {
      total: '전체 동영상',
      untagged: '태그 없는 동영상',
      tagged: '태그된 동영상',
    },
    filters: {
      showTagged: (n: number) => `태그된 동영상 보기 (${n})`,
      showUntagged: (n: number) => `태그 없는 동영상 보기 (${n})`,
      applyDateRange: '날짜 범위 필터 적용',
      from: '시작:',
      to: '끝:',
      clearDates: '날짜 지우기',
      showWithoutTimestamp: (n: number) => `촬영일 없는 동영상 보기 (${n})`,
      selectAll: '전체 선택',
      clearSelection: (n: number) => `선택 해제 (${n})`,
      sortBy: '정렬:',
      sortCreated: '촬영일',
      sortPublished: '게시일',
      sortUpdated: '메타데이터 수정일',
      newestFirst: '최신순',
      oldestFirst: '오래된순',
      perPage: '페이지당 동영상:',
      showingRange: (a: number, b: number, total: number) => `${total}개 중 ${a}-${b} 표시`,
    },
    batch: {
      title: (n: number) => `일괄 작업 (${n}개 선택됨)`,
      tags: '🏷️ 태그',
      clickToSelect: '클릭해서 고양이 선택...',
      saveTags: '태그 저장',
      saving: '저장 중...',
      updatesYoutube: '⚠️ YouTube에 바로 반영돼요',
      recordingDate: '📅 촬영일',
      saveDate: '날짜 저장',
      playlists: '🎬 재생목록',
      noneSelected: '선택 안 됨',
      moreCount: (n: number) => `+${n}개 더`,
      selectPlaylists: '✏️ 재생목록 선택',
      loading: '불러오는 중...',
      saveInModal: '✅ 모달에서 저장하기',
      cancel: '취소',
    },
    grid: {
      noMatch: '현재 필터 조건에 맞는 동영상이 없어요.',
      parsingDate: '📅 날짜 인식 중...',
      tagged: '태그됨',
      untagged: '태그 없음',
      youtube: 'YouTube',
      storage: 'Storage',
      published: (d: string) => `게시: ${d}`,
      created: (d: string) => `촬영: ${d}`,
      invalidDate: '날짜 오류',
      nullDate: '없음',
      duration: (d: string) => `길이: ${d}`,
      moreCount: (n: number) => `+${n}개 더`,
      previous: '이전',
      next: '다음',
    },
    form: {
      published: '게시:',
      created: '촬영:',
      metadataUpdated: '메타데이터 수정:',
      unknown: '알 수 없음',
      invalidDate: '날짜 오류',
      nullDate: '없음',
      never: '없음',
      youtubeLabel: 'YouTube:',
      viewOnYoutube: 'YouTube에서 보기 →',
      titleYoutube: '제목 (YouTube)',
      titlePlaceholder: '동영상 제목...',
      syncNote: '✏️ 변경하면 YouTube에 저장되고 Firebase에 동기화돼요',
      tagsYoutube: '태그 (YouTube)',
      tagsPlaceholder: '클릭해서 고양이를 선택하거나 직접 입력해요...',
      selectBtn: '🐱 선택',
      descriptionYoutube: 'YouTube 설명',
      descriptionPlaceholder: 'YouTube 동영상 설명...',
      createdTimeYoutube: '촬영일 (YouTube)',
      parseFromTitle: '📅 제목에서 날짜 인식',
      savingYoutube: 'YouTube 업데이트 중...',
      saving: '저장 중...',
      saveChanges: '변경사항 저장',
      saveProcess: '저장 진행:',
      step1Updating: '🔄 YouTube 업데이트 중...',
      step1Done: '✅ YouTube 업데이트 완료',
      step2Waiting: '⏳ YouTube 반영 대기 중...',
      step2Pending: '⏳ 대기 중',
      step2Done: '✅ 변경 반영됨',
      step3Syncing: '🔄 Firebase에 동기화 중...',
      step3Pending: '⏳ 대기 중',
      step3Done: '✅ Firebase 동기화됨',
      playlistManagement: '재생목록 관리',
      currentPlaylists: '현재 재생목록:',
      notInPlaylists: '어떤 재생목록에도 없어요',
      managePlaylists: '📋 재생목록 관리',
      loadingPlaylists: '⏳ 재생목록 불러오는 중...',
      savingChanges: '💾 변경사항 저장 중...',
      playlistNote: '💡 재생목록 변경은 YouTube에 바로 저장되고 자동으로 Firebase에 동기화돼요',
      emptyPrompt: '동영상을 선택하면 메타데이터를 편집할 수 있어요.',
    },
    catSelector: {
      title: (context: string) => {
        switch (context) {
          case 'batch':
            return '고양이 선택 (일괄 태깅)';
          case 'youtube-individual':
            return '고양이 선택 (YouTube 태그 - 개별)';
          case 'youtube-batch':
            return '고양이 선택 (YouTube 태그 - 일괄)';
          default:
            return '고양이 선택 (개별 동영상)';
        }
      },
      search: '고양이 검색...',
      noneInDb: '데이터베이스에 고양이가 없어요',
      noMatch: '검색 결과가 없어요',
      clearAll: '전체 해제',
      done: (n: number) => `완료 (${n}개 선택됨)`,
    },
    playlistSelector: {
      title: (batch: boolean) => `재생목록 선택 ${batch ? '(일괄 작업)' : ''}`,
      savingNote: '재생목록 변경을 YouTube에 저장하고 Firestore에 동기화하는 중...',
      noPlaylists: '재생목록이 없어요. 먼저 재생목록을 만들어 주세요.',
      videoCount: (n: number) => `동영상 ${n}개`,
      cancel: '취소',
      saving: '저장 중...',
      saveChanges: (n: number) => `변경사항 저장 (${n}개 선택됨)`,
    },
    alerts: {
      loadFailed: (msg: string) => `동영상을 불러오지 못했어요: ${msg}`,
      onlyYoutube: 'YouTube 동영상만 이 화면에서 편집할 수 있어요.',
      noChanges: '저장할 변경사항이 없어요.',
      updated: '✅ 동영상 메타데이터를 업데이트했어요!',
      updateFailed: (msg: string) => `❌ 동영상 메타데이터를 업데이트하지 못했어요: ${msg}`,
      batchTagsDone: (success: number, fail: number) => {
        let m = '태그 업데이트를 완료했어요!';
        if (success > 0) m += `\n✅ 성공: ${success}개`;
        if (fail > 0) m += `\n❌ 실패: ${fail}개`;
        return m;
      },
      batchTagsError: '태그를 업데이트하지 못했어요.',
      batchDateDone: (success: number, fail: number) => {
        let m = '촬영일 업데이트를 완료했어요!';
        if (success > 0) m += `\n✅ 성공: ${success}개`;
        if (fail > 0) m += `\n❌ 실패: ${fail}개`;
        return m;
      },
      batchDateError: '촬영일을 업데이트하지 못했어요.',
      syncConfirm:
        'YouTube에서 새 동영상을 찾고 모든 동영상의 메타데이터를 동기화해요.\n\n• Firestore에 없는 새 동영상 찾기\n• 기존 동영상 메타데이터 업데이트\n• 재생목록 정보 동기화\n\n아직 반영되지 않은 최근 변경을 덮어쓸 수 있어요.\n\n계속할까요?',
      noYoutubeToSync: '동기화할 YouTube 동영상이 없어요.',
      syncDone: (n: number) =>
        `YouTube 동기화를 완료했어요!\n\n✅ 새 동영상을 가져왔어요\n✅ ${n}개 동영상의 최신 메타데이터와 재생목록 정보를 업데이트했어요`,
      syncFailed: (msg: string) => `동기화하지 못했어요: ${msg}`,
      noVideosNeedParsing:
        '❌ 날짜 인식이 필요한 동영상이 없어요.\n\n모든 동영상에 이미 촬영일이 있거나, 설명/ID에 인식 가능한 날짜 패턴이 없어요.',
      autoParseConfirm: (n: number) =>
        `🤖 자동 날짜 인식\n\n동영상 설명/ID에서 촬영일을 인식해 업데이트해요.\n\n인식 가능한 동영상 ${n}개를 찾았어요.\n\n⚠️ 데이터베이스가 변경되고 시간이 걸릴 수 있어요.\n\n계속할까요?`,
      doneHeader: '🎉 자동 날짜 인식 완료!',
      successLine: (n: number) => `✅ 성공: ${n}개`,
      failLine: (n: number) => `❌ 실패: ${n}개`,
      detailsHeader: '\n📋 상세 결과:\n',
      parseFailed: (msg: string) => `날짜를 인식하지 못했어요: ${msg}`,
      parsedFromTitle: (d: string) => `✅ 제목에서 날짜를 인식했어요: ${d}`,
      parseFromTitleFailed: '❌ 제목에서 날짜를 인식하지 못했어요',
      playlistSaved: (added: number, removed: number) =>
        `재생목록을 업데이트했어요! ${added}개 추가, ${removed}개 제거.`,
      playlistSavedFailures: (failed: number) =>
        `\n\n참고: ${failed}개 작업이 실패했어요. 콘솔을 확인해 주세요.`,
      playlistSaveFailed: (msg: string) => `재생목록 변경을 저장하지 못했어요: ${msg}`,
    },
  },

  /** 문의(동참 신청) 관리 (src/components/admin/ContactManagement.tsx). */
  contacts: {
    title: '연락처 관리',
    empty: '아직 접수된 동참 신청이 없어요.',
    loadFailed: '연락처를 불러오지 못했어요. 다시 시도해 주세요.',
    columns: {
      createdAt: '접수일',
      name: '이름',
      phone: '전화번호',
      email: '이메일',
      message: '메시지',
    },
  },

  /** 소개 페이지 관리 (src/components/admin/AboutContentEditor.tsx). */
  aboutEditor: {
    title: '소개 페이지 관리',
    subtitle: '소개 페이지의 내용을 관리해요.',
    notFound: '내용을 찾을 수 없어요. 다시 시도해 주세요.',
    saved: '소개 내용을 저장했어요!',
    loadFailed: '소개 내용을 불러오지 못했어요.',
    saveFailed: '소개 내용을 저장하지 못했어요.',
    fields: {
      title: '제목',
      subtitle: '부제',
      mainContent: '본문',
      mainContentPlaceholder: '본문을 입력해요. 줄바꿈은 Enter로 해요.',
      mainPhoto: '대표 사진',
      filename: '파일명',
      altText: '대체 텍스트',
      caption: '사진 설명',
      sections: '섹션',
      addSection: '섹션 추가',
      sectionTitle: (n: number) => `섹션 ${n}`,
      remove: '삭제',
      sectionContentPlaceholder:
        '섹션 내용도 [링크](https://example.com)와 URL 자동 인식을 지원해요.',
    },
    linkHelp: {
      heading: '💡 링크 지원',
      markdownLabel: '마크다운 링크:',
      markdownExample: ' [링크텍스트](https://example.com)',
      autoLabel: '자동 인식:',
      autoExample: ' https://example.com 같은 URL은 자동으로 링크로 바뀌어요',
      catModalLabel: '고양이 모달 링크:',
      catModalExample: ' [catmodal:아롱이]는 “아롱이” 고양이 모달을 열어요',
      imageLabel: '이미지 링크:',
      imageExample: ' [img:사진설명](이미지주소)는 모달에서 이미지를 열어요',
      videoLabel: '동영상 링크:',
      videoExample: ' [video:영상설명](유튜브주소)는 모달에서 동영상을 재생해요',
      lineBreakLabel: '줄바꿈:',
      lineBreakExample: ' Enter를 누르면 새 줄이 돼요',
    },
  },
} as const;
