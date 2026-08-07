/**
 * Verify the SMTP configuration the 동참 (contact) notification uses — WITHOUT sending mail.
 *
 * WHY THIS EXISTS: `/api/contact` records the contact first and treats the email as a
 * best-effort side-effect (`route.ts:137-145`), because failing the request would prompt a
 * resubmit and duplicate the record. That is the right call, but it means a broken SMTP
 * config is **invisible from every direction**:
 *   - the visitor sees 메시지가 전송되었습니다 either way (the page checks only `success`);
 *   - the route returns `emailDelivered: false` and **nothing consumes that field**;
 *   - `.env.test` sets no SMTP vars, so every e2e run takes the "not configured" branch —
 *     the suite cannot catch this and is not meant to.
 * So the only signal is a line in the Vercel function log, and the only way to check a
 * credential before trusting it is this script. (2026-08-06: two real submissions were
 * recorded with no email sent; Gmail was answering `535-5.7.8`.)
 *
 * It mirrors `sendNotification()` exactly — same env vars, same guard, same transport
 * options — then calls `transporter.verify()`, which opens the connection, authenticates
 * and disconnects.
 *
 * ⚠️ It NEVER calls `sendMail`. Nothing is delivered to anyone, so it is safe to run
 * against production credentials as often as you like. (Gmail may briefly throttle after
 * many consecutive *failed* auths — that is Gmail, not this script.)
 *
 * ⚠️ It never prints a credential. The password is reported only as a length plus the
 * shape checks that catch the mistakes that actually happen.
 *
 * Usage:
 *   npm run smtp:verify                    # uses .env.local, then .env
 *   SMTP_USER=… SMTP_PASSWORD=… node scripts/maintenance/smtp-verify.js
 *
 * 📌 To check what PRODUCTION uses, you must pass the values Vercel holds — this reads
 * your local env, and the two drift independently. Vercel injects env vars at build time,
 * so a dashboard edit does not reach a running deployment until you redeploy.
 */

'use strict';

const path = require('path');
const nodemailer = require('nodemailer');

const MOUNTAINS_PATH = path.resolve(__dirname, '../../config/mountains/mountains.json');

/**
 * Report the recipient side of the notification. `sendNotification` throws when the active
 * mountain has no `adminEmail`, which fails identically to a bad password from the caller's
 * point of view — so a script that only checked auth would still leave you guessing.
 */
function checkRecipients() {
  const config = require(MOUNTAINS_PATH);
  const missing = Object.entries(config)
    .filter(([id]) => !id.startsWith('_'))
    .filter(([, mountain]) => !mountain.adminEmail)
    .map(([id]) => id);

  if (missing.length > 0) {
    console.log(
      `⚠️  adminEmail is MISSING for: ${missing.join(', ')} — a submission on those ` +
        `mountains throws before it reaches SMTP.\n`
    );
  }
}

/** Shape checks on the credential, printed without ever revealing it. */
function reportConfig({ host, port, user, pass, from }) {
  console.log(`  SMTP_HOST     : ${host}`);
  console.log(`  SMTP_PORT     : ${port} (secure/implicit TLS: ${port === 465})`);
  console.log(`  SMTP_USER     : set, ${user.length} chars`);
  console.log(`  SMTP_PASSWORD : set, ${pass.length} chars`);
  console.log(`  SMTP_FROM     : set, ${from.length} chars\n`);

  // Gmail silently REWRITES a From it does not own, so a mismatch is not an error — it is
  // a no-op that still reports success. That makes it worth failing loudly here instead.
  if (from !== user) {
    console.log(
      '⚠️  SMTP_FROM !== SMTP_USER. Gmail rewrites a From address it does not own, so an\n' +
        '    unverified alias sends fine and simply ignores the header you set.\n'
    );
  }

  // A Gmail App Password is 16 characters. Gmail's UI shows it as four groups of four,
  // and the groups are display only — the spaces are not part of the secret.
  if (/\s/.test(pass)) {
    console.log(
      '⚠️  SMTP_PASSWORD contains whitespace. If this is a Gmail App Password, remove the\n' +
        '    spaces — the 4×4 grouping in the UI is presentation, not part of the value.\n'
    );
  }
  if (pass.includes('#')) {
    console.log(
      '🔴 SMTP_PASSWORD contains "#". In a .env file dotenv strips an inline `# comment`,\n' +
        '    so this may look fine locally — but the VERCEL DASHBOARD STORES VALUES VERBATIM.\n' +
        '    A value pasted there with its trailing comment authenticates as the whole string.\n'
    );
  }
  if (!/\s/.test(pass) && pass.length !== 16) {
    console.log(
      `📌 SMTP_PASSWORD is ${pass.length} chars; a Gmail App Password is 16. Fine for another\n` +
        `    provider — worth a second look if this is meant to be Gmail.\n`
    );
  }
}

