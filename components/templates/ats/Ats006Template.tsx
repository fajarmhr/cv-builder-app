"use client";

import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import type { SectionId } from "@/types/resume";
import { formatDate, getVisibleSections, hasContent, ProfilePhoto, BulletList, SkillsBlock, findCustomSection, isCustomSectionId, RenderClonedSection } from "../template-helpers";

/**
 * ATS006 - Left dates column + right content, letter-spaced section headings,
 * serif-influenced, horizontal rules between sections.
 * Based on reference ats006.webp (resumegenius / Tim Stewart style)
 */
export function Ats006Template({ resume, config }: TemplateProps) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);
  const accent = config.accentColor || "#1a1a1a";

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 mt-4">
      <hr className="mb-1.5" style={{ borderColor: accent }} />
      <h2 className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.25em" }}>
        {children}
      </h2>
    </div>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    personalInfo: () =>
      info ? (
        <div key="pi" className="text-center mb-3">
          <div className="flex items-center justify-center gap-3">
            <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={48} />
            <div>
              <h1 className="text-xl font-bold">{info.name}</h1>
              <p className="text-[9px] mt-0.5" style={{ color: "#555" }}>
                {[info.address, info.phone, info.email, info.website].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
        </div>
      ) : null,

    summary: () =>
      resume.summary ? (
        <div key="sum">
          <SectionTitle>Profile</SectionTitle>
          <p className="text-[10px] leading-relaxed whitespace-pre-line">{resume.summary}</p>
        </div>
      ) : null,

    workExperience: () =>
      hasContent(resume, "workExperience") ? (
        <div key="we">
          <SectionTitle>Employment History</SectionTitle>
          {resume.workExperience.map((exp, i) => (
            <div key={exp.id || i} className="mb-3">
              <p className="font-bold text-xs mb-1">{exp.company}</p>
              {exp.positions.map((pos, pi) => (
                <div key={pos.id || pi} className="mb-1.5 flex gap-4">
                  {/* Left date column */}
                  <div className="w-[120px] shrink-0 text-[9px] pt-0.5" style={{ color: "#666" }}>
                    {pos.startDate} {"\u2014"} {pos.isCurrent ? "Present" : pos.endDate}
                  </div>
                  {/* Right content */}
                  <div className="flex-1">
                    <p className="font-semibold text-xs">{pos.title}</p>
                    <BulletList
                      bullets={pos.bullets}
                      description={pos.description}
                      bulletStyle={config.bulletStyle}
                      className="text-[10px]"
                    />
                  </div>
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
            <div key={edu.id || i} className="mb-2 flex gap-4">
              <div className="w-[120px] shrink-0 text-[9px] pt-0.5" style={{ color: "#666" }}>
                {edu.startDate} {"\u2014"} {edu.endDate}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-[10px]">
                    {edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}, {edu.institution}
                  </span>
                </div>
                {edu.gpa && (
                  <p className="text-[10px]" style={{ color: "#555" }}>GPA: {edu.gpa}</p>
                )}
              </div>
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
              <div className="flex justify-between items-baseline">
                <p className="font-bold text-[10px]">{p.name}</p>
                {(p.startDate || p.endDate) && (
                  <span className="text-[9px]" style={{ color: "#666" }}>
                    {p.startDate && formatDate(p.startDate)}
                    {p.startDate && p.endDate && " \u2014 "}
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
            <div key={r.id || i} className="mb-2">
              <p className="font-bold text-[10px]">{r.name} from {r.company}</p>
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
