import type { TemplateConfig } from "@/types/resume";
import { AlignmentType } from "docx";
import { getTemplateFont } from "@/lib/template-fonts";
import { tintOnWhite, FONT_SCALE_MAP, LINE_SPACING_MAP } from "@/components/templates/template-helpers";

const VARIANT_BY_ID: Record<string, DocxVariant> = {
  "ats-002": "accent",
  "ats-003": "bold",
  "ats-004": "timeline",
  "ats-005": "executive",
  "ats-007": "editorial",
};

function variantFor(templateId?: string): DocxVariant {
  return (templateId && VARIANT_BY_ID[templateId]) || "classic";
}

export type DocxVariant =
  | "classic"
  | "accent"
  | "bold"
  | "timeline"
  | "executive"
  | "editorial";

export interface DocxStyleConfig {
  titleSize: number;       // half-points
  heading2Size: number;
  heading3Size: number;
  normalSize: number;
  subSize: number;
  fontFamily: string;
  boldFontFamily: string;
  headerFontFamily: string;
  headerBoldFontFamily: string;
  accentColor: string;     // hex without #
  headingTextColor: string; // hex without # — dark color for section heading text
  variant: DocxVariant;
  headerAlign: (typeof AlignmentType)[keyof typeof AlignmentType];
  sectionRuleColor: string; // hex without # — colour of the rule under headings
  sectionRuleSize: number;  // eighths of a point, as docx borders are measured
  headingShading: string | null;   // hex without # — Accent's tinted band
  headingUsesAccent: boolean;      // heading text in the accent colour
  headerRuleSize: number;   // rule under the header block (0 = none)
  headerRuleColor: string;  // hex without #
  railed: boolean;          // entries/labels sit in a borderless two-column table
  bulletStyle: TemplateConfig["bulletStyle"]; // disc, dash, arrow, square, none
  spacing: {
    after: number;         // twips (1/20th of a point)
    line: number;          // exact line height in twips, matching CSS font-size × line-height
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

function hexColorClean(color: string): string {
  return color.replace("#", "");
}

export function getDocxStyles(config: TemplateConfig, templateId?: string): DocxStyleConfig {
  const variant = variantFor(templateId);
  const scale = FONT_SCALE_MAP[config.fontSize] ?? 1;
  const size = (points: number) => Math.round(points * scale * 2);
  const normalSize = size(9);
  const accentColor = hexColorClean(config.accentColor || "#a3585c");

  const ink = variant === "classic" ? "000000" : hexColorClean(config.primaryColor || "#1b2230");

  // Heading rule mirrors each template's on-screen identity.
  // Accent bands its headings instead, so it draws no rule.
  const sectionRuleColor =
    variant === "bold" ? accentColor : variant === "executive" ? "d5d9df" : "000000";
  const sectionRuleSize =
    variant === "accent" || variant === "timeline" || variant === "editorial"
      ? 0
      : variant === "bold"
      ? 18
      : variant === "executive"
      ? 4
      : 12;

  // Rule beneath the header block. Executive draws it as a double rule.
  const headerRuleSize =
    variant === "bold"
      ? 24
      : variant === "accent"
      ? 18
      : variant === "editorial"
      ? 12
      : variant === "executive"
      ? 6
      : variant === "timeline"
      ? 4
      : 0;
  const headerRuleColor =
    variant === "accent" ? accentColor : variant === "timeline" ? "d5d9df" : ink;

  return {
    titleSize: size(variant === "bold" ? 22.5 : 18),
    heading2Size: size(variant === "classic" ? 10.5 : variant === "timeline" ? 7.5 : 9),
    heading3Size: normalSize,
    normalSize,
    subSize: size(7.5),
    fontFamily: getTemplateFont(config.fontFamily).docxFamily.replace(/\s/g, ""),
    boldFontFamily: `${getTemplateFont(config.fontFamily).docxFamily} Bold`.replace(/\s/g, ""),
    headerFontFamily: getTemplateFont(
      config.headerFontFamily || config.fontFamily
    ).docxFamily.replace(/\s/g, ""),
    headerBoldFontFamily: `${getTemplateFont(config.headerFontFamily || config.fontFamily).docxFamily} Bold`.replace(/\s/g, ""),
    accentColor,
    headingTextColor: ink,
    variant,
    headerAlign: variant === "classic" ? AlignmentType.CENTER : AlignmentType.LEFT,
    sectionRuleColor,
    sectionRuleSize,
    headingShading: variant === "accent" ? hexColorClean(tintOnWhite(`#${accentColor}`, 0.1)) : null,
    headingUsesAccent: variant === "accent",
    headerRuleSize,
    headerRuleColor,
    railed: variant === "timeline" || variant === "editorial",
    bulletStyle: config.bulletStyle || "disc",
    spacing: {
      after: 120,
      line: Math.round(normalSize * 10 * Number(LINE_SPACING_MAP[config.lineSpacing] ?? 1.4)),
    },
    margins: {
      top: 1440,   // 1 inch in twips
      right: 1440,
      bottom: 1440,
      left: 1440,
    },
  };
}
