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
} from "docx";
import type { ResumeData, TemplateConfig, CustomSection, Education, Skill, Certification, Language, Project, Award, Reference, SectionId } from "@/types/resume";
import { normalizeWorkExperience, availabilityLabel, formatGpa } from "@/types/resume";
import { isCustomSectionId, getCustomSectionEntryId } from "@/types/resume";
import { getDocxStyles, type DocxStyleConfig } from "./docx-styles";
import { groupSkills } from "@/components/templates/template-helpers";

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
function buildNumberingConfig(styles: DocxStyleConfig) {
  const char = getBulletChar(styles.bulletStyle);
  return {
    config: [
      {
        reference: BULLET_REF,
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: char,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 360, hanging: 360 },
              },
              run: {
                font: styles.fontFamily,
                size: styles.normalSize,
              },
            },
          },
        ],
      },
    ],
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
      spacing: { after: 20, line: styles.spacing.line },
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
      reference: BULLET_REF,
      level: 0,
    },
    spacing: { after: 20, line: styles.spacing.line },
  });
}

/** Content width of an A4 page inside the 1" margins, in twips. */
const CONTENT_WIDTH = 11906 - 1440 * 2;
const RAIL_LABEL_WIDTH = 1500;
const HAIRLINE = "d5d9df";

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
} as const;

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
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: styles.heading2Size,
        font: styles.headerFontFamily,
        color: styles.headingUsesAccent ? styles.accentColor : styles.headingTextColor,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    ...(styles.headingShading ? { shading: { fill: styles.headingShading } } : {}),
    border: {
      ...(styles.sectionRuleSize > 0
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              size: styles.sectionRuleSize,
              color: styles.sectionRuleColor,
            },
          }
        : {}),
      // Accent bands its heading; Timeline marks it with a short accent bar.
      ...(styles.variant === "accent" || styles.variant === "timeline"
        ? { left: { style: BorderStyle.SINGLE, size: 18, color: styles.accentColor, space: 6 } }
        : {}),
    },
  });
}

/** A borderless two-column row: a narrow left gutter beside the content. */
function railTable(gutter: Paragraph[], body: Paragraph[], hairline: boolean): Table {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    columnWidths: [RAIL_LABEL_WIDTH, CONTENT_WIDTH - RAIL_LABEL_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: RAIL_LABEL_WIDTH, type: WidthType.DXA },
            borders: NO_BORDERS,
            margins: { top: 0, bottom: 0, left: 0, right: 120 },
            children: gutter.length ? gutter : [new Paragraph({ text: "" })],
          }),
          new TableCell({
            width: { size: CONTENT_WIDTH - RAIL_LABEL_WIDTH, type: WidthType.DXA },
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
          size: styles.normalSize - 2,
          font: styles.fontFamily,
          color: "666666",
        }),
      ],
      spacing: { after: 0 },
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
                  size: styles.normalSize - 4,
                  font: styles.headerFontFamily,
                  color: styles.accentColor,
                }),
              ],
              spacing: { after: 0 },
            }),
          ],
          paragraphs,
          true
        ),
        new Paragraph({ text: "", spacing: { after: 60 } }),
      ];
    }
  }

  return [sectionHeading(label, styles), ...body];
}

type HeaderPart = "name" | "title" | "contact";

