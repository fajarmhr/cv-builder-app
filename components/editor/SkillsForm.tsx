"use client";

import { useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import type { Skill } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export function SkillsForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem } = useResumeStore();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const skills: Skill[] = resume?.skills || [];

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {skills.map((skill, index) => (
          <div
            key={skill.id || index}
            className="flex items-center gap-1.5 border rounded-md p-2"
          >
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
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Skill
      </Button>
    </div>
  );
}
