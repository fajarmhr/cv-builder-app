"use client";

import { useState } from "react";
import { Share2, Loader2, Copy, Check, Globe, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareState {
  isPublished: boolean;
  shareToken: string | null;
}

export function ShareDialog({ resumeId }: { resumeId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ShareState | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function loadState() {
    setLoading(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/share`);
      setState(await res.json());
    } catch {
      toast.error("Failed to load share settings");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) loadState();
  }

  async function toggle(enable: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/share`, {
        method: enable ? "POST" : "DELETE",
      });
      setState(await res.json());
      toast.success(enable ? "Sharing enabled" : "Sharing disabled");
    } catch {
      toast.error("Failed to update sharing");
    } finally {
      setLoading(false);
    }
  }

  async function copy(value: string, key: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 1500);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const token = state?.shareToken;
  const publicUrl = token ? `${origin}/p/${token}` : "";
  const jsonUrl = token ? `${origin}/api/public/resume/${token}` : "";
  const pdfPreviewUrl = token ? `${origin}/p/${token}/pdf` : "";
  const pdfDownloadUrl = token ? `${origin}/api/public/resume/${token}/pdf?download=1` : "";
  const docxDownloadUrl = token ? `${origin}/api/public/resume/${token}/docx` : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ink-2)] shadow-sm hover:bg-[var(--c-surface-3)]"
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {/* ── Header (fixed) ── */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--c-border)] px-6 py-5">
          <div className="space-y-1">
            <p className="eyebrow">Share this résumé</p>
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>
              Public link &amp; token
            </DialogTitle>
          </div>
          <DialogClose className="-mr-1.5 -mt-1 shrink-0 rounded-full p-1.5 text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-3)] hover:text-[var(--c-ink)] focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* ── Body (scrolls) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && !state ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--c-accent)]" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--c-muted)]">
                Anyone with the link or token can view this résumé read-only — no
                login needed. The link stays the same as you keep editing, so
                third-party apps always get the latest version.
              </p>

              {!state?.isPublished ? (
                <Button
                  onClick={() => toggle(true)}
                  disabled={loading}
                  className="w-full rounded-full bg-[var(--c-primary)] text-[var(--c-on-primary)] hover:bg-[var(--c-primary-hover)]"
                >
                  <Globe className="h-4 w-4 mr-1.5" />
                  Enable sharing
                </Button>
              ) : (
                <>
                  {/* ── Share token (one-tap copy for third-party apps) ── */}
                  <div className="space-y-1.5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-muted)]">
                      Share token
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-3)] px-3 py-2.5 font-mono text-xs text-[var(--c-ink)]">
                        {token}
                      </code>
                      <Button
                        onClick={() => copy(token!, "token", "Token")}
                        className="shrink-0 rounded-lg bg-[var(--c-accent)] px-4 font-semibold text-white hover:opacity-90"
                      >
                        {copied === "token" ? (
                          <>
                            <Check className="h-4 w-4 mr-1.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1.5" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <LinkRow
                    label="Public page"
                    value={publicUrl}
                    copied={copied === "public"}
                    onCopy={() => copy(publicUrl, "public", "Link")}
                  />
                  <LinkRow
                    label="Résumé data (JSON)"
                    value={jsonUrl}
                    copied={copied === "json"}
                    onCopy={() => copy(jsonUrl, "json", "Link")}
                  />
                  <LinkRow
                    label="PDF preview"
                    value={pdfPreviewUrl}
                    copied={copied === "pdf-preview"}
                    onCopy={() => copy(pdfPreviewUrl, "pdf-preview", "Link")}
                  />
                  <LinkRow
                    label="PDF download"
                    value={pdfDownloadUrl}
                    copied={copied === "pdf-download"}
                    onCopy={() => copy(pdfDownloadUrl, "pdf-download", "Link")}
                  />
                  <LinkRow
                    label="DOCX download"
                    value={docxDownloadUrl}
                    copied={copied === "docx-download"}
                    onCopy={() => copy(docxDownloadUrl, "docx-download", "Link")}
                  />
                  <Button
                    variant="outline"
                    onClick={() => toggle(false)}
                    disabled={loading}
                    className="w-full rounded-full border-[var(--c-border)] text-[var(--c-danger)] hover:bg-[var(--c-surface-3)]"
                  >
                    Disable sharing
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-muted)]">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-3)] px-3 py-2 font-mono text-xs text-[var(--c-muted)]">
          {value}
        </code>
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0 rounded-lg border-[var(--c-border)]"
          onClick={onCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-[var(--c-accent)]" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
