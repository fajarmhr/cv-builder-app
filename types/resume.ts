export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  website: string;
  photoUrl: string;
}

/** A single role held at a company. */
export interface Position {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  bullets: string[];
}

/** One workplace, which may contain multiple positions (e.g. after a promotion). */
export interface WorkExperience {
  id: string;
  company: string;
  positions: Position[];
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
  category?: string;
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
  headerFontFamily?: string;
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

function genId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Accepts either the legacy flat shape ({company, position, startDate, ...})
 * or the new nested shape ({company, positions[]}) and always returns the
 * nested shape. Keeps existing resumes working without data loss.
 */
export function normalizeWorkExperience(raw: unknown): WorkExperience[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    const entry = (e ?? {}) as Record<string, unknown>;
    const company = typeof entry.company === "string" ? entry.company : "";

    // New shape: already has a positions array.
    if (Array.isArray(entry.positions)) {
      return {
        id: typeof entry.id === "string" ? entry.id : genId(),
        company,
        positions: (entry.positions as unknown[]).map((p) => {
          const pos = (p ?? {}) as Record<string, unknown>;
          return {
            id: typeof pos.id === "string" ? pos.id : genId(),
            title: typeof pos.title === "string" ? pos.title : "",
            startDate: typeof pos.startDate === "string" ? pos.startDate : "",
            endDate: typeof pos.endDate === "string" ? pos.endDate : "",
            isCurrent: pos.isCurrent === true,
            description: typeof pos.description === "string" ? pos.description : "",
            bullets: Array.isArray(pos.bullets) ? (pos.bullets as string[]) : [],
          };
        }),
      };
    }

    // Legacy flat shape: wrap into a single position.
    const baseId = typeof entry.id === "string" ? entry.id : genId();
    return {
      id: baseId,
      company,
      positions: [
        {
          id: `${baseId}-p0`,
          title: typeof entry.position === "string" ? entry.position : "",
          startDate: typeof entry.startDate === "string" ? entry.startDate : "",
          endDate: typeof entry.endDate === "string" ? entry.endDate : "",
          isCurrent: entry.isCurrent === true,
          description: typeof entry.description === "string" ? entry.description : "",
          bullets: Array.isArray(entry.bullets) ? (entry.bullets as string[]) : [],
        },
      ],
    };
  });
}
