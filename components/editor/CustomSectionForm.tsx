"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import type { CustomSection } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function CustomSectionForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem } = useResumeStore();
  const allCustomSections: CustomSection[] = resume?.customSections || [];

  // Build list of plain custom sections with their REAL index in the full array
  const plainSections = allCustomSections
    .map((s, realIndex) => ({ section: s, realIndex }))
    .filter(({ section }) => !section.basedOn);

  function handleAdd() {
    addItem("customSections", {
      id: generateId(),
      title: "",
      content: "",
    } as CustomSection);
  }

  function handleUpdate(realIndex: number, field: keyof CustomSection, value: string) {
    const current = allCustomSections[realIndex];
    updateItem("customSections", realIndex, { ...current, [field]: value });
  }

  function handleRemove(realIndex: number) {
    removeItem("customSections", realIndex);
  }

  return (
    <div className="space-y-3">
      {plainSections.map(({ section, realIndex }) => (
        <div key={section.id || realIndex} className="border rounded-md p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {section.title || "Untitled Section"}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => duplicateItem("customSections", realIndex)}
                title="Duplicate"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleRemove(realIndex)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Section Title</Label>
            <Input
              className="h-8 text-sm mt-1"
              placeholder="e.g. Volunteer Work, Publications, Hobbies"
              defaultValue={section.title}
              onChange={(e) => handleUpdate(realIndex, "title", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder="Enter content for this section..."
              defaultValue={section.content}
              onChange={(e) => handleUpdate(realIndex, "content", e.target.value)}
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Custom Section
      </Button>
    </div>
  );
}
