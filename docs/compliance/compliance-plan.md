# 산냥이집냥이 — Compliance Plan

_Drafted 2026-06-14._

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

- [ ] **개인정보처리방침 (Privacy Policy)** published and conspicuously linked
      (PIPA Art. 30). Must cover: items collected, purposes, retention/use
      periods, any third-party provision, any outsourcing (수탁), data-subject
      rights and how to exercise them, security measures, and a named
      **privacy officer (개인정보 보호책임자)** with contact.
- [ ] **Consent at collection** — notice of purpose, items, retention period, and
      the right to refuse (with consequences). Keep _required_ vs _optional_
      consents separate; marketing/advertising consent is separate again.
- [ ] **Data-subject rights** — access, correction, deletion, suspension of
      processing, and account withdrawal (탈퇴).
- [ ] **Security/safety measures** — password hashing, access control, audit
      logging, and encryption of applicable fields, per the PIPA safety-measures
      standard. _Audit current auth/storage against this._
- [ ] **Privacy officer (CPO)** designated, with public contact.
- [ ] **Under-14 users** — legal-guardian consent required if minors can sign up.
      Decide whether to permit under-14 accounts at all.
- [ ] **주민등록번호 (RRN)** — do **not** collect; effectively prohibited without
      a specific legal basis. Confirm no flow captures it.
- [ ] **Social login disclosure** — document which Kakao profile fields we receive
      and why; request only necessary scopes.

## Workstream tasks

1. [x] **Footer** added (`src/components/Footer.tsx`) as the home for policy links
       — currently shows real content + **placeholders** for 개인정보처리방침 /
       이용약관 (greyed, "준비 중").
2. [ ] **Write `개인정보처리방침`** page (`/pages/privacy`), adapted from the KISA
       standard template; then make the footer link live.
3. [ ] **Write `이용약관`** page (`/pages/terms`) — include the liability
       disclaimer here; then make the footer link live.
4. [ ] **Add consent capture** to signup/login flows (verify `LoginForm.tsx` /
       `PhoneLoginForm.tsx` / `SignupForm.tsx` — they appear to lack explicit
       consent checkboxes).
5. [ ] **Designate a privacy officer (CPO)** + public contact for the policy.
6. [ ] **Implement data-subject rights** — account withdrawal/deletion and a
       path for access/correction requests.
7. [ ] **Security audit** of auth/storage against the PIPA safety-measures
       standard (password hashing, encryption, access control).
8. [ ] **Verify Kakao scopes** and document received fields.
9. [ ] **Professional/legal review** of policy text and consent flows before
       scaling membership.

## Open questions / decisions needed

- Confirm jurisdiction (Korea-only?) and whether any EU/UK members exist.
- Who is the **operator/entity** and who will be the **privacy officer**?
- Will **under-14** accounts be allowed?
- **Retention periods** for each PII type (and post-withdrawal deletion timing).

## References

- 개인정보보호위원회 (PIPC): https://www.pipc.go.kr
- 개인정보 포털 (privacy.go.kr): https://www.privacy.go.kr — 처리방침 templates/guides
- 한국인터넷진흥원 (KISA): https://www.kisa.or.kr
