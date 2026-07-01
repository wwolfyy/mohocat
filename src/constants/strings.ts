/**
 * Centralized user-facing copy (Korean) — App-Wide Redesign Phase D.
 *
 * Convention:
 * - User-facing strings for the auth flow and 집사메뉴(mypage) live here, not
 *   inline in JSX, so the Korean voice stays consistent and copy edits happen in
 *   one place. Reference as `strings.<area>.<key>`.
 * - Organized by area (`common`, `auth`, `login`, `mypage`); each area is
 *   populated as its surface is localized (D1–D4).
 * - Voice: warm, friendly-polite Korean (해요체) to match the landing copy.
 * - Vendor names use their Korean form (예: 카카오톡); vendor colors are unchanged.
 * - No i18n library — this is a single Korean-locale app.
 */

export const strings = {
  /** Shared labels reused across multiple surfaces. */
  common: {
    confirm: '확인',
    cancel: '취소',
    close: '닫기',
    save: '저장',
    loading: '불러오는 중...',
  },

  /** Auth modals (D1) + auth forms / nav (D2) — src/components/auth/. */
  auth: {
    logout: {
      title: '로그아웃',
      confirm: '로그아웃 할까요?',
      signedInAs: '로그인 계정:',
      submit: '로그아웃',
      submitting: '로그아웃 중...',
      failed: '로그아웃에 실패했어요. 잠시 후 다시 시도해 주세요.',
    },
    emailVerification: {
      title: '이메일 인증',
      body: (email: string) =>
        `아직 이메일 주소(${email})가 인증되지 않았어요. 인증 링크를 보내 드릴까요?`,
      later: '나중에',
      send: '인증 메일 보내기',
    },
    userNotFound: {
      title: '계정을 찾을 수 없어요',
      description: '입력하신 정보와 연결된 계정을 찾지 못했어요.',
      noteLabel: '안내',
      note: '이미 이메일이나 전화번호로 등록한 계정이 있다면, 먼저 그 방법으로 로그인해 주세요. 그런 다음 「내 집사 정보」에서 구글·카카오 계정을 직접 연결할 수 있어요.',
      createPrompt: '처음이시라면, 새 계정을 만들어 볼까요?',
      create: '새 계정 만들기',
      useDifferent: '다른 방법으로 로그인',
    },
    passwordReset: {
      title: '비밀번호 재설정',
      description:
        '등록하신 이메일 주소를 입력하시면, 비밀번호를 재설정할 수 있는 링크를 보내 드려요.',
      emailLabel: '이메일 주소',
      emailPlaceholder: '이메일을 입력해 주세요',
      submit: '재설정 링크 보내기',
      submitting: '보내는 중...',
      success:
        '비밀번호 재설정 링크를 이메일로 보내 드렸어요. 몇 분 안에 보이지 않으면 스팸함도 확인해 주세요.',
      backToLogin: '로그인으로 돌아가기',
      errors: {
        generic: '비밀번호 재설정 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
        maskedSent: '이 이메일로 등록된 계정이 있다면 재설정 링크를 보내 드렸어요.',
        invalidEmail: '올바른 이메일 주소를 입력해 주세요.',
      },
    },
    kakao: {
      initialTitle: '카카오톡 로그인 안내',
      initialBody:
        '카카오톡으로 로그인하려면, 먼저 저희 사이트에 집사 등록을 하신 뒤 카카오톡 계정을 연결해 두셔야 해요.',
      proceed: '계속하기',
      checkTitle: '계정 확인',
      checkBody: '이미 카카오톡 계정을 내 계정에 연결하셨나요?',
      yes: '네, 연결했어요',
      no: '아니요, 아직이에요',
      guidanceTitle: '계정 연결 방법',
      guidanceBody:
        '이메일이나 전화번호로 먼저 로그인해 주세요. 그런 다음 「내 집사 정보」의 연결된 계정에서 카카오톡 계정을 연결할 수 있어요.',
      gotIt: '알겠어요',
      // User-facing Kakao sign-in failures. Detailed diagnostics are logged to
      // the console; users only ever see these friendly Korean messages.
      errors: {
        cancelled: '카카오톡 로그인이 취소됐어요. 다시 시도해 주세요.',
        popupBlocked: '팝업이 차단됐어요. 팝업 차단을 해제하고 다시 시도해 주세요.',
        timeout: '연결 시간이 초과됐어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
        accountExists: '이미 다른 방법으로 가입된 이메일이에요. 원래 방법으로 로그인해 주세요.',
        generic: '카카오톡 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',
      },
    },
    nav: {
      logIn: '로그인/등록',
      myPage: '내 집사 정보',
      signOut: '로그아웃',
    },
    phoneLogin: {
      phoneLabel: '전화번호',
      testHint: '테스트 번호: +1 650-555-1234 (인증번호: 123456)',
      sendCode: '인증번호 받기',
      sendingCode: '인증번호 보내는 중...',
      codeLabel: '인증번호',
      verify: '인증하고 로그인',
      verifying: '인증 중...',
      backToPhone: '전화번호 다시 입력',
      errors: {
        invalidPhone: '올바른 전화번호를 입력해 주세요.',
        invalidPhoneFirebase: '전화번호가 올바르지 않아요.',
        missingPhone: '전화번호를 입력해 주세요.',
        quotaExceeded: '인증 문자 발송 한도를 초과했어요. 잠시 후 다시 시도해 주세요.',
        sendFailed: '인증번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
        invalidCodeFormat: '6자리 인증번호를 입력해 주세요.',
        invalidCode: '인증번호가 올바르지 않아요.',
        verifyFailed: '인증에 실패했어요. 잠시 후 다시 시도해 주세요.',
        recaptchaExpired: '인증이 만료됐어요. 다시 시도해 주세요.',
      },
    },
  },

  /** Login page(s) (D3) + LoginForm/SignupForm (D3a). */
  login: {
    heading: '로그인',
    signInHeading: '로그인',
    signUpHeading: '집사등록',
    tabLogin: '로그인',
    tabSignup: '집사등록',
    // SocialLoginButton.tsx (D3a)
    social: {
      continueGoogle: 'Google로 로그인',
      continueKakao: '카카오톡으로 로그인',
      signingInGoogle: 'Google로 로그인 중...',
      signingInKakao: '카카오톡으로 로그인 중...',
      descGoogle: 'Google 계정으로 로그인',
      descKakao: '카카오톡 계정으로 로그인',
    },
    // LoginForm.tsx (D3a)
    form: {
      socialTitle: '소셜 계정으로 로그인',
      socialSubtitle: '원하는 방법을 선택해 주세요',
      kakaoSuccess: '카카오톡으로 로그인했어요!',
      or: '또는',
      emailSectionTitle: '이메일로 로그인',
      emailLabel: '이메일 주소',
      emailPlaceholder: '이메일 주소를 입력해 주세요',
      passwordLabel: '비밀번호',
      passwordPlaceholder: '비밀번호를 입력해 주세요',
      forgotPassword: '비밀번호를 잊으셨나요?',
      submit: '이메일로 로그인',
      submitting: '로그인 중...',
      phoneSectionTitle: '전화번호로 로그인',
      helpText: '로그인에 문제가 있나요? 관리자에게 문의해 주세요.',
      loadingForm: '로그인 폼을 불러오는 중...',
      verificationSentAlert: (email: string) =>
        `${email}로 인증 메일을 보냈어요! 이메일을 확인하신 뒤 다시 로그인해 주세요.`,
      verificationSendFailed: '인증 메일을 보내지 못했어요.',
      errors: {
        invalidCredential: '이메일 또는 비밀번호가 올바르지 않아요. 다시 확인해 주세요.',
        userNotFound: '이 이메일로 등록된 계정을 찾을 수 없어요.',
        wrongPassword: '비밀번호가 올바르지 않아요. 다시 시도해 주세요.',
        generic: '로그인에 실패했어요. 입력하신 정보를 다시 확인해 주세요.',
      },
    },
    // SignupForm.tsx (D3a)
    signup: {
      successTitle: '계정이 만들어졌어요!',
      successWelcome: (name: string) => `${name}님, 환영해요!`,
      successRedirecting: '잠시 후 이동할게요...',
      nicknameLabel: '닉네임 (표시 이름)',
      nicknamePlaceholder: '어떻게 불러 드릴까요?',
      emailLabel: '이메일 주소',
      passwordLabel: '비밀번호',
      confirmPasswordLabel: '비밀번호 확인',
      phoneLabel: '전화번호',
      phoneHint: '이 번호로 인증번호를 보내 드려요.',
      sendCode: '전화번호 인증하고 계속하기',
      sending: '보내는 중...',
      summaryName: '이름:',
      summaryEmail: '이메일:',
      summaryPhone: '전화번호:',
      codeLabel: '인증번호',
      complete: '집사등록 완료',
      creating: '계정 만드는 중...',
      backToDetails: '정보 입력으로 돌아가기',
      loadingForm: '집사등록 폼을 불러오는 중...',
      errors: {
        fillAll: '모든 항목을 입력해 주세요.',
        passwordMismatch: '비밀번호가 일치하지 않아요.',
        passwordTooShort: '비밀번호는 6자 이상이어야 해요.',
        invalidPhone: '올바른 전화번호를 입력해 주세요.',
        invalidCodeFormat: '6자리 인증번호를 입력해 주세요.',
        sendCodeFailed: '인증번호를 보내지 못했어요. 번호를 다시 확인해 주세요.',
        verificationFailed: '인증에 실패했어요. 다시 시도해 주세요.',
        completeFailed: '집사등록을 완료하지 못했어요.',
        phoneLinkedOther: (email: string) =>
          `이 전화번호는 이미 다른 계정(${email})에 연결되어 있어요. 해당 이메일로 로그인하거나 다른 번호를 사용해 주세요.`,
      },
    },
  },

  /** 집사메뉴 / mypage (D4) — src/app/mypage/. */
  mypage: {
    title: '내 집사 정보',
    signOut: '로그아웃',
    profile: {
      heading: '프로필',
      nicknameLabel: '닉네임',
      noNickname: '닉네임 없음',
      edit: '수정',
      nicknameUpdated: '닉네임을 변경했어요!',
      nicknameUpdateFailed: (msg: string) => `닉네임 변경에 실패했어요: ${msg}`,
      emailLabel: '이메일',
      noEmail: '이메일 없음',
      change: '변경',
      passwordReauthPrompt: '계속하려면 비밀번호를 입력해 주세요.',
      currentPasswordPlaceholder: '현재 비밀번호',
      reauthFailed: (msg: string) => `본인 확인에 실패했어요: ${msg}`,
      newEmailPlaceholder: '새 이메일 주소',
      sendVerification: '인증 메일 보내기',
      emailVerificationSentAlert: (email: string) =>
        `${email}로 인증 메일을 보냈어요. 메일의 링크를 눌러 변경을 완료해 주세요.`,
      emailVerificationFailed: (msg: string) => `인증 메일을 보내지 못했어요: ${msg}`,
      emailVerificationSent: '인증 메일을 보냈어요!',
      passwordLabel: '비밀번호',
      resetPassword: '비밀번호 재설정',
      phoneLabel: '전화번호',
      noPhone: '전화번호 없음',
      newPhonePlaceholder: '새 전화번호',
      sendSms: '인증번호 받기',
      codePlaceholder: '인증번호',
      verifyAndUpdate: '확인하고 변경',
      phoneUpdated: '전화번호를 변경했어요!',
      phoneCodeFailed: (msg: string) => `인증번호를 보내지 못했어요: ${msg}`,
      phoneRequiresRecentLogin:
        '보안을 위해, 전화번호를 변경하기 전에 로그아웃 후 다시 로그인해 주세요.',
      phoneUpdateFailed: (msg: string) => `전화번호 변경에 실패했어요: ${msg}`,
    },
    linkedAccounts: {
      heading: '연결된 계정',
      kakaoName: '카카오톡',
      connected: '연결됨',
      notConnected: '연결 안 됨',
      processing: '처리 중...',
      disconnect: '연결 해제',
      connect: '연결하기',
      disconnectConfirm: '카카오톡 연결을 해제할까요?',
      operationFailed: (msg: string) => `작업에 실패했어요: ${msg}`,
    },
  },
} as const;
