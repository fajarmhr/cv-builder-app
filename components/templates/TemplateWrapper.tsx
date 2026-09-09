"use client";

import type { TemplateConfig } from "@/types/resume";
import { getTemplateFont } from "@/lib/template-fonts";
import { FONT_SCALE_MAP, LINE_SPACING_MAP } from "./template-helpers";

interface TemplateWrapperProps {
  config: TemplateConfig;
  children: React.ReactNode;
  padding?: string;
}

const FONT_SIZE_MAP: Record<string, string> = {
  small: "10pt",
  medium: "11pt",
  large: "12pt",
};

export function TemplateWrapper({
  config,
  children,
  padding = "2.54cm",
}: TemplateWrapperProps) {
  const fontFamily = getTemplateFont(config.fontFamily).cssFamily;
  const headerFontFamily = getTemplateFont(
    config.headerFontFamily || config.fontFamily
  ).cssFamily;
  const fontSize = FONT_SIZE_MAP[config.fontSize] || FONT_SIZE_MAP["medium"];
  const lineSpacing = LINE_SPACING_MAP[config.lineSpacing] || LINE_SPACING_MAP["normal"];
  const scale = FONT_SCALE_MAP[config.fontSize] ?? 1;

  return (
    <div
      className="cv-template-root bg-white text-black min-h-full"
      style={
        {
          fontFamily,
          fontSize,
          lineHeight: lineSpacing,
          padding,
          "--primary-color": config.primaryColor || "#1b2230",
          "--accent-color": config.accentColor || "#a3585c",
          "--header-font-family": headerFontFamily,
          "--font-size": fontSize,
          "--line-spacing": lineSpacing,
          "--cv-scale": scale,
        } as React.CSSProperties
      }
    >
      <style>
        {`
          .cv-template-root h1,
          .cv-template-root h2,
          .cv-template-root h3 {
            font-family: var(--header-font-family);
          }
        `}
      </style>
      {children}
    </div>
  );
}
