import { getTemplateFont } from "@/lib/template-fonts";
import type { TemplateConfig } from "@/types/resume";

const fontFiles = new Map<string, Promise<Buffer>>();

function loadFont(id: string, weight: number): Promise<Buffer> {
  const key = `${id}-${weight}`;
  let pending = fontFiles.get(key);
  if (!pending) {
    pending = fetch(`https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${weight}-normal.ttf`, {
      signal: AbortSignal.timeout(15000),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Unable to load export font ${key}`);
      return Buffer.from(await response.arrayBuffer());
    }).catch((error) => {
      fontFiles.delete(key);
      throw error;
    });
    fontFiles.set(key, pending);
  }
  return pending;
}

/** Embed the same regular/bold font files in PDF and Word exports. */
export async function loadExportFonts(config: TemplateConfig) {
  const families = new Map([config.fontFamily, config.headerFontFamily || config.fontFamily]
    .map((value) => {
      const font = getTemplateFont(value);
      return [font.value, font] as const;
    }));
  const fonts = await Promise.all([...families.values()].flatMap((font) => {
    return [400, 700].map(async (weight) => ({
      name: weight === 700 ? `${font.docxFamily} Bold` : font.docxFamily,
      data: await loadFont(font.value, weight),
    }));
  }));
  return fonts;
}