/** Translate the failure into the thing that is actually wrong. */
function explain(error) {
  const response = String(error.response || error.message || '');

  if (error.code === 'EAUTH' || response.includes('535')) {
    return [
      'The host refused the credentials. For Gmail this is 535-5.7.8, which does NOT say',
      'whether the user or the password is the wrong half. Check, in this order:',
      '  1. 2-Step Verification is ON for the account in SMTP_USER. App Passwords cannot',
      '     exist without it, and turning it off REVOKES every one already issued.',
      '  2. The App Password was generated while signed in as that exact address, not a',
      '     different Google account.',
      '  3. The App Password has not been revoked (a password change revokes them all).',
      '  4. The value carries no trailing comment or quotes — see the warnings above.',
    ].join('\n');
  }
  if (['ETIMEDOUT', 'ECONNREFUSED', 'ESOCKET'].includes(error.code)) {
    return `Could not establish a session with ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}. Check SMTP_HOST/SMTP_PORT and that outbound SMTP is not blocked.`;
  }
  if (error.code === 'ENOTFOUND') {
    return `SMTP_HOST does not resolve. Check it for a typo (Gmail is smtp.gmail.com).`;
  }
  return 'Unrecognised failure — the raw error is above.';
}

async function main() {
  // Read from process.env, exactly as the route does, so this checks what the app checks.
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT) || 587;
  const from = process.env.SMTP_FROM || user;

  console.log('\nSMTP configuration check — authenticates only, sends NO mail.\n');

  checkRecipients();

  // The same guard as sendNotification(): without these three the route logs
  // "SMTP not configured" and the submission is recorded with no email.
  if (!host || !user || !pass) {
    const unset = [!host && 'SMTP_HOST', !user && 'SMTP_USER', !pass && 'SMTP_PASSWORD'].filter(
      Boolean
    );
    console.log(`🔴 NOT CONFIGURED — unset: ${unset.join(', ')}`);
    console.log(
      '\n   /api/contact takes its "SMTP not configured" branch: the contact is still\n' +
        '   recorded and visible in 동참 management, but no email is sent and the visitor\n' +
        '   is told the message went through.\n'
    );
    process.exitCode = 1;
    return;
  }

  reportConfig({ host, port, user, pass, from });

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log(`✅ AUTH OK — ${host} accepted the credentials.\n`);
    console.log(
      '📌 This proves the credentials work FROM HERE. It says nothing about Vercel, which\n' +
        '   holds its own copy and injects it at BUILD time — a dashboard edit needs a\n' +
        '   redeploy to reach a running deployment.\n'
    );
  } catch (error) {
    console.log('🔴 AUTH FAILED');
    console.log(`   code     : ${error.code}`);
    console.log(`   response : ${String(error.response || error.message).split('\n')[0]}\n`);
    console.log(explain(error));
    console.log('');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nsmtp-verify failed to run:');
  console.error(error);
  process.exitCode = 1;
});
