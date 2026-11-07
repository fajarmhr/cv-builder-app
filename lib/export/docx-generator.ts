import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopType,
  TabStopPosition,
  Packer,
  BorderStyle,
  LevelFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TableLayoutType,
  LineRuleType,
  ImageRun,
  VerticalAlign,
  UnderlineType,
} from "docx";
import type { ResumeData, TemplateConfig, Project, SectionId } from "@/types/resume";
import { availabilityLabel, formatGpa } from "@/types/resume";
import { isCustomSectionId, getCustomSectionEntryId } from "@/types/resume";
import { getDocxStyles, type DocxStyleConfig } from "./docx-styles";
import { groupSkills, resumeWithClonedSection } from "@/components/templates/template-helpers";
import { loadExportFonts } from "./template-fonts";
import { loadExportPhoto } from "./profile-photo";

function formatDate(d: string): string {
  if (!d) return "";
  const [y, m] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1] || m} ${y}`;
}

/**
 * Parse description text into bullet lines.
 * Strips leading markers (•, -, *, ▸, ▪, –) and splits by newlines.
 * Mirrors parseBulletsFromDescription in template-helpers.tsx.
 */
function parseBulletsFromDescription(description: string): string[] {
  return description
    .split("\n")
    .map((l) => l.replace(/^[\u2022\u25B8\u25AA\u2013\-\*•]\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Resolve bullet lines: prefer bullets array, fallback to parsing description.
 * Returns { lines, isSingleParagraph } so callers know how to render.
 */
function resolveBulletLines(
  bullets: string[] | undefined,
  description: string | undefined
): { lines: string[]; isSingleParagraph: boolean } {
  const filtered = bullets?.filter(Boolean) || [];
  if (filtered.length > 0) {
    return { lines: filtered, isSingleParagraph: false };
  }

  if (description?.trim()) {
    const hasBulletMarkers = /^[\u2022\u25B8\u25AA\u2013\-\*•]/m.test(description);
    const hasMultipleLines = description.includes("\n");

    if (hasBulletMarkers || hasMultipleLines) {
      return { lines: parseBulletsFromDescription(description), isSingleParagraph: false };
    }

    // Single-line description — treat as plain paragraph
    return { lines: [description], isSingleParagraph: true };
  }

  return { lines: [], isSingleParagraph: false };
}

/** Get bullet marker character matching the template config bulletStyle */
function getBulletChar(style?: DocxStyleConfig["bulletStyle"]): string {
  switch (style) {
    case "dash":   return "\u2013";   // –
    case "arrow":  return "\u25B8";   // ▸
    case "square": return "\u25AA";   // ▪
    case "disc":
    default:       return "\u2022";   // •
  }
}

/** DOCX numbering reference name */
const BULLET_REF = "resume-bullets";

/** Build the numbering config for the Document based on bulletStyle */
function buildNumberingConfig(variants: DocxStyleConfig[]) {
  const stylesBySize = new Map(variants.map((styles) => [styles.normalSize, styles]));
  return {
    config: [...stylesBySize.values()].map((styles) => ({
        reference: `${BULLET_REF}-${styles.normalSize}`,
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: getBulletChar(styles.bulletStyle),
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 180, hanging: 180 },
              },
              run: {
                font: styles.fontFamily,
                size: styles.normalSize,
              },
            },
          },
        ],
    })),
  };
}

/**
 * Create a bullet-point Paragraph for DOCX export.
 * Uses native DOCX numbering/bullet feature for proper indentation and wrapping.
 */
function bulletParagraph(text: string, styles: DocxStyleConfig): Paragraph {
  // When bulletStyle is "none", render plain text without bullet
  if (styles.bulletStyle === "none") {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          size: styles.normalSize,
          font: styles.fontFamily,
        }),
      ],
      spacing: { after: 20, line: styles.spacing.line, lineRule: LineRuleType.EXACT },
    });
  }

  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: styles.normalSize,
        font: styles.fontFamily,
      }),
    ],
    numbering: {
      reference: `${BULLET_REF}-${styles.normalSize}`,
      level: 0,
    },
    spacing: { after: 20, line: styles.spacing.line, lineRule: LineRuleType.EXACT },
  });
}

/** Content width of an A4 page inside the 1" margins, in twips. */
const CONTENT_WIDTH = 11906 - 1440 * 2;
const HAIRLINE = "d5d9df";

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
} as const;

function spacer(after: number): Paragraph {
  return new Paragraph({ spacing: { line: 1, lineRule: LineRuleType.EXACT, after } });
}

const SECTION_LABELS: Record<string, string> = {
  workExperience: "Work Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  projects: "Projects",
  awards: "Awards",
  references: "References",
};

/** Classic keeps the summary as an unlabelled lead paragraph. */
const SUMMARY_LABEL: Record<DocxStyleConfig["variant"], string | null> = {
  classic: null,
  accent: "Professional Summary",
  bold: "Professional Summary",
  timeline: "Summary",
  executive: "Professional Summary",
  editorial: "Summary",
};

function sectionHeading(title: string, styles: DocxStyleConfig): Paragraph {
  return new Paragraph({
    children: [
      ...(styles.variant === "timeline" ? [new TextRun({
        text: "━ ", color: styles.accentColor, size: styles.heading2Size, font: styles.fontFamily,
      })] : []),
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: styles.heading2Size,
        font: styles.headerBoldFontFamily,
        characterSpacing: styles.variant === "classic" ? 5 : styles.variant === "executive" ? 25 : styles.variant === "timeline" ? 21 : 9,
        color: styles.headingUsesAccent ? styles.accentColor : styles.headingTextColor,
        ...(styles.variant === "bold" ? { underline: { type: UnderlineType.THICK, color: styles.accentColor } } : {}),
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    // Headings keep their own leading, as they do on screen.
    spacing: { before: 240, after: 120, line: Math.round(styles.heading2Size * 14) + (styles.variant === "accent" ? 120 : 0), lineRule: LineRuleType.EXACT },
    keepNext: true,
    ...(styles.headingShading ? { shading: { fill: styles.headingShading } } : {}),
    border: {
      ...(styles.sectionRuleSize > 0 && styles.variant !== "bold"
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              size: styles.sectionRuleSize,
              color: styles.sectionRuleColor,
            },
          }
        : {}),
      // Accent bands its heading; Timeline marks it with a short accent bar.
      ...(styles.variant === "accent"
        ? { left: { style: BorderStyle.SINGLE, size: 18, color: styles.accentColor, space: 6 } }
        : {}),
    },
  });
}

/** A borderless two-column row: a narrow left gutter beside the content. */
function railTable(gutter: Paragraph[], body: Paragraph[], hairline: boolean, labelWidth = 1290): Table {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    columnWidths: [labelWidth, CONTENT_WIDTH - labelWidth],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: labelWidth, type: WidthType.DXA },
            borders: NO_BORDERS,
            margins: { top: 0, bottom: 0, left: 0, right: 120 },
            children: gutter.length ? gutter : [new Paragraph({ text: "" })],
          }),
          new TableCell({
            width: { size: CONTENT_WIDTH - labelWidth, type: WidthType.DXA },
            borders: hairline
              ? { ...NO_BORDERS, left: { style: BorderStyle.SINGLE, size: 4, color: HAIRLINE } }
              : NO_BORDERS,
            margins: { top: 0, bottom: 0, left: hairline ? 140 : 0, right: 0 },
            children: body.length ? body : [new Paragraph({ text: "" })],
          }),
        ],
      }),
    ],
  });
}

/** The date text that sits in the Timeline variant's left column. */
function railDate(text: string, styles: DocxStyleConfig): Paragraph[] {
  if (!text) return [];
  return [
    new Paragraph({
      children: [
        new TextRun({
          text,
          size: styles.subSize,
          font: styles.fontFamily,
          color: "555555",
        }),
      ],
      spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 0 },
    }),
  ];
}

/** Places a section: a heading above the body, or a label in a left gutter. */
function wrapSection(
  label: string | null,
  body: (Paragraph | Table)[],
  styles: DocxStyleConfig
): (Paragraph | Table)[] {
  if (!body.length) return [];
  if (label === null) return body;

  if (styles.variant === "editorial") {
    // A gutter table can only hold paragraphs, so a body that already
    // contains a table falls back to a plain heading.
    const paragraphs = body.filter((b): b is Paragraph => b instanceof Paragraph);
    if (paragraphs.length === body.length) {
      return [
        railTable(
          [
            new Paragraph({
              children: [
                new TextRun({
                  text: label.toUpperCase(),
                  bold: true,
                  size: Math.round(styles.normalSize * 0.75),
                  font: styles.boldFontFamily,
                  characterSpacing: 18,
                  color: styles.accentColor,
                }),
              ],
              // The gutter label is a heading; it keeps its own leading.
              spacing: { after: 0 },
            }),
          ],
          paragraphs,
          true,
          1440
        ),
        spacer(180),
      ];
    }
  }

  return [sectionHeading(label, styles), ...body];
}

type HeaderPart = "name" | "title" | "contact";

function renderPersonalInfo(resume: ResumeData, styles: DocxStyleConfig, photo?: Buffer): (Paragraph | Table)[] {
  const info = resume.personalInfo;
  if (!info) return [];

  const contactParts = [
    info.address,
    info.email,
    info.phone,
    info.linkedin,
    info.website,
    availabilityLabel(info),
  ].filter(Boolean);

  // Classic keeps its historical name / contact / role order; the newer
  // templates put the role directly under the name, as the preview does.
  const order: HeaderPart[] =
    styles.variant === "classic" ? ["name", "contact", "title"] : ["name", "title", "contact"];
  const present = order.filter((k) =>
    k === "name" ? !!info.name : k === "title" ? !!info.title : contactParts.length > 0
  );

  // Bold leaves the contact line below the rule; the rest close the block with it.
  const ruleAfter: HeaderPart | null =
    styles.headerRuleSize === 0
      ? null
      : styles.variant === "bold"
      ? present.filter((k) => k !== "contact").pop() ?? null
      : present[present.length - 1] ?? null;

  const rule = (k: HeaderPart) =>
    k === ruleAfter && !photo
      ? {
          border: {
            bottom: {
              style: styles.variant === "executive" ? BorderStyle.DOUBLE : BorderStyle.SINGLE,
              size: styles.headerRuleSize,
              color: styles.headerRuleColor,
            },
          },
        }
      : {};

  const paragraphs = present.map((k) => {
    if (k === "name") {
      return new Paragraph({
        children: [
          new TextRun({
            text: info.name,
            bold: true,
            size: styles.titleSize,
            font: styles.headerBoldFontFamily,
            color: styles.headingTextColor,
            allCaps: styles.variant === "classic" || styles.variant === "bold",
          }),
        ],
        alignment: styles.headerAlign,
        // The name keeps its own leading, as it does on screen.
        spacing: { line: Math.round(styles.titleSize * 12), lineRule: LineRuleType.EXACT, after: 0 },
        ...rule(k),
      });
    }
    if (k === "title") {
      return new Paragraph({
        children: [
          new TextRun({
            text: info.title,
            bold: styles.variant !== "executive" && styles.variant !== "editorial",
            size: styles.variant === "bold" ? styles.subSize : styles.normalSize,
            font: styles.variant === "executive" ? styles.headerFontFamily
              : styles.variant === "editorial" ? styles.fontFamily : styles.boldFontFamily,
            color:
              styles.variant === "accent"
                ? styles.accentColor
                : styles.variant === "classic"
                ? undefined
                : "555555",
            allCaps: styles.variant === "bold",
          }),
        ],
        alignment: styles.headerAlign,
        spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 120 },
        ...rule(k),
      });
    }
    return new Paragraph({
      children: [
        new TextRun({
          text: contactParts.join("  ·  "),
          size: styles.subSize,
          font: styles.fontFamily,
          color: "555555",
        }),
      ],
      alignment: styles.headerAlign,
      spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 120 },
      ...rule(k),
    });
  });
  if (!photo) return paragraphs;

  const photoSize = styles.variant === "classic" ? 56 : 52;
  const photoWidth = photoSize * 15 + 180;
  const body = styles.variant === "bold" ? paragraphs.filter((_, i) => present[i] !== "contact") : paragraphs;
  const header = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [photoWidth, CONTENT_WIDTH - photoWidth],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: photoWidth, type: WidthType.DXA },
        margins: { top: 0, bottom: 0, left: 0, right: 180 },
        borders: NO_BORDERS,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          spacing: { line: photoSize * 15, lineRule: LineRuleType.AT_LEAST, after: 0 },
          children: [new ImageRun({
          type: "png", data: photo,
          transformation: { width: photoSize, height: photoSize },
          altText: { name: info.name || "Profile photo", description: "Profile photo", title: "Profile photo" },
          })],
        })],
      }),
      new TableCell({
        width: { size: CONTENT_WIDTH - photoWidth, type: WidthType.DXA },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: NO_BORDERS, verticalAlign: VerticalAlign.CENTER, children: body.length ? body : [new Paragraph({})],
      }),
    ] })],
  });
  const ruleParagraph = styles.headerRuleSize ? [new Paragraph({
    spacing: { line: 1, lineRule: LineRuleType.EXACT, after: 0 },
    border: { bottom: { style: styles.variant === "executive" ? BorderStyle.DOUBLE : BorderStyle.SINGLE, size: styles.headerRuleSize, color: styles.headerRuleColor } },
  })] : [];
  return [header, ...ruleParagraph, ...(styles.variant === "bold" ? paragraphs.filter((_, i) => present[i] === "contact") : []), spacer(180)];
}

function renderSummary(summary: string | null, styles: DocxStyleConfig, isSummary = true): Paragraph[] {
  if (!summary) return [];
  // Lead paragraph (no heading) to match the on-screen templates.
  const lines = summary.split("\n");
  return [
    new Paragraph({
      children: lines.map(
        (line, i) =>
          new TextRun({
            text: line,
            size: styles.normalSize,
            font: styles.fontFamily,
            break: i > 0 ? 1 : undefined,
          })
      ),
      spacing: { after: 0, line: styles.spacing.line, lineRule: LineRuleType.EXACT },
      ...(isSummary && styles.variant === "classic"
        ? { alignment: AlignmentType.JUSTIFIED }
        : {}),
    }),
  ];
}

/** Bullets (or a single plain paragraph) for one position / project. */
function bulletBlock(
  bullets: string[] | undefined,
  description: string | undefined,
  styles: DocxStyleConfig,
  spacingAfter = 60
): Paragraph[] {
  const { lines, isSingleParagraph } = resolveBulletLines(bullets, description);
  if (isSingleParagraph && lines.length === 1) {
    return [
      new Paragraph({
        children: [
          new TextRun({ text: lines[0], size: styles.normalSize, font: styles.fontFamily }),
        ],
        spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: spacingAfter },
      }),
    ];
  }
  return lines.map((line) => bulletParagraph(line, styles));
}

/** Classic keeps its em dash; the newer templates use an en dash. */
function range(
  styles: DocxStyleConfig,
  start?: string,
  end?: string,
  isCurrent?: boolean
): string {
  const s = start ? formatDate(start) : "";
  const e = isCurrent ? "Present" : end ? formatDate(end) : "";
  const sep = styles.variant === "classic" ? " — " : " – ";
  return s && e ? s + sep + e : s || e;
}

function renderWorkExperience(
  resume: ResumeData,
  styles: DocxStyleConfig
): (Paragraph | Table)[] {
  if (!resume.workExperience.length) return [];
  const out: (Paragraph | Table)[] = [];

  for (const exp of resume.workExperience) {
    // Timeline — one gutter row per position, date on the left.
    if (styles.variant === "timeline") {
      for (const pos of exp.positions) {
        out.push(
          railTable(
            railDate(range(styles, pos.startDate, pos.endDate, pos.isCurrent), styles),
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: pos.title || "",
                    bold: true,
                    size: styles.normalSize,
                    font: styles.boldFontFamily,
                  }),
                ],
                spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 0 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: exp.company || "",
                    size: styles.subSize,
                    font: styles.fontFamily,
                    color: "555555",
                  }),
                ],
                spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 40 },
              }),
              ...bulletBlock(pos.bullets, pos.description, styles, 20),
            ],
            true
          )
        );
        out.push(spacer(40));
      }
      continue;
    }

    // Editorial leads with the role; the rest lead with the company.
    if (styles.variant !== "editorial") {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.company || "",
              bold: true,
              size: styles.heading3Size,
              font: styles.boldFontFamily,
              allCaps: styles.variant === "classic",
            }),
          ],
          spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 0 },
        })
      );
    }

    for (const pos of exp.positions) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: pos.title || "",
              bold: true,
              size: styles.normalSize,
              font: styles.boldFontFamily,
            }),
            new TextRun({
              text: "\t" + range(styles, pos.startDate, pos.endDate, pos.isCurrent),
              size: styles.subSize,
              font: styles.fontFamily,
              color: "555555",
            }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, before: 30, after: 0 },
        })
      );

      if (styles.variant === "editorial") {
        out.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.company || "",
                size: styles.subSize,
                font: styles.fontFamily,
                color: "555555",
              }),
            ],
            spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 40 },
          })
        );
      }

      out.push(...bulletBlock(pos.bullets, pos.description, styles));
    }
  }

  return out;
}

function renderEducation(resume: ResumeData, styles: DocxStyleConfig): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const edu of resume.education) {
    const when = range(styles, edu.startDate, edu.endDate);
    const degree = `${edu.degree}${edu.fieldOfStudy ? `${styles.variant === "classic" ? ", " : " in "}${edu.fieldOfStudy}` : ""}`;
    const gpa = edu.gpa ? [new Paragraph({
      children: [new TextRun({
        text: `GPA: ${formatGpa(edu)}`,
        size: styles.variant === "classic" ? styles.normalSize : styles.subSize,
        font: styles.fontFamily,
        color: styles.variant === "classic" ? "000000" : "555555",
      })],
      spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 0 },
    })] : [];
    const lead = styles.variant === "timeline" || styles.variant === "editorial" ? degree : edu.institution;
    const follow = styles.variant === "timeline" || styles.variant === "editorial" ? edu.institution : degree;
    const body = [
      new Paragraph({
        children: [
          new TextRun({
            text: lead || "",
            bold: true,
            allCaps: styles.variant === "classic",
            size: styles.normalSize,
            font: styles.boldFontFamily,
          }),
          ...(styles.variant === "timeline" ? [] : [new TextRun({
            text: "\t" + when, size: styles.subSize, font: styles.fontFamily, color: "555555",
          })]),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 0 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: follow || "",
          size: styles.variant === "timeline" ? styles.subSize : styles.normalSize,
          font: styles.fontFamily,
          color: styles.variant === "timeline" || styles.variant === "editorial" ? "555555" : "000000",
        })],
        spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 0 },
      }),
      ...gpa,
    ];
    if (styles.variant === "timeline") out.push(railTable(railDate(when, styles), body, true));
    else out.push(...body);
    out.push(spacer(styles.variant === "classic" ? 120 : 150));
  }
  return out;
}

function renderSkills(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.skills.length) return [];
  const paragraphs: Paragraph[] = [];
  const fmt = (s: { name: string; level?: string; levelEnabled?: boolean }) =>
    s.level && s.levelEnabled !== false ? `${s.name} (${s.level})` : s.name;

  const groups = groupSkills(resume.skills);
  const grouped = groups.length > 1 || (groups.length === 1 && !!groups[0].category);

  if (grouped) {
    for (const g of groups) {
      const children: TextRun[] = [];
      if (g.category) {
        children.push(
          new TextRun({
            text: `${g.category}: `,
            bold: true,
            size: styles.normalSize,
            font: styles.boldFontFamily,
          })
        );
      }
      children.push(
        new TextRun({
          text: g.items.map(fmt).join(", "),
          size: styles.normalSize,
          font: styles.fontFamily,
        })
      );
      paragraphs.push(new Paragraph({ children, spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 40 } }));
    }
  } else {
    for (const s of resume.skills) {
      paragraphs.push(bulletParagraph(fmt(s), styles));
    }
  }
  return paragraphs;
}

function renderCertifications(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.certifications.length) return [];
  const paragraphs: Paragraph[] = [];
  for (const c of resume.certifications) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: c.name, bold: true, size: styles.normalSize, font: styles.boldFontFamily }),
          ...(c.issuer ? [new TextRun({ text: ` — ${c.issuer}`, size: styles.normalSize, font: styles.fontFamily, color: "555555" })] : []),
          ...(c.date ? [new TextRun({ text: ` (${formatDate(c.date)})`, size: styles.normalSize, font: styles.fontFamily, color: "000000" })] : []),
        ],
        spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: c.credentialId ? 20 : 40 },
      })
    );
    if (c.credentialId) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Credential ID: ${c.credentialId}`, size: styles.subSize, font: styles.fontFamily, color: "555555" }),
          ],
          spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 40 },
        })
      );
    }
  }
  return paragraphs;
}

