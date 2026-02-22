"use client";

import { useState, useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { useAiEnhance } from "@/lib/hooks/useAiEnhance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Sparkles,
  Loader2,
  Undo2,
} from "lucide-react";
import type { WorkExperience } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function ExperienceEntry({
  entry,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  entry: WorkExperience;
  index: number;
  onUpdate: (index: number, data: WorkExperience) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { enhance, isEnhancing } = useAiEnhance();
  const [previousBullets, setPreviousBullets] = useState<string[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Use ref to always have the latest entry (avoids stale closure in debounced callbacks)
  const entryRef = useRef(entry);
  entryRef.current = entry;

  const handleFieldChange = useCallback(
    (field: keyof WorkExperience, value: string | boolean | string[]) => {
      const key = `${index}-${field}`;
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(() => {
        onUpdate(index, { ...entryRef.current, [field]: value });
      }, 300);
    },
    [index, onUpdate]
  );

  async function handleEnhanceBullets() {
    const currentText =
      textareaRef.current?.value ||
      entry.bullets?.join("\n") ||
      entry.description ||
      "";
    if (!currentText.trim()) return;

    const enhanced = await enhance({
      type: "bullets",
      text: currentText,
      context: {
        jobTitle: entry.position,
        company: entry.company,
      },
    });

    if (enhanced) {
      // Save previous for undo
      const prevBullets = entry.bullets?.length
        ? [...entry.bullets]
        : currentText.split("\n").filter(Boolean);
      setPreviousBullets(prevBullets);

      // Parse enhanced text into bullets
      const newBullets = enhanced
        .split("\n")
        .map((l: string) => l.replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean);

      // Update textarea display
      if (textareaRef.current) {
        textareaRef.current.value = newBullets
          .map((b: string) => `• ${b}`)
          .join("\n");
      }

      // Update store
      onUpdate(index, {
        ...entry,
        bullets: newBullets,
        description: newBullets.map((b: string) => `• ${b}`).join("\n"),
      });
    }
  }

  function handleUndoBullets() {
    if (previousBullets) {
      const text = previousBullets.map((b) => `• ${b}`).join("\n");
      if (textareaRef.current) {
        textareaRef.current.value = text;
      }
      onUpdate(index, {
        ...entry,
        bullets: previousBullets,
        description: text,
      });
      setPreviousBullets(null);
    }
  }

  const header =
    entry.company || entry.position
      ? `${entry.position || "Untitled"} at ${entry.company || "Company"}`
      : "New Experience";

  const hasBulletContent =
    (entry.bullets?.length && entry.bullets.some((b) => b.trim())) ||
    entry.description?.trim();

  return (
    <div className="border rounded-md">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <button
          className="flex items-center gap-1.5 flex-1 text-sm font-medium text-left"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          <span className="truncate">{header}</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => onDuplicate(index)}
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Company</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="Company name"
                defaultValue={entry.company}
                onChange={(e) => handleFieldChange("company", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Position</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="Job title"
                defaultValue={entry.position}
                onChange={(e) => handleFieldChange("position", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                className="h-9 text-sm mt-1"
                type="month"
                defaultValue={entry.startDate}
                onChange={(e) => handleFieldChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                className="h-9 text-sm mt-1"
                type="month"
                defaultValue={entry.endDate}
                disabled={entry.isCurrent}
                onChange={(e) => handleFieldChange("endDate", e.target.value)}
              />
              <label className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="checkbox"
                  className="rounded"
                  defaultChecked={entry.isCurrent}
                  onChange={(e) =>
                    handleFieldChange("isCurrent", e.target.checked)
                  }
                />
                <span className="text-xs text-muted-foreground">
                  Currently working here
                </span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs">Description / Bullet Points</Label>
              {previousBullets && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={handleUndoBullets}
                  title="Undo AI enhancement"
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  Undo
                </Button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder="• Describe your responsibilities and achievements..."
              defaultValue={
                entry.bullets?.length
                  ? entry.bullets.map((b) => `• ${b}`).join("\n")
                  : entry.description || ""
              }
              onChange={(e) => {
                const raw = e.target.value;
                const lines = raw
                  .split("\n")
                  .map((l) => l.replace(/^[•\-]\s*/, "").trim())
                  .filter(Boolean);
                // Single debounced update for both fields to avoid stale closure race
                const key = `${index}-bulletDesc`;
                if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
                debounceTimers.current[key] = setTimeout(() => {
                  onUpdate(index, { ...entryRef.current, bullets: lines, description: raw });
                }, 300);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1.5 gap-1.5"
              onClick={handleEnhanceBullets}
              disabled={isEnhancing || !hasBulletContent}
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Improve with AI
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExperienceForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem } = useResumeStore();

  const experiences: WorkExperience[] = resume?.workExperience || [];

  function handleAdd() {
    addItem("workExperience", {
      id: generateId(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      bullets: [],
    } as WorkExperience);
  }

  function handleUpdate(index: number, data: WorkExperience) {
    updateItem("workExperience", index, data);
  }

  function handleRemove(index: number) {
    removeItem("workExperience", index);
  }

  function handleDuplicate(index: number) {
    duplicateItem("workExperience", index);
  }

  return (
    <div className="space-y-3">
      {experiences.map((exp, index) => (
        <ExperienceEntry
          key={exp.id || index}
          entry={exp}
          index={index}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onDuplicate={handleDuplicate}
        />
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Experience
      </Button>
    </div>
  );
}
