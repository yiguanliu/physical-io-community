import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import { Icon } from "@/components/admin/ui";
import { listTemplates } from "@/lib/admin/content-studio";
import { createTemplateAction, deleteTemplateAction, updateTemplateAction } from "@/app/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return (
    <>
      <PageHeading
        eyebrow="Content studio"
        title="Templates"
        description="Reusable visual + editorial presets. Designers build layouts here; editors pick them at the visual stage."
        action={
          <Button asChild className="admin-secondary" variant="outline">
            <Link href="/admin/marketing">
              <Icon name="arrow-left" size={16} />
              Back to board
            </Link>
          </Button>
        }
      />

      <section className="admin-panel">
        <strong className="content-side-heading">New template</strong>
        <form action={createTemplateAction} className="admin-form admin-form-wide">
          <label>
            Name
            <Input name="name" required placeholder="Hypebeast headline" />
          </label>
          <label>
            Description
            <Input name="description" placeholder="Big title over full-bleed image" />
          </label>
          <label>
            Default tone
            <Input name="tone" placeholder="punchy, visual, hook-led" />
          </label>
          <label>
            Text limit (chars)
            <Input name="textLimit" type="number" placeholder="2200" />
          </label>
          <Button className="admin-primary" type="submit">
            Create template
          </Button>
        </form>
      </section>

      <section className="admin-table-panel">
        <div className="member-summary">
          <strong>Templates</strong>
          <span>{templates.length} saved</span>
        </div>
        <div className="content-template-grid">
          {templates.map((template) => (
            <article key={template.id} className="content-template-card">
              <h4>{template.name}</h4>
              <p>{template.description || "No description"}</p>
              <dl>
                <div>
                  <dt>Tone</dt>
                  <dd>{(template.editorial as { tone?: string })?.tone || "—"}</dd>
                </div>
                <div>
                  <dt>Text limit</dt>
                  <dd>{(template.editorial as { textLimit?: number })?.textLimit || "—"}</dd>
                </div>
              </dl>
              <div className="content-template-actions">
                <details className="content-template-edit">
                  <summary className="admin-secondary">Edit</summary>
                  <form action={updateTemplateAction} className="admin-form compact-form">
                    <input type="hidden" name="id" value={template.id} />
                    <label>
                      Name
                      <Input name="name" defaultValue={template.name} required />
                    </label>
                    <label>
                      Description
                      <Input name="description" defaultValue={template.description} />
                    </label>
                    <label>
                      Default tone
                      <Input name="tone" defaultValue={(template.editorial as { tone?: string })?.tone ?? ""} />
                    </label>
                    <label>
                      Text limit (chars)
                      <Input
                        name="textLimit"
                        type="number"
                        min="1"
                        defaultValue={(template.editorial as { textLimit?: number })?.textLimit ?? ""}
                      />
                    </label>
                    <Button className="admin-primary" type="submit">
                      Save changes
                    </Button>
                  </form>
                </details>
                <form action={deleteTemplateAction}>
                  <input type="hidden" name="id" value={template.id} />
                  <Button className="admin-secondary content-delete" variant="outline" type="submit">
                    Delete
                  </Button>
                </form>
              </div>
            </article>
          ))}
          {templates.length === 0 ? <p className="admin-empty-note">No templates yet. Create one above.</p> : null}
        </div>
      </section>
    </>
  );
}
