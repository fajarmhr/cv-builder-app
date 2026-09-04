"use client";

import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import type { SectionId } from "@/types/resume";
import { formatDate, getVisibleSections, hasContent, ProfilePhoto, BulletList, SkillsBlock, findCustomSection, isCustomSectionId, RenderClonedSection } from "../template-helpers";

/**
 * ATS004 - Large uppercase name, double-line colored dividers under section headings,
 * section headings uppercase + italic, single-column.
 * Based on reference ats004.webp
 */
export function Ats004Template({ resume, config }: TemplateProps) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);
  const accent = config.accentColor || "#1a1a1a";

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 mt-4">
      <h2 className="text-xs font-bold uppercase italic tracking-widest mb-1">
        {children}
      </h2>
      <div className="border-t border-b" style={{ borderColor: accent, height: "3px" }} />
    </div>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    personalInfo: () =>
      info ? (
        <div key="pi" className="mb-3">
          <div className="flex items-center gap-3">
            <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={52} />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-widest">{info.name}</h1>
              <p className="text-[10px] mt-1" style={{ color: "#555" }}>
                {[info.phone, info.email, info.address, info.linkedin].filter(Boolean).join(" | ")}
              </p>
            </div>
          </div>
        </div>
      ) : null,

    summary: () => null,

    workExperience: () =>
      hasContent(resume, "workExperience") ? (
        <div key="we">
          <SectionTitle>Work Experience</SectionTitle>
          {resume.workExperience.map((exp, i) => (
            <div key={exp.id || i} className="mb-3">
              <p className="text-xs font-bold uppercase">{exp.company}</p>
              {exp.positions.map((pos, pi) => (
                <div key={pos.id || pi} className="mt-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs italic" style={{ color: "#555" }}>{pos.title}</span>
                    <span className="text-[10px]" style={{ color: "#555" }}>
                      {pos.startDate} {"\u2013"} {pos.isCurrent ? "Present" : pos.endDate}
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
            <div key={edu.id || i} className="mb-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs">
                  {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                </span>
                <span className="text-[10px]" style={{ color: "#555" }}>
                  {edu.startDate} {"\u2013"} {edu.endDate}
                </span>
              </div>
              <p className="text-xs italic" style={{ color: "#555" }}>{edu.institution}</p>
              {edu.gpa && <p className="text-xs">GPA: {edu.gpa}</p>}
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
              <p>{c.name}{c.issuer ? ` \u2014 ${c.issuer}` : ""}{c.date ? ` (${formatDate(c.date)})` : ""}</p>
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
              <div className="flex justify-between items-baseline">
                <p className="font-bold text-xs">{p.name}</p>
                {(p.startDate || p.endDate || p.isCurrent) && (
                  <span className="text-[10px]" style={{ color: "#555" }}>
                    {p.startDate && formatDate(p.startDate)}
                    {p.startDate && (p.endDate || p.isCurrent) && " \u2013 "}
                    {p.isCurrent ? "Present" : p.endDate && formatDate(p.endDate)}
                  </span>
                )}
              </div>
              <BulletList description={p.description} bulletStyle={config.bulletStyle} className="text-xs" />
            </div>
          ))}
        </div>
      ) : null,

    awards: () =>
      hasContent(resume, "awards") ? (
        <div key="aw">
          <SectionTitle>Awards</SectionTitle>
          {resume.awards.map((a, i) => (
            <p key={a.id || i} className="text-xs mb-1">{a.title}{a.date ? ` (${formatDate(a.date)})` : ""}</p>
          ))}
        </div>
      ) : null,

    references: () =>
      hasContent(resume, "references") ? (
        <div key="ref">
          <SectionTitle>References</SectionTitle>
          {resume.references.map((r, i) => (
            <div key={r.id || i} className="mb-1">
              <p className="text-xs font-semibold">{r.name}</p>
              <p className="text-[10px]" style={{ color: "#555" }}>
                {r.position}{r.company ? ` at ${r.company}` : ""}
                {r.email ? ` \u2014 ${r.email}` : ""}{r.phone ? ` \u2022 ${r.phone}` : ""}
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
