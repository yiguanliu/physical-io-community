import Link from "next/link";
import { PageHeading } from "@/components/admin/shell";
import { Icon } from "@/components/admin/ui";
import { listContentItems } from "@/lib/admin/content-studio";
import MarketingBoard from "@/components/admin/marketing/board";
import DiscoverPanel from "@/components/admin/marketing/discover-panel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MarketingPage() {
  const items = await listContentItems();
  return (
    <>
      <PageHeading
        eyebrow="Content studio"
        title="Marketing"
        description="Plan, draft, produce and publish viral-leaning content on Physical AI, spatial intelligence, AI hardware and wearables."
        action={
          <div className="content-detail-actions">
            <Link className="admin-secondary" href="/admin/marketing/templates">
              <Icon name="grid" size={16} />
              Templates
            </Link>
            <Link className="admin-secondary" href="/admin/marketing/ready">
              <Icon name="check" size={16} />
              Ready to post
            </Link>
          </div>
        }
      />
      <DiscoverPanel />
      <MarketingBoard items={items} />
    </>
  );
}
