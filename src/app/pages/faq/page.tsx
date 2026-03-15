'use client';

import React from 'react';
import FAQAccordion from '@/components/FAQ';

const FAQPage = () => {
  const faqItems = [
    {
      question: "'ERR_BLOCKED_BY_CLIENT' 라는 오류가 브라우저 콘솔에 나타납니다. 무슨 오류인가요?",
      answer: (
        <div className="space-y-3" data-oid="ezxli.c">
          <p data-oid="ppk-svp">
            이 오류는 브라우저의 광고 차단기가 Firebase의 실시간 데이터베이스 연결을 방해할 때
            나타납니다. 완전히 무해하며 애플리케이션의 핵심 기능에는 영향을 주지 않습니다.
          </p>
          <p data-oid="xw4v58g">
            <strong data-oid="g-8chky">발생 원인:</strong> 광고 차단기가 때때로 Firebase의 WebSocket
            연결을 차단하는데, 이는 URL에 추적과 유사한 매개변수가 포함되어 있기 때문입니다.
          </p>
          <p data-oid="hqope1z">
            <strong data-oid="xkpvhjv">영향:</strong> 앱은 완벽하게 작동합니다 - 여전히 동영상
            업로드, 게시물 작성, 콘텐츠 보기가 가능합니다. 다른 사용자가 콘텐츠를 게시할 때 실시간
            업데이트만 놓칠 수 있습니다.
          </p>
          <p data-oid="nfcr1fa">
            <strong data-oid="78h4r..">해결 방법:</strong> 실시간 업데이트를 원한다면 광고 차단기
            설정에서 이 사이트를 허용 목록에 추가하는 것을 고려해보세요. 그렇지 않으면 새 콘텐츠를
            보기 위해 페이지를 새로고침하면 됩니다.
          </p>
        </div>
      ),
    },
    {
      question: '동영상이나 이미지를 어떻게 업로드하나요?',
      answer: (
        <div className="space-y-3" data-oid="37rzvv8">
          <p data-oid="3hug938">
            동영상을 업로드하려면 관리자의 승인이 필요합니다. 먼저 동참 서식을 작성한 다음 회신을
            기다려 주세요. 아이디를 포함한 회신이 오면 먼저 로그인 한 후:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4" data-oid="pao.01b">
            <li data-oid="trcouwq">게시판 페이지로 이동</li>
            <li data-oid="mouectr">"새글 작성" 클릭</li>
          </ol>
          <p data-oid="uorr5_x">
            동영상이 있는 경우 YouTube에 업로드되어 게시물에 삽입됩니다. 동영상 크기에 따라 몇
            초에서 몇 분 정도 걸릴 수 있습니다.
          </p>
        </div>
      ),
    },
    {
      question: '어떤 동영상 형식이 지원되나요?',
      answer:
        '플랫폼은 MP4, MOV, AVI 및 기타 표준 형식을 포함한 일반적인 동영상 형식을 지원합니다. 동영상은 YouTube에 업로드되므로 YouTube에서 지원하는 모든 형식이 지원됩니다.',
    },
    {
      question: '같은 게시물에 이미지와 동영상을 모두 업로드할 수 있나요?',
      answer:
        '네! 동영상과 여러 이미지를 모두 포함하는 게시물을 만들 수 있습니다. 동영상은 클릭 가능한 썸네일로 표시되고, 모든 이미지는 그 아래 갤러리에 표시됩니다.',
    },
    {
      question: '동영상 업로드가 왜 이렇게 오래 걸리나요?',
      answer: (
        <div className="space-y-3" data-oid="a7.fj0a">
          <p data-oid="d4g9sbp">동영상 업로드는 여러 단계를 포함합니다:</p>
          <ul className="list-disc list-inside space-y-1 ml-4" data-oid="h-0cpmh">
            <li data-oid="rsqsruu">파일 처리 및 YouTube로 업로드</li>
            <li data-oid=".yvdlbn">YouTube 자체의 처리 및 인코딩</li>
            <li data-oid="hjb38hd">썸네일 및 메타데이터 생성</li>
          </ul>
          <p data-oid="5krz:1b">
            큰 동영상은 당연히 더 오래 걸립니다. 업로드 중에는 브라우저를 닫지 말고 기다려 주세요.
          </p>
        </div>
      ),
    },

    {
      question: '동영상 업로드가 실패하면 어떻게 해야 하나요?',
      answer: (
        <div className="space-y-3" data-oid="6zxad1k">
          <p data-oid="7ch79k.">동영상 업로드가 실패하면 다음 단계를 시도해보세요:</p>
          <ul className="list-disc list-inside space-y-1 ml-4" data-oid="m5.m7:g">
            <li data-oid="6ipgs.0">인터넷 연결 확인</li>
            <li data-oid="u9d6lfs">동영상 파일이 손상되지 않았는지 확인</li>
            <li data-oid="d2b2s1d">더 작은 파일 크기나 다른 형식으로 시도</li>
            <li data-oid="l-_qh_0">페이지를 새로고침하고 다시 시도</li>
          </ul>
          <p data-oid="a.vln2v">
            YouTube 서비스나 우리 웹사이트 데이터베이스의 일시적인 문제로 오류가 발생할 수 있습니다.
          </p>
        </div>
      ),
    },
    {
      question: '업로드한 동영상이 공개되나요?',
      answer:
        '네, 이 플랫폼을 통해 업로드된 동영상은 YouTube에서 공개됩니다. 콘텐츠가 공개되어도 되는 것인지 업로드 전에 확인 해주세요.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-oid=".cu79eq">
      <div className="text-center mb-8" data-oid="95icw2l">
        <h1 className="text-3xl font-bold text-gray-900 mb-4" data-oid="r68ap9s">
          자주 묻는 질문
        </h1>
      </div>

      <FAQAccordion items={faqItems} data-oid="h8mmdv." />

      <div className="mt-12 p-6 bg-blue-50 rounded-lg" data-oid="so07wo1">
        <h2 className="text-xl font-semibold text-blue-900 mb-3" data-oid=":q66i-o">
          더 궁금한 것이 있나요?
        </h2>
        <p className="text-blue-800" data-oid="jtzt1c9">
          TBD.
        </p>
      </div>
    </div>
  );
};

export default FAQPage;
