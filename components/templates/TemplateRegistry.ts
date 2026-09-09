import { lazy, type ComponentType } from "react";
import type { ResumeData, TemplateConfig } from "@/types/resume";

export interface TemplateProps {
  resume: ResumeData;
  config: TemplateConfig;
}

export interface TemplateMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  layoutType: "single-column" | "two-column";
}

/**
 * Six ATS templates curated for international recruiters.
 * All single-column, photo-free, reverse-chronological — the safest, most
 * widely-accepted formats across US / UK / EU / CA / AU hiring systems.
 *   ats-001 Classic   — the strongest all-rounder (left as the reference)
 *   ats-002 Accent    — tinted heading bands, accent rule under the header
 *   ats-003 Bold      — oversized name, heavy rule, short accent underlines
 *   ats-004 Timeline  — dates in a left column beside each entry
 *   ats-005 Executive — serif headings, double rule, hairline dividers
 *   ats-007 Editorial — section labels in a left gutter
 * ats-006 is deliberately unused: 002 and 007 keep their ids so résumés
 * already saved against them don't fall back to Classic.
 */
const TEMPLATE_MAP: Record<string, ComponentType<TemplateProps>> = {
  "ats-001": lazy(() => import("./ats/Ats001Template").then((m) => ({ default: m.Ats001Template }))),
  "ats-002": lazy(() => import("./ats/AtsVariants").then((m) => ({ default: m.AccentTemplate }))),
  "ats-003": lazy(() => import("./ats/AtsVariants").then((m) => ({ default: m.BoldTemplate }))),
  "ats-004": lazy(() => import("./ats/AtsVariants").then((m) => ({ default: m.TimelineTemplate }))),
  "ats-005": lazy(() => import("./ats/AtsVariants").then((m) => ({ default: m.ExecutiveTemplate }))),
  "ats-007": lazy(() => import("./ats/AtsVariants").then((m) => ({ default: m.EditorialTemplate }))),
};

// Eagerly loaded fallback (also catches any legacy templateId still in the DB)
const FALLBACK_LOADER = lazy(() => import("./ats/Ats001Template").then((m) => ({ default: m.Ats001Template })));

const TEMPLATE_META: TemplateMeta[] = [
  {
    id: "ats-001",
    name: "Classic",
    category: "ATS",
    description: "Centered name, bold underlined headings. The safest international default.",
    layoutType: "single-column",
  },
  {
    id: "ats-002",
    name: "Accent",
    category: "ATS",
    description: "Section headings in a tinted band. Contemporary and corporate.",
    layoutType: "single-column",
  },
  {
    id: "ats-003",
    name: "Bold",
    category: "ATS",
    description: "Oversized name over a heavy rule, headings underlined in accent.",
    layoutType: "single-column",
  },
  {
    id: "ats-004",
    name: "Timeline",
    category: "ATS",
    description: "Dates in a left column beside each entry. Easy to scan quickly.",
    layoutType: "single-column",
  },
  {
    id: "ats-005",
    name: "Executive",
    category: "ATS",
    description: "Serif headings and a double rule. Formal, for senior roles.",
    layoutType: "single-column",
  },
  {
    id: "ats-007",
    name: "Editorial",
    category: "ATS",
    description: "Section labels in a left gutter. Understated and editorial.",
    layoutType: "single-column",
  },
];

export function getTemplateComponent(
  templateId: string
): ComponentType<TemplateProps> {
  return TEMPLATE_MAP[templateId] || FALLBACK_LOADER;
}

export function getAllTemplates(): TemplateMeta[] {
  return TEMPLATE_META;
}

/** Map any (incl. legacy) templateId to one of the 3 supported ones. */
export function normalizeTemplateId(templateId: string | undefined | null): string {
  return templateId && TEMPLATE_MAP[templateId] ? templateId : "ats-001";
}

// Résumé output palette — aligned with the app's Fog & Slate theme.
// Navy ink for headings, Clay accent for rules.
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  primaryColor: "#1b2230",
  accentColor: "#a3585c",
  fontFamily: "source-sans-3",
  headerFontFamily: "merriweather",
  fontSize: "medium",
  lineSpacing: "normal",
};
