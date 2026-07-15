/**
 * Phone-OTP helper for the Auth emulator.
 *
 * The Firebase Auth emulator disables real reCAPTCHA/app-verification, so
 * `signInWithPhoneNumber` proceeds without a challenge and the SMS "code" is made
 * retrievable over a REST endpoint instead of being sent. This helper reads the
 * most recent code the emulator generated for a given phone number, so a spec can
 * complete the OTP step end-to-end.
 *
 * Docs: https://firebase.google.com/docs/emulator-suite/connect_auth#phone_auth
 * (`GET /emulator/v1/projects/{projectId}/verificationCodes`).
 */
import { expect } from '@playwright/test';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-mohocat';

interface VerificationCode {
  phoneNumber: string;
  sessionInfo: string;
  code: string;
}

/**
 * Poll the emulator for the latest OTP issued to `phoneNumber`. The emulator
 * appends codes, so the last matching entry is the freshest. Polls because the
 * code lands a beat after `signInWithPhoneNumber` resolves the confirmation.
 */
export async function getLatestPhoneCode(phoneNumber: string): Promise<string> {
  const url = `http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/verificationCodes`;

  let latest: string | undefined;
  await expect
    .poll(
      async () => {
        const res = await fetch(url);
        if (!res.ok) return undefined;
        const body = (await res.json()) as { verificationCodes?: VerificationCode[] };
        const matches = (body.verificationCodes ?? []).filter((c) => c.phoneNumber === phoneNumber);
        latest = matches.at(-1)?.code;
        return latest;
      },
      {
        timeout: 10_000,
        message: `No emulator verification code appeared for ${phoneNumber}`,
      }
    )
    .toMatch(/^\d{6}$/);

  return latest as string;
}
