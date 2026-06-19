"use client";

import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import { formatDate, getVisibleSections, hasContent, ProfilePhoto, BulletList, SkillsBlock, findCustomSection, isCustomSectionId, RenderClonedSection } from "../template-helpers";

/**
 * ATS007 — Minimal. Name left / contact right with a strong rule beneath,
 * hairline section dividers, single-column. Polished for international
 * recruiters: summary now renders as a lead paragraph, dates formatted.
 * Mirrors the PDF/DOCX "minimal" variant exactly.
 */
export function Ats007Template({ resume, config }: TemplateProps) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);

  const dateRange = (start?: string, end?: string, isCurrent?: boolean) => {
    const s = start ? formatDate(start) : "";
    const e = isCurrent ? "Present" : end ? formatDate(end) : "";
    return [s, e].filter(Boolean).join(" \u2013 ");
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 mt-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] mb-1">{children}</h2>
      <hr style={{ borderColor: "#ccc" }} />
    </div>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    personalInfo: () =>
      info ? (
        <div key="pi" className="mb-3 flex justify-between items-end pb-2 border-b-2 border-black gap-4">
          <div className="flex items-center gap-3">
            <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={48} />
            <h1 className="text-2xl font-bold uppercase tracking-wide">{info.name}</h1>
          </div>
          <div className="text-right text-[9px] leading-relaxed shrink-0" style={{ color: "#555" }}>
            {info.address && <p>{info.address}</p>}
            {info.phone && <p>{info.phone}</p>}
            {info.email && <p>{info.email}</p>}
            {info.linkedin && <p>{info.linkedin}</p>}
          </div>
        </div>
      ) : null,

    summary: () =>
      resume.summary ? (
        <p key="sum" className="text-[10px] leading-relaxed mb-1 whitespace-pre-line" style={{ color: "#333" }}>
          {resume.summary}
        </p>
      ) : null,

    workExperience: () =>
      hasContent(resume, "workExperience") ? (
        <div key="we">
          <SectionTitle>Work Experience</SectionTitle>
          {resume.workExperience.map((exp, i) => (
            <div key={exp.id || i} className="mb-3">
              <p className="font-bold text-xs uppercase tracking-wide">{exp.company}</p>
              {exp.positions.map((pos, pi) => (
                <div key={pos.id || pi} className="mt-0.5">
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="text-[10px] font-semibold">{pos.title}</span>
                    <span className="text-[10px] shrink-0" style={{ color: "#555" }}>
                      {dateRange(pos.startDate, pos.endDate, pos.isCurrent)}
                    </span>
                  </div>
                  <BulletList
                    bullets={pos.bullets}
                    description={pos.description}
                    bulletStyle={config.bulletStyle}
                    className="text-[10px]"
                  />
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
            <div key={edu.id || i} className="mb-2">
              <div className="flex justify-between items-baseline gap-3">
                <span className="font-bold text-[10px]">
                  {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: "#555" }}>
                  {dateRange(edu.startDate, edu.endDate)}
                </span>
              </div>
              <p className="text-[10px]">{edu.institution}</p>
              {edu.gpa && <p className="text-[9px]" style={{ color: "#555" }}>GPA: {edu.gpa}</p>}
            </div>
          ))}
        </div>
      ) : null,

    skills: () =>
      hasContent(resume, "skills") ? (
        <div key="sk">
          <SectionTitle>Skills</SectionTitle>
          <SkillsBlock skills={resume.skills} config={config} textSize="text-[10px]" />
        </div>
      ) : null,

    certifications: () =>
      hasContent(resume, "certifications") ? (
        <div key="cert">
          <SectionTitle>Certifications</SectionTitle>
          {resume.certifications.map((c, i) => (
            <div key={c.id || i} className="text-[10px] mb-1">
              <p>{c.name}{c.issuer ? ` \u2014 ${c.issuer}` : ""}{c.date ? ` (${formatDate(c.date)})` : ""}</p>
              {c.credentialId && (
                <p className="text-[9px]" style={{ color: "#555" }}>Credential ID: {c.credentialId}</p>
              )}
            </div>
          ))}
        </div>
      ) : null,

    languages: () =>
      hasContent(resume, "languages") ? (
        <div key="lang">
          <SectionTitle>Languages</SectionTitle>
          <p className="text-[10px]">
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
                <p className="font-bold text-[10px]">{p.name}</p>
                {(p.startDate || p.endDate) && (
                  <span className="text-[10px] shrink-0" style={{ color: "#555" }}>
                    {dateRange(p.startDate, p.endDate)}
                  </span>
                )}
              </div>
              <BulletList
                description={p.description}
                bulletStyle={config.bulletStyle}
                className="text-[10px]"
              />
            </div>
          ))}
        </div>
      ) : null,

    awards: () =>
      hasContent(resume, "awards") ? (
        <div key="aw">
          <SectionTitle>Awards</SectionTitle>
          {resume.awards.map((a, i) => (
            <p key={a.id || i} className="text-[10px] mb-1">{a.title}{a.issuer ? ` \u2014 ${a.issuer}` : ""}{a.date ? ` (${formatDate(a.date)})` : ""}</p>
          ))}
        </div>
      ) : null,

    references: () =>
      hasContent(resume, "references") ? (
        <div key="ref">
          <SectionTitle>References</SectionTitle>
          {resume.references.map((r, i) => (
            <div key={r.id || i} className="mb-1.5">
              <p className="text-[10px] font-semibold">{r.name}{r.company ? ` from ${r.company}` : ""}</p>
              <p className="text-[9px]" style={{ color: "#555" }}>
                {r.email}{r.phone ? ` \u00B7 ${r.phone}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : null,

    customSections: () =>
      hasContent(resume, "customSections") ? (
        <div key="cs">
          {resume.customSections.filter((s) => !s.basedOn).map((s) => (
            <div key={s.id}>
              <SectionTitle>{s.title}</SectionTitle>
              <p className="text-[10px] whitespace-pre-wrap">{s.content}</p>
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
              <p className="text-[10px] whitespace-pre-wrap">{cs.content}</p>
            </div>
          );
        }
        return sectionRenderers[s]?.();
      })}
    </TemplateWrapper>
  );
}
