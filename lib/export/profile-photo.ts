import sharp from "sharp";

/** Word and react-pdf both receive a supported PNG with the preview's circular crop. */
export async function loadExportPhoto(url?: string): Promise<Buffer | undefined> {
  if (!url) return undefined;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Unable to load profile photo");
  return sharp(Buffer.from(await response.arrayBuffer()))
    .resize(168, 168, { fit: "cover" })
    .ensureAlpha()
    .composite([{
      input: Buffer.from('<svg width="168" height="168"><circle cx="84" cy="84" r="84" fill="white"/></svg>'),
      blend: "dest-in",
    }])
    .png()
    .toBuffer();
}
