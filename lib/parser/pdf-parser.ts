import { execFile } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const TESSERACT_PATH =
  process.env.TESSERACT_PATH ||
  "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";

async function getPdfjsLib() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      const { createRequire } = await import("module");
      const req = createRequire(import.meta.url);
      const wp = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "file:///" + wp.replaceAll("\\", "/");
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }
  }
  return pdfjsLib;
}

/** Try native text extraction first (for text-based PDFs) */
async function extractNativeText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await getPdfjsLib();
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => (item as { str?: string }).str || "")
      .join(" ");
    if (pageText.trim()) {
      textParts.push(pageText);
    }
  }
  return textParts.join("\n");
}

/** Convert PDF pages to images using pdf-to-img, then OCR with Tesseract */
async function extractOcrText(buffer: Buffer): Promise<string> {
  const { pdf } = await import("pdf-to-img");

  const tmpDir = path.resolve(process.cwd(), "storage", ".tmp");
  await mkdir(tmpDir, { recursive: true });

  const textParts: string[] = [];
  let pageNum = 0;

  const doc = await pdf(buffer, { scale: 2.0 });

  for await (const image of doc) {
    pageNum++;
    const pngPath = path.join(
      tmpDir,
      `ocr_page_${pageNum}_${Date.now()}.png`
    );
    await writeFile(pngPath, image);

    try {
      const { stdout } = await execFileAsync(
        TESSERACT_PATH,
        [pngPath, "stdout", "-l", "eng+ind", "--psm", "6"],
        { maxBuffer: 10 * 1024 * 1024 }
      );

      if (stdout.trim()) {
        textParts.push(stdout.trim());
      }
    } finally {
      await unlink(pngPath).catch(() => {});
    }
  }

  return textParts.join("\n\n");
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Step 1: Try native text extraction (fast, for text-based PDFs)
  const nativeText = await extractNativeText(buffer);

  if (nativeText.trim().length > 50) {
    return nativeText;
  }

  // Step 2: Fall back to OCR (for scanned/image-based PDFs)
  console.log("PDF has little/no native text, falling back to OCR...");
  try {
    const ocrText = await extractOcrText(buffer);
    return ocrText || nativeText;
  } catch (err) {
    console.error("OCR failed, returning native text:", err);
    return nativeText;
  }
}
