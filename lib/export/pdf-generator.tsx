import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  Svg,
  Circle,
  Line,
  Path,
  Rect,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeData, TemplateConfig, CustomSection, SectionId } from "@/types/resume";
import { availabilityLabel, formatGpa } from "@/types/resume";
import {
  formatDate,
  getVisibleSections,
  hasContent,
  groupSkills,
  findCustomSection,
  isCustomSectionId,
  tintOnWhite,
  resumeWithClonedSection,
  FONT_SCALE_MAP,
  LINE_SPACING_MAP,
} from "@/components/templates/template-helpers";
import { getTemplateFont } from "@/lib/template-fonts";
import { loadExportFonts } from "./template-fonts";
import { loadExportPhoto } from "./profile-photo";

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

// Fonts are loaded before rendering so both export formats use the same files.
const registeredFonts = new Set<string>();

function fonts(config: TemplateConfig) {
  const body = getTemplateFont(config.fontFamily).docxFamily;
  const header = getTemplateFont(config.headerFontFamily || config.fontFamily).docxFamily;
  return { body, bodyBold: `${body} Bold`, header, headerBold: `${header} Bold` };
}

// Mirrors FONT_SCALE_MAP / LINE_SPACING_MAP in template-helpers so the export
// honours the same global font-size and line-spacing controls as the preview.

function buildStyles(config: TemplateConfig, variant: Variant) {
  const f = fonts(config);
  const scale = FONT_SCALE_MAP[config.fontSize] ?? 1;
  const sz = (n: number) => Math.round(n * scale * 100) / 100;
  const lh = Number(LINE_SPACING_MAP[config.lineSpacing] ?? 1.4);
  const ink = variant === "classic" ? "#000000" : config.primaryColor || "#1b2230";
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
      marginBottom: variant === "editorial" ? 9 : 0,
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
    contactBelow: { fontSize: sz(7.5), color: SUB, marginTop: 4 },
    // Executive — a double rule, drawn as two stacked hairlines
    execRuleThick: { marginTop: 5, borderBottomWidth: 1.25, borderBottomColor: ink },
    execRuleThin: { marginTop: 1.5, borderBottomWidth: 0.75, borderBottomColor: ink },
    contactSpaced: { fontSize: sz(7.5), color: SUB, lineHeight: 1.35, marginTop: 3 },
    photo: { width: variant === "classic" ? 42 : 39, height: variant === "classic" ? 42 : 39, borderRadius: 21, objectFit: "cover", marginRight: 9, flexShrink: 0 },
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
      fontSize: sz(variant === "bold" ? 22.5 : 18),
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
      fontFamily: variant === "executive" ? f.header : variant === "editorial" ? f.body : f.bodyBold,
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
      fontSize: sz(variant === "classic" ? 10.5 : 9),
      textTransform: "uppercase",
      letterSpacing: variant === "executive" ? 1.2 : 0.3,
      paddingBottom: 3,
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
    },
    titleBandText: {
      fontFamily: f.headerBold,
      color: accent,
      fontSize: sz(9),
      textTransform: "uppercase",
      letterSpacing: 0.7,
    },
    // Bold — underline only as wide as the heading text
    titleUnderlineRow: { flexDirection: "row" },
    titleUnderlineText: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: sz(9),
      textTransform: "uppercase",
      letterSpacing: 0.7,
      paddingBottom: 2,
      borderBottomWidth: 2.5,
      borderBottomColor: accent,
    },
    // Timeline — a short accent tick before the heading
    titleTickRow: { flexDirection: "row", alignItems: "center" },
    titleTick: { width: 9, height: 2.5, backgroundColor: accent, marginRight: 5 },
    titleTickText: {
      fontFamily: f.headerBold,
      color: ink,
      fontSize: sz(7.5),
      textTransform: "uppercase",
      letterSpacing: 1.3,
    },
    // Editorial — section label in a left gutter
    railSection: { position: "relative", marginBottom: 9 },
    railLabel: {
      // Wide enough for "CERTIFICATIONS", which is one unbreakable word, and
      // scaled so it still fits at the large font-size setting.
      position: "absolute",
      width: 63,
      flexShrink: 0,
      fontFamily: f.bodyBold,
      color: accent,
      fontSize: sz(6.75),
      textTransform: "uppercase",
      letterSpacing: 0.7,
      paddingTop: 1,
      paddingRight: 4,
    },
    railBody: {
      marginLeft: 72,
      borderLeftWidth: 0.75,
      borderLeftColor: HAIR,
      paddingLeft: 9,
    },
    // Timeline — dates in a left column beside each entry
    tlWhen: { width: 64.5, flexShrink: 0, fontSize: sz(7.5), color: SUB },
    tlLead: { flexGrow: 1, flexShrink: 1, flexBasis: 0, borderLeftWidth: 0.75, borderLeftColor: HAIR, paddingLeft: 7 },
    tlBody: {
      marginLeft: 64.5,
      borderLeftWidth: 0.75,
      borderLeftColor: HAIR,
      paddingLeft: 7,
    },
    summary: {
      fontSize: sz(9),
      textAlign: variant === "classic" ? "justify" : "left",
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
    bulletRow: { marginTop: 1.5 },
    bulletMarker: { position: "absolute", left: 0, top: 0, width: 9 },
    bulletText: { marginLeft: 9 },
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
  return (
    <View style={styles.mt0}>
      {lines.map((b, i) => (
        <PdfBullet key={i} bulletStyle={config.bulletStyle} styles={styles}>{b}</PdfBullet>
      ))}
    </View>
  );
}