function renderLanguages(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.languages.length) return [];
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: resume.languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(", "),
          size: styles.normalSize,
          font: styles.fontFamily,
        }),
      ],
      spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: styles.spacing.after },
    }),
  ];
}

function renderProjects(projects: Project[], styles: DocxStyleConfig): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];

  for (const p of projects) {
    const when = range(styles, p.startDate, p.endDate, p.isCurrent);
    const body: Paragraph[] = [
      ...(p.description ? bulletBlock(undefined, p.description, styles, 20) : []),
      ...(p.technologies?.length
        ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Tech: ${p.technologies.join(", ")}`,
                  size: styles.subSize,
                  font: styles.fontFamily,
                  color: "555555",
                }),
              ],
              spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 40 },
            }),
          ]
        : []),
    ];

    if (styles.variant === "timeline") {
      out.push(
        railTable(
          railDate(when, styles),
          [
            new Paragraph({
              children: [
                new TextRun({
                  text: p.name,
                  bold: true,
                  size: styles.normalSize,
                  font: styles.boldFontFamily,
                }),
              ],
              spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 20 },
            }),
            ...body,
          ],
          true
        )
      );
      out.push(spacer(40));
      continue;
    }

    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: p.name, bold: true, size: styles.normalSize, font: styles.boldFontFamily }),
          ...(when
            ? [
                new TextRun({
                  text: "\t" + when,
                  size: styles.subSize,
                  font: styles.fontFamily,
                  color: "555555",
                }),
              ]
            : []),
        ],
        ...(when ? { tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] } : {}),
        spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 0 },
      })
    );
    out.push(...body);
  }
  return out;
}

function renderAwards(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  return resume.awards.map((award) => new Paragraph({
    children: [
      new TextRun({ text: award.title, bold: true, size: styles.normalSize, font: styles.boldFontFamily }),
      new TextRun({
        text: `${award.issuer ? ` — ${award.issuer}` : ""}${award.date ? ` (${formatDate(award.date)})` : ""}`,
        size: styles.normalSize, font: styles.fontFamily,
      }),
    ],
    spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 60 },
  }));
}

function renderReferences(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  return resume.references.map((reference) => new Paragraph({
    children: [
      new TextRun({ text: reference.name, bold: true, size: styles.normalSize, font: styles.boldFontFamily }),
      new TextRun({
        text: `${reference.position ? `, ${reference.position}` : ""}${reference.company ? ` at ${reference.company}` : ""}${reference.email ? ` — ${reference.email}` : ""}${reference.phone ? ` | ${reference.phone}` : ""}`,
        size: styles.normalSize, font: styles.fontFamily,
      }),
    ],
    spacing: { line: styles.spacing.line, lineRule: LineRuleType.EXACT, after: 60 },
  }));
}

function renderCustomSections(
  resume: ResumeData,
  styles: DocxStyleConfig
): (Paragraph | Table)[] {
  // Only render plain custom sections (exclude cloned sections which have basedOn set)
  const plainSections = resume.customSections.filter((s) => !s.basedOn);
  if (!plainSections.length) return [];
  const out: (Paragraph | Table)[] = [];
  for (const s of plainSections) {
    out.push(
      ...wrapSection(s.title, renderSummary(s.content, styles, false), styles)
    );
  }
  return out;
}


const SECTION_RENDERERS: Record<
  string,
  (resume: ResumeData, styles: DocxStyleConfig) => (Paragraph | Table)[]
> = {
  personalInfo: renderPersonalInfo,
  summary: (r, s) => renderSummary(r.summary, s),
  workExperience: renderWorkExperience,
  education: renderEducation,
  skills: renderSkills,
  certifications: renderCertifications,
  languages: renderLanguages,
  projects: (resume, styles) => renderProjects(resume.projects, styles),
  awards: renderAwards,
  references: renderReferences,
  customSections: renderCustomSections,
};

export async function generateDocx(
  resume: ResumeData,
  templateId: string,
  config: TemplateConfig
): Promise<Buffer> {
  const [exportFonts, photo] = await Promise.all([
    loadExportFonts(config),
    loadExportPhoto(resume.personalInfo?.photoUrl),
  ]);
  const styles = getDocxStyles(config, templateId);
  const hiddenSections = new Set<string>(resume.hiddenSections || []);
  const sectionOrder = resume.sectionOrder || [];

  // Per-section font-size / line-spacing overrides: a section value replaces
  // the global one for that section, mirroring <SectionFrame> in the preview.
  const styleCache = new Map<string, DocxStyleConfig>();
  const stylesFor = (sectionId: string): DocxStyleConfig => {
    const o = config.sectionStyles?.[sectionId as SectionId];
    if (!o || (!o.fontSize && !o.lineSpacing)) return styles;
    const fontSize = o.fontSize ?? config.fontSize;
    const lineSpacing = o.lineSpacing ?? config.lineSpacing;
    const key = `${fontSize}|${lineSpacing}`;
    let cached = styleCache.get(key);
    if (!cached) {
      cached = getDocxStyles({ ...config, fontSize, lineSpacing }, templateId);
      styleCache.set(key, cached);
    }
    return cached;
  };

  const children: (Paragraph | Table)[] = [];

  for (const sectionId of sectionOrder) {
    if (hiddenSections.has(sectionId)) continue;

    // Handle standalone custom section cards ("custom:<id>")
    if (isCustomSectionId(sectionId)) {
      const entryId = getCustomSectionEntryId(sectionId);
      const cs = resume.customSections.find((s) => s.id === entryId);
      if (cs) {
        const label = cs.title || "Untitled";
        // Cloned section with structured items
        if (cs.basedOn && cs.items?.length) {
          const cloneStyles = stylesFor(cs.basedOn);
          const body = SECTION_RENDERERS[cs.basedOn]?.(resumeWithClonedSection(resume, cs), cloneStyles) || [];
          children.push(...wrapSection(label, body, cloneStyles));
        } else if (cs.content) {
          children.push(
            ...wrapSection(
              label,
              renderSummary(cs.content, stylesFor("customSections"), false),
              styles
            )
          );
        }
      }
      continue;
    }

    const renderer = SECTION_RENDERERS[sectionId];
    if (!renderer) continue;

    const sectionStyles = stylesFor(sectionId);
    const body = sectionId === "personalInfo"
      ? renderPersonalInfo(resume, sectionStyles, photo)
      : renderer(resume, sectionStyles);
    if (!body.length) continue;

    // personalInfo is the header and customSections labels its own entries;
    // everything else gets a heading (or gutter label) from wrapSection.
    const label = sectionId === "personalInfo" || sectionId === "customSections"
      ? null
      : config.sectionTitles?.[sectionId as SectionId] || (sectionId === "summary"
        ? SUMMARY_LABEL[sectionStyles.variant]
        : SECTION_LABELS[sectionId] || sectionId);

    children.push(...wrapSection(label, body, sectionStyles));
  }

  const doc = new Document({
    // Font names also become package part names. OPC part names cannot contain spaces.
    fonts: exportFonts.map((font) => ({ ...font, name: font.name.replace(/\s/g, "") })),
    styles: {
      default: {
        document: {
          run: { font: styles.fontFamily, size: styles.normalSize },
          paragraph: { spacing: { after: 0, line: styles.spacing.line, lineRule: LineRuleType.EXACT } },
        },
      },
    },
    numbering: buildNumberingConfig([styles, ...styleCache.values()]),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: styles.margins.top,
              right: styles.margins.right,
              bottom: styles.margins.bottom,
              left: styles.margins.left,
            },
            size: {
              width: 11906,  // A4 width in twips
              height: 16838, // A4 height in twips
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export function docxFilename(resume: ResumeData): string {
  const safe = (resume.personalInfo?.name || resume.title || "Resume")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `CV_${safe || "Resume"}.docx`;
}
