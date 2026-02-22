"use client";

import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import type { SectionId } from "@/types/resume";
import { formatDate, getVisibleSections, hasContent, ProfilePhoto, BulletList, getBulletMarker, findCustomSection, isCustomSectionId, RenderClonedSection } from "../template-helpers";

/**
 * ATS001 - Classic centered header, bold section headings with underline,
 * single-column, black & white. Based on reference ats001.jpg
 */
export function Ats001Template({ resume, config }: TemplateProps) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 mt-4">
      <h2 className="text-sm font-bold uppercase tracking-wide pb-1 border-b-2 border-black">
        {children}
      </h2>
    </div>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    personalInfo: () =>
      info ? (
        <div key="pi" className="text-center mb-3">
          <div className="flex items-center justify-center gap-3">
            <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={56} />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">{info.name}</h1>
              <p className="text-[10px] mt-0.5" style={{ color: "#444" }}>
                {[info.address, info.email, info.phone, info.linkedin, info.website]
                  .filter(Boolean)
                  .join(" \u00B7 ")}
              </p>
            </div>
          </div>
        </div>
      ) : null,

    summary: () =>
      resume.summary ? (
        <div key="sum">
          <p className="text-xs leading-relaxed text-justify">{resume.summary}</p>
        </div>
      ) : null,

    workExperience: () =>
      hasContent(resume, "workExperience") ? (
        <div key="we">
          <SectionTitle>Work Experience</SectionTitle>
          {resume.workExperience.map((exp, i) => (
            <div key={exp.id || i} className="mb-3">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-xs uppercase">{exp.company}</span>
                <span className="text-[10px]" style={{ color: "#555" }}>
                  {exp.startDate && (formatDate(exp.startDate))}
                  {(exp.startDate && (exp.endDate || exp.isCurrent)) && " \u2014 "}
                  {exp.isCurrent ? "Present" : exp.endDate && formatDate(exp.endDate)}
                </span>
              </div>
              <p className="font-semibold text-xs">{exp.position}</p>
              <BulletList bullets={exp.bullets} description={exp.description} bulletStyle={config.bulletStyle} className="text-xs" />
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
                <span className="font-bold text-xs uppercase">{edu.institution}</span>
                <span className="text-[10px]" style={{ color: "#555" }}>
                  {edu.startDate && formatDate(edu.startDate)}
                  {edu.startDate && edu.endDate && "-"}
                  {edu.endDate && formatDate(edu.endDate)}
                </span>
              </div>
              <p className="text-xs">
                {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""}
              </p>
              {edu.gpa && <p className="text-xs">GPA: {edu.gpa}</p>}
            </div>
          ))}
        </div>
      ) : null,

    skills: () => {
      const marker = getBulletMarker(config.bulletStyle);
      return hasContent(resume, "skills") ? (
        <div key="sk">
          <SectionTitle>Skills</SectionTitle>
          <ul className="mt-0.5 space-y-0.5">
            {resume.skills.map((s, i) => (
              <li key={s.id || i} className="text-xs flex items-start gap-1.5" style={{ listStyleType: "none" }}>
                {marker && <span className="shrink-0 leading-[inherit]">{marker}</span>}
                <span>{s.name}{s.level ? ` (${s.level})` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null;
    },

    certifications: () =>
      hasContent(resume, "certifications") ? (
        <div key="cert">
          <SectionTitle>Certifications</SectionTitle>
          {resume.certifications.map((c, i) => (
            <div key={c.id || i} className="text-xs mb-1">
              <p>
                <span className="font-semibold">{c.name}</span>
                {c.issuer ? ` \u2014 ${c.issuer}` : ""}
                {c.date ? ` (${formatDate(c.date)})` : ""}
              </p>
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
                {(p.startDate || p.endDate) && (
                  <span className="text-[10px]" style={{ color: "#555" }}>
                    {p.startDate && formatDate(p.startDate)}
                    {p.startDate && p.endDate && " \u2014 "}
                    {p.endDate && formatDate(p.endDate)}
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
              <span className="font-semibold">{a.title}</span>
              {a.issuer ? ` \u2014 ${a.issuer}` : ""}
              {a.date ? ` (${formatDate(a.date)})` : ""}
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
