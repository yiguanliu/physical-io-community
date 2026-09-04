import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import { Icon } from "@/components/admin/ui";
import { getContentItem, listReadyToPost } from "@/lib/admin/content-studio";
import ReadyQueue from "@/components/admin/marketing/ready-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReadyToPostPage() {
  const summaries = await listReadyToPost();
  const items = (await Promise.all(summaries.map((summary) => getContentItem(summary.id)))).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  return (
    <>
      <PageHeading
        eyebrow="Content studio"
        title="Ready to post"
        description="Approved content waiting to go live. Download the assets and copy, then publish on each platform."
        action={
          <Link className="admin-secondary" href="/admin/marketing">
            <Icon name="arrow-left" size={16} />
            Back to board
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="admin-empty-note">Nothing is approved yet. Approve content from its detail page to queue it here.</p>
      ) : (
        <ReadyQueue
          items={items.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            variants: item.variants.map((variant) => ({
              platform: variant.platform,
              status: variant.status,
              caption: variant.caption,
              body: variant.body,
              hashtags: variant.hashtags,
              renderedUrl: variant.renderedAsset?.publicUrl ?? null,
            })),
          }))}
        />
      )}
    </>
  );
}
