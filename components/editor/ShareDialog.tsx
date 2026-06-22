"use client";

import { useState } from "react";
import { Share2, Loader2, Check, ArrowUpRight, X } from "lucide-react";
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
  const isPublished = !!state?.isPublished;
  const publicUrl = token ? `${origin}/p/${token}` : "";
  const jsonUrl = token ? `${origin}/api/public/resume/${token}` : "";
  const pdfPreviewUrl = token ? `${origin}/p/${token}/pdf` : "";
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
        className="flex max-h-[85vh] resize-x flex-col gap-0 overflow-auto p-0"
        style={{
          width: "28rem",
          minWidth: "19rem",
          maxWidth: "min(42rem, calc(100vw - 2rem))",
        }}
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
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-[var(--c-muted)]">
                Anyone with the link or token can view this résumé read-only — no
                login needed. Everything else stays private.
              </p>

              {/* ── Published toggle ── */}
              <div className="flex items-center justify-between rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3.5">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[var(--c-ink)]">
                    {isPublished ? "Published" : "Not published"}
                  </p>
                  <p className="text-xs text-[var(--c-muted)]">
                    {isPublished
                      ? "Live for third-party apps"
                      : "Enable to get a public link"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublished}
                  aria-label="Toggle publishing"
                  disabled={loading}
                  onClick={() => toggle(!isPublished)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                    isPublished
                      ? "bg-[var(--c-accent)]"
                      : "border border-[var(--c-border)] bg-[var(--c-surface-3)]"
                  }`}
                >
                  <span
                    className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      transform: isPublished ? "translateX(20px)" : "translateX(0)",
                    }}
                  />
                </button>
              </div>

              {isPublished && token && (
                <>
                  {/* ── Share token ── */}
                  <Field label="Share token">
                    <ScrollInput value={token} />
                    <Button
                      onClick={() => copy(token, "token", "Token")}
                      className="shrink-0 rounded-lg bg-[var(--c-accent)] px-4 font-semibold text-white hover:opacity-90"
                    >
                      {copied === "token" ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5" /> Copied
                        </>
                      ) : (
                        "Copy token"
                      )}
                    </Button>
                  </Field>

                  {/* ── Public URL ── */}
                  <Field label="Public URL">
                    <ScrollInput value={publicUrl} />
                    <Button
                      variant="outline"
                      onClick={() => copy(publicUrl, "public", "Link")}
                      className="shrink-0 rounded-lg border-[var(--c-border)] px-4"
                    >
                      {copied === "public" ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5 text-[var(--c-accent)]" /> Copied
                        </>
                      ) : (
                        "Copy"
                      )}
                    </Button>
                  </Field>

                  {/* ── Endpoints for portfolio apps ── */}
                  <div className="border-t border-[var(--c-border)] pt-4">
                    <p className="eyebrow mb-1.5">Endpoints for portfolio apps</p>
                    <div className="divide-y divide-[var(--c-line)]">
                      <EndpointRow
                        label="JSON data"
                        copied={copied === "json"}
                        onCopy={() => copy(jsonUrl, "json", "Link")}
                      />
                      <EndpointRow
                        label="PDF preview"
                        copied={copied === "pdf"}
                        onCopy={() => copy(pdfPreviewUrl, "pdf", "Link")}
                      />
                      <EndpointRow
                        label="DOCX download"
                        copied={copied === "docx"}
                        onCopy={() => copy(docxDownloadUrl, "docx", "Link")}
                      />
                    </div>
                  </div>

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-muted)]">
        {label}
      </p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/* Read-only field — click and drag (or scroll) horizontally to read the full value. */
function ScrollInput({ value }: { value: string }) {
  return (
    <input
      readOnly
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      className="min-w-0 flex-1 cursor-text rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-3)] px-3 py-2.5 font-mono text-xs text-[var(--c-ink)] outline-none focus:border-[var(--c-ring)]"
    />
  );
}

function EndpointRow({
  label,
  copied,
  onCopy,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-[var(--c-ink-2)]">{label}</span>
      <button
        onClick={onCopy}
        className="inline-flex items-center gap-1 font-mono text-xs text-[var(--c-accent)] transition-opacity hover:opacity-80"
      >
        {copied ? "copied" : "copy"}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
