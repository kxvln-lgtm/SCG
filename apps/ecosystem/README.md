# Stage Craft Group — private development checkpoint, 2026-11-08

**Implementation in progress. Not a production release.** No public beta was created.
Do not deploy this directory as a completed ecosystem. Hosted database migrations
have not been applied. `stagecraft.kz` still serves the existing Essentials build.

## Run privately

```sh
npm ci
npm run build
npm test
npx playwright install chromium
node tests/v2/public-auth-browser.mjs
node tests/v2/browser-check.mjs
node tests/v2/workflow-browser.mjs
node tests/v2/platform-browser.mjs
```

The browser runners each start and stop a preview on **127.0.0.1:4173**.
All browser Supabase calls are intercepted with test fixtures. Database workflow
and authorization tests execute the actual migration in isolated PGlite.
Do not remove the network mocks or use real customer credentials in tests.
The application itself is configured for the existing Backstage Hub project;
manual use of existing write features after signing in can change live records.
There is no automatic migration/deployment command.

## Source provenance

The live public bundle `/assets/index-B2iyxQbM.js` was retrieved on 2026-11-08.
SHA-256: `5498bdd824f835410547a9e4036eff9b47958732a18863c6639bd57a7b95b1ef`.
It matches the retained Essentials build. That React source and its operational
pages are the integration base. The root of the existing GitHub repository was
not replaced. Public repo main was still static SCG 2.1 at audit time; it was not
assumed to be the source of the current production deployment.

Backend: Backstage Hub `snmcoapfubdnvaoowjjk`; no switch to the nearly empty staging
project. No service-role key, user export, identity document, database dump or
private browser screenshot is included in this checkpoint.

## Implemented

- Public dark shell and living editorial home, published-project media, division
  navigation and public platform entry points without an Admin picker entry.
- `/one` and `/space` light silver shells. Existing `/essentials` routes remain
  available; member links stay within the active product.
- Backstage One: action-first home, actual profile/ID, next assignment from existing
  tables, five-region selectable WebGL silver ribbon with fallback, visibility
  pause and reduced motion.
- SPACE: Creative Bureau/Scenique home, 3D CSS project-image coverflow, pointer and
  keyboard navigation, scoped project routes, existing portfolio/task integration.
- Shared image-derived ambient color with bounded one-time sampling; unsupported
  cross-origin media stays neutral. No fabricated events or participant counts.
- Inter Variable with Latin, Cyrillic and Kazakh coverage, vendored under OFL.
- Frosted Identity shell, six-digit OTP input, authenticated three-platform picker.
  The live Auth OTP length/template still needs verification before release.
- Product manifests and derived vector/raster PWA icons, hostname route handling
  for `the1.stagecraft.kz` and `space.stagecraft.kz`, compatible old member links.
- Services: eight additive tables with RLS, no direct client writes, guarded commands,
  organization/IP registration and manual HQ verification of representative authority.
- Editable, versioned order drafts; submission consent; tenant isolation; immutable
  proposal versions, stale-author rejection, version-bound client consent and HQ approval.
- HQ requires active FOUNDER profile and `aal2`; TOTP enrollment/verification UI.
- Central confirmation atomically creates one **draft operational project** and one
  workstream per division, plus internal notifications. It does not publish
  recruitment, assign people, or send external emails.
- Services client and HQ forms, order history, separate volunteer terms, 34-person
  canonical scenario, duplicate-command protection and additive rollback-disable SQL.
- Lazy Services/Admin/3D code and separated React/Auth bundles.

## Validation observed

- TypeScript and Vite build: passed.
- Local database tests: **17 passed** (16 subtests and their parent).
- Public/Auth: 1440, 1024, 768, 390, 360 px; no horizontal overflow or page errors,
  Admin absent from public entries, OTP six digits, no real email sent.
- Backstage One/SPACE: same five widths; region selection, carousel, nested project
  links and reduced-motion behavior passed. Software WebGL renderer used in tests.
- Services catalogue/auth gate: 1440, 768, 390, 360 px passed.
- Mocked browser workflow: draft → edit → submit → HQ proposal → client acceptance
  → final HQ confirmation; 34 participants/four workstreams; MFA gate passed.
- Test fixtures appear only in test files. Screenshots are local QA evidence and
  excluded from source/archive.
- Production OTP delivery, cross-domain session handoff, push delivery, real uploads,
  real staffing, and physical-device PWA installation have **not** been validated.
- Three.js is lazy loaded, but its minified chunk remains ~753 kB; further mobile
  power/performance profiling is still needed. Existing legacy CSS remains large.

## Visual differences still open

The source archive has approved full-screen references, not licensed source event
photos. The public API currently supplies no usable project photography/news media
for the new composition. Empty media states are intentional; reference screenshots
were not cropped into purported real event photos.

The silver ribbon geometry and layout are implemented but are not pixel-identical
to the concept art. SPACE currently supports image coverflow; video playback/scrub,
curation and permissions require the media registry. Services forms and Admin
integration need remaining visual refinement. New v2 screens are primarily Russian;
complete KZ/EN coverage remains open. Full visual acceptance is **not passed**.

## Blocking and unfinished release work

1. Full external Supabase database/Auth/Storage backup and isolated restore drill.
2. Verify deployed code, TLS, document roots and rollback per production domain.
3. Complete organization evidence upload, invitations, event-scoped roster access,
   document registry/signing, line-level hybrid quotes, autosave and full pagination.
4. Complete media CMS, consent/licensing, signed uploads, video, castings, creative
   project workflows and their security tests.
5. Complete unified multi-role Identity & Access and safe cross-domain session flow.
   Existing Supabase identities are preserved; a full SSO broker is not implemented.
6. Review legacy SECURITY DEFINER functions and the existing admin MFA exemption.
7. Finish exact artwork comparison, real media/content, translations, accessibility,
   physical-device testing and live Auth/email checks in an approved private setup.
8. Apply reviewed additive migration only after backup/restore gates, then controlled
   production cutover and post-release checks. Never run a database reset.

## Infrastructure observations and approval blocks

Read-only database inventory: 311 profiles, 67 Auth users, 3 projects, 11 applications,
15 assignments, zero volunteer_hours and certificates at the time of inspection.
These counts have different meanings; profiles are not equivalent to Auth users.

A Plesk incremental backup was observed complete on 2026-11-08: 125 MB delta plus
185 MB manual base from October 25. Its comment incorrectly names the scheduled
October 29 base; the detail screen establishes October 25. No restore test or
external Supabase backup is implied by this hosting backup.

Latest main-domain HTTP check: HTTPS 200, existing `index-B2iyxQbM.js` retained.
Initial checks of admin/news/the1/space returned HTTP 503 from this environment;
a subsequent admin request completed without an HTTP error. This is not proof of
persistent global downtime. Domain-level availability remains to be diagnosed.

Supabase dashboard sign-in reached account selection, then automatic approval
review stopped it because of a usage limit. Authentication did not complete.
A Git push was separately rejected by automatic review because the destination
`kxvln-lgtm/SCG` is public and this production-derived source requires explicit
permission for open publication. No workaround or second push was attempted.
Local commits/private archive preserve the implementation for review.
