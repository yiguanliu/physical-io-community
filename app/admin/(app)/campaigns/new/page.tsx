import CampaignForm from "@/components/admin/campaign-form";
import { PageHeading } from "@/components/admin/shell";
import { listEvents } from "@/lib/admin/store";

export default async function NewCampaignPage() {
  const events = await listEvents();
  return (
    <>
      <PageHeading eyebrow="Messaging" title="New campaign" description="Draft a newsletter or event update. Nothing is sent until you confirm." />
      <CampaignForm events={events.map((event) => ({ id: event.id, title: event.title }))} />
    </>
  );
}
