"use client";

import { TemplateWrapper } from "../TemplateWrapper";
import type { TemplateProps } from "../TemplateRegistry";
import type { SectionId } from "@/types/resume";
import { formatDate, getVisibleSections, hasContent, ProfilePhoto, BulletList, SkillsBlock, findCustomSection, isCustomSectionId, RenderClonedSection } from "../template-helpers";

/**
 * ATS003 - Two-column with photo, section headings in bordered boxes,
 * compact layout. Based on reference ats003.png
 */
export function Ats003Template({ resume, config }: TemplateProps) {
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);
  const accent = config.accentColor || "#333333";

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 mt-3">
      <h2
        className="text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 border inline-block"
        style={{ borderColor: accent, color: accent }}
      >
        {children}
      </h2>
    </div>
  );

  // Determine left/right sections
  const leftSections: string[] = ["skills", "languages", "certifications", "references"];
  const rightSections = visible.filter((s) => !leftSections.includes(s) && s !== "personalInfo");
  const leftVisible = visible.filter((s) => leftSections.includes(s));

  const renderSection = (s: string): React.ReactNode => {
    switch (s) {
      case "summary":
        return resume.summary ? (
          <div key="sum">
            <SectionTitle>Profile</SectionTitle>
            <p className="text-[10px] leading-relaxed whitespace-pre-line">{resume.summary}</p>
          </div>
        ) : null;

      case "workExperience":
        return hasContent(resume, "workExperience") ? (
          <div key="we">
            <SectionTitle>Work Experience</SectionTitle>
            {resume.workExperience.map((exp, i) => (
              <div key={exp.id || i} className="mb-2.5">
                <p className="font-bold text-[10px]">{exp.company}</p>
                {exp.positions.map((pos, pi) => (
                  <div key={pos.id || pi} className="mt-0.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] italic" style={{ color: "#555" }}>{pos.title}</span>
                      <span className="text-[9px]" style={{ color: "#666" }}>
                        {pos.startDate} - {pos.isCurrent ? "Present" : pos.endDate}
                      </span>
                    </div>
                    <BulletList bullets={pos.bullets} description={pos.description} bulletStyle={config.bulletStyle} className="text-[10px]" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null;

      case "education":
        return hasContent(resume, "education") ? (
          <div key="edu">
            <SectionTitle>Education</SectionTitle>
            {resume.education.map((edu, i) => (
              <div key={edu.id || i} className="mb-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-[10px]">{edu.institution}</span>
                  <span className="text-[9px]" style={{ color: "#666" }}>
                    {edu.startDate} - {edu.endDate}
                  </span>
                </div>
                <p className="text-[10px]">
                  {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""}
                  {edu.gpa ? ` \u2022 GPA: ${edu.gpa}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null;

      case "skills": {
        return hasContent(resume, "skills") ? (
          <div key="sk">
            <SectionTitle>Skills</SectionTitle>
            <SkillsBlock skills={resume.skills} config={config} textSize="text-[10px]" />
          </div>
        ) : null;
      }

      case "languages":
        return hasContent(resume, "languages") ? (
          <div key="lang">
            <SectionTitle>Languages</SectionTitle>
            {resume.languages.map((l, i) => (
              <p key={l.id || i} className="text-[10px]">
                {l.language}{l.proficiency ? ` - ${l.proficiency}` : ""}
              </p>
            ))}
          </div>
        ) : null;

      case "certifications":
        return hasContent(resume, "certifications") ? (
          <div key="cert">
            <SectionTitle>Certifications</SectionTitle>
            {resume.certifications.map((c, i) => (
              <div key={c.id || i} className="text-[10px] mb-0.5">
                <p>{c.name}{c.date ? ` (${formatDate(c.date)})` : ""}</p>
                {c.credentialId && (
                  <p className="text-[9px]" style={{ color: "#777" }}>ID: {c.credentialId}</p>
                )}
              </div>
            ))}
          </div>
        ) : null;

      case "projects":
        return hasContent(resume, "projects") ? (
          <div key="proj">
            <SectionTitle>Projects</SectionTitle>
            {resume.projects.map((p, i) => (
              <div key={p.id || i} className="mb-1.5">
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
                <BulletList description={p.description} bulletStyle={config.bulletStyle} className="text-[10px]" />
              </div>
            ))}
          </div>
        ) : null;

      case "awards":
        return hasContent(resume, "awards") ? (
          <div key="aw">
            <SectionTitle>Awards</SectionTitle>
            {resume.awards.map((a, i) => (
              <p key={a.id || i} className="text-[10px] mb-0.5">{a.title}{a.date ? ` (${formatDate(a.date)})` : ""}</p>
            ))}
          </div>
        ) : null;

      case "references":
        return hasContent(resume, "references") ? (
          <div key="ref">
            <SectionTitle>References</SectionTitle>
            {resume.references.map((r, i) => (
              <div key={r.id || i} className="mb-1">
                <p className="text-[10px] font-semibold">{r.name}</p>
                <p className="text-[9px]" style={{ color: "#555" }}>
                  {r.position}{r.company ? `, ${r.company}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null;

      case "customSections":
        return hasContent(resume, "customSections") ? (
          <div key="cs">
            {resume.customSections.filter((sec) => !sec.basedOn).map((sec) => (
              <div key={sec.id}>
                <SectionTitle>{sec.title}</SectionTitle>
                <p className="text-[10px] whitespace-pre-wrap">{sec.content}</p>
              </div>
            ))}
          </div>
        ) : null;

      default: {
        if (isCustomSectionId(s)) {
          const cs = findCustomSection(resume, s);
          if (!cs) return null;
          if (cs.basedOn && cs.items?.length) {
            return <RenderClonedSection key={s} cs={cs} config={config} SectionTitle={SectionTitle} textSize="text-[10px]" subTextSize="text-[9px]" />;
          }
          if (!cs.content) return null;
          return (
            <div key={s}>
              <SectionTitle>{cs.title}</SectionTitle>
              <p className="text-[10px] whitespace-pre-wrap">{cs.content}</p>
            </div>
          );
        }
        return null;
      }
    }
  };

  return (
    <TemplateWrapper config={config} padding="1.5cm">
      {/* Header with photo */}
      {info && (
        <div className="flex items-center gap-3 mb-2 pb-2 border-b" style={{ borderColor: "#ddd" }}>
          <ProfilePhoto photoUrl={info.photoUrl} name={info.name} size={64} />
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wide">{info.name}</h1>
            <p className="text-[10px]" style={{ color: "#555" }}>
              {[info.email, info.phone, info.address, info.linkedin, info.website]
                .filter(Boolean)
                .join(" | ")}
            </p>
          </div>
        </div>
      )}

      {/* Two-column body */}
      <div className="flex gap-4">
        {/* Left sidebar */}
        <div className="w-[35%] shrink-0">
          {leftVisible.map((s) => renderSection(s))}
        </div>
        {/* Right main */}
        <div className="flex-1">
          {rightSections.map((s) => renderSection(s))}
        </div>
      </div>
    </TemplateWrapper>
  );
}
