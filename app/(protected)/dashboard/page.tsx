"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ResumeGrid } from "@/components/dashboard/ResumeGrid";
import { TemplateThumbnail } from "@/components/editor/TemplateThumbnail";
import { getAllTemplates } from "@/components/templates/TemplateRegistry";
import { SAMPLE_RESUME, SAMPLE_CONFIG } from "@/lib/sample-resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Upload, ArrowRight, Loader2 } from "lucide-react";
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
  const [isGuest, setIsGuest] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      if (res.status === 401) {
        setIsGuest(true);
        return;
      }
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
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.resume) router.push(`/editor/${data.resume.id}`);
    } catch {
      toast.error("Failed to create resume");
      setIsCreating(false);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/resumes/${id}/duplicate`, { method: "POST" });
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

  /* ─────────────── Initial load ─────────────── */
  if (isLoading) {
    return (
      <div className="dashboard-shell flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--c-accent)]" />
      </div>
    );
  }

  /* ─────────────── Guest view: browse templates, no login ─────────────── */
  if (isGuest) {
    const templates = getAllTemplates();
    return (
      <div className="dashboard-shell min-h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="reveal-up max-w-2xl">
            <p className="eyebrow mb-2">ATS templates · curated for international recruiters</p>
            <h1 className="text-4xl text-[var(--c-ink)] sm:text-5xl">
              Build an ATS-ready CV that travels.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--c-muted)]">
              Three clean, single-column formats trusted across US, UK and EU
              hiring systems. Preview them below — log in to make one yours.
            </p>
            <div className="mt-6 flex gap-2.5">
              <Link href="/register">
                <Button className="rounded-full bg-[var(--c-primary)] px-5 font-semibold text-[var(--c-on-primary)] hover:bg-[var(--c-primary-hover)]">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="rounded-full border-[var(--c-border)] bg-[var(--c-surface)] px-5 text-[var(--c-ink-2)] shadow-sm hover:bg-[var(--c-surface-3)]"
                >
                  Log in
                </Button>
              </Link>
            </div>
          </div>

          <div className="reveal-up mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" style={{ "--i": 1 } as React.CSSProperties}>
            {templates.map((t, i) => (
              <Link
                key={t.id}
                href={`/templates/${t.id}`}
                className="group rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ "--thumb-scale": "0.34", "--i": i } as React.CSSProperties}
              >
                <div className="mb-3 overflow-hidden rounded-lg">
                  <TemplateThumbnail templateId={t.id} resume={SAMPLE_RESUME} config={SAMPLE_CONFIG} />
                </div>
                <div className="flex items-center justify-between px-1 pb-1">
                  <div>
                    <p className="text-sm font-semibold text-[var(--c-ink)]">{t.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--c-muted)]">{t.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--c-muted-2)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--c-accent)]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────── Member view: your résumés ─────────────── */
  return (
    <div className="dashboard-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="reveal-up">
            <p className="eyebrow mb-2">
              {isLoading ? "—" : `${resumes.length} document${resumes.length === 1 ? "" : "s"}`}
            </p>
            <h1 className="text-4xl text-[var(--c-ink)] sm:text-5xl">Your résumés</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--c-muted)]">
              Create, refine and share every version of your CV from one focused
              workspace.
            </p>
          </div>
          <div className="reveal-up flex gap-2.5" style={{ "--i": 1 } as React.CSSProperties}>
            <CVUploader
              trigger={
                <Button
                  variant="outline"
                  className="rounded-full border-[var(--c-border)] bg-[var(--c-surface)] px-5 text-[var(--c-ink-2)] shadow-sm hover:bg-[var(--c-surface-3)]"
                >
                  <Upload className="h-4 w-4" />
                  Upload résumé
                </Button>
              }
            />
            <Button
              onClick={handleCreateNew}
              disabled={isCreating}
              className="rounded-full bg-[var(--c-primary)] px-5 font-semibold text-[var(--c-on-primary)] hover:bg-[var(--c-primary-hover)]"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? "Creating..." : "New résumé"}
            </Button>
          </div>
        </section>

        {resumes.length > 0 && (
          <div className="reveal-up relative mt-8 max-w-sm" style={{ "--i": 2 } as React.CSSProperties}>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted-2)]" />
            <Input
              placeholder="Search résumés..."
              className="h-11 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] pl-11 pr-4 text-[var(--c-ink)] shadow-sm placeholder:text-[var(--c-muted-2)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <section className="reveal-up mt-8" style={{ "--i": 3 } as React.CSSProperties}>
          <ResumeGrid
            resumes={resumes}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onTitleChange={handleTitleChange}
            onCreateNew={handleCreateNew}
          />
        </section>
      </div>
    </div>
  );
}
