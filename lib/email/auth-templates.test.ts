import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { authEmailTemplates } from './auth-templates';
describe('account email templates',()=>{
 for(const template of authEmailTemplates) it(`${template.name} shares the newsletter style and generated file`,()=>{
  expect(template.html).toContain('background:#EF2900');
  expect(template.html).toContain('Manrope');
  expect(template.html).toContain('physical-io-banner.png');
  expect(template.html).toContain('physical-io-footer.png');
  expect(template.html).not.toContain('unsubscribe from');
  expect(readFileSync(`supabase/templates/${template.file??template.name}.html`,'utf8')).toBe(template.html+'\n');
 });
 it('preserves action links and one-time codes',()=>{
  for(const name of ['confirmation','invite','email_change']) expect(authEmailTemplates.find(t=>t.name===name)?.html).toContain('{{ .ConfirmationURL }}');
  for(const name of ['magic_link','reauthentication']) expect(authEmailTemplates.find(t=>t.name===name)?.html).toContain('{{ .Token }}');
  expect(authEmailTemplates.find(t=>t.name==='recovery')?.html).toContain('{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery');
 });
});
