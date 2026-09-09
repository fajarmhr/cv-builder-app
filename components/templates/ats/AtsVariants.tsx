"use client";

import type { ReactNode } from "react";
import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import { availabilityLabel, formatGpa } from "@/types/resume";
import {
  formatDate,
  getVisibleSections,
  hasContent,
  ProfilePhoto,
  BulletList,
  SkillsBlock,
  findCustomSection,
  isCustomSectionId,
  RenderClonedSection,
  SectionFrame,
  tintOnWhite,
} from "../template-helpers";

/**
 * The five styled ATS templates. They share every section body and differ only
 * in header, section-heading treatment and whether entries sit on a rail, so
 * one renderer covers all of them — ats-001 (Classic) stays its own file.
 *   accent    (ats-002) — tinted heading bands, accent rule under the header
 *   bold      (ats-003) — oversized name, heavy rule, short accent underlines
 *   timeline  (ats-004) — dates in a left column beside each entry
 *   executive (ats-005) — serif headings, double rule, hairline dividers
 *   editorial (ats-007) — section labels in a left gutter
 */
export type AtsVariant = "accent" | "bold" | "timeline" | "executive" | "editorial";

const SUB = "#555";
const HAIR = "#d5d9df";

/** Opacity of the Accent variant's heading band — shared with both exporters. */
const BAND_TINT = 0.1;

function dateRange(start?: string, end?: string, isCurrent?: boolean): string {
  const s = start ? formatDate(start) : "";
  const e = isCurrent ? "Present" : end ? formatDate(end) : "";
  return [s, e].filter(Boolean).join(" – ");
}

/* ------------------------------------------------------------------ */
/*  Header                                                            */
/* ------------------------------------------------------------------ */

