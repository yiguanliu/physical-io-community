# Member authentication

The public `/login` supports email/password and one-time email codes using the same Supabase SSR client and refreshed cookies as admin sign-in. Verified, non-anonymous accounts can enter `/members`. This flow never assigns administrator roles. Community-form records are separate from auth accounts; members first create an account with their email. Account creation does not change marketing subscriptions.

- Password signup redirects confirmation emails to `/auth/confirm`.
- Password recovery returns through `/auth/confirm?flow=recovery` to `/login/reset-password`.
- Email codes use `signInWithOtp` with `shouldCreateUser: false`, then `verifyOtp` with `type: email`. Sending a code never authenticates the visitor.
- Supabase enforces code expiration, one-time use and service rate limits. No code is saved in the application or printed to logs.
- Reset-password writes require a current verified session and matching passwords. Password controls follow the admin reference.

## Hosted configuration

The local Supabase config includes `supabase/templates/magic-link.html`. Local configuration does **not** update the hosted project's settings.

For the hosted project, add `{{ .Token }}` to Authentication → Emails → Magic Link (retain `{{ .ConfirmationURL }}` if a clickable link is also desired). The checked-in template includes both. Otherwise Supabase sends only its default magic link and the member will not see a numeric code.

Allow these redirects in Authentication → URL Configuration, retaining all existing admin destinations:

- `https://www.physical-io.com/auth/confirm`
- `https://www.physical-io.com/auth/confirm?flow=recovery`
- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/auth/confirm?flow=recovery`

Also include the equivalent callback for any configured `NEXT_PUBLIC_SITE_URL`. SMTP must be configured to deliver auth emails to members beyond the project's permitted test recipients. Email confirmation settings remain controlled by Supabase. These changes do not disable any existing confirmation or security setting.

## Verification

Automated tests cover protected access, invalid passwords and codes, verified code login, no implicit account creation, recovery destinations, malicious redirect origins, consent and password-change session checks. Actual delivery and confirmation-link behavior require a recipient-controlled mailbox and the hosted settings above.

## Public-site callbacks

Auth requests now use `SITE_URL` (`https://www.physical-io.com`) for email callbacks, including requests made from localhost. Admin recovery uses that same public origin. Existing emails keep their original destination; request a new email after the change is active.

Deploy the callback routes before enabling this behavior on the public site. Apply `supabase/templates/recovery.html` to the hosted Recovery template. It uses `TokenHash` and `RedirectTo` so a reset requested on localhost can be verified on the public domain without a localhost PKCE cookie. Both admin and member callbacks accept this token format and retain support for existing PKCE links. The reset senders always append a `flow` query parameter, so the template appends token parameters with `&`.

Hosted URL Configuration must allow the exact public member and admin callbacks. The Supabase Site URL should also be `https://www.physical-io.com`; a rejected redirect can otherwise fall back to an old localhost Site URL. The checked-in templates do not change hosted settings automatically.

## Hosted configuration completed — 14 September 2026

- Supabase Site URL set to `https://www.physical-io.com`.
- Six explicit public redirects saved: member confirmation, member recovery, admin confirmation, admin forgot/create confirmation, and admin reset-password.
- Custom SMTP enabled with Resend: `smtp.resend.com:465`, username `resend`, sender `Physical I/O <updates@physical-io.com>`, using the existing API key. The domain is verified in Resend. SMTP authentication was checked successfully without sending email.
- Magic Link / OTP template updated to include `{{ .Token }}` and retain `{{ .ConfirmationURL }}`.
- Recovery token-hash template remains pending deployment of the new callback handlers. Do not switch live recovery links to an undeployed handler.
- No delivery test has been sent; successful SMTP authentication does not establish inbox delivery.

## Shared account-email design

`lib/email/auth-templates.ts` defines all six authentication and seven security-notification emails using the newsletter wrapper. Regenerate the checked-in Supabase HTML with `node --import tsx scripts/generate-auth-emails.ts` whenever the shared design changes. Go template variables, confirmation URLs, OTP codes and the recovery token-hash callback remain intact. Transactional account emails omit marketing unsubscribe controls.

Local config selects the six authentication templates. The seven security notification templates are supplied for existing enabled hosted notifications; this change does not enable or disable notifications. Apply each matching HTML file in hosted Supabase Authentication → Emails after the banner, footer and font assets are deployed. On 14 September, the public banner asset still returned HTTP 404, so hosted templates were not changed. Preserve current notification toggles when applying styling.

## Join → code → members (15 September 2026)

New members complete `/join`, including profile consent. The API commits their profile before requesting Supabase email OTP with account creation enabled. It preserves existing profiles and subscriptions. If email sending fails, the form retains answers and explains that the profile was saved; resubmission retries without duplicating membership.

On success, `/login?status=joined` opens the code form. The email is carried in tab-scoped session storage, never the URL; if storage is unavailable, members can enter it again. Verification confirms the email and opens the protected `/members` page. Returning members use email codes (without automatic account creation), with password and recovery available as secondary options.

The member page contains published upcoming Events and Past recordings. Event service failures show a calendar fallback; recordings remain behind the existing verified-member check. Marketing navigation, signup prompts, the large footer, decorative login art and redundant recording actions are omitted from member access.

Before release, apply the updated `supabase/templates/confirmation.html` to hosted Authentication → Emails → Confirm signup. Both Confirm signup and Magic Link must include `{{ .Token }}`: first-time OTP registration can use the confirmation template, while returning members use Magic Link. Local templates do not update hosted configuration. No live signup or email delivery was performed during local verification.

## Required member profile

Create account routes to `/join`; the legacy signup action also redirects there. Email-code requests check `public.members` by normalized email first. Unknown addresses must complete the join form. Existing database members, including CSV imports, can create their auth identity through email OTP. Every `/members` request verifies the session and checks database membership; accounts created elsewhere cannot bypass onboarding. Database errors fail closed. Existing imported records count as membership.

Verified accounts missing a profile go to `/join?status=profile_required`, with their verified email prefilled. The join API enforces that email server-side. After saving, an already verified account proceeds directly to `/members`; new unauthenticated signups receive a verification code as before. Password-recovery authorization stays independent of profile completion.
