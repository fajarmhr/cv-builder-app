import { NextResponse } from "next/server";
import type { Resume } from "@/generated/prisma/client";
import type {
  ResumeData,
  PersonalInfo,
  WorkExperience,
  Education,
  Skill,
  Certification,
  Language,
  Project,
  Award,
  Reference,
  CustomSection,
  TemplateConfig,
  SectionId,
} from "@/types/resume";
import { parseJsonField, stringifyJsonField, DEFAULT_SECTION_ORDER } from "@/types/resume";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function parseResumeFromDb(dbResume: Resume): ResumeData {
  return {
    id: dbResume.id,
    title: dbResume.title,
    templateId: dbResume.templateId,
    templateConfig: parseJsonField<TemplateConfig>(dbResume.templateConfig),
    personalInfo: parseJsonField<PersonalInfo>(dbResume.personalInfo),
    summary: dbResume.summary,
    workExperience: parseJsonField<WorkExperience[]>(dbResume.workExperience) || [],
    education: parseJsonField<Education[]>(dbResume.education) || [],
    skills: parseJsonField<Skill[]>(dbResume.skills) || [],
    certifications: parseJsonField<Certification[]>(dbResume.certifications) || [],
    languages: parseJsonField<Language[]>(dbResume.languages) || [],
    projects: parseJsonField<Project[]>(dbResume.projects) || [],
    awards: parseJsonField<Award[]>(dbResume.awards) || [],
    references: parseJsonField<Reference[]>(dbResume.references) || [],
    customSections: parseJsonField<CustomSection[]>(dbResume.customSections) || [],
    sectionOrder: parseJsonField<string[]>(dbResume.sectionOrder) || DEFAULT_SECTION_ORDER,
    hiddenSections: parseJsonField<string[]>(dbResume.hiddenSections) || [],
    uploadedFile: dbResume.uploadedFile,
    createdAt: dbResume.createdAt.toISOString(),
    updatedAt: dbResume.updatedAt.toISOString(),
  };
}

export function prepareResumeForDb(data: Partial<ResumeData>): Record<string, unknown> {
  const dbData: Record<string, unknown> = {};

  if (data.title !== undefined) dbData.title = data.title;
  if (data.templateId !== undefined) dbData.templateId = data.templateId;
  if (data.summary !== undefined) dbData.summary = data.summary;
  if (data.uploadedFile !== undefined) dbData.uploadedFile = data.uploadedFile;

  if (data.templateConfig !== undefined)
    dbData.templateConfig = stringifyJsonField(data.templateConfig);
  if (data.personalInfo !== undefined)
    dbData.personalInfo = stringifyJsonField(data.personalInfo);
  if (data.workExperience !== undefined)
    dbData.workExperience = stringifyJsonField(data.workExperience);
  if (data.education !== undefined)
    dbData.education = stringifyJsonField(data.education);
  if (data.skills !== undefined)
    dbData.skills = stringifyJsonField(data.skills);
  if (data.certifications !== undefined)
    dbData.certifications = stringifyJsonField(data.certifications);
  if (data.languages !== undefined)
    dbData.languages = stringifyJsonField(data.languages);
  if (data.projects !== undefined)
    dbData.projects = stringifyJsonField(data.projects);
  if (data.awards !== undefined)
    dbData.awards = stringifyJsonField(data.awards);
  if (data.references !== undefined)
    dbData.references = stringifyJsonField(data.references);
  if (data.customSections !== undefined)
    dbData.customSections = stringifyJsonField(data.customSections);
  if (data.sectionOrder !== undefined)
    dbData.sectionOrder = stringifyJsonField(data.sectionOrder);
  if (data.hiddenSections !== undefined)
    dbData.hiddenSections = stringifyJsonField(data.hiddenSections);

  return dbData;
}
