"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Loader2, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  resumeCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleDelete(user: AdminUser) {
    const label = `${user.fullName} (@${user.username})`;
    const confirmed = window.confirm(
      `Delete ${label} and all ${user.resumeCount} of their résumé(s)?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`Deleted ${label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q)
      )
    : users;

  const totalResumes = users.reduce((sum, u) => sum + u.resumeCount, 0);

  if (isLoading) {
    return (
      <div className="dashboard-shell flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--c-accent)]" />
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="reveal-up">
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="text-4xl text-[var(--c-ink)] sm:text-5xl">Users</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--c-muted)]">
            Every registered account and the résumés they own.
          </p>
        </section>

        <section
          className="reveal-up mt-7 flex flex-wrap gap-3"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-3 shadow-sm">
            <Users className="h-4 w-4 text-[var(--c-accent)]" />
            <span className="font-mono text-sm text-[var(--c-ink)]">
              {users.length}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--c-muted-2)]">
              users
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-3 shadow-sm">
            <FileText className="h-4 w-4 text-[var(--c-accent)]" />
            <span className="font-mono text-sm text-[var(--c-ink)]">
              {totalResumes}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--c-muted-2)]">
              résumés
            </span>
          </div>
        </section>

        {users.length > 0 && (
          <div
            className="reveal-up relative mt-7 max-w-sm"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-muted-2)]" />
            <Input
              placeholder="Search by name or username..."
              className="h-11 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] pl-11 pr-4 text-[var(--c-ink)] shadow-sm placeholder:text-[var(--c-muted-2)]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        <section
          className="reveal-up mt-8 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-sm"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          {filtered.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-[var(--c-muted)]">
              {users.length === 0 ? "No users yet." : "No users match that search."}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--c-line)]">
              {filtered.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--c-surface-2)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="truncate text-sm font-semibold text-[var(--c-ink)] hover:text-[var(--c-accent)]"
                      >
                        {u.fullName}
                      </Link>
                      {u.role === "ADMIN" && (
                        <span className="rounded-full border border-[var(--c-accent)]/40 bg-[var(--c-accent)]/[0.08] px-2 py-0.5 font-mono text-[10px] tracking-[0.04em] text-[var(--c-accent)]">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--c-muted-2)]">
                      @{u.username} · joined{" "}
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <span className="shrink-0 font-mono text-[11px] text-[var(--c-muted)]">
                    {u.resumeCount} CV{u.resumeCount === 1 ? "" : "s"}
                  </span>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link href={`/admin/users/${u.id}`}>
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] px-3 text-xs text-[var(--c-ink-2)] hover:bg-[var(--c-surface-3)]"
                      >
                        View
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(u)}
                      disabled={deletingId === u.id}
                      aria-label={`Delete ${u.username}`}
                      className="h-8 rounded-full border-[var(--c-border)] bg-[var(--c-surface)] px-3 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600"
                    >
                      {deletingId === u.id ? (
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
