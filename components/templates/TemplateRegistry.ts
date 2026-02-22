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

// Lazy-loaded template components for better performance
const TEMPLATE_MAP: Record<string, ComponentType<TemplateProps>> = {
  // ATS (7)
  "ats-001": lazy(() => import("./ats/Ats001Template").then((m) => ({ default: m.Ats001Template }))),
  "ats-002": lazy(() => import("./ats/Ats002Template").then((m) => ({ default: m.Ats002Template }))),
  "ats-003": lazy(() => import("./ats/Ats003Template").then((m) => ({ default: m.Ats003Template }))),
  "ats-004": lazy(() => import("./ats/Ats004Template").then((m) => ({ default: m.Ats004Template }))),
  "ats-005": lazy(() => import("./ats/Ats005Template").then((m) => ({ default: m.Ats005Template }))),
  "ats-006": lazy(() => import("./ats/Ats006Template").then((m) => ({ default: m.Ats006Template }))),
  "ats-007": lazy(() => import("./ats/Ats007Template").then((m) => ({ default: m.Ats007Template }))),
};

// Eagerly loaded fallback
const FALLBACK_LOADER = lazy(() => import("./ats/Ats001Template").then((m) => ({ default: m.Ats001Template })));

const TEMPLATE_META: TemplateMeta[] = [
  // ATS (7)
  {
    id: "ats-001",
    name: "ATS Classic",
    category: "ATS",
    description: "Centered header, bold section headings with underline, black & white",
    layoutType: "single-column",
  },
  {
    id: "ats-002",
    name: "ATS Modern",
    category: "ATS",
    description: "Left-aligned name, colored underline on sections, clean modern",
    layoutType: "single-column",
  },
  {
    id: "ats-003",
    name: "ATS Compact",
    category: "ATS",
    description: "Two-column with photo, bordered section headings, compact",
    layoutType: "two-column",
  },
  {
    id: "ats-004",
    name: "ATS Professional",
    category: "ATS",
    description: "Large uppercase name, double-line dividers, italic section headings",
    layoutType: "single-column",
  },
  {
    id: "ats-005",
    name: "ATS Sidebar",
    category: "ATS",
    description: "Photo + contact sidebar, accent left-border section headings",
    layoutType: "two-column",
  },
  {
    id: "ats-006",
    name: "ATS Executive",
    category: "ATS",
    description: "Date column + content, letter-spaced headings, horizontal rules",
    layoutType: "single-column",
  },
  {
    id: "ats-007",
    name: "ATS Minimal",
    category: "ATS",
    description: "Name left + contact right, thin dividers, clean minimal",
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

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  primaryColor: "#1a1a1a",
  accentColor: "#2563eb",
  fontFamily: "sans-serif",
  fontSize: "medium",
  lineSpacing: "normal",
};
