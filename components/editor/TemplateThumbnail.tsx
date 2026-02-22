"use client";

import { Suspense, useMemo } from "react";
import {
  getTemplateComponent,
  DEFAULT_TEMPLATE_CONFIG,
  type TemplateProps,
} from "@/components/templates/TemplateRegistry";
import type { ResumeData, TemplateConfig } from "@/types/resume";

// Sample data used when user resume is empty
const SAMPLE_RESUME: ResumeData = {
  id: "preview",
  title: "Preview",
  templateId: "ats-001",
  templateConfig: DEFAULT_TEMPLATE_CONFIG,
  uploadedFile: null,
  personalInfo: {
    name: "John Anderson",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    address: "San Francisco, CA",
    linkedin: "linkedin.com/in/john",
    website: "johnanderson.dev",
    photoUrl: "",
  },
  summary:
    "Experienced software engineer with 8+ years building scalable web applications. Proficient in React, Node.js, and cloud technologies.",
  workExperience: [
    {
      id: "w1",
      company: "Tech Corp",
      position: "Senior Software Engineer",
      startDate: "2021-01",
      endDate: "",
      isCurrent: true,
      description: "",
      bullets: [
        "Led development of microservices architecture serving 2M+ users",
        "Mentored team of 5 junior developers",
      ],
    },
    {
      id: "w2",
      company: "StartupXYZ",
      position: "Full Stack Developer",
      startDate: "2018-06",
      endDate: "2020-12",
      isCurrent: false,
      description: "",
      bullets: [
        "Built React dashboard increasing user engagement by 40%",
        "Implemented CI/CD pipeline reducing deployment time by 60%",
      ],
    },
  ],
  education: [
    {
      id: "e1",
      institution: "University of Technology",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      startDate: "2014-09",
      endDate: "2018-05",
      gpa: "3.8",
    },
  ],
  skills: [
    { id: "s1", name: "React", level: "expert" },
    { id: "s2", name: "TypeScript", level: "expert" },
    { id: "s3", name: "Node.js", level: "advanced" },
    { id: "s4", name: "Python", level: "advanced" },
    { id: "s5", name: "AWS", level: "intermediate" },
    { id: "s6", name: "Docker", level: "intermediate" },
  ],
  certifications: [],
  languages: [
    { id: "l1", language: "English", proficiency: "Native" },
    { id: "l2", language: "Spanish", proficiency: "Intermediate" },
  ],
  projects: [],
  awards: [],
  references: [],
  customSections: [],
  sectionOrder: [
    "personalInfo",
    "summary",
    "workExperience",
    "education",
    "skills",
    "languages",
  ],
  hiddenSections: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface TemplateThumbnailProps {
  templateId: string;
  resume?: ResumeData | null;
  config?: TemplateConfig;
}

export function TemplateThumbnail({
  templateId,
  resume,
  config,
}: TemplateThumbnailProps) {
  const TemplateComponent = useMemo(
    () => getTemplateComponent(templateId),
    [templateId]
  );

  // Use real resume data if available and has content, otherwise sample
  const previewResume = useMemo(() => {
    const hasContent =
      resume?.personalInfo?.name && resume.personalInfo.name.trim().length > 0;
    const base = hasContent ? resume! : SAMPLE_RESUME;
    return { ...base, templateId };
  }, [resume, templateId]);

  const previewConfig = config || previewResume.templateConfig || DEFAULT_TEMPLATE_CONFIG;

  // A4 source dimensions
  const A4_W = 794;
  const A4_H = 1123;

  return (
    <div
      className="relative w-full bg-white rounded overflow-hidden border"
      style={{ aspectRatio: `${A4_W} / ${A4_H}` }}
    >
      {/*
        Inner container at full A4 size, scaled down to fit.
        We use a CSS custom property trick: the parent has the desired display size (100% width),
        and the child is the full A4 at scale(containerWidth / 794).
        Since we don't know containerWidth in CSS alone, we use a fixed scale
        and let the aspect-ratio parent clip it properly.
        Scale = 0.265 makes 794 * 0.265 ≈ 210px which works for most grid sizes.
        For larger cards we use a slightly bigger scale.
      */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          width: `${A4_W}px`,
          height: `${A4_H}px`,
          transform: `scale(var(--thumb-scale, 0.265))`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          }
        >
          <TemplateComponent resume={previewResume} config={previewConfig} />
        </Suspense>
      </div>
    </div>
  );
}
