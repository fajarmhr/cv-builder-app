async function getPdfjsLib() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Run without a separate worker (serverless-friendly).
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  }
  return pdfjsLib;
}

/** Extract embedded text from a text-based PDF. */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
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
