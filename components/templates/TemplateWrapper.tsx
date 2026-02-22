"use client";

import type { TemplateConfig } from "@/types/resume";

interface TemplateWrapperProps {
  config: TemplateConfig;
  children: React.ReactNode;
  padding?: string;
}

const FONT_MAP: Record<string, string> = {
  "sans-serif": "'Inter', 'Helvetica Neue', Arial, sans-serif",
  inter: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  lato: "'Lato', 'Helvetica Neue', Arial, sans-serif",
  raleway: "'Raleway', 'Helvetica Neue', Arial, sans-serif",
  montserrat: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  roboto: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
  garamond: "'EB Garamond', Garamond, 'Times New Roman', serif",
  calibri: "Calibri, 'Segoe UI', sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  "times-new-roman": "'Times New Roman', Times, serif",
};

const FONT_SIZE_MAP: Record<string, string> = {
  small: "10pt",
  medium: "11pt",
  large: "12pt",
};

const LINE_SPACING_MAP: Record<string, string> = {
  compact: "1.2",
  normal: "1.4",
  relaxed: "1.6",
};

const SCALE_MAP: Record<string, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.1,
};

export function TemplateWrapper({
  config,
  children,
  padding = "2.54cm",
}: TemplateWrapperProps) {
  const fontFamily = FONT_MAP[config.fontFamily] || FONT_MAP["sans-serif"];
  const fontSize = FONT_SIZE_MAP[config.fontSize] || FONT_SIZE_MAP["medium"];
  const lineSpacing = LINE_SPACING_MAP[config.lineSpacing] || LINE_SPACING_MAP["normal"];
  const scale = SCALE_MAP[config.fontSize] || 1;

  return (
    <div
      className="cv-template-root bg-white text-black min-h-full"
      style={
        {
          fontFamily,
          fontSize,
          lineHeight: lineSpacing,
          padding,
          "--primary-color": config.primaryColor || "#1a1a1a",
          "--accent-color": config.accentColor || "#2563eb",
          "--font-size": fontSize,
          "--line-spacing": lineSpacing,
          "--cv-scale": scale,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
