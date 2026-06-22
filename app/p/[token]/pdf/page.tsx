import { PdfViewerClient } from "@/components/preview/PdfViewerClient";

// Public, embeddable PDF viewer. Renders the résumé's PDF inline via PDF.js so
// it always displays in-browser (desktop or mobile) instead of downloading.
// Safe to drop into an <iframe> on an external site.
export default async function PublicPdfViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PdfViewerClient token={token} />;
}
