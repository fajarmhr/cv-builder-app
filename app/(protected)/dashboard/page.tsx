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
import { Plus, Search, Upload, ArrowRight, Loader2, Sparkles } from "lucide-react";
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

/* Persuasion + trust copy for the guest landing. */
const BENEFITS = [
  "Clears ATS filters",
  "US · UK · EU formats",
  "One private link",
  "Ready in minutes",
];
const ATS_SYSTEMS = [
  "Workday",
  "Greenhouse",
  "Lever",
  "Taleo",
  "SuccessFactors",
  "iCIMS",
  "Ashby",
];

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
      <div className="dashboard-shell relative min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* floating accent glow for depth */}
        <div
          aria-hidden
          className="soft-float pointer-events-none absolute -right-40 -top-32 h-[36rem] w-[36rem] rounded-full bg-[var(--c-accent)]/12 blur-[150px]"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          {/* ── Hero ── */}
          <div className="grid items-center gap-12 lg:grid-cols-[1.45fr_1fr]">
            <div className="reveal-up max-w-xl">
              <p className="eyebrow mb-3">
                ATS templates · curated for international recruiters
              </p>
              <h1 className="text-[2.5rem] leading-[1.04] text-[var(--c-ink)] sm:text-6xl">
                Build an ATS-ready CV that travels.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--c-muted)]">
                One résumé, formatted to clear the filters at Workday, Greenhouse
                and Lever, and ready to share across US, UK and EU hiring teams
                from a single private link.
              </p>

              {/* benefit chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {BENEFITS.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3.5 py-1.5 font-mono text-[11px] text-[var(--c-ink-2)] shadow-sm"
                  >
                    {b}
                  </span>
                ))}
                <span className="rounded-full border border-[var(--c-accent)]/40 bg-[var(--c-accent)]/[0.08] px-3.5 py-1.5 font-mono text-[11px] text-[var(--c-accent)]">
                  Free to start
                </span>
              </div>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/register">
                  <Button className="rounded-full bg-[var(--c-primary)] px-5 font-semibold text-[var(--c-on-primary)] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[var(--c-primary-hover)]">
                    Start building, free
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
              <p className="mt-4 font-mono text-xs text-[var(--c-muted-2)]">
                Free to start. No credit card. Export to PDF or DOCX anytime.
              </p>
            </div>

            {/* spotlight résumé card */}
            <div
              className="reveal-up relative mx-auto hidden w-full max-w-sm lg:block"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              <div className="absolute -top-3 right-2 z-10 flex items-center gap-2 rounded-full bg-[var(--c-primary)] px-3.5 py-2 font-mono text-[11px] text-[var(--c-on-primary)] shadow-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" />
                shared via 1 private link
              </div>
              <div
                className="tilt-card overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 shadow-2xl"
                style={{ "--thumb-scale": "0.36" } as React.CSSProperties}
              >
                <div className="overflow-hidden rounded-lg">
                  <TemplateThumbnail
                    templateId={templates[0].id}
                    resume={SAMPLE_RESUME}
                    config={SAMPLE_CONFIG}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Trust marquee ── */}
          <div
            className="reveal-up mt-14 overflow-hidden border-y border-[var(--c-line)] py-4"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <p className="eyebrow mb-3">
              Parses cleanly into the systems recruiters actually use
            </p>
            <div className="marquee-track flex gap-12 font-mono text-sm text-[var(--c-muted)]">
              {[...ATS_SYSTEMS, ...ATS_SYSTEMS].map((name, i) => (
                <span key={i} className="whitespace-nowrap">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* ── Template gallery ── */}
          <div
            className="reveal-up mt-14"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-1.5">
                  Three formats, all single-column &amp; ATS-clean
                </p>
                <h2 className="text-3xl text-[var(--c-ink)]">
                  Pick a starting point.
                </h2>
              </div>
              <Link
                href="/login"
                className="font-mono text-xs text-[var(--c-accent)] hover:underline"
              >
                Browse all →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/templates/${t.id}`}
                  className="group rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                  style={
                    { "--thumb-scale": "0.34", "--i": i } as React.CSSProperties
                  }
                >
                  <div className="mb-3 overflow-hidden rounded-lg">
                    <TemplateThumbnail
                      templateId={t.id}
                      resume={SAMPLE_RESUME}
                      config={SAMPLE_CONFIG}
                    />
                  </div>
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div>
                      <p className="text-sm font-semibold text-[var(--c-ink)]">
                        {t.name}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--c-muted)]">
                        {t.description}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-[var(--c-muted-2)] transition-colors group-hover:text-[var(--c-accent)]">
                      Use →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
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
              {isLoading
                ? "—"
                : `${resumes.length} document${resumes.length === 1 ? "" : "s"}`}
            </p>
            <h1 className="text-4xl text-[var(--c-ink)] sm:text-5xl">
              Your résumés
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--c-muted)]">
              Create, refine and share every version of your CV from one focused
              workspace.
            </p>
          </div>
          <div
            className="reveal-up flex gap-2.5"
            style={{ "--i": 1 } as React.CSSProperties}
          >
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

        {/* persuasive tip — only worth showing once there is something to share */}
        {resumes.length > 0 && (
          <div
            className="reveal-up mt-7 flex items-start gap-3 rounded-2xl border border-[var(--c-accent)]/25 bg-[var(--c-accent)]/[0.06] px-5 py-4"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <span className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-[var(--c-accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              TIP
            </span>
            <p className="text-sm leading-6 text-[var(--c-ink-2)]">
              Publish a résumé to get a private link your portfolio and recruiters
              can open without an account. You stay in control, and you can revoke
              it anytime.
            </p>
          </div>
        )}

        {resumes.length > 0 && (
          <div
            className="reveal-up relative mt-7 max-w-sm"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted-2)]" />
            <Input
              placeholder="Search résumés..."
              className="h-11 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] pl-11 pr-4 text-[var(--c-ink)] shadow-sm placeholder:text-[var(--c-muted-2)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <section
          className="reveal-up mt-8"
          style={{ "--i": 4 } as React.CSSProperties}
        >
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
