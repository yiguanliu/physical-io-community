"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/ui";
import { generateImageAction, importImageAction } from "@/app/admin/content-actions";
import { PLATFORMS, PLATFORM_META, type Platform } from "@/lib/marketing/config";
import type { ContentAsset, ContentTemplate, ContentVariant } from "@/lib/admin/content-studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";

type TitlePosition = "bottom-left" | "top-left" | "center";

export default function VisualStudio({
  id,
  title,
  assets,
  variants,
  templates,
  initialPlatform,
}: {
  id: string;
  title: string;
  assets: ContentAsset[];
  variants: ContentVariant[];
  templates: ContentTemplate[];
  initialPlatform: Platform;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [headline, setHeadline] = useState(title);
  const [titleScale, setTitleScale] = useState(1);
  const [titlePosition, setTitlePosition] = useState<TitlePosition>("bottom-left");
  const [textColor, setTextColor] = useState("#ffffff");
  const [overlay, setOverlay] = useState(0.45);
  const [bgAssetId, setBgAssetId] = useState<string>(assets[0]?.id ?? "");
  const [templateId, setTemplateId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [importUrlValue, setImportUrlValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const canvas = PLATFORM_META[platform].canvas;
  const variant = variants.find((item) => item.platform === platform);
  const bgAsset = useMemo(() => assets.find((asset) => asset.id === bgAssetId) ?? null, [assets, bgAssetId]);

  // The asset library is server state: after an upload/generate we refresh the
  // route, so fall back to the newest asset if the selection disappeared.
  useEffect(() => {
    if (bgAssetId && assets.some((asset) => asset.id === bgAssetId)) return;
    setBgAssetId(assets[0]?.id ?? "");
  }, [assets, bgAssetId]);

  // Apply a template's layout defaults when chosen.
  useEffect(() => {
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    const layout = template?.layout as { title?: { position?: TitlePosition; scale?: number } } | undefined;
    if (layout?.title?.position) setTitlePosition(layout.title.position);
    if (layout?.title?.scale) setTitleScale(layout.title.scale);
  }, [templateId, templates]);

  // Load background image whenever the selection changes.
  useEffect(() => {
    if (!bgAsset) {
      setLoadedImage(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setLoadedImage(image);
    image.onerror = () => setLoadedImage(null);
    image.src = bgAsset.publicUrl;
  }, [bgAsset]);

  // Draw the composition.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.width = canvas.width;
    el.height = canvas.height;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111110";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (loadedImage) {
      const scale = Math.max(canvas.width / loadedImage.width, canvas.height / loadedImage.height);
      const dw = loadedImage.width * scale;
      const dh = loadedImage.height * scale;
      ctx.drawImage(loadedImage, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    }

    // Contrast overlay for legible text.
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0,0,0,${overlay * 0.4})`);
    gradient.addColorStop(1, `rgba(0,0,0,${overlay})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Brand mark, top area.
    const brandSize = Math.round(canvas.width * 0.032);
    ctx.fillStyle = textColor;
    ctx.font = `700 ${brandSize}px Helvetica, Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText("PHYSICAL I/O", canvas.width * 0.05, canvas.height * 0.05);

    // Headline.
    const baseFont = Math.round(canvas.width * 0.075 * titleScale);
    ctx.font = `800 ${baseFont}px Helvetica, Arial, sans-serif`;
    const maxWidth = canvas.width * 0.9;
    const words = headline.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const lineHeight = baseFont * 1.05;
    const blockHeight = lines.length * lineHeight;
    let y: number;
    if (titlePosition === "top-left") y = canvas.height * 0.16;
    else if (titlePosition === "center") y = (canvas.height - blockHeight) / 2;
    else y = canvas.height - blockHeight - canvas.height * 0.06;

    ctx.textBaseline = "top";
    ctx.fillStyle = textColor;
    lines.forEach((text, index) => {
      ctx.fillText(text, canvas.width * 0.05, y + index * lineHeight);
    });
  }, [loadedImage, headline, titleScale, titlePosition, textColor, overlay, canvas.width, canvas.height]);

  function exportGraphic() {
    const el = canvasRef.current;
    if (!el) return;
    let dataUrl: string;
    try {
      dataUrl = el.toDataURL("image/png");
    } catch {
      setStatus("Export blocked (image CORS). Try an uploaded or AI-generated image.");
      return;
    }
    setStatus("Saving graphic…");
    start(async () => {
      const res = await fetch("/api/marketing/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: id,
          platform,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          renderConfig: { headline, titleScale, titlePosition, textColor, overlay, bgAssetId, templateId },
        }),
      });
      if (res.ok) {
        setStatus(`Saved to the ${PLATFORM_META[platform].label} variant.`);
        router.refresh();
      } else {
        setStatus("Save failed.");
      }
    });
  }

  function download() {
    const el = canvasRef.current;
    if (!el) return;
    try {
      const link = document.createElement("a");
      link.download = `${platform}-${id}.png`;
      link.href = el.toDataURL("image/png");
      link.click();
    } catch {
      setStatus("Download blocked (image CORS).");
    }
  }

  /**
   * Imports run through a server action: fetching a third-party image in the
   * browser is blocked by CORS on most image hosts.
   */
  function importFromUrl() {
    const url = importUrlValue.trim();
    if (!url) return;
    setStatus("Importing…");
    start(async () => {
      try {
        const form = new FormData();
        form.set("id", id);
        form.set("url", url);
        const assetId = await importImageAction(form);
        setBgAssetId(assetId);
        setImportUrlValue("");
        setStatus("Image imported.");
        router.refresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not import that URL.");
      }
    });
  }

  function generate() {
    if (!prompt.trim()) return;
    setStatus("Generating image…");
    start(async () => {
      try {
        const form = new FormData();
        form.set("id", id);
        form.set("prompt", prompt);
        form.set("size", "1024x1024");
        const assetId = await generateImageAction(form);
        setBgAssetId(assetId);
        setStatus("Image generated and added to the library.");
        router.refresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Image generation failed.");
      }
    });
  }

  return (
    <div className="visual-studio">
      <div className="visual-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="visual-canvas"
          role="img"
          aria-label={`${PLATFORM_META[platform].label} graphic preview: “${headline}” at ${canvas.width} by ${canvas.height} pixels`}
          style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
        />
        <div className="visual-canvas-actions">
          <Button type="button" className="admin-primary" onClick={exportGraphic} disabled={pending}>
            <Icon name="check" size={15} /> Save to variant
          </Button>
          <Button type="button" className="admin-secondary" variant="outline" onClick={download}>
            Download PNG
          </Button>
          <span className="content-status" role="status">
            {status ?? `${canvas.width} × ${canvas.height}px${variant?.renderedAsset ? " · variant has a saved graphic" : ""}`}
          </span>
        </div>
      </div>

      <aside className="visual-controls">
        <section className="admin-panel content-panel">
          <h2 className="content-side-heading">Platform</h2>
          <div className="admin-segmented content-segmented-4" role="group" aria-label="Platform">
            {PLATFORMS.map((p) => (
              <Button
                key={p}
                type="button"
                variant="ghost"
                className={platform === p ? "active" : ""}
                aria-pressed={platform === p}
                onClick={() => setPlatform(p)}
              >
                {PLATFORM_META[p].label}
              </Button>
            ))}
          </div>
          <label className="visual-field" htmlFor="visual-template">
            Template preset
          </label>
          <FormSelect
            id="visual-template"
            className="admin-select"
            value={templateId}
            onValueChange={setTemplateId}
            options={[{ value: "", label: "None" }, ...templates.map((template) => ({ value: template.id, label: template.name }))]}
          />
        </section>

        <section className="admin-panel content-panel">
          <h2 className="content-side-heading">Headline</h2>
          <label className="visual-field" htmlFor="visual-headline">
            Text
          </label>
          <Textarea
            id="visual-headline"
            className="visual-headline"
            rows={3}
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
          />
          <label className="visual-field" htmlFor="visual-position">
            Position
          </label>
          <FormSelect
            id="visual-position"
            className="admin-select"
            value={titlePosition}
            onValueChange={(value) => setTitlePosition(value as TitlePosition)}
            options={[
              { value: "bottom-left", label: "Bottom left" },
              { value: "top-left", label: "Top left" },
              { value: "center", label: "Center" },
            ]}
          />
          <label className="visual-field" htmlFor="visual-scale">
            Title size <span aria-hidden="true">({titleScale.toFixed(2)}×)</span>
          </label>
          <Slider
            id="visual-scale"
            min={0.6}
            max={1.6}
            step={0.05}
            value={[titleScale]}
            aria-valuetext={`${titleScale.toFixed(2)} times`}
            onValueChange={([value]) => setTitleScale(value)}
          />
          <label className="visual-field" htmlFor="visual-overlay">
            Overlay <span aria-hidden="true">({Math.round(overlay * 100)}%)</span>
          </label>
          <Slider
            id="visual-overlay"
            min={0}
            max={0.85}
            step={0.05}
            value={[overlay]}
            aria-valuetext={`${Math.round(overlay * 100)} percent`}
            onValueChange={([value]) => setOverlay(value)}
          />
          <label className="visual-field" htmlFor="visual-color">
            Text colour
          </label>
          <Input
            id="visual-color"
            className="visual-color"
            type="color"
            value={textColor}
            onChange={(event) => setTextColor(event.target.value)}
          />
        </section>

        <section className="admin-panel content-panel">
          <h2 className="content-side-heading">Imagery</h2>
          {assets.length ? (
            <div className="visual-asset-grid" role="group" aria-label="Background image">
              {assets.map((asset) => (
                <Button
                  key={asset.id}
                  type="button"
                  variant="ghost"
                  className={bgAssetId === asset.id ? "visual-asset selected h-auto" : "visual-asset h-auto"}
                  aria-pressed={bgAssetId === asset.id}
                  onClick={() => setBgAssetId(asset.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.publicUrl} alt={asset.altText || `${asset.kind.replace("_", " ")} image`} />
                </Button>
              ))}
            </div>
          ) : (
            <p className="admin-empty-note">No images yet. Import one or generate one below.</p>
          )}

          <label className="visual-field" htmlFor="visual-import">
            Import from URL
          </label>
          <div className="visual-inline-form">
            <Input
              id="visual-import"
              type="url"
              inputMode="url"
              value={importUrlValue}
              onChange={(event) => setImportUrlValue(event.target.value)}
              placeholder="https://…/image.jpg"
            />
            <Button type="button" className="admin-secondary" variant="outline" onClick={importFromUrl} disabled={pending || !importUrlValue.trim()}>
              Import
            </Button>
          </div>

          <label className="visual-field" htmlFor="visual-prompt">
            Generate with AI
          </label>
          <div className="visual-inline-form">
            <Input
              id="visual-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe an image…"
            />
            <Button type="button" className="admin-secondary" variant="outline" onClick={generate} disabled={pending || !prompt.trim()}>
              <Icon name="spark" size={15} /> Generate
            </Button>
          </div>
        </section>
      </aside>
    </div>
  );
}
