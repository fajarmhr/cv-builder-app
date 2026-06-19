"use client";

import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, GripVertical } from "lucide-react";
import type { Language } from "@/types/resume";
import { SortableList, SortableItem } from "./SortableList";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

const PROFICIENCY_LEVELS = ["Native", "Fluent", "Advanced", "Intermediate", "Basic"];

export function LanguagesForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem, reorderItems } =
    useResumeStore();
  const languages: Language[] = resume?.languages || [];
  const ids = languages.map((l, i) => l.id || `language-${i}`);

  function handleAdd() {
    addItem("languages", {
      id: generateId(),
      language: "",
      proficiency: "",
    } as Language);
  }

  function handleUpdate(index: number, field: keyof Language, value: string) {
    const current = languages[index];
    updateItem("languages", index, { ...current, [field]: value });
  }

  function handleRemove(index: number) {
    removeItem("languages", index);
  }

  return (
    <div className="space-y-3">
      <SortableList ids={ids} onReorder={(from, to) => reorderItems("languages", from, to)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {languages.map((lang, index) => (
            <SortableItem key={ids[index]} id={ids[index]}>
              {({ setNodeRef, style, handleProps }) => (
                <div ref={setNodeRef} style={style} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        {...handleProps}
                        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <Label className="text-xs">Language</Label>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => duplicateItem("languages", index)}
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="h-8 text-sm"
                    placeholder="e.g. English"
                    defaultValue={lang.language}
                    onChange={(e) => handleUpdate(index, "language", e.target.value)}
                  />
                  <div>
                    <Label className="text-xs">Proficiency</Label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm mt-1"
                      value={lang.proficiency}
                      onChange={(e) => handleUpdate(index, "proficiency", e.target.value)}
                    >
                      <option value="">Select level</option>
                      {PROFICIENCY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </SortableItem>
          ))}
        </div>
      </SortableList>
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Language
      </Button>
    </div>
  );
}
