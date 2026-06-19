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
  SectionId,
} from "@/types/resume";
import { DEFAULT_SECTION_ORDER, normalizeWorkExperience } from "@/types/resume";

// Flat intermediate used while parsing one job; wrapped into the nested
// WorkExperience shape (company -> positions) via normalizeWorkExperience.
interface FlatJob {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  bullets: string[];
}

// ─── Utilities ───

function genId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

// ─── Date detection ───

// Matches month-year patterns (Jan 2020, January 2020, 01/2020, 2020)
const MONTH_YEAR_RE =
  /(?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)\s*\d{4}|\d{1,2}\/\d{4}|\d{4}/gi;

// Matches a date range on a line, including "present" variants
const DATE_RANGE_LINE_RE =
  /^((?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)\s*\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—]\s*((?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)\s*\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now|sekarang|saat ini)\s*$/i;

// Matches a single date (month year or just year) on a line by itself
const SINGLE_DATE_LINE_RE =
  /^((?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)\s*\d{4}|\d{1,2}\/\d{4}|\d{4})\s*$/i;

// Does this trimmed line consist ONLY of a date or date-range (possibly with surrounding whitespace)?
function isDateOnlyLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return DATE_RANGE_LINE_RE.test(t) || SINGLE_DATE_LINE_RE.test(t);
}

// Extract date(s) from a date-only line and return { start, end, isCurrent }
function parseDateString(text: string): {
  startDate: string;
  endDate: string;
  isCurrent: boolean;
} {
  const t = text.trim();
  const rangeMatch = t.match(DATE_RANGE_LINE_RE);
  if (rangeMatch) {
    const endPart = rangeMatch[2].trim().toLowerCase();
    const isCurrent = ["present", "current", "now", "sekarang", "saat ini"].includes(endPart);
    return {
      startDate: rangeMatch[1].trim(),
      endDate: isCurrent ? "" : rangeMatch[2].trim(),
      isCurrent,
    };
  }
  // Single date
  const dates = t.match(MONTH_YEAR_RE);
  if (dates && dates.length >= 1) {
    return { startDate: dates[0], endDate: dates.length > 1 ? dates[1] : "", isCurrent: false };
  }
  return { startDate: t, endDate: "", isCurrent: false };
}