function Header({
  info,
  variant,
  accent,
}: {
  info: TemplateProps["resume"]["personalInfo"];
  variant: AtsVariant;
  accent: string;
}) {
  if (!info) return null;

  const contact = [
    info.address,
    info.email,
    info.phone,
    info.linkedin,
    info.website,
    availabilityLabel(info),
  ]
    .filter(Boolean)
    .join("  ·  ");

  // Bold — contact sits below the heavy rule rather than inside the block.
  if (variant === "bold") {
    return (
      <div className="mb-3">
        <div
          className="flex items-center gap-3 pb-2"
          style={{ borderBottom: "4px solid var(--primary-color)" }}
        >
          <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={52} />
          <div>
            <h1
              className="text-3xl font-bold uppercase leading-none"
              style={{ color: "var(--primary-color)" }}
            >
              {info.name}
            </h1>
            {info.title && (
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em] mt-1.5"
                style={{ color: SUB }}
              >
                {info.title}
              </p>
            )}
          </div>
        </div>
        {contact && (
          <p className="text-[10px] mt-1.5" style={{ color: SUB }}>
            {contact}
          </p>
        )}
      </div>
    );
  }

  const rule =
    variant === "accent"
      ? `3px solid ${accent}`
      : variant === "executive"
      ? "3px double var(--primary-color)"
      : variant === "editorial"
      ? "2px solid var(--primary-color)"
      : `1px solid ${HAIR}`; // timeline

  const titleStyle =
    variant === "accent"
      ? { color: accent }
      : // No italic: the PDF only registers regular/bold faces, and all three
      // outputs have to agree.
      variant === "executive"
      ? { color: SUB, fontFamily: "var(--header-font-family)" }
      : { color: SUB };

  return (
    <div className="mb-3 pb-2" style={{ borderBottom: rule }}>
      <div className="flex items-center gap-3">
        <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={52} />
        <div>
          <h1
            className={`text-2xl font-bold ${
              variant === "accent"
                ? "tracking-tight"
                : variant === "executive"
                ? "tracking-wide"
                : ""
            }`}
            style={{ color: "var(--primary-color)" }}
          >
            {info.name}
          </h1>
          {info.title && (
            <p
              className={`text-xs mt-0.5 ${
                variant === "accent" ? "font-bold" : variant === "timeline" ? "font-semibold" : ""
              }`}
              style={titleStyle}
            >
              {info.title}
            </p>
          )}
          {contact && (
            <p className="text-[10px] mt-1" style={{ color: SUB }}>
              {contact}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section heading / wrapper                                         */
/* ------------------------------------------------------------------ */

function SectionTitle({
  children,
  variant,
  accent,
}: {
  children: ReactNode;
  variant: AtsVariant;
  accent: string;
}) {
  if (variant === "accent") {
    return (
      <h2
        className="text-xs font-bold uppercase tracking-wider mt-4 mb-2 px-1.5 py-1"
        style={{
          background: tintOnWhite(accent, BAND_TINT),
          color: accent,
          borderLeft: `3px solid ${accent}`,
        }}
      >
        {children}
      </h2>
    );
  }

  if (variant === "bold") {
    return (
      <div className="mt-4 mb-2">
        <h2
          className="text-xs font-bold uppercase tracking-wider inline-block pb-0.5"
          style={{ borderBottom: `3px solid ${accent}`, color: "var(--primary-color)" }}
        >
          {children}
        </h2>
      </div>
    );
  }

  if (variant === "timeline") {
    return (
      <h2
        className="text-[10px] font-bold uppercase tracking-[0.14em] mt-4 mb-2 flex items-center gap-1.5"
        style={{ color: "var(--primary-color)" }}
      >
        <span className="shrink-0" style={{ width: 10, height: 3, background: accent }} />
        {children}
      </h2>
    );
  }

  // executive
  return (
    <h2
      className="text-xs font-bold uppercase tracking-[0.14em] mt-4 mb-1.5 pb-1"
      style={{ borderBottom: `1px solid ${HAIR}`, color: "var(--primary-color)" }}
    >
      {children}
    </h2>
  );
}

/** Wraps one section: a heading above the body, or a left-gutter label. */
function Section({
  label,
  variant,
  accent,
  children,
}: {
  label: string;
  variant: AtsVariant;
  accent: string;
  children: ReactNode;
}) {
  if (variant === "editorial") {
    return (
      <div className="flex gap-3 mb-3">
        <div
          className="w-[84px] shrink-0 text-[9px] font-bold uppercase tracking-[0.13em] pt-0.5"
          style={{ color: accent }}
        >
          {label}
        </div>
        <div className="flex-1 pl-3" style={{ borderLeft: `1px solid ${HAIR}` }}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <>
      <SectionTitle variant={variant} accent={accent}>
        {label}
      </SectionTitle>
      {children}
    </>
  );
}

/** A row on the Timeline variant's rail: date on the left, content right. */
function Rail({ when, children }: { when: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 mb-2.5">
      <div className="w-[76px] shrink-0 text-[10px]" style={{ color: SUB }}>
        {when}
      </div>
      <div className="flex-1 pl-2.5" style={{ borderLeft: `1px solid ${HAIR}` }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template                                                          */
/* ------------------------------------------------------------------ */

const SECTION_LABELS: Record<string, string> = {
  workExperience: "Work Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  projects: "Projects",
  awards: "Awards",
  references: "References",
};

const NullTitle = () => null;

export function VariantTemplate({
  resume,
  config,
  variant,
}: TemplateProps & { variant: AtsVariant }) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);
  const accent = config.accentColor || "#a3585c";
  const rail = variant === "timeline";

  const summaryLabel =
    variant === "timeline" || variant === "editorial" ? "Summary" : "Professional Summary";

  const sectionBodies: Record<string, () => ReactNode> = {
    summary: () =>
      resume.summary ? (
        <p className="text-xs leading-[var(--line-spacing)] whitespace-pre-line">{resume.summary}</p>
      ) : null,

    workExperience: () =>
      hasContent(resume, "workExperience") ? (
        <>
          {resume.workExperience.map((exp, i) =>
            rail ? (
              <div key={exp.id || i}>
                {exp.positions.map((pos, pi) => (
                  <Rail
                    key={pos.id || pi}
                    when={dateRange(pos.startDate, pos.endDate, pos.isCurrent)}
                  >
                    <p className="font-bold text-xs">{pos.title}</p>
                    <p className="text-[10px]" style={{ color: SUB }}>
                      {exp.company}
                    </p>
                    <BulletList
                      bullets={pos.bullets}
                      description={pos.description}
                      bulletStyle={config.bulletStyle}
                      className="text-xs"
                    />
                  </Rail>
                ))}
              </div>
            ) : (
              <div key={exp.id || i} className="mb-3">
                {/* Editorial leads with the role; the rest lead with the company. */}
                {exp.company && variant !== "editorial" && (
                  <p className="font-bold text-xs">{exp.company}</p>
                )}
                {exp.positions.map((pos, pi) => (
                  <div key={pos.id || pi} className="mt-1">
                    <div className="flex justify-between items-baseline gap-3">
                      <span className={variant === "editorial" ? "font-bold text-xs" : "font-semibold text-xs"}>
                        {pos.title}
                      </span>
                      <span className="text-[10px] shrink-0" style={{ color: SUB }}>
                        {dateRange(pos.startDate, pos.endDate, pos.isCurrent)}
                      </span>
                    </div>
                    {exp.company && variant === "editorial" && (
                      <p className="text-[10px]" style={{ color: SUB }}>
                        {exp.company}
                      </p>
                    )}
                    <BulletList
                      bullets={pos.bullets}
                      description={pos.description}
                      bulletStyle={config.bulletStyle}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            )
          )}
        </>
      ) : null,

    education: () =>
      hasContent(resume, "education") ? (
        <>
          {resume.education.map((edu, i) => {
            const degree = `${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}`;
            const gpa = edu.gpa ? (
              <p className="text-[10px]" style={{ color: SUB }}>
                GPA: {formatGpa(edu)}
              </p>
            ) : null;

            if (rail) {
              return (
                <Rail key={edu.id || i} when={dateRange(edu.startDate, edu.endDate)}>
                  <p className="font-bold text-xs">{degree}</p>
                  <p className="text-[10px]" style={{ color: SUB }}>
                    {edu.institution}
                  </p>
                  {gpa}
                </Rail>
              );
            }

            // Editorial leads with the degree; the rest lead with the institution.
            const lead = variant === "editorial" ? degree : edu.institution;
            const follow = variant === "editorial" ? edu.institution : degree;
            return (
              <div key={edu.id || i} className="mb-2.5">
                <div className="flex justify-between items-baseline gap-3">
                  <span className="font-bold text-xs">{lead}</span>
                  <span className="text-[10px] shrink-0" style={{ color: SUB }}>
                    {dateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                <p className="text-xs" style={variant === "editorial" ? { color: SUB } : undefined}>
                  {follow}
                </p>
                {gpa}
              </div>
            );
          })}
        </>
      ) : null,

    skills: () =>
      hasContent(resume, "skills") ? (
        <SkillsBlock skills={resume.skills} config={config} textSize="text-xs" />
      ) : null,

    certifications: () =>
      hasContent(resume, "certifications") ? (
        <>
          {resume.certifications.map((c, i) => (
            <div key={c.id || i} className="text-xs mb-1">
              <p>
                <span className="font-semibold">{c.name}</span>
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.date ? ` (${formatDate(c.date)})` : ""}
              </p>
              {c.credentialId && (
                <p className="text-[10px]" style={{ color: SUB }}>
                  Credential ID: {c.credentialId}
                </p>
              )}
            </div>
          ))}
        </>
      ) : null,

    languages: () =>
      hasContent(resume, "languages") ? (
        <p className="text-xs">
          {resume.languages
            .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
            .join(", ")}
        </p>
      ) : null,

    projects: () =>
      hasContent(resume, "projects") ? (
        <>
          {resume.projects.map((p, i) => {
            const tech = p.technologies?.length ? (
              <p className="text-[10px]" style={{ color: SUB }}>
                Tech: {p.technologies.join(", ")}
              </p>
            ) : null;
            const bullets = (
              <BulletList
                description={p.description}
                bulletStyle={config.bulletStyle}
                className="text-xs"
              />
            );

            if (rail) {
              return (
                <Rail key={p.id || i} when={dateRange(p.startDate, p.endDate, p.isCurrent)}>
                  <p className="font-bold text-xs">{p.name}</p>
                  {bullets}
                  {tech}
                </Rail>
              );
            }
            return (
              <div key={p.id || i} className="mb-2">
                <div className="flex justify-between items-baseline gap-3">
                  <p className="font-bold text-xs">{p.name}</p>
                  {(p.startDate || p.endDate || p.isCurrent) && (
                    <span className="text-[10px] shrink-0" style={{ color: SUB }}>
                      {dateRange(p.startDate, p.endDate, p.isCurrent)}
                    </span>
                  )}
                </div>
                {bullets}
                {tech}
              </div>
            );
          })}
        </>
      ) : null,

    awards: () =>
      hasContent(resume, "awards") ? (
        <>
          {resume.awards.map((a, i) => (
            <p key={a.id || i} className="text-xs mb-1">
              <span className="font-semibold">{a.title}</span>
              {a.issuer ? ` — ${a.issuer}` : ""}
              {a.date ? ` (${formatDate(a.date)})` : ""}
            </p>
          ))}
        </>
      ) : null,

    references: () =>
      hasContent(resume, "references") ? (
        <>
          {resume.references.map((r, i) => (
            <p key={r.id || i} className="text-xs mb-1">
              <span className="font-semibold">{r.name}</span>
              {r.position ? `, ${r.position}` : ""}
              {r.company ? ` at ${r.company}` : ""}
              {r.email ? ` — ${r.email}` : ""}
              {r.phone ? ` | ${r.phone}` : ""}
            </p>
          ))}
        </>
      ) : null,

    customSections: () =>
      hasContent(resume, "customSections") ? (
        <>
          {resume.customSections
            .filter((s) => !s.basedOn)
            .map((s) => (
              <Section key={s.id} label={s.title} variant={variant} accent={accent}>
                <p className="text-xs whitespace-pre-wrap">{s.content}</p>
              </Section>
            ))}
        </>
      ) : null,
  };

  return (
    <TemplateWrapper config={config}>
      {visible.map((s) => {
        if (isCustomSectionId(s)) {
          const cs = findCustomSection(resume, s);
          if (!cs) return null;
          if (cs.basedOn && cs.items?.length) {
            return (
              <SectionFrame key={s} sectionId={s} config={config}>
                <Section label={cs.title} variant={variant} accent={accent}>
                  <RenderClonedSection cs={cs} config={config} SectionTitle={NullTitle} />
                </Section>
              </SectionFrame>
            );
          }
          if (!cs.content) return null;
          return (
            <SectionFrame key={s} sectionId={s} config={config}>
              <Section label={cs.title} variant={variant} accent={accent}>
                <p className="text-xs whitespace-pre-wrap">{cs.content}</p>
              </Section>
            </SectionFrame>
          );
        }

        if (s === "personalInfo") {
          return <Header key={s} info={info} variant={variant} accent={accent} />;
        }

        // customSections carries a heading per entry, so it skips <Section>.
        if (s === "customSections") {
          return (
            <SectionFrame key={s} sectionId={s} config={config}>
              {sectionBodies[s]?.()}
            </SectionFrame>
          );
        }

        const body = sectionBodies[s]?.();
        if (!body) return null;
        const label = s === "summary" ? summaryLabel : SECTION_LABELS[s] || s;
        return (
          <SectionFrame key={s} sectionId={s} config={config}>
            <Section label={label} variant={variant} accent={accent}>
              {body}
            </Section>
          </SectionFrame>
        );
      })}
    </TemplateWrapper>
  );
}

export const AccentTemplate = (props: TemplateProps) => (
  <VariantTemplate {...props} variant="accent" />
);
export const BoldTemplate = (props: TemplateProps) => (
  <VariantTemplate {...props} variant="bold" />
);
export const TimelineTemplate = (props: TemplateProps) => (
  <VariantTemplate {...props} variant="timeline" />
);
export const ExecutiveTemplate = (props: TemplateProps) => (
  <VariantTemplate {...props} variant="executive" />
);
export const EditorialTemplate = (props: TemplateProps) => (
  <VariantTemplate {...props} variant="editorial" />
);
