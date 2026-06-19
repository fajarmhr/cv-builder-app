export interface TemplateFontOption {
  label: string;
  value: string;
  cssFamily: string;
  docxFamily: string;
  category: "sans" | "serif";
}

export const TEMPLATE_FONT_OPTIONS: TemplateFontOption[] = [
  {
    label: "Roboto",
    value: "roboto",
    cssFamily: "'Roboto', Arial, sans-serif",
    docxFamily: "Roboto",
    category: "sans",
  },
  {
    label: "Open Sans",
    value: "open-sans",
    cssFamily: "'Open Sans', Arial, sans-serif",
    docxFamily: "Open Sans",
    category: "sans",
  },
  {
    label: "Lato",
    value: "lato",
    cssFamily: "'Lato', Arial, sans-serif",
    docxFamily: "Lato",
    category: "sans",
  },
  {
    label: "Source Sans 3",
    value: "source-sans-3",
    cssFamily: "'Source Sans 3', Arial, sans-serif",
    docxFamily: "Source Sans 3",
    category: "sans",
  },
  {
    label: "Noto Sans",
    value: "noto-sans",
    cssFamily: "'Noto Sans', Arial, sans-serif",
    docxFamily: "Noto Sans",
    category: "sans",
  },
  {
    label: "Inter",
    value: "inter",
    cssFamily: "'Inter', Arial, sans-serif",
    docxFamily: "Inter",
    category: "sans",
  },
  {
    label: "IBM Plex Sans",
    value: "ibm-plex-sans",
    cssFamily: "'IBM Plex Sans', Arial, sans-serif",
    docxFamily: "IBM Plex Sans",
    category: "sans",
  },
  {
    label: "Work Sans",
    value: "work-sans",
    cssFamily: "'Work Sans', Arial, sans-serif",
    docxFamily: "Work Sans",
    category: "sans",
  },
  {
    label: "Montserrat",
    value: "montserrat",
    cssFamily: "'Montserrat', Arial, sans-serif",
    docxFamily: "Montserrat",
    category: "sans",
  },
  {
    label: "Merriweather",
    value: "merriweather",
    cssFamily: "'Merriweather', Georgia, serif",
    docxFamily: "Merriweather",
    category: "serif",
  },
  {
    label: "Libre Baskerville",
    value: "libre-baskerville",
    cssFamily: "'Libre Baskerville', Georgia, serif",
    docxFamily: "Libre Baskerville",
    category: "serif",
  },
  {
    label: "EB Garamond",
    value: "eb-garamond",
    cssFamily: "'EB Garamond', Georgia, serif",
    docxFamily: "EB Garamond",
    category: "serif",
  },
  {
    label: "Crimson Text",
    value: "crimson-text",
    cssFamily: "'Crimson Text', Georgia, serif",
    docxFamily: "Crimson Text",
    category: "serif",
  },
  {
    label: "Cormorant Garamond",
    value: "cormorant-garamond",
    cssFamily: "'Cormorant Garamond', Georgia, serif",
    docxFamily: "Cormorant Garamond",
    category: "serif",
  },
];

export function getTemplateFont(value?: string): TemplateFontOption {
  return (
    TEMPLATE_FONT_OPTIONS.find((font) => font.value === value) ||
    TEMPLATE_FONT_OPTIONS[0]
  );
}