// Extract inline dates from a line that also contains other text.
// Returns { textWithoutDates, startDate, endDate, isCurrent } or null if no dates found.
function extractInlineDates(line: string): {
  textWithoutDates: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
} | null {
  const t = line.trim();
  // Look for a date range pattern embedded in the line (often after a tab)
  const rangeRe =
    /((?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)\s*\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—]\s*((?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)\s*\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now|sekarang|saat ini)/i;
  const rangeMatch = t.match(rangeRe);
  if (rangeMatch) {
    const endPart = rangeMatch[2].trim().toLowerCase();
    const isCurrent = ["present", "current", "now", "sekarang", "saat ini"].includes(endPart);
    const textWithoutDates = t
      .replace(rangeMatch[0], "")
      .replace(/[\t]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return {
      textWithoutDates,
      startDate: rangeMatch[1].trim(),
      endDate: isCurrent ? "" : rangeMatch[2].trim(),
      isCurrent,
    };
  }
  // Look for a single date at the end of the line
  const singleRe =
    /\s+((?:Jan(?:uary|uari)?|Feb(?:ruary|ruari)?|Mar(?:ch|et)?|Apr(?:il)?|May|Mei|Jun(?:e|i)?|Jul(?:y|i)?|Aug(?:ust|ustus)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Des(?:ember)?)\s*\d{4}|\d{1,2}\/\d{4})\s*$/i;
  const singleMatch = t.match(singleRe);
  if (singleMatch) {
    const textWithoutDates = t.replace(singleMatch[0], "").trim();
    return { textWithoutDates, startDate: singleMatch[1].trim(), endDate: "", isCurrent: false };
  }
  return null;
}

// ─── Section detection ───

// Ordered list: more specific patterns first so they match before generic ones.
const SECTION_KEYWORDS: { section: string; re: RegExp }[] = [
  // Work experience variants (must come before generic "experience")
  {
    section: "workExperience",
    re: /^(work\s+experience|professional\s+experience|employment(\s+history)?|career\s+history|organizational\s+experience|organisation(?:al)?\s+experience|pengalaman\s+kerja|pengalaman\s+organisasi|pengalaman\s+magang|riwayat\s+pekerjaan|internship\s+experience)/i,
  },
  // Informal/formal education (must come before generic "education")
  {
    section: "education",
    re: /^(formal\s+education|informal\s+education|education|academic(?:\s+background)?|qualification|educational\s+background|pendidikan(?:\s+formal|\s+informal)?|riwayat\s+pendidikan|latar\s+belakang\s+pendidikan)/i,
  },
  // Summary/profile
  {
    section: "summary",
    re: /^(summary|profile|about\s+me|about|objective|professional\s+summary|career\s+objective|ringkasan|profil|tentang\s+saya|objektif)/i,
  },
  // Generic "experience" last so it doesn't swallow education patterns
  {
    section: "workExperience",
    re: /^(experience|pengalaman)/i,
  },
  // Skills
  {
    section: "skills",
    re: /^(skills|technical\s+skills|core\s+competencies|expertise|proficiencies|key\s+skills|keahlian|kemampuan|keterampilan|kompetensi)/i,
  },
  // Certifications (including "certifications / licenses" with slash)
  {
    section: "certifications",
    re: /^(certification|certifications|licen[sc]es?|accreditation|certifications?\s*\/\s*licen[sc]es?|sertifikasi|sertifikat|lisensi)/i,
  },
  // Languages
  {
    section: "languages",
    re: /^(language|languages|bahasa)/i,
  },
  // Projects
  {
    section: "projects",
    re: /^(project|projects|portfolio|proyek|projek)/i,
  },
  // Awards
  {
    section: "awards",
    re: /^(award|awards|honors|honour|achievements|accomplishments|penghargaan|prestasi)/i,
  },
  // References
  {
    section: "references",
    re: /^(reference|references|referensi)/i,
  },
  // "Additional" section -> we will handle as a special bucket
  {
    section: "__additional__",
    re: /^(additional(?:\s+information)?|other\s+information|informasi\s+tambahan|lain-lain|tambahan)/i,
  },
];

// Known section label keywords (short forms) used to split merged headers
const SECTION_LABEL_PREFIXES = [
  "FORMAL EDUCATION",
  "INFORMAL EDUCATION",
  "WORK EXPERIENCE",
  "PROFESSIONAL EXPERIENCE",
  "ORGANIZATIONAL EXPERIENCE",
  "ORGANISATION EXPERIENCE",
  "INTERNSHIP EXPERIENCE",
  "EDUCATION",
  "EXPERIENCE",
  "PENGALAMAN KERJA",
  "PENGALAMAN ORGANISASI",
  "PENGALAMAN MAGANG",
  "PENDIDIKAN FORMAL",
  "PENDIDIKAN INFORMAL",
  "PENDIDIKAN",
];

/**
 * Detect if a line is a section header. Returns { section, remainder } where
 * `remainder` is any trailing text after the section keyword (for merged headers
 * like "FORMAL EDUCATION TELKOM UNIVERSITY").
 */
function detectSection(line: string): { section: string; remainder: string } | null {
  // Strip leading colons, dashes, and trim
  const cleaned = line.replace(/^[:\-–—\s]+/, "").replace(/[:\-–—\s]+$/, "").trim();
  if (!cleaned) return null;

  // First try to detect merged section headers by checking known prefixes.
  // "FORMAL EDUCATION TELKOM UNIVERSITY" -> section=education, remainder="TELKOM UNIVERSITY"
  const upperCleaned = cleaned.toUpperCase();
  for (const prefix of SECTION_LABEL_PREFIXES) {
    if (upperCleaned.startsWith(prefix)) {
      const after = cleaned.slice(prefix.length).trim();
      // Only consider it merged if what remains looks like content (not empty, not just punctuation)
      const matchedPrefix = cleaned.slice(0, prefix.length);
      // Determine which section this prefix belongs to
      for (const { section, re } of SECTION_KEYWORDS) {
        if (re.test(matchedPrefix)) {
          return { section, remainder: after };
        }
      }
    }
  }

  // Then try the regex patterns against the whole cleaned line
  for (const { section, re } of SECTION_KEYWORDS) {
    if (re.test(cleaned)) {
      // Check if there is trailing text beyond the matched portion
      const match = cleaned.match(re);
      if (match) {
        const matchedLength = match[0].length;
        const remainder = cleaned.slice(matchedLength).trim();
        return { section, remainder };
      }
      return { section, remainder: "" };
    }
  }

  // Heuristic: ALL-CAPS line with no lowercase and length > 3 might be a section header
  // we don't recognize -- skip it unless it matches above
  return null;
}

// ─── Regex helpers for contact info ───

const EMAIL_RE = /[\w.+'-]+@[\w.-]+\.\w+/;
// Looser email regex for mangled OCR emails: allows special chars
const EMAIL_LOOSE_RE = /[\w.+'\-•*]+@[\w.-]+\.\w+/;
const PHONE_RE =
  /(?:\+?\d{1,4}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-]+\/?/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-]+\/?/i;
const URL_RE = /https?:\/\/[^\s|,]+/gi;
const GPA_RE = /(?:GPA|IPK|Cumulative\s+GPA)[:\s]*(\d+[.,]\d+)/i;
const DEGREE_KEYWORDS =
  /\b(bachelor|master|doctor|phd|mba|diploma|associate|s\.?[123]|d\.?[34]|sma|smk|b\.?[as]c?\.?|m\.?[as]c?\.?|sarjana|magister)\b/i;
const BULLET_RE = /^[\s]*[•\-\*\u2022\u2023\u25E6\u2043\u25AA\u25AB\u25CF]\s*/;
const CERT_ID_RE = /(?:certificate|credential|cert\.?)\s*(?:no\.?|id|number)[:\s]*(\S+)/i;
const LOCATION_RE =
  /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*,\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/;

// ─── First pass: split into sections with remainder handling ───

interface SectionBlock {
  section: string;
  lines: string[];
}

function splitIntoSections(lines: string[]): SectionBlock[] {
  const blocks: SectionBlock[] = [];
  let currentSection = "__header__";
  let currentLines: string[] = [];

  for (const line of lines) {
    const detection = detectSection(line);
    if (detection) {
      // Save previous block
      blocks.push({ section: currentSection, lines: currentLines });
      currentSection = detection.section;
      currentLines = [];
      // If there was a remainder (merged header), add it as the first content line
      if (detection.remainder) {
        currentLines.push(detection.remainder);
      }
    } else {
      currentLines.push(line);
    }
  }
  // Push final block
  blocks.push({ section: currentSection, lines: currentLines });

  return blocks;
}

// Merge section blocks with the same key into a combined map
function mergeSectionBlocks(blocks: SectionBlock[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const block of blocks) {
    if (!result[block.section]) {
      result[block.section] = [];
    }
    // Add a blank line separator between merged blocks (helps entry detection)
    if (result[block.section].length > 0 && block.lines.length > 0) {
      result[block.section].push("");
    }
    result[block.section].push(...block.lines);
  }
  return result;
}

// ─── Second pass: attach floating dates to nearest preceding content ───

/**
 * In DOCX files extracted from table/column layouts, dates often appear on a
 * line by themselves AFTER the content they belong to. This function finds
 * such orphan date lines within a section and appends them (as a tab-separated
 * suffix) to the nearest preceding non-blank, non-date line.
 */
function attachFloatingDates(lines: string[]): string[] {
  const result: string[] = [...lines];

  for (let i = 0; i < result.length; i++) {
    const trimmed = result[i].trim();
    if (!trimmed) continue;
    if (!isDateOnlyLine(trimmed)) continue;

    // This is a date-only line. Find the nearest preceding non-blank content line.
    let targetIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      const prev = result[j].trim();
      if (!prev) continue;
      if (isDateOnlyLine(prev)) continue;
      targetIdx = j;
      break;
    }

    if (targetIdx >= 0) {
      // Append the date to that line with a tab separator
      result[targetIdx] = result[targetIdx].trimEnd() + "\t" + trimmed;
      // Blank out the date line
      result[i] = "";
    }
  }

  return result;
}

// ─── Contact / Personal info extraction ───

function extractContactInfo(headerLines: string[]): Partial<PersonalInfo> {
  const text = headerLines.join("\n");
  const info: Partial<PersonalInfo> = {};

  // Email: try strict first, then loose (for OCR-mangled emails)
  const emailMatch = text.match(EMAIL_RE);
  if (emailMatch) {
    info.email = emailMatch[0];
  } else {
    const looseMatch = text.match(EMAIL_LOOSE_RE);
    if (looseMatch) {
      // Clean up common OCR artifacts in email
      info.email = looseMatch[0].replace(/[•*']/g, "");
    }
  }

  // Phone
  const phoneMatch = text.match(PHONE_RE);
  if (phoneMatch) info.phone = phoneMatch[0].replace(/^P:\s*/i, "").trim();
  // Also try "P: 628..." pattern specifically
  const phoneAlt = text.match(/P:\s*(\+?\d[\d\s.\-]{7,})/i);
  if (phoneAlt && !info.phone) info.phone = phoneAlt[1].trim();

  // LinkedIn
  const linkedinMatch = text.match(LINKEDIN_RE);
  if (linkedinMatch) {
    const raw = linkedinMatch[0];
    info.linkedin = raw.startsWith("http") ? raw : "https://" + raw;
  }

  // Website: any URL that is not LinkedIn and not GitHub
  const urls = text.match(URL_RE) || [];
  const website = urls.find(
    (u) => !u.includes("linkedin.com") && !u.includes("github.com")
  );
  if (website) info.website = website;

  // If no separate website, use GitHub as website
  if (!info.website) {
    const githubMatch = text.match(GITHUB_RE);
    if (githubMatch) {
      const raw = githubMatch[0];
      info.website = raw.startsWith("http") ? raw : "https://" + raw;
    }
  }

  // Address: try to find "City, Country" pattern in header lines
  for (const line of headerLines) {
    const t = line.trim();
    const locMatch = t.match(LOCATION_RE);
    if (locMatch) {
      info.address = locMatch[0];
      break;
    }
  }

  // Name: first non-empty, non-contact line that looks like a name
  for (const line of headerLines) {
    const t = line.trim();
    if (!t) continue;
    // Skip lines that look like contact info
    if (EMAIL_RE.test(t) || EMAIL_LOOSE_RE.test(t)) continue;
    if (LINKEDIN_RE.test(t) || GITHUB_RE.test(t)) continue;
    if (/^https?:\/\//i.test(t)) continue;
    // Skip lines that are mostly special characters / phone numbers
    if (/^[\d\s\+\(\)\-\.P:]+$/.test(t)) continue;
    // Must look like a name: reasonable length, mostly letters
    if (t.length > 2 && t.length < 80) {
      // If the line contains pipe-separated contact info, extract just the name portion
      if (t.includes("|")) {
        const parts = t.split("|").map((p) => p.trim());
        // The name is likely the first part that doesn't contain @ or http or phone
        const namePart = parts.find(
          (p) =>
            p.length > 2 &&
            !EMAIL_RE.test(p) &&
            !EMAIL_LOOSE_RE.test(p) &&
            !PHONE_RE.test(p) &&
            !/https?:\/\//.test(p) &&
            !/^P:/i.test(p)
        );
        if (namePart) {
          info.name = namePart;
          break;
        }
      }
      // Check it's not a line full of contact info
      if (
        !EMAIL_RE.test(t) &&
        !PHONE_RE.test(t) &&
        !t.includes("linkedin.com") &&
        !t.includes("github.com")
      ) {
        info.name = t;
        break;
      }
    }
  }

  return info;
}

// ─── Experience parsing (handles floating dates) ───

interface RawBlock {
  lines: string[];
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

/**
 * Group lines into content blocks separated by blank lines,
 * with date information already attached via attachFloatingDates.
 */
function groupIntoBlocks(lines: string[]): RawBlock[] {
  const processed = attachFloatingDates(lines);
  const blocks: RawBlock[] = [];
  let currentLines: string[] = [];
  let currentDates = { startDate: "", endDate: "", isCurrent: false };

  function flushBlock() {
    const nonEmpty = currentLines.filter((l) => l.trim().length > 0);
    if (nonEmpty.length > 0) {
      blocks.push({
        lines: nonEmpty,
        ...currentDates,
      });
    }
    currentLines = [];
    currentDates = { startDate: "", endDate: "", isCurrent: false };
  }

  for (const line of processed) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBlock();
      continue;
    }

    // Check if this line is purely a date (might still exist if no preceding content)
    if (isDateOnlyLine(trimmed)) {
      const d = parseDateString(trimmed);
      if (!currentDates.startDate) {
        currentDates = d;
      }
      continue;
    }

    // Check for inline dates (e.g., "HUAWEI CLOUD TRAINING\tAug 2020 - Dec 2020")
    const inline = extractInlineDates(trimmed);
    if (inline && inline.textWithoutDates.length > 2) {
      if (!currentDates.startDate) {
        currentDates.startDate = inline.startDate;
        currentDates.endDate = inline.endDate;
        currentDates.isCurrent = inline.isCurrent;
      }
      currentLines.push(inline.textWithoutDates);
      continue;
    }

    currentLines.push(trimmed);
  }
  flushBlock();

  return blocks;
}

/**
 * Heuristic: does this line look like a title/heading (company or position name)
 * rather than a bullet/description? Titles are typically shorter and don't start
 * with action verbs or descriptive words.
 */
function looksLikeTitle(line: string): boolean {
  const t = line.trim();
  // Very long lines are unlikely titles
  if (t.length > 80) return false;
  // Starts with action verbs -> description, not title
  if (/^(responsible|manage|develop|create|build|implement|maintain|lead|assist|organize|ensure|experienced|provide|collaborate|prepare|track|help|communicate|participated|contributed|spearheaded|oversaw|processed|worked|explained|remained|organized|as a |bertanggung|menyapa|menyajikan|menyiapkan|melakukan|menerima|mengkomunikasikan|mengelola|meneliti|menjangkau|menerapkan|berpartisipasi|pengawasan|mengkoordinasi|mewakili)/i.test(t)) return false;
  // Contains bullets
  if (BULLET_RE.test(t)) return false;
  // Short enough to be a title
  return t.length < 60;
}

function parseExperience(lines: string[]): WorkExperience[] {
  const blocks = groupIntoBlocks(lines);

  // Pre-process: merge single-line blocks that look like description/bullet
  // content into the preceding block that has a title.
  const mergedBlocks: RawBlock[] = [];
  for (const block of blocks) {
    const nonEmpty = block.lines.filter((l) => l.trim().length > 0);

    // If this block has only 1 line and it looks like a description (not a title),
    // append it to the previous block as a bullet.
    if (
      nonEmpty.length === 1 &&
      !looksLikeTitle(nonEmpty[0]) &&
      mergedBlocks.length > 0
    ) {
      const prev = mergedBlocks[mergedBlocks.length - 1];
      prev.lines.push(nonEmpty[0]);
      // If this block has dates and the previous doesn't, transfer them
      if (block.startDate && !prev.startDate) {
        prev.startDate = block.startDate;
        prev.endDate = block.endDate;
        prev.isCurrent = block.isCurrent;
      }
      continue;
    }

    mergedBlocks.push({ ...block, lines: [...block.lines] });
  }

  const entries: FlatJob[] = [];

  for (const block of mergedBlocks) {
    const entry: FlatJob = {
      id: genId(),
      company: "",
      position: "",
      startDate: block.startDate,
      endDate: block.endDate,
      isCurrent: block.isCurrent,
      description: "",
      bullets: [],
    };

    const contentLines = block.lines;
    let titleLinesDone = false;

    for (let i = 0; i < contentLines.length; i++) {
      const t = contentLines[i].trim();
      if (!t) continue;

      // Check for inline dates in content lines that weren't caught earlier
      const dateCheck = extractInlineDates(t);
      const cleanLine = dateCheck ? dateCheck.textWithoutDates : t;
      if (dateCheck && !entry.startDate) {
        entry.startDate = dateCheck.startDate;
        entry.endDate = dateCheck.endDate;
        entry.isCurrent = dateCheck.isCurrent;
      }

      if (!cleanLine || cleanLine.length < 2) continue;

      // Bullet points
      if (BULLET_RE.test(cleanLine)) {
        titleLinesDone = true;
        entry.bullets.push(cleanLine.replace(BULLET_RE, "").trim());
        continue;
      }

      // First non-bullet lines are company/position
      if (!titleLinesDone) {
        if (!entry.company && !entry.position) {
          if (
            /\b(inc|llc|ltd|corp|university|pt\b|cv\b|co\.|company|group|academy|institute)/i.test(
              cleanLine
            )
          ) {
            entry.company = cleanLine;
          } else {
            entry.company = cleanLine;
          }
        } else if (entry.company && !entry.position) {
          // If this looks like a description rather than a position, treat as bullet
          if (!looksLikeTitle(cleanLine)) {
            titleLinesDone = true;
            entry.bullets.push(cleanLine);
          } else {
            entry.position = cleanLine;
          }
        } else if (!entry.company && entry.position) {
          entry.company = cleanLine;
        } else {
          titleLinesDone = true;
          entry.bullets.push(cleanLine);
        }
      } else {
        entry.bullets.push(cleanLine);
      }
    }

    // If we only got one of company/position, try heuristic swap
    if (entry.position && !entry.company) {
      entry.company = entry.position;
      entry.position = "";
    }

    if (entry.company || entry.position || entry.bullets.length > 0) {
      entries.push(entry);
    }
  }

  return normalizeWorkExperience(entries);
}

// ─── Education parsing ───

function parseEducation(lines: string[]): Education[] {
  const blocks = groupIntoBlocks(lines);
  const entries: Education[] = [];

  for (const block of blocks) {
    const entry: Education = {
      id: genId(),
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: block.startDate,
      endDate: block.endDate,
      gpa: "",
    };

    for (const line of block.lines) {
      const t = line.trim();
      if (!t) continue;

      // Check for inline dates
      const dateCheck = extractInlineDates(t);
      const cleanLine = dateCheck ? dateCheck.textWithoutDates : t;
      if (dateCheck && !entry.startDate) {
        entry.startDate = dateCheck.startDate;
        entry.endDate = dateCheck.endDate;
      }

      if (!cleanLine || cleanLine.length < 2) continue;

      // GPA
      const gpaMatch = cleanLine.match(GPA_RE);
      if (gpaMatch) {
        entry.gpa = gpaMatch[1];
      }

      // Degree keywords
      if (DEGREE_KEYWORDS.test(cleanLine)) {
        // This line contains degree info
        const degreeLine = cleanLine
          .replace(GPA_RE, "")
          .replace(MONTH_YEAR_RE, "")
          .replace(/[,]\s*$/, "")
          .trim();
        if (degreeLine.length > 2) {
          entry.degree = degreeLine;
        }
      } else if (
        /universit|institut|college|school|akademi|politeknik|sekolah|academy/i.test(
          cleanLine
        )
      ) {
        entry.institution = cleanLine.replace(MONTH_YEAR_RE, "").trim();
      } else if (!entry.institution && cleanLine.length > 3) {
        // First unrecognized line -> institution name
        entry.institution = cleanLine.replace(MONTH_YEAR_RE, "").trim();
      } else if (!entry.degree && cleanLine.length > 3) {
        // Second unrecognized line -> treat as degree/description
        entry.degree = cleanLine.replace(MONTH_YEAR_RE, "").trim();
      }
    }

    if (entry.institution || entry.degree) {
      entries.push(entry);
    }
  }

  return entries;
}

// ─── Skills parsing (handles sentence-style skills) ───

function parseSkills(lines: string[]): Skill[] {
  const skills: Skill[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Check if the line is a sentence-like skill (>40 chars or contains common sentence patterns)
    const isSentence = t.length > 40 || /\b(able to|have experience|experienced in|proficient|familiar|knowledge of)\b/i.test(t);

    if (isSentence) {
      // Keep the whole line as a single skill
      // But if it starts with a bullet, clean it
      const cleaned = t.replace(BULLET_RE, "").trim();
      if (cleaned && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        skills.push({ id: genId(), name: cleaned, level: "" });
      }
    } else {
      // Split on commas, semicolons, pipes, bullets
      const items = t
        .split(/[,;|•\u2022\u2023\u25E6]+/)
        .map((s) => s.replace(BULLET_RE, "").trim())
        .filter((s) => s.length > 0);
      for (const item of items) {
        const lower = item.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          skills.push({ id: genId(), name: item, level: "" });
        }
      }
    }
  }

  return skills;
}

// ─── Certifications parsing ───

function parseCertifications(lines: string[]): Certification[] {
  const blocks = groupIntoBlocks(lines);
  const entries: Certification[] = [];

  for (const block of blocks) {
    const entry: Certification = {
      id: genId(),
      name: "",
      issuer: "",
      date: "",
      credentialId: "",
    };

    // Use block-level dates
    if (block.startDate) {
      entry.date = block.endDate
        ? `${block.startDate} - ${block.endDate}`
        : block.startDate;
    }

    for (const line of block.lines) {
      const t = line.trim();
      if (!t) continue;

      // Check for inline dates
      const dateCheck = extractInlineDates(t);
      const cleanLine = dateCheck ? dateCheck.textWithoutDates : t;
      if (dateCheck && !entry.date) {
        entry.date = dateCheck.endDate
          ? `${dateCheck.startDate} - ${dateCheck.endDate}`
          : dateCheck.startDate;
      }

      if (!cleanLine || cleanLine.length < 2) continue;

      // Credential ID
      const credMatch = cleanLine.match(CERT_ID_RE);
      if (credMatch) {
        entry.credentialId = credMatch[1];
        // The rest could be part of the name
        const rest = cleanLine.replace(CERT_ID_RE, "").trim();
        if (rest.length > 2 && !entry.name) entry.name = rest;
        continue;
      }

      // First substantial line is the name
      if (!entry.name) {
        entry.name = cleanLine;
      } else if (!entry.issuer && cleanLine.length > 2) {
        // Subsequent lines could be issuer or credential info
        if (/certificate|credential|cert\.?\s*no/i.test(cleanLine)) {
          const idMatch = cleanLine.match(/(?:no\.?|id|number)[:\s]*(\S+)/i);
          if (idMatch) entry.credentialId = idMatch[1];
        } else {
          entry.issuer = cleanLine;
        }
      }
    }

    if (entry.name) {
      entries.push(entry);
    }
  }

  return entries;
}

// ─── Languages parsing ───

function parseLanguages(lines: string[]): Language[] {
  const languages: Language[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // Handle "Languages: Indonesian, English" format
    const labelMatch = t.match(/^(?:languages?|bahasa)\s*:\s*(.+)/i);
    const content = labelMatch ? labelMatch[1] : t;

    // Split on commas, semicolons, pipes
    const items = content
      .split(/[,;|•\u2022]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const item of items) {
      // Could be "English (Fluent)" or "English - Intermediate" or just "English"
      const parts = item
        .split(/[\(\)\-–—:]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const lang = parts[0] || item;
      const proficiency = parts[1] || "";
      const key = lang.toLowerCase();
      if (!seen.has(key) && lang.length > 1) {
        seen.add(key);
        languages.push({ id: genId(), language: lang, proficiency });
      }
    }
  }

  return languages;
}

// ─── Projects parsing ───

function parseProjects(lines: string[]): Project[] {
  const blocks = groupIntoBlocks(lines);
  const entries: Project[] = [];

  for (const block of blocks) {
    const entry: Project = {
      id: genId(),
      name: "",
      description: "",
      url: "",
      startDate: "",
      endDate: "",
      technologies: [],
    };

    const descParts: string[] = [];

    for (const line of block.lines) {
      const t = line.trim();
      if (!t) continue;

      // URL detection
      const urlMatch = t.match(URL_RE);
      if (urlMatch && !entry.url) {
        entry.url = urlMatch[0];
      }

      const cleanLine = t.replace(URL_RE, "").trim();
      if (!cleanLine) continue;

      if (!entry.name) {
        entry.name = cleanLine;
      } else {
        // Look for technology indicators
        if (/^(?:tech(?:nologies|nology)?|stack|tools?|built with)\s*:/i.test(cleanLine)) {
          const techStr = cleanLine.replace(/^(?:tech(?:nologies|nology)?|stack|tools?|built with)\s*:\s*/i, "");
          entry.technologies = techStr
            .split(/[,;|]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          descParts.push(cleanLine.replace(BULLET_RE, "").trim());
        }
      }
    }

    entry.description = descParts.join("\n");

    if (entry.name) {
      entries.push(entry);
    }
  }

  return entries;
}

// ─── Awards parsing ───

function parseAwards(lines: string[]): Award[] {
  const blocks = groupIntoBlocks(lines);
  const entries: Award[] = [];

  for (const block of blocks) {
    const entry: Award = {
      id: genId(),
      title: "",
      issuer: "",
      date: "",
      description: "",
    };

    if (block.startDate) {
      entry.date = block.endDate
        ? `${block.startDate} - ${block.endDate}`
        : block.startDate;
    }

    const descParts: string[] = [];

    for (const line of block.lines) {
      const t = line.trim();
      if (!t) continue;

      const dateCheck = extractInlineDates(t);
      const cleanLine = dateCheck ? dateCheck.textWithoutDates : t;
      if (dateCheck && !entry.date) {
        entry.date = dateCheck.endDate
          ? `${dateCheck.startDate} - ${dateCheck.endDate}`
          : dateCheck.startDate;
      }

      if (!cleanLine || cleanLine.length < 2) continue;

      if (!entry.title) {
        entry.title = cleanLine;
      } else {
        descParts.push(cleanLine);
      }
    }

    entry.description = descParts.join("\n");

    if (entry.title) {
      entries.push(entry);
    }
  }

  return entries;
}

// ─── "Additional" section parser ───
// Extracts languages, skills, and other data from catch-all "ADDITIONAL" sections.

interface AdditionalData {
  languages: Language[];
  skills: Skill[];
  miscLines: string[];
}

function parseAdditionalSection(lines: string[]): AdditionalData {
  const data: AdditionalData = { languages: [], skills: [], miscLines: [] };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // "Languages: Indonesian, English"
    const langMatch = t.match(/^(?:languages?|bahasa)\s*:\s*(.+)/i);
    if (langMatch) {
      const items = langMatch[1]
        .split(/[,;|]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const item of items) {
        const parts = item
          .split(/[\(\)\-–—:]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        data.languages.push({
          id: genId(),
          language: parts[0] || item,
          proficiency: parts[1] || "",
        });
      }
      continue;
    }

    // "Technical: Python, Docker, ..."
    const techMatch = t.match(/^(?:technical|tech|tools?|software)\s*:\s*(.+)/i);
    if (techMatch) {
      const items = techMatch[1]
        .split(/[,;|]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const item of items) {
        data.skills.push({ id: genId(), name: item, level: "" });
      }
      continue;
    }

    // "Other: ..." -> misc
    const otherMatch = t.match(/^(?:other|lain(?:nya)?|interests?|hobi|hobbies)\s*:\s*(.+)/i);
    if (otherMatch) {
      data.miscLines.push(otherMatch[1]);
      continue;
    }

    // Anything else -> misc
    data.miscLines.push(t);
  }

  return data;
}

// ─── Main entry point ───

export function parseResumeText(rawText: string): Partial<ResumeData> {
  const lines = rawText.split("\n");

  // First pass: split into sections (with merged-header handling)
  const sectionBlocks = splitIntoSections(lines);
  const sections = mergeSectionBlocks(sectionBlocks);

  // Second pass: attach floating dates within each section
  for (const key of Object.keys(sections)) {
    if (key === "__header__") continue;
    sections[key] = attachFloatingDates(sections[key]);
  }

  // Extract contact info from header
  const contactInfo = extractContactInfo(sections["__header__"] || []);
  const personalInfo: PersonalInfo = {
    name: contactInfo.name || "",
    email: contactInfo.email || "",
    phone: contactInfo.phone || "",
    address: contactInfo.address || "",
    linkedin: contactInfo.linkedin || "",
    website: contactInfo.website || "",
    photoUrl: "",
  };

  // Summary
  const summary = (sections["summary"] || [])
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim() || null;

  // Work experience
  const workExperience = parseExperience(sections["workExperience"] || []);

  // Education
  const education = parseEducation(sections["education"] || []);

  // Skills
  const skills = parseSkills(sections["skills"] || []);

  // Certifications
  const certifications = parseCertifications(sections["certifications"] || []);

  // Languages
  let languages = parseLanguages(sections["languages"] || []);

  // Projects
  const projects = parseProjects(sections["projects"] || []);

  // Awards
  const awards = parseAwards(sections["awards"] || []);

  // Handle "ADDITIONAL" section: extract languages, skills, misc
  if (sections["__additional__"]) {
    const additionalData = parseAdditionalSection(sections["__additional__"]);

    // Merge languages from additional section (avoid duplicates)
    if (additionalData.languages.length > 0) {
      const existingLangs = new Set(languages.map((l) => l.language.toLowerCase()));
      for (const lang of additionalData.languages) {
        if (!existingLangs.has(lang.language.toLowerCase())) {
          languages.push(lang);
          existingLangs.add(lang.language.toLowerCase());
        }
      }
    }

    // Merge skills from additional section
    if (additionalData.skills.length > 0) {
      const existingSkills = new Set(skills.map((s) => s.name.toLowerCase()));
      for (const skill of additionalData.skills) {
        if (!existingSkills.has(skill.name.toLowerCase())) {
          skills.push(skill);
          existingSkills.add(skill.name.toLowerCase());
        }
      }
    }
  }

  return {
    personalInfo,
    summary,
    workExperience,
    education,
    skills,
    certifications,
    languages,
    projects,
    awards,
    sectionOrder: DEFAULT_SECTION_ORDER as SectionId[],
    hiddenSections: [],
  };
}
