# 산냥이집냥이 — Compliance Plan

_Drafted 2026-06-14. Workstream **closed 2026-07-10** (PROJECT_PLAN §8): policy +
terms published & linked, 국외 이전 disclosed (Art. 28-8, disclosure-based),
email-signup consent shipped, and **member self-service 탈퇴/deletion** flow built
(immediate hard-delete). Remaining unchecked tasks below (legal review, phone/Kakao
consent, security audit, Kakao scopes) are consciously **deferred / owner-owed** —
reopen before scaling membership._

> **⚠️ Not legal advice.** This is an engineering orientation document, not a legal
> opinion. Korea's privacy regime is strict and actively enforced. Before
> accepting members at scale, have the policy text and consent flows reviewed by
> a qualified Korean privacy professional, and adapt the official KISA / PIPC
> templates rather than hand-writing legal copy.

---

## Why we're in scope

The app already collects and stores personal information (PII) through its auth
flows — **email, phone number, display name, account passwords, and Kakao profile
data** (see `src/components/auth/*`, `LoginForm.tsx`, `PhoneLoginForm.tsx`,
`SocialLoginButton.tsx`). Collecting PII from members through a public website
makes the operator a **personal information controller (개인정보처리자)** under
Korea's **개인정보 보호법 (PIPA)**.

"Non-commercial" does **not** exempt us — the purely-personal/household exemption
does not cover a public site with member sign-up. As of this draft there is **no
privacy policy, no terms of service, and no visible consent capture**, which is a
gap to close before scaling membership.

## Scope & assumptions

- **Jurisdiction:** Korea (assumed from Kakao login, Korean UI, 계양산 location).
  _Confirm._ If any members are in the EU/UK, GDPR/UK-GDPR adds obligations.
- **Nature:** non-commercial community app. So the e-commerce rules
  (통신판매업 신고, mandatory 사업자등록번호 disclosure under 전자상거래법) are
  **out of scope** — those apply to commercial sellers.

## Obligations checklist (PIPA)

- [x] **개인정보처리방침 (Privacy Policy)** published and conspicuously linked
      (PIPA Art. 30) — `/pages/privacy`, footer-linked. _(2026-07-10)_ ⚠️ legal
      review still owed.
- [x] **국외 이전 (Overseas transfer)** disclosure (PIPA Art. 28-8) — 개인정보처리방침
      §6 lists Google LLC (Firebase/YouTube) + Vercel Inc. (US) with country,
      items, purpose, and retention. Relies on the **contract-necessity +
      처리방침-disclosure** basis (Art. 28-8(1)), **not separate consent**. _(2026-07-10)_
- [~] **Consent at collection** — notice of purpose, items, retention period, and
  the right to refuse (with consequences). **Email signup done (2026-07-10):**
  required 이용약관 + 개인정보 수집·이용 checkboxes gate submit. (Overseas transfer
  is disclosure-based per above, so it's **not** in the consent.)
  Phone-login/Kakao signup still owed. No marketing consent (none collected).
- [~] **Data-subject rights** — access/correction via mypage; **account
  withdrawal (탈퇴)/deletion shipped 2026-07-10** (mypage → confirm modal →
  Admin SDK hard-delete). Suspension-of-processing still request-based (CPO).
- [ ] **Security/safety measures** — password hashing, access control, audit
      logging, and encryption of applicable fields, per the PIPA safety-measures
      standard. _Audit current auth/storage against this._
- [x] **Privacy officer (CPO)** designated, with public contact — 산냥이집냥이 운영자
      / `rescuezoro@gmail.com` (개인정보처리방침 §11). _(2026-07-10)_
- [~] **Under-14 users** — decided: **allowed with legal-guardian consent**
  (개인정보처리방침 §10). Consent _flow_ for guardians not yet built.
- [ ] **주민등록번호 (RRN)** — do **not** collect; effectively prohibited without
      a specific legal basis. Confirm no flow captures it.
- [ ] **Social login disclosure** — document which Kakao profile fields we receive
      and why; request only necessary scopes.

## Workstream tasks

1. [x] **Footer** added (`src/components/Footer.tsx`) as the home for policy links
       — currently shows real content + **placeholders** for 개인정보처리방침 /
       이용약관 (greyed, "준비 중").
2. [x] **Write `개인정보처리방침`** page (`/pages/privacy`), adapted from the KISA
       standard template; footer link is live. _(2026-07-10)_ CPO 산냥이집냥이 운영자
       (`rescuezoro@gmail.com`). ⚠️ legal review still owed before scaling.
3. [x] **Write `이용약관`** page (`/pages/terms`) — liability disclaimer included
       (제10조); footer link is live. _(2026-07-10)_
4. [~] **Add consent capture** to signup/login flows. **Done for email signup
   (`SignupForm.tsx`, 2026-07-10):** two required checkboxes — 이용약관 +
   개인정보 수집·이용 및 국외 이전 (each with a link to the full text); the
   인증번호 받기 submit is gated until both are checked. **Still owed:** the
   phone-login-as-signup path and Kakao social sign-up capture no explicit
   consent yet. (No marketing/advertising, so no optional consent needed.)
5. [x] **Designate a privacy officer (CPO)** + public contact — 산냥이집냥이 운영자
       / `rescuezoro@gmail.com`, published in 개인정보처리방침 §11. _(2026-07-10)_
6. [x] **Implement data-subject rights** — account withdrawal/deletion. _(2026-07-10)_
       mypage → confirm modal → `POST /api/account/delete` (verify ID token →
       Admin SDK `auth.deleteUser` + `users/{uid}` doc delete) → sign out. Immediate
       hard-delete per policy §3. Access/correction already via mypage; authored
       posts intentionally retained (content, not account PII).
7. [ ] **Security audit** of auth/storage against the PIPA safety-measures
       standard (password hashing, encryption, access control).
8. [ ] **Verify Kakao scopes** and document received fields.
9. [ ] **Professional/legal review** of policy text and consent flows before
       scaling membership.

## Open questions / decisions needed

- Confirm jurisdiction (Korea-only?) and whether any EU/UK members exist.
- Who is the **operator/entity** and who will be the **privacy officer**?
- Will **under-14** accounts be allowed?
- ~~**Retention periods** for each PII type~~ — decided: member info until 탈퇴,
  then **immediate hard-delete** (no grace); 동참 info until purpose met; legal
  minimums where applicable (policy §3).

## References

- 개인정보보호위원회 (PIPC): https://www.pipc.go.kr
- 개인정보 포털 (privacy.go.kr): https://www.privacy.go.kr — 처리방침 templates/guides
- 한국인터넷진흥원 (KISA): https://www.kisa.or.kr