function renderPersonalInfo(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
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
    k === ruleAfter
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

  return present.map((k) => {
    if (k === "name") {
      return new Paragraph({
        children: [
          new TextRun({
            text: info.name,
            bold: true,
            size: styles.titleSize,
            font: styles.headerFontFamily,
            color: styles.headingTextColor,
            allCaps: styles.variant === "classic" || styles.variant === "bold",
          }),
        ],
        alignment: styles.headerAlign,
        spacing: { after: 60 },
        ...rule(k),
      });
    }
    if (k === "title") {
      return new Paragraph({
        children: [
          new TextRun({
            text: info.title,
            bold: true,
            size: styles.variant === "bold" ? styles.normalSize - 2 : styles.normalSize,
            font: styles.fontFamily,
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
        spacing: { after: 120 },
        ...rule(k),
      });
    }
    return new Paragraph({
      children: [
        new TextRun({
          text: contactParts.join("  ·  "),
          size: styles.normalSize - 2,
          font: styles.fontFamily,
          color: "666666",
        }),
      ],
      alignment: styles.headerAlign,
      spacing: { after: 120 },
      ...rule(k),
    });
  });
}

function renderSummary(summary: string | null, styles: DocxStyleConfig): Paragraph[] {
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
      spacing: { before: 40, after: styles.spacing.after, line: styles.spacing.line },
      ...(styles.variant === "classic"
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
        spacing: { after: spacingAfter },
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
                    font: styles.fontFamily,
                  }),
                ],
                spacing: { after: 0 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: exp.company || "",
                    size: styles.normalSize - 2,
                    font: styles.fontFamily,
                    color: "666666",
                  }),
                ],
                spacing: { after: 40 },
              }),
              ...bulletBlock(pos.bullets, pos.description, styles, 20),
            ],
            true
          )
        );
        out.push(new Paragraph({ text: "", spacing: { after: 40 } }));
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
              font: styles.fontFamily,
              allCaps: styles.variant === "classic",
            }),
          ],
          spacing: { before: 100, after: 20 },
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
              italics: styles.variant === "classic",
              size: styles.normalSize,
              font: styles.fontFamily,
            }),
            new TextRun({
              text: "\t" + range(styles, pos.startDate, pos.endDate, pos.isCurrent),
              size: styles.normalSize,
              font: styles.fontFamily,
              color: "666666",
            }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: styles.variant === "editorial" ? 100 : 0, after: 40 },
        })
      );

      if (styles.variant === "editorial") {
        out.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.company || "",
                size: styles.normalSize - 2,
                font: styles.fontFamily,
                color: "666666",
              }),
            ],
            spacing: { after: 40 },
          })
        );
      }

      out.push(...bulletBlock(pos.bullets, pos.description, styles));
    }
  }

  return out;
}

function renderEducation(resume: ResumeData, styles: DocxStyleConfig): (Paragraph | Table)[] {
  if (!resume.education.length) return [];
  const out: (Paragraph | Table)[] = [];

  for (const edu of resume.education) {
    const when = range(styles, edu.startDate, edu.endDate);
    const degreeLine = `${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}`;
    const gpaRuns = edu.gpa
      ? [
          new TextRun({
            text: `  |  GPA: ${formatGpa(edu)}`,
            size: styles.normalSize,
            font: styles.fontFamily,
            color: "666666",
          }),
        ]
      : [];

    if (styles.variant === "timeline") {
      out.push(
        railTable(
          railDate(when, styles),
          [
            new Paragraph({
              children: [
                new TextRun({
                  text: degreeLine,
                  bold: true,
                  size: styles.normalSize,
                  font: styles.fontFamily,
                }),
              ],
              spacing: { after: 0 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: edu.institution || "",
                  size: styles.normalSize - 2,
                  font: styles.fontFamily,
                  color: "666666",
                }),
                ...gpaRuns,
              ],
              spacing: { after: 20 },
            }),
          ],
          true
        )
      );
      out.push(new Paragraph({ text: "", spacing: { after: 40 } }));
      continue;
    }

    // Editorial leads with the degree; the rest lead with the institution.
    const lead = styles.variant === "editorial" ? degreeLine : edu.institution || "";
    const follow = styles.variant === "editorial" ? edu.institution || "" : degreeLine;

    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text: lead,
            bold: true,
            size: styles.heading3Size,
            font: styles.fontFamily,
          }),
          new TextRun({
            text: "\t" + when,
            size: styles.normalSize,
            font: styles.fontFamily,
            color: "666666",
          }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 80, after: 20 },
      })
    );

    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text: follow,
            size: styles.normalSize,
            font: styles.fontFamily,
            color: styles.variant === "editorial" ? "666666" : undefined,
          }),
          ...gpaRuns,
        ],
        spacing: { after: 60 },
      })
    );
  }

  return out;
}

