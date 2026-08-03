/**
 * "Did this person write this?" — the single client-side copy of the authorship
 * test the Firestore rules apply.
 *
 * 🔑 **Two eras, and they must match `firestore.rules`'s `isPostAuthor()`.** A
 * document written since 2026-08-02 carries `authorUid`, the only durable identity.
 * Older ones predate the field and fall back to the email they were authored under —
 * a fallback that is deliberately unreachable once `authorUid` is present, so a
 * changed `username` can never re-open a post.
 *
 * ⚠️ **This is a UX check, never the security boundary.** It decides whether to
 * render 수정 / 삭제; the rules refuse the write independently, so a visitor who
 * hand-crafts a request gains nothing. Keeping it in one place is about the two
 * copies not disagreeing — a UI that offers an action the database will refuse is a
 * worse experience than one that offers nothing.
 *
 * 📌 Applies to **replies** as well as posts: a reply is a document in the same
 * collection, governed by the same rules (§10q).
 */
export interface AuthoredDocument {
  authorUid?: string;
  username?: string;
}

export interface AuthorIdentity {
  uid?: string;
  email?: string | null;
}

export function isAuthoredBy(
  doc: AuthoredDocument | null | undefined,
  user: AuthorIdentity | null | undefined
): boolean {
  if (!doc || !user) return false;

  if (doc.authorUid) {
    return doc.authorUid === user.uid;
  }

  // Legacy era: match on the recorded email. Both sides must be non-empty, or two
  // documents with no author would match each other.
  return Boolean(user.email) && Boolean(doc.username) && doc.username === user.email;
}
