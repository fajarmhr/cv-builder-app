"use client";

import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import { formatDate, getVisibleSections, hasContent, ProfilePhoto, BulletList, SkillsBlock, findCustomSection, isCustomSectionId, RenderClonedSection } from "../template-helpers";

/**
 * ATS002 — Modern. Left-aligned name + role, accent-coloured section rule,
 * single-column. Polished for international recruiters: full contact line,
 * formatted dates, summary as a lead paragraph. Mirrors the PDF/DOCX "modern"
 * variant exactly.
 */
export function Ats002Template({ resume, config }: TemplateProps) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);
  const accent = config.accentColor || "#a3585c";

  const dateRange = (start?: string, end?: string, isCurrent?: boolean) => {
    const s = start ? formatDate(start) : "";
    const e = isCurrent ? "Present" : end ? formatDate(end) : "";
    return [s, e].filter(Boolean).join(" \u2013 ");
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 mt-5">
      <h2 className="text-sm font-bold uppercase tracking-wide pb-1 border-b-2" style={{ borderColor: accent }}>
        {children}
      </h2>
    </div>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    personalInfo: () =>
      info ? (
        <div key="pi" className="mb-3">
          <div className="flex items-center gap-3">
            <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={52} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{info.name}</h1>
              <p className="text-[10px] mt-1" style={{ color: "#555" }}>
                {[info.address, info.email, info.phone, info.linkedin, info.website]
                  .filter(Boolean)
                  .join("  \u00B7  ")}
              </p>
            </div>
          </div>
        </div>
      ) : null,

    summary: () =>
      resume.summary ? (
        <p key="sum" className="text-xs leading-relaxed mt-2 whitespace-pre-line">
          {resume.summary}
        </p>
      ) : null,

    workExperience: () =>
      hasContent(resume, "workExperience") ? (
        <div key="we">
          <SectionTitle>Work Experience</SectionTitle>
          {resume.workExperience.map((exp, i) => (
            <div key={exp.id || i} className="mb-3.5">
              {exp.company && <p className="font-bold text-sm">{exp.company}</p>}
              {exp.positions.map((pos, pi) => (
                <div key={pos.id || pi} className="mt-1">
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="font-semibold text-xs">{pos.title}</span>
                    <span className="text-[10px] shrink-0" style={{ color: "#666" }}>
                      {dateRange(pos.startDate, pos.endDate, pos.isCurrent)}
                    </span>
                  </div>
                  <BulletList bullets={pos.bullets} description={pos.description} bulletStyle={config.bulletStyle} className="text-xs" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null,

    education: () =>
      hasContent(resume, "education") ? (
        <div key="edu">
          <SectionTitle>Education</SectionTitle>
          {resume.education.map((edu, i) => (
            <div key={edu.id || i} className="mb-2.5">
              <div className="flex justify-between items-baseline gap-3">
                <span className="font-bold text-sm">{edu.institution}</span>
                <span className="text-[10px] shrink-0" style={{ color: "#666" }}>
                  {dateRange(edu.startDate, edu.endDate)}
                </span>
              </div>
              <p className="text-xs">
                {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
              </p>
              {edu.gpa && <p className="text-xs" style={{ color: "#555" }}>GPA: {edu.gpa}</p>}
            </div>
          ))}
        </div>
      ) : null,

    skills: () =>
      hasContent(resume, "skills") ? (
        <div key="sk">
          <SectionTitle>Skills</SectionTitle>
          <SkillsBlock skills={resume.skills} config={config} textSize="text-xs" />
        </div>
      ) : null,

    certifications: () =>
      hasContent(resume, "certifications") ? (
        <div key="cert">
          <SectionTitle>Certifications</SectionTitle>
          {resume.certifications.map((c, i) => (
            <div key={c.id || i} className="text-xs mb-1">
              <p><span className="font-semibold">{c.name}</span>{c.issuer ? ` \u2014 ${c.issuer}` : ""}{c.date ? ` (${formatDate(c.date)})` : ""}</p>
              {c.credentialId && (
                <p className="text-[10px]" style={{ color: "#555" }}>Credential ID: {c.credentialId}</p>
              )}
            </div>
          ))}
        </div>
      ) : null,

    languages: () =>
      hasContent(resume, "languages") ? (
        <div key="lang">
          <SectionTitle>Languages</SectionTitle>
          <p className="text-xs">
            {resume.languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(", ")}
          </p>
        </div>
      ) : null,

    projects: () =>
      hasContent(resume, "projects") ? (
        <div key="proj">
          <SectionTitle>Projects</SectionTitle>
          {resume.projects.map((p, i) => (
            <div key={p.id || i} className="mb-2">
              <div className="flex justify-between items-baseline gap-3">
                <p className="font-bold text-xs">{p.name}</p>
                {(p.startDate || p.endDate) && (
                  <span className="text-[10px] shrink-0" style={{ color: "#666" }}>
                    {dateRange(p.startDate, p.endDate)}
                  </span>
                )}
              </div>
              <BulletList description={p.description} bulletStyle={config.bulletStyle} className="text-xs" />
              {p.technologies?.length > 0 && (
                <p className="text-[10px]" style={{ color: "#555" }}>Tech: {p.technologies.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      ) : null,

    awards: () =>
      hasContent(resume, "awards") ? (
        <div key="aw">
          <SectionTitle>Awards</SectionTitle>
          {resume.awards.map((a, i) => (
            <p key={a.id || i} className="text-xs mb-1">
              <span className="font-semibold">{a.title}</span>{a.issuer ? ` \u2014 ${a.issuer}` : ""}{a.date ? ` (${formatDate(a.date)})` : ""}
            </p>
          ))}
        </div>
      ) : null,

    references: () =>
      hasContent(resume, "references") ? (
        <div key="ref">
          <SectionTitle>References</SectionTitle>
          {resume.references.map((r, i) => (
            <p key={r.id || i} className="text-xs mb-1">
              <span className="font-semibold">{r.name}</span>
              {r.position ? `, ${r.position}` : ""}{r.company ? ` at ${r.company}` : ""}
              {r.email ? ` \u2014 ${r.email}` : ""}{r.phone ? ` | ${r.phone}` : ""}
            </p>
          ))}
        </div>
      ) : null,

    customSections: () =>
      hasContent(resume, "customSections") ? (
        <div key="cs">
          {resume.customSections.filter((s) => !s.basedOn).map((s) => (
            <div key={s.id}>
              <SectionTitle>{s.title}</SectionTitle>
              <p className="text-xs whitespace-pre-wrap">{s.content}</p>
            </div>
          ))}
        </div>
      ) : null,
  };

  return (
    <TemplateWrapper config={config}>
      {visible.map((s) => {
        if (isCustomSectionId(s)) {
          const cs = findCustomSection(resume, s);
          if (!cs) return null;
          if (cs.basedOn && cs.items?.length) {
            return <RenderClonedSection key={s} cs={cs} config={config} SectionTitle={SectionTitle} />;
          }
          if (!cs.content) return null;
          return (
            <div key={s}>
              <SectionTitle>{cs.title}</SectionTitle>
              <p className="text-xs whitespace-pre-wrap">{cs.content}</p>
            </div>
          );
        }
        return sectionRenderers[s]?.();
      })}
    </TemplateWrapper>
  );
}