function renderSkills(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.skills.length) return [];
  const paragraphs: Paragraph[] = [];
  const fmt = (s: { name: string; level?: string }) =>
    s.level ? `${s.name} (${s.level})` : s.name;

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
            font: styles.fontFamily,
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
      paragraphs.push(new Paragraph({ children, spacing: { after: 40 } }));
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
          new TextRun({ text: c.name, bold: true, size: styles.normalSize, font: styles.fontFamily }),
          ...(c.issuer ? [new TextRun({ text: ` — ${c.issuer}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
          ...(c.date ? [new TextRun({ text: ` (${formatDate(c.date)})`, size: styles.normalSize, font: styles.fontFamily, color: "888888" })] : []),
        ],
        spacing: { after: c.credentialId ? 20 : 40 },
      })
    );
    if (c.credentialId) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Credential ID: ${c.credentialId}`, size: styles.normalSize - 2, font: styles.fontFamily, color: "666666" }),
          ],
          spacing: { after: 40 },
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
      spacing: { after: styles.spacing.after },
    }),
  ];
}

function renderProjects(resume: ResumeData, styles: DocxStyleConfig): (Paragraph | Table)[] {
  if (!resume.projects.length) return [];
  const out: (Paragraph | Table)[] = [];

  for (const p of resume.projects) {
    const when = range(styles, p.startDate, p.endDate, p.isCurrent);
    const body: Paragraph[] = [
      ...(p.description ? bulletBlock(undefined, p.description, styles, 20) : []),
      ...(p.technologies?.length
        ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Technologies: ${p.technologies.join(", ")}`,
                  size: styles.normalSize,
                  font: styles.fontFamily,
                  color: "666666",
                }),
              ],
              spacing: { after: 40 },
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
                  font: styles.fontFamily,
                }),
              ],
              spacing: { after: 20 },
            }),
            ...body,
          ],
          true
        )
      );
      out.push(new Paragraph({ text: "", spacing: { after: 40 } }));
      continue;
    }

    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: p.name, bold: true, size: styles.normalSize, font: styles.fontFamily }),
          ...(when
            ? [
                new TextRun({
                  text: "\t" + when,
                  size: styles.normalSize,
                  font: styles.fontFamily,
                  color: "666666",
                }),
              ]
            : []),
        ],
        ...(when ? { tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] } : {}),
        spacing: { before: 60, after: 20 },
      })
    );
    out.push(...body);
  }
  return out;
}

function renderAwards(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.awards.length) return [];
  const paragraphs: Paragraph[] = [];
  for (const a of resume.awards) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: a.title, bold: true, size: styles.normalSize, font: styles.fontFamily }),
          ...(a.issuer ? [new TextRun({ text: ` — ${a.issuer}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
          ...(a.date ? [new TextRun({ text: ` (${formatDate(a.date)})`, size: styles.normalSize, font: styles.fontFamily, color: "888888" })] : []),
        ],
        spacing: { after: a.description ? 20 : 40 },
      })
    );

    if (a.description) {
      const { lines, isSingleParagraph } = resolveBulletLines(undefined, a.description);
      if (isSingleParagraph && lines.length === 1) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: lines[0], size: styles.normalSize, font: styles.fontFamily })],
            spacing: { after: 40 },
          })
        );
      } else {
        for (const line of lines) {
          paragraphs.push(bulletParagraph(line, styles));
        }
      }
    }
  }
  return paragraphs;
}

