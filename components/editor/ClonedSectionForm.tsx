"use client";

import { useState, useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import type { SectionId } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

/* ------------------------------------------------------------------ */
/*  Field definitions for each section type                           */
/* ------------------------------------------------------------------ */

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "month" | "textarea" | "checkbox";
  half?: boolean; // render in 2-column grid
}

const SECTION_FIELDS: Record<string, FieldDef[]> = {
  workExperience: [
    { key: "company", label: "Company", half: true },
    { key: "position", label: "Position", half: true },
    { key: "startDate", label: "Start Date", type: "month", half: true },
    { key: "endDate", label: "End Date", type: "month", half: true },
    { key: "isCurrent", label: "Currently working here", type: "checkbox" },
    { key: "description", label: "Description / Bullet Points", type: "textarea" },
  ],
  education: [
    { key: "institution", label: "Institution", half: true },
    { key: "degree", label: "Degree", half: true },
    { key: "fieldOfStudy", label: "Field of Study", half: true },
    { key: "gpa", label: "GPA", half: true },
    { key: "startDate", label: "Start Date", type: "month", half: true },
    { key: "endDate", label: "End Date", type: "month", half: true },
  ],
  skills: [
    { key: "name", label: "Skill Name", half: true },
    { key: "level", label: "Level", half: true },
  ],
  certifications: [
    { key: "name", label: "Certification Name", half: true },
    { key: "issuer", label: "Issuer", half: true },
    { key: "date", label: "Date", half: true },
    { key: "credentialId", label: "Credential ID", half: true },
  ],
  languages: [
    { key: "language", label: "Language", half: true },
    { key: "proficiency", label: "Proficiency", half: true },
  ],
  projects: [
    { key: "name", label: "Project Name" },
    { key: "url", label: "URL" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  awards: [
    { key: "title", label: "Award Title", half: true },
    { key: "issuer", label: "Issuer", half: true },
    { key: "date", label: "Date", half: true },
    { key: "description", label: "Description", type: "textarea" },
  ],
  references: [
    { key: "name", label: "Name", half: true },
    { key: "position", label: "Position", half: true },
    { key: "company", label: "Company", half: true },
    { key: "email", label: "Email", half: true },
    { key: "phone", label: "Phone", half: true },
  ],
};

/** Create a blank item for a given section type */
function createBlankItem(basedOn: string): Record<string, unknown> {
  const item: Record<string, unknown> = { id: generateId() };
  const fields = SECTION_FIELDS[basedOn] || [];
  for (const f of fields) {
    if (f.type === "checkbox") {
      item[f.key] = false;
    } else {
      item[f.key] = "";
    }
  }
  // Special: workExperience needs bullets array
  if (basedOn === "workExperience") {
    item.bullets = [];
  }
  // Special: projects needs technologies array
  if (basedOn === "projects") {
    item.technologies = [];
  }
  return item;
}

/** Get a human-readable header for an item */
function getItemHeader(item: Record<string, unknown>, basedOn: string): string {
  switch (basedOn) {
    case "workExperience": {
      const pos = item.position as string;
      const comp = item.company as string;
      return pos || comp ? `${pos || "Untitled"} at ${comp || "Company"}` : "New Experience";
    }
    case "education": {
      const inst = item.institution as string;
      const deg = item.degree as string;
      return inst || deg ? `${deg || "Degree"} — ${inst || "Institution"}` : "New Education";
    }
    case "skills":
      return (item.name as string) || "New Skill";
    case "certifications":
      return (item.name as string) || "New Certification";
    case "languages":
      return (item.language as string) || "New Language";
    case "projects":
      return (item.name as string) || "New Project";
    case "awards":
      return (item.title as string) || "New Award";
    case "references":
      return (item.name as string) || "New Reference";
    default:
      return "Item";
  }
}

/* ------------------------------------------------------------------ */
/*  Entry component — renders one collapsible item with dynamic fields */
/* ------------------------------------------------------------------ */

function ClonedEntry({
  item,
  index,
  basedOn,
  clonedId,
}: {
  item: Record<string, unknown>;
  index: number;
  basedOn: string;
  clonedId: string;
}) {
  const { updateClonedItem, removeClonedItem, duplicateClonedItem } = useResumeStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const itemRef = useRef(item);
  itemRef.current = item;

  const fields = SECTION_FIELDS[basedOn] || [];
  const header = getItemHeader(item, basedOn);

  const handleChange = useCallback(
    (key: string, value: string | boolean) => {
      const timerKey = `${index}-${key}`;
      if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
      debounceTimers.current[timerKey] = setTimeout(() => {
        updateClonedItem(clonedId, index, { ...itemRef.current, [key]: value });
      }, 300);
    },
    [index, clonedId, updateClonedItem]
  );

  // Group fields into full-width and half-width for grid layout
  const fullFields = fields.filter((f) => !f.half);
  const halfFields = fields.filter((f) => f.half);

  return (
    <div className="border rounded-md">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <button
          className="flex items-center gap-1.5 flex-1 text-sm font-medium text-left min-w-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{header}</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => duplicateClonedItem(clonedId, index)}
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => removeClonedItem(clonedId, index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Half-width fields in grid */}
          {halfFields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {halfFields.map((f) => (
                <FieldInput key={f.key} field={f} value={item[f.key]} onChange={handleChange} />
              ))}
            </div>
          )}

          {/* Full-width fields */}
          {fullFields.map((f) => (
            <FieldInput key={f.key} field={f} value={item[f.key]} onChange={handleChange} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FieldInput — renders a single form field                          */
/* ------------------------------------------------------------------ */

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (key: string, value: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-1.5 mt-1">
        <input
          type="checkbox"
          className="rounded"
          defaultChecked={!!value}
          onChange={(e) => onChange(field.key, e.target.checked)}
        />
        <span className="text-xs text-muted-foreground">{field.label}</span>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <Label className="text-xs">{field.label}</Label>
        <textarea
          className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          placeholder={field.label}
          defaultValue={(value as string) || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div>
      <Label className="text-xs">{field.label}</Label>
      <Input
        className="h-9 text-sm mt-1"
        type={field.type || "text"}
        placeholder={field.label}
        defaultValue={(value as string) || ""}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ClonedSectionForm — main exported component                       */
/* ------------------------------------------------------------------ */

export function ClonedSectionForm({
  clonedId,
  basedOn,
}: {
  clonedId: string;
  basedOn: SectionId;
}) {
  const { resume, addClonedItem, updateClonedTitle } = useResumeStore();
  const cs = resume?.customSections.find((s) => s.id === clonedId);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  if (!cs) return null;

  const items = (cs.items || []) as Record<string, unknown>[];

  const SECTION_LABELS: Record<string, string> = {
    workExperience: "Experience",
    education: "Education",
    skills: "Skill",
    certifications: "Certification",
    languages: "Language",
    projects: "Project",
    awards: "Award",
    references: "Reference",
  };

  return (
    <div className="space-y-3">
      {/* Editable section title */}
      <div>
        <Label className="text-xs">Section Title</Label>
        <Input
          className="h-8 text-sm mt-1"
          placeholder="e.g. Nonformal Education, Volunteer Work"
          defaultValue={cs.title}
          onChange={(e) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              updateClonedTitle(clonedId, e.target.value);
            }, 300);
          }}
        />
      </div>

      {/* Entry list */}
      {items.map((item, index) => (
        <ClonedEntry
          key={(item.id as string) || index}
          item={item}
          index={index}
          basedOn={basedOn}
          clonedId={clonedId}
        />
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => addClonedItem(clonedId, createBlankItem(basedOn))}
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add {SECTION_LABELS[basedOn] || "Item"}
      </Button>
    </div>
  );
}
