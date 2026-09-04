/* eslint-disable @next/next/no-img-element */
import type {
  ResumeData,
  TemplateConfig,
  SectionId,
  CustomSection,
  Education,
  Skill,
  Certification,
  Language,
  Project,
  Award,
  Reference,
} from "@/types/resume";
import { isCustomSectionId, getCustomSectionEntryId, normalizeWorkExperience } from "@/types/resume";
import type { ReactNode, CSSProperties } from "react";

// Per-section font-size scale (shared with the global font-size control).
export const FONT_SCALE_MAP: Record<string, number> = {
  small: 0.85,
  medium: 1,
  large: 1.15,
};

export const LINE_SPACING_MAP: Record<string, string> = {
  compact: "1.2",
  normal: "1.4",
  relaxed: "1.6",
};

// Wraps a rendered section so per-section font-size / line-spacing overrides
// apply. Font-size cascades through the --cv-scale CSS var (see globals.css);
// line-spacing through line-height. No wrapper is added when there's no override.
export function SectionFrame({
  sectionId,
  config,
  children,
}: {
  sectionId: string;
  config: TemplateConfig;
  children: ReactNode;
}) {
  const o = config.sectionStyles?.[sectionId as SectionId];
  if (!o || (!o.fontSize && !o.lineSpacing)) return <>{children}</>;
  const style: CSSProperties = {};
  if (o.fontSize) {
    (style as Record<string, unknown>)["--cv-scale"] = FONT_SCALE_MAP[o.fontSize] ?? 1;
  }
  if (o.lineSpacing) {
    const ls = LINE_SPACING_MAP[o.lineSpacing];
    style.lineHeight = ls;
    (style as Record<string, unknown>)["--line-spacing"] = ls;
  }
  return <div style={style}>{children}</div>;
}

