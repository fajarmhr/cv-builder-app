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
 * Top 3 ATS templates curated for international recruiters.
 * All single-column, photo-free, reverse-chronological — the safest, most
 * widely-accepted formats across US / UK / EU / CA / AU hiring systems.
 *   ats-001 Classic  — the strongest all-rounder (left as the reference)
 *   ats-002 Modern   — left-aligned name with an accent section rule
 *   ats-007 Minimal  — name left / contact right, hairline dividers
 */
const TEMPLATE_MAP: Record<string, ComponentType<TemplateProps>> = {
  "ats-001": lazy(() => import("./ats/Ats001Template").then((m) => ({ default: m.Ats001Template }))),
  "ats-002": lazy(() => import("./ats/Ats002Template").then((m) => ({ default: m.Ats002Template }))),
  "ats-007": lazy(() => import("./ats/Ats007Template").then((m) => ({ default: m.Ats007Template }))),
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
    name: "Modern",
    category: "ATS",
    description: "Left-aligned name with an accent section rule. Clean and contemporary.",
    layoutType: "single-column",
  },
  {
    id: "ats-007",
    name: "Minimal",
    category: "ATS",
    description: "Name left, contact right, hairline dividers. Understated and editorial.",
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