type Styles = ReturnType<typeof buildStyles>;

/** Vector markers work even when the selected font lacks bullet glyphs. */
function PdfBullet({ bulletStyle, styles, children }: {
  bulletStyle: TemplateConfig["bulletStyle"];
  styles: Styles;
  children: string;
}) {
  if (bulletStyle === "none") return <Text style={styles.mt0}>{children}</Text>;
  const fontSize = styles.page.fontSize;
  const lineHeight = fontSize * styles.page.lineHeight;
  const center = lineHeight / 2;
  const size = fontSize / 3;
  let marker: React.ReactNode;
  switch (bulletStyle) {
    case "dash":
      marker = <Line x1={0} y1={center} x2={size * 1.5} y2={center} stroke="#000000" strokeWidth={0.75} />;
      break;
    case "arrow":
      marker = <Path d={`M 0 ${center - size} L ${size * 1.5} ${center} L 0 ${center + size} Z`} fill="#000000" />;
      break;
    case "square":
      marker = <Rect x={0} y={center - size / 2} width={size} height={size} fill="#000000" />;
      break;
    default:
      marker = <Circle cx={size / 2} cy={center} r={size / 2} fill="#000000" />;
  }
  // Text comes first so pagination moves the marker with it when no line fits.
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletText} orphans={1} widows={1}>{children}</Text>
      <Svg width={9} height={lineHeight} style={styles.bulletMarker} viewBox={`0 0 9 ${lineHeight}`}>
        {marker}
      </Svg>
    </View>
  );
}

/** Keep a timeline date with its heading while the description flows across pages. */
function TimelineEntry({ when, heading, children, styles, last }: {
  when: string;
  heading: React.ReactNode;
  children?: React.ReactNode;
  styles: Styles;
  last: boolean;
}) {
  return (
    <>
      <View style={{ flexDirection: "row" }} wrap={false}>
        <Text style={styles.tlWhen}>{when}</Text>
        <View style={styles.tlLead}>{heading}</View>
      </View>
      {children && <View style={styles.tlBody}>{children}</View>}
      {!last && <View style={{ height: 7.5 }} />}
    </>
  );
}

/**
 * Space (in points) that must remain below a heading for it to stay on the
 * page. Less than this and react-pdf moves the heading to the next page with
 * its content, instead of stranding it at the foot of the previous one.
 */
const KEEP_WITH_NEXT = 32;

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

  return (
    <View style={{ marginTop: 12, marginBottom: 6 }} minPresenceAhead={KEEP_WITH_NEXT} wrap={false}>
      {inner}
    </View>
  );
}

/** Wraps one section: a heading above the body, or a left-gutter label. */

