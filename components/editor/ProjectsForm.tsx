"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useResumeStore } from "@/lib/store/resume-store";
import { SortableList } from "./SortableList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  X,
} from "lucide-react";
import type { Project } from "@/types/resume";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function ProjectEntry({
  id,
  entry,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  id: string;
  entry: Project;
  index: number;
  onUpdate: (index: number, data: Project) => void;
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
  const [techInput, setTechInput] = useState("");
  function handleFieldChange<K extends keyof Project>(field: K, value: Project[K]) {
    onUpdate(index, { ...entry, [field]: value });
  }

  function addTech() {
    const names = techInput.split(",").map((tech) => tech.trim()).filter(Boolean);
    if (!names.length) return;
    const techs = [...(entry.technologies || []), ...names];
    onUpdate(index, { ...entry, technologies: techs });
    setTechInput("");
  }

  function removeTech(techIndex: number) {
    const techs = entry.technologies.filter((_, i) => i !== techIndex);
    onUpdate(index, { ...entry, technologies: techs });
  }

  function handleTechKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTech();
    }
  }

  const header = entry.name || "New Project";

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
              <Label className="text-xs">Project Name</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="e.g. E-commerce Platform"
                value={entry.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">URL (Optional)</Label>
              <Input
                className="h-9 text-sm mt-1"
                placeholder="https://..."
                value={entry.url || ""}
                onChange={(e) => handleFieldChange("url", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                type="month"
                className="h-9 text-sm mt-1"
                value={entry.startDate || ""}
                onChange={(e) => handleFieldChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                type="month"
                className="h-9 text-sm mt-1"
                value={entry.endDate || ""}
                disabled={entry.isCurrent}
                onChange={(e) => handleFieldChange("endDate", e.target.value)}
              />
              <label className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={!!entry.isCurrent}
                  onChange={(e) => handleFieldChange("isCurrent", e.target.checked)}
                />
                <span className="text-xs text-muted-foreground">
                  Currently working on this project
                </span>
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <textarea
              className="mt-1 w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder="Describe the project..."
              value={entry.description || ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Technologies</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
              {(entry.technologies || []).map((tech, ti) => (
                <Badge key={ti} variant="secondary" className="max-w-full items-center gap-1 whitespace-normal text-xs">
                  <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">{tech}</span>
                  <button className="shrink-0" onClick={() => removeTech(ti)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                className="h-8 text-sm flex-1"
                placeholder="Add technologies, separated by commas"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleTechKeyDown}
              />
              <Button variant="outline" size="sm" className="h-8" onClick={addTech}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectsForm({ clonedId }: { clonedId?: string }) {
  const store = useResumeStore();
  const projects = clonedId
    ? (store.resume?.customSections.find((section) => section.id === clonedId)?.items as Project[] | undefined) || []
    : store.resume?.projects || [];
  const ids = projects.map((it, i) => it.id || `projects-${i}`);

  function handleAdd() {
    const project: Project = {
      id: generateId(),
      name: "",
      description: "",
      url: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      technologies: [],
    };
    if (clonedId) store.addClonedItem(clonedId, project);
    else store.addItem("projects", project);
  }

  function handleUpdate(index: number, data: Project) {
    if (clonedId) store.updateClonedItem(clonedId, index, data);
    else store.updateItem("projects", index, data);
  }

  function handleRemove(index: number) {
    if (clonedId) store.removeClonedItem(clonedId, index);
    else store.removeItem("projects", index);
  }

  function handleDuplicate(index: number) {
    if (clonedId) store.duplicateClonedItem(clonedId, index);
    else store.duplicateItem("projects", index);
  }

  function handleReorder(from: number, to: number) {
    if (clonedId) store.reorderClonedItems(clonedId, from, to);
    else store.reorderItems("projects", from, to);
  }

  return (
    <div className="space-y-3">
      <SortableList ids={ids} onReorder={handleReorder}>
      {projects.map((project, index) => (
        <ProjectEntry
          key={ids[index]}
          id={ids[index]}
          entry={project}
          index={index}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onDuplicate={handleDuplicate}
        />
      ))}
      </SortableList>
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Project
      </Button>
    </div>
  );
}
