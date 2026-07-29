"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import {
  getTemplateComponent,
  DEFAULT_TEMPLATE_CONFIG,
} from "@/components/templates/TemplateRegistry";
import type { ResumeData } from "@/types/resume";

const ZOOM_LEVELS = [50, 60, 70, 80, 90, 100];
const A4_W = 794;
const A4_H = 1123;

// Read-only admin view of any user's résumé — renders the live template so it
// matches what the owner sees. No editing, no downloads.
export function AdminResumePreview({
  resume,
  ownerName,
  ownerUsername,
  ownerId,
}: {
  resume: ResumeData;
  ownerName: string;
  ownerUsername: string;
  ownerId: string;
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
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[var(--c-bg)]">
      <header className="sticky top-16 z-30 flex flex-wrap items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface)]/90 px-5 py-3 backdrop-blur">
        <Link
          href={`/admin/users/${ownerId}`}
          className="flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 font-mono text-[11px] text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-surface-3)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm text-[var(--c-ink)]">
            {resume.title}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.04em] text-[var(--c-muted-2)]">
            {ownerName} · @{ownerUsername} · read-only
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <button
            onClick={() => step(-1)}
            className="rounded-md border border-[var(--c-border)] p-1.5 text-[var(--c-ink-2)] hover:bg-[var(--c-surface-3)]"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center font-mono text-xs text-[var(--c-muted)]">
            {zoom}%
          </span>
          <button
            onClick={() => step(1)}
            className="rounded-md border border-[var(--c-border)] p-1.5 text-[var(--c-ink-2)] hover:bg-[var(--c-surface-3)]"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

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
    </div>
  );
}
