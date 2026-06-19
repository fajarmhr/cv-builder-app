"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/editor/ShareDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllTemplates } from "@/components/templates/TemplateRegistry";
import { Pencil, Copy, Trash2, MoreHorizontal } from "lucide-react";

interface ResumeCardProps {
  id: string;
  title: string;
  templateId: string;
  personName: string | null;
  updatedAt: string;
  index?: number;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTitleChange: (id: string, newTitle: string) => void;
}

const TEMPLATE_NAMES: Record<string, string> = Object.fromEntries(
  getAllTemplates().map((t) => [t.id, t.name])
);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Tiny decorative résumé glyph shown at the start of each row. */
function MiniPaper() {
  return (
    <div className="hidden h-16 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--c-border)] bg-[var(--c-surface)] shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 sm:block">
      <div className="space-y-[3px] p-2">
        <div className="h-[3px] w-3/5 rounded-full bg-[var(--c-ink)]/35" />
        <div className="mt-1.5 h-[2px] w-full rounded-full bg-[var(--c-ink)]/12" />
        <div className="h-[2px] w-4/5 rounded-full bg-[var(--c-ink)]/12" />
        <div className="mt-1.5 h-[2px] w-2/5 rounded-full bg-[var(--c-accent)]/60" />
        <div className="h-[2px] w-full rounded-full bg-[var(--c-ink)]/12" />
        <div className="h-[2px] w-3/4 rounded-full bg-[var(--c-ink)]/12" />
      </div>
    </div>
  );
}

export function ResumeCard({
  id,
  title,
  templateId,
  personName,
  updatedAt,
  index = 0,
  onDuplicate,
  onDelete,
  onTitleChange,
}: ResumeCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleTitleSave() {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange(id, trimmed);
    } else {
      setEditTitle(title);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleTitleSave();
    if (e.key === "Escape") {
      setEditTitle(title);
      setIsEditing(false);
    }
  }

  const templateName = TEMPLATE_NAMES[templateId] || templateId.toUpperCase();

  return (
    <>
      <div
        className="reveal-up group flex items-center gap-4 rounded-xl border-b border-[var(--c-line)] px-2 py-5 transition-colors duration-300 hover:bg-[var(--c-surface)]"
        style={{ "--i": index } as React.CSSProperties}
      >
        <MiniPaper />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              className="w-full max-w-md border-b border-[var(--c-ring)] bg-transparent text-xl font-medium text-[var(--c-ink)] outline-none"
              style={{ fontFamily: "var(--font-grotesk)" }}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <h3
              className="cursor-pointer truncate text-xl font-medium tracking-[-0.01em] text-[var(--c-ink)]"
              style={{ fontFamily: "var(--font-grotesk)" }}
              onClick={() => router.push(`/editor/${id}`)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Click to open · double-click to rename"
            >
              {title}
            </h3>
          )}
          <div className="mt-1.5 font-mono text-xs text-[var(--c-muted-2)]">
            {templateName} · {personName ? `${personName} · ` : ""}updated{" "}
            {formatDate(updatedAt)}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ShareDialog resumeId={id} />
          <Button
            size="sm"
            className="rounded-full bg-[var(--c-primary)] px-5 font-semibold text-[var(--c-on-primary)] hover:bg-[var(--c-primary-hover)]"
            onClick={() => router.push(`/editor/${id}`)}
          >
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-[var(--c-muted-2)] hover:bg-[var(--c-surface-3)] hover:text-[var(--c-ink)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/editor/${id}`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete résumé</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
