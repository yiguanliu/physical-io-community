"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Icon } from "@/components/admin/ui";
import { publishContentAction } from "@/app/admin/content-actions";
import { PLATFORM_META, type Platform } from "@/lib/marketing/config";
import { Button } from "@/components/ui/button";

type Variant = {
  platform: Platform;
  status: string;
  caption: string;
  body: string;
  hashtags: string[];
  renderedUrl: string | null;
};

type Item = {
  id: string;
  title: string;
  status: string;
  variants: Variant[];
};

export default function ReadyQueue({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function copyText(item: Item) {
    const blocks = item.variants.map((variant) => {
      const tags = variant.hashtags.length ? `\n${variant.hashtags.join(" ")}` : "";
      return `## ${PLATFORM_META[variant.platform].label}\n${variant.caption}\n\n${variant.body}${tags}`;
    });
    return `# ${item.title}\n\n${blocks.join("\n\n---\n\n")}`;
  }

  function downloadAll(item: Item) {
    // Text export of copy for every platform.
    const textBlob = new Blob([copyText(item)], { type: "text/markdown" });
    const textLink = document.createElement("a");
    textLink.href = URL.createObjectURL(textBlob);
    textLink.download = `${item.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-copy.md`;
    textLink.click();
    URL.revokeObjectURL(textLink.href);

    // Each rendered graphic (opened for save — cross-origin safe).
    item.variants.forEach((variant) => {
      if (!variant.renderedUrl) return;
      const link = document.createElement("a");
      link.href = variant.renderedUrl;
      link.download = `${item.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${variant.platform}.png`;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    });
  }

  async function copyClipboard(item: Item) {
    try {
      await navigator.clipboard.writeText(copyText(item));
    } catch {
      /* ignore */
    }
  }

  function publish(id: string) {
    const form = new FormData();
    form.set("id", id);
    start(async () => {
      await publishContentAction(form);
      router.refresh();
    });
  }

  return (
    <div className="ready-queue">
      {items.map((item) => (
        <section key={item.id} className="admin-panel ready-card">
          <header className="ready-card-head">
            <div>
              <Link href={`/admin/marketing/${item.id}`} className="content-card-title">
                {item.title}
              </Link>
              <Badge tone={item.status === "scheduled" ? "info" : "neutral"}>{item.status}</Badge>
            </div>
            <div className="ready-card-actions">
              <Button type="button" className="admin-secondary" variant="outline" onClick={() => copyClipboard(item)}>
                Copy all
              </Button>
              <Button type="button" className="admin-secondary" variant="outline" onClick={() => downloadAll(item)}>
                <Icon name="arrow" size={15} /> Download all
              </Button>
              <Button type="button" className="admin-primary" onClick={() => publish(item.id)} disabled={pending}>
                <Icon name="check" size={15} /> Mark published
              </Button>
            </div>
          </header>
          <div className="ready-variants">
            {item.variants.map((variant) => (
              <article key={variant.platform} className="ready-variant">
                <div className="ready-variant-head">
                  <strong>{PLATFORM_META[variant.platform].label}</strong>
                  <Badge tone={variant.status === "ready" ? "success" : "neutral"}>{variant.status}</Badge>
                </div>
                {variant.renderedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={variant.renderedUrl} alt={`${variant.platform} graphic`} className="ready-variant-thumb" />
                ) : (
                  <div className="ready-variant-noimg">No graphic</div>
                )}
                <p className="ready-variant-caption">{variant.caption || "—"}</p>
                {variant.hashtags.length ? <p className="ready-variant-tags">{variant.hashtags.join(" ")}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
