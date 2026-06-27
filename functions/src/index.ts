/**
 * Cloud Functions — 동참(contact) notifications.
 *
 * On a new `contacts/{id}` document, email the mountain's `adminEmail`
 * (configured in config/mountains/mountains.json) so a submission reaches a human.
 *
 * SMTP transport is provider-agnostic (any SMTP server: Gmail, SES, etc.).
 * Credentials come from Firebase params/secrets — never hard-coded. Set them with:
 *   firebase functions:secrets:set SMTP_PASSWORD
 *   firebase deploy --only functions   (prompts for SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_FROM)
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineString, defineInt, defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import * as nodemailer from 'nodemailer';
import mountains from './mountains.generated';

const MOUNTAIN_ID = defineString('MOUNTAIN_ID', { default: 'geyang' });
const SMTP_HOST = defineString('SMTP_HOST');
const SMTP_PORT = defineInt('SMTP_PORT', { default: 587 });
const SMTP_USER = defineString('SMTP_USER');
const SMTP_FROM = defineString('SMTP_FROM', { default: '' });
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');

/** Resolve the notification recipient from the mountain config (source of truth). */
function getAdminEmail(): string {
  const id = MOUNTAIN_ID.value();
  const config = (mountains as Record<string, unknown>)[id] as { adminEmail?: string } | undefined;
  if (!config || typeof config !== 'object' || !config.adminEmail) {
    throw new Error(`adminEmail not configured for mountain "${id}" in mountains.json`);
  }
  return config.adminEmail;
}

export const onContactCreated = onDocumentCreated(
  { document: 'contacts/{contactId}', region: 'asia-northeast3', secrets: [SMTP_PASSWORD] },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('Contact create event carried no data; skipping notification');
      return;
    }

    const contact = snapshot.data() as {
      name?: string;
      phone?: string;
      email?: string;
      message?: string;
    };

    const recipient = getAdminEmail();
    const from = SMTP_FROM.value() || SMTP_USER.value();
    const port = SMTP_PORT.value();

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port,
      secure: port === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASSWORD.value() },
    });

    const body = [
      `이름: ${contact.name ?? '-'}`,
      `전화번호: ${contact.phone ?? '-'}`,
      `이메일: ${contact.email ?? '-'}`,
      '',
      '메시지:',
      contact.message ?? '',
    ].join('\n');

    try {
      await transporter.sendMail({
        from,
        to: recipient,
        subject: `[산냥이집냥이] 새로운 동참 신청 — ${contact.name ?? '익명'}`,
        text: body,
      });
      logger.info(`Contact notification sent to admin for submission ${event.params.contactId}`);
    } catch (error) {
      logger.error('Failed to send contact notification email', error);
      throw error;
    }
  }
);
