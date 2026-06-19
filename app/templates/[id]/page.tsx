"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTemplateComponent,
  getAllTemplates,
  normalizeTemplateId,
} from "@/components/templates/TemplateRegistry";
import { SAMPLE_RESUME, SAMPLE_CONFIG } from "@/lib/sample-resume";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ZoomIn, ZoomOut, Loader2, LogIn } from "lucide-react";

const ZOOM_LEVELS = [50, 60, 70, 80, 90, 100];
const A4_W = 794;
const A4_H = 1123;

// Public, login-free template preview rendered with placeholder data.
export default function TemplatePreviewPage() {
  const params = useParams();
  const rawId = (params.id as string) || "ats-001";
  const id = normalizeTemplateId(rawId);
  const [zoom, setZoom] = useState(80);

  const meta = getAllTemplates().find((t) => t.id === id);
  const TemplateComponent = getTemplateComponent(id);

  const scaledW = A4_W * (zoom / 100);
  const scaledH = A4_H * (zoom / 100);

  function step(dir: 1 | -1) {
    const i = ZOOM_LEVELS.indexOf(zoom);
    const next = i + dir;
    if (next >= 0 && next < ZOOM_LEVELS.length) setZoom(ZOOM_LEVELS[next]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#e7eaef]" style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      {/* header */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-[rgba(27,34,48,0.12)] bg-[#edeff2]/90 px-5 py-3 backdrop-blur">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-full border border-[rgba(27,34,48,0.18)] px-3 py-1.5 text-[13px] text-[#1b2230] transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All templates
        </Link>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#8990a0]">
            Template preview · sample data
          </div>
          <div className="text-[15px] tracking-[-0.01em] text-[#1b2230]" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
            {meta?.name || "Template"}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-1 sm:flex">
            <button onClick={() => step(-1)} className="rounded-md border border-[rgba(27,34,48,0.2)] p-1.5 text-[#1b2230] hover:bg-white" aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center font-mono text-xs text-[#5b6373]">{zoom}%</span>
            <button onClick={() => step(1)} className="rounded-md border border-[rgba(27,34,48,0.2)] p-1.5 text-[#1b2230] hover:bg-white" aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <Link href="/login">
            <Button className="rounded-full bg-[#1b2230] px-4 font-semibold text-[#edeff2] hover:bg-[#2c3340]">
              <LogIn className="h-4 w-4" />
              Use this template
            </Button>
          </Link>
        </div>
      </header>

      {/* paper */}
      <main className="flex-1 overflow-auto bg-[#dfe3e9]">
        <div className="flex justify-center p-6" style={{ minWidth: `${scaledW + 48}px` }}>
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
              <TemplateComponent resume={{ ...SAMPLE_RESUME, templateId: id }} config={SAMPLE_CONFIG} />
            </Suspense>
          </div>
        </div>
      </main>

      <footer className="border-t border-[rgba(27,34,48,0.1)] bg-[#edeff2] py-4 text-center font-mono text-[10px] tracking-[0.08em] text-[#8990a0]">
        Sample data shown · log in to build your own
      </footer>
    </div>
  );
}
