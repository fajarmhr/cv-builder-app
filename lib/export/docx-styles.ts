import type { TemplateConfig } from "@/types/resume";

export interface DocxStyleConfig {
  titleSize: number;       // half-points
  heading2Size: number;
  heading3Size: number;
  normalSize: number;
  fontFamily: string;
  accentColor: string;     // hex without #
  headingTextColor: string; // hex without # — dark color for section heading text
  bulletStyle: TemplateConfig["bulletStyle"]; // disc, dash, arrow, square, none
  spacing: {
    after: number;         // twips (1/20th of a point)
    line: number;          // line spacing in 240ths
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

const FONT_MAP: Record<string, string> = {
  "sans-serif": "Inter",
  inter: "Inter",
  lato: "Lato",
  raleway: "Raleway",
  montserrat: "Montserrat",
  roboto: "Roboto",
  garamond: "EB Garamond",
  calibri: "Calibri",
  arial: "Arial",
  helvetica: "Helvetica",
  georgia: "Georgia",
  "times-new-roman": "Times New Roman",
};

const SIZE_MAP: Record<string, number> = {
  small: 20,   // 10pt in half-points
  medium: 22,  // 11pt
  large: 24,   // 12pt
};

const LINE_MAP: Record<string, number> = {
  compact: 240,   // 1.0 spacing
  normal: 288,    // 1.2 spacing
  relaxed: 360,   // 1.5 spacing
};

function hexColorClean(color: string): string {
  return color.replace("#", "");
}

export function getDocxStyles(config: TemplateConfig): DocxStyleConfig {
  const normalSize = SIZE_MAP[config.fontSize] || 22;

  return {
    titleSize: normalSize + 16,    // +8pt for title
    heading2Size: normalSize + 6,  // +3pt for section headings
    heading3Size: normalSize + 2,  // +1pt for sub-headings
    normalSize,
    fontFamily: FONT_MAP[config.fontFamily] || "Inter",
    accentColor: hexColorClean(config.accentColor || "#2563eb"),
    headingTextColor: hexColorClean(config.primaryColor || "#1a1a1a"),
    bulletStyle: config.bulletStyle || "disc",
    spacing: {
      after: 120,
      line: LINE_MAP[config.lineSpacing] || 288,
    },
    margins: {
      top: 1440,   // 1 inch in twips
      right: 1440,
      bottom: 1440,
      left: 1440,
    },
  };
}
