/**
 * The confirmation text for a 급식현황 check-in (2026-08-04).
 *
 * 🔑 **Why this is gated at all.** Publishing a 급식현황 post stamps
 * `last_attended` / `last_attended_by` on every ticked 급식소, and a spot keeps
 * only its *latest* visit — the previous one is overwritten, not versioned. So
 * the write is not recoverable from anything the author can reach, and deleting
 * the post afterwards does not put it back (`deletePost` never touches
 * `feeding_spots`). Naming the spots before the write is the only correction
 * opportunity the flow has.
 *
 * Lives here rather than inside the composer so the wording is unit-testable —
 * the spot list is the part that must be right, and it is unreachable through
 * the e2e harness (the emulator seed has no `feeding_spots`).
 */

interface NamedFeedingSpot {
  id: number;
  name: string;
}

/**
 * `datetime-local` gives a zoneless `YYYY-MM-DDTHH:mm`. Render its own
 * components rather than round-tripping through `Date`, which would reinterpret
 * it in the browser's zone and could show an hour other than the one on screen.
 * An unparseable value is passed through — a wrong-looking string in the dialog
 * is better than a silently dropped line.
 */
export function formatVisitTimeForDisplay(value: string): string {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!parts) return value;
  const [, year, month, day, hours, minutes] = parts;
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${hours}:${minutes}`;
}

/**
 * Builds the 확인 body listing exactly which 급식소 records the post will
 * rewrite. Spots are listed in `spots` order (the service reads them ordered by
 * `id`), so the dialog matches the order of the checkboxes above it.
 */
export function buildFeedingCheckInConfirmMessage(
  spots: NamedFeedingSpot[],
  checkedSpotIds: ReadonlySet<number>,
  visitTime: string
): string {
  const checked = spots.filter((spot) => checkedSpotIds.has(spot.id));

  // No tick means no 급식소 write — say so plainly rather than warning about an
  // irreversible change that is not about to happen. This branch also catches
  // the author who meant to tick something and did not.
  if (checked.length === 0) {
    return '선택한 급식소가 없어요. 급식소 방문 기록은 그대로 두고 글만 올릴까요?';
  }

  return [
    `아래 급식소 ${checked.length}곳의 최근 방문 기록이 바뀌어요.`,
    '',
    checked.map((spot) => `· ${spot.name}`).join('\n'),
    '',
    `방문 시간: ${formatVisitTimeForDisplay(visitTime)}`,
    '',
    '⚠️ 급식소는 가장 최근 방문만 남기기 때문에, 글을 올린 뒤에는 되돌릴 수 없어요.',
    '이대로 올릴까요?',
  ].join('\n');
}
