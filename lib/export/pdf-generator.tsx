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
import type { ResumeData, TemplateConfig, CustomSection, SectionId } from "@/types/resume";
import { normalizeWorkExperience, availabilityLabel, formatGpa } from "@/types/resume";
import {
  formatDate,
  getVisibleSections,
  hasContent,
  getBulletMarker,
  groupSkills,
  findCustomSection,
  isCustomSectionId,
  tintOnWhite,
} from "@/components/templates/template-helpers";
import { getTemplateFont } from "@/lib/template-fonts";

// The on-screen templates never hyphenate; react-pdf does by default, which
// broke long contact lines as "Oppor-tunities". Keep words whole.
Font.registerHyphenationCallback((word) => [word]);

/**
 * PDF export rendered with @react-pdf/renderer, faithful to the on-screen
 * preview for each of the 6 supported templates. The section *bodies* are
 * shared; the header, the section-heading treatment and (for Timeline) the
 * entry layout change per variant:
 *   classic   (ats-001) — centred name, black underlined headings
 *   accent    (ats-002) — tinted heading bands, accent rule under the header
 *   bold      (ats-003) — oversized name, heavy rule, short accent underlines
 *   timeline  (ats-004) — dates in a left column beside each entry
 *   executive (ats-005) — serif headings, double rule, hairline dividers
 *   editorial (ats-007) — section labels in a left gutter
 */

type Variant = "classic" | "accent" | "bold" | "timeline" | "executive" | "editorial";

const VARIANT_BY_ID: Record<string, Variant> = {
  "ats-002": "accent",
  "ats-003": "bold",
  "ats-004": "timeline",
  "ats-005": "executive",
  "ats-007": "editorial",
};

function variantFor(templateId?: string): Variant {
  return (templateId && VARIANT_BY_ID[templateId]) || "classic";
}

const SUB = "#555555";
const CONTACT = "#444444";
const HAIR = "#d5d9df";
const BAND_TINT = 0.1;

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
const SUMMARY_LABEL: Record<Variant, string | null> = {
  classic: null,
  accent: "Professional Summary",
  bold: "Professional Summary",
  timeline: "Summary",
  executive: "Professional Summary",
  editorial: "Summary",
};

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

// Mirrors FONT_SCALE_MAP / LINE_SPACING_MAP in template-helpers so the export
// honours the same global font-size and line-spacing controls as the preview.
const FONT_SCALE: Record<string, number> = { small: 0.85, medium: 1, large: 1.15 };
const LINE_HEIGHT: Record<string, number> = { compact: 1.2, normal: 1.4, relaxed: 1.6 };

