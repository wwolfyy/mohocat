/**
 * 이용약관 (Terms of Use) — service terms + liability disclaimer.
 *
 * Static prose Server Component, sibling to the 개인정보처리방침 page. Grounded in
 * how the app actually works (member sign-up, community posts, video uploads to
 * YouTube). See `docs/compliance/compliance-plan.md`.
 *
 * ⚠️ Not legal advice: have the text reviewed by a Korean legal professional
 * before scaling membership.
 */

export const metadata = {
  title: '이용약관 | 산냥이집냥이',
};

const EFFECTIVE_DATE = '2026년 7월 10일';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function TermsOfUsePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">이용약관</h1>
        <div className="mx-auto mt-1.5 h-0.5 w-8 rounded-full bg-brand" />
      </div>

      <Section title="제1조 (목적)">
        <p>
          이 약관은 산냥이집냥이(이하 &lsquo;서비스&rsquo;)가 제공하는 비영리 커뮤니티 서비스의
          이용과 관련하여 서비스와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정하는
          것을 목적으로 합니다.
        </p>
      </Section>

      <Section title="제2조 (정의)">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>이용자:</strong> 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.
          </li>
          <li>
            <strong>회원:</strong> 서비스에 개인정보를 제공하여 회원가입을 한 자로, 서비스의 정보를
            지속적으로 제공받으며 서비스를 이용할 수 있는 자를 말합니다.
          </li>
          <li>
            <strong>게시물:</strong> 이용자가 서비스에 게시한 글, 사진, 동영상 등 일체의 콘텐츠를
            말합니다.
          </li>
        </ul>
      </Section>

      <Section title="제3조 (약관의 효력 및 변경)">
        <p>
          이 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 서비스는 관련 법령을 위반하지 않는
          범위에서 이 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경 사유를 명시하여 서비스 내에
          공지합니다.
        </p>
      </Section>

      <Section title="제4조 (이용계약의 체결)">
        <p>
          이용계약은 이용자가 이 약관에 동의하고 회원가입을 신청한 후 서비스가 이를 승낙함으로써
          체결됩니다. 회원가입 시 이메일·비밀번호·닉네임·휴대전화번호 등의 정보가 필요하며, 휴대전화
          인증(SMS) 또는 카카오 로그인을 통해 가입할 수 있습니다.
        </p>
        <p>만 14세 미만 아동은 법정대리인의 동의를 받아 이용계약을 체결할 수 있습니다.</p>
      </Section>

      <Section title="제5조 (회원 정보의 관리)">
        <p>
          회원은 로그인 후 마이페이지에서 자신의 정보를 확인·수정할 수 있으며, 회원 정보에 변경이
          있는 경우 이를 최신 상태로 유지할 책임이 있습니다. 회원은 자신의 계정 및 비밀번호를 스스로
          관리해야 하며, 이를 제3자가 이용하도록 하여서는 안 됩니다.
        </p>
      </Section>

      <Section title="제6조 (서비스의 제공 및 변경)">
        <p>
          서비스는 계양산 고양이들에 관한 정보 열람, 커뮤니티 게시물·사진·동영상 작성 및 이용 등의
          기능을 제공합니다. 서비스는 운영상·기술상 필요에 따라 제공 중인 서비스의 전부 또는 일부를
          변경하거나 중단할 수 있습니다.
        </p>
      </Section>

      <Section title="제7조 (게시물의 저작권 및 관리)">
        <p>
          이용자가 작성한 게시물의 저작권은 해당 이용자에게 있습니다. 다만 이용자는 서비스가
          게시물을 서비스 운영·노출을 위해 사용할 수 있도록 허락합니다.
        </p>
        <p>
          이용자가 업로드한 동영상은 이용자의 요청에 따라 YouTube에 업로드되어 <strong>공개</strong>
          될 수 있습니다. 이용자는 콘텐츠가 공개되어도 되는지 업로드 전에 반드시 확인해야 하며,
          타인의 권리를 침해하거나 법령에 위반되는 게시물을 등록해서는 안 됩니다.
        </p>
        <p>
          서비스는 관련 법령 또는 이 약관을 위반하거나 타인의 권리를 침해하는 게시물에 대해 사전
          통지 없이 삭제하거나 게시를 제한할 수 있습니다.
        </p>
      </Section>

      <Section title="제8조 (이용자의 의무)">
        <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>타인의 정보 도용 또는 허위 정보 등록</li>
          <li>타인의 저작권·초상권 등 권리를 침해하는 행위</li>
          <li>음란·폭력적이거나 공서양속에 반하는 게시물 등록</li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
        </ul>
      </Section>

      <Section title="제9조 (이용 제한 및 계약 해지)">
        <p>
          이용자는 언제든지 서비스 내 탈퇴 절차 또는 개인정보 보호책임자에 대한 요청을 통해
          이용계약을 해지(탈퇴)할 수 있습니다. 서비스는 이용자가 이 약관을 위반하는 경우 이용을
          제한하거나 이용계약을 해지할 수 있습니다.
        </p>
      </Section>

      <Section title="제10조 (책임의 제한)">
        <p>
          서비스는 비영리로 운영되며, 관련 법령이 허용하는 범위에서 서비스는 &lsquo;있는
          그대로&rsquo; 제공됩니다. 서비스는 천재지변, 이용자의 귀책, 제3자
          서비스(호스팅·인증·동영상 호스팅 등)의 장애 등 서비스가 통제할 수 없는 사유로 발생한
          손해에 대하여 책임을 지지 않습니다.
        </p>
        <p>
          서비스는 이용자가 게시한 게시물의 신뢰성·정확성 등 내용에 대하여 책임을 지지 않으며,
          이용자 상호 간 또는 이용자와 제3자 간에 발생한 분쟁에 관여하지 않습니다.
        </p>
      </Section>

      <Section title="제11조 (준거법 및 관할)">
        <p>
          이 약관은 대한민국 법령에 따라 규율되고 해석되며, 서비스 이용과 관련하여 분쟁이 발생하는
          경우 관계 법령에 정한 절차에 따른 법원을 관할 법원으로 합니다.
        </p>
      </Section>

      <Section title="제12조 (문의)">
        <p>
          서비스 이용 및 이 약관에 관한 문의는 개인정보처리방침에 기재된 연락처 또는 서비스 내
          문의(동참) 창구를 통해 접수할 수 있습니다.
        </p>
        <p className="text-gray-500">시행일: {EFFECTIVE_DATE}</p>
      </Section>
    </div>
  );
}
