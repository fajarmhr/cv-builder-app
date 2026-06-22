"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Download } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

// Renders a published résumé's PDF inline with PDF.js (drawn to <canvas>), so it
// always displays in the browser — desktop or mobile — instead of triggering a
// download. The raw bytes come from /api/public/resume/[token]/pdf.
export function PdfViewerClient({ token }: { token: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderIdRef = useRef(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const downloadUrl = `/api/public/resume/${token}/pdf?download=1`;

  useEffect(() => {
    let cancelled = false;

    // Draw every page to a fresh canvas sized to the container width. Re-runs on
    // resize; a render id guards against two passes appending at once.
    async function renderAll() {
      const doc = docRef.current;
      const container = containerRef.current;
      if (!doc || !container) return;

      const myId = ++renderIdRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = Math.max(1, container.clientWidth);

      container.replaceChildren();

      for (let n = 1; n <= doc.numPages; n++) {
        if (cancelled || myId !== renderIdRef.current) return;
        const page = await doc.getPage(n);
        const unit = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (cssWidth / unit.width) * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.className =
          "mb-4 block h-auto w-full rounded-[2px] bg-white shadow-[0_2px_18px_rgba(27,34,48,0.16)]";

        await page.render({ canvas, viewport }).promise;
        if (cancelled || myId !== renderIdRef.current) return;
        container.appendChild(canvas);
      }
    }

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const res = await fetch(`/api/public/resume/${token}/pdf`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          doc.destroy().catch(() => {});
          return;
        }
        docRef.current = doc;
        await renderAll();
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (docRef.current) renderAll();
      }, 200);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      docRef.current?.destroy().catch(() => {});
      docRef.current = null;
    };
  }, [token]);

  return (
    <div
      className="relative min-h-screen w-full bg-[#e7eaef]"
      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
    >
      {status === "ready" && (
        <a
          href={downloadUrl}
          className="fixed right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-[rgba(27,34,48,0.12)] bg-[#edeff2]/90 px-3 py-1.5 text-[12px] font-medium text-[#1b2230] shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      )}

      <div
        ref={containerRef}
        className="mx-auto w-full max-w-[900px] px-3 py-4 sm:px-5 sm:py-6"
      />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-[13px] text-[#8990a0]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading résumé…
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <p className="max-w-[280px] text-[13px] leading-relaxed text-[#8990a0]">
            This résumé isn’t available — it may be unpublished or the link is
            invalid.
          </p>
        </div>
      )}
    </div>
  );
}
