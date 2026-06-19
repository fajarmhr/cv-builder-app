"use client";

import { useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, GripVertical } from "lucide-react";
import type { Skill } from "@/types/resume";
import { SortableList, SortableItem } from "./SortableList";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export function SkillsForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem, reorderItems } =
    useResumeStore();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const skills: Skill[] = resume?.skills || [];
  const ids = skills.map((s, i) => s.id || `skill-${i}`);
  const categories = Array.from(
    new Set(skills.map((s) => (s.category || "").trim()).filter(Boolean))
  );

  const handleUpdate = useCallback(
    (index: number, field: keyof Skill, value: string) => {
      const key = `${index}-${field}`;
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(() => {
        const currentSkill = skills[index];
        if (currentSkill) {
          updateItem("skills", index, { ...currentSkill, [field]: value });
        }
      }, 300);
    },
    [skills, updateItem]
  );

  function handleAdd() {
    addItem("skills", {
      id: generateId(),
      name: "",
      level: "Intermediate",
    } as Skill);
  }

  return (
    <div className="space-y-2">
      <datalist id="skill-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <SortableList ids={ids} onReorder={(from, to) => reorderItems("skills", from, to)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {skills.map((skill, index) => (
            <SortableItem key={ids[index]} id={ids[index]}>
              {({ setNodeRef, style, handleProps }) => (
                <div
                  ref={setNodeRef}
                  style={style}
                  className="border rounded-md p-2 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                  <span
                    {...handleProps}
                    className="cursor-grab touch-none shrink-0 text-muted-foreground active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <Input
                    className="h-8 text-sm flex-1"
                    placeholder="Skill name"
                    defaultValue={skill.name}
                    onChange={(e) => handleUpdate(index, "name", e.target.value)}
                  />
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    defaultValue={skill.level}
                    onChange={(e) => handleUpdate(index, "level", e.target.value)}
                  >
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => duplicateItem("skills", index)}
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeItem("skills", index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  </div>
                  <Input
                    list="skill-categories"
                    className="h-7 text-xs"
                    placeholder="Category (optional) — e.g. Cloud & Virtualization"
                    defaultValue={skill.category || ""}
                    onChange={(e) => handleUpdate(index, "category", e.target.value)}
                  />
                </div>
              )}
            </SortableItem>
          ))}
        </div>
      </SortableList>
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Skill
      </Button>
    </div>
  );
}
