import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/shell";
import { Badge, Icon } from "@/components/admin/ui";
import { getContentItem, listTemplates } from "@/lib/admin/content-studio";
import { readyPlatforms, STAGE_META } from "@/lib/marketing/config";
import DraftEditor from "@/components/admin/marketing/draft-editor";
import PlatformTabs from "@/components/admin/marketing/platform-tabs";
import ContentTimeline from "@/components/admin/marketing/timeline";
import ScheduleForm from "@/components/admin/marketing/schedule-form";
import {
  addNoteAction,
  approveContentAction,
  deleteContentAction,
  moveStageAction,
} from "@/app/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/admin/form-select";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stageTone(stage: string) {
  if (stage === "published") return "success";
  if (stage === "approved" || stage === "scheduled") return "info";
  if (stage === "review") return "warning";
  return "neutral";
}

export default async function ContentItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getContentItem(id);
  if (!item) notFound();
  const templates = await listTemplates();

  const draftConfirmed = ["visual", "review", "approved", "scheduled", "published"].includes(item.status);
  const ready = readyPlatforms(item.variants);
  const approvalComplete = ["approved", "scheduled", "published"].includes(item.status);

  return (
    <>
      <PageHeading
        eyebrow="Content"
        title={item.title}
        description={item.summary || "Draft, adapt for each platform, then approve and publish."}
        action={
          <div className="content-detail-actions">
            <Badge tone={stageTone(item.status)}>{STAGE_META[item.status]?.label ?? item.status}</Badge>
            <Button asChild className="admin-secondary" variant="outline">
              <Link href={`/admin/marketing/${id}/visual`}>
                <Icon name="spark" size={16} />
                Visual studio
              </Link>
            </Button>
          </div>
        }
      />

      {item.sourceUrl ? (
        <div className="content-source-note">
          <Icon name="link" size={14} />
          <span>
            Source:{" "}
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              {item.sourceTitle || item.sourceUrl}
            </a>
          </span>
        </div>
      ) : null}

      <div className="content-detail-grid">
        <div className="content-detail-main">
          <DraftEditor
            id={item.id}
            title={item.title}
            summary={item.summary}
            tags={item.categoryTags}
            body={item.bodyMarkdown}
            confirmed={draftConfirmed}
          />

          {draftConfirmed ? (
            <PlatformTabs
              id={item.id}
              variants={item.variants}
              assets={item.assets}
              templates={templates}
              summary={item.summary}
              title={item.title}
            />
          ) : (
            <p className="admin-empty-note">
              Confirm the master draft to unlock per-platform variants (Instagram, LinkedIn, Website, Email).
            </p>
          )}
        </div>

        <aside className="content-detail-side">
          <section className="admin-panel">
            <strong className="content-side-heading">Stage</strong>
            <form action={moveStageAction} className="content-stage-form">
              <input type="hidden" name="id" value={item.id} />
              <FormSelect
                name="status"
                defaultValue={item.status}
                className="admin-select"
                aria-label="Content stage"
                options={Object.entries(STAGE_META)
                  .filter(([value]) => !["approved", "scheduled"].includes(value) || value === item.status)
                  .map(([value, meta]) => ({ value, label: meta.label }))}
              />
              <Button className="admin-secondary" variant="outline" type="submit">
                Update
              </Button>
            </form>
            <div className="content-stage-quick">
              <form action={approveContentAction}>
                <input type="hidden" name="id" value={item.id} />
                <Button className="admin-primary" type="submit" disabled={!draftConfirmed || ready.length === 0 || approvalComplete}>
                  <Icon name="check" size={15} /> Approve &amp; notify
                </Button>
              </form>
              <p className="content-help">
                {approvalComplete
                  ? "Approval is complete."
                  : ready.length
                  ? `${ready.length} platform variant${ready.length === 1 ? " is" : "s are"} ready.`
                  : "Mark at least one platform variant Ready before approval."}
              </p>
            </div>
          </section>

          <section className="admin-panel">
            <strong className="content-side-heading">Schedule</strong>
            <ScheduleForm id={item.id} scheduledAt={item.scheduledAt} />
          </section>

          <section className="admin-panel">
            <strong className="content-side-heading">Timeline</strong>
            <ContentTimeline events={item.events} />
            <form action={addNoteAction} className="content-note-form">
              <input type="hidden" name="id" value={item.id} />
              <Input name="note" placeholder="Add a note…" aria-label="Timeline note" />
              <Button className="admin-secondary" variant="outline" type="submit">
                Add
              </Button>
            </form>
          </section>

          <section className="admin-panel content-danger">
            <form action={deleteContentAction}>
              <input type="hidden" name="id" value={item.id} />
              <Button className="admin-secondary content-delete" variant="outline" type="submit">
                Delete content
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
