"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { TEMPLATE_FONT_OPTIONS, getTemplateFont } from "@/lib/template-fonts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const COLOR_PRESETS = [
  { label: "Ink", value: "#1b2230" },
  { label: "Clay", value: "#a3585c" },
  { label: "Slate", value: "#4f6d9e" },
  { label: "Teal", value: "#3f6f6a" },
  { label: "Sage", value: "#5c7a52" },
  { label: "Plum", value: "#6b4a6b" },
  { label: "Ochre", value: "#c98a3c" },
  { label: "Charcoal", value: "#37414f" },
];

const FONT_SIZE_OPTIONS = [
  { label: "Small (10pt)", value: "small" },
  { label: "Medium (11pt)", value: "medium" },
  { label: "Large (12pt)", value: "large" },
];

const LINE_SPACING_OPTIONS = [
  { label: "Compact (1.2)", value: "compact" },
  { label: "Normal (1.4)", value: "normal" },
  { label: "Relaxed (1.6)", value: "relaxed" },
];

const BULLET_STYLE_OPTIONS = [
  { label: "Disc", value: "disc" },
  { label: "Dash", value: "dash" },
  { label: "Arrow", value: "arrow" },
  { label: "Square", value: "square" },
  { label: "None", value: "none" },
];

const LABEL_CLASS = "mb-2 block text-sm font-semibold text-[var(--c-ink-2)]";
const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3 text-sm font-semibold text-[var(--c-ink)] shadow-sm outline-none focus:border-[var(--c-accent)] focus:ring-2 focus:ring-[var(--c-ring)]/25";

function segmentedClass(isActive: boolean) {
  return `rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? "border-[var(--c-accent)] bg-[var(--c-accent)] text-white"
      : "border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink-2)] hover:bg-[var(--c-surface-2)]"
  }`;
}

export function TemplateCustomizer() {
  const { resume, updateTemplateConfig } = useResumeStore();
  const [open, setOpen] = useState(false);

  const config = resume?.templateConfig || {
    primaryColor: "#1b2230",
    accentColor: "#a3585c",
    fontFamily: "source-sans-3",
    headerFontFamily: "merriweather",
    fontSize: "medium",
    lineSpacing: "normal",
  };
  const bodyFontValue = getTemplateFont(config.fontFamily).value;
  const headerFontValue = getTemplateFont(
    config.headerFontFamily || config.fontFamily
  ).value;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-[var(--c-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-primary)]"
          title="Customize template"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink)] shadow-2xl shadow-[#1b2230]/20">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-[var(--c-ink)]">
            Customize Template
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          <div>
            <Label className={LABEL_CLASS}>Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.value}
                  title={color.label}
                  onClick={() => updateTemplateConfig({ accentColor: color.value })}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    config.accentColor === color.value
                      ? "scale-110 border-[var(--c-ink)] ring-4 ring-[var(--c-accent)]/40"
                      : "border-[var(--c-surface)] hover:scale-105"
                  }`}
                  style={{ background: color.value }}
                />
              ))}
              <input
                type="color"
                value={config.accentColor || "#a3585c"}
                onChange={(e) => updateTemplateConfig({ accentColor: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-full border border-[var(--c-border)] bg-[var(--c-surface)]"
                title="Custom color"
              />
            </div>
          </div>

          <div>
            <Label className={LABEL_CLASS}>Primary / Header Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.slice(0, 5).map((color) => (
                <button
                  key={color.value}
                  title={color.label}
                  onClick={() => updateTemplateConfig({ primaryColor: color.value })}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    config.primaryColor === color.value
                      ? "scale-110 border-[var(--c-ink)] ring-4 ring-[var(--c-accent)]/40"
                      : "border-[var(--c-surface)] hover:scale-105"
                  }`}
                  style={{ background: color.value }}
                />
              ))}
              <input
                type="color"
                value={config.primaryColor || "#1b2230"}
                onChange={(e) => updateTemplateConfig({ primaryColor: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-full border border-[var(--c-border)] bg-[var(--c-surface)]"
                title="Custom color"
              />
            </div>
          </div>

          <div>
            <Label className={LABEL_CLASS}>Body Font</Label>
            <select
              className={FIELD_CLASS}
              value={bodyFontValue}
              onChange={(e) => updateTemplateConfig({ fontFamily: e.target.value })}
            >
              {TEMPLATE_FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className={LABEL_CLASS}>Header Font</Label>
            <select
              className={FIELD_CLASS}
              value={headerFontValue}
              onChange={(e) => updateTemplateConfig({ headerFontFamily: e.target.value })}
            >
              {TEMPLATE_FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className={LABEL_CLASS}>Font Size</Label>
            <div className="flex gap-2">
              {FONT_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateTemplateConfig({ fontSize: option.value })}
                  className={`flex-1 ${segmentedClass(config.fontSize === option.value)}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className={LABEL_CLASS}>Line Spacing</Label>
            <div className="flex gap-2">
              {LINE_SPACING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateTemplateConfig({ lineSpacing: option.value })}
                  className={`flex-1 ${segmentedClass(config.lineSpacing === option.value)}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className={LABEL_CLASS}>Bullet Style</Label>
            <div className="flex flex-wrap gap-2">
              {BULLET_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    updateTemplateConfig({
                      bulletStyle: option.value as "disc" | "dash" | "arrow" | "square" | "none",
                    })
                  }
                  className={segmentedClass((config.bulletStyle || "disc") === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
