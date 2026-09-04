"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/ui";
import { confirmDraftAction, generateDraftAction, updateContentAction } from "@/app/admin/content-actions";
import ImageCropper from "@/components/admin/marketing/image-cropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// react-md-editor is a client-only editor; load it without SSR.
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export default function DraftEditor({
  id,
  title,
  summary,
  tags,
  body,
  confirmed,
}: {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  body: string;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(body || "");
  const [titleValue, setTitleValue] = useState(title);
  const [summaryValue, setSummaryValue] = useState(summary);
  const [tagsValue, setTagsValue] = useState(tags.join(", "));
  const [cropOpen, setCropOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function saveMeta() {
    const form = new FormData();
    form.set("id", id);
    form.set("title", titleValue || "Untitled");
    form.set("summary", summaryValue);
    form.set("categoryTags", tagsValue);
    form.set("bodyMarkdown", value);
    setStatus("Saving…");
    start(async () => {
      await updateContentAction(form);
      setStatus("Saved");
      router.refresh();
    });
  }

  function generate() {
    const form = new FormData();
    form.set("id", id);
    setStatus("Drafting with AI…");
    start(async () => {
      await generateDraftAction(form);
      setStatus("Draft generated");
      router.refresh();
    });
  }

  function confirm() {
    const form = new FormData();
    form.set("id", id);
    form.set("bodyMarkdown", value);
    setStatus("Confirming…");
    start(async () => {
      await confirmDraftAction(form);
      setStatus(null);
      router.refresh();
    });
  }

  async function onCropped(dataUrl: string) {
    setCropOpen(false);
    setStatus("Uploading image…");
    try {
      const res = await fetch("/api/marketing/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: id, dataUrl, kind: "upload" }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url: string };
      setValue((current) => `${current}\n\n![image](${data.url})\n`);
      setStatus("Image inserted");
    } catch {
      setStatus("Image upload failed");
    }
  }

  const [pendingFile, setPendingFile] = useState<string | null>(null);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile(String(reader.result));
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <section className="admin-panel content-editor">
      <div className="content-editor-meta">
        <Input
          className="content-title-input"
          value={titleValue}
          aria-label="Content title"
          onChange={(event) => setTitleValue(event.target.value)}
          placeholder="Title"
        />
        <Input
          className="content-summary-input"
          value={summaryValue}
          aria-label="Content summary"
          onChange={(event) => setSummaryValue(event.target.value)}
          placeholder="One-line hook / summary"
        />
        <Input
          className="content-tags-input"
          value={tagsValue}
          aria-label="Content tags, comma separated"
          onChange={(event) => setTagsValue(event.target.value)}
          placeholder="Tags (comma separated)"
        />
      </div>

      <div className="content-editor-toolbar">
        <Button type="button" className="admin-secondary" variant="outline" onClick={generate} disabled={pending}>
          <Icon name="spark" size={15} /> Draft from source
        </Button>
        <Button type="button" className="admin-secondary" variant="outline" onClick={() => fileRef.current?.click()} disabled={pending}>
          <Icon name="plus" size={15} /> Insert image
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <Button type="button" className="admin-secondary" variant="outline" onClick={saveMeta} disabled={pending}>
          Save draft
        </Button>
        {status ? <span className="content-board-status" role="status">{status}</span> : null}
      </div>

      <div className="content-md" data-color-mode="light">
        <MDEditor value={value} onChange={(next) => setValue(next ?? "")} height={420} preview="live" />
      </div>

      <div className="content-editor-footer">
        <Button type="button" className="admin-primary" onClick={confirm} disabled={pending}>
          {confirmed ? "Re-confirm master draft" : "Confirm draft → build variants"}
        </Button>
        {confirmed ? <small>Confirming reseeds platform variants from this draft.</small> : null}
      </div>

      {cropOpen && pendingFile ? (
        <ImageCropper src={pendingFile} onCancel={() => setCropOpen(false)} onDone={onCropped} />
      ) : null}
    </section>
  );
}