function Section({
  label,
  variant,
  styles,
  children,
}: {
  label: string;
  variant: Variant;
  styles: Styles;
  children: React.ReactNode;
}) {
  if (variant === "editorial") {
    return (
      <View style={[{ fontSize: styles.page.fontSize, lineHeight: styles.page.lineHeight }, styles.railSection]}>
        <Text style={styles.railLabel}>{label.toUpperCase()}</Text>
        <View style={styles.railBody}>{children}</View>
      </View>
    );
  }
  return (
    <View style={{ fontSize: styles.page.fontSize, lineHeight: styles.page.lineHeight }}>
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
  const sep = variant === "classic" ? " — " : variant === "timeline" ? " –\n" : " – ";
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
    return items.flatMap((exp, i) =>
      exp.positions.map((pos, pi) => (
          <TimelineEntry
            key={`${exp.id || i}-${pos.id || pi}`}
            when={range(variant, pos.startDate, pos.endDate, pos.isCurrent)}
            styles={styles}
            last={i === items.length - 1 && pi === exp.positions.length - 1}
            heading={<>
              <Text style={styles.bold}>{pos.title}</Text>
              <Text style={styles.sub}>{exp.company}</Text>
            </>}
          >
            <Bullets bullets={pos.bullets} description={pos.description} config={config} styles={styles} />
          </TimelineEntry>
      ))
    );
  }

  // Editorial leads with the role; the company sits underneath it.
  if (variant === "editorial") {
    return items.map((exp, i) => (
      <View key={exp.id || i} style={styles.itemBlock}>
        {exp.positions.map((pos, pi) => (
          <View key={pos.id || pi} style={styles.mt0}>
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
    <View key={exp.id || i} style={[styles.itemBlock, i === items.length - 1 ? { marginBottom: 0 } : {}]}>
      <Text style={variant === "classic" ? styles.boldUpper : styles.bold}>{exp.company}</Text>
      {exp.positions.map((pos, pi) => (
        <View key={pos.id || pi} style={styles.mt0}>
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
        <TimelineEntry key={edu.id || i} when={when} styles={styles} last={i === items.length - 1} heading={<>
            <Text style={styles.bold}>{degree}</Text>
            <Text style={styles.sub}>{edu.institution}</Text>
            {gpa}
        </>} />
      );
    }

    // Editorial leads with the degree; the rest lead with the institution.
    const lead = variant === "editorial" ? degree : edu.institution;
    const follow = variant === "editorial" ? edu.institution : degree;
    return (
      <View key={edu.id || i} style={[styles.itemBlockSm, i === items.length - 1 && variant !== "editorial" ? { marginBottom: 0 } : {}]}>
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
    `${s.name}${s.level && s.levelEnabled !== false ? ` (${s.level})` : ""}`;
  const groups = groupSkills(items);
  const grouped = groups.length > 1 || (groups.length === 1 && !!groups[0].category);

  if (grouped) {
    return (
      <View style={styles.mt0}>
        {groups.map((g, gi) => (
          <Text key={gi} style={gi === groups.length - 1 ? undefined : styles.paraSm}>
            {g.category ? <Text style={styles.bold}>{g.category}: </Text> : null}
            {g.items.map(fmt).join(", ")}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.mt0}>
      {items.map((s, i) => (
        <PdfBullet key={s.id || i} bulletStyle={config.bulletStyle} styles={styles}>{fmt(s)}</PdfBullet>
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
        <TimelineEntry key={p.id || i} when={when} styles={styles} last={i === items.length - 1} heading={<Text style={styles.bold}>{p.name}</Text>}>
          {body}
        </TimelineEntry>
      );
    }

    return (
      <View key={p.id || i} style={[styles.itemBlockSm, i === items.length - 1 && variant !== "editorial" ? { marginBottom: 0 } : {}]}>
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
  const renderersFor = (styles: Styles, resumeData = resume): Record<string, () => React.ReactNode> => {
    const resume = resumeData;
    return {
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
        renderWorkItems(resume.workExperience, config, styles, variant)
      ) : null,

    education: () =>
      hasContent(resume, "education") ? (
        renderEducationItems(resume.education, styles, variant)
      ) : null,

    skills: () =>
      hasContent(resume, "skills") ? (
        <View key="sk">{renderSkillItems(resume.skills, config, styles)}</View>
      ) : null,

    certifications: () =>
      hasContent(resume, "certifications") ? (
        <View key="cert">
          {resume.certifications.map((c, i) => (
            <View key={c.id || i} style={i === resume.certifications.length - 1 ? undefined : styles.paraSm}>
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
        renderProjectItems(resume.projects, config, styles, variant)
      ) : null,

    awards: () =>
      hasContent(resume, "awards") ? (
        <View key="aw">
          {resume.awards.map((a, i) => (
            <Text key={a.id || i} style={i === resume.awards.length - 1 ? undefined : styles.paraSm}>
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
            <Text key={r.id || i} style={i === resume.references.length - 1 ? undefined : styles.paraSm}>
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
    };
  };

  function renderCloned(cs: CustomSection) {
    const cloneStyles = stylesFor(cs.basedOn || "customSections");
    let body: React.ReactNode;
    if (!cs.basedOn || !cs.items?.length) {
      if (!cs.content) return null;
      body = <Text>{cs.content}</Text>;
    } else {
      body = renderersFor(cloneStyles, resumeWithClonedSection(resume, cs))[cs.basedOn]?.();
    }
    const node = (
      <Section
        key={cs.id}
        label={cs.title}
        variant={variant}
        styles={cloneStyles}
      >
        {body}
      </Section>
    );
    return node;
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
          const label = s === "personalInfo" || s === "customSections"
            ? null
            : config.sectionTitles?.[s as SectionId] || (s === "summary"
              ? SUMMARY_LABEL[variant]
              : SECTION_LABELS[s] || s);

          const node =
            label === null ? (
              body
            ) : (
              <Section
                key={s}
                label={label}
                variant={variant}
                styles={sectionStyles}
              >
                {body}
              </Section>
            );

          return label === null ? <View key={s} style={sectionFrame(s)}>{node}</View> : node;
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
  const [exportFonts, photo] = await Promise.all([
    loadExportFonts(config),
    loadExportPhoto(resume.personalInfo?.photoUrl),
  ]);
  for (const font of exportFonts) {
    if (!registeredFonts.has(font.name)) {
      Font.register({ family: font.name, src: `data:font/ttf;base64,${font.data.toString("base64")}` });
      registeredFonts.add(font.name);
    }
  }
  const pdfResume = photo && resume.personalInfo ? {
    ...resume,
    personalInfo: { ...resume.personalInfo, photoUrl: `data:image/png;base64,${photo.toString("base64")}` },
  } : resume;
  return renderToBuffer(
    <ResumePdfDocument resume={pdfResume} config={config} variant={variant} />
  );
}

export function pdfFilename(resume: ResumeData): string {
  const safe = (resume.personalInfo?.name || resume.title || "Resume")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `CV_${safe || "Resume"}.pdf`;
}
