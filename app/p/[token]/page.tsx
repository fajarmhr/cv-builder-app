import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicResumeView } from "@/components/preview/PublicResumeView";
import type { ResumeData } from "@/types/resume";

// Public, read-only résumé view. No auth — access is the token itself.
// Renders the live template (same as the editor preview) with PDF / DOCX
// download actions for third parties.

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export default async function PublicResumePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const origin = await getOrigin();
  const base = `${origin}/api/public/resume/${token}`;

  let data: { resume?: Record<string, unknown> } | null = null;
  try {
    const res = await fetch(base, { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch {
    data = null;
  }
  if (!data?.resume) notFound();

  const r = data.resume;
  const info = (r.personalInfo as Record<string, string> | undefined) || {};
  const name = info.name || (r.title as string) || "Résumé";
  const role = info.title || info.role || "";

  return (
    <PublicResumeView
      resume={r as unknown as ResumeData}
      base={base}
      name={name}
      role={role}
    />
  );
}
