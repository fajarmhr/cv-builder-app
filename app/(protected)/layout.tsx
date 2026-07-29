import { LayoutDashboard, LogIn, Shield } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentUser } from "@/lib/auth";

// NOTE: This layout no longer redirects guests. Browsing the dashboard and
// templates is open to everyone; editing is gated by app/(protected)/editor/layout.tsx.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <nav className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[var(--c-surface)]/88 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[var(--c-accent)]" />
                <span
                  className="text-lg tracking-[-0.01em] text-[var(--c-ink)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {process.env.NEXT_PUBLIC_APP_NAME || "CV Builder"}
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="hidden items-center gap-1.5 rounded-full bg-[var(--c-surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-surface-3)] sm:flex"
              >
                <LayoutDashboard className="h-4 w-4" />
                {user ? "Dashboard" : "Templates"}
              </Link>
              {user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="hidden items-center gap-1.5 rounded-full border border-[var(--c-accent)]/40 bg-[var(--c-accent)]/[0.08] px-3 py-1.5 text-sm font-medium text-[var(--c-accent)] transition-colors hover:bg-[var(--c-accent)]/15 sm:flex"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {user ? (
                <>
                  <span className="hidden font-mono text-xs text-[var(--c-muted)] sm:inline">
                    {user.fullName}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-1.5 text-sm font-medium text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-surface-3)]"
                  >
                    <LogIn className="h-4 w-4" />
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="hidden rounded-full bg-[var(--c-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--c-on-primary)] transition-colors hover:bg-[var(--c-primary-hover)] sm:inline-block"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
