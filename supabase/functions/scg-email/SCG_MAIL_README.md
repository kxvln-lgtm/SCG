SCG MAIL 1.0 — INSTITUTIONAL

The original SCG logo is served from /assets/logo.png. This change replaces visual markup only: keep opt-in checks, SMTP settings, queue/retry logic, and URL validation unchanged.

This branch does not deploy to Hoster or Supabase. Production `scg-email` has newer source than main; compare and preserve its current security/operational logic before deploying. Supabase Auth confirmation, magic link, recovery and OTP templates are configured separately in the Supabase Dashboard and are NOT changed by this PR.

Current project mail sender: noreply@stagecraft.kz; proposed official@stagecraft.kz, projects@stagecraft.kz and news@stagecraft.kz are not confirmed mailboxes. Confirm SPF/DKIM/DMARC and send tests before go-live. Opted-out users must never be mailed.
