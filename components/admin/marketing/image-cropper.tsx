"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type AspectKey = "original" | "1:1" | "4:5" | "16:9" | "1.91:1";

const ASPECTS: Record<AspectKey, number | null> = {
  original: null,
  "1:1": 1,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
  "1.91:1": 1.91,
};

// Lightweight center-crop tool: pick an aspect ratio and nudge the crop
// vertically/horizontally, then export a data URL for upload.
export default function ImageCropper({
  src,
  onDone,
  onCancel,
}: {
  src: string;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<AspectKey>("original");
  const [offsetX, setOffsetX] = useState(50);
  const [offsetY, setOffsetY] = useState(50);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imgRef.current = image;
      setReady(true);
    };
    image.src = src;
  }, [src]);

  useEffect(() => {
    if (!ready) return;
    const image = imgRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const ratio = ASPECTS[aspect];
    let sw = image.width;
    let sh = image.height;
    if (ratio) {
      if (image.width / image.height > ratio) {
        sh = image.height;
        sw = Math.round(sh * ratio);
      } else {
        sw = image.width;
        sh = Math.round(sw / ratio);
      }
    }
    const maxX = image.width - sw;
    const maxY = image.height - sh;
    const sx = Math.round((maxX * offsetX) / 100);
    const sy = Math.round((maxY * offsetY) / 100);

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  }, [ready, aspect, offsetX, offsetY]);

  function apply() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onDone(canvas.toDataURL("image/png"));
  }

  return (
    <div className="content-cropper-backdrop" role="dialog" aria-modal="true">
      <div className="content-cropper">
        <header>
          <strong>Crop image</strong>
          <Button type="button" variant="ghost" size="icon" className="admin-icon-button" onClick={onCancel} aria-label="Close">
            ✕
          </Button>
        </header>
        <div className="content-cropper-preview">
          <canvas ref={canvasRef} />
        </div>
        <div className="content-cropper-controls">
          <div className="admin-segmented" role="group" aria-label="Aspect ratio">
            {(Object.keys(ASPECTS) as AspectKey[]).map((key) => (
              <Button key={key} type="button" variant="ghost" className={aspect === key ? "active" : ""} onClick={() => setAspect(key)}>
                {key}
              </Button>
            ))}
          </div>
          <label>
            Horizontal
            <Slider min={0} max={100} value={[offsetX]} onValueChange={([value]) => setOffsetX(value)} />
          </label>
          <label>
            Vertical
            <Slider min={0} max={100} value={[offsetY]} onValueChange={([value]) => setOffsetY(value)} />
          </label>
        </div>
        <footer>
          <Button type="button" className="admin-secondary" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" className="admin-primary" onClick={apply} disabled={!ready}>
            Use image
          </Button>
        </footer>
      </div>
    </div>
  );
}
