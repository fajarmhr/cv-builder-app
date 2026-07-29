"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AdminUserDetail {
  id: string;
  username: string;
  fullName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminResumeItem {
  id: string;
  title: string;
  templateId: string;
  personName: string | null;
  isPublished: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [resumes, setResumes] = useState<AdminResumeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load user");
      setUser(data.user);
      setResumes(data.resumes || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  async function handleDeleteResume(resume: AdminResumeItem) {
    if (!window.confirm(`Delete "${resume.title}"?\n\nThis cannot be undone.`)) {
      return;
    }
    setDeletingId(resume.id);
    try {
      const res = await fetch(`/api/admin/resumes/${resume.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete résumé");
      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
      toast.success("Résumé deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete résumé");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteUser() {
    if (!user) return;
    const label = `${user.fullName} (@${user.username})`;
    const confirmed = window.confirm(
      `Delete ${label} and all ${resumes.length} of their résumé(s)?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      toast.success(`Deleted ${label}`);
      router.push("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-shell flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--c-accent)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-shell min-h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm text-[var(--c-muted)]">User not found.</p>
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--c-accent)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link
          href="/admin"
          className="reveal-up inline-flex items-center gap-1.5 font-mono text-xs text-[var(--c-muted)] hover:text-[var(--c-accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All users
        </Link>

        <section className="reveal-up mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">
              @{user.username} · joined{" "}
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
            <h1 className="flex flex-wrap items-center gap-3 text-4xl text-[var(--c-ink)] sm:text-5xl">
              {user.fullName}
              {user.role === "ADMIN" && (
                <span className="rounded-full border border-[var(--c-accent)]/40 bg-[var(--c-accent)]/[0.08] px-2.5 py-1 font-mono text-[11px] tracking-[0.04em] text-[var(--c-accent)]">
                  ADMIN
                </span>
              )}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--c-muted)]">
              {resumes.length} résumé{resumes.length === 1 ? "" : "s"} owned by
              this account.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleDeleteUser}
            disabled={deletingId === user.id}
            className="rounded-full border-[var(--c-border)] bg-[var(--c-surface)] px-5 text-red-600 shadow-sm hover:bg-red-500/10 hover:text-red-600"
          >
            {deletingId === user.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete user
          </Button>
        </section>

        <section
          className="reveal-up mt-8 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-sm"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {resumes.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-[var(--c-muted)]">
              This user hasn&apos;t created any résumés yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--c-line)]">
              {resumes.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--c-surface-2)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/resumes/${r.id}`}
                        className="truncate text-sm font-semibold text-[var(--c-ink)] hover:text-[var(--c-accent)]"
                      >
                        {r.title}
                      </Link>
                      {r.isPublished && (
                        <span className="rounded-full border border-[var(--c-border)] bg-[var(--c-surface-3)] px-2 py-0.5 font-mono text-[10px] text-[var(--c-ink-2)]">
                          published
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--c-muted-2)]">
                      {r.personName ? `${r.personName} · ` : ""}
                      {r.templateId} · updated{" "}
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link href={`/admin/resumes/${r.id}`}>
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] px-3 text-xs text-[var(--c-ink-2)] hover:bg-[var(--c-surface-3)]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View CV
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteResume(r)}
                      disabled={deletingId === r.id}
                      aria-label={`Delete ${r.title}`}
                      className="h-8 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] px-3 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
