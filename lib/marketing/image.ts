// AI image generation for the visual studio (OpenAI image API / "image2").
// Degrades to a clear error when no key is configured — callers surface it.
import { openai } from "@ai-sdk/openai";
import { generateImage } from "ai";
import { uploadMedia } from "@/lib/marketing/storage";

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export function isImageGenConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type GeneratedImage = { storagePath: string; publicUrl: string; mime: string; prompt: string };

export async function generateMarketingImage(input: {
  prompt: string;
  size?: `${number}x${number}`;
}): Promise<GeneratedImage> {
  if (!isImageGenConfigured()) {
    throw new Error("Image generation needs OPENAI_API_KEY.");
  }

  const result = await generateImage({
    model: openai.image(IMAGE_MODEL),
    prompt: input.prompt,
    size: input.size ?? "1024x1024",
  });

  const image = result.image;
  if (!image) throw new Error("No image was returned.");

  const bytes = Buffer.from(image.base64, "base64");
  const uploaded = await uploadMedia(bytes, { mime: image.mediaType || "image/png", prefix: "ai" });
  return { ...uploaded, prompt: input.prompt };
}
