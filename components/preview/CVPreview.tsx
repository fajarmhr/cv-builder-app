"use client";

import { Suspense, useState } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { getTemplateComponent, DEFAULT_TEMPLATE_CONFIG } from "@/components/templates/TemplateRegistry";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Loader2 } from "lucide-react";

const ZOOM_LEVELS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];

export function CVPreview() {
  const { resume } = useResumeStore();
  const [zoom, setZoom] = useState(80);

  if (!resume) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading preview...
      </div>
    );
  }

  const TemplateComponent = getTemplateComponent(resume.templateId);
  const config = resume.templateConfig || DEFAULT_TEMPLATE_CONFIG;

  function zoomIn() {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
  }

  function zoomOut() {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
  }

  function zoomFit() {
    setZoom(80);
  }

  // A4: 210mm x 297mm at 96dpi = ~794px x ~1123px
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;

  // Calculate the space the scaled page actually occupies
  const scaledWidth = A4_WIDTH * (zoom / 100);
  const scaledHeight = A4_HEIGHT * (zoom / 100);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">
          {zoom}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomFit}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Preview area — native scroll */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div
          className="flex justify-center p-6"
          style={{ minWidth: `${scaledWidth + 48}px` }}
        >
          <div
            className="bg-white shadow-lg border shrink-0"
            style={{
              width: `${A4_WIDTH}px`,
              minHeight: `${A4_HEIGHT}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              marginBottom: `${scaledHeight - A4_HEIGHT}px`,
            }}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <TemplateComponent resume={resume} config={config} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
