import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeData, TemplateConfig, CustomSection } from "@/types/resume";
import { normalizeWorkExperience } from "@/types/resume";
import {
  formatDate,
  getVisibleSections,
  hasContent,
  getBulletMarker,
  groupSkills,
  findCustomSection,
  isCustomSectionId,
} from "@/components/templates/template-helpers";
import { getTemplateFont } from "@/lib/template-fonts";

/**
 * PDF export rendered with @react-pdf/renderer, faithful to the on-screen
 * preview for each of the 3 supported templates. The section *bodies* are
 * shared; only the header and the section-title style change per variant:
 *   classic (ats-001) — centred name, black underlined headings
 *   modern  (ats-002) — left name, accent-coloured heading rule
 *   minimal (ats-007) — name left / contact right, hairline gray rules
 */

type Variant = "classic" | "modern" | "minimal";

function variantFor(templateId?: string): Variant {
  if (templateId === "ats-002") return "modern";
  if (templateId === "ats-007") return "minimal";
  return "classic";
}

const SUB = "#555555";
const CONTACT = "#444444";

// Register the résumé's body + header fonts (regular/bold) from the fontsource
// CDN so the PDF matches the on-screen template. Falls back to the built-in
// Helvetica/Times if a family can't be registered.
const FONTSOURCE = "https://cdn.jsdelivr.net/fontsource/fonts";
const registeredFonts = new Set<string>();

function registerTemplateFont(opt: ReturnType<typeof getTemplateFont>): boolean {
  const id = opt.value;
  if (!id) return false;
  if (registeredFonts.has(id)) return true;
  try {
    Font.register({
      family: opt.docxFamily,
      src: `${FONTSOURCE}/${id}@latest/latin-400-normal.ttf`,
    });
    Font.register({
      family: `${opt.docxFamily} Bold`,
      src: `${FONTSOURCE}/${id}@latest/latin-700-normal.ttf`,
    });
    registeredFonts.add(id);
    return true;
  } catch {
    return false;
  }
}

function fonts(config: TemplateConfig) {
  const bodyOpt = getTemplateFont(config.fontFamily);
  const headerOpt = getTemplateFont(config.headerFontFamily || config.fontFamily);
  const bodyOk = registerTemplateFont(bodyOpt);
  const headerOk = registerTemplateFont(headerOpt);
  const bodySerif = bodyOpt.category === "serif";
  const headerSerif = headerOpt.category === "serif";
  return {
    body: bodyOk ? bodyOpt.docxFamily : bodySerif ? "Times-Roman" : "Helvetica",
    bodyBold: bodyOk
      ? `${bodyOpt.docxFamily} Bold`
      : bodySerif
      ? "Times-Bold"
      : "Helvetica-Bold",
    headerBold: headerOk
      ? `${headerOpt.docxFamily} Bold`
      : headerSerif
      ? "Times-Bold"
      : "Helvetica-Bold",
  };
}

function buildStyles(config: TemplateConfig, variant: Variant) {
  const f = fonts(config);
  const ink = config.primaryColor || "#1b2230";
  const accent = config.accentColor || "#a3585c";

  // Section-title rule differs per variant
  const titleBorder =
    variant === "modern"
      ? { borderBottomWidth: 2, borderBottomColor: accent }
      : variant === "minimal"
      ? { borderBottomWidth: 0.75, borderBottomColor: "#cccccc" }
      : { borderBottomWidth: 1.5, borderBottomColor: "#000000" };

  return StyleSheet.create({
    page: {
      paddingVertical: 72,
      paddingHorizontal: 72,
      fontFamily: f.body,
      fontSize: 9,
      lineHeight: 1.4,
      color: "#000000",
    },
    // header (classic / modern)
    header: {
      marginBottom: 9,
      alignItems: variant === "classic" ? "center" : "flex-start",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: variant === "classic" ? "center" : "flex-start",
    },
    // header (minimal — name left, contact right, strong rule)
    headerSplit: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: 1.5,
      borderBottomColor: "#000000",
    },
    contactRight: { alignItems: "flex-end" },
    contactRightLine: { fontSize: 7.5, color: SUB, lineHeight: 1.5 },
    photo: { width: 42, height: 42, borderRadius: 21, objectFit: "cover", marginRight: 9 },
    // Classic: photo pinned left, name + contact centred across full width.
    headerCenter: { marginBottom: 9 },
    headerNameRow: { position: "relative", minHeight: 42, justifyContent: "center" },
    photoAbs: { position: "absolute", left: 0, top: 0, width: 42, height: 42, borderRadius: 21, objectFit: "cover" },
    headerCol: { flexGrow: 1 },
    minimalLeft: { flexDirection: "row", alignItems: "center", flexGrow: 1, flexShrink: 1, flexBasis: 0, marginRight: 12 },
    nameFlex: { flexShrink: 1 },
    name: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: variant === "modern" ? 20 : variant === "minimal" ? 15 : 18,
      lineHeight: 1.2,
      textTransform: variant === "modern" ? "none" : "uppercase",
      letterSpacing: variant === "modern" ? 0 : 0.9,
      textAlign: variant === "classic" ? "center" : "left",
      marginBottom: 4,
    },
    contact: {
      fontSize: 7.5,
      color: CONTACT,
      lineHeight: 1.35,
      textAlign: variant === "classic" ? "center" : "left",
    },
    // sections
    sectionTitle: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: variant === "minimal" ? 9 : 10.5,
      textTransform: "uppercase",
      letterSpacing: variant === "minimal" ? 1.2 : 0.3,
      paddingBottom: 3,
      marginTop: 12,
      marginBottom: 6,
      borderBottomStyle: "solid",
      ...titleBorder,
    },
    summary: {
      fontSize: 9,
      textAlign: variant === "classic" ? "justify" : "left",
      marginBottom: 2,
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    bold: { fontFamily: f.bodyBold },
    boldUpper: { fontFamily: f.bodyBold, textTransform: "uppercase" },
    sub: { fontSize: 7.5, color: SUB },
    itemBlock: { marginBottom: 9 },
    itemBlockSm: { marginBottom: 6 },
    bulletRow: { flexDirection: "row", marginTop: 1.5 },
    bulletMarker: { width: 9 },
    bulletText: { flex: 1 },
    paraSm: { marginBottom: 3 },
    mt0: { marginTop: 1.5 },
  });
}

