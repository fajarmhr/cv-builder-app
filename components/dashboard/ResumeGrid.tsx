"use client";

import { ResumeCard } from "./ResumeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilePlus, Plus, SearchX } from "lucide-react";

interface ResumeListItem {
  id: string;
  title: string;
  templateId: string;
  personName: string | null;
  isPublished: boolean;
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
      <div className="border-t border-[var(--c-border)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--c-line)] py-6"
          >
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-1/3 bg-[var(--c-surface-3)]" />
              <Skeleton className="h-3 w-1/4 bg-[var(--c-surface-3)]" />
            </div>
            <Skeleton className="h-9 w-20 rounded-full bg-[var(--c-surface-3)]" />
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
      <div className="rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--c-surface)]/70 px-6 py-16 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-surface-3)] text-[var(--c-accent)]">
          <FilePlus className="h-6 w-6" />
        </div>
        <h3
          className="text-2xl text-[var(--c-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
        >
          No résumés yet
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--c-muted)]">
          Start from a blank résumé or upload an existing CV to convert it into
          an editable profile.
        </p>
        <Button
          onClick={onCreateNew}
          className="mt-6 rounded-full bg-[var(--c-primary)] px-5 text-[var(--c-on-primary)] hover:bg-[var(--c-primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          Create new résumé
        </Button>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--c-surface)]/70 px-6 py-14 text-center text-[var(--c-muted)]">
        <SearchX className="mx-auto mb-4 h-9 w-9 text-[var(--c-muted-2)]" />
        <p>No résumés matching &quot;{searchQuery}&quot;</p>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--c-border)]">
      {filtered.map((resume, i) => (
        <ResumeCard
          key={resume.id}
          index={i}
          id={resume.id}
          title={resume.title}
          templateId={resume.templateId}
          personName={resume.personName}
          isPublished={resume.isPublished}
          updatedAt={resume.updatedAt}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onTitleChange={onTitleChange}
        />
      ))}
    </div>
  );
}
