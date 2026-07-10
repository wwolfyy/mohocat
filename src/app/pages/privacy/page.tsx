/**
 * 개인정보처리방침 (Privacy Policy) — PIPA Art. 30 disclosure page.
 *
 * Static prose Server Component. Adapted from the KISA/PIPC standard 처리방침
 * structure and grounded in what the app actually collects (see
 * `docs/compliance/compliance-plan.md`).
 *
 * ⚠️ Not legal advice: have the text reviewed by a Korean privacy professional
 * before scaling membership.
 */

export const metadata = {
  title: '개인정보처리방침 | 산냥이집냥이',
};

// 개인정보 보호책임자 / 문의 창구.
const CONTACT_EMAIL = 'rescuezoro@gmail.com';
const PRIVACY_OFFICER = '산냥이집냥이 운영자';
const EFFECTIVE_DATE = '2026년 7월 10일';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">개인정보처리방침</h1>
        <div className="mx-auto mt-1.5 h-0.5 w-8 rounded-full bg-brand" />
      </div>

      <p className="text-sm leading-relaxed text-gray-700">
        산냥이집냥이(이하 &lsquo;서비스&rsquo;)는 「개인정보 보호법」 제30조에 따라 이용자의
        개인정보를 보호하고 관련 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을
        수립·공개합니다. 서비스는 비영리 커뮤니티로 운영됩니다.
      </p>

      <Section title="1. 수집하는 개인정보의 항목 및 수집 방법">
        <p>서비스는 회원가입, 로그인, 문의(동참) 과정에서 다음의 개인정보를 수집합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>이메일 회원가입:</strong> 이메일 주소, 비밀번호, 닉네임(표시 이름), 휴대전화번호
            (SMS 인증)
          </li>
          <li>
            <strong>휴대전화 로그인:</strong> 휴대전화번호(SMS 인증)
          </li>
          <li>
            <strong>카카오 소셜 로그인:</strong> 카카오 계정 프로필 정보(닉네임, 프로필 이미지,
            제공에 동의한 계정 이메일 등 로그인 시 카카오로부터 전달받는 항목)
          </li>
          <li>
            <strong>문의(동참) 서식:</strong> 이름, 휴대전화번호, 이메일 주소, 문의 내용
          </li>
          <li>
            <strong>서비스 이용 과정에서 자동 생성·저장되는 정보:</strong> 계정 식별자(uid), 이메일
            인증 여부, 접속·이용 기록 등
          </li>
        </ul>
        <p>
          수집 방법: 이용자가 회원가입·로그인·문의 화면에서 직접 입력하거나, 카카오 로그인을 통해
          이용자가 동의한 항목을 전달받는 방식으로 수집합니다. 서비스는{' '}
          <strong>주민등록번호를 수집하지 않습니다.</strong>
        </p>
      </Section>

      <Section title="2. 개인정보의 처리 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별 및 인증, 로그인 유지, 부정 이용 방지</li>
          <li>커뮤니티 기능(게시물·사진·동영상 작성 및 이용) 제공</li>
          <li>문의(동참) 접수 및 회신, 이용 권한(아이디) 안내</li>
          <li>공지사항 전달 및 서비스 운영·개선</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 처리 및 보유 기간">
        <p>
          서비스는 원칙적으로 개인정보 수집·이용 목적이 달성되면 지체 없이 파기합니다. 다만 다음의
          경우에는 해당 기간 동안 보유합니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>회원 정보:</strong> 회원 탈퇴 시까지 보유하며,{' '}
            <strong>탈퇴 시 지체 없이 파기</strong>합니다.
          </li>
          <li>
            <strong>문의(동참) 정보:</strong> 문의 처리 완료 후 목적 달성 시 파기합니다.
          </li>
          <li>
            <strong>법령상 보존 의무가 있는 경우:</strong> 관계 법령에서 정한 기간 동안 보관합니다.
          </li>
        </ul>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>
          서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 이용자가 게시물에
          동영상을 업로드하는 경우, 해당 동영상은 이용자의 요청에 따라 YouTube에 업로드되어 공개될
          수 있습니다. 이용자가 게시하는 콘텐츠의 공개 범위는 이용자 본인이 확인·결정해야 합니다.
        </p>
      </Section>

      <Section title="5. 개인정보 처리의 위탁">
        <p>
          서비스는 안정적인 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있으며,
          위탁계약 시 개인정보가 안전하게 관리되도록 필요한 사항을 규정하고 있습니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Google (Firebase):</strong> 회원 인증, 데이터베이스, 이미지 저장 등 백엔드
            인프라
          </li>
          <li>
            <strong>Vercel:</strong> 웹 서비스 호스팅
          </li>
          <li>
            <strong>카카오:</strong> 소셜 로그인(인증)
          </li>
          <li>
            <strong>Google (YouTube):</strong> 이용자가 업로드한 동영상의 호스팅
          </li>
        </ul>
      </Section>

      <Section title="6. 개인정보의 국외 이전">
        <p>
          서비스는 글로벌 클라우드 사업자의 인프라를 이용하므로, 개인정보의 일부가 국외에서
          처리·보관될 수 있습니다. 서비스는 계약의 이행 및 원활한 서비스 제공을 위하여 「개인정보
          보호법」 제28조의8에 따라 본 개인정보처리방침에 이를 공개하는 방식으로, 아래와 같이
          개인정보를 국외로 이전(처리위탁·보관 포함)하고 있습니다.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>이전받는 자:</strong> Google LLC (Firebase, YouTube)
            <ul className="list-[circle] space-y-1 pl-5">
              <li>이전 국가: 미국 등 Google이 운영하는 데이터센터 소재 국가</li>
              <li>
                이전 항목: 계정 인증정보(이메일, 휴대전화번호), 프로필, 게시물 및 업로드 콘텐츠
              </li>
              <li>이전 일시 및 방법: 서비스 이용 시 정보통신망을 통해 전송</li>
              <li>이용 목적: 회원 인증, 데이터베이스·이미지 저장, 동영상 호스팅</li>
              <li>보유·이용 기간: 회원 탈퇴 또는 위탁계약 종료 시까지</li>
            </ul>
          </li>
          <li>
            <strong>이전받는 자:</strong> Vercel Inc.
            <ul className="list-[circle] space-y-1 pl-5">
              <li>이전 국가: 미국</li>
              <li>이전 항목: 서비스 이용 과정에서 처리되는 개인정보</li>
              <li>이전 일시 및 방법: 서비스 이용 시 정보통신망을 통해 전송</li>
              <li>이용 목적: 웹 서비스 호스팅</li>
              <li>보유·이용 기간: 위탁계약 종료 시까지</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="7. 정보주체와 법정대리인의 권리·의무 및 행사 방법">
        <p>
          이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지 및 회원 탈퇴를 요구할
          수 있습니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>정정·열람:</strong> 로그인 후 마이페이지에서 닉네임·이메일·휴대전화번호를 직접
            확인·수정할 수 있습니다.
          </li>
          <li>
            <strong>삭제·탈퇴:</strong> 아래 개인정보 보호책임자에게 요청하거나 서비스 내 탈퇴
            기능을 통해 처리할 수 있습니다.
          </li>
          <li>
            <strong>기타 요구:</strong> 처리정지 등 그 밖의 권리 행사는 아래 연락처로 요청할 수
            있으며, 서비스는 지체 없이 조치합니다.
          </li>
        </ul>
      </Section>

      <Section title="8. 개인정보의 파기 절차 및 방법">
        <p>
          서비스는 보유 기간이 경과하거나 처리 목적이 달성된 개인정보를 지체 없이 파기합니다. 전자적
          파일 형태의 정보는 복구가 불가능한 방법으로 삭제하며, 종이 문서에 기록된 정보는 분쇄하거나
          소각하여 파기합니다.
        </p>
      </Section>

      <Section title="9. 개인정보의 안전성 확보 조치">
        <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>비밀번호 등 인증 정보의 암호화 저장 및 전송 구간 암호화(HTTPS)</li>
          <li>개인정보에 대한 접근 권한 제한 및 권한 관리</li>
          <li>인증 및 데이터 처리 기반 시설의 보안 관리</li>
        </ul>
      </Section>

      <Section title="10. 만 14세 미만 아동의 개인정보 처리">
        <p>
          만 14세 미만 아동이 회원으로 가입하는 경우, 서비스는 법정대리인의 동의를 받아 개인정보를
          처리합니다. 법정대리인은 아동의 개인정보에 대한 열람·정정·삭제 및 처리정지를 요구할 수
          있습니다.
        </p>
      </Section>

      <Section title="11. 개인정보 보호책임자">
        <p>
          서비스는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한 이용자의
          문의·불만·피해 구제를 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>개인정보 보호책임자:</strong> {PRIVACY_OFFICER}
          </li>
          <li>
            <strong>문의:</strong> {CONTACT_EMAIL}
          </li>
        </ul>
      </Section>

      <Section title="12. 권익침해 구제 방법">
        <p>개인정보 침해로 인한 상담·신고가 필요한 경우 아래 기관에 문의할 수 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보분쟁조정위원회 (privacy.go.kr / 국번 없이 1833-6972)</li>
          <li>개인정보침해신고센터 (privacy.kisa.or.kr / 국번 없이 118)</li>
          <li>대검찰청 사이버수사과 (spo.go.kr / 국번 없이 1301)</li>
          <li>경찰청 사이버수사국 (ecrm.police.go.kr / 국번 없이 182)</li>
        </ul>
      </Section>

      <Section title="13. 개인정보처리방침의 변경">
        <p>
          이 개인정보처리방침은 법령·서비스의 변경에 따라 내용이 추가·삭제·수정될 수 있으며, 변경 시
          서비스 내 공지를 통해 알립니다.
        </p>
        <p className="text-gray-500">시행일: {EFFECTIVE_DATE}</p>
      </Section>
    </div>
  );
}
