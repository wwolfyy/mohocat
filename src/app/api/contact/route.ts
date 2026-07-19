/**
 * POST /api/contact — 동참(contact) form submission (Variant A).
 *
 * Flow: verify the submitter's Firebase ID token → write the contact via the Admin SDK
 * (server-side, bypassing client rules) → email the mountain's `adminEmail` over SMTP so
 * a submission reaches a human. The admin also sees it in the Contact Management tab.
 *
 * SMTP transport is provider-agnostic (configured for Gmail today). Credentials come from
 * env vars (never committed, never logged). The submitter's contact details are PII and are
 * never logged.
 */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { db, auth } from '@/lib/firebase-admin';
import { getMountainConfig } from '@/utils/config';
import { getRequestMountainId } from '@/lib/tenant';

// nodemailer needs the Node.js runtime (not the Edge runtime).
export const runtime = 'nodejs';

const COLLECTION_NAME = 'contacts';

// Field caps — reject oversized input to limit abuse/spam.
const LIMITS = { name: 100, phone: 50, email: 200, message: 5000 } as const;

interface ContactBody {
  name: string;
  phone: string;
  email?: string;
  message: string;
}

/** Validate + normalize the request body. Returns the clean payload or an error message. */
function parseBody(raw: unknown): { data: ContactBody } | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid request body' };
  }
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !phone || !message) {
    return { error: 'Missing required field (name, phone, message)' };
  }
  if (
    name.length > LIMITS.name ||
    phone.length > LIMITS.phone ||
    email.length > LIMITS.email ||
    message.length > LIMITS.message
  ) {
    return { error: 'A field exceeds its maximum length' };
  }

  return { data: { name, phone, ...(email ? { email } : {}), message } };
}

/** Best-effort admin notification. Throws on send failure so the caller can decide. */
async function sendNotification(contact: ContactBody, mountainId: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT) || 587;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    // Operational guard: without SMTP creds (e.g. local dev) the submission is still
    // recorded and visible in Contact Management. Surface that we skipped the email.
    console.warn('SMTP not configured (SMTP_HOST/USER/PASSWORD); skipping contact notification');
    throw new Error('SMTP not configured');
  }

  const recipient = getMountainConfig(mountainId).adminEmail;
  if (!recipient) {
    throw new Error('adminEmail not configured for the active mountain');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const text = [
    `이름: ${contact.name}`,
    `전화번호: ${contact.phone}`,
    `이메일: ${contact.email ?? '-'}`,
    '',
    '메시지:',
    contact.message,
  ].join('\n');

  await transporter.sendMail({
    from,
    to: recipient,
    subject: `[산냥이집냥이] 새로운 동참 신청 — ${contact.name}`,
    text,
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the Firebase ID token — submission is members-only (server-enforced).
    const authHeader = request.headers.get('authorization') ?? '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    try {
      await auth.verifyIdToken(match[1]);
    } catch (error) {
      console.error('Contact submission: ID token verification failed');
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // 2. Validate the body.
    const parsed = parseBody(await request.json());
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const contact = parsed.data;

    // 3. Write via the Admin SDK (bypasses client rules).
    await db.collection(COLLECTION_NAME).add({
      ...contact,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 4. Notify the admin. The contact is already recorded, so an email failure must not
    //    fail the request (that would prompt a resubmit → duplicate record). Log + flag it.
    let emailDelivered = true;
    try {
      await sendNotification(contact, getRequestMountainId(request));
    } catch (error) {
      emailDelivered = false;
      console.error('Contact recorded but admin notification failed:', error);
    }

    return NextResponse.json({ success: true, emailDelivered });
  } catch (error) {
    console.error('Error processing contact submission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}