function buildStyles(config: TemplateConfig, variant: Variant) {
  const f = fonts(config);
  const scale = FONT_SCALE[config.fontSize] ?? 1;
  const sz = (n: number) => Math.round(n * scale * 100) / 100;
  const lh = LINE_HEIGHT[config.lineSpacing] ?? 1.4;
  const ink = config.primaryColor || "#1b2230";
  const accent = config.accentColor || "#a3585c";

  // Section-title rule differs per variant
  const titleBorder =
    variant === "executive"
      ? { borderBottomWidth: 0.75, borderBottomColor: HAIR }
      : { borderBottomWidth: 1.5, borderBottomColor: "#000000" };

  // Rule beneath the header block
  const headerRule =
    variant === "accent"
      ? { borderBottomWidth: 2.5, borderBottomColor: accent }
      : variant === "bold"
      ? { borderBottomWidth: 3.5, borderBottomColor: ink }
      : variant === "editorial"
      ? { borderBottomWidth: 1.5, borderBottomColor: ink }
      : variant === "timeline"
      ? { borderBottomWidth: 0.75, borderBottomColor: HAIR }
      : {}; // classic / executive draw their own

  return StyleSheet.create({
    page: {
      paddingVertical: 72,
      paddingHorizontal: 72,
      fontFamily: f.body,
      fontSize: sz(9),
      lineHeight: lh,
      color: "#000000",
    },
    // header — left-aligned block carrying the variant's rule beneath.
    // No alignItems: classic uses headerCenter instead, and "flex-start" here
    // would size the row to its content, collapsing the name column.
    header: {
      marginBottom: 9,
      paddingBottom: 5,
      ...headerRule,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: variant === "classic" ? "center" : "flex-start",
    },
    // Bold — heavy rule under the name block, contact below it
    boldHeaderBlock: {
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: 5,
      borderBottomWidth: 3.5,
      borderBottomColor: ink,
    },
    contactBelow: { fontSize: sz(7.5), color: SUB, marginTop: 4, marginBottom: 9 },
    // Executive — a double rule, drawn as two stacked hairlines
    execRuleThick: { marginTop: 5, borderBottomWidth: 1.25, borderBottomColor: ink },
    execRuleThin: { marginTop: 1.5, borderBottomWidth: 0.75, borderBottomColor: ink, marginBottom: 9 },
    contactSpaced: { fontSize: sz(7.5), color: SUB, lineHeight: 1.35, marginTop: 3 },
    photo: { width: 42, height: 42, borderRadius: 21, objectFit: "cover", marginRight: 9, flexShrink: 0 },
    // Classic: photo beside a centred name/contact column (mirrors Ats001's
    // `flex items-center justify-center` header — never overlaps the name).
    headerCenter: { marginBottom: 9 },
    headerCenterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    // flexBasis 0 keeps the name column inside the page: without it Yoga sizes
    // the column to its widest text and a long name pushes the photo off the
    // left margin and the name past the right one.
    headerCenterCol: { flexGrow: 1, flexShrink: 1, flexBasis: 0, alignItems: "center" },
    headerCol: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
    name: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: sz(variant === "bold" ? 22 : variant === "classic" ? 18 : 19),
      lineHeight: 1.2,
      textTransform: variant === "classic" || variant === "bold" ? "uppercase" : "none",
      letterSpacing:
        variant === "classic" ? 0.9 : variant === "executive" ? 0.6 : variant === "bold" ? 0.4 : 0,
      textAlign: variant === "classic" ? "center" : "left",
      marginBottom: 4,
    },
    contact: {
      fontSize: sz(7.5),
      color: CONTACT,
      lineHeight: 1.35,
      textAlign: variant === "classic" ? "center" : "left",
    },
    headline: {
      fontFamily: f.bodyBold,
      fontSize: sz(variant === "bold" ? 7.5 : 9),
      color: variant === "accent" ? accent : variant === "classic" ? ink : SUB,
      marginTop: 2,
      textAlign: variant === "classic" ? "center" : "left",
      textTransform: variant === "bold" ? "uppercase" : "none",
      letterSpacing: variant === "bold" ? 1.4 : 0,
    },
    // sections — classic and executive use a plain underlined heading
    sectionTitle: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: sz(variant === "executive" ? 9.5 : 10.5),
      textTransform: "uppercase",
      letterSpacing: variant === "executive" ? 1.2 : 0.3,
      paddingBottom: 3,
      marginTop: 12,
      marginBottom: 6,
      borderBottomStyle: "solid",
      ...titleBorder,
    },
    // Accent — heading inside a tinted band with an accent edge
    titleBand: {
      backgroundColor: tintOnWhite(accent, BAND_TINT),
      borderLeftWidth: 3,
      borderLeftColor: accent,
      paddingVertical: 3,
      paddingHorizontal: 5,
      marginTop: 12,
      marginBottom: 6,
    },
    titleBandText: {
      fontFamily: f.headerBold,
      color: accent,
      fontSize: sz(9.5),
      textTransform: "uppercase",
      letterSpacing: 0.7,
    },
    // Bold — underline only as wide as the heading text
    titleUnderlineRow: { flexDirection: "row", marginTop: 12, marginBottom: 6 },
    titleUnderlineText: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: sz(9.5),
      textTransform: "uppercase",
      letterSpacing: 0.7,
      paddingBottom: 2,
      borderBottomWidth: 2.5,
      borderBottomColor: accent,
    },
    // Timeline — a short accent tick before the heading
    titleTickRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 6 },
    titleTick: { width: 9, height: 2.5, backgroundColor: accent, marginRight: 5 },
    titleTickText: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: sz(8.5),
      textTransform: "uppercase",
      letterSpacing: 1.3,
    },
    // Editorial — section label in a left gutter
    railSection: { flexDirection: "row", marginBottom: 10 },
    railLabel: {
      // Wide enough for "CERTIFICATIONS", which is one unbreakable word, and
      // scaled so it still fits at the large font-size setting.
      width: sz(84),
      flexShrink: 0,
      fontFamily: f.headerBold,
      color: accent,
      fontSize: sz(7),
      textTransform: "uppercase",
      letterSpacing: 0.7,
      paddingTop: 1,
      paddingRight: 4,
    },
    // flexBasis 0 is required: without it the column sizes to its content and
    // the nested bullet rows collapse to one word per line.
    railBody: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      borderLeftWidth: 0.75,
      borderLeftColor: HAIR,
      paddingLeft: 9,
    },
    // Timeline — dates in a left column beside each entry
    tlRow: { flexDirection: "row", marginBottom: 7 },
    tlWhen: { width: 56, flexShrink: 0, fontSize: sz(7.5), color: SUB },
    tlBody: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      borderLeftWidth: 0.75,
      borderLeftColor: HAIR,
      paddingLeft: 7,
    },
    summary: {
      fontSize: sz(9),
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
    sub: { fontSize: sz(7.5), color: SUB },
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

type Styles = ReturnType<typeof buildStyles>;

/**
 * Space (in points) that must remain below a heading for it to stay on the
 * page. Less than this and react-pdf moves the heading to the next page with
 * its content, instead of stranding it at the foot of the previous one.
 */
const KEEP_WITH_NEXT = 64;

function SectionTitle({
  children,
  variant,
  styles,
}: {
  children: React.ReactNode;
  variant: Variant;
  styles: Styles;
}) {
  const inner =
    variant === "accent" ? (
      <View style={styles.titleBand}>
        <Text style={styles.titleBandText}>{children}</Text>
      </View>
    ) : variant === "bold" ? (
      <View style={styles.titleUnderlineRow}>
        <Text style={styles.titleUnderlineText}>{children}</Text>
      </View>
    ) : variant === "timeline" ? (
      <View style={styles.titleTickRow}>
        <View style={styles.titleTick} />
        <Text style={styles.titleTickText}>{children}</Text>
      </View>
    ) : (
      <Text style={styles.sectionTitle}>{children}</Text>
    );

  // The break hints live on a plain wrapper: react-pdf mislays a <Text> that
  // carries wrap={false}, and the following block ends up overlapping itself.
  // wrap={false} keeps a heading's rule or accent tick from being left behind
  // on the previous page when only the text moves.
  return (
    <View minPresenceAhead={KEEP_WITH_NEXT} wrap={false}>
      {inner}
    </View>
  );
}

/** Wraps one section: a heading above the body, or a left-gutter label. */
/**
 * Work history is the one section that legitimately outgrows a page. Keeping
 * it atomic would make react-pdf clip it, so it alone may break between
 * entries; every other section moves to the next page whole.
 */
const BREAKABLE_SECTIONS = new Set(["workExperience"]);

function Section({
  label,
  variant,
  styles,
  atomic = true,
  children,
}: {
  label: string;
  variant: Variant;
  styles: Styles;
  atomic?: boolean;
  children: React.ReactNode;
}) {
  if (variant === "editorial") {
    // The gutter is a flex row, and react-pdf overlaps its columns when one
    // breaks across a page, so the whole section moves to the next page
    // instead. That is also what "break between sections" asks for.
    return (
      <View style={styles.railSection} minPresenceAhead={KEEP_WITH_NEXT} wrap={false}>
        <Text style={styles.railLabel}>{label.toUpperCase()}</Text>
        <View style={styles.railBody}>{children}</View>
      </View>
    );
  }
  return (
    <View wrap={!atomic}>
      <SectionTitle variant={variant} styles={styles}>
        {label}
      </SectionTitle>
      {children}
    </View>
  );
}

/** Classic keeps its em dash; the newer templates use an en dash. */
function range(variant: Variant, start?: string, end?: string, isCurrent?: boolean): string {
  const s = start ? formatDate(start) : "";
  const e = isCurrent ? "Present" : end ? formatDate(end) : "";
  const sep = variant === "classic" ? " — " : " – ";
  return s && e ? s + sep + e : s || e;
}

function renderWorkItems(
  items: ResumeData["workExperience"],
  config: TemplateConfig,
  styles: Styles,
  variant: Variant
) {
  // Timeline — one rail row per position, date on the left.
  if (variant === "timeline") {
    return items.map((exp, i) => (
      <View key={exp.id || i}>
        {exp.positions.map((pos, pi) => (
          <View key={pos.id || pi} style={styles.tlRow} wrap={false}>
            <Text style={styles.tlWhen}>
              {range(variant, pos.startDate, pos.endDate, pos.isCurrent)}
            </Text>
            <View style={styles.tlBody}>
              <Text style={styles.bold}>{pos.title}</Text>
              <Text style={styles.sub}>{exp.company}</Text>
              <Bullets bullets={pos.bullets} description={pos.description} config={config} styles={styles} />
            </View>
          </View>
        ))}
      </View>
    ));
  }

  // Editorial leads with the role; the company sits underneath it.
  if (variant === "editorial") {
    return items.map((exp, i) => (
      <View key={exp.id || i} style={styles.itemBlock}>
        {exp.positions.map((pos, pi) => (
          <View key={pos.id || pi} style={styles.mt0} wrap={false}>
            <View style={styles.rowBetween}>
              <Text style={styles.bold}>{pos.title}</Text>
              <Text style={styles.sub}>
                {range(variant, pos.startDate, pos.endDate, pos.isCurrent)}
              </Text>
            </View>
            <Text style={styles.sub}>{exp.company}</Text>
            <Bullets bullets={pos.bullets} description={pos.description} config={config} styles={styles} />
          </View>
        ))}
      </View>
    ));
  }

  return items.map((exp, i) => (
    <View key={exp.id || i} style={styles.itemBlock}>
      <Text style={variant === "classic" ? styles.boldUpper : styles.bold} minPresenceAhead={KEEP_WITH_NEXT}>{exp.company}</Text>
      {exp.positions.map((pos, pi) => (
        <View key={pos.id || pi} style={styles.mt0} wrap={false}>
          <View style={styles.rowBetween}>
            <Text style={styles.bold}>{pos.title}</Text>
            <Text style={styles.sub}>
              {range(variant, pos.startDate, pos.endDate, pos.isCurrent)}
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
  styles: Styles,
  variant: Variant
) {
  return items.map((edu, i) => {
    const when = range(variant, edu.startDate, edu.endDate);
    const gpa = edu.gpa ? (
      <Text style={variant === "classic" ? undefined : styles.sub}>GPA: {formatGpa(edu)}</Text>
    ) : null;
    // Classic keeps its comma; the newer templates read "Degree in Field".
    const degree = `${edu.degree}${
      edu.fieldOfStudy ? `${variant === "classic" ? ", " : " in "}${edu.fieldOfStudy}` : ""
    }`;

    if (variant === "timeline") {
      return (
        <View key={edu.id || i} style={styles.tlRow} wrap={false}>
          <Text style={styles.tlWhen}>{when}</Text>
          <View style={styles.tlBody}>
            <Text style={styles.bold}>{degree}</Text>
            <Text style={styles.sub}>{edu.institution}</Text>
            {gpa}
          </View>
        </View>
      );
    }

    // Editorial leads with the degree; the rest lead with the institution.
    const lead = variant === "editorial" ? degree : edu.institution;
    const follow = variant === "editorial" ? edu.institution : degree;
    return (
      <View key={edu.id || i} style={styles.itemBlockSm} wrap={false}>
        <View style={styles.rowBetween}>
          <Text style={variant === "classic" ? styles.boldUpper : styles.bold}>{lead}</Text>
          <Text style={styles.sub}>{when}</Text>
        </View>
        <Text style={variant === "editorial" ? styles.sub : undefined}>{follow}</Text>
        {gpa}
      </View>
    );
  });
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
  styles: Styles,
  variant: Variant
) {
  return items.map((p, i) => {
    const when = range(variant, p.startDate, p.endDate, p.isCurrent);
    const body = (
      <>
        <Bullets description={p.description} config={config} styles={styles} />
        {p.technologies?.length ? (
          <Text style={styles.sub}>Tech: {p.technologies.join(", ")}</Text>
        ) : null}
      </>
    );

    if (variant === "timeline") {
      return (
        <View key={p.id || i} style={styles.tlRow} wrap={false}>
          <Text style={styles.tlWhen}>{when}</Text>
          <View style={styles.tlBody}>
            <Text style={styles.bold}>{p.name}</Text>
            {body}
          </View>
        </View>
      );
    }

    return (
      <View key={p.id || i} style={styles.itemBlockSm} wrap={false}>
        <View style={styles.rowBetween}>
          <Text style={styles.bold}>{p.name}</Text>
          {when ? <Text style={styles.sub}>{when}</Text> : null}
        </View>
        {body}
      </View>
    );
  });
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
  const contactParts = [
    info.address,
    info.email,
    info.phone,
    info.linkedin,
    info.website,
    availabilityLabel(info),
  ].filter(Boolean);

  // Classic — photo beside a centred name/contact column, mirroring Ats001.
  if (variant === "classic") {
    return (
      <View style={styles.headerCenter}>
        <View style={styles.headerCenterRow}>
          {info.photoUrl ? <Image style={styles.photo} src={info.photoUrl} /> : null}
          <View style={styles.headerCenterCol}>
            <Text style={styles.name}>{info.name}</Text>
            <Text style={styles.contact}>{contactParts.join(" · ")}</Text>
            {info.title ? <Text style={styles.headline}>{info.title}</Text> : null}
          </View>
        </View>
      </View>
    );
  }

  const contact = contactParts.join("  ·  ");
  const photo = info.photoUrl ? <Image style={styles.photo} src={info.photoUrl} /> : null;

  // Bold — heavy rule under the name block, contact below it.
  if (variant === "bold") {
    return (
      <View>
        <View style={styles.boldHeaderBlock}>
          {photo}
          <View style={styles.headerCol}>
            <Text style={styles.name}>{info.name}</Text>
            {info.title ? <Text style={styles.headline}>{info.title}</Text> : null}
          </View>
        </View>
        {contact ? <Text style={styles.contactBelow}>{contact}</Text> : null}
      </View>
    );
  }

  const block = (
    <View style={styles.headerRow}>
      {photo}
      <View style={styles.headerCol}>
        <Text style={styles.name}>{info.name}</Text>
        {info.title ? <Text style={styles.headline}>{info.title}</Text> : null}
        {contact ? <Text style={styles.contactSpaced}>{contact}</Text> : null}
      </View>
    </View>
  );

  // Executive — a double rule beneath the header block.
  if (variant === "executive") {
    return (
      <View>
        {block}
        <View style={styles.execRuleThick} />
        <View style={styles.execRuleThin} />
      </View>
    );
  }

  // Accent / Timeline / Editorial — the rule rides on the header block itself.
  return <View style={styles.header}>{block}</View>;
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

  // react-pdf does not cascade fontSize, so each section that carries an
  // override gets its own StyleSheet. Cached by resolved size+spacing, so a
  // document builds at most a handful. Mirrors <SectionFrame> in the preview.
  const styleCache = new Map<string, Styles>();
  function stylesFor(sectionId: string): Styles {
    const o = config.sectionStyles?.[sectionId as SectionId];
    if (!o || (!o.fontSize && !o.lineSpacing)) return styles;
    const fontSize = o.fontSize ?? config.fontSize;
    const lineSpacing = o.lineSpacing ?? config.lineSpacing;
    const key = `${fontSize}|${lineSpacing}`;
    let cached = styleCache.get(key);
    if (!cached) {
      cached = buildStyles({ ...config, fontSize, lineSpacing }, variant);
      styleCache.set(key, cached);
    }
    return cached;
  }

  function sectionFrame(sectionId: string) {
    const o = config.sectionStyles?.[sectionId as SectionId];
    if (!o || (!o.fontSize && !o.lineSpacing)) return undefined;
    const st = stylesFor(sectionId);
    return { fontSize: st.page.fontSize, lineHeight: st.page.lineHeight };
  }

  // Section *bodies* only — <Section> supplies the heading (or gutter label).
  const renderersFor = (styles: Styles): Record<string, () => React.ReactNode> => ({
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
        <View key="we">{renderWorkItems(resume.workExperience, config, styles, variant)}</View>
      ) : null,

    education: () =>
      hasContent(resume, "education") ? (
        <View key="edu">{renderEducationItems(resume.education, styles, variant)}</View>
      ) : null,

    skills: () =>
      hasContent(resume, "skills") ? (
        <View key="sk">{renderSkillItems(resume.skills, config, styles)}</View>
      ) : null,

    certifications: () =>
      hasContent(resume, "certifications") ? (
        <View key="cert">
          {resume.certifications.map((c, i) => (
            <View key={c.id || i} style={styles.paraSm} wrap={false}>
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
          <Text>
            {resume.languages
              .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
              .join(", ")}
          </Text>
        </View>
      ) : null,

    projects: () =>
      hasContent(resume, "projects") ? (
        <View key="proj">{renderProjectItems(resume.projects, config, styles, variant)}</View>
      ) : null,

    awards: () =>
      hasContent(resume, "awards") ? (
        <View key="aw">
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
              <Section key={s.id} label={s.title} variant={variant} styles={styles}>
                <Text>{s.content}</Text>
              </Section>
            ))}
        </View>
      ) : null,
  });

  function renderCloned(cs: CustomSection) {
    let body: React.ReactNode;
    if (!cs.basedOn || !cs.items?.length) {
      if (!cs.content) return null;
      body = <Text>{cs.content}</Text>;
    } else {
      switch (cs.basedOn) {
        case "workExperience":
          body = renderWorkItems(normalizeWorkExperience(cs.items), config, styles, variant);
          break;
        case "education":
          body = renderEducationItems(cs.items as ResumeData["education"], styles, variant);
          break;
        case "skills":
          body = renderSkillItems(cs.items as ResumeData["skills"], config, styles);
          break;
        case "projects":
          body = renderProjectItems(cs.items as ResumeData["projects"], config, styles, variant);
          break;
        default:
          body = <Text>{cs.content}</Text>;
      }
    }
    return (
      <Section
        key={cs.id}
        label={cs.title}
        variant={variant}
        styles={styles}
        atomic={!BREAKABLE_SECTIONS.has(cs.basedOn ?? "")}
      >
        {body}
      </Section>
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
          const sectionStyles = stylesFor(s);
          const body = renderersFor(sectionStyles)[s]?.();
          if (!body) return null;

          // personalInfo is the header and customSections labels its own
          // entries; everything else gets a heading from <Section>.
          const label =
            s === "personalInfo" || s === "customSections"
              ? null
              : s === "summary"
              ? SUMMARY_LABEL[variant]
              : SECTION_LABELS[s] || s;

          const node =
            label === null ? (
              body
            ) : (
              <Section
                label={label}
                variant={variant}
                styles={sectionStyles}
                atomic={!BREAKABLE_SECTIONS.has(s)}
              >
                {body}
              </Section>
            );

          const frame = sectionFrame(s);
          return frame ? (
            <View key={s} style={frame}>
              {node}
            </View>
          ) : (
            <View key={s}>{node}</View>
          );
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