function renderReferences(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.references.length) return [];
  const paragraphs: Paragraph[] = [];
  for (const r of resume.references) {
    // Line 1: Name (bold) + position + company
    const line1Parts: TextRun[] = [
      new TextRun({ text: r.name, bold: true, size: styles.normalSize, font: styles.fontFamily }),
    ];
    if (r.position) {
      line1Parts.push(new TextRun({ text: `, ${r.position}`, size: styles.normalSize, font: styles.fontFamily }));
    }
    if (r.company) {
      line1Parts.push(new TextRun({ text: ` at ${r.company}`, size: styles.normalSize, font: styles.fontFamily }));
    }
    paragraphs.push(
      new Paragraph({
        children: line1Parts,
        spacing: { after: 20 },
      })
    );

    // Line 2: Email + phone (smaller, gray)
    const contactParts = [r.email, r.phone].filter(Boolean);
    if (contactParts.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: contactParts.join(" | "),
              size: styles.normalSize - 2,
              font: styles.fontFamily,
              color: "666666",
            }),
          ],
          spacing: { after: 60 },
        })
      );
    }
  }
  return paragraphs;
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
      ...wrapSection(s.title, bulletBlock(undefined, s.content, styles, styles.spacing.after), styles)
    );
  }
  return out;
}

/** Render a cloned section with structured items to DOCX paragraphs */
function renderClonedDocxSection(cs: CustomSection, styles: DocxStyleConfig): Paragraph[] {
  if (!cs.basedOn || !cs.items?.length) return [];
  const paragraphs: Paragraph[] = [];

  switch (cs.basedOn) {
    case "workExperience":
      for (const exp of normalizeWorkExperience(cs.items)) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.company || "", bold: true, size: styles.heading3Size, font: styles.fontFamily }),
            ],
            spacing: { before: 100, after: 20 },
          })
        );
        for (const pos of exp.positions) {
          const dateStr = `${formatDate(pos.startDate)} — ${pos.isCurrent ? "Present" : formatDate(pos.endDate)}`;
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: pos.title || "", bold: true, italics: true, size: styles.normalSize, font: styles.fontFamily }),
                new TextRun({ text: "\t" + dateStr, size: styles.normalSize, font: styles.fontFamily, color: "666666" }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              spacing: { after: 40 },
            })
          );
          const { lines, isSingleParagraph } = resolveBulletLines(pos.bullets, pos.description);
          if (isSingleParagraph && lines.length === 1) {
            paragraphs.push(new Paragraph({ children: [new TextRun({ text: lines[0], size: styles.normalSize, font: styles.fontFamily })], spacing: { after: 60 } }));
          } else {
            for (const line of lines) paragraphs.push(bulletParagraph(line, styles));
          }
        }
      }
      break;

    case "education":
      for (const edu of cs.items as Education[]) {
        const dateStr = `${formatDate(edu.startDate)} — ${formatDate(edu.endDate)}`;
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: edu.institution || "", bold: true, size: styles.heading3Size, font: styles.fontFamily }),
              new TextRun({ text: "\t" + dateStr, size: styles.normalSize, font: styles.fontFamily, color: "666666" }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            spacing: { before: 80, after: 20 },
          })
        );
        const degreeLine = `${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}`;
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: degreeLine, size: styles.normalSize, font: styles.fontFamily }),
              ...(edu.gpa ? [new TextRun({ text: `  |  GPA: ${formatGpa(edu)}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
            ],
            spacing: { after: 60 },
          })
        );
      }
      break;

    case "skills":
      for (const s of cs.items as Skill[]) {
        const text = s.level ? `${s.name} (${s.level})` : s.name;
        paragraphs.push(bulletParagraph(text, styles));
      }
      break;

    case "certifications":
      for (const c of cs.items as Certification[]) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: c.name, bold: true, size: styles.normalSize, font: styles.fontFamily }),
            ...(c.issuer ? [new TextRun({ text: ` — ${c.issuer}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
            ...(c.date ? [new TextRun({ text: ` (${formatDate(c.date)})`, size: styles.normalSize, font: styles.fontFamily, color: "888888" })] : []),
          ],
          spacing: { after: c.credentialId ? 20 : 40 },
        }));
        if (c.credentialId) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `Credential ID: ${c.credentialId}`, size: styles.normalSize - 2, font: styles.fontFamily, color: "666666" })],
            spacing: { after: 40 },
          }));
        }
      }
      break;

    case "languages":
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: (cs.items as Language[]).map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(", "),
          size: styles.normalSize, font: styles.fontFamily,
        })],
        spacing: { after: styles.spacing.after },
      }));
      break;

    case "projects":
      for (const p of cs.items as Project[]) {
        const projDateStr = (p.startDate || p.endDate || p.isCurrent)
          ? `${p.startDate ? formatDate(p.startDate) : ""}${p.startDate && (p.endDate || p.isCurrent) ? " — " : ""}${p.isCurrent ? "Present" : p.endDate ? formatDate(p.endDate) : ""}`
          : "";
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: p.name, bold: true, size: styles.normalSize, font: styles.fontFamily }),
            ...(projDateStr ? [new TextRun({ text: "\t" + projDateStr, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
          ],
          ...(projDateStr ? { tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] } : {}),
          spacing: { before: 60, after: 20 },
        }));
        if (p.description) {
          const { lines, isSingleParagraph } = resolveBulletLines(undefined, p.description);
          if (isSingleParagraph && lines.length === 1) {
            paragraphs.push(new Paragraph({ children: [new TextRun({ text: lines[0], size: styles.normalSize, font: styles.fontFamily })], spacing: { after: 20 } }));
          } else {
            for (const line of lines) paragraphs.push(bulletParagraph(line, styles));
          }
        }
        if (p.technologies?.length) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `Technologies: ${p.technologies.join(", ")}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })],
            spacing: { after: 40 },
          }));
        }
      }
      break;

    case "awards":
      for (const a of cs.items as Award[]) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: a.title, bold: true, size: styles.normalSize, font: styles.fontFamily }),
            ...(a.issuer ? [new TextRun({ text: ` — ${a.issuer}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
            ...(a.date ? [new TextRun({ text: ` (${formatDate(a.date)})`, size: styles.normalSize, font: styles.fontFamily, color: "888888" })] : []),
          ],
          spacing: { after: 40 },
        }));
      }
      break;

    case "references":
      for (const r of cs.items as Reference[]) {
        const refLine1: TextRun[] = [
          new TextRun({ text: r.name, bold: true, size: styles.normalSize, font: styles.fontFamily }),
        ];
        if (r.position) refLine1.push(new TextRun({ text: `, ${r.position}`, size: styles.normalSize, font: styles.fontFamily }));
        if (r.company) refLine1.push(new TextRun({ text: ` at ${r.company}`, size: styles.normalSize, font: styles.fontFamily }));
        paragraphs.push(new Paragraph({ children: refLine1, spacing: { after: 20 } }));
        const refContact = [r.email, r.phone].filter(Boolean);
        if (refContact.length > 0) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: refContact.join(" | "), size: styles.normalSize - 2, font: styles.fontFamily, color: "666666" })],
            spacing: { after: 60 },
          }));
        }
      }
      break;
  }

  return paragraphs;
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
  projects: renderProjects,
  awards: renderAwards,
  references: renderReferences,
  customSections: renderCustomSections,
};

export async function generateDocx(
  resume: ResumeData,
  templateId: string,
  config: TemplateConfig
): Promise<Buffer> {
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
          children.push(...wrapSection(label, renderClonedDocxSection(cs, styles), styles));
        } else if (cs.content) {
          children.push(
            ...wrapSection(
              label,
              bulletBlock(undefined, cs.content, styles, styles.spacing.after),
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
    const body = renderer(resume, sectionStyles);
    if (!body.length) continue;

    // personalInfo is the header and customSections labels its own entries;
    // everything else gets a heading (or gutter label) from wrapSection.
    const label =
      sectionId === "personalInfo" || sectionId === "customSections"
        ? null
        : sectionId === "summary"
        ? SUMMARY_LABEL[sectionStyles.variant]
        : SECTION_LABELS[sectionId] || sectionId;

    children.push(...wrapSection(label, body, sectionStyles));
  }

  const doc = new Document({
    numbering: buildNumberingConfig(styles),
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
