export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  website: string;
  photoUrl: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  bullets: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

export interface Skill {
  id: string;
  name: string;
  level: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId: string;
}

export interface Language {
  id: string;
  language: string;
  proficiency: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  startDate: string;
  endDate: string;
  technologies: string[];
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export interface Reference {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  /** If set, this is a cloned section with structured data matching the base section type */
  basedOn?: SectionId;
  /** Structured items array (typed based on basedOn). Only present for cloned sections. */
  items?: unknown[];
}

export interface TemplateConfig {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  lineSpacing: string;
  bulletStyle?: "disc" | "dash" | "arrow" | "square" | "none";
}

export type SectionId =
  | "personalInfo"
  | "summary"
  | "workExperience"
  | "education"
  | "skills"
  | "certifications"
  | "languages"
  | "projects"
  | "awards"
  | "references"
  | "customSections";

export interface ResumeData {
  id: string;
  title: string;
  templateId: string;
  templateConfig: TemplateConfig | null;
  personalInfo: PersonalInfo | null;
  summary: string | null;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  languages: Language[];
  projects: Project[];
  awards: Award[];
  references: Reference[];
  customSections: CustomSection[];
  sectionOrder: string[];      // SectionId values + "custom:<id>" for standalone custom sections
  hiddenSections: string[];    // supports both SectionId and "custom:<id>"
  uploadedFile: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Check if a sectionOrder entry is a standalone custom section card */
export function isCustomSectionId(id: string): boolean {
  return id.startsWith("custom:");
}

/** Extract the customSection.id from a "custom:<id>" sectionOrder entry */
export function getCustomSectionEntryId(id: string): string {
  return id.slice("custom:".length);
}

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "personalInfo",
  "summary",
  "workExperience",
  "education",
  "skills",
  "certifications",
  "languages",
  "projects",
  "awards",
  "references",
  "customSections",
];

export function parseJsonField<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function stringifyJsonField<T>(value: T): string {
  return JSON.stringify(value);
}
