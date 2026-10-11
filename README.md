# SCG / Backstage 2

SCG uses static files on the existing Hoster.kz account and the existing Supabase project. The public site is `https://stagecraft.kz/`, member workspace is `/backstage/`, recovery is `/reset-password.html`, and the command center is `https://admin.stagecraft.kz/`.

## Build and verification

```sh
npm run check
npm test
python3 scripts/build.py
```

Upload the contents of `dist` to `httpdocs`. The generated `scg-production.zip` contains only public assets, original policy documents and Apache configuration. Keep source, SQL, archives and credentials outside the document root. The command center uses the same document root and routes by hostname; its sessions are separate from the main domain.

`tests/access.sql` runs realistic ownership, role, region and MFA checks in one rolled-back transaction. It does not send emails or Telegram messages. Keep the Supabase migrations in their applied order. Existing profile IDs, original policy files, auth accounts, assignments and historical hours are preserved.

## Access

Command Center accepts an authenticated session with an active administrative role. TOTP enrollment is optional; previously enrolled administrators are not forced through a challenge. Members who enabled TOTP still need their second factor. Regional managers only manage their own region. PR manages content and announcements. Only the Founder changes member access. Profiles and identity documents are private; the public social profile API exposes a limited set of fields. Backend APIs must validate permissions independently of the browser.

## Domain email

The included mailbox `noreply@stagecraft.kz` has been created in Plesk, with panel login disabled. Its password must be entered directly by the account owner. Configure the same mailbox in Supabase Auth → Email → Custom SMTP and in Edge Function secrets:

| Secret | Value |
| --- | --- |
| `SMTP_HOSTNAME` | Verified SMTP server name from Hoster (for this account, `pkz15.hoster.kz`) |
| `SMTP_PORT` | `465` with implicit TLS |
| `SMTP_USERNAME` | `noreply@stagecraft.kz` |
| `SMTP_PASSWORD` | Mailbox password, server secret only |
| `SMTP_FROM` | `noreply@stagecraft.kz` |

Configure DKIM and SPF through Plesk, preserve existing MX records, then set a DMARC monitoring policy before raising it to enforcement. Verify a real password reset email and its landing page before claiming email recovery works. Reset template link should use `https://stagecraft.kz/reset-password.html?token_hash={{ .TokenHash }}&type=recovery`; no password or token should appear in support tickets or logs.

The `scg-email` function processes opted-in mail, respects later opt-outs, retries failed deliveries and uses a stable message ID. A protected database scheduler runs every two minutes, using a short-lived one-use nonce; SMTP must be active before delivery. Processing is also available to system admins in Command Center → Access and services. Never put a service key in a browser or public cron URL. Supabase owns pg_net and does not support project-level revocation of its default grants. Keep `net` outside the Data API exposed schemas and restrict direct database credentials to trusted services; queued nonce values can be read by database login roles. The extension-in-public advisor is a platform constraint for this non-relocatable extension, rather than proof that its objects are exposed through the API. Default email preferences are off. In-app notifications work independently of SMTP.

## БО

The `scg-ai` function uses the existing `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL` server secrets. GET reports configuration without calling the model. It validates user identity, active status, conversation ownership and MFA, limits requests to 5/minute and 30/day, and sends dialogue and public project context only. It cannot perform administrative actions. User messages may contain personal information: the UI discloses transfer to the AI provider and warns against sending passwords or identity documents.

No paid AI provider account or package upgrade is purchased by deployment. If the key is absent, the UI directs users to documents and support. Provider billing, if configured by the owner, follows that account's existing terms and limits.

## Telegram

Webhook handlers check a server-derived secret and accept only private chats. Their GET health path adds the secret only to the already active Telegram webhook; it never switches the active bot endpoint. The inactive legacy endpoint stays unavailable to unsigned POSTs. Telegram Mini App data expires after 10 minutes. Linking an existing profile additionally requires the authenticated owner of that profile. Arbitrary matching by name, username or SCG ID is removed.

Paid Telegram Gateway verification is disabled unless the owner explicitly sets `SCG_TELEGRAM_GATEWAY_ENABLED=true` after approving its usage costs. Existing Telegram accounts and profile links are retained.

## Deployment and limitations

Plesk Git deployment is manual. Source was synchronized through the GitHub browser UI with owner approval after the integration denied write access. Review each production release before deployment; source synchronization and Hoster publication are separate actions.

Free Let's Encrypt certificates cover the public site, www and admin hostname; the admin certificate expires on 9 January 2027 and auto-renews. HTTPS redirect is enabled for admin. Verify DNS and certificates separately. Never bypass certificate warnings. Current functional checks cover modules and database permissions; managed preview browser QA was unavailable, so mobile rendering and signed-in end-to-end flows require a later browser check. Security improvements do not constitute a guarantee against every attack. Leaked-password detection depends on the Supabase plan/settings and remains a separate check.
