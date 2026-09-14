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
