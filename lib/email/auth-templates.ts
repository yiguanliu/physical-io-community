import { renderEmailHtml, emailTheme } from './template';

const paragraph = (text: string) => `<p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:${emailTheme.ink};">${text}</p>`;
const link = (label: string, href = '{{ .ConfirmationURL }}') => paragraph(`<a href="${href}" style="color:${emailTheme.ink};text-decoration:underline;">${label}</a>`);
const code = () => paragraph('<strong style="font-size:28px;letter-spacing:4px;">{{ .Token }}</strong>');
const warning = paragraph('If you did not request this email, you can ignore it. Do not share your link or code.');
const security = paragraph(`If you did not make this change, secure your account and <a href="https://www.physical-io.com/askusanything" style="color:${emailTheme.ink};text-decoration:underline;">contact us</a>.`);

export const authEmailTemplates = [
 {name:'confirmation',subject:'Confirm your Physical I/O account',title:'Welcome to Physical I/O.',content:paragraph('Enter this one-time code on the member sign-in page to confirm your email address:')+code()+link('Or confirm my email')+warning},
 {name:'invite',subject:'You’re invited to Physical I/O',title:'Your invitation to Physical I/O.',content:paragraph('You have been invited to create an account. Follow the link below to accept your invitation.')+link('Accept invitation')+warning},
 {name:'magic_link',file:'magic-link',subject:'Your Physical I/O sign-in code',title:'Sign in to Physical I/O.',content:paragraph('Enter this one-time code on the sign-in page:')+code()+link('Or sign in securely')+paragraph('Open the link in the same browser where you requested it.')+warning},
 {name:'recovery',subject:'Reset your Physical I/O password',title:'Choose a new password.',content:paragraph('We received a request to reset your password.')+link('Reset my password','{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery')+paragraph('If you did not request this, you can ignore this email. Your password will stay unchanged.')},
 {name:'email_change',subject:'Confirm your new Physical I/O email',title:'Confirm your new email address.',content:paragraph('Confirm the requested change from {{ .Email }} to {{ .NewEmail }}.')+link('Confirm email change')+warning},
 {name:'reauthentication',subject:'Your Physical I/O verification code',title:'Verify it’s you.',content:paragraph('Enter this one-time code to confirm your identity:')+code()+warning},
 {name:'password_changed_notification',subject:'Your Physical I/O password was changed',title:'Your password was changed.',content:paragraph('The password for your Physical I/O account was recently changed.')+security},
 {name:'email_changed_notification',subject:'Your Physical I/O email was changed',title:'Your email address was changed.',content:paragraph('Your account email changed from {{ .OldEmail }} to {{ .Email }}.')+security},
 {name:'phone_changed_notification',subject:'Your Physical I/O phone number was changed',title:'Your phone number was changed.',content:paragraph('Your account phone number changed from {{ .OldPhone }} to {{ .Phone }}.')+security},
 {name:'identity_linked_notification',subject:'A sign-in method was added to Physical I/O',title:'A sign-in method was added.',content:paragraph('Your {{ .Provider }} account was linked as a sign-in method for {{ .Email }}.')+security},
 {name:'identity_unlinked_notification',subject:'A sign-in method was removed from Physical I/O',title:'A sign-in method was removed.',content:paragraph('Your {{ .Provider }} account was removed as a sign-in method for {{ .Email }}.')+security},
 {name:'mfa_factor_enrolled_notification',subject:'A verification method was added to Physical I/O',title:'A verification method was added.',content:paragraph('The verification method {{ .FactorType }} was added to your account.')+security},
 {name:'mfa_factor_unenrolled_notification',subject:'A verification method was removed from Physical I/O',title:'A verification method was removed.',content:paragraph('The verification method {{ .FactorType }} was removed from your account.')+security},
].map(template => ({...template, html:renderEmailHtml({previewText:template.subject,body:'',bodyHtml:`<h1 style="margin:0 0 24px;font-size:26px;font-weight:400;line-height:1.3;color:${emailTheme.ink};">${template.title}</h1>${template.content}`})}));
