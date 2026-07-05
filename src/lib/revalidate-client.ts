import type { User } from 'firebase/auth';

/**
 * Best-effort on-demand revalidation of the §7a baked public pages, called from
 * the admin UI after a successful mutation (cats or feeding-station points).
 * Attaches the Firebase ID token (the route is members-only).
 *
 * INTENTIONALLY does not throw: the mutation it follows has already committed to
 * Firestore, so a revalidation hiccup must not surface as a failed save. The
 * time-based ISR backstop (`REVALIDATE_SECONDS`) catches any missed call — this
 * is the documented hybrid-freshness contract, not silent error-swallowing.
 * Failures are logged.
 */
export async function triggerPublicRevalidate(user: User | null): Promise<void> {
  try {
    if (!user) {
      console.error('Revalidate skipped: no authenticated user');
      return;
    }
    const idToken = await user.getIdToken();
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) {
      console.error(`Revalidate request failed (${response.status}); ISR backstop will catch up`);
    }
  } catch (error) {
    console.error(
      'Revalidate request errored (mutation still saved); ISR backstop will catch up:',
      error
    );
  }
}
