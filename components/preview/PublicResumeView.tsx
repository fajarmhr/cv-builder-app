"use client";

import { Suspense, useState } from "react";
import { Loader2, ZoomIn, ZoomOut, Download, FileText } from "lucide-react";
import {
  getTemplateComponent,
  DEFAULT_TEMPLATE_CONFIG,
} from "@/components/templates/TemplateRegistry";
import type { ResumeData } from "@/types/resume";

const ZOOM_LEVELS = [50, 60, 70, 80, 90, 100];
const A4_W = 794;
const A4_H = 1123;

// Read-only public résumé view — renders the live template (same as the editor
// preview) so it matches what the owner sees. PDF / DOCX are download actions.
export function PublicResumeView({
  resume,
  base,
  name,
  role,
}: {
  resume: ResumeData;
  base: string;
  name: string;
  role: string;
}) {
  const [zoom, setZoom] = useState(80);

  const TemplateComponent = getTemplateComponent(resume.templateId);
  const config = resume.templateConfig || DEFAULT_TEMPLATE_CONFIG;

  const scaledW = A4_W * (zoom / 100);
  const scaledH = A4_H * (zoom / 100);

  function step(dir: 1 | -1) {
    const i = ZOOM_LEVELS.indexOf(zoom);
    const next = i + dir;
    if (next >= 0 && next < ZOOM_LEVELS.length) setZoom(ZOOM_LEVELS[next]);
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#e7eaef]"
      style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
    >
      {/* slim header */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-[rgba(27,34,48,0.12)] bg-[#edeff2]/90 px-5 py-3 backdrop-blur">
        <div className="min-w-0">
          <div
            className="truncate text-[18px] tracking-[-0.01em] text-[#1b2230]"
            style={{ fontFamily: "'Newsreader', Georgia, serif" }}
          >
            {name}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.04em] text-[#8990a0]">
            {role ? `${role} · ` : ""}Résumé · shared via CV Builder
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-1 sm:flex">
            <button
              onClick={() => step(-1)}
              className="rounded-md border border-[rgba(27,34,48,0.2)] p-1.5 text-[#1b2230] hover:bg-white"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center font-mono text-xs text-[#5b6373]">
              {zoom}%
            </span>
            <button
              onClick={() => step(1)}
              className="rounded-md border border-[rgba(27,34,48,0.2)] p-1.5 text-[#1b2230] hover:bg-white"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <a
            href={`${base}/pdf?download=1`}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(27,34,48,0.2)] px-4 py-2 text-[13px] text-[#1b2230] transition-colors hover:bg-[#1b2230] hover:text-[#edeff2]"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
          <a
            href={`${base}/docx`}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(27,34,48,0.2)] px-4 py-2 text-[13px] text-[#1b2230] transition-colors hover:bg-[#1b2230] hover:text-[#edeff2]"
          >
            <FileText className="h-4 w-4" />
            DOCX
          </a>
        </div>
      </header>

      {/* live preview (the actual template, not a PDF) */}
      <main className="flex-1 overflow-auto bg-[#dfe3e9]">
        <div
          className="flex justify-center p-4 sm:p-8"
          style={{ minWidth: `${scaledW + 48}px` }}
        >
          <div
            className="shrink-0 border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,19,28,0.16)]"
            style={{
              width: `${A4_W}px`,
              minHeight: `${A4_H}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              marginBottom: `${scaledH - A4_H}px`,
            }}
          >
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8990a0]" />
                </div>
              }
            >
              <TemplateComponent resume={resume} config={config} />
            </Suspense>
          </div>
        </div>
      </main>

      <footer className="border-t border-[rgba(27,34,48,0.1)] bg-[#edeff2] py-4 text-center font-mono text-[10px] tracking-[0.08em] text-[#8990a0]">
        Read-only · built with CV Builder
      </footer>
    </div>
  );
}
