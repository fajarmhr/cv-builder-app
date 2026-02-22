"use client";

import { useState, useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
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
} from "lucide-react";
import type { Education } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function EducationEntry({
  entry,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  entry: Education;
  index: number;
  onUpdate: (index: number, data: Education) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const entryRef = useRef(entry);
  entryRef.current = entry;

  const handleFieldChange = useCallback(
    (field: keyof Education, value: string) => {
      const key = `${index}-${field}`;
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(() => {
        onUpdate(index, { ...entryRef.current, [field]: value });
      }, 300);
    },
    [index, onUpdate]
  );

  const header = entry.institution || entry.degree
    ? `${entry.degree || "Degree"} — ${entry.institution || "Institution"}`
    : "New Education";

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
              <Label className="text-xs">Institution</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="University name"
                defaultValue={entry.institution}
                onChange={(e) =>
                  handleFieldChange("institution", e.target.value)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Degree</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="e.g. Bachelor of Science"
                defaultValue={entry.degree}
                onChange={(e) => handleFieldChange("degree", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Field of Study</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="Computer Science"
                defaultValue={entry.fieldOfStudy}
                onChange={(e) =>
                  handleFieldChange("fieldOfStudy", e.target.value)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                className="h-9 text-sm mt-1"
                type="month"
                defaultValue={entry.startDate}
                onChange={(e) =>
                  handleFieldChange("startDate", e.target.value)
                }
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                className="h-9 text-sm mt-1"
                type="month"
                defaultValue={entry.endDate}
                onChange={(e) => handleFieldChange("endDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">GPA (optional)</Label>
            <Input
              className="h-9 text-sm mt-1 max-w-[120px]"
              placeholder="3.8"
              defaultValue={entry.gpa}
              onChange={(e) => handleFieldChange("gpa", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function EducationForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem } = useResumeStore();

  const educations: Education[] = resume?.education || [];

  function handleAdd() {
    addItem("education", {
      id: generateId(),
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      gpa: "",
    } as Education);
  }

  function handleUpdate(index: number, data: Education) {
    updateItem("education", index, data);
  }

  function handleRemove(index: number) {
    removeItem("education", index);
  }

  function handleDuplicate(index: number) {
    duplicateItem("education", index);
  }

  return (
    <div className="space-y-3">
      {educations.map((edu, index) => (
        <EducationEntry
          key={edu.id || index}
          entry={edu}
          index={index}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onDuplicate={handleDuplicate}
        />
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Education
      </Button>
    </div>
  );
}
