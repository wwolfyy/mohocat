/**
 * Delete a Firebase Auth account that was created as a *side effect* of signing
 * in, for someone we then decline to make a member.
 *
 * Phone and social (Kakao) sign-in mint an Auth account the moment authentication
 * succeeds — there is no "authenticate but don't create" mode. The login flow only
 * afterwards discovers there is no `users/{uid}` profile doc and refuses implicit
 * signup (see `LoginForm.handleCheckUser`). Simply signing out at that point strands
 * an Auth record holding personal data (phone number, or the Kakao email/닉네임) with
 * no consent, no profile doc, and no mechanism that would ever remove it.
 *
 * PIPA gives no basis to retain that, so it is deleted here. Reuses the member
 * self-service withdrawal route (`POST /api/account/delete`), which takes the uid
 * from the verified ID token — a caller can only ever delete themselves — and whose
 * profile-doc delete is a harmless no-op when (as here) no doc exists.
 *
 * ⚠️ Only for people who never consented. The caller's test is whether the account
 * carries a **password credential**: every account here is phone-created (집사등록
 * verifies the phone first — that call creates the Auth user — then links
 * email/password onto it), and SignupForm gates both consent checkboxes before the
 * SMS is sent. So a password means they reached the linking step and did agree;
 * only their profile doc failed to write, which is resumable (re-running 집사등록
 * with the same email+phone completes idempotently). Deleting such an account would
 * destroy a credential belonging to someone who consented.
 */
import type { User } from 'firebase/auth';
import { authHeader } from './authHeader';

export async function deleteImplicitlyCreatedAccount(user: User): Promise<void> {
  try {
    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: await authHeader(user),
    });

    if (!response.ok) {
      // Log the status, never the body — it is an auth surface.
      console.error(
        `Failed to delete implicitly-created account (uid ${user.uid}): HTTP ${response.status}`
      );
    }
  } catch (error) {
    // Deliberately does NOT re-raise, which is a departure from the usual
    // log-and-rethrow convention. The caller's next step is to sign this person
    // out, and its catch block is contractually forbidden from doing so (a failed
    // Firestore read must not log anyone out). Propagating would therefore strand
    // a live session for someone we have just decided cannot join — a worse
    // outcome than a leftover Auth record. The failure is logged loudly instead,
    // and the orphan can be cleared from the Firebase console.
    console.error('Failed to delete implicitly-created account:', error);
  }
}
