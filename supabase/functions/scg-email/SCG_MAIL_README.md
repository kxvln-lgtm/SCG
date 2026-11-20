# SCG Mail 1.0 — Institutional

Status checked 2026-11-20: the Institutional `emailTemplate` in this repository matches the **active** Supabase `scg-email` Edge Function (Backstage Hub). The source was synchronized through PR #1. This is not evidence of successful SMTP delivery; no live email was sent during the verification.

## Identity
- Original, unmodified SCG graphic logo: `https://stagecraft.kz/assets/logo.png` (Git blob `bff891951fc7fd40eef9b8634b9e53a631cd700e`). Do not substitute a typographic redraw.
- Light, monochrome email layout with silver separator, responsive table markup, Helvetica/Arial fallback, black high-contrast CTA, readable footer.
- The visual mockup's sculptural silver ribbon is a **concept element**, not a verified email-safe production asset. Do not promise pixel-identical rendering in Gmail, Apple Mail and Outlook.

## Current sender and pipeline
- Automated opt-in Backstage notifications: `noreply@stagecraft.kz` (mailbox created in Plesk, as documented in repository README).
- `scg-email` uses the existing SMTP secrets, outbox, retry mechanism, recipient preferences and safe URL validation. Do not change these while editing visual markup.
- SMTP credentials, SPF, DKIM, DMARC and real inbox delivery must be verified by the account owner before declaring production email fully operational. Never commit credentials or send unsolicited test messages.
- Domain mailbox existence does not establish a campaign email service. Bulk newsletters require explicit subscription/opt-out and deliverability/rate-limit checks, preferably with a dedicated sender/provider.

## Scope and outstanding work
- **Implemented:** shared HTML template for opted-in platform notification kinds `project`, `application`, `announcement`, `post`, `support`.
- **Not included:** Supabase Auth confirmation, recovery, magic link and OTP templates; configure those separately in Supabase Auth after testing token placeholders and expiry behavior.
- **Not created or verified:** `partnerships@stagecraft.kz`, `info@stagecraft.kz`, `updates@stagecraft.kz` (possible future official/campaign addresses).
- The Hoster/Plesk website deployment is manual. Updating this repository does not publish site assets.

## QA before broad rollout
1. Verify sender domain DNS and SMTP in the service dashboard without disclosing passwords.
2. Send a consented test to owned inboxes, verify spam placement and header authentication.
3. Check mobile width 320–430px, image-blocked state, dark mode and major mail clients.
4. Verify opt-out, project links, password reset, and security boundaries independently.
