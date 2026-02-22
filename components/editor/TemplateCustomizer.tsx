"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { useState } from "react";

const COLOR_PRESETS = [
  { label: "Navy", value: "#1e3a5f" },
  { label: "Black", value: "#1a1a1a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Burgundy", value: "#881337" },
  { label: "Forest", value: "#166534" },
  { label: "Blue", value: "#2563eb" },
  { label: "Slate", value: "#475569" },
  { label: "Purple", value: "#7c3aed" },
];

const FONT_OPTIONS = [
  { label: "Inter", value: "inter" },
  { label: "Lato", value: "lato" },
  { label: "Raleway", value: "raleway" },
  { label: "Montserrat", value: "montserrat" },
  { label: "Roboto", value: "roboto" },
  { label: "Garamond", value: "garamond" },
  { label: "Calibri", value: "calibri" },
  { label: "Arial", value: "arial" },
  { label: "Georgia", value: "georgia" },
  { label: "Times New Roman", value: "times-new-roman" },
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
  { label: "● Disc", value: "disc" },
  { label: "– Dash", value: "dash" },
  { label: "▸ Arrow", value: "arrow" },
  { label: "▪ Square", value: "square" },
  { label: "None", value: "none" },
];

export function TemplateCustomizer() {
  const { resume, updateTemplateConfig } = useResumeStore();
  const [open, setOpen] = useState(false);

  const config = resume?.templateConfig || {
    primaryColor: "#1a1a1a",
    accentColor: "#2563eb",
    fontFamily: "sans-serif",
    fontSize: "medium",
    lineSpacing: "normal",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Customize template">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {/* Accent Color */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => updateTemplateConfig({ accentColor: c.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    config.accentColor === c.value
                      ? "border-primary scale-110 ring-2 ring-primary/30"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
              <input
                type="color"
                value={config.accentColor || "#2563eb"}
                onChange={(e) => updateTemplateConfig({ accentColor: e.target.value })}
                className="w-8 h-8 rounded-full cursor-pointer border"
                title="Custom color"
              />
            </div>
          </div>

          {/* Primary Color (header) */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Primary / Header Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.slice(0, 5).map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => updateTemplateConfig({ primaryColor: c.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    config.primaryColor === c.value
                      ? "border-primary scale-110 ring-2 ring-primary/30"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
              <input
                type="color"
                value={config.primaryColor || "#1a1a1a"}
                onChange={(e) => updateTemplateConfig({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded-full cursor-pointer border"
                title="Custom color"
              />
            </div>
          </div>

          {/* Font Family */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Font Family</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={config.fontFamily || "sans-serif"}
              onChange={(e) => updateTemplateConfig({ fontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Font Size</Label>
            <div className="flex gap-2">
              {FONT_SIZE_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => updateTemplateConfig({ fontSize: f.value })}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                    config.fontSize === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Line Spacing</Label>
            <div className="flex gap-2">
              {LINE_SPACING_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => updateTemplateConfig({ lineSpacing: l.value })}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                    config.lineSpacing === l.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bullet Style */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Bullet Style</Label>
            <div className="flex flex-wrap gap-2">
              {BULLET_STYLE_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => updateTemplateConfig({ bulletStyle: b.value as "disc" | "dash" | "arrow" | "square" | "none" })}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    (config.bulletStyle || "disc") === b.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
