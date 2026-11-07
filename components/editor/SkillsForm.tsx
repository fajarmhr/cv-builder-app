"use client";

import { useRef, useCallback, useState } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, GripVertical, ListPlus, ChartNoAxesColumnIncreasing } from "lucide-react";
import type { Skill } from "@/types/resume";
import { SortableList, SortableItem } from "./SortableList";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export function SkillsForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem, reorderItems, updateField } =
    useResumeStore();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [bulkInputs, setBulkInputs] = useState<Record<string, string>>({});

  const skills: Skill[] = resume?.skills || [];
  const ids = skills.map((s, i) => s.id || `skill-${i}`);
  const groups = Array.from(new Set(skills.map((s) => (s.category || "").trim())));
  const groupIds = groups.map((category) => `group:${category}`);
  const handleUpdate = useCallback(
    (index: number, field: keyof Skill, value: string | boolean) => {
      const skill = skills[index];
      if (!skill) return;
      const key = `${skill.id || index}-${field}`;
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(() => {
        const currentSkills = useResumeStore.getState().resume?.skills || [];
        const currentIndex = skill.id ? currentSkills.findIndex((item) => item.id === skill.id) : currentSkills.indexOf(skill);
        const currentSkill = currentSkills[currentIndex];
        if (currentSkill) {
          updateItem("skills", currentIndex, { ...currentSkill, [field]: value });
        }
      }, 300);
    },
    [skills, updateItem]
  );

  function addSkill(category = "") {
    addItem("skills", {
      id: generateId(),
      name: "",
      level: "",
      levelEnabled: false,
      ...(category ? { category } : {}),
    } as Skill);
  }

  function addMany(category: string) {
    const input = bulkInputs[category] || "";
    const names = input.split(/[\n,;]+/).map((name) => name.trim()).filter(Boolean);
    if (!names.length) return;
    names.forEach((name) => addItem("skills", {
      id: generateId(), name, level: "", levelEnabled: false,
      ...(category ? { category } : {}),
    } as Skill));
    setBulkInputs((current) => ({ ...current, [category]: "" }));
  }

  function addCategory() {
    const name = "New Category";
    addItem("skills", {
      id: generateId(), name: "", level: "", levelEnabled: false, category: name,
    } as Skill);
  }

  return (
    <div className="space-y-3">
      {skills.length > 0 && (
        <SortableList ids={groupIds} onReorder={(from, to) => {
          const reordered = [...groups];
          const [moved] = reordered.splice(from, 1);
          reordered.splice(to, 0, moved);
          updateField("skills", reordered.flatMap((category) =>
            skills.filter((skill) => (skill.category || "").trim() === category)
          ));
        }}>
          <div className="space-y-3">
            {groups.map((category) => {
              const entries = skills.map((skill, index) => ({ skill, index }))
                .filter(({ skill }) => (skill.category || "").trim() === category);
              const groupKey = `group:${category}`;
              return (
                <SortableItem key={groupKey} id={groupKey}>
                  {({ setNodeRef, style, handleProps }) => (
                <section ref={setNodeRef} style={style} className="space-y-2 rounded-md border p-2">
                  <div className="flex items-center gap-1.5">
                    <span {...handleProps} className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing" title="Drag to reorder group" aria-label="Drag to reorder group">
                      <GripVertical className="h-4 w-4" />
                    </span>
                  {category ? (
                    <Input
                      className="h-8 text-sm font-semibold"
                      aria-label="Skill category"
                      defaultValue={category}
                      onBlur={(e) => {
                        const nextCategory = e.target.value.trim();
                        entries.forEach(({ skill, index }) => updateItem("skills", index, { ...skill, category: nextCategory }));
                      }}
                    />
                  ) : (
                    <div className="text-sm font-semibold text-muted-foreground">Other Skills</div>
                  )}
                  </div>
                  <SortableList ids={entries.map(({ index }) => ids[index])} onReorder={(from, to) => reorderItems("skills", entries[from].index, entries[to].index)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {entries.map(({ skill, index }) => (
                      <SortableItem key={ids[index]} id={ids[index]}>
                        {({ setNodeRef, style, handleProps }) => (
                          <div ref={setNodeRef} style={style} className={`flex min-w-0 items-center gap-1.5 rounded-md border p-2 ${skill.levelEnabled ?? !!skill.level ? "sm:col-span-2" : ""}`}>
                            <span {...handleProps} className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing" title="Drag to reorder">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <Input className="h-8 min-w-0 flex-1 text-sm" placeholder="Skill name" defaultValue={skill.name} onChange={(e) => handleUpdate(index, "name", e.target.value)} />
                            <Button
                              type="button"
                              variant={skill.levelEnabled ?? !!skill.level ? "secondary" : "ghost"}
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              title={skill.levelEnabled ?? !!skill.level ? "Disable skill level" : "Enable skill level"}
                              aria-label={skill.levelEnabled ?? !!skill.level ? "Disable skill level" : "Enable skill level"}
                              onClick={() => updateItem("skills", index, { ...skill, levelEnabled: !(skill.levelEnabled ?? !!skill.level) })}
                            >
                              <ChartNoAxesColumnIncreasing className="h-3.5 w-3.5" />
                            </Button>
                            {(skill.levelEnabled ?? !!skill.level) && (
                              <select className="h-8 max-w-32 rounded-md border border-input bg-background px-2 text-xs" defaultValue={skill.level} onChange={(e) => handleUpdate(index, "level", e.target.value)}>
                                <option value="">Select level</option>
                                {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                              </select>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => duplicateItem("skills", index)} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => removeItem("skills", index)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </SortableItem>
                    ))}
                  </div>
                  </SortableList>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 min-w-0 flex-1 text-sm"
                      placeholder="Add multiple skills: comma or newline separated"
                      value={bulkInputs[category] || ""}
                      onChange={(e) => setBulkInputs((current) => ({ ...current, [category]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addMany(category); } }}
                    />
                    <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => addMany(category)}><ListPlus className="mr-1 h-4 w-4" />Add list</Button>
                    <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => addSkill(category)}><Plus className="mr-1 h-4 w-4" />One</Button>
                  </div>
                </section>
                  )}
                </SortableItem>
              );
            })}
          </div>
        </SortableList>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => addSkill()}><Plus className="mr-1.5 h-4 w-4" />Add Skill</Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={addCategory}><Plus className="mr-1.5 h-4 w-4" />Add Category</Button>
      </div>
    </div>
  );
}
