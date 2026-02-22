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
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <p className="text-muted-foreground">{error || "Resume not found"}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
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
              className="font-semibold bg-transparent border-b border-primary outline-none min-w-0"
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
              className="font-semibold truncate cursor-pointer hover:text-primary transition-colors"
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
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => save().catch(() => toast.error("Failed to save"))}
            disabled={isSaving || !isDirty}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportDocx}
            disabled={isExporting}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {isExporting ? "Exporting..." : "DOCX"}
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
