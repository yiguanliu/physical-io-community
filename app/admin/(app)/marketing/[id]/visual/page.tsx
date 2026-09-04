import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import { Icon } from "@/components/admin/ui";
import { getContentItem, listTemplates } from "@/lib/admin/content-studio";
import { isPlatform, type Platform } from "@/lib/marketing/config";
import VisualStudio from "@/components/admin/marketing/visual-studio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function VisualStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ platform?: string }>;
}) {
  const { id } = await params;
  const { platform } = await searchParams;
  const item = await getContentItem(id);
  if (!item) notFound();
  const templates = await listTemplates();
  const initialPlatform: Platform = isPlatform(platform) ? platform : "instagram";

  return (
    <>
      <PageHeading
        eyebrow="Visual studio"
        title={item.title}
        description="Compose platform graphics from a template — logo, headline and imagery, Hypebeast style."
        action={
          <Link className="admin-secondary" href={`/admin/marketing/${id}`}>
            <Icon name="arrow-left" size={16} />
            Back to content
          </Link>
        }
      />
      <VisualStudio
        id={id}
        title={item.title}
        assets={item.assets}
        variants={item.variants}
        templates={templates}
        initialPlatform={initialPlatform}
      />
    </>
  );
}
