import type { TemplateConfig } from "@/types/resume";
import { AlignmentType } from "docx";
import { getTemplateFont } from "@/lib/template-fonts";

function variantFor(templateId?: string): DocxVariant {
  if (templateId === "ats-002") return "modern";
  if (templateId === "ats-007") return "minimal";
  return "classic";
}

export type DocxVariant = "classic" | "modern" | "minimal";

export interface DocxStyleConfig {
  titleSize: number;       // half-points
  heading2Size: number;
  heading3Size: number;
  normalSize: number;
  fontFamily: string;
  headerFontFamily: string;
  accentColor: string;     // hex without #
  headingTextColor: string; // hex without # — dark color for section heading text
  variant: DocxVariant;
  headerAlign: (typeof AlignmentType)[keyof typeof AlignmentType];
  sectionRuleColor: string; // hex without # — colour of the rule under headings
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

export function getDocxStyles(config: TemplateConfig, templateId?: string): DocxStyleConfig {
  const normalSize = SIZE_MAP[config.fontSize] || 22;
  const variant = variantFor(templateId);
  const accentColor = hexColorClean(config.accentColor || "#a3585c");

  // Heading rule colour mirrors each template's on-screen identity
  const sectionRuleColor =
    variant === "modern" ? accentColor : variant === "minimal" ? "cccccc" : "000000";

  return {
    titleSize: normalSize + 16,    // +8pt for title
    heading2Size: normalSize + 6,  // +3pt for section headings
    heading3Size: normalSize + 2,  // +1pt for sub-headings
    normalSize,
    fontFamily: getTemplateFont(config.fontFamily).docxFamily,
    headerFontFamily: getTemplateFont(
      config.headerFontFamily || config.fontFamily
    ).docxFamily,
    accentColor,
    headingTextColor: hexColorClean(config.primaryColor || "#1b2230"),
    variant,
    headerAlign: variant === "classic" ? AlignmentType.CENTER : AlignmentType.LEFT,
    sectionRuleColor,
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
