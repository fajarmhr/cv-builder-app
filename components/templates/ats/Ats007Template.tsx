"use client";

import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import type { SectionId } from "@/types/resume";
import { formatDate, getVisibleSections, hasContent, ProfilePhoto, BulletList, getBulletMarker, findCustomSection, isCustomSectionId, RenderClonedSection } from "../template-helpers";

/**
 * ATS007 - Name left + contact info right, thin horizontal line dividers,
 * clean minimal single-column.
 * Based on reference ats007.jpg (EDGAR MACKENZIE style)
 */
export function Ats007Template({ resume, config }: TemplateProps) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 mt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide mb-1">{children}</h2>
      <hr style={{ borderColor: "#ccc" }} />
    </div>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    personalInfo: () =>
      info ? (
        <div key="pi" className="mb-4 flex justify-between items-end pb-2 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={48} />
            <h1 className="text-2xl font-bold uppercase">{info.name}</h1>
          </div>
          <div className="text-right text-[9px]" style={{ color: "#555" }}>
            {info.address && <p>{info.address}</p>}
            {info.phone && <p>Phone: {info.phone}</p>}
            {info.email && <p>Email: {info.email}</p>}
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
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-xs uppercase">{exp.position}</span>
                <span className="text-[10px]" style={{ color: "#555" }}>
                  {exp.startDate} {"\u2013"} {exp.isCurrent ? "present" : exp.endDate}
                </span>
              </div>
              <p className="text-[10px] font-semibold">{exp.company}</p>
              <BulletList
                bullets={exp.bullets}
                description={exp.description}
                bulletStyle={config.bulletStyle}
                className="text-[10px]"
              />
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
                <span className="font-bold text-[10px]">
                  {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                </span>
                <span className="text-[10px]" style={{ color: "#555" }}>
                  {edu.startDate} {"\u2013"} {edu.endDate}
                </span>
              </div>
              <p className="text-[10px]">{edu.institution}</p>
              {edu.gpa && <p className="text-[9px]" style={{ color: "#555" }}>GPA: {edu.gpa}</p>}
            </div>
          ))}
        </div>
      ) : null,

    skills: () => {
      const marker = getBulletMarker(config.bulletStyle);
      return hasContent(resume, "skills") ? (
        <div key="sk">
          <SectionTitle>Skills &amp; Other</SectionTitle>
          <ul className="mt-0.5 space-y-0.5">
            {resume.skills.map((s, i) => (
              <li key={s.id || i} className="text-[10px] flex items-start gap-1.5" style={{ listStyleType: "none" }}>
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
              <div className="flex justify-between items-baseline">
                <p className="font-bold text-[10px]">{p.name}</p>
                {(p.startDate || p.endDate) && (
                  <span className="text-[9px]" style={{ color: "#555" }}>
                    {p.startDate && formatDate(p.startDate)}
                    {p.startDate && p.endDate && " \u2013 "}
                    {p.endDate && formatDate(p.endDate)}
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
            <p key={a.id || i} className="text-[10px] mb-1">{a.title}{a.date ? ` (${formatDate(a.date)})` : ""}</p>
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
              <p className="text-xs whitespace-pre-wrap">{cs.content}</p>
            </div>
          );
        }
        return sectionRenderers[s]?.();
      })}
    </TemplateWrapper>
  );
}
