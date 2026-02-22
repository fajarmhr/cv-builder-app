"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ResumeGrid } from "@/components/dashboard/ResumeGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { CVUploader } from "@/components/upload/CVUploader";

interface ResumeListItem {
  id: string;
  title: string;
  templateId: string;
  personName: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      setResumes(data.resumes || []);
    } catch {
      toast.error("Failed to load resumes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  async function handleCreateNew() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.resume) {
        router.push(`/editor/${data.resume.id}`);
      }
    } catch {
      toast.error("Failed to create resume");
      setIsCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/resumes/${id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.resume) {
        setResumes((prev) => [
          {
            id: data.resume.id,
            title: data.resume.title,
            templateId: data.resume.templateId,
            personName: data.resume.personalInfo?.name || null,
            updatedAt: data.resume.updatedAt,
            createdAt: data.resume.createdAt,
          },
          ...prev,
        ]);
        toast.success("Resume duplicated");
      }
    } catch {
      toast.error("Failed to duplicate resume");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      setResumes((prev) => prev.filter((r) => r.id !== id));
      toast.success("Resume deleted");
    } catch {
      toast.error("Failed to delete resume");
    }
  }

  async function handleTitleChange(id: string, newTitle: string) {
    try {
      await fetch(`/api/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setResumes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, title: newTitle } : r))
      );
    } catch {
      toast.error("Failed to rename resume");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">My Resumes</h1>
          {!isLoading && (
            <Badge variant="secondary">{resumes.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CVUploader />
          <Button onClick={handleCreateNew} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "Create New Resume"}
          </Button>
        </div>
      </div>

      {resumes.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resumes..."
            className="pl-9 max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <ResumeGrid
        resumes={resumes}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onTitleChange={handleTitleChange}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
}
