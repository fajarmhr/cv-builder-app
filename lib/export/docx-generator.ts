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
} from "docx";
import type { ResumeData, TemplateConfig, CustomSection, Education, Skill, Certification, Language, Project, Award, Reference } from "@/types/resume";
import { normalizeWorkExperience } from "@/types/resume";
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
      spacing: { after: 20 },
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
    spacing: { after: 20 },
  });
}

function sectionHeading(title: string, styles: DocxStyleConfig): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: styles.heading2Size,
        font: styles.headerFontFamily,
        color: styles.headingTextColor,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: styles.variant === "modern" ? 12 : 6, color: styles.sectionRuleColor },
    },
  });
}

function renderPersonalInfo(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  const info = resume.personalInfo;
  if (!info) return [];

  const paragraphs: Paragraph[] = [];

  if (info.name) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: info.name,
            bold: true,
            size: styles.titleSize,
            font: styles.headerFontFamily,
            color: styles.headingTextColor,
            allCaps: styles.variant !== "modern",
          }),
        ],
        alignment: styles.headerAlign,
        spacing: { after: 60 },
      })
    );
  }

  const contactParts = [info.email, info.phone, info.address, info.linkedin, info.website].filter(Boolean);
  if (contactParts.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: styles.normalSize - 2,
            font: styles.fontFamily,
            color: "666666",
          }),
        ],
        alignment: styles.headerAlign,
        spacing: { after: 120 },
        ...(styles.variant === "minimal"
          ? { border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" } } }
          : {}),
      })
    );
  }

  return paragraphs;
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
      spacing: { before: 40, after: styles.spacing.after },
    }),
  ];
}

function renderWorkExperience(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.workExperience.length) return [];

  const paragraphs: Paragraph[] = [sectionHeading("Work Experience", styles)];

  for (const exp of resume.workExperience) {
    // Company header (positions carry their own date ranges below).
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.company || "",
            bold: true,
            size: styles.heading3Size,
            font: styles.fontFamily,
          }),
        ],
        spacing: { before: 100, after: 20 },
      })
    );

    for (const pos of exp.positions) {
      const dateStr = `${formatDate(pos.startDate)} — ${pos.isCurrent ? "Present" : formatDate(pos.endDate)}`;

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: pos.title || "",
              bold: true,
              italics: true,
              size: styles.normalSize,
              font: styles.fontFamily,
            }),
            new TextRun({
              text: "\t" + dateStr,
              size: styles.normalSize,
              font: styles.fontFamily,
              color: "666666",
            }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { after: 40 },
        })
      );

      const { lines, isSingleParagraph } = resolveBulletLines(pos.bullets, pos.description);

      if (isSingleParagraph && lines.length === 1) {
        // Single-line plain description
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: lines[0],
                size: styles.normalSize,
                font: styles.fontFamily,
              }),
            ],
            spacing: { after: 60 },
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

function renderEducation(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.education.length) return [];

  const paragraphs: Paragraph[] = [sectionHeading("Education", styles)];

  for (const edu of resume.education) {
    const dateStr = `${formatDate(edu.startDate)} — ${formatDate(edu.endDate)}`;
    const degreeLine = `${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}`;

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.institution || "",
            bold: true,
            size: styles.heading3Size,
            font: styles.fontFamily,
          }),
          new TextRun({
            text: "\t" + dateStr,
            size: styles.normalSize,
            font: styles.fontFamily,
            color: "666666",
          }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 80, after: 20 },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: degreeLine,
            size: styles.normalSize,
            font: styles.fontFamily,
          }),
          ...(edu.gpa
            ? [
                new TextRun({
                  text: `  |  GPA: ${edu.gpa}`,
                  size: styles.normalSize,
                  font: styles.fontFamily,
                  color: "666666",
                }),
              ]
            : []),
        ],
        spacing: { after: 60 },
      })
    );
  }

  return paragraphs;
}

function renderSkills(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.skills.length) return [];
  const paragraphs: Paragraph[] = [sectionHeading("Skills", styles)];
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
  const paragraphs: Paragraph[] = [sectionHeading("Certifications", styles)];
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
    sectionHeading("Languages", styles),
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