/** Resolve bullet lines mirroring the preview's BulletList logic. */
function resolveBullets(
  bullets?: string[],
  description?: string
): { lines: string[]; paragraph?: string } {
  let lines = (bullets || []).filter(Boolean);
  if (lines.length === 0 && description?.trim()) {
    const hasMarkers = /^[•▸▪–\-*•]/m.test(description);
    const hasNewlines = description.includes("\n");
    if (hasMarkers || hasNewlines) {
      lines = description
        .split("\n")
        .map((l) => l.replace(/^[•▸▪–\-*•]\s*/, "").trim())
        .filter(Boolean);
    } else {
      return { lines: [], paragraph: description };
    }
  }
  return { lines };
}

function Bullets({
  bullets,
  description,
  config,
  styles,
}: {
  bullets?: string[];
  description?: string;
  config: TemplateConfig;
  styles: ReturnType<typeof buildStyles>;
}) {
  const { lines, paragraph } = resolveBullets(bullets, description);
  if (paragraph) return <Text style={styles.mt0}>{paragraph}</Text>;
  if (lines.length === 0) return null;
  const marker = getBulletMarker(config.bulletStyle);
  return (
    <View style={styles.mt0}>
      {lines.map((b, i) => (
        <View key={i} style={styles.bulletRow}>
          {marker ? <Text style={styles.bulletMarker}>{marker}</Text> : null}
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionTitle({
  children,
  styles,
}: {
  children: React.ReactNode;
  styles: ReturnType<typeof buildStyles>;
}) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

type Styles = ReturnType<typeof buildStyles>;

function renderWorkItems(
  items: ResumeData["workExperience"],
  config: TemplateConfig,
  styles: Styles
) {
  return items.map((exp, i) => (
    <View key={exp.id || i} style={styles.itemBlock}>
      <Text style={styles.boldUpper}>{exp.company}</Text>
      {exp.positions.map((pos, pi) => (
        <View key={pos.id || pi} style={styles.mt0}>
          <View style={styles.rowBetween}>
            <Text style={styles.bold}>{pos.title}</Text>
            <Text style={styles.sub}>
              {pos.startDate ? formatDate(pos.startDate) : ""}
              {pos.startDate && (pos.endDate || pos.isCurrent) ? " — " : ""}
              {pos.isCurrent ? "Present" : pos.endDate ? formatDate(pos.endDate) : ""}
            </Text>
          </View>
          <Bullets bullets={pos.bullets} description={pos.description} config={config} styles={styles} />
        </View>
      ))}
    </View>
  ));
}

function renderEducationItems(
  items: ResumeData["education"],
  styles: Styles
) {
  return items.map((edu, i) => (
    <View key={edu.id || i} style={styles.itemBlockSm}>
      <View style={styles.rowBetween}>
        <Text style={styles.boldUpper}>{edu.institution}</Text>
        <Text style={styles.sub}>
          {edu.startDate ? formatDate(edu.startDate) : ""}
          {edu.startDate && edu.endDate ? " — " : ""}
          {edu.endDate ? formatDate(edu.endDate) : ""}
        </Text>
      </View>
      <Text>
        {edu.degree}
        {edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""}
      </Text>
      {edu.gpa ? <Text>GPA: {edu.gpa}</Text> : null}
    </View>
  ));
}

function renderSkillItems(
  items: ResumeData["skills"],
  config: TemplateConfig,
  styles: Styles
) {
  const fmt = (s: ResumeData["skills"][number]) =>
    `${s.name}${s.level ? ` (${s.level})` : ""}`;
  const groups = groupSkills(items);
  const grouped = groups.length > 1 || (groups.length === 1 && !!groups[0].category);

  if (grouped) {
    return (
      <View style={styles.mt0}>
        {groups.map((g, gi) => (
          <Text key={gi} style={styles.paraSm}>
            {g.category ? <Text style={styles.bold}>{g.category}: </Text> : null}
            {g.items.map(fmt).join(", ")}
          </Text>
        ))}
      </View>
    );
  }

  const marker = getBulletMarker(config.bulletStyle);
  return (
    <View style={styles.mt0}>
      {items.map((s, i) => (
        <View key={s.id || i} style={styles.bulletRow}>
          {marker ? <Text style={styles.bulletMarker}>{marker}</Text> : null}
          <Text style={styles.bulletText}>{fmt(s)}</Text>
        </View>
      ))}
    </View>
  );
}

function renderProjectItems(
  items: ResumeData["projects"],
  config: TemplateConfig,
  styles: Styles
) {
  return items.map((p, i) => (
    <View key={p.id || i} style={styles.itemBlockSm}>
      <View style={styles.rowBetween}>
        <Text style={styles.bold}>{p.name}</Text>
        {p.startDate || p.endDate ? (
          <Text style={styles.sub}>
            {p.startDate ? formatDate(p.startDate) : ""}
            {p.startDate && p.endDate ? " — " : ""}
            {p.endDate ? formatDate(p.endDate) : ""}
          </Text>
        ) : null}
      </View>
      <Bullets description={p.description} config={config} styles={styles} />
      {p.technologies?.length ? (
        <Text style={styles.sub}>Tech: {p.technologies.join(", ")}</Text>
      ) : null}
    </View>
  ));
}

function Header({
  info,
  variant,
  styles,
}: {
  info: ResumeData["personalInfo"];
  variant: Variant;
  styles: Styles;
}) {
  if (!info) return null;
  const contactParts = [info.address, info.email, info.phone, info.linkedin, info.website].filter(Boolean);

  // Minimal — name left, contact stacked on the right, strong rule beneath.
  if (variant === "minimal") {
    const rightLines = [info.address, info.phone, info.email, info.linkedin].filter(Boolean);
    return (
      <View style={styles.headerSplit}>
        <View style={styles.minimalLeft}>
          {info.photoUrl ? <Image style={styles.photo} src={info.photoUrl} /> : null}
          <Text style={[styles.name, styles.nameFlex]}>{info.name}</Text>
        </View>
        <View style={[styles.contactRight, { flexShrink: 0 }]}>
          {rightLines.map((l, i) => (
            <Text key={i} style={styles.contactRightLine}>{l}</Text>
          ))}
        </View>
      </View>
    );
  }

  // Modern — name + contact left-aligned beside the photo.
  if (variant === "modern") {
    return (
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {info.photoUrl ? <Image style={styles.photo} src={info.photoUrl} /> : null}
          <View style={styles.headerCol}>
            <Text style={styles.name}>{info.name}</Text>
            <Text style={styles.contact}>{contactParts.join(" · ")}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Classic — photo + name on a centred row, contact centred below (clear of photo).
  return (
    <View style={styles.headerCenter}>
      <View style={styles.headerNameRow}>
        {info.photoUrl ? <Image style={styles.photoAbs} src={info.photoUrl} /> : null}
        <Text style={styles.name}>{info.name}</Text>
      </View>
      <Text style={styles.contact}>{contactParts.join(" · ")}</Text>
    </View>
  );
}

function ResumePdfDocument({
  resume,
  config,
  variant,
}: {
  resume: ResumeData;
  config: TemplateConfig;
  variant: Variant;
}) {
  const styles = buildStyles(config, variant);
  const info = resume.personalInfo;
  const visible = getVisibleSections(resume);

  const renderers: Record<string, () => React.ReactNode> = {
    personalInfo: () =>
      info ? <Header key="pi" info={info} variant={variant} styles={styles} /> : null,

    summary: () =>
      resume.summary ? (
        <Text key="sum" style={styles.summary}>
          {resume.summary}
        </Text>
      ) : null,

    workExperience: () =>
      hasContent(resume, "workExperience") ? (
        <View key="we">
          <SectionTitle styles={styles}>Work Experience</SectionTitle>
          {renderWorkItems(resume.workExperience, config, styles)}
        </View>
      ) : null,

    education: () =>
      hasContent(resume, "education") ? (
        <View key="edu">
          <SectionTitle styles={styles}>Education</SectionTitle>
          {renderEducationItems(resume.education, styles)}
        </View>
      ) : null,

    skills: () =>
      hasContent(resume, "skills") ? (
        <View key="sk">
          <SectionTitle styles={styles}>Skills</SectionTitle>
          {renderSkillItems(resume.skills, config, styles)}
        </View>
      ) : null,

    certifications: () =>
      hasContent(resume, "certifications") ? (
        <View key="cert">
          <SectionTitle styles={styles}>Certifications</SectionTitle>
          {resume.certifications.map((c, i) => (
            <View key={c.id || i} style={styles.paraSm}>
              <Text>
                <Text style={styles.bold}>{c.name}</Text>
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.date ? ` (${formatDate(c.date)})` : ""}
              </Text>
              {c.credentialId ? (
                <Text style={styles.sub}>Credential ID: {c.credentialId}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null,

    languages: () =>
      hasContent(resume, "languages") ? (
        <View key="lang">
          <SectionTitle styles={styles}>Languages</SectionTitle>
          <Text>
            {resume.languages
              .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
              .join(", ")}
          </Text>
        </View>
      ) : null,

    projects: () =>
      hasContent(resume, "projects") ? (
        <View key="proj">
          <SectionTitle styles={styles}>Projects</SectionTitle>
          {renderProjectItems(resume.projects, config, styles)}
        </View>
      ) : null,

    awards: () =>
      hasContent(resume, "awards") ? (
        <View key="aw">
          <SectionTitle styles={styles}>Awards</SectionTitle>
          {resume.awards.map((a, i) => (
            <Text key={a.id || i} style={styles.paraSm}>
              <Text style={styles.bold}>{a.title}</Text>
              {a.issuer ? ` — ${a.issuer}` : ""}
              {a.date ? ` (${formatDate(a.date)})` : ""}
            </Text>
          ))}
        </View>
      ) : null,

    references: () =>
      hasContent(resume, "references") ? (
        <View key="ref">
          <SectionTitle styles={styles}>References</SectionTitle>
          {resume.references.map((r, i) => (
            <Text key={r.id || i} style={styles.paraSm}>
              <Text style={styles.bold}>{r.name}</Text>
              {r.position ? `, ${r.position}` : ""}
              {r.company ? ` at ${r.company}` : ""}
              {r.email ? ` — ${r.email}` : ""}
              {r.phone ? ` | ${r.phone}` : ""}
            </Text>
          ))}
        </View>
      ) : null,

    customSections: () =>
      hasContent(resume, "customSections") ? (
        <View key="cs">
          {resume.customSections
            .filter((s) => !s.basedOn)
            .map((s) => (
              <View key={s.id}>
                <SectionTitle styles={styles}>{s.title}</SectionTitle>
                <Text>{s.content}</Text>
              </View>
            ))}
        </View>
      ) : null,
  };

  function renderCloned(cs: CustomSection) {
    if (!cs.basedOn || !cs.items?.length) {
      return cs.content ? (
        <View key={cs.id}>
          <SectionTitle styles={styles}>{cs.title}</SectionTitle>
          <Text>{cs.content}</Text>
        </View>
      ) : null;
    }
    let body: React.ReactNode = null;
    switch (cs.basedOn) {
      case "workExperience":
        body = renderWorkItems(normalizeWorkExperience(cs.items), config, styles);
        break;
      case "education":
        body = renderEducationItems(cs.items as ResumeData["education"], styles);
        break;
      case "skills":
        body = renderSkillItems(cs.items as ResumeData["skills"], config, styles);
        break;
      case "projects":
        body = renderProjectItems(cs.items as ResumeData["projects"], config, styles);
        break;
      default:
        body = <Text>{cs.content}</Text>;
    }
    return (
      <View key={cs.id}>
        <SectionTitle styles={styles}>{cs.title}</SectionTitle>
        {body}
      </View>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {visible.map((s) => {
          if (isCustomSectionId(s)) {
            const cs = findCustomSection(resume, s);
            return cs ? renderCloned(cs) : null;
          }
          return renderers[s]?.();
        })}
      </Page>
    </Document>
  );
}

export async function generatePdf(
  resume: ResumeData,
  config: TemplateConfig,
  templateId?: string
): Promise<Buffer> {
  const variant = variantFor(templateId ?? resume.templateId);
  return renderToBuffer(
    <ResumePdfDocument resume={resume} config={config} variant={variant} />
  );
}

export function pdfFilename(resume: ResumeData): string {
  const safe = (resume.personalInfo?.name || resume.title || "Resume")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `CV_${safe || "Resume"}.pdf`;
}
