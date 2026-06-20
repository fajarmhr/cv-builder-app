"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Button
      onClick={handleLogout}
      size="sm"
      variant="ghost"
      className="rounded-full text-[var(--c-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-primary)]"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Logout</span>
    </Button>
  );
}
