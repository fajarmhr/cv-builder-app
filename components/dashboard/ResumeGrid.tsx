"use client";

import { ResumeCard } from "./ResumeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";

interface ResumeListItem {
  id: string;
  title: string;
  templateId: string;
  personName: string | null;
  updatedAt: string;
  createdAt: string;
}

interface ResumeGridProps {
  resumes: ResumeListItem[];
  isLoading: boolean;
  searchQuery: string;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onTitleChange: (id: string, newTitle: string) => void;
  onCreateNew: () => void;
}

export function ResumeGrid({
  resumes,
  isLoading,
  searchQuery,
  onDuplicate,
  onDelete,
  onTitleChange,
  onCreateNew,
}: ResumeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[180px] rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const filtered = resumes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (resumes.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-12 text-center">
        <FilePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-1">No resumes yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first resume to get started!
        </p>
        <Button onClick={onCreateNew}>Create New Resume</Button>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
        <p>No resumes matching &quot;{searchQuery}&quot;</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((resume) => (
        <ResumeCard
          key={resume.id}
          id={resume.id}
          title={resume.title}
          templateId={resume.templateId}
          personName={resume.personName}
          updatedAt={resume.updatedAt}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onTitleChange={onTitleChange}
        />
      ))}
    </div>
  );
}
