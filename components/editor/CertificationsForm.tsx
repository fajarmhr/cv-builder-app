"use client";

import { useState, useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useResumeStore } from "@/lib/store/resume-store";
import { SortableList } from "./SortableList";
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
import type { Certification } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function CertificationEntry({
  id,
  entry,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  id: string;
  entry: Certification;
  index: number;
  onUpdate: (index: number, data: Certification) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const entryRef = useRef(entry);
  entryRef.current = entry;

  const handleFieldChange = useCallback(
    (field: keyof Certification, value: string) => {
      const key = `${index}-${field}`;
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(() => {
        onUpdate(index, { ...entryRef.current, [field]: value });
      }, 300);
    },
    [index, onUpdate]
  );

  const header = entry.name
    ? `${entry.name}${entry.issuer ? ` — ${entry.issuer}` : ""}`
    : "New Certification";

  return (
    <div ref={setNodeRef} style={sortableStyle} className="border rounded-md">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </span>
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
              <Label className="text-xs">Certification Name</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="e.g. AWS Solutions Architect"
                defaultValue={entry.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Issuing Organization</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="e.g. Amazon Web Services"
                defaultValue={entry.issuer}
                onChange={(e) => handleFieldChange("issuer", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                className="h-9 text-sm mt-1"
                type="month"
                defaultValue={entry.date}
                onChange={(e) => handleFieldChange("date", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Credential ID (Optional)</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="e.g. ABC123XYZ"
                defaultValue={entry.credentialId}
                onChange={(e) => handleFieldChange("credentialId", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CertificationsForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem, reorderItems } = useResumeStore();
  const certifications: Certification[] = resume?.certifications || [];
  const ids = certifications.map((it, i) => it.id || `certifications-${i}`);

  function handleAdd() {
    addItem("certifications", {
      id: generateId(),
      name: "",
      issuer: "",
      date: "",
      credentialId: "",
    } as Certification);
  }

  function handleUpdate(index: number, data: Certification) {
    updateItem("certifications", index, data);
  }

  function handleRemove(index: number) {
    removeItem("certifications", index);
  }

  function handleDuplicate(index: number) {
    duplicateItem("certifications", index);
  }

  return (
    <div className="space-y-3">
      <SortableList ids={ids} onReorder={(from, to) => reorderItems("certifications", from, to)}>
      {certifications.map((cert, index) => (
        <CertificationEntry
          key={ids[index]}
          id={ids[index]}
          entry={cert}
          index={index}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onDuplicate={handleDuplicate}
        />
      ))}
      </SortableList>
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Certification
      </Button>
    </div>
  );
}
