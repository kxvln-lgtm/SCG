# SCG deployment

The production site runs as static files on the existing hosting account. Supabase provides authentication, storage and guarded backend operations.

## Build

Run `npm run check`, `npm test` and `python3 scripts/build.py`.
The build reads the original policy documents and sanitized legal copy in `assets/legal.json`. Private backup files and internal audit reports are not required.

Upload only the generated `dist` contents to the document root. Keep source archives and credentials outside it. Changes to the source repository do not automatically publish a production release.

## Configuration

Use server secrets for SMTP and the AI provider. Never place service keys, mailbox passwords or AI keys in frontend code. Configure authentication email delivery separately from the notification queue worker. Verify actual delivery and recovery redirects before marking mail complete.

Command Center accepts an authenticated session with an active server-assigned administrative role; TOTP enrollment is optional. Previously enrolled administrators are not forced through a second-factor challenge. Members who enabled TOTP still need their second factor. Regional operations remain restricted to the manager’s region. Security decisions are enforced by database policies and guarded functions, independently of the interface.

Google sign-in uses Supabase's Google provider and the existing OAuth Web client. Its Client Secret stays in Supabase Auth settings. Allow `https://stagecraft.kz/backstage/` and `https://admin.stagecraft.kz/` as Supabase redirects, and `https://snmcoapfubdnvaoowjjk.supabase.co/auth/v1/callback` as the Google client's callback. Provider identities are linked by Supabase; the frontend never assigns administrative roles from Google profile metadata.

## Verification

Permission, workflow and mail nonce SQL fixtures run in rolled-back transactions. They must not send actual emails or Telegram messages. Browser rendering and real user journeys need separate verification.

Private backups and internal audit details remain outside the public repository.