export function formatDate(d: string): string {
  if (!d) return "";
  const [y, m] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1] || m} ${y}`;
}

export function getVisibleSections(resume: ResumeData) {
  const hidden = new Set<string>(resume.hiddenSections || []);
  const order = resume.sectionOrder || [];
  return order.filter((s) => !hidden.has(s));
}

/**
 * If a sectionOrder entry is a "custom:<id>" standalone card,
 * find the corresponding CustomSection entry.
 */
export function findCustomSection(resume: ResumeData, sectionOrderEntry: string): CustomSection | null {
  if (!isCustomSectionId(sectionOrderEntry)) return null;
  const entryId = getCustomSectionEntryId(sectionOrderEntry);
  return resume.customSections.find((cs) => cs.id === entryId) || null;
}

export { isCustomSectionId };

export function hasContent(resume: ResumeData, section: string): boolean {
  switch (section) {
    case "personalInfo": return !!resume.personalInfo;
    case "summary": return !!resume.summary;
    case "workExperience": return resume.workExperience.length > 0;
    case "education": return resume.education.length > 0;
    case "skills": return resume.skills.length > 0;
    case "certifications": return resume.certifications.length > 0;
    case "languages": return resume.languages.length > 0;
    case "projects": return resume.projects.length > 0;
    case "awards": return resume.awards.length > 0;
    case "references": return resume.references.length > 0;
    case "customSections": return resume.customSections.some((cs) => !cs.basedOn);
    default: return false;
  }
}

/** Bullet marker character from config style */
export function getBulletMarker(style?: TemplateConfig["bulletStyle"]): string {
  switch (style) {
    case "dash":   return "\u2013";  // –
    case "arrow":  return "\u25B8";  // ▸
    case "square": return "\u25AA";  // ▪
    case "none":   return "";
    case "disc":
    default:       return "\u2022";  // •
  }
}

/**
 * Parse description text into bullet lines.
 * Strips leading markers (•, -, *, ▸, ▪, –) and splits by newlines.
 */
/** Group skills by their (optional) category, preserving first-seen order; uncategorized last. */
export function groupSkills(skills: Skill[]): { category: string; items: Skill[] }[] {
  const order: string[] = [];
  const map = new Map<string, Skill[]>();
  for (const s of skills) {
    const cat = (s.category || "").trim();
    if (!map.has(cat)) {
      map.set(cat, []);
      order.push(cat);
    }
    map.get(cat)!.push(s);
  }
  const cats = order.filter((c) => c !== "");
  if (map.has("")) cats.push("");
  return cats.map((c) => ({ category: c, items: map.get(c)! }));
}

/**
 * Renders the Skills body. If any skill has a category, renders grouped
 * (category heading + inline comma list). Otherwise keeps the flat bullet
 * list so existing resumes look unchanged.
 */
export function SkillsBlock({
  skills,
  config,
  textSize = "text-xs",
}: {
  skills: Skill[];
  config: TemplateConfig;
  textSize?: string;
}) {
  const groups = groupSkills(skills);
  const grouped = groups.length > 1 || (groups.length === 1 && !!groups[0].category);
  const fmt = (s: Skill) => `${s.name}${s.level ? ` (${s.level})` : ""}`;

  if (!grouped) {
    const marker = getBulletMarker(config.bulletStyle);
    const items = groups[0]?.items || skills;
    return (
      <ul className="mt-0.5 space-y-0.5">
        {items.map((s, i) => (
          <li key={s.id || i} className={`${textSize} flex items-start gap-1.5`} style={{ listStyleType: "none" }}>
            {marker && <span className="shrink-0 leading-[inherit]">{marker}</span>}
            <span>{fmt(s)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-0.5 space-y-1">
      {groups.map((g, gi) => (
        <p key={gi} className={textSize}>
          {g.category && <span className="font-semibold">{g.category}: </span>}
          {g.items.map(fmt).join(", ")}
        </p>
      ))}
    </div>
  );
}

function parseBulletsFromDescription(description: string): string[] {
  return description
    .split("\n")
    .map((l) => l.replace(/^[\u2022\u25B8\u25AA\u2013\-\*•]\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Renders bullets for work experience / projects.
 * Uses explicit marker characters for reliable rendering
 * (avoids CSS list-style-type which Tailwind reset can interfere with).
 *
 * Priority:
 * 1. If bullets array has content → use it directly.
 * 2. Else if description has multiple lines or bullet markers → parse into lines.
 * 3. Else if description is a single line → render as paragraph.
 * 4. Else → null.
 */
export function BulletList({
  bullets,
  description,
  bulletStyle,
  className = "text-xs",
  accentColor,
}: {
  bullets?: string[];
  description?: string;
  bulletStyle?: TemplateConfig["bulletStyle"];
  className?: string;
  accentColor?: string;
}) {
  // Resolve bullet lines: prefer bullets array, fallback to parsing description
  let lines = bullets?.filter(Boolean) || [];

  if (lines.length === 0 && description?.trim()) {
    // Check if description looks like it has bullet lines (newlines or bullet markers)
    const hasBulletMarkers = /^[\u2022\u25B8\u25AA\u2013\-\*•]/m.test(description);
    const hasMultipleLines = description.includes("\n");

    if (hasBulletMarkers || hasMultipleLines) {
      lines = parseBulletsFromDescription(description);
    } else {
      // Single-line description — render as plain paragraph
      return <p className={`${className} mt-0.5`}>{description}</p>;
    }
  }

  if (lines.length === 0) return null;

  const marker = getBulletMarker(bulletStyle);

  return (
    <ul className="mt-0.5 space-y-0.5">
      {lines.map((b, i) => (
        <li key={i} className={`${className} flex items-start gap-1.5`} style={{ listStyleType: "none" }}>
          {marker && (
            <span className="shrink-0 leading-[inherit]" style={accentColor ? { color: accentColor } : undefined}>
              {marker}
            </span>
          )}
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Profile photo component for templates.
 * Shows a circular photo if photoUrl exists.
 */
export function ProfilePhoto({
  photoUrl,
  name,
  size = 64,
  className = "",
}: {
  photoUrl?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  if (!photoUrl) return null;

  return (
    <img
      src={photoUrl}
      alt={name || "Profile"}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  RenderClonedSection — renders a cloned section with structured    */
/*  items matching the original section type                          */
/* ------------------------------------------------------------------ */

export function RenderClonedSection({
  cs,
  config,
  SectionTitle,
  textSize = "text-xs",
  subTextSize = "text-[10px]",
}: {
  cs: CustomSection;
  config: TemplateConfig;
  SectionTitle: React.ComponentType<{ children: React.ReactNode }>;
  textSize?: string;
  subTextSize?: string;
}) {
  if (!cs.basedOn || !cs.items?.length) return null;

  const subColor = "#555";

  switch (cs.basedOn) {
    case "workExperience":
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          {normalizeWorkExperience(cs.items).map((exp, i) => (
            <div key={exp.id || i} className="mb-3">
              <span className={`font-bold ${textSize} uppercase`}>{exp.company}</span>
              {exp.positions.map((pos, pi) => (
                <div key={pos.id || pi} className="mt-1">
                  <div className="flex justify-between items-baseline">
                    <span className={`font-semibold ${textSize}`}>{pos.title}</span>
                    <span className={subTextSize} style={{ color: subColor }}>
                      {pos.startDate && formatDate(pos.startDate)}
                      {(pos.startDate && (pos.endDate || pos.isCurrent)) && " \u2014 "}
                      {pos.isCurrent ? "Present" : pos.endDate && formatDate(pos.endDate)}
                    </span>
                  </div>
                  <BulletList bullets={pos.bullets} description={pos.description} bulletStyle={config.bulletStyle} className={textSize} />
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    case "education":
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          {(cs.items as Education[]).map((edu, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between items-baseline">
                <span className={`font-bold ${textSize} uppercase`}>{edu.institution}</span>
                <span className={subTextSize} style={{ color: subColor }}>
                  {edu.startDate && formatDate(edu.startDate)}
                  {edu.startDate && edu.endDate && " \u2014 "}
                  {edu.endDate && formatDate(edu.endDate)}
                </span>
              </div>
              <p className={textSize}>
                {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""}
              </p>
              {edu.gpa && <p className={textSize}>GPA: {edu.gpa}</p>}
            </div>
          ))}
        </div>
      );

    case "skills": {
      const skillMarker = getBulletMarker(config.bulletStyle);
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          <ul className="mt-0.5 space-y-0.5">
            {(cs.items as Skill[]).map((s, i) => (
              <li key={i} className={`${textSize} flex items-start gap-1.5`} style={{ listStyleType: "none" }}>
                {skillMarker && <span className="shrink-0 leading-[inherit]">{skillMarker}</span>}
                <span>{s.name}{s.level ? ` (${s.level})` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "certifications":
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          {(cs.items as Certification[]).map((c, i) => (
            <div key={i} className={`${textSize} mb-1`}>
              <p>
                <span className="font-semibold">{c.name}</span>
                {c.issuer ? ` \u2014 ${c.issuer}` : ""}
                {c.date ? ` (${formatDate(c.date)})` : ""}
              </p>
              {c.credentialId && (
                <p className={subTextSize} style={{ color: subColor }}>Credential ID: {c.credentialId}</p>
              )}
            </div>
          ))}
        </div>
      );

    case "languages":
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          <p className={textSize}>
            {(cs.items as Language[]).map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(", ")}
          </p>
        </div>
      );

    case "projects":
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          {(cs.items as Project[]).map((p, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between items-baseline">
                <p className={`font-bold ${textSize}`}>{p.name}</p>
                {(p.startDate || p.endDate || p.isCurrent) && (
                  <span className={subTextSize} style={{ color: subColor }}>
                    {p.startDate && formatDate(p.startDate)}
                    {p.startDate && (p.endDate || p.isCurrent) && " \u2014 "}
                    {p.isCurrent ? "Present" : p.endDate && formatDate(p.endDate)}
                  </span>
                )}
              </div>
              <BulletList description={p.description} bulletStyle={config.bulletStyle} className={textSize} />
              {p.technologies?.length > 0 && (
                <p className={subTextSize} style={{ color: subColor }}>Tech: {p.technologies.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      );

    case "awards":
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          {(cs.items as Award[]).map((a, i) => (
            <p key={i} className={`${textSize} mb-1`}>
              <span className="font-semibold">{a.title}</span>
              {a.issuer ? ` \u2014 ${a.issuer}` : ""}
              {a.date ? ` (${formatDate(a.date)})` : ""}
            </p>
          ))}
        </div>
      );

    case "references":
      return (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          {(cs.items as Reference[]).map((r, i) => (
            <p key={i} className={`${textSize} mb-1`}>
              <span className="font-semibold">{r.name}</span>
              {r.position ? `, ${r.position}` : ""}{r.company ? ` at ${r.company}` : ""}
              {r.email ? ` \u2014 ${r.email}` : ""}{r.phone ? ` | ${r.phone}` : ""}
            </p>
          ))}
        </div>
      );

    default:
      return cs.content ? (
        <div key={cs.id}>
          <SectionTitle>{cs.title}</SectionTitle>
          <p className={`${textSize} whitespace-pre-wrap`}>{cs.content}</p>
        </div>
      ) : null;
  }
}
