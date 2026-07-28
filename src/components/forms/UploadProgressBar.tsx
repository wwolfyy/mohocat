'use client';

/**
 * Video-upload progress for one submit, shared by every composer that uploads video
 * (공지사항 / 입양홍보 / 집사톡).
 *
 * Exists because the upload became worth watching: since the 2026-07-29 switch to a
 * resumable direct-to-Google upload there is no practical size limit, so a submit can
 * legitimately take minutes. Before that the forms only disabled the submit button —
 * fine when nothing over 4.5 MB could be sent at all.
 *
 * ⚠️ **100% is not "done".** The bar tracks bytes leaving the browser; YouTube still
 * has to process the video and `/api/upload-youtube/complete` still has to file and
 * record it. The copy changes at 100% so a full bar with the form still busy reads as
 * expected rather than stuck.
 *
 * Presentational only — the caller owns the number.
 */
interface UploadProgressBarProps {
  /** 0 → 1, or `null` when no video upload is in flight (renders nothing). */
  progress: number | null;
}

const UploadProgressBar = ({ progress }: UploadProgressBarProps) => {
  if (progress === null) {
    return null;
  }

  const percent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  const bytesSent = percent >= 100;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1 text-sm text-gray-700">
        <span>{bytesSent ? 'YouTube에서 처리 중이에요...' : '동영상 업로드 중...'}</span>
        <span className="tabular-nums text-gray-500">{percent}%</span>
      </div>
      <div
        className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="동영상 업로드 진행률"
      >
        <div
          className="h-full bg-primary rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {bytesSent
          ? '거의 다 됐어요. 창을 닫지 말고 잠시만 기다려 주세요.'
          : '창을 닫으면 업로드가 중단돼요.'}
      </p>
    </div>
  );
};

export default UploadProgressBar;
