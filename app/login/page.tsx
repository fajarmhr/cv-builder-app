"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[var(--c-bg)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-[#1b2230] p-12 text-[#edeff2] lg:flex">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b93a6]">
          CV Builder
        </span>
        <div className="max-w-md">
          <h2
            className="text-4xl leading-[1.08] text-[#edeff2]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your résumé, version-controlled.
          </h2>
          <p
            className="mt-5 text-lg italic leading-relaxed text-[#aab1c2]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Build, preview, and share an ATS-ready CV behind one private link.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#6b748a]">
          Private · Token-shared
        </span>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <p className="eyebrow mb-2.5">Sign in</p>
          <h1
            className="text-3xl text-[var(--c-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome back
          </h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold text-[var(--c-muted)]">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="h-11 rounded-lg border-[var(--c-border)] bg-[var(--c-input)] text-[var(--c-ink)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-[var(--c-muted)]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-11 rounded-lg border-[var(--c-border)] bg-[var(--c-input)] text-[var(--c-ink)]"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-full bg-[var(--c-primary)] font-semibold text-[var(--c-on-primary)] hover:bg-[var(--c-primary-hover)]"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--c-muted)]">
            New here?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--c-accent)] underline decoration-[var(--c-accent)]/40 underline-offset-2 hover:decoration-[var(--c-accent)]"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
