"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import {
  getAllTemplates,
  DEFAULT_TEMPLATE_CONFIG,
} from "@/components/templates/TemplateRegistry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Check } from "lucide-react";
import { useState } from "react";
import { TemplateThumbnail } from "./TemplateThumbnail";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "ATS", label: "ATS" },
];

export function TemplateSelector() {
  const { resume, setTemplateId } = useResumeStore();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const templates = getAllTemplates();
  const currentId = resume?.templateId || "ats-001";
  const config = resume?.templateConfig || DEFAULT_TEMPLATE_CONFIG;

  const filteredTemplates =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  function handleSelect(id: string) {
    setTemplateId(id);
    setOpen(false);
  }

  return (
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink-2)] shadow-sm hover:bg-[var(--c-surface-2)] hover:text-[var(--c-primary)]">
          <LayoutTemplate className="h-4 w-4" />
          <span className="hidden sm:inline">Template</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border-[var(--c-border)] bg-[var(--c-surface)]">
        <DialogHeader>
          <DialogTitle>Choose Template</DialogTitle>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 border-b border-[var(--c-line)] pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                activeCategory === cat.id
                  ? "bg-[var(--c-primary)] text-[var(--c-on-primary)] font-medium"
                  : "text-[var(--c-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-primary)]"
              }`}
            >
              {cat.label}
              <span className="ml-1 text-xs opacity-70">
                (
                {cat.id === "all"
                  ? templates.length
                  : templates.filter((t) => t.category === cat.id).length}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Template grid with scroll — 3 cols, bigger thumbnails */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2 pr-1 pb-2">
            {filteredTemplates.map((t) => {
              const isActive = t.id === currentId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`group relative rounded-2xl border p-2.5 text-left transition-all hover:shadow-lg ${
                    isActive
                      ? "border-[var(--c-ring)] bg-[var(--c-surface-2)]/70 ring-2 ring-[var(--c-accent)]/30"
                      : "border-[var(--c-border)] hover:border-[var(--c-accent)]/50"
                  }`}
                  style={{ "--thumb-scale": "0.30" } as React.CSSProperties}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 z-10 rounded-full bg-[var(--c-accent)] p-0.5 text-[var(--c-on-primary)]">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}

                  {/* Live mini preview */}
                  <div className="mb-2">
                    {open && (
                      <TemplateThumbnail
                        templateId={t.id}
                        resume={resume}
                        config={config}
                      />
                    )}
                  </div>

                  <p className="truncate text-sm font-semibold text-[var(--c-ink)]">{t.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[var(--c-muted)]">
                    {t.description}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {t.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {t.layoutType === "two-column" ? "2-Col" : "1-Col"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
