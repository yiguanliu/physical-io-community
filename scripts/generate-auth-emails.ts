import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { authEmailTemplates } from '../lib/email/auth-templates';

// Regenerate after editing the shared email style. This does not update hosted Supabase.
for (const template of authEmailTemplates) {
  writeFileSync(resolve('supabase/templates', `${template.file ?? template.name}.html`), `${template.html}\n`);
}
console.log(`Generated ${authEmailTemplates.length} branded account-email templates.`);
