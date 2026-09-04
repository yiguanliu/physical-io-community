"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Icon } from "@/components/admin/ui";
import {
  adaptVariantAction,
  newsletterSendAction,
  newsletterTestAction,
  prepareNewsletterAction,
  saveVariantAction,
} from "@/app/admin/content-actions";
import { PLATFORMS, PLATFORM_META, type Platform } from "@/lib/marketing/config";
import type { ContentAsset, ContentTemplate, ContentVariant } from "@/lib/admin/content-studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSelect } from "@/components/admin/form-select";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

export default function PlatformTabs({
  id,
  variants,
  assets,
  templates,
  title,
  summary,
}: {
  id: string;
  variants: ContentVariant[];
  assets: ContentAsset[];
  templates: ContentTemplate[];
  title: string;
  summary: string;
}) {
  const [active, setActive] = useState<Platform>("instagram");
  const router = useRouter();
  const [pending, start] = useTransition();

  const byPlatform = useMemo(() => {
    const map = new Map<Platform, ContentVariant>();
    variants.forEach((variant) => map.set(variant.platform, variant));
    return map;
  }, [variants]);

  const variant = byPlatform.get(active);

  function adapt() {
    const form = new FormData();
    form.set("id", id);
    form.set("platform", active);
    start(async () => {
      await adaptVariantAction(form);
      router.refresh();
    });
  }

  return (
    <Tabs value={active} onValueChange={(value) => setActive(value as Platform)} className="admin-panel content-platforms gap-0">
      <TabsList variant="line" className="content-platform-tabs">
        {PLATFORMS.map((platform) => {
          const v = byPlatform.get(platform);
          return (
            <TabsTrigger
              key={platform}
              value={platform}
              className={active === platform ? "active" : ""}
            >
              {PLATFORM_META[platform].label}
              {v && v.status === "ready" ? <span className="content-tab-ready" /> : null}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <div className="content-platform-body">
        <div className="content-platform-toolbar">
          <Badge tone={variant?.status === "ready" ? "success" : "neutral"}>{variant?.status ?? "draft"}</Badge>
          <span className="content-platform-tone">Tone: {PLATFORM_META[active].tone}</span>
          <Button type="button" className="admin-secondary" variant="outline" onClick={adapt} disabled={pending}>
            <Icon name="spark" size={15} /> {pending ? "Adapting…" : "Adapt from master"}
          </Button>
          <Button asChild className="admin-secondary" variant="outline">
            <Link href={`/admin/marketing/${id}/visual?platform=${active}`}>
              <Icon name="plus" size={15} /> Visual
            </Link>
          </Button>
        </div>

        {variant?.renderedAsset ? (
          <div className="content-platform-render">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={variant.renderedAsset.publicUrl} alt={`${active} graphic`} />
            <small>Rendered graphic for {PLATFORM_META[active].label}</small>
          </div>
        ) : null}

        <form action={saveVariantAction} className="content-variant-form" key={active}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="platform" value={active} />

          <label>
            Caption / headline
            <Input name="caption" defaultValue={variant?.caption || title} maxLength={PLATFORM_META[active].captionLimit} />
          </label>

          <label>
            Copy
            <Textarea name="body" rows={10} defaultValue={variant?.body || ""} placeholder={`Copy for ${PLATFORM_META[active].label}`} />
          </label>

          {active === "instagram" || active === "linkedin" ? (
            <label>
              Hashtags (comma separated)
              <Input name="hashtags" defaultValue={(variant?.hashtags ?? []).join(", ")} placeholder="#PhysicalAI, #Robotics" />
            </label>
          ) : (
            <input type="hidden" name="hashtags" value="" />
          )}

          <div className="content-variant-form-row">
            <label>
              Template
              <FormSelect
                name="templateId"
                defaultValue={variant?.templateId ?? ""}
                className="admin-select"
                options={[{ value: "", label: "No template" }, ...templates.map((template) => ({ value: template.id, label: template.name }))]}
              />
            </label>
            <label>
              Status
              <FormSelect
                name="status"
                defaultValue={variant?.status ?? "draft"}
                className="admin-select"
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "ready", label: "Ready" },
                  { value: "published", label: "Published" },
                ]}
              />
            </label>
            <Button className="admin-primary content-variant-save" type="submit">
              Save {PLATFORM_META[active].label}
            </Button>
          </div>
        </form>

        {active === "email" ? (
          <NewsletterPanel id={id} defaultSubject={title} defaultPreview={summary} />
        ) : null}
      </div>
    </Tabs>
  );
}

function NewsletterPanel({ id, defaultSubject, defaultPreview }: { id: string; defaultSubject: string; defaultPreview: string }) {
  const [sendId, setSendId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function prepare(formData: FormData) {
    formData.set("id", id);
    setStatus("Preparing…");
    start(async () => {
      try {
        const newSendId = await prepareNewsletterAction(formData);
        setSendId(newSendId);
        setStatus("Prepared. Send a test, then send to subscribers.");
      } catch (error) {
        setStatus(errorMessage(error));
      }
    });
  }

  function sendTest() {
    if (!sendId || !testEmail) return;
    const form = new FormData();
    form.set("sendId", sendId);
    form.set("toEmail", testEmail);
    setStatus("Sending test…");
    start(async () => {
      try {
        await newsletterTestAction(form);
        setStatus(`Test sent to ${testEmail}.`);
      } catch (error) {
        setStatus(errorMessage(error));
      }
    });
  }

  function sendAll() {
    if (!sendId) return;
    if (!window.confirm("Send this newsletter to all consenting subscribers now?")) return;
    const form = new FormData();
    form.set("sendId", sendId);
    form.set("id", id);
    setStatus("Sending to subscribers…");
    start(async () => {
      try {
        await newsletterSendAction(form);
        setStatus("Newsletter sent.");
      } catch (error) {
        setStatus(errorMessage(error));
      }
    });
  }

  return (
    <div className="content-newsletter">
      <strong className="content-side-heading">Newsletter send</strong>
      <form action={prepare} className="content-newsletter-form">
        <label>
          Subject
          <Input name="subject" defaultValue={defaultSubject} required />
        </label>
        <label>
          Preview text
          <Input name="previewText" defaultValue={defaultPreview} />
        </label>
        <div className="content-variant-form-row">
          <label>
            From name
            <Input name="fromName" defaultValue="Physical I/O" />
          </label>
          <label>
            Schedule (optional)
            <Input name="scheduledAt" type="datetime-local" />
          </label>
        </div>
        <Button className="admin-secondary" variant="outline" type="submit" disabled={pending}>
          Prepare send
        </Button>
      </form>

      {sendId ? (
        <div className="content-newsletter-actions">
          <div className="content-newsletter-test">
            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" type="email" />
            <Button type="button" className="admin-secondary" variant="outline" onClick={sendTest} disabled={pending || !testEmail}>
              Send test
            </Button>
          </div>
          <Button type="button" className="admin-primary" onClick={sendAll} disabled={pending}>
            <Icon name="mail" size={15} /> Send to all subscribers
          </Button>
        </div>
      ) : null}
      {status ? <p className="content-board-status">{status}</p> : null}
    </div>
  );
}
