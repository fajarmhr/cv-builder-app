"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useResumeStore } from "@/lib/store/resume-store";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { SectionEditor } from "@/components/editor/SectionEditor";
import { CVPreview } from "@/components/preview/CVPreview";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Check,
  Loader2,
  AlertCircle,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateSelector } from "@/components/editor/TemplateSelector";
import { TemplateCustomizer } from "@/components/editor/TemplateCustomizer";
import { CVPhotoControl } from "@/components/editor/CVPhotoControl";
import { ShareDialog } from "@/components/editor/ShareDialog";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    resume,
    isDirty,
    isSaving,
    lastSaved,
    canUndo,
    canRedo,
    loadResume,
    updateTitle,
    save,
    undo,
    redo,
  } = useResumeStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Auto-save
  useAutoSave();

  // Load resume
  useEffect(() => {
    async function load() {
      try {
        await loadResume(id);
      } catch {
        setError("Resume not found");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, loadResume]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && e.key === "s") {
        e.preventDefault();
        save().catch(() => toast.error("Failed to save"));
      }
      if (isCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (isCmd && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    },
    [save, undo, redo]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Export DOCX
  async function handleExportDocx() {
    if (!resume) return;
    setIsExporting(true);
    try {
      if (isDirty) await save();
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `CV_${resume.id}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("DOCX exported successfully!");
    } catch {
      toast.error("Failed to export DOCX");
    } finally {
      setIsExporting(false);
    }
  }

  // Export PDF
  async function handleExportPdf() {
    if (!resume) return;
    setIsExportingPdf(true);
    try {
      if (isDirty) await save();
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `CV_${resume.id}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  }

  // Title editing
  function startEditTitle() {
    setEditTitleValue(resume?.title || "");
    setIsEditingTitle(true);
  }

  function saveTitleEdit() {
    const trimmed = editTitleValue.trim();
    if (trimmed && trimmed !== resume?.title) {
      updateTitle(trimmed);
    }
    setIsEditingTitle(false);
  }

  // Save status text
  function getSaveStatus() {
    if (isSaving)
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </span>
      );
    if (isDirty)
      return (
        <span className="flex items-center gap-1 text-xs text-orange-500">
          <AlertCircle className="h-3 w-3" />
          Unsaved changes
        </span>
      );
    if (lastSaved)
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          Saved
        </span>
      );
    return null;
  }

  if (isLoading) {
    return (
      <div className="dashboard-shell flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--c-accent)]" />
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="dashboard-shell flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-[var(--c-muted)]">{error || "Resume not found"}</p>
        <Button className="rounded-full bg-[var(--c-primary)] text-[var(--c-on-primary)] hover:bg-[var(--c-primary-hover)]" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="dashboard-shell flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface)]/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full text-[var(--c-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-primary)]"
            onClick={async () => {
              if (isDirty) {
                try { await save(); } catch { /* best effort */ }
              }
              router.push("/dashboard");
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {isEditingTitle ? (
            <input
              className="min-w-0 border-b border-[var(--c-ring)] bg-transparent font-semibold text-[var(--c-ink)] outline-none"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={saveTitleEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitleEdit();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              autoFocus
            />
          ) : (
            <h1
              className="cursor-pointer truncate font-semibold text-[var(--c-ink)] transition-colors hover:text-[var(--c-primary)]"
              onDoubleClick={startEditTitle}
              title="Double-click to rename"
            >
              {resume.title}
            </h1>
          )}

          {getSaveStatus()}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <TemplateSelector />
          <TemplateCustomizer />
          <CVPhotoControl />
          <div className="mx-1 h-5 w-px bg-[var(--c-border)]" />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-[var(--c-muted)] hover:bg-[var(--c-surface-3)] hover:text-[var(--c-ink)]"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-[var(--c-muted)] hover:bg-[var(--c-surface-3)] hover:text-[var(--c-ink)]"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink-2)] shadow-sm hover:bg-[var(--c-surface-3)]"
            onClick={() => save().catch(() => toast.error("Failed to save"))}
            disabled={isSaving || !isDirty}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </Button>
          <ShareDialog resumeId={resume.id} />
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink-2)] shadow-sm hover:bg-[var(--c-surface-3)]"
            onClick={handleExportDocx}
            disabled={isExporting}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {isExporting ? "..." : "DOCX"}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="rounded-full bg-[var(--c-primary)] text-[var(--c-on-primary)] shadow-sm hover:bg-[var(--c-primary-hover)]"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {isExportingPdf ? "..." : "PDF"}
          </Button>
        </div>
      </div>

      {/* Editor layout */}
      <EditorLayout
        formPanel={<SectionEditor />}
        previewPanel={<CVPreview />}
      />
    </div>
  );
}
