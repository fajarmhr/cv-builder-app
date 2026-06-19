"use client";

import { useState, useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import type { WorkExperience, Position } from "@/types/resume";
import { SortableList, SortableItem } from "./SortableList";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function emptyPosition(): Position {
  return {
    id: generateId(),
    title: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
    bullets: [],
  };
}

/* ------------------------- A single position ------------------------- */
function PositionEntry({
  position,
  company,
  handleProps,
  onUpdate,
  onRemove,
}: {
  position: Position;
  company: string;
  handleProps: React.HTMLAttributes<HTMLElement>;
  onUpdate: (data: Position) => void;
  onRemove: () => void;
}) {
  const { enhance, isEnhancing } = useAiEnhance();
  const [previousBullets, setPreviousBullets] = useState<string[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const posRef = useRef(position);
  posRef.current = position;

  const handleField = useCallback(
    (field: keyof Position, value: string | boolean | string[]) => {
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);
      debounceTimers.current[field] = setTimeout(() => {
        onUpdate({ ...posRef.current, [field]: value });
      }, 300);
    },
    [onUpdate]
  );

  async function handleEnhanceBullets() {
    const currentText =
      textareaRef.current?.value ||
      position.bullets?.join("\n") ||
      position.description ||
      "";
    if (!currentText.trim()) return;

    const enhanced = await enhance({
      type: "bullets",
      text: currentText,
      context: { jobTitle: position.title, company },
    });

    if (enhanced) {
      const prevBullets = position.bullets?.length
        ? [...position.bullets]
        : currentText.split("\n").filter(Boolean);
      setPreviousBullets(prevBullets);

      const newBullets = enhanced
        .split("\n")
        .map((l: string) => l.replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean);

      if (textareaRef.current) {
        textareaRef.current.value = newBullets.map((b: string) => `• ${b}`).join("\n");
      }

      onUpdate({
        ...posRef.current,
        bullets: newBullets,
        description: newBullets.map((b: string) => `• ${b}`).join("\n"),
      });
    }
  }

  function handleUndoBullets() {
    if (previousBullets) {
      const text = previousBullets.map((b) => `• ${b}`).join("\n");
      if (textareaRef.current) textareaRef.current.value = text;
      onUpdate({ ...posRef.current, bullets: previousBullets, description: text });
      setPreviousBullets(null);
    }
  }

  const hasBulletContent =
    (position.bullets?.length && position.bullets.some((b) => b.trim())) ||
    position.description?.trim();

  return (
    <div className="border rounded-md bg-muted/20">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span
          {...handleProps}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder position"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 truncate text-xs font-medium">
          {position.title || "New Position"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onRemove}
          title="Remove position"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-3 pt-0 space-y-3">
        <div>
          <Label className="text-xs">Position</Label>
          <Input
            className="h-9 text-sm mt-1"
            placeholder="Job title"
            defaultValue={position.title}
            onChange={(e) => handleField("title", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input
              className="h-9 text-sm mt-1"
              type="month"
              defaultValue={position.startDate}
              onChange={(e) => handleField("startDate", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input
              className="h-9 text-sm mt-1"
              type="month"
              defaultValue={position.endDate}
              disabled={position.isCurrent}
              onChange={(e) => handleField("endDate", e.target.value)}
            />
            <label className="flex items-center gap-1.5 mt-1.5">
              <input
                type="checkbox"
                className="rounded"
                defaultChecked={position.isCurrent}
                onChange={(e) => handleField("isCurrent", e.target.checked)}
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
              position.bullets?.length
                ? position.bullets.map((b) => `• ${b}`).join("\n")
                : position.description || ""
            }
            onChange={(e) => {
              const raw = e.target.value;
              const lines = raw
                .split("\n")
                .map((l) => l.replace(/^[•\-]\s*/, "").trim())
                .filter(Boolean);
              const key = "bulletDesc";
              if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
              debounceTimers.current[key] = setTimeout(() => {
                onUpdate({ ...posRef.current, bullets: lines, description: raw });
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
    </div>
  );
}

/* ------------------- A company with multiple positions ------------------- */
function CompanyEntry({
  id,
  entry,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  id: string;
  entry: WorkExperience;
  index: number;
  onUpdate: (index: number, data: WorkExperience) => void;
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

  const positions = entry.positions || [];
  const posIds = positions.map((p, i) => p.id || `position-${i}`);

  function handleCompanyChange(value: string) {
    if (debounceTimers.current.company) clearTimeout(debounceTimers.current.company);
    debounceTimers.current.company = setTimeout(() => {
      onUpdate(index, { ...entryRef.current, company: value });
    }, 300);
  }

  function updatePosition(posIndex: number, data: Position) {
    onUpdate(index, {
      ...entryRef.current,
      positions: entryRef.current.positions.map((p, i) => (i === posIndex ? data : p)),
    });
  }
  function addPosition() {
    onUpdate(index, {
      ...entryRef.current,
      positions: [...entryRef.current.positions, emptyPosition()],
    });
  }
  function removePosition(posIndex: number) {
    onUpdate(index, {
      ...entryRef.current,
      positions: entryRef.current.positions.filter((_, i) => i !== posIndex),
    });
  }
  function reorderPositions(from: number, to: number) {
    const arr = [...entryRef.current.positions];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onUpdate(index, { ...entryRef.current, positions: arr });
  }

  return (
    <div ref={setNodeRef} style={sortableStyle} className="border rounded-md">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder company"
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
          <span className="truncate">{entry.company || "New Company"}</span>
          <span className="text-xs text-muted-foreground">({positions.length})</span>
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
          <div>
            <Label className="text-xs">Company</Label>
            <Input
              className="h-9 text-sm mt-1"
              placeholder="Company name"
              defaultValue={entry.company}
              onChange={(e) => handleCompanyChange(e.target.value)}
            />
          </div>

          <SortableList ids={posIds} onReorder={reorderPositions}>
            <div className="space-y-2">
              {positions.map((pos, pi) => (
                <SortableItem key={posIds[pi]} id={posIds[pi]}>
                  {({ setNodeRef: pRef, style: pStyle, handleProps }) => (
                    <div ref={pRef} style={pStyle}>
                      <PositionEntry
                        position={pos}
                        company={entry.company}
                        handleProps={handleProps}
                        onUpdate={(data) => updatePosition(pi, data)}
                        onRemove={() => removePosition(pi)}
                      />
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableList>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={addPosition}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Position
          </Button>
        </div>
      )}
    </div>
  );
}

export function ExperienceForm() {
  const { resume, addItem, updateItem, removeItem, duplicateItem, reorderItems } =
    useResumeStore();

  const experiences: WorkExperience[] = resume?.workExperience || [];
  const ids = experiences.map((exp, i) => exp.id || `company-${i}`);

  function handleAdd() {
    addItem("workExperience", {
      id: generateId(),
      company: "",
      positions: [emptyPosition()],
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
      <SortableList
        ids={ids}
        onReorder={(from, to) => reorderItems("workExperience", from, to)}
      >
        <div className="space-y-3">
          {experiences.map((exp, index) => (
            <CompanyEntry
              key={ids[index]}
              id={ids[index]}
              entry={exp}
              index={index}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      </SortableList>
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Experience
      </Button>
    </div>
  );
}