function renderProjects(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.projects.length) return [];
  const paragraphs: Paragraph[] = [sectionHeading("Projects", styles)];
  for (const p of resume.projects) {
    const dateStr = (p.startDate || p.endDate)
      ? `${p.startDate ? formatDate(p.startDate) : ""}${p.startDate && p.endDate ? " — " : ""}${p.endDate ? formatDate(p.endDate) : ""}`
      : "";
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: p.name, bold: true, size: styles.normalSize, font: styles.fontFamily }),
          ...(dateStr ? [new TextRun({ text: "\t" + dateStr, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
        ],
        ...(dateStr ? { tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] } : {}),
        spacing: { before: 60, after: 20 },
      })
    );
    if (p.description) {
      const { lines, isSingleParagraph } = resolveBulletLines(undefined, p.description);

      if (isSingleParagraph && lines.length === 1) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: lines[0], size: styles.normalSize, font: styles.fontFamily })],
            spacing: { after: 20 },
          })
        );
      } else {
        for (const line of lines) {
          paragraphs.push(bulletParagraph(line, styles));
        }
      }
    }
    if (p.technologies?.length) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `Technologies: ${p.technologies.join(", ")}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })],
          spacing: { after: 40 },
        })
      );
    }
  }
  return paragraphs;
}

function renderAwards(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  if (!resume.awards.length) return [];
  const paragraphs: Paragraph[] = [sectionHeading("Awards", styles)];
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
  const paragraphs: Paragraph[] = [sectionHeading("References", styles)];
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

function renderCustomSections(resume: ResumeData, styles: DocxStyleConfig): Paragraph[] {
  // Only render plain custom sections (exclude cloned sections which have basedOn set)
  const plainSections = resume.customSections.filter((s) => !s.basedOn);
  if (!plainSections.length) return [];
  const paragraphs: Paragraph[] = [];
  for (const s of plainSections) {
    paragraphs.push(sectionHeading(s.title, styles));

    const { lines, isSingleParagraph } = resolveBulletLines(undefined, s.content);
    if (isSingleParagraph && lines.length === 1) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: lines[0], size: styles.normalSize, font: styles.fontFamily })],
          spacing: { after: styles.spacing.after },
        })
      );
    } else {
      for (const line of lines) {
        paragraphs.push(bulletParagraph(line, styles));
      }
    }
  }
  return paragraphs;
}

/** Render a cloned section with structured items to DOCX paragraphs */
function renderClonedDocxSection(cs: CustomSection, styles: DocxStyleConfig): Paragraph[] {
  if (!cs.basedOn || !cs.items?.length) return [];
  const paragraphs: Paragraph[] = [sectionHeading(cs.title || "Untitled", styles)];

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
              ...(edu.gpa ? [new TextRun({ text: `  |  GPA: ${edu.gpa}`, size: styles.normalSize, font: styles.fontFamily, color: "666666" })] : []),
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
        const projDateStr = (p.startDate || p.endDate)
          ? `${p.startDate ? formatDate(p.startDate) : ""}${p.startDate && p.endDate ? " — " : ""}${p.endDate ? formatDate(p.endDate) : ""}`
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

const SECTION_RENDERERS: Record<string, (resume: ResumeData, styles: DocxStyleConfig) => Paragraph[]> = {
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

  const children: Paragraph[] = [];

  for (const sectionId of sectionOrder) {
    if (hiddenSections.has(sectionId)) continue;

    // Handle standalone custom section cards ("custom:<id>")
    if (isCustomSectionId(sectionId)) {
      const entryId = getCustomSectionEntryId(sectionId);
      const cs = resume.customSections.find((s) => s.id === entryId);
      if (cs) {
        // Cloned section with structured items
        if (cs.basedOn && cs.items?.length) {
          children.push(...renderClonedDocxSection(cs, styles));
        } else if (cs.content) {
          // Plain custom section
          children.push(sectionHeading(cs.title || "Untitled", styles));
          const { lines, isSingleParagraph } = resolveBulletLines(undefined, cs.content);
          if (isSingleParagraph && lines.length === 1) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: lines[0], size: styles.normalSize, font: styles.fontFamily })],
                spacing: { after: styles.spacing.after },
              })
            );
          } else {
            for (const line of lines) {
              children.push(bulletParagraph(line, styles));
            }
          }
        }
      }
      continue;
    }

    const renderer = SECTION_RENDERERS[sectionId];
    if (renderer) {
      children.push(...renderer(resume, styles));
    }
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
